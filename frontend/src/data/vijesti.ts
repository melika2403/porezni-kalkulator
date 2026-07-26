// Rubrike i tipovi redakcijskog sadržaja. Ogledalo backend konstanti
// (backend/src/config/vijesti.js), isti id-evi.

export type VijestTip = "VIJEST" | "VODIC";
export type VijestStatus = "NACRT" | "ZAKAZAN" | "OBJAVLJEN" | "ARHIVIRAN";
/** Mjesto na naslovnoj; veličina kartice je posljedica pozicije. */
export type VijestPozicija = "VODECA" | "IZDVOJENO" | "OBICNO";

export const POZICIJE: { id: VijestPozicija; naziv: string; opis: string }[] = [
  {
    id: "VODECA",
    naziv: "Vodeća",
    opis: "velika kartica na vrhu, samo jedna",
  },
  {
    id: "IZDVOJENO",
    naziv: "Izdvojeno",
    opis: "manja kartica uz vodeću, do tri",
  },
  { id: "OBICNO", naziv: "Obično", opis: "samo u rijeci Najnovije" },
];

export const RUBRIKE: { id: string; naziv: string }[] = [
  { id: "propisi", naziv: "Propisi i izmjene" },
  { id: "porezi", naziv: "Porezi i doprinosi" },
  { id: "plate", naziv: "Plate i radnici" },
  { id: "pdv", naziv: "PDV" },
  { id: "obrti", naziv: "Obrti i knjige" },
  { id: "vodici", naziv: "Vodiči" },
];

export function nazivRubrike(id: string): string {
  return RUBRIKE.find((r) => r.id === id)?.naziv ?? id;
}

export const STATUS_LABELE: Record<VijestStatus, string> = {
  NACRT: "Nacrt",
  ZAKAZAN: "Zakazan",
  OBJAVLJEN: "Objavljen",
  ARHIVIRAN: "Arhiviran",
};

/** Minimalna dužina teksta u riječima prije objave. */
export const MIN_RIJECI: Record<VijestTip, number> = {
  VIJEST: 300,
  VODIC: 1200,
};

/** Granice SEO polja, iste koje provjerava i backend. */
export const SEO_LIMITI = {
  naslovMin: 50,
  naslovMax: 60,
  opisMin: 140,
  opisMax: 160,
};

/** Granice sažetka: isti brojevi za brojač u editoru, semafor i backend. */
export const SAZETAK_LIMITI = { min: 80, max: 300 };

/** Adresa članka: vijest i vodič imaju odvojene sekcije. */
export function putanjaClanka(tip: VijestTip, slug: string): string {
  return tip === "VODIC" ? `/vodici/${slug}` : `/vijesti/${slug}`;
}

/** Stranica rubrike: server renderuje prvih 6, "Učitaj još" dovlači po 6.
 *  Konstanta živi ovdje (modul bez "use client") da je i server strana i
 *  klijentska lista čitaju kao broj, ne kao klijentsku referencu. */
export const RUBRIKA_PO_STRANI = 6;
