const { Op } = require("sequelize");
const {
  sequelize,
  Invoice,
  InvoiceItem,
  InvoiceCounter,
  Organization,
  OrganizationMember,
  Client,
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
async function getAccessibleInvoicingOrgIds(userId, userRole) {
  if (userRole === "ADMIN") {
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
        where: { organizationId, year, type },
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

  return { errors, type };
}

// ── LIST ───────────────────────────────────────────────────────────────────
async function list(req, res) {
  const orgIds = await getAccessibleInvoicingOrgIds(req.user.id, req.user.role);

  // OR: fakture iz pristupačnih org-a + legacy lične (userId === me, organizationId IS NULL)
  const orClauses = [{ userId: req.user.id, organizationId: null }];
  if (orgIds.length > 0) orClauses.push({ organizationId: { [Op.in]: orgIds } });

  const where = { [Op.or]: orClauses };
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

  const data = invoices.map((inv) => {
    const plain = publicInvoice(inv);
    if (inv.type === "PROFORMA" && convertedMap.has(inv.id)) {
      const c = convertedMap.get(inv.id);
      plain.convertedToInvoiceId = c.id;
      plain.convertedToFullNumber = c.fullNumber;
    }
    return plain;
  });
  res.status(200).json({ ok: true, data });
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
  res.status(200).json({ ok: true, data: publicInvoice(inv) });
}

// ── CREATE ─────────────────────────────────────────────────────────────────
async function create(req, res) {
  const { errors, type } = validateCreate(req.body);
  if (errors.length) return res.status(400).json({ ok: false, error: errors.join(" ") });

  const body = req.body;
  const seller = body.seller || {};
  const buyer = body.buyer || {};
  const items = body.items;
  const applyVat = body.applyVat !== false;
  const currency = body.currency === "EUR" ? "EUR" : "BAM";
  const buyerKind = body.buyerKind === "COMPANY" ? "COMPANY" : "PERSON";

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
      const seq = await nextSequence({ organizationId: orgIdFromSeller, userId: req.user.id }, year, type, t);
      const fullNumber = formatInvoiceNumber(seq, year, type);

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
        year,
        sequence: seq,
        fullNumber,
        issueDate,
        dueDate,
        applyVat,
        currency,
        status: "ISSUED",

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
    updates.status = status;
    if (status === "PAID" && !inv.paidAt && !paidAt) {
      updates.paidAt = new Date();
    }
  }
  if (paidAt !== undefined) updates.paidAt = paidAt ? new Date(paidAt) : null;
  if (notes !== undefined) updates.notes = trimOrNull(notes);

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
    const buf = await generateInvoicePdf(publicInvoice(inv));
    const fname = `${inv.type === "PROFORMA" ? "Predracun" : "Faktura"}-${inv.fullNumber}.pdf`;
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

module.exports = { list, getById, create, patch, remove, pdf, emailToBuyer, convertProforma };
