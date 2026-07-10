// API klijent za lager listu i popis (inventuru). Stanje se izvodi na
// backend-u iz kalkulacija + proknjiženih popisa, po artiklu i MPC-u.
import type { ApiResponse } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type LagerRow = {
  artikalId: number;
  sifra: string;
  naziv: string;
  jm: string;
  mpc: number;
  kolicina: number;
  /** kolicina × mpc */
  vrijednost: number;
};

export type PopisStatus = "DRAFT" | "PROKNJIZEN";

export type Popis = {
  id: number;
  broj: number;
  godina: number;
  /** prikaz broja, npr. "1/26" */
  oznaka: string;
  datum: string;
  status: PopisStatus;
  napomena: string | null;
  stavkeCount: number;
};

export type PopisStavka = {
  id: number;
  artikalId: number;
  sifra: string;
  naziv: string;
  jm: string;
  mpc: number;
  nabavnaCijena: number;
  pdvStopa: number;
  knjigKolicina: number;
  popisKolicina: number;
};

export type PopisDetail = Popis & { stavke: PopisStavka[] };

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

export type ArtikalKarticaEvent = {
  tip: "KALKULACIJA" | "POPIS" | "NIVELACIJA" | "POVRAT" | "OTPIS";
  datum: string;
  /** broj dokumenta, npr. "3/26" */
  oznaka: string;
  /** dobavljač za kalkulaciju, null za popis */
  opis: string | null;
  /** promjena količine (+ ulaz, popis može biti ±) */
  kolicina: number;
  mpc: number;
  nabavnaCijena: number | null;
  /** tekuće stanje nakon događaja */
  stanje: number;
};

export type ArtikalKartica = {
  artikal: {
    id: number;
    sifra: string;
    naziv: string;
    tip: "ROBA" | "USLUGA";
    jm: string;
    barkod: string | null;
    oslobodjenPdv: boolean;
    aktivan: boolean;
  };
  stanje: number;
  events: ArtikalKarticaEvent[];
};

export function getArtikalKartica(orgId: number, artikalId: number) {
  return jsonRequest<ArtikalKartica>(
    `/api/lager/${orgId}/artikal/${artikalId}`,
    { method: "GET" },
  );
}

export type TkmEvent = {
  datum: string;
  opis: string;
  zaduzenje: number;
  razduzenje: number;
  /** red dnevnog/mjesečnog pazara u TKM-u: može se obrisati */
  tkmPazarId?: number | null;
};

export type TkmData = {
  godina: number;
  /** saldo prenesen iz prethodnih godina (automatski) */
  donos: number;
  /** ručno uneseno početno stanje za godinu (null = nije uneseno) */
  rucnoPocetno: number | null;
  rucnoNapomena: string | null;
  events: TkmEvent[];
};

export function getTkm(orgId: number, godina: number) {
  return jsonRequest<TkmData>(`/api/lager/${orgId}/tkm?godina=${godina}`, {
    method: "GET",
  });
}

export type TkmPazarRow = {
  id: number;
  datum: string;
  iznos: number;
  opis: string | null;
};

/** Evidencija dnevnog prometa za godinu (TKM razduženje + KP-1042). */
export function listTkmPazari(orgId: number, godina: number) {
  return jsonRequest<TkmPazarRow[]>(
    `/api/lager/${orgId}/tkm/pazari?godina=${godina}`,
    { method: "GET" },
  );
}

/** Dnevni pazar SAMO za TKM (ne ide u KIF ni PDV evidencije). */
export function addTkmPazar(
  orgId: number,
  payload: { datum: string; iznos: number; opis?: string },
) {
  return jsonRequest<{ id: number }>(`/api/lager/${orgId}/tkm/pazar`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteTkmPazar(orgId: number, id: number) {
  return jsonRequest<null>(`/api/lager/${orgId}/tkm/pazar/${id}`, {
    method: "DELETE",
  });
}

export function setTkmPocetnoStanje(
  orgId: number,
  payload: { godina: number; iznos: number; napomena?: string },
) {
  return jsonRequest<null>(`/api/lager/${orgId}/tkm/pocetno-stanje`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ── nivelacije (zapisnik o promjeni cijena) ──
export type NivelacijaStavka = {
  id: number;
  artikalId: number;
  sifra: string;
  naziv: string;
  jm: string;
  kolicina: number;
  staraMpc: number;
  novaMpc: number;
  vrijednostStara: number;
  vrijednostNova: number;
  razlika: number;
};

export type Nivelacija = {
  id: number;
  broj: number;
  godina: number;
  oznaka: string;
  datum: string;
  napomena: string | null;
  vrijednostStara: number;
  vrijednostNova: number;
  razlika: number;
  stavke: NivelacijaStavka[];
};

export type NivelacijaPayload = {
  datum: string;
  napomena?: string;
  stavke: {
    artikalId: number;
    staraMpc: number;
    novaMpc: number;
    kolicina: number;
  }[];
};

export function listNivelacije(orgId: number) {
  return jsonRequest<Nivelacija[]>(`/api/lager/${orgId}/nivelacije`, {
    method: "GET",
  });
}

export function createNivelacija(orgId: number, payload: NivelacijaPayload) {
  return jsonRequest<{ id: number; oznaka: string }>(
    `/api/lager/${orgId}/nivelacije`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function deleteNivelacija(orgId: number, id: number) {
  return jsonRequest<null>(`/api/lager/${orgId}/nivelacije/${id}`, {
    method: "DELETE",
  });
}

// ── razduženja (povrat dobavljaču / otpis) ──
export type RazduzenjeTip = "POVRAT" | "OTPIS";

export type RazduzenjeStavka = {
  id: number;
  artikalId: number;
  sifra: string;
  naziv: string;
  jm: string;
  mpc: number;
  kolicina: number;
  nabavnaCijena: number;
  pdvStopa: number;
  maloprodajniIznos: number;
  nabavniIznos: number;
  pdvIznos: number;
};

export type Razduzenje = {
  id: number;
  tip: RazduzenjeTip;
  broj: number;
  godina: number;
  oznaka: string;
  datum: string;
  partner: { id: number; name: string } | null;
  razlog: string | null;
  /** knjižna obavijest u KUF-u kreirana iz povrata */
  ulazniRacunId: number | null;
  maloprodajnaVrijednost: number;
  nabavnaVrijednost: number;
  pdvIznos: number;
  stavke: RazduzenjeStavka[];
};

export type RazduzenjePayload = {
  tip: RazduzenjeTip;
  datum: string;
  partnerId?: number;
  razlog?: string;
  /** broj knjižne obavijesti dobavljača (povrat); prazno = automatski */
  brojKO?: string;
  stavke: { artikalId: number; mpc: number; kolicina: number }[];
};

export function listRazduzenja(orgId: number) {
  return jsonRequest<Razduzenje[]>(`/api/lager/${orgId}/razduzenja`, {
    method: "GET",
  });
}

export function createRazduzenje(orgId: number, payload: RazduzenjePayload) {
  return jsonRequest<{ id: number; oznaka: string }>(
    `/api/lager/${orgId}/razduzenja`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function deleteRazduzenje(orgId: number, id: number) {
  return jsonRequest<null>(`/api/lager/${orgId}/razduzenja/${id}`, {
    method: "DELETE",
  });
}

export function getLager(orgId: number, datum?: string) {
  const q = datum ? `?datum=${datum}` : "";
  return jsonRequest<{ datum: string; rows: LagerRow[] }>(
    `/api/lager/${orgId}${q}`,
    { method: "GET" },
  );
}

export function listPopisi(orgId: number) {
  return jsonRequest<Popis[]>(`/api/lager/${orgId}/popisi`, { method: "GET" });
}

export function createPopis(
  orgId: number,
  payload: { datum: string; napomena?: string },
) {
  return jsonRequest<Popis>(`/api/lager/${orgId}/popisi`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPopis(orgId: number, id: number) {
  return jsonRequest<PopisDetail>(`/api/lager/${orgId}/popisi/${id}`, {
    method: "GET",
  });
}

export function updatePopis(
  orgId: number,
  id: number,
  payload: {
    napomena?: string;
    stavke?: { id: number; popisKolicina: number }[];
  },
) {
  return jsonRequest<null>(`/api/lager/${orgId}/popisi/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function refreshPopis(orgId: number, id: number) {
  return jsonRequest<null>(`/api/lager/${orgId}/popisi/${id}/refresh`, {
    method: "POST",
  });
}

export function proknjiziPopis(orgId: number, id: number) {
  return jsonRequest<null>(`/api/lager/${orgId}/popisi/${id}/proknjizi`, {
    method: "POST",
  });
}

export function otknjiziPopis(orgId: number, id: number) {
  return jsonRequest<null>(`/api/lager/${orgId}/popisi/${id}/otknjizi`, {
    method: "POST",
  });
}

export function deletePopis(orgId: number, id: number) {
  return jsonRequest<null>(`/api/lager/${orgId}/popisi/${id}`, {
    method: "DELETE",
  });
}
