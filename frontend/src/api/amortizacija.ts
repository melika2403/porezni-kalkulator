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

// Sve API funkcije sada primaju `organizationId` umjesto starog `clientId`.
// PLDI dataset je vezan direktno za Organization (vidi backend ensureColumns
// migraciju koja je premjestila stare clientId vezane forme na organizationId).

export function getAmortizacijaYears(organizationId?: number | null) {
  const qs = organizationId != null ? `?organizationId=${organizationId}` : "";
  return request<number[]>(`/api/amortizacija/years${qs}`);
}

export function getAmortizacija(godina: string, organizationId?: number | null) {
  const qs = organizationId != null ? `&organizationId=${organizationId}` : "";
  return request<PldiSaveData | null>(`/api/amortizacija?godina=${godina}${qs}`);
}

export function deleteAmortizacija(godina: string, organizationId?: number | null) {
  const qs = organizationId != null ? `&organizationId=${organizationId}` : "";
  return request<null>(`/api/amortizacija?godina=${godina}${qs}`, { method: "DELETE" });
}

export function saveAmortizacija(
  godina: string,
  data: PldiSaveData,
  organizationId?: number | null,
) {
  return request<{ id: number }>("/api/amortizacija", {
    method: "POST",
    body: JSON.stringify({
      godina,
      ...data,
      organizationId: organizationId ?? null,
    }),
  });
}

// Preuzimanje PLDI obrasca → označi sačuvanu formu kao GENERATED (best-effort).
export function markAmortizacijaGenerated(
  godina: string,
  organizationId?: number | null,
) {
  return request<null>("/api/amortizacija/mark-generated", {
    method: "POST",
    body: JSON.stringify({ godina, organizationId: organizationId ?? null }),
  });
}

// Mapa: organizationId → [godine za koje PLDI postoji]. Frontend koristi za
// "ima li podataka" indikator pored org-e u dropdown-u.
export function getOrgYears() {
  return request<Record<string, number[]>>("/api/amortizacija/org-years");
}
