import { ROLES, type Role } from "@/lib/constants";

/** Privilege rank, higher is more privileged. */
const RANK: Record<Role, number> = {
  [ROLES.USER]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.SUPER_ADMIN]: 3,
};

export function roleAtLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

export function isSuperAdmin(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN;
}

export function isAdminOrAbove(role: Role): boolean {
  return roleAtLeast(role, ROLES.ADMIN);
}

/** Roles that may be assigned through the UI. Super Admin is seed-only. */
export const ASSIGNABLE_ROLES: Role[] = [ROLES.USER, ROLES.ADMIN];

export function isAssignableRole(role: string): role is Role {
  return (ASSIGNABLE_ROLES as string[]).includes(role);
}
