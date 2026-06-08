import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/LoginForm";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;
  const notice =
    error === "inactive" ? "비활성화된 계정입니다. 관리자에게 문의하십시오." : null;

  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{APP_NAME}</h1>
        <p className="text-xs text-[var(--color-muted)]">
          인증된 사용자만 접근할 수 있습니다. 계정은 관리자가 생성합니다.
        </p>
      </div>
      {notice ? (
        <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-muted)]">
          {notice}
        </p>
      ) : null}
      <LoginForm />
    </div>
  );
}
