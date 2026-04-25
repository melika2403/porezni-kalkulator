const { Op } = require("sequelize");
const { sequelize, User, Subscription, Organization, OrganizationMember, Worker, Client, Form, FormVersion, FormAttachment } = require("../models/index");
const { decryptJmbg } = require("../utils/encryptJmbg");

const userInclude = [
  { model: Subscription, as: "subscription", attributes: ["id", "startDate", "endDate", "isActive"] },
];

const userAttributes = [
  "id", "email", "jmbg", "idCardNumber", "firstName", "lastName",
  "phone", "address", "role", "createdAt", "updatedAt", "isEmailVerified",
];

function toPublicUser(user) {
  if (!user) return null;
  const plain = user.toJSON ? user.toJSON() : user;
  const { jmbg, ...rest } = plain;
  return { ...rest, jmbg: jmbg ? decryptJmbg(jmbg) : null };
}

async function listUsers({ firstName, lastName, email, page = 1, limit = 20 }) {
  const where = {};
  if (firstName) where.firstName = { [Op.like]: `%${firstName.trim()}%` };
  if (lastName) where.lastName = { [Op.like]: `%${lastName.trim()}%` };
  if (email) where.email = { [Op.like]: `%${email.trim()}%` };

  const offset = (page - 1) * limit;

  const { count: total, rows: items } = await User.findAndCountAll({
    where,
    attributes: userAttributes,
    include: userInclude,
    order: [["id", "DESC"]],
    limit,
    offset,
  });

  return { items: items.map(toPublicUser), total };
}

async function getUserById(id) {
  const user = await User.findOne({
    where: { id },
    attributes: userAttributes,
    include: userInclude,
  });
  return toPublicUser(user);
}

async function createUser(data) {
  const user = await User.create(data);
  return getUserById(user.id);
}

async function updateUserById(id, data) {
  const [affected] = await User.update(data, { where: { id } });
  if (affected === 0) return null;
  return getUserById(id);
}

async function deleteUserById(id) {
  const exists = await User.findOne({ where: { id }, attributes: ["id"] });
  if (!exists) return false;

  await sequelize.transaction(async (t) => {
    // Nullify updatedById references
    await Form.update({ updatedById: null }, { where: { updatedById: id }, transaction: t });

    // Delete orgs created by user
    const orgIds = (await Organization.findAll({ where: { createdById: id }, attributes: ["id"], transaction: t })).map((o) => o.id);

    if (orgIds.length > 0) {
      const orgFormIds = (await Form.findAll({ where: { organizationId: { [Op.in]: orgIds } }, attributes: ["id"], transaction: t })).map((f) => f.id);
      if (orgFormIds.length > 0) {
        await FormAttachment.destroy({ where: { formId: { [Op.in]: orgFormIds } }, transaction: t });
        await FormVersion.destroy({ where: { formId: { [Op.in]: orgFormIds } }, transaction: t });
        await Form.destroy({ where: { id: { [Op.in]: orgFormIds } }, transaction: t });
      }

      await OrganizationMember.destroy({ where: { organizationId: { [Op.in]: orgIds } }, transaction: t });
      await Worker.destroy({ where: { organizationId: { [Op.in]: orgIds } }, transaction: t });

      const orgClientIds = (await Client.findAll({ where: { organizationId: { [Op.in]: orgIds } }, attributes: ["id"], transaction: t })).map((c) => c.id);
      if (orgClientIds.length > 0) {
        const clientFormIds = (await Form.findAll({ where: { clientId: { [Op.in]: orgClientIds } }, attributes: ["id"], transaction: t })).map((f) => f.id);
        if (clientFormIds.length > 0) {
          await FormAttachment.destroy({ where: { formId: { [Op.in]: clientFormIds } }, transaction: t });
          await FormVersion.destroy({ where: { formId: { [Op.in]: clientFormIds } }, transaction: t });
          await Form.destroy({ where: { id: { [Op.in]: clientFormIds } }, transaction: t });
        }
        await Client.destroy({ where: { id: { [Op.in]: orgClientIds } }, transaction: t });
      }

      await Organization.destroy({ where: { id: { [Op.in]: orgIds } }, transaction: t });
    }

    // Delete user's forms
    const userFormIds = (await Form.findAll({ where: { createdById: id }, attributes: ["id"], transaction: t })).map((f) => f.id);
    if (userFormIds.length > 0) {
      await FormAttachment.destroy({ where: { formId: { [Op.in]: userFormIds } }, transaction: t });
      await FormVersion.destroy({ where: { formId: { [Op.in]: userFormIds } }, transaction: t });
      await Form.destroy({ where: { id: { [Op.in]: userFormIds } }, transaction: t });
    }

    // Delete user's clients
    const userClientIds = (await Client.findAll({ where: { createdById: id }, attributes: ["id"], transaction: t })).map((c) => c.id);
    if (userClientIds.length > 0) {
      const clientFormIds = (await Form.findAll({ where: { clientId: { [Op.in]: userClientIds } }, attributes: ["id"], transaction: t })).map((f) => f.id);
      if (clientFormIds.length > 0) {
        await FormAttachment.destroy({ where: { formId: { [Op.in]: clientFormIds } }, transaction: t });
        await FormVersion.destroy({ where: { formId: { [Op.in]: clientFormIds } }, transaction: t });
        await Form.destroy({ where: { id: { [Op.in]: clientFormIds } }, transaction: t });
      }
      await Client.destroy({ where: { id: { [Op.in]: userClientIds } }, transaction: t });
    }

    await OrganizationMember.destroy({ where: { userId: id }, transaction: t });
    await Subscription.destroy({ where: { userId: id }, transaction: t });
    await User.destroy({ where: { id }, transaction: t });
  });

  return true;
}

module.exports = { listUsers, getUserById, createUser, updateUserById, deleteUserById };
