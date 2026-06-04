import { describe, expect, it } from "vitest";
import { formatCurrency, normalizeKey, parseDecimal, titleCase } from "./format";

describe("format helpers", () => {
  it("normalizes Indonesian form input", () => {
    expect(normalizeKey(" Tepung Terigu ")).toBe("tepung terigu");
    expect(parseDecimal("0,3")).toBe(0.3);
  });

  it("formats display labels and currency", () => {
    expect(titleCase("croissant keju")).toBe("Croissant Keju");
    expect(formatCurrency(510000)).toContain("510.000");
  });
});
