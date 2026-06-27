// ──────────────────────────────────────────────────────────────────────────────
//  Payroll FBiH — preračun bruto/neto, doprinosi i porez.
//  Korišten u kalkulatoru plate i u mjesečnom obračunu za radnike.
// ──────────────────────────────────────────────────────────────────────────────

// ── Stope doprinosa iz plate (na teret zaposlenog) ─────────────────────────
export const EMP_PIO = 0.17;
export const EMP_ZDRAVSTVO = 0.125;
export const EMP_NEZAPOSLENOST = 0.015;
export const EMP_TOTAL = EMP_PIO + EMP_ZDRAVSTVO + EMP_NEZAPOSLENOST; // 0.31

// ── Stope doprinosa na platu (na teret poslodavca) ─────────────────────────
export const ERP_PIO = 0.025;
export const ERP_ZDRAVSTVO = 0.02;
export const ERP_NEZAPOSLENOST = 0.005;
export const ERP_TOTAL = ERP_PIO + ERP_ZDRAVSTVO + ERP_NEZAPOSLENOST; // 0.05

// ── Dodatne naknade (na neto platu) ───────────────────────────────────────
export const VODNA_NAKNADA = 0.005;
export const NAKNADA_NESRECE = 0.005;

// ── Porez na dohodak ──────────────────────────────────────────────────────
export const TAX_RATE = 0.10;

// ── Lični odbitak ────────────────────────────────────────────────────────
// Koeficijent 1.0 = 300 KM mjesečno osnovnog ličnog odbitka.
export const DEDUCTION_PER_COEFFICIENT = 300;

// ── Minimalna plata i osnovica za doprinose 2026 ─────────────────────────
// Izvor: Službene novine FBiH br. 100/25 od 31.12.2025.
// Zakon o doprinosima FBiH (čl. 7, izmjene 33/25 od 01.07.2025).
export const MIN_NET_FBIH_2026 = 1027;
export const MIN_BASE_FBIH_2026_COEF1 = 1605.48;
export const MIN_BASE_FBIH_2026_NO_COEF = 1653.79;
export const AVG_BRUTO_FBIH_2025 = 2464;

export type WorkTimeCategory = "FULL" | "PART_OVER_4" | "PART_UNDER_4";

export interface MinContribBase {
  minBase: number;
  fullMinBase: number;
  workTimeCategory: WorkTimeCategory;
  contractedHours: number;
}

export interface PayrollResult {
  gross: number;
  empPio: number;
  empZdravstvo: number;
  empNezaposlenost: number;
  empTotal: number;
  taxBase: number;
  incomeTax: number;
  net: number;
  erpPio: number;
  erpZdravstvo: number;
  erpNezaposlenost: number;
  erpTotal: number;
  vodnaNaknada: number;
  naknadaNesrece: number;
  totalCost: number;
}

export function deductionFromCoefficient(coefficient: number): number {
  return Math.max(coefficient, 0) * DEDUCTION_PER_COEFFICIENT;
}

export function fromGross(gross: number, deduction: number): PayrollResult {
  const empPio = gross * EMP_PIO;
  const empZdravstvo = gross * EMP_ZDRAVSTVO;
  const empNezaposlenost = gross * EMP_NEZAPOSLENOST;
  const empTotal = gross * EMP_TOTAL;
  const taxBase = Math.max(gross - empTotal - deduction, 0);
  const incomeTax = taxBase * TAX_RATE;
  const net = gross - empTotal - incomeTax;
  const erpPio = gross * ERP_PIO;
  const erpZdravstvo = gross * ERP_ZDRAVSTVO;
  const erpNezaposlenost = gross * ERP_NEZAPOSLENOST;
  const erpTotal = gross * ERP_TOTAL;
  const vodnaNaknada = net * VODNA_NAKNADA;
  const naknadaNesrece = net * NAKNADA_NESRECE;
  const totalCost = gross + erpTotal + vodnaNaknada + naknadaNesrece;
  return {
    gross,
    empPio,
    empZdravstvo,
    empNezaposlenost,
    empTotal,
    taxBase,
    incomeTax,
    net,
    erpPio,
    erpZdravstvo,
    erpNezaposlenost,
    erpTotal,
    vodnaNaknada,
    naknadaNesrece,
    totalCost,
  };
}

// ── Korist u naravi (službeno vozilo u privatne svrhe) ──────────────────────
// Mirror backend/src/utils/payrollFbih.js. Korist je neto sa sadržanim porezom
// (čl. 22), grossuje se SAMO za doprinose iz plate, porez ide na preračunati
// iznos, bez ličnog odbitka. Koeficijent = 1/(1-EMP_TOTAL) = 1,4492753...
export const PDV_RATE = 0.17;

export function koristCoefficient(): number {
  return 1 / (1 - EMP_TOTAL);
}

export type KoristMetoda = "nabavna_1posto" | "lizing_20posto" | "stvarni_km";

export function koristNetValueFromConfig(
  metoda: KoristMetoda | string | null | undefined,
  vrijednost: number,
  saPdv: boolean,
): number {
  let v = Math.max(Number(vrijednost) || 0, 0);
  if (v <= 0) return 0;
  if (metoda === "stvarni_km") return +(v * 0.3).toFixed(2);
  if (saPdv === false) v = v * (1 + PDV_RATE);
  if (metoda === "lizing_20posto") return +(v * 0.2).toFixed(2);
  return +(v * 0.01).toFixed(2); // nabavna_1posto (default)
}

export interface KoristResult {
  koristNetValue: number;
  koristBruto: number;
  empPio: number;
  empZdravstvo: number;
  empNezaposlenost: number;
  empTotal: number;
  taxBase: number;
  porez: number;
  erpPio: number;
  erpZdravstvo: number;
  erpNezaposlenost: number;
  erpTotal: number;
  netoNonCash: number;
}

export function computeKorist(koristNetValue: number): KoristResult | null {
  const V = Math.max(Number(koristNetValue) || 0, 0);
  if (V <= 0) return null;
  const koristBruto = +(V * koristCoefficient()).toFixed(2);
  const empPio = +(koristBruto * EMP_PIO).toFixed(2);
  const empZdravstvo = +(koristBruto * EMP_ZDRAVSTVO).toFixed(2);
  const empNezaposlenost = +(koristBruto * EMP_NEZAPOSLENOST).toFixed(2);
  const empTotal = +(empPio + empZdravstvo + empNezaposlenost).toFixed(2);
  const taxBase = +Math.max(koristBruto - empTotal, 0).toFixed(2);
  const porez = +(taxBase * TAX_RATE).toFixed(2);
  const erpPio = +(koristBruto * ERP_PIO).toFixed(2);
  const erpZdravstvo = +(koristBruto * ERP_ZDRAVSTVO).toFixed(2);
  const erpNezaposlenost = +(koristBruto * ERP_NEZAPOSLENOST).toFixed(2);
  const erpTotal = +(erpPio + erpZdravstvo + erpNezaposlenost).toFixed(2);
  const netoNonCash = +(koristBruto - empTotal - porez).toFixed(2);
  return {
    koristNetValue: V,
    koristBruto,
    empPio,
    empZdravstvo,
    empNezaposlenost,
    empTotal,
    taxBase,
    porez,
    erpPio,
    erpZdravstvo,
    erpNezaposlenost,
    erpTotal,
    netoNonCash,
  };
}

export function fromNet(net: number, deduction: number): PayrollResult {
  const netCoeff = (1 - EMP_TOTAL) * (1 - TAX_RATE);
  const grossWithTax = (net - deduction * TAX_RATE) / netCoeff;
  if (grossWithTax * (1 - EMP_TOTAL) - deduction > 0.001) {
    return fromGross(grossWithTax, deduction);
  }
  return fromGross(net / (1 - EMP_TOTAL), deduction);
}

// Min. osnovica za doprinose po Zakonu o doprinosima FBiH (čl. 7, izmjene
// 33/25 od 01.07.2025). Zavisi od ugovorenog radnog vremena:
//   • 8h (puno) → puna min. osnovica
//   • 5–7h (nepuno > 4h) → puna min. osnovica (NE smanjuje se srazmjerno)
//   • 1–4h (nepuno ≤ 4h) → srazmjerno, ali ne manje od 50% pune osnovice
export function computeMinContribBase(
  coefficient: number,
  contractedHours: number = 8,
): MinContribBase {
  const coeff = Math.max(Number(coefficient) || 0, 0);
  const hours = Math.max(Math.min(Number(contractedHours) || 8, 8), 1);
  const deduction = coeff * DEDUCTION_PER_COEFFICIENT;
  const fullMin = fromNet(MIN_NET_FBIH_2026, deduction).gross;
  let workTimeCategory: WorkTimeCategory;
  let appliedMin: number;
  if (hours >= 8) {
    workTimeCategory = "FULL";
    appliedMin = fullMin;
  } else if (hours >= 5) {
    workTimeCategory = "PART_OVER_4";
    appliedMin = fullMin;
  } else {
    workTimeCategory = "PART_UNDER_4";
    appliedMin = Math.max(fullMin * (hours / 8), fullMin * 0.5);
  }
  return {
    minBase: +appliedMin.toFixed(2),
    fullMinBase: +fullMin.toFixed(2),
    workTimeCategory,
    contractedHours: hours,
  };
}
