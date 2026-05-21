const { Client, OrganizationMember } = require("../models/index");
const clientRepository = require("../repositories/clientRepository");
const { encryptJmbg } = require("../utils/encryptJmbg");
const { getOrgOwnerRole } = require("../services/tierService");

const PRO_CLIENT_LIMIT = 20;

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// Faza 3: provjera org-tier umjesto user-role. Bilo koji član PRO+ orga može
// rukovati klijentima te org-e. Kreiranje bez orga (legacy) zahtijeva da
// pozivaoc lično ima PRO+ pretplatu.
async function ensureAccessForCreate(req, res, organizationId, ownerTierAllowed = ["PRO", "BUSINESS", "ADMIN"]) {
  if (req.user.role === "ADMIN") return true;

  if (organizationId) {
    const member = await OrganizationMember.findOne({
      where: { userId: req.user.id, organizationId },
    });
    if (!member) {
      res.status(403).json({ ok: false, error: "FORBIDDEN" });
      return false;
    }
    const ownerTier = await getOrgOwnerRole(organizationId);
    if (!ownerTierAllowed.includes(ownerTier)) {
      res.status(403).json({ ok: false, error: "FORBIDDEN_OWNER_TIER" });
      return false;
    }
    return true;
  }

  // Legacy (no org): require caller's own role to be allowed
  if (!ownerTierAllowed.includes(req.user.role)) {
    res.status(403).json({ ok: false, error: "FORBIDDEN" });
    return false;
  }
  return true;
}

async function list(req, res) {
  const clients = await clientRepository.getPersonClients(req.user.id);
  res.status(200).json({ ok: true, data: clients });
}

async function create(req, res) {
  const rawOrgId = req.body?.organizationId;
  const orgId = rawOrgId ? Number(rawOrgId) : null;
  if (rawOrgId !== undefined && rawOrgId !== null && rawOrgId !== "" && !Number.isInteger(orgId)) {
    return res.status(400).json({ ok: false, error: "Invalid organizationId" });
  }

  if (!(await ensureAccessForCreate(req, res, orgId))) return;

  // PRO limit (20) — broji se per-org kada je orgId postavljen, inače per-user (legacy).
  if (req.user.role !== "ADMIN") {
    const limitOwnerTier = orgId ? await getOrgOwnerRole(orgId) : req.user.role;
    if (limitOwnerTier === "PRO") {
      const where = orgId
        ? { organizationId: orgId, type: "PERSON", amortizacijaOnly: false }
        : { createdById: req.user.id, type: "PERSON", organizationId: null, amortizacijaOnly: false };
      const count = await Client.count({ where });
      if (count >= PRO_CLIENT_LIMIT) {
        return res.status(403).json({ ok: false, error: "PRO_LIMIT_REACHED" });
      }
    }
  }

  const { firstName, lastName, jmbg, taxNumber, email, phone, address, city, idCardNumber } = req.body ?? {};
  const data = {
    firstName: isNonEmptyString(firstName) ? firstName.trim() : null,
    lastName: isNonEmptyString(lastName) ? lastName.trim() : null,
  };

  if (jmbg && String(jmbg).trim()) {
    if (!/^\d{13}$/.test(String(jmbg).trim()))
      return res.status(400).json({ ok: false, error: "JMBG mora imati tačno 13 cifara" });
    data.jmbg = encryptJmbg(String(jmbg).trim());
  }
  if (taxNumber !== undefined) data.taxNumber = taxNumber ? String(taxNumber).trim() : null;
  if (email !== undefined) data.email = email ? String(email).trim() : null;
  if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
  if (address !== undefined) data.address = address ? String(address).trim() : null;
  if (city !== undefined) data.city = city ? String(city).trim() : null;
  if (idCardNumber !== undefined) data.idCardNumber = idCardNumber ? String(idCardNumber).trim().slice(0, 9) : null;

  try {
    const client = await clientRepository.createPersonClient(data, req.user.id, orgId);
    res.status(201).json({ ok: true, data: client });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  const { firstName, lastName, jmbg, taxNumber, email, phone, address, city, idCardNumber } = req.body ?? {};
  const data = {};

  if (firstName != null) {
    if (!isNonEmptyString(firstName)) return res.status(400).json({ ok: false, error: "Ime je obavezno" });
    data.firstName = firstName.trim();
  }
  if (lastName != null) {
    if (!isNonEmptyString(lastName)) return res.status(400).json({ ok: false, error: "Prezime je obavezno" });
    data.lastName = lastName.trim();
  }
  if (jmbg && String(jmbg).trim()) {
    if (!/^\d{13}$/.test(String(jmbg).trim()))
      return res.status(400).json({ ok: false, error: "JMBG mora imati tačno 13 cifara" });
    data.jmbg = encryptJmbg(String(jmbg).trim());
  }
  if (taxNumber !== undefined) data.taxNumber = taxNumber ? String(taxNumber).trim() : null;
  if (email !== undefined) data.email = email ? String(email).trim() : null;
  if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
  if (address !== undefined) data.address = address ? String(address).trim() : null;
  if (city !== undefined) data.city = city ? String(city).trim() : null;
  if (idCardNumber !== undefined) data.idCardNumber = idCardNumber ? String(idCardNumber).trim().slice(0, 9) : null;

  if (Object.keys(data).length === 0)
    return res.status(400).json({ ok: false, error: "Nema polja za ažuriranje" });

  try {
    const client = await clientRepository.updatePersonClient(id, data, req.user.id);
    if (!client) return res.status(404).json({ ok: false, error: "Klijent nije pronađen" });
    res.status(200).json({ ok: true, data: client });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  try {
    const deleted = await clientRepository.deletePersonClient(id, req.user.id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Klijent nije pronađen" });
    res.status(200).json({ ok: true, data: null });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function listAmortizacija(req, res) {
  const clients = await clientRepository.getAmortizacijaClients(req.user.id);
  res.status(200).json({ ok: true, data: clients });
}

async function createAmortizacija(req, res) {
  const rawOrgId = req.body?.organizationId;
  const orgId = rawOrgId ? Number(rawOrgId) : null;
  if (rawOrgId !== undefined && rawOrgId !== null && rawOrgId !== "" && !Number.isInteger(orgId)) {
    return res.status(400).json({ ok: false, error: "Invalid organizationId" });
  }

  if (!(await ensureAccessForCreate(req, res, orgId))) return;

  if (req.user.role !== "ADMIN") {
    const limitOwnerTier = orgId ? await getOrgOwnerRole(orgId) : req.user.role;
    if (limitOwnerTier === "PRO") {
      const where = orgId
        ? { organizationId: orgId, type: "PERSON", amortizacijaOnly: true }
        : { createdById: req.user.id, type: "PERSON", organizationId: null, amortizacijaOnly: true };
      const count = await Client.count({ where });
      if (count >= PRO_CLIENT_LIMIT) {
        return res.status(403).json({ ok: false, error: "PRO_LIMIT_REACHED" });
      }
    }
  }

  const { firstName } = req.body ?? {};
  const data = { firstName: firstName ? String(firstName).trim() : "", lastName: "" };
  try {
    const client = await clientRepository.createAmortizacijaClient(data, req.user.id, orgId);
    res.status(201).json({ ok: true, data: client });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function adminListAll(req, res) {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 100);

  const result = await clientRepository.getAllPersonClientsForAdmin({ search, page, limit });
  res.status(200).json({ ok: true, data: result });
}

module.exports = { list, create, update, remove, listAmortizacija, createAmortizacija, adminListAll };
