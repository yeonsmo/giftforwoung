import { requireUser } from "@/lib/auth/session";
import { GenerateRunner } from "@/components/generation/GenerateRunner";

export const dynamic = "force-dynamic";

export default async function GeneratePage() {
  await requireUser();
  return <GenerateRunner />;
}
