import { z } from "zod";

const optionalDate = z.union([z.literal(""), z.iso.datetime({ local: true })]);
const optionalLimit = z.union([z.literal(""), z.coerce.number().int().min(1).max(1_000_000)]);

export const subscriptionUpdateSchema = z.object({
  businessId: z.uuid(),
  planCode: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{1,49}$/),
  status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"]),
  billingInterval: z.enum(["MONTHLY", "ANNUAL", "MANUAL"]),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  trialEndsAt: optionalDate,
  currentPeriodStartsAt: optionalDate,
  currentPeriodEndsAt: optionalDate,
  gracePeriodEndsAt: optionalDate,
  branchLimit: optionalLimit,
  employeeLimit: optionalLimit,
  provider: z.string().trim().max(50),
  providerCustomerId: z.string().trim().max(200),
  providerSubscriptionId: z.string().trim().max(200),
  notes: z.string().trim().max(2_000),
}).superRefine((data, context) => {
  if ((data.providerCustomerId || data.providerSubscriptionId) && !data.provider) context.addIssue({ code: "custom", path: ["provider"], message: "Enter the billing provider for external IDs." });
});
