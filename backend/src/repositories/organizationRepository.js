const { Op } = require("sequelize");
const { sequelize, Organization, Worker, OrganizationMember, User, Client, Form, FormVersion, FormAttachment } = require("../models/index");
const { decryptJmbg } = require("../utils/encryptJmbg");
const { officeUserIds, getEffectiveRole } = require("../services/tierService");

const orgAttributes = ["id", "name", "type", "taxNumber", "pdvNumber", "isPdvObveznik", "pdvObveznikOd", "pdvObveznikDo", "kprPazarIzKp", "jurisdiction", "taxRegime", "taxCategory", "activityCode", "activityName", "email", "phone", "address", "city", "bankAccount", "bankAccounts", "bankExportBank", "logoUrl", "memorandumUrl", "mealAllowancePerDay", "kalkulacijePotpisnik", "ownerType", "ownerIsDirector", "directorEngagement", "directorWorkerId", "ownerInfo", "createdAt", "updatedAt"];

// MariaDB vraća JSON kolone kao string (Sequelize ih ne parsira).
function parseJsonArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  }
  return null;
}

// Marketing forma šalje samo bankAccount (glavni): sinhronizuj prvi element
// bankAccounts liste da se glavni račun i lista ne raziđu. PK Office šalje
// cijelu listu (bankAccounts) pa se ovdje ništa ne radi.
function syncMainAccountIntoList(orgUpdate, existingOrg) {
  if (
    orgUpdate.bankAccount === undefined ||
    orgUpdate.bankAccounts !== undefined
  ) {
    return;
  }
  const digits = String(orgUpdate.bankAccount || "").replace(/\D+/g, "");
  const list = (parseJsonArray(existingOrg?.bankAccounts) || [])
    .map((a) => String(a || "").replace(/\D+/g, ""))
    .filter(Boolean);
  if (digits) {
    // novi glavni na prvo mjesto, SVI ostali (ne samo rep) sačuvani bez
    // duplikata; tako se stari glavni ne gubi kad novi već postoji u listi
    const rest = list.filter((a) => a !== digits);
    orgUpdate.bankAccounts = [digits, ...rest];
  } else if (list.length > 0) {
    // glavni obrisan: sljedeći sa liste postaje glavni
    const rest = list.slice(1);
    orgUpdate.bankAccounts = rest.length ? rest : null;
    orgUpdate.bankAccount = rest[0] ?? null;
  }
}

// Vlasnik je Worker VLASNIK (i ima payroll) samo u "opciji 1" ili kod obrta.
// Za d.o.o. opcije 2/3/4 vlasnik je evidencija (org.ownerInfo), nije radnik.
function ownerIsWorker(type, ownerIsDirector, directorEngagement) {
  if (type === "BUSINESS") return true; // obrt: vlasnik = obrtnik (Worker VLASNIK)
  return Boolean(ownerIsDirector) && directorEngagement === "ugovor_o_radu";
}

// Gradi org.ownerInfo (evidencija vlasnika) iz validiranog ownerData.
// JMBG je već kriptiran u kontroleru.
function buildOwnerInfo(o, ownerType) {
  return {
    type: ownerType || "fizicko_domace",
    firstName: o.firstName ?? null,
    lastName: o.lastName ?? null,
    name: o.name ?? null,
    jmbg: o.jmbg ?? null,
    idDoc: o.idDoc ?? null,
    jib: o.jib ?? null,
    email: o.email ?? null,
    phone: o.phone ?? null,
    address: o.address ?? null,
    city: o.city ?? null,
    persons: Array.isArray(o.persons) ? o.persons : null,
  };
}

// Owner objekat za frontend iz org.ownerInfo (kad vlasnik nije radnik).
// MariaDB vraća JSON kolonu kao string (Sequelize je ne parsira), pa parsiramo.
function ownerFromInfo(rawInfo) {
  if (!rawInfo) return null;
  let info = rawInfo;
  if (typeof info === "string") {
    try {
      info = JSON.parse(info);
    } catch {
      return null;
    }
  }
  if (!info || typeof info !== "object") return null;
  return {
    type: info.type ?? "fizicko_domace",
    firstName: info.firstName ?? null,
    lastName: info.lastName ?? null,
    name: info.name ?? null,
    jmbg: info.jmbg ? decryptJmbg(info.jmbg) : null,
    idDoc: info.idDoc ?? null,
    jib: info.jib ?? null,
    email: info.email ?? null,
    phone: info.phone ?? null,
    address: info.address ?? null,
    city: info.city ?? null,
    persons: Array.isArray(info.persons)
      ? info.persons.map((p) => ({
          ...p,
          jmbg: p.jmbg ? decryptJmbg(p.jmbg) : null,
        }))
      : null,
    // Nije radnik → nema payroll polja.
    employmentStatus: null,
    prijavaDate: null,
    salaryBruto: null,
    salaryNeto: null,
    idCardNumber: info.idDoc ?? null,
  };
}

// Razrješava potpisnika poslodavca za dokumente (ugovor o radu/djelu, payslip,
// predračun, faktura). ownerIsDirector (opcije 1/3) → potpisnik = vlasnik;
// inače (opcije 2/4) → potpisnik = radnik označen kao direktor.
function resolveSigner(owner, directorWorker, ownerIsDirector) {
  if (ownerIsDirector) {
    if (!owner) return null;
    const personName = `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim();
    return {
      firstName: owner.firstName ?? null,
      lastName: owner.lastName ?? null,
      name: personName || owner.name || "",
      jmbg: owner.jmbg ?? null,
      idCardNumber: owner.idCardNumber ?? null,
      address: owner.address ?? null,
      city: owner.city ?? null,
    };
  }
  if (!directorWorker) return null;
  const dw = directorWorker.toJSON ? directorWorker.toJSON() : directorWorker;
  return {
    firstName: dw.firstName ?? null,
    lastName: dw.lastName ?? null,
    name: `${dw.firstName ?? ""} ${dw.lastName ?? ""}`.trim(),
    jmbg: dw.jmbg ? decryptJmbg(dw.jmbg) : null,
    idCardNumber: dw.idCardNumber ?? null,
    address: dw.address ?? null,
    city: dw.city ?? null,
  };
}

async function fetchWorkersByIds(ids) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return new Map();
  const workers = await Worker.findAll({
    where: { id: { [Op.in]: uniq } },
    attributes: [
      "id",
      "organizationId",
      "firstName",
      "lastName",
      "jmbg",
      "idCardNumber",
      "address",
      "city",
    ],
  });
  const byId = new Map();
  for (const w of workers) byId.set(w.id, w);
  return byId;
}

// Owner objekat za frontend iz Worker VLASNIK reda (opcija 1 ili obrt).
function ownerFromWorker(ownerPlain) {
  const prijavaDate = ownerPlain.prijavaDate
    ? String(ownerPlain.prijavaDate).slice(0, 10)
    : null;
  // Status se derivira iz datuma (isto kao u toPublicWorker).
  const derivedStatus = prijavaDate ? "PRIJAVLJEN" : "DRAFT";
  return {
    type: "fizicko_domace",
    name: null,
    idDoc: null,
    jib: null,
    persons: null,
    ...ownerPlain,
    employmentStatus: derivedStatus,
    jmbg: ownerPlain.jmbg ? decryptJmbg(ownerPlain.jmbg) : null,
    prijavaDate,
    salaryBruto:
      ownerPlain.salaryBruto != null ? Number(ownerPlain.salaryBruto) : null,
    salaryNeto:
      ownerPlain.salaryNeto != null ? Number(ownerPlain.salaryNeto) : null,
    salaryType: ownerPlain.salaryType ?? "NETO_ISPLATA",
    taxCoefficient:
      ownerPlain.taxCoefficient != null
        ? Number(ownerPlain.taxCoefficient)
        : 1.0,
  };
}

function toPublicOrg(org, memberRole, ownerWorker, effectiveTier, directorWorker) {
  if (!org) return null;
  const plain = org.toJSON ? org.toJSON() : org;
  const ownerPlain = ownerWorker
    ? ownerWorker.toJSON
      ? ownerWorker.toJSON()
      : ownerWorker
    : null;

  // Izvor vlasnika ovisi o opciji: opcija 1 / obrt → Worker VLASNIK;
  // opcije 2/3/4 → org.ownerInfo (čak i ako je stari Worker VLASNIK ostao).
  const asWorker = ownerIsWorker(
    plain.type,
    plain.ownerIsDirector,
    plain.directorEngagement,
  );
  let owner = null;
  if (asWorker && ownerPlain) {
    owner = ownerFromWorker(ownerPlain);
  } else if (plain.ownerInfo) {
    owner = ownerFromInfo(plain.ownerInfo);
  } else if (ownerPlain) {
    owner = ownerFromWorker(ownerPlain); // fallback (legacy bez ownerInfo)
  }

  const ownerIsDirector =
    plain.ownerIsDirector != null ? Boolean(plain.ownerIsDirector) : true;
  const signer = resolveSigner(owner, directorWorker, ownerIsDirector);

  // ownerInfo je interni (kriptiran JMBG) — ne curi u API odgovor.
  const { workers: _w, ownerInfo: _oi, ...rest } = plain;
  return {
    ...rest,
    bankAccounts: parseJsonArray(plain.bankAccounts),
    ownerIsDirector,
    owner,
    signer,
    memberRole: memberRole || plain.memberRole || null,
    effectiveTier: effectiveTier ?? null,
  };
}

const ownerWorkerAttributes = [
  "id",
  "organizationId",
  "firstName",
  "lastName",
  "jmbg",
  "email",
  "phone",
  "address",
  "city",
  "idCardNumber",
  "prijavaDate",
  "salaryBruto",
  "salaryNeto",
  "salaryType",
  "employmentStatus",
  "taxCoefficient",
  "mealAllowancePerDay",
];

async function fetchOwnerWorkers(orgIds) {
  if (orgIds.length === 0) return new Map();
  const workers = await Worker.findAll({
    where: { organizationId: { [Op.in]: orgIds }, role: "VLASNIK" },
    attributes: ownerWorkerAttributes,
  });
  const byOrgId = new Map();
  for (const w of workers) {
    if (!byOrgId.has(w.organizationId)) byOrgId.set(w.organizationId, w);
  }
  return byOrgId;
}

// Returns Map<organizationId, ownerUserRole> — the User.role of the OWNER
// of each organization. This is the "effective tier" used for in-org gating.
async function fetchOwnerTiers(orgIds) {
  if (orgIds.length === 0) return new Map();
  const ownerMemberships = await OrganizationMember.findAll({
    where: { organizationId: { [Op.in]: orgIds }, role: "OWNER" },
    include: [{ model: User, as: "user", attributes: ["id", "role"] }],
  });
  // Efektivni tier: vlasnikov PK Office paket/trial diže USER/PRO na
  // BUSINESS (batch provjera, jedan upit za sve vlasnike).
  const kandidati = ownerMemberships
    .filter((m) => m.user && m.user.role !== "ADMIN" && m.user.role !== "BUSINESS")
    .map((m) => m.user.id);
  const office = await officeUserIds(kandidati);
  const byOrgId = new Map();
  for (const m of ownerMemberships) {
    const role = m.user?.role ?? null;
    byOrgId.set(
      m.organizationId,
      role && office.has(m.user.id) ? "BUSINESS" : role,
    );
  }
  return byOrgId;
}

async function getUserOrganizations(userId) {
  const memberships = await OrganizationMember.findAll({
    where: { userId },
    include: [
      {
        model: Organization,
        as: "organization",
        where: { isClientOrg: false },
        attributes: orgAttributes,
      },
    ],
    order: [[{ model: Organization, as: "organization" }, "name", "ASC"]],
  });
  const orgIds = memberships.map((m) => m.organization?.id).filter(Boolean);
  const directorIds = memberships.map((m) => m.organization?.directorWorkerId);
  const [ownerByOrgId, tierByOrgId, directorById] = await Promise.all([
    fetchOwnerWorkers(orgIds),
    fetchOwnerTiers(orgIds),
    fetchWorkersByIds(directorIds),
  ]);
  return memberships.map((m) =>
    toPublicOrg(
      m.organization,
      m.role,
      ownerByOrgId.get(m.organization?.id) ?? null,
      tierByOrgId.get(m.organization?.id) ?? null,
      directorById.get(m.organization?.directorWorkerId) ?? null,
    ),
  );
}

async function getClientOrganizations(userId) {
  const memberships = await OrganizationMember.findAll({
    where: { userId },
    include: [
      {
        model: Organization,
        as: "organization",
        where: { isClientOrg: true },
        attributes: orgAttributes,
      },
    ],
    order: [[{ model: Organization, as: "organization" }, "name", "ASC"]],
  });
  const orgIds = memberships.map((m) => m.organization?.id).filter(Boolean);
  const directorIds = memberships.map((m) => m.organization?.directorWorkerId);
  const [ownerByOrgId, tierByOrgId, directorById] = await Promise.all([
    fetchOwnerWorkers(orgIds),
    fetchOwnerTiers(orgIds),
    fetchWorkersByIds(directorIds),
  ]);
  return memberships.map((m) =>
    toPublicOrg(
      m.organization,
      m.role,
      ownerByOrgId.get(m.organization?.id) ?? null,
      tierByOrgId.get(m.organization?.id) ?? null,
      directorById.get(m.organization?.directorWorkerId) ?? null,
    ),
  );
}

async function getOrganizationForUser(id, userId) {
  const membership = await OrganizationMember.findOne({
    where: { organizationId: id, userId },
    include: [
      {
        model: Organization,
        as: "organization",
        attributes: orgAttributes,
      },
    ],
  });
  if (!membership) return null;
  const directorWorkerId = membership.organization?.directorWorkerId;
  const [ownerByOrgId, tierByOrgId, directorById] = await Promise.all([
    fetchOwnerWorkers([id]),
    fetchOwnerTiers([id]),
    fetchWorkersByIds([directorWorkerId]),
  ]);
  return toPublicOrg(
    membership.organization,
    membership.role,
    ownerByOrgId.get(id) ?? null,
    tierByOrgId.get(id) ?? null,
    directorById.get(directorWorkerId) ?? null,
  );
}

async function createOrganization(data, ownerData, userId) {
  // glavni račun sa forme kreće listu svih računa
  if (data.bankAccount && data.bankAccounts === undefined) {
    const digits = String(data.bankAccount).replace(/\D+/g, "");
    if (digits) data.bankAccounts = [digits];
  }
  return sequelize.transaction(async (t) => {
    const asWorker = ownerIsWorker(
      data.type,
      data.ownerIsDirector,
      data.directorEngagement,
    );
    // Za opcije 2/3/4 vlasnik se NE pravi kao Worker — ide u org.ownerInfo.
    const ownerInfo =
      ownerData && !asWorker ? buildOwnerInfo(ownerData, data.ownerType) : null;

    const org = await Organization.create(
      { ...data, ownerInfo, createdById: userId, isClientOrg: !!ownerData },
      { transaction: t },
    );

    await OrganizationMember.create({ organizationId: org.id, userId, role: "OWNER" }, { transaction: t });

    if (ownerData && asWorker) {
      // d.o.o./d.d. (ne-obrt): vlasnik je prijavljen direktor (ugovor o radu),
      // pa mu je radno mjesto "Direktor" po defaultu (osim ako je već uneseno).
      // Obrt (BUSINESS): vlasnik je obrtnik, poziciju ne diramo.
      const ownerWithPosition =
        data.type !== "BUSINESS" && !ownerData.position
          ? { ...ownerData, position: "Direktor" }
          : ownerData;
      await Worker.create({ organizationId: org.id, role: "VLASNIK", ...ownerWithPosition }, { transaction: t });
    } else if (!ownerData) {
      const user = await User.findOne({ where: { id: userId }, attributes: ["firstName", "lastName", "jmbg", "email", "phone", "address", "city"], transaction: t });
      // Spol vlasnika obrta iz njegovog JMBG-a, da ga payroll prepozna (kao radnika).
      let spol = null;
      if (user.jmbg) {
        try {
          const j = String(decryptJmbg(user.jmbg) || "").replace(/\D/g, "");
          if (j.length >= 12) {
            const nnn = parseInt(j.slice(9, 12), 10);
            if (Number.isFinite(nnn)) spol = nnn >= 500 ? "Z" : "M";
          }
        } catch {
          spol = null;
        }
      }
      await Worker.create({
        organizationId: org.id,
        role: "VLASNIK",
        firstName: user.firstName,
        lastName: user.lastName,
        jmbg: user.jmbg || null,
        spol,
        email: user.email || null,
        phone: user.phone || null,
        address: user.address || null,
        city: user.city || null,
      }, { transaction: t });
    }

    const created = await Organization.findOne({ where: { id: org.id }, attributes: orgAttributes, transaction: t });
    const ownerWorker = await Worker.findOne({
      where: { organizationId: org.id, role: "VLASNIK" },
      attributes: ownerWorkerAttributes,
      transaction: t,
    });
    const ownerUser = await User.findOne({ where: { id: userId }, attributes: ["id", "role"], transaction: t });
    return toPublicOrg(
      created,
      "OWNER",
      ownerWorker,
      ownerUser ? await getEffectiveRole(ownerUser) : null,
    );
  });
}

async function updateOrganization(id, orgData, ownerData, userId) {
  const membership = await OrganizationMember.findOne({
    where: { organizationId: id, userId, role: { [Op.in]: ["OWNER", "ADMIN"] } },
  });
  if (!membership) return null;

  return sequelize.transaction(async (t) => {
    const existingOrg = await Organization.findByPk(id, { transaction: t });
    if (!existingOrg) return null;

    // Efektivna opcija = dolazne vrijednosti ILI postojeće (parcijalni update).
    const effType = orgData.type ?? existingOrg.type;
    const effIsDir =
      orgData.ownerIsDirector ?? existingOrg.ownerIsDirector;
    const effEng =
      orgData.directorEngagement ?? existingOrg.directorEngagement;
    const effOwnerType =
      orgData.ownerType ?? existingOrg.ownerType ?? "fizicko_domace";
    const asWorker = ownerIsWorker(effType, effIsDir, effEng);

    const orgUpdate = { ...orgData };
    syncMainAccountIntoList(orgUpdate, existingOrg);

    if (ownerData) {
      if (asWorker) {
        // Opcija 1 / obrt: vlasnik je Worker VLASNIK (kao i do sada).
        // d.o.o./d.d. (ne-obrt) direktor: radno mjesto "Direktor" po defaultu.
        const isDoo = effType !== "BUSINESS";
        const existing = await Worker.findOne({ where: { organizationId: id, role: "VLASNIK" }, transaction: t });
        if (existing) {
          // Postojeći: popuni poziciju samo ako je prazna (ne gazi ručni unos).
          const upd =
            isDoo && !ownerData.position && !existing.position
              ? { ...ownerData, position: "Direktor" }
              : ownerData;
          await Worker.update(upd, { where: { id: existing.id }, transaction: t });
        } else {
          const newOwner =
            isDoo && !ownerData.position
              ? { ...ownerData, position: "Direktor" }
              : ownerData;
          await Worker.create({ organizationId: id, role: "VLASNIK", ...newOwner }, { transaction: t });
        }
        orgUpdate.ownerInfo = null; // vlasnik je radnik → evidencija se gasi
      } else {
        // Opcije 2/3/4: vlasnik je evidencija na Organizaciji (org.ownerInfo).
        orgUpdate.ownerInfo = buildOwnerInfo(ownerData, effOwnerType);
      }
    }

    // Kad d.o.o. vlasnik nije zaposlen (opcije 2/3/4), zaostali VLASNIK Worker
    // sa platom bi i dalje ulazio u obračun: payroll ne filtrira COMPANY
    // VLASNIka po ownerType, tretira ga kao običnog radnika. Forward-only:
    // ugasimo ga (ODJAVLJEN) i očistimo platu/prijavu. Postojeći sačuvani
    // Payroll obračuni se NE diraju (data safety). Pokriva i prebacivanje bez
    // ownerData (npr. samo ownerIsDirector=false).
    if (effType === "COMPANY" && !asWorker) {
      const stale = await Worker.findOne({
        where: { organizationId: id, role: "VLASNIK" },
        transaction: t,
      });
      if (
        stale &&
        (stale.salaryBruto != null ||
          stale.salaryNeto != null ||
          stale.prijavaDate != null ||
          stale.employmentStatus !== "ODJAVLJEN")
      ) {
        await Worker.update(
          {
            salaryBruto: null,
            salaryNeto: null,
            prijavaDate: null,
            employmentStatus: "ODJAVLJEN",
          },
          { where: { id: stale.id }, transaction: t },
        );
      }
    }

    // directorWorkerId mora pripadati OVOJ organizaciji (spriječi cross-tenant
    // referencu koja bi kao potpisnika izvukla radnika druge firme). Ako ne
    // pripada, ignoriši ga (postavi null).
    if (orgUpdate.directorWorkerId != null) {
      const dw = await Worker.findOne({
        where: { id: orgUpdate.directorWorkerId, organizationId: id },
        attributes: ["id"],
        transaction: t,
      });
      if (!dw) orgUpdate.directorWorkerId = null;
    }

    if (Object.keys(orgUpdate).length > 0) {
      await Organization.update(orgUpdate, { where: { id }, transaction: t });
    }

    const updated = await Organization.findOne({ where: { id }, attributes: orgAttributes, transaction: t });
    const ownerWorker = await Worker.findOne({
      where: { organizationId: id, role: "VLASNIK" },
      attributes: ownerWorkerAttributes,
      transaction: t,
    });
    // Org-scoped fetch (defense-in-depth) — potpisnik mora biti iz ove org.
    const directorWorker = updated?.directorWorkerId
      ? await Worker.findOne({
          where: { id: updated.directorWorkerId, organizationId: id },
          transaction: t,
        })
      : null;
    const ownerMembership = await OrganizationMember.findOne({
      where: { organizationId: id, role: "OWNER" },
      include: [{ model: User, as: "user", attributes: ["id", "role"] }],
      transaction: t,
    });
    return toPublicOrg(
      updated,
      membership.role,
      ownerWorker,
      ownerMembership?.user
        ? await getEffectiveRole(ownerMembership.user)
        : null,
      directorWorker,
    );
  });
}

async function countOwnedOrganizations(userId) {
  const memberships = await OrganizationMember.findAll({
    where: { userId, role: "OWNER" },
    include: [{ model: Organization, as: "organization", where: { isClientOrg: false }, attributes: ["id"] }],
  });
  return memberships.length;
}

async function countClientOrganizations(userId) {
  const memberships = await OrganizationMember.findAll({
    where: { userId, role: "OWNER" },
    include: [{ model: Organization, as: "organization", where: { isClientOrg: true }, attributes: ["id"] }],
  });
  return memberships.length;
}

async function deleteOrganization(id, userId) {
  const membership = await OrganizationMember.findOne({
    where: { organizationId: id, userId, role: "OWNER" },
  });
  if (!membership) return false;

  await sequelize.transaction(async (t) => {
    const formIds = (await Form.findAll({ where: { organizationId: id }, attributes: ["id"], transaction: t })).map((f) => f.id);
    if (formIds.length > 0) {
      await FormAttachment.destroy({ where: { formId: { [Op.in]: formIds } }, transaction: t });
      await FormVersion.destroy({ where: { formId: { [Op.in]: formIds } }, transaction: t });
      await Form.destroy({ where: { id: { [Op.in]: formIds } }, transaction: t });
    }
    await Worker.destroy({ where: { organizationId: id }, transaction: t });
    await OrganizationMember.destroy({ where: { organizationId: id }, transaction: t });
    await Organization.destroy({ where: { id }, transaction: t });
  });

  return true;
}

async function getAllOrganizationsForAdmin({ search, page = 1, limit = 20 } = {}) {
  const where = {};
  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  const offset = (page - 1) * limit;

  const [orgs, total] = await Promise.all([
    Organization.findAll({
      where,
      attributes: [...orgAttributes, "createdById", "isClientOrg"],
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Worker,
          as: "workers",
          attributes: ["id", "role", "prijavaDate", "odjavaDate"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    }),
    Organization.count({ where }),
  ]);

  const orgIds = orgs.map((o) => o.id);
  const ownerByOrgId = await fetchOwnerWorkers(orgIds);

  const items = orgs.map((org) => {
    const plain = org.toJSON();
    // RADNIK uvijek; d.o.o. (COMPANY) k tome i prijavljeni vlasnik-direktor
    // (zaposlenik). Obrt (BUSINESS) vlasnik nije radnik pa se ne broji.
    // "Prijavljen" se derivira iz datuma (prijavaDate postavljen, nije odjavljen)
    // jer su datumi master, NE stored employmentStatus (vidi ownerFromWorker).
    const isCompany = plain.type === "COMPANY";
    const workerCount = (plain.workers || []).filter(
      (w) =>
        w.role === "RADNIK" ||
        (isCompany &&
          w.role === "VLASNIK" &&
          w.prijavaDate != null &&
          w.odjavaDate == null),
    ).length;
    const owner = ownerByOrgId.get(org.id) || null;
    const { workers: _w, ...rest } = plain;
    return {
      ...rest,
      owner: owner
        ? { ...(owner.toJSON ? owner.toJSON() : owner), jmbg: owner.jmbg ? decryptJmbg(owner.jmbg) : null }
        : null,
      workerCount,
    };
  });

  return { items, total, page, limit };
}

module.exports = {
  getUserOrganizations,
  getClientOrganizations,
  getOrganizationForUser,
  createOrganization,
  updateOrganization,
  countOwnedOrganizations,
  countClientOrganizations,
  deleteOrganization,
  getAllOrganizationsForAdmin,
};
