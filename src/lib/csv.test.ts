import { describe, expect, it } from "vitest";
import { csvDocument, csvRecords, parseCsv } from "./csv";

describe("CSV interchange", () => {
  it("round-trips quoted fields and new lines", () => { const output=csvDocument(["sku","notes"],[["ABC-1","Counted, then checked\nby manager"]]); expect(parseCsv(output)).toEqual([["sku","notes"],["ABC-1","Counted, then checked\nby manager"]]); });
  it("protects spreadsheet text from formula injection while retaining numeric variances", () => { const output=csvDocument(["sku","variance"],[["=CMD()",-3]]); expect(output).toContain("\"'=CMD()\""); expect(output).toContain("\"-3\""); });
  it("normalizes headers and reports source row numbers", () => { const [record]=csvRecords("SKU,Counted Quantity\r\nA-1,5",["sku","counted_quantity"]); expect(record).toEqual({rowNumber:2,values:{sku:"A-1",counted_quantity:"5"}}); });
  it("rejects malformed quoted content", () => expect(() => parseCsv('sku,notes\nA,"open')).toThrow());
});
