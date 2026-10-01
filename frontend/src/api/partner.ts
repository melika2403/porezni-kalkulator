import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";
import type { ReklamaPozicija, ReklamaStranica } from "src/data/partner";

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

export type ReklamaFormat = "SABLON" | "SLIKA";
export type ReklamaStatus = "AKTIVNA" | "PAUZIRANA";
export type ReklamaStanje = "UTOKU" | "ZAKAZANA" | "ISTEKLA" | "PAUZIRANA";

/** Ono što javna stranica dobije za crtanje (bez linkova, oni idu kroz /klik). */
export type JavnaReklama = {
  id: number;
  format: ReklamaFormat;
  brend: string;
  oznaka: string | null;
  naslov: string | null;
  tekst: string | null;
  ctaTekst: string | null;
  sekundarniTekst: string | null;
  slikaUrl: string | null;
  slikaUskaUrl: string | null;
  logoUrl: string | null;
  logo2Url: string | null;
  boja: string;
};

export type AktivneReklame = Partial<Record<ReklamaPozicija, JavnaReklama | null>>;

export type ReklamaPayload = {
  naziv: string;
  format: ReklamaFormat;
  brend: string;
  oznaka: string | null;
  naslov: string | null;
  tekst: string | null;
  ctaTekst: string | null;
  ctaUrl: string;
  sekundarniTekst: string | null;
  sekundarniUrl: string | null;
  slikaUrl: string | null;
  slikaUskaUrl: string | null;
  logoUrl: string | null;
  logo2Url: string | null;
  boja: string;
  pozicije: ReklamaPozicija[];
  /** ["*"] = sve stranice */
  stranice: (ReklamaStranica | "*")[];
  pocetak: string;
  kraj: string;
  tezina: number;
  /** porezni rokovi u kojima kreativa ima pojačanu težinu (ROKOVI u data/partner) */
  rokovi?: string[];
};

export type PromoterReklama = ReklamaPayload & {
  id: number;
  promoterId: number;
  status: ReklamaStatus;
  stanje: ReklamaStanje;
  prikazi: number;
  klikovi: number;
  /** samo u admin pregledu: vlasnik reklame */
  promoter?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ReklamaStatistika = {
  od: string;
  dana: number;
  poDanu: { datum: string; prikazi: number; klikovi: number }[];
  poPoziciji: {
    stranica: string;
    pozicija: string;
    prikazi: number;
    klikovi: number;
  }[];
  /** dio prikaza i klikova u periodu sa mobitela */
  mobilni?: { prikazi: number; klikovi: number };
};

export type Zbir = { prikazi: number; klikovi: number };

/** Zbir perioda sa mobitelom i jedinstvenim posjetiocima (zbir po danima). */
export type ZbirPerioda = Zbir & {
  /** prikazi pozicija sa linkom na partnera (bez dugmeta za preuzimanje), za CTR */
  prikaziSaLinkom: number;
  prikaziMob: number;
  klikoviMob: number;
  jedinstveni: number;
  jedinstveniMob: number;
};

export type PregledKampanje = {
  dana: number;
  od: string;
  do: string;
  ukupno: ZbirPerioda;
  prethodno: ZbirPerioda;
  poDanu: {
    datum: string;
    pozicije: Partial<Record<ReklamaPozicija, Zbir>>;
    /** jedinstveni posjetioci tog dana */
    jedinstveni?: number;
  }[];
  poPoziciji: {
    pozicija: ReklamaPozicija;
    reklamaId: number;
    naziv: string;
    stranice: string[];
    prikazi: number;
    klikovi: number;
  }[];
  poStranici?: {
    stranica: string;
    prikazi: number;
    klikovi: number;
    prikaziSaLinkom: number;
  }[];
  reklame: PromoterReklama[];
};

// ── Javno ────────────────────────────────────────────────────────────────────
// Putanje su namjerno neutralne (/api/p/s, /api/p/e, /r/:id): ad-blokeri po
// javnim listama blokiraju URL-ove sa ad, ads, banner, promo, track...

export function getAktivneReklame(stranica: ReklamaStranica) {
  return request<AktivneReklame>(`/api/p/s?st=${encodeURIComponent(stranica)}`);
}

export function zabiljeziPrikaz(
  id: number,
  stranica: ReklamaStranica,
  pozicija: ReklamaPozicija,
) {
  // keepalive: prikaz se ne gubi ako korisnik odmah ode sa stranice
  return request<null>(`/api/p/e/${id}`, {
    method: "POST",
    body: JSON.stringify({ s: stranica, p: pozicija }),
    keepalive: true,
  });
}

/** Link kreative: backend broji klik i preusmjerava na stranicu banke. */
export function klikUrl(
  id: number,
  stranica: ReklamaStranica,
  pozicija: ReklamaPozicija,
  sekundarni = false,
): string {
  const q = new URLSearchParams({ s: stranica, p: pozicija });
  if (sekundarni) q.set("c", "2");
  return `${BACKEND_URL}/r/${id}?${q.toString()}`;
}

export function reklamaSlikaUrl(putanja: string | null): string | null {
  if (!putanja) return null;
  if (putanja.startsWith("http")) return putanja;
  return `${BACKEND_URL}${putanja}`;
}

// ── Promoter dashboard ───────────────────────────────────────────────────────

export function getMojeReklame() {
  return request<PromoterReklama[]>("/api/partner");
}

export function getReklama(id: number) {
  return request<PromoterReklama>(`/api/partner/${id}`);
}

export function kreirajReklamu(payload: ReklamaPayload) {
  return request<PromoterReklama>("/api/partner", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function izmijeniReklamu(id: number, payload: ReklamaPayload) {
  return request<PromoterReklama>(`/api/partner/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function promijeniStatusReklame(id: number, status: ReklamaStatus) {
  return request<PromoterReklama>(`/api/partner/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function obrisiReklamu(id: number) {
  return request<null>(`/api/partner/${id}`, { method: "DELETE" });
}

export function getStatistikaReklame(id: number, dana = 30) {
  return request<ReklamaStatistika>(
    `/api/partner/${id}/statistika?dana=${dana}`,
  );
}

export function getPregledKampanje(dana: number) {
  return request<PregledKampanje>(`/api/partner/pregled?dana=${dana}`);
}

/** Preuzme CSV sa servera (cookie prijave ide uz zahtjev) i snimi ga. */
export async function preuzmiIzvoz(dana: number): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/partner/izvoz?dana=${dana}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  // Content-Disposition nije vidljiv cross-origin fetch-u bez expose headera,
  // pa se ime pravi ovdje
  const ime = `reklame_zadnjih_${dana}_dana.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ime;
  a.click();
  URL.revokeObjectURL(url);
}

/** Mjesečni PDF izvještaj kampanje ("2026-09"), preuzima se i snima. */
export async function preuzmiMjesecniIzvjestaj(mjesec: string): Promise<void> {
  const res = await fetch(
    `${BACKEND_URL}/api/partner/izvjestaj?mjesec=${encodeURIComponent(mjesec)}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `izvjestaj_kampanje_${mjesec}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function uploadSlikeReklame(
  file: File,
): Promise<ApiResponse<{ url: string }>> {
  try {
    const fd = new FormData();
    fd.append("slika", file);
    const res = await fetch(`${BACKEND_URL}/api/partner/slika`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<{
      url: string;
    }> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
