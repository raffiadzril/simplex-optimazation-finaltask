import type { Bahan, IngredientUsage, OptimizationResult, OrModel, Resep } from "@/types";
import { formatNumber, titleCase } from "./format";

function round(value: number): number {
  return Number(value.toFixed(6));
}

export function getProducts(resep: Resep[], optimization?: OptimizationResult | null): string[] {
  const names = new Set<string>([
    ...resep.map((item) => item.produk),
    ...Object.keys(optimization?.jumlah_produksi_optimal ?? {}),
    ...Object.keys(optimization?.profit_per_produk ?? {})
  ]);

  return [...names].sort((a, b) => a.localeCompare(b));
}

export function computeIngredientUsage(
  resep: Resep[],
  bahan: Bahan[],
  produksi: Record<string, number> = {}
): IngredientUsage[] {
  const stockGramByBahan = new Map(bahan.map((item) => [item.nama_bahan, item.stok * 1000]));
  const usedGramByBahan = new Map<string, number>();

  for (const item of resep) {
    const quantity = produksi[item.produk] ?? 0;
    const usedGram = quantity * item.jumlah_gram;
    usedGramByBahan.set(item.bahan, (usedGramByBahan.get(item.bahan) ?? 0) + usedGram);
  }

  const names = new Set([...stockGramByBahan.keys(), ...usedGramByBahan.keys()]);

  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((nama) => {
      const stockGram = stockGramByBahan.get(nama) ?? 0;
      const usedGram = usedGramByBahan.get(nama) ?? 0;
      const remainingGram = Math.max(stockGram - usedGram, 0);
      const percentage = stockGram > 0 ? Math.min((usedGram / stockGram) * 100, 100) : 0;

      return {
        bahan: nama,
        stockGram: round(stockGram),
        usedGram: round(usedGram),
        remainingGram: round(remainingGram),
        percentage: round(percentage),
        isBinding: stockGram > 0 && Math.abs(stockGram - usedGram) <= 0.0001
      };
    });
}

export function buildOrModel(
  resep: Resep[],
  bahan: Bahan[],
  optimization: OptimizationResult | null
): OrModel {
  const products = getProducts(resep, optimization);
  const symbolByProduct = new Map(products.map((product, index) => [product, `x${index + 1}`]));

  const variables = products.map((product) => ({
    symbol: symbolByProduct.get(product)!,
    product,
    value: optimization?.jumlah_produksi_optimal[product] ?? 0
  }));

  const objectiveTerms = products
    .map((product) => ({
      symbol: symbolByProduct.get(product)!,
      profit: optimization?.profit_per_produk[product] ?? 0
    }))
    .filter((item) => item.profit > 0)
    .map((item) => `${formatNumber(item.profit)}${item.symbol}`);

  const constraints = bahan.map((ingredient) => {
    const terms = products
      .map((product) => {
        const recipeLine = resep.find(
          (item) => item.produk === product && item.bahan === ingredient.nama_bahan
        );

        if (!recipeLine || recipeLine.jumlah_gram <= 0) {
          return null;
        }

        return `${formatNumber(recipeLine.jumlah_gram)}${symbolByProduct.get(product)}`;
      })
      .filter(Boolean);

    return {
      bahan: ingredient.nama_bahan,
      expression: terms.length ? terms.join(" + ") : "0",
      rhsGram: ingredient.stok * 1000
    };
  });

  const minProductionConstraints = products
    .map((product) => {
      const minimal = optimization?.minimal_produksi?.[product] ?? 0;
      return {
        produk: product,
        symbol: symbolByProduct.get(product)!,
        minimal,
        value: optimization?.jumlah_produksi_optimal[product] ?? 0
      };
    })
    .filter((item) => item.minimal > 0);

  return {
    variables,
    objective: objectiveTerms.length ? `Maksimalkan Z = ${objectiveTerms.join(" + ")}` : "Maksimalkan Z = -",
    constraints,
    minProductionConstraints
  };
}

export function explainResult(
  usage: IngredientUsage[],
  optimization: OptimizationResult | null
): string {
  if (!optimization) {
    return "Hasil belum tersedia.";
  }

  const produced = Object.entries(optimization.jumlah_produksi_optimal)
    .filter(([, quantity]) => quantity > 0)
    .sort(([, a], [, b]) => b - a);
  const binding = usage.filter((item) => item.isBinding || item.percentage >= 99.5);

  if (!produced.length) {
    return "Solver menemukan solusi optimal tanpa produksi positif berdasarkan data aktif.";
  }

  const topProduct = titleCase(produced[0][0]);
  const bindingText = binding.length
    ? ` Bahan pembatas utama: ${binding.map((item) => titleCase(item.bahan)).join(", ")}.`
    : "";

  return `Solver memilih produksi ${topProduct} karena kombinasi profit dan batas stok menghasilkan profit total tertinggi.${bindingText}`;
}
