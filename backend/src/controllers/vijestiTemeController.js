// Rasprave: teme koje otvaraju korisnici (pitanja i razmjena iskustava).
// Odgovori idu kroz postojeći sistem komentara (vijestiKomentariController,
// vijesti_komentari.temaId), pa ovdje žive samo teme i njihova pravila.
const { Op } = require("sequelize");
const { VijestTema, VijestKomentar, User } = require("../models/index");
const { RUBRIKA_IDS } = require("../config/vijesti");
const { napraviSlug } = require("../utils/vijestiHtml");
const { potpis } = require("./vijestiKomentariController");
const { zabiljezi } = require("./vijestiObavjestenjaController");

const VRSTE = ["PITANJE", "RASPRAVA"];
const MIN_NASLOV = 10;
const MIN_TEKST = 20;
const MAX_TEKST = 10000;
// koliko dugo autor smije mijenjati svoj tekst (isto kao za komentare)
const IZMJENA_MINUTA = 15;
// zaštita od navale: koliko tema jedan korisnik smije otvoriti u satu
const LIMIT_TEMA_SAT = 3;
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless/i;

const AUTOR_ATRIBUTI = [
  "id",
  "firstName",
  "lastName",
  "javnoIme",
  "koristiPunoIme",
  "role",
  "avatarUrl",
];

// Redoslijedi liste tema. "aktivnost" je podrazumijevani (prikvačene na vrhu),
// "zadnje" koristi blok na naslovnoj, ostalo bira korisnik u listi rasprava.
const SORTIRANJA = {
  aktivnost: [
    ["prikvacena", "DESC"],
    ["zadnjaAktivnost", "DESC"],
  ],
  zadnje: [["zadnjaAktivnost", "DESC"]],
  najnovije: [["createdAt", "DESC"]],
  najstarije: [["createdAt", "ASC"]],
  popularne: [
    ["brojPregleda", "DESC"],
    ["zadnjaAktivnost", "DESC"],
  ],
  odgovori: [
    ["brojOdgovora", "DESC"],
    ["zadnjaAktivnost", "DESC"],
  ],
};

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function javnaTema(t, { saTekstom = false } = {}) {
  return {
    id: t.id,
    slug: t.slug,
    naslov: t.naslov,
    vrsta: t.vrsta,
    rubrika: t.rubrika,
    brojOdgovora: t.brojOdgovora,
    brojPregleda: t.brojPregleda,
    prikvacena: t.prikvacena,
    zakljucana: t.zakljucana,
    rijesena: !!t.prihvaceniOdgovorId,
    prihvaceniOdgovorId: t.prihvaceniOdgovorId,
    zadnjaAktivnost: t.zadnjaAktivnost,
    createdAt: t.createdAt,
    autor: {
      id: t.autor?.id ?? null,
      potpis: potpis(t.autor),
      sluzbeni: t.autor?.role === "ADMIN",
      avatar: t.autor?.avatarUrl ?? null,
    },
    ...(saTekstom ? { tekst: t.tekst } : {}),
  };
}

// GET /api/rasprave?vrsta=&rubrika=&filter=rijesene&q=&sort=&page=&limit=
async function lista(req, res) {
  const where = { status: "OBJAVLJENA" };
  const vrsta = String(req.query.vrsta || "");
  if (VRSTE.includes(vrsta)) where.vrsta = vrsta;
  const rubrika = String(req.query.rubrika || "");
  if (RUBRIKA_IDS.includes(rubrika)) where.rubrika = rubrika;
  if (String(req.query.filter || "") === "rijesene") {
    where.prihvaceniOdgovorId = { [Op.ne]: null };
  }
  // živa pretraga: traži se po naslovu i tekstu teme (MySQL LIKE je nad ci
  // kolacijom, pa je velika/mala slova svejedno)
  const q = String(req.query.q || "").trim().slice(0, 80);
  if (q) {
    const uzorak = { [Op.like]: `%${q.replace(/[%_\\]/g, "\\$&")}%` };
    where[Op.or] = [{ naslov: uzorak }, { tekst: uzorak }];
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 25));

  // "zadnje": čisto po aktivnosti, bez prikvačenih na vrhu (blok na naslovnoj
  // uvijek pokazuje posljednje žive teme, ne staru prikvačenu obavijest)
  // hasOwnProperty guard: bez njega bi ?sort=constructor dohvatio naslijeđeno
  // svojstvo sa Object.prototype i srušio upit
  const sort = String(req.query.sort || "");
  const order = Object.prototype.hasOwnProperty.call(SORTIRANJA, sort)
    ? SORTIRANJA[sort]
    : SORTIRANJA.aktivnost;

  const { rows, count } = await VijestTema.findAndCountAll({
    where,
    order,
    offset: (page - 1) * limit,
    limit,
    include: [{ model: User, as: "autor", attributes: AUTOR_ATRIBUTI }],
  });
  return res.json({
    ok: true,
    data: { items: rows.map((t) => javnaTema(t)), total: count, page, limit },
  });
}

// GET /api/rasprave/:slug
async function detalj(req, res) {
  const slug = String(req.params.slug || "").slice(0, 180);
  const t = await VijestTema.findOne({
    where: { slug, status: { [Op.ne]: "OBRISANA" } },
    include: [{ model: User, as: "autor", attributes: AUTOR_ATRIBUTI }],
  });
  if (!t || t.status === "SAKRIVENA") {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  // pregled se broji ovdje (teme se ne keširaju agresivno kao članci)
  if (!BOT.test(String(req.get("user-agent") || ""))) {
    VijestTema.increment("brojPregleda", { by: 1, where: { id: t.id } }).catch(
      () => {},
    );
  }
  return res.json({ ok: true, data: javnaTema(t, { saTekstom: true }) });
}

// POST /api/rasprave  { naslov, tekst, vrsta, rubrika? }
async function kreiraj(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
  if (user.komentariBlokiran) {
    return res.status(403).json({ ok: false, error: "BLOKIRAN" });
  }
  // isti uslov kao za komentare: potpis se bira prije prve objave
  if (!user.javnoIme && !user.koristiPunoIme) {
    return res.status(409).json({ ok: false, error: "POTPIS_NIJE_IZABRAN" });
  }

  const naslov = String(req.body?.naslov || "").trim().slice(0, 255);
  const tekst = String(req.body?.tekst || "").trim().slice(0, MAX_TEKST);
  if (naslov.length < MIN_NASLOV) {
    return res.status(400).json({ ok: false, error: "KRATAK_NASLOV" });
  }
  if (tekst.length < MIN_TEKST) {
    return res.status(400).json({ ok: false, error: "KRATAK_TEKST" });
  }
  const linkova = (tekst.match(/https?:\/\//gi) || []).length;
  if (linkova > 3) {
    return res.status(400).json({ ok: false, error: "PREVISE_LINKOVA" });
  }

  const prijeSata = new Date(Date.now() - 60 * 60 * 1000);
  const uSatu = await VijestTema.count({
    where: { autorId: user.id, createdAt: { [Op.gte]: prijeSata } },
  });
  if (uSatu >= LIMIT_TEMA_SAT) {
    return res.status(429).json({ ok: false, error: "PREVISE" });
  }

  const vrsta = VRSTE.includes(req.body?.vrsta) ? req.body.vrsta : "PITANJE";
  const rubrika = RUBRIKA_IDS.includes(req.body?.rubrika)
    ? req.body.rubrika
    : null;

  // jedinstven slug iz naslova
  const osnovni = napraviSlug(naslov) || `tema-${Date.now()}`;
  let slug = osnovni;
  for (let n = 2; ; n += 1) {
    const zauzet = await VijestTema.findOne({ where: { slug }, attributes: ["id"] });
    if (!zauzet) break;
    slug = `${osnovni}-${n}`;
  }

  const t = await VijestTema.create({
    slug,
    naslov,
    tekst,
    vrsta,
    rubrika,
    autorId: user.id,
    zadnjaAktivnost: new Date(),
  });
  return res.status(201).json({ ok: true, data: { id: t.id, slug: t.slug } });
}

// PUT /api/rasprave/:slug/tekst  { tekst }
// Admin mijenja tekst svake teme bilo kad (moderacija); autor svoju temu samo
// u prvih IZMJENA_MINUTA od objave, poslije toga tekst stoji kakav je.
async function izmijeniTekst(req, res) {
  const slug = String(req.params.slug || "").slice(0, 180);
  const t = await VijestTema.findOne({
    where: { slug, status: { [Op.ne]: "OBRISANA" } },
  });
  if (!t) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const jeAdmin = req.user.role === "ADMIN";
  if (!jeAdmin) {
    if (t.autorId !== req.user.id) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    const proslo = (Date.now() - new Date(t.createdAt).getTime()) / 60000;
    if (proslo > IZMJENA_MINUTA) {
      return res.status(403).json({ ok: false, error: "ISTEKLO_VRIJEME" });
    }
    // blokada komentarisanja vrijedi i ovdje
    const user = await User.findByPk(req.user.id, {
      attributes: ["komentariBlokiran"],
    });
    if (user?.komentariBlokiran) {
      return res.status(403).json({ ok: false, error: "BLOKIRAN" });
    }
  }

  const tekst = String(req.body?.tekst || "").trim().slice(0, MAX_TEKST);
  if (tekst.length < MIN_TEKST) {
    return res.status(400).json({ ok: false, error: "KRATAK_TEKST" });
  }
  const linkova = (tekst.match(/https?:\/\//gi) || []).length;
  if (!jeAdmin && linkova > 3) {
    return res.status(400).json({ ok: false, error: "PREVISE_LINKOVA" });
  }

  await t.update({ tekst });
  return res.json({ ok: true, data: { slug: t.slug } });
}

// POST /api/rasprave/:slug/prihvati  { komentarId }
// Najbolji odgovor označava autor pitanja ili admin; isti id ponovo = poništenje.
async function prihvatiOdgovor(req, res) {
  const slug = String(req.params.slug || "").slice(0, 180);
  const t = await VijestTema.findOne({ where: { slug } });
  if (!t || t.status === "OBRISANA") {
    return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  }
  const jeAdmin = req.user.role === "ADMIN";
  if (t.autorId !== req.user.id && !jeAdmin) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }
  const komentarId = parseId(req.body?.komentarId);
  if (!komentarId) return res.status(400).json({ ok: false, error: "Invalid id" });

  if (t.prihvaceniOdgovorId === komentarId) {
    await t.update({ prihvaceniOdgovorId: null });
    return res.json({ ok: true, data: { prihvaceniOdgovorId: null } });
  }
  const k = await VijestKomentar.findOne({
    where: { id: komentarId, temaId: t.id, status: "OBJAVLJEN" },
    attributes: ["id", "userId"],
  });
  if (!k) return res.status(400).json({ ok: false, error: "NEPOZNAT_ODGOVOR" });
  await t.update({ prihvaceniOdgovorId: komentarId });
  // autoru odgovora: njegov odgovor je postao rješenje
  await zabiljezi({
    userId: k.userId,
    tip: "RJESENJE",
    akterId: req.user.id,
    komentarId,
    temaId: t.id,
  });
  return res.json({ ok: true, data: { prihvaceniOdgovorId: komentarId } });
}

// POST /api/rasprave/:slug/admin  { radnja }
async function adminRadnja(req, res) {
  const slug = String(req.params.slug || "").slice(0, 180);
  const t = await VijestTema.findOne({ where: { slug } });
  if (!t) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const radnja = String(req.body?.radnja || "");
  const izmjene = {
    PRIKVACI: { prikvacena: true },
    OTKVACI: { prikvacena: false },
    ZAKLJUCAJ: { zakljucana: true },
    OTKLJUCAJ: { zakljucana: false },
    SAKRIJ: { status: "SAKRIVENA" },
    VRATI: { status: "OBJAVLJENA" },
    OBRISI: { status: "OBRISANA" },
  }[radnja];
  if (!izmjene) return res.status(400).json({ ok: false, error: "NEPOZNATA_RADNJA" });

  await t.update(izmjene);
  return res.json({ ok: true, data: { slug: t.slug, radnja } });
}

module.exports = {
  lista,
  detalj,
  kreiraj,
  izmijeniTekst,
  prihvatiOdgovor,
  adminRadnja,
};
