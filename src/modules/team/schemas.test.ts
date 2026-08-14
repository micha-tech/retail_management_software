import { describe, expect, it } from "vitest";

import { createStaffSchema } from "./schemas";

const baseStaff = {
  name: "Amina Bello",
  email: "amina@example.com",
  initialPassword: "A-strong-passphrase-2026",
  role: "CASHIER" as const,
  branchIds: ["4a4a6476-368b-4bb2-8e21-491302f4ab10"],
};

describe("employee feature access", () => {
  it("accepts a cashier with POS-only access", () => {
    expect(createStaffSchema.safeParse({ ...baseStaff, permissions: ["pos:operate"] }).success).toBe(true);
  });

  it("requires at least one feature", () => {
    expect(createStaffSchema.safeParse({ ...baseStaff, permissions: [] }).success).toBe(false);
  });

  it("requires inventory view access with inventory operations", () => {
    expect(createStaffSchema.safeParse({ ...baseStaff, permissions: ["inventory:manage"] }).success).toBe(false);
    expect(createStaffSchema.safeParse({ ...baseStaff, permissions: ["inventory:read", "inventory:manage"] }).success).toBe(true);
  });

  it("rejects unknown feature identifiers", () => {
    expect(createStaffSchema.safeParse({ ...baseStaff, permissions: ["system:root"] }).success).toBe(false);
  });

  it("explains every initial password requirement", () => {
    const result = createStaffSchema.safeParse({ ...baseStaff, initialPassword: "weakpass", permissions: ["pos:operate"] });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.initialPassword).toEqual(expect.arrayContaining(["Use at least 12 characters.", "Add an uppercase letter.", "Add a number."]));
  });
});
