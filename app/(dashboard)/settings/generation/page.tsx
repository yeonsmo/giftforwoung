import { requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";
import { GenerationSettings } from "@/components/generation/GenerationSettings";

export const dynamic = "force-dynamic";

export default async function GenerationSettingsPage() {
  await requireRole(ROLES.ADMIN);
  return <GenerationSettings />;
}
