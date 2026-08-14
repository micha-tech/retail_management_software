import { z } from "zod";

export const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(128).regex(/[A-Z]/, "Add an uppercase letter.").regex(/[a-z]/, "Add a lowercase letter.").regex(/[0-9]/, "Add a number.");

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(1).max(128),
});

export const onboardingSchema = z.object({
  ownerName: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  password: passwordSchema,
  businessName: z.string().trim().min(2).max(160),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  timezone: z.string().trim().min(1).max(100),
  branchName: z.string().trim().min(2).max(160),
  branchCode: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9-]+$/),
  address: z.string().trim().max(500).optional(),
});

export type ActionState = { error?: string; fieldErrors?: Record<string, string[]> };
