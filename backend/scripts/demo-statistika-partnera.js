// Demo statistika kreativa partnera (samo za dev/prezentaciju, NE za live).
//
// Upisuje uvjerljive dnevne prikaze, klikove, mobilni udio i jedinstvene
// posjetioce za postojeće kreative, za N dana unazad (do juče), po stranicama
// i pozicijama koje kreativa stvarno ima. Model prometa: posjećenost stranice,
// radni dan/vikend, blagi rast, sezona GPD/SPR (januar do marta) i šum.
//
//   node scripts/demo-statistika-partnera.js                 (90 dana, sve kreative)
//   node scripts/demo-statistika-partnera.js --dana=60 --reklame=3,4
//   node scripts/demo-statistika-partnera.js --obrisi --do=2026-09-30 [--reklame=3,4]
//
// Brisanje: --obrisi briše statistiku kreativa do datuma --do (uključivo) i
// sve demo posjetioce (ključ počinje sa "z", pravi ključevi su heksadecimalni).
// Skripta na kraju upisa ispiše tačnu naredbu za brisanje.
require("dotenv").config();
const crypto = require("crypto");
const { sequelize, Reklama } = require("../src/models");
const { STRANICE } = require("../src/config/reklame");

const arg = (ime, def) => {
  const a = process.argv.find((x) => x.startsWith(`--${ime}=`));
  return a ? a.slice(ime.length + 3) : def;
};
const ima = (ime) => process.argv.includes(`--${ime}`);

// Pozicije po stranici (ogledalo POZICIJE_PO_STRANICI u frontend/src/data/partner.ts)
const POZ_PO_STRANICI = {
  pocetna: ["BANER"],
  ams: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "DUGME", "MODAL", "BANER_ISPOD"],
  spr: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "DUGME", "MODAL", "BANER_ISPOD"],
  gpd: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "DUGME", "MODAL", "BANER_ISPOD"],
  zo3: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "DUGME", "BANER_ISPOD"],
  pozajmica: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "DUGME", "BANER_ISPOD"],
  pdv: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "BANER_ISPOD"],
  neto_bruto: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "BANER_ISPOD"],
  sifre_djelatnosti: ["SIDEBAR_DESNO"],
  sifre_zanimanja: ["SIDEBAR_DESNO"],
  javni_prihodi: ["SIDEBAR_DESNO"],
  vijesti: ["SIDEBAR_DESNO", "INLINE"],
  vodici: ["BANER_ISPOD"],
  rasprave: ["BANER_ISPOD"],
};

// prosječna dnevna posjećenost stranice (radni dan)
const POSJETE = {
  pocetna: 1300,
  ams: 950,
  spr: 260,
  gpd: 220,
  zo3: 160,
  pozajmica: 90,
  pdv: 420,
  neto_bruto: 640,
  sifre_djelatnosti: 820,
  sifre_zanimanja: 310,
  javni_prihodi: 520,
  vijesti: 700,
  vodici: 280,
  rasprave: 160,
};

// koliki dio posjeta stvarno vidi poziciju (vidljivost 1 s), CTR i
// da li je pozicija dostupna na mobitelu
const POZICIJA = {
  SIDEBAR_LIJEVO: { vidi: 0.34, ctr: 0.0032, mobitel: false },
  SIDEBAR_DESNO: { vidi: 0.38, ctr: 0.0036, mobitel: false },
  INLINE: { vidi: 0.58, ctr: 0.0085, mobitel: true },
  BANER: { vidi: 0.5, ctr: 0.0075, mobitel: true },
  BANER_ISPOD: { vidi: 0.42, ctr: 0.0062, mobitel: true },
  DUGME: { vidi: 0.3, ctr: 0, mobitel: true }, // klik na dugme je preuzimanje, ne banka
  MODAL: { vidi: 0.11, ctr: 0.034, mobitel: true },
};
const MOBILNI_UDIO = 0.58;

function dvije(n) {
  return String(n).padStart(2, "0");
}
function isoDan(d) {
  return `${d.getUTCFullYear()}-${dvije(d.getUTCMonth() + 1)}-${dvije(d.getUTCDate())}`;
}
function danasBih() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Sarajevo" });
}
function kaoNiz(v) {
  if (Array.isArray(v)) return v;
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}
// ponovljiv šum (isti ulaz, isti broj) da dva pokretanja daju istu sliku
function sum(...k) {
  const h = crypto.createHash("md5").update(k.join("|")).digest();
  return h.readUInt32BE(0) / 0xffffffff;
}
function binom(n, p, ...k) {
  // brza aproksimacija: očekivanje + šum ±(2 * sqrt(var))
  const ocek = n * p;
  const s = Math.sqrt(Math.max(ocek * (1 - p), 0.0001));
  return Math.max(0, Math.round(ocek + (sum("b", ...k) * 2 - 1) * 2 * s));
}

async function obrisi() {
  const doDana = arg("do", "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doDana)) throw new Error("Uz --obrisi treba --do=YYYY-MM-DD");
  const ids = arg("reklame", "")
    .split(",")
    .map(Number)
    .filter((n) => n > 0);
  const [r1] = await sequelize.query(
    `DELETE FROM reklame_statistika WHERE datum <= :doDana ${ids.length ? "AND reklamaId IN (:ids)" : ""}`,
    { replacements: { doDana, ids } },
  );
  const [r2] = await sequelize.query(
    `DELETE FROM reklame_posjetioci WHERE kljuc LIKE 'z%' ${ids.length ? "AND reklamaId IN (:ids)" : ""}`,
    { replacements: { ids } },
  );
  console.log(
    `Obrisano: statistika ${r1.affectedRows ?? "?"} redova, demo posjetioci ${r2.affectedRows ?? "?"} redova.`,
  );
}

async function upisi() {
  const dana = Math.min(365, Math.max(7, Number(arg("dana", "90")) || 90));
  const ids = arg("reklame", "")
    .split(",")
    .map(Number)
    .filter((n) => n > 0);
  const reklame = await Reklama.findAll({
    where: ids.length ? { id: ids } : {},
    raw: true,
  });
  if (reklame.length === 0) throw new Error("Nema kreativa za demo statistiku.");

  const danas = new Date(`${danasBih()}T12:00:00Z`);
  const doDana = isoDan(new Date(danas.getTime() - 86400000));
  const statRedovi = [];
  const posjetRedovi = [];

  for (let i = dana; i >= 1; i--) {
    const d = new Date(danas.getTime() - i * 86400000);
    const datum = isoDan(d);
    const vikend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const mjesec = d.getUTCMonth() + 1;
    const rast = 1 + (dana - i) * 0.003;

    // ko je na kojem slotu: kreative dijele slot ravnomjerno
    const naSlotu = new Map();
    for (const r of reklame) {
      const st = kaoNiz(r.stranice);
      const stranice = st.includes("*") ? STRANICE : st;
      for (const s of stranice) {
        for (const p of kaoNiz(r.pozicije)) {
          if (!POZ_PO_STRANICI[s]?.includes(p) || !POZICIJA[p]) continue;
          const k = `${s}|${p}`;
          if (!naSlotu.has(k)) naSlotu.set(k, []);
          naSlotu.get(k).push(r.id);
        }
      }
    }

    const posjetiociDana = new Map(); // reklamaId -> { ukupno, mob }
    for (const [k, rids] of naSlotu) {
      const [s, p] = k.split("|");
      const cfg = POZICIJA[p];
      let posjete = (POSJETE[s] || 200) * (vikend ? 0.45 : 1) * rast;
      if ((s === "gpd" || s === "spr") && mjesec <= 3) posjete *= 4;
      posjete *= 0.85 + sum("p", datum, s) * 0.3;
      const udioDesktop = 1 - MOBILNI_UDIO;
      // stubovi se vide samo na desktopu
      const vidljivo = cfg.mobitel ? posjete * cfg.vidi : posjete * udioDesktop * cfg.vidi;
      for (const rid of rids) {
        const prikazi = Math.round(vidljivo / rids.length);
        if (prikazi <= 0) continue;
        const prikaziMob = cfg.mobitel ? binom(prikazi, MOBILNI_UDIO, "pm", datum, k, rid) : 0;
        const klikovi = Math.min(prikazi, binom(prikazi, cfg.ctr, "k", datum, k, rid));
        const klikoviMob = cfg.mobitel ? Math.min(klikovi, binom(klikovi, 0.52, "km", datum, k, rid)) : 0;
        statRedovi.push([rid, datum, s, p, prikazi, klikovi, Math.min(prikaziMob, prikazi), klikoviMob]);
        const z = posjetiociDana.get(rid) ?? { ukupno: 0, mob: 0 };
        z.ukupno += prikazi;
        z.mob += Math.min(prikaziMob, prikazi);
        posjetiociDana.set(rid, z);
      }
    }

    // jedinstveni posjetioci: oko 62% prikaza (isti čovjek vidi više pozicija)
    for (const [rid, z] of posjetiociDana) {
      const n = Math.round(z.ukupno * 0.62);
      const mob = Math.round(n * (z.ukupno ? z.mob / z.ukupno : 0));
      for (let j = 0; j < n; j++) {
        const kljuc = `z${crypto.createHash("md5").update(`${datum}|${rid}|${j}`).digest("hex").slice(0, 15)}`;
        posjetRedovi.push([rid, datum, kljuc, j < mob ? 1 : 0]);
      }
    }
  }

  const PAKET = 800;
  for (let i = 0; i < statRedovi.length; i += PAKET) {
    const dio = statRedovi.slice(i, i + PAKET);
    await sequelize.query(
      `INSERT INTO reklame_statistika (reklamaId, datum, stranica, pozicija, prikazi, klikovi, prikaziMob, klikoviMob)
       VALUES ${dio.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}
       ON DUPLICATE KEY UPDATE prikazi = prikazi + VALUES(prikazi), klikovi = klikovi + VALUES(klikovi),
         prikaziMob = prikaziMob + VALUES(prikaziMob), klikoviMob = klikoviMob + VALUES(klikoviMob)`,
      { replacements: dio.flat() },
    );
  }
  for (let i = 0; i < posjetRedovi.length; i += PAKET * 2) {
    const dio = posjetRedovi.slice(i, i + PAKET * 2);
    await sequelize.query(
      `INSERT IGNORE INTO reklame_posjetioci (reklamaId, datum, kljuc, mobilni)
       VALUES ${dio.map(() => "(?, ?, ?, ?)").join(", ")}`,
      { replacements: dio.flat() },
    );
  }

  const ukupnoPrikaza = statRedovi.reduce((s, r) => s + r[4], 0);
  const ukupnoKlikova = statRedovi.reduce((s, r) => s + r[5], 0);
  console.log(
    `Kreative: ${reklame.map((r) => `${r.id} (${r.naziv})`).join(", ")}\n` +
      `Upisano ${statRedovi.length} redova statistike (${ukupnoPrikaza} prikaza, ${ukupnoKlikova} klikova) ` +
      `i ${posjetRedovi.length} demo posjetilaca, za ${dana} dana do ${doDana}.`,
  );
  console.log(
    `\nBrisanje demo podataka:\n  node scripts/demo-statistika-partnera.js --obrisi --do=${doDana} --reklame=${reklame
      .map((r) => r.id)
      .join(",")}`,
  );
}

(async () => {
  try {
    sequelize.options.logging = false;
    if (ima("obrisi")) await obrisi();
    else await upisi();
  } catch (e) {
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
