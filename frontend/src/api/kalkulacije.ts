// API klijent za maloprodajne kalkulacije (KCM) i šifarnik artikala.
// Obračun je server-side autoritativan; isti obračun za živi prikaz je u
// src/sections/kalkulacije/obracun.ts (mora ostati usklađen sa backendom).
import type { ApiResponse } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type ArtikalTip = "ROBA" | "USLUGA";

export type Artikal = {
  id: number;
  sifra: string;
  naziv: string;
  /** ROBA ide u kalkulacije/lager; USLUGA samo na fakture (nema zaliha) */
  tip: ArtikalTip;
  jm: string;
  barkod: string | null;
  oslobodjenPdv: boolean;
  aktivan: boolean;
};

export type ArtikalPayload = {
  naziv: string;
  sifra?: string;
  tip?: ArtikalTip;
  jm?: string;
  barkod?: string;
  oslobodjenPdv?: boolean;
  aktivan?: boolean;
};

/** Stavka kako je backend vraća (unos + snimljeni obračun). */
export type KalkulacijaStavka = {
  id: number;
  rbr: number;
  artikalId: number;
  sifra: string;
  naziv: string;
  jm: string;
  kolicina: number;
  cijena: number;
  rabatPct: number;
  zavisniTrosakPct: number;
  mpc: number;
  iznos: number;
  rabatIznos: number;
  fakturnaVrijednost: number;
  zavisniTrosak: number;
  nabavniIznos: number;
  nabavnaCijena: number;
  marzaPct: number;
  marzaIznos: number;
  vrijednostBezPdv: number;
  pdvStopa: number;
  pdvIznos: number;
  ulazniPdvIznos: number;
  maloprodajniIznos: number;
};

export type Kalkulacija = {
  id: number;
  broj: number;
  godina: number;
  /** prikaz broja, npr. "249/26" */
  oznaka: string;
  datum: string;
  partner: { id: number; name: string } | null;
  partnerId: number;
  brojRacuna: string;
  datumRacuna: string;
  bezPdv: boolean;
  ulazniRacunId: number | null;
  napomena: string | null;
  fakturnaVrijednost: number;
  zavisniTrosak: number;
  nabavnaVrijednost: number;
  ulazniPdv: number;
  ukalkulisaniPdv: number;
  maloprodajnaVrijednost: number;
  /** fakturna vrijednost + ulazni PDV = ukupan račun dobavljača */
  iznosRacuna: number;
  stavkeCount: number;
  /** status ulaznog računa kalkulacije (badge plaćanja na listi) */
  racunStatus: "OTVOREN" | "PLACEN" | null;
  racunRok: string | null;
};

/** Zadnja stavka artikla sa neke kalkulacije (predpopuna novog unosa). */
export type ZadnjaStavka = {
  kolicina: number;
  cijena: number;
  rabatPct: number;
  zavisniTrosakPct: number;
  mpc: number;
  datum: string;
  /** broj kalkulacije, npr. "3/26" */
  oznaka: string;
};

export type KalkulacijaDetail = Kalkulacija & { stavke: KalkulacijaStavka[] };

export type StavkaPayload = {
  artikalId: number;
  kolicina: number;
  cijena: number;
  rabatPct: number;
  zavisniTrosakPct: number;
  mpc: number;
};

export type KalkulacijaPayload = {
  datum: string;
  partnerId: number;
  brojRacuna: string;
  datumRacuna: string;
  bezPdv?: boolean;
  napomena?: string;
  /** opciono (samo PDV obveznik): odbitni PDV kako piše na računu
   *  dobavljača; pregazi obračunatih 17% u KUF-u i iznosu računa */
  ulazniPdv?: number;
  stavke: StavkaPayload[];
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

export function getZadnjaStavka(orgId: number, artikalId: number) {
  return jsonRequest<ZadnjaStavka | null>(
    `/api/kalkulacije/${orgId}/artikli/${artikalId}/zadnja-stavka`,
    { method: "GET" },
  );
}

// ── kalkulacije ──
export function listKalkulacije(orgId: number, godina?: number) {
  const q = godina ? `?godina=${godina}` : "";
  return jsonRequest<Kalkulacija[]>(`/api/kalkulacije/${orgId}${q}`, {
    method: "GET",
  });
}

export function getKalkulacija(orgId: number, id: number) {
  return jsonRequest<KalkulacijaDetail>(`/api/kalkulacije/${orgId}/${id}`, {
    method: "GET",
  });
}

export function createKalkulacija(orgId: number, payload: KalkulacijaPayload) {
  return jsonRequest<Kalkulacija>(`/api/kalkulacije/${orgId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateKalkulacija(
  orgId: number,
  id: number,
  payload: KalkulacijaPayload,
) {
  return jsonRequest<Kalkulacija>(`/api/kalkulacije/${orgId}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteKalkulacija(orgId: number, id: number) {
  return jsonRequest<null>(`/api/kalkulacije/${orgId}/${id}`, {
    method: "DELETE",
  });
}

// ── izvještaj o marži (RUC) ──
export type MarzaRow = {
  id: number | null;
  /** šifra artikla (grupisanje po artiklu), null po dobavljaču */
  sifra: string | null;
  naziv: string;
  kolicina: number | null;
  brojKalkulacija: number | null;
  nabavniIznos: number;
  vrijednostBezPdv: number;
  marzaIznos: number;
  maloprodajniIznos: number;
  marzaPct: number;
};

export function getMarza(
  orgId: number,
  params: { from?: string; to?: string; groupBy: "artikal" | "dobavljac" },
) {
  const sp = new URLSearchParams({ groupBy: params.groupBy });
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  return jsonRequest<MarzaRow[]>(
    `/api/kalkulacije/${orgId}/marza?${sp.toString()}`,
    { method: "GET" },
  );
}

// ── artikli ──
export function listArtikli(orgId: number) {
  return jsonRequest<Artikal[]>(`/api/kalkulacije/${orgId}/artikli`, {
    method: "GET",
  });
}

export function createArtikal(orgId: number, payload: ArtikalPayload) {
  return jsonRequest<Artikal>(`/api/kalkulacije/${orgId}/artikli`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateArtikal(
  orgId: number,
  id: number,
  payload: Partial<ArtikalPayload>,
) {
  return jsonRequest<Artikal>(`/api/kalkulacije/${orgId}/artikli/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteArtikal(orgId: number, id: number) {
  return jsonRequest<null>(`/api/kalkulacije/${orgId}/artikli/${id}`, {
    method: "DELETE",
  });
}

// ── grupni uvoz šifarnika (Com_Soft XML/CSV) ──
export type UvozPreskocenaStavka = {
  sifra: string;
  naziv: string;
  razlog: string;
};

export type UvozArtikalaResult = {
  ukupno: number;
  dodano: number;
  preskocenoUkupno: number;
  /** lista je ograničena server-side (max 300 stavki) */
  preskoceno: UvozPreskocenaStavka[];
};

export function uvozArtikala(
  orgId: number,
  artikli: {
    sifra: string;
    naziv: string;
    tip?: ArtikalTip;
    jm?: string;
    barkod?: string;
    oslobodjenPdv?: boolean;
    aktivan?: boolean;
  }[],
) {
  return jsonRequest<UvozArtikalaResult>(
    `/api/kalkulacije/${orgId}/artikli/uvoz`,
    { method: "POST", body: JSON.stringify({ artikli }) },
  );
}
