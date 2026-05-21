const { Op } = require("sequelize");
const { sequelize, Client, User, OrganizationMember, Form, FormVersion, FormAttachment } = require("../models/index");
const { decryptJmbg } = require("../utils/encryptJmbg");

const clientAttributes = [
  "id", "type", "firstName", "lastName", "email", "phone",
  "address", "city", "jmbg", "taxNumber", "createdById", "organizationId", "createdAt", "updatedAt",
];

function toPublicClient(c) {
  if (!c) return null;
  const plain = c.toJSON ? c.toJSON() : c;
  const { jmbg, ...rest } = plain;
  return { ...rest, jmbg: jmbg ? decryptJmbg(jmbg) : null };
}

// Faza 3: klijenti su per-organization. Listing vraća:
//   (a) team klijenti svih org-a u kojima je user član (organizationId IN [...])
//   (b) plus legacy lični klijenti tog usera (organizationId IS NULL i createdById === me)
async function getMemberOrgIds(userId) {
  const memberships = await OrganizationMember.findAll({
    where: { userId },
    attributes: ["organizationId"],
  });
  return memberships.map((m) => m.organizationId);
}

function buildAccessClause(userId, memberOrgIds) {
  const or = [{ organizationId: null, createdById: userId }];
  if (memberOrgIds.length > 0) {
    or.push({ organizationId: { [Op.in]: memberOrgIds } });
  }
  return { [Op.or]: or };
}

async function getPersonClients(userId) {
  const memberOrgIds = await getMemberOrgIds(userId);
  const access = buildAccessClause(userId, memberOrgIds);
  const clients = await Client.findAll({
    where: { ...access, type: "PERSON", amortizacijaOnly: false },
    attributes: clientAttributes,
    order: [["createdAt", "DESC"]],
  });
  return clients.map(toPublicClient);
}

async function getAmortizacijaClients(userId) {
  const memberOrgIds = await getMemberOrgIds(userId);
  const access = buildAccessClause(userId, memberOrgIds);
  const clients = await Client.findAll({
    where: { ...access, type: "PERSON", amortizacijaOnly: true },
    attributes: clientAttributes,
    order: [["createdAt", "DESC"]],
  });
  return clients.map(toPublicClient);
}

async function createPersonClient(data, userId, organizationId = null) {
  const client = await Client.create({
    ...data,
    type: "PERSON",
    createdById: userId,
    organizationId,
    amortizacijaOnly: false,
  });
  const fresh = await Client.findOne({ where: { id: client.id }, attributes: clientAttributes });
  return toPublicClient(fresh);
}

async function createAmortizacijaClient(data, userId, organizationId = null) {
  const client = await Client.create({
    ...data,
    type: "PERSON",
    createdById: userId,
    organizationId,
    amortizacijaOnly: true,
  });
  const fresh = await Client.findOne({ where: { id: client.id }, attributes: clientAttributes });
  return toPublicClient(fresh);
}

// Provjeri da user smije pristupiti klijentu:
//   - ako klijent ima organizationId → mora biti član te org-e
//   - inače → mora biti createdById
async function canUserAccessClient(clientRow, userId) {
  if (!clientRow) return false;
  if (clientRow.organizationId) {
    const member = await OrganizationMember.findOne({
      where: { organizationId: clientRow.organizationId, userId },
    });
    return !!member;
  }
  return clientRow.createdById === userId;
}

async function updatePersonClient(id, data, userId) {
  const existing = await Client.findOne({ where: { id }, attributes: ["id", "createdById", "organizationId"] });
  if (!existing) return null;
  if (!(await canUserAccessClient(existing, userId))) return null;

  await Client.update(data, { where: { id } });
  const fresh = await Client.findOne({ where: { id }, attributes: clientAttributes });
  return toPublicClient(fresh);
}

async function deletePersonClient(id, userId) {
  const existing = await Client.findOne({ where: { id }, attributes: ["id", "createdById", "organizationId"] });
  if (!existing) return null;
  if (!(await canUserAccessClient(existing, userId))) return null;

  await sequelize.transaction(async (t) => {
    const formIds = (await Form.findAll({ where: { clientId: id }, attributes: ["id"], transaction: t })).map((f) => f.id);
    if (formIds.length > 0) {
      await FormAttachment.destroy({ where: { formId: { [Op.in]: formIds } }, transaction: t });
      await FormVersion.destroy({ where: { formId: { [Op.in]: formIds } }, transaction: t });
      await Form.destroy({ where: { id: { [Op.in]: formIds } }, transaction: t });
    }
    await Client.destroy({ where: { id }, transaction: t });
  });

  return true;
}

async function getAllPersonClientsForAdmin({ search, page = 1, limit = 20 } = {}) {
  const where = { type: "PERSON", organizationId: null, amortizacijaOnly: false };
  if (search) {
    where[Op.or] = [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName: { [Op.like]: `%${search}%` } },
    ];
  }

  const offset = (page - 1) * limit;

  const [clients, total] = await Promise.all([
    Client.findAll({
      where,
      attributes: [...clientAttributes, "idCardNumber"],
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    }),
    Client.count({ where }),
  ]);

  return {
    items: clients.map((c) => {
      const plain = c.toJSON();
      return { ...plain, jmbg: plain.jmbg ? decryptJmbg(plain.jmbg) : null };
    }),
    total,
    page,
    limit,
  };
}

module.exports = {
  getPersonClients,
  getAmortizacijaClients,
  createPersonClient,
  createAmortizacijaClient,
  updatePersonClient,
  deletePersonClient,
  canUserAccessClient,
  getAllPersonClientsForAdmin,
};
