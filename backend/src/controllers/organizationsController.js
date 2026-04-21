const organizationRepository = require("../repositories/organizationRepository");
const { encryptJmbg } = require("../utils/encryptJmbg");

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateOrgData(body, requireName = true) {
  const { name, type, taxNumber, email, phone, address } = body ?? {};
  const data = {};

  if (requireName || name != null) {
    if (!isNonEmptyString(name)) {
      return { ok: false, message: "Naziv organizacije je obavezan" };
    }
    data.name = name.trim();
  }

  if (type != null) {
    if (!["COMPANY", "BUSINESS"].includes(type)) {
      return { ok: false, message: "Tip mora biti COMPANY ili BUSINESS" };
    }
    data.type = type;
  }

  if (taxNumber !== undefined) data.taxNumber = taxNumber ? String(taxNumber).trim() : null;
  if (body.activityCode !== undefined) data.activityCode = body.activityCode ? String(body.activityCode).trim() : null;
  if (body.activityName !== undefined) data.activityName = body.activityName ? String(body.activityName).trim() : null;
  if (email !== undefined) data.email = email ? String(email).trim() : null;
  if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
  if (address !== undefined) data.address = address ? String(address).trim() : null;

  if (Object.keys(data).length === 0) {
    return { ok: false, message: "Nema polja za ažuriranje" };
  }

  return { ok: true, value: data };
}

function validateOwnerData(owner, requireJmbg = true) {
  if (!isNonEmptyString(owner?.firstName)) {
    return { ok: false, message: "Ime vlasnika je obavezno" };
  }
  if (!isNonEmptyString(owner?.lastName)) {
    return { ok: false, message: "Prezime vlasnika je obavezno" };
  }

  const data = {
    firstName: owner.firstName.trim(),
    lastName: owner.lastName.trim(),
  };

  if (owner.jmbg && String(owner.jmbg).trim()) {
    if (!/^\d{13}$/.test(String(owner.jmbg).trim())) {
      return { ok: false, message: "JMBG vlasnika mora imati tačno 13 cifara" };
    }
    data.jmbg = encryptJmbg(String(owner.jmbg).trim());
  } else if (requireJmbg) {
    return { ok: false, message: "JMBG vlasnika je obavezan" };
  }

  if (owner.email) data.email = String(owner.email).trim();
  if (owner.phone) data.phone = String(owner.phone).trim();
  if (owner.address) data.address = String(owner.address).trim();

  return { ok: true, value: data };
}

async function list(req, res) {
  const orgs = await organizationRepository.getUserOrganizations(req.user.id);
  res.status(200).json({ ok: true, data: orgs });
}

async function create(req, res) {
  const { ownerData, ...orgBody } = req.body ?? {};
  const userRole = req.user.role;

  // Without ownerData the logged-in user becomes the owner — regular users limited to one
  if (!ownerData && userRole === "USER") {
    const ownedCount = await organizationRepository.countOwnedOrganizations(req.user.id);
    if (ownedCount >= 1) {
      return res.status(409).json({ ok: false, error: "ALREADY_HAS_OWN_ORG" });
    }
  }

  const orgValidation = validateOrgData(orgBody, true);
  if (!orgValidation.ok) {
    return res.status(400).json({ ok: false, error: orgValidation.message });
  }

  let validatedOwner = null;
  if (ownerData) {
    const ownerValidation = validateOwnerData(ownerData);
    if (!ownerValidation.ok) {
      return res.status(400).json({ ok: false, error: ownerValidation.message });
    }
    validatedOwner = ownerValidation.value;
  }

  try {
    const org = await organizationRepository.createOrganization(
      orgValidation.value,
      validatedOwner,
      req.user.id
    );
    res.status(201).json({ ok: true, data: org });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ ok: false, error: "Porezni broj ili JMBG vlasnika već postoji" });
    }
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const { ownerData, ...orgBody } = req.body ?? {};

  const orgValidation = validateOrgData(orgBody, false);
  if (!orgValidation.ok) {
    return res.status(400).json({ ok: false, error: orgValidation.message });
  }

  let validatedOwner = null;
  if (ownerData) {
    const ownerValidation = validateOwnerData(ownerData, false); // jmbg optional on update
    if (!ownerValidation.ok) {
      return res.status(400).json({ ok: false, error: ownerValidation.message });
    }
    validatedOwner = ownerValidation.value;
  }

  try {
    const org = await organizationRepository.updateOrganization(
      id,
      orgValidation.value,
      validatedOwner,
      req.user.id
    );
    if (!org) {
      return res.status(404).json({ ok: false, error: "Organizacija nije pronađena" });
    }
    res.status(200).json({ ok: true, data: org });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ ok: false, error: "Porezni broj ili JMBG vlasnika već postoji" });
    }
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  try {
    const deleted = await organizationRepository.deleteOrganization(id, req.user.id);
    if (!deleted) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

module.exports = { list, create, update, remove };
