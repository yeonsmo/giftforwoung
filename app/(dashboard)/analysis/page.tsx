import { requireUser } from "@/lib/auth/session";
import { AnalysisRunner } from "@/components/ai/AnalysisRunner";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  await requireUser();
  return <AnalysisRunner />;
}
