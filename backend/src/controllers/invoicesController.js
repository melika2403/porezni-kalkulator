const { Op } = require("sequelize");
const {
  sequelize,
  Invoice,
  InvoiceItem,
  InvoiceCounter,
  Organization,
  OrganizationMember,
  Client,
  Partner,
  TkmPazar,
  BankTransaction,
} = require("../models/index");
const {
  generateInvoicePdf,
  formatInvoiceNumber,
  computeItem,
  computeTotals,
} = require("../utils/invoicePdf");
const { sendInvoiceEmail } = require("../utils/mailer");
const { getOrgOwnerRole } = require("../services/tierService");

const PRO_CLIENT_LIMIT = 20;

function isStr(v) { return typeof v === "string" && v.trim().length > 0; }
function trimOrNull(v) { return isStr(v) ? String(v).trim() : null; }

function publicInvoice(inv) {
  if (!inv) return null;
  const plain = inv.toJSON ? inv.toJSON() : inv;
  return plain;
}

// Faza 3: pristup je org-membership-based. Pozivaoc pristupa fakturi ako:
//   - faktura ima organizationId i pozivaoc je član te org-e (i owner ima PRO+ plan), ILI
//   - faktura nema organizationId (legacy) i pozivaoc je njen tvorac
async function userCanAccessInvoice(invoice, userId, userRole) {
  if (!invoice) return false;
  if (userRole === "ADMIN") return true;
  if (invoice.organizationId) {
    const membership = await OrganizationMember.findOne({
      where: { organizationId: invoice.organizationId, userId },
    });
    if (!membership) return false;
    const ownerTier = await getOrgOwnerRole(invoice.organizationId);
    return ["PRO", "BUSINESS", "ADMIN"].includes(ownerTier);
  }
  return invoice.userId === userId && ["PRO", "BUSINESS", "ADMIN"].includes(userRole);
}

// Vraća sve organizationId-eve gdje pozivaoc ima pristup za fakturisanje
// (član + owner je PRO+).
// adminGlobal=true (default) zadržava staro ponašanje gdje ADMIN vidi sve org-e
// (npr. za admin panele). Za LIČNU listu faktura proslijediti adminGlobal=false
// da admin ne vidi tuđe fakture na svojoj /fakture stranici.
async function getAccessibleInvoicingOrgIds(userId, userRole, { adminGlobal = true } = {}) {
  if (userRole === "ADMIN" && adminGlobal) {
    const all = await Organization.findAll({ attributes: ["id"] });
    return all.map((o) => o.id);
  }
  const memberships = await OrganizationMember.findAll({
    where: { userId },
    attributes: ["organizationId"],
  });
  const orgIds = memberships.map((m) => m.organizationId);
  if (orgIds.length === 0) return [];
  const ownerMemberships = await OrganizationMember.findAll({
    where: { organizationId: { [Op.in]: orgIds }, role: "OWNER" },
    include: [{ model: require("../models/index").User, as: "user", attributes: ["role"] }],
  });
  const allowed = new Set();
  for (const om of ownerMemberships) {
    if (["PRO", "BUSINESS", "ADMIN"].includes(om.user?.role)) allowed.add(om.organizationId);
  }
  return [...allowed];
}

// ── serije numeracije: fakture (F-), predračuni (P-), avansne + storno
// avansnih (A-, zajednički brojač) i knjižne obavijesti (KO-) imaju SVAKA
// svoj brojač po organizaciji i godini.
function seriesFor(type, docType) {
  if (type === "PROFORMA") return "PROFORMA";
  if (docType === "AVANSNA" || docType === "STORNO_AVANSNE") return "AVANS";
  if (docType === "KNJIZNA_OBAVIJEST") return "KO";
  return "INVOICE";
}

// where-uslov za seed brojača iz postojećih dokumenata serije
function seriesSeedWhere(series) {
  if (series === "PROFORMA") return { type: "PROFORMA" };
  if (series === "AVANS") {
    return { type: "INVOICE", docType: { [Op.in]: ["AVANSNA", "STORNO_AVANSNE"] } };
  }
  if (series === "KO") return { type: "INVOICE", docType: "KNJIZNA_OBAVIJEST" };
  return { type: "INVOICE", docType: "STANDARD" };
}

// ── numeracija: po organizaciji (Faza 3) sa fallback-om na user-counter za legacy
async function nextSequence({ organizationId, userId }, year, type, t) {
  if (organizationId) {
    let row = await InvoiceCounter.findOne({
      where: { organizationId, year, type },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!row) {
      // Seed iz postojećih faktura te org-e da nova numeracija krene od max+1.
      const maxExisting = await Invoice.max("sequence", {
        where: { organizationId, year, ...seriesSeedWhere(type) },
        transaction: t,
      });
      const seed = Number.isFinite(maxExisting) ? maxExisting : 0;
      await InvoiceCounter.create(
        { organizationId, userId: null, year, type, lastNumber: seed },
        { transaction: t },
      );
      row = await InvoiceCounter.findOne({
        where: { organizationId, year, type },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
    }
    const next = row.lastNumber + 1;
    row.lastNumber = next;
    await row.save({ transaction: t });
    return next;
  }

  // Legacy fallback (per-user)
  let row = await InvoiceCounter.findOne({
    where: { userId, organizationId: null, year, type },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!row) {
    await InvoiceCounter.create({ userId, organizationId: null, year, type, lastNumber: 0 }, { transaction: t });
    row = await InvoiceCounter.findOne({
      where: { userId, organizationId: null, year, type },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
  }
  const next = row.lastNumber + 1;
  row.lastNumber = next;
  await row.save({ transaction: t });
  return next;
}

function validateCreate(body) {
  const errors = [];
  const type = String(body?.type || "INVOICE").toUpperCase();
  if (!["INVOICE", "PROFORMA"].includes(type)) errors.push("Neispravan tip dokumenta.");

  // direktno se kreira samo standardna ili avansna faktura; storno avansne i
  // knjižna obavijest nastaju ISKLJUČIVO iz postojećeg dokumenta (svoji endpointi)
  const docType = String(body?.docType || "STANDARD").toUpperCase();
  if (!["STANDARD", "AVANSNA"].includes(docType)) {
    errors.push("Neispravna vrsta dokumenta.");
  }
  if (docType === "AVANSNA" && type !== "INVOICE") {
    errors.push("Avansna faktura ne može biti predračun.");
  }

  const seller = body?.seller || {};
  if (!isStr(seller.name)) errors.push("Naziv prodavca je obavezan.");

  const buyer = body?.buyer || {};
  if (!isStr(buyer.name)) errors.push("Naziv kupca je obavezan.");

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) errors.push("Faktura mora imati barem jednu stavku.");
  items.forEach((it, i) => {
    if (!isStr(it.name)) errors.push(`Stavka ${i + 1}: naziv je obavezan.`);
    if (Number(it.quantity) <= 0) errors.push(`Stavka ${i + 1}: količina mora biti veća od 0.`);
    if (Number(it.unitPrice) < 0) errors.push(`Stavka ${i + 1}: cijena ne može biti negativna.`);
  });

  return { errors, type, docType };
}

// Zajednička jezgra kreiranja fakture (broj, obračun, upis stavki) unutar date
// transakcije. Koristi je i batch iz pripremljenih računa. Prodavac/kupac su
// gotovi snapshoti, bez pristupne logike (pozivalac je već autorizovao).
async function createInvoiceRecord(
  {
    organizationId,
    userId,
    type = "INVOICE",
    docType = "STANDARD",
    issueDate,
    dueDate = null,
    applyVat = true,
    vrstaIsporuke = "OPOREZIVA",
    currency = "BAM",
    clientId = null,
    seller = {},
    buyer = {},
    items = [],
    notes = null,
  },
  t,
) {
  const year = new Date(issueDate).getFullYear();
  const series = seriesFor(type, docType);
  const seq = await nextSequence({ organizationId, userId }, year, series, t);
  const fullNumber = formatInvoiceNumber(seq, year, type, docType);

  const computedItems = items.map((it) => ({ input: it, computed: computeItem(it, applyVat) }));
  const totals = computeTotals(items, applyVat);

  const invoice = await Invoice.create(
    {
      userId,
      organizationId,
      clientId,
      type,
      docType,
      year,
      sequence: seq,
      fullNumber,
      issueDate,
      dueDate: docType === "AVANSNA" ? null : dueDate,
      applyVat,
      vrstaIsporuke,
      currency,
      status: docType === "AVANSNA" ? "PAID" : "ISSUED",
      paidAt: docType === "AVANSNA" ? issueDate : null,
      sellerName: trimOrNull(seller.name),
      sellerAddress: trimOrNull(seller.address),
      sellerCity: trimOrNull(seller.city),
      sellerPhone: trimOrNull(seller.phone),
      sellerEmail: trimOrNull(seller.email),
      sellerTaxNumber: trimOrNull(seller.taxNumber),
      sellerVatNumber: trimOrNull(seller.vatNumber),
      sellerBankAccount: trimOrNull(seller.bankAccount),
      sellerLogoUrl: trimOrNull(seller.logoUrl),
      buyerName: trimOrNull(buyer.name),
      buyerAddress: trimOrNull(buyer.address),
      buyerCity: trimOrNull(buyer.city),
      buyerPostalCode: trimOrNull(buyer.postalCode),
      buyerPhone: trimOrNull(buyer.phone),
      buyerEmail: trimOrNull(buyer.email),
      buyerIdNumber: trimOrNull(buyer.idNumber),
      buyerVatNumber: trimOrNull(buyer.vatNumber),
      netTotal: totals.netTotal,
      discountTotal: totals.discountTotal,
      vatTotal: totals.vatTotal,
      grossTotal: totals.grossTotal,
      notes: trimOrNull(notes),
    },
    { transaction: t },
  );

  let ord = 1;
  for (const { input, computed } of computedItems) {
    await InvoiceItem.create(
      {
        invoiceId: invoice.id,
        ordinal: ord++,
        name: trimOrNull(input.name),
        unit: trimOrNull(input.unit),
        quantity: Number(input.quantity || 0),
        unitPrice: Number(input.unitPrice || 0),
        discountPct: Number(input.discountPct || 0),
        vatPct: applyVat ? Number(input.vatPct || 0) : 0,
        netLine: computed.netLine,
        discountLine: computed.discountLine,
        vatLine: computed.vatLine,
        grossLine: computed.grossLine,
      },
      { transaction: t },
    );
  }

  return invoice;
}

// ── LIST ───────────────────────────────────────────────────────────────────
async function list(req, res) {
  // Lična lista — admin NE vidi tuđe fakture ovdje (adminGlobal:false).
  // Za pregled svih faktura postoji zaseban admin endpoint.
  const orgIds = await getAccessibleInvoicingOrgIds(req.user.id, req.user.role, {
    adminGlobal: false,
  });

  // OR: fakture iz pristupačnih org-a + legacy lične (userId === me, organizationId IS NULL)
  const orClauses = [{ userId: req.user.id, organizationId: null }];
  if (orgIds.length > 0) orClauses.push({ organizationId: { [Op.in]: orgIds } });

  const where = { [Op.or]: orClauses };

  // PK Office: lista samo za jednu (aktivnu) organizaciju
  if (req.query.organizationId) {
    const oid = Number(req.query.organizationId);
    if (!Number.isInteger(oid) || oid <= 0 || !orgIds.includes(oid)) {
      return res.status(200).json({ ok: true, data: [] });
    }
    delete where[Op.or];
    where.organizationId = oid;
  }

  if (req.query.type && ["INVOICE", "PROFORMA"].includes(String(req.query.type).toUpperCase())) {
    where.type = String(req.query.type).toUpperCase();
  }
  if (req.query.status) where.status = String(req.query.status).toUpperCase();
  if (req.query.year) {
    const y = Number(req.query.year);
    if (Number.isInteger(y)) where.year = y;
  }

  const invoices = await Invoice.findAll({ where, order: [["createdAt", "DESC"]] });

  const proformaIds = invoices.filter((i) => i.type === "PROFORMA").map((i) => i.id);
  let convertedMap = new Map();
  if (proformaIds.length) {
    const conv = await Invoice.findAll({
      where: { convertedFromProformaId: { [Op.in]: proformaIds } },
      attributes: ["id", "fullNumber", "convertedFromProformaId"],
    });
    for (const c of conv) {
      convertedMap.set(c.convertedFromProformaId, { id: c.id, fullNumber: c.fullNumber });
    }
  }

  // veze avansnih dokumenata: storno/KO nose broj izvornog dokumenta, a
  // avansna broj svog storna (da UI zna da je već stornirana)
  const linkedIds = [...new Set(invoices.map((i) => i.linkedInvoiceId).filter(Boolean))];
  const linkedMap = new Map();
  if (linkedIds.length) {
    const linked = await Invoice.findAll({
      where: { id: { [Op.in]: linkedIds } },
      attributes: ["id", "fullNumber"],
    });
    for (const l of linked) linkedMap.set(l.id, l.fullNumber);
  }
  const avansIds = invoices.filter((i) => i.docType === "AVANSNA").map((i) => i.id);
  const stornoMap = new Map();
  if (avansIds.length) {
    const storno = await Invoice.findAll({
      where: { linkedInvoiceId: { [Op.in]: avansIds }, docType: "STORNO_AVANSNE" },
      attributes: ["id", "fullNumber", "linkedInvoiceId"],
    });
    for (const s of storno) stornoMap.set(s.linkedInvoiceId, { id: s.id, fullNumber: s.fullNumber });
  }

  const data = invoices.map((inv) => {
    const plain = publicInvoice(inv);
    if (inv.type === "PROFORMA" && convertedMap.has(inv.id)) {
      const c = convertedMap.get(inv.id);
      plain.convertedToInvoiceId = c.id;
      plain.convertedToFullNumber = c.fullNumber;
    }
    if (inv.linkedInvoiceId && linkedMap.has(inv.linkedInvoiceId)) {
      plain.linkedFullNumber = linkedMap.get(inv.linkedInvoiceId);
    }
    if (inv.docType === "AVANSNA" && stornoMap.has(inv.id)) {
      const s = stornoMap.get(inv.id);
      plain.stornoInvoiceId = s.id;
      plain.stornoFullNumber = s.fullNumber;
    }
    return plain;
  });
  res.status(200).json({ ok: true, data });
}

// ── ADMIN: lista SVIH faktura (sa tvorcem i organizacijom) ──────────────────
// GET /api/admin/invoices?q&type&status&year&page&limit  (ADMIN)
async function adminList(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 100);
    const where = {};
    const t = String(req.query.type || "").toUpperCase();
    if (t === "INVOICE" || t === "PROFORMA") where.type = t;
    const st = String(req.query.status || "").toUpperCase();
    if (["DRAFT", "ISSUED", "PAID", "CANCELLED"].includes(st)) where.status = st;
    const y = Number(req.query.year);
    if (Number.isInteger(y)) where.year = y;
    const q = String(req.query.q || "").trim();
    if (q) {
      where[Op.or] = [
        { fullNumber: { [Op.like]: `%${q}%` } },
        { buyerName: { [Op.like]: `%${q}%` } },
        { sellerName: { [Op.like]: `%${q}%` } },
        { buyerEmail: { [Op.like]: `%${q}%` } },
      ];
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [
        { model: require("../models/index").User, as: "user", attributes: ["id", "firstName", "lastName", "email", "role"], required: false },
        { model: Organization, as: "organization", attributes: ["id", "name"], required: false },
      ],
      order: [["createdAt", "DESC"]],
      offset: (page - 1) * limit,
      limit,
    });

    const items = rows.map((inv) => {
      const p = inv.toJSON();
      return {
        id: p.id,
        type: p.type,
        fullNumber: p.fullNumber,
        status: p.status,
        currency: p.currency,
        issueDate: p.issueDate,
        dueDate: p.dueDate,
        paidAt: p.paidAt,
        grossTotal: Number(p.grossTotal),
        netTotal: Number(p.netTotal),
        buyerName: p.buyerName,
        sellerName: p.sellerName,
        emailSentAt: p.emailSentAt,
        createdAt: p.createdAt,
        organization: p.organization ? { id: p.organization.id, name: p.organization.name } : null,
        creator: p.user
          ? {
              id: p.user.id,
              name: `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim() || p.user.email,
              email: p.user.email,
              role: p.user.role,
            }
          : null,
      };
    });

    // Zbirni podaci za prikazani filter (svi redovi, ne samo stranica).
    const totalsRow = await Invoice.findAll({
      where,
      attributes: [
        "currency",
        [sequelize.fn("COUNT", sequelize.col("id")), "cnt"],
        [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("grossTotal")), 0), "gross"],
      ],
      group: ["currency"],
      raw: true,
    });
    const totalsByCurrency = totalsRow.map((r) => ({
      currency: r.currency,
      count: Number(r.cnt),
      gross: Math.round(Number(r.gross) * 100) / 100,
    }));

    return res.json({
      ok: true,
      data: { items, total: count, page, limit, totalsByCurrency },
    });
  } catch (e) {
    console.error("admin invoices list failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ── GET BY ID ──────────────────────────────────────────────────────────────
async function getById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });

  const inv = await Invoice.findOne({
    where: { id },
    include: [{ model: InvoiceItem, as: "items" }],
  });
  if (!inv) return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  if (!(await userCanAccessInvoice(inv, req.user.id, req.user.role))) {
    return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  }
  const plain = publicInvoice(inv);
  // broj izvornog dokumenta (storno/KO) odnosno broj storna (avansna)
  if (inv.linkedInvoiceId) {
    const linked = await Invoice.findOne({
      where: { id: inv.linkedInvoiceId },
      attributes: ["id", "fullNumber"],
    });
    if (linked) plain.linkedFullNumber = linked.fullNumber;
  }
  if (inv.docType === "AVANSNA") {
    const storno = await Invoice.findOne({
      where: { linkedInvoiceId: inv.id, docType: "STORNO_AVANSNE" },
      attributes: ["id", "fullNumber"],
    });
    if (storno) {
      plain.stornoInvoiceId = storno.id;
      plain.stornoFullNumber = storno.fullNumber;
    }
  }
  res.status(200).json({ ok: true, data: plain });
}

// ── CREATE ─────────────────────────────────────────────────────────────────
async function create(req, res) {
  const { errors, type, docType } = validateCreate(req.body);
  if (errors.length) return res.status(400).json({ ok: false, error: errors.join(" ") });

  const body = req.body;
  const seller = body.seller || {};
  const buyer = body.buyer || {};
  const items = body.items;
  const applyVat = body.applyVat !== false;
  const currency = body.currency === "EUR" ? "EUR" : "BAM";
  const buyerKind = body.buyerKind === "COMPANY" ? "COMPANY" : "PERSON";
  // vrsta isporuke za KIF/PDV prijavu; default oporeziva
  const vrstaIsporuke = ["OPOREZIVA", "IZVOZ", "OSLOBODJENA"].includes(
    body.vrstaIsporuke,
  )
    ? body.vrstaIsporuke
    : "OPOREZIVA";

  const orgIdFromSeller = seller.organizationId ? Number(seller.organizationId) : null;
  if (orgIdFromSeller !== null && !Number.isInteger(orgIdFromSeller)) {
    return res.status(400).json({ ok: false, error: "Invalid seller.organizationId" });
  }

  // Pristup: ako je org navedena → mora biti član + owner PRO+; inače legacy
  // user-scoped (samo PRO+ korisnici mogu kreirati bez org-e).
  if (orgIdFromSeller) {
    if (req.user.role !== "ADMIN") {
      const member = await OrganizationMember.findOne({
        where: { organizationId: orgIdFromSeller, userId: req.user.id },
      });
      if (!member) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
      const ownerTier = await getOrgOwnerRole(orgIdFromSeller);
      if (!["PRO", "BUSINESS", "ADMIN"].includes(ownerTier)) {
        return res.status(403).json({ ok: false, error: "FORBIDDEN_OWNER_TIER" });
      }
    }
  } else if (!["PRO", "BUSINESS", "ADMIN"].includes(req.user.role)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  // saveBuyerAsClient: PRO limit prati owner-tier kad ima org, inače user-role
  if (body.saveBuyerAsClient && !buyer.clientId) {
    const limitTier = orgIdFromSeller ? await getOrgOwnerRole(orgIdFromSeller) : req.user.role;
    if (limitTier === "PRO") {
      const where = orgIdFromSeller
        ? { organizationId: orgIdFromSeller, type: "PERSON", amortizacijaOnly: false }
        : { createdById: req.user.id, type: "PERSON", organizationId: null, amortizacijaOnly: false };
      const personCount = await Client.count({ where });
      const orgCount = await OrganizationMember.count({
        where: { userId: req.user.id },
        include: [{ model: Organization, as: "organization", where: { isClientOrg: true }, attributes: [] }],
      });
      if (personCount + orgCount >= PRO_CLIENT_LIMIT) {
        return res.status(403).json({ ok: false, error: "PRO_LIMIT_REACHED" });
      }
    }
  }

  const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
  const dueDate = body.dueDate
    ? new Date(body.dueDate)
    : (() => { const d = new Date(issueDate); d.setDate(d.getDate() + 15); return d; })();

  try {
    const result = await sequelize.transaction(async (t) => {
      const year = issueDate.getFullYear();
      const series = seriesFor(type, docType);
      const seq = await nextSequence({ organizationId: orgIdFromSeller, userId: req.user.id }, year, series, t);
      const fullNumber = formatInvoiceNumber(seq, year, type, docType);

      let clientId = buyer.clientId ? Number(buyer.clientId) : null;
      if (body.saveBuyerAsClient && !clientId) {
        if (buyerKind === "COMPANY") {
          const taxNumber = trimOrNull(buyer.idNumber);
          let existingOrg = null;
          if (taxNumber) {
            existingOrg = await Organization.findOne({
              where: { taxNumber, isClientOrg: true },
              transaction: t,
            });
          }
          if (existingOrg) {
            const member = await OrganizationMember.findOne({
              where: { organizationId: existingOrg.id, userId: req.user.id },
              transaction: t,
            });
            if (!member) {
              await OrganizationMember.create({
                organizationId: existingOrg.id, userId: req.user.id, role: "MEMBER",
              }, { transaction: t });
            }
          } else {
            const newOrg = await Organization.create({
              name: trimOrNull(buyer.name) || "Bez naziva",
              taxNumber,
              pdvNumber: trimOrNull(buyer.vatNumber),
              email: trimOrNull(buyer.email),
              phone: trimOrNull(buyer.phone),
              address: trimOrNull(buyer.address),
              city: trimOrNull(buyer.city),
              createdById: req.user.id,
              isClientOrg: true,
              type: "COMPANY",
            }, { transaction: t });
            await OrganizationMember.create({
              organizationId: newOrg.id, userId: req.user.id, role: "OWNER",
            }, { transaction: t });
          }
        } else {
          const parts = String(buyer.name).trim().split(/\s+/);
          const firstName = parts.shift() || "";
          const lastName = parts.join(" ") || "";
          const newClient = await Client.create({
            type: "PERSON",
            firstName: firstName || null,
            lastName: lastName || null,
            email: trimOrNull(buyer.email),
            phone: trimOrNull(buyer.phone),
            address: trimOrNull(buyer.address),
            city: trimOrNull(buyer.city),
            taxNumber: trimOrNull(buyer.idNumber),
            createdById: req.user.id,
            organizationId: orgIdFromSeller, // pripada istoj org-i kao faktura
            amortizacijaOnly: false,
          }, { transaction: t });
          clientId = newClient.id;
        }
      }

      const computedItems = items.map((it) => ({ input: it, computed: computeItem(it, applyVat) }));
      const totals = computeTotals(items, applyVat);

      const invoice = await Invoice.create({
        userId: req.user.id,
        organizationId: orgIdFromSeller,
        clientId,
        type,
        docType,
        year,
        sequence: seq,
        fullNumber,
        issueDate,
        dueDate: docType === "AVANSNA" ? null : dueDate,
        applyVat,
        vrstaIsporuke,
        currency,
        // avansna = primljena uplata, odmah je naplaćena (nema potraživanja)
        status: docType === "AVANSNA" ? "PAID" : "ISSUED",
        paidAt: docType === "AVANSNA" ? issueDate : null,

        sellerName: trimOrNull(seller.name),
        sellerAddress: trimOrNull(seller.address),
        sellerCity: trimOrNull(seller.city),
        sellerPhone: trimOrNull(seller.phone),
        sellerEmail: trimOrNull(seller.email),
        sellerTaxNumber: trimOrNull(seller.taxNumber),
        sellerVatNumber: trimOrNull(seller.vatNumber),
        sellerBankAccount: trimOrNull(seller.bankAccount),
        sellerLogoUrl: trimOrNull(seller.logoUrl),

        buyerName: trimOrNull(buyer.name),
        buyerAddress: trimOrNull(buyer.address),
        buyerCity: trimOrNull(buyer.city),
        buyerPostalCode: trimOrNull(buyer.postalCode),
        buyerPhone: trimOrNull(buyer.phone),
        buyerEmail: trimOrNull(buyer.email),
        buyerIdNumber: trimOrNull(buyer.idNumber),
        buyerVatNumber: trimOrNull(buyer.vatNumber),

        netTotal: totals.netTotal,
        discountTotal: totals.discountTotal,
        vatTotal: totals.vatTotal,
        grossTotal: totals.grossTotal,

        notes: trimOrNull(body.notes),
      }, { transaction: t });

      let ord = 1;
      for (const { input, computed } of computedItems) {
        await InvoiceItem.create({
          invoiceId: invoice.id,
          ordinal: ord++,
          name: trimOrNull(input.name),
          unit: trimOrNull(input.unit),
          quantity: Number(input.quantity || 0),
          unitPrice: Number(input.unitPrice || 0),
          discountPct: Number(input.discountPct || 0),
          vatPct: applyVat ? Number(input.vatPct || 0) : 0,
          netLine: computed.netLine,
          discountLine: computed.discountLine,
          vatLine: computed.vatLine,
          grossLine: computed.grossLine,
        }, { transaction: t });
      }

      const fresh = await Invoice.findOne({
        where: { id: invoice.id },
        include: [{ model: InvoiceItem, as: "items" }],
        transaction: t,
      });
      return fresh;
    });

    res.status(201).json({ ok: true, data: publicInvoice(result) });
  } catch (e) {
    console.error("invoice create error:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ── PATCH ──────────────────────────────────────────────────────────────────
async function patch(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });

  const inv = await Invoice.findOne({ where: { id } });
  if (!inv) return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  if (!(await userCanAccessInvoice(inv, req.user.id, req.user.role))) {
    return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  }

  const updates = {};
  const { status, paidAt, notes } = req.body || {};
  if (status !== undefined) {
    if (!["DRAFT", "ISSUED", "PAID", "CANCELLED"].includes(status)) {
      return res.status(400).json({ ok: false, error: "Neispravan status" });
    }
    // "Nenaplaćena" (PAID -> ISSUED/DRAFT) je undo za ručno označavanje. Ako je
    // faktura zatvorena vezanom potvrđenom uplatom sa izvoda, njeno vraćanje bi
    // desinhronizovalo karticu kupca (uplata izuzeta iz FIFO pool-a, a faktura
    // više nije PAID -> preostalo skače na pun iznos). Blokiraj uz uputu.
    if (inv.status === "PAID" && status !== "PAID" && status !== "CANCELLED") {
      const linked = await BankTransaction.count({
        where: { invoiceId: inv.id, status: "CONFIRMED" },
      });
      if (linked > 0) {
        return res.status(409).json({
          ok: false,
          error: "IMA_VEZANU_UPLATU",
          message:
            "Faktura je zatvorena uplatom sa izvoda. Prvo ukloni vezu s uplatom na bankovnom izvodu, pa je onda vrati u nenaplaćeno.",
        });
      }
    }
    updates.status = status;
    if (status === "PAID" && !inv.paidAt && !paidAt) {
      updates.paidAt = new Date();
    }
  }
  if (paidAt !== undefined) updates.paidAt = paidAt ? new Date(paidAt) : null;
  if (notes !== undefined) updates.notes = trimOrNull(notes);

  // ── KIF klasifikacije (PDV evidencije) ──
  const b = req.body || {};
  if (b.kifTipDokumenta !== undefined) {
    const ok = ["01","02","03","04","05","06","07","08","09"].includes(b.kifTipDokumenta);
    if (!ok) return res.status(400).json({ ok: false, error: "Neispravan tip dokumenta" });
    updates.kifTipDokumenta = b.kifTipDokumenta;
  }
  if (b.kifVrstaFakture !== undefined) {
    const ok = ["DOMACI_KUPAC","INOSTRANI_KUPAC","VANPOSLOVNE_SVRHE","OSTALO_NEOPOREZOVANO","GOTOVINSKA_UZ_RACUN","GOTOVINSKA_BEZ_RACUNA"].includes(b.kifVrstaFakture);
    if (!ok) return res.status(400).json({ ok: false, error: "Neispravna vrsta fakture" });
    updates.kifVrstaFakture = b.kifVrstaFakture;
  }
  if (b.kifVrstaDokumenta !== undefined) {
    const ok = ["REDOVNA","AVANSNA","KNJIZNA_OBAVIJEST","STORNO_AVANSNE","OSTALO"].includes(b.kifVrstaDokumenta);
    if (!ok) return res.status(400).json({ ok: false, error: "Neispravna vrsta dokumenta" });
    updates.kifVrstaDokumenta = b.kifVrstaDokumenta;
  }
  if (b.kifKpEntitet !== undefined) {
    // NISTA = korisnik izričito bez KP; null = automatski (heuristika)
    updates.kifKpEntitet = ["FBIH","RS","BD","NISTA"].includes(b.kifKpEntitet)
      ? b.kifKpEntitet
      : null;
  }
  if (b.kifKpIznos !== undefined) {
    const n = Number(b.kifKpIznos);
    updates.kifKpIznos = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  }
  if (b.kifJciBroj !== undefined) {
    updates.kifJciBroj = String(b.kifJciBroj || "").trim().slice(0, 30) || null;
  }
  if (b.kifJciDatum !== undefined) {
    const v = String(b.kifJciDatum || "").slice(0, 10);
    updates.kifJciDatum = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ ok: false, error: "Nema polja za ažuriranje" });
  }

  await Invoice.update(updates, { where: { id } });
  const fresh = await Invoice.findOne({
    where: { id },
    include: [{ model: InvoiceItem, as: "items" }],
  });
  res.status(200).json({ ok: true, data: publicInvoice(fresh) });
}

// ── PUT (puni edit sadržaja) ─────────────────────────────────────────────────
// Puni edit izlazne fakture/predračuna: kupac, stavke, datumi i iznosi se
// mijenjaju uz PONOVNI obračun, a fiskalni identitet (broj, sequence, godina,
// tip, docType, status, prodavac) ostaje isti. Dozvoljeno samo dok dokument
// nije naplaćen/storniran, nije specijalni tip (avansna/storno/KO/PDV
// evidencija), predračun nije pretvoren i nema vezanu knjižnu obavijest.
async function updateContent(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });

  const inv = await Invoice.findOne({ where: { id } });
  if (!inv) return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  if (!(await userCanAccessInvoice(inv, req.user.id, req.user.role))) {
    return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  }

  // Zaštite (uređivanje fiskalnog dokumenta)
  if (inv.docType !== "STANDARD") {
    return res.status(409).json({ ok: false, error: "NEEDITABILAN_TIP" });
  }
  if (inv.status === "PAID") return res.status(409).json({ ok: false, error: "NAPLACENA" });
  if (inv.status === "CANCELLED") return res.status(409).json({ ok: false, error: "STORNIRANA" });
  if (inv.type === "PROFORMA") {
    const child = await Invoice.findOne({
      where: { convertedFromProformaId: inv.id },
      attributes: ["id"],
    });
    if (child) return res.status(409).json({ ok: false, error: "PRETVOREN" });
  }
  const ko = await Invoice.findOne({
    where: { linkedInvoiceId: inv.id, docType: "KNJIZNA_OBAVIJEST" },
    attributes: ["id"],
  });
  if (ko) return res.status(409).json({ ok: false, error: "IMA_KNJIZNU" });

  const { errors } = validateCreate({ ...req.body, type: inv.type, docType: "STANDARD" });
  if (errors.length) return res.status(400).json({ ok: false, error: errors.join(" ") });

  const body = req.body;
  const buyer = body.buyer || {};
  const items = body.items;
  const applyVat = body.applyVat !== false;
  const currency = body.currency === "EUR" ? "EUR" : "BAM";
  const vrstaIsporuke = ["OPOREZIVA", "IZVOZ", "OSLOBODJENA"].includes(body.vrstaIsporuke)
    ? body.vrstaIsporuke
    : "OPOREZIVA";
  const issueDate = body.issueDate ? new Date(body.issueDate) : new Date(inv.issueDate);
  const dueDate = body.dueDate
    ? new Date(body.dueDate)
    : inv.dueDate
      ? new Date(inv.dueDate)
      : null;

  // Broj/sekvenca fakture pripada godini serije (inv.year, upisan u fullNumber).
  // Pomjeranje datuma u drugu godinu bi ostavilo faktetu u tuđem periodu sa
  // brojem iz stare serije (rupa u numeraciji KIF/PDV). Zabrani promjenu godine.
  const novaGodina = Number(
    String(body.issueDate || inv.issueDate).slice(0, 4),
  );
  if (inv.year && novaGodina && novaGodina !== Number(inv.year)) {
    return res.status(400).json({
      ok: false,
      error: "GODINA_SE_NE_PODUDARA",
      message: `Datum izdavanja mora ostati u ${inv.year}. godini jer broj fakture pripada toj seriji. Za drugu godinu storniraj ovu i izdaj novu fakturu.`,
    });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const computedItems = items.map((it) => ({ input: it, computed: computeItem(it, applyVat) }));
      const totals = computeTotals(items, applyVat);

      await inv.update(
        {
          applyVat,
          vrstaIsporuke,
          currency,
          issueDate,
          dueDate,
          buyerName: trimOrNull(buyer.name),
          buyerAddress: trimOrNull(buyer.address),
          buyerCity: trimOrNull(buyer.city),
          buyerPostalCode: trimOrNull(buyer.postalCode),
          buyerPhone: trimOrNull(buyer.phone),
          buyerEmail: trimOrNull(buyer.email),
          buyerIdNumber: trimOrNull(buyer.idNumber),
          buyerVatNumber: trimOrNull(buyer.vatNumber),
          netTotal: totals.netTotal,
          discountTotal: totals.discountTotal,
          vatTotal: totals.vatTotal,
          grossTotal: totals.grossTotal,
          notes: trimOrNull(body.notes),
        },
        { transaction: t },
      );

      await InvoiceItem.destroy({ where: { invoiceId: inv.id }, transaction: t });
      let ord = 1;
      for (const { input, computed } of computedItems) {
        await InvoiceItem.create(
          {
            invoiceId: inv.id,
            ordinal: ord++,
            name: trimOrNull(input.name),
            unit: trimOrNull(input.unit),
            quantity: Number(input.quantity || 0),
            unitPrice: Number(input.unitPrice || 0),
            discountPct: Number(input.discountPct || 0),
            vatPct: applyVat ? Number(input.vatPct || 0) : 0,
            netLine: computed.netLine,
            discountLine: computed.discountLine,
            vatLine: computed.vatLine,
            grossLine: computed.grossLine,
          },
          { transaction: t },
        );
      }

      return Invoice.findOne({
        where: { id: inv.id },
        include: [{ model: InvoiceItem, as: "items" }],
        transaction: t,
      });
    });

    res.status(200).json({ ok: true, data: publicInvoice(result) });
  } catch (e) {
    console.error("invoice updateContent error:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────
async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });

  const inv = await Invoice.findOne({ where: { id } });
  if (!inv) return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  if (!(await userCanAccessInvoice(inv, req.user.id, req.user.role))) {
    return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  }

  await sequelize.transaction(async (t) => {
    await InvoiceItem.destroy({ where: { invoiceId: id }, transaction: t });
    await Invoice.destroy({ where: { id }, transaction: t });
  });
  res.status(200).json({ ok: true, data: null });
}

// ── PDF ────────────────────────────────────────────────────────────────────
async function pdf(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });

  const inv = await Invoice.findOne({
    where: { id },
    include: [{ model: InvoiceItem, as: "items" }],
  });
  if (!inv) return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  if (!(await userCanAccessInvoice(inv, req.user.id, req.user.role))) {
    return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  }

  try {
    // Opcioni ispis u protuvaluti: ?currency=EUR ili ?currency=BAM.
    const reqCur = String(req.query.currency || "").toUpperCase();
    const displayCurrency = reqCur === "EUR" || reqCur === "BAM" ? reqCur : null;
    const plain = publicInvoice(inv);
    // broj izvornog dokumenta za podnaslov (storno → avansna, KO → faktura)
    if (inv.linkedInvoiceId) {
      const linked = await Invoice.findOne({
        where: { id: inv.linkedInvoiceId },
        attributes: ["fullNumber"],
      });
      if (linked) plain.linkedFullNumber = linked.fullNumber;
    }
    const buf = await generateInvoicePdf(plain, { displayCurrency });
    const base =
      inv.type === "PROFORMA"
        ? "Predracun"
        : inv.docType === "AVANSNA"
          ? "Avansna-faktura"
          : inv.docType === "STORNO_AVANSNE"
            ? "Storno-avansne"
            : inv.docType === "KNJIZNA_OBAVIJEST"
              ? "Knjizna-obavijest"
              : inv.docType === "PAZAR"
                ? "Pazar"
                : inv.docType === "PDV_EVIDENCIJA"
                  ? "PDV-evidencija"
                  : "Faktura";
    // Sufiks valute u nazivu fajla samo kad je protuvaluta (različita od originalne).
    const curSuffix =
      displayCurrency && displayCurrency !== inv.currency
        ? `-${displayCurrency}`
        : "";
    // broj dokumenta može sadržavati "/" (npr. PAZAR-07/2026)
    const fname = `${base}-${inv.fullNumber}${curSuffix}.pdf`.replace(
      /[\\/:*?"<>|]/g,
      "-",
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fname}"`);
    return res.status(200).end(buf);
  } catch (e) {
    console.error("invoice pdf error:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ── EMAIL ──────────────────────────────────────────────────────────────────
async function emailToBuyer(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });

  const inv = await Invoice.findOne({
    where: { id },
    include: [{ model: InvoiceItem, as: "items" }],
  });
  if (!inv) return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  if (!(await userCanAccessInvoice(inv, req.user.id, req.user.role))) {
    return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  }

  const overrideTo = trimOrNull(req.body?.to);
  const customMessage = trimOrNull(req.body?.message);
  const to = overrideTo || inv.buyerEmail;
  if (!to) return res.status(400).json({ ok: false, error: "Email kupca nije unesen" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ ok: false, error: "Neispravna email adresa" });
  }

  try {
    const buf = await generateInvoicePdf(publicInvoice(inv));
    await sendInvoiceEmail({
      to,
      replyTo: inv.sellerEmail || null,
      isProforma: inv.type === "PROFORMA",
      fullNumber: inv.fullNumber,
      sellerName: inv.sellerName,
      buyerName: inv.buyerName,
      gross: inv.grossTotal,
      currency: inv.currency || "BAM",
      dueDate: inv.dueDate,
      pdfBuffer: buf,
      customMessage,
    });
    await Invoice.update(
      { emailSentAt: new Date(), emailSentTo: to },
      { where: { id } },
    );
    return res.status(200).json({ ok: true, data: { sentTo: to, sentAt: new Date().toISOString() } });
  } catch (e) {
    console.error("invoice email error:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ── CONVERT PROFORMA -> INVOICE ────────────────────────────────────────────
async function convertProforma(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });

  const src = await Invoice.findOne({
    where: { id },
    include: [{ model: InvoiceItem, as: "items" }],
  });
  if (!src) return res.status(404).json({ ok: false, error: "Predračun nije pronađen" });
  if (!(await userCanAccessInvoice(src, req.user.id, req.user.role))) {
    return res.status(404).json({ ok: false, error: "Predračun nije pronađen" });
  }
  if (src.type !== "PROFORMA") {
    return res.status(400).json({ ok: false, error: "Samo predračun se može pretvoriti u fakturu." });
  }

  const already = await Invoice.findOne({
    where: { convertedFromProformaId: src.id },
  });
  if (already) {
    return res.status(200).json({ ok: true, data: publicInvoice(already), alreadyExisted: true });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const issueDate = new Date();
      const year = issueDate.getFullYear();
      const seq = await nextSequence({ organizationId: src.organizationId, userId: req.user.id }, year, "INVOICE", t);
      const fullNumber = formatInvoiceNumber(seq, year, "INVOICE");

      const items = (src.items || []).slice().sort((a, b) => a.ordinal - b.ordinal);
      const dueDate = (() => { const d = new Date(issueDate); d.setDate(d.getDate() + 15); return d; })();

      const inv = await Invoice.create({
        userId: req.user.id,
        organizationId: src.organizationId,
        clientId: src.clientId,
        type: "INVOICE",
        year,
        sequence: seq,
        fullNumber,
        issueDate,
        dueDate,
        applyVat: src.applyVat,
        vrstaIsporuke: src.vrstaIsporuke,
        currency: src.currency,
        status: "ISSUED",
        sellerName: src.sellerName,
        sellerAddress: src.sellerAddress,
        sellerCity: src.sellerCity,
        sellerPhone: src.sellerPhone,
        sellerEmail: src.sellerEmail,
        sellerTaxNumber: src.sellerTaxNumber,
        sellerVatNumber: src.sellerVatNumber,
        sellerBankAccount: src.sellerBankAccount,
        sellerLogoUrl: src.sellerLogoUrl,
        buyerName: src.buyerName,
        buyerAddress: src.buyerAddress,
        buyerCity: src.buyerCity,
        buyerPostalCode: src.buyerPostalCode,
        buyerPhone: src.buyerPhone,
        buyerEmail: src.buyerEmail,
        buyerIdNumber: src.buyerIdNumber,
        buyerVatNumber: src.buyerVatNumber,
        netTotal: src.netTotal,
        discountTotal: src.discountTotal,
        vatTotal: src.vatTotal,
        grossTotal: src.grossTotal,
        notes: src.notes,
        convertedFromProformaId: src.id,
      }, { transaction: t });

      let ord = 1;
      for (const it of items) {
        await InvoiceItem.create({
          invoiceId: inv.id,
          ordinal: ord++,
          name: it.name,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPct: it.discountPct,
          vatPct: it.vatPct,
          netLine: it.netLine,
          discountLine: it.discountLine,
          vatLine: it.vatLine,
          grossLine: it.grossLine,
        }, { transaction: t });
      }

      await Invoice.update({ status: "PAID", paidAt: issueDate }, { where: { id: src.id }, transaction: t });

      const fresh = await Invoice.findOne({
        where: { id: inv.id },
        include: [{ model: InvoiceItem, as: "items" }],
        transaction: t,
      });
      return fresh;
    });

    res.status(201).json({ ok: true, data: publicInvoice(result) });
  } catch (e) {
    console.error("invoice convert error:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ── STORNO AVANSNE FAKTURE ─────────────────────────────────────────────────
// Radi se ISKLJUČIVO nad postojećom avansnom fakturom (tipično kad se izda
// konačna faktura): kopija sa istim iznosima, docType STORNO_AVANSNE, vezana
// na avansnu. U knjige (KIF/prijava) ulazi negativno; iznosi u bazi su
// pozitivni, predznak se izvodi iz vrste dokumenta.
async function stornoAvans(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });

  const src = await Invoice.findOne({
    where: { id },
    include: [{ model: InvoiceItem, as: "items" }],
  });
  if (!src) return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  if (!(await userCanAccessInvoice(src, req.user.id, req.user.role))) {
    return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  }
  if (src.type !== "INVOICE" || src.docType !== "AVANSNA") {
    return res.status(400).json({ ok: false, error: "Stornirati se može samo avansna faktura." });
  }
  if (src.status === "CANCELLED") {
    return res.status(400).json({ ok: false, error: "Avansna faktura je stornirana kroz status." });
  }

  const already = await Invoice.findOne({
    where: { linkedInvoiceId: src.id, docType: "STORNO_AVANSNE" },
  });
  if (already) {
    return res.status(200).json({ ok: true, data: publicInvoice(already), alreadyExisted: true });
  }

  const rawDate = String(req.body?.issueDate || "").slice(0, 10);
  const issueDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? new Date(rawDate) : new Date();

  try {
    const result = await sequelize.transaction(async (t) => {
      const year = issueDate.getFullYear();
      const seq = await nextSequence({ organizationId: src.organizationId, userId: req.user.id }, year, "AVANS", t);
      const fullNumber = formatInvoiceNumber(seq, year, "INVOICE", "STORNO_AVANSNE");
      const items = (src.items || []).slice().sort((a, b) => a.ordinal - b.ordinal);

      const inv = await Invoice.create({
        userId: req.user.id,
        organizationId: src.organizationId,
        clientId: src.clientId,
        type: "INVOICE",
        docType: "STORNO_AVANSNE",
        linkedInvoiceId: src.id,
        year,
        sequence: seq,
        fullNumber,
        issueDate,
        dueDate: null,
        applyVat: src.applyVat,
        vrstaIsporuke: src.vrstaIsporuke,
        currency: src.currency,
        // ne naplaćuje se: odmah zatvorena (ne ulazi u potraživanja ni auto-match)
        status: "PAID",
        paidAt: issueDate,
        sellerName: src.sellerName,
        sellerAddress: src.sellerAddress,
        sellerCity: src.sellerCity,
        sellerPhone: src.sellerPhone,
        sellerEmail: src.sellerEmail,
        sellerTaxNumber: src.sellerTaxNumber,
        sellerVatNumber: src.sellerVatNumber,
        sellerBankAccount: src.sellerBankAccount,
        sellerLogoUrl: src.sellerLogoUrl,
        buyerName: src.buyerName,
        buyerAddress: src.buyerAddress,
        buyerCity: src.buyerCity,
        buyerPostalCode: src.buyerPostalCode,
        buyerPhone: src.buyerPhone,
        buyerEmail: src.buyerEmail,
        buyerIdNumber: src.buyerIdNumber,
        buyerVatNumber: src.buyerVatNumber,
        netTotal: src.netTotal,
        discountTotal: src.discountTotal,
        vatTotal: src.vatTotal,
        grossTotal: src.grossTotal,
        notes: trimOrNull(req.body?.note) || `Storno avansne fakture br. ${src.fullNumber}.`,
      }, { transaction: t });

      let ord = 1;
      for (const it of items) {
        await InvoiceItem.create({
          invoiceId: inv.id,
          ordinal: ord++,
          name: it.name,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPct: it.discountPct,
          vatPct: it.vatPct,
          netLine: it.netLine,
          discountLine: it.discountLine,
          vatLine: it.vatLine,
          grossLine: it.grossLine,
        }, { transaction: t });
      }

      const fresh = await Invoice.findOne({
        where: { id: inv.id },
        include: [{ model: InvoiceItem, as: "items" }],
        transaction: t,
      });
      return fresh;
    });

    res.status(201).json({ ok: true, data: publicInvoice(result) });
  } catch (e) {
    console.error("invoice storno avans error:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ── KNJIŽNA OBAVIJEST ──────────────────────────────────────────────────────
// Umanjenje po postojećoj standardnoj fakturi (povrat, naknadni rabat,
// reklamacija). Iznos je SA PDV-om; PDV dio se računa 17/117 ako je izvorna
// faktura sa PDV-om. U knjige ulazi negativno. Dozvoljeno je više djelimičnih
// obavijesti po istoj fakturi.
async function knjiznaObavijest(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ ok: false, error: "Invalid id" });

  const src = await Invoice.findOne({ where: { id } });
  if (!src) return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  if (!(await userCanAccessInvoice(src, req.user.id, req.user.role))) {
    return res.status(404).json({ ok: false, error: "Faktura nije pronađena" });
  }
  if (src.type !== "INVOICE" || src.docType !== "STANDARD") {
    return res.status(400).json({ ok: false, error: "Knjižna obavijest se izdaje uz standardnu fakturu." });
  }
  if (!["ISSUED", "PAID"].includes(src.status)) {
    return res.status(400).json({ ok: false, error: "Faktura mora biti izdana ili naplaćena." });
  }

  const iznos = Math.round(Number(req.body?.iznos) * 100) / 100;
  if (!Number.isFinite(iznos) || iznos <= 0) {
    return res.status(400).json({ ok: false, error: "Iznos umanjenja nije validan." });
  }
  if (iznos > Number(src.grossTotal)) {
    return res.status(400).json({ ok: false, error: "Umanjenje ne može biti veće od iznosa fakture." });
  }
  const razlog = trimOrNull(req.body?.razlog);
  const rawDate = String(req.body?.issueDate || "").slice(0, 10);
  const issueDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? new Date(rawDate) : new Date();

  // PDV dio umanjenja: 17/117 iz iznosa sa PDV-om (tačno, bez preračuna stavki)
  const saPdv = src.applyVat && Number(src.vatTotal) > 0;
  const vat = saPdv ? Math.round(((iznos * 17) / 117) * 100) / 100 : 0;
  const net = Math.round((iznos - vat) * 100) / 100;

  try {
    const result = await sequelize.transaction(async (t) => {
      const year = issueDate.getFullYear();
      const seq = await nextSequence({ organizationId: src.organizationId, userId: req.user.id }, year, "KO", t);
      const fullNumber = formatInvoiceNumber(seq, year, "INVOICE", "KNJIZNA_OBAVIJEST");

      const inv = await Invoice.create({
        userId: req.user.id,
        organizationId: src.organizationId,
        clientId: src.clientId,
        type: "INVOICE",
        docType: "KNJIZNA_OBAVIJEST",
        linkedInvoiceId: src.id,
        year,
        sequence: seq,
        fullNumber,
        issueDate,
        dueDate: null,
        applyVat: saPdv,
        vrstaIsporuke: src.vrstaIsporuke,
        currency: src.currency,
        // ne naplaćuje se: odmah zatvorena (ne ulazi u potraživanja ni auto-match)
        status: "PAID",
        paidAt: issueDate,
        sellerName: src.sellerName,
        sellerAddress: src.sellerAddress,
        sellerCity: src.sellerCity,
        sellerPhone: src.sellerPhone,
        sellerEmail: src.sellerEmail,
        sellerTaxNumber: src.sellerTaxNumber,
        sellerVatNumber: src.sellerVatNumber,
        sellerBankAccount: src.sellerBankAccount,
        sellerLogoUrl: src.sellerLogoUrl,
        buyerName: src.buyerName,
        buyerAddress: src.buyerAddress,
        buyerCity: src.buyerCity,
        buyerPostalCode: src.buyerPostalCode,
        buyerPhone: src.buyerPhone,
        buyerEmail: src.buyerEmail,
        buyerIdNumber: src.buyerIdNumber,
        buyerVatNumber: src.buyerVatNumber,
        netTotal: net,
        discountTotal: 0,
        vatTotal: vat,
        grossTotal: iznos,
        notes: razlog ? `Razlog: ${razlog}` : null,
      }, { transaction: t });

      await InvoiceItem.create({
        invoiceId: inv.id,
        ordinal: 1,
        name: `Umanjenje po fakturi br. ${src.fullNumber}${razlog ? ` (${razlog})` : ""}`,
        unit: null,
        quantity: 1,
        unitPrice: net,
        discountPct: 0,
        vatPct: saPdv ? 17 : 0,
        netLine: net,
        discountLine: 0,
        vatLine: vat,
        grossLine: iznos,
      }, { transaction: t });

      const fresh = await Invoice.findOne({
        where: { id: inv.id },
        include: [{ model: InvoiceItem, as: "items" }],
        transaction: t,
      });
      return fresh;
    });

    res.status(201).json({ ok: true, data: publicInvoice(result) });
  } catch (e) {
    console.error("invoice knjizna obavijest error:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ── PAZAR (gotovinski promet) ──────────────────────────────────────────────
// Zbirno mjesečno knjiženje pazara u KIF za PDV obveznike: PDV se računa
// preračunatom stopom 17/117 iz bruto pazara. Čista PDV evidencija: odmah
// zatvorena (novac je već primljen gotovinom / preko pologa na izvodu koji
// puni KPR), kupci su krajnji potrošači pa PDV ide u krajnju potrošnju.
async function pazar(req, res) {
  const body = req.body || {};
  const organizationId = Number(body.organizationId);
  // dnevni unos: datum umjesto month/year (issueDate = taj dan)
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(String(body.datum || ""))
    ? String(body.datum)
    : null;
  const month = datum ? Number(datum.slice(5, 7)) : Number(body.month);
  const year = datum ? Number(datum.slice(0, 4)) : Number(body.year);
  const iznos = Math.round(Number(body.iznos) * 100) / 100;
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
    return res.status(400).json({ ok: false, error: "INVALID_PERIOD" });
  }
  if (!Number.isFinite(iznos) || iznos <= 0) {
    return res.status(400).json({ ok: false, error: "IZNOS_INVALID" });
  }

  // pristup kao kod kreiranja fakture: član org-e + owner PRO+
  if (req.user.role !== "ADMIN") {
    const member = await OrganizationMember.findOne({
      where: { organizationId, userId: req.user.id },
    });
    if (!member) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    const ownerTier = await getOrgOwnerRole(organizationId);
    if (!["PRO", "BUSINESS", "ADMIN"].includes(ownerTier)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_OWNER_TIER" });
    }
  }
  const org = await Organization.findByPk(organizationId);
  if (!org) return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });

  const mm = String(month).padStart(2, "0");
  const brojDokumenta =
    trimOrNull(body.brojDokumenta) ||
    (datum
      ? `PAZAR-${datum.slice(8, 10)}.${mm}.${year}`
      : `PAZAR-${mm}/${year}`);
  // KIF period po datumu: dnevni unos = taj dan, mjesečni = zadnji dan mjeseca
  const lastDay =
    datum ?? new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  const applyVat = Boolean(org.isPdvObveznik);
  const vat = applyVat ? Math.round(((iznos * 17) / 117) * 100) / 100 : 0;
  const net = Math.round((iznos - vat) * 100) / 100;

  try {
    const result = await sequelize.transaction(async (t) => {
      const inv = await Invoice.create({
        userId: req.user.id,
        organizationId,
        clientId: null,
        type: "INVOICE",
        docType: "PAZAR",
        year,
        sequence: 0,
        fullNumber: brojDokumenta,
        issueDate: lastDay,
        dueDate: null,
        applyVat,
        vrstaIsporuke: "OPOREZIVA",
        // gotovinska naplata; kupci bez PDV broja → krajnja potrošnja (auto)
        kifVrstaFakture: "GOTOVINSKA_UZ_RACUN",
        currency: "BAM",
        status: "PAID",
        paidAt: lastDay,
        sellerName: org.name,
        sellerAddress: org.address,
        sellerCity: org.city,
        sellerPhone: org.phone,
        sellerEmail: org.email,
        sellerTaxNumber: org.taxNumber,
        sellerVatNumber: org.pdvNumber,
        sellerBankAccount: org.bankAccount,
        sellerLogoUrl: org.logoUrl,
        buyerName: "Krajnji potrošači (pazar)",
        netTotal: net,
        discountTotal: 0,
        vatTotal: vat,
        grossTotal: iznos,
        notes: trimOrNull(body.note),
      }, { transaction: t });

      await InvoiceItem.create({
        invoiceId: inv.id,
        ordinal: 1,
        name: datum
          ? `Gotovinski promet (pazar) za ${datum.slice(8, 10)}.${mm}.${year}.`
          : `Gotovinski promet (pazar) za ${mm}/${year}.`,
        unit: null,
        quantity: 1,
        unitPrice: net,
        discountPct: 0,
        vatPct: applyVat ? 17 : 0,
        netLine: net,
        discountLine: 0,
        vatLine: vat,
        grossLine: iznos,
      }, { transaction: t });

      // opciono razduženje TKM-a istim iznosom (odvojena evidencija od
      // KIF-a; TKM čita samo tkm_pazari)
      if (body.uTkm) {
        await TkmPazar.create(
          {
            organizationId,
            datum: lastDay,
            iznos,
            opis: `Promet (pazar) ${brojDokumenta}`,
          },
          { transaction: t },
        );
      }

      const fresh = await Invoice.findOne({
        where: { id: inv.id },
        include: [{ model: InvoiceItem, as: "items" }],
        transaction: t,
      });
      return fresh;
    });

    res.status(201).json({ ok: true, data: publicInvoice(result) });
  } catch (e) {
    console.error("invoice pazar error:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ── Direktno "samo PDV" knjiženje u KIF ──────────────────────────────────────
// Ogledalo KUF opcije "samo PDV evidencija": KIF red sa osnovicom i ukupnim
// iznosom 0, samo izlazni PDV. Glavni slučaj je posebna šema u građevinarstvu
// (čl. 40): kad MI uplatimo PDV za dobavljača, u KIF ide ovaj red (broj
// dokumenta "POSEBNA ŠEMA U GRAĐEVINARSTVU"), a dobavljačev račun u KUF
// normalno, pa je neto PDV efekat 0. Format potvrđen iz stvarnog e-KIF
// fajla: tip 01, sve kolone 0.00 osim PDV-a. Suprotni smjer (kupac plati naš
// PDV) se knjiži kroz postojeći KUF unos samo-PDV sa tipom 08.
async function kifPdv(req, res) {
  const body = req.body || {};
  const organizationId = Number(body.organizationId);
  const partnerId = Number(body.partnerId);
  const pdvIznos = Math.round(Number(body.pdvIznos) * 100) / 100;
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(String(body.datum || ""))
    ? String(body.datum)
    : null;
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  if (!Number.isInteger(partnerId) || partnerId <= 0) {
    return res.status(400).json({ ok: false, error: "PARTNER_REQUIRED" });
  }
  if (!datum) return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
  if (!Number.isFinite(pdvIznos) || pdvIznos <= 0) {
    return res.status(400).json({ ok: false, error: "IZNOS_INVALID" });
  }
  if (!trimOrNull(body.brojDokumenta)) {
    return res.status(400).json({ ok: false, error: "BROJ_REQUIRED" });
  }

  // pristup kao kod pazara: član org-e + owner PRO+
  if (req.user.role !== "ADMIN") {
    const member = await OrganizationMember.findOne({
      where: { organizationId, userId: req.user.id },
    });
    if (!member) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    const ownerTier = await getOrgOwnerRole(organizationId);
    if (!["PRO", "BUSINESS", "ADMIN"].includes(ownerTier)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_OWNER_TIER" });
    }
  }
  const org = await Organization.findByPk(organizationId);
  if (!org) return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });
  // KIF izlazni PDV ima smisla samo za PDV obveznika (UI dugme je disabled,
  // ali serverska provjera štiti od direktnog API poziva u ne-obveznika)
  if (!org.isPdvObveznik) {
    return res.status(400).json({ ok: false, error: "NIJE_PDV_OBVEZNIK" });
  }
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
  });
  if (!partner) {
    return res.status(404).json({ ok: false, error: "PARTNER_NOT_FOUND" });
  }

  const brojDokumenta = trimOrNull(body.brojDokumenta);

  try {
    const result = await sequelize.transaction(async (t) => {
      const inv = await Invoice.create({
        userId: req.user.id,
        organizationId,
        clientId: null,
        type: "INVOICE",
        docType: "PDV_EVIDENCIJA",
        year: Number(datum.slice(0, 4)),
        sequence: 0,
        fullNumber: brojDokumenta,
        issueDate: datum,
        dueDate: null,
        applyVat: true,
        vrstaIsporuke: "OPOREZIVA",
        kifTipDokumenta: "01",
        // partner je PDV obveznik koji će ovaj PDV odbiti: NIJE krajnja potrošnja
        kifKpEntitet: "NISTA",
        currency: "BAM",
        // ništa se ne naplaćuje (PDV je uplaćen direktno UIO)
        status: "PAID",
        paidAt: datum,
        sellerName: org.name,
        sellerAddress: org.address,
        sellerCity: org.city,
        sellerPhone: org.phone,
        sellerEmail: org.email,
        sellerTaxNumber: org.taxNumber,
        sellerVatNumber: org.pdvNumber,
        sellerBankAccount: org.bankAccount,
        sellerLogoUrl: org.logoUrl,
        buyerName: partner.name,
        buyerAddress: partner.address,
        buyerCity: partner.city,
        buyerIdNumber: partner.jib,
        buyerVatNumber: partner.pdvBroj,
        // čista PDV evidencija: osnovica i ukupno 0, samo izlazni PDV
        netTotal: 0,
        discountTotal: 0,
        vatTotal: pdvIznos,
        grossTotal: 0,
        notes: trimOrNull(body.note),
      }, { transaction: t });

      await InvoiceItem.create({
        invoiceId: inv.id,
        ordinal: 1,
        name: `Direktno PDV knjiženje u KIF: ${brojDokumenta}`,
        unit: null,
        quantity: 1,
        unitPrice: 0,
        discountPct: 0,
        vatPct: 0,
        netLine: 0,
        discountLine: 0,
        vatLine: pdvIznos,
        grossLine: 0,
      }, { transaction: t });

      const fresh = await Invoice.findOne({
        where: { id: inv.id },
        include: [{ model: InvoiceItem, as: "items" }],
        transaction: t,
      });
      return fresh;
    });

    res.status(201).json({ ok: true, data: publicInvoice(result) });
  } catch (e) {
    console.error("invoice kifPdv error:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

module.exports = { list, adminList, getById, create, patch, updateContent, remove, pdf, emailToBuyer, convertProforma, stornoAvans, knjiznaObavijest, pazar, kifPdv, createInvoiceRecord };
