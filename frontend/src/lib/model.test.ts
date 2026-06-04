import { describe, expect, it } from "vitest";
import { buildOrModel, computeIngredientUsage } from "./model";
import type { Bahan, OptimizationResult, Resep } from "@/types";

const bahan: Bahan[] = [
  { nama_bahan: "tepung terigu", harga: 13000, stok: 15 },
  { nama_bahan: "keju", harga: 95000, stok: 7 }
];

const resep: Resep[] = [
  { produk: "roti keju", bahan: "tepung terigu", jumlah_gram: 30 },
  { produk: "roti keju", bahan: "keju", jumlah_gram: 15 },
  { produk: "croissant keju", bahan: "tepung terigu", jumlah_gram: 40 },
  { produk: "croissant keju", bahan: "keju", jumlah_gram: 15 }
];

const optimization: OptimizationResult = {
  status: "Optimal",
  jumlah_produksi_optimal: {
    "roti keju": 0,
    "croissant keju": 375
  },
  profit_maksimum: 510000,
  biaya_produk: {},
  harga_produk: {},
  harga_produk_bulat: {},
  profit_per_produk: {
    "roti keju": 802,
    "croissant keju": 1360
  }
};

describe("model helpers", () => {
  it("computes ingredient usage in grams from kg stock and gram recipes", () => {
    const usage = computeIngredientUsage(resep, bahan, optimization.jumlah_produksi_optimal);
    const flour = usage.find((item) => item.bahan === "tepung terigu");

    expect(flour?.usedGram).toBe(15000);
    expect(flour?.stockGram).toBe(15000);
    expect(flour?.isBinding).toBe(true);
  });

  it("builds readable objective and constraints", () => {
    const model = buildOrModel(resep, bahan, optimization);

    expect(model.objective).toContain("1.360x1");
    expect(model.constraints.find((item) => item.bahan === "tepung terigu")?.expression).toContain("40x1");
  });
});
