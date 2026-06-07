import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES } from "@/lib/constants";
import { AdminConsole } from "@/components/admin/AdminConsole";
import type { ProfileRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const caller = await requireRole(ROLES.ADMIN);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,email,role,is_active,created_at,updated_at")
    .order("created_at", { ascending: true });

  // Per spec 9-4, surface the raw error rather than silently recovering.
  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">관리자</h1>
        <p className="text-sm text-red-400">계정 목록 조회 오류: {error.message}</p>
      </div>
    );
  }

  return (
    <AdminConsole
      callerId={caller.id}
      callerRole={caller.role}
      initialUsers={(data ?? []) as ProfileRow[]}
    />
  );
}
