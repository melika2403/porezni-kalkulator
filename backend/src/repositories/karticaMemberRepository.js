const { KarticaMember } = require("../models/index");

const ATTRS = ["id", "name", "code", "clubName", "validUntil", "organizationId", "createdAt", "updatedAt"];

async function list(userId, organizationId) {
  const where = { createdById: userId };
  if (organizationId === null) where.organizationId = null;
  else if (Number.isInteger(organizationId)) where.organizationId = organizationId;
  const rows = await KarticaMember.findAll({
    where,
    attributes: ATTRS,
    order: [["createdAt", "ASC"]],
  });
  return rows.map((r) => r.toJSON());
}

async function create(userId, data) {
  const row = await KarticaMember.create({
    createdById: userId,
    organizationId: data.organizationId ?? null,
    name: data.name,
    code: data.code,
    clubName: data.clubName ?? null,
    validUntil: data.validUntil || null,
  });
  return row.toJSON();
}

async function update(userId, id, data) {
  const existing = await KarticaMember.findOne({ where: { id }, attributes: ["id", "createdById"] });
  if (!existing || existing.createdById !== userId) return null;
  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.code !== undefined) patch.code = data.code;
  if (data.clubName !== undefined) patch.clubName = data.clubName;
  if (data.validUntil !== undefined) patch.validUntil = data.validUntil || null;
  if (data.organizationId !== undefined) patch.organizationId = data.organizationId ?? null;
  if (Object.keys(patch).length === 0) return existing.toJSON();
  await KarticaMember.update(patch, { where: { id } });
  const fresh = await KarticaMember.findOne({ where: { id }, attributes: ATTRS });
  return fresh.toJSON();
}

async function remove(userId, id) {
  const existing = await KarticaMember.findOne({ where: { id }, attributes: ["id", "createdById"] });
  if (!existing || existing.createdById !== userId) return false;
  await KarticaMember.destroy({ where: { id } });
  return true;
}

/** Upsert by (createdById, organizationId, code). Returns array of rows. */
async function bulkUpsert(userId, organizationId, items) {
  const out = [];
  for (const item of items) {
    if (!item.name?.trim() || !item.code?.trim()) continue;
    const where = {
      createdById: userId,
      organizationId: organizationId ?? null,
      code: item.code.trim(),
    };
    const existing = await KarticaMember.findOne({ where, attributes: ["id"] });
    if (existing) {
      await KarticaMember.update(
        {
          name: item.name.trim(),
          clubName: item.clubName ?? null,
          validUntil: item.validUntil || null,
        },
        { where: { id: existing.id } },
      );
      const fresh = await KarticaMember.findOne({ where: { id: existing.id }, attributes: ATTRS });
      out.push(fresh.toJSON());
    } else {
      const row = await KarticaMember.create({
        createdById: userId,
        organizationId: organizationId ?? null,
        name: item.name.trim(),
        code: item.code.trim(),
        clubName: item.clubName ?? null,
        validUntil: item.validUntil || null,
      });
      out.push(row.toJSON());
    }
  }
  return out;
}

module.exports = { list, create, update, remove, bulkUpsert };
