import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";
import type { VijestTip } from "src/data/vijesti";

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

export type Komentar = {
  id: number;
  roditeljId: number | null;
  /** null kad je komentar sakriven zbog prijava */
  tekst: string | null;
  sakriven: boolean;
  glasovi: number;
  createdAt: string;
  izmijenjen: boolean;
  autor: {
    id: number | null;
    potpis: string;
    sluzbeni: boolean;
    avatar: string | null;
  };
  mojGlas: number;
  mogu: { izmjena: boolean; brisanje: boolean; moderacija: boolean };
  odgovori?: Komentar[];
};

export type MojePostavke = {
  id: number;
  potpis: string;
  javnoIme: string | null;
  koristiPunoIme: boolean;
  punoIme: string;
  avatar: string | null;
  sluzbeni: boolean;
  blokiran: boolean;
  izabran: boolean;
};

export function getMojePostavke() {
  return request<MojePostavke>("/api/vijesti/komentari/moje-postavke");
}

export function obrisiAvatar() {
  return request<{ avatar: null }>("/api/vijesti/komentari/avatar", {
    method: "DELETE",
  });
}

/** Upload avatara (multipart, bez Content-Type headera). */
export async function postaviAvatar(file: File): Promise<ApiResponse<{ avatar: string }>> {
  try {
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await fetch(`${BACKEND_URL}/api/vijesti/komentari/avatar`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<{
      avatar: string;
    }> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export function adminObrisiSveKorisnika(slug: string, userId: number) {
  return request<{ obrisano: number }>(
    `/api/vijesti/admin/clanak/${encodeURIComponent(slug)}/korisnik/${userId}/obrisi-sve`,
    { method: "POST" },
  );
}

/** Komentari žive ispod članka ili ispod teme rasprave; ista struktura. */
export type KomentarIzvor = "clanak" | "tema";

function osnovnaPutanja(izvor: KomentarIzvor, slug: string): string {
  return izvor === "tema"
    ? `/api/rasprave/${encodeURIComponent(slug)}/odgovori`
    : `/api/vijesti/${encodeURIComponent(slug)}/komentari`;
}

export type KomentariOdgovor = {
  /** ukupan broj komentara ispod teksta, ne samo ove stranice */
  ukupno: number;
  komentari: Komentar[];
  zakljucana?: boolean;
  page: number;
  limit: number;
  imaJos: boolean;
};

export function getKomentari(
  slug: string,
  sort: "novi" | "korisni" = "novi",
  izvor: KomentarIzvor = "clanak",
  page = 1,
) {
  return request<KomentariOdgovor>(
    `${osnovnaPutanja(izvor, slug)}?sort=${sort}&page=${page}`,
  );
}

export function dodajKomentar(
  slug: string,
  payload: { tekst: string; roditeljId?: number },
  izvor: KomentarIzvor = "clanak",
) {
  return request<Komentar>(osnovnaPutanja(izvor, slug), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function izmijeniKomentar(id: number, tekst: string) {
  return request<{ id: number }>(`/api/vijesti/komentari/${id}`, {
    method: "PUT",
    body: JSON.stringify({ tekst }),
  });
}

export function obrisiKomentar(id: number) {
  return request<{ id: number }>(`/api/vijesti/komentari/${id}`, {
    method: "DELETE",
  });
}

export function glasajKomentar(id: number, vrijednost: 1 | -1 | 0) {
  return request<{ glasovi: number; mojGlas: number }>(
    `/api/vijesti/komentari/${id}/glas`,
    { method: "POST", body: JSON.stringify({ vrijednost }) },
  );
}

export function prijaviKomentar(id: number, razlog?: string) {
  return request<{ prijavljen?: boolean; vecPrijavljen?: boolean }>(
    `/api/vijesti/komentari/${id}/prijava`,
    { method: "POST", body: JSON.stringify({ razlog }) },
  );
}

export function postaviPotpis(payload: { javnoIme?: string; koristiPunoIme?: boolean }) {
  return request<{ potpis: string }>("/api/vijesti/komentari/potpis", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type JavniProfil = {
  korisnik: {
    id: number;
    potpis: string;
    sluzbeni: boolean;
    avatar: string | null;
    clanOd: string;
    brojKomentara: number;
  };
  komentari: {
    id: number;
    tekst: string;
    glasovi: number;
    createdAt: string;
    clanak: { slug: string; naslov: string; tip: VijestTip } | null;
    tema: { slug: string; naslov: string } | null;
  }[];
};

export function getJavniProfil(id: number) {
  return request<JavniProfil>(`/api/vijesti/korisnik/${id}`);
}

// ── Obavještenja ────────────────────────────────────────────────────────────

export type ObavjestenjeTip =
  | "ODGOVOR_KOMENTAR"
  | "ODGOVOR_TEMA"
  | "GLAS_PLUS"
  | "GLAS_MINUS"
  | "RJESENJE";

export type Obavjestenje = {
  id: number;
  tip: ObavjestenjeTip;
  brojac: number;
  procitano: boolean;
  vrijeme: string;
  akter: {
    id: number;
    potpis: string;
    sluzbeni: boolean;
    avatar: string | null;
  } | null;
  izvod: string | null;
  naslov: string | null;
  link: string;
};

export function getObavjestenja() {
  return request<Obavjestenje[]>("/api/vijesti/obavjestenja");
}

export function getBrojObavjestenja() {
  return request<{ neprocitano: number }>("/api/vijesti/obavjestenja/broj");
}

export function procitajObavjestenja() {
  return request<{ neprocitano: number }>("/api/vijesti/obavjestenja/procitaj", {
    method: "POST",
  });
}

/** Trajno uklanjanje jednog obavještenja (X u panelu ili na profilu). */
export function ukloniObavjestenje(id: number) {
  return request<{ id: number }>(`/api/vijesti/obavjestenja/${id}`, {
    method: "DELETE",
  });
}

// ── Moderacija (admin) ──────────────────────────────────────────────────────

export type ModKomentar = {
  id: number;
  tekst: string;
  status: "OBJAVLJEN" | "SAKRIVEN" | "OBRISAN";
  glasovi: number;
  brojPrijava: number;
  createdAt: string;
  autor: { id: number | null; potpis: string; blokiran: boolean };
  clanak: { slug: string; naslov: string; tip: VijestTip } | null;
  tema: { slug: string; naslov: string } | null;
};

export function adminGetKomentari(status: "PRIJAVLJENI" | "SVI" = "PRIJAVLJENI") {
  return request<ModKomentar[]>(`/api/vijesti/admin/komentari?status=${status}`);
}

export function adminOdlukaKomentar(
  id: number,
  odluka: "SAKRIJ" | "VRATI" | "OBRISI",
) {
  return request<{ id: number; status: string }>(
    `/api/vijesti/admin/komentari/${id}/odluka`,
    { method: "POST", body: JSON.stringify({ odluka }) },
  );
}

export function adminBlokadaKorisnika(id: number, blokiran: boolean) {
  return request<{ id: number; blokiran: boolean }>(
    `/api/vijesti/admin/korisnik/${id}/blokada`,
    { method: "POST", body: JSON.stringify({ blokiran }) },
  );
}
