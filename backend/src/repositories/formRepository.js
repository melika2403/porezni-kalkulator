const prisma = require("../prisma");

async function getUserForms(userId, type) {
  const where = { createdById: userId };
  if (type) where.type = type;

  return prisma.form.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      year: true,
      month: true,
      title: true,
      pdfUrl: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
    },
  });
}

module.exports = { getUserForms };
