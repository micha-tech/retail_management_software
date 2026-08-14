import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9-]+$/),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.literal(""), z.email().max(254)]).optional(),
  timezone: z.string().trim().min(1).max(100),
});
export const updateBranchSchema = createBranchSchema.extend({ branchId: z.uuid(), active: z.string().optional() });
