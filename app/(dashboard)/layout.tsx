import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { isAdminOrAbove } from "@/lib/auth/roles";
import { LegislationUpdatePopup } from "@/components/legislation/LegislationUpdatePopup";

const NAV = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/analysis", label: "분석" },
  { href: "/debate", label: "교차 검증" },
  { href: "/generate", label: "생성" },
  { href: "/workflow", label: "재검증" },
  { href: "/settings/legislation", label: "법령 설정" },
  { href: "/settings/ai-keys", label: "AI 키" },
  { href: "/settings/generation", label: "생성 설정" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="grid gap-6 md:grid-cols-[180px_1fr]">
      <aside className="space-y-1 text-sm">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)]"
          >
            {item.label}
          </Link>
        ))}
        {isAdminOrAbove(user.role) ? (
          <Link
            href="/admin"
            className="block rounded-md px-3 py-2 font-medium text-[var(--color-accent)] hover:bg-[var(--color-surface)]"
          >
            관리자
          </Link>
        ) : null}
      </aside>
      <section>{children}</section>
      {isAdminOrAbove(user.role) ? <LegislationUpdatePopup /> : null}
    </div>
  );
}
