const prisma = require("../prisma");
const { encryptJmbg, decryptJmbg } = require("../utils/encryptJmbg");

const VALID_ROLES = ["VLASNIK", "RADNIK"];

function parseOrgId(req) {
  const id = Number(req.params.orgId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseWorkerId(req) {
  const id = Number(req.params.workerId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function assertMembership(orgId, userId, roles = ["OWNER", "ADMIN", "MEMBER"]) {
  return prisma.organizationMember.findFirst({
    where: { organizationId: orgId, userId, role: { in: roles } },
  });
}

function toPublicWorker(w) {
  if (!w) return null;
  const { jmbg, ...rest } = w;
  return {
    ...rest,
    jmbg: jmbg ? decryptJmbg(jmbg) : null,
    startDate: rest.startDate instanceof Date ? rest.startDate.toISOString().slice(0, 10) : (rest.startDate ?? null),
    endDate: rest.endDate instanceof Date ? rest.endDate.toISOString().slice(0, 10) : (rest.endDate ?? null),
  };
}

async function list(req, res) {
  const orgId = parseOrgId(req);
  if (!orgId) return res.status(400).json({ ok: false, error: "Invalid orgId" });

  const membership = await assertMembership(orgId, req.user.id);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const workers = await prisma.worker.findMany({
    where: { organizationId: orgId },
    orderBy: [{ role: "asc" }, { endDate: "asc" }, { startDate: "desc" }],
  });

  return res.json({ ok: true, data: workers.map(toPublicWorker) });
}

async function create(req, res) {
  const orgId = parseOrgId(req);
  if (!orgId) return res.status(400).json({ ok: false, error: "Invalid orgId" });

  const membership = await assertMembership(orgId, req.user.id, ["OWNER", "ADMIN"]);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const { firstName, lastName, jmbg, role, startDate, endDate, email, phone, address } = req.body ?? {};

  const resolvedRole = role ?? "RADNIK";
  if (!VALID_ROLES.includes(resolvedRole)) {
    return res.status(400).json({ ok: false, error: "Uloga mora biti VLASNIK ili RADNIK" });
  }

  if (!String(firstName ?? "").trim()) return res.status(400).json({ ok: false, error: "Ime je obavezno" });
  if (!String(lastName ?? "").trim()) return res.status(400).json({ ok: false, error: "Prezime je obavezno" });

  if (resolvedRole === "RADNIK" && !startDate) {
    return res.status(400).json({ ok: false, error: "Datum početka radnog odnosa je obavezan" });
  }

  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
    return res.status(400).json({ ok: false, error: "Datum kraja mora biti nakon datuma početka" });
  }

  let encryptedJmbg = null;
  if (jmbg?.trim()) {
    if (!/^\d{13}$/.test(jmbg.trim())) {
      return res.status(400).json({ ok: false, error: "JMBG mora imati tačno 13 cifara" });
    }
    encryptedJmbg = encryptJmbg(jmbg.trim());
  }

  try {
    const worker = await prisma.worker.create({
      data: {
        organizationId: orgId,
        role: resolvedRole,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        jmbg: encryptedJmbg,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
      },
    });
    return res.status(201).json({ ok: true, data: toPublicWorker(worker) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function update(req, res) {
  const orgId = parseOrgId(req);
  const workerId = parseWorkerId(req);
  if (!orgId || !workerId) return res.status(400).json({ ok: false, error: "Invalid id" });

  const membership = await assertMembership(orgId, req.user.id, ["OWNER", "ADMIN"]);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const existing = await prisma.worker.findFirst({ where: { id: workerId, organizationId: orgId } });
  if (!existing) return res.status(404).json({ ok: false, error: "Radnik nije pronađen" });

  const { firstName, lastName, jmbg, role, startDate, endDate, email, phone, address } = req.body ?? {};
  const data = {};

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ ok: false, error: "Uloga mora biti VLASNIK ili RADNIK" });
    }
    data.role = role;
  }
  if (firstName !== undefined) {
    if (!String(firstName).trim()) return res.status(400).json({ ok: false, error: "Ime je obavezno" });
    data.firstName = String(firstName).trim();
  }
  if (lastName !== undefined) {
    if (!String(lastName).trim()) return res.status(400).json({ ok: false, error: "Prezime je obavezno" });
    data.lastName = String(lastName).trim();
  }
  if (jmbg !== undefined) {
    if (jmbg === null || jmbg === "") {
      data.jmbg = null;
    } else {
      if (!/^\d{13}$/.test(String(jmbg).trim())) {
        return res.status(400).json({ ok: false, error: "JMBG mora imati tačno 13 cifara" });
      }
      data.jmbg = encryptJmbg(String(jmbg).trim());
    }
  }
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
  if (email !== undefined) data.email = email?.trim() || null;
  if (phone !== undefined) data.phone = phone?.trim() || null;
  if (address !== undefined) data.address = address?.trim() || null;

  const finalStart = data.startDate !== undefined ? data.startDate : existing.startDate;
  const finalEnd = data.endDate !== undefined ? data.endDate : existing.endDate;
  if (finalStart && finalEnd && finalEnd <= finalStart) {
    return res.status(400).json({ ok: false, error: "Datum kraja mora biti nakon datuma početka" });
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ ok: false, error: "Nema polja za ažuriranje" });
  }

  try {
    const worker = await prisma.worker.update({ where: { id: workerId }, data });
    return res.json({ ok: true, data: toPublicWorker(worker) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function remove(req, res) {
  const orgId = parseOrgId(req);
  const workerId = parseWorkerId(req);
  if (!orgId || !workerId) return res.status(400).json({ ok: false, error: "Invalid id" });

  const membership = await assertMembership(orgId, req.user.id, ["OWNER", "ADMIN"]);
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const existing = await prisma.worker.findFirst({ where: { id: workerId, organizationId: orgId } });
  if (!existing) return res.status(404).json({ ok: false, error: "Radnik nije pronađen" });

  await prisma.worker.delete({ where: { id: workerId } });
  return res.json({ ok: true });
}

async function listAllForUser(req, res) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: req.user.id },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          workers: true,
        },
      },
    },
  });

  const data = memberships.flatMap((m) =>
    m.organization.workers.map((w) => ({
      ...toPublicWorker(w),
      organizationId: m.organization.id,
      organizationName: m.organization.name,
    })),
  );

  return res.json({ ok: true, data });
}

module.exports = { list, listAllForUser, create, update, remove };
