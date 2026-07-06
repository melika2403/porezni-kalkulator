import { type ApiResponse } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

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

export type PrebijanjeType = "KOMPENZACIJA" | "CESIJA";
export type RashodKategorija = "ROBA_MATERIJAL" | "OSTALI_RASHODI";

export type PrebijanjeStavka = {
  description: string | null;
  amount: string;
  direction: "IN" | "OUT";
};

export type Prebijanje = {
  id: number;
  type: PrebijanjeType;
  broj: string;
  datum: string;
  iznos: string;
  napomena: string | null;
  partner: { id: number; name: string } | null;
  cesus: { id: number; name: string } | null;
  cesionar: { id: number; name: string } | null;
  stavke: PrebijanjeStavka[];
};

export type PrebijanjePayload = {
  type: PrebijanjeType;
  datum: string; // ISO
  rashodKategorija: RashodKategorija;
  invoiceIds: number[];
  racunIds: number[];
  napomena?: string;
  // kompenzacija
  partnerId?: number;
  // cesija
  cesusPartnerId?: number;
  cesionarPartnerId?: number;
};

export type PrebijanjeResult = {
  id: number;
  broj: string;
  datum: string;
  iznos: number;
  /** stavke koje su ostale djelimično otvorene (strana sa viškom) */
  partial: { vrsta: "FAKTURA" | "ULAZNI_RACUN"; oznaka: string; ostatak: number }[];
};

export function createPrebijanje(orgId: number, payload: PrebijanjePayload) {
  return jsonRequest<PrebijanjeResult>(`/api/prebijanja/${orgId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listPrebijanja(orgId: number) {
  return jsonRequest<Prebijanje[]>(`/api/prebijanja/${orgId}`, {
    method: "GET",
  });
}

export function deletePrebijanje(orgId: number, id: number) {
  return jsonRequest<null>(`/api/prebijanja/${orgId}/${id}`, {
    method: "DELETE",
  });
}
