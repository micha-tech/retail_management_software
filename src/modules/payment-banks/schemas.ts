import { z } from "zod";

export const paymentBankSchema = z.object({
  bankName: z.string().trim().min(2).max(120),
  branchName: z.string().trim().min(2).max(120),
  accountName: z.string().trim().min(2).max(200),
  accountNumber: z.string().trim().regex(/^[0-9]{6,30}$/, "Account number must be 6–30 digits."),
});