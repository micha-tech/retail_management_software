import { describe, expect, it } from "vitest";

import { withToast } from "./toast";

describe("toast redirects", () => {
  it("adds an encoded success message", () => {
    const url = new URL(withToast("/team", "Employee created successfully."), "https://relay.test");
    expect(url.pathname).toBe("/team");
    expect(url.searchParams.get("toast")).toBe("Employee created successfully.");
    expect(url.searchParams.get("toastType")).toBe("success");
    expect(url.searchParams.get("toastId")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("preserves existing query parameters", () => {
    const url = new URL(withToast("/pos?branch=abc", "Cash movement recorded."), "https://relay.test");
    expect(url.searchParams.get("branch")).toBe("abc");
    expect(url.searchParams.get("toast")).toBe("Cash movement recorded.");
  });
});
