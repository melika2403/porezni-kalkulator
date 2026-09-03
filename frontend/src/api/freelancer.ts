// PK Freelancer: evidencija uplata iz inostranstva po korisniku (fizičko lice),
// pristup/proba, kurs CBBiH, pregledi, GPD podaci, potvrda, prilozi, postavke.
import { type ApiResponse } from "src/api/auth";
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

export type FreelancerIzvor = "admin" | "freelancer" | "paket" | "proba" | null;

export type FreelancerPristup = {
  hasAccess: boolean;
  izvor: FreelancerIzvor;
  plan: string | null;
  endDate: string | null;
  proba: { aktivna: boolean; endsAt: string | null; iskoristena: boolean };
  besplatno: { maxUplataGodisnje: number; maxIsplatilaca: number };
  godina: number;
  brojUplataOveGodine: number;
  brojIsplatilaca: number;
  ukupnoUplata: number;
  probaDana: number;
};

export type UplataStatus = "OBRACUNATO" | "PLACENO" | "PREDANO";

export type FreelancerUplata = {
  id: number;
  userId: number;
  datumPrimitka: string;
  periodMjesec: number;
  periodGodina: number;
  primalacIme: string | null;
  primalacJmbg: string | null;
  primalacAdresa: string | null;
  isplatilacId: number | null;
  isplatilacNaziv: string;
  isplatilacAdresa: string | null;
  isplatilacGrad: string | null;
  isplatilacDrzava: string | null;
  valuta: string;
  iznosValuta: number;
  kurs: number;
  iznosKm: number;
  stopaRashoda: number;
  rashodi: number;
  dohodak: number;
  zdravstveno: number;
  zdravstvenoKanton: number;
  zdravstvenoFbih: number;
  osnovica: number;
  porez: number;
  porezniKredit: number;
  razlika: number;
  neto: number;
  kantonKey: string | null;
  opcinaKod: string | null;
  opcinaIme: string | null;
  ziroRacun: string | null;
  status: UplataStatus;
  datumPlacanja: string | null;
  datumPredaje: string | null;
  napomena: string | null;
  amsPodaci: Record<string, unknown> | null;
  uplatnicaPodaci: Record<string, unknown> | null;
  rokPredaje: string;
  daniDoRoka: number | null;
  brojPriloga: number;
  createdAt: string;
  updatedAt: string;
};

export type FreelancerPrilog = {
  id: number;
  uplataId: number;
  vrsta: "OVJEREN_AMS" | "DOKAZ_UPLATE" | "OSTALO";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

/** Šta klijent šalje; obračun uvijek računa server. */
export type UplataPayload = {
  datumPrimitka: string;
  periodMjesec?: number | null;
  periodGodina?: number | null;
  primalacIme?: string | null;
  primalacJmbg?: string | null;
  primalacAdresa?: string | null;
  isplatilacId?: number | null;
  isplatilacNaziv: string;
  isplatilacAdresa?: string | null;
  isplatilacGrad?: string | null;
  isplatilacDrzava?: string | null;
  valuta?: string;
  iznosValuta?: number | null;
  kurs?: number | null;
  iznosKm?: number | null;
  stopaRashoda?: number;
  porezniKredit?: number | null;
  kantonKey?: string | null;
  opcinaKod?: string | null;
  opcinaIme?: string | null;
  ziroRacun?: string | null;
  status?: UplataStatus;
  datumPlacanja?: string | null;
  datumPredaje?: string | null;
  napomena?: string | null;
  amsPodaci?: unknown;
  uplatnicaPodaci?: unknown;
};

export type FreelancerPregled = {
  godina: number;
  broj: number;
  ukupno: {
    bruto: number;
    rashodi: number;
    dohodak: number;
    zdravstveno: number;
    porez: number;
    neto: number;
  };
  poMjesecima: {
    mjesec: number;
    broj: number;
    bruto: number;
    zdravstveno: number;
    porez: number;
    neto: number;
  }[];
  poStatusu: Record<UplataStatus, number>;
  nepredane: {
    id: number;
    isplatilacNaziv: string;
    datumPrimitka: string;
    iznosKm: number;
    status: UplataStatus;
    rokPredaje: string;
    daniDoRoka: number;
  }[];
  poIsplatiocu: { naziv: string; broj: number; bruto: number }[];
  primalac: { ime: string | null; jmbg: string | null; adresa: string | null } | null;
};

export type FreelancerGpd = {
  godina: number;
  brojUplata: number;
  brojNeplacenih: number;
  bruto: number;
  dohodak: number;
  /** Osnovica sa AMS obrazaca (dohodak minus zdravstveno): ide u red 13. */
  osnovica?: number;
  /** Obračunato zdravstveno za sve uplate godine. */
  zdravstveno: number;
  /** Zdravstveno samo iz plaćenih uplata: zakon priznaje odbitak za plaćeni
   *  doprinos, pa red 19 GPD-a ide odavde. Opciono zbog starijeg odgovora. */
  zdravstvenoPlaceno?: number;
  porezObracunat: number;
  porezPlacen: number;
  /** Čist prihod poslije doprinosa i poreza (pregled, ne ulazi u GPD). */
  neto?: number;
  /** Koeficijent sa porezne kartice upisan u postavkama, null ako ga nema. */
  koeficijent?: number | null;
  /** Broj mjeseci u kojima je kartica važila (default 12 kad nije upisan). */
  odbitakMjeseci?: number | null;
  /** Lični odbitak za red 18: koeficijent x 300 KM x mjeseci. */
  licniOdbitak?: number;
  primalac: { ime: string | null; jmbg: string | null; adresa: string | null } | null;
  uplate: {
    id: number;
    datumPrimitka: string;
    isplatilacNaziv: string;
    iznosKm: number;
    dohodak: number;
    zdravstveno: number;
    osnovica?: number;
    razlika: number;
    neto?: number;
    status: UplataStatus;
  }[];
};

export type FreelancerKurs = {
  valuta: string;
  kurs: number;
  datumListe: string;
  izvor: string;
};

export type FreelancerPostavke = {
  freelancerRok: boolean;
  freelancerGpd: boolean;
  /** Koeficijent ličnog odbitka sa porezne kartice (PK-1001), null bez kartice. */
  koeficijent: number | null;
  /** Mjeseci u kojima je kartica važila, 0 do 12; null znači punu godinu. */
  odbitakMjeseci: number | null;
  /** Izračunat odbitak: koeficijent x 300 KM x mjeseci. */
  licniOdbitak: number;
  /** Prebivalište za uplatnice: ključ kantona (npr. "USK") i šifra općine. */
  kanton: string | null;
  opcina: string | null;
};

/** Osnovni lični odbitak po mjesecu (koeficijent 1,00). */
export const OSNOVNI_ODBITAK_MJESECNO = 300;

export const FREELANCER_CIJENA_KM = 50;

export function getPristup() {
  return request<FreelancerPristup>("/api/freelancer/pristup");
}

export function startFreelancerProba() {
  return request<{ trialEndsAt: string }>("/api/freelancer/proba", {
    method: "POST",
    body: "{}",
  });
}

export function getKurs(valuta: string, datum: string) {
  const q = new URLSearchParams({ valuta, datum });
  return request<FreelancerKurs>(`/api/freelancer/kurs?${q}`);
}

export function getGodine() {
  return request<number[]>("/api/freelancer/godine");
}

export function listUplate(godina: number) {
  return request<{ godina: number; items: FreelancerUplata[] }>(
    `/api/freelancer/uplate?godina=${godina}`,
  );
}

export function getUplata(id: number) {
  return request<FreelancerUplata & { prilozi: FreelancerPrilog[] }>(
    `/api/freelancer/uplate/${id}`,
  );
}

export function createUplata(payload: UplataPayload) {
  return request<FreelancerUplata>("/api/freelancer/uplate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUplata(id: number, payload: UplataPayload) {
  return request<FreelancerUplata>(`/api/freelancer/uplate/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function setUplataStatus(id: number, status: UplataStatus, datum?: string) {
  return request<FreelancerUplata>(`/api/freelancer/uplate/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, datum }),
  });
}

export function deleteUplata(id: number) {
  return request<{ id: number }>(`/api/freelancer/uplate/${id}`, {
    method: "DELETE",
  });
}

export function getPregled(godina: number) {
  return request<FreelancerPregled>(`/api/freelancer/pregled?godina=${godina}`);
}

export function getGpdPodaci(godina: number) {
  return request<FreelancerGpd>(`/api/freelancer/gpd?godina=${godina}`);
}

/** PDF pregleda prihoda: otvara se direktno (kolačić ide uz zahtjev). */
export function potvrdaUrl(godina: number) {
  return `${BACKEND_URL}/api/freelancer/potvrda?godina=${godina}`;
}

export function getPostavke() {
  return request<FreelancerPostavke>("/api/freelancer/postavke");
}

export function putPostavke(patch: Partial<FreelancerPostavke>) {
  return request<FreelancerPostavke>("/api/freelancer/postavke", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

// ── Prilozi ──────────────────────────────────────────────────────────────────
export function listPrilozi(uplataId: number) {
  return request<FreelancerPrilog[]>(`/api/freelancer/uplate/${uplataId}/prilozi`);
}

export async function uploadPrilog(
  uplataId: number,
  file: File,
  vrsta: FreelancerPrilog["vrsta"],
): Promise<ApiResponse<FreelancerPrilog>> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("vrsta", vrsta);
    fd.append("originalName", file.name);
    const res = await fetch(`${BACKEND_URL}/api/freelancer/uplate/${uplataId}/prilozi`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<FreelancerPrilog> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export function prilogUrl(id: number) {
  return `${BACKEND_URL}/api/freelancer/prilozi/${id}/download`;
}

export function deletePrilog(id: number) {
  return request<{ id: number }>(`/api/freelancer/prilozi/${id}`, {
    method: "DELETE",
  });
}
