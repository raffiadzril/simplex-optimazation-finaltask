export type Bahan = {
  nama_bahan: string;
  harga: number;
  stok: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BahanInput = {
  nama_bahan: string;
  harga: number;
  stok: number;
};

export type Resep = {
  produk: string;
  bahan: string;
  jumlah_gram: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ResepInput = {
  produk: string;
  bahan: string;
  jumlah_gram: number;
};

export type Parameter = {
  parameter: string;
  nilai: number;
};

export type DataStatus = {
  bahan_loaded: boolean;
  resep_loaded: boolean;
  parameter_loaded: boolean;
  last_update: string;
  total_produk: number;
  total_bahan: number;
};

export type OptimizationResult = {
  status: string;
  jumlah_produksi_optimal: Record<string, number>;
  profit_maksimum: number;
  biaya_produk: Record<string, number>;
  harga_produk: Record<string, number>;
  harga_produk_bulat: Record<string, number>;
  profit_per_produk: Record<string, number>;
};

export type IngredientUsage = {
  bahan: string;
  stockGram: number;
  usedGram: number;
  remainingGram: number;
  percentage: number;
  isBinding: boolean;
};

export type OrModel = {
  variables: Array<{
    symbol: string;
    product: string;
    value: number;
  }>;
  objective: string;
  constraints: Array<{
    bahan: string;
    expression: string;
    rhsGram: number;
  }>;
};

export type TabKey =
  | "hasil"
  | "model"
  | "analisis"
  | "bahan"
  | "resep"
  | "pengaturan";
