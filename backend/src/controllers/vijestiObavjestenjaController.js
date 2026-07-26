// In-app obavještenja sekcije Vijesti (odgovori, glasovi, rješenja).
// Kreiranje ide kroz zabiljezi()/zabiljeziGlas() koje zovu kontroleri
// komentara i tema; čitanje ide kroz tri rute ispod.
const {
  VijestObavjestenje,
  VijestKomentar,
  VijestClanak,
  VijestTema,
  User,
} = require("../models/index");

const AKTER_ATRIBUTI = [
  "id",
  "firstName",
  "lastName",
  "javnoIme",
  "koristiPunoIme",
  "role",
  "avatarUrl",
];

/**
 * Upiši obavještenje. Nikad samom sebi; greška se guta jer obavještenje ne
 * smije oboriti radnju koja ga je izazvala.
 */
async function zabiljezi({ userId, tip, akterId, komentarId = null, temaId = null }) {
  try {
    if (!userId || userId === akterId) return;
    await VijestObavjestenje.create({ userId, tip, akterId, komentarId, temaId });
  } catch (e) {
    console.warn("vijesti obavjestenje nije upisano:", e?.message || e);
  }
}

/**
 * Glasovi se agregiraju: jedan red po (komentar, tip), brojač raste, a red se
 * vraća u nepročitano da značka ponovo zasvijetli.
 */
async function zabiljeziGlas({ userId, akterId, komentarId, vrijednost }) {
  try {
    if (!userId || userId === akterId) return;
    const tip = vrijednost === 1 ? "GLAS_PLUS" : "GLAS_MINUS";
    const [red, novo] = await VijestObavjestenje.findOrCreate({
      where: { userId, tip, komentarId },
      defaults: { userId, tip, akterId, komentarId },
    });
    if (!novo) {
      await red.update({
        brojac: red.brojac + 1,
        akterId,
        procitano: false,
      });
    }
  } catch (e) {
    console.warn("vijesti glas obavjestenje nije upisano:", e?.message || e);
  }
}

function potpisAktera(u) {
  if (!u) return "Korisnik";
  if (u.koristiPunoIme) {
    const ime = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    if (ime) return ime;
  }
  return u.javnoIme || u.firstName || "Korisnik";
}

// GET /api/vijesti/obavjestenja
async function lista(req, res) {
  const redovi = await VijestObavjestenje.findAll({
    where: { userId: req.user.id },
    order: [["updatedAt", "DESC"]],
    limit: 30,
    include: [
      { model: User, as: "akter", attributes: AKTER_ATRIBUTI },
      {
        model: VijestKomentar,
        as: "komentar",
        attributes: ["id", "tekst", "clanakId", "temaId"],
        include: [
          { model: VijestClanak, as: "clanak", attributes: ["slug", "naslov", "tip"] },
          { model: VijestTema, as: "tema", attributes: ["slug", "naslov"] },
        ],
      },
      { model: VijestTema, as: "tema", attributes: ["slug", "naslov"] },
    ],
  });

  const data = redovi.map((o) => {
    // odredište: komentar zna svoj članak ili temu; RJESENJE i ODGOVOR_TEMA
    // mogu nositi temu direktno
    const kTema = o.komentar?.tema || o.tema || null;
    const kClanak = o.komentar?.clanak || null;
    const link = kTema
      ? `/rasprave/${kTema.slug}#komentari`
      : kClanak
        ? `${kClanak.tip === "VODIC" ? "/vodici" : "/vijesti"}/${kClanak.slug}#komentari`
        : "/vijesti";
    return {
      id: o.id,
      tip: o.tip,
      brojac: o.brojac,
      procitano: o.procitano,
      vrijeme: o.updatedAt,
      akter: o.akter
        ? {
            id: o.akter.id,
            potpis: potpisAktera(o.akter),
            sluzbeni: o.akter.role === "ADMIN",
            avatar: o.akter.avatarUrl,
          }
        : null,
      izvod: o.komentar?.tekst ? String(o.komentar.tekst).slice(0, 120) : null,
      naslov: kTema?.naslov || kClanak?.naslov || null,
      link,
    };
  });

  return res.json({ ok: true, data });
}

// GET /api/vijesti/obavjestenja/broj
async function broj(req, res) {
  const n = await VijestObavjestenje.count({
    where: { userId: req.user.id, procitano: false },
  });
  return res.json({ ok: true, data: { neprocitano: n } });
}

// POST /api/vijesti/obavjestenja/procitaj
async function procitaj(req, res) {
  await VijestObavjestenje.update(
    { procitano: true },
    { where: { userId: req.user.id, procitano: false } },
  );
  return res.json({ ok: true, data: { neprocitano: 0 } });
}

// DELETE /api/vijesti/obavjestenja/:id
// Trajno uklanjanje jednog obavještenja (X u panelu ili na profilu).
async function ukloni(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  const n = await VijestObavjestenje.destroy({
    where: { id, userId: req.user.id },
  });
  if (n === 0) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  return res.json({ ok: true, data: { id } });
}

module.exports = { zabiljezi, zabiljeziGlas, lista, broj, procitaj, ukloni };
