// Pripremljeni (ponavljajući) računi: šabloni fakture sa frekvencijom. Kad
// korisnik pokrene "Fakturiši sve" za frekvenciju, od AKTIVNIH šablona se
// prave prave izlazne fakture (reuse createInvoiceRecord iz invoicesController).
// Nema automatskog cron izdavanja, okidač je ručni.
const {
  sequelize,
  PreparedInvoice,
  PreparedInvoiceItem,
  Organization,
  OrganizationMember,
} = require("../models/index");
const { createInvoiceRecord } = require("./invoicesController");
const { computeTotals } = require("../utils/invoicePdf");
const { getOrgOwnerRole } = require("../services/tierService");

const FREQS = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];
const isStr = (v) => typeof v === "string" && v.trim() !== "";
const trimOrNull = (v) => (isStr(v) ? String(v).trim() : null);

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function orgAllowed(userId, userRole, organizationId) {
  if (userRole === "ADMIN") return true;
  if (!organizationId) return false;
  const m = await OrganizationMember.findOne({
    where: { userId, organizationId },
  });
  return !!m;
}

// Kao POST /api/invoices: pripremljeni računi prave prave fakture, pa write
// operacije traže i tier vlasnika obrta (PRO/BUSINESS), ne samo članstvo.
// Vraća null kad je dozvoljeno, inače kod greške.
async function tierGate(userId, userRole, organizationId) {
  if (!(await orgAllowed(userId, userRole, organizationId))) return "FORBIDDEN";
  if (userRole === "ADMIN") return null;
  const ownerTier = await getOrgOwnerRole(organizationId);
  if (!["PRO", "BUSINESS", "ADMIN"].includes(ownerTier)) {
    return "FORBIDDEN_OWNER_TIER";
  }
  return null;
}

function itemsFromBody(body) {
  const applyVat = body?.applyVat !== false;
  const items = Array.isArray(body?.items) ? body.items : [];
  return items
    .filter((it) => isStr(it.name))
    .map((it, i) => ({
      ordinal: i + 1,
      name: String(it.name).trim(),
      unit: trimOrNull(it.unit),
      quantity: Number(it.quantity || 0),
      unitPrice: Number(it.unitPrice || 0),
      discountPct: Number(it.discountPct || 0),
      vatPct: applyVat ? Number(it.vatPct || 0) : 0,
    }));
}

function buyerFromBody(body) {
  const b = body?.buyer || {};
  return {
    name: trimOrNull(b.name),
    address: trimOrNull(b.address),
    city: trimOrNull(b.city),
    postalCode: trimOrNull(b.postalCode),
    phone: trimOrNull(b.phone),
    email: trimOrNull(b.email),
    idNumber: trimOrNull(b.idNumber),
    vatNumber: trimOrNull(b.vatNumber),
  };
}

function validateBody(body) {
  const errors = [];
  const freq = String(body?.frequency || "").toUpperCase();
  if (!FREQS.includes(freq)) errors.push("Neispravna frekvencija.");
  if (!isStr(body?.buyer?.name)) errors.push("Naziv kupca je obavezan.");
  const items = itemsFromBody(body);
  if (items.length === 0) errors.push("Dodajte barem jednu stavku.");
  items.forEach((it, i) => {
    if (it.quantity <= 0) errors.push(`Stavka ${i + 1}: količina mora biti veća od 0.`);
    if (it.unitPrice < 0) errors.push(`Stavka ${i + 1}: cijena ne može biti negativna.`);
  });
  return { errors, freq, items };
}

function commonFields(body, freq) {
  const buyer = buyerFromBody(body);
  return {
    partnerId: parseId(body.partnerId) || null,
    frequency: freq,
    active: body.active === false ? false : true,
    applyVat: body.applyVat !== false,
    vrstaIsporuke: ["OPOREZIVA", "IZVOZ", "OSLOBODJENA"].includes(body.vrstaIsporuke)
      ? body.vrstaIsporuke
      : "OPOREZIVA",
    currency: body.currency === "EUR" ? "EUR" : "BAM",
    buyerName: buyer.name,
    buyerAddress: buyer.address,
    buyerCity: buyer.city,
    buyerPostalCode: buyer.postalCode,
    buyerPhone: buyer.phone,
    buyerEmail: buyer.email,
    buyerIdNumber: buyer.idNumber,
    buyerVatNumber: buyer.vatNumber,
    notes: trimOrNull(body.notes),
  };
}

function publicPrepared(p) {
  const items = (p.items || [])
    .map((it) => ({
      id: it.id,
      ordinal: it.ordinal,
      name: it.name,
      unit: it.unit,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      discountPct: Number(it.discountPct),
      vatPct: Number(it.vatPct),
    }))
    .sort((a, b) => a.ordinal - b.ordinal);
  const totals = computeTotals(items, p.applyVat);
  return {
    id: p.id,
    organizationId: p.organizationId,
    partnerId: p.partnerId,
    frequency: p.frequency,
    active: !!p.active,
    applyVat: !!p.applyVat,
    vrstaIsporuke: p.vrstaIsporuke,
    currency: p.currency,
    buyerName: p.buyerName,
    buyerAddress: p.buyerAddress,
    buyerCity: p.buyerCity,
    buyerPostalCode: p.buyerPostalCode,
    buyerPhone: p.buyerPhone,
    buyerEmail: p.buyerEmail,
    buyerIdNumber: p.buyerIdNumber,
    buyerVatNumber: p.buyerVatNumber,
    notes: p.notes,
    lastInvoicedAt: p.lastInvoicedAt,
    netTotal: totals.netTotal,
    vatTotal: totals.vatTotal,
    grossTotal: totals.grossTotal,
    items,
  };
}

// GET /api/prepared-invoices?organizationId=
async function list(req, res) {
  const organizationId = parseId(req.query.organizationId);
  if (!organizationId) return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  if (!(await orgAllowed(req.user.id, req.user.role, organizationId))) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }
  const rows = await PreparedInvoice.findAll({
    where: { organizationId },
    include: [{ model: PreparedInvoiceItem, as: "items" }],
    order: [["createdAt", "DESC"]],
  });
  res.json({ ok: true, data: rows.map(publicPrepared) });
}

async function loadOwned(req) {
  const id = parseId(req.params.id);
  if (!id) return { error: "INVALID_ID", status: 400 };
  const p = await PreparedInvoice.findByPk(id, {
    include: [{ model: PreparedInvoiceItem, as: "items" }],
  });
  if (!p) return { error: "NOT_FOUND", status: 404 };
  if (!(await orgAllowed(req.user.id, req.user.role, p.organizationId))) {
    return { error: "FORBIDDEN", status: 403 };
  }
  return { p };
}

// POST /api/prepared-invoices
async function create(req, res) {
  const organizationId = parseId(req.body?.organizationId);
  if (!organizationId) return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  const gate = await tierGate(req.user.id, req.user.role, organizationId);
  if (gate) return res.status(403).json({ ok: false, error: gate });
  const { errors, freq, items } = validateBody(req.body);
  if (errors.length) return res.status(400).json({ ok: false, error: errors.join(" ") });
  try {
    const created = await sequelize.transaction(async (t) => {
      const p = await PreparedInvoice.create(
        { organizationId, userId: req.user.id, ...commonFields(req.body, freq) },
        { transaction: t },
      );
      for (const it of items) {
        await PreparedInvoiceItem.create(
          { preparedInvoiceId: p.id, ...it },
          { transaction: t },
        );
      }
      return PreparedInvoice.findByPk(p.id, {
        include: [{ model: PreparedInvoiceItem, as: "items" }],
        transaction: t,
      });
    });
    res.status(201).json({ ok: true, data: publicPrepared(created) });
  } catch (e) {
    console.error("prepared create error:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// PUT /api/prepared-invoices/:id  (puni edit sadržaja)
async function update(req, res) {
  const ctx = await loadOwned(req);
  if (ctx.error) return res.status(ctx.status).json({ ok: false, error: ctx.error });
  const { errors, freq, items } = validateBody(req.body);
  if (errors.length) return res.status(400).json({ ok: false, error: errors.join(" ") });
  try {
    const updated = await sequelize.transaction(async (t) => {
      await ctx.p.update(commonFields(req.body, freq), { transaction: t });
      await PreparedInvoiceItem.destroy({
        where: { preparedInvoiceId: ctx.p.id },
        transaction: t,
      });
      for (const it of items) {
        await PreparedInvoiceItem.create(
          { preparedInvoiceId: ctx.p.id, ...it },
          { transaction: t },
        );
      }
      return PreparedInvoice.findByPk(ctx.p.id, {
        include: [{ model: PreparedInvoiceItem, as: "items" }],
        transaction: t,
      });
    });
    res.json({ ok: true, data: publicPrepared(updated) });
  } catch (e) {
    console.error("prepared update error:", e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// PATCH /api/prepared-invoices/:id  { active }  (uključi/isključi)
async function patch(req, res) {
  const ctx = await loadOwned(req);
  if (ctx.error) return res.status(ctx.status).json({ ok: false, error: ctx.error });
  if (typeof req.body?.active === "boolean") {
    await ctx.p.update({ active: req.body.active });
  }
  const fresh = await PreparedInvoice.findByPk(ctx.p.id, {
    include: [{ model: PreparedInvoiceItem, as: "items" }],
  });
  res.json({ ok: true, data: publicPrepared(fresh) });
}

// DELETE /api/prepared-invoices/:id
async function remove(req, res) {
  const ctx = await loadOwned(req);
  if (ctx.error) return res.status(ctx.status).json({ ok: false, error: ctx.error });
  await sequelize.transaction(async (t) => {
    await PreparedInvoiceItem.destroy({
      where: { preparedInvoiceId: ctx.p.id },
      transaction: t,
    });
    await ctx.p.destroy({ transaction: t });
  });
  res.json({ ok: true, data: null });
}

// POST /api/prepared-invoices/invoice  { organizationId, frequency, issueDate, dueDate }
// Fakturiši sve AKTIVNE pripremljene račune date frekvencije.
async function invoiceBatch(req, res) {
  const organizationId = parseId(req.body?.organizationId);
  if (!organizationId) return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  const gate = await tierGate(req.user.id, req.user.role, organizationId);
  if (gate) return res.status(403).json({ ok: false, error: gate });
  const freq = String(req.body?.frequency || "").toUpperCase();
  if (!FREQS.includes(freq)) return res.status(400).json({ ok: false, error: "Neispravna frekvencija." });
  const issueDate = req.body?.issueDate ? new Date(req.body.issueDate) : new Date();
  if (Number.isNaN(issueDate.getTime())) {
    return res.status(400).json({ ok: false, error: "Neispravan datum računa." });
  }
  const dueDate = req.body?.dueDate ? new Date(req.body.dueDate) : null;

  const org = await Organization.findByPk(organizationId);
  if (!org) return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });
  const seller = {
    name: org.name,
    address: org.address,
    city: org.city,
    phone: org.phone,
    email: org.email,
    taxNumber: org.taxNumber,
    vatNumber: org.pdvNumber,
    bankAccount: org.bankAccount || null,
    logoUrl: org.logoUrl,
  };

  const prepared = await PreparedInvoice.findAll({
    where: { organizationId, frequency: freq, active: true },
    include: [{ model: PreparedInvoiceItem, as: "items" }],
    order: [["createdAt", "ASC"]],
  });
  if (prepared.length === 0) {
    return res.status(400).json({ ok: false, error: "NEMA_AKTIVNIH" });
  }

  const created = [];
  try {
    await sequelize.transaction(async (t) => {
      for (const p of prepared) {
        const items = (p.items || [])
          .slice()
          .sort((a, b) => a.ordinal - b.ordinal)
          .map((it) => ({
            name: it.name,
            unit: it.unit,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            discountPct: Number(it.discountPct),
            vatPct: Number(it.vatPct),
          }));
        const inv = await createInvoiceRecord(
          {
            organizationId,
            userId: req.user.id,
            type: "INVOICE",
            docType: "STANDARD",
            issueDate,
            dueDate,
            applyVat: !!p.applyVat,
            vrstaIsporuke: p.vrstaIsporuke,
            currency: p.currency,
            seller,
            buyer: {
              name: p.buyerName,
              address: p.buyerAddress,
              city: p.buyerCity,
              postalCode: p.buyerPostalCode,
              phone: p.buyerPhone,
              email: p.buyerEmail,
              idNumber: p.buyerIdNumber,
              vatNumber: p.buyerVatNumber,
            },
            items,
            notes: p.notes,
          },
          t,
        );
        await p.update({ lastInvoicedAt: new Date() }, { transaction: t });
        created.push({ id: inv.id, fullNumber: inv.fullNumber, buyerName: p.buyerName });
      }
    });
  } catch (e) {
    console.error("prepared invoice batch error:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }

  res.json({ ok: true, data: { count: created.length, created } });
}

module.exports = { list, create, update, patch, remove, invoiceBatch };
