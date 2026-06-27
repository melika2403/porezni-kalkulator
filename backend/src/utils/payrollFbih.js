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

// ── Korist u naravi (službeno vozilo u privatne svrhe) ──────────────────────
// Korist je neto iznos u kojem je VEĆ sadržan porez (čl. 22 Pravilnika), NIJE
// osnovica. Grossuje se SAMO za doprinose iz plate (31%), pa porez ide na taj
// preračunati iznos. Koeficijent se izvodi iz EMP_TOTAL (ne hardkodira):
//   koeficijent = 1 / (1 - EMP_TOTAL) = 1 / 0,69 = 1,4492753...
// Lični odbitak se NE primjenjuje na korist (primjenjuje se samo jednom, na platu).
function koristCoefficient() {
  return 1 / (1 - EMP_TOTAL);
}

// PDV se dodaje na ulaznu vrijednost kad je unesena bez PDV-a (metode 1 i 2
// traže vrijednost sa PDV-om). Stopa PDV-a u BiH je 17%.
const PDV_RATE = 0.17;

// Vrijednost koristi V (neto sa sadržanim porezom) iz konfiguracije radnika.
//   metoda 'nabavna_1posto' → V = 1% × nabavna vrijednost (sa PDV)
//   metoda 'lizing_20posto' → V = 20% × mjesečna rata (sa PDV)
//   metoda 'stvarni_km'     → V = pređeni privatni km × 0,30 KM (pojednostavljeno)
function koristNetValueFromConfig(metoda, vrijednost, saPdv) {
  let v = Math.max(Number(vrijednost) || 0, 0);
  if (v <= 0) return 0;
  if (metoda === "stvarni_km") {
    return +(v * 0.3).toFixed(2);
  }
  // Metode 1 i 2: baza mora biti sa PDV-om; ako je bez, dodaj PDV.
  if (saPdv === false) v = v * (1 + PDV_RATE);
  if (metoda === "lizing_20posto") return +(v * 0.2).toFixed(2);
  // default nabavna_1posto
  return +(v * 0.01).toFixed(2);
}

// Razlaganje koristi za TAJ mjesec, iz V (neto sa porezom). Svaki dio zaokružen
// na 2 decimale (PUFBiH round-then-sum). Vraća null ako nema koristi.
function computeKorist(koristNetValue) {
  const V = Math.max(Number(koristNetValue) || 0, 0);
  if (V <= 0) return null;
  const koristBruto = +(V * koristCoefficient()).toFixed(2);
  const empPio = +(koristBruto * EMP_PIO).toFixed(2);
  const empZdravstvo = +(koristBruto * EMP_ZDRAVSTVO).toFixed(2);
  const empNezaposlenost = +(koristBruto * EMP_NEZAPOSLENOST).toFixed(2);
  const empTotal = +(empPio + empZdravstvo + empNezaposlenost).toFixed(2);
  // Bez ličnog odbitka na korist.
  const taxBase = +Math.max(koristBruto - empTotal, 0).toFixed(2);
  const porez = +(taxBase * TAX_RATE).toFixed(2);
  const erpPio = +(koristBruto * ERP_PIO).toFixed(2);
  const erpZdravstvo = +(koristBruto * ERP_ZDRAVSTVO).toFixed(2);
  const erpNezaposlenost = +(koristBruto * ERP_NEZAPOSLENOST).toFixed(2);
  const erpTotal = +(erpPio + erpZdravstvo + erpNezaposlenost).toFixed(2);
  // Nenovčani "neto" dio koristi (vrijednost vozila) — ne isplaćuje se radniku.
  // Služi kao protustavka u nalogu za knjiženje.
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
  PDV_RATE,
  deductionFromCoefficient,
  koristCoefficient,
  koristNetValueFromConfig,
  computeKorist,
  fromGross,
  fromNet,
  computeMinContribBase,
};
