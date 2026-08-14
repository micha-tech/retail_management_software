import { describe, expect, it } from "vitest";

import { subscriptionUpdateSchema } from "./schemas";

const valid = {
  businessId: "4a4a6476-368b-4bb2-8e21-491302f4ab10",
  planCode: "growth",
  status: "ACTIVE",
  billingInterval: "MONTHLY",
  amount: "50000.00",
  currency: "NGN",
  trialEndsAt: "",
  currentPeriodStartsAt: "2026-08-01T00:00",
  currentPeriodEndsAt: "2026-09-01T00:00",
  gracePeriodEndsAt: "",
  branchLimit: "10",
  employeeLimit: "50",
  provider: "",
  providerCustomerId: "",
  providerSubscriptionId: "",
  notes: "",
};

describe("platform subscription updates", () => {
  it("accepts managed plans and limits", () => {
    expect(subscriptionUpdateSchema.safeParse(valid).success).toBe(true);
  });

  it("allows unlimited branches and employees", () => {
    expect(subscriptionUpdateSchema.safeParse({ ...valid, branchLimit: "", employeeLimit: "" }).success).toBe(true);
  });

  it("rejects negative billing amounts and invalid statuses", () => {
    expect(subscriptionUpdateSchema.safeParse({ ...valid, amount: "-1" }).success).toBe(false);
    expect(subscriptionUpdateSchema.safeParse({ ...valid, status: "DELETED" }).success).toBe(false);
  });
});
