// Dohvat vijesti na serveru (Next server komponente). Stranice se renderuju
// unaprijed i osvježavaju svakih 60 sekundi, pa Google i čitalac dobiju gotov
// HTML, a baza se ne gađa na svaki klik.
import type { Clanak } from "src/api/vijesti";

const REVALIDATE = 60;

export function backendUrl(): string {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:4000"
  );
}

async function dohvati<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${backendUrl()}${path}`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok: boolean; data?: T };
    return json.ok && json.data !== undefined ? json.data : null;
  } catch {
    return null;
  }
}

export type NaslovnaPodaci = {
  vodeca: Clanak | null;
  izdvojeni: Clanak[];
  najnovije: Clanak[];
  najcitanije: Clanak[];
  vodici: Clanak[];
};

export function getNaslovnaServer() {
  return dohvati<NaslovnaPodaci>("/api/vijesti/naslovna");
}

export function getClanakServer(slug: string) {
  return dohvati<{ clanak: Clanak; povezani: Clanak[] }>(
    `/api/vijesti/${encodeURIComponent(slug)}`,
  );
}

export function getClanciServer(params: {
  tip?: "VIJEST" | "VODIC";
  rubrika?: string;
  limit?: number;
  page?: number;
  q?: string;
}) {
  const q = new URLSearchParams();
  if (params.tip) q.set("tip", params.tip);
  if (params.rubrika) q.set("rubrika", params.rubrika);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.page) q.set("page", String(params.page));
  if (params.q) q.set("q", params.q);
  const qs = q.toString();
  return dohvati<{ items: Clanak[]; total: number; page: number; limit: number }>(
    `/api/vijesti${qs ? `?${qs}` : ""}`,
  );
}

import type { Tema, TemaSort } from "src/api/rasprave";

/** Lista tema rasprava; svježa (bez keša) jer se sortira po zadnjoj aktivnosti.
 *  `revalidate` (sekunde) uključuje keš: za statičke stranice poput početne,
 *  gdje bi no-store cijelu rutu pretvorio u dinamičku. */
export async function getTemeServer(params: {
  vrsta?: "PITANJE" | "RASPRAVA";
  rubrika?: string;
  filter?: "rijesene";
  limit?: number;
  page?: number;
  /** "zadnje": čisto po aktivnosti, bez prikvačenih na vrhu */
  sort?: TemaSort;
  revalidate?: number;
} = {}): Promise<{ items: Tema[]; total: number } | null> {
  const q = new URLSearchParams();
  if (params.vrsta) q.set("vrsta", params.vrsta);
  if (params.rubrika) q.set("rubrika", params.rubrika);
  if (params.filter) q.set("filter", params.filter);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.page) q.set("page", String(params.page));
  if (params.sort) q.set("sort", params.sort);
  const qs = q.toString();
  try {
    const res = await fetch(`${backendUrl()}/api/rasprave${qs ? `?${qs}` : ""}`, {
      ...(params.revalidate
        ? { next: { revalidate: params.revalidate } }
        : { cache: "no-store" as const }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok: boolean;
      data?: { items: Tema[]; total: number };
    };
    return json.ok ? (json.data ?? null) : null;
  } catch {
    return null;
  }
}

/** Jedna tema, svježa (broj odgovora i status se često mijenjaju). */
export async function getTemaServer(slug: string): Promise<Tema | null> {
  try {
    const res = await fetch(
      `${backendUrl()}/api/rasprave/${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { ok: boolean; data?: Tema };
    return json.ok ? (json.data ?? null) : null;
  } catch {
    return null;
  }
}

/** Puna adresa slike sa backenda (slike se serviraju iz /uploads). */
export function slikaUrl(putanja: string | null): string | null {
  if (!putanja) return null;
  if (putanja.startsWith("http")) return putanja;
  const javni = process.env.NEXT_PUBLIC_BACKEND_URL || backendUrl();
  return `${javni}${putanja}`;
}

/** "prije 24 min", "prije 3 sata", "prije 2 dana", pa datum. */
export function relativnoVrijeme(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const minuta = Math.floor((Date.now() - t) / 60000);
  if (minuta < 1) return "upravo";
  if (minuta < 60) return `prije ${minuta} min`;
  const sati = Math.floor(minuta / 60);
  if (sati < 24) return `prije ${sati} ${sati === 1 ? "sat" : sati < 5 ? "sata" : "sati"}`;
  const dana = Math.floor(sati / 24);
  if (dana < 7) return `prije ${dana} ${dana === 1 ? "dan" : "dana"}`;
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}.`;
}
