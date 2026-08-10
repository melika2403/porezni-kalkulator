// Admin test harness: izvoz platnih naloga u e-bankarstvo (Faza 0).
// Sve rute su ADMIN-only na serveru. Vidi docs/faza0-tkdis-izvoz-halcom.md.
import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

export type IzvozOrg = {
  id: number;
  name: string;
  type: string;
  city: string | null;
  bankAccount: string | null;
};

export type IzvozObracun = {
  year: number;
  month: number;
  /** broj payroll zapisa u mjesecu (svi statusi) */
  ukupno: number;
  /** obračunati (OBRACUNATO + ISPLACENO) */
  obracunato: number;
  /** zbir troška poslodavca obračunatih */
  trosak: number;
};

export type BankProfil = "halcom" | "unicredit" | "elba" | "raiffeisen";
export type Transliteracija = "yuscii" | "cp1250" | "cp852";

export type IzvozPreskocen = {
  radnik: string;
  stavka: string;
  iznosKm: number;
  razlog: string;
};

export type IzvozRezultat = {
  fileName: string;
  /** kompletna datoteka, binarno, za download */
  base64: string;
  /** redovi za pregled na ekranu (bajt = znak, kontrolni znakovi kao "·") */
  rows: string[];
  /** lične isplate koje NISU u datoteci (radnik bez ispravnog računa) */
  preskoceni: IzvozPreskocen[];
  meta: {
    stub: boolean;
    /** tkdis/raiffeisen = fiksne pozicije (lenjir), elba = TAB/CR delimitirano */
    format: "tkdis" | "elba" | "raiffeisen";
    profil: BankProfil;
    transliteracija: Transliteracija;
    combineKantonal: boolean;
    /** null za ELBA (nema fiksnu širinu reda) */
    rowLen: number | null;
    brojRedova: number;
    brojNaloga: number;
    ukupnoKm: number;
    ukupnoBajta: number;
    eof1a: boolean;
    brojPayrolla: number;
  };
};

async function get<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      credentials: "include",
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export function getIzvozOrganizacije() {
  return get<IzvozOrg[]>("/api/admin/izvoz-naloga/organizacije");
}

export function getIzvozObracuni(orgId: number) {
  return get<IzvozObracun[]>(`/api/admin/izvoz-naloga/obracuni?orgId=${orgId}`);
}

// ── ESC/P štampa naloga na matričnom (Faza 1) ───────────────────────────────

export type StampaNalog = {
  rb: number;
  tip: "javniPrihod" | "prenos";
  naziv: string;
  mjesto: string;
  racun: string;
  svrha: string;
  iznosKm: number;
  jib: string;
  vrstaPrihoda: string;
  opcina: string;
  budzetskaOrganizacija: string;
  pozivNaBroj: string;
  /** ISO YYYY-MM-DD, prazno za prenos naloge */
  periodOd: string;
  periodDo: string;
};

export type StampaNalozi = {
  platilac: { racun: string; naziv: string; adresa: string; mjesto: string };
  datumValute: string;
  nalozi: StampaNalog[];
  preskoceni: IzvozPreskocen[];
};

// Nalozi obračuna kao JSON (isti adapter kao izvoz datoteka, bez formatiranja)
// za ekran pregleda i ESC/P štampu.
export async function getNaloziZaStampu(payload: {
  orgId: number;
  year: number;
  month: number;
  /** ISO YYYY-MM-DD */
  datumValute: string;
  combineKantonal: boolean;
}): Promise<ApiResponse<StampaNalozi>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/izvoz-naloga/nalozi`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<StampaNalozi> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export async function generisiIzvoz(payload: {
  orgId: number;
  year: number;
  month: number;
  /** ISO YYYY-MM-DD */
  datumValute: string;
  profil: BankProfil;
  transliteracija: Transliteracija;
  /** kantonalni doprinosi na jedan nalog po kantonu (šifra opštine = sjedište) */
  combineKantonal: boolean;
}): Promise<ApiResponse<IzvozRezultat>> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/izvoz-naloga/generisi`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<IzvozRezultat> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
