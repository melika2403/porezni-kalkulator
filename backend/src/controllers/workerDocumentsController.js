const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const {
  WorkerDocument,
  Worker,
  OrganizationMember,
} = require("../models/index");
const { UPLOADS_ROOT, safeUnlink } = require("../utils/uploads");

const VALID_TYPES = ["UGOVOR", "OTKAZ", "JS3100_PRIJAVA", "JS3100_ODJAVA"];
const VALID_FORMATS = ["DOCX", "PDF"];

function parseWorkerId(req) {
  const id = Number(req.params.workerId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseDocId(req) {
  const id = Number(req.params.docId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function assertWorkerAccess(workerId, userId) {
  const worker = await Worker.findOne({ where: { id: workerId } });
  if (!worker) return { error: "WORKER_NOT_FOUND", status: 404 };
  const membership = await OrganizationMember.findOne({
    where: {
      organizationId: worker.organizationId,
      userId,
      role: { [Op.in]: ["OWNER", "ADMIN", "MEMBER"] },
    },
  });
  if (!membership) return { error: "FORBIDDEN", status: 403 };
  return { worker };
}

function toPublic(d) {
  if (!d) return null;
  const p = d.toJSON ? d.toJSON() : d;
  return {
    id: p.id,
    workerId: p.workerId,
    organizationId: p.organizationId,
    type: p.type,
    format: p.format,
    number: p.number,
    originalName: p.originalName,
    mimeType: p.mimeType,
    sizeBytes: p.sizeBytes,
    createdAt: p.createdAt,
  };
}

/* ── CREATE: multipart/form-data sa fajlom + meta poljima ───────────────── */
async function create(req, res) {
  const workerId = parseWorkerId(req);
  if (!workerId) return res.status(400).json({ ok: false, error: "Invalid workerId" });

  const access = await assertWorkerAccess(workerId, req.user.id);
  if (access.error) return res.status(access.status).json({ ok: false, error: access.error });

  if (!req.file) return res.status(400).json({ ok: false, error: "FILE_MISSING" });

  const { type, format, number, originalName } = req.body ?? {};
  if (!VALID_TYPES.includes(type)) {
    safeUnlink(req.file.path);
    return res.status(400).json({ ok: false, error: "INVALID_TYPE" });
  }
  if (!VALID_FORMATS.includes(format)) {
    safeUnlink(req.file.path);
    return res.status(400).json({ ok: false, error: "INVALID_FORMAT" });
  }

  try {
    const doc = await WorkerDocument.create({
      workerId,
      organizationId: access.worker.organizationId,
      type,
      format,
      number: (number ?? "").toString().slice(0, 64) || null,
      filename: req.file.filename,
      originalName: (originalName ?? req.file.originalname).toString().slice(0, 255),
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
    return res.status(201).json({ ok: true, data: toPublic(doc) });
  } catch (e) {
    safeUnlink(req.file.path);
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
}

async function list(req, res) {
  const workerId = parseWorkerId(req);
  if (!workerId) return res.status(400).json({ ok: false, error: "Invalid workerId" });

  const access = await assertWorkerAccess(workerId, req.user.id);
  if (access.error) return res.status(access.status).json({ ok: false, error: access.error });

  const docs = await WorkerDocument.findAll({
    where: { workerId },
    order: [["createdAt", "DESC"]],
  });
  return res.json({ ok: true, data: docs.map(toPublic) });
}

async function download(req, res) {
  const docId = parseDocId(req);
  if (!docId) return res.status(400).json({ ok: false, error: "Invalid docId" });

  const doc = await WorkerDocument.findOne({ where: { id: docId } });
  if (!doc) return res.status(404).json({ ok: false, error: "DOCUMENT_NOT_FOUND" });

  const access = await assertWorkerAccess(doc.workerId, req.user.id);
  if (access.error) return res.status(access.status).json({ ok: false, error: access.error });

  const fullPath = path.join(UPLOADS_ROOT, "worker-documents", doc.filename);
  if (!fs.existsSync(fullPath))
    return res.status(404).json({ ok: false, error: "FILE_MISSING" });

  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
  );
  fs.createReadStream(fullPath).pipe(res);
}

async function remove(req, res) {
  const docId = parseDocId(req);
  if (!docId) return res.status(400).json({ ok: false, error: "Invalid docId" });

  const doc = await WorkerDocument.findOne({ where: { id: docId } });
  if (!doc) return res.status(404).json({ ok: false, error: "DOCUMENT_NOT_FOUND" });

  const access = await assertWorkerAccess(doc.workerId, req.user.id);
  if (access.error) return res.status(access.status).json({ ok: false, error: access.error });

  const fullPath = path.join(UPLOADS_ROOT, "worker-documents", doc.filename);
  safeUnlink(fullPath);
  await WorkerDocument.destroy({ where: { id: docId } });
  return res.json({ ok: true });
}

module.exports = { create, list, download, remove };
