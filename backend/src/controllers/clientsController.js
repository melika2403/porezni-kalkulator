const clientRepository = require("../repositories/clientRepository");
const { encryptJmbg } = require("../utils/encryptJmbg");

const ALLOWED_ROLES = ["PRO", "BUSINESS", "ADMIN"];
const AMORTIZACIJA_ROLES = ["PRO", "BUSINESS", "ADMIN"];

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function checkRole(req, res) {
  if (!ALLOWED_ROLES.includes(req.user?.role)) {
    res.status(403).json({ ok: false, error: "FORBIDDEN" });
    return false;
  }
  return true;
}

function validateClientPayload(body, requireName = true) {
  const { firstName, lastName, jmbg, taxNumber, email, phone, address, idCardNumber } =
    body ?? {};
  const data = {};

  if (requireName || firstName != null) {
    if (!isNonEmptyString(firstName))
      return { ok: false, message: "Ime je obavezno" };
    data.firstName = firstName.trim();
  }
  if (requireName || lastName != null) {
    if (!isNonEmptyString(lastName))
      return { ok: false, message: "Prezime je obavezno" };
    data.lastName = lastName.trim();
  }

  if (jmbg && String(jmbg).trim()) {
    if (!/^\d{13}$/.test(String(jmbg).trim()))
      return { ok: false, message: "JMBG mora imati tačno 13 cifara" };
    data.jmbg = encryptJmbg(String(jmbg).trim());
  }

  if (taxNumber !== undefined)
    data.taxNumber = taxNumber ? String(taxNumber).trim() : null;
  if (email !== undefined) data.email = email ? String(email).trim() : null;
  if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
  if (address !== undefined)
    data.address = address ? String(address).trim() : null;
  if (idCardNumber !== undefined)
    data.idCardNumber = idCardNumber ? String(idCardNumber).trim().slice(0, 9) : null;

  if (Object.keys(data).length === 0)
    return { ok: false, message: "Nema polja za ažuriranje" };

  return { ok: true, value: data };
}

async function list(req, res) {
  if (!checkRole(req, res)) return;
  const clients = await clientRepository.getPersonClients(req.user.id);
  res.status(200).json({ ok: true, data: clients });
}

async function create(req, res) {
  if (!checkRole(req, res)) return;

  const { firstName, lastName, jmbg, taxNumber, email, phone, address, idCardNumber } = req.body ?? {};
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
  if (idCardNumber !== undefined) data.idCardNumber = idCardNumber ? String(idCardNumber).trim().slice(0, 9) : null;

  try {
    const client = await clientRepository.createPersonClient(data, req.user.id);
    res.status(201).json({ ok: true, data: client });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function update(req, res) {
  if (!checkRole(req, res)) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  const validation = validateClientPayload(req.body, false);
  if (!validation.ok)
    return res.status(400).json({ ok: false, error: validation.message });

  try {
    const client = await clientRepository.updatePersonClient(
      id,
      validation.value,
      req.user.id,
    );
    if (!client)
      return res
        .status(404)
        .json({ ok: false, error: "Klijent nije pronađen" });
    res.status(200).json({ ok: true, data: client });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function remove(req, res) {
  if (!checkRole(req, res)) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  try {
    const deleted = await clientRepository.deletePersonClient(id, req.user.id);
    if (!deleted)
      return res.status(404).json({ ok: false, error: "Klijent nije pronađen" });
    res.status(200).json({ ok: true, data: null });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function listAmortizacija(req, res) {
  if (!AMORTIZACIJA_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }
  const clients = await clientRepository.getAmortizacijaClients(req.user.id);
  res.status(200).json({ ok: true, data: clients });
}

async function createAmortizacija(req, res) {
  if (!AMORTIZACIJA_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }
  const { firstName } = req.body ?? {};
  const data = { firstName: firstName ? String(firstName).trim() : "", lastName: "" };
  try {
    const client = await clientRepository.createAmortizacijaClient(data, req.user.id);
    res.status(201).json({ ok: true, data: client });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

module.exports = { list, create, update, remove, listAmortizacija, createAmortizacija };
