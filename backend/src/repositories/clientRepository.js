const { sequelize, Client, Form, FormVersion, FormAttachment } = require("../models/index");
const { decryptJmbg } = require("../utils/encryptJmbg");

const clientAttributes = [
  "id", "type", "firstName", "lastName", "email", "phone",
  "address", "city", "jmbg", "taxNumber", "createdById", "createdAt", "updatedAt",
];

function toPublicClient(c) {
  if (!c) return null;
  const plain = c.toJSON ? c.toJSON() : c;
  const { jmbg, ...rest } = plain;
  return { ...rest, jmbg: jmbg ? decryptJmbg(jmbg) : null };
}

async function getPersonClients(userId) {
  const clients = await Client.findAll({
    where: { createdById: userId, type: "PERSON", organizationId: null, amortizacijaOnly: false },
    attributes: clientAttributes,
    order: [["createdAt", "DESC"]],
  });
  return clients.map(toPublicClient);
}

async function getAmortizacijaClients(userId) {
  const clients = await Client.findAll({
    where: { createdById: userId, type: "PERSON", organizationId: null, amortizacijaOnly: true },
    attributes: clientAttributes,
    order: [["createdAt", "DESC"]],
  });
  return clients.map(toPublicClient);
}

async function createPersonClient(data, userId) {
  const client = await Client.create({ ...data, type: "PERSON", createdById: userId, amortizacijaOnly: false });
  const fresh = await Client.findOne({ where: { id: client.id }, attributes: clientAttributes });
  return toPublicClient(fresh);
}

async function createAmortizacijaClient(data, userId) {
  const client = await Client.create({ ...data, type: "PERSON", createdById: userId, amortizacijaOnly: true });
  const fresh = await Client.findOne({ where: { id: client.id }, attributes: clientAttributes });
  return toPublicClient(fresh);
}

async function updatePersonClient(id, data, userId) {
  const existing = await Client.findOne({ where: { id }, attributes: ["id", "createdById"] });
  if (!existing || existing.createdById !== userId) return null;

  await Client.update(data, { where: { id } });
  const fresh = await Client.findOne({ where: { id }, attributes: clientAttributes });
  return toPublicClient(fresh);
}

async function deletePersonClient(id, userId) {
  const existing = await Client.findOne({ where: { id }, attributes: ["id", "createdById"] });
  if (!existing || existing.createdById !== userId) return null;

  await sequelize.transaction(async (t) => {
    const formIds = (await Form.findAll({ where: { clientId: id }, attributes: ["id"], transaction: t })).map((f) => f.id);
    if (formIds.length > 0) {
      await FormAttachment.destroy({ where: { formId: { $in: formIds } }, transaction: t });
      await FormVersion.destroy({ where: { formId: { $in: formIds } }, transaction: t });
      await Form.destroy({ where: { id: { $in: formIds } }, transaction: t });
    }
    await Client.destroy({ where: { id }, transaction: t });
  });

  return true;
}

module.exports = {
  getPersonClients,
  getAmortizacijaClients,
  createPersonClient,
  createAmortizacijaClient,
  updatePersonClient,
  deletePersonClient,
};
