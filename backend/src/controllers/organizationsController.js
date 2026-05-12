const organizationRepository = require("../repositories/organizationRepository");
const { encryptJmbg } = require("../utils/encryptJmbg");
const { Organization } = require("../models/index");
const { publicUrlFor, absPathFor, safeUnlink } = require("../utils/uploads");

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function validateOrgData(body, requireName = true) {
  const { name, type, taxNumber, email, phone, address, city } = body ?? {};
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

  if (taxNumber !== undefined)
    data.taxNumber = taxNumber ? String(taxNumber).trim() : null;
  if (body.pdvNumber !== undefined) {
    const pdv = body.pdvNumber ? String(body.pdvNumber).replace(/\D/g, "") : "";
    if (pdv && pdv.length !== 12) {
      return { ok: false, message: "PDV broj mora imati tačno 12 cifara" };
    }
    data.pdvNumber = pdv || null;
  }
  if (body.activityCode !== undefined)
    data.activityCode = body.activityCode
      ? String(body.activityCode).trim()
      : null;
  if (body.activityName !== undefined)
    data.activityName = body.activityName
      ? String(body.activityName).trim()
      : null;
  if (email !== undefined) data.email = email ? String(email).trim() : null;
  if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
  if (address !== undefined)
    data.address = address ? String(address).trim() : null;
  if (city !== undefined) data.city = city ? String(city).trim() : null;
  if (body.bankAccount !== undefined)
    data.bankAccount = body.bankAccount
      ? String(body.bankAccount).trim()
      : null;

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
  if (owner.city) data.city = String(owner.city).trim();
  if (owner.idCardNumber) {
    const idn = String(owner.idCardNumber).trim();
    if (idn.length > 9)
      return {
        ok: false,
        message: "Broj lične karte može imati najviše 9 znakova",
      };
    data.idCardNumber = idn;
  }

  return { ok: true, value: data };
}

async function list(req, res) {
  const orgs = await organizationRepository.getUserOrganizations(req.user.id);
  res.status(200).json({ ok: true, data: orgs });
}

async function listClients(req, res) {
  // Repository filters to orgs where this user has membership; no role gate needed.
  const orgs = await organizationRepository.getClientOrganizations(req.user.id);
  res.status(200).json({ ok: true, data: orgs });
}

async function create(req, res) {
  const { ownerData, ...orgBody } = req.body ?? {};
  const userRole = req.user.role;

  // Only elevated roles can create client orgs (with separate ownerData)
  const CLIENT_ORG_ROLES = ["PRO", "BUSINESS", "ADMIN"];
  if (ownerData && !CLIENT_ORG_ROLES.includes(userRole)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  if (!ownerData) {
    const ownedCount = await organizationRepository.countOwnedOrganizations(
      req.user.id,
    );
    if (ownedCount >= 2) {
      return res
        .status(409)
        .json({ ok: false, error: "ALREADY_HAS_OWN_ORG_LIMIT" });
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
      return res
        .status(400)
        .json({ ok: false, error: ownerValidation.message });
    }
    validatedOwner = ownerValidation.value;
  }

  try {
    const org = await organizationRepository.createOrganization(
      orgValidation.value,
      validatedOwner,
      req.user.id,
    );
    res.status(201).json({ ok: true, data: org });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        ok: false,
        error: "Porezni broj ili JMBG vlasnika već postoji",
      });
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
      return res
        .status(400)
        .json({ ok: false, error: ownerValidation.message });
    }
    validatedOwner = ownerValidation.value;
  }

  try {
    const org = await organizationRepository.updateOrganization(
      id,
      orgValidation.value,
      validatedOwner,
      req.user.id,
    );
    if (!org) {
      return res
        .status(404)
        .json({ ok: false, error: "Organizacija nije pronađena" });
    }
    res.status(200).json({ ok: true, data: org });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        ok: false,
        error: "Porezni broj ili JMBG vlasnika već postoji",
      });
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
    const deleted = await organizationRepository.deleteOrganization(
      id,
      req.user.id,
    );
    if (!deleted)
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function getById(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const org = await organizationRepository.getOrganizationForUser(
    id,
    req.user.id,
  );

  if (!org) {
    return res
      .status(404)
      .json({ ok: false, error: "Organizacija nije pronađena" });
  }

  return res.status(200).json({ ok: true, data: org });
}

async function adminListAll(req, res) {
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 100);

  const result = await organizationRepository.getAllOrganizationsForAdmin({
    search,
    page,
    limit,
  });
  res.status(200).json({ ok: true, data: result });
}

module.exports = {
  list,
  listClients,
  create,
  update,
  remove,
  getById,
  adminListAll,
};
async function uploadLogo(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });
  if (!req.file)
    return res.status(400).json({ ok: false, error: "Nedostaje fajl" });

  const org = await organizationRepository.getOrganizationForUser(
    id,
    req.user.id,
  );
  if (!org) {
    safeUnlink(req.file.path);
    return res
      .status(404)
      .json({ ok: false, error: "Organizacija nije pronađena" });
  }

  const oldRow = await Organization.findByPk(id);
  const oldUrl = oldRow?.logoUrl || null;

  const newUrl = publicUrlFor("logos", req.file.filename);
  await Organization.update({ logoUrl: newUrl }, { where: { id } });

  if (oldUrl) safeUnlink(absPathFor(oldUrl));

  res.status(200).json({ ok: true, data: { id, logoUrl: newUrl } });
}

async function removeLogo(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  const org = await organizationRepository.getOrganizationForUser(
    id,
    req.user.id,
  );
  if (!org)
    return res
      .status(404)
      .json({ ok: false, error: "Organizacija nije pronađena" });

  const row = await Organization.findByPk(id);
  if (row?.logoUrl) {
    safeUnlink(absPathFor(row.logoUrl));
    await Organization.update({ logoUrl: null }, { where: { id } });
  }

  res.status(200).json({ ok: true, data: { id, logoUrl: null } });
}

module.exports = {
  list,
  listClients,
  create,
  update,
  remove,
  getById,
  adminListAll,
  uploadLogo,
  removeLogo,
};
