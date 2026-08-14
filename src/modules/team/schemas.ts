import { z } from "zod";
import { passwordSchema } from "../auth/schemas";
import { permissions } from "../auth/permissions";

const permissionSchema = z.enum(permissions as [typeof permissions[number], ...typeof permissions]);

function validateAccess(data: { permissions: string[] }, context: z.RefinementCtx) {
  if (data.permissions.length === 0) context.addIssue({ code: "custom", path: ["permissions"], message: "Select at least one feature." });
  if (data.permissions.includes("inventory:manage") && !data.permissions.includes("inventory:read")) context.addIssue({ code: "custom", path: ["permissions"], message: "Inventory operations require inventory view access." });
  if (data.permissions.includes("branch:manage") && !data.permissions.includes("branch:read")) context.addIssue({ code: "custom", path: ["permissions"], message: "Branch management requires branch view access." });
}

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  initialPassword: passwordSchema,
  role: z.enum(["ADMIN", "BRANCH_MANAGER", "CASHIER", "STOREKEEPER"]),
  branchIds: z.array(z.uuid()).max(100),
  permissions: z.array(permissionSchema).max(permissions.length),
}).superRefine((data, context) => {
  if (!["ADMIN"].includes(data.role) && data.branchIds.length === 0) context.addIssue({ code: "custom", path: ["branchIds"], message: "Assign at least one branch." });
  validateAccess(data, context);
});

export const updateStaffSchema = z.object({ memberId: z.uuid(), role: z.enum(["ADMIN", "BRANCH_MANAGER", "CASHIER", "STOREKEEPER"]), branchIds: z.array(z.uuid()).max(100), permissions: z.array(permissionSchema).max(permissions.length), active: z.boolean() }).superRefine((data, context) => {
  if (data.role !== "ADMIN" && data.branchIds.length === 0) context.addIssue({ code: "custom", path: ["branchIds"], message: "Assign at least one branch." });
  if (data.active) validateAccess(data, context);
});
