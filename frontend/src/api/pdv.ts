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

// ── Stanje PDV-a (knjiga knjiženja prema UINO) ───────────────────────────────

export type PdvKnjizenjeVrsta =
  | "OBAVEZA"
  | "PRETPLATA"
  | "UPLATA"
  | "POVRAT"
  | "KOREKCIJA";

export type PdvKnjizenje = {
  id: number;
  datum: string;
  /** porezni period "YYYY-MM" (null za korekcije bez perioda) */
  period: string | null;
  vrsta: PdvKnjizenjeVrsta;
  /** true povećava dug, false ga smanjuje */
  zaduzenje: boolean;
  iznos: number;
  opis: string | null;
  transactionId: number | null;
};

export type PdvPrijedlog = {
  transactionId: number;
  datum: string | null;
  opis: string;
  iznos: number;
  vrsta: "UPLATA" | "POVRAT";
};

export type PdvStanje = {
  /** > 0 dug, 0 izmireno, < 0 pretplata */
  saldo: number;
  knjizenja: PdvKnjizenje[];
  prijedlozi: PdvPrijedlog[];
};

export type PdvKnjizenjePayload = {
  datum: string;
  vrsta: PdvKnjizenjeVrsta;
  iznos: number;
  period?: string | null;
  opis?: string;
  /** samo za KOREKCIJA: true = zaduženje, false = odobrenje */
  zaduzenje?: boolean;
  transactionId?: number | null;
};

export function getPdvStanje(orgId: number) {
  return jsonRequest<PdvStanje>(`/api/pdv/${orgId}/stanje`, { method: "GET" });
}

export function createPdvKnjizenje(
  orgId: number,
  payload: PdvKnjizenjePayload,
) {
  return jsonRequest<PdvKnjizenje>(`/api/pdv/${orgId}/stanje`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deletePdvKnjizenje(orgId: number, id: number) {
  return jsonRequest<null>(`/api/pdv/${orgId}/stanje/${id}`, {
    method: "DELETE",
  });
}
