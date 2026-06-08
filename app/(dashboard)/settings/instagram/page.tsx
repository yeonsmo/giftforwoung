import { requireUser } from "@/lib/auth/session";
import { isAdminOrAbove } from "@/lib/auth/roles";
import { InstagramPanel } from "@/components/instagram/InstagramPanel";

export const dynamic = "force-dynamic";

export default async function InstagramPage() {
  const user = await requireUser();
  return <InstagramPanel isAdmin={isAdminOrAbove(user.role)} />;
}
