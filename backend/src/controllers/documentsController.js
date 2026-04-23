const prisma = require("../prisma");

const VALID_TYPES = ["AMS", "SPR", "ZO3", "GPD", "PLDI"];

function parseYear(v) {
  const n = parseInt(v);
  return isNaN(n) ? null : n;
}

function parseMonth(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(v);
  return isNaN(n) || n < 1 || n > 12 ? null : n;
}

async function save(req, res) {
  const { type, year, month, data, title, organizationId, clientId } = req.body;
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ ok: false, error: "Invalid type" });
  }
  const yr = parseYear(year);
  if (yr === null) return res.status(400).json({ ok: false, error: "Invalid year" });
  const mo = parseMonth(month);

  let orgId = null;
  if (organizationId !== undefined && organizationId !== null && organizationId !== "") {
    const n = parseInt(organizationId);
    if (isNaN(n)) return res.status(400).json({ ok: false, error: "Invalid organizationId" });
    const member = await prisma.organizationMember.findFirst({
      where: { userId: req.user.id, organizationId: n },
    });
    if (!member) return res.status(403).json({ ok: false, error: "Not a member of organization" });
    orgId = n;
  }

  let cliId = null;
  if (clientId !== undefined && clientId !== null && clientId !== "") {
    const n = parseInt(clientId);
    if (isNaN(n)) return res.status(400).json({ ok: false, error: "Invalid clientId" });
    const client = await prisma.client.findFirst({
      where: { id: n, createdById: req.user.id },
    });
    if (!client) return res.status(403).json({ ok: false, error: "Client not found" });
    cliId = n;
  }

  const where = {
    type,
    year: yr,
    createdById: req.user.id,
    month: mo,
    organizationId: orgId,
    clientId: cliId,
  };

  let form = await prisma.form.findFirst({ where });

  if (!form) {
    form = await prisma.form.create({
      data: {
        type,
        year: yr,
        month: mo,
        title: title ?? null,
        status: "GENERATED",
        createdById: req.user.id,
        organizationId: orgId,
        clientId: cliId,
      },
    });
  } else if (title && form.title !== title) {
    form = await prisma.form.update({
      where: { id: form.id },
      data: { title, status: "GENERATED" },
    });
  }

  const dataStr = JSON.stringify(data ?? {});
  await prisma.formVersion.upsert({
    where: { formId_versionNumber: { formId: form.id, versionNumber: 1 } },
    create: { formId: form.id, versionNumber: 1, data: dataStr },
    update: { data: dataStr },
  });

  return res.status(200).json({ ok: true, data: { id: form.id } });
}

async function get(req, res) {
  const { id } = req.params;
  const formId = parseInt(id);
  if (isNaN(formId)) return res.status(400).json({ ok: false, error: "Invalid id" });

  const form = await prisma.form.findFirst({
    where: { id: formId, createdById: req.user.id },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!form) return res.status(404).json({ ok: false, error: "Not found" });

  const raw = form.versions[0]?.data;
  const parsed = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
  return res.status(200).json({
    ok: true,
    data: {
      id: form.id,
      type: form.type,
      year: form.year,
      month: form.month,
      title: form.title,
      organizationId: form.organizationId,
      clientId: form.clientId,
      data: parsed,
    },
  });
}

async function remove(req, res) {
  const { id } = req.params;
  const formId = parseInt(id);
  if (isNaN(formId)) return res.status(400).json({ ok: false, error: "Invalid id" });

  const form = await prisma.form.findFirst({
    where: { id: formId, createdById: req.user.id },
  });
  if (!form) return res.status(404).json({ ok: false, error: "Not found" });

  await prisma.formVersion.deleteMany({ where: { formId: form.id } });
  await prisma.form.delete({ where: { id: form.id } });
  return res.status(200).json({ ok: true, data: null });
}

module.exports = { save, get, remove };
