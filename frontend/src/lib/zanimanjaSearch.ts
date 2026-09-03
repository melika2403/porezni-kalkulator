// Pretraga Klasifikacije zanimanja FBiH: dijele je stranica /sifre-zanimanja
// i ZanimanjeSelect (karton radnika, JS3100). NAMJERNO bez importa da je
// backend testovi mogu učitati direktno (Node type-stripping, kao escpNalog);
// lista se uvijek prosljeđuje (ZANIMANJA_FBIH iz src/data/zanimanja-fbih).

export type ZanimanjeStavka = { sifra: string; naziv: string };

/** mala slova, bez dijakritike (š→s, đ→d...), radi tolerantne pretrage */
export function normalizujTekst(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

/** upit za šifru: samo cifre, pa "4110.001" i "4110001" nalaze isto */
const cifre = (s: string) => s.replace(/\D/g, "");

/**
 * Filtrira zanimanja po nazivu (bez dijakritike) ili šifri (sa ili bez
 * tačke). Vraća najviše `limit` pogodaka (Infinity = svi); prazan upit vraća
 * početak liste.
 */
export function filtrirajZanimanja<T extends ZanimanjeStavka>(
  lista: readonly T[],
  upit: string,
  limit = 60,
): T[] {
  const q = upit.trim();
  if (!q) return lista.slice(0, Number.isFinite(limit) ? limit : lista.length);
  const nq = normalizujTekst(q);
  const cq = cifre(q);
  const samoCifre = cq.length > 0 && cq.length === q.replace(/[.\s-]/g, "").length;
  const out: T[] = [];
  for (const z of lista) {
    const pogodak = samoCifre
      ? z.sifra.startsWith(cq)
      : normalizujTekst(z.naziv).includes(nq) ||
        (cq.length >= 2 && z.sifra.startsWith(cq));
    if (pogodak) {
      out.push(z);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Tačan pogodak po šifri (7 cifara, toleriše tačku u unosu) ili null. */
export function zanimanjePoSifri<T extends ZanimanjeStavka>(
  lista: readonly T[],
  sifra: string,
): T | null {
  const c = cifre(sifra);
  if (c.length !== 7) return null;
  return lista.find((z) => z.sifra === c) ?? null;
}

/** "4110001" → zvanični zapis "4110.001" (prikaz; u JS3100 ide bez tačke) */
export function sifraSaTackom(sifra: string): string {
  const c = String(sifra).replace(/\D/g, "");
  return c.length === 7 ? c.slice(0, 4) + "." + c.slice(4) : sifra;
}

/** Početno slovo za abecedne sekcije: digrafi Lj, Nj i Dž su zasebna slova
 *  bosanske abecede (bs collator ih tako i sortira, blokovi su kontinuirani). */
export function pocetnoSlovo(naziv: string): string {
  const dva = naziv.slice(0, 2).toLowerCase();
  if (dva === "lj") return "Lj";
  if (dva === "nj") return "Nj";
  if (dva === "dž") return "Dž";
  return (naziv[0] || "#").toUpperCase();
}
