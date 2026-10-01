const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  sequelize,
  Reklama,
  ReklamaStatistika,
  ReklamaPosjetilac,
  VijestClanak,
  User,
} = require("../models/index");
const {
  POZICIJE,
  POZICIJE_KREATIVE,
  STRANICE,
  ROKOVI,
  FAKTOR_ROKA,
  NAZIVI_POZICIJA,
  NAZIVI_STRANICA,
} = require("../config/reklame");
const { publicUrlFor, PARTNER_SUBDIR } = require("../utils/uploads");
const { adresa } = require("../middlewares/rateLimit");
const { buildPartnerIzvjestajPdf } = require("../utils/partnerIzvjestajPdf");

// ── Pomoćne ──────────────────────────────────────────────────────────────────

const HEX_BOJA = /^#[0-9a-f]{6}$/i;
// novi uploadi idu u /uploads/p/; /uploads/reklame/ ostaje za ranije učitane
const PREFIKSI_SLIKE = ["/uploads/p/", "/uploads/reklame/"];

function jeAdmin(req) {
  return req.user?.role === "ADMIN";
}

// Promoter vidi i mijenja samo svoje reklame; admin sve (podrška).
function vlasnikWhere(req) {
  return jeAdmin(req) ? {} : { promoterId: req.user.id };
}

// Datum statistike po lokalnom vremenu (BiH), ne po UTC-u servera: prikaz u
// 00:30 mora ići u taj dan, ne u prethodni.
function danasBih() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Sarajevo" });
}

function tekstIliNull(v, max) {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t.slice(0, max) : null;
}

// Samo http(s) linkovi: javascript:, data: i slično bi na javnoj stranici
// bili XSS kroz href.
function validanUrl(v) {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString().slice(0, 500);
  } catch {
    return null;
  }
}

// Slike samo iz našeg upload foldera: bez vanjskih URL-ova nema ni tuđih
// tracking piksela na našim stranicama.
function validnaSlika(v) {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return undefined;
  if (!PREFIKSI_SLIKE.some((pr) => v.startsWith(pr)) || v.includes("..")) return undefined;
  return v.slice(0, 255);
}

function nizKljuceva(v, dozvoljeni) {
  if (!Array.isArray(v)) return null;
  const set = [...new Set(v.map(String))];
  if (set.length === 0) return null;
  if (!set.every((k) => dozvoljeni.includes(k))) return null;
  return set;
}

function validirajPayload(body) {
  const b = body ?? {};
  const greska = (poruka) => ({ ok: false, poruka });

  const naziv = tekstIliNull(b.naziv, 120);
  if (!naziv) return greska("Naziv kampanje je obavezan.");

  const format = b.format === "SLIKA" ? "SLIKA" : "SABLON";

  const brend = tekstIliNull(b.brend, 60);
  if (!brend) return greska("Naziv brenda je obavezan.");

  const ctaUrl = validanUrl(b.ctaUrl);
  if (!ctaUrl) return greska("Link reklame mora biti ispravan http(s) URL.");

  let sekundarniUrl = null;
  if (b.sekundarniUrl) {
    sekundarniUrl = validanUrl(b.sekundarniUrl);
    if (!sekundarniUrl) return greska("Drugi link mora biti ispravan http(s) URL.");
  }

  const slikaUrl = validnaSlika(b.slikaUrl);
  const slikaUskaUrl = validnaSlika(b.slikaUskaUrl);
  const logoUrl = validnaSlika(b.logoUrl);
  const logo2Url = validnaSlika(b.logo2Url);
  if (
    slikaUrl === undefined ||
    slikaUskaUrl === undefined ||
    logoUrl === undefined ||
    logo2Url === undefined
  ) {
    return greska("Slike se moraju učitati kroz dashboard.");
  }

  const naslov = tekstIliNull(b.naslov, 120);
  if (format === "SABLON" && !naslov) return greska("Naslov je obavezan.");
  if (format === "SLIKA" && !slikaUrl) return greska("Učitajte sliku banera.");

  const boja = typeof b.boja === "string" && HEX_BOJA.test(b.boja) ? b.boja.toLowerCase() : "#d9232d";

  const pozicije = nizKljuceva(b.pozicije, POZICIJE_KREATIVE);
  if (!pozicije) return greska("Izaberite bar jednu poziciju.");

  const stranice = Array.isArray(b.stranice) && b.stranice.includes("*") ? ["*"] : nizKljuceva(b.stranice, STRANICE);
  if (!stranice) return greska("Izaberite bar jednu stranicu.");

  const pocetak = new Date(b.pocetak);
  const kraj = new Date(b.kraj);
  if (Number.isNaN(pocetak.getTime()) || Number.isNaN(kraj.getTime())) {
    return greska("Unesite termin prikazivanja (od, do).");
  }
  if (kraj <= pocetak) return greska("Kraj prikazivanja mora biti poslije početka.");

  const tezina = Math.min(10, Math.max(1, Number.parseInt(b.tezina, 10) || 1));
  // prazan izbor rokova je null (bez pojačanja), nepoznat ključ je greška
  const rokovi =
    Array.isArray(b.rokovi) && b.rokovi.length > 0 ? nizKljuceva(b.rokovi, Object.keys(ROKOVI)) : [];
  if (rokovi === null) return greska("Nepoznat porezni rok.");

  return {
    ok: true,
    value: {
      naziv,
      format,
      brend,
      oznaka: tekstIliNull(b.oznaka, 60),
      naslov,
      tekst: tekstIliNull(b.tekst, 400),
      ctaTekst: tekstIliNull(b.ctaTekst, 40),
      ctaUrl,
      sekundarniTekst: sekundarniUrl ? tekstIliNull(b.sekundarniTekst, 60) : null,
      sekundarniUrl,
      slikaUrl,
      slikaUskaUrl,
      logoUrl,
      logo2Url,
      boja,
      pozicije,
      stranice,
      pocetak,
      kraj,
      tezina,
      rokovi: rokovi.length ? rokovi : null,
    },
  };
}

// MySQL JSON kolona zna doći kao string (zavisno od drivera/verzije)
function kaoNiz(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function stanjeReklame(r, sada = new Date()) {
  if (r.status === "PAUZIRANA") return "PAUZIRANA";
  if (new Date(r.kraj) < sada) return "ISTEKLA";
  if (new Date(r.pocetak) > sada) return "ZAKAZANA";
  return "UTOKU";
}

function zaPromotera(r, zbir) {
  const j = r.toJSON ? r.toJSON() : r;
  return {
    ...j,
    pozicije: kaoNiz(j.pozicije),
    stranice: kaoNiz(j.stranice),
    rokovi: kaoNiz(j.rokovi),
    stanje: stanjeReklame(j),
    prikazi: Number(zbir?.prikazi ?? 0),
    klikovi: Number(zbir?.klikovi ?? 0),
  };
}

// Javno se šalje samo ono što se crta; linkovi idu kroz /klik redirect.
function zaJavnost(r) {
  return {
    id: r.id,
    format: r.format,
    brend: r.brend,
    oznaka: r.oznaka,
    naslov: r.naslov,
    tekst: r.tekst,
    ctaTekst: r.ctaTekst,
    sekundarniTekst: r.sekundarniUrl ? r.sekundarniTekst : null,
    slikaUrl: r.slikaUrl,
    slikaUskaUrl: r.slikaUskaUrl,
    logoUrl: r.logoUrl,
    logo2Url: r.logo2Url,
    boja: r.boja,
  };
}

async function zbiroviStatistike(ids) {
  if (ids.length === 0) return new Map();
  const rows = await ReklamaStatistika.findAll({
    where: { reklamaId: { [Op.in]: ids } },
    attributes: [
      "reklamaId",
      [sequelize.fn("SUM", sequelize.col("prikazi")), "prikazi"],
      [sequelize.fn("SUM", sequelize.col("klikovi")), "klikovi"],
    ],
    group: ["reklamaId"],
    raw: true,
  });
  return new Map(rows.map((r) => [r.reklamaId, r]));
}

async function nadjiSvoju(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return Reklama.findOne({ where: { id, ...vlasnikWhere(req) } });
}

// ── Promoter dashboard ───────────────────────────────────────────────────────

// GET /api/partner
async function lista(req, res) {
  try {
    const reklame = await Reklama.findAll({
      where: vlasnikWhere(req),
      order: [["pocetak", "DESC"], ["id", "DESC"]],
      // admin vidi reklame svih promotera, pa mu treba i čija je koja
      ...(jeAdmin(req)
        ? {
            include: [
              {
                model: User,
                as: "promoter",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          }
        : {}),
    });
    const zbir = await zbiroviStatistike(reklame.map((r) => r.id));
    return res.json({ ok: true, data: reklame.map((r) => zaPromotera(r, zbir.get(r.id))) });
  } catch (err) {
    console.error("reklame lista:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// GET /api/partner/:id
async function detalj(req, res) {
  try {
    const r = await nadjiSvoju(req);
    if (!r) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const zbir = await zbiroviStatistike([r.id]);
    return res.json({ ok: true, data: zaPromotera(r, zbir.get(r.id)) });
  } catch (err) {
    console.error("reklame detalj:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/partner
async function kreiraj(req, res) {
  const v = validirajPayload(req.body);
  if (!v.ok) return res.status(400).json({ ok: false, error: v.poruka });
  try {
    const r = await Reklama.create({ ...v.value, promoterId: req.user.id, status: "AKTIVNA" });
    return res.status(201).json({ ok: true, data: zaPromotera(r) });
  } catch (err) {
    console.error("reklame kreiraj:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// PUT /api/partner/:id
async function izmijeni(req, res) {
  const v = validirajPayload(req.body);
  if (!v.ok) return res.status(400).json({ ok: false, error: v.poruka });
  try {
    const r = await nadjiSvoju(req);
    if (!r) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    await r.update(v.value);
    const zbir = await zbiroviStatistike([r.id]);
    return res.json({ ok: true, data: zaPromotera(r, zbir.get(r.id)) });
  } catch (err) {
    console.error("reklame izmijeni:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/partner/:id/status  { status: "AKTIVNA" | "PAUZIRANA" }
async function promijeniStatus(req, res) {
  const status = req.body?.status;
  if (status !== "AKTIVNA" && status !== "PAUZIRANA") {
    return res.status(400).json({ ok: false, error: "Status mora biti AKTIVNA ili PAUZIRANA." });
  }
  try {
    const r = await nadjiSvoju(req);
    if (!r) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    await r.update({ status });
    const zbir = await zbiroviStatistike([r.id]);
    return res.json({ ok: true, data: zaPromotera(r, zbir.get(r.id)) });
  } catch (err) {
    console.error("reklame status:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// DELETE /api/partner/:id
async function obrisi(req, res) {
  try {
    const r = await nadjiSvoju(req);
    if (!r) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    await sequelize.transaction(async (t) => {
      await ReklamaStatistika.destroy({ where: { reklamaId: r.id }, transaction: t });
      await ReklamaPosjetilac.destroy({ where: { reklamaId: r.id }, transaction: t });
      // tekst koji je sponzorisala ova kreativa ostaje, samo bez oznake sponzora
      await VijestClanak.update(
        { sponzorReklamaId: null },
        { where: { sponzorReklamaId: r.id }, transaction: t },
      );
      await r.destroy({ transaction: t });
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("reklame obrisi:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/partner/slika  (multipart, polje "slika")
async function uploadSlike(req, res) {
  if (!req.file) return res.status(400).json({ ok: false, error: "Nema datoteke." });
  return res.json({ ok: true, data: { url: publicUrlFor(PARTNER_SUBDIR, req.file.filename) } });
}

// GET /api/partner/:id/statistika?dana=30
async function statistika(req, res) {
  try {
    const r = await nadjiSvoju(req);
    if (!r) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const dana = Math.min(365, Math.max(1, Number.parseInt(req.query.dana, 10) || 30));
    const od = new Date(Date.now() - (dana - 1) * 86400000).toLocaleDateString("sv-SE", {
      timeZone: "Europe/Sarajevo",
    });
    const rows = await ReklamaStatistika.findAll({
      where: { reklamaId: r.id, datum: { [Op.gte]: od } },
      order: [["datum", "ASC"]],
      raw: true,
    });

    const poDanu = new Map();
    const poPoziciji = new Map();
    const mobilni = { prikazi: 0, klikovi: 0 };
    for (const row of rows) {
      const d = poDanu.get(row.datum) ?? { datum: row.datum, prikazi: 0, klikovi: 0 };
      d.prikazi += row.prikazi;
      d.klikovi += row.klikovi;
      poDanu.set(row.datum, d);
      mobilni.prikazi += row.prikaziMob || 0;
      mobilni.klikovi += row.klikoviMob || 0;

      const kljuc = `${row.stranica}|${row.pozicija}`;
      const p = poPoziciji.get(kljuc) ?? {
        stranica: row.stranica,
        pozicija: row.pozicija,
        prikazi: 0,
        klikovi: 0,
      };
      p.prikazi += row.prikazi;
      p.klikovi += row.klikovi;
      poPoziciji.set(kljuc, p);
    }

    return res.json({
      ok: true,
      data: {
        od,
        dana,
        poDanu: [...poDanu.values()],
        poPoziciji: [...poPoziciji.values()].sort((a, b) => b.prikazi - a.prikazi),
        // dio prikaza i klikova u periodu sa mobitela
        mobilni,
      },
    });
  } catch (err) {
    console.error("reklame statistika:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ── Pregled kampanje (dashboard) ─────────────────────────────────────────────

// "YYYY-MM-DD" pomjeren za n dana (kalendarski, bez vremenskih zona)
function pomjeriDatum(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function periodIzZahtjeva(req) {
  const dana = Math.min(365, Math.max(1, Number.parseInt(req.query.dana, 10) || 30));
  const doDana = danasBih();
  const od = pomjeriDatum(doDana, -(dana - 1));
  return { dana, od, do: doDana, prethodnoOd: pomjeriDatum(od, -dana), prethodnoDo: pomjeriDatum(od, -1) };
}

// Jedinstveni posjetioci po danu za skup reklama (isti posjetilac koji je
// vidio dvije kreative istog dana je jedan). datum -> { ukupno, mobilni }
async function jedinstveniPoDanu(ids, od, doDana) {
  if (ids.length === 0) return new Map();
  const [rows] = await sequelize.query(
    `SELECT datum,
            COUNT(DISTINCT kljuc) AS ukupno,
            COUNT(DISTINCT CASE WHEN mobilni = 1 THEN kljuc END) AS mobilni
       FROM reklame_posjetioci
      WHERE reklamaId IN (:ids) AND datum BETWEEN :od AND :do
      GROUP BY datum`,
    { replacements: { ids, od, do: doDana } },
  );
  return new Map(
    rows.map((r) => [
      String(r.datum).slice(0, 10),
      { ukupno: Number(r.ukupno) || 0, mobilni: Number(r.mobilni) || 0 },
    ]),
  );
}

// Pozicije bez linka na partnera (brending): klik na sponzorisano dugme je
// preuzimanje obrasca. Njihovi prikazi ne ulaze u CTR (prikaziSaLinkom).
const BEZ_LINKA = new Set(["DUGME"]);

const prazanZbir = () => ({
  prikazi: 0,
  klikovi: 0,
  prikaziSaLinkom: 0,
  prikaziMob: 0,
  klikoviMob: 0,
  jedinstveni: 0,
  jedinstveniMob: 0,
});

function dodajRed(z, row) {
  z.prikazi += row.prikazi;
  z.klikovi += row.klikovi;
  if (!BEZ_LINKA.has(row.pozicija)) z.prikaziSaLinkom += row.prikazi;
  z.prikaziMob += row.prikaziMob || 0;
  z.klikoviMob += row.klikoviMob || 0;
}

// Svi podaci pregleda za period (dashboard i mjesečni PDF izvještaj).
async function podaciPregleda(req, p) {
  const reklame = await Reklama.findAll({
    where: vlasnikWhere(req),
    order: [["pocetak", "DESC"], ["id", "DESC"]],
  });
  const ids = reklame.map((r) => r.id);
  const zbirSve = await zbiroviStatistike(ids);

  const rows = ids.length
    ? await ReklamaStatistika.findAll({
        where: { reklamaId: { [Op.in]: ids }, datum: { [Op.between]: [p.prethodnoOd, p.do] } },
        raw: true,
      })
    : [];
  const jedinstveni = await jedinstveniPoDanu(ids, p.prethodnoOd, p.do);

  const ukupno = prazanZbir();
  const prethodno = prazanZbir();
  for (const [datum, j] of jedinstveni) {
    const z = datum < p.od ? prethodno : ukupno;
    z.jedinstveni += j.ukupno;
    z.jedinstveniMob += j.mobilni;
  }

  const dani = new Map();
  for (let d = p.od; d <= p.do; d = pomjeriDatum(d, 1)) {
    dani.set(d, { pozicije: {}, jedinstveni: jedinstveni.get(d)?.ukupno ?? 0 });
  }
  const poPoziciji = new Map();
  const poStranici = new Map();
  const naziv = new Map(reklame.map((r) => [r.id, r.naziv]));

  for (const row of rows) {
    if (row.datum < p.od) {
      dodajRed(prethodno, row);
      continue;
    }
    dodajRed(ukupno, row);

    const dan = dani.get(row.datum);
    if (dan) {
      const z = dan.pozicije[row.pozicija] ?? { prikazi: 0, klikovi: 0 };
      z.prikazi += row.prikazi;
      z.klikovi += row.klikovi;
      dan.pozicije[row.pozicija] = z;
    }

    const kljuc = `${row.pozicija}|${row.reklamaId}`;
    const pp = poPoziciji.get(kljuc) ?? {
      pozicija: row.pozicija,
      reklamaId: row.reklamaId,
      naziv: naziv.get(row.reklamaId) ?? "",
      stranice: [],
      prikazi: 0,
      klikovi: 0,
    };
    if (!pp.stranice.includes(row.stranica)) pp.stranice.push(row.stranica);
    pp.prikazi += row.prikazi;
    pp.klikovi += row.klikovi;
    poPoziciji.set(kljuc, pp);

    const ps = poStranici.get(row.stranica) ?? {
      stranica: row.stranica,
      prikazi: 0,
      klikovi: 0,
      prikaziSaLinkom: 0,
    };
    ps.prikazi += row.prikazi;
    ps.klikovi += row.klikovi;
    if (!BEZ_LINKA.has(row.pozicija)) ps.prikaziSaLinkom += row.prikazi;
    poStranici.set(row.stranica, ps);
  }

  return {
    ...p,
    ukupno,
    prethodno,
    poDanu: [...dani.entries()].map(([datum, d]) => ({ datum, ...d })),
    poPoziciji: [...poPoziciji.values()].sort(
      (a, b) => POZICIJE.indexOf(a.pozicija) - POZICIJE.indexOf(b.pozicija) || b.prikazi - a.prikazi,
    ),
    poStranici: [...poStranici.values()].sort((a, b) => b.prikazi - a.prikazi),
    reklame: reklame.map((r) => zaPromotera(r, zbirSve.get(r.id))),
  };
}

// GET /api/partner/pregled?dana=30
// Sve što treba stranici "Pregled kampanje" u jednom pozivu: zbirovi za
// period i prethodni period iste dužine (sa mobitelom i jedinstvenim
// posjetiocima), dnevni niz po poziciji (svi dani, i oni bez prikaza) i
// rezultati po poziciji, stranici i kreativi.
async function pregled(req, res) {
  try {
    const data = await podaciPregleda(req, periodIzZahtjeva(req));
    return res.json({ ok: true, data });
  } catch (err) {
    console.error("reklame pregled:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// Mjesec "YYYY-MM" -> period za podaciPregleda: cijeli mjesec (tekući do
// danas) i prethodni mjesec za poređenje
function periodMjeseca(mjesec) {
  const [g, m] = mjesec.split("-").map(Number);
  const dvije = (n) => String(n).padStart(2, "0");
  const zadnji = (gg, mm) => new Date(Date.UTC(gg, mm, 0)).getUTCDate();
  const od = `${g}-${dvije(m)}-01`;
  const danas = danasBih();
  let doDana = `${g}-${dvije(m)}-${dvije(zadnji(g, m))}`;
  if (doDana > danas) doDana = danas;
  const pg = m === 1 ? g - 1 : g;
  const pm = m === 1 ? 12 : m - 1;
  return {
    dana: Number(doDana.slice(8, 10)),
    od,
    do: doDana,
    prethodnoOd: `${pg}-${dvije(pm)}-01`,
    prethodnoDo: `${pg}-${dvije(pm)}-${dvije(zadnji(pg, pm))}`,
  };
}

// GET /api/partner/izvjestaj?mjesec=2026-09  (PDF, preuzima se iz portala)
async function mjesecniIzvjestaj(req, res) {
  const mjesec = String(req.query.mjesec || "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mjesec) || `${mjesec}-01` > danasBih()) {
    return res.status(400).json({ ok: false, error: "NEISPRAVAN_MJESEC" });
  }
  try {
    const podaci = await podaciPregleda(req, periodMjeseca(mjesec));
    const zadnja = podaci.reklame[0];
    const pdf = await buildPartnerIzvjestajPdf({
      mjesec,
      brend: zadnja?.brend ?? "",
      boja: zadnja?.boja ?? "#d9232d",
      podaci,
    });
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename="izvjestaj_${mjesec}.pdf"`);
    return res.send(pdf);
  } catch (err) {
    console.error("partner izvjestaj:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

function csvPolje(v) {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// "2026-09-30" -> "30.09.2026."
function datumHr(iso) {
  const [g, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}.${m}.${g}.`;
}

// GET /api/partner/izvoz?dana=30  (CSV, ; separator za Excel u BiH)
async function izvoz(req, res) {
  try {
    const p = periodIzZahtjeva(req);
    const reklame = await Reklama.findAll({ where: vlasnikWhere(req), attributes: ["id", "naziv"], raw: true });
    const naziv = new Map(reklame.map((r) => [r.id, r.naziv]));
    const rows = reklame.length
      ? await ReklamaStatistika.findAll({
          where: {
            reklamaId: { [Op.in]: reklame.map((r) => r.id) },
            datum: { [Op.between]: [p.od, p.do] },
          },
          order: [["datum", "ASC"], ["reklamaId", "ASC"]],
          raw: true,
        })
      : [];

    const linije = [
      [
        "Datum",
        "Kreativa",
        "Stranica",
        "Pozicija",
        "Prikazi",
        "Prikazi mobitel",
        "Klikovi",
        "Klikovi mobitel",
        "CTR %",
      ].join(";"),
    ];
    for (const r of rows) {
      const ctr = r.prikazi ? ((r.klikovi / r.prikazi) * 100).toFixed(2).replace(".", ",") : "";
      linije.push(
        [
          datumHr(r.datum),
          naziv.get(r.reklamaId),
          NAZIVI_STRANICA[r.stranica] ?? r.stranica,
          NAZIVI_POZICIJA[r.pozicija] ?? r.pozicija,
          r.prikazi,
          r.prikaziMob || 0,
          r.klikovi,
          r.klikoviMob || 0,
          ctr,
        ]
          .map(csvPolje)
          .join(";"),
      );
    }
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="reklame_${p.od}_${p.do}.csv"`);
    // BOM da Excel prepozna UTF-8 (č, ć, š, ž, đ)
    return res.send(`﻿${linije.join("\r\n")}\r\n`);
  } catch (err) {
    console.error("reklame izvoz:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ── Javno ────────────────────────────────────────────────────────────────────

function aktivneWhere(sada = new Date()) {
  return {
    status: "AKTIVNA",
    pocetak: { [Op.lte]: sada },
    kraj: { [Op.gte]: sada },
  };
}

function ciljaStranicu(r, stranica) {
  const s = kaoNiz(r.stranice);
  return s.includes("*") || s.includes(stranica);
}

// Dan i mjesec po BiH vremenu, za periode poreznih rokova
function danMjesecBih(sada = new Date()) {
  const [, m, d] = sada.toLocaleDateString("sv-SE", { timeZone: "Europe/Sarajevo" }).split("-");
  return { dan: Number(d), mjesec: Number(m) };
}

// Težina u rotaciji: kreativa vezana za porezni rok koji upravo traje dobija
// FAKTOR_ROKA puta veću težinu (npr. "Rok za GPD je 31.3." u prvom kvartalu).
function tezinaSada(r, danas) {
  const osnovna = r.tezina || 1;
  const uRoku = kaoNiz(r.rokovi).some((k) => ROKOVI[k] && ROKOVI[k](danas));
  return uRoku ? osnovna * FAKTOR_ROKA : osnovna;
}

function izaberiPoTezini(kandidati, danas = danMjesecBih()) {
  const ukupno = kandidati.reduce((s, r) => s + tezinaSada(r, danas), 0);
  let x = Math.random() * ukupno;
  for (const r of kandidati) {
    x -= tezinaSada(r, danas);
    if (x < 0) return r;
  }
  return kandidati[kandidati.length - 1];
}

// GET /api/p/s?st=ams
// Vraća po jednu reklamu za svaku poziciju (ili null). Stranice je dohvataju
// na serveru i keširaju 60 s (frontend/src/lib/reklameServer.ts), pa je
// rotacija po minuti; lijevi i desni stub dobijaju različite reklame kad ih
// ima više.
async function aktivne(req, res) {
  const stranica = String(req.query.st || req.query.stranica || "");
  if (!STRANICE.includes(stranica)) {
    return res.status(400).json({ ok: false, error: "NEPOZNATA_STRANICA" });
  }
  try {
    const sve = await Reklama.findAll({ where: aktivneWhere(), raw: true });
    const zaStranicu = sve.filter((r) => ciljaStranicu(r, stranica));
    const danas = danMjesecBih();

    const izbor = {};
    const iskoristene = new Set();
    for (const pozicija of POZICIJE_KREATIVE) {
      const kandidati = zaStranicu.filter((r) => kaoNiz(r.pozicije).includes(pozicija));
      if (kandidati.length === 0) {
        izbor[pozicija] = null;
        continue;
      }
      const drugaciji =
        pozicija === "SIDEBAR_DESNO" ? kandidati.filter((r) => !iskoristene.has(r.id)) : [];
      const r = izaberiPoTezini(drugaciji.length ? drugaciji : kandidati, danas);
      if (pozicija === "SIDEBAR_LIJEVO") iskoristene.add(r.id);
      izbor[pozicija] = zaJavnost(r);
    }

    res.set("Cache-Control", "no-store");
    return res.json({ ok: true, data: izbor });
  } catch (err) {
    console.error("reklame aktivne:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ── Brojanje (prikazi i klikovi) ─────────────────────────────────────────────

// Botovi, alati za pregled linkova i skripte se ne broje: banka plaća
// stvarne posjetioce. Zahtjev bez preglednika (bez User-Agent) isto.
const BOT_RE =
  /bot|crawl|spider|slurp|scrap|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|skype|headless|phantom|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python|java\/|okhttp|axios|node-fetch|go-http|libwww|httpclient|postman|insomnia/i;

function jeBot(req) {
  const ua = String(req.headers["user-agent"] || "");
  return !ua || BOT_RE.test(ua);
}

function jeMobilni(req) {
  return /Mobi|Android|iPhone|iPod|iPad|Windows Phone/i.test(String(req.headers["user-agent"] || ""));
}

// Naš tim (admin) i sama banka (promoter) gledaju reklame kroz rad i
// provjeru, to nije publika: ne ulaze u statistiku. req.user postavlja
// optionalAuth na rutama prikaza i klika.
function jeInterni(req) {
  return req.user?.role === "ADMIN" || req.user?.role === "PROMOTER";
}

function tajnaPosjetioca() {
  return process.env.REKLAME_TAJNA || process.env.JWT_SECRET || "pk-reklame";
}

// Dnevni anonimni ključ posjetioca (vidi ReklamaPosjetilac u modelima)
function kljucPosjetioca(req, datum) {
  return crypto
    .createHash("sha256")
    .update(`${adresa(req)}|${req.headers["user-agent"] || ""}|${datum}|${tajnaPosjetioca()}`)
    .digest("hex")
    .slice(0, 16);
}

async function uvecaj(reklamaId, stranica, pozicija, kolona, mobilni) {
  // kolona je interna konstanta ("prikazi" | "klikovi"), nikad iz zahtjeva
  const kolonaMob = kolona === "prikazi" ? "prikaziMob" : "klikoviMob";
  const mob = mobilni ? 1 : 0;
  await sequelize.query(
    `INSERT INTO reklame_statistika (reklamaId, datum, stranica, pozicija, prikazi, klikovi, prikaziMob, klikoviMob)
     VALUES (:reklamaId, :datum, :stranica, :pozicija, :p, :k, :pm, :km)
     ON DUPLICATE KEY UPDATE ${kolona} = ${kolona} + 1, ${kolonaMob} = ${kolonaMob} + :mob`,
    {
      replacements: {
        reklamaId,
        datum: danasBih(),
        stranica,
        pozicija,
        p: kolona === "prikazi" ? 1 : 0,
        k: kolona === "klikovi" ? 1 : 0,
        pm: kolona === "prikazi" ? mob : 0,
        km: kolona === "klikovi" ? mob : 0,
        mob,
      },
    },
  );
}

async function zabiljeziPosjetioca(req, reklamaId, mobilni) {
  const datum = danasBih();
  await sequelize.query(
    `INSERT IGNORE INTO reklame_posjetioci (reklamaId, datum, kljuc, mobilni)
     VALUES (:reklamaId, :datum, :kljuc, :mobilni)`,
    {
      replacements: {
        reklamaId,
        datum,
        kljuc: kljucPosjetioca(req, datum),
        mobilni: mobilni ? 1 : 0,
      },
    },
  );
}

function slotIzZahtjeva(src) {
  const stranica = String(src?.stranica ?? src?.s ?? "");
  const pozicija = String(src?.pozicija ?? src?.p ?? "");
  if (!STRANICE.includes(stranica) || !POZICIJE.includes(pozicija)) return null;
  return { stranica, pozicija };
}

// POST /api/p/e/:id  { s, p }
// Frontend ga šalje kad je reklama bar napola vidljiva najmanje 1 sekundu.
async function zabiljeziPrikaz(req, res) {
  const id = Number(req.params.id);
  const slot = slotIzZahtjeva(req.body);
  if (!Number.isInteger(id) || id <= 0 || !slot) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
  }
  if (jeBot(req) || jeInterni(req)) return res.json({ ok: true });
  try {
    // broji se samo reklama koja se trenutno stvarno vrti; sponzorisani tekst
    // ostaje sponzorisan i kad kreativa istekne
    const where = slot.pozicija === "SPONZOR" ? { id } : { id, ...aktivneWhere() };
    const r = await Reklama.findOne({ where, attributes: ["id"] });
    if (r) {
      const mobilni = jeMobilni(req);
      await uvecaj(id, slot.stranica, slot.pozicija, "prikazi", mobilni);
      await zabiljeziPosjetioca(req, id, mobilni);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("reklame prikaz:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// UTM parametri na link banke, da banka konverzije vidi i u svojoj
// analitici. Parametre koje je banka već stavila u link ne diramo.
function saUtm(url, r, slot) {
  try {
    const u = new URL(url);
    const dodaj = (k, v) => {
      if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    };
    const kampanja = String(r.naziv || "")
      .toLowerCase()
      .replace(/đ/g, "dj")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    dodaj("utm_source", "poreznikalkulator.ba");
    dodaj("utm_medium", slot ? slot.pozicija.toLowerCase() : "oglas");
    dodaj("utm_campaign", kampanja || `kreativa-${r.id}`);
    if (slot) dodaj("utm_content", slot.stranica);
    return u.toString();
  } catch {
    return url;
  }
}

// GET /r/:id?s=ams&p=SIDEBAR_LIJEVO[&c=2]  (c=2 = drugi link)
// Broji klik i preusmjerava na link reklame. Link se čita iz baze, nikad iz
// query-ja, pa ovo nije open redirect.
async function klik(req, res) {
  const id = Number(req.params.id);
  const fallback = process.env.FRONTEND_URL || "https://www.poreznikalkulator.ba";
  if (!Number.isInteger(id) || id <= 0) return res.redirect(302, fallback);
  try {
    const r = await Reklama.findByPk(id, {
      attributes: ["id", "naziv", "ctaUrl", "sekundarniUrl"],
    });
    if (!r) return res.redirect(302, fallback);
    const slot = slotIzZahtjeva(req.query);
    if (slot && !req.bezBrojanja && !jeBot(req) && !jeInterni(req)) {
      try {
        await uvecaj(id, slot.stranica, slot.pozicija, "klikovi", jeMobilni(req));
      } catch (e) {
        // brojač nikad ne smije zaustaviti posjetioca
        console.warn("reklame klik brojac:", e?.message || e);
      }
    }
    const drugi = req.query.c === "2" || req.query.cilj === "sekundarni";
    const cilj = drugi && r.sekundarniUrl ? r.sekundarniUrl : r.ctaUrl;
    // pretraživači ne indeksiraju niti prate brojač klikova
    res.set("X-Robots-Tag", "noindex, nofollow");
    return res.redirect(302, saUtm(cilj, r, slot));
  } catch (err) {
    console.error("reklame klik:", err);
    return res.redirect(302, fallback);
  }
}

module.exports = {
  lista,
  detalj,
  kreiraj,
  izmijeni,
  promijeniStatus,
  obrisi,
  uploadSlike,
  statistika,
  pregled,
  izvoz,
  mjesecniIzvjestaj,
  aktivne,
  zabiljeziPrikaz,
  klik,
};
