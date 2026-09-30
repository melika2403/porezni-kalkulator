import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";
import type { ReklamaPozicija, ReklamaStranica } from "src/data/reklame";

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
  naslov: string | null;
  tekst: string | null;
  ctaTekst: string | null;
  sekundarniTekst: string | null;
  slikaUrl: string | null;
  slikaUskaUrl: string | null;
  logoUrl: string | null;
  boja: string;
};

export type AktivneReklame = Record<ReklamaPozicija, JavnaReklama | null>;

export type ReklamaPayload = {
  naziv: string;
  format: ReklamaFormat;
  brend: string;
  naslov: string | null;
  tekst: string | null;
  ctaTekst: string | null;
  ctaUrl: string;
  sekundarniTekst: string | null;
  sekundarniUrl: string | null;
  slikaUrl: string | null;
  slikaUskaUrl: string | null;
  logoUrl: string | null;
  boja: string;
  pozicije: ReklamaPozicija[];
  /** ["*"] = sve stranice */
  stranice: (ReklamaStranica | "*")[];
  pocetak: string;
  kraj: string;
  tezina: number;
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
};

// ── Javno ────────────────────────────────────────────────────────────────────

export function getAktivneReklame(stranica: ReklamaStranica) {
  return request<AktivneReklame>(
    `/api/reklame/aktivne?stranica=${encodeURIComponent(stranica)}`,
  );
}

export function zabiljeziPrikaz(
  id: number,
  stranica: ReklamaStranica,
  pozicija: ReklamaPozicija,
) {
  // keepalive: prikaz se ne gubi ako korisnik odmah ode sa stranice
  return request<null>(`/api/reklame/${id}/prikaz`, {
    method: "POST",
    body: JSON.stringify({ stranica, pozicija }),
    keepalive: true,
  });
}

/** Link reklame: backend broji klik i preusmjerava na stranicu banke. */
export function klikUrl(
  id: number,
  stranica: ReklamaStranica,
  pozicija: ReklamaPozicija,
  sekundarni = false,
): string {
  const q = new URLSearchParams({ s: stranica, p: pozicija });
  if (sekundarni) q.set("cilj", "sekundarni");
  return `${BACKEND_URL}/api/reklame/${id}/klik?${q.toString()}`;
}

export function reklamaSlikaUrl(putanja: string | null): string | null {
  if (!putanja) return null;
  if (putanja.startsWith("http")) return putanja;
  return `${BACKEND_URL}${putanja}`;
}

// ── Promoter dashboard ───────────────────────────────────────────────────────

export function getMojeReklame() {
  return request<PromoterReklama[]>("/api/reklame/promoter");
}

export function getReklama(id: number) {
  return request<PromoterReklama>(`/api/reklame/promoter/${id}`);
}

export function kreirajReklamu(payload: ReklamaPayload) {
  return request<PromoterReklama>("/api/reklame/promoter", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function izmijeniReklamu(id: number, payload: ReklamaPayload) {
  return request<PromoterReklama>(`/api/reklame/promoter/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function promijeniStatusReklame(id: number, status: ReklamaStatus) {
  return request<PromoterReklama>(`/api/reklame/promoter/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function obrisiReklamu(id: number) {
  return request<null>(`/api/reklame/promoter/${id}`, { method: "DELETE" });
}

export function getStatistikaReklame(id: number, dana = 30) {
  return request<ReklamaStatistika>(
    `/api/reklame/promoter/${id}/statistika?dana=${dana}`,
  );
}

export async function uploadSlikeReklame(
  file: File,
): Promise<ApiResponse<{ url: string }>> {
  try {
    const fd = new FormData();
    fd.append("slika", file);
    const res = await fetch(`${BACKEND_URL}/api/reklame/promoter/slika`, {
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
