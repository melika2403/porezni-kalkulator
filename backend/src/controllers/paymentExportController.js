// Izvoz platnih naloga u e-bankarstvo.
// - Admin test harness (listOrganizacije/listObracuni/generisi): ADMIN-only
//   rute u adminDashboardRoutes, sa pregledom bajtova i override opcijama
//   (transliteracija, combineKantonal) za kalibraciju formata.
// - Korisnički izvoz (bankExport): ruta u payrollRoutes (requireAuth + plan
//   gate kao uplatnice), pristup samo vlastitim organizacijama, transliteracija
//   automatska po banci, objedinjavanje kantonalnih prati postavku korisnika.
// Ništa ne piše u bazu: čita Payroll snapshotove, generiše datoteku u
// memoriji i vraća je kao base64.
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
const {
  assertOrgAccess,
  getCombineKantonal,
} = require("./payrollController");

// TKDIS profili (Halcom, UniCredit) + ELBA platforma (BBI, ASA, Sparkasse)
// + Raiffeisen RBBHnet (vlastiti 345 format, samo javni prihodi).
const PROFILI = new Set(["halcom", "unicredit", "elba", "raiffeisen"]);
const TRANSLITERACIJE = new Set(["yuscii", "cp1250", "cp852"]);
// Kodna stranica po banci za korisnički izvoz (admin harness može override
// radi testiranja): Halcom banke traže YUSCII, UniCredit i ELBA cp1250,
// Raiffeisen cp852.
const PROFIL_TRANSLIT = {
  halcom: "yuscii",
  unicredit: "cp1250",
  elba: "cp1250",
  raiffeisen: "cp852",
};
// Banke sa ekrana (BBI/ASA/Sparkasse dijele elba profil): pamti se zadnji
// izbor po organizaciji (Organization.bankExportBank) za predpopunu modala.
// Mapa banka → profil služi i kao validacija da se ne snimi banka koja ne
// odgovara traženom formatu (direktan API poziv sa nesparenim parom).
const BANKA_PROFIL = {
  halcom: "halcom",
  raiffeisen: "raiffeisen",
  unicredit: "unicredit",
  bbi: "elba",
  asa: "elba",
  sparkasse: "elba",
};

// "YYYY-MM-DD" → Date, ali samo za stvaran kalendarski datum: JS Date tiho
// prelijeva 30.02. u 02.03., što u datoteci za banku ne smije proći.
function parsirajDatumValute(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [dy, dm, dd] = s.split("-").map(Number);
  const d = new Date(dy, dm - 1, dd);
  if (d.getFullYear() !== dy || d.getMonth() !== dm - 1 || d.getDate() !== dd) {
    return null;
  }
  return d;
}

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

// Učita payroll-e mjeseca (isti izbor kao mjesečne uplatnice: svi zapisi,
// orphani se izbacuju) i sagradi naloge kroz adapter, BEZ formatiranja.
// Dijele je izvoz datoteke za e-bankarstvo i JSON za ESC/P štampu naloga.
async function sagradiNaloge({ org, year, month, datumValute, combineKantonal }) {
  const existingWorkers = await Worker.findAll({
    where: { organizationId: org.id },
    attributes: ["id"],
  });
  const validWorkerIds = new Set(existingWorkers.map((w) => w.id));
  const rawPayrolls = await Payroll.findAll({
    where: { organizationId: org.id, year, month },
  });
  const payrolls = rawPayrolls.filter((p) => validWorkerIds.has(p.workerId));
  if (payrolls.length === 0) {
    return { ok: false, status: 400, error: "NEMA_OBRACUNA" };
  }
  const workers = await Worker.findAll({
    where: { id: payrolls.map((p) => p.workerId), organizationId: org.id },
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
  return { ok: true, file, preskoceni, brojPayrolla: payrolls.length };
}

// Zajednička logika generisanja datoteke (admin harness + korisnički izvoz):
// sagradi naloge pa ih formatira za izabranu banku.
// Vraća { ok: true, buffer, file, preskoceni, fileName, translitEff,
// brojPayrolla } ili { ok: false, status, error, preskoceni? }.
async function generisiDatoteku({
  org,
  year,
  month,
  datumValute,
  profil,
  transliteracija,
  combineKantonal,
}) {
  const gradnja = await sagradiNaloge({
    org,
    year,
    month,
    datumValute,
    combineKantonal,
  });
  if (!gradnja.ok) return gradnja;
  const { file, preskoceni, brojPayrolla } = gradnja;

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
    return { ok: false, status: 400, error: "NEMA_NALOGA", preskoceni };
  }

  // ELBA je uvijek cp1250, Raiffeisen cp852; TKDIS prati traženu opciju.
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
      // prikazuje se direktno (admin za kalibraciju, korisnik da zna šta fali).
      return { ok: false, status: 400, error: e.message };
    }
    throw e;
  }

  const mm = String(month).padStart(2, "0");
  const orgSlug = String(org.name || "org")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "org";
  const fileName = `nalozi-${profil}-${orgSlug}-${year}-${mm}.txt`;

  return {
    ok: true,
    buffer,
    file,
    preskoceni,
    fileName,
    translitEff,
    brojPayrolla,
  };
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
  if (!parsirajDatumValute(datumValute)) {
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

  const r = await generisiDatoteku({
    org,
    year,
    month,
    datumValute,
    profil,
    transliteracija,
    combineKantonal,
  });
  if (!r.ok) {
    return res.status(r.status).json({
      ok: false,
      error: r.error,
      ...(r.preskoceni ? { preskoceni: r.preskoceni } : {}),
    });
  }

  const { rows, ima1a } = pregledRedova(r.buffer, r.translitEff);
  const ukupnoFeninga = r.file.nalozi.reduce((s, n) => s + n.iznosFeninga, 0);

  return res.json({
    ok: true,
    data: {
      fileName: r.fileName,
      base64: r.buffer.toString("base64"),
      rows,
      preskoceni: r.preskoceni,
      meta: {
        stub: false,
        format:
          profil === "elba" ? "elba" : profil === "raiffeisen" ? "raiffeisen" : "tkdis",
        profil,
        transliteracija: r.translitEff,
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
        brojNaloga: r.file.nalozi.length,
        ukupnoKm: ukupnoFeninga / 100,
        ukupnoBajta: r.buffer.length,
        eof1a: ima1a,
        brojPayrolla: r.brojPayrolla,
      },
    },
  });
}

// POST /api/payroll/bank-export (requireAuth + plan gate u payrollRoutes)
// Body: { orgId, year, month, datumValute (YYYY-MM-DD), profil, banka? }
// Korisnički izvoz iz obračuna plata: pristup samo vlastitim organizacijama,
// transliteracija automatska po banci, objedinjavanje kantonalnih prati
// postavku korisnika (istu koju koriste PDF uplatnice). Bez pregleda bajtova.
// banka = izbor sa ekrana (bbi/asa/sparkasse su elba profil); po uspjehu se
// pamti na organizaciji za predpopunu sljedećeg izvoza.
async function bankExport(req, res) {
  try {
    const orgId = parseId(req.body?.orgId);
    const year = Number(req.body?.year);
    const month = Number(req.body?.month);
    const datumValute = String(req.body?.datumValute || "");
    const profil = String(req.body?.profil || "");
    const banka = String(req.body?.banka || "");

    if (!orgId) return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ ok: false, error: "INVALID_PERIOD" });
    }
    if (!parsirajDatumValute(datumValute)) {
      return res.status(400).json({ ok: false, error: "INVALID_DATUM_VALUTE" });
    }
    if (!PROFILI.has(profil)) {
      return res.status(400).json({ ok: false, error: "INVALID_PROFIL" });
    }

    const org = await assertOrgAccess(orgId, req.user.id);
    if (!org) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

    const combineKantonal = await getCombineKantonal(req.user.id);
    const r = await generisiDatoteku({
      org,
      year,
      month,
      datumValute,
      profil,
      transliteracija: PROFIL_TRANSLIT[profil],
      combineKantonal,
    });
    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        error: r.error,
        ...(r.preskoceni ? { preskoceni: r.preskoceni } : {}),
      });
    }

    // Zapamti izbor banke po organizaciji (predpopuna sljedećeg izvoza);
    // banka mora odgovarati traženom profilu da nespareni API poziv ne bi
    // snimio pogrešnu predpopunu. Best-effort, ne smije srušiti odgovor.
    if (BANKA_PROFIL[banka] === profil && org.bankExportBank !== banka) {
      await org.update({ bankExportBank: banka }).catch(() => {});
    }

    const ukupnoFeninga = r.file.nalozi.reduce((s, n) => s + n.iznosFeninga, 0);
    return res.json({
      ok: true,
      data: {
        fileName: r.fileName,
        base64: r.buffer.toString("base64"),
        preskoceni: r.preskoceni,
        meta: {
          profil,
          brojNaloga: r.file.nalozi.length,
          ukupnoKm: ukupnoFeninga / 100,
        },
      },
    });
  } catch (e) {
    console.error("bankExport error:", e);
    return res
      .status(500)
      .json({ ok: false, error: "Greška pri generisanju datoteke" });
  }
}

// Lokalni datum kao "YYYY-MM-DD" (bez toISOString: UTC pomak bi za lokalnu
// ponoć u UTC+1/+2 vratio PRETHODNI dan).
function isoLokalno(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// POST /api/admin/izvoz-naloga/nalozi  (ADMIN)
// Body: { orgId, year, month, datumValute (YYYY-MM-DD), combineKantonal }
// Nalozi obračuna kao JSON za ekran pregleda i ESC/P štampu na matričnom
// pisaču (Faza 1): isti adapter kao izvoz datoteka, bez formatiranja.
// Spec: docs/faza1-escp-stampa-naloga.md
async function listNaloziZaStampu(req, res) {
  const orgId = parseId(req.body?.orgId);
  const year = Number(req.body?.year);
  const month = Number(req.body?.month);
  const datumValute = String(req.body?.datumValute || "");
  const combineKantonal = !!req.body?.combineKantonal;

  if (!orgId) return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ ok: false, error: "INVALID_PERIOD" });
  }
  if (!parsirajDatumValute(datumValute)) {
    return res.status(400).json({ ok: false, error: "INVALID_DATUM_VALUTE" });
  }

  const org = await Organization.findByPk(orgId);
  if (!org) return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });

  const r = await sagradiNaloge({ org, year, month, datumValute, combineKantonal });
  if (!r.ok) {
    return res.status(r.status).json({ ok: false, error: r.error });
  }

  return res.json({
    ok: true,
    data: {
      platilac: r.file.platilac,
      datumValute,
      nalozi: r.file.nalozi.map((n, i) => ({
        rb: i + 1,
        tip: n.tip,
        naziv: n.naziv || "",
        mjesto: n.mjesto || "",
        racun: n.racun || "",
        svrha: n.svrha || "",
        iznosKm: +(n.iznosFeninga / 100).toFixed(2),
        jib: n.jib || "",
        vrstaPrihoda: n.vrstaPrihoda || "",
        opcina: n.opcina || "",
        budzetskaOrganizacija: n.budzetskaOrganizacija || "",
        pozivNaBroj: n.pozivNaBroj || "",
        periodOd: isoLokalno(n.periodOd),
        periodDo: isoLokalno(n.periodDo),
      })),
      preskoceni: r.preskoceni,
    },
  });
}

module.exports = {
  listOrganizacije,
  listObracuni,
  generisi,
  bankExport,
  listNaloziZaStampu,
};
