export type TabKey = "optimasi" | "bahan" | "resep" | "parameter";

export type DataStatus = {
  bahan_loaded: boolean;
  resep_loaded: boolean;
  parameter_loaded: boolean;
  last_update: string;
  total_produk: number;
  total_bahan: number;
};

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

export type ParameterInput = {
  parameter: string;
  nilai: number;
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
  stok: number;
  terpakai: number;
  sisa: number;
  persentase: number;
};
