// Admin test harness za izvoz platnih naloga u e-bankarstvo (Faza 0).
// Sve rute su ADMIN-only (requireRole u adminDashboardRoutes), ništa ne piše
// u bazu: čita organizacije i Payroll snapshotove, generiše datoteku u
// memoriji i vraća je kao base64 + pregled za ekran.
// Spec: docs/faza0-tkdis-izvoz-halcom.md

const { Organization, Payroll, Worker } = require("../models/index");
const {
  formatTkdis,
  TkdisGreska,
  ROW_LEN,
  CP1250_U_SLOVO,
} = require("../services/paymentExport/tkdisFormatter");
const {
  formatElba,
  ElbaGreska,
  CP1250_U_SLOVO: CP1250_U_SLOVO_ELBA,
} = require("../services/paymentExport/elbaFormatter");
const {
  formatRaiffeisen,
  RaiffeisenGreska,
  RECORD_LEN: RAIFFEISEN_RECORD_LEN,
  CP852_U_SLOVO,
} = require("../services/paymentExport/raiffeisenFormatter");
const {
  buildTkdisIzObracuna,
} = require("../services/paymentExport/obracunAdapter");

// TKDIS profili (Halcom, UniCredit) + ELBA platforma (BBI, ASA, Sparkasse)
// + Raiffeisen RBBHnet (vlastiti 345 format, samo javni prihodi).
const PROFILI = new Set(["halcom", "unicredit", "elba", "raiffeisen"]);
const TRANSLITERACIJE = new Set(["yuscii", "cp1250", "cp852"]);

function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// GET /api/admin/izvoz-naloga/organizacije
// Organizacije koje imaju bar jedan payroll (samo one imaju šta izvesti).
async function listOrganizacije(req, res) {
  const rows = await Payroll.findAll({
    attributes: ["organizationId"],
    group: ["organizationId"],
    raw: true,
  });
  const ids = rows.map((r) => r.organizationId);
  if (ids.length === 0) return res.json({ ok: true, data: [] });
  const orgs = await Organization.findAll({
    where: { id: ids },
    attributes: ["id", "name", "type", "city", "bankAccount"],
    order: [["name", "ASC"]],
  });
  return res.json({ ok: true, data: orgs });
}

// GET /api/admin/izvoz-naloga/obracuni?orgId=N
// Mjeseci sa obračunima za izabranu organizaciju, najnoviji prvi.
async function listObracuni(req, res) {
  const orgId = parseId(req.query.orgId);
  if (!orgId) return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  const payrolls = await Payroll.findAll({
    where: { organizationId: orgId },
    attributes: ["year", "month", "status", "totalCost"],
    raw: true,
  });
  const poMjesecu = new Map();
  for (const p of payrolls) {
    const key = `${p.year}-${p.month}`;
    const cur = poMjesecu.get(key) || {
      year: p.year,
      month: p.month,
      ukupno: 0,
      obracunato: 0,
      trosak: 0,
    };
    cur.ukupno += 1;
    if (p.status === "OBRACUNATO" || p.status === "ISPLACENO") {
      cur.obracunato += 1;
      cur.trosak += Number(p.totalCost) || 0;
    }
    poMjesecu.set(key, cur);
  }
  const data = [...poMjesecu.values()]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map((m) => ({ ...m, trosak: Math.round(m.trosak * 100) / 100 }));
  return res.json({ ok: true, data });
}

// Pregled datoteke za ekran: bajt = jedan znak (kolona). ASCII se prikazuje
// direktno (YUSCII slova se namjerno vide kao @ [ ] ^ \, tako izgleda i u
// banci), dijakritika se dekodira mapom KODNE STRANICE datoteke (cp1250 i
// cp852 dijele bajtove sa različitim značenjem, npr. 0xE6 je ć u cp1250 a
// Š u cp852, pa se mapa bira po transliteraciji), TAB (ELBA separator polja)
// postaje "⇥", ostali kontrolni bajtovi "·". CR i LF lome red.
function pregledRedova(buffer, transliteracija) {
  const dekodMapa =
    transliteracija === "cp852"
      ? CP852_U_SLOVO
      : new Map([...CP1250_U_SLOVO, ...CP1250_U_SLOVO_ELBA]);
  const ima1a = buffer.length > 0 && buffer[buffer.length - 1] === 0x1a;
  const tijelo = ima1a ? buffer.subarray(0, buffer.length - 1) : buffer;
  const rows = [];
  let red = "";
  for (const bajt of tijelo) {
    if (bajt === 0x0d || bajt === 0x0a) {
      if (red.length > 0) rows.push(red);
      red = "";
      continue;
    }
    if (bajt === 0x09) red += "⇥";
    else if (bajt >= 0x20 && bajt <= 0x7e) red += String.fromCharCode(bajt);
    else red += dekodMapa.get(bajt) || "·";
  }
  if (red.length > 0) rows.push(red);
  return { rows, ima1a };
}

// POST /api/admin/izvoz-naloga/generisi
// Body: { orgId, year, month, datumValute (YYYY-MM-DD), profil,
//         transliteracija, combineKantonal }
// Vraća datoteku (base64 za download) + pregled po redovima za ekran.
async function generisi(req, res) {
  const orgId = parseId(req.body?.orgId);
  const year = Number(req.body?.year);
  const month = Number(req.body?.month);
  const datumValute = String(req.body?.datumValute || "");
  const profil = String(req.body?.profil || "");
  const transliteracija = String(req.body?.transliteracija || "");
  const combineKantonal = !!req.body?.combineKantonal;

  if (!orgId) return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ ok: false, error: "INVALID_PERIOD" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datumValute)) {
    return res.status(400).json({ ok: false, error: "INVALID_DATUM_VALUTE" });
  }
  if (!PROFILI.has(profil)) {
    return res.status(400).json({ ok: false, error: "INVALID_PROFIL" });
  }
  if (!TRANSLITERACIJE.has(transliteracija)) {
    return res.status(400).json({ ok: false, error: "INVALID_TRANSLITERACIJA" });
  }

  const org = await Organization.findByPk(orgId);
  if (!org) return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });

  // Isti izbor payrolla kao mjesečne uplatnice: svi zapisi mjeseca, orphani
  // (obrisan radnik) se izbacuju.
  const existingWorkers = await Worker.findAll({
    where: { organizationId: orgId },
    attributes: ["id"],
  });
  const validWorkerIds = new Set(existingWorkers.map((w) => w.id));
  const rawPayrolls = await Payroll.findAll({
    where: { organizationId: orgId, year, month },
  });
  const payrolls = rawPayrolls.filter((p) => validWorkerIds.has(p.workerId));
  if (payrolls.length === 0) {
    return res.status(400).json({ ok: false, error: "NEMA_OBRACUNA" });
  }
  const workers = await Worker.findAll({
    where: { id: payrolls.map((p) => p.workerId), organizationId: orgId },
  });
  const workerMap = new Map(workers.map((w) => [w.id, w]));

  // Datum valute kao lokalni Date (bez UTC pomaka).
  const [dy, dm, dd] = datumValute.split("-").map(Number);

  const { file, preskoceni } = buildTkdisIzObracuna({
    org: org.toJSON(),
    payrolls,
    workerMap,
    year,
    month,
    datumValute: new Date(dy, dm - 1, dd),
    combineKantonal,
  });

  // Raiffeisen format podržava samo javne prihode (kao stari program): lične
  // isplate se preskaču uz jasan razlog dok banka ne potvrdi format prenosa.
  if (profil === "raiffeisen") {
    for (const n of file.nalozi) {
      if (n.tip === "prenos") {
        preskoceni.push({
          radnik: n.naziv,
          // "Isplata neto plate za 07/2026, Ime" → "Isplata neto plate"
          stavka: n.svrha.replace(/ za \d{2}\/\d{4}.*$/, ""),
          iznosKm: +(n.iznosFeninga / 100).toFixed(2),
          razlog: "Raiffeisen izvoz za sada podržava samo javne prihode",
        });
      }
    }
    file.nalozi = file.nalozi.filter((n) => n.tip === "javniPrihod");
  }
  if (file.nalozi.length === 0) {
    return res.status(400).json({
      ok: false,
      error: "NEMA_NALOGA",
      preskoceni,
    });
  }

  // ELBA je uvijek cp1250, Raiffeisen cp852; TKDIS prati izbor sa ekrana.
  const translitEff =
    profil === "elba" ? "cp1250" : profil === "raiffeisen" ? "cp852" : transliteracija;
  let buffer;
  try {
    buffer =
      profil === "elba"
        ? formatElba(file)
        : profil === "raiffeisen"
          ? formatRaiffeisen(file)
          : formatTkdis(file, profil, { transliteracija: translitEff });
  } catch (e) {
    if (
      e instanceof TkdisGreska ||
      e instanceof ElbaGreska ||
      e instanceof RaiffeisenGreska
    ) {
      // Greška validacije/encodinga nosi kontekst (polje, nalog, vrijednost):
      // pokaži je adminu direktno, to je i svrha harnessa.
      return res.status(400).json({ ok: false, error: e.message });
    }
    throw e;
  }

  const { rows, ima1a } = pregledRedova(buffer, translitEff);

  const mm = String(month).padStart(2, "0");
  const orgSlug = String(org.name || "org")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "org";
  const fileName = `nalozi-${profil}-${orgSlug}-${year}-${mm}.txt`;

  const ukupnoFeninga = file.nalozi.reduce((s, n) => s + n.iznosFeninga, 0);

  return res.json({
    ok: true,
    data: {
      fileName,
      base64: buffer.toString("base64"),
      rows,
      preskoceni,
      meta: {
        stub: false,
        format:
          profil === "elba" ? "elba" : profil === "raiffeisen" ? "raiffeisen" : "tkdis",
        profil,
        transliteracija: translitEff,
        combineKantonal,
        // ELBA je delimitirani format (TAB/CR), nema fiksnu širinu ni lenjir;
        // TKDIS je 336, Raiffeisen 345 znakova po redu.
        rowLen:
          profil === "elba"
            ? null
            : profil === "raiffeisen"
              ? RAIFFEISEN_RECORD_LEN
              : ROW_LEN,
        brojRedova: rows.length,
        brojNaloga: file.nalozi.length,
        ukupnoKm: ukupnoFeninga / 100,
        ukupnoBajta: buffer.length,
        eof1a: ima1a,
        brojPayrolla: payrolls.length,
      },
    },
  });
}

module.exports = { listOrganizacije, listObracuni, generisi };
