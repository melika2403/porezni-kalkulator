// Lager lista i popis (inventura) maloprodaje. Stanje se IZVODI na datum
// presjeka: zbir količina iz kalkulacija (ulaz) + delte proknjiženih popisa
// (popisano - knjigovodstveno). Zaliha se vodi po artiklu I PO MPC-u (isti
// artikal sa dvije cijene = dva reda). Popis je jedino razduženje: nema kase
// po artiklima u PK Office (pazar je ukupan iznos), odluka vlasnika.

const { Op } = require("sequelize");
const {
  sequelize,
  Artikal,
  Popis,
  PopisStavka,
  Nivelacija,
  NivelacijaStavka,
  Razduzenje,
  RazduzenjeStavka,
  Partner,
  UlazniRacun,
  TkmPocetnoStanje,
  TkmPazar,
  Organization,
} = require("../models/index");

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseIsoDate(v) {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const r3 = (n) => Math.round((n + Number.EPSILON) * 1000) / 1000;
const r5 = (n) => Math.round((n + Number.EPSILON) * 1e5) / 1e5;

const key = (artikalId, mpc) => `${artikalId}|${Number(mpc).toFixed(2)}`;

// Knjigovodstveno stanje po (artikal, MPC) na datum: ulazi iz kalkulacija +
// delte proknjiženih popisa. Vraća mapu key -> { artikalId, mpc, kolicina,
// nabavnaCijena (prosječna iz kalkulacija) }.
async function computeLager(organizationId, datum) {
  const [ulazi] = await sequelize.query(
    `SELECT ks.artikalId, ks.mpc,
            SUM(ks.kolicina) AS ulaz,
            SUM(ks.nabavniIznos) AS nabavniIznos,
            MAX(k.datum) AS zadnjiUlaz
     FROM kalkulacija_stavke ks
     JOIN kalkulacije k ON k.id = ks.kalkulacijaId
     WHERE k.organizationId = ? AND k.datum <= ?
     GROUP BY ks.artikalId, ks.mpc`,
    { replacements: [organizationId, datum] },
  );
  const [delte] = await sequelize.query(
    `SELECT ps.artikalId, ps.mpc,
            SUM(ps.popisKolicina - ps.knjigKolicina) AS delta
     FROM popis_stavke ps
     JOIN popisi p ON p.id = ps.popisId
     WHERE p.organizationId = ? AND p.status = 'PROKNJIZEN' AND p.datum <= ?
     GROUP BY ps.artikalId, ps.mpc`,
    { replacements: [organizationId, datum] },
  );
  // nivelacija: količina prelazi sa stare MPC na novu (dvije delte).
  // ORDER BY hronološki: lančane nivelacije (A->B pa B->C) moraju se
  // obraditi redom da red na novoj cijeni naslijedi tačnu nabavnu cijenu.
  const [nivelacije] = await sequelize.query(
    `SELECT ns.artikalId, ns.kolicina, ns.staraMpc, ns.novaMpc
     FROM nivelacija_stavke ns
     JOIN nivelacije n ON n.id = ns.nivelacijaId
     WHERE n.organizationId = ? AND n.datum <= ?
     ORDER BY n.datum ASC, n.id ASC`,
    { replacements: [organizationId, datum] },
  );
  // povrat/otpis: skida količinu sa (artikal, mpc)
  const [razduzenja] = await sequelize.query(
    `SELECT rs.artikalId, rs.mpc, SUM(rs.kolicina) AS kolicina
     FROM razduzenje_stavke rs
     JOIN razduzenja r ON r.id = rs.razduzenjeId
     WHERE r.organizationId = ? AND r.datum <= ?
     GROUP BY rs.artikalId, rs.mpc`,
    { replacements: [organizationId, datum] },
  );

  const map = new Map();
  for (const u of ulazi) {
    const ulaz = Number(u.ulaz) || 0;
    map.set(key(u.artikalId, u.mpc), {
      artikalId: Number(u.artikalId),
      mpc: Number(u.mpc),
      kolicina: r3(ulaz),
      nabavnaCijena: ulaz > 0 ? r5(Number(u.nabavniIznos) / ulaz) : 0,
      zadnjiUlaz: u.zadnjiUlaz || null,
    });
  }
  const bump = (artikalId, mpc, delta) => {
    const k = key(artikalId, mpc);
    const row = map.get(k) ?? {
      artikalId: Number(artikalId),
      mpc: Number(mpc),
      kolicina: 0,
      nabavnaCijena: 0,
    };
    row.kolicina = r3(row.kolicina + delta);
    map.set(k, row);
  };
  for (const d of delte) bump(d.artikalId, d.mpc, Number(d.delta) || 0);
  for (const n of nivelacije) {
    const kol = Number(n.kolicina) || 0;
    bump(n.artikalId, n.staraMpc, -kol);
    // red na novoj cijeni nasljeđuje nabavnu cijenu reda sa stare cijene
    // (ako novi red još ne postoji) da obračuni popisa/povrata imaju nabavnu
    const stari = map.get(key(n.artikalId, n.staraMpc));
    const noviKey = key(n.artikalId, n.novaMpc);
    if (!map.has(noviKey) && stari) {
      map.set(noviKey, {
        artikalId: Number(n.artikalId),
        mpc: Number(n.novaMpc),
        kolicina: 0,
        nabavnaCijena: stari.nabavnaCijena,
      });
    }
    bump(n.artikalId, n.novaMpc, kol);
  }
  for (const rz of razduzenja) {
    bump(rz.artikalId, rz.mpc, -(Number(rz.kolicina) || 0));
  }
  return map;
}

// GET /api/lager/:orgId?datum=YYYY-MM-DD
async function lager(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const datum =
      parseIsoDate(req.query.datum) || new Date().toISOString().slice(0, 10);

    const map = await computeLager(organizationId, datum);
    const artikli = await Artikal.findAll({
      where: { organizationId },
      raw: true,
    });
    const artikalById = new Map(artikli.map((a) => [a.id, a]));

    const rows = [...map.values()]
      .map((r) => {
        const a = artikalById.get(r.artikalId);
        return {
          artikalId: r.artikalId,
          sifra: a?.sifra ?? "?",
          naziv: a?.naziv ?? "(obrisan artikal)",
          jm: a?.jm ?? "KOM",
          mpc: r.mpc,
          kolicina: r.kolicina,
          vrijednost: Math.round(r.kolicina * r.mpc * 100) / 100,
          // prosječna nabavna iz kalkulacija (vrijednost zalihe i RUC)
          nabavnaCijena: r.nabavnaCijena,
          nabavnaVrijednost:
            Math.round(r.kolicina * r.nabavnaCijena * 100) / 100,
          oslobodjenPdv: Boolean(a?.oslobodjenPdv),
          zadnjiUlaz: r.zadnjiUlaz ?? null,
        };
      })
      .sort(
        (x, y) => x.sifra.localeCompare(y.sifra, "bs") || x.mpc - y.mpc,
      );

    return res.json({ ok: true, data: { datum, rows } });
  } catch (err) {
    console.error("lager error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// GET /api/lager/:orgId/artikal/:artikalId — kartica artikla: svi ulazi iz
// kalkulacija + korekcije iz proknjiženih popisa, hronološki sa tekućim
// stanjem nakon svakog događaja (sve cijene zajedno).
async function artikalKartica(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const artikalId = parseId(req.params.artikalId);
    if (!organizationId || !artikalId) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const artikal = await Artikal.findOne({
      where: { id: artikalId, organizationId },
    });
    if (!artikal) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const [ulazi] = await sequelize.query(
      `SELECT k.id AS docId, k.datum, k.broj, k.godina, ks.kolicina, ks.mpc,
              ks.nabavnaCijena, p.name AS dobavljac
       FROM kalkulacija_stavke ks
       JOIN kalkulacije k ON k.id = ks.kalkulacijaId
       LEFT JOIN partners p ON p.id = k.partnerId
       WHERE k.organizationId = ? AND ks.artikalId = ?
       ORDER BY k.datum ASC, k.id ASC`,
      { replacements: [organizationId, artikalId] },
    );
    const [popisi] = await sequelize.query(
      `SELECT p.id AS docId, p.datum, p.broj, p.godina, ps.mpc,
              ps.popisKolicina, ps.knjigKolicina
       FROM popis_stavke ps
       JOIN popisi p ON p.id = ps.popisId
       WHERE p.organizationId = ? AND ps.artikalId = ?
         AND p.status = 'PROKNJIZEN'
       ORDER BY p.datum ASC, p.id ASC`,
      { replacements: [organizationId, artikalId] },
    );

    const [nivStavke] = await sequelize.query(
      `SELECT n.datum, n.broj, n.godina, ns.kolicina, ns.staraMpc, ns.novaMpc
       FROM nivelacija_stavke ns
       JOIN nivelacije n ON n.id = ns.nivelacijaId
       WHERE n.organizationId = ? AND ns.artikalId = ?
       ORDER BY n.datum ASC, n.id ASC`,
      { replacements: [organizationId, artikalId] },
    );
    const [razStavke] = await sequelize.query(
      `SELECT r.datum, r.broj, r.godina, r.tip, rs.kolicina, rs.mpc,
              p.name AS partner
       FROM razduzenje_stavke rs
       JOIN razduzenja r ON r.id = rs.razduzenjeId
       LEFT JOIN partners p ON p.id = r.partnerId
       WHERE r.organizationId = ? AND rs.artikalId = ?
       ORDER BY r.datum ASC, r.id ASC`,
      { replacements: [organizationId, artikalId] },
    );

    const events = [
      ...ulazi.map((u) => ({
        tip: "KALKULACIJA",
        datum: u.datum,
        oznaka: `${u.broj}/${String(u.godina).slice(-2)}`,
        opis: u.dobavljac || null,
        kolicina: Number(u.kolicina),
        mpc: Number(u.mpc),
        nabavnaCijena: Number(u.nabavnaCijena),
      })),
      ...popisi.map((p) => ({
        tip: "POPIS",
        datum: p.datum,
        oznaka: `${p.broj}/${String(p.godina).slice(-2)}`,
        opis: null,
        kolicina: r3(Number(p.popisKolicina) - Number(p.knjigKolicina)),
        mpc: Number(p.mpc),
        nabavnaCijena: null,
      })),
      // nivelacija: dva reda (skidanje sa stare i dodavanje na novu cijenu)
      ...nivStavke.flatMap((n) => {
        const oznaka = `${n.broj}/${String(n.godina).slice(-2)}`;
        return [
          {
            tip: "NIVELACIJA",
            datum: n.datum,
            oznaka,
            opis: `sa MPC ${Number(n.staraMpc).toFixed(2)}`,
            kolicina: -Number(n.kolicina),
            mpc: Number(n.staraMpc),
            nabavnaCijena: null,
          },
          {
            tip: "NIVELACIJA",
            datum: n.datum,
            oznaka,
            opis: `na MPC ${Number(n.novaMpc).toFixed(2)}`,
            kolicina: Number(n.kolicina),
            mpc: Number(n.novaMpc),
            nabavnaCijena: null,
          },
        ];
      }),
      ...razStavke.map((rz) => ({
        tip: rz.tip,
        datum: rz.datum,
        oznaka: `${rz.broj}/${String(rz.godina).slice(-2)}`,
        opis: rz.tip === "POVRAT" ? rz.partner || null : null,
        kolicina: -Number(rz.kolicina),
        mpc: Number(rz.mpc),
        nabavnaCijena: null,
      })),
    ].sort(
      (a, b) =>
        a.datum.localeCompare(b.datum) ||
        // isti dan: prvo kalkulacije (ulazi), popis zadnji (snima stanje)
        (a.tip === b.tip
          ? 0
          : a.tip === "KALKULACIJA"
            ? -1
            : b.tip === "KALKULACIJA"
              ? 1
              : a.tip === "POPIS"
                ? 1
                : b.tip === "POPIS"
                  ? -1
                  : 0),
    );

    let stanje = 0;
    for (const e of events) {
      stanje = r3(stanje + e.kolicina);
      e.stanje = stanje;
    }

    return res.json({
      ok: true,
      data: {
        artikal: {
          id: artikal.id,
          sifra: artikal.sifra,
          naziv: artikal.naziv,
          tip: artikal.tip === "USLUGA" ? "USLUGA" : "ROBA",
          jm: artikal.jm,
          barkod: artikal.barkod,
          oslobodjenPdv: Boolean(artikal.oslobodjenPdv),
          aktivan: Boolean(artikal.aktivan),
        },
        stanje,
        events,
      },
    });
  } catch (err) {
    console.error("artikal kartica error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ─── TKM (trgovačka knjiga na malo) ──────────────────────────────────────────
// Izvedena knjiga po Pravilniku (Sl. novine FBiH 56/2025, čl. 16-17):
// kolone r.br, datum, opis promjene, zaduženje, razduženje. Zaduženje =
// maloprodajna vrijednost kalkulacija + višak po popisu; razduženje = pazar
// (dnevni/mjesečni promet) + manjak po popisu. Saldo = vrijednost zaliha.

// zbirni redovi TKM-a za period [from, to]; koristi se i za donos (prije from)
async function tkmEvents(organizationId, from, to) {
  const [kalk] = await sequelize.query(
    `SELECT k.datum, k.broj, k.godina, k.brojRacuna,
            k.maloprodajnaVrijednost AS vrijednost, p.name AS dobavljac
     FROM kalkulacije k
     LEFT JOIN partners p ON p.id = k.partnerId
     WHERE k.organizationId = ? AND k.datum >= ? AND k.datum <= ?
     ORDER BY k.datum ASC, k.id ASC`,
    { replacements: [organizationId, from, to] },
  );
  const [popisi] = await sequelize.query(
    `SELECT p.datum, p.broj, p.godina, p.pocetnoStanje,
            SUM(CASE WHEN ps.popisKolicina > ps.knjigKolicina
                THEN (ps.popisKolicina - ps.knjigKolicina) * ps.mpc
                ELSE 0 END) AS visak,
            SUM(CASE WHEN ps.popisKolicina < ps.knjigKolicina
                THEN (ps.knjigKolicina - ps.popisKolicina) * ps.mpc
                ELSE 0 END) AS manjak
     FROM popisi p
     JOIN popis_stavke ps ON ps.popisId = p.id
     WHERE p.organizationId = ? AND p.status = 'PROKNJIZEN'
       AND p.datum >= ? AND p.datum <= ?
     GROUP BY p.id, p.datum, p.broj, p.godina, p.pocetnoStanje
     ORDER BY p.datum ASC, p.id ASC`,
    { replacements: [organizationId, from, to] },
  );
  // pazar SAMO iz tkm_pazari (odvojeno od KIF-a): dnevni unosi + mjesečna
  // knjiženja koja su izričito označena za TKM
  const [pazari] = await sequelize.query(
    `SELECT id, datum, iznos, opis FROM tkm_pazari
     WHERE organizationId = ? AND datum >= ? AND datum <= ?
     ORDER BY datum ASC, id ASC`,
    { replacements: [organizationId, from, to] },
  );

  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const events = [];
  for (const k of kalk) {
    const dijelovi = [
      `Kalkulacija ${k.broj}/${String(k.godina).slice(-2)}`,
      k.dobavljac || null,
      k.brojRacuna ? `račun ${k.brojRacuna}` : null,
    ].filter(Boolean);
    events.push({
      datum: k.datum,
      opis: dijelovi.join(", "),
      zaduzenje: r2(Number(k.vrijednost)),
      razduzenje: 0,
    });
  }
  for (const p of popisi) {
    const oznaka = `${p.broj}/${String(p.godina).slice(-2)}`;
    const visak = r2(Number(p.visak) || 0);
    const manjak = r2(Number(p.manjak) || 0);
    if (visak > 0) {
      events.push({
        datum: p.datum,
        opis: p.pocetnoStanje
          ? `Početno stanje zaliha po popisu ${oznaka}`
          : `Popis ${oznaka}, višak po popisnoj listi`,
        zaduzenje: visak,
        razduzenje: 0,
      });
    }
    if (manjak > 0) {
      events.push({
        datum: p.datum,
        opis: `Popis ${oznaka}, manjak po popisnoj listi`,
        zaduzenje: 0,
        razduzenje: manjak,
      });
    }
  }
  for (const pz of pazari) {
    events.push({
      datum: pz.datum,
      opis: pz.opis || "Dnevni promet (pazar)",
      zaduzenje: 0,
      razduzenje: r2(Number(pz.iznos)),
      // omogućava brisanje pogrešnog unosa direktno iz TKM tabele
      tkmPazarId: pz.id,
    });
  }
  // nivelacije: razlika vrijednosti ide u zaduženje (smanjenje = storno,
  // negativan iznos u koloni zaduženja, čl. 17. stav d)
  const [nivelacije] = await sequelize.query(
    `SELECT datum, broj, godina, razlika FROM nivelacije
     WHERE organizationId = ? AND datum >= ? AND datum <= ?
     ORDER BY datum ASC, id ASC`,
    { replacements: [organizationId, from, to] },
  );
  for (const n of nivelacije) {
    events.push({
      datum: n.datum,
      opis: `Nivelacija ${n.broj}/${String(n.godina).slice(-2)}, zapisnik o promjeni cijena`,
      zaduzenje: r2(Number(n.razlika)),
      razduzenje: 0,
    });
  }
  // povrat/otpis: negativno zaduženje po maloprodajnoj vrijednosti
  const [razduzenja] = await sequelize.query(
    `SELECT r.datum, r.broj, r.godina, r.tip, r.razlog,
            r.maloprodajnaVrijednost AS vrijednost, p.name AS partner
     FROM razduzenja r
     LEFT JOIN partners p ON p.id = r.partnerId
     WHERE r.organizationId = ? AND r.datum >= ? AND r.datum <= ?
     ORDER BY r.datum ASC, r.id ASC`,
    { replacements: [organizationId, from, to] },
  );
  for (const rz of razduzenja) {
    const oznaka = `${rz.broj}/${String(rz.godina).slice(-2)}`;
    const opis =
      rz.tip === "POVRAT"
        ? `Povrat robe dobavljaču ${oznaka}${rz.partner ? `, ${rz.partner}` : ""}`
        : `Otpis robe ${oznaka}${rz.razlog ? ` (${rz.razlog})` : ""}`;
    events.push({
      datum: rz.datum,
      opis,
      zaduzenje: r2(-Number(rz.vrijednost)),
      razduzenje: 0,
    });
  }
  events.sort((a, b) => a.datum.localeCompare(b.datum));
  return events;
}

// GET /api/lager/:orgId/tkm?godina=YYYY
async function tkm(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const godina =
      Number(req.query.godina) > 2000
        ? Number(req.query.godina)
        : new Date().getFullYear();
    const from = `${godina}-01-01`;
    const to = `${godina}-12-31`;

    // donos: saldo svih promjena prije početka godine (čl. 21: saldo se
    // prenosi u narednu godinu kao početno stanje); uključuje i ručno
    // unesena početna stanja prethodnih godina
    const prije = await tkmEvents(organizationId, "1900-01-01", `${godina - 1}-12-31`);
    const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const rucnaPrije = await TkmPocetnoStanje.sum("iznos", {
      where: { organizationId, godina: { [Op.lt]: godina } },
    });
    const donos = r2(
      prije.reduce((a, e) => a + e.zaduzenje - e.razduzenje, 0) +
        (Number(rucnaPrije) || 0),
    );

    const events = await tkmEvents(organizationId, from, to);
    // ručno uneseno početno stanje za OVU godinu: poseban red na vrhu
    const rucno = await TkmPocetnoStanje.findOne({
      where: { organizationId, godina },
    });
    if (rucno && Number(rucno.iznos) !== 0) {
      events.unshift({
        datum: from,
        opis: `Početno stanje (ručni unos)${rucno.napomena ? `, ${rucno.napomena}` : ""}`,
        zaduzenje: r2(Number(rucno.iznos)),
        razduzenje: 0,
      });
    }
    return res.json({
      ok: true,
      data: {
        godina,
        donos,
        rucnoPocetno: rucno ? Number(rucno.iznos) : null,
        rucnoNapomena: rucno?.napomena ?? null,
        events,
      },
    });
  } catch (err) {
    console.error("tkm error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ─── popisi ──────────────────────────────────────────────────────────────────

async function nextBroj(organizationId, godina, t) {
  const max = await Popis.max("broj", {
    where: { organizationId, godina },
    transaction: t,
  });
  return (Number(max) || 0) + 1;
}

function popisJson(p, stavkeCount) {
  return {
    id: p.id,
    broj: p.broj,
    godina: p.godina,
    oznaka: `${p.broj}/${String(p.godina).slice(-2)}`,
    datum: p.datum,
    status: p.status,
    napomena: p.napomena,
    pocetnoStanje: Boolean(p.pocetnoStanje),
    stavkeCount,
  };
}

function stavkaJson(s) {
  return {
    id: s.id,
    artikalId: s.artikalId,
    sifra: s.sifra,
    naziv: s.naziv,
    jm: s.jm,
    mpc: Number(s.mpc),
    nabavnaCijena: Number(s.nabavnaCijena),
    pdvStopa: Number(s.pdvStopa),
    knjigKolicina: Number(s.knjigKolicina),
    popisKolicina: Number(s.popisKolicina),
  };
}

// Stavke popisa iz knjigovodstvenog stanja na datum (snapshot). Uključuju se
// i redovi sa stanjem 0 (može se popisati višak).
async function buildStavke(organizationId, datum) {
  const map = await computeLager(organizationId, datum);
  const org = await Organization.findByPk(organizationId);
  const orgObveznik = Boolean(org?.isPdvObveznik);
  const artikli = await Artikal.findAll({
    where: { organizationId },
    raw: true,
  });
  const artikalById = new Map(artikli.map((a) => [a.id, a]));

  return [...map.values()]
    .map((r) => {
      const a = artikalById.get(r.artikalId);
      return {
        artikalId: r.artikalId,
        sifra: a?.sifra ?? "?",
        naziv: a?.naziv ?? "(obrisan artikal)",
        jm: a?.jm ?? "KOM",
        mpc: r.mpc,
        nabavnaCijena: r.nabavnaCijena,
        pdvStopa: orgObveznik && !a?.oslobodjenPdv ? 17 : 0,
        knjigKolicina: r.kolicina,
      };
    })
    .sort((x, y) => x.sifra.localeCompare(y.sifra, "bs") || x.mpc - y.mpc);
}

// GET /api/lager/:orgId/popisi
async function listPopisi(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const rows = await Popis.findAll({
    where: { organizationId },
    order: [["datum", "DESC"], ["id", "DESC"]],
  });
  const [counts] = rows.length
    ? await sequelize.query(
        `SELECT popisId, COUNT(*) AS cnt FROM popis_stavke
         WHERE popisId IN (${rows.map((r) => Number(r.id)).join(",")})
         GROUP BY popisId`,
      )
    : [[]];
  const countById = new Map(counts.map((c) => [c.popisId, Number(c.cnt)]));
  return res.json({
    ok: true,
    data: rows.map((p) => popisJson(p, countById.get(p.id) ?? 0)),
  });
}

// POST /api/lager/:orgId/popisi { datum, napomena }
async function createPopis(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const datum = parseIsoDate(req.body?.datum);
    if (!datum) return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
    const napomena = String(req.body?.napomena || "").trim() || null;
    const godina = Number(datum.slice(0, 4));

    const stavke = await buildStavke(organizationId, datum);

    let created = null;
    for (let attempt = 0; ; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        created = await sequelize.transaction(async (t) => {
          const broj = await nextBroj(organizationId, godina, t);
          const p = await Popis.create(
            { organizationId, broj, godina, datum, napomena },
            { transaction: t },
          );
          await PopisStavka.bulkCreate(
            stavke.map((s) => ({ ...s, popisId: p.id, popisKolicina: 0 })),
            { transaction: t },
          );
          return p;
        });
        break;
      } catch (e) {
        if (e.name === "SequelizeUniqueConstraintError" && attempt < 3) {
          continue;
        }
        throw e;
      }
    }
    return res
      .status(201)
      .json({ ok: true, data: popisJson(created, stavke.length) });
  } catch (err) {
    console.error("popis create error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/lager/:orgId/popisi/uvoz: uvoz početnog stanja lagera.
// Kreira DRAFT popis (pocetnoStanje) SAMO sa uvezenim redovima:
// knjigovodstvena količina se čita sa lagera na datum (obično 0), popisana
// je uvezena, pa proknjižavanje postavlja stanje tačno na uvezeno i NE dira
// ostalu robu (za razliku od običnog popisa koji nosi cijeli snapshot).
const UVOZ_LAGER_MAX_PRESKOCENO = 300;

async function uvozPocetnogStanja(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const datum = parseIsoDate(req.body?.datum);
    if (!datum) {
      return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
    }
    const napomena = String(req.body?.napomena || "").trim() || null;
    const rawStavke = Array.isArray(req.body?.stavke) ? req.body.stavke : [];
    if (rawStavke.length === 0) {
      return res.status(400).json({ ok: false, error: "EMPTY" });
    }
    if (rawStavke.length > 50000) {
      return res.status(400).json({ ok: false, error: "TOO_MANY" });
    }

    const artikli = await Artikal.findAll({
      where: { organizationId },
      raw: true,
    });
    const artikalBySifra = new Map(
      artikli.map((a) => [String(a.sifra).toLowerCase(), a]),
    );
    const org = await Organization.findByPk(organizationId);
    const orgObveznik = Boolean(org?.isPdvObveznik);
    const lagerMap = await computeLager(organizationId, datum);

    const preskoceno = [];
    let preskocenoUkupno = 0;
    const skip = (sifra, razlog) => {
      preskocenoUkupno++;
      if (preskoceno.length < UVOZ_LAGER_MAX_PRESKOCENO) {
        preskoceno.push({ sifra, razlog });
      }
    };

    // ista šifra + MPC više puta u fajlu: količine se sabiraju
    const poKljucu = new Map();
    let spojeno = 0;
    for (const s of rawStavke) {
      const sifra = String(s?.sifra || "").trim();
      if (!sifra) {
        skip("", "nema šifru");
        continue;
      }
      const artikal = artikalBySifra.get(sifra.toLowerCase());
      if (!artikal) {
        skip(sifra, "nema u šifarniku artikala");
        continue;
      }
      if (artikal.tip === "USLUGA") {
        skip(sifra, "usluga (nema zalihe)");
        continue;
      }
      const kolicina = Number(s?.kolicina);
      if (!Number.isFinite(kolicina) || kolicina <= 0) {
        skip(sifra, "neispravna količina");
        continue;
      }
      const mpc = Math.round(Number(s?.mpc) * 100) / 100;
      if (!Number.isFinite(mpc) || mpc <= 0) {
        skip(sifra, "neispravna MPC");
        continue;
      }
      const k = key(artikal.id, mpc);
      const existing = poKljucu.get(k);
      if (existing) {
        existing.popisKolicina = r3(existing.popisKolicina + kolicina);
        spojeno++;
        continue;
      }
      const nabavna = Number(s?.nabavnaCijena);
      const uLageru = lagerMap.get(k);
      poKljucu.set(k, {
        artikalId: artikal.id,
        sifra: artikal.sifra,
        naziv: artikal.naziv,
        jm: artikal.jm,
        mpc,
        nabavnaCijena:
          Number.isFinite(nabavna) && nabavna > 0
            ? r5(nabavna)
            : (uLageru?.nabavnaCijena ?? 0),
        pdvStopa: orgObveznik && !artikal.oslobodjenPdv ? 17 : 0,
        knjigKolicina: uLageru ? uLageru.kolicina : 0,
        popisKolicina: r3(kolicina),
      });
    }

    const stavke = [...poKljucu.values()].sort(
      (x, y) => x.sifra.localeCompare(y.sifra, "bs") || x.mpc - y.mpc,
    );
    if (stavke.length === 0) {
      return res.status(400).json({ ok: false, error: "NO_VALID_ROWS" });
    }

    const godina = Number(datum.slice(0, 4));
    let created = null;
    for (let attempt = 0; ; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        created = await sequelize.transaction(async (t) => {
          const broj = await nextBroj(organizationId, godina, t);
          const p = await Popis.create(
            {
              organizationId,
              broj,
              godina,
              datum,
              napomena: napomena || "Početno stanje lagera (uvoz)",
              pocetnoStanje: true,
            },
            { transaction: t },
          );
          for (let i = 0; i < stavke.length; i += 500) {
            // eslint-disable-next-line no-await-in-loop
            await PopisStavka.bulkCreate(
              stavke.slice(i, i + 500).map((s) => ({ ...s, popisId: p.id })),
              { transaction: t },
            );
          }
          return p;
        });
        break;
      } catch (e) {
        if (e.name === "SequelizeUniqueConstraintError" && attempt < 3) {
          continue;
        }
        throw e;
      }
    }

    return res.status(201).json({
      ok: true,
      data: {
        popis: popisJson(created, stavke.length),
        dodano: stavke.length,
        spojeno,
        preskocenoUkupno,
        preskoceno,
      },
    });
  } catch (err) {
    console.error("uvoz pocetnog stanja error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// GET /api/lager/:orgId/popisi/:id
async function getPopis(req, res) {
  const organizationId = parseId(req.params.orgId);
  const id = parseId(req.params.id);
  if (!organizationId || !id) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const p = await Popis.findOne({ where: { id, organizationId } });
  if (!p) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const stavke = await PopisStavka.findAll({
    where: { popisId: p.id },
    order: [["sifra", "ASC"], ["mpc", "ASC"]],
  });
  return res.json({
    ok: true,
    data: { ...popisJson(p, stavke.length), stavke: stavke.map(stavkaJson) },
  });
}

// PATCH /api/lager/:orgId/popisi/:id { napomena?, stavke: [{id, popisKolicina}] }
async function updatePopis(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const p = await Popis.findOne({ where: { id, organizationId } });
    if (!p) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (p.status !== "DRAFT") {
      return res.status(409).json({ ok: false, error: "POPIS_PROKNJIZEN" });
    }
    const body = req.body || {};
    if (body.napomena !== undefined) {
      await p.update({ napomena: String(body.napomena || "").trim() || null });
    }
    const stavke = Array.isArray(body.stavke) ? body.stavke : [];
    for (const s of stavke) {
      const sid = parseId(s.id);
      const kolicina = Number(s.popisKolicina);
      if (!sid || !Number.isFinite(kolicina) || kolicina < 0) continue;
      // eslint-disable-next-line no-await-in-loop
      await PopisStavka.update(
        { popisKolicina: r3(kolicina) },
        { where: { id: sid, popisId: p.id } },
      );
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("popis update error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// Uskladi snapshot knjigovodstvenih količina sa stvarnim stanjem na datum
// popisa (nove kalkulacije unesene nakon otvaranja popisa). Čuva unesene
// popisane količine; dodaje nove redove, briše prazne koji su nestali.
async function refreshStavke(p, t) {
  const fresh = await buildStavke(p.organizationId, p.datum);
  const freshByKey = new Map(fresh.map((s) => [key(s.artikalId, s.mpc), s]));
  const existing = await PopisStavka.findAll({
    where: { popisId: p.id },
    transaction: t,
  });
  const seen = new Set();
  for (const st of existing) {
    const k = key(st.artikalId, st.mpc);
    seen.add(k);
    const f = freshByKey.get(k);
    if (f) {
      // eslint-disable-next-line no-await-in-loop
      await st.update(
        {
          knjigKolicina: f.knjigKolicina,
          nabavnaCijena: f.nabavnaCijena,
          pdvStopa: f.pdvStopa,
          sifra: f.sifra,
          naziv: f.naziv,
          jm: f.jm,
        },
        { transaction: t },
      );
    } else if (Number(st.popisKolicina) === 0) {
      // eslint-disable-next-line no-await-in-loop
      await st.destroy({ transaction: t });
    } else {
      // popisan artikal kojem je nestalo knjigovodstvno stanje: knjig = 0
      // eslint-disable-next-line no-await-in-loop
      await st.update({ knjigKolicina: 0 }, { transaction: t });
    }
  }
  // popis početnog stanja sadrži SAMO uvezene redove: dodavanje snapshot
  // redova sa popisKolicina 0 bi pri proknjižavanju otpisalo svu ostalu robu
  if (p.pocetnoStanje) return;
  const toAdd = fresh.filter((s) => !seen.has(key(s.artikalId, s.mpc)));
  if (toAdd.length) {
    await PopisStavka.bulkCreate(
      toAdd.map((s) => ({ ...s, popisId: p.id, popisKolicina: 0 })),
      { transaction: t },
    );
  }
}

// POST /api/lager/:orgId/popisi/:id/refresh (samo DRAFT)
async function refreshPopis(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const p = await Popis.findOne({ where: { id, organizationId } });
    if (!p) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (p.status !== "DRAFT") {
      return res.status(409).json({ ok: false, error: "POPIS_PROKNJIZEN" });
    }
    await sequelize.transaction((t) => refreshStavke(p, t));
    return res.json({ ok: true });
  } catch (err) {
    console.error("popis refresh error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/lager/:orgId/popisi/:id/proknjizi — zaključa popis; od tada
// njegova delta (popisano - knjigovodstveno) ulazi u lager. NE osvježava
// knjigovodstvene količine: knjiži se TAČNO ono što je korisnik potvrdio u
// obračunu popisa. Za usklađivanje sa naknadnim kalkulacijama postoji
// dugme "Osvježi stanje" (refreshPopis) koje korisnik pokrene i pregleda
// prije proknjižavanja. (Auto-refresh bi tiho ubacio nove neprebrojane
// artikle sa količinom 0 i otpisao ih kao manjak van potvrđenog obračuna.)
async function proknjiziPopis(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const p = await Popis.findOne({ where: { id, organizationId } });
    if (!p) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (p.status !== "DRAFT") {
      return res.status(409).json({ ok: false, error: "POPIS_PROKNJIZEN" });
    }
    await p.update({ status: "PROKNJIZEN" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("popis proknjizi error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// Postoji li drugi PROKNJIZEN popis čiji snapshot knjigovodstvenog stanja
// zavisi od ovog (kasniji po datumu, ili isti datum pa veći id = proknjižen
// kasnije). Delta takvog popisa je snimljena PREKO delte ovog, pa bi
// otknjiživanje/brisanje ovog pokvarilo lager. Vrati ga (ili null).
async function novijiZavisniPopis(organizationId, popis) {
  return Popis.findOne({
    where: {
      organizationId,
      status: "PROKNJIZEN",
      id: { [Op.ne]: popis.id },
      [Op.or]: [
        { datum: { [Op.gt]: popis.datum } },
        { datum: popis.datum, id: { [Op.gt]: popis.id } },
      ],
    },
    order: [["datum", "DESC"], ["id", "DESC"]],
  });
}

// POST /api/lager/:orgId/popisi/:id/otknjizi — vrati u DRAFT (ispravke)
async function otknjiziPopis(req, res) {
  const organizationId = parseId(req.params.orgId);
  const id = parseId(req.params.id);
  if (!organizationId || !id) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const p = await Popis.findOne({ where: { id, organizationId } });
  if (!p) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  if (p.status !== "PROKNJIZEN") {
    return res.status(409).json({ ok: false, error: "POPIS_NIJE_PROKNJIZEN" });
  }
  // ne dozvoli otknjiživanje ako kasniji proknjižen popis zavisi od njega
  if (await novijiZavisniPopis(organizationId, p)) {
    return res.status(409).json({ ok: false, error: "POSTOJI_NOVIJI_POPIS" });
  }
  await p.update({ status: "DRAFT" });
  return res.json({ ok: true });
}

// DELETE /api/lager/:orgId/popisi/:id
async function removePopis(req, res) {
  const organizationId = parseId(req.params.orgId);
  const id = parseId(req.params.id);
  if (!organizationId || !id) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const p = await Popis.findOne({ where: { id, organizationId } });
  if (!p) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  // proknjižen popis se ne smije obrisati ako kasniji proknjižen popis
  // zavisi od njegove delte (isti razlog kao kod otknjiživanja)
  if (
    p.status === "PROKNJIZEN" &&
    (await novijiZavisniPopis(organizationId, p))
  ) {
    return res.status(409).json({ ok: false, error: "POSTOJI_NOVIJI_POPIS" });
  }
  await sequelize.transaction(async (t) => {
    await PopisStavka.destroy({ where: { popisId: p.id }, transaction: t });
    await p.destroy({ transaction: t });
  });
  return res.json({ ok: true });
}

// PUT /api/lager/:orgId/tkm/pocetno-stanje { godina, iznos, napomena? }
// Upsert ručnog početnog stanja; iznos 0 briše unos.
async function setTkmPocetnoStanje(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const godina = Number(req.body?.godina);
    if (!Number.isInteger(godina) || godina < 2000 || godina > 2100) {
      return res.status(400).json({ ok: false, error: "GODINA_INVALID" });
    }
    const iznos = Math.round(Number(req.body?.iznos) * 100) / 100;
    if (!Number.isFinite(iznos) || iznos < 0) {
      return res.status(400).json({ ok: false, error: "IZNOS_INVALID" });
    }
    const napomena = String(req.body?.napomena || "").trim() || null;

    const existing = await TkmPocetnoStanje.findOne({
      where: { organizationId, godina },
    });
    if (iznos === 0) {
      if (existing) await existing.destroy();
    } else if (existing) {
      await existing.update({ iznos, napomena });
    } else {
      await TkmPocetnoStanje.create({ organizationId, godina, iznos, napomena });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("tkm pocetno stanje error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// GET /api/lager/:orgId/tkm/pazari?godina= — evidencija dnevnog prometa
// (zajednička za TKM razduženje i Knjigu prometa KP-1042)
async function listTkmPazari(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const godina =
    Number(req.query.godina) > 2000
      ? Number(req.query.godina)
      : new Date().getFullYear();
  const rows = await TkmPazar.findAll({
    where: {
      organizationId,
      datum: { [Op.between]: [`${godina}-01-01`, `${godina}-12-31`] },
    },
    order: [["datum", "ASC"], ["id", "ASC"]],
  });
  return res.json({
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      datum: r.datum,
      iznos: Number(r.iznos),
      opis: r.opis,
    })),
  });
}

// POST /api/lager/:orgId/tkm/pazar { datum, iznos, opis? } — dnevni pazar
// SAMO za TKM (ne ide u KIF ni PDV evidencije)
async function addTkmPazar(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const datum = parseIsoDate(req.body?.datum);
    if (!datum) return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
    const iznos = Math.round(Number(req.body?.iznos) * 100) / 100;
    if (!Number.isFinite(iznos) || iznos <= 0) {
      return res.status(400).json({ ok: false, error: "IZNOS_INVALID" });
    }
    const opis =
      String(req.body?.opis || "").trim().slice(0, 120) || null;
    const created = await TkmPazar.create({
      organizationId,
      datum,
      iznos,
      opis,
    });
    return res.status(201).json({ ok: true, data: { id: created.id } });
  } catch (err) {
    console.error("tkm pazar error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// DELETE /api/lager/:orgId/tkm/pazar/:id
async function removeTkmPazar(req, res) {
  const organizationId = parseId(req.params.orgId);
  const id = parseId(req.params.id);
  if (!organizationId || !id) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const row = await TkmPazar.findOne({ where: { id, organizationId } });
  if (!row) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await row.destroy();
  return res.json({ ok: true });
}

// ─── nivelacije ──────────────────────────────────────────────────────────────

const r2v = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function oznakaOd(broj, godina) {
  return `${broj}/${String(godina).slice(-2)}`;
}

// GET /api/lager/:orgId/nivelacije
async function listNivelacije(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const rows = await Nivelacija.findAll({
    where: { organizationId },
    include: [{ model: NivelacijaStavka, as: "stavke" }],
    order: [["datum", "DESC"], ["id", "DESC"]],
  });
  return res.json({
    ok: true,
    data: rows.map((n) => ({
      id: n.id,
      broj: n.broj,
      godina: n.godina,
      oznaka: oznakaOd(n.broj, n.godina),
      datum: n.datum,
      napomena: n.napomena,
      vrijednostStara: Number(n.vrijednostStara),
      vrijednostNova: Number(n.vrijednostNova),
      razlika: Number(n.razlika),
      stavke: (n.stavke ?? []).map((s) => ({
        id: s.id,
        artikalId: s.artikalId,
        sifra: s.sifra,
        naziv: s.naziv,
        jm: s.jm,
        kolicina: Number(s.kolicina),
        staraMpc: Number(s.staraMpc),
        novaMpc: Number(s.novaMpc),
        vrijednostStara: Number(s.vrijednostStara),
        vrijednostNova: Number(s.vrijednostNova),
        razlika: Number(s.razlika),
      })),
    })),
  });
}

// POST /api/lager/:orgId/nivelacije
// { datum, napomena?, stavke: [{ artikalId, staraMpc, novaMpc, kolicina }] }
async function createNivelacija(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const datum = parseIsoDate(req.body?.datum);
    if (!datum) return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
    const rawStavke = Array.isArray(req.body?.stavke) ? req.body.stavke : [];
    if (rawStavke.length === 0) {
      return res.status(400).json({ ok: false, error: "NO_STAVKE" });
    }

    // stanje se čita van transakcije (TOCTOU): dva istovremena zahtjeva mogu
    // proći provjeru. Prihvatljivo jer obrt vodi jedan operater; za striktnu
    // sigurnost trebala bi provjera unutar SERIALIZABLE transakcije.
    const stanje = await computeLager(organizationId, datum);
    const artikli = await Artikal.findAll({
      where: { organizationId },
      raw: true,
    });
    const artikalById = new Map(artikli.map((a) => [a.id, a]));

    const stavke = [];
    for (let i = 0; i < rawStavke.length; i++) {
      const raw = rawStavke[i];
      const artikal = artikalById.get(parseId(raw.artikalId));
      const staraMpc = r2v(Number(raw.staraMpc));
      const novaMpc = r2v(Number(raw.novaMpc));
      const kolicina = Number(raw.kolicina);
      if (!artikal) return res.status(400).json({ ok: false, error: `STAVKA_${i + 1}_ARTIKAL` });
      if (!Number.isFinite(kolicina) || kolicina <= 0) {
        return res.status(400).json({ ok: false, error: `STAVKA_${i + 1}_KOLICINA` });
      }
      if (!Number.isFinite(novaMpc) || novaMpc <= 0 || novaMpc === staraMpc) {
        return res.status(400).json({ ok: false, error: `STAVKA_${i + 1}_MPC` });
      }
      // provjera stanja se AKUMULIRA: umanji raspoloživu količinu na
      // (artikal, staraMpc) nakon svake stavke, da više stavki na istom
      // ključu ne mogu pomjeriti više nego što postoji (negativno stanje)
      const red = stanje.get(key(artikal.id, staraMpc));
      if (!red || red.kolicina < kolicina) {
        return res.status(409).json({
          ok: false,
          error: `STAVKA_${i + 1}_NEMA_STANJA`,
        });
      }
      red.kolicina = r3(red.kolicina - kolicina);
      stavke.push({
        artikalId: artikal.id,
        sifra: artikal.sifra,
        naziv: artikal.naziv,
        jm: artikal.jm,
        kolicina,
        staraMpc,
        novaMpc,
        vrijednostStara: r2v(kolicina * staraMpc),
        vrijednostNova: r2v(kolicina * novaMpc),
        razlika: r2v(kolicina * novaMpc - kolicina * staraMpc),
      });
    }
    const totals = {
      vrijednostStara: r2v(stavke.reduce((a, s) => a + s.vrijednostStara, 0)),
      vrijednostNova: r2v(stavke.reduce((a, s) => a + s.vrijednostNova, 0)),
      razlika: r2v(stavke.reduce((a, s) => a + s.razlika, 0)),
    };
    const godina = Number(datum.slice(0, 4));
    const napomena = String(req.body?.napomena || "").trim() || null;

    let created = null;
    for (let attempt = 0; ; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        created = await sequelize.transaction(async (t) => {
          const max = await Nivelacija.max("broj", {
            where: { organizationId, godina },
            transaction: t,
          });
          const n = await Nivelacija.create(
            {
              organizationId,
              broj: (Number(max) || 0) + 1,
              godina,
              datum,
              napomena,
              ...totals,
            },
            { transaction: t },
          );
          await NivelacijaStavka.bulkCreate(
            stavke.map((s) => ({ ...s, nivelacijaId: n.id })),
            { transaction: t },
          );
          return n;
        });
        break;
      } catch (e) {
        if (e.name === "SequelizeUniqueConstraintError" && attempt < 3) continue;
        throw e;
      }
    }
    return res.status(201).json({
      ok: true,
      data: { id: created.id, oznaka: oznakaOd(created.broj, created.godina) },
    });
  } catch (err) {
    console.error("nivelacija create error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// DELETE /api/lager/:orgId/nivelacije/:id
async function removeNivelacija(req, res) {
  const organizationId = parseId(req.params.orgId);
  const id = parseId(req.params.id);
  if (!organizationId || !id) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const n = await Nivelacija.findOne({ where: { id, organizationId } });
  if (!n) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await sequelize.transaction(async (t) => {
    await NivelacijaStavka.destroy({
      where: { nivelacijaId: n.id },
      transaction: t,
    });
    await n.destroy({ transaction: t });
  });
  return res.json({ ok: true });
}

// ─── razduženja (povrat dobavljaču / otpis) ──────────────────────────────────

// GET /api/lager/:orgId/razduzenja
async function listRazduzenja(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const rows = await Razduzenje.findAll({
    where: { organizationId },
    include: [
      { model: Partner, as: "partner", attributes: ["id", "name"] },
      { model: RazduzenjeStavka, as: "stavke" },
    ],
    order: [["datum", "DESC"], ["id", "DESC"]],
  });
  return res.json({
    ok: true,
    data: rows.map((rz) => ({
      id: rz.id,
      tip: rz.tip,
      broj: rz.broj,
      godina: rz.godina,
      oznaka: oznakaOd(rz.broj, rz.godina),
      datum: rz.datum,
      partner: rz.partner ? { id: rz.partner.id, name: rz.partner.name } : null,
      razlog: rz.razlog,
      ulazniRacunId: rz.ulazniRacunId,
      maloprodajnaVrijednost: Number(rz.maloprodajnaVrijednost),
      nabavnaVrijednost: Number(rz.nabavnaVrijednost),
      pdvIznos: Number(rz.pdvIznos),
      stavke: (rz.stavke ?? []).map((s) => ({
        id: s.id,
        artikalId: s.artikalId,
        sifra: s.sifra,
        naziv: s.naziv,
        jm: s.jm,
        mpc: Number(s.mpc),
        kolicina: Number(s.kolicina),
        nabavnaCijena: Number(s.nabavnaCijena),
        pdvStopa: Number(s.pdvStopa),
        maloprodajniIznos: Number(s.maloprodajniIznos),
        nabavniIznos: Number(s.nabavniIznos),
        pdvIznos: Number(s.pdvIznos),
      })),
    })),
  });
}

// POST /api/lager/:orgId/razduzenja
// { tip, datum, partnerId? (povrat), razlog?, brojKO? (povrat),
//   stavke: [{ artikalId, mpc, kolicina }] }
async function createRazduzenje(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const body = req.body || {};
    const tip = body.tip === "POVRAT" ? "POVRAT" : body.tip === "OTPIS" ? "OTPIS" : null;
    if (!tip) return res.status(400).json({ ok: false, error: "INVALID_TIP" });
    const datum = parseIsoDate(body.datum);
    if (!datum) return res.status(400).json({ ok: false, error: "DATUM_INVALID" });

    let partner = null;
    if (tip === "POVRAT") {
      const partnerId = parseId(body.partnerId);
      if (!partnerId) {
        return res.status(400).json({ ok: false, error: "PARTNER_REQUIRED" });
      }
      partner = await Partner.findOne({ where: { id: partnerId, organizationId } });
      if (!partner) {
        return res.status(404).json({ ok: false, error: "PARTNER_NOT_FOUND" });
      }
    }

    const rawStavke = Array.isArray(body.stavke) ? body.stavke : [];
    if (rawStavke.length === 0) {
      return res.status(400).json({ ok: false, error: "NO_STAVKE" });
    }

    const org = await Organization.findByPk(organizationId);
    const orgObveznik = Boolean(org?.isPdvObveznik);
    const stanje = await computeLager(organizationId, datum);
    const artikli = await Artikal.findAll({
      where: { organizationId },
      raw: true,
    });
    const artikalById = new Map(artikli.map((a) => [a.id, a]));

    const stavke = [];
    for (let i = 0; i < rawStavke.length; i++) {
      const raw = rawStavke[i];
      const artikal = artikalById.get(parseId(raw.artikalId));
      const mpc = r2v(Number(raw.mpc));
      const kolicina = Number(raw.kolicina);
      if (!artikal) return res.status(400).json({ ok: false, error: `STAVKA_${i + 1}_ARTIKAL` });
      if (!Number.isFinite(kolicina) || kolicina <= 0) {
        return res.status(400).json({ ok: false, error: `STAVKA_${i + 1}_KOLICINA` });
      }
      // akumulirana provjera stanja (kao kod nivelacije): umanji raspoloživu
      // količinu nakon svake stavke da duple stavke na istom (artikal, mpc)
      // ne mogu razdužiti više nego što postoji
      const red = stanje.get(key(artikal.id, mpc));
      if (!red || red.kolicina < kolicina) {
        return res.status(409).json({ ok: false, error: `STAVKA_${i + 1}_NEMA_STANJA` });
      }
      const pdvStopa = orgObveznik && !artikal.oslobodjenPdv ? 17 : 0;
      const nabavniIznos = r2v(kolicina * red.nabavnaCijena);
      red.kolicina = r3(red.kolicina - kolicina);
      stavke.push({
        artikalId: artikal.id,
        sifra: artikal.sifra,
        naziv: artikal.naziv,
        jm: artikal.jm,
        mpc,
        kolicina,
        nabavnaCijena: red.nabavnaCijena,
        pdvStopa,
        maloprodajniIznos: r2v(kolicina * mpc),
        nabavniIznos,
        pdvIznos: pdvStopa > 0 ? r2v((nabavniIznos * pdvStopa) / 100) : 0,
      });
    }
    const totals = {
      maloprodajnaVrijednost: r2v(
        stavke.reduce((a, s) => a + s.maloprodajniIznos, 0),
      ),
      nabavnaVrijednost: r2v(stavke.reduce((a, s) => a + s.nabavniIznos, 0)),
      pdvIznos: r2v(stavke.reduce((a, s) => a + s.pdvIznos, 0)),
    };
    const godina = Number(datum.slice(0, 4));
    const razlog = String(body.razlog || "").trim() || null;

    let created = null;
    for (let attempt = 0; ; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        created = await sequelize.transaction(async (t) => {
          const max = await Razduzenje.max("broj", {
            where: { organizationId, tip, godina },
            transaction: t,
          });
          const broj = (Number(max) || 0) + 1;

          // povrat formira knjižnu obavijest u KUF: pozitivan iznos +
          // vrstaDokumenta KNJIZNA_OBAVIJEST (prijava/e-KUF je odbijaju
          // automatski); nije obaveza pa je odmah zatvorena
          let racun = null;
          const iznosKO = r2v(totals.nabavnaVrijednost + totals.pdvIznos);
          if (tip === "POVRAT" && iznosKO > 0) {
            racun = await UlazniRacun.create(
              {
                organizationId,
                partnerId: partner.id,
                brojRacuna:
                  String(body.brojKO || "").trim() ||
                  `KO povrat ${oznakaOd(broj, godina)}`,
                datumRacuna: datum,
                datumPrijema: datum,
                rokPlacanja: null,
                iznos: iznosKO,
                pdvIznos: totals.pdvIznos > 0 ? totals.pdvIznos : null,
                vrstaNabavke: "DOMACA",
                tipDokumenta: "01",
                vrstaDokumenta: "KNJIZNA_OBAVIJEST",
                status: "PLACEN",
                paidAt: datum,
                note: `Povrat robe dobavljaču ${oznakaOd(broj, godina)}`,
              },
              { transaction: t },
            );
          }

          const rz = await Razduzenje.create(
            {
              organizationId,
              tip,
              broj,
              godina,
              datum,
              partnerId: partner ? partner.id : null,
              razlog,
              ulazniRacunId: racun ? racun.id : null,
              ...totals,
            },
            { transaction: t },
          );
          await RazduzenjeStavka.bulkCreate(
            stavke.map((s) => ({ ...s, razduzenjeId: rz.id })),
            { transaction: t },
          );
          return rz;
        });
        break;
      } catch (e) {
        if (e.name === "SequelizeUniqueConstraintError" && attempt < 3) continue;
        throw e;
      }
    }
    return res.status(201).json({
      ok: true,
      data: { id: created.id, oznaka: oznakaOd(created.broj, created.godina) },
    });
  } catch (err) {
    console.error("razduzenje create error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// DELETE /api/lager/:orgId/razduzenja/:id — briše dokument, stavke i vezanu
// knjižnu obavijest iz KUF-a
async function removeRazduzenje(req, res) {
  const organizationId = parseId(req.params.orgId);
  const id = parseId(req.params.id);
  if (!organizationId || !id) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const rz = await Razduzenje.findOne({ where: { id, organizationId } });
  if (!rz) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await sequelize.transaction(async (t) => {
    if (rz.ulazniRacunId) {
      await UlazniRacun.destroy({
        where: { id: rz.ulazniRacunId, organizationId },
        transaction: t,
      });
    }
    await RazduzenjeStavka.destroy({
      where: { razduzenjeId: rz.id },
      transaction: t,
    });
    await rz.destroy({ transaction: t });
  });
  return res.json({ ok: true });
}

module.exports = {
  lager,
  artikalKartica,
  tkm,
  setTkmPocetnoStanje,
  listTkmPazari,
  addTkmPazar,
  removeTkmPazar,
  listNivelacije,
  createNivelacija,
  removeNivelacija,
  listRazduzenja,
  createRazduzenje,
  removeRazduzenje,
  listPopisi,
  createPopis,
  uvozPocetnogStanja,
  getPopis,
  updatePopis,
  refreshPopis,
  proknjiziPopis,
  otknjiziPopis,
  removePopis,
};
