import { describe, expect, it } from "vitest";
import { normalizeApiError } from "./api";

describe("normalizeApiError", () => {
  it("returns Error messages", () => {
    expect(normalizeApiError(new Error("Backend offline"))).toBe("Backend offline");
  });

  it("handles unknown values", () => {
    expect(normalizeApiError({})).toBe("Terjadi kesalahan yang belum diketahui.");
  });
});
