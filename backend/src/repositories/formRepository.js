const { Op } = require("sequelize");
const { Form, Organization, Client, OrganizationMember } = require("../models/index");

// Faza 3: forme su team-shared kad imaju organizationId. Listing vraća:
//   (a) sve forme svih org-a u kojima je korisnik član (team docs)
//   (b) plus njegove lične forme (organizationId IS NULL i createdById === me)
async function getUserForms(userId, type) {
  const memberships = await OrganizationMember.findAll({
    where: { userId },
    attributes: ["organizationId"],
  });
  const memberOrgIds = memberships.map((m) => m.organizationId);

  const orClauses = [
    { organizationId: null, createdById: userId }, // lične forme
  ];
  if (memberOrgIds.length > 0) {
    orClauses.push({ organizationId: { [Op.in]: memberOrgIds } });
  }

  const where = { [Op.or]: orClauses };
  if (type) where.type = type;

  return Form.findAll({
    where,
    attributes: ["id", "type", "status", "year", "month", "title", "pdfUrl", "createdAt", "createdById"],
    include: [
      { model: Organization, as: "organization", attributes: ["id", "name"] },
      { model: Client, as: "client", attributes: ["id", "firstName", "lastName", "companyName"] },
    ],
    order: [["createdAt", "DESC"]],
  });
}

module.exports = { getUserForms };
