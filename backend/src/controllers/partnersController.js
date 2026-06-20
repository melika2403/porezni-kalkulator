// Poslovni partneri obrta (kupci i dobavljači).
//
// Partneri se vežu za transakcije izvoda preko žiro računa: svaki račun
// partnera se čuva normalizovan (samo cifre), pa se stavke izvoda sa tim
// protivračunom automatski pripisuju partneru, i postojeće (backfill kod
// snimanja partnera) i buduće (kod upload-a izvoda).
const { Op, fn, col } = require("sequelize");
const {
  Partner,
  BankTransaction,
  BankStatement,
  Invoice,
  Organization,
  UlazniRacun,
} = require("../models");
const { buildKarticaPdf } = require("../utils/karticaPdf");
const { sendKarticaEmail } = require("../utils/mailer");

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
 * velika/mala slova i pravne forme se ignorišu). Prvo skine staru vezu,
 * pa veže sve stavke koje odgovaraju.
 */
async function relinkTransactions(partner) {
  await BankTransaction.update(
    { partnerId: null },
    { where: { organizationId: partner.organizationId, partnerId: partner.id } },
  );
  const accounts = Array.isArray(partner.accounts) ? partner.accounts : [];
  const pName = normalizeName(partner.name);
  const candidates = await BankTransaction.findAll({
    where: { organizationId: partner.organizationId },
    attributes: ["id", "counterpartyAccount", "counterpartyName"],
    raw: true,
  });
  const ids = candidates
    .filter(
      (t) =>
        accounts.includes(normalizeDigits(t.counterpartyAccount)) ||
        (pName && normalizeName(t.counterpartyName) === pName),
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
  return (tx) =>
    byAccount.get(normalizeDigits(tx.counterpartyAccount)) ??
    byName.get(normalizeName(tx.counterpartyName)) ??
    null;
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

  // promet po partneru (potvrđene stavke)
  const sums = await BankTransaction.findAll({
    where: {
      organizationId,
      partnerId: { [Op.ne]: null },
      status: "CONFIRMED",
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
  // otvorene čine "njihov dug", a sve zajedno dugovnu stranu kupca
  const openInvoices = await Invoice.findAll({
    where: { organizationId, type: "INVOICE", status: { [Op.in]: ["ISSUED", "PAID"] } },
    attributes: ["buyerName", "buyerIdNumber", "grossTotal", "status"],
    raw: true,
  });

  // ulazni računi po partneru: otvoreni ("naš dug") + ukupan broj
  // (i plaćeni računi čine partnera dobavljačem)
  const payables = await UlazniRacun.findAll({
    where: { organizationId },
    attributes: [
      "partnerId",
      "status",
      [fn("SUM", col("iznos")), "total"],
      [fn("COUNT", col("id")), "cnt"],
    ],
    group: ["partnerId", "status"],
    raw: true,
  });
  const payablesByPartner = new Map();
  for (const r of payables) {
    const entry = payablesByPartner.get(r.partnerId) || {
      total: 0,
      count: 0,
      racuniCount: 0,
      racuniTotal: 0,
    };
    if (r.status === "OTVOREN") {
      entry.total += Number(r.total) || 0;
      entry.count += Number(r.cnt) || 0;
    }
    entry.racuniCount += Number(r.cnt) || 0;
    entry.racuniTotal += Number(r.total) || 0;
    payablesByPartner.set(r.partnerId, entry);
  }

  const data = partners.map((p) => {
    const stats = byPartner.get(p.id) || {
      totalIn: 0,
      totalOut: 0,
      txCount: 0,
      lastDate: null,
    };
    const pJib = normalizeDigits(p.jib);
    const pName = normalizeName(p.name);
    let openTotal = 0;
    let openCount = 0;
    let invoicesTotal = 0;
    for (const inv of openInvoices) {
      const matches =
        (pJib && normalizeDigits(inv.buyerIdNumber) === pJib) ||
        normalizeName(inv.buyerName) === pName;
      if (matches) {
        invoicesTotal += Number(inv.grossTotal) || 0;
        if (inv.status === "ISSUED") {
          openTotal += Number(inv.grossTotal) || 0;
          openCount += 1;
        }
      }
    }
    const pay = payablesByPartner.get(p.id) || {
      total: 0,
      count: 0,
      racuniCount: 0,
      racuniTotal: 0,
    };
    return {
      ...p.toJSON(),
      accounts: Array.isArray(p.accounts) ? p.accounts : [],
      stats: {
        ...stats,
        openInvoicesTotal: openTotal,
        openInvoicesCount: openCount,
        invoicesTotal,
        openPayablesTotal: pay.total,
        openPayablesCount: pay.count,
        racuniCount: pay.racuniCount,
        racuniTotal: pay.racuniTotal,
      },
    };
  });

  return res.json({ ok: true, data });
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

  // kandidati sa izvoda: grupisano po protivračunu, bez vlastitih uplata
  // na javne prihode (one imaju kategoriju doprinosa/poreza, nisu partneri)
  const txRows = await BankTransaction.findAll({
    where: {
      organizationId,
      counterpartyAccount: { [Op.ne]: null },
      partnerId: null,
      [Op.or]: [
        { category: null },
        {
          category: {
            [Op.notIn]: [
              "DOPRINOSI_PODUZETNIKA",
              "POREZ_DOHODAK_VLASNIKA",
              "PDV_UIO",
              "DOPRINOSI_ZAPOSLENIKA",
              "POREZI_PLATE",
              "CLANARINE_TAKSE",
            ],
          },
        },
      ],
    },
    attributes: ["counterpartyAccount", "counterpartyName", "direction"],
    raw: true,
  });
  const byAccount = new Map();
  for (const t of txRows) {
    const acc = normalizeDigits(t.counterpartyAccount);
    if (acc.length < 8 || knownAccounts.has(acc)) continue;
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
    .filter((s) => !knownNames.has(normalizeName(s.name)))
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

// ─── Ulazni računi (fakture dobavljača) ─────────────────────────────────────

const toCents = (v) => Math.round(Number(v) * 100);

function parseIsoDate(value) {
  const s = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
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
  if (req.query.status === "OTVOREN" || req.query.status === "PLACEN") {
    where.status = req.query.status;
  }
  const racuni = await UlazniRacun.findAll({
    where,
    include: [{ model: Partner, as: "partner", attributes: ["id", "name"] }],
    order: [["datumRacuna", "DESC"], ["id", "DESC"]],
  });
  return res.json({ ok: true, data: racuni });
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
  if (!Number.isFinite(payload.iznos) || payload.iznos <= 0) {
    return res.status(400).json({ ok: false, error: "IZNOS_INVALID" });
  }
  // bez unesenog roka plaćanja podrazumijeva se 30 dana od datuma računa
  if (!payload.rokPlacanja) {
    const d = new Date(`${payload.datumRacuna}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 30);
    payload.rokPlacanja = d.toISOString().slice(0, 10);
  }
  const racun = await UlazniRacun.create({
    organizationId,
    partnerId,
    ...payload,
  });
  // izvod je možda već stigao: odmah probaj zatvoriti postojećom isplatom
  const matched = await tryMatchExistingPayment(racun);
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
    if (!Number.isFinite(v) || v <= 0) {
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

  const transactions = await BankTransaction.findAll({
    where: { organizationId, partnerId },
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

  let totalIn = 0;
  let totalOut = 0;
  for (const t of transactions) {
    if (t.status !== "CONFIRMED") continue;
    if (t.direction === "IN") totalIn += Number(t.amount) || 0;
    else totalOut += Number(t.amount) || 0;
  }
  const openInvoicesTotal = invoices
    .filter((i) => i.status === "ISSUED")
    .reduce((s, i) => s + (Number(i.grossTotal) || 0), 0);
  const openPayablesTotal = ulazniRacuni
    .filter((r) => r.status === "OTVOREN")
    .reduce((s, r) => s + (Number(r.iznos) || 0), 0);

  return res.json({
    ok: true,
    data: {
      partner: {
        ...partner.toJSON(),
        accounts: Array.isArray(partner.accounts) ? partner.accounts : [],
      },
      transactions,
      invoices,
      ulazniRacuni,
      totals: { totalIn, totalOut, openInvoicesTotal, openPayablesTotal },
    },
  });
}

// ─── Kartica prometa (PDF + email) ──────────────────────────────────────────

const fmtDateHr = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
};

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
      attributes: ["fullNumber", "buyerName", "buyerIdNumber", "issueDate", "grossTotal"],
      raw: true,
    });
    for (const inv of invoices) {
      const matches =
        (pJib && normalizeDigits(inv.buyerIdNumber) === pJib) ||
        normalizeName(inv.buyerName) === pName;
      if (!matches) continue;
      rows.push({
        date: String(inv.issueDate).slice(0, 10),
        label: `Faktura ${inv.fullNumber}`,
        duguje: Number(inv.grossTotal) || 0,
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
    for (const r of racuni) {
      rows.push({
        date: String(r.datumRacuna).slice(0, 10),
        label: `Račun ${r.brojRacuna}`,
        duguje: 0,
        potrazuje: Number(r.iznos) || 0,
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
      label: type === "kupac" ? `Uplata${izvod}` : `Plaćanje${izvod}`,
      duguje: type === "kupac" ? 0 : Number(t.amount) || 0,
      potrazuje: type === "kupac" ? Number(t.amount) || 0 : 0,
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
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

module.exports = {
  list,
  suggestions,
  create,
  update,
  remove,
  listUlazniRacuni,
  createUlazniRacun,
  updateUlazniRacun,
  removeUlazniRacun,
  kartica,
  karticaPdfDownload,
  karticaEmail,
  loadPartnerMatcher,
  normalizeDigits,
};
