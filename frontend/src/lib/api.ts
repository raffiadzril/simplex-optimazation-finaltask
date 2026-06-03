import type {
  Bahan,
  BahanInput,
  DataStatus,
  OptimizationResult,
  Parameter,
  ParameterInput,
  Resep,
  ResepInput
} from "../types";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "https://simplex-optimazation-finaltask.onrender.com";

type ApiDetail = {
  detail?: unknown;
  message?: unknown;
};

export function normalizeApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Terjadi kesalahan yang belum diketahui.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as ApiDetail | T) : undefined;

  if (!response.ok) {
    const detail = (data as ApiDetail | undefined)?.detail ?? (data as ApiDetail | undefined)?.message;
    throw new Error(typeof detail === "string" ? detail : `HTTP ${response.status}`);
  }

  return data as T;
}

function jsonBody(data: unknown): RequestInit {
  return {
    body: JSON.stringify(data)
  };
}

export const api = {
  getDataStatus: () => request<DataStatus>("/data-status"),
  reloadData: () => request("/reload-data", { method: "POST" }),
  optimize: () => request<OptimizationResult>("/optimize"),
  getBahan: () => request<Bahan[]>("/api/bahan"),
  createBahan: (data: BahanInput) =>
    request<Bahan>("/api/bahan", { method: "POST", ...jsonBody(data) }),
  updateBahan: (namaBahan: string, data: BahanInput) =>
    request<Bahan>(`/api/bahan/${encodeURIComponent(namaBahan)}`, {
      method: "PUT",
      ...jsonBody(data)
    }),
  deleteBahan: (namaBahan: string) =>
    request<void>(`/api/bahan/${encodeURIComponent(namaBahan)}`, { method: "DELETE" }),
  getResep: () => request<Resep[]>("/api/resep"),
  createResep: (data: ResepInput) =>
    request<Resep>("/api/resep", { method: "POST", ...jsonBody(data) }),
  updateResep: (produk: string, bahan: string, data: ResepInput) =>
    request<Resep>(`/api/resep/${encodeURIComponent(produk)}/${encodeURIComponent(bahan)}`, {
      method: "PUT",
      ...jsonBody(data)
    }),
  deleteResep: (produk: string, bahan: string) =>
    request<void>(`/api/resep/${encodeURIComponent(produk)}/${encodeURIComponent(bahan)}`, {
      method: "DELETE"
    }),
  getParameter: () => request<Parameter[]>("/api/parameter"),
  updateParameter: (namaParameter: string, data: ParameterInput) =>
    request<Parameter>(`/api/parameter/${encodeURIComponent(namaParameter)}`, {
      method: "PUT",
      ...jsonBody(data)
    })
};
