const { Op } = require("sequelize");
const { sequelize, Organization, Worker, OrganizationMember, User, Client, Form, FormVersion, FormAttachment } = require("../models/index");
const { decryptJmbg } = require("../utils/encryptJmbg");

const orgAttributes = ["id", "name", "type", "taxNumber", "activityCode", "activityName", "email", "phone", "address", "createdAt", "updatedAt"];

function toPublicOrg(org, memberRole) {
  if (!org) return null;
  const plain = org.toJSON ? org.toJSON() : org;
  const workers = plain.workers || [];
  const raw = workers.find((w) => w.role === "VLASNIK") || null;
  const owner = raw ? { ...raw, jmbg: raw.jmbg ? decryptJmbg(raw.jmbg) : null } : null;
  const { workers: _w, ...rest } = plain;
  return { ...rest, owner, memberRole: memberRole || plain.memberRole || null };
}

const orgInclude = [
  {
    model: Worker,
    as: "workers",
    where: { role: "VLASNIK" },
    required: false,
    limit: 1,
    attributes: ["id", "firstName", "lastName", "jmbg", "email", "phone", "address"],
  },
  {
    model: OrganizationMember,
    as: "members",
    attributes: ["role", "userId"],
  },
];

async function getUserOrganizations(userId) {
  const memberships = await OrganizationMember.findAll({
    where: { userId },
    include: [
      {
        model: Organization,
        as: "organization",
        where: { isClientOrg: false },
        attributes: orgAttributes,
        include: orgInclude,
      },
    ],
    order: [[{ model: Organization, as: "organization" }, "name", "ASC"]],
  });
  return memberships.map((m) => toPublicOrg(m.organization, m.role));
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
        include: orgInclude,
      },
    ],
    order: [[{ model: Organization, as: "organization" }, "name", "ASC"]],
  });
  return memberships.map((m) => toPublicOrg(m.organization, m.role));
}

async function getOrganizationForUser(id, userId) {
  const membership = await OrganizationMember.findOne({
    where: { organizationId: id, userId },
    include: [
      {
        model: Organization,
        as: "organization",
        attributes: orgAttributes,
        include: orgInclude,
      },
    ],
  });
  if (!membership) return null;
  return toPublicOrg(membership.organization, membership.role);
}

async function createOrganization(data, ownerData, userId) {
  return sequelize.transaction(async (t) => {
    const org = await Organization.create({ ...data, createdById: userId, isClientOrg: !!ownerData }, { transaction: t });

    await OrganizationMember.create({ organizationId: org.id, userId, role: "OWNER" }, { transaction: t });

    if (ownerData) {
      await Worker.create({ organizationId: org.id, role: "VLASNIK", ...ownerData }, { transaction: t });
    } else {
      const user = await User.findOne({ where: { id: userId }, attributes: ["firstName", "lastName", "jmbg", "email", "phone", "address"], transaction: t });
      await Worker.create({
        organizationId: org.id,
        role: "VLASNIK",
        firstName: user.firstName,
        lastName: user.lastName,
        jmbg: user.jmbg || null,
        email: user.email || null,
        phone: user.phone || null,
        address: user.address || null,
      }, { transaction: t });
    }

    const created = await Organization.findOne({ where: { id: org.id }, attributes: orgAttributes, include: orgInclude, transaction: t });
    return toPublicOrg(created, "OWNER");
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

    const updated = await Organization.findOne({ where: { id }, attributes: orgAttributes, include: orgInclude, transaction: t });
    return toPublicOrg(updated, membership.role);
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

module.exports = {
  getUserOrganizations,
  getClientOrganizations,
  getOrganizationForUser,
  createOrganization,
  updateOrganization,
  countOwnedOrganizations,
  deleteOrganization,
};
