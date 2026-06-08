import { requireUser } from "@/lib/auth/session";
import { WorkflowRunner } from "@/components/workflow/WorkflowRunner";

export const dynamic = "force-dynamic";

export default async function WorkflowPage() {
  await requireUser();
  return <WorkflowRunner />;
}
