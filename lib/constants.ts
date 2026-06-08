/**
 * Cross-cutting constants shared across steps.
 */

/** Role tiers (Step 2). Order reflects privilege, lowest to highest. */
export const ROLES = {
  USER: "user",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Legislation categories collected from the 법제처 API (Step 3).
 * These are the seven ranges named in the specification.
 */
export const LEGISLATION_CATEGORIES = [
  "보험업법 및 시행령·시행규칙",
  "표시·광고의 공정화에 관한 법률",
  "금융소비자 보호에 관한 법률",
  "금융위원회 보험업감독규정",
  "보험업감독업무시행세칙",
  "관련 행정규칙 및 고시",
  "공정거래위원회 표시·광고 심사지침",
] as const;

export type LegislationCategory = (typeof LEGISLATION_CATEGORIES)[number];

/**
 * Supported AI providers for analysis/generation key management (Step 4+).
 * Gemini is the default Vision LLM (spec 4-1-3).
 */
export const AI_PROVIDERS = [
  { id: "gemini", label: "Gemini (Vision LLM)" },
  { id: "openai", label: "OpenAI GPT" },
  { id: "anthropic", label: "Anthropic Claude" },
] as const;

export type AiProviderId = (typeof AI_PROVIDERS)[number]["id"];

export const DEFAULT_AI_PROVIDER: AiProviderId = "gemini";

/** Key categories in ai_provider_keys (Step 6 separates LLM from image/video). */
export const KEY_CATEGORIES = {
  LLM: "llm",
  IMAGE: "image",
  VIDEO: "video",
} as const;

/** Image generation providers (spec 5-2-1). */
export const IMAGE_PROVIDERS = [
  { id: "openai_dalle", label: "OpenAI DALL-E" },
  { id: "google_imagen", label: "Google Imagen" },
  { id: "stability", label: "Stability AI" },
] as const;

/** Video generation providers (spec 5-2-3). */
export const VIDEO_PROVIDERS = [
  { id: "runway", label: "Runway" },
  { id: "pika", label: "Pika" },
  { id: "google_veo", label: "Google Veo" },
] as const;

/** Generation output types (Step 6). */
export const GENERATION_OUTPUT_TYPES = {
  IMAGE: "image",
  COPYWRITING: "copywriting",
  VIDEO: "video",
} as const;

export const APP_NAME = "보험광고 법령 검증 시스템";
