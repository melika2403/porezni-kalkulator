import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";
import type {
  VijestPozicija,
  VijestStatus,
  VijestTip,
} from "src/data/vijesti";

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

export type Clanak = {
  id: number;
  tip: VijestTip;
  slug: string;
  naslov: string;
  nadnaslov: string | null;
  sazetak: string | null;
  rubrika: string;
  tagovi: string[];
  naslovnaSlika: string | null;
  naslovnaAlt: string | null;
  autorPotpis: string | null;
  /** Tekst objavila redakcija (admin): uz potpis ide plava kvačica. */
  sluzbeni?: boolean;
  izvorPropisa: string | null;
  datumObjave: string | null;
  datumAzuriranja: string | null;
  brojPregleda: number;
  brojKomentara: number;
  brojDijeljenja: number;
  istaknut: boolean;
  pozicija: VijestPozicija;
  vrijemeCitanja: string;
  seoNaslov: string | null;
  seoOpis: string | null;
  sadrzaj?: string;
};

export type AdminClanak = Clanak & {
  status: VijestStatus;
  uRijeci: boolean;
  datumProvjere: string | null;
  fokusFraza: string | null;
  trebaProvjeru?: boolean;
  autor?: string | null;
  updatedAt?: string;
  semafor?: SemaforStavka[];
};

export type SemaforStavka = {
  kljuc: string;
  opis: string;
  status: "ok" | "greska" | "upozorenje";
};

export type SlicanClanak = {
  id: number;
  naslov: string;
  slug: string;
  tip: VijestTip;
  status: VijestStatus;
  skor: number;
  razlozi: string[];
};

export type ClanakPayload = {
  tip: VijestTip;
  naslov: string;
  nadnaslov?: string | null;
  sazetak?: string | null;
  sadrzaj: string;
  rubrika: string;
  tagovi?: string[];
  naslovnaSlika?: string | null;
  naslovnaAlt?: string | null;
  autorPotpis?: string | null;
  izvorPropisa?: string | null;
  seoNaslov?: string | null;
  seoOpis?: string | null;
  fokusFraza?: string | null;
  datumProvjere?: string | null;
  slug?: string;
  uRijeci?: boolean;
  istaknut?: boolean;
  pozicija?: VijestPozicija;
};

// Javni dio (naslovna, liste, jedan tekst) se čita na serveru kroz
// src/lib/vijestiServer.ts, da stranice budu gotov HTML za Google i čitaoca.
// Jedini klijentski izuzetak je "Učitaj još" na listama, gdje se sljedeća
// strana dovlači bez osvježavanja stranice.

/** Javna lista članaka za "Učitaj još"; prvi ekran uvijek ide server-side. */
export function getClanciJavno(params: {
  tip?: VijestTip;
  rubrika?: string;
  page?: number;
  limit?: number;
} = {}) {
  const q = new URLSearchParams();
  if (params.tip) q.set("tip", params.tip);
  if (params.rubrika) q.set("rubrika", params.rubrika);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return request<{ items: Clanak[]; total: number; page: number; limit: number }>(
    `/api/vijesti${qs ? `?${qs}` : ""}`,
  );
}

// ── Admin ───────────────────────────────────────────────────────────────────

export function adminGetClanci(params: { status?: string; tip?: string; q?: string } = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.tip) q.set("tip", params.tip);
  if (params.q) q.set("q", params.q);
  const qs = q.toString();
  return request<AdminClanak[]>(`/api/vijesti/admin${qs ? `?${qs}` : ""}`);
}

export function adminGetClanak(id: number) {
  return request<AdminClanak>(`/api/vijesti/admin/${id}`);
}

export function adminKreirajClanak(payload: ClanakPayload) {
  return request<{ id: number; slug: string }>("/api/vijesti/admin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adminIzmijeniClanak(id: number, payload: ClanakPayload) {
  return request<{ id: number; slug: string; semafor: SemaforStavka[] }>(
    `/api/vijesti/admin/${id}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export function adminPromijeniStatus(
  id: number,
  status: VijestStatus,
  datumObjave?: string,
) {
  return request<{ id: number; status: VijestStatus; datumObjave: string | null }>(
    `/api/vijesti/admin/${id}/status`,
    { method: "POST", body: JSON.stringify({ status, datumObjave }) },
  );
}

export function adminObrisiClanak(id: number) {
  return request<{ id: number }>(`/api/vijesti/admin/${id}`, { method: "DELETE" });
}

export function adminSlicniClanci(payload: {
  naslov: string;
  fokusFraza: string;
  id?: number;
}) {
  return request<SlicanClanak[]>("/api/vijesti/admin/slicni", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Upload slike (multipart, bez Content-Type headera da browser doda boundary). */
export async function adminUploadSliku(file: File): Promise<ApiResponse<{ url: string }>> {
  try {
    const fd = new FormData();
    fd.append("slika", file);
    const res = await fetch(`${BACKEND_URL}/api/vijesti/admin/slika`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<{ url: string }> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
