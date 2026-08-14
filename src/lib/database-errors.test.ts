import { describe, expect, it } from "vitest";
import { databaseConstraint, databaseErrorCode, isDatabaseUnavailable } from "./database-errors";

describe("database error classification", () => {
  it("finds details wrapped by a driver or ORM", () => {
    const error = new Error("transaction failed", { cause: { code: "23505", constraint: "users_email_uq" } });
    expect(databaseErrorCode(error)).toBe("23505");
    expect(databaseConstraint(error)).toBe("users_email_uq");
  });

  it("classifies connection exhaustion and timeouts as unavailable", () => {
    expect(isDatabaseUnavailable({ code: "CONNECT_TIMEOUT" })).toBe(true);
    expect(isDatabaseUnavailable({ cause: { code: "53300" } })).toBe(true);
    expect(isDatabaseUnavailable({ code: "23505" })).toBe(false);
  });
});
