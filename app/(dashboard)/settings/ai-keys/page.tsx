import { requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";
import { AiKeysSettings } from "@/components/ai/AiKeysSettings";

export const dynamic = "force-dynamic";

export default async function AiKeysSettingsPage() {
  await requireRole(ROLES.ADMIN);
  return <AiKeysSettings />;
}
