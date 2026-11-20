import { describe, expect, it } from "vitest";

import { calculateCartTotals, canTransition, isReservationExpired, reservationDeadline } from "./commerce";
import { isValidSlug, normalizeSku, slugify } from "./slugs";
import { hashToken, rateLimitDecision, safeHexEqual, validateImage } from "./security";
import { parseProductImportRecord } from "./products-import";

describe("PocketShop slugs", () => {
  it("normalizes store and product names", () => {
    expect(slugify("Urban Wear & Co.")).toBe("urban-wear-co");
    expect(slugify("À La Mode")).toBe("a-la-mode");
  });
  it("rejects reserved and malformed slugs", () => {
    expect(isValidSlug("urban-wear")).toBe(true);
    expect(isValidSlug("store")).toBe(false);
    expect(isValidSlug("Bad Slug")).toBe(false);
    expect(isValidSlug("a".repeat(61))).toBe(false);
  });
  it("normalizes SKUs", () => expect(normalizeSku(" sku-1 ")).toBe("SKU-1"));
});

describe("cart arithmetic", () => {
  it("uses integer minor units and rounds deposit up", () => {
    expect(calculateCartTotals([{ quantity: 2, unitPrice: 1050n }, { quantity: 1, unitPrice: 500n }], 700n, 0n, 10)).toEqual({
      subtotal: 2600n, total: 3300n, depositAmount: 330n,
    });
  });
  it("rejects invalid quantities, prices and discounts", () => {
    expect(() => calculateCartTotals([{ quantity: 0, unitPrice: 100n }])).toThrow();
    expect(() => calculateCartTotals([{ quantity: 1, unitPrice: -1n }])).toThrow();
    expect(() => calculateCartTotals([{ quantity: 1, unitPrice: 100n }], 0n, 101n)).toThrow();
    expect(() => calculateCartTotals([{ quantity: 1, unitPrice: 100n }], 0n, 0n, 101)).toThrow();
  });
});

describe("order lifecycle", () => {
  it("allows only documented transitions", () => {
    expect(canTransition("PENDING_PAYMENT", "CONFIRMED")).toBe(true);
    expect(canTransition("DELIVERED", "PROCESSING")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("CONFIRMED", "CONFIRMED")).toBe(false);
  });
  it("expires reservations after the window", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const deadline = reservationDeadline(now);
    expect(isReservationExpired(deadline, now)).toBe(false);
    expect(isReservationExpired(deadline, new Date(now.getTime() + 30 * 60 * 1000))).toBe(true);
  });
});

describe("security helpers", () => {
  it("hashes tokens and compares hex values in constant time", () => {
    const token = "a-random-token";
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(safeHexEqual(hashToken(token), hashToken(token))).toBe(true);
    expect(safeHexEqual(hashToken(token), hashToken("other"))).toBe(false);
    expect(safeHexEqual("zz", "zz")).toBe(false);
  });
  it("resets rate-limit windows and blocks excess attempts", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(rateLimitDecision(5, now, 5, 60_000, now)).toEqual({ allowed: false, resetWindow: false, attempts: 6 });
    expect(rateLimitDecision(5, now, 5, 60_000, new Date(now.getTime() + 60_001)).resetWindow).toBe(true);
  });
  it("validates image magic bytes and size", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
    expect(validateImage(png, "image/png", png.length)).toBeNull();
    expect(validateImage(png, "image/jpeg", png.length)).toContain("do not match");
    expect(validateImage(png, "image/gif", png.length)).toContain("Only JPG");
    expect(validateImage(png, "image/png", 6 * 1024 * 1024)).toContain("5 MB");
  });
});

describe("product import validation", () => {
  it("accepts a valid row", () => {
    const result = parseProductImportRecord({ name: "Linen Shirt", sku: " ln-1 ", price: "12.50", quantity: "4" }, 2);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record).toMatchObject({ sku: "LN-1", price: 1250n, quantity: 4 });
  });
  it("reports all errors without writing data", () => {
    const result = parseProductImportRecord({ name: "x", sku: "", price: "abc", quantity: "-1" }, 7);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("Row 7");
  });
});
