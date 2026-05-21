// ──────────────────────────────────────────────────────────────────────────────
//  Osnovice za obračun doprinosa određenih obveznika FBiH (vlasnici obrta,
//  slobodna zanimanja, poljoprivrednici, taksisti, trgovci pojedinci).
//
//  Mirror of backend/src/utils/obrtniciFbih.js — održavati u sinhronizaciji.
//
//  IZVOR: Službene novine FBiH br. 100/25 od 31.12.2025.
//  PRAVNI OSNOV: Zakon o porezu na dohodak FBiH (čl. 12, 19, 31) i
//                Zakon o doprinosima FBiH (čl. 6).
// ──────────────────────────────────────────────────────────────────────────────

export type RezimOporezivanja = "STVARNI_DOHODAK" | "PAUSALNI" | "OSTALI";

export type KategorijaStvarni =
  | "SLOBODNA_ZANIMANJA"
  | "OBRT_SRODNE"
  | "POLJOPRIVREDA_SUMARSTVO"
  | "TRGOVAC_POJEDINAC";

export type KategorijaPausalni =
  | "OBRT_SRODNE"
  | "ESNAFSKI_ZANATI"
  | "POLJOPRIVREDA_SUMARSTVO"
  | "TAXI"
  | "TRGOVAC_POJEDINAC";

export interface OsnoviceYear {
  source: string;
  avgBrutoPriorYear: number;
  stvarniDohodak: Record<KategorijaStvarni, number>;
  pausalni: Record<KategorijaPausalni, number>;
  ostali: number;
}

export const OSNOVICE_OBRTNICI_FBIH: Record<number, OsnoviceYear> = {
  2026: {
    source: "Sl. novine FBiH br. 100/25 od 31.12.2025",
    avgBrutoPriorYear: 2464.0,
    stvarniDohodak: {
      SLOBODNA_ZANIMANJA: 2710.0,
      OBRT_SRODNE: 1602.0,
      POLJOPRIVREDA_SUMARSTVO: 715.0,
      TRGOVAC_POJEDINAC: 715.0,
    },
    pausalni: {
      OBRT_SRODNE: 1355.0,
      ESNAFSKI_ZANATI: 616.0,
      POLJOPRIVREDA_SUMARSTVO: 616.0,
      TAXI: 616.0,
      TRGOVAC_POJEDINAC: 715.0,
    },
    ostali: 739.0,
  },
};

// Ljudski-čitljivi labelovi za UI.
export const REZIM_LABELS: Record<RezimOporezivanja, string> = {
  STVARNI_DOHODAK: "Stvarni dohodak (poslovne knjige, čl. 19)",
  PAUSALNI: "Paušalni iznos (čl. 31)",
  OSTALI: "Ostali obveznici (čl. 6 t.10)",
};

export const KATEGORIJA_STVARNI_LABELS: Record<KategorijaStvarni, string> = {
  SLOBODNA_ZANIMANJA: "Slobodna zanimanja",
  OBRT_SRODNE: "Obrt i srodne djelatnosti",
  POLJOPRIVREDA_SUMARSTVO: "Poljoprivreda i šumarstvo",
  TRGOVAC_POJEDINAC: "Trgovac pojedinac",
};

export const KATEGORIJA_PAUSALNI_LABELS: Record<KategorijaPausalni, string> = {
  OBRT_SRODNE: "Obrt i srodne djelatnosti",
  ESNAFSKI_ZANATI: "Niskoakumulativne (tradicionalni esnafski zanati)",
  POLJOPRIVREDA_SUMARSTVO: "Poljoprivreda i šumarstvo",
  TAXI: "Taxi prijevoz",
  TRGOVAC_POJEDINAC: "Trgovac pojedinac",
};

export function getOsnovica(
  year: number,
  rezim: RezimOporezivanja,
  kategorija?: KategorijaStvarni | KategorijaPausalni,
): number {
  const yearData = OSNOVICE_OBRTNICI_FBIH[year];
  if (!yearData) {
    throw new Error(
      `Osnovice za godinu ${year} nisu definisane u obrtniciFbih.ts`,
    );
  }
  if (rezim === "OSTALI") return yearData.ostali;
  if (!kategorija) {
    throw new Error(`Kategorija je obavezna za režim ${rezim}`);
  }
  const tabela =
    rezim === "STVARNI_DOHODAK" ? yearData.stvarniDohodak : yearData.pausalni;
  const iznos = (tabela as Record<string, number>)[kategorija];
  if (iznos == null) {
    throw new Error(
      `Kategorija ${kategorija} ne postoji u režimu ${rezim} za ${year}`,
    );
  }
  return iznos;
}
