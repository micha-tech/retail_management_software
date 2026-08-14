import type { BusinessRole } from "@/db/schema";

export const permissions = [
  "business:manage",
  "dashboard:read",
  "branch:read",
  "branch:manage",
  "team:manage",
  "product:manage",
  "inventory:read",
  "inventory:manage",
  "pos:operate",
  "sales:read",
  "report:read",
  "audit:read",
] as const;

export type Permission = (typeof permissions)[number];

const all = new Set<Permission>(permissions);
const rolePermissions: Record<BusinessRole, ReadonlySet<Permission>> = {
  OWNER: all,
  ADMIN: all,
  BRANCH_MANAGER: new Set(["dashboard:read", "branch:read", "inventory:read", "inventory:manage", "pos:operate", "sales:read", "report:read"]),
  CASHIER: new Set(["pos:operate"]),
  STOREKEEPER: new Set(["inventory:read", "inventory:manage"]),
};

export function hasPermission(role: BusinessRole, permission: Permission) {
  return rolePermissions[role].has(permission);
}

export function landingPageForRole(role: BusinessRole) {
  if (role === "CASHIER") return "/pos";
  if (role === "STOREKEEPER") return "/inventory";
  return "/overview";
}
