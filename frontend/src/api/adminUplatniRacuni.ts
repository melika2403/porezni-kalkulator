// Admin upravljanje šifarnikom uplatnih računa javnih prihoda.
import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

export type UplatniRacunRed = {
  kljuc: string;
  grupa: "kanton" | "federalni" | "rs" | "komora";
  kanton: string | null;
  korisnik: string;
  vrstaPrihoda: string | null;
  /** 16 cifara bez crtica */
  racun: string;
  /** formatiran 3-3-8-2 za prikaz */
  racunPrikaz: string;
  banka: string | null;
  vaziOd: string | null;
  izvor: string | null;
  datumProvjere: string | null;
  izmijenjeno: string | null;
};

export type RacuniMeta = { izvor: string | null; datum: string | null };

export type UplatniRacunLogRed = {
  id: number;
  akcija: "izmjena" | "provjera";
  stariRacun: string | null;
  noviRacun: string | null;
  izvor: string | null;
  userEmail: string | null;
  createdAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
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

export function getAdminUplatniRacuni() {
  return request<{ racuni: UplatniRacunRed[]; meta: RacuniMeta | null }>(
    "/api/uplatni-racuni/admin",
  );
}

export function izmijeniUplatniRacun(
  kljuc: string,
  body: {
    racun: string;
    racunPotvrda: string;
    banka?: string;
    vaziOd?: string | null;
    izvor: string;
  },
) {
  return request<{ kljuc: string; racun: string; racunPrikaz: string }>(
    `/api/uplatni-racuni/admin/${encodeURIComponent(kljuc)}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export function potvrdiProvjeruRacuna(kljuc: string) {
  return request<{ kljuc: string; datumProvjere: string }>(
    `/api/uplatni-racuni/admin/${encodeURIComponent(kljuc)}/provjera`,
    { method: "POST" },
  );
}

export function getUplatniRacunLog(kljuc: string) {
  return request<UplatniRacunLogRed[]>(
    `/api/uplatni-racuni/admin/${encodeURIComponent(kljuc)}/log`,
  );
}

/** Validacija broja računa kao na backendu: 16 cifara + modulo 97 ostatak 1.
 *  Blokirajuća, testirana na svih 38 računa iz šifarnika. */
export function provjeriBrojRacuna(value: string): string | null {
  const d = String(value || "").replace(/\D+/g, "");
  if (d.length !== 16) return "Račun mora imati tačno 16 cifara.";
  let r = 0;
  for (const c of d) r = (r * 10 + (c.charCodeAt(0) - 48)) % 97;
  if (r !== 1) return "Kontrolne cifre ne valjaju (modulo 97). Provjerite broj.";
  return null;
}

/** "1020500000106698" → "102-050-00001066-98" */
export function formatirajRacun(value: string): string {
  const d = String(value || "").replace(/\D+/g, "").slice(0, 16);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 14), d.slice(14, 16)]
    .filter(Boolean)
    .join("-");
}
