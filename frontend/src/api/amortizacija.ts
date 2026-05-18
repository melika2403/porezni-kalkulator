import { type ApiResponse } from "src/api/auth";
import type { ObveznikData, AssetRow } from "src/sections/amortizacija/Amortizacija";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

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

export function getAmortizacijaYears(clientId?: number | null) {
  const qs = clientId != null ? `?clientId=${clientId}` : "";
  return request<number[]>(`/api/amortizacija/years${qs}`);
}

export function getAmortizacija(godina: string, clientId?: number | null) {
  const qs = clientId != null ? `&clientId=${clientId}` : "";
  return request<PldiSaveData | null>(`/api/amortizacija?godina=${godina}${qs}`);
}

export function deleteAmortizacija(godina: string, clientId?: number | null) {
  const qs = clientId != null ? `&clientId=${clientId}` : "";
  return request<null>(`/api/amortizacija?godina=${godina}${qs}`, { method: "DELETE" });
}

export function saveAmortizacija(godina: string, data: PldiSaveData, clientId?: number | null) {
  return request<{ id: number }>("/api/amortizacija", {
    method: "POST",
    body: JSON.stringify({ godina, ...data, clientId: clientId ?? null }),
  });
}

export function getClientYears() {
  return request<Record<string, number[]>>("/api/amortizacija/client-years");
}
