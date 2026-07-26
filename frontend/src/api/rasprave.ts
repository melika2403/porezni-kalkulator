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

export type TemaVrsta = "PITANJE" | "RASPRAVA";

export type Tema = {
  id: number;
  slug: string;
  naslov: string;
  vrsta: TemaVrsta;
  rubrika: string | null;
  brojOdgovora: number;
  brojPregleda: number;
  prikvacena: boolean;
  zakljucana: boolean;
  rijesena: boolean;
  prihvaceniOdgovorId: number | null;
  zadnjaAktivnost: string;
  createdAt: string;
  autor: {
    id: number | null;
    potpis: string;
    sluzbeni: boolean;
    avatar: string | null;
  };
  tekst?: string;
};

/** Redoslijed liste tema; "zadnje" koristi blok na naslovnoj. */
export type TemaSort =
  | "aktivnost"
  | "zadnje"
  | "najnovije"
  | "najstarije"
  | "popularne"
  | "odgovori";

export function getTeme(params: {
  vrsta?: TemaVrsta;
  rubrika?: string;
  filter?: "rijesene";
  /** Pretraga po naslovu i tekstu teme. */
  q?: string;
  sort?: TemaSort;
  page?: number;
  limit?: number;
} = {}) {
  const q = new URLSearchParams();
  if (params.vrsta) q.set("vrsta", params.vrsta);
  if (params.rubrika) q.set("rubrika", params.rubrika);
  if (params.filter) q.set("filter", params.filter);
  if (params.q) q.set("q", params.q);
  if (params.sort) q.set("sort", params.sort);
  if (params.page) q.set("page", String(params.page));
  if (params.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return request<{ items: Tema[]; total: number; page: number; limit: number }>(
    `/api/rasprave${qs ? `?${qs}` : ""}`,
  );
}

export function getTema(slug: string) {
  return request<Tema>(`/api/rasprave/${encodeURIComponent(slug)}`);
}

export function kreirajTemu(payload: {
  naslov: string;
  tekst: string;
  vrsta: TemaVrsta;
  rubrika?: string | null;
}) {
  return request<{ id: number; slug: string }>("/api/rasprave", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Izmjena teksta teme: admin bilo kad, autor u prvih 15 minuta od objave. */
export function izmijeniTekstTeme(slug: string, tekst: string) {
  return request<{ slug: string }>(
    `/api/rasprave/${encodeURIComponent(slug)}/tekst`,
    { method: "PUT", body: JSON.stringify({ tekst }) },
  );
}

export function prihvatiOdgovor(slug: string, komentarId: number) {
  return request<{ prihvaceniOdgovorId: number | null }>(
    `/api/rasprave/${encodeURIComponent(slug)}/prihvati`,
    { method: "POST", body: JSON.stringify({ komentarId }) },
  );
}

export function adminRadnjaTema(
  slug: string,
  radnja:
    | "PRIKVACI"
    | "OTKVACI"
    | "ZAKLJUCAJ"
    | "OTKLJUCAJ"
    | "SAKRIJ"
    | "VRATI"
    | "OBRISI",
) {
  return request<{ slug: string; radnja: string }>(
    `/api/rasprave/${encodeURIComponent(slug)}/admin`,
    { method: "POST", body: JSON.stringify({ radnja }) },
  );
}
