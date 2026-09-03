// PK Freelancer: prilozi uz uplatu (ovjeren AMS sa šaltera, dokaz uplate iz
// banke). Fajlovi su u PRIVATNOM folderu i služe se samo vlasniku kroz ovaj
// kontroler; javni /uploads mount ih ne vidi. Upload traži paket/probu,
// pregled i brisanje smije vlasnik uvijek (svoje dokumente nikad ne gubi).
const fs = require("fs");
const path = require("path");
const { FreelancerUplata, FreelancerPrilog } = require("../models/index");
const { getFreelancerAccess } = require("../services/freelancerAccess");
const { safeUnlink, PRIVATE_ROOT } = require("../utils/uploads");

const DIR = path.join(PRIVATE_ROOT, "freelancer-prilozi");
const VRSTE = ["OVJEREN_AMS", "DOKAZ_UPLATE", "OSTALO"];
const MAX_PO_UPLATI = 10;

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toPublic(p) {
  return {
    id: p.id,
    uplataId: p.uplataId,
    vrsta: p.vrsta,
    originalName: p.originalName,
    mimeType: p.mimeType,
    sizeBytes: p.sizeBytes,
    createdAt: p.createdAt,
  };
}

async function nadjiUplatu(req) {
  const id = parseId(req.params.id);
  if (!id) return null;
  return FreelancerUplata.findOne({ where: { id, userId: req.user.id } });
}

async function upload(req, res) {
  const uplata = await nadjiUplatu(req);
  if (!uplata) {
    if (req.file) await safeUnlink(req.file.path);
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  if (!req.file) return res.status(400).json({ ok: false, error: "NO_FILE" });

  const access = await getFreelancerAccess(req.user);
  if (!access.hasAccess) {
    await safeUnlink(req.file.path);
    return res.status(403).json({ ok: false, error: "NEMA_PRISTUPA" });
  }
  const broj = await FreelancerPrilog.count({ where: { uplataId: uplata.id } });
  if (broj >= MAX_PO_UPLATI) {
    await safeUnlink(req.file.path);
    return res.status(409).json({
      ok: false,
      error: "LIMIT_PRILOGA",
      data: { limit: MAX_PO_UPLATI },
    });
  }
  const vrstaRaw = String(req.body?.vrsta || "").toUpperCase();
  const created = await FreelancerPrilog.create({
    uplataId: uplata.id,
    userId: req.user.id,
    vrsta: VRSTE.includes(vrstaRaw) ? vrstaRaw : "OSTALO",
    filename: req.file.filename,
    originalName: String(req.body?.originalName || req.file.originalname || "prilog")
      .trim()
      .slice(0, 255),
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
  });
  return res.status(201).json({ ok: true, data: toPublic(created) });
}

async function lista(req, res) {
  const uplata = await nadjiUplatu(req);
  if (!uplata) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const items = await FreelancerPrilog.findAll({
    where: { uplataId: uplata.id },
    order: [["createdAt", "DESC"]],
  });
  return res.json({ ok: true, data: items.map(toPublic) });
}

async function download(req, res) {
  const id = parseId(req.params.id);
  const p = id
    ? await FreelancerPrilog.findOne({ where: { id, userId: req.user.id } })
    : null;
  if (!p) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const fullPath = path.join(DIR, p.filename);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ ok: false, error: "FILE_MISSING" });
  }
  // inline: PDF i slike se otvaraju u tabu, korisnik ih po želji snima
  res.setHeader("Content-Type", p.mimeType);
  res.setHeader(
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(p.originalName)}`,
  );
  fs.createReadStream(fullPath).pipe(res);
}

async function remove(req, res) {
  const id = parseId(req.params.id);
  const p = id
    ? await FreelancerPrilog.findOne({ where: { id, userId: req.user.id } })
    : null;
  if (!p) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await safeUnlink(path.join(DIR, p.filename));
  await p.destroy();
  return res.json({ ok: true, data: { id: p.id } });
}

module.exports = { upload, lista, download, remove, VRSTE };
