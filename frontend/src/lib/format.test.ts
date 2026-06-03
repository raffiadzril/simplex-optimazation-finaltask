import { describe, expect, it } from "vitest";
import { formatCurrency, toTitleCase } from "./format";

describe("format helpers", () => {
  it("formats Indonesian rupiah without decimals", () => {
    expect(formatCurrency(27000)).toBe("Rp27.000");
  });

  it("converts backend keys into readable names", () => {
    expect(toTitleCase("croissant_coklat")).toBe("Croissant Coklat");
    expect(toTitleCase("gula pasir")).toBe("Gula Pasir");
  });
});
