import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

/**
 * Cloud Storage helpers. Large files (video, large images) are uploaded by the
 * client directly to storage so they never pass through the 4.5MB serverless
 * payload limit (spec 1-5, 2-1). The analysis engine later fetches the bytes
 * server-side using the stored path.
 *
 * Supabase Storage is the default provider. Vercel Blob can be added by
 * installing @vercel/blob and implementing the blob branch.
 */

export interface UploadTarget {
  provider: string;
  bucket: string;
  path: string;
  token: string;
}

function buildPath(userId: string, filename: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
  const stamp = Date.now();
  const rand = crypto.randomBytes(6).toString("hex");
  return `${userId}/${stamp}-${rand}.${ext}`;
}

/** Creates a signed upload target the browser can upload to directly. */
export async function createUploadTarget(
  userId: string,
  filename: string,
): Promise<UploadTarget> {
  const provider = serverEnv().STORAGE_PROVIDER;
  if (provider !== "supabase") {
    throw new Error(
      `STORAGE_PROVIDER='${provider}'는 아직 구성되지 않았습니다. 'supabase'를 사용하십시오.`,
    );
  }
  const bucket = serverEnv().SUPABASE_STORAGE_BUCKET;
  const path = buildPath(userId, filename);
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { provider, bucket, path, token: data.token };
}

/** Downloads the stored object bytes server-side. */
export async function downloadBytes(
  bucket: string,
  path: string,
): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error) throw new Error(error.message);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
