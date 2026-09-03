// PK Freelancer: evidencija uplata iz inostranstva po korisniku (fizičko lice).
//
// Sve rute traže prijavu. Besplatni nivo: do 3 sačuvane uplate godišnje;
// paket/proba/viši paket (freelancerAccess) skida limit i otključava potvrdu
// o prihodima i priloge. Server UVIJEK sam računa obračun iz iznosa u KM
// (services/freelancerUplate), snimci obrazaca (amsPodaci/uplatnicaPodaci)
// služe samo za ponovno generisanje istih PDF-ova na frontendu.
const path = require("path");
const { Op, fn, col } = require("sequelize");
const {
  FreelancerUplata,
  FreelancerPrilog,
  AmsIsplatilac,
  User,
} = require("../models/index");
const {
  getFreelancerAccess,
  PROBA_DANA,
} = require("../services/freelancerAccess");
const {
  STATUSI,
  r2,
  normalizujUplatu,
  bezOdsutnihStanja,
  rokPredaje,
  danaDoRoka,
  danasIso,
  validanIsoDatum,
} = require("../services/freelancerUplate");
const { kursNaDan } = require("../services/cbbhKurs");
const { buildPotvrdaPdf } = require("../utils/freelancerPotvrdaPdf");
const {
  citajPrefs,
  userPrefs,
} = require("../services/notificationsService");
const { safeUnlink, PRIVATE_ROOT } = require("../utils/uploads");

const PRILOZI_DIR = path.join(PRIVATE_ROOT, "freelancer-prilozi");
const NOVCANA_POLJA = [
  "iznosValuta",
  "iznosKm",
  "rashodi",
  "dohodak",
  "zdravstveno",
  "zdravstvenoKanton",
  "zdravstvenoFbih",
  "osnovica",
  "porez",
  "porezniKredit",
  "razlika",
  "neto",
];
const FREELANCER_PREF_KLJUCEVI = ["freelancerRok", "freelancerGpd"];
const POSTAVKE_ATRIBUTI = [
  "id",
  "notifPrefs",
  "freelancerKoeficijent",
  "freelancerOdbitakMjeseci",
  "freelancerKanton",
  "freelancerOpcina",
];
// Osnovni lični odbitak je 300 KM mjesečno (koeficijent 1,00), a koeficijent sa
// porezne kartice ga uvećava za izdržavane članove. Isti račun koristi i GPD
// predpopuna za PK Office obrte.
const OSNOVNI_ODBITAK_MJESECNO = 300;

function licniOdbitakIznos(koeficijent, mjeseci) {
  const k = Number(koeficijent);
  if (!Number.isFinite(k) || k <= 0) return 0;
  // Neupisan broj mjeseci znači punu godinu. Pazi: Number(null) je 0, pa se
  // prazna vrijednost mora presresti prije pretvaranja u broj, inače bi
  // korisnik koji ostavi polje prazno dobio odbitak nula.
  const m =
    mjeseci === null || mjeseci === undefined || mjeseci === ""
      ? 12
      : Number(mjeseci);
  if (!Number.isFinite(m)) return Math.round(k * OSNOVNI_ODBITAK_MJESECNO * 12 * 100) / 100;
  const puni = Math.min(Math.max(m, 0), 12);
  return Math.round(k * OSNOVNI_ODBITAK_MJESECNO * puni * 100) / 100;
}

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function godinaIzUpita(req) {
  const g = Number(req.query?.godina);
  return Number.isInteger(g) && g >= 2015 && g <= 2100
    ? g
    : new Date().getFullYear();
}

function opsegGodine(godina) {
  return { [Op.between]: [`${godina}-01-01`, `${godina}-12-31`] };
}

/** DECIMAL kolone stižu kao stringovi; frontend dobija brojeve + izvedene rokove. */
function toPublic(row, brojPriloga = 0) {
  const r = row.get ? row.get({ plain: true }) : row;
  const out = { ...r };
  for (const k of NOVCANA_POLJA) out[k] = Number(r[k] ?? 0);
  out.kurs = Number(r.kurs ?? 1);
  out.rokPredaje = rokPredaje(r.datumPrimitka);
  // rok se odnosi na PREDAJU obrasca: čim je predan (PREDANO ili PLACENO,
  // gdje PLACENO znači "predano i plaćeno"), roka više nema
  out.daniDoRoka = r.status === "OBRACUNATO" ? danaDoRoka(r.datumPrimitka) : null;
  out.brojPriloga = brojPriloga;
  delete out.user;
  return out;
}

async function brojUplataUGodini(userId, godina) {
  return FreelancerUplata.count({
    where: { userId, datumPrimitka: opsegGodine(godina) },
  });
}

async function brojPrilogaPoUplati(userId, ids) {
  if (!ids.length) return {};
  const rows = await FreelancerPrilog.findAll({
    where: { userId, uplataId: { [Op.in]: ids } },
    attributes: ["uplataId", [fn("COUNT", col("id")), "n"]],
    group: ["uplataId"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.uplataId, Number(r.n)]));
}

async function nadjiUplatu(req) {
  const id = parseId(req.params.id);
  if (!id) return null;
  return FreelancerUplata.findOne({ where: { id, userId: req.user.id } });
}

// ── Pristup i proba ──────────────────────────────────────────────────────────
async function pristup(req, res) {
  const access = await getFreelancerAccess(req.user);
  const godina = new Date().getFullYear();
  const [brojUplataOveGodine, brojIsplatilaca, ukupnoUplata] =
    await Promise.all([
      brojUplataUGodini(req.user.id, godina),
      AmsIsplatilac.count({ where: { userId: req.user.id } }),
      FreelancerUplata.count({ where: { userId: req.user.id } }),
    ]);
  return res.json({
    ok: true,
    data: {
      ...access,
      godina,
      brojUplataOveGodine,
      brojIsplatilaca,
      ukupnoUplata,
      probaDana: PROBA_DANA,
    },
  });
}

async function pokreniProbu(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
  if (user.freelancerTrialEndsAt) {
    return res.status(409).json({ ok: false, error: "TRIAL_ALREADY_USED" });
  }
  const access = await getFreelancerAccess(user);
  if (access.hasAccess) {
    return res.status(409).json({ ok: false, error: "ALREADY_SUBSCRIBED" });
  }
  const trialEndsAt = new Date(Date.now() + PROBA_DANA * 86400000);
  await user.update({ freelancerTrialEndsAt: trialEndsAt });
  return res.status(201).json({ ok: true, data: { trialEndsAt } });
}

// ── Kurs ─────────────────────────────────────────────────────────────────────
async function kurs(req, res) {
  const valuta = String(req.query?.valuta || "").toUpperCase();
  const datum = String(req.query?.datum || danasIso());
  if (!/^[A-Z]{3}$/.test(valuta)) {
    return res.status(400).json({ ok: false, error: "Valuta nije ispravna." });
  }
  if (!validanIsoDatum(datum)) {
    return res.status(400).json({ ok: false, error: "Datum nije ispravan." });
  }
  if (datum > danasIso()) {
    return res
      .status(400)
      .json({ ok: false, error: "Kurs za budući datum ne postoji." });
  }
  // ruta je javna (AMS generator): donja granica da gost ne može nabrajati
  // hiljade datuma, jer je svaki novi datum jedan poziv prema CBBiH
  if (datum < "2015-01-01") {
    return res
      .status(400)
      .json({ ok: false, error: "Kurs prije 2015. godine nije dostupan." });
  }
  const r = await kursNaDan(valuta, datum);
  if (!r) return res.status(404).json({ ok: false, error: "KURS_NIJE_DOSTUPAN" });
  return res.json({ ok: true, data: r });
}

// ── Uplate ───────────────────────────────────────────────────────────────────
async function godine(req, res) {
  const rows = await FreelancerUplata.findAll({
    where: { userId: req.user.id },
    attributes: [[fn("YEAR", col("datumPrimitka")), "g"]],
    group: ["g"],
    raw: true,
  });
  const skup = new Set(rows.map((r) => Number(r.g)).filter(Boolean));
  skup.add(new Date().getFullYear());
  return res.json({ ok: true, data: [...skup].sort((a, b) => b - a) });
}

async function listaUplata(req, res) {
  const godina = godinaIzUpita(req);
  const rows = await FreelancerUplata.findAll({
    where: { userId: req.user.id, datumPrimitka: opsegGodine(godina) },
    order: [
      ["datumPrimitka", "DESC"],
      ["id", "DESC"],
    ],
  });
  const prilozi = await brojPrilogaPoUplati(
    req.user.id,
    rows.map((r) => r.id),
  );
  return res.json({
    ok: true,
    data: { godina, items: rows.map((r) => toPublic(r, prilozi[r.id] || 0)) },
  });
}

async function jednaUplata(req, res) {
  const row = await nadjiUplatu(req);
  if (!row) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const prilozi = await FreelancerPrilog.findAll({
    where: { uplataId: row.id },
    order: [["createdAt", "DESC"]],
  });
  return res.json({
    ok: true,
    data: {
      ...toPublic(row, prilozi.length),
      prilozi: prilozi.map((p) => ({
        id: p.id,
        vrsta: p.vrsta,
        originalName: p.originalName,
        mimeType: p.mimeType,
        sizeBytes: p.sizeBytes,
        createdAt: p.createdAt,
      })),
    },
  });
}

async function provjeriIsplatioca(userId, data) {
  if (!data.isplatilacId) return;
  const ok = await AmsIsplatilac.findOne({
    where: { id: data.isplatilacId, userId },
  });
  if (!ok) data.isplatilacId = null; // snimak ostaje, veza se briše
}

// DATEONLY stiže kao "yyyy-mm-dd", ali Date ne bismo smjeli isjeći na slova
const godinaIzDatuma = (d) =>
  Number(String(d instanceof Date ? d.toISOString() : d).slice(0, 4));

/**
 * Besplatni nivo: 3 uplate godišnje. Kod izmjene se provjerava CILJNA godina i
 * broji bez tekućeg zapisa, jer bi inače seljenje datuma u drugu godinu
 * oslobađalo slot u nedogled (3 unosa, pa ih premjesti u prošlu godinu, pa opet 3).
 * @returns {Promise<object|null>} tijelo greške LIMIT_BESPLATNO ili null
 */
async function limitBesplatnog(req, datumPrimitka, row = null) {
  const access = await getFreelancerAccess(req.user);
  if (access.hasAccess) return null;
  const godina = godinaIzDatuma(datumPrimitka);
  const staraGodina = row ? godinaIzDatuma(row.datumPrimitka) : null;
  if (staraGodina === godina) return null; // zapis već zauzima slot te godine
  const where = { userId: req.user.id, datumPrimitka: opsegGodine(godina) };
  if (row) where.id = { [Op.ne]: row.id };
  const broj = await FreelancerUplata.count({ where });
  if (broj < access.besplatno.maxUplataGodisnje) return null;
  return {
    ok: false,
    error: "LIMIT_BESPLATNO",
    data: { limit: access.besplatno.maxUplataGodisnje, godina },
  };
}

const kljucNaziva = (s) =>
  String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Zaštita od dvostrukog unosa: ista uplata (isti datum, isplatilac i iznos) se
 * ažurira umjesto da se doda drugi put. Oznaka sačuvanog zapisa živi samo u
 * stanju stranice, pa osvježena stranica inače pravi duplikat i besplatnom
 * korisniku troši dva od tri slota.
 */
async function nadjiDuplikat(userId, data) {
  const rows = await FreelancerUplata.findAll({
    where: { userId, datumPrimitka: data.datumPrimitka, iznosKm: data.iznosKm },
    order: [["id", "DESC"]],
    limit: 20,
  });
  const kljuc = kljucNaziva(data.isplatilacNaziv);
  return rows.find((r) => kljucNaziva(r.isplatilacNaziv) === kljuc) || null;
}

async function azurirajPostojecu(req, res, row, data) {
  const patch = bezOdsutnihStanja(data, req.body);
  await provjeriIsplatioca(req.user.id, patch);
  await row.update(patch);
  const broj = await FreelancerPrilog.count({ where: { uplataId: row.id } });
  return res.json({ ok: true, data: toPublic(row, broj) });
}

async function kreirajUplatu(req, res) {
  const { errors, data } = normalizujUplatu(req.body);
  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors.join(" ") });
  }
  // duplikat prije limita: postojeći zapis već troši slot, ažuriranje ga ne smije rušiti
  const duplikat = await nadjiDuplikat(req.user.id, data);
  if (duplikat) return azurirajPostojecu(req, res, duplikat, data);
  const limit = await limitBesplatnog(req, data.datumPrimitka);
  if (limit) return res.status(403).json(limit);
  await provjeriIsplatioca(req.user.id, data);
  const created = await FreelancerUplata.create({ ...data, userId: req.user.id });
  return res.status(201).json({ ok: true, data: toPublic(created) });
}

async function izmijeniUplatu(req, res) {
  const row = await nadjiUplatu(req);
  if (!row) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const { errors, data } = normalizujUplatu(req.body);
  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors.join(" ") });
  }
  const limit = await limitBesplatnog(req, data.datumPrimitka, row);
  if (limit) return res.status(403).json(limit);
  return azurirajPostojecu(req, res, row, data);
}

// obračunato -> predano -> predano i plaćeno; nazad na obračunato briše datume
async function promijeniStatus(req, res) {
  const row = await nadjiUplatu(req);
  if (!row) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const status = String(req.body?.status || "").toUpperCase();
  if (!STATUSI.includes(status)) {
    return res.status(400).json({ ok: false, error: "Status nije ispravan." });
  }
  // Datum je opcion. Kad ga klijent POŠALJE, to je izričita ispravka i uvijek
  // se upisuje; bez njega vrijedi današnji dan za novi datum, a već upisani se
  // čuva (npr. prelaz sa "predano i plaćeno" nazad na "predano" ne smije
  // pomjeriti datum predaje na danas).
  const poslanDatum = req.body?.datum ? String(req.body.datum) : null;
  const datum = poslanDatum || danasIso();
  if (!validanIsoDatum(datum)) {
    return res.status(400).json({ ok: false, error: "Datum nije ispravan." });
  }
  // Tok: OBRACUNATO -> PREDANO (obrazac predan, porez još nije plaćen) ->
  // PLACENO ("predano i plaćeno", sve gotovo). Vrijednosti u bazi su ostale
  // iste, promijenjeno je značenje: plaćeno bez predaje se u praksi ne vodi.
  const patch = { status };
  if (status === "OBRACUNATO") {
    patch.datumPlacanja = null;
    patch.datumPredaje = null;
  } else if (status === "PREDANO") {
    patch.datumPredaje = poslanDatum || row.datumPredaje || datum;
    patch.datumPlacanja = null;
  } else {
    // "predano i plaćeno": poslani datum je datum PLAĆANJA (tako ga i ekran
    // nudi), a datum predaje se popunjava samo ako ga zapis još nema
    patch.datumPlacanja = datum;
    if (!row.datumPredaje) patch.datumPredaje = datum;
  }
  await row.update(patch);
  const broj = await FreelancerPrilog.count({ where: { uplataId: row.id } });
  return res.json({ ok: true, data: toPublic(row, broj) });
}

async function obrisiUplatu(req, res) {
  const row = await nadjiUplatu(req);
  if (!row) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const prilozi = await FreelancerPrilog.findAll({ where: { uplataId: row.id } });
  for (const p of prilozi) {
    await safeUnlink(path.join(PRILOZI_DIR, p.filename));
  }
  await FreelancerPrilog.destroy({ where: { uplataId: row.id } });
  await row.destroy();
  return res.json({ ok: true, data: { id: row.id } });
}

// ── Pregledi ─────────────────────────────────────────────────────────────────
async function uplateGodine(userId, godina) {
  const rows = await FreelancerUplata.findAll({
    where: { userId, datumPrimitka: opsegGodine(godina) },
    order: [
      ["datumPrimitka", "ASC"],
      ["id", "ASC"],
    ],
  });
  return rows.map((r) => toPublic(r));
}

const zbir = (items, k) => r2(items.reduce((s, i) => s + (Number(i[k]) || 0), 0));

function primalacIz(items) {
  const sa = [...items].reverse().find((i) => i.primalacIme);
  return sa
    ? { ime: sa.primalacIme, jmbg: sa.primalacJmbg, adresa: sa.primalacAdresa }
    : null;
}

async function pregled(req, res) {
  const godina = godinaIzUpita(req);
  const items = await uplateGodine(req.user.id, godina);

  const poMjesecima = Array.from({ length: 12 }, (_, i) => ({
    mjesec: i + 1,
    broj: 0,
    bruto: 0,
    zdravstveno: 0,
    porez: 0,
    neto: 0,
  }));
  const poStatusu = { OBRACUNATO: 0, PLACENO: 0, PREDANO: 0 };
  const isplatioci = new Map();
  for (const i of items) {
    const p = poMjesecima[Number(i.datumPrimitka.slice(5, 7)) - 1];
    p.broj += 1;
    p.bruto = r2(p.bruto + i.iznosKm);
    p.zdravstveno = r2(p.zdravstveno + i.zdravstveno);
    p.porez = r2(p.porez + i.razlika);
    p.neto = r2(p.neto + i.neto);
    poStatusu[i.status] = (poStatusu[i.status] || 0) + 1;
    const key = i.isplatilacNaziv.trim().toLowerCase();
    const s = isplatioci.get(key) || { naziv: i.isplatilacNaziv, broj: 0, bruto: 0 };
    s.broj += 1;
    s.bruto = r2(s.bruto + i.iznosKm);
    isplatioci.set(key, s);
  }
  // otvoren rok ima samo obračunata uplata; predana i "predana i plaćena" ne
  const nepredane = items
    .filter((i) => i.status === "OBRACUNATO")
    .map((i) => ({
      id: i.id,
      isplatilacNaziv: i.isplatilacNaziv,
      datumPrimitka: i.datumPrimitka,
      iznosKm: i.iznosKm,
      status: i.status,
      rokPredaje: i.rokPredaje,
      daniDoRoka: i.daniDoRoka,
    }))
    .sort((a, b) => a.daniDoRoka - b.daniDoRoka);

  return res.json({
    ok: true,
    data: {
      godina,
      broj: items.length,
      ukupno: {
        bruto: zbir(items, "iznosKm"),
        rashodi: zbir(items, "rashodi"),
        dohodak: zbir(items, "dohodak"),
        zdravstveno: zbir(items, "zdravstveno"),
        porez: zbir(items, "razlika"),
        neto: zbir(items, "neto"),
      },
      poMjesecima,
      poStatusu,
      nepredane,
      poIsplatiocu: [...isplatioci.values()]
        .sort((a, b) => b.bruto - a.bruto)
        .slice(0, 10),
      primalac: primalacIz(items),
    },
  });
}

// Podaci za GPD-1051 iz evidencije: dohodak (poslije normiranih rashoda),
// uplaćeni doprinos za zdravstveno i porez po odbitku (AMS) za godinu.
async function gpdPodaci(req, res) {
  // predpopuna GPD-a je dio paketa, isto kao potvrda o prihodima i prilozi
  const access = await getFreelancerAccess(req.user);
  if (!access.hasAccess) {
    return res.status(403).json({ ok: false, error: "NEMA_PRISTUPA" });
  }
  const godina = godinaIzUpita(req);
  const items = await uplateGodine(req.user.id, godina);
  // plaćen porez je samo na uplatama "predano i plaćeno" (PLACENO); PREDANO
  // znači da je obrazac predan ali porez još nije uplaćen
  const placene = items.filter((i) => i.status === "PLACENO");
  // Lični odbitak (red 18) iz podataka porezne kartice upisanih u postavkama.
  const u = await User.findByPk(req.user.id, {
    attributes: ["id", "freelancerKoeficijent", "freelancerOdbitakMjeseci"],
  });
  const koeficijent =
    u?.freelancerKoeficijent == null ? null : Number(u.freelancerKoeficijent);
  const odbitakMjeseci =
    u?.freelancerOdbitakMjeseci == null ? null : Number(u.freelancerOdbitakMjeseci);
  return res.json({
    ok: true,
    data: {
      godina,
      brojUplata: items.length,
      brojNeplacenih: items.length - placene.length,
      koeficijent,
      odbitakMjeseci,
      licniOdbitak: licniOdbitakIznos(koeficijent, odbitakMjeseci),
      bruto: zbir(items, "iznosKm"),
      dohodak: zbir(items, "dohodak"),
      // Red 13 GPD-a nosi OSNOVICU sa AMS obrasca (dohodak poslije normiranih
      // rashoda i poslije doprinosa za zdravstveno), jer je porez po odbitku
      // obračunat baš na nju. Sa dohotkom prije doprinosa GPD bi tražio doplatu
      // od 10% doprinosa iako je porez na uplatu već plaćen.
      osnovica: zbir(items, "osnovica"),
      zdravstveno: zbir(items, "zdravstveno"),
      // red 19 GPD-a traži PLAĆENI doprinos, ukupan ostaje samo za prikaz
      zdravstvenoPlaceno: zbir(placene, "zdravstveno"),
      porezObracunat: zbir(items, "razlika"),
      porezPlacen: zbir(placene, "razlika"),
      // čist prihod poslije doprinosa i poreza, za pregled (ne ulazi u GPD)
      neto: zbir(items, "neto"),
      primalac: primalacIz(items),
      uplate: items.map((i) => ({
        id: i.id,
        datumPrimitka: i.datumPrimitka,
        isplatilacNaziv: i.isplatilacNaziv,
        iznosKm: i.iznosKm,
        dohodak: i.dohodak,
        zdravstveno: i.zdravstveno,
        osnovica: i.osnovica,
        razlika: i.razlika,
        neto: i.neto,
        status: i.status,
      })),
    },
  });
}

async function potvrda(req, res) {
  const access = await getFreelancerAccess(req.user);
  if (!access.hasAccess) {
    return res.status(403).json({ ok: false, error: "NEMA_PRISTUPA" });
  }
  const godina = godinaIzUpita(req);
  const items = await uplateGodine(req.user.id, godina);
  if (!items.length) {
    return res.status(404).json({ ok: false, error: "NEMA_UPLATA" });
  }
  const user = await User.findByPk(req.user.id, {
    attributes: ["firstName", "lastName"],
  });
  const p = primalacIz(items);
  const osoba = {
    ime: p?.ime || `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
    jmbg: p?.jmbg || "",
    adresa: p?.adresa || "",
  };
  const pdf = await buildPotvrdaPdf({ osoba, godina, rows: items });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Pregled-prihoda-iz-inostranstva-${godina}.pdf"`,
  );
  return res.send(pdf);
}

// ── Postavke: podsjetnici (users.notifPrefs) + lični odbitak (kolone) ────────
function samoFreelancerKljucevi(prefs) {
  const out = {};
  for (const k of FREELANCER_PREF_KLJUCEVI) out[k] = prefs[k] !== false;
  return out;
}

function postavkeOdgovor(u) {
  const koef = u.freelancerKoeficijent == null ? null : Number(u.freelancerKoeficijent);
  const mjeseci =
    u.freelancerOdbitakMjeseci == null ? null : Number(u.freelancerOdbitakMjeseci);
  return {
    ...samoFreelancerKljucevi(userPrefs(u)),
    koeficijent: koef,
    odbitakMjeseci: mjeseci,
    licniOdbitak: licniOdbitakIznos(koef, mjeseci),
    kanton: u.freelancerKanton || null,
    opcina: u.freelancerOpcina || null,
  };
}

async function getPostavke(req, res) {
  const u = await User.findByPk(req.user.id, { attributes: POSTAVKE_ATRIBUTI });
  return res.json({ ok: true, data: postavkeOdgovor(u) });
}

async function putPostavke(req, res) {
  const prefPatch = {};
  for (const k of FREELANCER_PREF_KLJUCEVI) {
    if (typeof req.body?.[k] === "boolean") prefPatch[k] = req.body[k];
  }

  // Lični odbitak: koeficijent sa porezne kartice (0 do 9,99) i broj mjeseci u
  // kojima je kartica važila (0 do 12). Prazna vrijednost briše podatak.
  const kolone = {};
  if ("koeficijent" in (req.body || {})) {
    const v = req.body.koeficijent;
    if (v === null || v === "") {
      kolone.freelancerKoeficijent = null;
    } else {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 9.99) {
        return res.status(400).json({
          ok: false,
          error: "Koeficijent ličnog odbitka mora biti broj između 0 i 9,99.",
        });
      }
      kolone.freelancerKoeficijent = Math.round(n * 100) / 100;
    }
  }
  if ("odbitakMjeseci" in (req.body || {})) {
    const v = req.body.odbitakMjeseci;
    if (v === null || v === "") {
      kolone.freelancerOdbitakMjeseci = null;
    } else {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 12) {
        return res.status(400).json({
          ok: false,
          error: "Broj mjeseci ličnog odbitka mora biti cijeli broj između 0 i 12.",
        });
      }
      kolone.freelancerOdbitakMjeseci = n;
    }
  }

  // Prebivalište za uplatnice: kanton je ključ (npr. "USK"), općina šifra
  // (3 cifre). Prazno briše oboje; općina bez kantona nema smisla. Polja se
  // diraju samo ako su POSLANA: zahtjev koji nosi samo općinu ne smije obrisati
  // kanton (postavke primaju i djelimičnu izmjenu, npr. samo prekidače).
  const saljeKanton = "kanton" in (req.body || {});
  const saljeOpcinu = "opcina" in (req.body || {});
  if (saljeKanton || saljeOpcinu) {
    const u0 = await User.findByPk(req.user.id, { attributes: POSTAVKE_ATRIBUTI });
    const k = saljeKanton
      ? req.body.kanton == null
        ? ""
        : String(req.body.kanton).trim().toUpperCase()
      : u0?.freelancerKanton || "";
    const o = saljeOpcinu
      ? req.body.opcina == null
        ? ""
        : String(req.body.opcina).trim()
      : u0?.freelancerOpcina || "";
    if (k && !/^[A-Z0-9_]{1,10}$/.test(k)) {
      return res.status(400).json({ ok: false, error: "Kanton nije ispravan." });
    }
    if (o && !/^\d{3}$/.test(o)) {
      return res.status(400).json({ ok: false, error: "Šifra općine mora imati 3 cifre." });
    }
    kolone.freelancerKanton = k || null;
    kolone.freelancerOpcina = k && o ? o : null;
  }

  const u = await User.findByPk(req.user.id, { attributes: POSTAVKE_ATRIBUTI });
  if (Object.keys(prefPatch).length) {
    kolone.notifPrefs = { ...(citajPrefs(u) || {}), ...prefPatch };
  }
  if (Object.keys(kolone).length) await u.update(kolone);
  return res.json({ ok: true, data: postavkeOdgovor(u) });
}

module.exports = {
  pristup,
  pokreniProbu,
  kurs,
  godine,
  listaUplata,
  jednaUplata,
  kreirajUplatu,
  izmijeniUplatu,
  promijeniStatus,
  obrisiUplatu,
  pregled,
  gpdPodaci,
  potvrda,
  getPostavke,
  putPostavke,
};
