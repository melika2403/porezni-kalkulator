// API klijent za putne naloge (službena putovanja): dnevnice po Pravilniku
// (neoporezivo 25 KM; >12h = 1 dnevnica, 8-12h = 0,5) + stvarni troškovi.
import type { ApiResponse } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type PutniNalog = {
  id: number;
  broj: number;
  godina: number;
  oznaka: string;
  datum: string;
  workerId: number | null;
  radnikIme: string;
  relacija: string;
  svrha: string;
  prevoznoSredstvo: string | null;
  polazakDatum: string;
  polazakVrijeme: string | null;
  povratakDatum: string;
  povratakVrijeme: string | null;
  dnevnicaIznos: number;
  brojDnevnica: number;
  akontacija: number;
  troskoviPrevoza: number;
  troskoviSmjestaja: number;
  ostaliTroskovi: number;
  ostaloOpis: string | null;
  izvjestaj: string | null;
  /** naknada za upotrebu vlastitog vozila: km x stopa (posebna stavka) */
  predjeniKm: number | null;
  kmStopa: number | null;
  kmNaknada: number;
  /** evidencija isplate; blagajnaNalogId kad je isplaćen iz blagajne */
  isplacenoDatum: string | null;
  blagajnaNalogId: number | null;
  ukupnoDnevnice: number;
  ukupno: number;
  zaIsplatu: number;
};

export type PutniNalogPayload = {
  datum: string;
  workerId?: number | null;
  radnikIme: string;
  relacija: string;
  svrha: string;
  prevoznoSredstvo?: string;
  polazakDatum: string;
  polazakVrijeme?: string;
  povratakDatum: string;
  povratakVrijeme?: string;
  dnevnicaIznos: number;
  brojDnevnica: number;
  akontacija?: number;
  troskoviPrevoza?: number;
  troskoviSmjestaja?: number;
  ostaliTroskovi?: number;
  ostaloOpis?: string;
  izvjestaj?: string;
  predjeniKm?: number | null;
  kmStopa?: number | null;
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

export function listPutniNalozi(orgId: number, godina?: number) {
  const q = godina ? `?godina=${godina}` : "";
  return jsonRequest<PutniNalog[]>(`/api/putni-nalozi/${orgId}${q}`, {
    method: "GET",
  });
}

export function createPutniNalog(orgId: number, payload: PutniNalogPayload) {
  return jsonRequest<PutniNalog>(`/api/putni-nalozi/${orgId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePutniNalog(
  orgId: number,
  id: number,
  payload: PutniNalogPayload,
) {
  return jsonRequest<PutniNalog>(`/api/putni-nalozi/${orgId}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Evidencija isplate naloga; datum null poništava oznaku. */
export function oznaciIsplatu(
  orgId: number,
  id: number,
  payload: { datum: string | null; blagajnaNalogId?: number | null },
) {
  return jsonRequest<PutniNalog>(
    `/api/putni-nalozi/${orgId}/${id}/isplata`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function deletePutniNalog(orgId: number, id: number) {
  return jsonRequest<null>(`/api/putni-nalozi/${orgId}/${id}`, {
    method: "DELETE",
  });
}

/**
 * Prijedlog broja dnevnica iz trajanja puta: svaka puna 24h = 1 dnevnica;
 * ostatak preko 12h = još 1, 8-12h = 0,5, ispod 8h = 0.
 */
export function predlozeneDnevnice(
  polazakDatum: string,
  polazakVrijeme: string | null,
  povratakDatum: string,
  povratakVrijeme: string | null,
): number {
  const start = new Date(`${polazakDatum}T${polazakVrijeme || "00:00"}:00`);
  const end = new Date(`${povratakDatum}T${povratakVrijeme || "00:00"}:00`);
  const sati = (end.getTime() - start.getTime()) / 36e5;
  if (!Number.isFinite(sati) || sati <= 0) return 0;
  let dnevnice = Math.floor(sati / 24);
  const ostatak = sati - dnevnice * 24;
  if (ostatak > 12) dnevnice += 1;
  else if (ostatak >= 8) dnevnice += 0.5;
  return dnevnice;
}
