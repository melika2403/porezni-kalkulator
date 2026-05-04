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
