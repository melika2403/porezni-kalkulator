const prisma = require("../prisma");
const { encryptJmbg, decryptJmbg } = require("../utils/encryptJmbg");

const clientDbSelect = {
  id: true,
  type: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  address: true,
  jmbg: true,
  taxNumber: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
};

function toPublicClient(c) {
  if (!c) return null;
  const { jmbg, ...rest } = c;
  return { ...rest, jmbg: jmbg ? decryptJmbg(jmbg) : null };
}

async function getPersonClients(userId) {
  const clients = await prisma.client.findMany({
    where: { createdById: userId, type: "PERSON", organizationId: null, amortizacijaOnly: false },
    select: clientDbSelect,
    orderBy: { createdAt: "desc" },
  });
  return clients.map(toPublicClient);
}

async function getAmortizacijaClients(userId) {
  const clients = await prisma.client.findMany({
    where: { createdById: userId, type: "PERSON", organizationId: null, amortizacijaOnly: true },
    select: clientDbSelect,
    orderBy: { createdAt: "desc" },
  });
  return clients.map(toPublicClient);
}

async function createPersonClient(data, userId) {
  const client = await prisma.client.create({
    data: { ...data, type: "PERSON", createdById: userId, amortizacijaOnly: false },
    select: clientDbSelect,
  });
  return toPublicClient(client);
}

async function createAmortizacijaClient(data, userId) {
  const client = await prisma.client.create({
    data: { ...data, type: "PERSON", createdById: userId, amortizacijaOnly: true },
    select: clientDbSelect,
  });
  return toPublicClient(client);
}

async function updatePersonClient(id, data, userId) {
  try {
    const existing = await prisma.client.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!existing || existing.createdById !== userId) return null;

    const client = await prisma.client.update({
      where: { id },
      data,
      select: clientDbSelect,
    });
    return toPublicClient(client);
  } catch (error) {
    if (error?.code === "P2025") return null;
    throw error;
  }
}

async function deletePersonClient(id, userId) {
  const existing = await prisma.client.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!existing || existing.createdById !== userId) return null;

  await prisma.$transaction(async (tx) => {
    const forms = await tx.form.findMany({
      where: { clientId: id },
      select: { id: true },
    });
    const formIds = forms.map((f) => f.id);
    if (formIds.length > 0) {
      await tx.formAttachment.deleteMany({ where: { formId: { in: formIds } } });
      await tx.formVersion.deleteMany({ where: { formId: { in: formIds } } });
      await tx.form.deleteMany({ where: { id: { in: formIds } } });
    }
    await tx.client.delete({ where: { id } });
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
