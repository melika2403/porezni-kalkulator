// PK Office: upload i pregled bankovnih izvoda.
// Upload: PDF → parser (per-bank) → validacija salda → snimi izvod +
// transakcije. Izvod koji ne prođe validaciju se NE snima.

const { Op } = require("sequelize");
const {
  sequelize,
  BankStatement,
  BankTransaction,
  Organization,
  OrganizationMember,
  Invoice,
  UlazniRacun,
  Partner,
} = require("../models/index");
const { loadInvoiceMatcher } = require("../services/bankStatements/invoiceMatch");
const {
  bankNameFromAccount,
  formatAccountDashed,
  normalizeAccountDigits,
} = require("../services/bankStatements/bankCodes");
const { parseBankStatement } = require("../services/bankStatements");
const { suggestCategory } = require("../services/bankStatements/categorize");
const { isValidCategory } = require("../services/bankStatements/categories");
const {
  loadRuleSuggester,
  learnFromTransaction,
} = require("../services/bankStatements/rules");
const { buildKpr } = require("../services/kpr");
const { loadPartnerMatcher } = require("./partnersController");

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const toCents = (v) => Math.round(Number(v) * 100);
const fmtKm = (v) =>
  Number(v).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Potvrđena stavka sa povezanom fakturom → faktura je naplaćena na datum
// priliva (princip blagajne).
async function markInvoicePaid(tx) {
  if (!tx.invoiceId) return;
  const inv = await Invoice.findOne({
    where: { id: tx.invoiceId, organizationId: tx.organizationId },
  });
  if (inv && inv.status === "ISSUED") {
    inv.status = "PAID";
    inv.paidAt = tx.date || new Date();
    await inv.save();
  }
}

// Stavka vraćena u pregled / odvezana: ako više nijedna potvrđena stavka
// ne pokazuje na fakturu, faktura se vraća na ISSUED.
async function maybeRevertInvoice(organizationId, invoiceId) {
  if (!invoiceId) return;
  const stillConfirmed = await BankTransaction.count({
    where: { invoiceId, organizationId, status: "CONFIRMED" },
  });
  if (stillConfirmed > 0) return;
  const inv = await Invoice.findOne({
    where: { id: invoiceId, organizationId, status: "PAID" },
  });
  if (inv) {
    inv.status = "ISSUED";
    inv.paidAt = null;
    await inv.save();
  }
}

// Kontrola kontinuiteta salda po računu: završno stanje prethodnog izvoda
// mora biti početno stanje novog (i obratno prema sljedećem). Neslaganje
// znači da vjerovatno nedostaje izvod između — upozorenje, ne blokada.
async function continuityWarnings(organizationId, parsed) {
  if (!parsed.account || parsed.openingBalance == null) return [];

  const existing = await BankStatement.findAll({
    where: { organizationId, account: parsed.account },
    attributes: ["statementNumber", "statementDate", "openingBalance", "closingBalance"],
    raw: true,
  });
  if (existing.length === 0) return [];

  // poredak: datum pa numerički broj izvoda
  const sortKey = (s) =>
    `${s.statementDate || ""}|${String(Number(s.statementNumber) || 0).padStart(8, "0")}`;
  const newKey = sortKey(parsed);
  let prev = null;
  let next = null;
  for (const s of existing) {
    const k = sortKey(s);
    if (k < newKey && (!prev || k > sortKey(prev))) prev = s;
    if (k > newKey && (!next || k < sortKey(next))) next = s;
  }

  const warnings = [];
  if (
    prev &&
    prev.closingBalance != null &&
    toCents(prev.closingBalance) !== toCents(parsed.openingBalance)
  ) {
    warnings.push(
      `Početno stanje (${fmtKm(parsed.openingBalance)} KM) se ne slaže sa završnim stanjem izvoda br. ${prev.statementNumber} (${fmtKm(prev.closingBalance)} KM). Možda nedostaje izvod između.`,
    );
  }
  if (
    next &&
    next.openingBalance != null &&
    parsed.closingBalance != null &&
    toCents(next.openingBalance) !== toCents(parsed.closingBalance)
  ) {
    warnings.push(
      `Završno stanje (${fmtKm(parsed.closingBalance)} KM) se ne slaže sa početnim stanjem izvoda br. ${next.statementNumber} (${fmtKm(next.openingBalance)} KM). Možda nedostaje izvod između.`,
    );
  }
  return warnings;
}

// Novi žiro račun viđen na izvodu se automatski dopisuje u profil
// organizacije (bankAccounts lista; glavni račun se ne mijenja).
async function addAccountToOrgProfile(organizationId, account) {
  const digits = String(account || "").replace(/\D+/g, "");
  if (digits.length < 8) return;
  const org = await Organization.findByPk(organizationId, {
    attributes: ["id", "bankAccount", "bankAccounts"],
  });
  if (!org) return;
  let list = org.bankAccounts;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }
  if (!Array.isArray(list)) list = [];
  const mainDigits = String(org.bankAccount || "").replace(/\D+/g, "");
  // lista kreće od glavnog računa iz profila (ako lista još ne postoji)
  if (list.length === 0 && mainDigits) list = [mainDigits];
  const normalized = list.map((a) => String(a || "").replace(/\D+/g, "")).filter(Boolean);
  if (normalized.includes(digits)) return;
  const next = [...normalized, digits];
  await Organization.update(
    // org bez glavnog računa: prvi viđeni postaje glavni (dashed, kao svugdje)
    {
      bankAccounts: next,
      bankAccount: org.bankAccount || formatAccountDashed(digits),
    },
    { where: { id: organizationId } },
  );
}

// Duplikat izvoda: isti datum + isti broj izvoda + isti račun, s tim da se
// račun poredi po ciframa (ručni unos zna imati crtice/razmake ili račun iz
// profila) a broj izvoda numerički ("07" == "7"). Ako neka strana nema račun
// (stariji ručni unosi), broj izvoda + datum je dovoljan signal.
async function findDuplicateStatement(organizationId, parsed) {
  if (!parsed.statementNumber || !parsed.statementDate) return null;
  const numNorm = Number(parsed.statementNumber)
    ? String(Number(parsed.statementNumber))
    : String(parsed.statementNumber).trim();
  const accDigits = normalizeAccountDigits(parsed.account);

  const candidates = await BankStatement.findAll({
    where: { organizationId, statementDate: parsed.statementDate },
    attributes: ["id", "account", "statementNumber"],
    raw: true,
  });
  for (const c of candidates) {
    const cNum = Number(c.statementNumber)
      ? String(Number(c.statementNumber))
      : String(c.statementNumber || "").trim();
    if (!cNum || cNum !== numNorm) continue;
    const cAcc = normalizeAccountDigits(c.account);
    // dva računa iste org-e mogu imati isti broj izvoda istog dana:
    // poznata i različita oba računa = NIJE duplikat
    if (cAcc && accDigits && cAcc !== accDigits) continue;
    return c;
  }
  return null;
}

// Upozorenje (ne blokada) kad se na izvodu ne prepoznaje naziv organizacije,
// npr. učitan je izvod druge firme. Traže se karakteristične riječi naziva
// u kompletnom tekstu izvoda; generičke riječi (OBRT, DOO, VL...) se preskaču.
const GENERIC_NAME_TOKENS = new Set([
  "OBRT", "OBRTA", "DOO", "DD", "VL", "SZR", "SUR", "STR", "TR", "UG",
  "PZU", "ZU", "JU", "GRADEVINSKI", "USLUZNI", "TRGOVINSKI", "ZANATSKI",
  "UGOSTITELJSKI", "SAMOSTALNA", "DJELATNOST", "RADNJA",
]);
function normalizeStatementText(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, " ");
}
function ownerMismatchWarning(orgName, allText) {
  const tokens = normalizeStatementText(orgName)
    .split(" ")
    .filter((t) => t.length >= 4 && !GENERIC_NAME_TOKENS.has(t));
  if (tokens.length === 0 || !allText) return null;
  // Poklapanje po CIJELOJ riječi (ne substring): naziv "MARK" se ne smije
  // poklopiti sa "MARKET" na tuđem izvodu i tako potisnuti upozorenje.
  const textWords = new Set(
    normalizeStatementText(allText).split(" ").filter(Boolean),
  );
  if (tokens.some((t) => textWords.has(t))) return null;
  return `Na izvodu nije pronađen naziv organizacije "${orgName}". Provjerite da li izvod pripada ovom obrtu (možda je učitan izvod druge firme).`;
}

// POST /api/bank-statements/:orgId/upload  (multipart, polje "file")
async function upload(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ ok: false, error: "NO_FILE" });
  }

  const result = await parseBankStatement(req.file.buffer);

  if (!result.ok) {
    // 422: fajl je primljen ali se ne može (pouzdano) obraditi
    return res.status(422).json({
      ok: false,
      error: result.error,
      errorDetail: result.errorDetail || null,
      bankName: result.bankName || null,
      validationErrors: result.validation ? result.validation.errors : null,
    });
  }

  // duplikat: isti račun + broj izvoda + datum za ovu organizaciju
  // (normalizovano, hvata i ranije ručno unesene izvode)
  const existing = await findDuplicateStatement(organizationId, result);
  if (existing) {
    return res.status(409).json({
      ok: false,
      error: "DUPLICATE_STATEMENT",
      statementId: existing.id,
    });
  }

  // naučena pravila organizacije imaju prednost nad seed pravilima
  const learnedSuggest = await loadRuleSuggester(organizationId);
  // auto-match priliva na otvorene fakture
  const matchInvoice = await loadInvoiceMatcher(organizationId);
  // poslovni partneri: po žiro računu, pa po nazivu protivstrane
  const matchPartner = await loadPartnerMatcher(organizationId);

  // izvod druge firme? upozorenje, ne blokada
  const orgRow = await Organization.findByPk(organizationId, {
    attributes: ["id", "name"],
  });
  const ownerWarning = ownerMismatchWarning(orgRow?.name, result.allText);

  // kontinuitet salda prema postojećim izvodima istog računa
  const allWarnings = [
    ...(result.warnings || []),
    ...(await continuityWarnings(organizationId, result)),
    ...(ownerWarning ? [ownerWarning] : []),
  ];

  let created;
  try {
    created = await sequelize.transaction(async (t) => {
    const statement = await BankStatement.create(
      {
        organizationId,
        uploadedById: req.user.id,
        bankId: result.bankId,
        bankName: result.bankName,
        account: result.account,
        statementNumber: result.statementNumber,
        statementDate: result.statementDate,
        currency: result.currency,
        openingBalance: result.openingBalance,
        closingBalance: result.closingBalance,
        fileName: req.file.originalname,
        warnings: allWarnings.length ? allWarnings : null,
      },
      { transaction: t },
    );
    await BankTransaction.bulkCreate(
      result.transactions.map((tx) => {
        const invoiceId = matchInvoice(tx);
        return {
          organizationId,
          statementId: statement.id,
          date: tx.date,
          description: tx.description || null,
          reference: tx.reference || null,
          counterpartyName: tx.counterpartyName || null,
          counterpartyAccount: tx.counterpartyAccount || null,
          amount: tx.amount,
          direction: tx.direction === "in" ? "IN" : "OUT",
          balanceAfter: tx.balanceAfter,
          // prijedlog kategorije: naučeno pravilo → faktura → seed pravila
          category:
            learnedSuggest(tx) ??
            (invoiceId ? "PRIHOD_RACUN" : suggestCategory(tx)),
          invoiceId,
          partnerId: matchPartner(tx),
        };
      }),
      { transaction: t },
    );
    return statement;
    });
  } catch (e) {
    // istovremeni upload istog izvoda: unique index (org+broj+datum+račun)
    // uhvati duplikat koji je promakao pred-provjeri (check-then-insert race)
    if (e && e.name === "SequelizeUniqueConstraintError") {
      const dup = await findDuplicateStatement(organizationId, result);
      return res.status(409).json({
        ok: false,
        error: "DUPLICATE_STATEMENT",
        statementId: dup ? dup.id : null,
      });
    }
    throw e;
  }

  // novi račun sa izvoda ide u profil organizacije (preskačemo kad izvod
  // možda ne pripada ovoj firmi, da tuđi račun ne završi u profilu)
  if (!ownerWarning) {
    await addAccountToOrgProfile(organizationId, result.account);
  }

  return res.status(201).json({
    ok: true,
    data: {
      statementId: created.id,
      bankName: result.bankName,
      statementNumber: result.statementNumber,
      statementDate: result.statementDate,
      transactionCount: result.transactions.length,
      totalIn: result.validation.computed.totalIn,
      totalOut: result.validation.computed.totalOut,
      openingBalance: result.openingBalance,
      closingBalance: result.closingBalance,
      warnings: allWarnings,
    },
  });
}

// GET /api/bank-statements/:orgId — lista izvoda (najnoviji prvi) sa
// brojačima stavki, za grupisanje po banci/računu na frontendu
async function list(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const statements = await BankStatement.findAll({
    where: { organizationId },
    order: [
      ["statementDate", "DESC"],
      ["id", "DESC"],
    ],
    limit: 200,
  });

  // brojači po izvodu: ukupno i nepotvrđeno
  const counts = await BankTransaction.findAll({
    where: { organizationId },
    attributes: [
      "statementId",
      "status",
      [sequelize.fn("COUNT", sequelize.col("id")), "cnt"],
    ],
    group: ["statementId", "status"],
    raw: true,
  });
  const byStatement = new Map();
  for (const c of counts) {
    const entry = byStatement.get(c.statementId) || { total: 0, unmatched: 0 };
    entry.total += Number(c.cnt);
    if (c.status === "UNMATCHED") entry.unmatched += Number(c.cnt);
    byStatement.set(c.statementId, entry);
  }

  // potvrđene stavke bez kategorije ne ulaze u KPR: upozorenje na kartici
  const noCat = await BankTransaction.findAll({
    where: { organizationId, status: "CONFIRMED", category: null },
    attributes: [
      "statementId",
      [sequelize.fn("COUNT", sequelize.col("id")), "cnt"],
    ],
    group: ["statementId"],
    raw: true,
  });
  const noCatByStatement = new Map(
    noCat.map((c) => [c.statementId, Number(c.cnt)]),
  );

  // promet po izvodu (zbir priliva i odliva), za prikaz na listi bez otvaranja
  const sums = await BankTransaction.findAll({
    where: { organizationId },
    attributes: [
      "statementId",
      "direction",
      [sequelize.fn("SUM", sequelize.col("amount")), "total"],
    ],
    group: ["statementId", "direction"],
    raw: true,
  });
  const sumByStatement = new Map();
  for (const r of sums) {
    const e = sumByStatement.get(r.statementId) || { in: 0, out: 0 };
    if (r.direction === "IN") e.in = Number(r.total) || 0;
    else e.out = Number(r.total) || 0;
    sumByStatement.set(r.statementId, e);
  }

  const data = statements.map((s) => {
    const entry = byStatement.get(s.id) || { total: 0, unmatched: 0 };
    const sum = sumByStatement.get(s.id) || { in: 0, out: 0 };
    return {
      ...s.toJSON(),
      txCount: entry.total,
      unmatchedCount: entry.unmatched,
      bezKategorijeCount: noCatByStatement.get(s.id) || 0,
      totalIn: Math.round(sum.in * 100) / 100,
      totalOut: Math.round(sum.out * 100) / 100,
    };
  });
  return res.json({ ok: true, data });
}

// GET /api/bank-statements/:orgId/statement/:statementId — detalj + stavke
async function getStatement(req, res) {
  const organizationId = parseId(req.params.orgId);
  const statementId = parseId(req.params.statementId);
  if (!organizationId || !statementId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const statement = await BankStatement.findOne({
    where: { id: statementId, organizationId },
    include: [
      {
        model: BankTransaction,
        as: "transactions",
        separate: true,
        order: [
          ["date", "ASC"],
          ["id", "ASC"],
        ],
        include: [
          {
            model: Invoice,
            as: "invoice",
            attributes: ["id", "fullNumber", "grossTotal", "status"],
          },
        ],
      },
    ],
  });
  if (!statement) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  return res.json({ ok: true, data: statement });
}

// POST /api/bank-statements/:orgId/statement/:statementId/confirm-all
// Sve nepotvrđene stavke izvoda → CONFIRMED.
// Potvrđena isplata partneru pokušava zatvoriti njegov otvoren ulazni
// račun: po tačnom iznosu (ako je jedinstven) ili po broju računa u
// opisu/referenci. Konzervativno: bez jedinstvenog pogotka ne radi ništa.
async function maybeCloseUlazniRacun(tx) {
  if (!tx || tx.direction !== "OUT" || !tx.partnerId || tx.ulazniRacunId) {
    return;
  }
  const open = await UlazniRacun.findAll({
    where: {
      organizationId: tx.organizationId,
      partnerId: tx.partnerId,
      status: "OTVOREN",
    },
  });
  if (open.length === 0) return;
  const amt = toCents(tx.amount);
  let match = null;
  const byAmount = open.filter((r) => toCents(r.iznos) === amt);
  if (byAmount.length === 1) {
    match = byAmount[0];
  } else {
    const text = `${tx.description || ""} ${tx.reference || ""}`.toLowerCase();
    const byNumber = open.filter(
      (r) =>
        r.brojRacuna && text.includes(String(r.brojRacuna).toLowerCase()),
    );
    if (byNumber.length === 1) match = byNumber[0];
  }
  if (!match) return;
  await match.update({
    status: "PLACEN",
    paidAt: tx.date || match.datumRacuna,
  });
  await BankTransaction.update(
    { ulazniRacunId: match.id },
    { where: { id: tx.id } },
  );
}

// Vraćanje isplate iz potvrde: ulazni račun se ponovo otvara ako ga ne
// drži nijedna druga potvrđena isplata.
async function maybeReopenUlazniRacun(organizationId, ulazniRacunId) {
  if (!ulazniRacunId) return;
  const stillPaid = await BankTransaction.count({
    where: { organizationId, ulazniRacunId, status: "CONFIRMED" },
  });
  if (stillPaid > 0) return;
  await UlazniRacun.update(
    { status: "OTVOREN", paidAt: null },
    { where: { id: ulazniRacunId, organizationId } },
  );
}

async function confirmAll(req, res) {
  const organizationId = parseId(req.params.orgId);
  const statementId = parseId(req.params.statementId);
  if (!organizationId || !statementId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const statement = await BankStatement.findOne({
    where: { id: statementId, organizationId },
  });
  if (!statement) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  // prije potvrde pokupi stavke sa kategorijom radi učenja pravila
  const toLearn = await BankTransaction.findAll({
    where: { statementId, organizationId, status: "UNMATCHED" },
    raw: true,
  });

  const [updated] = await BankTransaction.update(
    { status: "CONFIRMED" },
    { where: { statementId, organizationId, status: "UNMATCHED" } },
  );

  for (const tx of toLearn) {
    await learnFromTransaction(organizationId, tx);
    if (tx.invoiceId) await markInvoicePaid(tx);
    await maybeCloseUlazniRacun(tx);
  }
  return res.json({ ok: true, data: { updated } });
}

// POST /api/bank-statements/:orgId/manual — ručni unos cijelog izvoda.
// Kontrola: korisnik unosi UKUPAN promet duguje i potražuje sa izvoda,
// a sume unesenih stavki moraju se tačno poklopiti sa tim prometom.
// Banka i račun se izvode iz žiro računa organizacije (profil), ne unose se.
async function createManual(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const body = req.body || {};
  const statementDate = String(body.statementDate || "").trim();
  const totalDuguje = Number(body.totalDuguje);
  const totalPotrazuje = Number(body.totalPotrazuje);
  const rawTxs = Array.isArray(body.transactions) ? body.transactions : [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(statementDate)) {
    return res.status(400).json({ ok: false, error: "INVALID_DATE" });
  }
  if (
    !Number.isFinite(totalDuguje) ||
    !Number.isFinite(totalPotrazuje) ||
    totalDuguje < 0 ||
    totalPotrazuje < 0
  ) {
    return res.status(400).json({ ok: false, error: "INVALID_TOTALS" });
  }
  if (rawTxs.length === 0) {
    return res.status(400).json({ ok: false, error: "NO_TRANSACTIONS" });
  }

  const transactions = [];
  let sumInCents = 0;
  let sumOutCents = 0;
  for (const t of rawTxs) {
    const amount = Number(t.amount);
    const direction = t.direction === "in" || t.direction === "out" ? t.direction : null;
    const date = t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : statementDate;
    if (!Number.isFinite(amount) || amount <= 0 || !direction) {
      return res.status(400).json({ ok: false, error: "INVALID_TRANSACTION" });
    }
    const cents = Math.round(amount * 100);
    if (direction === "in") sumInCents += cents;
    else sumOutCents += cents;
    // kategorija izabrana pri unosu (prijedlog programa ili ručni izbor);
    // nevažeća/tuđeg smjera se ignoriše pa je popuni auto-prijedlog niže
    const category =
      t.category && isValidCategory(String(t.category), direction.toUpperCase())
        ? String(t.category)
        : null;
    transactions.push({
      date,
      description: String(t.description || "").trim() || null,
      counterpartyName: String(t.counterpartyName || "").trim() || null,
      counterpartyAccount: null,
      reference: null,
      amount: cents / 100,
      direction,
      balanceAfter: null,
      category,
      // eksplicitno povezan partner sa fronta (validira se prije snimanja)
      partnerId: Number.isInteger(t.partnerId) ? t.partnerId : null,
    });
  }

  // kontrola prometa: stavke se moraju složiti sa deklarisanim prometom
  const validationErrors = [];
  if (sumOutCents !== Math.round(totalDuguje * 100)) {
    validationErrors.push(
      `Zbir duguje stavki (${(sumOutCents / 100).toFixed(2)} KM) se ne slaže sa unesenim ukupnim prometom duguje (${totalDuguje.toFixed(2)} KM).`,
    );
  }
  if (sumInCents !== Math.round(totalPotrazuje * 100)) {
    validationErrors.push(
      `Zbir potražuje stavki (${(sumInCents / 100).toFixed(2)} KM) se ne slaže sa unesenim ukupnim prometom potražuje (${totalPotrazuje.toFixed(2)} KM).`,
    );
  }
  if (validationErrors.length > 0) {
    return res.status(422).json({
      ok: false,
      error: "VALIDATION_FAILED",
      validationErrors,
    });
  }

  // račun: iz forme (obrt sa više banaka bira/upisuje), fallback profil
  const accountInput = String(body.account || "").trim();
  let account = accountInput || null;
  if (!account) {
    const org = await Organization.findByPk(organizationId, {
      attributes: ["id", "bankAccount"],
    });
    account = (org && org.bankAccount) || null;
  }
  const bankName = bankNameFromAccount(account) || "Ručni unos";

  const learnedSuggest = await loadRuleSuggester(organizationId);
  const matchPartner = await loadPartnerMatcher(organizationId);
  // partnerId sa fronta smije pokazivati samo na partnera ove organizacije
  const orgPartnerIds = new Set(
    (
      await Partner.findAll({
        where: { organizationId },
        attributes: ["id"],
        raw: true,
      })
    ).map((p) => p.id),
  );
  let created;
  try {
    created = await sequelize.transaction(async (t) => {
    const statement = await BankStatement.create(
      {
        organizationId,
        uploadedById: req.user.id,
        bankId: "manual",
        bankName,
        account,
        statementNumber: String(body.statementNumber || "").trim() || null,
        statementDate,
        currency: "BAM",
        openingBalance: null,
        closingBalance: null,
        fileName: null,
        warnings: null,
      },
      { transaction: t },
    );
    await BankTransaction.bulkCreate(
      transactions.map((tx) => ({
        organizationId,
        statementId: statement.id,
        ...tx,
        direction: tx.direction === "in" ? "IN" : "OUT",
        // izbor sa fronta ima prednost, pa naučena pravila, pa seed heuristike
        category: tx.category ?? learnedSuggest(tx) ?? suggestCategory(tx),
        // potvrđen izbor sa fronta ima prednost nad auto-matchom
        partnerId:
          tx.partnerId != null && orgPartnerIds.has(tx.partnerId)
            ? tx.partnerId
            : matchPartner(tx),
        // ručni unos je korisnik već pregledao stavku po stavku → odmah potvrđeno
        status: "CONFIRMED",
      })),
      { transaction: t },
    );
    return statement;
    });
  } catch (e) {
    // izvod sa istim brojem/datumom/računom je već unesen (unique index)
    if (e && e.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ ok: false, error: "DUPLICATE_STATEMENT" });
    }
    throw e;
  }

  // ručno unesen novi račun ide u profil organizacije
  if (accountInput) {
    await addAccountToOrgProfile(organizationId, accountInput);
  }

  // ručne stavke su odmah potvrđene → isplate partnerima zatvaraju
  // njihove otvorene ulazne račune, a stavke sa kategorijom uče pravila
  // (isto kao potvrda uvezene stavke)
  const savedTxs = await BankTransaction.findAll({
    where: { statementId: created.id, organizationId },
  });
  for (const tx of savedTxs) {
    if (tx.category) await learnFromTransaction(organizationId, tx.toJSON());
    if (tx.direction === "OUT" && tx.partnerId) await maybeCloseUlazniRacun(tx);
  }

  return res.status(201).json({
    ok: true,
    data: {
      statementId: created.id,
      bankName,
      statementNumber: created.statementNumber,
      statementDate,
      transactionCount: transactions.length,
      totalIn: sumInCents / 100,
      totalOut: sumOutCents / 100,
      openingBalance: null,
      closingBalance: null,
      warnings: [],
    },
  });
}

// GET /api/bank-statements/:orgId/transactions
// Filteri: ?q= (opis/protivstrana/referenca/iznos), ?dateFrom=&dateTo=,
// ?direction=IN|OUT, ?status=, ?category= (ili "__none" za bez kategorije),
// ?limit=&offset=. Vraća { items, total }.
async function listTransactions(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const { Op } = require("sequelize");
  const where = { organizationId };

  const status = String(req.query.status || "").toUpperCase();
  if (["UNMATCHED", "CONFIRMED", "IGNORED"].includes(status)) {
    where.status = status;
  }
  const direction = String(req.query.direction || "").toUpperCase();
  if (["IN", "OUT"].includes(direction)) {
    where.direction = direction;
  }
  const category = String(req.query.category || "").trim();
  if (category === "__none") {
    where.category = null;
  } else if (category) {
    where.category = category;
  }
  const isIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
  if (isIso(req.query.dateFrom) || isIso(req.query.dateTo)) {
    where.date = {};
    if (isIso(req.query.dateFrom)) where.date[Op.gte] = String(req.query.dateFrom);
    if (isIso(req.query.dateTo)) where.date[Op.lte] = String(req.query.dateTo);
  }

  const q = String(req.query.q || "").trim();
  if (q) {
    const like = `%${q}%`;
    const or = [
      { description: { [Op.like]: like } },
      { counterpartyName: { [Op.like]: like } },
      { reference: { [Op.like]: like } },
      { counterpartyAccount: { [Op.like]: like } },
    ];
    // ako liči na iznos, traži i po tačnom iznosu
    const asAmount = Number.parseFloat(q.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(asAmount) && /[\d]/.test(q)) {
      or.push({ amount: asAmount });
    }
    where[Op.or] = or;
  }

  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const { rows, count } = await BankTransaction.findAndCountAll({
    where,
    include: [
      {
        model: BankStatement,
        as: "statement",
        attributes: ["id", "statementNumber", "bankName"],
      },
      {
        model: Invoice,
        as: "invoice",
        attributes: ["id", "fullNumber", "grossTotal", "status"],
      },
    ],
    order: [
      ["date", "DESC"],
      ["id", "DESC"],
    ],
    limit,
    offset,
  });

  // sume za CIJELI filtrirani skup (ne samo stranicu): filteri kao izvještaj
  const sums = await BankTransaction.findAll({
    where,
    attributes: [
      "direction",
      [sequelize.fn("SUM", sequelize.col("amount")), "total"],
    ],
    group: ["direction"],
    raw: true,
  });
  let sumIn = 0;
  let sumOut = 0;
  for (const r of sums) {
    if (r.direction === "IN") sumIn = Number(r.total) || 0;
    else sumOut = Number(r.total) || 0;
  }

  return res.json({
    ok: true,
    data: {
      items: rows,
      total: count,
      sumIn: Math.round(sumIn * 100) / 100,
      sumOut: Math.round(sumOut * 100) / 100,
    },
  });
}

// GET /api/bank-statements/:orgId/summary?year=&month= — KPI za dashboard kartice
async function summary(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { Op } = require("sequelize");
  const monthWhere = {
    organizationId,
    date: { [Op.gte]: from, [Op.lte]: to },
  };
  const [loaded, unmatchedTotal, confirmed, lastStatement, monthSums, allStatements] =
    await Promise.all([
      BankTransaction.count({ where: monthWhere }),
      BankTransaction.count({ where: { organizationId, status: "UNMATCHED" } }),
      BankTransaction.count({ where: { ...monthWhere, status: "CONFIRMED" } }),
      BankStatement.findOne({
        where: { organizationId },
        order: [["createdAt", "DESC"]],
        attributes: ["id", "fileName", "bankName", "statementDate", "createdAt"],
      }),
      // promet tekućeg mjeseca po smjeru
      BankTransaction.findAll({
        where: monthWhere,
        attributes: [
          "direction",
          [sequelize.fn("SUM", sequelize.col("amount")), "total"],
        ],
        group: ["direction"],
        raw: true,
      }),
      // za stanje računa: zadnji izvod po svakom računu
      BankStatement.findAll({
        where: { organizationId },
        attributes: [
          "account",
          "bankName",
          "statementDate",
          "statementNumber",
          "closingBalance",
          "id",
        ],
        order: [
          ["statementDate", "DESC"],
          ["id", "DESC"],
        ],
        raw: true,
      }),
    ]);

  let totalIn = 0;
  let totalOut = 0;
  for (const row of monthSums) {
    if (row.direction === "IN") totalIn = Number(row.total) || 0;
    if (row.direction === "OUT") totalOut = Number(row.total) || 0;
  }

  // zadnje poznato stanje po računu (manual izvodi bez stanja se preskaču)
  const latestByAccount = new Map();
  for (const s of allStatements) {
    if (!s.account || s.closingBalance == null) continue;
    if (!latestByAccount.has(s.account)) latestByAccount.set(s.account, s);
  }
  const accounts = [...latestByAccount.values()].map((s) => ({
    account: s.account,
    bankName: s.bankName,
    statementDate: s.statementDate,
    closingBalance: Number(s.closingBalance),
  }));
  const balanceTotal = accounts.reduce((sum, a) => sum + a.closingBalance, 0);

  return res.json({
    ok: true,
    data: {
      year,
      month,
      loadedThisMonth: loaded,
      confirmedThisMonth: confirmed,
      unmatched: unmatchedTotal,
      lastUpload: lastStatement,
      totalInThisMonth: totalIn,
      totalOutThisMonth: totalOut,
      balance: accounts.length
        ? { total: Math.round(balanceTotal * 100) / 100, accounts }
        : null,
    },
  });
}

// GET /api/bank-statements/:orgId/kpr?year= ili ?from=&to= — KPR-1041
// knjiga (izvedena iz potvrđenih stavki sa KPR kategorijom). Ručni period
// (from/to) za obrte otvorene/zatvorene u toku godine.
async function kpr(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }

  const isIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
  let from;
  let to;
  if (req.query.from || req.query.to) {
    if (!isIso(req.query.from) || !isIso(req.query.to) || req.query.from > req.query.to) {
      return res.status(400).json({ ok: false, error: "INVALID_PERIOD" });
    }
    from = String(req.query.from);
    to = String(req.query.to);
  } else {
    const year = Number(req.query.year) || new Date().getFullYear();
    if (year < 2000 || year > 2100) {
      return res.status(400).json({ ok: false, error: "INVALID_YEAR" });
    }
    from = `${year}-01-01`;
    to = `${year}-12-31`;
  }

  const data = await buildKpr(organizationId, from, to);
  if (!data) return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });
  return res.json({ ok: true, data });
}

const MJESECI = [
  "januar", "februar", "mart", "april", "maj", "juni",
  "juli", "august", "septembar", "oktobar", "novembar", "decembar",
];

// GET /api/bank-statements/:orgId/obligations — predstojeće poreske obaveze
// tekućeg mjeseca, sa statusom izvedenim iz potvrđenih stavki izvoda:
// obaveza je "gotova" kad postoji potvrđena uplata te kategorije u mjesecu.
async function obligations(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const org = await Organization.findByPk(organizationId, {
    attributes: ["id", "isPdvObveznik"],
  });
  if (!org) return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });

  const { Op } = require("sequelize");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const monthStart = `${year}-${mm}-01`;
  const monthEnd = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const prevName = MJESECI[(month + 10) % 12];

  // potvrđene uplate po kategoriji u tekućem mjesecu
  const paidRows = await BankTransaction.findAll({
    where: {
      organizationId,
      status: "CONFIRMED",
      direction: "OUT",
      category: {
        [Op.in]: ["DOPRINOSI_PODUZETNIKA", "POREZ_DOHODAK_VLASNIKA", "PDV_UIO"],
      },
      date: { [Op.gte]: monthStart, [Op.lte]: monthEnd },
    },
    attributes: ["category"],
    group: ["category"],
    raw: true,
  });
  const paid = new Set(paidRows.map((r) => r.category));

  // rokovi za prethodni mjesec: doprinosi/porez/PDV do 10. u tekućem
  const due10 = `${year}-${mm}-10`;
  const items = [
    {
      id: "doprinosi",
      title: `Akontacija doprinosa za ${prevName}`,
      due: due10,
      done: paid.has("DOPRINOSI_PODUZETNIKA"),
    },
    {
      id: "porez",
      title: `Akontacija poreza na dohodak za ${prevName}`,
      due: due10,
      done: paid.has("POREZ_DOHODAK_VLASNIKA"),
    },
  ];
  if (org.isPdvObveznik) {
    items.push({
      id: "pdv",
      title: `PDV prijava i uplata za ${prevName}`,
      due: due10,
      done: paid.has("PDV_UIO"),
    });
  }

  const today = `${year}-${mm}-${String(now.getDate()).padStart(2, "0")}`;
  for (const item of items) {
    item.overdue = !item.done && item.due < today;
  }
  items.sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));

  return res.json({ ok: true, data: { items } });
}

// Zajednička primjena izmjene na stavku (koristi je pojedinačni PATCH i
// bulk): validacija, auto-popuna kategorije pri potvrdi, učenje pravila,
// sync sa fakturama i ulaznim računima. Vraća { error } ili { tx }.
// opts.ruleSuggester: već učitan suggester (bulk ga učita jednom, da se
// pravila ne skeniraju po svakoj stavci).
async function applyTransactionPatch(organizationId, tx, body, opts = {}) {
  const prevStatus = tx.status;
  const prevInvoiceId = tx.invoiceId;

  const { status, category, invoiceId, partnerId } = body || {};
  if (status != null) {
    if (!["UNMATCHED", "CONFIRMED", "IGNORED"].includes(status)) {
      return { error: "INVALID_STATUS" };
    }
    tx.status = status;
  }
  if (category !== undefined) {
    if (category != null && !isValidCategory(String(category), tx.direction)) {
      return { error: "INVALID_CATEGORY" };
    }
    tx.category = category ? String(category) : null;
  }
  if (invoiceId !== undefined) {
    if (invoiceId == null) {
      tx.invoiceId = null;
    } else {
      const inv = await Invoice.findOne({
        where: { id: Number(invoiceId), organizationId, type: "INVOICE" },
        attributes: ["id"],
      });
      if (!inv) {
        return { error: "INVALID_INVOICE" };
      }
      tx.invoiceId = inv.id;
    }
  }
  // ručno (od)vezivanje partnera: stavka ide na / silazi sa njegove kartice
  if (partnerId !== undefined) {
    if (partnerId == null) {
      tx.partnerId = null;
    } else {
      const partner = await Partner.findOne({
        where: { id: Number(partnerId), organizationId },
        attributes: ["id"],
      });
      if (!partner) {
        return { error: "INVALID_PARTNER" };
      }
      tx.partnerId = partner.id;
    }
  }

  // potvrda bez kategorije: pokušaj auto-popune (naučena pravila pa seed
  // heuristike), osim kad je korisnik kategoriju u ovom pozivu eksplicitno
  // obrisao. Bez kategorije stavka ne ulazi u KPR.
  const explicitClear = category !== undefined && category == null;
  if (tx.status === "CONFIRMED" && !tx.category && !explicitClear) {
    const learned = opts.ruleSuggester ?? (await loadRuleSuggester(organizationId));
    const plain = tx.get({ plain: true });
    const auto = learned(plain) ?? suggestCategory(plain);
    if (auto) tx.category = auto;
  }
  await tx.save();

  // potvrda sa kategorijom = signal za učenje pravila
  if (tx.status === "CONFIRMED" && tx.category) {
    await learnFromTransaction(organizationId, tx.toJSON());
  }

  // sync sa fakturom: potvrda → PAID; vraćanje/odvezivanje → možda ISSUED
  if (tx.status === "CONFIRMED" && tx.invoiceId) {
    await markInvoicePaid(tx);
  }
  if (prevInvoiceId && prevInvoiceId !== tx.invoiceId) {
    await maybeRevertInvoice(organizationId, prevInvoiceId);
  }
  if (prevStatus === "CONFIRMED" && tx.status !== "CONFIRMED" && tx.invoiceId) {
    await maybeRevertInvoice(organizationId, tx.invoiceId);
  }

  // sync sa ulaznim računima: potvrda isplate partneru zatvara račun,
  // vraćanje iz potvrde ga ponovo otvara
  if (tx.status === "CONFIRMED") {
    await maybeCloseUlazniRacun(tx);
    await tx.reload();
  }
  if (
    prevStatus === "CONFIRMED" &&
    tx.status !== "CONFIRMED" &&
    tx.ulazniRacunId
  ) {
    const racunId = tx.ulazniRacunId;
    tx.ulazniRacunId = null;
    await tx.save();
    await maybeReopenUlazniRacun(organizationId, racunId);
  }

  return { tx };
}

// PATCH /api/bank-statements/:orgId/transactions/:txId — status/kategorija
async function updateTransaction(req, res) {
  const organizationId = parseId(req.params.orgId);
  const txId = parseId(req.params.txId);
  if (!organizationId || !txId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const tx = await BankTransaction.findOne({
    where: { id: txId, organizationId },
  });
  if (!tx) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const result = await applyTransactionPatch(organizationId, tx, req.body);
  if (result.error) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, data: result.tx });
}

// PATCH /api/bank-statements/:orgId/transactions/bulk — masovna izmjena
// označenih stavki (samo status i/ili kategorija). Stavka kojoj izmjena ne
// odgovara (npr. kategorija pogrešnog smjera) se preskače, ne ruši ostale.
async function bulkUpdateTransactions(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const ids = Array.isArray(req.body?.ids)
    ? [...new Set(req.body.ids.map(Number))]
        .filter((n) => Number.isInteger(n) && n > 0)
        .slice(0, 500)
    : [];
  if (ids.length === 0) {
    return res.status(400).json({ ok: false, error: "NO_IDS" });
  }
  const patch = {};
  if (req.body?.patch?.status !== undefined) patch.status = req.body.patch.status;
  if (req.body?.patch?.category !== undefined) {
    patch.category = req.body.patch.category;
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ ok: false, error: "NO_PATCH" });
  }

  let updated = 0;
  let skipped = 0;
  // suggester učitaj JEDNOM (ne po stavci): bulk potvrda bez kategorije bi
  // inače skenirala tabelu pravila za svaku stavku
  const ruleSuggester = await loadRuleSuggester(organizationId);
  for (const id of ids) {
    const tx = await BankTransaction.findOne({
      where: { id, organizationId },
    });
    if (!tx) {
      skipped++;
      continue;
    }
    const result = await applyTransactionPatch(organizationId, tx, patch, {
      ruleSuggester,
    });
    if (result.error) skipped++;
    else updated++;
  }
  return res.json({ ok: true, data: { updated, skipped } });
}

// DELETE /api/bank-statements/:orgId/statement/:statementId
async function removeStatement(req, res) {
  const organizationId = parseId(req.params.orgId);
  const statementId = parseId(req.params.statementId);
  if (!organizationId || !statementId) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const statement = await BankStatement.findOne({
    where: { id: statementId, organizationId },
  });
  if (!statement) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  // Potvrđene stavke izvoda su mogle držati fakture "naplaćenim" i ulazne
  // račune "plaćenim": pokupi veze PRIJE brisanja, pa poslije vrati statuse
  // (revert helperi sami provjere da li dokument drži neka druga uplata).
  const linked = await BankTransaction.findAll({
    where: { statementId, organizationId, status: "CONFIRMED" },
    attributes: ["invoiceId", "ulazniRacunId"],
    raw: true,
  });
  const invoiceIds = [...new Set(linked.map((x) => x.invoiceId).filter(Boolean))];
  const racunIds = [
    ...new Set(linked.map((x) => x.ulazniRacunId).filter(Boolean)),
  ];

  await sequelize.transaction(async (t) => {
    await BankTransaction.destroy({
      where: { statementId, organizationId },
      transaction: t,
    });
    await statement.destroy({ transaction: t });
  });

  for (const invoiceId of invoiceIds) {
    await maybeRevertInvoice(organizationId, invoiceId);
  }
  for (const racunId of racunIds) {
    await maybeReopenUlazniRacun(organizationId, racunId);
  }
  return res.json({ ok: true });
}

// ── Grupni uvoz (Inbox) ──────────────────────────────────────────────────────
// POST /api/bank-statements/bulk/analyze (multipart, polje "files", do 20 PDF)
// Analiza BEZ snimanja: za svaki fajl parsiraj izvod, prepoznaj organizaciju
// po žiro računu (bankAccounts lista + glavni račun), provjeri duplikat i
// upozorenja. Knjiženje potom ide postojećim per-org upload endpointom, pa
// sva logika snimanja/povezivanja ostaje na jednom mjestu.

function orgAccountsDigits(org) {
  let list = org.bankAccounts;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }
  if (!Array.isArray(list)) list = [];
  const all = [...list, org.bankAccount];
  return [
    ...new Set(
      all
        .map((a) => normalizeAccountDigits(a))
        .filter((d) => d && d.length >= 8),
    ),
  ];
}

async function bulkAnalyze(req, res) {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ ok: false, error: "NO_FILES" });
    }

    // organizacije u kojima korisnik smije uvoziti izvode (isti uslov kao
    // requireOrgRole na per-org uploadu)
    const memberships = await OrganizationMember.findAll({
      where: { userId: req.user.id, role: { [Op.in]: ["OWNER", "ADMIN"] } },
      include: [
        {
          model: Organization,
          as: "organization",
          attributes: ["id", "name", "bankAccount", "bankAccounts"],
        },
      ],
    });
    const orgs = memberships.map((m) => m.organization).filter(Boolean);
    const accountToOrgs = new Map();
    for (const org of orgs) {
      for (const digits of orgAccountsDigits(org)) {
        const arr = accountToOrgs.get(digits) || [];
        arr.push(org);
        accountToOrgs.set(digits, arr);
      }
    }

    const items = [];
    for (const file of files) {
      const base = { fileName: file.originalname };

      let parsed;
      try {
        parsed = await parseBankStatement(file.buffer);
      } catch {
        items.push({ ...base, status: "error", error: "PARSE_ERROR" });
        continue;
      }
      if (!parsed.ok) {
        items.push({
          ...base,
          status: "error",
          error: parsed.error,
          errorDetail: parsed.errorDetail || null,
          bankName: parsed.bankName || null,
          validationErrors: parsed.validation ? parsed.validation.errors : null,
        });
        continue;
      }

      const digits = normalizeAccountDigits(parsed.account);
      const info = {
        ...base,
        bankName: parsed.bankName,
        account: digits ? formatAccountDashed(digits) : null,
        statementNumber: parsed.statementNumber,
        statementDate: parsed.statementDate,
        transactionCount: parsed.transactions.length,
        totalIn: parsed.validation.computed.totalIn,
        totalOut: parsed.validation.computed.totalOut,
        openingBalance: parsed.openingBalance,
        closingBalance: parsed.closingBalance,
        transactions: parsed.transactions.map((tx) => ({
          date: tx.date,
          description: tx.description || null,
          amount: tx.amount,
          direction: tx.direction === "in" ? "IN" : "OUT",
          counterpartyName: tx.counterpartyName || null,
        })),
      };

      const matches = (digits && accountToOrgs.get(digits)) || [];
      if (matches.length === 0) {
        // nijedan obrt nema ovaj račun: ručna dodjela na frontendu
        items.push({ ...info, status: "unrecognized", org: null });
        continue;
      }
      if (matches.length > 1) {
        // isti račun kod više organizacija (greška u podacima): ručni izbor
        items.push({
          ...info,
          status: "conflict",
          org: null,
          candidateOrgIds: matches.map((o) => o.id),
        });
        continue;
      }

      const org = matches[0];
      const orgInfo = { id: org.id, name: org.name };

      // duplikat: ista provjera kao na per-org uploadu (normalizovano,
      // hvata i PDF-om i ručno učitane izvode)
      const existingDup = await findDuplicateStatement(org.id, parsed);
      if (existingDup) {
        items.push({
          ...info,
          status: "duplicate",
          org: orgInfo,
          existingStatementId: existingDup.id,
        });
        continue;
      }

      const ownerWarning = ownerMismatchWarning(org.name, parsed.allText);
      const warnings = [
        ...(parsed.warnings || []),
        ...(await continuityWarnings(org.id, parsed)),
        ...(ownerWarning ? [ownerWarning] : []),
      ];
      items.push({
        ...info,
        status: warnings.length ? "review" : "ready",
        org: orgInfo,
        warnings,
      });
    }

    return res.json({
      ok: true,
      data: {
        files: items,
        organizations: orgs
          .map((o) => ({ id: o.id, name: o.name }))
          .sort((a, b) => a.name.localeCompare(b.name, "bs")),
      },
    });
  } catch (err) {
    console.error("bulkAnalyze error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/bank-statements/:orgId/suggest-category — živi prijedlog KPR
// kategorije pri ručnom unosu izvoda: naučena pravila organizacije imaju
// prednost nad seed heuristikama. Ništa se ne snima.
async function suggestKategorije(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const items = Array.isArray(req.body?.items)
    ? req.body.items.slice(0, 100)
    : [];
  const learnedSuggest = await loadRuleSuggester(organizationId);
  const data = items.map((it) => {
    const tx = {
      description: String(it?.description || ""),
      counterpartyName: String(it?.counterpartyName || ""),
      counterpartyAccount: String(it?.counterpartyAccount || ""),
      direction:
        String(it?.direction || "").toLowerCase() === "in" ? "IN" : "OUT",
    };
    return learnedSuggest(tx) ?? suggestCategory(tx);
  });
  return res.json({ ok: true, data });
}

module.exports = {
  upload,
  bulkAnalyze,
  suggestKategorije,
  // reuse za prebijanja (kompenzacije/cesije) i druga bezgotovinska knjiženja
  markInvoicePaid,
  maybeRevertInvoice,
  maybeReopenUlazniRacun,
  list,
  getStatement,
  confirmAll,
  createManual,
  kpr,
  obligations,
  listTransactions,
  summary,
  updateTransaction,
  bulkUpdateTransactions,
  removeStatement,
};
