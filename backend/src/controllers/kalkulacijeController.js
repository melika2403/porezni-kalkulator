// Maloprodajne kalkulacije (KCM) + šifarnik artikala. Kalkulacija je
// zaduženje maloprodaje po računu dobavljača: stavke nose cijeli obračun
// (fakturna, zavisni trošak, nabavna, marža, PDV, MPC) snimljen kao snapshot.
// Uz kalkulaciju se automatski knjiži i ulazni račun (KUF/obaveze), jer je
// kalkulacija upravo knjiženje tog računa; zavisni troškovi NISU dio računa.
// Obračun je server-side autoritativan; frontend isti obračun samo prikazuje.

const { Op } = require("sequelize");
const {
  sequelize,
  Organization,
  Partner,
  UlazniRacun,
  Artikal,
  Kalkulacija,
  KalkulacijaStavka,
} = require("../models/index");
const { tryMatchExistingPayment } = require("./partnersController");

const PDV_STOPA = 17;

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseIsoDate(v) {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const r5 = (n) => Math.round((n + Number.EPSILON) * 1e5) / 1e5;

// Prekid transakcije sa kontrolisanim HTTP kodom (kao u prebijanjima).
class AbortError extends Error {
  constructor(code) {
    super(code);
    this.abortCode = code;
  }
}

// ─── obračun stavke ──────────────────────────────────────────────────────────
// Ulaz: kolicina, cijena (za PDV obveznika bez PDV-a, inače sa PDV-om),
// rabatPct, zavisniTrosakPct, mpc. Marža se IZVODI iz MPC (unos cilja okruglu
// maloprodajnu cijenu); frontend nudi i unos marže ali šalje izračunati MPC.
function computeStavka(input, artikal, { orgObveznik, bezPdvRacun }) {
  const kolicina = Number(input.kolicina);
  const cijena = Number(input.cijena);
  const rabatPct = Number(input.rabatPct ?? 0);
  const zavisniTrosakPct = Number(input.zavisniTrosakPct ?? 0);
  const mpc = Number(input.mpc);

  if (!Number.isFinite(kolicina) || kolicina <= 0) return { error: "KOLICINA" };
  if (!Number.isFinite(cijena) || cijena < 0) return { error: "CIJENA" };
  if (!Number.isFinite(rabatPct) || rabatPct < 0 || rabatPct > 100) {
    return { error: "RABAT" };
  }
  if (!Number.isFinite(zavisniTrosakPct) || zavisniTrosakPct < 0) {
    return { error: "ZAVISNI" };
  }
  if (!Number.isFinite(mpc) || mpc <= 0) return { error: "MPC" };

  const imaPdv = orgObveznik && !artikal.oslobodjenPdv;
  const pdvStopa = imaPdv ? PDV_STOPA : 0;

  const iznos = r2(kolicina * cijena);
  const rabatIznos = r2((iznos * rabatPct) / 100);
  const fakturnaVrijednost = r2(iznos - rabatIznos);
  const zavisniTrosak = r2((fakturnaVrijednost * zavisniTrosakPct) / 100);
  const nabavniIznos = r2(fakturnaVrijednost + zavisniTrosak);
  const nabavnaCijena = kolicina > 0 ? r5(nabavniIznos / kolicina) : 0;

  const maloprodajniIznos = r2(kolicina * mpc);
  const vrijednostBezPdv =
    pdvStopa > 0
      ? r2(maloprodajniIznos / (1 + pdvStopa / 100))
      : maloprodajniIznos;
  const pdvIznos = r2(maloprodajniIznos - vrijednostBezPdv);
  const marzaIznos = r2(vrijednostBezPdv - nabavniIznos);
  const marzaPct =
    nabavniIznos > 0
      ? Math.round((marzaIznos / nabavniIznos) * 1e6) / 1e4
      : 0;

  // ulazni (odbitni) PDV: samo obveznik, račun sa PDV-om, artikal nije
  // oslobođen; obračunava se na fakturnu vrijednost (zavisni trošak ne)
  const ulazniPdvIznos =
    imaPdv && !bezPdvRacun ? r2((fakturnaVrijednost * PDV_STOPA) / 100) : 0;

  return {
    value: {
      artikalId: artikal.id,
      sifra: artikal.sifra,
      naziv: artikal.naziv,
      jm: artikal.jm,
      kolicina,
      cijena,
      rabatPct,
      zavisniTrosakPct,
      mpc,
      iznos,
      rabatIznos,
      fakturnaVrijednost,
      zavisniTrosak,
      nabavniIznos,
      nabavnaCijena,
      marzaPct,
      marzaIznos,
      vrijednostBezPdv,
      pdvStopa,
      pdvIznos,
      ulazniPdvIznos,
      maloprodajniIznos,
    },
  };
}

function sumStavke(stavke) {
  const sum = (k) => r2(stavke.reduce((a, s) => a + Number(s[k]), 0));
  return {
    fakturnaVrijednost: sum("fakturnaVrijednost"),
    zavisniTrosak: sum("zavisniTrosak"),
    nabavnaVrijednost: sum("nabavniIznos"),
    ulazniPdv: sum("ulazniPdvIznos"),
    ukalkulisaniPdv: sum("pdvIznos"),
    maloprodajnaVrijednost: sum("maloprodajniIznos"),
  };
}

// Validira zaglavlje + stavke i vrati izračunato (bez upisa u bazu).
async function prepare(organizationId, body) {
  const datum = parseIsoDate(body.datum);
  if (!datum) return { status: 400, error: "DATUM_INVALID" };
  const datumRacuna = parseIsoDate(body.datumRacuna);
  if (!datumRacuna) return { status: 400, error: "DATUM_RACUNA_INVALID" };
  const brojRacuna = String(body.brojRacuna || "").trim();
  if (!brojRacuna) return { status: 400, error: "BROJ_RACUNA_REQUIRED" };

  const partnerId = parseId(body.partnerId);
  if (!partnerId) return { status: 400, error: "PARTNER_REQUIRED" };
  const partner = await Partner.findOne({
    where: { id: partnerId, organizationId },
  });
  if (!partner) return { status: 404, error: "PARTNER_NOT_FOUND" };

  const org = await Organization.findByPk(organizationId);
  if (!org) return { status: 404, error: "ORG_NOT_FOUND" };
  const orgObveznik = Boolean(org.isPdvObveznik);
  const bezPdvRacun = !orgObveznik || Boolean(body.bezPdv);

  const rawStavke = Array.isArray(body.stavke) ? body.stavke : [];
  if (rawStavke.length === 0) return { status: 400, error: "NO_STAVKE" };
  if (rawStavke.length > 500) return { status: 400, error: "TOO_MANY_STAVKE" };

  const artikalIds = [
    ...new Set(rawStavke.map((s) => parseId(s.artikalId)).filter(Boolean)),
  ];
  const artikli = await Artikal.findAll({
    where: { id: { [Op.in]: artikalIds }, organizationId },
  });
  const artikalById = new Map(artikli.map((a) => [a.id, a]));

  const stavke = [];
  for (let i = 0; i < rawStavke.length; i++) {
    const raw = rawStavke[i];
    const artikal = artikalById.get(parseId(raw.artikalId));
    if (!artikal) return { status: 400, error: `STAVKA_${i + 1}_ARTIKAL` };
    const out = computeStavka(raw, artikal, { orgObveznik, bezPdvRacun });
    if (out.error) return { status: 400, error: `STAVKA_${i + 1}_${out.error}` };
    stavke.push({ ...out.value, rbr: i + 1 });
  }

  return {
    header: {
      datum,
      datumRacuna,
      brojRacuna,
      partnerId,
      bezPdv: bezPdvRacun && orgObveznik ? true : false,
      napomena: String(body.napomena || "").trim() || null,
    },
    partner,
    orgObveznik,
    stavke,
    totals: sumStavke(stavke),
  };
}

// Monotoni redni broj po organizaciji i godini: MAX+1 (ne count), unique
// index + retry rješavaju istovremene zahtjeve.
async function nextBroj(organizationId, godina, t) {
  const max = await Kalkulacija.max("broj", {
    where: { organizationId, godina },
    transaction: t,
  });
  return (Number(max) || 0) + 1;
}

function rokPlacanja30(datumRacuna) {
  const d = new Date(`${datumRacuna}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

// Polja ulaznog računa izvedena iz kalkulacije. Iznos = fakturna vrijednost
// + ulazni PDV (zavisni trošak je poseban račun i ne ide u KUF ovdje).
function racunFields(header, totals, broj, godina) {
  const iznos = r2(totals.fakturnaVrijednost + totals.ulazniPdv);
  return {
    partnerId: header.partnerId,
    brojRacuna: header.brojRacuna,
    datumRacuna: header.datumRacuna,
    // KUF period po prijemu robe = datum kalkulacije
    datumPrijema: header.datum,
    iznos,
    pdvIznos: totals.ulazniPdv > 0 ? totals.ulazniPdv : null,
    vrstaNabavke: "DOMACA",
    tipDokumenta: "01",
    vrstaDokumenta: "REDOVNA",
    note: `Kalkulacija ${broj}/${String(godina).slice(-2)}`,
  };
}

function kalkulacijaJson(k, stavkeCount) {
  return {
    id: k.id,
    broj: k.broj,
    godina: k.godina,
    oznaka: `${k.broj}/${String(k.godina).slice(-2)}`,
    datum: k.datum,
    partner: k.partner ? { id: k.partner.id, name: k.partner.name } : null,
    partnerId: k.partnerId,
    brojRacuna: k.brojRacuna,
    datumRacuna: k.datumRacuna,
    bezPdv: Boolean(k.bezPdv),
    ulazniRacunId: k.ulazniRacunId,
    napomena: k.napomena,
    fakturnaVrijednost: Number(k.fakturnaVrijednost),
    zavisniTrosak: Number(k.zavisniTrosak),
    nabavnaVrijednost: Number(k.nabavnaVrijednost),
    ulazniPdv: Number(k.ulazniPdv),
    ukalkulisaniPdv: Number(k.ukalkulisaniPdv),
    maloprodajnaVrijednost: Number(k.maloprodajnaVrijednost),
    iznosRacuna: r2(Number(k.fakturnaVrijednost) + Number(k.ulazniPdv)),
    stavkeCount,
  };
}

function stavkaJson(s) {
  return {
    id: s.id,
    rbr: s.rbr,
    artikalId: s.artikalId,
    sifra: s.sifra,
    naziv: s.naziv,
    jm: s.jm,
    kolicina: Number(s.kolicina),
    cijena: Number(s.cijena),
    rabatPct: Number(s.rabatPct),
    zavisniTrosakPct: Number(s.zavisniTrosakPct),
    mpc: Number(s.mpc),
    iznos: Number(s.iznos),
    rabatIznos: Number(s.rabatIznos),
    fakturnaVrijednost: Number(s.fakturnaVrijednost),
    zavisniTrosak: Number(s.zavisniTrosak),
    nabavniIznos: Number(s.nabavniIznos),
    nabavnaCijena: Number(s.nabavnaCijena),
    marzaPct: Number(s.marzaPct),
    marzaIznos: Number(s.marzaIznos),
    vrijednostBezPdv: Number(s.vrijednostBezPdv),
    pdvStopa: Number(s.pdvStopa),
    pdvIznos: Number(s.pdvIznos),
    ulazniPdvIznos: Number(s.ulazniPdvIznos),
    maloprodajniIznos: Number(s.maloprodajniIznos),
  };
}

// ─── kalkulacije ─────────────────────────────────────────────────────────────

// GET /api/kalkulacije/:orgId?godina=
async function list(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const where = { organizationId };
  const godina = Number(req.query.godina);
  if (Number.isInteger(godina) && godina > 2000) where.godina = godina;

  const rows = await Kalkulacija.findAll({
    where,
    include: [{ model: Partner, as: "partner", attributes: ["id", "name"] }],
    order: [["godina", "DESC"], ["broj", "DESC"]],
  });

  const counts = rows.length
    ? await KalkulacijaStavka.findAll({
        where: { kalkulacijaId: { [Op.in]: rows.map((r) => r.id) } },
        attributes: [
          "kalkulacijaId",
          [sequelize.fn("COUNT", sequelize.col("id")), "cnt"],
        ],
        group: ["kalkulacijaId"],
        raw: true,
      })
    : [];
  const countById = new Map(
    counts.map((c) => [c.kalkulacijaId, Number(c.cnt)]),
  );

  return res.json({
    ok: true,
    data: rows.map((k) => kalkulacijaJson(k, countById.get(k.id) ?? 0)),
  });
}

// GET /api/kalkulacije/:orgId/:id
async function getOne(req, res) {
  const organizationId = parseId(req.params.orgId);
  const id = parseId(req.params.id);
  if (!organizationId || !id) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const k = await Kalkulacija.findOne({
    where: { id, organizationId },
    include: [{ model: Partner, as: "partner", attributes: ["id", "name"] }],
  });
  if (!k) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  const stavke = await KalkulacijaStavka.findAll({
    where: { kalkulacijaId: k.id },
    order: [["rbr", "ASC"]],
  });
  return res.json({
    ok: true,
    data: { ...kalkulacijaJson(k, stavke.length), stavke: stavke.map(stavkaJson) },
  });
}

// POST /api/kalkulacije/:orgId
async function create(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const prep = await prepare(organizationId, req.body || {});
    if (prep.error) {
      return res.status(prep.status).json({ ok: false, error: prep.error });
    }
    const { header, stavke, totals } = prep;
    const godina = Number(header.datum.slice(0, 4));

    let created = null;
    for (let attempt = 0; ; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        created = await sequelize.transaction(async (t) => {
          const broj = await nextBroj(organizationId, godina, t);
          const iznosRacuna = r2(totals.fakturnaVrijednost + totals.ulazniPdv);
          let racun = null;
          if (iznosRacuna > 0) {
            racun = await UlazniRacun.create(
              {
                organizationId,
                ...racunFields(header, totals, broj, godina),
                rokPlacanja: rokPlacanja30(header.datumRacuna),
              },
              { transaction: t },
            );
          }
          const k = await Kalkulacija.create(
            {
              organizationId,
              broj,
              godina,
              ...header,
              ulazniRacunId: racun ? racun.id : null,
              ...totals,
            },
            { transaction: t },
          );
          await KalkulacijaStavka.bulkCreate(
            stavke.map((s) => ({ ...s, kalkulacijaId: k.id })),
            { transaction: t },
          );
          return { k, racun };
        });
        break;
      } catch (e) {
        // istovremeni zahtjev je zauzeo isti broj: probaj ponovo (max 4)
        if (e.name === "SequelizeUniqueConstraintError" && attempt < 3) {
          continue;
        }
        throw e;
      }
    }

    // izvod je možda već stigao: odmah probaj zatvoriti postojećom isplatom
    if (created.racun) await tryMatchExistingPayment(created.racun);

    return res.status(201).json({
      ok: true,
      data: kalkulacijaJson(
        { ...created.k.toJSON(), partner: prep.partner },
        stavke.length,
      ),
    });
  } catch (err) {
    console.error("kalkulacije create error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// PUT /api/kalkulacije/:orgId/:id — puna zamjena (zaglavlje + stavke) sa
// sinhronizacijom vezanog ulaznog računa. Ako je račun već PLAĆEN (izvod ga
// zatvorio), izmjena se blokira: prvo razvezati uplatu na Partnerima.
async function update(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const existing = await Kalkulacija.findOne({
      where: { id, organizationId },
    });
    if (!existing) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    const prep = await prepare(organizationId, req.body || {});
    if (prep.error) {
      return res.status(prep.status).json({ ok: false, error: prep.error });
    }
    const { header, stavke, totals } = prep;
    const godina = Number(header.datum.slice(0, 4));

    let result = null;
    for (let attempt = 0; ; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        result = await sequelize.transaction(async (t) => {
          const k = await Kalkulacija.findOne({
            where: { id, organizationId },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });
          if (!k) throw new AbortError("NOT_FOUND");

          let racun = k.ulazniRacunId
            ? await UlazniRacun.findOne({
                where: { id: k.ulazniRacunId, organizationId },
                lock: t.LOCK.UPDATE,
                transaction: t,
              })
            : null;
          if (racun && racun.status === "PLACEN") {
            throw new AbortError("RACUN_PLACEN");
          }

          // promjena godine mijenja i redni broj (numeracija po godini)
          const broj =
            godina === k.godina
              ? k.broj
              : await nextBroj(organizationId, godina, t);

          const iznosRacuna = r2(totals.fakturnaVrijednost + totals.ulazniPdv);
          const fields = racunFields(header, totals, broj, godina);
          if (racun && iznosRacuna > 0) {
            await racun.update(fields, { transaction: t });
          } else if (racun && iznosRacuna <= 0) {
            await racun.destroy({ transaction: t });
            racun = null;
          } else if (!racun && iznosRacuna > 0) {
            racun = await UlazniRacun.create(
              {
                organizationId,
                ...fields,
                rokPlacanja: rokPlacanja30(header.datumRacuna),
              },
              { transaction: t },
            );
          }

          await KalkulacijaStavka.destroy({
            where: { kalkulacijaId: k.id },
            transaction: t,
          });
          await KalkulacijaStavka.bulkCreate(
            stavke.map((s) => ({ ...s, kalkulacijaId: k.id })),
            { transaction: t },
          );
          await k.update(
            {
              broj,
              godina,
              ...header,
              ulazniRacunId: racun ? racun.id : null,
              ...totals,
            },
            { transaction: t },
          );
          return { k, racun };
        });
        break;
      } catch (e) {
        if (e instanceof AbortError) {
          const code = e.abortCode === "NOT_FOUND" ? 404 : 409;
          return res.status(code).json({ ok: false, error: e.abortCode });
        }
        if (e.name === "SequelizeUniqueConstraintError" && attempt < 3) {
          continue;
        }
        throw e;
      }
    }

    if (result.racun) await tryMatchExistingPayment(result.racun);

    return res.json({
      ok: true,
      data: kalkulacijaJson(
        { ...result.k.toJSON(), partner: prep.partner },
        stavke.length,
      ),
    });
  } catch (err) {
    console.error("kalkulacije update error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// DELETE /api/kalkulacije/:orgId/:id — briše kalkulaciju sa stavkama i
// vezanim ulaznim računom (ako još nije plaćen; plaćen blokira brisanje).
async function remove(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    try {
      await sequelize.transaction(async (t) => {
        const k = await Kalkulacija.findOne({
          where: { id, organizationId },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!k) throw new AbortError("NOT_FOUND");
        if (k.ulazniRacunId) {
          const racun = await UlazniRacun.findOne({
            where: { id: k.ulazniRacunId, organizationId },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });
          if (racun && racun.status === "PLACEN") {
            throw new AbortError("RACUN_PLACEN");
          }
          if (racun) await racun.destroy({ transaction: t });
        }
        await KalkulacijaStavka.destroy({
          where: { kalkulacijaId: k.id },
          transaction: t,
        });
        await k.destroy({ transaction: t });
      });
    } catch (e) {
      if (e instanceof AbortError) {
        const code = e.abortCode === "NOT_FOUND" ? 404 : 409;
        return res.status(code).json({ ok: false, error: e.abortCode });
      }
      throw e;
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("kalkulacije remove error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ─── izvještaj o marži (RUC) ─────────────────────────────────────────────────

// GET /api/kalkulacije/:orgId/marza?from=&to=&groupBy=artikal|dobavljac
// Iz snimljenih stavki kalkulacija: ukalkulisana zarada (razlika u cijeni)
// po artiklu ili dobavljaču za period.
async function marza(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const from = parseIsoDate(req.query.from) || "1900-01-01";
    const to = parseIsoDate(req.query.to) || "2999-12-31";
    const groupBy = req.query.groupBy === "dobavljac" ? "dobavljac" : "artikal";

    const sql =
      groupBy === "artikal"
        ? // grupisanje SAMO po artikalId; šifra/naziv su per-stavka snapshot
          // (preimenovanje artikla mijenja naziv na novim stavkama), pa se
          // uzima najsvježiji preko MAX da preimenovan artikal ostane jedan
          // red umjesto da se cijepa na dva
          `SELECT ks.artikalId AS id, MAX(ks.sifra) AS sifra, MAX(ks.naziv) AS naziv,
                  SUM(ks.kolicina) AS kolicina,
                  SUM(ks.nabavniIznos) AS nabavni,
                  SUM(ks.vrijednostBezPdv) AS bezPdv,
                  SUM(ks.marzaIznos) AS marza,
                  SUM(ks.maloprodajniIznos) AS malopr
           FROM kalkulacija_stavke ks
           JOIN kalkulacije k ON k.id = ks.kalkulacijaId
           WHERE k.organizationId = ? AND k.datum >= ? AND k.datum <= ?
           GROUP BY ks.artikalId
           ORDER BY marza DESC`
        : `SELECT k.partnerId AS id, p.name AS naziv,
                  COUNT(DISTINCT k.id) AS brojKalkulacija,
                  SUM(ks.nabavniIznos) AS nabavni,
                  SUM(ks.vrijednostBezPdv) AS bezPdv,
                  SUM(ks.marzaIznos) AS marza,
                  SUM(ks.maloprodajniIznos) AS malopr
           FROM kalkulacija_stavke ks
           JOIN kalkulacije k ON k.id = ks.kalkulacijaId
           LEFT JOIN partners p ON p.id = k.partnerId
           WHERE k.organizationId = ? AND k.datum >= ? AND k.datum <= ?
           GROUP BY k.partnerId, p.name
           ORDER BY marza DESC`;
    const [rows] = await sequelize.query(sql, {
      replacements: [organizationId, from, to],
    });
    return res.json({
      ok: true,
      data: rows.map((r) => {
        const nabavni = r2(Number(r.nabavni) || 0);
        const marzaIznos = r2(Number(r.marza) || 0);
        return {
          id: r.id != null ? Number(r.id) : null,
          sifra: r.sifra ?? null,
          naziv: r.naziv ?? "(nepoznat)",
          kolicina: r.kolicina != null ? Number(r.kolicina) : null,
          brojKalkulacija:
            r.brojKalkulacija != null ? Number(r.brojKalkulacija) : null,
          nabavniIznos: nabavni,
          vrijednostBezPdv: r2(Number(r.bezPdv) || 0),
          marzaIznos,
          maloprodajniIznos: r2(Number(r.malopr) || 0),
          marzaPct:
            nabavni > 0
              ? Math.round((marzaIznos / nabavni) * 1e4) / 100
              : 0,
        };
      }),
    });
  } catch (err) {
    console.error("marza error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ─── artikli ─────────────────────────────────────────────────────────────────

function artikalJson(a) {
  return {
    id: a.id,
    sifra: a.sifra,
    naziv: a.naziv,
    tip: a.tip === "USLUGA" ? "USLUGA" : "ROBA",
    jm: a.jm,
    barkod: a.barkod,
    oslobodjenPdv: Boolean(a.oslobodjenPdv),
    aktivan: Boolean(a.aktivan),
  };
}

// GET /api/kalkulacije/:orgId/artikli
async function listArtikli(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const rows = await Artikal.findAll({
    where: { organizationId },
    order: [["sifra", "ASC"]],
  });
  return res.json({ ok: true, data: rows.map(artikalJson) });
}

// sljedeća slobodna numerička šifra ("0001", "0002", ...)
async function nextSifra(organizationId, t) {
  const rows = await Artikal.findAll({
    where: { organizationId },
    attributes: ["sifra"],
    raw: true,
    transaction: t,
  });
  let max = 0;
  for (const r of rows) {
    if (/^\d+$/.test(r.sifra)) max = Math.max(max, Number(r.sifra));
  }
  return String(max + 1).padStart(4, "0");
}

function artikalPayload(body) {
  return {
    naziv: String(body.naziv || "").trim(),
    tip: body.tip === "USLUGA" ? "USLUGA" : "ROBA",
    jm: String(body.jm || "KOM").trim().toUpperCase().slice(0, 10) || "KOM",
    barkod: String(body.barkod || "").trim().slice(0, 40) || null,
    oslobodjenPdv: Boolean(body.oslobodjenPdv),
  };
}

// POST /api/kalkulacije/:orgId/artikli
async function createArtikal(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const body = req.body || {};
    const payload = artikalPayload(body);
    if (!payload.naziv) {
      return res.status(400).json({ ok: false, error: "NAZIV_REQUIRED" });
    }
    const manualSifra = String(body.sifra || "").trim().slice(0, 20);

    for (let attempt = 0; ; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const created = await sequelize.transaction(async (t) => {
          const sifra = manualSifra || (await nextSifra(organizationId, t));
          return Artikal.create(
            { organizationId, sifra, ...payload },
            { transaction: t },
          );
        });
        return res.status(201).json({ ok: true, data: artikalJson(created) });
      } catch (e) {
        if (e.name === "SequelizeUniqueConstraintError") {
          // ručna šifra zauzeta: greška; auto šifra: retry (max 4)
          if (manualSifra) {
            return res.status(409).json({ ok: false, error: "SIFRA_EXISTS" });
          }
          if (attempt < 3) continue;
        }
        throw e;
      }
    }
  } catch (err) {
    console.error("artikli create error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// PATCH /api/kalkulacije/:orgId/artikli/:id
async function updateArtikal(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const artikal = await Artikal.findOne({ where: { id, organizationId } });
    if (!artikal) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    const body = req.body || {};
    const updates = {};
    if (body.naziv !== undefined) {
      const v = String(body.naziv || "").trim();
      if (!v) return res.status(400).json({ ok: false, error: "NAZIV_REQUIRED" });
      updates.naziv = v;
    }
    if (body.sifra !== undefined) {
      const v = String(body.sifra || "").trim().slice(0, 20);
      if (!v) return res.status(400).json({ ok: false, error: "SIFRA_REQUIRED" });
      updates.sifra = v;
    }
    if (body.tip !== undefined) {
      updates.tip = body.tip === "USLUGA" ? "USLUGA" : "ROBA";
    }
    if (body.jm !== undefined) {
      updates.jm =
        String(body.jm || "KOM").trim().toUpperCase().slice(0, 10) || "KOM";
    }
    if (body.barkod !== undefined) {
      updates.barkod = String(body.barkod || "").trim().slice(0, 40) || null;
    }
    if (body.oslobodjenPdv !== undefined) {
      updates.oslobodjenPdv = Boolean(body.oslobodjenPdv);
    }
    if (body.aktivan !== undefined) {
      updates.aktivan = Boolean(body.aktivan);
    }
    try {
      await artikal.update(updates);
    } catch (e) {
      if (e.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ ok: false, error: "SIFRA_EXISTS" });
      }
      throw e;
    }
    return res.json({ ok: true, data: artikalJson(artikal) });
  } catch (err) {
    console.error("artikli update error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// DELETE /api/kalkulacije/:orgId/artikli/:id — artikal korišten na
// kalkulacijama se ne briše (409), umjesto toga se deaktivira.
async function removeArtikal(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const artikal = await Artikal.findOne({ where: { id, organizationId } });
    if (!artikal) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    const used = await KalkulacijaStavka.count({
      where: { artikalId: id },
    });
    if (used > 0) {
      return res.status(409).json({ ok: false, error: "ARTIKAL_U_UPOTREBI" });
    }
    await artikal.destroy();
    return res.json({ ok: true });
  } catch (err) {
    console.error("artikli remove error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/kalkulacije/:orgId/artikli/uvoz — grupni uvoz šifarnika
// (Com_Soft XML/CSV, parsiran na frontendu). Postojeće šifre se PRESKAČU
// (ništa se ne mijenja), a odgovor vraća šta je preskočeno i zašto.
const UVOZ_MAX_PRESKOCENO = 300;

async function uvozArtikala(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const stavke = Array.isArray(req.body?.artikli) ? req.body.artikli : [];
    if (stavke.length === 0) {
      return res.status(400).json({ ok: false, error: "EMPTY" });
    }
    if (stavke.length > 100000) {
      return res.status(400).json({ ok: false, error: "TOO_MANY" });
    }

    const postojece = await Artikal.findAll({
      where: { organizationId },
      attributes: ["sifra", "naziv"],
      raw: true,
    });
    // Unique indeks (organizationId, sifra) je utf8mb4_unicode_ci = case-
    // insensitive. Dedup mora poredit isto (mala slova), inače bi "A1" i "a1"
    // prošli JS provjeru pa oborili cijeli bulkCreate na DB constraint (500).
    const kljuc = (sifra) => sifra.toLowerCase();
    const zauzete = new Map(postojece.map((a) => [kljuc(a.sifra), a.naziv]));

    const preskoceno = [];
    let preskocenoUkupno = 0;
    const skip = (sifra, naziv, razlog) => {
      preskocenoUkupno++;
      if (preskoceno.length < UVOZ_MAX_PRESKOCENO) {
        preskoceno.push({ sifra, naziv, razlog });
      }
    };

    const uFajlu = new Set();
    const zaUnos = [];
    for (const s of stavke) {
      const sifra = String(s?.sifra || "").trim().slice(0, 20);
      const naziv = String(s?.naziv || "").trim().slice(0, 255);
      if (!sifra) {
        skip("", naziv, "nema šifru");
        continue;
      }
      if (!naziv) {
        skip(sifra, "", "nema naziv");
        continue;
      }
      const k = kljuc(sifra);
      if (uFajlu.has(k)) {
        skip(sifra, naziv, "duplikat šifre u fajlu");
        continue;
      }
      uFajlu.add(k);
      if (zauzete.has(k)) {
        skip(sifra, naziv, `šifra već postoji (${zauzete.get(k)})`);
        continue;
      }
      zaUnos.push({
        organizationId,
        sifra,
        naziv,
        tip: s?.tip === "USLUGA" ? "USLUGA" : "ROBA",
        jm: String(s?.jm || "KOM").trim().toUpperCase().slice(0, 10) || "KOM",
        barkod: String(s?.barkod || "").trim().slice(0, 40) || null,
        oslobodjenPdv: Boolean(s?.oslobodjenPdv),
        aktivan: s?.aktivan === undefined ? true : Boolean(s.aktivan),
      });
    }

    await sequelize.transaction(async (t) => {
      for (let i = 0; i < zaUnos.length; i += 500) {
        // eslint-disable-next-line no-await-in-loop
        await Artikal.bulkCreate(zaUnos.slice(i, i + 500), { transaction: t });
      }
    });

    return res.json({
      ok: true,
      data: {
        ukupno: stavke.length,
        dodano: zaUnos.length,
        preskocenoUkupno,
        preskoceno,
      },
    });
  } catch (err) {
    console.error("artikli uvoz error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  marza,
  listArtikli,
  createArtikal,
  updateArtikal,
  removeArtikal,
  uvozArtikala,
};
