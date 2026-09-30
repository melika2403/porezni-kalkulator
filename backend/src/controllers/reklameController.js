const { Op } = require("sequelize");
const { sequelize, Reklama, ReklamaStatistika } = require("../models/index");
const { POZICIJE, STRANICE } = require("../config/reklame");
const { publicUrlFor } = require("../utils/uploads");

// ── Pomoćne ──────────────────────────────────────────────────────────────────

const HEX_BOJA = /^#[0-9a-f]{6}$/i;
const PREFIKS_SLIKE = "/uploads/reklame/";

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
  if (!v.startsWith(PREFIKS_SLIKE) || v.includes("..")) return undefined;
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
  if (slikaUrl === undefined || slikaUskaUrl === undefined || logoUrl === undefined) {
    return greska("Slike se moraju učitati kroz dashboard.");
  }

  const naslov = tekstIliNull(b.naslov, 120);
  if (format === "SABLON" && !naslov) return greska("Naslov je obavezan.");
  if (format === "SLIKA" && !slikaUrl) return greska("Učitajte sliku banera.");

  const boja = typeof b.boja === "string" && HEX_BOJA.test(b.boja) ? b.boja.toLowerCase() : "#d9232d";

  const pozicije = nizKljuceva(b.pozicije, POZICIJE);
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

  return {
    ok: true,
    value: {
      naziv,
      format,
      brend,
      naslov,
      tekst: tekstIliNull(b.tekst, 400),
      ctaTekst: tekstIliNull(b.ctaTekst, 40),
      ctaUrl,
      sekundarniTekst: sekundarniUrl ? tekstIliNull(b.sekundarniTekst, 60) : null,
      sekundarniUrl,
      slikaUrl,
      slikaUskaUrl,
      logoUrl,
      boja,
      pozicije,
      stranice,
      pocetak,
      kraj,
      tezina,
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
    naslov: r.naslov,
    tekst: r.tekst,
    ctaTekst: r.ctaTekst,
    sekundarniTekst: r.sekundarniUrl ? r.sekundarniTekst : null,
    slikaUrl: r.slikaUrl,
    slikaUskaUrl: r.slikaUskaUrl,
    logoUrl: r.logoUrl,
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

// GET /api/reklame/promoter
async function lista(req, res) {
  try {
    const reklame = await Reklama.findAll({
      where: vlasnikWhere(req),
      order: [["pocetak", "DESC"], ["id", "DESC"]],
    });
    const zbir = await zbiroviStatistike(reklame.map((r) => r.id));
    return res.json({ ok: true, data: reklame.map((r) => zaPromotera(r, zbir.get(r.id))) });
  } catch (err) {
    console.error("reklame lista:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// GET /api/reklame/promoter/:id
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

// POST /api/reklame/promoter
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

// PUT /api/reklame/promoter/:id
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

// POST /api/reklame/promoter/:id/status  { status: "AKTIVNA" | "PAUZIRANA" }
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

// DELETE /api/reklame/promoter/:id
async function obrisi(req, res) {
  try {
    const r = await nadjiSvoju(req);
    if (!r) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    await sequelize.transaction(async (t) => {
      await ReklamaStatistika.destroy({ where: { reklamaId: r.id }, transaction: t });
      await r.destroy({ transaction: t });
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("reklame obrisi:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/reklame/promoter/slika  (multipart, polje "slika")
async function uploadSlike(req, res) {
  if (!req.file) return res.status(400).json({ ok: false, error: "Nema datoteke." });
  return res.json({ ok: true, data: { url: publicUrlFor("reklame", req.file.filename) } });
}

// GET /api/reklame/promoter/:id/statistika?dana=30
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
    for (const row of rows) {
      const d = poDanu.get(row.datum) ?? { datum: row.datum, prikazi: 0, klikovi: 0 };
      d.prikazi += row.prikazi;
      d.klikovi += row.klikovi;
      poDanu.set(row.datum, d);

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
      },
    });
  } catch (err) {
    console.error("reklame statistika:", err);
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

function izaberiPoTezini(kandidati) {
  const ukupno = kandidati.reduce((s, r) => s + (r.tezina || 1), 0);
  let x = Math.random() * ukupno;
  for (const r of kandidati) {
    x -= r.tezina || 1;
    if (x < 0) return r;
  }
  return kandidati[kandidati.length - 1];
}

// GET /api/reklame/aktivne?stranica=ams
// Vraća po jednu reklamu za svaku poziciju (ili null). Rotacija je po
// učitavanju stranice; lijevi i desni stub dobijaju različite reklame kad
// ih ima više.
async function aktivne(req, res) {
  const stranica = String(req.query.stranica || "");
  if (!STRANICE.includes(stranica)) {
    return res.status(400).json({ ok: false, error: "NEPOZNATA_STRANICA" });
  }
  try {
    const sve = await Reklama.findAll({ where: aktivneWhere(), raw: true });
    const zaStranicu = sve.filter((r) => ciljaStranicu(r, stranica));

    const izbor = {};
    const iskoristene = new Set();
    for (const pozicija of POZICIJE) {
      const kandidati = zaStranicu.filter((r) => kaoNiz(r.pozicije).includes(pozicija));
      if (kandidati.length === 0) {
        izbor[pozicija] = null;
        continue;
      }
      const drugaciji =
        pozicija === "SIDEBAR_DESNO" ? kandidati.filter((r) => !iskoristene.has(r.id)) : [];
      const r = izaberiPoTezini(drugaciji.length ? drugaciji : kandidati);
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

async function uvecaj(reklamaId, stranica, pozicija, kolona) {
  // kolona je interna konstanta ("prikazi" | "klikovi"), nikad iz zahtjeva
  await sequelize.query(
    `INSERT INTO reklame_statistika (reklamaId, datum, stranica, pozicija, prikazi, klikovi)
     VALUES (:reklamaId, :datum, :stranica, :pozicija, :p, :k)
     ON DUPLICATE KEY UPDATE ${kolona} = ${kolona} + 1`,
    {
      replacements: {
        reklamaId,
        datum: danasBih(),
        stranica,
        pozicija,
        p: kolona === "prikazi" ? 1 : 0,
        k: kolona === "klikovi" ? 1 : 0,
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

// POST /api/reklame/:id/prikaz  { stranica, pozicija }
async function zabiljeziPrikaz(req, res) {
  const id = Number(req.params.id);
  const slot = slotIzZahtjeva(req.body);
  if (!Number.isInteger(id) || id <= 0 || !slot) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
  }
  try {
    // broji se samo reklama koja se trenutno stvarno vrti
    const r = await Reklama.findOne({ where: { id, ...aktivneWhere() }, attributes: ["id"] });
    if (r) await uvecaj(id, slot.stranica, slot.pozicija, "prikazi");
    return res.json({ ok: true });
  } catch (err) {
    console.error("reklame prikaz:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// GET /api/reklame/:id/klik?s=ams&p=SIDEBAR_LIJEVO[&cilj=sekundarni]
// Broji klik i preusmjerava na link reklame. Link se čita iz baze, nikad iz
// query-ja, pa ovo nije open redirect.
async function klik(req, res) {
  const id = Number(req.params.id);
  const fallback = process.env.FRONTEND_URL || "https://www.poreznikalkulator.ba";
  if (!Number.isInteger(id) || id <= 0) return res.redirect(302, fallback);
  try {
    const r = await Reklama.findByPk(id, { attributes: ["id", "ctaUrl", "sekundarniUrl"] });
    if (!r) return res.redirect(302, fallback);
    const slot = slotIzZahtjeva(req.query);
    if (slot && !req.bezBrojanja) {
      try {
        await uvecaj(id, slot.stranica, slot.pozicija, "klikovi");
      } catch (e) {
        // brojač nikad ne smije zaustaviti posjetioca
        console.warn("reklame klik brojac:", e?.message || e);
      }
    }
    const cilj = req.query.cilj === "sekundarni" && r.sekundarniUrl ? r.sekundarniUrl : r.ctaUrl;
    return res.redirect(302, cilj);
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
  aktivne,
  zabiljeziPrikaz,
  klik,
};
