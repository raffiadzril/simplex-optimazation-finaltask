import { describe, expect, it } from "vitest";
import { computeIngredientUsage } from "./calculations";

describe("computeIngredientUsage", () => {
  it("calculates stock usage from production quantities and recipe grams", () => {
    const result = computeIngredientUsage(
      [
        { produk: "roti coklat", bahan: "tepung terigu", jumlah_gram: 30 },
        { produk: "roti coklat", bahan: "coklat", jumlah_gram: 15 },
        { produk: "roti keju", bahan: "tepung terigu", jumlah_gram: 30 }
      ],
      [
        { nama_bahan: "tepung terigu", stok: 15, harga: 13000 },
        { nama_bahan: "coklat", stok: 9, harga: 85000 }
      ],
      { "roti coklat": 10, "roti keju": 5 }
    );

    expect(result.find((item) => item.bahan === "tepung terigu")).toMatchObject({
      stok: 15,
      terpakai: 0.45,
      sisa: 14.55,
      persentase: 3
    });
    expect(result.find((item) => item.bahan === "coklat")?.terpakai).toBe(0.15);
  });
});
