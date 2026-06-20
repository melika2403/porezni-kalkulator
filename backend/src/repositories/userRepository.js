const { Op } = require("sequelize");
const {
  sequelize, User, Subscription, Organization, OrganizationMember, Client, Form,
  InvoiceCounter, InvoiceItemTemplate, KarticaMember,
} = require("../models/index");
const { decryptJmbg } = require("../utils/encryptJmbg");
const cascade = require("../services/adminCascade");

const userInclude = [
  {
    model: Subscription,
    as: "subscription",
    attributes: [
      "id",
      "startDate",
      "endDate",
      "isActive",
      "plan",
      "status",
      "billingCycle",
      "cancelAtPeriodEnd",
      "cancelledAt",
    ],
  },
];

const userAttributes = [
  "id", "email", "jmbg", "idCardNumber", "firstName", "lastName",
  "phone", "address", "city", "role", "createdAt", "updatedAt", "isEmailVerified",
  "trialUsedAt",
];

function toPublicUser(user) {
  if (!user) return null;
  const plain = user.toJSON ? user.toJSON() : user;
  const { jmbg, ...rest } = plain;
  return { ...rest, jmbg: jmbg ? decryptJmbg(jmbg) : null };
}

async function listUsers({
  firstName,
  lastName,
  email,
  role,
  sort,
  page = 1,
  limit = 20,
}) {
  const where = {};
  if (firstName) where.firstName = { [Op.like]: `%${firstName.trim()}%` };
  if (lastName) where.lastName = { [Op.like]: `%${lastName.trim()}%` };
  if (email) where.email = { [Op.like]: `%${email.trim()}%` };
  if (role && ["USER", "PRO", "BUSINESS", "ADMIN"].includes(role)) {
    where.role = role;
  }

  let order = [["id", "DESC"]]; // najnoviji (default)
  if (sort === "oldest") order = [["id", "ASC"]];
  else if (sort === "name") order = [["lastName", "ASC"], ["firstName", "ASC"]];

  const offset = (page - 1) * limit;

  const { count: total, rows: items } = await User.findAndCountAll({
    where,
    attributes: userAttributes,
    include: userInclude,
    order,
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
    // Forme koje je korisnik samo izmijenio (sama forma se ne briše) → odveži.
    await Form.update({ updatedById: null }, { where: { updatedById: id }, transaction: t });

    // Sve organizacije koje je korisnik kreirao → puna kaskada (radnici sa
    // platama/dokumentima/formama, org klijenti, fakture, brojači, kartice…).
    const orgIds = (
      await Organization.findAll({ where: { createdById: id }, attributes: ["id"], transaction: t })
    ).map((o) => o.id);
    for (const orgId of orgIds) {
      await cascade.deleteOrganizationInner(orgId, t);
    }

    // Lične forme korisnika (van obrisanih org-a).
    const userFormIds = (
      await Form.findAll({ where: { createdById: id }, attributes: ["id"], transaction: t })
    ).map((f) => f.id);
    await cascade.deleteFormsByIds(userFormIds, t);

    // Lični klijenti korisnika (van obrisanih org-a) + odvezivanje faktura.
    const userClientIds = (
      await Client.findAll({ where: { createdById: id }, attributes: ["id"], transaction: t })
    ).map((c) => c.id);
    await cascade.deleteClientsByIds(userClientIds, t);

    // Lične (legacy) fakture bez organizacije + brojači + biblioteka stavki +
    // članske kartice koje je korisnik kreirao.
    await cascade.deleteInvoicesWhere({ userId: id, organizationId: null }, t);
    await InvoiceCounter.destroy({ where: { userId: id }, transaction: t });
    await InvoiceItemTemplate.destroy({ where: { userId: id }, transaction: t });
    await KarticaMember.destroy({ where: { createdById: id }, transaction: t });

    await OrganizationMember.destroy({ where: { userId: id }, transaction: t });
    await Subscription.destroy({ where: { userId: id }, transaction: t });
    await User.destroy({ where: { id }, transaction: t });
  });

  return true;
}

module.exports = { listUsers, getUserById, createUser, updateUserById, deleteUserById };
