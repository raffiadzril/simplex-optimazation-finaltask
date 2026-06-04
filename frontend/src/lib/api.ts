import type {
  Bahan,
  BahanInput,
  DataStatus,
  OptimizationResult,
  Parameter,
  Resep,
  ResepInput
} from "@/types";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "https://simplex-optimazation-finaltask.onrender.com";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    let detail = `Request gagal dengan status ${response.status}.`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        detail = body.detail
          .map((item: { msg?: string }) => item.msg)
          .filter(Boolean)
          .join(", ");
      }
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function encodePart(value: string): string {
  return encodeURIComponent(value);
}

export function normalizeApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}

export const api = {
  getDataStatus: () => request<DataStatus>("/data-status"),
  reloadData: () => request<{ status: string }>("/reload-data", { method: "POST" }),
  optimize: () => request<OptimizationResult>("/optimize"),
  getBahan: () => request<Bahan[]>("/api/bahan"),
  createBahan: (payload: BahanInput) =>
    request<Bahan>("/api/bahan", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateBahan: (namaBahan: string, payload: BahanInput) =>
    request<Bahan>(`/api/bahan/${encodePart(namaBahan)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteBahan: (namaBahan: string) =>
    request<void>(`/api/bahan/${encodePart(namaBahan)}`, { method: "DELETE" }),
  getResep: () => request<Resep[]>("/api/resep"),
  createResep: (payload: ResepInput) =>
    request<Resep>("/api/resep", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateResep: (produk: string, bahan: string, payload: ResepInput) =>
    request<Resep>(`/api/resep/${encodePart(produk)}/${encodePart(bahan)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteResep: (produk: string, bahan: string) =>
    request<void>(`/api/resep/${encodePart(produk)}/${encodePart(bahan)}`, {
      method: "DELETE"
    }),
  getParameter: () => request<Parameter[]>("/api/parameter"),
  updateParameter: (namaParameter: string, payload: Parameter) =>
    request<Parameter>(`/api/parameter/${encodePart(namaParameter)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    })
};
