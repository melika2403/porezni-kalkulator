/* ─────────────────────────────────────────────────────────────────────────────
   Ugovor o djelu — calculator
   Formula (FBiH):
     priznati troškovi = bruto × 20%
     osnovica zdravstvenog = bruto × 80% (= bruto - troškovi)
     zdravstveno doprinos (radnik) = osnovica × 4%
       - kanton dio = zdravstveno × 89.80%
       - federacija dio = zdravstveno × 10.20%
     osnovica poreza = osnovica zdravstvenog - zdravstveno
     porez na dohodak = osnovica × 10%
     neto za isplatu = bruto × 0.8912

   Naručilac dodatno (na svoj teret):
     PIO 6% = osnovica zdravstvenog × 6%
     Zaštita od prirodnih nepogoda = neto × 0.5%
     Opšta vodna naknada = neto × 0.5%

   Ukupan trošak naručioca = bruto + PIO + zaštita + voda
   ──────────────────────────────────────────────────────────────────────────── */

export const RATES = {
  zdravstvenoPct: 0.04,
  zdravstvenoKantonShare: 0.898,
  zdravstvenoFbihShare: 0.102,
  porezPct: 0.10,
  pioPct: 0.06,
  zastitaPct: 0.005,
  vodaPct: 0.005,
} as const;

export type VrstaNaknade = "standard" | "autorsko" | "komisija";

export const VRSTA_OPTIONS: Record<VrstaNaknade, { label: string; troskoviPct: number }> = {
  standard: { label: "Standardna naknada (20% troškovi)", troskoviPct: 0.20 },
  autorsko: { label: "Autorsko djelo (30% troškovi)", troskoviPct: 0.30 },
  komisija: { label: "Komisija / nadzorni odbor (0% troškovi)", troskoviPct: 0 },
};

// Calculate the divisor: neto = bruto × divisor
//   bruto B; troškovi = T × B; osnovica zdravstvenog = (1-T) × B
//   zdravstveno = 0.04 × (1-T) × B
//   porez = 0.10 × (1-T) × (1-0.04) × B = 0.096 × (1-T) × B
//   neto = (1-T) × B − zdravstveno − porez + T × B
//        = (1-T) × B × (1 − 0.04 − 0.096) + T × B
//        = (1-T) × 0.864 × B + T × B
//        = B × (0.864 − 0.864 × T + T)
//        = B × (0.864 + 0.136 × T)
export function nettoBrutoDivisor(troskoviPct: number): number {
  return 0.864 + 0.136 * troskoviPct;
}

// Multiplier (to convert neto → bruto): 1 / divisor
export function nettoBrutoMultiplier(troskoviPct: number): number {
  return 1 / nettoBrutoDivisor(troskoviPct);
}

// Convenience constants for the standard (20%) case
export const NETO_TO_BRUTO_DIVISOR = nettoBrutoDivisor(0.20); // 0.8912

export interface UodCalc {
  // Iznosi koji idu u "Obračun" tabelu
  neto: number;
  bruto: number;
  priznatiTroskovi: number;
  brutoUmanjenZaTroskove: number; // osnovica zdravstvenog = bruto × 80%
  zdravstveno: number;
  zdravstvenoKanton: number;
  zdravstvenoFbih: number;
  osnovicaZaPorez: number;
  porez: number;
  naknadaPoOdbitku: number; // bruto - zdravstveno - porez (bez troškova)
  naknadaZaIsplatu: number; // = neto

  // Naručilac plaća dodatno
  pio: number;
  zastita: number;
  voda: number;

  // Ukupno
  ukupniTroskovi: number; // bruto + pio + zastita + voda
  porezDoprinosNaNetoPct: number; // (ukupniTroskovi - neto) / neto × 100
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcFromBruto(bruto: number, troskoviPct: number = 0.20): UodCalc {
  const priznatiTroskovi = round2(bruto * troskoviPct);
  const brutoUmanjenZaTroskove = round2(bruto - priznatiTroskovi);
  const zdravstveno = round2(brutoUmanjenZaTroskove * RATES.zdravstvenoPct);
  const zdravstvenoKanton = round2(zdravstveno * RATES.zdravstvenoKantonShare);
  const zdravstvenoFbih = round2(zdravstveno - zdravstvenoKanton);
  const osnovicaZaPorez = round2(brutoUmanjenZaTroskove - zdravstveno);
  const porez = round2(osnovicaZaPorez * RATES.porezPct);
  const naknadaPoOdbitku = round2(brutoUmanjenZaTroskove - zdravstveno - porez);
  const naknadaZaIsplatu = round2(naknadaPoOdbitku + priznatiTroskovi);
  const neto = naknadaZaIsplatu;

  const pio = round2(brutoUmanjenZaTroskove * RATES.pioPct);
  const zastita = round2(neto * RATES.zastitaPct);
  const voda = round2(neto * RATES.vodaPct);
  const ukupniTroskovi = round2(bruto + pio + zastita + voda);
  const porezDoprinosNaNetoPct = neto > 0
    ? round2(((ukupniTroskovi - neto) / neto) * 100)
    : 0;

  return {
    neto,
    bruto: round2(bruto),
    priznatiTroskovi,
    brutoUmanjenZaTroskove,
    zdravstveno,
    zdravstvenoKanton,
    zdravstvenoFbih,
    osnovicaZaPorez,
    porez,
    naknadaPoOdbitku,
    naknadaZaIsplatu,
    pio,
    zastita,
    voda,
    ukupniTroskovi,
    porezDoprinosNaNetoPct,
  };
}

export function calcFromNeto(neto: number, troskoviPct: number = 0.20): UodCalc {
  const bruto = round2(neto / nettoBrutoDivisor(troskoviPct));
  return calcFromBruto(bruto, troskoviPct);
}

/* ─────────────────────────────────────────────────────────────────────────────
   NEREZIDENT (lice sa prebivalištem u RS, Brčko Distriktu ili inostranstvu,
   angažovano od naručioca sa sjedištem u FBiH).
   Izvori: Zakon o porezu na dohodak FBiH čl. 57, Pravilnik o primjeni, PDN-1033.

   - Nema normiranih rashoda (osnovica poreza = puni bruto).
   - Nema doprinosa (ni zdravstveno 4% ni PIO/MIO 6%).
   - Porez na dohodak po odbitku 10% na bruto.
   - Opšta vodna naknada 0,5% i naknada za zaštitu od nepogoda 0,5% (osnovica =
     neto), na teret naručioca.
   ──────────────────────────────────────────────────────────────────────────── */
export const NEREZIDENT_RATES = {
  porezPct: 0.1,
  vodaPct: 0.005,
  nepogodePct: 0.005,
} as const;

export interface UodCalcNerezident {
  neto: number;
  bruto: number; // osnovica za PDN-1033
  porez: number; // 10% na bruto
  voda: number; // 0,5% na neto, teret naručioca
  nepogode: number; // 0,5% na neto, teret naručioca
  netoIsplata: number; // = neto
  ukupniTroskovi: number; // bruto + voda + nepogode
  porezDoprinosNaNetoPct: number; // (ukupniTroskovi - neto) / neto × 100
}

function calcNerezident(bruto: number, neto: number): UodCalcNerezident {
  const porez = round2(bruto - neto);
  const voda = round2(neto * NEREZIDENT_RATES.vodaPct);
  const nepogode = round2(neto * NEREZIDENT_RATES.nepogodePct);
  const ukupniTroskovi = round2(bruto + voda + nepogode);
  const porezDoprinosNaNetoPct =
    neto > 0 ? round2(((ukupniTroskovi - neto) / neto) * 100) : 0;
  return {
    neto: round2(neto),
    bruto: round2(bruto),
    porez,
    voda,
    nepogode,
    netoIsplata: round2(neto),
    ukupniTroskovi,
    porezDoprinosNaNetoPct,
  };
}

// Bruto se računa kao neto / 0,90 direktno (izbjegava drift faktora 1,1111).
export function calcNerezidentFromNeto(neto: number): UodCalcNerezident {
  const bruto = round2(neto / 0.9);
  return calcNerezident(bruto, neto);
}

export function calcNerezidentFromBruto(bruto: number): UodCalcNerezident {
  const porez = round2(bruto * NEREZIDENT_RATES.porezPct);
  const neto = round2(bruto - porez);
  return calcNerezident(bruto, neto);
}
