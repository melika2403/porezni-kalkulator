// ──────────────────────────────────────────────────────────────────────────────
//  Payroll FBiH — preračun bruto/neto, doprinosi i porez.
//  Mirror of frontend/src/utils/payrollFbih.ts — držati u sinhronizaciji.
// ──────────────────────────────────────────────────────────────────────────────

const EMP_PIO = 0.17;
const EMP_ZDRAVSTVO = 0.125;
const EMP_NEZAPOSLENOST = 0.015;
const EMP_TOTAL = EMP_PIO + EMP_ZDRAVSTVO + EMP_NEZAPOSLENOST;

const ERP_PIO = 0.025;
const ERP_ZDRAVSTVO = 0.02;
const ERP_NEZAPOSLENOST = 0.005;
const ERP_TOTAL = ERP_PIO + ERP_ZDRAVSTVO + ERP_NEZAPOSLENOST;

const VODNA_NAKNADA = 0.005;
const NAKNADA_NESRECE = 0.005;

const TAX_RATE = 0.10;

const DEDUCTION_PER_COEFFICIENT = 300;

// ── Minimalna plata i osnovica za doprinose 2026 ───────────────────────────
// Izvor: Službene novine FBiH br. 100/25 od 31.12.2025.
// Zakon o doprinosima FBiH (čl. 7, izmjene 33/25 od 01.07.2025).
const MIN_NET_FBIH_2026 = 1027; // minimalna neto plata
const MIN_BASE_FBIH_2026_COEF1 = 1605.48; // min. bruto osnovica (koef 1.0)
const MIN_BASE_FBIH_2026_NO_COEF = 1653.79; // min. bruto osnovica (bez koef.)
const AVG_BRUTO_FBIH_2025 = 2464; // prosj. bruto I–IX 2025 (osnova za 2026)

function deductionFromCoefficient(coefficient) {
  return Math.max(Number(coefficient) || 0, 0) * DEDUCTION_PER_COEFFICIENT;
}

function fromGross(gross, deduction) {
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

function fromNet(net, deduction) {
  const netCoeff = (1 - EMP_TOTAL) * (1 - TAX_RATE);
  const grossWithTax = (net - deduction * TAX_RATE) / netCoeff;
  if (grossWithTax * (1 - EMP_TOTAL) - deduction > 0.001) {
    return fromGross(grossWithTax, deduction);
  }
  return fromGross(net / (1 - EMP_TOTAL), deduction);
}

// Vraća iznos minimalne osnovice za doprinose i razlog primjene.
// Pravilo (Zakon o doprinosima FBiH, čl. 7, izmjene 33/25 od 01.07.2025):
//   • Puno radno vrijeme (8h) → puna min. bruto osnovica
//   • Nepuno > 4h (5–7h) → puna min. bruto osnovica (NE smanjuje se srazmjerno)
//   • Nepuno ≤ 4h (1–4h) → srazmjerno (h/8), ali ne manje od 50% pune osnovice
function computeMinContribBase(coefficient, contractedHours = 8) {
  const coeff = Math.max(Number(coefficient) || 0, 0);
  const hours = Math.max(Math.min(Number(contractedHours) || 8, 8), 1);
  const deduction = coeff * DEDUCTION_PER_COEFFICIENT;
  // Izračunaj punu min. bruto osnovicu iz min. nete za dati koeficijent.
  const fullMin = fromNet(MIN_NET_FBIH_2026, deduction).gross;
  let workTimeCategory;
  let appliedMin;
  if (hours >= 8) {
    workTimeCategory = "FULL";
    appliedMin = fullMin;
  } else if (hours >= 5) {
    workTimeCategory = "PART_OVER_4";
    appliedMin = fullMin; // zakon NE dozvoljava srazmjerno smanjenje
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

module.exports = {
  EMP_PIO,
  EMP_ZDRAVSTVO,
  EMP_NEZAPOSLENOST,
  EMP_TOTAL,
  ERP_PIO,
  ERP_ZDRAVSTVO,
  ERP_NEZAPOSLENOST,
  ERP_TOTAL,
  VODNA_NAKNADA,
  NAKNADA_NESRECE,
  TAX_RATE,
  DEDUCTION_PER_COEFFICIENT,
  MIN_NET_FBIH_2026,
  MIN_BASE_FBIH_2026_COEF1,
  MIN_BASE_FBIH_2026_NO_COEF,
  AVG_BRUTO_FBIH_2025,
  deductionFromCoefficient,
  fromGross,
  fromNet,
  computeMinContribBase,
};
