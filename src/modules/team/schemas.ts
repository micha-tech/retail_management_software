import { z } from "zod";
import { passwordSchema } from "../auth/schemas";

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  initialPassword: passwordSchema,
  role: z.enum(["ADMIN", "BRANCH_MANAGER", "CASHIER", "STOREKEEPER"]),
  branchIds: z.array(z.uuid()).max(100),
}).superRefine((data, context) => {
  if (!["ADMIN"].includes(data.role) && data.branchIds.length === 0) context.addIssue({ code: "custom", path: ["branchIds"], message: "Assign at least one branch." });
});

export const updateStaffSchema = z.object({ memberId: z.uuid(), role: z.enum(["ADMIN", "BRANCH_MANAGER", "CASHIER", "STOREKEEPER"]), branchIds: z.array(z.uuid()).max(100), active: z.boolean() }).superRefine((data, context) => {
  if (data.role !== "ADMIN" && data.branchIds.length === 0) context.addIssue({ code: "custom", path: ["branchIds"], message: "Assign at least one branch." });
});
