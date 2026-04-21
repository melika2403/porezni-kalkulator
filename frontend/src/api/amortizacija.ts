import { type ApiResponse } from "src/api/auth";
import type { ObveznikData, AssetRow } from "src/sections/amortizacija/Amortizacija";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export type PldiSaveData = {
  obveznik: ObveznikData;
  rows: AssetRow[];
};

export function getAmortizacijaYears() {
  return request<number[]>("/api/amortizacija/years");
}

export function getAmortizacija(godina: string) {
  return request<PldiSaveData | null>(`/api/amortizacija?godina=${godina}`);
}

export function deleteAmortizacija(godina: string) {
  return request<null>(`/api/amortizacija?godina=${godina}`, { method: "DELETE" });
}

export function saveAmortizacija(godina: string, data: PldiSaveData) {
  return request<{ id: number }>("/api/amortizacija", {
    method: "POST",
    body: JSON.stringify({ godina, ...data }),
  });
}
