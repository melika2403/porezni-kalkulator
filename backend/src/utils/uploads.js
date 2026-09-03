const path = require("path");
const fs = require("fs");
const multer = require("multer");

const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function makeStorage(subdir) {
  const dir = path.join(UPLOADS_ROOT, subdir);
  ensureDir(dir);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || "").toLowerCase();
      const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : ".png";
      const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      cb(null, `${stamp}${safeExt}`);
    },
  });
}

const imageFileFilter = (_req, file, cb) => {
  const ok = ["image/png", "image/jpeg", "image/webp"].includes(file.mimetype);
  if (!ok) return cb(new Error("INVALID_IMAGE_TYPE"));
  cb(null, true);
};

const logoUpload = multer({
  storage: makeStorage("logos"),
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// Memorandum (zaglavlje) klijenta za platne liste: SAMO PNG/JPG jer pdf-lib
// ne zna ugraditi webp u PDF platnog listića.
const memorandumFileFilter = (_req, file, cb) => {
  const ok = ["image/png", "image/jpeg"].includes(file.mimetype);
  if (!ok) return cb(new Error("INVALID_IMAGE_TYPE"));
  cb(null, true);
};

const memorandumUpload = multer({
  storage: makeStorage("memorandumi"),
  fileFilter: memorandumFileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
});

// Slike u vijestima i vodičima (naslovna + slike u tekstu). Veći limit jer su
// naslovne slike krupnije od logotipa; smanjivanje radi next/image pri prikazu.
const vijestiUpload = multer({
  storage: makeStorage("vijesti"),
  fileFilter: imageFileFilter,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6 MB
});

// Slika profila komentatora (sekcija Vijesti)
const avatarUpload = multer({
  storage: makeStorage("avatari"),
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// Document uploads (DOCX/PDF) za worker documents
function makeDocStorage(subdir) {
  const dir = path.join(UPLOADS_ROOT, subdir);
  ensureDir(dir);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || "").toLowerCase();
      const safeExt = [".pdf", ".docx", ".doc"].includes(ext) ? ext : ".bin";
      const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      cb(null, `${stamp}${safeExt}`);
    },
  });
}

const docFileFilter = (_req, file, cb) => {
  const ok = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ].includes(file.mimetype);
  if (!ok) return cb(new Error("INVALID_DOC_TYPE"));
  cb(null, true);
};

const workerDocUpload = multer({
  storage: makeDocStorage("worker-documents"),
  fileFilter: docFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── Privatni fajlovi ─────────────────────────────────────────────────────────
// NISU pod javnim /uploads static mountom: PK Freelancer prilozi (ovjereni AMS
// obrasci sa šaltera, dokazi uplata iz banke) su lični dokumenti i služe se
// isključivo kroz kontroler sa provjerom vlasništva.
const PRIVATE_ROOT = path.join(__dirname, "..", "..", "uploads-private");

function makePrivateStorage(subdir, dozvoljeneExt) {
  const dir = path.join(PRIVATE_ROOT, subdir);
  ensureDir(dir);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || "").toLowerCase();
      const safeExt = dozvoljeneExt.includes(ext) ? ext : ".bin";
      const stamp = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      cb(null, `${stamp}${safeExt}`);
    },
  });
}

const freelancerPrilogFilter = (_req, file, cb) => {
  const ok = ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
    file.mimetype,
  );
  if (!ok) return cb(new Error("INVALID_DOC_TYPE"));
  cb(null, true);
};

const freelancerPrilogUpload = multer({
  storage: makePrivateStorage("freelancer-prilozi", [
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
  ]),
  fileFilter: freelancerPrilogFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function publicUrlFor(subdir, filename) {
  return `/uploads/${subdir}/${filename}`;
}

function absPathFor(relUrl) {
  if (!relUrl) return null;
  const rel = relUrl.startsWith("/uploads/") ? relUrl.slice("/uploads/".length) : relUrl;
  return path.join(UPLOADS_ROOT, rel);
}

function safeUnlink(absPath) {
  if (!absPath) return;
  try {
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch (e) {
    console.warn("safeUnlink failed:", e?.message || e);
  }
}

module.exports = {
  UPLOADS_ROOT,
  PRIVATE_ROOT,
  freelancerPrilogUpload,
  logoUpload,
  memorandumUpload,
  vijestiUpload,
  avatarUpload,
  workerDocUpload,
  publicUrlFor,
  absPathFor,
  safeUnlink,
};
