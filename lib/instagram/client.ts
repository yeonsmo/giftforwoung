import "server-only";
import { serverEnv } from "@/lib/env";

/**
 * Instagram (Meta) Graph API client (spec 8-1). These are complete, callable
 * functions; they are inactive only because credentials are withheld and the
 * feature is gated (see config.ts). Adding env credentials and enabling the flag
 * + toggle makes them operational immediately (spec 8-1-3).
 *
 * EXTERNAL REQUIREMENTS (spec 8-3): publishing requires an Instagram Business or
 * Creator account, a linked Facebook Page, and a Meta app that has passed app
 * review for the instagram_content_publish permission. The access token must be
 * a long-lived token for the page/IG account.
 *
 * Publishing flow:
 *   1. createMediaContainer -> returns a creation_id
 *   2. (video/reels) poll getContainerStatus until FINISHED
 *   3. publishMedia(creation_id) -> returns the published media id
 */

export type InstagramMediaType = "IMAGE" | "VIDEO" | "REELS";

function graphBase(): string {
  const e = serverEnv();
  return `${e.INSTAGRAM_GRAPH_BASE_URL}/${e.INSTAGRAM_GRAPH_VERSION}`;
}

export function getAccessToken(): string {
  const token = serverEnv().INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("Instagram 액세스 토큰이 설정되어 있지 않습니다.");
  return token;
}

function getBusinessAccountId(): string {
  const id = serverEnv().INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!id) throw new Error("Instagram 비즈니스 계정 ID가 설정되어 있지 않습니다.");
  return id;
}

async function graphFetch(
  path: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${graphBase()}${path}`, init);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    throw new Error(`Meta Graph API 오류 (HTTP ${res.status}): ${err?.message ?? ""}`);
  }
  return json;
}

/**
 * Token management: exchange a short-lived token for a long-lived one (valid
 * ~60 days). Long-lived tokens can be refreshed before expiry.
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const e = serverEnv();
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: e.INSTAGRAM_APP_ID ?? "",
    client_secret: e.INSTAGRAM_APP_SECRET ?? "",
    fb_exchange_token: shortLivedToken,
  });
  const json = await graphFetch(`/oauth/access_token?${params.toString()}`, {
    method: "GET",
  });
  return {
    access_token: String(json.access_token ?? ""),
    expires_in: Number(json.expires_in ?? 0),
  };
}

/** Creates a media container and returns its creation_id. */
export async function createMediaContainer(input: {
  mediaUrl: string;
  mediaType: InstagramMediaType;
  caption?: string;
}): Promise<string> {
  const igId = getBusinessAccountId();
  const params = new URLSearchParams();
  if (input.mediaType === "VIDEO" || input.mediaType === "REELS") {
    params.set("media_type", input.mediaType);
    params.set("video_url", input.mediaUrl);
  } else {
    params.set("image_url", input.mediaUrl);
  }
  if (input.caption) params.set("caption", input.caption);
  params.set("access_token", getAccessToken());

  const json = await graphFetch(`/${igId}/media`, {
    method: "POST",
    body: params,
  });
  const id = json.id;
  if (typeof id !== "string") throw new Error("미디어 컨테이너 생성 응답에 id가 없습니다.");
  return id;
}

/** Returns the container status_code: IN_PROGRESS | FINISHED | ERROR | EXPIRED. */
export async function getContainerStatus(creationId: string): Promise<string> {
  const params = new URLSearchParams({
    fields: "status_code",
    access_token: getAccessToken(),
  });
  const json = await graphFetch(`/${creationId}?${params.toString()}`, {
    method: "GET",
  });
  return String(json.status_code ?? "UNKNOWN");
}

/** Publishes a previously created container and returns the published media id. */
export async function publishMedia(creationId: string): Promise<string> {
  const igId = getBusinessAccountId();
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: getAccessToken(),
  });
  const json = await graphFetch(`/${igId}/media_publish`, {
    method: "POST",
    body: params,
  });
  const id = json.id;
  if (typeof id !== "string") throw new Error("게시 응답에 id가 없습니다.");
  return id;
}

/**
 * End-to-end publish. For video/reels, polls the container until it is FINISHED
 * before publishing (Meta requires the upload to finish processing first).
 */
export async function publishNow(input: {
  mediaUrl: string;
  mediaType: InstagramMediaType;
  caption?: string;
}): Promise<{ containerId: string; publishedId: string }> {
  const containerId = await createMediaContainer(input);

  if (input.mediaType === "VIDEO" || input.mediaType === "REELS") {
    const maxAttempts = 30;
    let finished = false;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const status = await getContainerStatus(containerId);
      if (status === "FINISHED") {
        finished = true;
        break;
      }
      if (status === "ERROR" || status === "EXPIRED") {
        throw new Error(`미디어 컨테이너 처리 실패: ${status}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    if (!finished) {
      throw new Error(
        "미디어 컨테이너 처리가 제한 시간 내에 완료되지 않았습니다(타임아웃). 게시를 중단합니다.",
      );
    }
  }

  const publishedId = await publishMedia(containerId);
  return { containerId, publishedId };
}
