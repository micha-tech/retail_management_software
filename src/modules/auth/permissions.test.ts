import { describe, expect, it } from "vitest";
import { effectivePermissions, hasPermission, landingPageForAccess, landingPageForRole } from "./permissions";

describe("role permissions", () => {
  it("grants owners full business administration", () => {
    expect(hasPermission("OWNER", "business:manage")).toBe(true);
    expect(hasPermission("OWNER", "audit:read")).toBe(true);
  });

  it("keeps cashiers out of inventory and reports", () => {
    expect(hasPermission("CASHIER", "pos:operate")).toBe(true);
    expect(hasPermission("CASHIER", "inventory:manage")).toBe(false);
    expect(hasPermission("CASHIER", "report:read")).toBe(false);
    expect(hasPermission("CASHIER", "dashboard:read")).toBe(false);
    expect(landingPageForRole("CASHIER")).toBe("/pos");
  });

  it("allows storekeepers to operate inventory but not sales", () => {
    expect(hasPermission("STOREKEEPER", "inventory:manage")).toBe(true);
    expect(hasPermission("STOREKEEPER", "sales:read")).toBe(false);
    expect(landingPageForRole("STOREKEEPER")).toBe("/inventory");
  });

  it("uses an employee's explicit feature access instead of the role preset", () => {
    expect(hasPermission("CASHIER", "pos:operate", ["sales:read"])).toBe(false);
    expect(hasPermission("CASHIER", "sales:read", ["sales:read"])).toBe(true);
    expect(effectivePermissions("CASHIER", ["sales:read"])).toEqual(["sales:read"]);
    expect(landingPageForAccess("CASHIER", ["sales:read"])).toBe("/sales");
  });

  it("never restricts the business owner with stored overrides", () => {
    expect(hasPermission("OWNER", "business:manage", [])).toBe(true);
  });
});
