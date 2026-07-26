// Komentari ispod vijesti i vodiča.
//
// Pravila (dogovorena):
//  - piše samo prijavljen korisnik, čita svako;
//  - odgovori jedan nivo duboko;
//  - glasovi plus i minus, jedan glas po korisniku i komentaru;
//  - naknadna moderacija: komentar se odmah vidi, a tri prijave ga sakriju
//    dok admin ne presudi;
//  - naši komentari (ADMIN) nose oznaku, da se službeni odgovor razlikuje.
const { Op, fn, col, literal } = require("sequelize");
const {
  VijestClanak,
  VijestKomentar,
  VijestGlas,
  VijestPrijava,
  VijestTema,
  User,
  sequelize,
} = require("../models/index");
const { publicUrlFor, absPathFor, safeUnlink } = require("../utils/uploads");
const {
  zabiljezi,
  zabiljeziGlas,
} = require("./vijestiObavjestenjaController");
const { OBJAVLJENO } = require("./vijestiController");

const MAX_DUZINA = 3000;
const MIN_DUZINA = 3;
const PRIJAVA_SAKRIVA = 3;
// zaštita od navale: koliko komentara smije u minuti i u satu
const LIMIT_MINUTA = 3;
const LIMIT_SAT = 15;
// koliko dugo se vlastiti komentar smije mijenjati
const IZMJENA_MINUTA = 15;
// spam filter: komentar koji je uglavnom linkovi
const MAX_LINKOVA = 2;
// koliko komentara ide u jednoj stranici liste
const LIMIT_STRANICE = 50;

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Potpis korisnika: korisničko ime ili ime sa profila, po njegovom izboru. */
function potpis(u) {
  if (!u) return "Korisnik";
  if (u.koristiPunoIme) {
    const ime = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    if (ime) return ime;
  }
  return u.javnoIme || u.firstName || "Korisnik";
}

// ── Zaštita od lažnog predstavljanja ────────────────────────────────────────
// Korisničko ime ne smije ličiti na nalog redakcije ni na službene funkcije.
// Poredi se "spljošteno" ime (bez razmaka, tačaka, crtica i dijakritike), pa
// "p0rezni.kalkulator" i "Porezni-Kalkulator" padaju na istoj provjeri.
const ZABRANJENI_DIJELOVI = [
  "poreznikalkulator",
  "porezni kalkulator",
  "pkoffice",
  "pk office",
];
const ZABRANJENA_IMENA = [
  "admin",
  "administrator",
  "redakcija",
  "urednik",
  "moderator",
  "podrska",
  "support",
  "sluzbeno",
  "official",
  "pk",
];

function spljosti(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/č|ć/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "d")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/[^a-z]/g, "");
}

function imeJeZabranjeno(ime) {
  const p = spljosti(ime);
  if (!p) return true;
  if (ZABRANJENA_IMENA.some((z) => p === spljosti(z))) return true;
  return ZABRANJENI_DIJELOVI.some((z) => p.includes(spljosti(z)));
}

function javniKomentar(k, { mojGlas = 0, jaSamAutor = false, jeAdmin = false } = {}) {
  const sakriven = k.status === "SAKRIVEN";
  return {
    id: k.id,
    roditeljId: k.roditeljId,
    // sakriven komentar ostaje u niti, ali bez teksta (kao "skupljen" na
    // portalima), da se rasprava ne raspadne
    tekst: sakriven ? null : k.tekst,
    sakriven,
    glasovi: k.glasovi,
    createdAt: k.createdAt,
    izmijenjen: k.updatedAt > k.createdAt,
    autor: {
      id: k.autor?.id ?? null,
      potpis: potpis(k.autor),
      sluzbeni: k.autor?.role === "ADMIN",
      avatar: k.autor?.avatarUrl ?? null,
    },
    mojGlas,
    // admin može izmijeniti, sakriti i obrisati bilo koji komentar direktno
    // sa članka, da ne mora otvarati moderaciju za očigledne slučajeve
    mogu: {
      izmjena: jaSamAutor || jeAdmin,
      brisanje: jaSamAutor || jeAdmin,
      moderacija: jeAdmin,
    },
  };
}

// Brojač komentara pripada članku (brojKomentara) ili temi (brojOdgovora), već
// prema tome gdje komentar živi. Oduzimanje ide kroz GREATEST(..., 0): kolone
// su UNSIGNED, pa bi ispod nule MySQL u strict modu digao grešku 1690 umjesto
// da samo pokvari brojku.
async function pomjeriBrojac(k, delta) {
  if (!delta) return;
  const [model, kolona, id] = k.temaId
    ? [VijestTema, "brojOdgovora", k.temaId]
    : [VijestClanak, "brojKomentara", k.clanakId];
  if (!id) return;
  const izraz =
    delta > 0
      ? literal(`\`${kolona}\` + ${delta}`)
      : literal(`GREATEST(CAST(\`${kolona}\` AS SIGNED) - ${-delta}, 0)`);
  await model.update({ [kolona]: izraz }, { where: { id } });
}

// Komentar živi ili ispod članka ili ispod teme rasprave; isti kod, različit
// roditelj. "cilj" je { kolona: 'clanakId'|'temaId', id }.
async function nadjiCilj(slug, tip) {
  if (tip === "tema") {
    const tema = await VijestTema.findOne({
      where: { slug, status: { [Op.ne]: "OBRISANA" } },
      attributes: ["id", "zakljucana", "autorId"],
    });
    return tema
      ? {
          kolona: "temaId",
          id: tema.id,
          zakljucana: tema.zakljucana,
          autorId: tema.autorId,
        }
      : null;
  }
  // samo javno vidljiv tekst prima komentare: inače bi se pogađanjem sluga
  // moglo komentarisati nacrt ili arhivirani tekst, a ti komentari se onda
  // vide na javnom profilu korisnika zajedno sa naslovom neobjavljenog teksta
  const clanak = await VijestClanak.findOne({
    where: { slug, ...OBJAVLJENO() },
    attributes: ["id"],
  });
  return clanak ? { kolona: "clanakId", id: clanak.id, zakljucana: false } : null;
}

// GET /api/vijesti/:slug/komentari  i  GET /api/rasprave/:slug/odgovori
async function listaCore(req, res, tip) {
  const slug = String(req.params.slug || "").slice(0, 180);
  const cilj = await nadjiCilj(slug, tip);
  if (!cilj) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const sort = String(req.query.sort || "novi");
  const redoslijed =
    sort === "korisni"
      ? [
          ["glasovi", "DESC"],
          ["createdAt", "ASC"],
        ]
      : [["createdAt", "ASC"]];

  // Stranica se broji po korijenskim komentarima, a odgovori idu uz svoj
  // korijen: da se nit ne prelomi na pola, odgovori se ne paginiraju zasebno.
  const page = Math.max(1, Number(req.query.page) || 1);
  const osnovni = { [cilj.kolona]: cilj.id, status: { [Op.ne]: "OBRISAN" } };
  const autorInclude = {
    model: User,
    as: "autor",
    attributes: [
      "id",
      "firstName",
      "lastName",
      "javnoIme",
      "koristiPunoIme",
      "role",
      "avatarUrl",
    ],
  };

  // ukupno je za zaglavlje ("Komentari (12)"), ukupnoKorijena za "ima još"
  const [ukupno, ukupnoKorijena, korijeniRedovi] = await Promise.all([
    VijestKomentar.count({ where: osnovni }),
    VijestKomentar.count({ where: { ...osnovni, roditeljId: null } }),
    VijestKomentar.findAll({
      where: { ...osnovni, roditeljId: null },
      order: redoslijed,
      offset: (page - 1) * LIMIT_STRANICE,
      limit: LIMIT_STRANICE,
      include: [autorInclude],
    }),
  ]);

  const odgovoriRedovi =
    korijeniRedovi.length > 0
      ? await VijestKomentar.findAll({
          where: {
            ...osnovni,
            roditeljId: { [Op.in]: korijeniRedovi.map((k) => k.id) },
          },
          order: [["createdAt", "ASC"]],
          include: [autorInclude],
        })
      : [];

  const komentari = [...korijeniRedovi, ...odgovoriRedovi];

  // glasovi prijavljenog korisnika, da dugmad odmah pokažu njegov izbor
  let mojiGlasovi = new Map();
  const userId = req.user?.id ?? null;
  if (userId && komentari.length > 0) {
    const glasovi = await VijestGlas.findAll({
      where: { userId, komentarId: { [Op.in]: komentari.map((k) => k.id) } },
      raw: true,
    });
    mojiGlasovi = new Map(glasovi.map((g) => [g.komentarId, g.vrijednost]));
  }

  const jeAdmin = req.user?.role === "ADMIN";
  const svi = komentari.map((k) =>
    javniKomentar(k, {
      mojGlas: mojiGlasovi.get(k.id) ?? 0,
      jaSamAutor: userId != null && k.userId === userId,
      jeAdmin,
    }),
  );
  // niti: odgovori idu pod svoj komentar (jedan nivo)
  const korijeni = svi.filter((k) => !k.roditeljId);
  const odgovori = svi.filter((k) => k.roditeljId);
  const stablo = korijeni.map((k) => ({
    ...k,
    odgovori: odgovori.filter((o) => o.roditeljId === k.id),
  }));

  return res.json({
    ok: true,
    data: {
      // ukupno je broj svih komentara ispod teksta, ne samo ove stranice
      ukupno,
      komentari: stablo,
      zakljucana: cilj.zakljucana,
      page,
      limit: LIMIT_STRANICE,
      imaJos: page * LIMIT_STRANICE < ukupnoKorijena,
    },
  });
}

const lista = (req, res) => listaCore(req, res, "clanak");
const listaTeme = (req, res) => listaCore(req, res, "tema");

/** Pravila za sam tekst komentara. Vrijede i pri pisanju i pri izmjeni, inače
 *  se objavi bezopasan komentar pa se u roku za izmjenu pretvori u spam. */
function provjeriTekst(tekst) {
  if (tekst.length < MIN_DUZINA) return "PREKRATAK";
  const linkova = (tekst.match(/https?:\/\//gi) || []).length;
  if (linkova > MAX_LINKOVA) return "PREVISE_LINKOVA";
  return null;
}

async function provjeriUcestalost(userId) {
  const prijeMinute = new Date(Date.now() - 60 * 1000);
  const prijeSata = new Date(Date.now() - 60 * 60 * 1000);
  const [uMinuti, uSatu] = await Promise.all([
    VijestKomentar.count({ where: { userId, createdAt: { [Op.gte]: prijeMinute } } }),
    VijestKomentar.count({ where: { userId, createdAt: { [Op.gte]: prijeSata } } }),
  ]);
  if (uMinuti >= LIMIT_MINUTA) return "PREBRZO";
  if (uSatu >= LIMIT_SAT) return "PREVISE";
  return null;
}

// POST /api/vijesti/:slug/komentari  i  POST /api/rasprave/:slug/odgovori
async function dodajCore(req, res, tip) {
  const slug = String(req.params.slug || "").slice(0, 180);
  const cilj = await nadjiCilj(slug, tip);
  if (!cilj) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  if (cilj.zakljucana) {
    return res.status(403).json({ ok: false, error: "ZAKLJUCANA" });
  }

  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
  if (user.komentariBlokiran) {
    return res.status(403).json({ ok: false, error: "BLOKIRAN" });
  }
  // potpis se bira prije prvog komentara (korisničko ime ili ime sa profila)
  if (!user.javnoIme && !user.koristiPunoIme) {
    return res.status(409).json({ ok: false, error: "POTPIS_NIJE_IZABRAN" });
  }

  const tekst = String(req.body?.tekst || "").trim().slice(0, MAX_DUZINA);
  const problem = provjeriTekst(tekst);
  if (problem) return res.status(400).json({ ok: false, error: problem });

  const ogranicenje = await provjeriUcestalost(user.id);
  if (ogranicenje) {
    return res.status(429).json({ ok: false, error: ogranicenje });
  }

  // odgovor ide samo na komentar istog članka/teme, i to jedan nivo duboko
  let roditeljId = parseId(req.body?.roditeljId);
  let roditeljVlasnik = null;
  if (roditeljId) {
    const roditelj = await VijestKomentar.findOne({
      where: { id: roditeljId, [cilj.kolona]: cilj.id },
      attributes: ["id", "roditeljId", "userId"],
    });
    if (!roditelj) return res.status(400).json({ ok: false, error: "NEPOZNAT_RODITELJ" });
    roditeljId = roditelj.roditeljId || roditelj.id;
    roditeljVlasnik = roditelj.userId;
  }

  const k = await VijestKomentar.create({
    [cilj.kolona]: cilj.id,
    userId: user.id,
    roditeljId: roditeljId || null,
    tekst,
  });
  if (tip === "tema") {
    // živa tema ide na vrh liste rasprava
    await VijestTema.update(
      { zadnjaAktivnost: new Date() },
      { where: { id: cilj.id } },
    );
    await VijestTema.increment("brojOdgovora", { by: 1, where: { id: cilj.id } });
  } else {
    await VijestClanak.increment("brojKomentara", { by: 1, where: { id: cilj.id } });
  }

  // obavještenja: odgovor na komentar ide vlasniku komentara, direktan odgovor
  // u temi njenom autoru (nikad samom sebi, to filtrira zabiljezi)
  if (roditeljVlasnik) {
    await zabiljezi({
      userId: roditeljVlasnik,
      tip: "ODGOVOR_KOMENTAR",
      akterId: user.id,
      komentarId: k.id,
    });
  } else if (tip === "tema" && cilj.autorId) {
    await zabiljezi({
      userId: cilj.autorId,
      tip: "ODGOVOR_TEMA",
      akterId: user.id,
      komentarId: k.id,
      temaId: cilj.id,
    });
  }

  k.autor = user;
  return res.status(201).json({
    ok: true,
    data: javniKomentar(k, { jaSamAutor: true }),
  });
}

const dodaj = (req, res) => dodajCore(req, res, "clanak");
const dodajTeme = (req, res) => dodajCore(req, res, "tema");

// PUT /api/vijesti/komentari/:id  { tekst }
// Autor mijenja svoj komentar u prvih IZMJENA_MINUTA; admin bilo koji, bilo kad
// (moderacija: uklanjanje broja telefona iz komentara i slično).
async function izmijeni(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const jeAdmin = req.user.role === "ADMIN";
  const k = await VijestKomentar.findOne({
    where: jeAdmin ? { id } : { id, userId: req.user.id },
  });
  if (!k || k.status === "OBRISAN") {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  if (!jeAdmin) {
    const proslo = (Date.now() - new Date(k.createdAt).getTime()) / 60000;
    if (proslo > IZMJENA_MINUTA) {
      return res.status(403).json({ ok: false, error: "ISTEKLO_VRIJEME" });
    }
    // blokada vrijedi i za izmjenu: ko je blokiran ne smije mijenjati ni ono
    // što je napisao prije blokade
    const user = await User.findByPk(req.user.id, {
      attributes: ["komentariBlokiran"],
    });
    if (user?.komentariBlokiran) {
      return res.status(403).json({ ok: false, error: "BLOKIRAN" });
    }
  }
  const tekst = String(req.body?.tekst || "").trim().slice(0, MAX_DUZINA);
  const problem = provjeriTekst(tekst);
  if (problem) return res.status(400).json({ ok: false, error: problem });

  await k.update({ tekst });
  return res.json({ ok: true, data: { id: k.id } });
}

// DELETE /api/vijesti/komentari/:id
// Vlastiti komentar briše autor, a admin bilo koji (moderacija na licu mjesta).
async function obrisi(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const jeAdmin = req.user?.role === "ADMIN";
  const where = jeAdmin ? { id } : { id, userId: req.user.id };
  const k = await VijestKomentar.findOne({ where });
  if (!k || k.status === "OBRISAN") {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  await k.update({ status: "OBRISAN" });
  await pomjeriBrojac(k, -1);
  return res.json({ ok: true, data: { id } });
}

// POST /api/vijesti/admin/clanak/:slug/korisnik/:userId/obrisi-sve
// Brisanje svih komentara jednog korisnika ispod jednog teksta: kad neko
// zaspama raspravu, nema smisla klikati komentar po komentar.
async function adminObrisiSveKorisnika(req, res) {
  const slug = String(req.params.slug || "").slice(0, 180);
  const userId = parseId(req.params.userId);
  if (!userId) return res.status(400).json({ ok: false, error: "Invalid id" });
  const clanak = await VijestClanak.findOne({ where: { slug }, attributes: ["id"] });
  if (!clanak) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const [broj] = await VijestKomentar.update(
    { status: "OBRISAN" },
    { where: { clanakId: clanak.id, userId, status: { [Op.ne]: "OBRISAN" } } },
  );
  if (broj > 0) {
    await pomjeriBrojac({ clanakId: clanak.id }, -broj);
  }
  return res.json({ ok: true, data: { obrisano: broj } });
}

// POST /api/vijesti/komentari/:id/glas  { vrijednost: 1 | -1 | 0 }
async function glasaj(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const vrijednost = Number(req.body?.vrijednost);
  if (![1, -1, 0].includes(vrijednost)) {
    return res.status(400).json({ ok: false, error: "NEISPRAVAN_GLAS" });
  }
  const k = await VijestKomentar.findByPk(id);
  if (!k || k.status === "OBRISAN") {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  if (k.userId === req.user.id) {
    return res.status(400).json({ ok: false, error: "VLASTITI_KOMENTAR" });
  }

  const postojeci = await VijestGlas.findOne({
    where: { komentarId: id, userId: req.user.id },
  });
  const stari = postojeci?.vrijednost ?? 0;
  if (stari === vrijednost) {
    return res.json({ ok: true, data: { glasovi: k.glasovi, mojGlas: stari } });
  }

  await sequelize.transaction(async (t) => {
    if (vrijednost === 0) {
      if (postojeci) await postojeci.destroy({ transaction: t });
    } else if (postojeci) {
      await postojeci.update({ vrijednost }, { transaction: t });
    } else {
      await VijestGlas.create(
        { komentarId: id, userId: req.user.id, vrijednost },
        { transaction: t },
      );
    }
    await VijestKomentar.increment(
      { glasovi: vrijednost - stari },
      { where: { id }, transaction: t },
    );
  });

  // obavještenje vlasniku komentara (agregirano po komentaru i smjeru glasa);
  // poništavanje glasa (0) ne šalje ništa
  if (vrijednost !== 0) {
    await zabiljeziGlas({
      userId: k.userId,
      akterId: req.user.id,
      komentarId: id,
      vrijednost,
    });
  }

  const svjez = await VijestKomentar.findByPk(id, { attributes: ["glasovi"] });
  return res.json({
    ok: true,
    data: { glasovi: svjez?.glasovi ?? 0, mojGlas: vrijednost },
  });
}

// POST /api/vijesti/komentari/:id/prijava  { razlog? }
async function prijavi(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const k = await VijestKomentar.findByPk(id);
  if (!k || k.status === "OBRISAN") {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  const [, nova] = await VijestPrijava.findOrCreate({
    where: { komentarId: id, userId: req.user.id },
    defaults: {
      komentarId: id,
      userId: req.user.id,
      razlog: String(req.body?.razlog || "").slice(0, 255) || null,
    },
  });
  if (!nova) return res.json({ ok: true, data: { vecPrijavljen: true } });

  const broj = k.brojPrijava + 1;
  const izmjene = { brojPrijava: broj };
  // tri prijave sakriju komentar dok admin ne presudi
  if (broj >= PRIJAVA_SAKRIVA && k.status === "OBJAVLJEN") {
    izmjene.status = "SAKRIVEN";
  }
  await k.update(izmjene);
  return res.json({ ok: true, data: { prijavljen: true, sakriven: !!izmjene.status } });
}

// GET /api/vijesti/korisnik/:id : javni profil komentatora
async function javniProfil(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const u = await User.findByPk(id, {
    attributes: [
      "id",
      "firstName",
      "lastName",
      "javnoIme",
      "koristiPunoIme",
      "role",
      "avatarUrl",
      "createdAt",
    ],
  });
  if (!u) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  // profil postoji tek kad korisnik izabere potpis (dakle kad je komentarisao)
  if (!u.javnoIme && !u.koristiPunoIme) {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }

  // Prikazuje se zadnjih 100, ali brojka mora biti stvarna: inače aktivan
  // korisnik zauvijek piše "100 komentara".
  const ukupnoKomentara = await VijestKomentar.count({
    where: { userId: id, status: "OBJAVLJEN" },
  });
  const komentari = await VijestKomentar.findAll({
    where: { userId: id, status: "OBJAVLJEN" },
    order: [["createdAt", "DESC"]],
    limit: 100,
    include: [
      {
        model: VijestClanak,
        as: "clanak",
        attributes: ["id", "slug", "naslov", "tip"],
      },
      { model: VijestTema, as: "tema", attributes: ["id", "slug", "naslov"] },
    ],
  });

  return res.json({
    ok: true,
    data: {
      korisnik: {
        id: u.id,
        potpis: potpis(u),
        sluzbeni: u.role === "ADMIN",
        avatar: u.avatarUrl,
        clanOd: u.createdAt,
        brojKomentara: ukupnoKomentara,
      },
      komentari: komentari.map((k) => ({
        id: k.id,
        tekst: k.tekst,
        glasovi: k.glasovi,
        createdAt: k.createdAt,
        clanak: k.clanak
          ? { slug: k.clanak.slug, naslov: k.clanak.naslov, tip: k.clanak.tip }
          : null,
        tema: k.tema ? { slug: k.tema.slug, naslov: k.tema.naslov } : null,
      })),
    },
  });
}

// POST /api/vijesti/komentari/potpis  { javnoIme } ili { koristiPunoIme: true }
async function postaviPotpis(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });

  if (req.body?.koristiPunoIme === true) {
    const ime = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    if (!ime) return res.status(400).json({ ok: false, error: "PROFIL_BEZ_IMENA" });
    // ista zaštita brenda kao za korisničko ime: inače se "Porezni Kalkulator"
    // upiše kao ime i prezime na profilu pa prođe bez ijedne provjere
    if (user.role !== "ADMIN" && imeJeZabranjeno(ime)) {
      return res.status(400).json({ ok: false, error: "IME_REZERVISANO" });
    }
    await user.update({ koristiPunoIme: true });
    return res.json({ ok: true, data: { potpis: ime } });
  }

  const javnoIme = String(req.body?.javnoIme || "").trim().slice(0, 40);
  if (javnoIme.length < 3) {
    return res.status(400).json({ ok: false, error: "PREKRATKO_IME" });
  }
  if (!/^[\p{L}0-9 ._-]+$/u.test(javnoIme)) {
    return res.status(400).json({ ok: false, error: "NEDOZVOLJENI_ZNAKOVI" });
  }
  // zaštita brenda: niko se ne smije predstavljati kao redakcija
  if (user.role !== "ADMIN" && imeJeZabranjeno(javnoIme)) {
    return res.status(400).json({ ok: false, error: "IME_REZERVISANO" });
  }
  // Zvanično (zaštićeno) ime smiju dijeliti svi admini, da se cijela redakcija
  // potpisuje isto ("Porezni Kalkulator"). Samo se za taj slučaj preskače
  // provjera zauzetosti; admin sa običnim imenom prolazi redovnu provjeru.
  const dijeleRedakcijsko = user.role === "ADMIN" && imeJeZabranjeno(javnoIme);
  const zauzeto = dijeleRedakcijsko
    ? null
    : await User.findOne({
        where: { javnoIme, id: { [Op.ne]: user.id } },
        attributes: ["id"],
      });
  if (zauzeto) return res.status(409).json({ ok: false, error: "IME_ZAUZETO" });

  const staro = user.javnoIme;
  await user.update({ javnoIme, koristiPunoIme: false });

  // Kolona nema UNIQUE indeks (users je na MySQL limitu od 64 indeksa), pa dva
  // istovremena zahtjeva mogu proći obje provjere. Zato se poslije upisa još
  // jednom pogleda: ako je ime uzeo i neko sa manjim id-em, on ga i zadržava.
  const duplikat = dijeleRedakcijsko
    ? null
    : await User.findOne({
        where: { javnoIme, id: { [Op.lt]: user.id } },
        attributes: ["id"],
      });
  if (duplikat) {
    await user.update({ javnoIme: staro });
    return res.status(409).json({ ok: false, error: "IME_ZAUZETO" });
  }
  return res.json({ ok: true, data: { potpis: javnoIme } });
}

// GET /api/vijesti/komentari/moje-postavke : potpis i avatar prijavljenog
async function mojePostavke(req, res) {
  const u = await User.findByPk(req.user.id, {
    attributes: [
      "id",
      "firstName",
      "lastName",
      "javnoIme",
      "koristiPunoIme",
      "avatarUrl",
      "role",
      "komentariBlokiran",
    ],
  });
  if (!u) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
  return res.json({
    ok: true,
    data: {
      id: u.id,
      potpis: potpis(u),
      javnoIme: u.javnoIme,
      koristiPunoIme: u.koristiPunoIme,
      punoIme: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      avatar: u.avatarUrl,
      sluzbeni: u.role === "ADMIN",
      blokiran: u.komentariBlokiran,
      izabran: !!u.javnoIme || u.koristiPunoIme,
    },
  });
}

// POST /api/vijesti/komentari/avatar (multipart, polje "avatar")
async function postaviAvatar(req, res) {
  if (!req.file) return res.status(400).json({ ok: false, error: "Nema datoteke." });
  const u = await User.findByPk(req.user.id);
  if (!u) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
  const stara = u.avatarUrl;
  await u.update({ avatarUrl: publicUrlFor("avatari", req.file.filename) });
  // stara slika se briše da se disk ne puni starim avatarima
  if (stara) safeUnlink(absPathFor(stara));
  return res.json({ ok: true, data: { avatar: u.avatarUrl } });
}

// DELETE /api/vijesti/komentari/avatar
async function obrisiAvatar(req, res) {
  const u = await User.findByPk(req.user.id);
  if (!u) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
  const stara = u.avatarUrl;
  await u.update({ avatarUrl: null });
  if (stara) safeUnlink(absPathFor(stara));
  return res.json({ ok: true, data: { avatar: null } });
}

// ── Moderacija (admin) ──────────────────────────────────────────────────────

// GET /api/vijesti/admin/komentari?status=PRIJAVLJENI|SVI
async function adminLista(req, res) {
  const filter = String(req.query.status || "PRIJAVLJENI");
  // obrisani ispadaju iz oba filtera: obrisan a prijavljen komentar je gotov
  // slučaj, a ne posao koji čeka odluku
  const where =
    filter === "SVI"
      ? { status: { [Op.ne]: "OBRISAN" } }
      : {
          status: { [Op.ne]: "OBRISAN" },
          [Op.or]: [{ brojPrijava: { [Op.gt]: 0 } }, { status: "SAKRIVEN" }],
        };

  const komentari = await VijestKomentar.findAll({
    where,
    order: [
      ["brojPrijava", "DESC"],
      ["createdAt", "DESC"],
    ],
    limit: 200,
    include: [
      {
        model: User,
        as: "autor",
        attributes: ["id", "firstName", "lastName", "javnoIme", "koristiPunoIme", "role", "komentariBlokiran"],
      },
      { model: VijestClanak, as: "clanak", attributes: ["slug", "naslov", "tip"] },
      { model: VijestTema, as: "tema", attributes: ["slug", "naslov"] },
    ],
  });

  return res.json({
    ok: true,
    data: komentari.map((k) => ({
      id: k.id,
      tekst: k.tekst,
      status: k.status,
      glasovi: k.glasovi,
      brojPrijava: k.brojPrijava,
      createdAt: k.createdAt,
      autor: {
        id: k.autor?.id ?? null,
        potpis: potpis(k.autor),
        blokiran: !!k.autor?.komentariBlokiran,
      },
      clanak: k.clanak
        ? { slug: k.clanak.slug, naslov: k.clanak.naslov, tip: k.clanak.tip }
        : null,
      tema: k.tema ? { slug: k.tema.slug, naslov: k.tema.naslov } : null,
    })),
  });
}

// POST /api/vijesti/admin/komentari/:id/odluka  { odluka: "SAKRIJ"|"VRATI"|"OBRISI" }
async function adminOdluka(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const k = await VijestKomentar.findByPk(id);
  if (!k) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const odluka = String(req.body?.odluka || "");
  if (odluka === "SAKRIJ") await k.update({ status: "SAKRIVEN" });
  else if (odluka === "VRATI") await k.update({ status: "OBJAVLJEN", brojPrijava: 0 });
  else if (odluka === "OBRISI") {
    // već obrisan komentar se ne briše ponovo: svako ponavljanje bi oduzelo
    // još jedan od brojača, a odgovor u temi se broji na temi, ne na članku
    if (k.status !== "OBRISAN") {
      await k.update({ status: "OBRISAN" });
      await pomjeriBrojac(k, -1);
    }
  } else return res.status(400).json({ ok: false, error: "NEPOZNATA_ODLUKA" });

  return res.json({ ok: true, data: { id, status: k.status } });
}

// POST /api/vijesti/admin/korisnik/:id/blokada  { blokiran: boolean }
async function adminBlokada(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const u = await User.findByPk(id);
  if (!u) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await u.update({ komentariBlokiran: req.body?.blokiran === true });
  return res.json({ ok: true, data: { id, blokiran: u.komentariBlokiran } });
}

module.exports = {
  lista,
  listaTeme,
  dodaj,
  dodajTeme,
  izmijeni,
  obrisi,
  potpis,
  glasaj,
  prijavi,
  javniProfil,
  postaviPotpis,
  mojePostavke,
  postaviAvatar,
  obrisiAvatar,
  adminLista,
  adminOdluka,
  adminBlokada,
  adminObrisiSveKorisnika,
};
