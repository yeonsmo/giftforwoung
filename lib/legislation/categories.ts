import { LEGISLATION_CATEGORIES, type LegislationCategory } from "@/lib/constants";

/**
 * Search queries (law/regulation names) used to collect each of the seven
 * categories from the 법제처 OPEN API (spec 3-2). Multiple queries per category
 * make the collection broad and multi-faceted (spec 3-2 "다중적이고 방대하게").
 *
 * These are the canonical names of the relevant statutes and rules. They are
 * externalized here (not hardcoded inside the client) so they can be extended
 * without touching collection logic.
 */
export const CATEGORY_QUERIES: Record<LegislationCategory, string[]> = {
  "보험업법 및 시행령·시행규칙": [
    "보험업법",
    "보험업법 시행령",
    "보험업법 시행규칙",
  ],
  "표시·광고의 공정화에 관한 법률": [
    "표시·광고의 공정화에 관한 법률",
    "표시·광고의 공정화에 관한 법률 시행령",
  ],
  "금융소비자 보호에 관한 법률": [
    "금융소비자 보호에 관한 법률",
    "금융소비자 보호에 관한 법률 시행령",
    "금융소비자 보호에 관한 법률 감독규정",
  ],
  "금융위원회 보험업감독규정": ["보험업감독규정"],
  "보험업감독업무시행세칙": ["보험업감독업무시행세칙"],
  "관련 행정규칙 및 고시": [
    "보험 광고 고시",
    "보험상품 광고 규정",
    "금융소비자 광고 규제",
  ],
  "공정거래위원회 표시·광고 심사지침": [
    "표시·광고 심사지침",
    "보험 표시·광고 심사지침",
  ],
};

export function allCategories(): LegislationCategory[] {
  return [...LEGISLATION_CATEGORIES];
}
