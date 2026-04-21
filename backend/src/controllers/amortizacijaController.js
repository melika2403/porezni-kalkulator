const prisma = require("../prisma");

async function getYears(req, res) {
  const forms = await prisma.form.findMany({
    where: { type: "PLDI", createdById: req.user.id },
    select: { year: true },
    orderBy: { year: "desc" },
  });
  const years = [...new Set(forms.map((f) => f.year))];
  return res.status(200).json({ ok: true, data: years });
}

async function get(req, res) {
  const { godina } = req.query;
  if (!godina) return res.status(400).json({ ok: false, error: "Missing godina" });

  const year = parseInt(godina);
  if (isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const form = await prisma.form.findFirst({
    where: { type: "PLDI", year, createdById: req.user.id },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  if (!form || form.versions.length === 0) {
    return res.status(200).json({ ok: true, data: null });
  }

  const raw = form.versions[0].data;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return res.status(200).json({ ok: true, data: parsed });
}

async function save(req, res) {
  const { godina, obveznik, rows } = req.body;
  if (!godina) return res.status(400).json({ ok: false, error: "Missing godina" });

  const year = parseInt(godina);
  if (isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  let form = await prisma.form.findFirst({
    where: { type: "PLDI", year, createdById: req.user.id },
  });

  if (!form) {
    form = await prisma.form.create({
      data: { type: "PLDI", year, status: "DRAFT", createdById: req.user.id },
    });
  }

  const dataStr = JSON.stringify({ obveznik, rows });

  await prisma.formVersion.upsert({
    where: { formId_versionNumber: { formId: form.id, versionNumber: 1 } },
    create: { formId: form.id, versionNumber: 1, data: dataStr },
    update: { data: dataStr },
  });

  return res.status(200).json({ ok: true, data: { id: form.id } });
}

async function remove(req, res) {
  const { godina } = req.query;
  const year = parseInt(godina);
  if (isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const form = await prisma.form.findFirst({
    where: { type: "PLDI", year, createdById: req.user.id },
  });

  if (!form) return res.status(200).json({ ok: true, data: null });

  await prisma.formVersion.deleteMany({ where: { formId: form.id } });
  await prisma.form.delete({ where: { id: form.id } });

  return res.status(200).json({ ok: true, data: null });
}

module.exports = { getYears, get, save, remove };
