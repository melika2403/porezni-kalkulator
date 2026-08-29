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
  User,
} = require("../models/index");
const {
  buildPostingOrder,
  resolveAccounts,
  DEFAULT_POSTING_ACCOUNTS,
  POSTING_ITEMS,
  BURDEN_DEBIT_ITEMS,
  PO_NOSIOCU_DEBIT_ORDER,
} = require("../utils/postingOrder");
const { generatePostingOrderPdf } = require("../utils/postingOrderPdf");
const {
  deductionFromCoefficient,
  TAX_RATE,
  ERP_PIO,
  ERP_ZDRAVSTVO,
  ERP_NEZAPOSLENOST,
  VODNA_NAKNADA,
  NAKNADA_NESRECE,
  computeMinContribBase,
  computeKorist,
  koristNetValueFromConfig,
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
//  KANTONALNE vrste (zdrKant 89,8%, nezapKant 70%) idu na račun kantona i
//  opcinu radnika → grupišu se po (workerKanton, workerOpcina). Uz agencijsku
//  opciju objedinjavanja grupišu se po kantonu (jedan nalog, opcina = sjedište).
//
//  POREZ na dohodak ide UVIJEK po (workerKanton, workerOpcina), i kad je
//  objedinjavanje uključeno: porez se raspoređuje općini prema prebivalištu
//  radnika, pa se ne smije svesti na opcinu sjedišta firme.
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
  // Agencijska opcija: kantonalne stavke (zdravstvo, nezaposlenost, porez)
  // objediniti po KANTONU u jedan nalog, sa šifrom opštine = sjedište firme.
  // Račun i dalje prati kanton radnika (npr. radnik iz ZDK → ZDK računi), ali
  // je šifra opštine sjedište. Federalne i firma-kantonalne stavke su ionako
  // već jedan nalog.
  const combineKantonal = !!opts.combineKantonal;

  // Firm kanton/opcina
  const firmInfo = kantonForOpcina(firm.city || "");
  const firmKantonKey = firmInfo?.kantonKey || null;
  const firmOpcinaKod = firmInfo?.opcinaKod || "";
  const firmOpcinaIme = firm.city || "";

  // Worker-based bucketi (zdrKant, nezapKant). Kad je objedinjavanje uključeno
  // grupišu se po kantonu, inače po (kanton, opština).
  const byLoc = new Map(); // key: "kanton:opcinaKod" → { kantonKey, opcinaKod, opcinaIme, zdrKant, nezapKant }
  // Porez na dohodak je UVIJEK po (kanton, opština radnika), nezavisno od
  // objedinjavanja. Razlog: porez se raspoređuje općini prema prebivalištu
  // radnika, pa šifra opštine na uplatnici određuje koji općinski budžet dobija
  // novac. Objedinjavanje (sjedište firme) bi pripisalo porez pogrešnoj općini.
  const porezByLoc = new Map(); // key: "kanton:opcinaKod" → { kantonKey, opcinaKod, opcinaIme, porez }
  // RS bucketi po opštini: kantonalni dio zdravstva/nezaposlenosti RS radnika
  // ide na Budžet RS umjesto na kanton FBiH. key: RS opcinaKod.
  const rsByOpcina = new Map(); // kod → { opcinaKod, opcinaIme, zdrRS, nezapRS }
  // Firm totals (federalni + kantonal firme)
  let pio = 0,
    zdrFed = 0,
    nezapFed = 0,
    vodna = 0,
    nesrece = 0,
    gross = 0;

  for (const p of payrolls) {
    const w = workerMap.get(p.workerId);
    const isRS = w?.prebivalisteEntitet === "RS";
    // Worker location — fallback na firmu ako nema worker.city ili je opcina nepoznata
    // (npr. RS radnik: porez ide po opštini firme, ne po RS gradu).
    let wInfo = kantonForOpcina(w?.city || "");
    const usedFirmFallback = !wInfo;
    if (!wInfo) wInfo = firmInfo;
    const kantonKey = wInfo?.kantonKey || firmKantonKey;
    const opcinaKod = wInfo?.opcinaKod || firmOpcinaKod;
    // Naziv mora pratiti šifru: kad padne na firmu, koristi firmin naziv
    // (inače bi porez uplatnica imala RS grad kao label uz firminu šifru).
    const opcinaIme = usedFirmFallback
      ? firmOpcinaIme
      : w?.city || firmOpcinaIme;
    // Doprinosi: objedinjeno → grupiši po KANTONU (jedan nalog), šifra opštine =
    // sjedište. Inače po (kanton, opština) radnika.
    const locKey = combineKantonal
      ? kantonKey || ""
      : `${kantonKey || ""}:${opcinaKod || ""}`;

    if (!byLoc.has(locKey)) {
      byLoc.set(locKey, {
        kantonKey,
        opcinaKod: combineKantonal ? firmOpcinaKod : opcinaKod,
        opcinaIme: combineKantonal ? firmOpcinaIme : opcinaIme,
        zdrKant: 0,
        nezapKant: 0,
      });
    }
    const bucket = byLoc.get(locKey);

    // Porez: uvijek po (kanton, opština radnika), bez objedinjavanja.
    const porezKey = `${kantonKey || ""}:${opcinaKod || ""}`;
    if (!porezByLoc.has(porezKey)) {
      porezByLoc.set(porezKey, {
        kantonKey,
        opcinaKod,
        opcinaIme,
        porez: 0,
      });
    }
    const porezBucket = porezByLoc.get(porezKey);

    const zdrTotal = (Number(p.empZdravstvo) || 0) + (Number(p.erpZdravstvo) || 0);
    const nezapTotal = (Number(p.empNezaposlenost) || 0) + (Number(p.erpNezaposlenost) || 0);

    // Vlasnik obrta plaća samo svoje doprinose (po izabranoj stopi), NEMA porez
    // na dohodak kroz obračun (porez ide godišnje na dobit). Ovo je zaštita: čak
    // i da je u starom zapisu zaostao incomeTax, ne pravi se uplatnica za porez.
    const isObrtOwner = firm.type === "BUSINESS" && w?.role === "VLASNIK";

    const zdrKantDio = zdrTotal * 0.898;
    const nezapKantDio = nezapTotal * 0.7;

    if (isRS) {
      // RS radnik: kantonalni dio (89,8% zdr + 70% nezap) ide na Budžet RS,
      // grupisano po RS opštini radnika. Federalni dio, PIO i porez idu u
      // FBiH normalno (ispod), zajedno sa ostalim radnicima.
      const rsKod = w?.opcinaKod || "";
      if (!rsByOpcina.has(rsKod)) {
        rsByOpcina.set(rsKod, {
          opcinaKod: rsKod,
          opcinaIme: RS_OPCINA_NAZIV.get(rsKod) || w?.city || "",
          zdrRS: 0,
          nezapRS: 0,
        });
      }
      const rb = rsByOpcina.get(rsKod);
      rb.zdrRS += zdrKantDio;
      rb.nezapRS += nezapKantDio;
    } else {
      // FBiH radnik: kantonalni dio ide na kanton (po opštini)
      bucket.zdrKant += zdrKantDio;
      bucket.nezapKant += nezapKantDio;
    }
    if (!isObrtOwner) porezBucket.porez += Number(p.incomeTax) || 0;

    // Firm totals: federalni dio i PIO idu za SVE radnike (uklj. RS) u FBiH
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

  // Porez na dohodak: uvijek po (kanton, opština radnika), i kad je objedinjavanje
  // uključeno. Jedna uplatnica po općini radnika.
  const sortedPorezLocs = Array.from(porezByLoc.values()).sort((a, b) => {
    if (a.kantonKey !== b.kantonKey) return String(a.kantonKey).localeCompare(String(b.kantonKey));
    return String(a.opcinaIme).localeCompare(String(b.opcinaIme), "bs");
  });
  for (const loc of sortedPorezLocs) {
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

  // RS uplatnice: kantonalni dio zdravstva i nezaposlenosti RS radnika na
  // Budžet RS, po RS opštini (u praksi jedna opština = 2 uplatnice za sve
  // RS radnike). Ako nema RS radnika, rsByOpcina je prazna i nema RS dijela.
  const rsLocs = Array.from(rsByOpcina.values()).sort((a, b) =>
    String(a.opcinaKod).localeCompare(String(b.opcinaKod)),
  );
  for (const rs of rsLocs) {
    if (rs.zdrRS > 0)
      entries.push({
        vrsta: "zdrRS",
        amount: round(rs.zdrRS),
        kantonKey: null,
        opcinaKod: rs.opcinaKod,
        opcinaIme: rs.opcinaIme,
        source: "rs",
        group: groupTag,
      });
  }
  for (const rs of rsLocs) {
    if (rs.nezapRS > 0)
      entries.push({
        vrsta: "nezapRS",
        amount: round(rs.nezapRS),
        kantonKey: null,
        opcinaKod: rs.opcinaKod,
        opcinaIme: rs.opcinaIme,
        source: "rs",
        group: groupTag,
      });
  }

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

// Budžet RS: za radnike sa prebivalištem u RS, kantonalni dio zdravstva (89,8%)
// i nezaposlenosti (70%) ne ide na kanton FBiH nego na Budžet Republike Srpske.
// Vrste prihoda i budžetska organizacija su fiksni (Poreska uprava RS).
const RS_BUDGET_ACCOUNT = "5620990000055687";
const RS_BUDGET_ORG = "9999999";
const RS_PRIMALAC = ["Budžet Republike Srpske"];
const RS_ACCOUNTS = {
  zdrRS: {
    account: RS_BUDGET_ACCOUNT,
    vrstaPrihoda: "712149",
    budgetOrg: RS_BUDGET_ORG,
    primalac: RS_PRIMALAC,
  },
  nezapRS: {
    account: RS_BUDGET_ACCOUNT,
    vrstaPrihoda: "712113",
    budgetOrg: RS_BUDGET_ORG,
    primalac: RS_PRIMALAC,
  },
};

// Mapa šifra opštine RS -> naziv (za labele uplatnica).
const RS_OPCINA_NAZIV = new Map(
  require("../data/rsOpcine.json").opcine.map((o) => [o.kod, o.naziv]),
);

// Helper: dohvati account/vrstaPrihoda/budgetOrg/primalac za datu vrsta + kanton
function getAccountInfo(vrsta, kantonKey, payrollAccounts) {
  // RS vrste imaju fiksan Budžet RS račun, ne zavise od kantona/override-a.
  if (RS_ACCOUNTS[vrsta]) return RS_ACCOUNTS[vrsta];
  const { buildDefaults, mergePayrollAccounts } = require("../utils/payrollUplatnice");
  const defaults = buildDefaults(kantonKey);
  const merged = mergePayrollAccounts(defaults, payrollAccounts);
  return merged[vrsta];
}

// Stabilan redoslijed labela u Pregledu mjeseca / Zbirne uplatnice
const VRSTA_LABEL_MAP = {
  pio: "PIO/MIO doprinos",
  zdrKanton: "Zdravstvo, kantonalni (89,8%)",
  zdrFed: "Zdravstvo, federalni (10,2%)",
  nezapKanton: "Nezaposlenost, kantonalni (70%)",
  nezapFed: "Nezaposlenost, federalni (30%)",
  porez: "Porez na dohodak",
  vodna: "Opća vodna naknada",
  nesrece: "Zaštita od prirodnih nesreća",
  fondInvalidi: "Fond za rehabilitaciju OSI (0,5%)",
  zdrRS: "Zdravstvo, Budžet RS (89,8%)",
  nezapRS: "Nezaposlenost, Budžet RS (70%)",
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
  zdrRS: "UPLATNICA_ZDR_RS",
  nezapRS: "UPLATNICA_NEZAP_RS",
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
  zdrRS: "Doprinos za zdravstvo (Budžet RS)",
  nezapRS: "Doprinos za nezaposlenost (Budžet RS)",
};
const { addPayslipPage, embedFonts, embedMemorandum } = require("../utils/payslipPdf");
const { absPathFor } = require("../utils/uploads");

// Memorandum organizacije (slika zaglavlja platne liste): pročitaj fajl sa
// diska. Bilo koja greška = null, listić tada nosi standardno zaglavlje.
function ucitajMemorandum(org) {
  try {
    const url = org?.memorandumUrl;
    if (!url) return null;
    const p = absPathFor(url);
    if (!p || !fs.existsSync(p)) return null;
    const bytes = fs.readFileSync(p);
    // Tip se određuje po SADRŽAJU, ne po ekstenziji: browser tip fajla izvodi
    // iz imena, pa PNG nazvan .jpg prođe filter i onda embedJpg pukne, a
    // memorandum tiho nestane sa listića.
    const jePng =
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const jeJpg =
      bytes.length > 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    if (!jePng && !jeJpg) return null;
    return { bytes, tip: jePng ? "png" : "jpg" };
  } catch {
    return null;
  }
}
const { PDFDocument } = require("pdf-lib");
const { decryptJmbg } = require("../utils/encryptJmbg");
const { UPLOADS_ROOT, safeUnlink } = require("../utils/uploads");
const {
  getOsnovica,
  OBRTNIK_PIO,
  OBRTNIK_ZDR,
  OBRTNIK_NEZAP,
} = require("../utils/obrtniciFbih");

const DOCS_SUBDIR = "payroll-documents";

// Standardni mjesečni fond minuta = 174h * 60 = 10440 (orijentaciono, FBiH).
const STANDARD_MONTHLY_MINUTES = 174 * 60;

// Stope doprinosa vlasnika obrta (0.195/0.145/0.02) dolaze iz obrtniciFbih.js.

// Računa snapshot doprinosa za vlasnika obrta. Osnovica je fiksna iz tabele
// (obrtniciFbih.js) zavisno od režima oporezivanja i kategorije djelatnosti.
// Pro-rate factor (0..1) se primjenjuje za mid-month prijavu/odjavu.
function computeObrtnikSnapshot(osnovica, proRateFactor = 1) {
  const factor = Math.max(0, Math.min(Number(proRateFactor) || 1, 1));
  const o = (Number(osnovica) || 0) * factor;
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
    // gross = stvarna bruto osnovica za TAJ mjesec (sa pro-rate).
    // grossBase = puna osnovica iz Sl. novina (bez pro-rate-a) — služi za
    // audit/MIP-1023 da se vidi nominalna ugovorena osnovica.
    gross: o,
    grossBase: +(Number(osnovica) || 0).toFixed(2),
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

// Agencijska opcija: objedini kantonalne uplatnice po kantonu (vidi User model).
async function getCombineKantonal(userId) {
  const u = await User.findByPk(userId, {
    attributes: ["combineKantonalUplatnice"],
  });
  return !!u?.combineKantonalUplatnice;
}

// Iznos koji radnik stvarno prima: neto + neoporezivi dodaci - obustave,
// nikad ispod nule. Isti broj koji stoji na dnu platnog listića, pa email i
// dokument ne pokazuju dvije različite cifre.
function iznosZaIsplatu(p) {
  const osnova =
    (Number(p.net) || 0) +
    (Number(p.mealAllowance) || 0) +
    (Number(p.vacationBonus) || 0) +
    (Number(p.travelExpense) || 0);
  return Math.max(0, +(osnova - Math.max(0, Number(p.obustave) || 0)).toFixed(2));
}

// Naziv dokumenta platnog listića (postavka profila): "PLATNA_LISTA" ili
// null (= default "PLATNI LISTIĆ"). Vrijedi za sve org-e korisnika.
async function getPayslipNaziv(userId) {
  const u = await User.findByPk(userId, { attributes: ["payslipNaziv"] });
  return u?.payslipNaziv === "PLATNA_LISTA" ? "PLATNA_LISTA" : null;
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
    "koristNetValue",
    "koristBruto",
    "mealAllowance",
    "vacationBonus",
    "travelExpense",
    "obustave",
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
  if (plain.paymentDate) {
    plain.paymentDate = String(plain.paymentDate).slice(0, 10);
  }
  plain.obustaveStavke = normalizujObustaveStavke(plain.obustaveStavke);
  return plain;
}

// Prenos obustave u naredne mjesece (sticky, kao topli obrok): ručno unesena
// obustava u obračunu se upiše na karton radnika kao trajna obustava, pa se
// idući mjesec sama predloži označena. NE dira ručno održavan karton: mijenja
// samo prazan karton ili jedinu aktivnu stavku koju je ovaj tok ranije
// kreirao (prepoznaje se po generičkom nazivu). Vraća novu listu za upis,
// null za brisanje, ili undefined kad karton ne treba dirati.
const OBUSTAVA_AUTO_NAZIV = "Obustava na platu";

// Sticky se smije pisati SAMO iz najnovijeg mjeseca radnika. Ponovni obračun
// ranijeg mjeseca (npr. ispravka jula u septembru ili "Obračunaj sve" preko
// starih mjeseci) nosi iznos koji NIJE trenutno stanje: bez ove provjere bi
// nula iz starog obračuna obrisala aktivnu obustavu sa kartona.
async function postojiNovijiObracun(workerId, year, month) {
  const noviji = await Payroll.findOne({
    where: {
      workerId,
      [Op.or]: [{ year: { [Op.gt]: year } }, { year, month: { [Op.gt]: month } }],
    },
    attributes: ["id"],
  });
  return !!noviji;
}
function obustaveKartonaSticky(workerObustave, iznos) {
  let lista = workerObustave;
  if (typeof lista === "string") {
    try {
      lista = JSON.parse(lista);
    } catch {
      lista = null;
    }
  }
  if (!Array.isArray(lista)) lista = [];
  const iznosR = +(Number(iznos) || 0).toFixed(2);
  // Naša stavka se prepoznaje po nazivu, BEZ obzira na aktivnost: ranije je
  // neaktivna istoimena stavka propuštala kreiranje nove i gomilala duplikate.
  const jeAuto = (o) => o && o.naziv === OBUSTAVA_AUTO_NAZIV;
  const aktivneRucne = lista.filter(
    (o) => o && o.aktivna !== false && Number(o.iznos) > 0 && !jeAuto(o),
  );
  // Ručno vođen karton se NIKAD ne dira: izmjena u obračunu vrijedi samo za
  // taj mjesec, a stavke sa svojim nazivima ostaju kakve ih je korisnik unio.
  if (aktivneRucne.length > 0) return undefined;

  const autoStavke = lista.filter(jeAuto);
  const ostale = lista.filter((o) => !jeAuto(o));

  if (iznosR > 0) {
    const prva = autoStavke[0];
    const vecOdgovara =
      autoStavke.length === 1 &&
      prva.aktivna !== false &&
      Math.abs(Number(prva.iznos) - iznosR) <= 0.005;
    if (vecOdgovara) return undefined;
    // Uvijek ostaje TAČNO jedna naša stavka (eventualni stari duplikati se
    // sažimaju), na kraju liste da redoslijed korisnikovih stavki ostane.
    return [...ostale, { naziv: OBUSTAVA_AUTO_NAZIV, iznos: iznosR, aktivna: true }];
  }

  // Iznos 0 (korisnik skinuo obustavu): ukloni našu stavku, tuđe ostavi.
  if (autoStavke.length === 0) return undefined;
  return ostale.length ? ostale : null;
}

// Stavke obustava na obračunu (snapshot liste sa radnika ili ručni unos za
// mjesec). MariaDB vraća JSON kolonu kao string; normalizuj u listu ili null.
function normalizujObustaveStavke(v) {
  let lista = v;
  if (typeof lista === "string") {
    try {
      lista = JSON.parse(lista);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(lista)) return null;
  const ciste = lista
    .slice(0, 20)
    .filter((red) => red && typeof red === "object" && !Array.isArray(red))
    .map((red) => ({
      naziv: String(red.naziv || "").slice(0, 200),
      iznos: +(Number(red.iznos) || 0).toFixed(2),
    }))
    .filter((red) => red.naziv || red.iznos > 0);
  return ciste.length ? ciste : null;
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

// Maksimalno uvećanje plaće po osnovu minulog rada — 20% od osnovne plaće
// (čl. 40 Kolektivnog ugovora FBiH). Cap se primjenjuje bez obzira na stopu
// (0,4% ili 0,6%) i broj godina staža.
const MINULI_RAD_CAP = 0.20;

// Prosječan broj radnih dana u mjesecu × 8h = 174h (puni radni fond FBiH).
// Koristi se za satnicu uvećanja: za PT radnika dijelimo bazu sa
// (contractedHours × 21.75) umjesto 174 — inače bi satnica bila pogrešno
// niža (npr. PT 4h sa bruto 515 KM dao bi satnicu 2,96 umjesto tačne 5,92).
const WORK_DAYS_IN_MONTH_AVG = 21.75;

// ── Izračun: sve vrijednosti iz inputa → Payroll snapshot polja ─────────────
function computePayrollSnapshot(input) {
  // grossBase = osnovica bruto plate (user-entered, iz ugovora)
  // minuliRadRate = % godišnje, minuliRadYears = godine staža
  // proRateFactor = 0..1 za mid-month prijavu/odjavu (default 1)
  // gross = efektivni bruto = (osnovica × factor) + minuli rad + uvećanja
  const grossBase = Number(input.grossBase) || Number(input.gross) || 0;
  const proRateFactor = Math.max(
    0,
    Math.min(Number(input.proRateFactor) || 1, 1),
  );
  // Skalirana osnovica — to je STVARNA bruto baza za TAJ mjesec.
  // Minuli rad i doprinosi se računaju na nju (radnik koji radi pola mjeseca
  // dobija srazmjeran iznos plaće, čl. 76 ZoR FBiH).
  const effectiveBase = +(grossBase * proRateFactor).toFixed(2);

  const minuliRadRate = Math.max(Number(input.minuliRadRate) || 0, 0);
  const minuliRadYears = Math.max(Number(input.minuliRadYears) || 0, 0);
  // Cap na 20% — ne važi koliko god rate × years iznosi.
  const minuliMultiplier = Math.min(
    (minuliRadRate / 100) * minuliRadYears,
    MINULI_RAD_CAP,
  );
  const minuliRadAmount = +(effectiveBase * minuliMultiplier).toFixed(2);

  // Satnica za uvećanja: bazira se na PUNOJ osnovici po ugovoru (ne skalirana
  // pro-rate-om i ne 174 fiksno). Tako PT 4h radnik dobija istu satnicu kao
  // FT 8h radnik relativno svom ugovoru. Pro-rate i contracted hours se
  // poništavaju jer i baza i radni sati skaliraju proporcionalno.
  const contractedHours = Math.max(Math.min(Number(input.contractedHours) || 8, 8), 1);
  const hourlyRate =
    grossBase > 0 ? grossBase / (contractedHours * WORK_DAYS_IN_MONTH_AVG) : 0;
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

  const grossInput = +(effectiveBase + minuliRadAmount + uvecanjaTotal).toFixed(2);

  const coeff = Math.max(Number(input.taxCoefficient) || 0, 0);
  // Min. osnovica zavisi od ugovorenog radnog vremena i koeficijenta porezne
  // kartice (Zakon o doprinosima FBiH, čl. 7, izmjene 33/25 od 01.07.2025).
  // Kod mid-month prijave/odjave skaliramo min onim istim faktorom — radnik
  // koji legitimno radi pola mjeseca ne treba upozorenje da je ispod pune min.
  const minInfo = computeMinContribBase(coeff, contractedHours);
  const scaledMinBase = +(minInfo.minBase * proRateFactor).toFixed(2);
  const minBaseApplied = grossInput > 0 && grossInput < scaledMinBase;
  const deduction = deductionFromCoefficient(coeff);

  // Doprinosi se obračunavaju na stvarnu bruto platu (grossInput).
  // VAŽNO: zaokružujemo svaku komponentu posebno (na 2 decimale) PRIJE sabiranja,
  // jer PUFBiH MIP-1023/Obrazac 2001 validacija očekuje da je "Ukupan iznos
  // doprinosa" jednak zbiru kol.15 (per-radnik kol.11+kol.13+kol.14), gdje su
  // sve kolone već zaokružene. Bez ovoga znamo da DB-snapshot empTotal može
  // biti 1 fening različit od zbira komponenti (round-then-sum vs sum-then-round).
  const empPio = +(grossInput * 0.17).toFixed(2);
  const empZdravstvo = +(grossInput * 0.125).toFixed(2);
  const empNezaposlenost = +(grossInput * 0.015).toFixed(2);
  const empTotal = +(empPio + empZdravstvo + empNezaposlenost).toFixed(2);

  const taxBaseSal = +Math.max(grossInput - empTotal - deduction, 0).toFixed(2);
  const incomeTaxSal = +(taxBaseSal * TAX_RATE).toFixed(2);
  // Neto (keš radniku) se računa SAMO iz plate — korist se ne isplaćuje, ne
  // mijenja take-home. Vodna/nesreće su na neto, pa korist ni njih ne dira.
  const net = +(grossInput - empTotal - incomeTaxSal).toFixed(2);

  const erpPioSal = +(grossInput * ERP_PIO).toFixed(2);
  const erpZdravstvoSal = +(grossInput * ERP_ZDRAVSTVO).toFixed(2);
  const erpNezaposlenostSal = +(grossInput * ERP_NEZAPOSLENOST).toFixed(2);

  const vodnaNaknada = +(net * VODNA_NAKNADA).toFixed(2);
  const naknadaNesrece = +(net * NAKNADA_NESRECE).toFixed(2);

  // ── Korist u naravi (službeno vozilo) — aditivni sloj ─────────────────────
  // Korist povećava OSNOVICU za doprinose i porez, ali NE i neto radnika.
  // gross (osnovica) = bruto plata + bruto korist; sve doprinose/porez vrijednosti
  // (emp*/erp*/taxBase/incomeTax) su zbir plate i koristi; net ostaje plata-only.
  const korist = computeKorist(input.koristNetValue);
  const koristBruto = korist ? korist.koristBruto : 0;
  const koristNetValue = korist ? korist.koristNetValue : 0;

  const empPioAll = +(empPio + (korist ? korist.empPio : 0)).toFixed(2);
  const empZdravstvoAll = +(empZdravstvo + (korist ? korist.empZdravstvo : 0)).toFixed(2);
  const empNezaposlenostAll = +(empNezaposlenost + (korist ? korist.empNezaposlenost : 0)).toFixed(2);
  const empTotalAll = +(empPioAll + empZdravstvoAll + empNezaposlenostAll).toFixed(2);
  const taxBase = +(taxBaseSal + (korist ? korist.taxBase : 0)).toFixed(2);
  const incomeTax = +(incomeTaxSal + (korist ? korist.porez : 0)).toFixed(2);

  const erpPio = +(erpPioSal + (korist ? korist.erpPio : 0)).toFixed(2);
  const erpZdravstvo = +(erpZdravstvoSal + (korist ? korist.erpZdravstvo : 0)).toFixed(2);
  const erpNezaposlenost = +(erpNezaposlenostSal + (korist ? korist.erpNezaposlenost : 0)).toFixed(2);
  const erpTotal = +(erpPio + erpZdravstvo + erpNezaposlenost).toFixed(2);

  // gross = ukupna osnovica (plata + korist). Doprinosi/invalidi se vežu na nju.
  const grossAll = +(grossInput + koristBruto).toFixed(2);
  // Stvarne emp* vrijednosti za snapshot su zbirne (plata + korist).
  const empPioOut = empPioAll;
  const empZdravstvoOut = empZdravstvoAll;
  const empNezaposlenostOut = empNezaposlenostAll;
  const empTotalOut = empTotalAll;

  const mealAllowance = Number(input.mealAllowance) || 0;
  const vacationBonus = Number(input.vacationBonus) || 0;
  // Topli obrok i putni trošak se NE skaliraju ovdje proRateFactor-om: oba se
  // već računaju po danima prisustva iz šihterice na frontendu (vidi
  // obracunOrgPayrolls/ObracunPlata), pa stiže već tačan iznos. Regres je
  // godišnji pa se ne dira.
  const travelExpense = +(Number(input.travelExpense) || 0).toFixed(2);

  // Obustave na platu (rate kredita radnika): raspolaganje već obračunatim
  // neto iznosom. Ne diraju bruto/doprinose/porez/neto NI trošak poslodavca
  // (firma isti novac isplati, samo dio kreditoru umjesto radniku); umanjuju
  // jedino iznos za isplatu radniku.
  // Gornja granica prati DECIMAL(12,2) u bazi: bez nje "1e30" iz body-ja
  // ruši upis sa 500 umjesto jasne poruke.
  const obustave = +Math.min(
    Math.max(0, Number(input.obustave) || 0),
    9999999999,
  ).toFixed(2);

  // totalCost = stvarni trošak poslodavca. Neto-bazirana formula da bude tačna
  // i kad ima koristi (nenovčani neto dio koristi se NE plaća u kešu, pa ne ide
  // u trošak). Bez koristi je identična staroj (grossInput = net + empTotal + tax).
  const totalCost = +(
    net +
    empTotalOut +
    incomeTax +
    erpTotal +
    vodnaNaknada +
    naknadaNesrece +
    mealAllowance +
    vacationBonus +
    travelExpense
  ).toFixed(2);

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
      koristNetValue: 0,
      koristBruto: 0,
      mealAllowance,
      vacationBonus,
      travelExpense,
      obustave,
      totalCost: mealAllowance + vacationBonus + travelExpense,
    };
  }

  return {
    gross: grossAll,
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
    empPio: empPioOut,
    empZdravstvo: empZdravstvoOut,
    empNezaposlenost: empNezaposlenostOut,
    empTotal: empTotalOut,
    taxBase,
    incomeTax,
    net,
    erpPio,
    erpZdravstvo,
    erpNezaposlenost,
    erpTotal,
    vodnaNaknada,
    naknadaNesrece,
    koristNetValue,
    koristBruto,
    mealAllowance,
    vacationBonus,
    travelExpense,
    obustave,
    totalCost,
  };
}

// ── GET /api/payroll?organizationId=X&year=Y[&month=M][&workerId=W] ─────────
// month je opcion: bez njega vraća cijelu godinu (karton radnika po
// mjesecima); workerId sužava na jednog radnika.
async function list(req, res) {
  const organizationId = parseId(req.query.organizationId);
  const year = parseId(req.query.year);
  const month = parseId(req.query.month);
  const workerId = parseId(req.query.workerId);
  if (!organizationId || !year) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing organizationId/year" });
  }

  const org = await assertOrgAccess(organizationId, req.user.id);
  if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  // Filtriraj orphan payroll-e (radnik obrisan ali payroll ostao)
  const existingWorkers = await Worker.findAll({
    where: { organizationId },
    attributes: ["id"],
  });
  const validWorkerIds = new Set(existingWorkers.map((w) => w.id));
  const where = { organizationId, year };
  if (month) where.month = month;
  if (workerId) where.workerId = workerId;
  const rawPayrolls = await Payroll.findAll({
    where,
    order: [["month", "ASC"], ["workerId", "ASC"]],
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
    obustave,
    obustaveStavke,
    proRateFactor,
    targetNet,
    notes,
    koristVoziloAktivna,
    koristVoziloMetoda,
    koristVoziloVrijednost,
    koristVoziloSaPdv,
    koristVoziloOpis,
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
    // Pro-rate factor (0..1) za mid-month prijavu/odjavu — primjenjuje se
    // unutar computeObrtnikSnapshot. Default 1 (pun mjesec).
    const obrtnikFactor =
      proRateFactor !== undefined && proRateFactor !== null && proRateFactor !== ""
        ? Number(proRateFactor)
        : 1;
    const snapshot = computeObrtnikSnapshot(osnovica, obrtnikFactor);
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
  const effectiveObustave = pick(obustave, "obustave", 0);
  // Stavke prate poslani zbir; kad body ne šalje ništa, čuva se postojeći snapshot.
  const effectiveObustaveStavke =
    obustaveStavke !== undefined
      ? normalizujObustaveStavke(obustaveStavke)
      : normalizujObustaveStavke(existing?.obustaveStavke);

  // Minuli rad: stopa iz body-ja, fallback na worker default
  const effectiveMinuliRate =
    minuliRadRate !== undefined && minuliRadRate !== null && minuliRadRate !== ""
      ? Number(minuliRadRate)
      : Number(existing?.minuliRadRate ?? worker.minuliRadRate ?? 0.4);
  // Datum isplate plate:
  //   1) Eksplicitno iz body-ja ako je validan YYYY-MM-DD
  //   2) Inače naslijedi od bilo kog postojećeg payroll-a u (org, year, month)
  //      — svi su sinhroni; ovo pokriva slučaj kad bulk "Obračunaj sve" ne
  //      pošalje datum a korisnik je ranije unio paymentDate u UI
  //   3) Fallback: zadnji dan mjeseca obračuna
  let effectivePaymentDate = null;
  if (typeof paymentDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    effectivePaymentDate = paymentDate;
  } else if (existing && existing.paymentDate) {
    effectivePaymentDate = String(existing.paymentDate).slice(0, 10);
  } else {
    const peer = await Payroll.findOne({
      where: { organizationId, year, month, paymentDate: { [Op.ne]: null } },
      attributes: ["paymentDate"],
    });
    if (peer && peer.paymentDate) {
      effectivePaymentDate = String(peer.paymentDate).slice(0, 10);
    }
  }
  if (!effectivePaymentDate) {
    effectivePaymentDate = lastDayOfMonthIso(year, month);
  }
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

  const effectiveProRateFactor =
    proRateFactor !== undefined && proRateFactor !== null && proRateFactor !== ""
      ? Number(proRateFactor)
      : 1;
  const effTaxCoefficient =
    taxCoefficient ?? (existing ? existing.taxCoefficient : worker.taxCoefficient) ?? 1.0;

  // Korist u naravi (službeno vozilo): body > spremljena konfiguracija radnika.
  // Računa se samo za zaposlene (ne za vlasnika obrta, koji ima svoju granu iznad).
  const effKoristAktivna =
    koristVoziloAktivna !== undefined && koristVoziloAktivna !== null
      ? !!koristVoziloAktivna
      : !!worker.koristVoziloAktivna;
  const effKoristMetoda =
    koristVoziloMetoda || worker.koristVoziloMetoda || "nabavna_1posto";
  const effKoristVrijednost =
    koristVoziloVrijednost !== undefined &&
    koristVoziloVrijednost !== null &&
    koristVoziloVrijednost !== ""
      ? Number(koristVoziloVrijednost)
      : Number(worker.koristVoziloVrijednost || 0);
  const effKoristSaPdv =
    koristVoziloSaPdv !== undefined && koristVoziloSaPdv !== null
      ? !!koristVoziloSaPdv
      : worker.koristVoziloSaPdv == null
        ? true
        : !!worker.koristVoziloSaPdv;
  const effKoristNetValue =
    effKoristAktivna && effKoristVrijednost > 0
      ? koristNetValueFromConfig(effKoristMetoda, effKoristVrijednost, effKoristSaPdv)
      : 0;

  const snapshotInput = {
    grossBase: effectiveGrossBase,
    minuliRadRate: effectiveMinuliRate,
    minuliRadYears: minuliYears,
    proRateFactor: effectiveProRateFactor,
    overtimeHours: effOvertimeHours,
    nightHours: effNightHours,
    sundayHours: effSundayHours,
    holidayHours: effHolidayHours,
    overtimeRate: effOvertimeRate,
    nightRate: effNightRate,
    sundayRate: effSundayRate,
    holidayRate: effHolidayRate,
    taxCoefficient: effTaxCoefficient,
    contractedHours: worker.contractedHours ?? 8,
    mealAllowance: effectiveMeal,
    vacationBonus: effectiveVacation,
    travelExpense: effectiveTravel,
    obustave: effectiveObustave,
    koristNetValue: effKoristNetValue,
  };

  // Fening-search za "cilj neto za isplatu" (NETO_ISPLATA): zbog PUFBiH
  // zaokruživanja doprinosa po komponenti, analitički riješen bruto zna
  // promašiti ciljni neto za fening (npr. 1.030,01 umjesto 1.030,00). Ovdje
  // pomjeramo bruto osnovicu ±10 feninga i biramo onu koja daje TAČNO ciljni
  // neto (najbliža originalu). Samo kad nema uvećanja i pun je mjesec — inače
  // neto legitimno odstupa od cilja.
  const targetNetNum =
    targetNet !== undefined && targetNet !== null && targetNet !== ""
      ? Number(targetNet)
      : null;
  const noUvecanja =
    effOvertimeHours === 0 &&
    effNightHours === 0 &&
    effSundayHours === 0 &&
    effHolidayHours === 0;
  if (
    targetNetNum != null &&
    Number.isFinite(targetNetNum) &&
    targetNetNum > 0 &&
    noUvecanja &&
    effectiveProRateFactor === 1 &&
    effectiveGrossBase > 0
  ) {
    let bestBase = null;
    // Probaj offsete redom po rastućoj udaljenosti: 0, +1, -1, +2, -2, ...
    // pa uzmi prvi koji daje tačan ciljni neto (najbliži originalnoj osnovici).
    const offsets = [0];
    for (let k = 1; k <= 10; k++) offsets.push(k, -k);
    for (const cents of offsets) {
      const candidateBase = +(effectiveGrossBase + cents / 100).toFixed(2);
      if (candidateBase <= 0) continue;
      const trial = computePayrollSnapshot({
        ...snapshotInput,
        grossBase: candidateBase,
      });
      if (trial.net === +targetNetNum.toFixed(2)) {
        bestBase = candidateBase;
        break;
      }
    }
    if (bestBase != null) {
      snapshotInput.grossBase = bestBase;
    }
  }

  const snapshot = computePayrollSnapshot(snapshotInput);

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
    // Pamti razmjerni faktor (1 = pun obračun, korisnik isključio razmjer).
    proRateFactor: effectiveProRateFactor,
    bankAccount: worker.bankAccount || null,
    paymentDate: effectivePaymentDate,
    // Status: ako gross > 0 → OBRACUNATO (puni obračun), inače DRAFT (samo
    // sačuvani dodaci/sati prije konačnog obračuna).
    status: snapshot.gross > 0 ? "OBRACUNATO" : "DRAFT",
    // Pravi obračun preuzima mjesec: ako je red bio uvezeni placeholder, skida
    // imported flag (od sada se tretira kao stvarni obračun aplikacije).
    imported: false,
    notes:
      typeof notes === "string"
        ? notes
        : existing
          ? existing.notes
          : null,
    obustaveStavke: effectiveObustaveStavke,
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
  // Karton radnika se dira samo kad je korisnik u OVOM zahtjevu poslao iznos
  // (modal ili batch za novi obračun) i samo iz najnovijeg mjeseca radnika.
  const smijeSticky =
    obustave !== undefined &&
    obustave !== null &&
    !(await postojiNovijiObracun(workerId, year, month));
  const stickyObustave = smijeSticky
    ? obustaveKartonaSticky(worker.obustave, Number(effectiveObustave) || 0)
    : undefined;
  await worker.update({
    minuliRadRate: effectiveMinuliRate,
    overtimeRate: effOvertimeRate,
    nightRate: effNightRate,
    sundayRate: effSundayRate,
    holidayRate: effHolidayRate,
    defaultMealAllowance: Number(effectiveMeal) || 0,
    defaultTravelExpense: Number(effectiveTravel) || 0,
    // Obustava se pamti na kartonu radnika (prenos u idući mjesec), osim kad
    // korisnik ručno održava listu na kartonu — vidi obustaveKartonaSticky.
    ...(stickyObustave !== undefined ? { obustave: stickyObustave } : {}),
    // Korist u naravi je per-radnik konfiguracija (vezana za konkretno vozilo iz
    // Odluke poslodavca), pa je pamtimo na workeru kao master.
    koristVoziloAktivna: effKoristAktivna,
    koristVoziloMetoda: effKoristMetoda,
    koristVoziloVrijednost: Number(effKoristVrijednost) || 0,
    koristVoziloSaPdv: effKoristSaPdv,
    koristVoziloOpis:
      koristVoziloOpis !== undefined && koristVoziloOpis !== null
        ? String(koristVoziloOpis).slice(0, 255)
        : worker.koristVoziloOpis || null,
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
      obustave,
      obustaveStavke,
      taxCoefficient,
      minuliRadRate,
      koristVoziloAktivna,
      koristVoziloMetoda,
      koristVoziloVrijednost,
      koristVoziloSaPdv,
      koristVoziloOpis,
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
      obustave: Math.max(0, Number(pick(obustave, "obustave", 0)) || 0),
      obustaveStavke:
        obustaveStavke !== undefined
          ? normalizujObustaveStavke(obustaveStavke)
          : normalizujObustaveStavke(existing?.obustaveStavke),
      // Koeficijent 0 je validan (lični odbitak 0), pa NE smije `|| 1.0` koji
      // bi falsy-nulu vratio na 1. Fallback na 1.0 samo ako nije validan broj.
      taxCoefficient: (() => {
        const v = Number(
          pick(taxCoefficient, "taxCoefficient", worker.taxCoefficient ?? 1.0),
        );
        return Number.isFinite(v) && v >= 0 ? v : 1.0;
      })(),
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

    // Korist u naravi (per-radnik master konfiguracija): pamti se i pri "save
    // inputs" (zatvaranje modala bez punog obračuna) da se ne izgubi, isto kao
    // ostale sticky vrijednosti. Primjenjuje se na osnovicu tek pri calculate.
    const skAktivna =
      koristVoziloAktivna !== undefined && koristVoziloAktivna !== null
        ? !!koristVoziloAktivna
        : !!worker.koristVoziloAktivna;
    const skMetoda =
      koristVoziloMetoda || worker.koristVoziloMetoda || "nabavna_1posto";
    const skVrijednost =
      koristVoziloVrijednost !== undefined &&
      koristVoziloVrijednost !== null &&
      koristVoziloVrijednost !== ""
        ? Number(koristVoziloVrijednost)
        : Number(worker.koristVoziloVrijednost || 0);
    const skSaPdv =
      koristVoziloSaPdv !== undefined && koristVoziloSaPdv !== null
        ? !!koristVoziloSaPdv
        : worker.koristVoziloSaPdv == null
          ? true
          : !!worker.koristVoziloSaPdv;

    // Sticky defaults: stope i naknade se pamte na worker-u za sljedeći mjesec.
    // Regres se NE pamti. taxCoefficient se NE upisuje natrag — worker profil
    // je master, vidi calculate() iznad.
    // Isti guard kao u calculate(): karton se dira samo kad je iznos stvarno
    // poslan i samo iz najnovijeg mjeseca radnika.
    const smijeSticky =
      obustave !== undefined &&
      obustave !== null &&
      !(await postojiNovijiObracun(workerId, year, month));
    const stickyObustave = smijeSticky
      ? obustaveKartonaSticky(worker.obustave, Number(update.obustave) || 0)
      : undefined;
    await worker.update({
      minuliRadRate: update.minuliRadRate,
      overtimeRate: update.overtimeRate,
      nightRate: update.nightRate,
      sundayRate: update.sundayRate,
      holidayRate: update.holidayRate,
      defaultMealAllowance: Number(update.mealAllowance) || 0,
      defaultTravelExpense: Number(update.travelExpense) || 0,
      ...(stickyObustave !== undefined ? { obustave: stickyObustave } : {}),
      koristVoziloAktivna: skAktivna,
      koristVoziloMetoda: skMetoda,
      koristVoziloVrijednost: Number(skVrijednost) || 0,
      koristVoziloSaPdv: skSaPdv,
      koristVoziloOpis:
        koristVoziloOpis !== undefined && koristVoziloOpis !== null
          ? String(koristVoziloOpis).slice(0, 255)
          : worker.koristVoziloOpis || null,
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

// ── POST /api/payroll/import ────────────────────────────────────────────────
// Uvoz ranijih obračuna plata (klijent prešao na nas u toku godine) samo da bi
// GIP-1022 bio kompletan. Pravi Payroll zapise označene imported=true. Po redu:
//   compute (default): iz bruto + taxCoefficient motor izračuna doprinose/porez/
//     neto BEZ minulog rada, BEZ sati/dodataka, pa je grossInput === uneseni
//     bruto (korisnik unosi gotov bruto iz starog programa).
//   manual: compute kao baza, pa override literalnim iznosima (kad se stari
//     program razlikovao u feningu). erp doprinosi nisu u GIP-u.
// Ne gazi postojeći NE-uvezeni (stvarni) obračun, vraća ga u skipped.
// Zadnji dan mjeseca kao "YYYY-MM-DD" bez timezone pomaka. NE koristiti
// toISOString (na serveru ispred UTC pomjeri dan unazad, npr. 31.01 -> 30.01).
function lastDayOfMonthIso(year, month) {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

async function importPayrolls(req, res) {
  try {
    const { organizationId: rawOrgId, year: rawYear, rows } = req.body ?? {};
    const organizationId = parseId(rawOrgId);
    const year = parseId(rawYear);
    if (!organizationId || !year || !Array.isArray(rows)) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing organizationId/year/rows" });
    }

    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const workers = await Worker.findAll({ where: { organizationId } });
    const workerById = new Map(workers.map((w) => [w.id, w]));

    const result = { created: 0, updated: 0, skipped: [] };

    for (const row of rows) {
      const workerId = parseId(row?.workerId);
      const month = parseId(row?.month);
      if (!workerId || !month || month < 1 || month > 12) {
        result.skipped.push({
          workerId: row?.workerId ?? null,
          month: row?.month ?? null,
          reason: "INVALID_ROW",
        });
        continue;
      }
      const worker = workerById.get(workerId);
      if (!worker) {
        result.skipped.push({ workerId, month, reason: "WORKER_NOT_FOUND" });
        continue;
      }
      // Vlasnik obrta ide u 2002, ne u GIP, pa ga ne uvozimo.
      if (worker.role === "VLASNIK" && org.type === "BUSINESS") {
        result.skipped.push({ workerId, month, reason: "OWNER_SKIPPED" });
        continue;
      }

      const gross = Number(row?.gross);
      if (!Number.isFinite(gross) || gross <= 0) {
        result.skipped.push({ workerId, month, reason: "INVALID_GROSS" });
        continue;
      }
      const taxCoefficient =
        row?.taxCoefficient != null && row.taxCoefficient !== ""
          ? Number(row.taxCoefficient)
          : Number(worker.taxCoefficient ?? 1);

      const existing = await Payroll.findOne({ where: { workerId, year, month } });
      // Ne gazi stvarni obračun aplikacije.
      if (existing && !existing.imported) {
        result.skipped.push({ workerId, month, reason: "REAL_PAYROLL_EXISTS" });
        continue;
      }

      // Motor BEZ minulog rada i sati: grossInput === uneseni bruto.
      const base = computePayrollSnapshot({
        grossBase: gross,
        minuliRadRate: 0,
        minuliRadYears: 0,
        proRateFactor: 1,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        taxCoefficient,
        contractedHours: worker.contractedHours ?? 8,
        mealAllowance: 0,
        vacationBonus: 0,
        travelExpense: 0,
      });

      let snapshot = base;
      if (row?.mode === "manual") {
        const ov = {};
        for (const k of [
          "empPio",
          "empZdravstvo",
          "empNezaposlenost",
          "deduction",
          "taxBase",
          "incomeTax",
          "net",
        ]) {
          if (row[k] != null && row[k] !== "") ov[k] = Number(row[k]);
        }
        // Ako je promijenjena bilo koja komponenta doprinosa, preračunaj zbir.
        if (
          ov.empPio != null ||
          ov.empZdravstvo != null ||
          ov.empNezaposlenost != null
        ) {
          const ep = ov.empPio != null ? ov.empPio : base.empPio;
          const ez = ov.empZdravstvo != null ? ov.empZdravstvo : base.empZdravstvo;
          const en =
            ov.empNezaposlenost != null ? ov.empNezaposlenost : base.empNezaposlenost;
          ov.empTotal = +(Number(ep) + Number(ez) + Number(en)).toFixed(2);
        }
        snapshot = { ...base, ...ov };
      }

      // Datum isplate: iz reda ako je validan YYYY-MM-DD, inače zadnji dan mjeseca.
      const paymentDate =
        typeof row?.paymentDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(row.paymentDate)
          ? row.paymentDate
          : lastDayOfMonthIso(year, month);
      const payload = {
        organizationId,
        workerId,
        year,
        month,
        workedMinutes: null,
        standardMinutes: STANDARD_MONTHLY_MINUTES,
        sickDays: 0,
        vacationDays: 0,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        bankAccount: worker.bankAccount || null,
        paymentDate,
        status: "OBRACUNATO",
        imported: true,
        notes: existing ? existing.notes : null,
        ...snapshot,
        // Uvoz ranijih plata ne poznaje obustave (snapshot ih uvijek vrati 0),
        // pa ponovni uvoz istog mjeseca ne smije obrisati ono što je već
        // upisano na postojećem obračunu.
        ...(existing
          ? {
              obustave: existing.obustave,
              obustaveStavke: existing.obustaveStavke,
            }
          : {}),
      };

      if (existing) {
        await existing.update(payload);
        result.updated += 1;
      } else {
        await Payroll.create(payload);
        result.created += 1;
      }
    }

    return res.json({ ok: true, data: result });
  } catch (e) {
    console.error("importPayrolls failed:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "INTERNAL_ERROR" });
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
    obustave: body.obustave !== undefined ? body.obustave : payroll.obustave,
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
  if (body.obustaveStavke !== undefined)
    update.obustaveStavke = normalizujObustaveStavke(body.obustaveStavke);

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

    // Učitaj radnike (role + city) PRIJE agregacije: treba za isključivanje
    // vlasnika obrta iz zbirova plata i za bucketing uplatnica po općini.
    const workerIdsAll = payrolls.map((p) => p.workerId);
    const workersAll = await Worker.findAll({
      where: { id: workerIdsAll, organizationId },
    });
    const workerMapAll = new Map(workersAll.map((w) => [w.id, w]));

    // Vlasnik obrta (BUSINESS) je odvojen od radnika: ima samo doprinose (ide u
    // Obrazac 2002). Njegov trošak doprinosa ulazi SAMO u ukupan trošak
    // poslodavca, a NE u bruto, neto, porez ni broj obračunatih radnika.
    const isObrtOwner = (p) => {
      const w = workerMapAll.get(p.workerId);
      return org.type === "BUSINESS" && w?.role === "VLASNIK";
    };

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
      obustaveTot = 0,
      totalCost = 0;

    for (const p of payrolls) {
      // Vlasnik obrta: bruto/neto/porez se NE broje u zbirove plata (nema platu).
      if (!isObrtOwner(p)) {
        net += Number(p.net) || 0;
        gross += Number(p.gross) || 0;
        porez += Number(p.incomeTax) || 0;
        // Obustava se broji najviše do iznosa koji radnik stvarno prima:
        // višak se ne isplaćuje iz tuđe plate, pa ne smije umanjiti zbir.
        const primanjaRadnika =
          (Number(p.net) || 0) +
          (Number(p.mealAllowance) || 0) +
          (Number(p.vacationBonus) || 0) +
          (Number(p.travelExpense) || 0);
        obustaveTot += Math.min(Math.max(0, Number(p.obustave) || 0), primanjaRadnika);
      }
      empPio += Number(p.empPio) || 0;
      erpPio += Number(p.erpPio) || 0;
      empZdr += Number(p.empZdravstvo) || 0;
      erpZdr += Number(p.erpZdravstvo) || 0;
      empNezap += Number(p.empNezaposlenost) || 0;
      erpNezap += Number(p.erpNezaposlenost) || 0;
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

    // Agregacija po (kanton, opcina) radnika — vraća listu entry-ja za svaku
    // (vrsta, kanton, opcina) kombinaciju. Federalni i firma-kantonalni idu
    // u 1 entry sa opcinom firme.
    const orgPlain = org.toJSON();
    const combineKantonal = await getCombineKantonal(req.user.id);
    const bucketEntries = buildAllUplatnice(payrolls, workerMapAll, orgPlain, {
      fondInvalidiRate: FOND_INVALIDI_RATE,
      combineKantonal,
    });

    // Map bucket entries u UI format (uplatnice array). Label uključuje općinu
    // za kantonalne vrste kada postoji više od jedne općine.
    const kantonalVrste = new Set(["zdrKanton", "nezapKanton", "porez", "zdrRS", "nezapRS"]);
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
        label += `, ${e.opcinaIme}`;
      }
      // Group prefix: za obrt sa vlasnikom + radnicima razdvajamo
      if (e.group === "vlasnik") label = `Vlasnik, ${label}`;
      else if (e.group === "radnici") label = `Radnici, ${label}`;
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

    // Per-worker: neto plata + neoporezivi dodaci (idu pojedinačno radnicima).
    // Vlasnik obrta se isključuje, nema platu, ne ide na platne liste, lista
    // naloga za plate ni specifikacije po radniku.
    const perWorker = payrolls
      .filter((p) => !isObrtOwner(p))
      .map((p) => {
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
        obustave: round(Number(p.obustave) || 0),
        obustaveStavke: normalizujObustaveStavke(p.obustaveStavke),
        status: p.status,
      };
    });

    return res.json({
      ok: true,
      data: {
        organizationId,
        year,
        month,
        combineKantonal,
        workerCount: payrolls.filter((p) => !isObrtOwner(p)).length,
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
          obustave: round(obustaveTot),
          // Novac koji stvarno ide radnicima na račune (neto + neoporezivi
          // dodaci - obustave). Trošak poslodavca se obustavama NE mijenja.
          zaIsplatu: round(net + meal + vacation + travel - obustaveTot),
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
    // Datum isplate plate (YYYY-MM-DD).
    // Hierarchy: query override > payroll snapshot > zadnji dan mjeseca.
    const paymentDateRaw = String(req.query.paymentDate || "").slice(0, 10);
    const queryPaymentDate = /^\d{4}-\d{2}-\d{2}$/.test(paymentDateRaw)
      ? paymentDateRaw
      : null;

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
    const payrollPaymentDate =
      payrolls.find((p) => p.paymentDate)?.paymentDate || null;
    const paymentDate =
      queryPaymentDate ||
      (payrollPaymentDate ? String(payrollPaymentDate).slice(0, 10) : null) ||
      new Date(year, month, 0).toISOString().slice(0, 10);

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
    const combineKantonal = await getCombineKantonal(req.user.id);
    const bucketEntries = buildAllUplatnice(payrolls, workerMap, orgPlain, {
      fondInvalidiRate: FOND_INVALIDI_RATE,
      combineKantonal,
    });

    // Da li imamo više različitih (kanton, opcina) lokacija za istu kantonalnu
    // vrstu? Ako da, dodajemo općinu u label radi razlikovanja.
    const kantonalVrste = new Set(["zdrKanton", "nezapKanton", "porez", "zdrRS", "nezapRS"]);
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
        label += `, ${e.opcinaIme}`;
      }
      // Group prefix za obrt sa vlasnikom + radnicima
      const groupLabel =
        e.group === "vlasnik"
          ? "Vlasnik, "
          : e.group === "radnici"
            ? "Radnici, "
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
        // Neto se isplaćuje umanjen za obustave (rate kredita radnika), isto
        // kao u izvozu naloga i štampi: uplatnica mora glasiti na iznos koji
        // radnik stvarno dobija, inače se dva dokumenta razilaze.
        [
          "Neto plata",
          Math.max(0, +((Number(p.net) || 0) - (Number(p.obustave) || 0)).toFixed(2)),
          "Isplata neto plate",
        ],
        ["Topli obrok", Number(p.mealAllowance) || 0, "Topli obrok (neoporezivi)"],
        ["Regres", Number(p.vacationBonus) || 0, "Regres za godišnji odmor"],
        ["Putni trošak", Number(p.travelExpense) || 0, "Putni trošak (neoporezivi)"],
      ];
      for (const [label, amount, svrha] of personalItems) {
        if (amount <= 0) continue;
        pageLabels.push(`${label}, ${workerName}`);
        optsList.push({
          ...baseShared,
          svrha: `${svrha} za ${monthYear}, ${workerName}`,
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

// Kombinovani PDF sa platnim listićima svih radnika mjeseca: preskače orphan
// payroll-e (radnik obrisan) i vlasnike obrta (oni idu u Obrazac 2002).
// Vraća { pdfBytes, pages, paymentDate } ili null kad nema nijednog listića.
// Koristi ga i download (monthly-payslips) i slanje svega na jedan email.
async function buildMonthlyPayslipsBundle(org, year, month, queryPaymentDate, nazivDokumenta = null) {
  const organizationId = org.id;
  const isObrt = org.type === "BUSINESS";
  const existingWorkers = await Worker.findAll({
    where: { organizationId },
    attributes: ["id", "role"],
  });
  const validWorkerIds = new Set(
    existingWorkers
      .filter((w) => !(isObrt && w.role === "VLASNIK"))
      .map((w) => w.id),
  );
  const rawPayrolls = await Payroll.findAll({
    where: { organizationId, year, month },
    order: [["workerId", "ASC"]],
  });
  const payrolls = rawPayrolls.filter((p) => validWorkerIds.has(p.workerId));
  if (payrolls.length === 0) return null;
  // Hierarchy: override > payroll snapshot > zadnji dan mjeseca.
  // payrollPaymentDate je jedan datum iz prvog payroll-a koji ga ima
  // (svi payroll-i u mjesecu su sinhroni preko setPaymentDate batch update-a).
  const payrollPaymentDate =
    payrolls.find((p) => p.paymentDate)?.paymentDate || null;
  const paymentDate =
    queryPaymentDate ||
    (payrollPaymentDate ? String(payrollPaymentDate).slice(0, 10) : null) ||
    new Date(year, month, 0).toISOString().slice(0, 10);
  const workerIds = payrolls.map((p) => p.workerId);
  const workers = await Worker.findAll({
    where: { id: workerIds, organizationId },
  });
  const workerMap = new Map(workers.map((w) => [w.id, w]));

  const orgPlain = org.toJSON ? org.toJSON() : org;
  const pdf = await PDFDocument.create();
  const fonts = await embedFonts(pdf);
  // Memorandum klijenta: jedna ugradnja po dokumentu, ista slika za sve strane.
  const memorandumImage = await embedMemorandum(pdf, ucitajMemorandum(orgPlain));

  let pages = 0;
  for (const p of payrolls) {
    const w = workerMap.get(p.workerId);
    if (!w) continue;
    const workerPlain = w.toJSON ? w.toJSON() : w;
    if (workerPlain.jmbg) {
      try { workerPlain.jmbg = decryptJmbg(workerPlain.jmbg); }
      catch { workerPlain.jmbg = ""; }
    }
    addPayslipPage(pdf, p.toJSON(), orgPlain, workerPlain, paymentDate, fonts, {
      nazivDokumenta,
      memorandumImage,
    });
    pages++;
  }

  const pdfBytes = Buffer.from(await pdf.save());
  return { pdfBytes, pages, paymentDate };
}

// ── POST /api/payroll/monthly-payslips ──────────────────────────────────────
// Kombinovani PDF sa platnim listićima za sve radnike za odabrani mjesec.
async function generateMonthlyPayslips(req, res) {
  try {
    const organizationId = parseId(req.query.organizationId);
    const year = parseId(req.query.year);
    const month = parseId(req.query.month);
    const paymentDateRaw = String(req.query.paymentDate || "").slice(0, 10);
    const queryPaymentDate = /^\d{4}-\d{2}-\d{2}$/.test(paymentDateRaw)
      ? paymentDateRaw
      : null;

    if (!organizationId || !year || !month) {
      return res.status(400).json({ ok: false, error: "Missing parameters" });
    }
    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const nazivDokumenta = await getPayslipNaziv(req.user.id);
    const bundle = await buildMonthlyPayslipsBundle(
      org,
      year,
      month,
      queryPaymentDate,
      nazivDokumenta,
    );
    if (!bundle) {
      return res.status(404).json({ ok: false, error: "NO_PAYROLLS" });
    }
    const { pdfBytes, pages } = bundle;
    const fnamePrefix =
      nazivDokumenta === "PLATNA_LISTA" ? "platne-liste" : "platni-listici";
    const fname = `${fnamePrefix}-${year}-${String(month).padStart(2, "0")}.pdf`;
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

    // Hierarchy: query param > payroll snapshot iz DB > zadnji dan mjeseca
    const paymentDate = /^\d{4}-\d{2}-\d{2}$/.test(paymentDateRaw)
      ? paymentDateRaw
      : payroll.paymentDate
        ? String(payroll.paymentDate).slice(0, 10)
        : new Date(payroll.year, payroll.month, 0).toISOString().slice(0, 10);

    const worker = await Worker.findOne({
      where: { id: payroll.workerId, organizationId: payroll.organizationId },
    });
    if (!worker) return res.status(404).json({ ok: false, error: "Worker not found" });

    // Vlasnik obrta nema platni listić — generiše se Obrazac 2002.
    if (org.type === "BUSINESS" && worker.role === "VLASNIK") {
      return res.status(400).json({
        ok: false,
        error: "VLASNIK_OBRT_NO_PAYSLIP",
        message: "Vlasnik obrta nema platni listić, koristi Obrazac 2002.",
      });
    }

    const workerPlain = worker.toJSON ? worker.toJSON() : worker;
    if (workerPlain.jmbg) {
      try { workerPlain.jmbg = decryptJmbg(workerPlain.jmbg); }
      catch { workerPlain.jmbg = ""; }
    }

    const nazivDokumenta = await getPayslipNaziv(req.user.id);
    const pdf = await PDFDocument.create();
    const fonts = await embedFonts(pdf);
    const memorandumImage = await embedMemorandum(pdf, ucitajMemorandum(org));
    addPayslipPage(pdf, payroll.toJSON(), org.toJSON(), workerPlain, paymentDate, fonts, {
      nazivDokumenta,
      memorandumImage,
    });
    const pdfBytes = Buffer.from(await pdf.save());

    const workerName = `${worker.firstName}_${worker.lastName}`.replace(/[^A-Za-z0-9_]/g, "_");
    const fnamePrefix =
      nazivDokumenta === "PLATNA_LISTA" ? "platna-lista" : "platni-listic";
    const fname = `${fnamePrefix}-${workerName}-${payroll.year}-${String(payroll.month).padStart(2, "0")}.pdf`;
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

// Helper: izgenerišu PDF bytes platnog listića za jedan payroll. Reuse iz
// generateWorkerPayslip pa email endpoint nije duplicirao logiku.
//
// Vraća null ako ne postoji ili je vlasnik obrta (skip-language). Caller
// može razlikovati skip vs error provjerom skipReason u rezultatu.
async function buildPayslipPdf(payroll, paymentDate, nazivDokumenta = null) {
  const org = await Organization.findByPk(payroll.organizationId);
  if (!org) return null;
  const worker = await Worker.findOne({
    where: { id: payroll.workerId, organizationId: payroll.organizationId },
  });
  if (!worker) return null;
  // Vlasnik obrta nema platni listić — ide u Obrazac 2002.
  if (org.type === "BUSINESS" && worker.role === "VLASNIK") {
    return { skipReason: "VLASNIK_OBRT", org, worker };
  }
  const workerPlain = worker.toJSON ? worker.toJSON() : worker;
  if (workerPlain.jmbg) {
    try { workerPlain.jmbg = decryptJmbg(workerPlain.jmbg); }
    catch { workerPlain.jmbg = ""; }
  }
  const pdf = await PDFDocument.create();
  const fonts = await embedFonts(pdf);
  const memorandumImage = await embedMemorandum(pdf, ucitajMemorandum(org));
  addPayslipPage(pdf, payroll.toJSON(), org.toJSON(), workerPlain, paymentDate, fonts, {
    nazivDokumenta,
    memorandumImage,
  });
  const pdfBytes = Buffer.from(await pdf.save());
  return { pdfBytes, org, worker };
}

// ── POST /api/payroll/:id/email-payslip ─────────────────────────────────────
// Pošalji platni listić jednom radniku na njegov email. Vraća { ok, sent_to }.
// Greške: 404 worker not found, 400 worker nema email.
async function emailWorkerPayslip(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
    const payroll = await Payroll.findByPk(id);
    if (!payroll) return res.status(404).json({ ok: false, error: "Payroll not found" });
    const org = await assertOrgAccess(payroll.organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const paymentDateRaw = String(req.body?.paymentDate || "").slice(0, 10);
    // Hierarchy: body override > payroll snapshot > zadnji dan mjeseca
    const paymentDate = /^\d{4}-\d{2}-\d{2}$/.test(paymentDateRaw)
      ? paymentDateRaw
      : payroll.paymentDate
        ? String(payroll.paymentDate).slice(0, 10)
        : new Date(payroll.year, payroll.month, 0).toISOString().slice(0, 10);

    const nazivDokumenta = await getPayslipNaziv(req.user.id);
    const built = await buildPayslipPdf(payroll, paymentDate, nazivDokumenta);
    if (!built) return res.status(404).json({ ok: false, error: "Worker not found" });
    if (built.skipReason === "VLASNIK_OBRT") {
      return res.status(400).json({
        ok: false,
        error: "VLASNIK_OBRT_NO_PAYSLIP",
        message: "Vlasnik obrta nema platni listić, koristi Obrazac 2002.",
      });
    }
    const { pdfBytes, worker } = built;

    if (!worker.email || !worker.email.trim()) {
      return res.status(400).json({
        ok: false,
        error: "WORKER_NO_EMAIL",
        message: "Radnik nema upisan email. Dodajte email u profilu radnika.",
      });
    }

    const { sendPayslipEmail } = require("../utils/mailer");
    await sendPayslipEmail({
      to: worker.email.trim(),
      workerName: `${worker.firstName} ${worker.lastName}`.trim(),
      organizationName: org.name,
      year: payroll.year,
      month: payroll.month,
      netAmount: iznosZaIsplatu(payroll),
      pdfBuffer: pdfBytes,
      nazivDokumenta,
    });

    return res.json({ ok: true, data: { sentTo: worker.email.trim() } });
  } catch (e) {
    console.error("emailWorkerPayslip failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "INTERNAL_ERROR" });
  }
}

// ── POST /api/payroll/email-payslips-bulk ───────────────────────────────────
// Bulk pošalji platne listiće za sve radnike u (orgId, year, month) koji imaju
// email. Radnici bez email-a se prijavljuju u skipped listi (ne fail-uje cijela
// operacija). Vraća { sent: N, skipped: [{ workerId, name, reason }], failed: [...] }.
async function emailMonthlyPayslipsBulk(req, res) {
  try {
    const organizationId = parseId(req.body?.organizationId);
    const year = parseId(req.body?.year);
    const month = parseId(req.body?.month);
    if (!organizationId || !year || !month) {
      return res.status(400).json({ ok: false, error: "Missing organizationId/year/month" });
    }
    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const paymentDateRaw = String(req.body?.paymentDate || "").slice(0, 10);
    const queryPaymentDate = /^\d{4}-\d{2}-\d{2}$/.test(paymentDateRaw)
      ? paymentDateRaw
      : null;

    // Mod "sve na jedan email": svi listići mjeseca u jednom PDF-u na upisanu
    // adresu (npr. email firme, pa oni štampaju i uruče radnicima ručno).
    const toEmailRaw = String(req.body?.toEmail || "").trim();
    if (toEmailRaw) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmailRaw)) {
        return res.status(400).json({ ok: false, error: "INVALID_EMAIL" });
      }
      const nazivBundlea = await getPayslipNaziv(req.user.id);
      const bundle = await buildMonthlyPayslipsBundle(
        org,
        year,
        month,
        queryPaymentDate,
        nazivBundlea,
      );
      if (!bundle) {
        return res
          .status(400)
          .json({ ok: false, error: "Nema obračunatih plata za taj mjesec" });
      }
      const { sendPayslipsBundleEmail } = require("../utils/mailer");
      await sendPayslipsBundleEmail({
        to: toEmailRaw,
        organizationName: org.name,
        year,
        month,
        count: bundle.pages,
        pdfBuffer: bundle.pdfBytes,
        nazivDokumenta: nazivBundlea,
      });
      return res.json({
        ok: true,
        data: {
          mode: "single",
          sentTo: toEmailRaw,
          count: bundle.pages,
          sent: 1,
          skipped: [],
          failed: [],
          totalProcessed: bundle.pages,
        },
      });
    }

    const payrolls = await Payroll.findAll({
      where: { organizationId, year, month, status: { [Op.in]: ["OBRACUNATO", "ISPLACENO"] } },
    });
    // Hierarchy: body override > payroll snapshot > zadnji dan mjeseca
    const payrollPaymentDate =
      payrolls.find((p) => p.paymentDate)?.paymentDate || null;
    const paymentDate =
      queryPaymentDate ||
      (payrollPaymentDate ? String(payrollPaymentDate).slice(0, 10) : null) ||
      new Date(year, month, 0).toISOString().slice(0, 10);
    if (payrolls.length === 0) {
      return res.status(400).json({ ok: false, error: "Nema obračunatih plata za taj mjesec" });
    }

    const { sendPayslipEmail } = require("../utils/mailer");
    const nazivDokumenta = await getPayslipNaziv(req.user.id);
    let sent = 0;
    const skipped = [];
    const failed = [];

    for (const p of payrolls) {
      try {
        const built = await buildPayslipPdf(p, paymentDate, nazivDokumenta);
        if (!built) {
          failed.push({ workerId: p.workerId, name: "?", reason: "Radnik ne postoji" });
          continue;
        }
        // Vlasnik obrta — tihi skip, nije greška. On nema platni listić.
        if (built.skipReason === "VLASNIK_OBRT") {
          const wn = `${built.worker.firstName} ${built.worker.lastName}`.trim();
          skipped.push({
            workerId: built.worker.id,
            name: wn,
            reason: "Vlasnik obrta (nema platni listić)",
          });
          continue;
        }
        const { pdfBytes, worker } = built;
        const name = `${worker.firstName} ${worker.lastName}`.trim();
        if (!worker.email || !worker.email.trim()) {
          skipped.push({ workerId: worker.id, name, reason: "Nema upisan email" });
          continue;
        }
        await sendPayslipEmail({
          to: worker.email.trim(),
          workerName: name,
          organizationName: org.name,
          year: p.year,
          month: p.month,
          netAmount: iznosZaIsplatu(p),
          pdfBuffer: pdfBytes,
          nazivDokumenta,
        });
        sent += 1;
      } catch (e) {
        console.error(`bulk payslip email failed for payroll ${p.id}:`, e);
        failed.push({
          workerId: p.workerId,
          name: "?",
          reason: e?.message || "Greška slanja",
        });
      }
    }

    return res.json({
      ok: true,
      data: { sent, skipped, failed, totalProcessed: payrolls.length },
    });
  } catch (e) {
    console.error("emailMonthlyPayslipsBulk failed:", e);
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

// ── POST /api/payroll/payment-date ──────────────────────────────────────────
// Postavlja paymentDate na sve payroll-e u (organizationId, year, month).
// Datum se koristi za MIP-1023 XML, platne liste i uplatnice. Body:
//   { organizationId, year, month, paymentDate: "YYYY-MM-DD" | null }
async function setPaymentDate(req, res) {
  try {
    const organizationId = parseId(req.body?.organizationId);
    const year = parseId(req.body?.year);
    const month = parseId(req.body?.month);
    const rawDate = req.body?.paymentDate;
    if (!organizationId || !year || !month) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing organizationId/year/month" });
    }
    const paymentDate =
      rawDate == null || rawDate === ""
        ? null
        : /^\d{4}-\d{2}-\d{2}$/.test(String(rawDate))
          ? String(rawDate)
          : null;
    if (rawDate && !paymentDate) {
      return res.status(400).json({ ok: false, error: "Invalid paymentDate format (expected YYYY-MM-DD)" });
    }
    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const [updatedCount] = await Payroll.update(
      { paymentDate },
      { where: { organizationId, year, month } },
    );
    return res.json({ ok: true, data: { updated: updatedCount, paymentDate } });
  } catch (e) {
    console.error("setPaymentDate failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "INTERNAL_ERROR" });
  }
}

// ── POST /api/payroll/mark-mip-downloaded ───────────────────────────────────
// Zabilježi da je MIP-1023 XML za (organizationId, year, month) preuzet.
// XML se generiše client-side pa backend ne vidi sam download; frontend javi.
// Body: { organizationId, year, month }
async function markMipDownloaded(req, res) {
  try {
    const organizationId = parseId(req.body?.organizationId);
    const year = parseId(req.body?.year);
    const month = parseId(req.body?.month);
    if (!organizationId || !year || !month) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing organizationId/year/month" });
    }
    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const [updatedCount] = await Payroll.update(
      { mipDownloadedAt: new Date() },
      { where: { organizationId, year, month } },
    );
    return res.json({ ok: true, data: { updated: updatedCount } });
  } catch (e) {
    console.error("markMipDownloaded failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "INTERNAL_ERROR" });
  }
}

// ── GET /api/payroll/posting-accounts ───────────────────────────────────────
// Vraća default konta + korisnikove izmjene (agencijska konvencija).
async function getPostingAccounts(req, res) {
  const user = await User.findByPk(req.user.id, {
    attributes: ["id", "postingAccounts"],
  });
  let overrides = user?.postingAccounts || {};
  if (typeof overrides === "string") {
    // MariaDB JSON kolona zna vratiti string; parsiraj.
    try {
      overrides = JSON.parse(overrides);
    } catch {
      overrides = {};
    }
  }
  // __split je zastavica moda dugovne strane (ne konto), izdvoji je.
  const splitByContribution = overrides && overrides.__split === true;
  const accountOverrides = { ...overrides };
  delete accountOverrides.__split;
  return res.json({
    ok: true,
    data: {
      items: POSTING_ITEMS,
      burdenItems: BURDEN_DEBIT_ITEMS,
      defaults: DEFAULT_POSTING_ACCOUNTS,
      overrides: accountOverrides,
      resolved: resolveAccounts(accountOverrides),
      splitByContribution: !!splitByContribution,
    },
  });
}

// ── PUT /api/payroll/posting-accounts ───────────────────────────────────────
// Snima samo izmjene konta (po stavci, strane d/p). Default ostaje u kodu.
async function savePostingAccounts(req, res) {
  const incoming = req.body?.postingAccounts;
  if (incoming == null || typeof incoming !== "object") {
    return res.status(400).json({ ok: false, error: "INVALID_PAYLOAD" });
  }
  const splitByContribution = req.body?.splitByContribution === true;
  const validKeys = new Set([
    ...POSTING_ITEMS.map((i) => i.key),
    ...BURDEN_DEBIT_ITEMS.map((i) => i.key),
  ]);
  const isKonto = (s) => /^\d{3}-\d{4}$/.test(String(s).trim());
  const clean = {};
  for (const [key, val] of Object.entries(incoming)) {
    if (!validKeys.has(key) || !val || typeof val !== "object") continue;
    const entry = {};
    if (val.d && isKonto(val.d)) entry.d = String(val.d).trim();
    if (val.p && isKonto(val.p)) entry.p = String(val.p).trim();
    if (Object.keys(entry).length) clean[key] = entry;
  }
  // Isto konto ne smije biti i na trošku (duguje) i na obavezi (potražuje).
  // Gledamo SAMO konta koja se stvarno knjiže u odabranom modu: potražna su
  // uvijek po fondu (POSTING_ITEMS.p), a dugovna zavise od splitByContribution
  // (po fondu = POSTING_ITEMS.d, po nosiocu = PO_NOSIOCU_DEBIT_ORDER).
  const resolved = resolveAccounts(clean);
  const debitKeys = splitByContribution
    ? POSTING_ITEMS.map((i) => i.key)
    : PO_NOSIOCU_DEBIT_ORDER;
  const dSet = new Set(debitKeys.map((k) => resolved[k]?.d).filter(Boolean));
  const pSet = new Set(
    POSTING_ITEMS.map((i) => resolved[i.key]?.p).filter(Boolean),
  );
  const conflict = [...dSet].filter((k) => pSet.has(k));
  if (conflict.length) {
    return res.status(400).json({
      ok: false,
      error: "KONTO_NA_OBJE_STRANE",
      konta: conflict,
    });
  }
  // Mod dugovne strane: pamtimo zastavicu samo kad odstupa od defaulta
  // (default = po nosiocu, splitByContribution=false).
  if (splitByContribution) clean.__split = true;
  await User.update(
    { postingAccounts: clean },
    { where: { id: req.user.id } },
  );
  return res.json({ ok: true, data: { overrides: clean, splitByContribution } });
}

// ── PUT /api/payroll/combine-kantonal ───────────────────────────────────────
// Agencijska opcija: objedini kantonalne uplatnice po kantonu (sve org-e).
async function setCombineKantonal(req, res) {
  const v = !!req.body?.combineKantonal;
  await User.update(
    { combineKantonalUplatnice: v },
    { where: { id: req.user.id } },
  );
  return res.json({ ok: true, data: { combineKantonal: v } });
}

// ── POST /api/payroll/posting-order ─────────────────────────────────────────
// Generiše PDF nalog za knjiženje plate za (organizacija, mjesec). Doprinosi
// iz+na osnovicu se sabiraju po vrsti; bruto se ne knjiži kao zaseban red.
async function generatePostingOrder(req, res) {
  try {
    const organizationId = parseId(req.body.organizationId);
    const year = parseId(req.body.year);
    const month = parseId(req.body.month);
    if (!organizationId || !year || !month) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing organizationId/year/month" });
    }
    if (year < 2000 || year > 2100 || month < 1 || month > 12) {
      return res.status(400).json({ ok: false, error: "INVALID_PERIOD" });
    }

    const org = await assertOrgAccess(organizationId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const existingWorkers = await Worker.findAll({
      where: { organizationId },
      attributes: ["id"],
    });
    const validWorkerIds = new Set(existingWorkers.map((w) => w.id));
    const rawPayrolls = await Payroll.findAll({
      where: { organizationId, year, month },
    });
    const payrolls = rawPayrolls.filter((p) => validWorkerIds.has(p.workerId));
    if (payrolls.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "NEMA_OBRACUNA_ZA_MJESEC" });
    }

    const workersAll = await Worker.findAll({
      where: { id: payrolls.map((p) => p.workerId), organizationId },
    });
    const workerMapAll = new Map(workersAll.map((w) => [w.id, w]));
    // Vlasnik OBRTA (BUSINESS) nema platu radnika, njegovi doprinosi se knjiže
    // odvojeno (2002), pa se izuzima iz naloga za plate. d.o.o. vlasnik koji
    // ima obračun (bio prijavljen tog mjeseca) ulazi normalno, kao i ostali
    // radnici, jer se dokument pravi iz obračuna, ne iz trenutnog modela.
    const isObrtOwner = (p) => {
      const w = workerMapAll.get(p.workerId);
      return org.type === "BUSINESS" && w?.role === "VLASNIK";
    };

    const t = {
      net: 0,
      gross: 0,
      empPio: 0,
      erpPio: 0,
      empZdr: 0,
      erpZdr: 0,
      empNezap: 0,
      erpNezap: 0,
      porez: 0,
      vodna: 0,
      nesrece: 0,
      meal: 0,
      regres: 0,
      travel: 0,
      // Korist u naravi: nenovčani "neto" dio (vrijednost koristi umanjena za
      // pripadajuće doprinose iz i porez). Doprinosi i porez koristi su već u
      // empTotal/incomeTax (pa rastu normalni redovi); ovdje ide samo preostali
      // nenovčani dio kao zaseban trošak + protustavka, da nalog bude potpun.
      koristNonCash: 0,
    };
    for (const p of payrolls) {
      // Nalog za knjiženje PLATE je samo za radnike. Vlasnik obrta (obrtnik)
      // ima svoje doprinose (Obrazac 2002) koji se knjiže odvojeno, pa se
      // ovdje potpuno izuzima (ni doprinosi mu ne ulaze u nalog).
      if (isObrtOwner(p)) continue;
      t.net += Number(p.net) || 0;
      t.gross += Number(p.gross) || 0;
      t.porez += Number(p.incomeTax) || 0;
      t.empPio += Number(p.empPio) || 0;
      t.erpPio += Number(p.erpPio) || 0;
      t.empZdr += Number(p.empZdravstvo) || 0;
      t.erpZdr += Number(p.erpZdravstvo) || 0;
      t.empNezap += Number(p.empNezaposlenost) || 0;
      t.erpNezap += Number(p.erpNezaposlenost) || 0;
      t.vodna += Number(p.vodnaNaknada) || 0;
      t.nesrece += Number(p.naknadaNesrece) || 0;
      t.meal += Number(p.mealAllowance) || 0;
      t.regres += Number(p.vacationBonus) || 0;
      t.travel += Number(p.travelExpense) || 0;
      const k = computeKorist(p.koristNetValue);
      if (k) t.koristNonCash += k.netoNonCash;
    }
    t.koristNonCash = +t.koristNonCash.toFixed(2);
    // Fond invalida (0,5% bruto) — samo privredna društva (COMPANY).
    t.invalidi = org.type === "BUSINESS" ? 0 : t.gross * FOND_INVALIDI_RATE;

    const user = await User.findByPk(req.user.id, {
      attributes: ["postingAccounts"],
    });
    let overrides = user?.postingAccounts || {};
    if (typeof overrides === "string") {
      try {
        overrides = JSON.parse(overrides);
      } catch {
        overrides = {};
      }
    }
    const splitByContribution = overrides && overrides.__split === true;
    const accountOverrides = { ...overrides };
    delete accountOverrides.__split;

    const order = buildPostingOrder(t, accountOverrides, !!splitByContribution);
    // Nema plata radnika za knjiženje (npr. obrt sa samo vlasnikom).
    if (order.rows.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "NEMA_PLATA_RADNIKA" });
    }
    const datumKnjizenja =
      typeof req.body.datumKnjizenja === "string" && req.body.datumKnjizenja
        ? req.body.datumKnjizenja.slice(0, 10)
        : lastDayOfMonthIso(year, month);

    const pdf = await generatePostingOrderPdf(order, {
      orgName: org.name,
      year,
      month,
      datumKnjizenja,
    });

    const fileName = `Nalog_za_knjizenje_${String(month).padStart(2, "0")}_${year}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    return res.send(pdf);
  } catch (e) {
    console.error("posting order generation failed:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "POSTING_ORDER_FAILED" });
  }
}

module.exports = {
  list,
  calculate,
  saveInputs,
  getPostingAccounts,
  savePostingAccounts,
  generatePostingOrder,
  setCombineKantonal,
  importPayrolls,
  patch,
  remove,
  generateUplatniceForPayroll,
  listDocuments,
  downloadDocument,
  deleteDocument,
  monthlySummary,
  generateMonthlyUplatnice,
  markMonthPaid,
  setPaymentDate,
  markMipDownloaded,
  generateMonthlyPayslips,
  generateWorkerPayslip,
  emailWorkerPayslip,
  emailMonthlyPayslipsBulk,
  // exported for tests / future reuse
  computePayrollSnapshot,
  STANDARD_MONTHLY_MINUTES,
  obustaveKartonaSticky,
  // TKDIS izvoz naloga (services/paymentExport/obracunAdapter) SAMO ČITA ove
  // helpere da nalozi budu identični uplatnicama; ne mijenja ih.
  buildAllUplatnice,
  getAccountInfo,
  VRSTA_SVRHA_MAP,
  // Korisnički izvoz naloga za e-bankarstvo (paymentExportController.bankExport)
  // koristi istu provjeru pristupa org-u i istu agencijsku opciju kao uplatnice.
  assertOrgAccess,
  getCombineKantonal,
};
