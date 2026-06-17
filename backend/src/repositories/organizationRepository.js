const { Op } = require("sequelize");
const { sequelize, Organization, Worker, OrganizationMember, User, Client, Form, FormVersion, FormAttachment } = require("../models/index");
const { decryptJmbg } = require("../utils/encryptJmbg");

const orgAttributes = ["id", "name", "type", "taxNumber", "pdvNumber", "isPdvObveznik", "jurisdiction", "taxRegime", "taxCategory", "activityCode", "activityName", "email", "phone", "address", "city", "bankAccount", "logoUrl", "mealAllowancePerDay", "createdAt", "updatedAt"];

function toPublicOrg(org, memberRole, ownerWorker, effectiveTier) {
  if (!org) return null;
  const plain = org.toJSON ? org.toJSON() : org;
  const ownerPlain = ownerWorker
    ? ownerWorker.toJSON
      ? ownerWorker.toJSON()
      : ownerWorker
    : null;
  let owner = null;
  if (ownerPlain) {
    const prijavaDate = ownerPlain.prijavaDate
      ? String(ownerPlain.prijavaDate).slice(0, 10)
      : null;
    // Status se derivira iz datuma (isto kao u toPublicWorker).
    const derivedStatus = prijavaDate ? "PRIJAVLJEN" : "DRAFT";
    owner = {
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
  const { workers: _w, ...rest } = plain;
  return {
    ...rest,
    owner,
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
    include: [{ model: User, as: "user", attributes: ["role"] }],
  });
  const byOrgId = new Map();
  for (const m of ownerMemberships) {
    byOrgId.set(m.organizationId, m.user?.role ?? null);
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
  const [ownerByOrgId, tierByOrgId] = await Promise.all([
    fetchOwnerWorkers(orgIds),
    fetchOwnerTiers(orgIds),
  ]);
  return memberships.map((m) =>
    toPublicOrg(
      m.organization,
      m.role,
      ownerByOrgId.get(m.organization?.id) ?? null,
      tierByOrgId.get(m.organization?.id) ?? null,
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
  const [ownerByOrgId, tierByOrgId] = await Promise.all([
    fetchOwnerWorkers(orgIds),
    fetchOwnerTiers(orgIds),
  ]);
  return memberships.map((m) =>
    toPublicOrg(
      m.organization,
      m.role,
      ownerByOrgId.get(m.organization?.id) ?? null,
      tierByOrgId.get(m.organization?.id) ?? null,
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
  const [ownerByOrgId, tierByOrgId] = await Promise.all([
    fetchOwnerWorkers([id]),
    fetchOwnerTiers([id]),
  ]);
  return toPublicOrg(
    membership.organization,
    membership.role,
    ownerByOrgId.get(id) ?? null,
    tierByOrgId.get(id) ?? null,
  );
}

async function createOrganization(data, ownerData, userId) {
  return sequelize.transaction(async (t) => {
    const org = await Organization.create({ ...data, createdById: userId, isClientOrg: !!ownerData }, { transaction: t });

    await OrganizationMember.create({ organizationId: org.id, userId, role: "OWNER" }, { transaction: t });

    if (ownerData) {
      await Worker.create({ organizationId: org.id, role: "VLASNIK", ...ownerData }, { transaction: t });
    } else {
      const user = await User.findOne({ where: { id: userId }, attributes: ["firstName", "lastName", "jmbg", "email", "phone", "address", "city"], transaction: t });
      await Worker.create({
        organizationId: org.id,
        role: "VLASNIK",
        firstName: user.firstName,
        lastName: user.lastName,
        jmbg: user.jmbg || null,
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
    const ownerUser = await User.findOne({ where: { id: userId }, attributes: ["role"], transaction: t });
    return toPublicOrg(created, "OWNER", ownerWorker, ownerUser?.role ?? null);
  });
}

async function updateOrganization(id, orgData, ownerData, userId) {
  const membership = await OrganizationMember.findOne({
    where: { organizationId: id, userId, role: { [Op.in]: ["OWNER", "ADMIN"] } },
  });
  if (!membership) return null;

  return sequelize.transaction(async (t) => {
    if (ownerData) {
      const existing = await Worker.findOne({ where: { organizationId: id, role: "VLASNIK" }, transaction: t });
      if (existing) {
        await Worker.update(ownerData, { where: { id: existing.id }, transaction: t });
      } else {
        await Worker.create({ organizationId: id, role: "VLASNIK", ...ownerData }, { transaction: t });
      }
    }

    if (Object.keys(orgData).length > 0) {
      await Organization.update(orgData, { where: { id }, transaction: t });
    }

    const updated = await Organization.findOne({ where: { id }, attributes: orgAttributes, transaction: t });
    const ownerWorker = await Worker.findOne({
      where: { organizationId: id, role: "VLASNIK" },
      attributes: ownerWorkerAttributes,
      transaction: t,
    });
    const ownerMembership = await OrganizationMember.findOne({
      where: { organizationId: id, role: "OWNER" },
      include: [{ model: User, as: "user", attributes: ["role"] }],
      transaction: t,
    });
    return toPublicOrg(updated, membership.role, ownerWorker, ownerMembership?.user?.role ?? null);
  });
}

async function countOwnedOrganizations(userId) {
  const memberships = await OrganizationMember.findAll({
    where: { userId, role: "OWNER" },
    include: [{ model: Organization, as: "organization", where: { isClientOrg: false }, attributes: ["id"] }],
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
          attributes: ["id", "role"],
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
    const workerCount = (plain.workers || []).filter((w) => w.role === "RADNIK").length;
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
  deleteOrganization,
  getAllOrganizationsForAdmin,
};
