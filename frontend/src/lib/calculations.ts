import type { Bahan, IngredientUsage, Resep } from "../types";

function roundMetric(value: number): number {
  return Number(value.toFixed(6));
}

export function computeIngredientUsage(
  resep: Resep[],
  bahan: Bahan[],
  produksi: Record<string, number> = {}
): IngredientUsage[] {
  const stockByName = new Map(bahan.map((item) => [item.nama_bahan, item.stok]));
  const usedByName = new Map<string, number>();

  for (const item of resep) {
    const quantity = produksi[item.produk] ?? 0;
    const usedKg = (quantity * item.jumlah_gram) / 1000;
    usedByName.set(item.bahan, (usedByName.get(item.bahan) ?? 0) + usedKg);
  }

  const names = new Set([...stockByName.keys(), ...usedByName.keys()]);

  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((nama) => {
      const stok = stockByName.get(nama) ?? 0;
      const terpakai = usedByName.get(nama) ?? 0;
      const sisa = Math.max(stok - terpakai, 0);

      return {
        bahan: nama,
        stok: roundMetric(stok),
        terpakai: roundMetric(terpakai),
        sisa: roundMetric(sisa),
        persentase: roundMetric(stok > 0 ? Math.min((terpakai / stok) * 100, 100) : 0)
      };
    });
}
