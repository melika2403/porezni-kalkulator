// Poslovni partneri obrta (kupci i dobavljači).
//
// Partneri se vežu za transakcije izvoda preko žiro računa: svaki račun
// partnera se čuva normalizovan (samo cifre), pa se stavke izvoda sa tim
// protivračunom automatski pripisuju partneru, i postojeće (backfill kod
// snimanja partnera) i buduće (kod upload-a izvoda).
const { Op, fn, col } = require("sequelize");
const {
  sequelize,
  Partner,
  PartnerOpeningBalance,
  BankTransaction,
  BankStatement,
  Invoice,
  Organization,
  OrganizationMember,
  UlazniRacun,
  Prebijanje,
  Kalkulacija,
  Razduzenje,
} = require("../models");
const {
  buildKarticaPdf,
  buildIosPdf,
  buildOpomenaPdf,
} = require("../utils/karticaPdf");
const { allocateFifo, r2 } = require("../utils/paymentAllocation");

// sintetički id reda početnog stanja u FIFO raspodjeli (Map ključ)
const OPENING_ID = "pocetno-stanje";
const {
  sendKarticaEmail,
  sendIosEmail,
  sendOpomenaEmail,
} = require("../utils/mailer");
const { logEvent } = require("./activityController");

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Samo cifre, za poređenje žiro računa i JIB-ova. */
function normalizeDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

// Pravne forme koje se ignorišu pri uparivanju naziva ("MEDIKA d.o.o." i
// "MEDIKA DOO" su isti partner).
const LEGAL_FORM_TOKENS = new Set([
  "doo", "dd", "jdoo", "pzu", "szr", "str", "sur", "szd", "tr", "ur",
  "od", "obrt", "jtd", "kd",
]);

/** Labava normalizacija naziva za uparivanje: mala slova, bez kvačica
 *  (Ć→C, Š→S...), bez interpunkcije i bez pravnih formi (doo, d.o.o....). */
function normalizeName(value) {
  const tokens = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // kvačice (č, ć, š, ž)
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, "") // interpunkcija bez razmaka: "d.o.o." → "doo"
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !LEGAL_FORM_TOKENS.has(t));
  return tokens.join(" ");
}

/** Normalizuj i očisti listu računa iz request body-ja. */
function cleanAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  const seen = new Set();
  const out = [];
  for (const a of accounts) {
    const norm = normalizeDigits(a);
    if (norm.length >= 8 && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}

/** Naziv + JIB (13 cifara) su obavezni; PDV broj 12 cifara ako postoji
 *  (upisan PDV broj = partner je PDV obveznik, bitno za KUF/KIF). */
function validatePayload(payload) {
  if (!payload.name) return "NAME_REQUIRED";
  if (!payload.jib || payload.jib.length !== 13) return "JIB_INVALID";
  if (payload.pdvBroj && payload.pdvBroj.length !== 12) return "PDV_INVALID";
  return null;
}

function partnerPayload(body) {
  return {
    name: String(body.name || "").trim(),
    jib: normalizeDigits(body.jib) || null,
    pdvBroj: normalizeDigits(body.pdvBroj) || null,
    address: String(body.address || "").trim() || null,
    city: String(body.city || "").trim() || null,
    email: String(body.email || "").trim() || null,
    phone: String(body.phone || "").trim() || null,
    accounts: cleanAccounts(body.accounts),
    isKupac: Boolean(body.isKupac),
    isDobavljac: Boolean(body.isDobavljac),
    note: String(body.note || "").trim() || null,
  };
}

/**
 * Poveži postojeće transakcije organizacije sa partnerom: po žiro računu
 * (pouzdano) ili po labavo normalizovanom nazivu protivstrane (kvačice,
 * velika/mala slova i pravne forme se ignorišu).
 *
 * Samo DODAJE veze i to samo stavkama koje ni na koga nisu vezane. Izmjena
 * partnera ne smije ništa skinuti sa njegove kartice: ručno povezane stavke
 * (korisnik ih je vezao na prozoru izvoda, često bez poklapanja naziva) ostaju,
 * kao i stavke vezane za drugog partnera. Veza se skida samo ručno, na stavci.
 */
async function relinkTransactions(partner) {
  const accounts = Array.isArray(partner.accounts) ? partner.accounts : [];
  const pName = normalizeName(partner.name);
  const candidates = await BankTransaction.findAll({
    where: { organizationId: partner.organizationId, partnerId: null },
    attributes: ["id", "counterpartyAccount", "counterpartyName", "category"],
    raw: true,
  });
  const ids = candidates
    .filter(
      (t) =>
        // provizija banke i sl. često nose ime partnera u opisu, ali nisu
        // njegov promet pa se ne vežu na karticu
        !isNonPartnerCategory(t.category) &&
        (accounts.includes(normalizeDigits(t.counterpartyAccount)) ||
          (pName && normalizeName(t.counterpartyName) === pName)),
    )
    .map((t) => t.id);
  if (ids.length === 0) return 0;
  await BankTransaction.update(
    { partnerId: partner.id },
    { where: { id: { [Op.in]: ids } } },
  );
  return ids.length;
}

/** Nakon vezanja transakcija: potvrđene isplate možda zatvaraju otvorene
 *  ulazne račune partnera (npr. izvod je stigao prije unosa računa). */
async function settleOpenRacuni(partner) {
  const open = await UlazniRacun.findAll({
    where: {
      organizationId: partner.organizationId,
      partnerId: partner.id,
      status: "OTVOREN",
    },
  });
  for (const racun of open) {
    await tryMatchExistingPayment(racun);
  }
}

/** Matcher transakcija → partnerId za upload izvoda: prvo žiro račun,
 *  pa labavo normalizovan naziv protivstrane. */
async function loadPartnerMatcher(organizationId) {
  const partners = await Partner.findAll({
    where: { organizationId },
    attributes: ["id", "name", "accounts"],
    raw: true,
  });
  const byAccount = new Map();
  const byName = new Map();
  for (const p of partners) {
    const accounts = Array.isArray(p.accounts)
      ? p.accounts
      : typeof p.accounts === "string"
        ? JSON.parse(p.accounts || "[]")
        : [];
    for (const a of accounts) {
      const norm = normalizeDigits(a);
      if (norm.length >= 8) byAccount.set(norm, p.id);
    }
    const n = normalizeName(p.name);
    if (n) byName.set(n, p.id);
  }
  const match = (tx) =>
    byAccount.get(normalizeDigits(tx.counterpartyAccount)) ??
    byName.get(normalizeName(tx.counterpartyName)) ??
    null;
  // naučeno pravilo može pokazivati na obrisanog partnera, pa pozivalac kroz
  // ovo provjeri da li id još postoji u organizaciji (bez novog upita)
  const postojeci = new Set(partners.map((p) => p.id));
  match.postoji = (id) => !!id && postojeci.has(Number(id));
  return match;
}

/** Sljedeća slobodna šifra partnera u organizaciji. */
async function nextPartnerCode(organizationId) {
  const max = await Partner.max("code", { where: { organizationId } });
  return (Number(max) || 0) + 1;
}

// GET /api/partners/:orgId — lista sa prometom i otvorenim fakturama
async function list(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  let partners = await Partner.findAll({
    where: { organizationId },
    order: [["name", "ASC"]],
  });

  // backfill šifri za partnere unesene prije numeracije
  const missingCode = partners.filter((p) => p.code == null);
  if (missingCode.length > 0) {
    let next = await nextPartnerCode(organizationId);
    for (const p of missingCode) {
      await p.update({ code: next });
      next += 1;
    }
    partners = await Partner.findAll({
      where: { organizationId },
      order: [["name", "ASC"]],
    });
  }

  // ?year=GGGG: promet, broj transakcija i zadnja aktivnost se računaju za
  // tu godinu; dugovi (otvorene stavke) su UVIJEK živi, bez obzira na godinu
  const year = Number(req.query.year) || null;
  const yearWhere = year
    ? { date: { [Op.gte]: `${year}-01-01`, [Op.lte]: `${year}-12-31` } }
    : {};

  // promet po partneru (potvrđene stavke; provizije banke i sl. ne ulaze
  // u promet partnera ni kad su greškom vezane)
  const sums = await BankTransaction.findAll({
    where: {
      organizationId,
      partnerId: { [Op.ne]: null },
      status: "CONFIRMED",
      ...PARTNER_CATEGORY_WHERE,
      ...yearWhere,
    },
    attributes: [
      "partnerId",
      "direction",
      [fn("SUM", col("amount")), "total"],
      [fn("COUNT", col("id")), "cnt"],
      [fn("MAX", col("date")), "lastDate"],
    ],
    group: ["partnerId", "direction"],
    raw: true,
  });
  const byPartner = new Map();
  for (const row of sums) {
    const entry = byPartner.get(row.partnerId) || {
      totalIn: 0,
      totalOut: 0,
      txCount: 0,
      lastDate: null,
    };
    const total = Number(row.total) || 0;
    if (row.direction === "IN") entry.totalIn += total;
    else entry.totalOut += total;
    entry.txCount += Number(row.cnt) || 0;
    if (!entry.lastDate || (row.lastDate && row.lastDate > entry.lastDate)) {
      entry.lastDate = row.lastDate;
    }
    byPartner.set(row.partnerId, entry);
  }

  // izlazne fakture (izdane + naplaćene), vezane po JIB-u ili nazivu:
  // otvorene čine "njihov dug" (uvijek žive), a fakturisano se kod godišnjeg
  // pregleda broji samo za izabranu godinu
  const openInvoices = await Invoice.findAll({
    where: { organizationId, type: "INVOICE", status: { [Op.in]: ["ISSUED", "PAID"] } },
    attributes: [
      "id",
      "buyerName",
      "buyerIdNumber",
      "grossTotal",
      "status",
      "issueDate",
      "docType",
    ],
    raw: true,
  });
  // normalizacija kupca jednom po fakturi (uparivanje ide partner × faktura)
  const invoiceIndex = openInvoices.map((inv) => ({
    ...inv,
    jibNorm: normalizeDigits(inv.buyerIdNumber),
    nameNorm: normalizeName(inv.buyerName),
  }));

  // Početna stanja (migracija): otvoreni dio ulazi u žive dugove. Obje strane
  // donosa ulaze direktno u FIFO obračun ispod, kao najstariji dokument na
  // kartici (kupčeva strana uz fakture, dobavljačka uz ulazne račune).
  const openingRows = await PartnerOpeningBalance.findAll({
    where: { organizationId },
    raw: true,
  });
  const openingByPartner = new Map(
    openingRows.map((r) => [
      r.partnerId,
      {
        kupac: Number(r.kupacIznos) || 0,
        dobavljac: Number(r.dobavljacIznos) || 0,
        godina: Number(String(r.datum).slice(0, 4)) || 0,
        datum: String(r.datum).slice(0, 10),
      },
    ]),
  );

  // Ulazni računi po partneru. "Naš dug" (otvoreno) se izvodi FIFO
  // alokacijom potvrđenih plaćanja, ISTOM logikom kao kartica partnera
  // (listUlazniRacuni): sirovi status računa nije dovoljan jer račun
  // plaćen zbirnom/nevezanom isplatom ostaje OTVOREN u bazi, pa je lista
  // (tab Svi aktivni) pokazivala dug tamo gdje kartica pokazuje 0.
  const racuniRows = await UlazniRacun.findAll({
    where: { organizationId },
    attributes: [
      "id",
      "partnerId",
      "iznos",
      "datumRacuna",
      "status",
      "vrstaDokumenta",
      "samoEvidencija",
    ],
    raw: true,
  });
  // pool plaćanja: potvrđene OUT isplate partnera koje nisu vezane za
  // konkretan račun (vezane su svoj račun već označile PLACEN); ista
  // definicija kao unlinkedOut na kartici partnera (uklj. filter kategorija
  // koje nisu partnerske, npr. provizije banke)
  const paidRows = await BankTransaction.findAll({
    where: {
      organizationId,
      direction: "OUT",
      status: "CONFIRMED",
      partnerId: { [Op.ne]: null },
      ulazniRacunId: null,
      ...PARTNER_CATEGORY_WHERE,
    },
    attributes: ["partnerId", [fn("SUM", col("amount")), "paid"]],
    group: ["partnerId"],
    raw: true,
  });
  const paidByPartner = new Map(
    paidRows.map((x) => [x.partnerId, Number(x.paid) || 0]),
  );
  // pool naplate: potvrđene IN uplate partnera koje nisu vezane za konkretnu
  // fakturu (vezana uplata je svoju fakturu već zatvorila); ista definicija
  // kao unlinkedIn na kartici partnera
  const receivedRows = await BankTransaction.findAll({
    where: {
      organizationId,
      direction: "IN",
      status: "CONFIRMED",
      partnerId: { [Op.ne]: null },
      invoiceId: null,
      ...PARTNER_CATEGORY_WHERE,
    },
    attributes: ["partnerId", [fn("SUM", col("amount")), "received"]],
    group: ["partnerId"],
    raw: true,
  });
  const receivedByPartner = new Map(
    receivedRows.map((x) => [x.partnerId, Number(x.received) || 0]),
  );

  const isKreditRacun = (r) =>
    r.vrstaDokumenta === "KNJIZNA_OBAVIJEST" ||
    r.vrstaDokumenta === "STORNO_AVANSNE";
  const racuniByPartner = new Map();
  for (const r of racuniRows) {
    if (r.partnerId == null) continue;
    if (!racuniByPartner.has(r.partnerId)) racuniByPartner.set(r.partnerId, []);
    racuniByPartner.get(r.partnerId).push(r);
  }
  // partneri sa računima ILI donosom na dobavljačkoj strani
  const dobPartnerIds = new Set(racuniByPartner.keys());
  for (const [pid, o] of openingByPartner) {
    if (o.dobavljac !== 0) dobPartnerIds.add(pid);
  }
  // partnerId -> { total: otvoreno (FIFO), count, racuniCount, racuniTotal }
  const payablesByPartner = new Map();
  for (const pid of dobPartnerIds) {
    const list = racuniByPartner.get(pid) || [];
    const opening = openingByPartner.get(pid);
    const donos = opening ? opening.dobavljac : 0;
    const kreditSum = list
      .filter(isKreditRacun)
      .reduce((s, r) => s + (Number(r.iznos) || 0), 0);
    // negativan donos = naš avans kod dobavljača: umanjuje dug kroz pool
    const pool =
      (paidByPartner.get(pid) || 0) + kreditSum + Math.max(0, -donos);
    const docs = list.map((r) => ({
      id: r.id,
      iznos: Number(r.iznos) || 0,
      datum: String(r.datumRacuna).slice(0, 10),
      manualPlacen: r.status === "PLACEN",
      // samoEvidencija (uvoz/JCI) nije obaveza prema dobavljaču, van FIFO-a
      kredit: isKreditRacun(r) || Boolean(r.samoEvidencija),
    }));
    // donos je najstariji dokument na kartici: ulazi u FIFO prvi, pa ga
    // nevezana plaćanja zatvaraju prije računa (isto kao na kartici)
    if (donos > 0) {
      docs.push({
        id: -pid,
        iznos: donos,
        datum: (opening && opening.datum) || "0000-01-01",
        manualPlacen: false,
        kredit: false,
      });
    }
    const alloc = allocateFifo(docs, pool);
    let otvoreno = 0;
    let count = 0;
    for (const d of docs) {
      const v = alloc.get(d.id);
      if (v && v.preostalo > 0.005) {
        otvoreno += v.preostalo;
        count += 1;
      }
    }
    payablesByPartner.set(pid, {
      total: r2(otvoreno),
      count,
      racuniCount: list.length,
      racuniTotal: r2(
        list.reduce((s, r) => s + (Number(r.iznos) || 0), 0),
      ),
    });
  }

  // Izlazne fakture po partneru. "Njihov dug" (otvoreno) se izvodi ISTOM FIFO
  // alokacijom kao na kartici partnera (kartica): sirovi status fakture nije
  // dovoljan jer faktura naplaćena zbirnom/nevezanom uplatom ostaje ISSUED u
  // bazi, pa je lista pokazivala dug tamo gdje kartica pokazuje 0.
  const isKreditFaktura = (i) =>
    i.docType === "KNJIZNA_OBAVIJEST" || i.docType === "STORNO_AVANSNE";
  // partnerId -> { total, count, invoicesTotal (godina) }
  const receivablesByPartner = new Map();
  for (const p of partners) {
    const pJib = normalizeDigits(p.jib);
    const pName = normalizeName(p.name);
    const opening = openingByPartner.get(p.id);
    const donos = opening ? opening.kupac : 0;
    const mine = invoiceIndex.filter(
      (inv) =>
        (pJib && inv.jibNorm === pJib) || inv.nameNorm === pName,
    );
    let invoicesTotal = 0;
    for (const inv of mine) {
      if (!year || String(inv.issueDate).slice(0, 4) === String(year)) {
        invoicesTotal += Number(inv.grossTotal) || 0;
      }
    }
    if (mine.length === 0 && donos === 0) {
      receivablesByPartner.set(p.id, { total: 0, count: 0, invoicesTotal: 0 });
      continue;
    }
    // knjižne obavijesti / storna avansnih umanjuju dug, idu u pool
    const kreditSum = mine
      .filter(isKreditFaktura)
      .reduce((s, i) => s + (Number(i.grossTotal) || 0), 0);
    // negativan donos = kupčev avans kod nas: umanjuje dug kroz pool
    const pool =
      (receivedByPartner.get(p.id) || 0) + kreditSum + Math.max(0, -donos);
    const docs = mine.map((i) => ({
      id: i.id,
      iznos: Number(i.grossTotal) || 0,
      datum: String(i.issueDate).slice(0, 10),
      manualPlacen: i.status === "PAID",
      kredit: isKreditFaktura(i),
    }));
    // donos je najstariji dokument na kartici: ulazi u FIFO prvi
    if (donos > 0) {
      docs.push({
        id: -p.id,
        iznos: donos,
        datum: (opening && opening.datum) || "0000-01-01",
        manualPlacen: false,
        kredit: false,
      });
    }
    const alloc = allocateFifo(docs, pool);
    let otvoreno = 0;
    let count = 0;
    for (const d of docs) {
      const v = alloc.get(d.id);
      if (v && v.preostalo > 0.005) {
        otvoreno += v.preostalo;
        count += 1;
      }
    }
    receivablesByPartner.set(p.id, {
      total: r2(otvoreno),
      count,
      invoicesTotal: r2(invoicesTotal),
    });
  }

  const data = partners.map((p) => {
    const stats = byPartner.get(p.id) || {
      totalIn: 0,
      totalOut: 0,
      txCount: 0,
      lastDate: null,
    };
    const rec = receivablesByPartner.get(p.id) || {
      total: 0,
      count: 0,
      invoicesTotal: 0,
    };
    const pay = payablesByPartner.get(p.id) || {
      total: 0,
      count: 0,
      racuniCount: 0,
      racuniTotal: 0,
    };
    // obje strane donosa (početno stanje) su već u FIFO obračunu
    // (receivablesByPartner / payablesByPartner)
    const opening = openingByPartner.get(p.id);
    // Početno stanje je donos na kartici, pa ulazi i u dugovnu/potražnu
    // stranu liste: inače lista i kartica pokazuju različit saldo. Predznak se
    // čuva (negativno stanje je avans, umanjuje stranu na kojoj stoji). U
    // godišnjem pregledu ulazi samo ako je do te godine i nastalo: stanje
    // uneseno kasnije ne smije viriti u raniju godinu.
    const donosVazi = !!opening && (!year || opening.godina <= year);
    const openingKupacUkupno = donosVazi ? opening.kupac : 0;
    const openingDobUkupno = donosVazi ? opening.dobavljac : 0;
    return {
      ...p.toJSON(),
      accounts: Array.isArray(p.accounts) ? p.accounts : [],
      stats: {
        ...stats,
        openInvoicesTotal: r2(rec.total),
        openInvoicesCount: rec.count,
        invoicesTotal: r2(rec.invoicesTotal + openingKupacUkupno),
        openPayablesTotal: r2(pay.total),
        openPayablesCount: pay.count,
        racuniCount: pay.racuniCount,
        racuniTotal: r2(pay.racuniTotal + openingDobUkupno),
      },
    };
  });

  return res.json({ ok: true, data });
}

// Kategorije čija protivstrana NIJE poslovni partner: javni prihodi, vlastiti
// novac (pazar, prenosi, pozajmice vlasnika), banka (provizije, krediti),
// plate radnika. Njihove stavke ne prave prijedlog partnera, ne vežu se
// automatski na partnera i ne ulaze u karticu/statistiku partnera.
const NON_PARTNER_CATEGORIES = [
  "DOPRINOSI_PODUZETNIKA",
  "POREZ_DOHODAK_VLASNIKA",
  "PDV_UIO",
  "POVRAT_PDV",
  "DOPRINOSI_ZAPOSLENIKA",
  "POREZI_PLATE",
  "CLANARINE_TAKSE",
  "PAZAR",
  "PRENOS_IZMEDJU_RACUNA",
  "POZAJMICA_VLASNIKA",
  "POVRAT_POZAJMICE",
  "KREDIT_PRILIV",
  "RATA_KREDITA",
  "PROVIZIJA_BANKE",
  "PLATE_ZAPOSLENIKA",
  "OSTALO_BEZ_KPR",
];
const NON_PARTNER_CATEGORY_SET = new Set(NON_PARTNER_CATEGORIES);

function isNonPartnerCategory(category) {
  return category != null && NON_PARTNER_CATEGORY_SET.has(category);
}

/** Sequelize where-uslov: stavke koje smiju u promet/karticu partnera. */
const PARTNER_CATEGORY_WHERE = {
  [Op.or]: [
    { category: null },
    { category: { [Op.notIn]: NON_PARTNER_CATEGORIES } },
  ],
};

/** Skriveni prijedlozi ("nije partner") iz profila organizacije. */
function parseSuggestionHides(org) {
  let list = org?.partnerSuggestionHides;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }
  return Array.isArray(list) ? list : [];
}

// GET /api/partners/:orgId/suggestions — kandidati iz izvoda i faktura
async function suggestions(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const existing = await Partner.findAll({
    where: { organizationId },
    attributes: ["name", "jib", "accounts"],
    raw: true,
  });
  const knownAccounts = new Set();
  const knownNames = new Set();
  const knownJibs = new Set();
  for (const p of existing) {
    knownNames.add(normalizeName(p.name));
    if (p.jib) knownJibs.add(normalizeDigits(p.jib));
    const accounts = Array.isArray(p.accounts)
      ? p.accounts
      : typeof p.accounts === "string"
        ? JSON.parse(p.accounts || "[]")
        : [];
    for (const a of accounts) knownAccounts.add(normalizeDigits(a));
  }

  // skriveni prijedlozi ("nije partner") + vlastiti računi obrta (prenos
  // između računa i polog pazara nose vlastiti račun kao protivračun)
  const org = await Organization.findByPk(organizationId, {
    attributes: ["id", "bankAccount", "bankAccounts", "partnerSuggestionHides"],
  });
  const hides = parseSuggestionHides(org);
  const hiddenAccounts = new Set(
    hides.map((h) => normalizeDigits(h?.account)).filter((a) => a.length >= 8),
  );
  const hiddenNames = new Set(
    hides.map((h) => normalizeName(h?.name)).filter(Boolean),
  );
  const ownAccounts = new Set();
  if (org?.bankAccount) ownAccounts.add(normalizeDigits(org.bankAccount));
  let orgAccList = org?.bankAccounts;
  if (typeof orgAccList === "string") {
    try {
      orgAccList = JSON.parse(orgAccList);
    } catch {
      orgAccList = null;
    }
  }
  for (const a of Array.isArray(orgAccList) ? orgAccList : []) {
    const d = normalizeDigits(a);
    if (d) ownAccounts.add(d);
  }
  const ownStatements = await BankStatement.findAll({
    where: { organizationId, account: { [Op.ne]: null } },
    attributes: ["account"],
    raw: true,
  });
  for (const s of ownStatements) {
    const d = normalizeDigits(s.account);
    if (d) ownAccounts.add(d);
  }

  // kandidati sa izvoda: grupisano po protivračunu, bez stavki čija
  // kategorija kaže da protivstrana nije partner (javni prihodi, pazar,
  // prenosi, krediti, provizije, plate)
  const txRows = await BankTransaction.findAll({
    where: {
      organizationId,
      counterpartyAccount: { [Op.ne]: null },
      partnerId: null,
      ...PARTNER_CATEGORY_WHERE,
    },
    attributes: ["counterpartyAccount", "counterpartyName", "direction"],
    raw: true,
  });
  const byAccount = new Map();
  for (const t of txRows) {
    const acc = normalizeDigits(t.counterpartyAccount);
    if (acc.length < 8 || knownAccounts.has(acc)) continue;
    if (ownAccounts.has(acc) || hiddenAccounts.has(acc)) continue;
    const entry = byAccount.get(acc) || {
      account: acc,
      names: new Map(),
      hasIn: false,
      hasOut: false,
      txCount: 0,
    };
    const name = String(t.counterpartyName || "").trim();
    if (name) entry.names.set(name, (entry.names.get(name) || 0) + 1);
    if (t.direction === "IN") entry.hasIn = true;
    else entry.hasOut = true;
    entry.txCount += 1;
    byAccount.set(acc, entry);
  }
  const fromStatements = [...byAccount.values()]
    .map((e) => {
      // najčešće ime sa izvoda za taj račun
      let bestName = "";
      let bestCount = 0;
      for (const [name, count] of e.names) {
        if (count > bestCount) {
          bestName = name;
          bestCount = count;
        }
      }
      return {
        source: "statement",
        name: bestName || `Račun ${e.account}`,
        account: e.account,
        jib: null,
        isKupac: e.hasIn,
        isDobavljac: e.hasOut,
        txCount: e.txCount,
      };
    })
    .filter((s) => {
      const n = normalizeName(s.name);
      return !knownNames.has(n) && !hiddenNames.has(n);
    })
    .sort((a, b) => b.txCount - a.txCount);

  // kandidati sa izlaznih faktura: kupci koji još nisu partneri
  const invoices = await Invoice.findAll({
    where: { organizationId, type: "INVOICE" },
    attributes: [
      "buyerName",
      "buyerIdNumber",
      "buyerAddress",
      "buyerCity",
      "buyerEmail",
      [fn("COUNT", col("id")), "cnt"],
    ],
    group: ["buyerName", "buyerIdNumber", "buyerAddress", "buyerCity", "buyerEmail"],
    raw: true,
  });
  const seenInvoiceNames = new Set();
  const fromInvoices = [];
  for (const inv of invoices) {
    const normName = normalizeName(inv.buyerName);
    const jib = normalizeDigits(inv.buyerIdNumber);
    if (!normName || seenInvoiceNames.has(normName)) continue;
    if (knownNames.has(normName) || (jib && knownJibs.has(jib))) continue;
    if (hiddenNames.has(normName)) continue;
    seenInvoiceNames.add(normName);
    fromInvoices.push({
      source: "invoice",
      name: String(inv.buyerName).trim(),
      account: null,
      jib: jib || null,
      address: inv.buyerAddress || null,
      city: inv.buyerCity || null,
      email: inv.buyerEmail || null,
      isKupac: true,
      isDobavljac: false,
      txCount: Number(inv.cnt) || 0,
    });
  }

  return res.json({
    ok: true,
    data: { fromStatements, fromInvoices },
  });
}

// POST /api/partners/:orgId/suggestions/hide — "nije partner": skrij
// prijedlog trajno (po žiro računu i/ili nazivu). Idempotentno.
async function hideSuggestion(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const account = normalizeDigits(req.body?.account);
  const name = normalizeName(req.body?.name);
  if (account.length < 8 && !name) {
    return res.status(400).json({ ok: false, error: "INVALID_SUGGESTION" });
  }
  const org = await Organization.findByPk(organizationId, {
    attributes: ["id", "partnerSuggestionHides"],
  });
  if (!org) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const hides = parseSuggestionHides(org);
  const exists = hides.some(
    (h) =>
      normalizeDigits(h?.account) === (account.length >= 8 ? account : "") &&
      normalizeName(h?.name) === name,
  );
  if (!exists) {
    hides.push({
      account: account.length >= 8 ? account : null,
      name: name || null,
    });
    await org.update({ partnerSuggestionHides: hides });
  }
  return res.json({ ok: true, data: { hidden: hides.length } });
}

// POST /api/partners/:orgId
async function create(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const payload = partnerPayload(req.body || {});
  const invalid = validatePayload(payload);
  if (invalid) {
    return res.status(400).json({ ok: false, error: invalid });
  }
  const duplicate = await Partner.findOne({
    where: { organizationId, name: payload.name },
  });
  if (duplicate) {
    return res.status(409).json({ ok: false, error: "PARTNER_EXISTS" });
  }
  const code = await nextPartnerCode(organizationId);
  const partner = await Partner.create({ organizationId, code, ...payload });
  const linked = await relinkTransactions(partner);
  await settleOpenRacuni(partner);
  return res.status(201).json({ ok: true, data: { ...partner.toJSON(), linked } });
}

// PATCH /api/partners/:orgId/:partnerId
async function update(req, res) {
  const organizationId = parseId(req.params.orgId);
  const partnerId = parseId(req.params.partnerId);
  if (!organizationId || !partnerId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
  });
  if (!partner) {
    return res.status(404).json({ ok: false, error: "PARTNER_NOT_FOUND" });
  }
  const payload = partnerPayload(req.body || {});
  const invalid = validatePayload(payload);
  if (invalid) {
    return res.status(400).json({ ok: false, error: invalid });
  }
  await partner.update(payload);
  const linked = await relinkTransactions(partner);
  await settleOpenRacuni(partner);
  return res.json({ ok: true, data: { ...partner.toJSON(), linked } });
}

// DELETE /api/partners/:orgId/:partnerId
async function remove(req, res) {
  const organizationId = parseId(req.params.orgId);
  const partnerId = parseId(req.params.partnerId);
  if (!organizationId || !partnerId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
  });
  if (!partner) {
    return res.status(404).json({ ok: false, error: "PARTNER_NOT_FOUND" });
  }
  await BankTransaction.update(
    { partnerId: null },
    { where: { organizationId, partnerId } },
  );
  await partner.destroy();
  return res.json({ ok: true, data: null });
}

// POST /api/partners/:orgId/uvoz — grupni uvoz partnera (Com_Soft XML/CSV,
// parsiran na frontendu). Duplikati se PRESKAČU: prvo po ID broju (JIB), pa
// po labavo normalizovanom nazivu; odgovor vraća šta je preskočeno i zašto.
// JIB kod uvoza NIJE obavezan (istorijski šifarnici ga često nemaju), pa se
// takvi partneri uvoze bez ID broja i broje posebno (bezIdBroja).
const UVOZ_MAX_PRESKOCENO = 300;

async function uvozPartnera(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const stavke = Array.isArray(req.body?.partneri) ? req.body.partneri : [];
    if (stavke.length === 0) {
      return res.status(400).json({ ok: false, error: "EMPTY" });
    }
    if (stavke.length > 50000) {
      return res.status(400).json({ ok: false, error: "TOO_MANY" });
    }

    const postojeci = await Partner.findAll({
      where: { organizationId },
      attributes: ["name", "jib"],
      raw: true,
    });
    const poJibu = new Map();
    const poNazivu = new Map();
    for (const p of postojeci) {
      if (p.jib) poJibu.set(p.jib, p.name);
      const n = normalizeName(p.name);
      if (n) poNazivu.set(n, p.name);
    }

    const preskoceno = [];
    let preskocenoUkupno = 0;
    const skip = (sifra, naziv, razlog) => {
      preskocenoUkupno++;
      if (preskoceno.length < UVOZ_MAX_PRESKOCENO) {
        preskoceno.push({ sifra, naziv, razlog });
      }
    };

    let code = await nextPartnerCode(organizationId);
    let bezIdBroja = 0;
    const zaUnos = [];
    for (const s of stavke) {
      const sifra = String(s?.sifra || "").trim();
      const name = String(s?.naziv || "").trim().slice(0, 255);
      if (!name) {
        skip(sifra, "", "nema naziv");
        continue;
      }
      const jib = normalizeDigits(s?.jib);
      const validJib = jib.length === 13 ? jib : null;
      const norm = normalizeName(name);
      if (validJib && poJibu.has(validJib)) {
        skip(sifra, name, `ID broj već postoji (${poJibu.get(validJib)})`);
        continue;
      }
      if (norm && poNazivu.has(norm)) {
        const isti = poNazivu.get(norm);
        skip(
          sifra,
          name,
          isti === name ? "naziv već postoji" : `naziv već postoji (${isti})`,
        );
        continue;
      }
      // upiši u mape odmah: duplikati unutar samog fajla se isto preskaču
      if (validJib) poJibu.set(validJib, name);
      if (norm) poNazivu.set(norm, name);
      if (!validJib) bezIdBroja++;
      const pdv = normalizeDigits(s?.pdvBroj);
      zaUnos.push({
        organizationId,
        code: code++,
        name,
        jib: validJib,
        pdvBroj: pdv.length === 12 ? pdv : null,
        address: String(s?.adresa || "").trim().slice(0, 255) || null,
        city: String(s?.mjesto || "").trim().slice(0, 120) || null,
        email: String(s?.email || "").trim().slice(0, 255) || null,
        phone: String(s?.telefon || "").trim().slice(0, 64) || null,
        accounts: cleanAccounts(s?.racuni),
        isKupac: false,
        isDobavljac: false,
        note: null,
      });
    }

    const created = [];
    for (let i = 0; i < zaUnos.length; i += 500) {
      // eslint-disable-next-line no-await-in-loop
      const chunk = await Partner.bulkCreate(zaUnos.slice(i, i + 500));
      created.push(...chunk);
    }

    // jedan prolaz vezanja postojećih nevezanih transakcija na nove partnere
    // (po žiro računu pa po labavom nazivu), umjesto relinka po partneru
    let vezano = 0;
    if (created.length > 0) {
      const byAccount = new Map();
      const byName = new Map();
      for (const p of created) {
        for (const a of Array.isArray(p.accounts) ? p.accounts : []) {
          byAccount.set(normalizeDigits(a), p.id);
        }
        const n = normalizeName(p.name);
        if (n && !byName.has(n)) byName.set(n, p.id);
      }
      const slobodne = await BankTransaction.findAll({
        where: { organizationId, partnerId: null },
        attributes: ["id", "counterpartyAccount", "counterpartyName"],
        raw: true,
      });
      const poPartneru = new Map();
      for (const tx of slobodne) {
        const pid =
          byAccount.get(normalizeDigits(tx.counterpartyAccount)) ??
          byName.get(normalizeName(tx.counterpartyName)) ??
          null;
        if (pid == null) continue;
        if (!poPartneru.has(pid)) poPartneru.set(pid, []);
        poPartneru.get(pid).push(tx.id);
      }
      for (const [partnerId, ids] of poPartneru) {
        // eslint-disable-next-line no-await-in-loop
        await BankTransaction.update(
          { partnerId },
          { where: { id: { [Op.in]: ids } } },
        );
        vezano += ids.length;
      }
    }

    // admin Aktivnost: uvoz iz drugog programa je signal prelaska kod nas
    if (created.length > 0) {
      void logEvent({
        userId: req.user?.id ?? null,
        action: "UVOZ_PARTNERA",
        label: `${created.length} od ${stavke.length} partnera`,
        organizationId,
      });
    }
    return res.json({
      ok: true,
      data: {
        ukupno: stavke.length,
        dodano: created.length,
        bezIdBroja,
        vezanoTransakcija: vezano,
        preskocenoUkupno,
        preskoceno,
      },
    });
  } catch (err) {
    console.error("partneri uvoz error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/partners/:orgId/uvoz-iz-obrta: uvoz partnera od drugog obrta
// istog korisnika (mnogi obrti dijele iste dobavljače: knjigovodstvo,
// BH Telecom, elektrodistribucija, vodovod...). Kopiraju se samo matični
// podaci partnera (naziv, ID/PDV broj, adresa, računi...), NE i promet,
// početna stanja ni veze sa transakcijama. Duplikati se preskaču po istom
// pravilu kao kod Com_Soft uvoza (ID broj, pa labavo normalizovan naziv).
async function uvozIzObrta(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const sourceOrgId = parseId(req.body?.sourceOrgId);
    if (!organizationId || !sourceOrgId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    if (sourceOrgId === organizationId) {
      return res.status(400).json({ ok: false, error: "ISTI_OBRT" });
    }
    // requireOrgRole čuva samo ciljni obrt (:orgId); pristup izvornom
    // provjeravamo ovdje, dovoljna je bilo koja rola (čitanje šifarnika)
    const clan = await OrganizationMember.findOne({
      where: { userId: req.user.id, organizationId: sourceOrgId },
    });
    if (!clan) {
      return res.status(403).json({ ok: false, error: "NO_ACCESS_SOURCE" });
    }

    const ids = Array.isArray(req.body?.partnerIds)
      ? req.body.partnerIds.map(parseId).filter(Boolean)
      : [];
    const where = { organizationId: sourceOrgId };
    if (ids.length > 0) where.id = { [Op.in]: ids };
    const izvorni = await Partner.findAll({ where, order: [["name", "ASC"]] });
    if (izvorni.length === 0) {
      return res.status(400).json({ ok: false, error: "EMPTY" });
    }

    const postojeci = await Partner.findAll({
      where: { organizationId },
      attributes: ["name", "jib"],
      raw: true,
    });
    const poJibu = new Map();
    const poNazivu = new Map();
    for (const p of postojeci) {
      if (p.jib) poJibu.set(p.jib, p.name);
      const n = normalizeName(p.name);
      if (n) poNazivu.set(n, p.name);
    }

    let code = await nextPartnerCode(organizationId);
    const zaUnos = [];
    const preskoceno = [];
    for (const p of izvorni) {
      if (p.jib && poJibu.has(p.jib)) {
        preskoceno.push({
          naziv: p.name,
          razlog: `ID broj već postoji (${poJibu.get(p.jib)})`,
        });
        continue;
      }
      const norm = normalizeName(p.name);
      if (norm && poNazivu.has(norm)) {
        const isti = poNazivu.get(norm);
        preskoceno.push({
          naziv: p.name,
          razlog:
            isti === p.name ? "naziv već postoji" : `naziv već postoji (${isti})`,
        });
        continue;
      }
      if (p.jib) poJibu.set(p.jib, p.name);
      if (norm) poNazivu.set(norm, p.name);
      // MariaDB zna vratiti JSON kolonu kao string
      const accounts = Array.isArray(p.accounts)
        ? p.accounts
        : typeof p.accounts === "string"
          ? JSON.parse(p.accounts || "[]")
          : [];
      zaUnos.push({
        organizationId,
        code: code++,
        name: p.name,
        jib: p.jib,
        pdvBroj: p.pdvBroj,
        address: p.address,
        city: p.city,
        email: p.email,
        phone: p.phone,
        accounts: cleanAccounts(accounts),
        isKupac: p.isKupac,
        isDobavljac: p.isDobavljac,
        note: p.note,
      });
    }

    const created = [];
    for (let i = 0; i < zaUnos.length; i += 500) {
      // eslint-disable-next-line no-await-in-loop
      const chunk = await Partner.bulkCreate(zaUnos.slice(i, i + 500));
      created.push(...chunk);
    }

    // nevezane transakcije ciljnog obrta odmah vezati za nove partnere:
    // jedan prolaz (po žiro računu pa po labavom nazivu), isti obrazac kao
    // kod Com_Soft uvoza; relink po partneru bi za velike šifarnike značio
    // hiljade sekvencijalnih upita
    let vezano = 0;
    if (created.length > 0) {
      const byAccount = new Map();
      const byName = new Map();
      for (const p of created) {
        for (const a of Array.isArray(p.accounts) ? p.accounts : []) {
          byAccount.set(normalizeDigits(a), p.id);
        }
        const n = normalizeName(p.name);
        if (n && !byName.has(n)) byName.set(n, p.id);
      }
      const slobodne = await BankTransaction.findAll({
        where: { organizationId, partnerId: null },
        attributes: ["id", "counterpartyAccount", "counterpartyName"],
        raw: true,
      });
      const poPartneru = new Map();
      for (const tx of slobodne) {
        const pid =
          byAccount.get(normalizeDigits(tx.counterpartyAccount)) ??
          byName.get(normalizeName(tx.counterpartyName)) ??
          null;
        if (pid == null) continue;
        if (!poPartneru.has(pid)) poPartneru.set(pid, []);
        poPartneru.get(pid).push(tx.id);
      }
      for (const [partnerId, txIds] of poPartneru) {
        // eslint-disable-next-line no-await-in-loop
        await BankTransaction.update(
          { partnerId },
          { where: { id: { [Op.in]: txIds } } },
        );
        vezano += txIds.length;
      }
    }

    return res.json({
      ok: true,
      data: {
        ukupno: izvorni.length,
        dodano: created.length,
        vezanoTransakcija: vezano,
        preskoceno,
      },
    });
  } catch (err) {
    console.error("partneri uvoz-iz-obrta error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ─── Ulazni računi (fakture dobavljača) ─────────────────────────────────────

const toCents = (v) => Math.round(Number(v) * 100);

function parseIsoDate(value) {
  const s = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// Današnji datum u LOKALNOJ zoni ("YYYY-MM-DD"). toISOString() vraća UTC pa u
// ranojutarnjim satima (UTC+1/+2) da jučerašnji dan i pomjeri "kasni" bucket.
function todayLocalIso() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Novi/ponovo otvoren račun pokušava naći već potvrđenu isplatu partnera
 *  (retroaktivno: izvod je stigao prije nego što je račun proknjižen). */
async function tryMatchExistingPayment(racun) {
  const candidates = await BankTransaction.findAll({
    where: {
      organizationId: racun.organizationId,
      partnerId: racun.partnerId,
      direction: "OUT",
      status: "CONFIRMED",
      ulazniRacunId: null,
    },
  });
  const amt = toCents(racun.iznos);
  let match = candidates.filter((t) => toCents(t.amount) === amt);
  if (match.length !== 1) {
    const broj = String(racun.brojRacuna || "").toLowerCase();
    match = broj
      ? candidates.filter((t) =>
          `${t.description || ""} ${t.reference || ""}`
            .toLowerCase()
            .includes(broj),
        )
      : [];
  }
  if (match.length !== 1) return false;
  const tx = match[0];
  await tx.update({ ulazniRacunId: racun.id });
  await racun.update({
    status: "PLACEN",
    paidAt: tx.date || racun.datumRacuna,
  });
  return true;
}

const VRSTE_NABAVKE = ["DOMACA", "UVOZ", "OD_NEOBVEZNIKA"];
const TIPOVI_DOKUMENTA_KUF = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];
const VRSTE_DOKUMENTA = [
  "REDOVNA",
  "AVANSNA",
  "KNJIZNA_OBAVIJEST",
  "STORNO_AVANSNE",
  "PDV_NA_CEKANJU",
  "OSTALO",
];
const KP_ENTITETI = ["FBIH", "RS", "BD"];

// nenegativan novčani iznos ili default
function parseAmount(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback;
}

function racunPayload(body) {
  return {
    brojRacuna: String(body.brojRacuna || "").trim(),
    datumRacuna: parseIsoDate(body.datumRacuna),
    rokPlacanja: parseIsoDate(body.rokPlacanja),
    iznos: Number(body.iznos),
    pdvIznos:
      body.pdvIznos != null && body.pdvIznos !== ""
        ? Number(body.pdvIznos)
        : null,
    // ── KUF polja (PDV evidencije) ──
    vrstaNabavke: VRSTE_NABAVKE.includes(body.vrstaNabavke)
      ? body.vrstaNabavke
      : "DOMACA",
    pdvNeodbitniIznos: parseAmount(body.pdvNeodbitniIznos),
    // KUF period ide po datumu prijema; default = datum računa
    datumPrijema:
      parseIsoDate(body.datumPrijema) || parseIsoDate(body.datumRacuna),
    tipDokumenta: TIPOVI_DOKUMENTA_KUF.includes(body.tipDokumenta)
      ? body.tipDokumenta
      : "01",
    vrstaDokumenta: VRSTE_DOKUMENTA.includes(body.vrstaDokumenta)
      ? body.vrstaDokumenta
      : "REDOVNA",
    jciBroj: String(body.jciBroj || "").trim().slice(0, 30) || null,
    jciDatum: parseIsoDate(body.jciDatum),
    pausalnaNaknada: parseAmount(body.pausalnaNaknada),
    kpEntitet: KP_ENTITETI.includes(body.kpEntitet) ? body.kpEntitet : null,
    kpIznos: parseAmount(body.kpIznos),
    // samo PDV evidencija (uvoz/JCI): ulazi u KUF, ne stvara obavezu
    samoEvidencija: Boolean(body.samoEvidencija),
    note: String(body.note || "").trim() || null,
  };
}

// GET /api/partners/:orgId/ulazni-racuni?partnerId=&status=
async function listUlazniRacuni(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const where = { organizationId };
  const partnerId = parseId(req.query.partnerId);
  if (partnerId) where.partnerId = partnerId;
  // status se NE filtrira u upitu: FIFO status naplate treba sve račune
  // partnera; klijent filtrira po izvedenom statusu
  const racuni = await UlazniRacun.findAll({
    where,
    // jib/pdvBroj/code/city trebaju KUF-u (PDV evidencije, izvještaj, e-KUF)
    include: [
      {
        model: Partner,
        as: "partner",
        attributes: ["id", "name", "jib", "pdvBroj", "code", "city"],
      },
    ],
    order: [["datumRacuna", "DESC"], ["id", "DESC"]],
  });

  // ── Izvedeni status naplate (FIFO) po partneru ──
  const isKredit = (r) =>
    r.vrstaDokumenta === "KNJIZNA_OBAVIJEST" ||
    r.vrstaDokumenta === "STORNO_AVANSNE";
  const byPartner = new Map();
  for (const r of racuni) {
    if (r.partnerId == null) continue;
    if (!byPartner.has(r.partnerId)) byPartner.set(r.partnerId, []);
    byPartner.get(r.partnerId).push(r);
  }
  const partnerIds = [...byPartner.keys()];
  const paidRows = partnerIds.length
    ? await BankTransaction.findAll({
        where: {
          organizationId,
          direction: "OUT",
          status: "CONFIRMED",
          partnerId: { [Op.in]: partnerIds },
          // uplata koja je već zatvorila konkretan račun (ulazniRacunId) ga je
          // označila PLACEN; ne ide ponovo u FIFO pool (izbjegava duplu naplatu)
          ulazniRacunId: null,
        },
        attributes: ["partnerId", [fn("SUM", col("amount")), "paid"]],
        group: ["partnerId"],
        raw: true,
      })
    : [];
  const paidByPartner = new Map(
    paidRows.map((x) => [x.partnerId, Number(x.paid) || 0]),
  );
  const alloc = new Map();
  for (const [pid, list] of byPartner) {
    const kreditSum = list
      .filter(isKredit)
      .reduce((s, r) => s + (Number(r.iznos) || 0), 0);
    const a = allocateFifo(
      list.map((r) => ({
        id: r.id,
        iznos: Number(r.iznos) || 0,
        datum: String(r.datumRacuna).slice(0, 10),
        manualPlacen: r.status === "PLACEN",
        // samoEvidencija (uvoz/JCI) nije obaveza prema dobavljaču, van FIFO-a
        kredit: isKredit(r) || Boolean(r.samoEvidencija),
      })),
      (paidByPartner.get(pid) || 0) + kreditSum,
    );
    for (const [id, v] of a) alloc.set(id, v);
  }
  const data = racuni.map((r) => ({
    ...r.toJSON(),
    placeno: alloc.get(r.id)?.placeno ?? 0,
    preostalo: alloc.get(r.id)?.preostalo ?? (Number(r.iznos) || 0),
    paymentStatus:
      alloc.get(r.id)?.status ??
      (r.status === "PLACEN" ? "PLACEN" : "OTVOREN"),
  }));
  return res.json({ ok: true, data });
}

// POST /api/partners/:orgId/ulazni-racuni
async function createUlazniRacun(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const body = req.body || {};
  const partnerId = parseId(body.partnerId);
  if (!partnerId) {
    return res.status(400).json({ ok: false, error: "PARTNER_REQUIRED" });
  }
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
  });
  if (!partner) {
    return res.status(404).json({ ok: false, error: "PARTNER_NOT_FOUND" });
  }
  const payload = racunPayload(body);
  if (!payload.brojRacuna) {
    return res.status(400).json({ ok: false, error: "BROJ_REQUIRED" });
  }
  if (!payload.datumRacuna) {
    return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
  }
  // samo PDV evidencija dozvoljava unos SAMO PDV-a (obračun uvoznog PDV-a
  // po JCI): iznos ostaje 0, u KUF ide isključivo PDV
  const samoPdv = payload.samoEvidencija && (payload.pdvIznos ?? 0) > 0;
  if (samoPdv && (!Number.isFinite(payload.iznos) || payload.iznos <= 0)) {
    payload.iznos = 0;
  }
  if (
    !Number.isFinite(payload.iznos) ||
    payload.iznos < 0 ||
    (payload.iznos === 0 && !samoPdv)
  ) {
    return res.status(400).json({ ok: false, error: "IZNOS_INVALID" });
  }
  // neodbitni dio PDV-a ne može premašiti ukupni PDV
  if (payload.pdvNeodbitniIznos > (payload.pdvIznos ?? 0)) {
    payload.pdvNeodbitniIznos = payload.pdvIznos ?? 0;
  }
  // bez unesenog roka plaćanja podrazumijeva se 30 dana od datuma računa
  if (!payload.rokPlacanja) {
    const d = new Date(`${payload.datumRacuna}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 30);
    payload.rokPlacanja = d.toISOString().slice(0, 10);
  }
  // samo PDV evidencija: nema obaveze prema dobavljaču, odmah zatvoreno
  if (payload.samoEvidencija) {
    payload.status = "PLACEN";
    payload.paidAt = payload.datumRacuna;
    payload.rokPlacanja = null;
  }
  const racun = await UlazniRacun.create({
    organizationId,
    partnerId,
    ...payload,
  });
  // izvod je možda već stigao: odmah probaj zatvoriti postojećom isplatom
  const matched = payload.samoEvidencija
    ? false
    : await tryMatchExistingPayment(racun);
  // statistika PK Office korištenja (admin Aktivnost)
  void logEvent({
    userId: req.user?.id ?? null,
    action: "OFFICE_ULAZNI_RACUN",
    label: `${partner.name} · ${payload.brojRacuna}`,
    organizationId,
  });
  return res
    .status(201)
    .json({ ok: true, data: { ...racun.toJSON(), matched } });
}

// PATCH /api/partners/:orgId/ulazni-racuni/:racunId
async function updateUlazniRacun(req, res) {
  const organizationId = parseId(req.params.orgId);
  const racunId = parseId(req.params.racunId);
  if (!organizationId || !racunId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const racun = await UlazniRacun.findOne({
    where: { id: racunId, organizationId },
  });
  if (!racun) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const body = req.body || {};
  const updates = {};
  if (body.brojRacuna !== undefined) {
    const v = String(body.brojRacuna || "").trim();
    if (!v) return res.status(400).json({ ok: false, error: "BROJ_REQUIRED" });
    updates.brojRacuna = v;
  }
  if (body.datumRacuna !== undefined) {
    const v = parseIsoDate(body.datumRacuna);
    if (!v) return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
    updates.datumRacuna = v;
  }
  if (body.rokPlacanja !== undefined) {
    updates.rokPlacanja = parseIsoDate(body.rokPlacanja);
  }
  if (body.iznos !== undefined) {
    const v = Number(body.iznos);
    // 0 je dozvoljeno samo za "samo PDV evidencija" knjiženja (uvozni PDV)
    const evid =
      body.samoEvidencija !== undefined
        ? Boolean(body.samoEvidencija)
        : Boolean(racun.samoEvidencija);
    if (!Number.isFinite(v) || v < 0 || (v === 0 && !evid)) {
      return res.status(400).json({ ok: false, error: "IZNOS_INVALID" });
    }
    updates.iznos = v;
  }
  if (body.pdvIznos !== undefined) {
    updates.pdvIznos =
      body.pdvIznos != null && body.pdvIznos !== ""
        ? Number(body.pdvIznos)
        : null;
  }
  if (body.note !== undefined) {
    updates.note = String(body.note || "").trim() || null;
  }
  if (body.vrstaNabavke !== undefined) {
    if (!VRSTE_NABAVKE.includes(body.vrstaNabavke)) {
      return res.status(400).json({ ok: false, error: "INVALID_VRSTA" });
    }
    updates.vrstaNabavke = body.vrstaNabavke;
  }
  if (body.pdvNeodbitan !== undefined) {
    updates.pdvNeodbitan = Boolean(body.pdvNeodbitan);
  }
  // ── KUF polja (PDV evidencije) ──
  if (body.pdvNeodbitniIznos !== undefined) {
    updates.pdvNeodbitniIznos = parseAmount(body.pdvNeodbitniIznos);
  }
  if (body.datumPrijema !== undefined) {
    const v = parseIsoDate(body.datumPrijema);
    if (!v) return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
    updates.datumPrijema = v;
  }
  if (body.tipDokumenta !== undefined) {
    if (!TIPOVI_DOKUMENTA_KUF.includes(body.tipDokumenta)) {
      return res.status(400).json({ ok: false, error: "INVALID_TIP" });
    }
    updates.tipDokumenta = body.tipDokumenta;
  }
  if (body.vrstaDokumenta !== undefined) {
    if (!VRSTE_DOKUMENTA.includes(body.vrstaDokumenta)) {
      return res.status(400).json({ ok: false, error: "INVALID_VRSTA_DOK" });
    }
    updates.vrstaDokumenta = body.vrstaDokumenta;
  }
  if (body.jciBroj !== undefined) {
    updates.jciBroj = String(body.jciBroj || "").trim().slice(0, 30) || null;
  }
  if (body.jciDatum !== undefined) {
    updates.jciDatum = parseIsoDate(body.jciDatum);
  }
  if (body.pausalnaNaknada !== undefined) {
    updates.pausalnaNaknada = parseAmount(body.pausalnaNaknada);
  }
  if (body.kpEntitet !== undefined) {
    updates.kpEntitet = KP_ENTITETI.includes(body.kpEntitet)
      ? body.kpEntitet
      : null;
  }
  if (body.kpIznos !== undefined) {
    updates.kpIznos = parseAmount(body.kpIznos);
  }
  if (body.samoEvidencija !== undefined) {
    updates.samoEvidencija = Boolean(body.samoEvidencija);
    // uključeno: zatvori (nema obaveze); isključeno: vrati u otvoreno
    if (updates.samoEvidencija && racun.status === "OTVOREN") {
      updates.status = "PLACEN";
      updates.paidAt = racun.datumRacuna;
    }
  }
  // ručna promjena statusa (plaćeno gotovinom i sl.)
  if (body.status !== undefined) {
    if (!["OTVOREN", "PLACEN"].includes(body.status)) {
      return res.status(400).json({ ok: false, error: "INVALID_STATUS" });
    }
    updates.status = body.status;
    if (body.status === "PLACEN") {
      updates.paidAt =
        parseIsoDate(body.paidAt) || new Date().toISOString().slice(0, 10);
    } else {
      updates.paidAt = null;
      // skini vezu sa isplatama koje su ga držale zatvorenim
      await BankTransaction.update(
        { ulazniRacunId: null },
        { where: { organizationId, ulazniRacunId: racun.id } },
      );
    }
  }
  await racun.update(updates);
  return res.json({ ok: true, data: racun });
}

// DELETE /api/partners/:orgId/ulazni-racuni/:racunId
async function removeUlazniRacun(req, res) {
  const organizationId = parseId(req.params.orgId);
  const racunId = parseId(req.params.racunId);
  if (!organizationId || !racunId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const racun = await UlazniRacun.findOne({
    where: { id: racunId, organizationId },
  });
  if (!racun) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await BankTransaction.update(
    { ulazniRacunId: null },
    { where: { organizationId, ulazniRacunId: racun.id } },
  );
  await racun.destroy();
  return res.json({ ok: true, data: null });
}

// ─── Ukupni promet kupaca/dobavljača ────────────────────────────────────────

// GET /api/partners/:orgId/promet?type=kupac|dobavljac|svi&from=&to=
// Zbirni izvještaj po partneru za period; ista logika kao kartica partnera
// (kupac: fakture duguju, uplate potražuju; dobavljač: njegovi računi
// potražuju, naša plaćanja duguju; odobrenja tipa knjižna obavijest / storno
// ostaju na strani svog računa U MINUSU), pa se izvještaj i kartica slažu.
// type=svi: obje strane odjednom, partner koji je i kupac i dobavljač je u
// JEDNOM redu (njihovDug = saldo kupca, nasDug = saldo dobavljača).
async function promet(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const type = ["kupac", "dobavljac", "svi"].includes(req.query.type)
      ? req.query.type
      : "dobavljac";
    const wantKupac = type !== "dobavljac";
    const wantDobavljac = type !== "kupac";
    const from = parseIsoDate(req.query.from) || "1900-01-01";
    const to =
      parseIsoDate(req.query.to) || new Date().toISOString().slice(0, 10);

    const partners = await Partner.findAll({
      where: { organizationId },
      attributes: ["id", "code", "name", "jib"],
      raw: true,
    });
    // partnerId → { kDuguje, kPotrazuje (kupac), dDuguje, dPotrazuje (dob.) }
    const acc = new Map();
    const bump = (pid, key, val) => {
      if (!acc.has(pid)) {
        acc.set(pid, { kDuguje: 0, kPotrazuje: 0, dDuguje: 0, dPotrazuje: 0 });
      }
      acc.get(pid)[key] += val;
    };

    // Početno stanje (donos iz ranijeg programa) je najstariji dokument na
    // kartici, pa mora ući i ovdje: bez njega se izvještaj i kartica ne slažu.
    // Ulazi kad mu datum pada u traženi period, kao i svaki drugi dokument.
    const openingRows = await PartnerOpeningBalance.findAll({
      where: { organizationId, datum: { [Op.gte]: from, [Op.lte]: to } },
      raw: true,
    });
    for (const o of openingRows) {
      // predznak se čuva: negativno stanje je avans (kao odobrenje na kartici)
      if (wantKupac) bump(o.partnerId, "kDuguje", Number(o.kupacIznos) || 0);
      if (wantDobavljac) {
        bump(o.partnerId, "dPotrazuje", Number(o.dobavljacIznos) || 0);
      }
    }

    if (wantKupac) {
      // fakture se vežu po JIB-u pa po labavom nazivu kupca (kao kartica)
      const byJib = new Map();
      const byName = new Map();
      for (const p of partners) {
        const j = normalizeDigits(p.jib);
        if (j && !byJib.has(j)) byJib.set(j, p.id);
        const n = normalizeName(p.name);
        if (n && !byName.has(n)) byName.set(n, p.id);
      }
      const invoices = await Invoice.findAll({
        where: {
          organizationId,
          type: "INVOICE",
          status: { [Op.in]: ["ISSUED", "PAID"] },
          issueDate: { [Op.gte]: from, [Op.lte]: to },
        },
        attributes: ["buyerName", "buyerIdNumber", "grossTotal", "docType"],
        raw: true,
      });
      for (const inv of invoices) {
        const pid =
          byJib.get(normalizeDigits(inv.buyerIdNumber)) ??
          byName.get(normalizeName(inv.buyerName)) ??
          null;
        if (pid == null) continue;
        // odobrenja (storno avansa, knjižna obavijest) ostaju na dugovnoj
        // strani kupca, u minusu (ista konvencija kao kartica)
        const doc = inv.docType || "STANDARD";
        const odobrenje =
          doc === "STORNO_AVANSNE" || doc === "KNJIZNA_OBAVIJEST";
        bump(
          pid,
          "kDuguje",
          (odobrenje ? -1 : 1) * (Number(inv.grossTotal) || 0),
        );
      }
    }
    if (wantDobavljac) {
      const racuni = await UlazniRacun.findAll({
        where: {
          organizationId,
          datumRacuna: { [Op.gte]: from, [Op.lte]: to },
        },
        attributes: ["partnerId", "iznos", "samoEvidencija", "vrstaDokumenta"],
        raw: true,
      });
      for (const r of racuni) {
        // samo PDV evidencija (uvoz/JCI) ne stvara obavezu prema dobavljaču
        if (r.samoEvidencija) continue;
        // knjižna obavijest / storno dobavljača: potražna strana u minusu
        const vd = r.vrstaDokumenta || "REDOVNA";
        const odobrenje =
          vd === "KNJIZNA_OBAVIJEST" || vd === "STORNO_AVANSNE";
        bump(
          r.partnerId,
          "dPotrazuje",
          (odobrenje ? -1 : 1) * (Number(r.iznos) || 0),
        );
      }
    }

    const txWhere = {
      organizationId,
      partnerId: { [Op.not]: null },
      status: "CONFIRMED",
      date: { [Op.gte]: from, [Op.lte]: to },
    };
    if (type !== "svi") {
      txWhere.direction = type === "kupac" ? "IN" : "OUT";
    }
    const txs = await BankTransaction.findAll({
      where: txWhere,
      attributes: ["partnerId", "amount", "direction"],
      raw: true,
    });
    for (const t of txs) {
      // uplata kupca potražuje na kupčevoj strani, naše plaćanje duguje
      // na dobavljačkoj
      bump(
        t.partnerId,
        t.direction === "IN" ? "kPotrazuje" : "dDuguje",
        Number(t.amount) || 0,
      );
    }

    const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const rows = partners
      .filter((p) => acc.has(p.id))
      .map((p) => {
        const a = acc.get(p.id);
        if (type === "svi") {
          const njihovDug = r2(a.kDuguje - a.kPotrazuje);
          const nasDug = r2(a.dPotrazuje - a.dDuguje);
          return {
            id: p.id,
            code: p.code,
            name: p.name,
            njihovDug,
            nasDug,
            razlika: r2(njihovDug - nasDug),
            aktivan:
              a.kDuguje !== 0 ||
              a.kPotrazuje !== 0 ||
              a.dDuguje !== 0 ||
              a.dPotrazuje !== 0,
          };
        }
        const duguje = type === "kupac" ? a.kDuguje : a.dDuguje;
        const potrazuje = type === "kupac" ? a.kPotrazuje : a.dPotrazuje;
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          duguje: r2(duguje),
          potrazuje: r2(potrazuje),
          saldo: r2(duguje - potrazuje),
          aktivan: duguje !== 0 || potrazuje !== 0,
        };
      })
      .filter((r) => r.aktivan)
      .map(({ aktivan, ...r }) => r)
      .sort((a, b) =>
        a.code != null && b.code != null
          ? a.code - b.code
          : a.code != null
            ? -1
            : b.code != null
              ? 1
              : a.name.localeCompare(b.name, "bs"),
      );

    return res.json({ ok: true, data: { type, from, to, rows } });
  } catch (err) {
    console.error("partneri promet error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ─── Kartica partnera ───────────────────────────────────────────────────────

// GET /api/partners/:orgId/:partnerId/kartica — sve o partneru na jednom
// mjestu: transakcije sa izvoda, izlazne fakture, ulazni računi, totali.
async function kartica(req, res) {
  const organizationId = parseId(req.params.orgId);
  const partnerId = parseId(req.params.partnerId);
  if (!organizationId || !partnerId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
  });
  if (!partner) {
    return res.status(404).json({ ok: false, error: "PARTNER_NOT_FOUND" });
  }

  // period pregleda (?from=&to=, ISO): kartica default prikazuje jednu
  // godinu sa donosom iz ranijih; bez parametara vraća sve (kao ranije).
  // FIFO i dugovi se UVIJEK računaju preko cijele istorije, period samo
  // filtrira šta se prikazuje i promet perioda.
  const from = parseIsoDate(req.query.from);
  const to = parseIsoDate(req.query.to);
  const inPeriod = (iso) => {
    const d = String(iso || "").slice(0, 10);
    if (!d) return false;
    return (!from || d >= from) && (!to || d <= to);
  };

  // provizije banke i sl. (ne-partner kategorije) ne ulaze u karticu ni kad
  // su vezane za partnera: banka uz plaćanje dobavljaču knjiži i proviziju
  // sa imenom dobavljača u opisu, a to nije promet sa partnerom
  // sa periodom (godišnji pregled) transakcije se učitavaju SAMO za taj
  // period, inače bi limit 300 (najnovije) ispustio starije godine za
  // partnere sa puno prometa; bez perioda ostaje zadnjih 300 kao ranije
  const txPeriodWhere =
    from || to
      ? {
          date: {
            ...(from ? { [Op.gte]: from } : {}),
            ...(to ? { [Op.lte]: to } : {}),
          },
        }
      : {};
  const transactions = await BankTransaction.findAll({
    where: {
      organizationId,
      partnerId,
      ...PARTNER_CATEGORY_WHERE,
      ...txPeriodWhere,
    },
    include: [
      {
        model: BankStatement,
        as: "statement",
        attributes: ["id", "statementNumber", "bankName"],
      },
    ],
    order: [["date", "DESC"], ["id", "DESC"]],
    limit: 300,
  });

  // početno stanje (migracija iz starog programa): najstariji "dokument"
  const opening = await PartnerOpeningBalance.findOne({
    where: { organizationId, partnerId },
  });
  const openKupac = opening ? Number(opening.kupacIznos) || 0 : 0;
  const openDob = opening ? Number(opening.dobavljacIznos) || 0 : 0;
  const openingDatum = opening ? String(opening.datum).slice(0, 10) : null;

  // izlazne fakture vezane po JIB-u ili nazivu kupca
  const pJib = normalizeDigits(partner.jib);
  const pName = normalizeName(partner.name);
  const allInvoices = await Invoice.findAll({
    where: { organizationId, type: "INVOICE" },
    attributes: [
      "id",
      "fullNumber",
      "buyerName",
      "buyerIdNumber",
      "issueDate",
      "dueDate",
      "paidAt",
      "grossTotal",
      "status",
      "docType",
    ],
    order: [["issueDate", "DESC"]],
    raw: true,
  });
  const invoices = allInvoices.filter(
    (inv) =>
      (pJib && normalizeDigits(inv.buyerIdNumber) === pJib) ||
      normalizeName(inv.buyerName) === pName,
  );

  const ulazniRacuni = await UlazniRacun.findAll({
    where: { organizationId, partnerId },
    order: [["datumRacuna", "DESC"], ["id", "DESC"]],
  });

  // računi nastali iz kalkulacija nose KLC oznaku (npr. "KLC 1/26")
  const klcByRacun = await klcMapa(
    organizationId,
    ulazniRacuni.map((r) => r.id),
  );

  // promet izabranog perioda (bez from/to = sve, kao ranije)
  let totalIn = 0;
  let totalOut = 0;
  for (const t of transactions) {
    if (t.status !== "CONFIRMED") continue;
    if ((from || to) && !inPeriod(t.date)) continue;
    if (t.direction === "IN") totalIn += Number(t.amount) || 0;
    else totalOut += Number(t.amount) || 0;
  }
  // ── Izvedeni status naplate (FIFO): potvrđena plaćanja se rasporede na
  // otvorene dokumente po datumu; ručni "plaćen"/"naplaćena" je override ──
  const racunKredit = (r) =>
    r.vrstaDokumenta === "KNJIZNA_OBAVIJEST" ||
    r.vrstaDokumenta === "STORNO_AVANSNE";
  const invKredit = (i) =>
    i.docType === "KNJIZNA_OBAVIJEST" || i.docType === "STORNO_AVANSNE";
  // krediti (KO/storno) umanjuju dug pa idu u pool kao plaćanje
  const racunKreditSum = ulazniRacuni
    .filter(racunKredit)
    .reduce((s, r) => s + (Number(r.iznos) || 0), 0);
  // kupci: samo izdane/plaćene fakture su potraživanje (CANCELLED/DRAFT ne)
  const chargeableInvoices = invoices.filter(
    (i) => i.status === "ISSUED" || i.status === "PAID",
  );
  const invKreditSum = chargeableInvoices
    .filter(invKredit)
    .reduce((s, i) => s + (Number(i.grossTotal) || 0), 0);
  // FIFO pool je LIFETIME (svih vremena), ne period: računa se preko SQL
  // suma, inače bi limit 300 / period-filter na `transactions` iskrivili
  // otvoreni dug i preostalo početnog stanja pri gledanju jedne godine.
  // Uplata vezana za konkretnu fakturu/račun ju je već zatvorila (ne u pool).
  const unlinkedIn =
    Number(
      await BankTransaction.sum("amount", {
        where: {
          organizationId,
          partnerId,
          status: "CONFIRMED",
          direction: "IN",
          invoiceId: null,
          ...PARTNER_CATEGORY_WHERE,
        },
      }),
    ) || 0;
  const unlinkedOut =
    Number(
      await BankTransaction.sum("amount", {
        where: {
          organizationId,
          partnerId,
          status: "CONFIRMED",
          direction: "OUT",
          ulazniRacunId: null,
          ...PARTNER_CATEGORY_WHERE,
        },
      }),
    ) || 0;
  // početno stanje ulazi u FIFO kao najstariji otvoreni dokument (dug iz
  // ranijih godina se zatvara prije ovogodišnjih); negativno stanje (avans/
  // pretplata) ide u pool kao već primljeno plaćanje
  const racunAlloc = allocateFifo(
    [
      ...(openDob > 0
        ? [{ id: OPENING_ID, iznos: openDob, datum: openingDatum || "1900-01-01" }]
        : []),
      ...ulazniRacuni.map((r) => ({
        id: r.id,
        iznos: Number(r.iznos) || 0,
        datum: String(r.datumRacuna).slice(0, 10),
        manualPlacen: r.status === "PLACEN",
        // samoEvidencija (uvoz/JCI) nije obaveza prema dobavljaču, van FIFO-a
        kredit: racunKredit(r) || Boolean(r.samoEvidencija),
      })),
    ],
    unlinkedOut + racunKreditSum + (openDob < 0 ? -openDob : 0),
  );
  const invAlloc = allocateFifo(
    [
      ...(openKupac > 0
        ? [{ id: OPENING_ID, iznos: openKupac, datum: openingDatum || "1900-01-01" }]
        : []),
      ...chargeableInvoices.map((i) => ({
        id: i.id,
        iznos: Number(i.grossTotal) || 0,
        datum: String(i.issueDate).slice(0, 10),
        manualPlacen: i.status === "PAID",
        kredit: invKredit(i),
      })),
    ],
    unlinkedIn + invKreditSum + (openKupac < 0 ? -openKupac : 0),
  );
  const openingKupacPreostalo =
    openKupac > 0 ? (invAlloc.get(OPENING_ID)?.preostalo ?? openKupac) : 0;
  const openingDobPreostalo =
    openDob > 0 ? (racunAlloc.get(OPENING_ID)?.preostalo ?? openDob) : 0;

  const danas = todayLocalIso();
  // dugovi su ŽIVI (cijela istorija + početno stanje), period ih ne mijenja;
  // otvoreni dio početnog stanja je odavno dospio pa ulazi i u "late"
  const openPayablesTotal =
    ulazniRacuni.reduce(
      (s, r) => s + (racunAlloc.get(r.id)?.preostalo || 0),
      0,
    ) + openingDobPreostalo;
  const openInvoicesTotal =
    chargeableInvoices.reduce(
      (s, i) => s + (invAlloc.get(i.id)?.preostalo || 0),
      0,
    ) + openingKupacPreostalo;
  const openPayablesLate =
    ulazniRacuni.reduce(
      (s, r) =>
        r.rokPlacanja && String(r.rokPlacanja).slice(0, 10) < danas
          ? s + (racunAlloc.get(r.id)?.preostalo || 0)
          : s,
      0,
    ) + openingDobPreostalo;
  const openInvoicesLate =
    chargeableInvoices.reduce(
      (s, i) =>
        i.dueDate && String(i.dueDate).slice(0, 10) < danas
          ? s + (invAlloc.get(i.id)?.preostalo || 0)
          : s,
      0,
    ) + openingKupacPreostalo;

  // donos u izabrani period: početno stanje + sav promet PRIJE from
  let donos = null;
  if (from) {
    const invPrije = chargeableInvoices
      .filter((i) => String(i.issueDate).slice(0, 10) < from)
      .reduce(
        (s, i) => s + (invKredit(i) ? -1 : 1) * (Number(i.grossTotal) || 0),
        0,
      );
    // uplate/plaćanja prije perioda preko SQL suma: lista transakcija u
    // odgovoru je limitirana na 300 najnovijih pa bi starije ispale iz donosa
    const sumTx = async (direction) =>
      Number(
        await BankTransaction.sum("amount", {
          where: {
            organizationId,
            partnerId,
            status: "CONFIRMED",
            direction,
            date: { [Op.lt]: from },
            ...PARTNER_CATEGORY_WHERE,
          },
        }),
      ) || 0;
    const uplatePrije = await sumTx("IN");
    const placanjaPrije = await sumTx("OUT");
    const racuniPrije = ulazniRacuni
      .filter(
        (r) =>
          !r.samoEvidencija && String(r.datumRacuna).slice(0, 10) < from,
      )
      .reduce(
        (s, r) => s + (racunKredit(r) ? -1 : 1) * (Number(r.iznos) || 0),
        0,
      );
    const openingUDonosu = opening && openingDatum && openingDatum < from;
    donos = {
      kupac: r2((openingUDonosu ? openKupac : 0) + invPrije - uplatePrije),
      dobavljac: r2(
        (openingUDonosu ? openDob : 0) + racuniPrije - placanjaPrije,
      ),
    };
  }

  // najranija godina sa podacima (za picker godina na frontu)
  let minDatum = openingDatum;
  for (const i of chargeableInvoices) {
    const d = String(i.issueDate).slice(0, 10);
    if (!minDatum || d < minDatum) minDatum = d;
  }
  for (const r of ulazniRacuni) {
    const d = String(r.datumRacuna).slice(0, 10);
    if (!minDatum || d < minDatum) minDatum = d;
  }
  // najranija transakcija preko SQL MIN (niz je period-scoped pa ne služi)
  const minTxDate = await BankTransaction.min("date", {
    where: { organizationId, partnerId, ...PARTNER_CATEGORY_WHERE },
  });
  if (minTxDate) {
    const d = String(minTxDate).slice(0, 10);
    if (!minDatum || d < minDatum) minDatum = d;
  }
  const minYear = minDatum ? Number(minDatum.slice(0, 4)) : null;

  // sa periodom se prikazuju samo stavke perioda (FIFO statusi su ipak
  // izračunati preko svega, pa su tačni i u godišnjem pregledu)
  const filtered = from || to;
  return res.json({
    ok: true,
    data: {
      partner: {
        ...partner.toJSON(),
        accounts: Array.isArray(partner.accounts) ? partner.accounts : [],
      },
      transactions: filtered
        ? transactions.filter((t) => inPeriod(t.date))
        : transactions,
      invoices: invoices
        .filter((i) => !filtered || inPeriod(i.issueDate))
        .map((i) => ({
          ...(typeof i.toJSON === "function" ? i.toJSON() : i),
          placeno: invAlloc.get(i.id)?.placeno ?? 0,
          preostalo:
            invAlloc.get(i.id)?.preostalo ?? (Number(i.grossTotal) || 0),
          paymentStatus: invAlloc.get(i.id)?.status ?? "OTVOREN",
        })),
      ulazniRacuni: ulazniRacuni
        .filter((r) => !filtered || inPeriod(r.datumRacuna))
        .map((r) => ({
          ...r.toJSON(),
          kalkulacijaOznaka: klcByRacun.get(r.id) ?? null,
          placeno: racunAlloc.get(r.id)?.placeno ?? 0,
          preostalo: racunAlloc.get(r.id)?.preostalo ?? (Number(r.iznos) || 0),
          paymentStatus: racunAlloc.get(r.id)?.status ?? "OTVOREN",
        })),
      period: { from: from || null, to: to || null },
      minYear,
      opening: opening
        ? {
            datum: openingDatum,
            kupacIznos: openKupac,
            dobavljacIznos: openDob,
            napomena: opening.napomena,
            kupacPreostalo: openingKupacPreostalo,
            dobavljacPreostalo: openingDobPreostalo,
          }
        : null,
      donos,
      totals: {
        totalIn,
        totalOut,
        openInvoicesTotal,
        openPayablesTotal,
        openInvoicesLate,
        openPayablesLate,
      },
    },
  });
}

// ─── Početno stanje partnera ────────────────────────────────────────────────

// GET /api/partners/:orgId/opening-balances — sva početna stanja organizacije
async function listOpeningBalances(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const rows = await PartnerOpeningBalance.findAll({
    where: { organizationId },
    raw: true,
  });
  return res.json({
    ok: true,
    data: rows.map((r) => ({
      partnerId: r.partnerId,
      datum: String(r.datum).slice(0, 10),
      kupacIznos: Number(r.kupacIznos) || 0,
      dobavljacIznos: Number(r.dobavljacIznos) || 0,
      napomena: r.napomena,
    })),
  });
}

/** Upsert jednog početnog stanja; oba iznosa 0 briše zapis. */
async function upsertOpeningBalance(organizationId, partnerId, body) {
  const datum = parseIsoDate(body?.datum);
  if (!datum) return { error: "INVALID_DATE" };
  const kupacIznos = r2(Number(body?.kupacIznos) || 0);
  const dobavljacIznos = r2(Number(body?.dobavljacIznos) || 0);
  const napomena = String(body?.napomena || "").trim() || null;
  const existing = await PartnerOpeningBalance.findOne({
    where: { organizationId, partnerId },
  });
  if (kupacIznos === 0 && dobavljacIznos === 0) {
    if (existing) await existing.destroy();
    return { data: null };
  }
  if (existing) {
    await existing.update({ datum, kupacIznos, dobavljacIznos, napomena });
    return { data: existing };
  }
  const created = await PartnerOpeningBalance.create({
    organizationId,
    partnerId,
    datum,
    kupacIznos,
    dobavljacIznos,
    napomena,
  });
  return { data: created };
}

// PUT /api/partners/:orgId/:partnerId/opening-balance
// {datum, kupacIznos, dobavljacIznos, napomena}; oba iznosa 0 = obriši
async function setOpeningBalance(req, res) {
  const organizationId = parseId(req.params.orgId);
  const partnerId = parseId(req.params.partnerId);
  if (!organizationId || !partnerId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
    attributes: ["id"],
  });
  if (!partner) {
    return res.status(404).json({ ok: false, error: "PARTNER_NOT_FOUND" });
  }
  const result = await upsertOpeningBalance(
    organizationId,
    partnerId,
    req.body,
  );
  if (result.error) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, data: result.data });
}

// POST /api/partners/:orgId/opening-balances — grupni unos (migracija):
// {items: [{partnerId, datum, kupacIznos, dobavljacIznos}]}
async function bulkSetOpeningBalances(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0 || items.length > 2000) {
    return res.status(400).json({ ok: false, error: "INVALID_ITEMS" });
  }
  const orgPartnerIds = new Set(
    (
      await Partner.findAll({
        where: { organizationId },
        attributes: ["id"],
        raw: true,
      })
    ).map((p) => p.id),
  );
  let saved = 0;
  let skipped = 0;
  for (const item of items) {
    const partnerId = parseId(item?.partnerId);
    if (!partnerId || !orgPartnerIds.has(partnerId)) {
      skipped++;
      continue;
    }
    const result = await upsertOpeningBalance(organizationId, partnerId, item);
    if (result.error) skipped++;
    else saved++;
  }
  return res.json({ ok: true, data: { saved, skipped } });
}

// ─── Kartica prometa (PDF + email) ──────────────────────────────────────────

const fmtDateHr = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
};

/** Mapa ulazniRacunId → KLC oznaka ("1/26") za račune nastale iz
 *  kalkulacija, da se na partneru vidi da je račun kalkulacija. */
async function klcMapa(organizationId, racunIds) {
  if (!racunIds.length) return new Map();
  const kalkulacije = await Kalkulacija.findAll({
    where: {
      organizationId,
      ulazniRacunId: { [Op.in]: racunIds },
    },
    attributes: ["ulazniRacunId", "broj", "godina"],
    raw: true,
  });
  return new Map(
    kalkulacije.map((k) => [
      k.ulazniRacunId,
      `${k.broj}/${String(k.godina).slice(-2)}`,
    ]),
  );
}

/** Hronološki redovi kartice: kupac (fakture duguju, uplate potražuju) ili
 *  dobavljač (njegovi računi potražuju, naša plaćanja duguju, MEGGLE stil). */
async function buildKarticaRows(organizationId, partner, type, from, to) {
  const rows = [];
  if (type === "kupac") {
    const pJib = normalizeDigits(partner.jib);
    const pName = normalizeName(partner.name);
    const invoices = await Invoice.findAll({
      where: {
        organizationId,
        type: "INVOICE",
        status: { [Op.in]: ["ISSUED", "PAID"] },
        issueDate: { [Op.gte]: from, [Op.lte]: to },
      },
      attributes: ["fullNumber", "buyerName", "buyerIdNumber", "issueDate", "dueDate", "grossTotal", "docType"],
      raw: true,
    });
    for (const inv of invoices) {
      const matches =
        (pJib && normalizeDigits(inv.buyerIdNumber) === pJib) ||
        normalizeName(inv.buyerName) === pName;
      if (!matches) continue;
      // storno avansne i knjižna obavijest ostaju na DUGOVNOJ strani kao i
      // račun na koji se vežu, samo u minusu (knjigovodstvena konvencija)
      const doc = inv.docType || "STANDARD";
      const odobrenje = doc === "STORNO_AVANSNE" || doc === "KNJIZNA_OBAVIJEST";
      const label =
        doc === "AVANSNA"
          ? `Avansna faktura ${inv.fullNumber}`
          : doc === "STORNO_AVANSNE"
            ? `Storno avans ${inv.fullNumber}`
            : doc === "KNJIZNA_OBAVIJEST"
              ? `Knjižna obavijest ${inv.fullNumber}`
              : `Faktura ${inv.fullNumber}`;
      const gross = Number(inv.grossTotal) || 0;
      rows.push({
        date: String(inv.issueDate).slice(0, 10),
        dospijece: inv.dueDate ? String(inv.dueDate).slice(0, 10) : null,
        label,
        duguje: odobrenje ? -gross : gross,
        potrazuje: 0,
      });
    }
  } else {
    const racuni = await UlazniRacun.findAll({
      where: {
        organizationId,
        partnerId: partner.id,
        datumRacuna: { [Op.gte]: from, [Op.lte]: to },
      },
      raw: true,
    });
    const klc = await klcMapa(
      organizationId,
      racuni.map((r) => r.id),
    );
    for (const r of racuni) {
      // samo PDV evidencija (uvoz/JCI) ne stvara obavezu prema dobavljaču
      if (r.samoEvidencija) continue;
      // knjižna obavijest / storno dobavljača: POTRAŽNA strana u minusu
      // (vezana je za račun, pa ostaje na istoj strani kao i on)
      const vd = r.vrstaDokumenta || "REDOVNA";
      const odobrenje = vd === "KNJIZNA_OBAVIJEST" || vd === "STORNO_AVANSNE";
      const oznaka = klc.get(r.id);
      const base = oznaka
        ? `KLC ${oznaka} · Račun ${r.brojRacuna}`
        : `Račun ${r.brojRacuna}`;
      const iznos = Number(r.iznos) || 0;
      rows.push({
        date: String(r.datumRacuna).slice(0, 10),
        label:
          vd === "KNJIZNA_OBAVIJEST"
            ? `Knjižna obavijest ${r.brojRacuna}`
            : vd === "STORNO_AVANSNE"
              ? `Storno avansa ${r.brojRacuna}`
              : base,
        dospijece: r.rokPlacanja ? String(r.rokPlacanja).slice(0, 10) : null,
        duguje: 0,
        potrazuje: odobrenje ? -iznos : iznos,
      });
    }
  }

  const txs = await BankTransaction.findAll({
    where: {
      organizationId,
      partnerId: partner.id,
      status: "CONFIRMED",
      direction: type === "kupac" ? "IN" : "OUT",
      date: { [Op.gte]: from, [Op.lte]: to },
    },
    include: [
      {
        model: BankStatement,
        as: "statement",
        attributes: ["statementNumber"],
      },
    ],
  });
  for (const t of txs) {
    const izvod = t.statement?.statementNumber
      ? `, izvod br. ${t.statement.statementNumber}`
      : "";
    rows.push({
      date: String(t.date).slice(0, 10),
      dospijece: null,
      label: type === "kupac" ? `Uplata${izvod}` : `Plaćanje${izvod}`,
      duguje: type === "kupac" ? 0 : Number(t.amount) || 0,
      potrazuje: type === "kupac" ? Number(t.amount) || 0 : 0,
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

/** Dan prije ISO datuma ("2026-01-01" → "2025-12-31"). */
function prevDayIso(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Donos strane kartice PRIJE datuma: početno stanje + sav raniji promet.
 *  Pozitivan = dug na toj strani (kupac nama / mi dobavljaču). */
async function donosZaStranu(organizationId, partner, type, beforeIso) {
  const opening = await PartnerOpeningBalance.findOne({
    where: { organizationId, partnerId: partner.id },
  });
  let saldo = 0;
  if (opening && String(opening.datum).slice(0, 10) < beforeIso) {
    saldo +=
      Number(
        type === "kupac" ? opening.kupacIznos : opening.dobavljacIznos,
      ) || 0;
  }
  const prije = await buildKarticaRows(
    organizationId,
    partner,
    type,
    "1900-01-01",
    prevDayIso(beforeIso),
  );
  for (const r of prije) {
    saldo += type === "kupac" ? r.duguje - r.potrazuje : r.potrazuje - r.duguje;
  }
  return r2(saldo);
}

/** Red donosa za PDF karticu: iznos na prirodnoj strani te kartice. */
function donosRow(date, label, saldo, type) {
  const kupac = type === "kupac";
  return {
    date,
    dospijece: null,
    label,
    duguje: kupac ? Math.max(saldo, 0) : Math.max(-saldo, 0),
    potrazuje: kupac ? Math.max(-saldo, 0) : Math.max(saldo, 0),
  };
}

async function loadKarticaContext(req) {
  const organizationId = parseId(req.params.orgId);
  const partnerId = parseId(req.params.partnerId);
  if (!organizationId || !partnerId) return { error: "INVALID_ID", status: 400 };
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
  });
  if (!partner) return { error: "PARTNER_NOT_FOUND", status: 404 };
  const org = await Organization.findByPk(organizationId, {
    attributes: ["id", "name", "address", "city", "taxNumber"],
  });

  const q = req.method === "POST" ? req.body || {} : req.query;
  const type = q.type === "kupac" ? "kupac" : "dobavljac";
  const fromInput = parseIsoDate(q.from);
  const to = parseIsoDate(q.to) || new Date().toISOString().slice(0, 10);

  // bez izabranog perioda: cijeli period prometa (od prve stavke)
  const rows = await buildKarticaRows(
    organizationId,
    partner,
    type,
    fromInput || "1900-01-01",
    to,
  );

  // donos / početno stanje na kartici
  if (fromInput) {
    const donos = await donosZaStranu(organizationId, partner, type, fromInput);
    if (Math.abs(donos) > 0.005) {
      rows.unshift(donosRow(fromInput, "Donos iz ranijeg perioda", donos, type));
    }
  }
  // početno stanje unutar prikazanog perioda (cijeli period, ili datum
  // stanja u periodu): vlastiti red na svom datumu
  const openingRec = await PartnerOpeningBalance.findOne({
    where: { organizationId, partnerId: partner.id },
  });
  if (openingRec) {
    const oDatum = String(openingRec.datum).slice(0, 10);
    const oIznos =
      Number(
        type === "kupac" ? openingRec.kupacIznos : openingRec.dobavljacIznos,
      ) || 0;
    const uPrikazu = (!fromInput || oDatum >= fromInput) && oDatum <= to;
    if (uPrikazu && Math.abs(oIznos) > 0.005) {
      rows.push(
        donosRow(oDatum, `Početno stanje na ${fmtDateHr(oDatum)}`, oIznos, type),
      );
      rows.sort((a, b) => a.date.localeCompare(b.date));
    }
  }
  const from =
    fromInput || rows[0]?.date || `${new Date().getFullYear()}-01-01`;
  const pdf = await buildKarticaPdf({
    org: {
      name: org.name,
      address: org.address,
      city: org.city,
      jib: org.taxNumber || "",
    },
    partner: partner.toJSON(),
    type,
    period: { from, to },
    rows,
  });
  const filename = `Kartica_${type === "kupac" ? "kupca" : "dobavljaca"}_${String(
    partner.code || partner.id,
  ).padStart(4, "0")}.pdf`;
  return { partner, org, type, from, to, pdf, filename };
}

// GET /api/partners/:orgId/:partnerId/kartica.pdf?type=kupac|dobavljac&from=&to=
async function karticaPdfDownload(req, res) {
  const ctx = await loadKarticaContext(req);
  if (ctx.error) {
    return res.status(ctx.status).json({ ok: false, error: ctx.error });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${ctx.filename}"`,
  );
  return res.send(ctx.pdf);
}

// POST /api/partners/:orgId/:partnerId/kartica/email {type, from, to}
async function karticaEmail(req, res) {
  const ctx = await loadKarticaContext(req);
  if (ctx.error) {
    return res.status(ctx.status).json({ ok: false, error: ctx.error });
  }
  const to = String(ctx.partner.email || "").trim();
  if (!to) {
    return res.status(400).json({ ok: false, error: "NO_EMAIL" });
  }
  try {
    await sendKarticaEmail({
      to,
      partnerName: ctx.partner.name,
      orgName: ctx.org.name,
      type: ctx.type,
      periodLabel: `${fmtDateHr(ctx.from)} - ${fmtDateHr(ctx.to)}`,
      pdfBuffer: ctx.pdf,
      filename: ctx.filename,
    });
  } catch (e) {
    console.error("kartica email error:", e.message);
    return res.status(502).json({ ok: false, error: "EMAIL_FAILED" });
  }
  return res.json({ ok: true, data: { sentTo: to } });
}

// ─── IOS: izvod otvorenih stavki ────────────────────────────────────────────

// Otvorene stavke na dan: kupac = naše otvorene fakture prema partneru,
// dobavljac = naši otvoreni ulazni računi. Stavka je "otvorena na dan" ako
// je izdana do tog dana i nije plaćena, ili je plaćena NAKON tog dana.
async function buildIosRows(organizationId, partner, type, naDan) {
  const rows = [];
  if (type === "kupac") {
    const pJib = normalizeDigits(partner.jib);
    const pName = normalizeName(partner.name);
    const invoices = await Invoice.findAll({
      where: {
        organizationId,
        type: "INVOICE",
        status: { [Op.in]: ["ISSUED", "PAID"] },
        issueDate: { [Op.lte]: naDan },
      },
      attributes: [
        "fullNumber", "buyerName", "buyerIdNumber", "issueDate",
        "dueDate", "paidAt", "grossTotal", "status", "docType",
      ],
      raw: true,
    });
    for (const inv of invoices) {
      const matches =
        (pJib && normalizeDigits(inv.buyerIdNumber) === pJib) ||
        normalizeName(inv.buyerName) === pName;
      if (!matches) continue;
      const otvorena =
        inv.status === "ISSUED" ||
        (inv.paidAt && String(inv.paidAt).slice(0, 10) > naDan);
      if (!otvorena) continue;
      const doc = inv.docType || "STANDARD";
      // odobrenja (storno avansa, knjižna obavijest) umanjuju potraživanje
      const odobrenje = doc === "STORNO_AVANSNE" || doc === "KNJIZNA_OBAVIJEST";
      const prefix =
        doc === "AVANSNA"
          ? "Avansna faktura"
          : doc === "STORNO_AVANSNE"
            ? "Storno avans"
            : doc === "KNJIZNA_OBAVIJEST"
              ? "Knjižna obavijest"
              : "Faktura";
      rows.push({
        broj: `${prefix} ${inv.fullNumber}`,
        datum: String(inv.issueDate).slice(0, 10),
        valuta: inv.dueDate ? String(inv.dueDate).slice(0, 10) : null,
        iznos: (odobrenje ? -1 : 1) * (Number(inv.grossTotal) || 0),
      });
    }
  } else {
    const racuni = await UlazniRacun.findAll({
      where: {
        organizationId,
        partnerId: partner.id,
        datumRacuna: { [Op.lte]: naDan },
      },
      raw: true,
    });
    for (const r of racuni) {
      // samo PDV evidencija (uvoz/JCI) ne stvara obavezu prema dobavljaču
      if (r.samoEvidencija) continue;
      const otvoren =
        r.status === "OTVOREN" ||
        (r.paidAt && String(r.paidAt).slice(0, 10) > naDan);
      if (!otvoren) continue;
      // knjižna obavijest / storno dobavljača umanjuju obavezu (minus)
      const vd = r.vrstaDokumenta || "REDOVNA";
      const odobrenje = vd === "KNJIZNA_OBAVIJEST" || vd === "STORNO_AVANSNE";
      const prefix =
        vd === "KNJIZNA_OBAVIJEST"
          ? "Knjižna obavijest"
          : vd === "STORNO_AVANSNE"
            ? "Storno avansa"
            : "Račun";
      rows.push({
        broj: `${prefix} ${r.brojRacuna}`,
        datum: String(r.datumRacuna).slice(0, 10),
        valuta: r.rokPlacanja ? String(r.rokPlacanja).slice(0, 10) : null,
        iznos: (odobrenje ? -1 : 1) * (Number(r.iznos) || 0),
      });
    }
  }

  // otvoreni dio početnog stanja (dug iz starog programa) je otvorena
  // stavka na dan; valuta = datum stanja (odavno dospjelo, ulazi i u opomenu)
  const open = await openingPreostaloNaDan(organizationId, partner, type, naDan);
  if (open && Math.abs(open.preostalo) > 0.005) {
    rows.push({
      broj:
        open.preostalo < 0
          ? "Početno stanje (avans)"
          : "Početno stanje (donos)",
      datum: open.datum,
      valuta: open.datum,
      iznos: open.preostalo,
    });
  }

  rows.sort((a, b) => a.datum.localeCompare(b.datum));
  return rows;
}

/** Otvoreni dio početnog stanja partnera na dan. FIFO: nevezane uplate
 *  (bez fakture/računa) najprije zatvaraju najstarije, a početno stanje je
 *  najstarije, pa je preostalo = stanje - nevezane uplate do tog dana. */
async function openingPreostaloNaDan(organizationId, partner, type, naDan) {
  const opening = await PartnerOpeningBalance.findOne({
    where: { organizationId, partnerId: partner.id },
  });
  if (!opening) return null;
  const iznos =
    Number(type === "kupac" ? opening.kupacIznos : opening.dobavljacIznos) || 0;
  const datum = String(opening.datum).slice(0, 10);
  if (iznos === 0 || datum > naDan) return null;
  // negativno = avans/pretplata: kredit koji umanjuje dug; prikazuje se kao
  // negativna stavka (kao i u kartici gdje ide u pool plaćanja), pool se ne
  // primjenjuje na kredit
  if (iznos < 0) {
    return { datum, iznos, preostalo: r2(iznos) };
  }
  const pool = await BankTransaction.sum("amount", {
    where: {
      organizationId,
      partnerId: partner.id,
      status: "CONFIRMED",
      direction: type === "kupac" ? "IN" : "OUT",
      [type === "kupac" ? "invoiceId" : "ulazniRacunId"]: null,
      date: { [Op.lte]: naDan },
      ...PARTNER_CATEGORY_WHERE,
    },
  });
  return {
    datum,
    iznos,
    preostalo: Math.max(0, r2(iznos - (Number(pool) || 0))),
  };
}

async function loadIosContext(req) {
  const organizationId = parseId(req.params.orgId);
  const partnerId = parseId(req.params.partnerId);
  if (!organizationId || !partnerId) return { error: "INVALID_ID", status: 400 };
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
  });
  if (!partner) return { error: "PARTNER_NOT_FOUND", status: 404 };
  const org = await Organization.findByPk(organizationId, {
    attributes: ["id", "name", "address", "city", "taxNumber"],
  });

  const q = req.method === "POST" ? req.body || {} : req.query;
  const type = q.type === "kupac" ? "kupac" : "dobavljac";
  const naDan = parseIsoDate(q.naDan) || new Date().toISOString().slice(0, 10);

  const rows = await buildIosRows(organizationId, partner, type, naDan);
  const pdf = await buildIosPdf({
    org: {
      name: org.name,
      address: org.address,
      city: org.city,
      jib: org.taxNumber || "",
    },
    partner: partner.toJSON(),
    type,
    naDan,
    rows,
  });
  const filename = `IOS_${String(partner.code || partner.id).padStart(4, "0")}_${naDan}.pdf`;
  return { partner, org, type, naDan, pdf, filename };
}

// GET /api/partners/:orgId/:partnerId/ios.pdf?type=kupac|dobavljac&naDan=
async function iosPdfDownload(req, res) {
  const ctx = await loadIosContext(req);
  if (ctx.error) {
    return res.status(ctx.status).json({ ok: false, error: ctx.error });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${ctx.filename}"`,
  );
  return res.send(ctx.pdf);
}

// POST /api/partners/:orgId/:partnerId/ios/email {type, naDan}
async function iosEmail(req, res) {
  const ctx = await loadIosContext(req);
  if (ctx.error) {
    return res.status(ctx.status).json({ ok: false, error: ctx.error });
  }
  const to = String(ctx.partner.email || "").trim();
  if (!to) {
    return res.status(400).json({ ok: false, error: "NO_EMAIL" });
  }
  try {
    await sendIosEmail({
      to,
      partnerName: ctx.partner.name,
      orgName: ctx.org.name,
      naDanLabel: fmtDateHr(ctx.naDan),
      pdfBuffer: ctx.pdf,
      filename: ctx.filename,
    });
  } catch (e) {
    console.error("ios email error:", e.message);
    return res.status(502).json({ ok: false, error: "EMAIL_FAILED" });
  }
  return res.json({ ok: true, data: { sentTo: to } });
}

// ─── Opomena kupcu (dospjeli neplaćeni računi) ──────────────────────────────

// Redovi opomene: dospjele otvorene fakture (valuta prošla), plus odobrenja
// (KO/storno, negativni) da ukupan dug bude fer. Reuse IOS logike.
async function buildOpomenaContext(req) {
  const organizationId = parseId(req.params.orgId);
  const partnerId = parseId(req.params.partnerId);
  if (!organizationId || !partnerId) return { error: "INVALID_ID", status: 400 };
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
  });
  if (!partner) return { error: "PARTNER_NOT_FOUND", status: 404 };
  const org = await Organization.findByPk(organizationId, {
    attributes: ["id", "name", "address", "city", "taxNumber", "bankAccount"],
  });

  const q = req.method === "POST" ? req.body || {} : req.query;
  const nivo = Number(q.nivo) === 2 ? 2 : 1;
  const danas = todayLocalIso();

  const sve = await buildIosRows(organizationId, partner, "kupac", danas);
  const rows = sve.filter(
    (r) => (r.valuta && String(r.valuta).slice(0, 10) < danas) || r.iznos < 0,
  );
  const dug = rows.reduce((s, r) => s + (r.iznos || 0), 0);
  if (!rows.some((r) => r.iznos > 0) || dug <= 0) {
    return { error: "NEMA_DOSPJELOG_DUGA", status: 400 };
  }

  const pdf = await buildOpomenaPdf({
    org: {
      name: org.name,
      address: org.address,
      city: org.city,
      jib: org.taxNumber || "",
      bankAccount: org.bankAccount || "",
    },
    partner: partner.toJSON(),
    naDan: danas,
    rok: 8,
    nivo,
    rows,
  });
  const filename = `Opomena${nivo === 2 ? "-pred-utuzenje" : ""}_${String(
    partner.code || partner.id,
  ).padStart(4, "0")}_${danas}.pdf`;
  return { partner, org, nivo, danas, dug, pdf, filename };
}

// GET /api/partners/:orgId/:partnerId/opomena.pdf?nivo=1|2
async function opomenaPdfDownload(req, res) {
  const ctx = await buildOpomenaContext(req);
  if (ctx.error) {
    return res.status(ctx.status).json({ ok: false, error: ctx.error });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${ctx.filename}"`,
  );
  return res.send(ctx.pdf);
}

// POST /api/partners/:orgId/:partnerId/opomena/email { nivo }
async function opomenaEmail(req, res) {
  const ctx = await buildOpomenaContext(req);
  if (ctx.error) {
    return res.status(ctx.status).json({ ok: false, error: ctx.error });
  }
  const to = String(ctx.partner.email || "").trim();
  if (!to) {
    return res.status(400).json({ ok: false, error: "NO_EMAIL" });
  }
  try {
    await sendOpomenaEmail({
      to,
      partnerName: ctx.partner.name,
      orgName: ctx.org.name,
      nivo: ctx.nivo,
      dug: ctx.dug,
      pdfBuffer: ctx.pdf,
      filename: ctx.filename,
    });
  } catch (e) {
    console.error("opomena email error:", e.message);
    return res.status(502).json({ ok: false, error: "EMAIL_FAILED" });
  }
  return res.json({ ok: true, data: { sentTo: to } });
}

// ─── Spajanje duplikata ─────────────────────────────────────────────────────

// POST /api/partners/:orgId/:partnerId/merge { targetId }
// Sav promet izvornog partnera (transakcije, ulazni računi, prebijanja,
// kalkulacije, razduženja) prelazi na ciljnog, prazna polja ciljnog se
// popune iz izvornog, žiro računi se uniraju, izvorni partner se briše.
// Izlazne fakture se vežu po JIB-u/nazivu kupca: fakture izvornika se
// prevežu na ciljni identitet (naziv + JIB) da ostanu na spojenom partneru.
async function merge(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const sourceId = parseId(req.params.partnerId);
    const targetId = parseId((req.body || {}).targetId);
    if (!organizationId || !sourceId || !targetId) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    if (sourceId === targetId) {
      return res.status(400).json({ ok: false, error: "SAME_PARTNER" });
    }
    const source = await Partner.findOne({
      where: { id: sourceId, organizationId },
    });
    const target = await Partner.findOne({
      where: { id: targetId, organizationId },
    });
    if (!source || !target) {
      return res.status(404).json({ ok: false, error: "PARTNER_NOT_FOUND" });
    }

    await sequelize.transaction(async (t) => {
      const w = { where: { organizationId, partnerId: sourceId }, transaction: t };
      await BankTransaction.update({ partnerId: targetId }, w);
      await UlazniRacun.update({ partnerId: targetId }, w);
      await Prebijanje.update({ partnerId: targetId }, w);
      await Prebijanje.update(
        { cesusPartnerId: targetId },
        { where: { organizationId, cesusPartnerId: sourceId }, transaction: t },
      );
      await Prebijanje.update(
        { cesionarPartnerId: targetId },
        { where: { organizationId, cesionarPartnerId: sourceId }, transaction: t },
      );
      await Kalkulacija.update({ partnerId: targetId }, w);
      await Razduzenje.update({ partnerId: targetId }, w);

      const fill = {};
      for (const k of ["jib", "pdvBroj", "address", "city", "email", "phone", "note"]) {
        if (!target[k] && source[k]) fill[k] = source[k];
      }
      fill.accounts = Array.from(
        new Set([
          ...(Array.isArray(target.accounts) ? target.accounts : []),
          ...(Array.isArray(source.accounts) ? source.accounts : []),
        ]),
      );
      if (source.isKupac && !target.isKupac) fill.isKupac = true;
      if (source.isDobavljac && !target.isDobavljac) fill.isDobavljac = true;
      await target.update(fill, { transaction: t });

      // Izlazne fakture se ne vežu po partnerId nego po JIB-u/nazivu kupca.
      // Da izvornikove fakture ostanu na spojenom partneru i kad ciljni ima
      // svoj (drugačiji) JIB, prepišemo im kupca na kanonski ciljni identitet.
      // Bez ovoga bi nakon brisanja izvornika te fakture ostale bez partnera.
      const srcJib = normalizeDigits(source.jib);
      const srcName = normalizeName(source.name);
      const tgtJib = target.jib || null; // fill je možda upravo kopirao source.jib
      if (srcJib || srcName) {
        const invoices = await Invoice.findAll({
          where: { organizationId, type: "INVOICE" },
          attributes: ["id", "buyerName", "buyerIdNumber"],
          transaction: t,
        });
        for (const inv of invoices) {
          const matchSrc =
            (srcJib && normalizeDigits(inv.buyerIdNumber) === srcJib) ||
            (srcName && normalizeName(inv.buyerName) === srcName);
          if (!matchSrc) continue;
          // već pogađa ciljni identitet (isti JIB ili naziv) → ne diraj
          const matchTgt =
            (tgtJib && normalizeDigits(inv.buyerIdNumber) === tgtJib) ||
            normalizeName(inv.buyerName) === normalizeName(target.name);
          if (matchTgt) continue;
          await inv.update(
            { buyerName: target.name, buyerIdNumber: tgtJib },
            { transaction: t },
          );
        }
      }

      await source.destroy({ transaction: t });
    });

    return res.json({ ok: true, data: { targetId } });
  } catch (err) {
    console.error("partner merge error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  list,
  suggestions,
  hideSuggestion,
  listOpeningBalances,
  setOpeningBalance,
  bulkSetOpeningBalances,
  create,
  update,
  remove,
  uvozPartnera,
  uvozIzObrta,
  promet,
  listUlazniRacuni,
  createUlazniRacun,
  updateUlazniRacun,
  removeUlazniRacun,
  kartica,
  karticaPdfDownload,
  karticaEmail,
  iosPdfDownload,
  iosEmail,
  opomenaPdfDownload,
  opomenaEmail,
  merge,
  loadPartnerMatcher,
  isNonPartnerCategory,
  normalizeDigits,
  tryMatchExistingPayment,
};
