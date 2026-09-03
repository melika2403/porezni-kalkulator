// ──────────────────────────────────────────────────────────────────────────────
//  Jedan izvor istine za "svježinu" sadržaja (freshness signal).
//
//  reviewed  — datum kad je sadržaj/propisi POSLJEDNJI PUT PROVJEREN. Bumpaj
//              ga RUČNO samo kad stvarno provjeriš ili promijeniš sadržaj/stope.
//              NIKAD ne stavljaj automatski "danas" — lažni freshness šteti
//              (posebno za YMYL/porezni sadržaj).
//  taxYear   — fiskalna godina za koju vrijede stope/podaci (opciono). Koristi
//              se za vidljivi label "Podaci važe za 2026".
//
//  Hrani: sitemap lastmod, vidljivi "Posljednja provjera" label i schema
//  dateModified — sve sa istog mjesta.
// ──────────────────────────────────────────────────────────────────────────────

export type ContentMeta = { reviewed: string; taxYear?: number };

// Seed: 2026-06-03 — sadržaj je aktivno održavan i aktuelan na taj dan.
export const DEFAULT_REVIEWED = "2026-06-03";

export const CONTENT_META: Record<string, ContentMeta> = {
  "/": { reviewed: "2026-06-03" },
  "/sihterica": { reviewed: "2026-06-03" },
  "/spr": { reviewed: "2026-06-03", taxYear: 2026 },
  "/gpd": { reviewed: "2026-06-03", taxYear: 2026 },
  "/gpd/upute": { reviewed: "2026-06-03", taxYear: 2026 },
  "/zo3": { reviewed: "2026-06-03", taxYear: 2026 },
  "/ams": { reviewed: "2026-06-03", taxYear: 2026 },
  // 2026-09-02: dodato uputstvo "Kako radi, korak po korak" (rokovi provjereni)
  "/freelancer": { reviewed: "2026-09-02", taxYear: 2026 },
  "/amortizacija": { reviewed: "2026-06-03", taxYear: 2026 },
  "/preracun-neto-bruto": { reviewed: "2026-06-03", taxYear: 2026 },
  "/pdv-kalkulator": { reviewed: "2026-06-03", taxYear: 2026 },
  "/ugovor-o-pozajmici": { reviewed: "2026-06-03" },
  "/ugovor-o-djelu": { reviewed: "2026-06-03", taxYear: 2026 },
  "/ugovor-o-radu": { reviewed: "2026-06-03" },
  "/rjesenja-i-odluke": { reviewed: "2026-06-03" },
  "/cesije-i-kompenzacije": { reviewed: "2026-06-30" },
  "/pk-office": { reviewed: "2026-06-03" },
  "/pretplate": { reviewed: "2026-06-03" },
  "/clanske-kartice": { reviewed: "2026-06-03" },
  "/fakture": { reviewed: "2026-06-03" },
  "/fakture/nova": { reviewed: "2026-06-03" },
  "/prijave-radnika": { reviewed: "2026-06-03", taxYear: 2026 },
  "/porezna-kartica": { reviewed: "2026-08-15", taxYear: 2026 },
  "/sifre-djelatnosti": { reviewed: "2026-06-03" },
  "/javni-prihodi": { reviewed: "2026-06-03", taxYear: 2026 },
  "/o-nama": { reviewed: "2026-06-03" },
  "/kontakt": { reviewed: "2026-06-03" },
  "/uvjeti": { reviewed: "2026-06-03" },
  "/privatnost": { reviewed: "2026-06-03" },
};

export function metaFor(path: string): ContentMeta {
  return CONTENT_META[path] ?? { reviewed: DEFAULT_REVIEWED };
}

export function reviewedFor(path: string): string {
  return metaFor(path).reviewed;
}

// Formatira reviewed datum (YYYY-MM-DD) u DD.MM.YYYY. za prikaz.
export function formatReviewed(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}.`;
}
