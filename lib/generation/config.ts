import "server-only";
import { listKeyMeta } from "@/lib/ai/keys-store";
import {
  KEY_CATEGORIES,
  IMAGE_PROVIDERS,
  VIDEO_PROVIDERS,
} from "@/lib/constants";
import { getTrendConfig, type TrendConfig } from "@/lib/generation/trend-config";

/**
 * Computes which generation output types are available based on configured keys
 * (spec 5-2-4). Copywriting needs any active LLM key; image/video need an active
 * key for at least one provider in their category.
 */

export interface ProviderAvailability {
  id: string;
  label: string;
  configured: boolean;
}

export interface GenerationConfig {
  copywriting: { available: boolean };
  image: { available: boolean; providers: ProviderAvailability[] };
  video: { available: boolean; providers: ProviderAvailability[] };
  trend: TrendConfig;
}

function availability(
  defs: readonly { id: string; label: string }[],
  activeProviders: Set<string>,
): ProviderAvailability[] {
  return defs.map((d) => ({
    id: d.id,
    label: d.label,
    configured: activeProviders.has(d.id),
  }));
}

export async function getGenerationConfig(): Promise<GenerationConfig> {
  const [llm, image, video, trend] = await Promise.all([
    listKeyMeta(KEY_CATEGORIES.LLM),
    listKeyMeta(KEY_CATEGORIES.IMAGE),
    listKeyMeta(KEY_CATEGORIES.VIDEO),
    getTrendConfig(),
  ]);

  const imageActive = new Set(
    image.filter((k) => k.is_active).map((k) => k.provider),
  );
  const videoActive = new Set(
    video.filter((k) => k.is_active).map((k) => k.provider),
  );
  const imageProviders = availability(IMAGE_PROVIDERS, imageActive);
  const videoProviders = availability(VIDEO_PROVIDERS, videoActive);

  return {
    copywriting: { available: llm.some((k) => k.is_active) },
    image: {
      available: imageProviders.some((p) => p.configured),
      providers: imageProviders,
    },
    video: {
      available: videoProviders.some((p) => p.configured),
      providers: videoProviders,
    },
    trend,
  };
}
