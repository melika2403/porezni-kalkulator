// JMBG helperi — validacija kontrolne cifre, parse datuma rođenja i spola.
//
// Format JMBG (13 cifara): DDMMGGG RR NNN K
//   DD   — dan rođenja (01–31)
//   MM   — mjesec (01–12)
//   GGG  — zadnje 3 cifre godine (003 = 2003, 950 = 1950)
//   RR   — region (BiH = 10–19)
//   NNN  — redni broj: 000–499 = muški, 500–999 = ženski
//   K    — kontrolna cifra (mod 11)

export type JmbgSpol = "M" | "Z";

export type JmbgInfo = {
  /** Tačno 13 cifara i kontrolna cifra prolazi (mod 11). */
  valid: boolean;
  /** Razlog neispravnosti (samo kad valid=false). */
  error?: string;
  /** Datum rođenja kao ISO yyyy-mm-dd, ako su dan/mjesec/godina validni. */
  birthDateIso?: string;
  /** Muški/ženski iz polja NNN. */
  spol?: JmbgSpol;
};

/**
 * Računa kontrolnu cifru JMBG-a (zadnja cifra) iz prvih 12.
 *   m = 11 - (((7+a) + (6+b) + ... wraps)) mod 11
 * Standardni algoritam:
 *   suma = 7*c1 + 6*c2 + 5*c3 + 4*c4 + 3*c5 + 2*c6
 *        + 7*c7 + 6*c8 + 5*c9 + 4*c10 + 3*c11 + 2*c12
 *   r = 11 - (suma mod 11)
 *   kontrolna = r === 10 ? null (nevažeći) : r === 11 ? 0 : r
 */
function expectedControlDigit(first12: string): number | null {
  const weights = [7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * weights[i];
  const r = 11 - (sum % 11);
  if (r === 10) return null; // JMBG sa kontrolnom cifrom 10 ne postoji
  return r === 11 ? 0 : r;
}

/** Parse JMBG → info objekat (validnost, datum rođenja, spol). */
export function parseJmbg(input: string): JmbgInfo {
  const j = (input ?? "").replace(/\D/g, "");
  if (j.length === 0) return { valid: false };
  if (j.length < 13) return { valid: false, error: "JMBG mora imati 13 cifara" };
  if (j.length > 13) return { valid: false, error: "JMBG ne smije imati više od 13 cifara" };

  const dd = parseInt(j.slice(0, 2), 10);
  const mm = parseInt(j.slice(2, 4), 10);
  const gggRaw = parseInt(j.slice(4, 7), 10);
  if (!Number.isFinite(dd) || dd < 1 || dd > 31)
    return { valid: false, error: "Nevažeći dan rođenja" };
  if (!Number.isFinite(mm) || mm < 1 || mm > 12)
    return { valid: false, error: "Nevažeći mjesec rođenja" };

  const year = gggRaw < 800 ? 2000 + gggRaw : 1000 + gggRaw;
  // Provjera datuma rođenja (npr. 31.02 nije validan)
  const date = new Date(Date.UTC(year, mm - 1, dd));
  const validDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === mm - 1 &&
    date.getUTCDate() === dd;
  if (!validDate) return { valid: false, error: "Nevažeći datum rođenja u JMBG-u" };

  // Spol iz polja NNN (cifre 9-11, 0-indeksirano: indeks 9..11)
  const nnn = parseInt(j.slice(9, 12), 10);
  const spol: JmbgSpol = nnn >= 500 ? "Z" : "M";

  // Kontrolna cifra
  const expected = expectedControlDigit(j.slice(0, 12));
  if (expected === null)
    return { valid: false, error: "JMBG ima nevažeću kontrolnu cifru" };
  const actual = Number(j[12]);
  if (actual !== expected)
    return {
      valid: false,
      error: `JMBG ima pogrešnu kontrolnu cifru (očekivano ${expected})`,
      birthDateIso: `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
      spol,
    };

  return {
    valid: true,
    birthDateIso: `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
    spol,
  };
}

/** Skraćeno — true ako je JMBG potpuno valjan (13 cifara + kontrolna + datum). */
export function isJmbgValid(input: string): boolean {
  return parseJmbg(input).valid;
}

/** Izvuče spol iz JMBG-a (bez kontrolne validacije — samo iz polja NNN). */
export function spolFromJmbg(input: string): JmbgSpol | null {
  const j = (input ?? "").replace(/\D/g, "");
  if (j.length < 12) return null;
  const nnn = parseInt(j.slice(9, 12), 10);
  if (!Number.isFinite(nnn)) return null;
  return nnn >= 500 ? "Z" : "M";
}
