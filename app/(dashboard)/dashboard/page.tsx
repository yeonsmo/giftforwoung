import { requireUser } from "@/lib/auth/session";

const ROLE_LABEL: Record<string, string> = {
  user: "일반 사용자",
  admin: "관리자",
  super_admin: "최고권한자",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">대시보드</h1>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <dt className="text-xs text-[var(--color-muted)]">계정</dt>
          <dd className="mt-1">{user.email}</dd>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <dt className="text-xs text-[var(--color-muted)]">권한 등급</dt>
          <dd className="mt-1">{ROLE_LABEL[user.role] ?? user.role}</dd>
        </div>
      </dl>
      <p className="text-xs text-[var(--color-muted)]">
        분석, 교차 검증, 생성, 재검증 기능은 이후 단계에서 활성화됩니다.
      </p>
    </div>
  );
}
