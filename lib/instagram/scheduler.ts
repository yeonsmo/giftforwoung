import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listActiveKeys } from "@/lib/ai/keys-store";
import { callModel } from "@/lib/ai/providers";
import { publishNow, type InstagramMediaType } from "@/lib/instagram/client";

/**
 * Scheduler for Instagram auto-upload (spec 8-1-1). A post can be scheduled at a
 * given time, or at an optimal time the AI agent determines by reasoning about
 * the content. This module is part of the frozen feature; callers must pass the
 * activation gate (config.assertInstagramActive) before invoking it.
 */

interface ScheduledRow {
  id: string;
  media_url: string;
  media_type: InstagramMediaType;
  caption: string | null;
}

/**
 * Determines an optimal posting time. If an LLM key is available, the AI agent
 * suggests a time based on the caption; otherwise a sensible default (the next
 * 19:00 in the server timezone) is used.
 */
export async function determineOptimalTime(caption: string): Promise<Date> {
  const keys = await listActiveKeys();
  if (keys.length > 0) {
    const key = keys[0]!;
    try {
      const text = await callModel(key.provider, key.key, {
        systemInstruction:
          "당신은 소셜미디어 게시 시간 최적화 전문가입니다. 주어진 게시물에 가장 적절한 향후 게시 시각을 ISO 8601(UTC)로만 한 줄 출력하십시오. 다른 텍스트는 출력하지 마십시오.",
        prompt: `게시물 내용: ${caption}\n현재 시각(UTC): ${new Date().toISOString()}\n향후의 최적 게시 시각을 ISO 8601(UTC)로 출력하십시오.`,
        json: false,
      });
      const parsed = new Date(text.trim());
      if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
        return parsed;
      }
    } catch {
      // Fall through to the default heuristic on any failure.
    }
  }
  const next = new Date();
  next.setHours(19, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next;
}

export async function schedulePost(input: {
  mediaUrl: string;
  mediaType: InstagramMediaType;
  caption?: string;
  scheduledAt?: string;
  createdBy: string;
}): Promise<{ id: string; scheduledAt: string }> {
  const scheduledAt = input.scheduledAt
    ? new Date(input.scheduledAt)
    : await determineOptimalTime(input.caption ?? "");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("instagram_scheduled_posts")
    .insert({
      created_by: input.createdBy,
      media_url: input.mediaUrl,
      media_type: input.mediaType,
      caption: input.caption ?? null,
      scheduled_at: scheduledAt.toISOString(),
      status: "scheduled",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id, scheduledAt: scheduledAt.toISOString() };
}

/**
 * Publishes all scheduled posts that are due. Intended to be invoked by a cron
 * trigger once the feature is activated. Each post is published independently;
 * failures are recorded on the row and do not stop the batch.
 */
export async function processDuePosts(): Promise<{
  processed: number;
  published: number;
  failed: number;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("instagram_scheduled_posts")
    .select("id,media_url,media_type,caption")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ScheduledRow[];
  let published = 0;
  let failed = 0;

  for (const row of rows) {
    await admin
      .from("instagram_scheduled_posts")
      .update({ status: "publishing" })
      .eq("id", row.id);
    try {
      const result = await publishNow({
        mediaUrl: row.media_url,
        mediaType: row.media_type,
        caption: row.caption ?? undefined,
      });
      await admin
        .from("instagram_scheduled_posts")
        .update({
          status: "published",
          container_id: result.containerId,
          published_id: result.publishedId,
        })
        .eq("id", row.id);
      published += 1;
    } catch (e) {
      await admin
        .from("instagram_scheduled_posts")
        .update({
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
        })
        .eq("id", row.id);
      failed += 1;
    }
  }

  return { processed: rows.length, published, failed };
}
