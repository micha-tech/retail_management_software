import { describe, expect, it } from "vitest";
import { onboardingSchema, passwordSchema } from "./schemas";
import { createStaffSchema } from "../team/schemas";

describe("credential validation", () => {
  it("rejects weak passwords", () => expect(passwordSchema.safeParse("alllowercase12").success).toBe(false));
  it("accepts a strong password", () => expect(passwordSchema.safeParse("SecureRetail42").success).toBe(true));
});

describe("staff validation", () => {
  it("requires branch-restricted roles to have an assignment", () => {
    const result = createStaffSchema.safeParse({ name: "Cashier One", email: "cashier@example.com", initialPassword: "SecureRetail42", role: "CASHIER", branchIds: [] });
    expect(result.success).toBe(false);
  });
});

describe("onboarding validation", () => {
  it("normalizes currency while retaining tenant timezone", () => {
    const result = onboardingSchema.parse({ ownerName: "Ada Owner", email: "ada@example.com", password: "SecureRetail42", businessName: "Market Square", currency: "ngn", timezone: "Africa/Lagos", branchName: "Ikeja", branchCode: "IKJ", address: "1 Retail Way" });
    expect(result.currency).toBe("NGN");
    expect(result.timezone).toBe("Africa/Lagos");
  });
});
