const organizationRepository = require("../repositories/organizationRepository");
const { encryptJmbg } = require("../utils/encryptJmbg");
const {
  Organization,
  OrganizationMember,
  UserPreference,
  Worker,
  Payroll,
} = require("../models/index");
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

  // Režim oporezivanja vlasnika obrta (čl. 19 / 31 / 6 t.10)
  if (body.taxRegime !== undefined) {
    if (body.taxRegime === null || body.taxRegime === "") {
      data.taxRegime = null;
    } else if (
      !["STVARNI_DOHODAK", "PAUSALNI", "OSTALI"].includes(body.taxRegime)
    ) {
      return { ok: false, message: "Nepoznat režim oporezivanja" };
    } else {
      data.taxRegime = body.taxRegime;
    }
  }
  if (body.taxCategory !== undefined) {
    if (body.taxCategory === null || body.taxCategory === "") {
      data.taxCategory = null;
    } else {
      const cat = String(body.taxCategory).trim().toUpperCase();
      const valid = [
        "SLOBODNA_ZANIMANJA",
        "OBRT_SRODNE",
        "POLJOPRIVREDA_SUMARSTVO",
        "TRGOVAC_POJEDINAC",
        "ESNAFSKI_ZANATI",
        "TAXI",
      ];
      if (!valid.includes(cat)) {
        return { ok: false, message: "Nepoznata kategorija djelatnosti" };
      }
      data.taxCategory = cat;
    }
  }

  // Default tip plate za nove radnike — knjigovođa može imati klijente sa
  // različitim "stilom" (npr. svi na minimalcu = NETO_ISPLATA, drugi sa
  // ugovornim bruto-platama = BRUTO).
  if (body.defaultSalaryType !== undefined) {
    if (body.defaultSalaryType === null || body.defaultSalaryType === "") {
      data.defaultSalaryType = "NETO_ISPLATA";
    } else if (
      !["BRUTO", "NETO_UGOVOR", "NETO_ISPLATA"].includes(body.defaultSalaryType)
    ) {
      return { ok: false, message: "Nepoznat tip plate" };
    } else {
      data.defaultSalaryType = body.defaultSalaryType;
    }
  }

  if (body.jurisdiction !== undefined) {
    if (body.jurisdiction === null || body.jurisdiction === "") {
      data.jurisdiction = null;
    } else if (["FBIH", "RS", "BD"].includes(body.jurisdiction)) {
      data.jurisdiction = body.jurisdiction;
    } else {
      return {
        ok: false,
        message: "jurisdiction mora biti FBIH, RS ili BD",
      };
    }
  }

  if (body.isPdvObveznik !== undefined) {
    data.isPdvObveznik = Boolean(body.isPdvObveznik);
  }

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

  // prijavaDate i salaryBruto — ako su uneseni, vlasnik se računa kao
  // prijavljen radnik. Ako prijavaDate nije unesen, ostaje DRAFT — prijavljuje
  // se kasnije preko JS3100 ili ručnim editovanjem.
  if (owner.prijavaDate !== undefined) {
    if (owner.prijavaDate === null || owner.prijavaDate === "") {
      data.prijavaDate = null;
      data.employmentStatus = "DRAFT";
    } else {
      data.prijavaDate = new Date(owner.prijavaDate);
      data.employmentStatus = "PRIJAVLJEN";
    }
  }
  if (owner.salaryBruto !== undefined) {
    data.salaryBruto =
      owner.salaryBruto === null || owner.salaryBruto === ""
        ? null
        : Number(owner.salaryBruto);
  }
  if (owner.salaryNeto !== undefined) {
    data.salaryNeto =
      owner.salaryNeto === null || owner.salaryNeto === ""
        ? null
        : Number(owner.salaryNeto);
  }
  // Tip plate određuje šta engine vuče: BRUTO → salaryBruto, NETO_* → salaryNeto.
  if (
    owner.salaryType !== undefined &&
    owner.salaryType !== null &&
    owner.salaryType !== ""
  ) {
    if (
      !["BRUTO", "NETO_UGOVOR", "NETO_ISPLATA"].includes(owner.salaryType)
    ) {
      return { ok: false, message: "Nepoznat tip plate vlasnika" };
    }
    data.salaryType = owner.salaryType;
  }
  if (owner.taxCoefficient !== undefined) {
    const c = Number(owner.taxCoefficient);
    // 0 je validna vrijednost (bez porezne kartice → bez ličnog odbitka).
    if (Number.isFinite(c) && c >= 0) data.taxCoefficient = c;
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

// Lista svih organizacija (vlastite + klijentske) sa agregatnim podacima:
//  • broj radnika (aktivni, ne odjavljeni za odabrani mjesec ako se prosljeđuje)
//  • status payroll-a za odabrani mjesec
//  • broj obračunatih (OBRACUNATO + ISPLACENO) i isplaćenih (ISPLACENO) payrolla
// Query params: ?year=2026&month=5 (default = trenutni mjesec).
async function listWithPayrollStatus(req, res) {
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || now.getMonth() + 1;
  if (year < 2000 || year > 2100 || month < 1 || month > 12) {
    return res.status(400).json({ ok: false, error: "INVALID_PERIOD" });
  }

  const userId = req.user.id;
  const own = await organizationRepository.getUserOrganizations(userId);
  // Repository već filtrira na klijentske org. po user membership-u; ako user
  // nije dodan ni u jednu klijentsku org, vraća prazno.
  const clients = await organizationRepository.getClientOrganizations(userId);

  const orgIds = [...own.map((o) => o.id), ...clients.map((o) => o.id)];
  if (orgIds.length === 0) {
    return res.json({ ok: true, data: { own: [], clients: [], year, month } });
  }

  // Agregat: broj radnika po org (svi koji nisu odjavljeni — RADNIK + VLASNIK).
  const workersByOrg = new Map();
  const workers = await Worker.findAll({
    where: { organizationId: orgIds },
    attributes: ["id", "organizationId", "employmentStatus", "role"],
  });
  for (const w of workers) {
    if (w.employmentStatus === "ODJAVLJEN") continue;
    workersByOrg.set(
      w.organizationId,
      (workersByOrg.get(w.organizationId) || 0) + 1,
    );
  }

  // Agregat: payrolli za zadati mjesec po org → broj obračunatih i isplaćenih.
  const payrollsByOrg = new Map();
  const payrolls = await Payroll.findAll({
    where: { organizationId: orgIds, year, month },
    attributes: ["organizationId", "status", "mipDownloadedAt"],
  });
  for (const p of payrolls) {
    const cur = payrollsByOrg.get(p.organizationId) || {
      total: 0,
      obracunato: 0,
      isplaceno: 0,
      mipDownloadedAt: null,
    };
    cur.total += 1;
    if (p.status === "OBRACUNATO" || p.status === "ISPLACENO") {
      cur.obracunato += 1;
    }
    if (p.status === "ISPLACENO") {
      cur.isplaceno += 1;
    }
    // Batch update drži isti timestamp na svim payrollima mjeseca; uzmi najnoviji.
    if (
      p.mipDownloadedAt &&
      (!cur.mipDownloadedAt || p.mipDownloadedAt > cur.mipDownloadedAt)
    ) {
      cur.mipDownloadedAt = p.mipDownloadedAt;
    }
    payrollsByOrg.set(p.organizationId, cur);
  }

  const enrich = (orgs) =>
    orgs.map((o) => {
      const workerCount = workersByOrg.get(o.id) || 0;
      const stats = payrollsByOrg.get(o.id) || {
        total: 0,
        obracunato: 0,
        isplaceno: 0,
        mipDownloadedAt: null,
      };
      // payrollStatus:
      //   "no_workers"   — org nema aktivnih radnika
      //   "none"         — ima radnike ali ni jedan payroll za mjesec
      //   "partial"      — neki obračunati, neki nisu
      //   "obracunato"   — svi obračunati ali nisu svi isplaćeni
      //   "isplaceno"    — svi obračunati I svi isplaćeni
      let payrollStatus;
      if (workerCount === 0) payrollStatus = "no_workers";
      else if (stats.obracunato === 0) payrollStatus = "none";
      else if (stats.isplaceno === workerCount) payrollStatus = "isplaceno";
      else if (stats.obracunato === workerCount) payrollStatus = "obracunato";
      else payrollStatus = "partial";

      return {
        ...o,
        workerCount,
        payrollObracunato: stats.obracunato,
        payrollIsplaceno: stats.isplaceno,
        payrollStatus,
        mipDownloadedAt: stats.mipDownloadedAt,
      };
    });

  return res.json({
    ok: true,
    data: {
      own: enrich(own),
      clients: enrich(clients),
      year,
      month,
    },
  });
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
  listWithPayrollStatus,
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

// Postavlja aktivnu organizaciju za PK Office (sidebar org switcher).
// Provjerava da user ima membership prije aktivacije.
async function activate(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const membership = await OrganizationMember.findOne({
    where: { userId: req.user.id, organizationId: id },
  });
  if (!membership) {
    return res
      .status(403)
      .json({ ok: false, error: "FORBIDDEN_ORGANIZATION" });
  }

  // PK Office radi samo sa obrtima — COMPANY se ne može aktivirati.
  const org = await Organization.findByPk(id, { attributes: ["id", "type"] });
  if (!org || org.type !== "BUSINESS") {
    return res
      .status(400)
      .json({ ok: false, error: "ORGANIZATION_NOT_BUSINESS" });
  }

  const [pref] = await UserPreference.findOrCreate({
    where: { userId: req.user.id },
    defaults: { userId: req.user.id, activeOrganizationId: id },
  });
  if (pref.activeOrganizationId !== id) {
    pref.activeOrganizationId = id;
    await pref.save();
  }

  res
    .status(200)
    .json({ ok: true, data: { activeOrganizationId: id } });
}

module.exports = {
  list,
  listClients,
  listWithPayrollStatus,
  create,
  update,
  remove,
  getById,
  adminListAll,
  uploadLogo,
  removeLogo,
  activate,
};
