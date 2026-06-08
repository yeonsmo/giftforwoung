"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLES, type Role } from "@/lib/constants";
import { ASSIGNABLE_ROLES, isSuperAdmin } from "@/lib/auth/roles";
import type { ProfileRow } from "@/types/database";

const ROLE_LABEL: Record<string, string> = {
  user: "일반 사용자",
  admin: "관리자",
  super_admin: "최고권한자",
};

async function api(path: string, init: RequestInit): Promise<void> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    // Surface the raw server error message (spec 9-4).
    throw new Error(data.error ?? `요청 실패 (HTTP ${res.status})`);
  }
}

export function AdminConsole({
  callerId,
  callerRole,
  initialUsers,
}: {
  callerId: string;
  callerRole: Role;
  initialUsers: ProfileRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(ROLES.USER);

  function run(action: () => Promise<void>, ok: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(ok);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      });
      setEmail("");
      setPassword("");
      setRole(ROLES.USER);
    }, "계정을 생성했습니다.");
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">관리자</h1>

      {message ? <p className="text-xs text-green-400">{message}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">신규 계정 생성</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="block text-xs">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs">초기 비밀번호</label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs">권한 등급</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            생성
          </button>
        </form>
        <p className="text-xs text-[var(--color-muted)]">
          최고권한자 등급은 신규 생성으로 부여할 수 없습니다. 초기 시드 계정으로만 존재합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">계정 목록</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)] text-left text-xs text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">이메일</th>
                <th className="px-3 py-2">권한</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">작업</th>
              </tr>
            </thead>
            <tbody>
              {initialUsers.map((u) => {
                const locked = isSuperAdmin(u.role);
                return (
                  <tr key={u.id} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td className="px-3 py-2">
                      {u.is_active ? "활성" : "비활성"}
                    </td>
                    <td className="px-3 py-2">
                      {locked ? (
                        <span className="text-xs text-[var(--color-muted)]">
                          보호됨 (변경 불가)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <select
                            defaultValue={u.role}
                            disabled={pending}
                            onChange={(e) =>
                              run(
                                () =>
                                  api(`/api/admin/users/${u.id}`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ role: e.target.value }),
                                  }),
                                "권한을 변경했습니다.",
                              )
                            }
                            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs"
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () =>
                                  api(`/api/admin/users/${u.id}`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ is_active: !u.is_active }),
                                  }),
                                "상태를 변경했습니다.",
                              )
                            }
                            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface)]"
                          >
                            {u.is_active ? "비활성화" : "활성화"}
                          </button>
                          {u.id !== callerId ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                run(
                                  () =>
                                    api(`/api/admin/users/${u.id}`, {
                                      method: "DELETE",
                                    }),
                                  "계정을 삭제했습니다.",
                                )
                              }
                              className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-[var(--color-surface)]"
                            >
                              삭제
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--color-muted)]">
          현재 로그인: {ROLE_LABEL[callerRole] ?? callerRole}. 최고권한자 보호 규칙은 서버에서 강제됩니다.
        </p>
      </section>
    </div>
  );
}
