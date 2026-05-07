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
  logoUpload,
  publicUrlFor,
  absPathFor,
  safeUnlink,
};
