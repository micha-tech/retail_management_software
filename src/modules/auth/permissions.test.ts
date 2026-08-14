import { describe, expect, it } from "vitest";
import { hasPermission, landingPageForRole } from "./permissions";

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
});
