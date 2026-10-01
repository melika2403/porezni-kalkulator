// Redakcijski sadržaj: vijesti (/vijesti) i vodiči (/vodici).
// Javni dio čita samo objavljeno, admin dio uređuje sve.
const { Op, fn, col, literal } = require("sequelize");
const {
  VijestClanak,
  VijestPregled,
  VijestKomentar,
  VijestGlas,
  VijestPrijava,
  VijestObavjestenje,
  Reklama,
  User,
  sequelize,
} = require("../models/index");
const {
  RUBRIKA_IDS,
  TIPOVI,
  MIN_RIJECI,
  SEO_LIMITI,
  SAZETAK_LIMITI,
} = require("../config/vijesti");
const {
  sanitizeHtml,
  htmlUTekst,
  brojRijeci,
  napraviSlug,
  nadjiSlicne,
} = require("../utils/vijestiHtml");
const { publicUrlFor } = require("../utils/uploads");

const RIJECI_PO_MINUTI = 200;
// koliko manjih kartica stoji uz vodeću vijest na naslovnoj
const MAX_IZDVOJENIH = 3;
const POZICIJE = ["VODECA", "IZDVOJENO", "OBICNO"];

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function trimOrNull(v, max) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function vrijemeCitanja(tekst) {
  const min = Math.max(1, Math.round(brojRijeci(tekst) / RIJECI_PO_MINUTI));
  return `${min} min`;
}

/** "GGGG-MM-DD" po lokalnom vremenu servera. Pregledi se upisuju po lokalnom
 *  danu, pa se i prozor "zadnjih N dana" mora računati isto: sa toISOString()
 *  bi za Sarajevo prozor promašio dan na svojoj ivici. */
function lokalniDatum(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ── Semafor prije objave ────────────────────────────────────────────────────
// Isti spisak koji editor prikazuje uživo. Vraća stavke sa statusom "ok",
// "greska" (blokira objavu) ili "upozorenje" (ne blokira).
function semafor(c) {
  const tekst = c.sadrzajTekst || htmlUTekst(c.sadrzaj);
  const rijeci = brojRijeci(tekst);
  const minRijeci = MIN_RIJECI[c.tip] ?? MIN_RIJECI.VIJEST;
  const fraza = (c.fokusFraza || "").trim().toLowerCase();
  const naslovLc = (c.naslov || "").toLowerCase();
  const html = c.sadrzaj || "";
  const prviPasus = htmlUTekst(html).slice(0, 400).toLowerCase();

  const stavke = [];
  const dodaj = (kljuc, opis, uslov, nivo = "greska") =>
    stavke.push({ kljuc, opis, status: uslov ? "ok" : nivo });

  dodaj(
    "seoNaslov",
    `SEO naslov ${SEO_LIMITI.naslovMin} do ${SEO_LIMITI.naslovMax} znakova`,
    !!c.seoNaslov &&
      c.seoNaslov.length >= SEO_LIMITI.naslovMin &&
      c.seoNaslov.length <= SEO_LIMITI.naslovMax,
  );
  dodaj(
    "seoOpis",
    `SEO opis ${SEO_LIMITI.opisMin} do ${SEO_LIMITI.opisMax} znakova`,
    !!c.seoOpis &&
      c.seoOpis.length >= SEO_LIMITI.opisMin &&
      c.seoOpis.length <= SEO_LIMITI.opisMax,
  );
  dodaj("fokusFraza", "Fokus fraza je upisana", !!fraza);
  dodaj(
    "frazaUNaslovu",
    "Fokus fraza se pojavljuje u naslovu",
    !fraza || naslovLc.includes(fraza),
    "upozorenje",
  );
  dodaj(
    "frazaUUvodu",
    "Fokus fraza se pojavljuje u prvom pasusu",
    !fraza || prviPasus.includes(fraza),
    "upozorenje",
  );
  dodaj("slika", "Naslovna slika je postavljena", !!c.naslovnaSlika);
  dodaj("alt", "Naslovna slika ima alt opis", !!c.naslovnaAlt);
  dodaj(
    "internaVeza",
    "Bar jedna veza na naš alat ili raniji tekst",
    /<a[^>]+href="\//i.test(html),
  );
  dodaj(
    "duzina",
    `Dužina teksta najmanje ${minRijeci} riječi (trenutno ${rijeci})`,
    rijeci >= minRijeci,
    c.tip === "VODIC" ? "greska" : "upozorenje",
  );
  dodaj(
    "sazetak",
    `Sažetak ${SAZETAK_LIMITI.min} do ${SAZETAK_LIMITI.max} znakova`,
    !!c.sazetak &&
      c.sazetak.length >= SAZETAK_LIMITI.min &&
      c.sazetak.length <= SAZETAK_LIMITI.max,
  );

  return stavke;
}

function blokade(stavke) {
  return stavke.filter((s) => s.status === "greska").map((s) => s.opis);
}

async function jedinstvenSlug(zeljeni, ignoriId = null) {
  const osnovni = napraviSlug(zeljeni) || `tekst-${Date.now()}`;
  let kandidat = osnovni;
  let n = 2;
  for (;;) {
    const where = { slug: kandidat };
    if (ignoriId) where.id = { [Op.ne]: ignoriId };
    const zauzet = await VijestClanak.findOne({ where, attributes: ["id"] });
    if (!zauzet) return kandidat;
    kandidat = `${osnovni}-${n}`;
    n += 1;
  }
}

// Javno se vidi ono čemu je datum objave prošao. ZAKAZAN je tu namjerno: kad
// zakazani trenutak dođe, tekst je živ bez ikakvog posla u pozadini (nema
// joba koji bi mijenjao status, pa nema ni kašnjenja ni promašenog termina).
const OBJAVLJENO = () => ({
  status: { [Op.in]: ["OBJAVLJEN", "ZAKAZAN"] },
  datumObjave: { [Op.lte]: new Date() },
});

/** Isti uslov kao OBJAVLJENO(), samo nad već učitanim zapisom. */
const JAVNO_VIDLJIV = (c) =>
  ["OBJAVLJEN", "ZAKAZAN"].includes(c.status) &&
  !!c.datumObjave &&
  new Date(c.datumObjave).getTime() <= Date.now();

// Kaskada pozicija: vodeća je uvijek jedna, izdvojenih najviše MAX_IZDVOJENIH.
// Kad novi tekst preuzme vrh, prethodni pada na izdvojeno, a najstariji
// izdvojeni u obično, pa naslovna nikad ne ostane sa dvije vodeće ni sa gomilom
// izdvojenih. Sudjeluju samo objavljeni tekstovi.
async function primijeniKaskadu(clanak) {
  // Nacrt ne smije razbacati naslovnu: dok tekst nije javno vidljiv, njegova
  // pozicija je samo namjera. Kaskada se pokreće tek kad tekst zaista izađe
  // (promjena statusa u OBJAVLJEN ili ZAKAZAN).
  if (!JAVNO_VIDLJIV(clanak)) return;

  if (clanak.pozicija === "VODECA") {
    await VijestClanak.update(
      { pozicija: "IZDVOJENO" },
      { where: { pozicija: "VODECA", id: { [Op.ne]: clanak.id }, ...OBJAVLJENO() } },
    );
  }
  if (clanak.pozicija === "VODECA" || clanak.pozicija === "IZDVOJENO") {
    const izdvojeni = await VijestClanak.findAll({
      where: { pozicija: "IZDVOJENO", ...OBJAVLJENO() },
      order: [["datumObjave", "DESC"]],
      attributes: ["id"],
    });
    const visak = izdvojeni.slice(MAX_IZDVOJENIH).map((v) => v.id);
    if (visak.length > 0) {
      await VijestClanak.update(
        { pozicija: "OBICNO" },
        { where: { id: { [Op.in]: visak } } },
      );
    }
  }
}

function javniOblik(c, { saSadrzajem = false } = {}) {
  const tekst = c.sadrzajTekst || "";
  return {
    id: c.id,
    tip: c.tip,
    slug: c.slug,
    naslov: c.naslov,
    nadnaslov: c.nadnaslov,
    sazetak: c.sazetak,
    rubrika: c.rubrika,
    tagovi: c.tagovi ? c.tagovi.split(",").filter(Boolean) : [],
    naslovnaSlika: c.naslovnaSlika,
    naslovnaAlt: c.naslovnaAlt,
    autorPotpis: c.autorPotpis,
    // tekst objavio neko iz redakcije (admin): frontend uz potpis pokazuje
    // plavu kvačicu, da se službena objava razlikuje od korisničkog sadržaja
    sluzbeni: c.autor ? c.autor.role === "ADMIN" : undefined,
    izvorPropisa: c.izvorPropisa,
    datumObjave: c.datumObjave,
    datumAzuriranja: c.datumAzuriranja,
    brojPregleda: c.brojPregleda,
    brojKomentara: c.brojKomentara,
    brojDijeljenja: c.brojDijeljenja,
    istaknut: c.istaknut,
    pozicija: c.pozicija,
    vrijemeCitanja: vrijemeCitanja(tekst),
    seoNaslov: c.seoNaslov,
    seoOpis: c.seoOpis,
    ...(saSadrzajem ? { sadrzaj: c.sadrzaj } : {}),
  };
}

// ── Pretraga ────────────────────────────────────────────────────────────────
// Ide preko FULLTEXT indeksa (vidi ensureVijestiFulltext u app.js), jer je
// LIKE '%pojam%' po LONGTEXT koloni pun scan tabele na svaku pretragu.
// Riječi kraće od minimalne dužine tokena fulltext ne indeksira, pa one padaju
// na LIKE po naslovu i sažetku (kratke kolone, kratka lista pogodaka).
const FT_MIN_TOKEN = 3;

function uslovPretrage(q) {
  const rijeci = q.split(/\s+/).filter(Boolean);
  const zaIndeks = rijeci.filter((r) => r.length >= FT_MIN_TOKEN);

  if (zaIndeks.length === 0) {
    const uzorak = `%${q}%`;
    return {
      [Op.or]: [
        { naslov: { [Op.like]: uzorak } },
        { sazetak: { [Op.like]: uzorak } },
      ],
    };
  }

  // boolean mode sa zvjezdicom: "plat" nalazi i "plata" i "plate", a + traži
  // da se svaka upisana riječ pojavi (inače bi jedna česta riječ vratila sve)
  const izraz = zaIndeks
    .map((r) => `+${r.replace(/[+\-><()~*"@]/g, "")}*`)
    .filter((r) => r.length > 2)
    .join(" ");
  if (!izraz) {
    const uzorak = `%${q}%`;
    return { naslov: { [Op.like]: uzorak } };
  }
  return literal(
    `MATCH (naslov, sazetak, sadrzajTekst) AGAINST (${VijestClanak.sequelize.escape(izraz)} IN BOOLEAN MODE)`,
  );
}

// ── JAVNO ───────────────────────────────────────────────────────────────────

// GET /api/vijesti?tip=&rubrika=&q=&page=&limit=
async function lista(req, res) {
  const tip = TIPOVI.includes(String(req.query.tip)) ? String(req.query.tip) : null;
  const rubrika = RUBRIKA_IDS.includes(String(req.query.rubrika))
    ? String(req.query.rubrika)
    : null;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const q = String(req.query.q || "").trim().slice(0, 80);

  const where = { ...OBJAVLJENO() };
  if (tip) where.tip = tip;
  if (rubrika) where.rubrika = rubrika;
  if (q) where[Op.and] = [uslovPretrage(q)];

  const { rows, count } = await VijestClanak.findAndCountAll({
    where,
    order: [["datumObjave", "DESC"]],
    offset: (page - 1) * limit,
    limit,
  });
  return res.json({
    ok: true,
    data: { items: rows.map((r) => javniOblik(r)), total: count, page, limit },
  });
}

// "Najčitanije" po zbiru pregleda u zadnjih N dana, a ne po ukupnom broju:
// inače bi najstariji tekst zauvijek držao vrh liste. Ako brojanja po danima
// još nema (tek uvedeno), pada se na ukupan broj pregleda.
async function najcitanijiZadnjihDana(dana, koliko) {
  const od = new Date();
  od.setDate(od.getDate() - dana);
  const odStr = lokalniDatum(od);

  const zbirovi = await VijestPregled.findAll({
    attributes: ["clanakId", [fn("SUM", col("broj")), "ukupno"]],
    where: { datum: { [Op.gte]: odStr } },
    group: ["clanakId"],
    order: [[literal("ukupno"), "DESC"]],
    limit: koliko,
    raw: true,
  });

  if (zbirovi.length > 0) {
    const ids = zbirovi.map((z) => z.clanakId);
    const clanci = await VijestClanak.findAll({
      where: { id: { [Op.in]: ids }, ...OBJAVLJENO() },
    });
    // redoslijed prati zbir pregleda, ne redoslijed iz baze
    const poId = new Map(clanci.map((c) => [c.id, c]));
    const poredani = ids.map((id) => poId.get(id)).filter(Boolean);
    if (poredani.length > 0) return poredani;
  }

  return VijestClanak.findAll({
    where: OBJAVLJENO(),
    order: [["brojPregleda", "DESC"]],
    limit: koliko,
  });
}

// GET /api/vijesti/naslovna : sve što naslovna stranica treba, u jednom pozivu.
// Pozicija je preferenca, ne obaveza: ako niko nije označen kao vodeća, veliku
// poziciju dobija najnoviji tekst, a izdvojene se dopune sljedećim najnovijim,
// pa naslovna nikad nema rupu.
async function naslovna(_req, res) {
  // vodič ulazi u rijeku samo ako je tako označen
  const zaRijeku = {
    ...OBJAVLJENO(),
    [Op.or]: [{ tip: "VIJEST" }, { tip: "VODIC", uRijeci: true }],
  };

  const [oznaceni, rijeka, najcitanije, vodici] = await Promise.all([
    VijestClanak.findAll({
      where: { ...zaRijeku, pozicija: { [Op.in]: ["VODECA", "IZDVOJENO"] } },
      order: [["datumObjave", "DESC"]],
      limit: MAX_IZDVOJENIH + 1,
    }),
    VijestClanak.findAll({
      where: zaRijeku,
      order: [["datumObjave", "DESC"]],
      limit: 24,
    }),
    najcitanijiZadnjihDana(7, 10),
    VijestClanak.findAll({
      where: { ...OBJAVLJENO(), tip: "VODIC" },
      order: [
        ["datumAzuriranja", "DESC"],
        ["datumObjave", "DESC"],
      ],
      limit: 6,
    }),
  ]);

  const uzeti = new Set();
  const vodeca =
    oznaceni.find((c) => c.pozicija === "VODECA") ?? rijeka[0] ?? null;
  if (vodeca) uzeti.add(vodeca.id);

  const izdvojeni = [];
  for (const c of oznaceni) {
    if (izdvojeni.length >= MAX_IZDVOJENIH) break;
    if (uzeti.has(c.id)) continue;
    izdvojeni.push(c);
    uzeti.add(c.id);
  }
  for (const c of rijeka) {
    if (izdvojeni.length >= MAX_IZDVOJENIH) break;
    if (uzeti.has(c.id)) continue;
    izdvojeni.push(c);
    uzeti.add(c.id);
  }

  return res.json({
    ok: true,
    data: {
      vodeca: vodeca ? javniOblik(vodeca) : null,
      izdvojeni: izdvojeni.map((r) => javniOblik(r)),
      najnovije: rijeka.map((r) => javniOblik(r)),
      najcitanije: najcitanije.map((r) => javniOblik(r)),
      vodici: vodici.map((r) => javniOblik(r)),
    },
  });
}

// GET /api/vijesti/:slug
// Sponzor teksta ("Uz podršku <brend>"): samo ono što se crta; link ide kroz
// klik redirect partnera (/r/:id), kao i ostale kreative.
async function sponzorTeksta(reklamaId) {
  if (!reklamaId) return null;
  const r = await Reklama.findByPk(reklamaId, {
    attributes: ["id", "brend", "logoUrl", "boja", "ctaTekst"],
  });
  return r ? { id: r.id, brend: r.brend, logoUrl: r.logoUrl, boja: r.boja, ctaTekst: r.ctaTekst } : null;
}

async function detalj(req, res) {
  const slug = String(req.params.slug || "").slice(0, 180);
  const c = await VijestClanak.findOne({
    where: { slug, ...OBJAVLJENO() },
    include: [{ model: User, as: "autor", attributes: ["id", "role"] }],
  });
  if (!c) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const sponzor = await sponzorTeksta(c.sponzorReklamaId);

  // Pregled se NE broji ovdje: stranica se kešira, pa bi jedan poziv API-ja
  // pokrio više čitalaca. Broji ga preglednik (POST /:slug/pregled).

  const povezani = await VijestClanak.findAll({
    where: { ...OBJAVLJENO(), rubrika: c.rubrika, id: { [Op.ne]: c.id } },
    order: [["datumObjave", "DESC"]],
    limit: 4,
  });

  return res.json({
    ok: true,
    data: {
      clanak: { ...javniOblik(c, { saSadrzajem: true }), sponzor },
      povezani: povezani.map((r) => javniOblik(r)),
    },
  });
}

// POST /api/vijesti/:slug/pregled
// Broji jedan pregled: preglednik javlja kad čitalac stvarno otvori tekst
// (jednom po sesiji), pa keširanje stranice ne krivi brojku. Botovi po
// user-agentu se preskaču, koliko se već može bez analitike.
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless/i;

async function zabiljeziPregled(req, res) {
  const slug = String(req.params.slug || "").slice(0, 180);
  if (BOT.test(String(req.get("user-agent") || ""))) {
    return res.json({ ok: true, data: { brojano: false } });
  }
  const c = await VijestClanak.findOne({
    where: { slug, ...OBJAVLJENO() },
    attributes: ["id"],
  });
  if (!c) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const datum = lokalniDatum();
  try {
    await sequelize.query(
      `INSERT INTO vijesti_pregledi (clanakId, datum, broj) VALUES (:id, :datum, 1)
       ON DUPLICATE KEY UPDATE broj = broj + 1`,
      { replacements: { id: c.id, datum } },
    );
    await VijestClanak.increment("brojPregleda", { by: 1, where: { id: c.id } });
  } catch (e) {
    console.warn("vijesti: pregled nije zabilježen:", e?.message || e);
  }
  return res.json({ ok: true, data: { brojano: true } });
}

// POST /api/vijesti/:slug/dijeljenje : broji klik na dugme Podijeli
async function zabiljeziDijeljenje(req, res) {
  const slug = String(req.params.slug || "").slice(0, 180);
  if (BOT.test(String(req.get("user-agent") || ""))) {
    return res.json({ ok: true, data: { brojano: false } });
  }
  const c = await VijestClanak.findOne({
    where: { slug, ...OBJAVLJENO() },
    attributes: ["id"],
  });
  if (!c) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await VijestClanak.increment("brojDijeljenja", { by: 1, where: { id: c.id } });
  const svjez = await VijestClanak.findByPk(c.id, { attributes: ["brojDijeljenja"] });
  return res.json({ ok: true, data: { brojDijeljenja: svjez?.brojDijeljenja ?? 0 } });
}

// ── ADMIN ───────────────────────────────────────────────────────────────────

// GET /api/vijesti/admin?status=&tip=&q=
async function adminLista(req, res) {
  const where = {};
  const status = String(req.query.status || "");
  if (["NACRT", "ZAKAZAN", "OBJAVLJEN", "ARHIVIRAN"].includes(status)) {
    where.status = status;
  }
  const tip = String(req.query.tip || "");
  if (TIPOVI.includes(tip)) where.tip = tip;
  const q = String(req.query.q || "").trim();
  if (q) where.naslov = { [Op.like]: `%${q}%` };

  const rows = await VijestClanak.findAll({
    where,
    order: [["updatedAt", "DESC"]],
    limit: 200,
    include: [{ model: User, as: "autor", attributes: ["id", "firstName", "lastName"] }],
  });
  const danas = lokalniDatum();
  return res.json({
    ok: true,
    data: rows.map((c) => ({
      ...javniOblik(c),
      status: c.status,
      uRijeci: c.uRijeci,
      datumProvjere: c.datumProvjere,
      // zakazan tekst kojem je termin prošao je javno vidljiv, pa lista to i
      // kaže umjesto da zauvijek piše "Zakazan"
      vecObjavljen:
        c.status === "ZAKAZAN" &&
        !!c.datumObjave &&
        new Date(c.datumObjave).getTime() <= Date.now(),
      // vodič kojem je prošao datum provjere: podsjetnik da ne ostane sa
      // starim stopama, admin lista ga ističe
      trebaProvjeru:
        c.tip === "VODIC" && !!c.datumProvjere && c.datumProvjere <= danas,
      autor: c.autor
        ? `${c.autor.firstName || ""} ${c.autor.lastName || ""}`.trim()
        : null,
      updatedAt: c.updatedAt,
    })),
  });
}

// GET /api/vijesti/admin/:id
async function adminDetalj(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const c = await VijestClanak.findByPk(id);
  if (!c) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  return res.json({
    ok: true,
    data: {
      ...javniOblik(c, { saSadrzajem: true }),
      status: c.status,
      uRijeci: c.uRijeci,
      datumProvjere: c.datumProvjere,
      fokusFraza: c.fokusFraza,
      pozicija: c.pozicija,
      sponzorReklamaId: c.sponzorReklamaId,
      semafor: semafor(c),
    },
  });
}

function normalizuj(body) {
  const tip = TIPOVI.includes(body?.tip) ? body.tip : "VIJEST";
  const sadrzaj = sanitizeHtml(body?.sadrzaj || "");
  const rubrika = RUBRIKA_IDS.includes(body?.rubrika)
    ? body.rubrika
    : tip === "VODIC"
      ? "vodici"
      : "propisi";
  return {
    tip,
    rubrika,
    naslov: trimOrNull(body?.naslov, 255),
    nadnaslov: trimOrNull(body?.nadnaslov, 160),
    sazetak: trimOrNull(body?.sazetak, SAZETAK_LIMITI.max),
    sadrzaj,
    sadrzajTekst: htmlUTekst(sadrzaj),
    tagovi: Array.isArray(body?.tagovi)
      ? body.tagovi.map((t) => String(t).trim()).filter(Boolean).join(",").slice(0, 255)
      : trimOrNull(body?.tagovi, 255),
    naslovnaSlika: trimOrNull(body?.naslovnaSlika, 500),
    naslovnaAlt: trimOrNull(body?.naslovnaAlt, 255),
    autorPotpis: trimOrNull(body?.autorPotpis, 120),
    izvorPropisa: trimOrNull(body?.izvorPropisa, 500),
    seoNaslov: trimOrNull(body?.seoNaslov, 70),
    seoOpis: trimOrNull(body?.seoOpis, 200),
    fokusFraza: trimOrNull(body?.fokusFraza, 120),
    datumProvjere: trimOrNull(body?.datumProvjere, 10),
    uRijeci: body?.uRijeci !== false,
    istaknut: body?.istaknut === true,
    pozicija: POZICIJE.includes(body?.pozicija) ? body.pozicija : "OBICNO",
    sponzorReklamaId: parseId(body?.sponzorReklamaId) || null,
  };
}

// izabrani sponzor mora biti postojeća kreativa partnera
async function sponzorPostoji(data) {
  if (!data.sponzorReklamaId) return true;
  return !!(await Reklama.findByPk(data.sponzorReklamaId, { attributes: ["id"] }));
}

// POST /api/vijesti/admin
async function kreiraj(req, res) {
  const data = normalizuj(req.body);
  if (!data.naslov) {
    return res.status(400).json({ ok: false, error: "Naslov je obavezan." });
  }
  if (!(await sponzorPostoji(data))) {
    return res.status(400).json({ ok: false, error: "Izabrani sponzor ne postoji." });
  }
  data.slug = await jedinstvenSlug(req.body?.slug || data.naslov);
  data.autorId = req.user.id;
  data.status = "NACRT";
  const c = await VijestClanak.create(data);
  return res.status(201).json({ ok: true, data: { id: c.id, slug: c.slug } });
}

// PUT /api/vijesti/admin/:id
async function izmijeni(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const c = await VijestClanak.findByPk(id);
  if (!c) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const data = normalizuj(req.body);
  if (!data.naslov) {
    return res.status(400).json({ ok: false, error: "Naslov je obavezan." });
  }
  if (!(await sponzorPostoji(data))) {
    return res.status(400).json({ ok: false, error: "Izabrani sponzor ne postoji." });
  }
  // Adresa se poslije objave ne mijenja: stara adresa je već u Googleu i u
  // tuđim linkovima. Prije objave je slobodna.
  if (c.status !== "OBJAVLJEN" && req.body?.slug) {
    data.slug = await jedinstvenSlug(req.body.slug, c.id);
  }
  if (c.status === "OBJAVLJEN") data.datumAzuriranja = new Date();

  await c.update(data);
  await primijeniKaskadu(c);
  return res.json({ ok: true, data: { id: c.id, slug: c.slug, semafor: semafor(c) } });
}

// POST /api/vijesti/admin/:id/status  { status, datumObjave? }
async function promijeniStatus(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const c = await VijestClanak.findByPk(id);
  if (!c) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  const status = String(req.body?.status || "");
  if (!["NACRT", "ZAKAZAN", "OBJAVLJEN", "ARHIVIRAN"].includes(status)) {
    return res.status(400).json({ ok: false, error: "Nepoznat status." });
  }

  if (status === "OBJAVLJEN" || status === "ZAKAZAN") {
    const problemi = blokade(semafor(c));
    if (problemi.length > 0) {
      return res.status(400).json({
        ok: false,
        error: "NEISPUNJENI_USLOVI",
        data: { problemi },
      });
    }
  }

  const izmjene = { status };
  if (status === "ZAKAZAN") {
    const kada = req.body?.datumObjave ? new Date(req.body.datumObjave) : null;
    if (!kada || Number.isNaN(kada.getTime())) {
      return res.status(400).json({ ok: false, error: "Datum objave nije ispravan." });
    }
    izmjene.datumObjave = kada;
  }
  if (status === "OBJAVLJEN") {
    izmjene.datumObjave = c.datumObjave || new Date();
    if (c.status === "OBJAVLJEN") izmjene.datumAzuriranja = new Date();
  }
  await c.update(izmjene);
  // Tek sada je pozicija stvarna: dok je tekst bio nacrt, kaskada ga je
  // preskakala da ne razbacuje živu naslovnu.
  await primijeniKaskadu(c);
  return res.json({
    ok: true,
    data: { id: c.id, status, datumObjave: c.datumObjave },
  });
}

// DELETE /api/vijesti/admin/:id
// Brisanje je trajno, pa za sobom mora povući i sve što je visilo o tekstu.
// Strani ključ na vijesti_komentari.clanakId je nullable, dakle ponaša se kao
// SET NULL: bez ovoga bi komentari ostali u bazi bez članka i bez teme i i
// dalje se prikazivali na javnim profilima autora, a pregledi bi ostali kao
// redovi koje niko više ne može povezati ni sa čim.
async function obrisi(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });

  const clanak = await VijestClanak.findByPk(id, { attributes: ["id"] });
  if (!clanak) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

  await sequelize.transaction(async (t) => {
    const komentari = await VijestKomentar.findAll({
      where: { clanakId: id },
      attributes: ["id"],
      transaction: t,
    });
    const komentarIds = komentari.map((k) => k.id);
    if (komentarIds.length > 0) {
      const gdje = { where: { komentarId: { [Op.in]: komentarIds } }, transaction: t };
      await VijestGlas.destroy(gdje);
      await VijestPrijava.destroy(gdje);
      await VijestObavjestenje.destroy(gdje);
      await VijestKomentar.destroy({ where: { id: { [Op.in]: komentarIds } }, transaction: t });
    }
    await VijestPregled.destroy({ where: { clanakId: id }, transaction: t });
    await VijestClanak.destroy({ where: { id }, transaction: t });
  });

  return res.json({ ok: true, data: { id } });
}

// POST /api/vijesti/admin/slicni  { naslov, fokusFraza, id? }
// Dva teksta na istu temu se međusobno guše u pretrazi, pa editor upozorava
// prije nego se napiše duplikat.
async function slicni(req, res) {
  const naslov = String(req.body?.naslov || "");
  const fokusFraza = String(req.body?.fokusFraza || "");
  if (!naslov.trim() && !fokusFraza.trim()) {
    return res.json({ ok: true, data: [] });
  }
  const ignoriId = parseId(req.body?.id);
  const where = ignoriId ? { id: { [Op.ne]: ignoriId } } : {};
  const postojeci = await VijestClanak.findAll({
    where,
    attributes: ["id", "naslov", "slug", "tip", "status", "fokusFraza"],
    limit: 500,
  });
  return res.json({
    ok: true,
    data: nadjiSlicne({ naslov, fokusFraza }, postojeci),
  });
}

// POST /api/vijesti/admin/slika  (multipart, polje "slika")
async function uploadSlike(req, res) {
  if (!req.file) return res.status(400).json({ ok: false, error: "Nema datoteke." });
  return res.json({
    ok: true,
    data: { url: publicUrlFor("vijesti", req.file.filename) },
  });
}

module.exports = {
  lista,
  naslovna,
  detalj,
  zabiljeziPregled,
  zabiljeziDijeljenje,
  adminLista,
  adminDetalj,
  kreiraj,
  izmijeni,
  promijeniStatus,
  obrisi,
  slicni,
  uploadSlike,
  semafor,
  // pravilo javne vidljivosti teksta je ovdje, da ga svi (komentari, sitemap)
  // čitaju sa jednog mjesta
  OBJAVLJENO,
  JAVNO_VIDLJIV,
};
