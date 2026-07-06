// D-PDV (Dodatak uz PDV prijavu): ručni unos stavki po poreznom periodu.
// Stavke su mapa ključ → iznos u KM; katalog stavki definiše DPdvForm.
import type { ApiResponse } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type PdvDodatak = {
  id: number;
  organizationId: number;
  year: number;
  month: number;
  preteznaDjelatnost: string | null;
  fields: Record<string, number> | null;
};

export type PdvDodatakPayload = {
  year: number;
  month: number;
  preteznaDjelatnost?: string | null;
  fields: Record<string, number>;
};

async function jsonRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export function getPdvDodatak(orgId: number, year: number, month: number) {
  return jsonRequest<PdvDodatak | null>(
    `/api/pdv/${orgId}/dodatak?year=${year}&month=${month}`,
    { method: "GET" },
  );
}

export function upsertPdvDodatak(orgId: number, payload: PdvDodatakPayload) {
  return jsonRequest<PdvDodatak>(`/api/pdv/${orgId}/dodatak`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
