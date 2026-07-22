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
  BankTransaction,
  BankStatement,
  Invoice,
  Organization,
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
const { allocateFifo } = require("../utils/paymentAllocation");
const {
  sendKarticaEmail,
  sendIosEmail,
  sendOpomenaEmail,
} = require("../utils/mailer");

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

  let totalIn = 0;
  let totalOut = 0;
  for (const t of transactions) {
    if (t.status !== "CONFIRMED") continue;
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
  // kupci: uplata vezana za konkretnu fakturu ju je već zatvorila (ne u pool)
  const unlinkedIn = transactions
    .filter(
      (t) => t.status === "CONFIRMED" && t.direction === "IN" && !t.invoiceId,
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  // dobavljači: plaćanje koje je već zatvorilo konkretan račun (ulazniRacunId)
  // je taj račun označilo PLACEN (manualPlacen); ne smije ponovo u pool, inače
  // se ista uplata broji dvaput i sljedeći otvoren račun ispadne lažno plaćen
  const unlinkedOut = transactions
    .filter(
      (t) =>
        t.status === "CONFIRMED" && t.direction === "OUT" && !t.ulazniRacunId,
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const racunAlloc = allocateFifo(
    ulazniRacuni.map((r) => ({
      id: r.id,
      iznos: Number(r.iznos) || 0,
      datum: String(r.datumRacuna).slice(0, 10),
      manualPlacen: r.status === "PLACEN",
      // samoEvidencija (uvoz/JCI) nije obaveza prema dobavljaču, van FIFO-a
      kredit: racunKredit(r) || Boolean(r.samoEvidencija),
    })),
    unlinkedOut + racunKreditSum,
  );
  const invAlloc = allocateFifo(
    chargeableInvoices.map((i) => ({
      id: i.id,
      iznos: Number(i.grossTotal) || 0,
      datum: String(i.issueDate).slice(0, 10),
      manualPlacen: i.status === "PAID",
      kredit: invKredit(i),
    })),
    unlinkedIn + invKreditSum,
  );

  const danas = todayLocalIso();
  const openPayablesTotal = ulazniRacuni.reduce(
    (s, r) => s + (racunAlloc.get(r.id)?.preostalo || 0),
    0,
  );
  const openInvoicesTotal = chargeableInvoices.reduce(
    (s, i) => s + (invAlloc.get(i.id)?.preostalo || 0),
    0,
  );
  const openPayablesLate = ulazniRacuni.reduce(
    (s, r) =>
      r.rokPlacanja && String(r.rokPlacanja).slice(0, 10) < danas
        ? s + (racunAlloc.get(r.id)?.preostalo || 0)
        : s,
    0,
  );
  const openInvoicesLate = chargeableInvoices.reduce(
    (s, i) =>
      i.dueDate && String(i.dueDate).slice(0, 10) < danas
        ? s + (invAlloc.get(i.id)?.preostalo || 0)
        : s,
    0,
  );

  return res.json({
    ok: true,
    data: {
      partner: {
        ...partner.toJSON(),
        accounts: Array.isArray(partner.accounts) ? partner.accounts : [],
      },
      transactions,
      invoices: invoices.map((i) => ({
        ...(typeof i.toJSON === "function" ? i.toJSON() : i),
        placeno: invAlloc.get(i.id)?.placeno ?? 0,
        preostalo: invAlloc.get(i.id)?.preostalo ?? (Number(i.grossTotal) || 0),
        paymentStatus: invAlloc.get(i.id)?.status ?? "OTVOREN",
      })),
      ulazniRacuni: ulazniRacuni.map((r) => ({
        ...r.toJSON(),
        kalkulacijaOznaka: klcByRacun.get(r.id) ?? null,
        placeno: racunAlloc.get(r.id)?.placeno ?? 0,
        preostalo: racunAlloc.get(r.id)?.preostalo ?? (Number(r.iznos) || 0),
        paymentStatus: racunAlloc.get(r.id)?.status ?? "OTVOREN",
      })),
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
  rows.sort((a, b) => a.datum.localeCompare(b.datum));
  return rows;
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
  create,
  update,
  remove,
  uvozPartnera,
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
  normalizeDigits,
  tryMatchExistingPayment,
};
