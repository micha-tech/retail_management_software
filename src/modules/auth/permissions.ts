import type { BusinessRole } from "@/db/schema";

export const permissionDefinitions = [
  { value: "dashboard:read", label: "Overview", description: "View business performance and dashboard metrics." },
  { value: "pos:operate", label: "Point of sale", description: "Open POS sessions and complete sales." },
  { value: "sales:read", label: "Sales", description: "View sales, receipts, and transaction details." },
  { value: "inventory:read", label: "Inventory view", description: "View stock balances, movements, counts, and exports." },
  { value: "inventory:manage", label: "Inventory operations", description: "Receive, adjust, transfer, import, and count stock." },
  { value: "product:manage", label: "Products", description: "Create and edit products, pricing, and categories." },
  { value: "report:read", label: "Reports", description: "View and export operational reports." },
  { value: "branch:read", label: "Branches", description: "View branch details and assigned locations." },
  { value: "branch:manage", label: "Branch management", description: "Create and update branch locations." },
  { value: "team:manage", label: "Team access", description: "Create employees and manage their access." },
  { value: "audit:read", label: "Audit log", description: "Review security and operational audit events." },
  { value: "business:manage", label: "Business settings", description: "Update business-wide configuration." },
] as const;

export type Permission = (typeof permissionDefinitions)[number]["value"];
export const permissions = permissionDefinitions.map((definition) => definition.value) as Permission[];

const all = new Set<Permission>(permissions);
const rolePermissions: Record<BusinessRole, ReadonlySet<Permission>> = {
  OWNER: all,
  ADMIN: all,
  BRANCH_MANAGER: new Set(["dashboard:read", "branch:read", "inventory:read", "inventory:manage", "pos:operate", "sales:read", "report:read"]),
  CASHIER: new Set(["pos:operate"]),
  STOREKEEPER: new Set(["inventory:read", "inventory:manage"]),
};

export function defaultPermissionsForRole(role: BusinessRole) {
  return permissions.filter((permission) => rolePermissions[role].has(permission));
}

export function effectivePermissions(role: BusinessRole, assigned?: readonly string[] | null) {
  if (role === "OWNER" || assigned === null || assigned === undefined) return defaultPermissionsForRole(role);
  const selected = new Set(assigned);
  return permissions.filter((permission) => selected.has(permission));
}

export function hasPermission(role: BusinessRole, permission: Permission, assigned?: readonly string[] | null) {
  return effectivePermissions(role, assigned).includes(permission);
}

const landingPages: { permission: Permission; href: string }[] = [
  { permission: "dashboard:read", href: "/overview" },
  { permission: "pos:operate", href: "/pos" },
  { permission: "sales:read", href: "/sales" },
  { permission: "inventory:read", href: "/inventory" },
  { permission: "inventory:manage", href: "/transfers" },
  { permission: "product:manage", href: "/products" },
  { permission: "report:read", href: "/reports" },
  { permission: "branch:read", href: "/branches" },
  { permission: "team:manage", href: "/team" },
  { permission: "audit:read", href: "/audit" },
  { permission: "business:manage", href: "/settings" },
];

export function landingPageForAccess(role: BusinessRole, assigned?: readonly string[] | null) {
  return landingPages.find(({ permission }) => hasPermission(role, permission, assigned))?.href ?? "/overview";
}

export function landingPageForRole(role: BusinessRole) {
  return landingPageForAccess(role);
}
