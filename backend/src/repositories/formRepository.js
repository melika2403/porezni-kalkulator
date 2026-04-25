const { Form, Organization, Client } = require("../models/index");

async function getUserForms(userId, type) {
  const where = { createdById: userId };
  if (type) where.type = type;

  return Form.findAll({
    where,
    attributes: ["id", "type", "status", "year", "month", "title", "pdfUrl", "createdAt"],
    include: [
      { model: Organization, as: "organization", attributes: ["id", "name"] },
      { model: Client, as: "client", attributes: ["id", "firstName", "lastName", "companyName"] },
    ],
    order: [["createdAt", "DESC"]],
  });
}

module.exports = { getUserForms };
