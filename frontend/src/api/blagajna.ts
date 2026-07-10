// API klijent za blagajnu: nalozi za naplatu/isplatu gotovine i izvedeni
// blagajnički dnevnik (donos + promet + saldo).
import type { ApiResponse } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type BlagajnaTip = "NAPLATA" | "ISPLATA";

export type BlagajnaNalog = {
  id: number;
  tip: BlagajnaTip;
  broj: number;
  godina: number;
  /** prikaz broja, npr. "12/26" */
  oznaka: string;
  datum: string;
  iznos: number;
  lice: string;
  osnov: string;
  napomena: string | null;
};

export type BlagajnaData = {
  from: string;
  to: string;
  /** saldo blagajne prije početka perioda */
  donos: number;
  naplate: number;
  isplate: number;
  saldo: number;
  /** redni broj dnevnika u godini (broj dana sa prometom do from) */
  dnevnikBroj: number;
  nalozi: BlagajnaNalog[];
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

export function getBlagajna(orgId: number, from: string, to: string) {
  return jsonRequest<BlagajnaData>(
    `/api/blagajna/${orgId}?from=${from}&to=${to}`,
    { method: "GET" },
  );
}

export function createBlagajnaNalog(
  orgId: number,
  payload: {
    tip: BlagajnaTip;
    datum: string;
    iznos: number;
    lice: string;
    osnov: string;
    napomena?: string;
  },
) {
  return jsonRequest<BlagajnaNalog>(`/api/blagajna/${orgId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteBlagajnaNalog(orgId: number, id: number) {
  return jsonRequest<null>(`/api/blagajna/${orgId}/${id}`, {
    method: "DELETE",
  });
}
