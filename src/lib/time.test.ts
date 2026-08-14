import { describe, expect, it } from "vitest";
import { localDateToUtc } from "./time";
describe("timezone boundaries", () => { it("converts Lagos midnight to UTC", () => expect(localDateToUtc("2026-08-14","Africa/Lagos").toISOString()).toBe("2026-08-13T23:00:00.000Z")); });
