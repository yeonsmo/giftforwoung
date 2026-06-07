import { requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/constants";
import { LegislationSettings } from "@/components/legislation/LegislationSettings";

export const dynamic = "force-dynamic";

export default async function LegislationSettingsPage() {
  const caller = await requireRole(ROLES.ADMIN);
  return <LegislationSettings callerRole={caller.role} />;
}
