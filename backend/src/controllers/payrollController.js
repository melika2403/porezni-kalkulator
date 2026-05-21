// ──────────────────────────────────────────────────────────────────────────────
//  Payroll controller — mjesečni obračun plata po radniku.
//
//  Snapshot pristup: kad korisnik klikne "Obračunaj", upišu se izračunate
//  vrijednosti u bazu (Payroll red). Override-i (workedMinutes, dodaci itd.)
//  čuvaju se zajedno sa rezultatom, tako da kasniji prikaz odgovara onome
//  što je generisano u PDF uplatnicama / platnoj listi.
// ──────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const {
  Payroll,
  PayrollDocument,
  Worker,
  Organization,
  OrganizationMember,
} = require("../models/index");
const {
  deductionFromCoefficient,
  TAX_RATE,
  ERP_PIO,
  ERP_ZDRAVSTVO,
  ERP_NEZAPOSLENOST,
  VODNA_NAKNADA,
  NAKNADA_NESRECE,
  computeMinContribBase,
} = require("../utils/payrollFbih");
const {
  generateAllUplatnice,
  resolvePayrollAccounts,
  FOND_INVALIDI_RATE,
} = require("../utils/payrollUplatnice");
const {
  generateUplatnica,
  generateUplatniceCombined,
  kantonForOpcina,
  KANTONI,
} = require("../utils/uplatnicaPdf");

// ──────────────────────────────────────────────────────────────────────────────
//  Helper: agregacija uplatnica po (kanton, opcina) radnika
//
//  KANTONALNE vrste (zdrKant 89,8%, nezapKant 70%, porez) idu na račun
//  kantona i opcinu radnika → grupišu se po (workerKanton, workerOpcina).
//
//  FEDERALNE vrste (PIO, zdrFed 10,2%, nezapFed 30%, invalidi) idu na
//  federalne račune sa opcinom FIRME → 1 stavka.
//
//  Kantonalni budžet firme (vodna, nesreće) idu na KANTONI[firmKanton].budzet
//  sa opcinom firme → 1 stavka.
//
//  Vraća listu: { vrsta, amount, kantonKey, opcinaKod, opcinaIme, source }
//    vrsta ∈ "pio" | "zdrKanton" | "zdrFed" | "nezapKanton" | "nezapFed"
//          | "porez" | "vodna" | "nesrece" | "fondInvalidi"
//    source: "worker" | "firm"
// ──────────────────────────────────────────────────────────────────────────────
function buildUplatniceBuckets(payrolls, workerMap, firm, opts = {}) {
  const round = (n) => +Number(n).toFixed(2);
  const fondInvalidiRate = opts.fondInvalidiRate || 0.005;
  // groupTag označava entry-je kao "vlasnik" ili "radnici" — koristi se kad
  // se za obrt razdvajaju uplatnice vlasnika od uplatnica radnika.
  const groupTag = opts.groupTag || null;

  // Firm kanton/opcina
  const firmInfo = kantonForOpcina(firm.city || "");
  const firmKantonKey = firmInfo?.kantonKey || null;
  const firmOpcinaKod = firmInfo?.opcinaKod || "";
  const firmOpcinaIme = firm.city || "";

  // Worker-based bucketi (zdrKant, nezapKant, porez)
  const byLoc = new Map(); // key: "kanton:opcinaKod" → { kantonKey, opcinaKod, opcinaIme, zdrKant, nezapKant, porez }
  // Firm totals (federalni + kantonal firme)
  let pio = 0,
    zdrFed = 0,
    nezapFed = 0,
    vodna = 0,
    nesrece = 0,
    gross = 0;

  for (const p of payrolls) {
    const w = workerMap.get(p.workerId);
    // Worker location — fallback na firmu ako nema worker.city ili je opcina nepoznata
    let wInfo = kantonForOpcina(w?.city || "");
    if (!wInfo) wInfo = firmInfo;
    const kantonKey = wInfo?.kantonKey || firmKantonKey;
    const opcinaKod = wInfo?.opcinaKod || firmOpcinaKod;
    const opcinaIme = w?.city || firmOpcinaIme;
    const locKey = `${kantonKey || ""}:${opcinaKod || ""}`;

    if (!byLoc.has(locKey)) {
      byLoc.set(locKey, {
        kantonKey,
        opcinaKod,
        opcinaIme,
        zdrKant: 0,
        nezapKant: 0,
        porez: 0,
      });
    }
    const bucket = byLoc.get(locKey);

    const zdrTotal = (Number(p.empZdravstvo) || 0) + (Number(p.erpZdravstvo) || 0);
    const nezapTotal = (Number(p.empNezaposlenost) || 0) + (Number(p.erpNezaposlenost) || 0);

    // Splitovi po radniku, pa sumiramo u bucket
    bucket.zdrKant += zdrTotal * 0.898;
    bucket.nezapKant += nezapTotal * 0.7;
    bucket.porez += Number(p.incomeTax) || 0;

    // Firm totals
    pio += (Number(p.empPio) || 0) + (Number(p.erpPio) || 0);
    zdrFed += zdrTotal * 0.102;
    nezapFed += nezapTotal * 0.3;
    vodna += Number(p.vodnaNaknada) || 0;
    nesrece += Number(p.naknadaNesrece) || 0;
    gross += Number(p.gross) || 0;
  }

  // Invalidi: 0,5% × bruto, samo COMPANY (BUSINESS = obrt → izuzet)
  const invalidi = firm.type === "BUSINESS" ? 0 : gross * fondInvalidiRate;

  const entries = [];
  const firmLoc = {
    kantonKey: firmKantonKey,
    opcinaKod: firmOpcinaKod,
    opcinaIme: firmOpcinaIme,
  };

  // Sortirane (kanton, opcina) lokacije radnika
  const sortedLocs = Array.from(byLoc.values()).sort((a, b) => {
    if (a.kantonKey !== b.kantonKey) return String(a.kantonKey).localeCompare(String(b.kantonKey));
    return String(a.opcinaIme).localeCompare(String(b.opcinaIme), "bs");
  });

  // Redoslijed prema poslovnoj logici:
  //  1. PIO
  //  2. Zdravstvo kantonalno (po opcini)
  //  3. Zdravstvo federalno
  //  4. Nezaposlenost kantonalno (po opcini)
  //  5. Nezaposlenost federalno
  //  6. Nesreće
  //  7. Vodne
  //  8. Porez na dohodak (po opcini)
  //  9. Invalidi
  if (pio > 0) entries.push({ vrsta: "pio", amount: round(pio), ...firmLoc, source: "firm", group: groupTag });

  for (const loc of sortedLocs) {
    if (loc.zdrKant > 0)
      entries.push({
        vrsta: "zdrKanton",
        amount: round(loc.zdrKant),
        kantonKey: loc.kantonKey,
        opcinaKod: loc.opcinaKod,
        opcinaIme: loc.opcinaIme,
        source: "worker",
        group: groupTag,
      });
  }
  if (zdrFed > 0) entries.push({ vrsta: "zdrFed", amount: round(zdrFed), ...firmLoc, source: "firm", group: groupTag });

  for (const loc of sortedLocs) {
    if (loc.nezapKant > 0)
      entries.push({
        vrsta: "nezapKanton",
        amount: round(loc.nezapKant),
        kantonKey: loc.kantonKey,
        opcinaKod: loc.opcinaKod,
        opcinaIme: loc.opcinaIme,
        source: "worker",
        group: groupTag,
      });
  }
  if (nezapFed > 0) entries.push({ vrsta: "nezapFed", amount: round(nezapFed), ...firmLoc, source: "firm", group: groupTag });

  if (nesrece > 0) entries.push({ vrsta: "nesrece", amount: round(nesrece), ...firmLoc, source: "firm", group: groupTag });
  if (vodna > 0) entries.push({ vrsta: "vodna", amount: round(vodna), ...firmLoc, source: "firm", group: groupTag });

  for (const loc of sortedLocs) {
    if (loc.porez > 0)
      entries.push({
        vrsta: "porez",
        amount: round(loc.porez),
        kantonKey: loc.kantonKey,
        opcinaKod: loc.opcinaKod,
        opcinaIme: loc.opcinaIme,
        source: "worker",
        group: groupTag,
      });
  }

  if (invalidi > 0) entries.push({ vrsta: "fondInvalidi", amount: round(invalidi), ...firmLoc, source: "firm", group: groupTag });

  return entries;
}

// Helper za obrt: razdvaja payroll-e na vlasnike i radnike, gradi posebne
// bucket entries za svaku grupu i konkatenira. Za d.o.o. (COMPANY) ili kad
// nema obje grupe, koristi se jedan poziv bez group taga.
function buildAllUplatnice(payrolls, workerMap, firm, opts = {}) {
  if (firm.type !== "BUSINESS") {
    return buildUplatniceBuckets(payrolls, workerMap, firm, opts);
  }
  const vlasniciPayrolls = payrolls.filter(
    (p) => workerMap.get(p.workerId)?.role === "VLASNIK",
  );
  const radniciPayrolls = payrolls.filter(
    (p) => workerMap.get(p.workerId)?.role === "RADNIK",
  );
  // Ako nema vlasnika ILI nema radnika, ne treba razdvajati.
  if (vlasniciPayrolls.length === 0 || radniciPayrolls.length === 0) {
    return buildUplatniceBuckets(payrolls, workerMap, firm, opts);
  }
  const vlasnikEntries = buildUplatniceBuckets(vlasniciPayrolls, workerMap, firm, {
    ...opts,
    groupTag: "vlasnik",
  });
  const radnikEntries = buildUplatniceBuckets(radniciPayrolls, workerMap, firm, {
    ...opts,
    groupTag: "radnici",
  });
  return [...vlasnikEntries, ...radnikEntries];
}

// Helper: dohvati account/vrstaPrihoda/budgetOrg/primalac za datu vrsta + kanton
function getAccountInfo(vrsta, kantonKey, payrollAccounts) {
  const { buildDefaults, mergePayrollAccounts } = require("../utils/payrollUplatnice");
  const defaults = buildDefaults(kantonKey);
  const merged = mergePayrollAccounts(defaults, payrollAccounts);
  return merged[vrsta];
}

// Stabilan redoslijed labela u Pregledu mjeseca / Zbirne uplatnice
const VRSTA_LABEL_MAP = {
  pio: "PIO/MIO doprinos",
  zdrKanton: "Zdravstvo — kantonalni (89,8%)",
  zdrFed: "Zdravstvo — federalni (10,2%)",
  nezapKanton: "Nezaposlenost — kantonalni (70%)",
  nezapFed: "Nezaposlenost — federalni (30%)",
  porez: "Porez na dohodak",
  vodna: "Opća vodna naknada",
  nesrece: "Zaštita od prirodnih nesreća",
  fondInvalidi: "Fond za rehabilitaciju OSI (0,5%)",
};
const VRSTA_UPLATNICA_TYPE = {
  pio: "UPLATNICA_PIO",
  zdrKanton: "UPLATNICA_ZDR",
  zdrFed: "UPLATNICA_ZDR_FED",
  nezapKanton: "UPLATNICA_NEZAP_KANT",
  nezapFed: "UPLATNICA_NEZAP",
  porez: "UPLATNICA_POREZ",
  vodna: "UPLATNICA_VODNA",
  nesrece: "UPLATNICA_NESRECE",
  fondInvalidi: "UPLATNICA_INVALIDI",
};
const VRSTA_SVRHA_MAP = {
  pio: "Doprinos za PIO/MIO",
  zdrKanton: "Doprinos za zdravstvo (kantonalni dio)",
  zdrFed: "Doprinos za zdravstvo (federalni dio)",
  nezapKanton: "Doprinos za nezaposlenost (kantonalni)",
  nezapFed: "Doprinos za nezaposlenost (federalni)",
  porez: "Porez na dohodak iz plate",
  vodna: "Opća vodna naknada",
  nesrece: "Naknada za zaštitu od prirodnih nesreća",
  fondInvalidi: "Naknada za rehabilitaciju i zapošljavanje OSI",
};
const { addPayslipPage, embedFonts } = require("../utils/payslipPdf");
const { PDFDocument } = require("pdf-lib");
const { decryptJmbg } = require("../utils/encryptJmbg");
const { UPLOADS_ROOT, safeUnlink } = require("../utils/uploads");
const { getOsnovica } = require("../utils/obrtniciFbih");

const DOCS_SUBDIR = "payroll-documents";

// Standardni mjesečni fond minuta = 174h * 60 = 10440 (orijentaciono, FBiH).
const STANDARD_MONTHLY_MINUTES = 174 * 60;

// Stope doprinosa za vlasnika obrta — ukupno 36% (član 9 Zakona o doprinosima FBiH).
// Obrtnik pokriva i radnički i poslodavčev dio iz vlastite osnovice.
const OBRTNIK_PIO = 0.195; // 17% + 2.5%
const OBRTNIK_ZDR = 0.145; // 12.5% + 2%
const OBRTNIK_NEZAP = 0.02; // 1.5% + 0.5%
const OBRTNIK_TOTAL = OBRTNIK_PIO + OBRTNIK_ZDR + OBRTNIK_NEZAP; // 0.36

// Računa snapshot doprinosa za vlasnika obrta. Osnovica je fiksna iz tabele
// (obrtniciFbih.js) zavisno od režima oporezivanja i kategorije djelatnosti.
function computeObrtnikSnapshot(osnovica) {
  const o = Number(osnovica) || 0;
  if (o <= 0) {
    return {
      gross: 0,
      grossBase: 0,
      empPio: 0,
      empZdravstvo: 0,
      empNezaposlenost: 0,
      empTotal: 0,
      taxBase: 0,
      incomeTax: 0,
      net: 0,
      erpPio: 0,
      erpZdravstvo: 0,
      erpNezaposlenost: 0,
      erpTotal: 0,
      vodnaNaknada: 0,
      naknadaNesrece: 0,
      taxCoefficient: 0,
      deduction: 0,
      minBaseApplied: false,
      mealAllowance: 0,
      vacationBonus: 0,
      travelExpense: 0,
      totalCost: 0,
      minuliRadRate: 0,
      minuliRadYears: 0,
      minuliRadAmount: 0,
      overtimeRate: 0,
      nightRate: 0,
      sundayRate: 0,
      holidayRate: 0,
      overtimeAmount: 0,
      nightAmount: 0,
      sundayAmount: 0,
      holidayAmount: 0,
    };
  }
  const pio = +(o * OBRTNIK_PIO).toFixed(2);
  const zdr = +(o * OBRTNIK_ZDR).toFixed(2);
  const nezap = +(o * OBRTNIK_NEZAP).toFixed(2);
  const total = +(pio + zdr + nezap).toFixed(2);
  return {
    gross: o,
    grossBase: o,
    empPio: pio,
    empZdravstvo: zdr,
    empNezaposlenost: nezap,
    empTotal: total,
    taxBase: 0,
    incomeTax: 0,
    net: 0,
    erpPio: 0,
    erpZdravstvo: 0,
    erpNezaposlenost: 0,
    erpTotal: 0,
    vodnaNaknada: 0,
    naknadaNesrece: 0,
    taxCoefficient: 0,
    deduction: 0,
    minBaseApplied: false,
    mealAllowance: 0,
    vacationBonus: 0,
    travelExpense: 0,
    totalCost: total,
    minuliRadRate: 0,
    minuliRadYears: 0,
    minuliRadAmount: 0,
    overtimeRate: 0,
    nightRate: 0,
    sundayRate: 0,
    holidayRate: 0,
    overtimeAmount: 0,
    nightAmount: 0,
    sundayAmount: 0,
    holidayAmount: 0,
  };
}

function parseId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

async function assertOrgAccess(orgId, userId) {
  const org = await Organization.findByPk(orgId);
  if (!org) return null;
  if (org.createdById === userId) return org;
  const mem = await OrganizationMember.findOne({
    where: { organizationId: orgId, userId, role: { [Op.in]: ["OWNER", "ADMIN"] } },
  });
  return mem ? org : null;
}

function toPublicPayroll(p) {
  if (!p) return null;
  const plain = p.toJSON ? p.toJSON() : p;
  const numFields = [
    "gross",
    "taxCoefficient",
    "deduction",
    "empPio",
    "empZdravstvo",
    "empNezaposlenost",
    "empTotal",
    "taxBase",
    "incomeTax",
    "net",
    "erpPio",
    "erpZdravstvo",
    "erpNezaposlenost",
    "erpTotal",
    "vodnaNaknada",
    "naknadaNesrece",
    "mealAllowance",
    "vacationBonus",
    "travelExpense",
    "totalCost",
    "overtimeHours",
    "nightHours",
    "sundayHours",
    "holidayHours",
    "overtimeRate",
    "nightRate",
    "sundayRate",
    "holidayRate",
    "overtimeAmount",
    "nightAmount",
    "sundayAmount",
    "holidayAmount",
    "grossBase",
    "minuliRadRate",
    "minuliRadAmount",
    "minuliRadYears",
    "workedMinutes",
    "standardMinutes",
    "sickDays",
    "vacationDays",
  ];
  for (const f of numFields) {
    if (plain[f] != null) plain[f] = Number(plain[f]);
  }
  return plain;
}

// Cijele godine staža između dvije ISO datume (npr. "2020-03-15" → "2026-05-31")
function yearsOfService(startDateStr, paymentDateStr) {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  const end = paymentDateStr ? new Date(paymentDateStr) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  let years = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < start.getDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

// Ukupan radni staž za minuli rad — koristi novu logiku (vidi komentar u
// Worker modelu). priorWorkYears ima prednost ako je postavljen (tačnije zbog
// gapova). Inače firstEmploymentDate. Inače fallback na prijavaDate.
function totalYearsOfService(worker, paymentDateStr) {
  const endStr = paymentDateStr || new Date().toISOString().slice(0, 10);
  const prior =
    worker?.priorWorkYears != null && worker.priorWorkYears !== ""
      ? Number(worker.priorWorkYears)
      : null;
  if (prior != null && Number.isFinite(prior) && prior >= 0) {
    // Staž u našoj firmi (od prijave) + ručno upisan prethodni staž.
    const currentYears = yearsOfService(worker?.prijavaDate, endStr);
    return Math.max(0, Math.floor(currentYears + prior));
  }
  if (worker?.firstEmploymentDate) {
    return yearsOfService(worker.firstEmploymentDate, endStr);
  }
  // Fallback: samo trenutna firma (kao prije — koristimo prijavaDate, jer je
  // to kad je radnik formalno počeo raditi u nas).
  return yearsOfService(worker?.prijavaDate || worker?.startDate, endStr);
}

// ── Izračun: sve vrijednosti iz inputa → Payroll snapshot polja ─────────────
function computePayrollSnapshot(input) {
  // grossBase = osnovica bruto plate (user-entered, iz ugovora)
  // minuliRadRate = % godišnje, minuliRadYears = godine staža
  // gross = efektivni bruto = osnovica + minuli rad + uvećanja
  const grossBase = Number(input.grossBase) || Number(input.gross) || 0;
  const minuliRadRate = Math.max(Number(input.minuliRadRate) || 0, 0);
  const minuliRadYears = Math.max(Number(input.minuliRadYears) || 0, 0);
  const minuliRadAmount = +(grossBase * (minuliRadRate / 100) * minuliRadYears).toFixed(2);

  // Uvećanja: satnica × sati × (stopa/100) po kategoriji. Standardni mjesečni
  // fond = 174h. Sati i stope su user-input (snapshot na Payroll).
  const hourlyRate = grossBase > 0 ? grossBase / 174 : 0;
  const overtimeHours = Math.max(Number(input.overtimeHours) || 0, 0);
  const nightHours = Math.max(Number(input.nightHours) || 0, 0);
  const sundayHours = Math.max(Number(input.sundayHours) || 0, 0);
  const holidayHours = Math.max(Number(input.holidayHours) || 0, 0);
  const overtimeRate = Math.max(Number(input.overtimeRate) || 0, 0);
  const nightRate = Math.max(Number(input.nightRate) || 0, 0);
  const sundayRate = Math.max(Number(input.sundayRate) || 0, 0);
  const holidayRate = Math.max(Number(input.holidayRate) || 0, 0);
  const overtimeAmount = +(overtimeHours * hourlyRate * (overtimeRate / 100)).toFixed(2);
  const nightAmount = +(nightHours * hourlyRate * (nightRate / 100)).toFixed(2);
  const sundayAmount = +(sundayHours * hourlyRate * (sundayRate / 100)).toFixed(2);
  const holidayAmount = +(holidayHours * hourlyRate * (holidayRate / 100)).toFixed(2);
  const uvecanjaTotal = +(overtimeAmount + nightAmount + sundayAmount + holidayAmount).toFixed(2);

  const grossInput = +(grossBase + minuliRadAmount + uvecanjaTotal).toFixed(2);

  const coeff = Math.max(Number(input.taxCoefficient) || 0, 0);
  // Min. osnovica zavisi od ugovorenog radnog vremena i koeficijenta porezne
  // kartice (Zakon o doprinosima FBiH, čl. 7, izmjene 33/25 od 01.07.2025).
  // Računamo flag samo informativno — doprinosi se UVIJEK obračunavaju na
  // stvarnu bruto platu (verifikovano u Com_Soft payroll softveru). Razlika do
  // min. osnovice (ako postoji) tretira se van obračuna radnika.
  const contractedHours = Math.max(Math.min(Number(input.contractedHours) || 8, 8), 1);
  const minInfo = computeMinContribBase(coeff, contractedHours);
  const minBaseApplied = grossInput > 0 && grossInput < minInfo.minBase;
  const deduction = deductionFromCoefficient(coeff);

  // Doprinosi se obračunavaju na stvarnu bruto platu (grossInput).
  const empPio = grossInput * 0.17;
  const empZdravstvo = grossInput * 0.125;
  const empNezaposlenost = grossInput * 0.015;
  const empTotal = empPio + empZdravstvo + empNezaposlenost;

  const taxBase = Math.max(grossInput - empTotal - deduction, 0);
  const incomeTax = taxBase * TAX_RATE;
  const net = grossInput - empTotal - incomeTax;

  const erpPio = grossInput * ERP_PIO;
  const erpZdravstvo = grossInput * ERP_ZDRAVSTVO;
  const erpNezaposlenost = grossInput * ERP_NEZAPOSLENOST;
  const erpTotal = erpPio + erpZdravstvo + erpNezaposlenost;

  const vodnaNaknada = net * VODNA_NAKNADA;
  const naknadaNesrece = net * NAKNADA_NESRECE;

  const mealAllowance = Number(input.mealAllowance) || 0;
  const vacationBonus = Number(input.vacationBonus) || 0;
  const travelExpense = Number(input.travelExpense) || 0;

  const totalCost =
    grossInput +
    erpTotal +
    vodnaNaknada +
    naknadaNesrece +
    mealAllowance +
    vacationBonus +
    travelExpense;

  // Sanity: ako gross nije unesen (0), sve je 0 i flag-ovi se gase.
  if (grossInput <= 0) {
    return {
      gross: 0,
      grossBase: 0,
      minuliRadRate,
      minuliRadYears,
      minuliRadAmount: 0,
      overtimeRate,
      nightRate,
      sundayRate,
      holidayRate,
      overtimeAmount: 0,
      nightAmount: 0,
      sundayAmount: 0,
      holidayAmount: 0,
      taxCoefficient: coeff,
      deduction,
      minBaseApplied: false,
      empPio: 0,
      empZdravstvo: 0,
      empNezaposlenost: 0,
      empTotal: 0,
      taxBase: 0,
      incomeTax: 0,
      net: 0,
      erpPio: 0,
      erpZdravstvo: 0,
      erpNezaposlenost: 0,
      erpTotal: 0,
      vodnaNaknada: 0,
      naknadaNesrece: 0,
      mealAllowance,
      vacationBonus,
      travelExpense,
      totalCost: mealAllowance + vacationBonus + travelExpense,
    };
  }

  return {
    gross: grossInput,
    grossBase,
    minuliRadRate,
    minuliRadYears,
    minuliRadAmount,
    overtimeRate,
    nightRate,
    sundayRate,
    holidayRate,
    overtimeAmount,
    nightAmount,
    sundayAmount,
    holidayAmount,
    taxCoefficient: coeff,
    deduction,
    minBaseApplied,
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
    mealAllowance,
    vacationBonus,
    travelExpense,
    totalCost,
  };
}

// ── GET /api/payroll?organizationId=X&year=Y&month=M ────────────────────────
async function list(req, res) {
  const organizationId = parseId(req.query.organizationId);
  const year = parseId(req.query.year);
  const month = parseId(req.query.month);
  if (!organizationId || !year || !month) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing organizationId/year/month" });
  }

  const org = await assertOrgAccess(organizationId, req.user.id);
  if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  // Filtriraj orphan payroll-e (radnik obrisan ali payroll ostao)
  const existingWorkers = await Worker.findAll({
    where: { organizationId },
    attributes: ["id"],
  });
  const validWorkerIds = new Set(existingWorkers.map((w) => w.id));
  const rawPayrolls = await Payroll.findAll({
    where: { organizationId, year, month },
    order: [["workerId", "ASC"]],
  });
  const payrolls = rawPayrolls.filter((p) => validWorkerIds.has(p.workerId));

  return res.json({
    ok: true,
    data: payrolls.map(toPublicPayroll),
  });
}

// ── POST /api/payroll/calculate ─────────────────────────────────────────────
// body: { organizationId, workerId, year, month, gross, taxCoefficient,
//         workedMinutes, standardMinutes, sickDays, overtimeHours, nightHours,
//         sundayHours, holidayHours, mealAllowance, vacationBonus, travelExpense, notes }
// Upsert: jedan red po (workerId, year, month).
async function calculate(req, res) {
  const {
    organizationId: rawOrgId,
    workerId: rawWorkerId,
    year: rawYear,
    month: rawMonth,
    gross,
    grossBase,
    minuliRadRate,
    paymentDate,
    taxCoefficient,
    workedMinutes,
    standardMinutes,
    sickDays,
    vacationDays,
    overtimeHours,
    nightHours,
    sundayHours,
    holidayHours,
    overtimeRate,
    nightRate,
    sundayRate,
    holidayRate,
    mealAllowance,
    vacationBonus,
    travelExpense,
    notes,
  } = req.body ?? {};

  const organizationId = parseId(rawOrgId);
  const workerId = parseId(rawWorkerId);
  const year = parseId(rawYear);
  const month = parseId(rawMonth);
  if (!organizationId || !workerId || !year || !month) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing organizationId/workerId/year/month" });
  }
  if (month < 1 || month > 12) {
    return res.status(400).json({ ok: false, error: "Month must be 1–12" });
  }

  const org = await assertOrgAccess(organizationId, req.user.id);
  if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const worker = await Worker.findOne({
    where: { id: workerId, organizationId },
  });
  if (!worker) return res.status(404).json({ ok: false, error: "Worker not found" });

  // Učitaj postojeći payroll PRIJE izračuna — koristimo njegove vrijednosti
  // kao fallback za polja koja frontend nije eksplicitno poslao
  // (npr. kad "Obračunaj sve" pošalje samo bruto + koef, dodaci i sati ostaju).
  const existing = await Payroll.findOne({
    where: { workerId, year, month },
  });

  // VLASNIK obrta (BUSINESS): osnovica je fiksna iz Sl. novina, doprinosi 36%.
  // Nema bruto, sata, dodataka — sve se ignoriše. Generiše se Obrazac 2002.
  //
  // VLASNIK d.o.o. / d.d. (COMPANY): tretira se kao standardni radnik —
  // ima bruto platu, sve doprinose 31% iz / 10,5% na, porez 10% i ulazi u
  // Obrazac 2001. Logika pada kroz na obični RADNIK kod ispod.
  if (worker.role === "VLASNIK" && org.type === "BUSINESS") {
    if (!org.taxRegime) {
      return res.status(400).json({
        ok: false,
        error: "Postavi režim oporezivanja na profilu organizacije",
      });
    }
    let osnovica;
    try {
      osnovica = getOsnovica(year, org.taxRegime, org.taxCategory || undefined);
    } catch (e) {
      return res.status(400).json({ ok: false, error: e?.message || "INVALID_TAX_SETUP" });
    }
    // Pro-rate: ako frontend pošalje grossBase manji od fiksne osnovice
    // (npr. vlasnik je prijavljen mid-month → pro-rated osnovica), koristi
    // tu vrijednost. Inače pun mjesec.
    const frontendOsnovica = Number(grossBase) || 0;
    if (frontendOsnovica > 0 && frontendOsnovica < osnovica) {
      osnovica = frontendOsnovica;
    }
    const snapshot = computeObrtnikSnapshot(osnovica);
    const payload = {
      organizationId,
      workerId,
      year,
      month,
      workedMinutes: null,
      standardMinutes: STANDARD_MONTHLY_MINUTES,
      sickDays: 0,
      overtimeHours: 0,
      nightHours: 0,
      sundayHours: 0,
      holidayHours: 0,
      bankAccount: worker.bankAccount || null,
      status: "OBRACUNATO",
      notes:
        typeof req.body?.notes === "string"
          ? req.body.notes
          : existing
            ? existing.notes
            : null,
      ...snapshot,
    };
    let savedV;
    if (existing) {
      await existing.update(payload);
      savedV = existing;
    } else {
      savedV = await Payroll.create(payload);
    }
    return res.json({ ok: true, data: toPublicPayroll(savedV) });
  }

  // Helper: vrati body vrijednost ako je definisana, inače existing, inače fallback
  const pick = (bodyVal, existingField, fallback) => {
    if (bodyVal !== undefined && bodyVal !== null && bodyVal !== "") return bodyVal;
    if (existing && existing[existingField] != null) return existing[existingField];
    return fallback;
  };

  const effectiveMeal = pick(mealAllowance, "mealAllowance", 0);
  const effectiveVacation = pick(vacationBonus, "vacationBonus", 0);
  const effectiveTravel = pick(travelExpense, "travelExpense", 0);

  // Minuli rad: stopa iz body-ja, fallback na worker default
  const effectiveMinuliRate =
    minuliRadRate !== undefined && minuliRadRate !== null && minuliRadRate !== ""
      ? Number(minuliRadRate)
      : Number(existing?.minuliRadRate ?? worker.minuliRadRate ?? 0.4);
  // Datum isplate iz body-ja ili zadnji dan mjeseca obračuna
  const effectivePaymentDate =
    typeof paymentDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(paymentDate)
      ? paymentDate
      : new Date(year, month, 0).toISOString().slice(0, 10);
  const minuliYears = totalYearsOfService(worker, effectivePaymentDate);

  // grossBase: ako frontend pošalje, koristi ga; inače gross (backward-compat).
  const effectiveGrossBase =
    grossBase !== undefined && grossBase !== null && grossBase !== ""
      ? Number(grossBase)
      : Number(gross || existing?.grossBase || existing?.gross || 0);

  // Stope uvećanja: body > existing payroll > worker default > legal default
  const pickRate = (bodyVal, existingKey, workerKey, def) => {
    if (bodyVal !== undefined && bodyVal !== null && bodyVal !== "") return Number(bodyVal);
    if (existing && existing[existingKey] != null) return Number(existing[existingKey]);
    if (worker && worker[workerKey] != null) return Number(worker[workerKey]);
    return def;
  };
  const effOvertimeRate = pickRate(overtimeRate, "overtimeRate", "overtimeRate", 25.0);
  const effNightRate = pickRate(nightRate, "nightRate", "nightRate", 25.0);
  const effSundayRate = pickRate(sundayRate, "sundayRate", "sundayRate", 20.0);
  const effHolidayRate = pickRate(holidayRate, "holidayRate", "holidayRate", 50.0);

  const effOvertimeHours = Number(pick(overtimeHours, "overtimeHours", 0)) || 0;
  const effNightHours = Number(pick(nightHours, "nightHours", 0)) || 0;
  const effSundayHours = Number(pick(sundayHours, "sundayHours", 0)) || 0;
  const effHolidayHours = Number(pick(holidayHours, "holidayHours", 0)) || 0;

  const snapshot = computePayrollSnapshot({
    grossBase: effectiveGrossBase,
    minuliRadRate: effectiveMinuliRate,
    minuliRadYears: minuliYears,
    overtimeHours: effOvertimeHours,
    nightHours: effNightHours,
    sundayHours: effSundayHours,
    holidayHours: effHolidayHours,
    overtimeRate: effOvertimeRate,
    nightRate: effNightRate,
    sundayRate: effSundayRate,
    holidayRate: effHolidayRate,
    taxCoefficient: taxCoefficient ?? (existing ? existing.taxCoefficient : worker.taxCoefficient) ?? 1.0,
    contractedHours: worker.contractedHours ?? 8,
    mealAllowance: effectiveMeal,
    vacationBonus: effectiveVacation,
    travelExpense: effectiveTravel,
  });

  // workedMinutes: explicitly null OK; undefined = preserve existing
  const effectiveWorkedMinutes =
    workedMinutes !== undefined
      ? (Number(workedMinutes) > 0 ? Number(workedMinutes) : null)
      : (existing ? existing.workedMinutes : null);

  const payload = {
    organizationId,
    workerId,
    year,
    month,
    workedMinutes: effectiveWorkedMinutes,
    standardMinutes:
      Number(standardMinutes) ||
      (existing ? existing.standardMinutes : null) ||
      STANDARD_MONTHLY_MINUTES,
    sickDays: Number(pick(sickDays, "sickDays", 0)) || 0,
    vacationDays: Number(pick(vacationDays, "vacationDays", 0)) || 0,
    overtimeHours: effOvertimeHours,
    nightHours: effNightHours,
    sundayHours: effSundayHours,
    holidayHours: effHolidayHours,
    bankAccount: worker.bankAccount || null,
    // Status: ako gross > 0 → OBRACUNATO (puni obračun), inače DRAFT (samo
    // sačuvani dodaci/sati prije konačnog obračuna).
    status: snapshot.gross > 0 ? "OBRACUNATO" : "DRAFT",
    notes:
      typeof notes === "string"
        ? notes
        : existing
          ? existing.notes
          : null,
    ...snapshot,
  };

  let saved;
  if (existing) {
    await existing.update(payload);
    saved = existing;
  } else {
    saved = await Payroll.create(payload);
  }

  // Sticky defaults: stope i naknade koje korisnik upiše u obračunu postaju
  // default na workeru, tako da se sljedeći mjesec automatski popunjavaju.
  // Regres se NE pamti (resetuje se svaki put).
  //
  // VAŽNO: taxCoefficient se NE upisuje natrag u worker.taxCoefficient —
  // worker profil je MASTER source. Ako se za jedan mjesec ručno mijenja
  // koeficijent (npr. povratak na rad nakon porodiljskog), ta vrijednost
  // ostaje samo u Payroll.taxCoefficient za taj mjesec. Master vrijednost
  // se mijenja preko Profila / Aktivnih radnika.
  await worker.update({
    minuliRadRate: effectiveMinuliRate,
    overtimeRate: effOvertimeRate,
    nightRate: effNightRate,
    sundayRate: effSundayRate,
    holidayRate: effHolidayRate,
    defaultMealAllowance: Number(effectiveMeal) || 0,
    defaultTravelExpense: Number(effectiveTravel) || 0,
  });

  return res.json({ ok: true, data: toPublicPayroll(saved) });
}

// ── POST /api/payroll/save-inputs ──────────────────────────────────────────
// Sprema samo input polja (workedMinutes, sickDays, sati uvećanja, dodaci)
// bez pokretanja punog obračuna. Ako payroll ne postoji, kreira sa status=DRAFT
// i nula computed vrijednostima. Ako postoji, čuva existing computed fields.
// Koristi se kad korisnik zatvori obracun bez eksplicitnog klika "Obračunaj".
async function saveInputs(req, res) {
  try {
    const {
      organizationId: rawOrgId,
      workerId: rawWorkerId,
      year: rawYear,
      month: rawMonth,
      workedMinutes,
      sickDays,
      vacationDays,
      overtimeHours,
      nightHours,
      sundayHours,
      holidayHours,
      overtimeRate,
      nightRate,
      sundayRate,
      holidayRate,
      mealAllowance,
      vacationBonus,
      travelExpense,
      taxCoefficient,
      minuliRadRate,
    } = req.body ?? {};

    const organizationId = parseId(rawOrgId);
    const workerId = parseId(rawWorkerId);
    const year = parseId(rawYear);
    const month = parseId(rawMonth);
    if (!organizationId || !workerId || !year || !month) {
      return res.status(400).json({ ok: false, error: "Missing parameters" });
    }

    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const worker = await Worker.findOne({
      where: { id: workerId, organizationId },
    });
    if (!worker) return res.status(404).json({ ok: false, error: "Worker not found" });

    const existing = await Payroll.findOne({
      where: { workerId, year, month },
    });

    // Helper: vrati body vrijednost ako je definisana, inače existing, inače fallback
    const pick = (bodyVal, existingField, fallback) => {
      if (bodyVal !== undefined && bodyVal !== null && bodyVal !== "") return bodyVal;
      if (existing && existing[existingField] != null) return existing[existingField];
      return fallback;
    };

    const update = {
      // Input polja koje korisnik mijenja u modalu
      workedMinutes:
        workedMinutes !== undefined
          ? Number(workedMinutes) > 0
            ? Number(workedMinutes)
            : null
          : existing
            ? existing.workedMinutes
            : null,
      sickDays: Number(pick(sickDays, "sickDays", 0)) || 0,
      vacationDays: Number(pick(vacationDays, "vacationDays", 0)) || 0,
      overtimeHours: Number(pick(overtimeHours, "overtimeHours", 0)) || 0,
      nightHours: Number(pick(nightHours, "nightHours", 0)) || 0,
      sundayHours: Number(pick(sundayHours, "sundayHours", 0)) || 0,
      holidayHours: Number(pick(holidayHours, "holidayHours", 0)) || 0,
      mealAllowance: Number(pick(mealAllowance, "mealAllowance", 0)) || 0,
      vacationBonus: Number(pick(vacationBonus, "vacationBonus", 0)) || 0,
      travelExpense: Number(pick(travelExpense, "travelExpense", 0)) || 0,
      taxCoefficient:
        Number(pick(taxCoefficient, "taxCoefficient", worker.taxCoefficient ?? 1.0)) || 1.0,
      minuliRadRate: Number(
        pick(minuliRadRate, "minuliRadRate", worker.minuliRadRate ?? 0.4),
      ),
      overtimeRate: Number(
        pick(overtimeRate, "overtimeRate", worker.overtimeRate ?? 25.0),
      ),
      nightRate: Number(
        pick(nightRate, "nightRate", worker.nightRate ?? 25.0),
      ),
      sundayRate: Number(
        pick(sundayRate, "sundayRate", worker.sundayRate ?? 20.0),
      ),
      holidayRate: Number(
        pick(holidayRate, "holidayRate", worker.holidayRate ?? 50.0),
      ),
    };

    // Sticky defaults: stope i naknade se pamte na worker-u za sljedeći mjesec.
    // Regres se NE pamti. taxCoefficient se NE upisuje natrag — worker profil
    // je master, vidi calculate() iznad.
    await worker.update({
      minuliRadRate: update.minuliRadRate,
      overtimeRate: update.overtimeRate,
      nightRate: update.nightRate,
      sundayRate: update.sundayRate,
      holidayRate: update.holidayRate,
      defaultMealAllowance: Number(update.mealAllowance) || 0,
      defaultTravelExpense: Number(update.travelExpense) || 0,
    });

    if (existing) {
      // Sačuvaj samo input polja, NE diraj computed (gross, empPio, net itd.)
      await existing.update(update);
      return res.json({ ok: true, data: toPublicPayroll(existing) });
    }

    // Novi payroll: kreiraj sa nula computed vrijednostima i status=DRAFT
    const created = await Payroll.create({
      organizationId,
      workerId,
      year,
      month,
      ...update,
      standardMinutes: STANDARD_MONTHLY_MINUTES,
      gross: 0,
      deduction: 0,
      minBaseApplied: false,
      empPio: 0,
      empZdravstvo: 0,
      empNezaposlenost: 0,
      empTotal: 0,
      taxBase: 0,
      incomeTax: 0,
      net: 0,
      erpPio: 0,
      erpZdravstvo: 0,
      erpNezaposlenost: 0,
      erpTotal: 0,
      vodnaNaknada: 0,
      naknadaNesrece: 0,
      totalCost:
        update.mealAllowance + update.vacationBonus + update.travelExpense,
      bankAccount: worker.bankAccount || null,
      status: "DRAFT",
      notes: null,
    });
    return res.json({ ok: true, data: toPublicPayroll(created) });
  } catch (e) {
    console.error("saveInputs failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "INTERNAL_ERROR" });
  }
}

// ── PATCH /api/payroll/:id ─────────────────────────────────────────────────
// Override pojedinačnih polja (gross, koef, dodaci, sati...) + ponovni izračun.
async function patch(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

  const payroll = await Payroll.findByPk(id);
  if (!payroll) return res.status(404).json({ ok: false, error: "Payroll not found" });

  const org = await assertOrgAccess(payroll.organizationId, req.user.id);
  if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const body = req.body ?? {};
  const newGross = body.gross !== undefined ? Number(body.gross) : Number(payroll.gross);
  const newCoeff =
    body.taxCoefficient !== undefined
      ? Number(body.taxCoefficient)
      : Number(payroll.taxCoefficient);

  const snapshot = computePayrollSnapshot({
    gross: newGross,
    taxCoefficient: newCoeff,
    mealAllowance: body.mealAllowance !== undefined ? body.mealAllowance : payroll.mealAllowance,
    vacationBonus: body.vacationBonus !== undefined ? body.vacationBonus : payroll.vacationBonus,
    travelExpense: body.travelExpense !== undefined ? body.travelExpense : payroll.travelExpense,
  });

  const update = {
    ...snapshot,
  };
  if (body.workedMinutes !== undefined) update.workedMinutes = Number(body.workedMinutes) || null;
  if (body.standardMinutes !== undefined) update.standardMinutes = Number(body.standardMinutes) || null;
  if (body.sickDays !== undefined) update.sickDays = Number(body.sickDays) || 0;
  if (body.vacationDays !== undefined) update.vacationDays = Number(body.vacationDays) || 0;
  if (body.overtimeHours !== undefined) update.overtimeHours = Number(body.overtimeHours) || 0;
  if (body.nightHours !== undefined) update.nightHours = Number(body.nightHours) || 0;
  if (body.sundayHours !== undefined) update.sundayHours = Number(body.sundayHours) || 0;
  if (body.holidayHours !== undefined) update.holidayHours = Number(body.holidayHours) || 0;
  if (body.status !== undefined) {
    if (!["DRAFT", "OBRACUNATO", "ISPLACENO"].includes(body.status)) {
      return res.status(400).json({ ok: false, error: "Invalid status" });
    }
    update.status = body.status;
  }
  if (body.notes !== undefined) update.notes = typeof body.notes === "string" ? body.notes : null;

  await payroll.update(update);
  return res.json({ ok: true, data: toPublicPayroll(payroll) });
}

// ── DELETE /api/payroll/:id ────────────────────────────────────────────────
async function remove(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

  const payroll = await Payroll.findByPk(id);
  if (!payroll) return res.status(200).json({ ok: true, data: null });

  const org = await assertOrgAccess(payroll.organizationId, req.user.id);
  if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  await payroll.destroy();
  return res.json({ ok: true, data: null });
}

// ── POST /api/payroll/:id/uplatnice ─────────────────────────────────────────
// Generiše svih 8 PDF uplatnica iz Payroll snapshot-a, sprema na disk i kreira
// PayrollDocument zapise. Briše ranije generisane uplatnice za ovaj payroll
// (regeneriranje uvijek prepravlja).
async function generateUplatniceForPayroll(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

    const payroll = await Payroll.findByPk(id);
    if (!payroll) return res.status(404).json({ ok: false, error: "Payroll not found" });

    const org = await assertOrgAccess(payroll.organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const worker = await Worker.findOne({
      where: { id: payroll.workerId, organizationId: payroll.organizationId },
    });
    if (!worker) return res.status(404).json({ ok: false, error: "Worker not found" });

    // Dekriptuj JMBG za uplatnice
    const workerPlain = worker.toJSON ? worker.toJSON() : worker;
    if (workerPlain.jmbg) {
      try {
        workerPlain.jmbg = decryptJmbg(workerPlain.jmbg);
      } catch {
        workerPlain.jmbg = "";
      }
    }

    // Obriši stare uplatnice za ovaj payroll
    const existing = await PayrollDocument.findAll({ where: { payrollId: id } });
    for (const doc of existing) {
      safeUnlink(path.join(UPLOADS_ROOT, DOCS_SUBDIR, doc.filename));
    }
    await PayrollDocument.destroy({ where: { payrollId: id } });

    // Generiši PDF-ove
    const pdfs = await generateAllUplatnice(payroll.toJSON(), org.toJSON(), workerPlain);

    // Spremi na disk + DB
    const dir = path.join(UPLOADS_ROOT, DOCS_SUBDIR);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const docs = [];
    for (const p of pdfs) {
      const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      const diskName = `${stamp}.pdf`;
      const fullPath = path.join(dir, diskName);
      fs.writeFileSync(fullPath, p.bytes);

      const doc = await PayrollDocument.create({
        payrollId: id,
        type: p.type,
        filename: diskName,
        originalName: p.filename,
        mimeType: p.mimeType,
        sizeBytes: p.bytes.length,
      });
      docs.push(doc.toJSON());
    }

    return res.json({ ok: true, data: docs });
  } catch (e) {
    console.error("uplatnice generation failed:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "UPLATNICE_GENERATION_FAILED",
    });
  }
}

// ── GET /api/payroll/:id/documents ──────────────────────────────────────────
async function listDocuments(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

  const payroll = await Payroll.findByPk(id);
  if (!payroll) return res.status(404).json({ ok: false, error: "Payroll not found" });

  const org = await assertOrgAccess(payroll.organizationId, req.user.id);
  if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const docs = await PayrollDocument.findAll({
    where: { payrollId: id },
    order: [["id", "ASC"]],
  });
  return res.json({ ok: true, data: docs.map((d) => d.toJSON()) });
}

// ── GET /api/payroll-documents/:docId/download ──────────────────────────────
async function downloadDocument(req, res) {
  const docId = parseId(req.params.docId);
  if (!docId) return res.status(400).json({ ok: false, error: "Invalid docId" });

  const doc = await PayrollDocument.findByPk(docId);
  if (!doc) return res.status(404).json({ ok: false, error: "Document not found" });

  const payroll = await Payroll.findByPk(doc.payrollId);
  if (!payroll) return res.status(404).json({ ok: false, error: "Payroll not found" });

  const org = await assertOrgAccess(payroll.organizationId, req.user.id);
  if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const fullPath = path.join(UPLOADS_ROOT, DOCS_SUBDIR, doc.filename);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ ok: false, error: "FILE_MISSING" });
  }

  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
  );
  fs.createReadStream(fullPath).pipe(res);
}

// ── DELETE /api/payroll-documents/:docId ────────────────────────────────────
async function deleteDocument(req, res) {
  const docId = parseId(req.params.docId);
  if (!docId) return res.status(400).json({ ok: false, error: "Invalid docId" });

  const doc = await PayrollDocument.findByPk(docId);
  if (!doc) return res.status(200).json({ ok: true, data: null });

  const payroll = await Payroll.findByPk(doc.payrollId);
  if (!payroll) return res.status(404).json({ ok: false, error: "Payroll not found" });

  const org = await assertOrgAccess(payroll.organizationId, req.user.id);
  if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  safeUnlink(path.join(UPLOADS_ROOT, DOCS_SUBDIR, doc.filename));
  await doc.destroy();
  return res.json({ ok: true, data: null });
}

// ── GET /api/payroll/monthly-summary?organizationId=X&year=Y&month=M ────────
// Mjesečni agregat: zbira sve payroll snapshot-e za organizaciju + mjesec
// i grupiše doprinose/poreze sa pripadajućim računima primalaca i vrstama prihoda.
async function monthlySummary(req, res) {
  try {
    const organizationId = parseId(req.query.organizationId);
    const year = parseId(req.query.year);
    const month = parseId(req.query.month);
    if (!organizationId || !year || !month) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing organizationId/year/month" });
    }

    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    // Učitaj samo postojeće radnike — orphan payroll-i iz obrisanih radnika
    // se filtriraju, da ne pokvare zbirne uplatnice i pregled mjeseca.
    const existingWorkers = await Worker.findAll({
      where: { organizationId },
      attributes: ["id"],
    });
    const validWorkerIds = new Set(existingWorkers.map((w) => w.id));

    const rawPayrolls = await Payroll.findAll({
      where: { organizationId, year, month },
    });
    const payrolls = rawPayrolls.filter((p) => validWorkerIds.has(p.workerId));

    // Agregati po vrsti doprinosa
    let net = 0,
      gross = 0,
      empPio = 0,
      erpPio = 0,
      empZdr = 0,
      erpZdr = 0,
      empNezap = 0,
      erpNezap = 0,
      porez = 0,
      vodna = 0,
      nesrece = 0,
      meal = 0,
      vacation = 0,
      travel = 0,
      totalCost = 0;

    for (const p of payrolls) {
      net += Number(p.net) || 0;
      gross += Number(p.gross) || 0;
      empPio += Number(p.empPio) || 0;
      erpPio += Number(p.erpPio) || 0;
      empZdr += Number(p.empZdravstvo) || 0;
      erpZdr += Number(p.erpZdravstvo) || 0;
      empNezap += Number(p.empNezaposlenost) || 0;
      erpNezap += Number(p.erpNezaposlenost) || 0;
      porez += Number(p.incomeTax) || 0;
      vodna += Number(p.vodnaNaknada) || 0;
      nesrece += Number(p.naknadaNesrece) || 0;
      meal += Number(p.mealAllowance) || 0;
      vacation += Number(p.vacationBonus) || 0;
      travel += Number(p.travelExpense) || 0;
      totalCost += Number(p.totalCost) || 0;
    }

    const round = (n) => +Number(n).toFixed(2);

    // Invalidi (0,5% × bruto) — samo COMPANY (privredna društva), obrti
    // (BUSINESS) su izuzeti. Referencirano u totals.invalidi response.
    const invalidi =
      org.type === "BUSINESS" ? 0 : round(gross * FOND_INVALIDI_RATE);

    // Učitaj radnike (sa city poljem) za bucketing po opcini
    const workerIdsAll = payrolls.map((p) => p.workerId);
    const workersAll = await Worker.findAll({
      where: { id: workerIdsAll, organizationId },
    });
    const workerMapAll = new Map(workersAll.map((w) => [w.id, w]));

    // Agregacija po (kanton, opcina) radnika — vraća listu entry-ja za svaku
    // (vrsta, kanton, opcina) kombinaciju. Federalni i firma-kantonalni idu
    // u 1 entry sa opcinom firme.
    const orgPlain = org.toJSON();
    const bucketEntries = buildAllUplatnice(payrolls, workerMapAll, orgPlain, {
      fondInvalidiRate: FOND_INVALIDI_RATE,
    });

    // Map bucket entries u UI format (uplatnice array). Label uključuje općinu
    // za kantonalne vrste kada postoji više od jedne općine.
    const kantonalVrste = new Set(["zdrKanton", "nezapKanton", "porez"]);
    const kantonalLocCount = new Map(); // vrsta → broj različitih (kanton,opcina)
    for (const e of bucketEntries) {
      if (kantonalVrste.has(e.vrsta)) {
        kantonalLocCount.set(e.vrsta, (kantonalLocCount.get(e.vrsta) || 0) + 1);
      }
    }
    const uplatnice = bucketEntries.map((e) => {
      const acc = getAccountInfo(e.vrsta, e.kantonKey, orgPlain.payrollAccounts);
      let label = VRSTA_LABEL_MAP[e.vrsta] || e.vrsta;
      // Ako postoji više opcina za istu kantonalnu vrstu, dodaj općinu u label
      if (kantonalVrste.has(e.vrsta) && (kantonalLocCount.get(e.vrsta) || 0) > 1) {
        label += ` — ${e.opcinaIme}`;
      }
      // Group prefix: za obrt sa vlasnikom + radnicima razdvajamo
      if (e.group === "vlasnik") label = `Vlasnik — ${label}`;
      else if (e.group === "radnici") label = `Radnici — ${label}`;
      return {
        type: VRSTA_UPLATNICA_TYPE[e.vrsta],
        label,
        amount: e.amount,
        account: acc?.account || "",
        vrstaPrihoda: acc?.vrstaPrihoda || "",
        budgetOrg: acc?.budgetOrg || "",
        primalac: acc?.primalac || [],
        opcinaIme: e.opcinaIme,
        opcinaKod: e.opcinaKod,
        group: e.group || null,
      };
    }).filter((u) => u.amount > 0);

    // Per-worker: neto plata + neoporezivi dodaci (idu pojedinačno radnicima)
    const perWorker = payrolls.map((p) => {
      const w = workerMapAll.get(p.workerId);
      return {
        workerId: p.workerId,
        payrollId: p.id,
        workerName: w ? `${w.firstName} ${w.lastName}`.trim() : `#${p.workerId}`,
        bankAccount: w?.bankAccount || null,
        net: round(Number(p.net) || 0),
        mealAllowance: round(Number(p.mealAllowance) || 0),
        vacationBonus: round(Number(p.vacationBonus) || 0),
        travelExpense: round(Number(p.travelExpense) || 0),
        status: p.status,
      };
    });

    return res.json({
      ok: true,
      data: {
        organizationId,
        year,
        month,
        workerCount: payrolls.length,
        totals: {
          gross: round(gross),
          net: round(net),
          empContrib: round(empPio + empZdr + empNezap),
          erpContrib: round(erpPio + erpZdr + erpNezap),
          empPio: round(empPio),
          empZdr: round(empZdr),
          empNezap: round(empNezap),
          erpPio: round(erpPio),
          erpZdr: round(erpZdr),
          erpNezap: round(erpNezap),
          tax: round(porez),
          vodna: round(vodna),
          nesrece: round(nesrece),
          invalidi,
          meal: round(meal),
          vacation: round(vacation),
          travel: round(travel),
          totalCost: round(totalCost + invalidi),
        },
        uplatnice,
        perWorker,
      },
    });
  } catch (e) {
    console.error("monthlySummary failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "INTERNAL_ERROR" });
  }
}

// ── POST /api/payroll/monthly-uplatnice ─────────────────────────────────────
// Generiše ZBIRNE uplatnice za doprinose/poreze (jedan PDF po vrsti, ne po radniku).
// Vraća kao multipart-style array bytova (base64) — frontend trigeruje download.
async function generateMonthlyUplatnice(req, res) {
  try {
    const organizationId = parseId(req.query.organizationId);
    const year = parseId(req.query.year);
    const month = parseId(req.query.month);
    // Datum isplate plate (YYYY-MM-DD). Default: zadnji dan mjeseca obračuna.
    const paymentDateRaw = String(req.query.paymentDate || "").slice(0, 10);
    const paymentDate =
      /^\d{4}-\d{2}-\d{2}$/.test(paymentDateRaw)
        ? paymentDateRaw
        : new Date(year, month, 0).toISOString().slice(0, 10);

    if (!organizationId || !year || !month) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing organizationId/year/month" });
    }

    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    // Filtriraj orphan payroll-e (radnik obrisan ali payroll ostao)
    const existingWorkers = await Worker.findAll({
      where: { organizationId },
      attributes: ["id"],
    });
    const validWorkerIds = new Set(existingWorkers.map((w) => w.id));
    const rawPayrolls = await Payroll.findAll({
      where: { organizationId, year, month },
    });
    const payrolls = rawPayrolls.filter((p) => validWorkerIds.has(p.workerId));

    const round = (n) => +Number(n).toFixed(2);
    const orgPlain = org.toJSON();
    // Datum uplate na uplatnicama = datum isplate plate (ne današnji datum)
    const datum = paymentDate;
    const monthYear = `${String(month).padStart(2, "0")}/${year}`;

    // ── Per-worker iznosi (neto + dodaci) ───────────────────────────────────
    const workerIds = payrolls.map((p) => p.workerId);
    const workers = await Worker.findAll({
      where: { id: workerIds, organizationId },
    });
    const workerMap = new Map(workers.map((w) => [w.id, w]));

    // Agregacija po (kanton, opcina) radnika. Za obrt sa vlasnikom + radnicima
    // se uplatnice razdvajaju u dvije grupe.
    const bucketEntries = buildAllUplatnice(payrolls, workerMap, orgPlain, {
      fondInvalidiRate: FOND_INVALIDI_RATE,
    });

    // Da li imamo više različitih (kanton, opcina) lokacija za istu kantonalnu
    // vrstu? Ako da, dodajemo općinu u label radi razlikovanja.
    const kantonalVrste = new Set(["zdrKanton", "nezapKanton", "porez"]);
    const kantonalLocCount = new Map();
    for (const e of bucketEntries) {
      if (kantonalVrste.has(e.vrsta)) {
        kantonalLocCount.set(e.vrsta, (kantonalLocCount.get(e.vrsta) || 0) + 1);
      }
    }

    // ── Sastavi listu svih opts (jedan po stranici) ─────────────────────────
    const optsList = [];
    const pageLabels = [];

    const baseUplatio = [
      orgPlain.name || "",
      [orgPlain.address, orgPlain.city].filter(Boolean).join(", "),
    ];
    const baseShared = {
      uplatio: baseUplatio,
      racunPosilDigits: orgPlain.bankAccount
        ? orgPlain.bankAccount.replace(/-/g, "")
        : undefined,
      datum,
      periodMjesec: String(month).padStart(2, "0"),
      periodGodina: String(year),
    };

    // Generiši uplatnicu za svaki bucket entry. Kantonalne vrste imaju po jednu
    // uplatnicu po (kanton, opcina), federalni i firma-kantonalni 1 entry.
    for (const e of bucketEntries) {
      if (e.amount <= 0) continue;
      const acc = getAccountInfo(e.vrsta, e.kantonKey, orgPlain.payrollAccounts);
      if (!acc) continue;
      let label = VRSTA_LABEL_MAP[e.vrsta] || e.vrsta;
      if (kantonalVrste.has(e.vrsta) && (kantonalLocCount.get(e.vrsta) || 0) > 1) {
        label += ` — ${e.opcinaIme}`;
      }
      // Group prefix za obrt sa vlasnikom + radnicima
      const groupLabel =
        e.group === "vlasnik"
          ? "Vlasnik — "
          : e.group === "radnici"
            ? "Radnici — "
            : "";
      pageLabels.push(`${groupLabel}${label}`);
      optsList.push({
        ...baseShared,
        svrha: `${groupLabel}${VRSTA_SVRHA_MAP[e.vrsta] || label} za ${monthYear}`,
        primatelj: Array.isArray(acc.primalac) ? acc.primalac : [acc.primalac],
        racunPrimDigits: (acc.account || "").replace(/-/g, ""),
        kmIznos: e.amount,
        vrstaProhoda: acc.vrstaPrihoda || "",
        brojObveznika: (orgPlain.taxNumber || "").replace(/\D/g, ""),
        budgetOrg: acc.budgetOrg || "",
        opcinaKod: e.opcinaKod,
        opcinaIme: e.opcinaIme,
      });
    }

    // Per-worker — neto plata + dodaci (bez "javnih prihoda" sekcije)
    for (const p of payrolls) {
      const w = workerMap.get(p.workerId);
      if (!w) continue;
      const workerName = `${w.firstName} ${w.lastName}`.trim();
      const workerAddress = [w.address, w.city].filter(Boolean).join(", ");
      const workerRecipient = [workerName, workerAddress || ""];

      const personalItems = [
        ["Neto plata", Number(p.net) || 0, "Isplata neto plate"],
        ["Topli obrok", Number(p.mealAllowance) || 0, "Topli obrok (neoporezivi)"],
        ["Regres", Number(p.vacationBonus) || 0, "Regres za godišnji odmor"],
        ["Putni trošak", Number(p.travelExpense) || 0, "Putni trošak (neoporezivi)"],
      ];
      for (const [label, amount, svrha] of personalItems) {
        if (amount <= 0) continue;
        pageLabels.push(`${label} — ${workerName}`);
        optsList.push({
          ...baseShared,
          svrha: `${svrha} za ${monthYear} — ${workerName}`,
          primatelj: workerRecipient,
          racunPrimDigits: w.bankAccount ? w.bankAccount.replace(/-/g, "") : "",
          kmIznos: amount,
          opcinaIme: w.city || orgPlain.city || "",
          skipJavniPrihodi: true,
        });
      }
    }

    if (optsList.length === 0) {
      return res.status(404).json({ ok: false, error: "NO_UPLATNICE_TO_GENERATE" });
    }

    // Samo uplatnice (zbirne za doprinose/poreze + per-worker za neto/dodatke).
    // Platni listići se preuzimaju zasebno preko /monthly-payslips.
    const pdfBytes = await generateUplatniceCombined(optsList);

    const fname = `uplatnice-${year}-${String(month).padStart(2, "0")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
    );
    res.setHeader("X-Page-Count", String(optsList.length));
    return res.end(pdfBytes);
  } catch (e) {
    console.error("generateMonthlyUplatnice failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "INTERNAL_ERROR" });
  }
}

// ── POST /api/payroll/monthly-payslips ──────────────────────────────────────
// Kombinovani PDF sa platnim listićima za sve radnike za odabrani mjesec.
async function generateMonthlyPayslips(req, res) {
  try {
    const organizationId = parseId(req.query.organizationId);
    const year = parseId(req.query.year);
    const month = parseId(req.query.month);
    const paymentDateRaw = String(req.query.paymentDate || "").slice(0, 10);
    const paymentDate =
      /^\d{4}-\d{2}-\d{2}$/.test(paymentDateRaw)
        ? paymentDateRaw
        : new Date(year, month, 0).toISOString().slice(0, 10);

    if (!organizationId || !year || !month) {
      return res.status(400).json({ ok: false, error: "Missing parameters" });
    }
    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    // Filtriraj orphan payroll-e (radnik obrisan ali payroll ostao)
    const existingWorkers = await Worker.findAll({
      where: { organizationId },
      attributes: ["id"],
    });
    const validWorkerIds = new Set(existingWorkers.map((w) => w.id));
    const rawPayrolls = await Payroll.findAll({
      where: { organizationId, year, month },
      order: [["workerId", "ASC"]],
    });
    const payrolls = rawPayrolls.filter((p) => validWorkerIds.has(p.workerId));
    if (payrolls.length === 0) {
      return res.status(404).json({ ok: false, error: "NO_PAYROLLS" });
    }
    const workerIds = payrolls.map((p) => p.workerId);
    const workers = await Worker.findAll({
      where: { id: workerIds, organizationId },
    });
    const workerMap = new Map(workers.map((w) => [w.id, w]));

    const orgPlain = org.toJSON();
    const pdf = await PDFDocument.create();
    const fonts = await embedFonts(pdf);

    let pages = 0;
    for (const p of payrolls) {
      const w = workerMap.get(p.workerId);
      if (!w) continue;
      const workerPlain = w.toJSON ? w.toJSON() : w;
      if (workerPlain.jmbg) {
        try { workerPlain.jmbg = decryptJmbg(workerPlain.jmbg); }
        catch { workerPlain.jmbg = ""; }
      }
      addPayslipPage(pdf, p.toJSON(), orgPlain, workerPlain, paymentDate, fonts);
      pages++;
    }

    const pdfBytes = Buffer.from(await pdf.save());
    const fname = `platni-listici-${year}-${String(month).padStart(2, "0")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
    );
    res.setHeader("X-Page-Count", String(pages));
    return res.end(pdfBytes);
  } catch (e) {
    console.error("generateMonthlyPayslips failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "INTERNAL_ERROR" });
  }
}

// ── GET /api/payroll/:id/payslip ────────────────────────────────────────────
// Pojedinačni platni listić za jednog radnika (po payrollId).
async function generateWorkerPayslip(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

    const paymentDateRaw = String(req.query.paymentDate || "").slice(0, 10);

    const payroll = await Payroll.findByPk(id);
    if (!payroll) return res.status(404).json({ ok: false, error: "Payroll not found" });

    const org = await assertOrgAccess(payroll.organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const paymentDate =
      /^\d{4}-\d{2}-\d{2}$/.test(paymentDateRaw)
        ? paymentDateRaw
        : new Date(payroll.year, payroll.month, 0).toISOString().slice(0, 10);

    const worker = await Worker.findOne({
      where: { id: payroll.workerId, organizationId: payroll.organizationId },
    });
    if (!worker) return res.status(404).json({ ok: false, error: "Worker not found" });

    const workerPlain = worker.toJSON ? worker.toJSON() : worker;
    if (workerPlain.jmbg) {
      try { workerPlain.jmbg = decryptJmbg(workerPlain.jmbg); }
      catch { workerPlain.jmbg = ""; }
    }

    const pdf = await PDFDocument.create();
    const fonts = await embedFonts(pdf);
    addPayslipPage(pdf, payroll.toJSON(), org.toJSON(), workerPlain, paymentDate, fonts);
    const pdfBytes = Buffer.from(await pdf.save());

    const workerName = `${worker.firstName}_${worker.lastName}`.replace(/[^A-Za-z0-9_]/g, "_");
    const fname = `platni-listic-${workerName}-${payroll.year}-${String(payroll.month).padStart(2, "0")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
    );
    return res.end(pdfBytes);
  } catch (e) {
    console.error("generateWorkerPayslip failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "INTERNAL_ERROR" });
  }
}

// ── POST /api/payroll/mark-month-paid ───────────────────────────────────────
// Bulk označava sve obračune (OBRACUNATO) za organizationId+year+month kao
// ISPLACENO. Vraća broj ažuriranih zapisa.
async function markMonthPaid(req, res) {
  try {
    const organizationId = parseId(req.body?.organizationId ?? req.query.organizationId);
    const year = parseId(req.body?.year ?? req.query.year);
    const month = parseId(req.body?.month ?? req.query.month);
    if (!organizationId || !year || !month) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing organizationId/year/month" });
    }
    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    // Filtriraj samo postojeće radnike (orphan payroll-i se ignorišu)
    const existingWorkers = await Worker.findAll({
      where: { organizationId },
      attributes: ["id"],
    });
    const validWorkerIds = existingWorkers.map((w) => w.id);

    const [updatedCount] = await Payroll.update(
      { status: "ISPLACENO" },
      {
        where: {
          organizationId,
          year,
          month,
          status: "OBRACUNATO",
          workerId: validWorkerIds,
        },
      },
    );
    return res.json({ ok: true, data: { updated: updatedCount } });
  } catch (e) {
    console.error("markMonthPaid failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "INTERNAL_ERROR" });
  }
}

module.exports = {
  list,
  calculate,
  saveInputs,
  patch,
  remove,
  generateUplatniceForPayroll,
  listDocuments,
  downloadDocument,
  deleteDocument,
  monthlySummary,
  generateMonthlyUplatnice,
  markMonthPaid,
  generateMonthlyPayslips,
  generateWorkerPayslip,
  // exported for tests / future reuse
  computePayrollSnapshot,
  STANDARD_MONTHLY_MINUTES,
};
