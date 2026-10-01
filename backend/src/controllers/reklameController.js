const { Op } = require("sequelize");
const { sequelize, Reklama, ReklamaStatistika, User } = require("../models/index");
const { POZICIJE, STRANICE } = require("../config/reklame");
const { publicUrlFor, PARTNER_SUBDIR } = require("../utils/uploads");

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

// GET /api/partner/pregled?dana=30
// Sve što treba stranici "Pregled kampanje" u jednom pozivu: zbirovi za
// period i prethodni period iste dužine, dnevni niz po poziciji (svi dani,
// i oni bez prikaza) i rezultati po poziciji i kreativi.
async function pregled(req, res) {
  try {
    const p = periodIzZahtjeva(req);
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

    const ukupno = { prikazi: 0, klikovi: 0 };
    const prethodno = { prikazi: 0, klikovi: 0 };
    const dani = new Map();
    for (let d = p.od; d <= p.do; d = pomjeriDatum(d, 1)) dani.set(d, {});
    const poPoziciji = new Map();
    const naziv = new Map(reklame.map((r) => [r.id, r.naziv]));

    for (const row of rows) {
      if (row.datum < p.od) {
        prethodno.prikazi += row.prikazi;
        prethodno.klikovi += row.klikovi;
        continue;
      }
      ukupno.prikazi += row.prikazi;
      ukupno.klikovi += row.klikovi;

      const dan = dani.get(row.datum);
      if (dan) {
        const z = dan[row.pozicija] ?? { prikazi: 0, klikovi: 0 };
        z.prikazi += row.prikazi;
        z.klikovi += row.klikovi;
        dan[row.pozicija] = z;
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
    }

    return res.json({
      ok: true,
      data: {
        ...p,
        ukupno,
        prethodno,
        poDanu: [...dani.entries()].map(([datum, pozicije]) => ({ datum, pozicije })),
        poPoziciji: [...poPoziciji.values()].sort(
          (a, b) => POZICIJE.indexOf(a.pozicija) - POZICIJE.indexOf(b.pozicija) || b.prikazi - a.prikazi,
        ),
        reklame: reklame.map((r) => zaPromotera(r, zbirSve.get(r.id))),
      },
    });
  } catch (err) {
    console.error("reklame pregled:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

function csvPolje(v) {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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

    const linije = [["Datum", "Kreativa", "Stranica", "Pozicija", "Prikazi", "Klikovi", "CTR %"].join(";")];
    for (const r of rows) {
      const ctr = r.prikazi ? ((r.klikovi / r.prikazi) * 100).toFixed(2).replace(".", ",") : "";
      linije.push(
        [r.datum, naziv.get(r.reklamaId), r.stranica, r.pozicija, r.prikazi, r.klikovi, ctr]
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

function izaberiPoTezini(kandidati) {
  const ukupno = kandidati.reduce((s, r) => s + (r.tezina || 1), 0);
  let x = Math.random() * ukupno;
  for (const r of kandidati) {
    x -= r.tezina || 1;
    if (x < 0) return r;
  }
  return kandidati[kandidati.length - 1];
}

// GET /api/p/s?st=ams
// Vraća po jednu reklamu za svaku poziciju (ili null). Rotacija je po
// učitavanju stranice; lijevi i desni stub dobijaju različite reklame kad
// ih ima više.
async function aktivne(req, res) {
  const stranica = String(req.query.st || req.query.stranica || "");
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

// POST /api/p/e/:id  { s, p }
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

// GET /r/:id?s=ams&p=SIDEBAR_LIJEVO[&c=2]  (c=2 = drugi link)
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
    const drugi = req.query.c === "2" || req.query.cilj === "sekundarni";
    const cilj = drugi && r.sekundarniUrl ? r.sekundarniUrl : r.ctaUrl;
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
  pregled,
  izvoz,
  aktivne,
  zabiljeziPrikaz,
  klik,
};
