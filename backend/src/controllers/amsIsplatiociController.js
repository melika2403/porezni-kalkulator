// Adresar isplatilaca za AMS-1035. Vezan samo za korisnika (userId), bez veze
// sa organizacijama i klijentima. Dostupan svakom prijavljenom korisniku, bez
// pretplate: ovo je razlog da se neko registruje, ne funkcija paketa.
// PK Freelancer (paket/proba/viši paket) skida limit od 5 isplatilaca.
const { AmsIsplatilac } = require("../models/index");
const { getFreelancerAccess } = require("../services/freelancerAccess");

// Koliko isplatilaca BESPLATNI korisnik smije imati. Server je taj koji drži
// pravilo, frontend samo ranije javi da je popunjeno.
const LIMIT_ISPLATILACA = 5;

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function ocisti(value, maxLen) {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

function normalizePayload(body) {
  const naziv = ocisti(body?.naziv, 255);
  return {
    errors: naziv ? [] : ["Naziv isplatioca je obavezan."],
    data: {
      naziv,
      adresa: ocisti(body?.adresa, 255),
      grad: ocisti(body?.grad, 120),
      drzava: ocisti(body?.drzava, 120),
    },
  };
}

async function list(req, res) {
  const items = await AmsIsplatilac.findAll({
    where: { userId: req.user.id },
    order: [["updatedAt", "DESC"]],
  });
  return res.json({ ok: true, data: items });
}

async function create(req, res) {
  const { errors, data } = normalizePayload(req.body);
  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors.join(" ") });
  }
  const broj = await AmsIsplatilac.count({ where: { userId: req.user.id } });
  if (broj >= LIMIT_ISPLATILACA) {
    const pristup = await getFreelancerAccess(req.user);
    if (!pristup.hasAccess) {
      return res.status(409).json({
        ok: false,
        error: "LIMIT_REACHED",
        data: { limit: LIMIT_ISPLATILACA },
      });
    }
  }
  const created = await AmsIsplatilac.create({ ...data, userId: req.user.id });
  return res.status(201).json({ ok: true, data: created });
}

async function update(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const { errors, data } = normalizePayload(req.body);
  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors.join(" ") });
  }
  // tuđi zapis se ne razlikuje od nepostojećeg
  const zapis = await AmsIsplatilac.findOne({
    where: { id, userId: req.user.id },
  });
  if (!zapis) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await zapis.update(data);
  return res.json({ ok: true, data: zapis });
}

async function remove(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const deleted = await AmsIsplatilac.destroy({
    where: { id, userId: req.user.id },
  });
  if (!deleted) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  return res.json({ ok: true, data: { id } });
}

module.exports = { list, create, update, remove, LIMIT_ISPLATILACA };
