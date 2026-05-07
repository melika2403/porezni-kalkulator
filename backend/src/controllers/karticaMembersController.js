const repo = require("../repositories/karticaMemberRepository");

const ALLOWED_ROLES = ["PRO", "BUSINESS", "ADMIN"];

function checkRole(req, res) {
  if (!ALLOWED_ROLES.includes(req.user?.role)) {
    res.status(403).json({ ok: false, error: "FORBIDDEN" });
    return false;
  }
  return true;
}

function parseOrgId(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === "null") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

async function list(req, res) {
  if (!checkRole(req, res)) return;
  const orgId = parseOrgId(req.query.organizationId);
  const data = await repo.list(req.user.id, orgId === undefined ? undefined : orgId);
  res.status(200).json({ ok: true, data });
}

async function create(req, res) {
  if (!checkRole(req, res)) return;
  const { name, code, clubName, validUntil } = req.body ?? {};
  const organizationId = parseOrgId(req.body?.organizationId);
  if (typeof name !== "string" || !name.trim())
    return res.status(400).json({ ok: false, error: "Ime je obavezno" });
  if (typeof code !== "string" || !code.trim())
    return res.status(400).json({ ok: false, error: "Kod je obavezan" });
  try {
    const row = await repo.create(req.user.id, {
      name: name.trim(),
      code: code.trim(),
      clubName: typeof clubName === "string" ? clubName.trim() : null,
      validUntil: typeof validUntil === "string" ? validUntil.slice(0, 10) : null,
      organizationId: organizationId === undefined ? null : organizationId,
    });
    res.status(201).json({ ok: true, data: row });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function update(req, res) {
  if (!checkRole(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });
  const { name, code, clubName, validUntil } = req.body ?? {};
  const organizationId = parseOrgId(req.body?.organizationId);
  const patch = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim())
      return res.status(400).json({ ok: false, error: "Ime je obavezno" });
    patch.name = name.trim();
  }
  if (code !== undefined) {
    if (typeof code !== "string" || !code.trim())
      return res.status(400).json({ ok: false, error: "Kod je obavezan" });
    patch.code = code.trim();
  }
  if (clubName !== undefined) patch.clubName = typeof clubName === "string" ? clubName.trim() : null;
  if (validUntil !== undefined)
    patch.validUntil = typeof validUntil === "string" && validUntil ? validUntil.slice(0, 10) : null;
  if (organizationId !== undefined) patch.organizationId = organizationId ?? null;
  try {
    const row = await repo.update(req.user.id, id, patch);
    if (!row) return res.status(404).json({ ok: false, error: "Član nije pronađen" });
    res.status(200).json({ ok: true, data: row });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function remove(req, res) {
  if (!checkRole(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const ok = await repo.remove(req.user.id, id);
    if (!ok) return res.status(404).json({ ok: false, error: "Član nije pronađen" });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

async function bulkUpsert(req, res) {
  if (!checkRole(req, res)) return;
  const organizationId = parseOrgId(req.body?.organizationId);
  const { items, clubName } = req.body ?? {};
  if (!Array.isArray(items))
    return res.status(400).json({ ok: false, error: "items mora biti array" });
  const sanitized = items
    .filter((it) => it && typeof it.name === "string" && typeof it.code === "string")
    .map((it) => ({
      name: it.name.trim(),
      code: it.code.trim(),
      clubName: typeof clubName === "string" && clubName.trim() ? clubName.trim() : null,
      validUntil: typeof it.validUntil === "string" && it.validUntil ? it.validUntil.slice(0, 10) : null,
    }));
  try {
    const data = await repo.bulkUpsert(
      req.user.id,
      organizationId === undefined ? null : organizationId,
      sanitized,
    );
    res.status(200).json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error?.message ?? error) });
  }
}

module.exports = { list, create, update, remove, bulkUpsert };
