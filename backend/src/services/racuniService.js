// ──────────────────────────────────────────────────────────────────────────────
//  Runtime izvor istine za uplatne račune javnih prihoda.
//
//  Podaci žive u bazi (tabela uplatni_racuni, admin panel "Uplatni računi")
//  i drže se u memorijskom kešu: učitaju se pri startu i osvježe kad admin
//  nešto snimi. Generisanje uplatnica zato ne radi nijedan dodatni upit.
//
//  Fallback lanac: baza → seed snapshot (uplatniRacuniData.json, generisan iz
//  frontend/src/data/uplatni-racuni.ts skriptom scripts/sync-racuni-backend.mjs).
//  Ako baza nije dostupna ili je tabela prazna, važe seed vrijednosti, pa
//  moduli koji rade bez baze (testovi, skripte) i dalje funkcionišu.
//
//  Oblik vrijednosti prati dosadašnje konstante da potrošači ne osjete promjenu:
//  KANTONI/FBIH_* su formatirani sa crticama (3-3-8-2), RS i komore gole cifre.
// ──────────────────────────────────────────────────────────────────────────────
const SNAPSHOT = require("../utils/uplatniRacuniData.json");
const {
  bankNameFromAccount,
  normalizeAccountDigits,
  formatAccountDashed,
} = require("./bankStatements/bankCodes");

// ── Seed podaci koji nisu u snapshotu (jedina mjesta gdje ovi brojevi žive) ──
const RS_BUDZET_SEED = "5620990000055687"; // Javni prihodi budžeta RS (NLB)
const KOMORE_SEED = {
  USK: "1020220000053653", // Obrtnička komora USK (dostavio vlasnik)
  KS: "3387302220433691", // Obrtnička komora KS (okks.ba)
};
const SEED_IZVOR = "PUFBiH: Uputstvo o uplatnim računima javnih prihoda (početni šifarnik)";

// ── Validacija broja računa ─────────────────────────────────────────────────
/** Ostatak dijeljenja cijelog broja (kao string cifara) sa 97. */
function mod97(digits) {
  let r = 0;
  for (const c of String(digits)) r = (r * 10 + (c.charCodeAt(0) - 48)) % 97;
  return r;
}

/** BiH transakcijski račun: tačno 16 cifara i modulo 97 daje ostatak 1.
 *  Vraća null ako je ispravan, inače poruku greške. */
function validirajRacun(value) {
  const d = normalizeAccountDigits(value);
  if (d.length !== 16) return "Račun mora imati tačno 16 cifara.";
  if (mod97(d) !== 1)
    return "Kontrolne cifre ne valjaju (modulo 97 ne daje ostatak 1). Provjerite broj.";
  return null;
}

// ── Definicije svih slotova (ključ → opis + seed broj) ──────────────────────
function seedDefs() {
  const defs = [];
  for (const [key, k] of Object.entries(SNAPSHOT.KANTONI)) {
    defs.push({
      kljuc: `${key}.zo`,
      grupa: "kanton",
      kanton: key,
      korisnik: `Zavod zdravstvenog osiguranja ${k.genitiv}`,
      vrstaPrihoda: "712111 · zdravstveno, kantonalni dio (89,8%)",
      racun: normalizeAccountDigits(k.zoRacun),
    });
    defs.push({
      kljuc: `${key}.budzet`,
      grupa: "kanton",
      kanton: key,
      korisnik: `Budžet ${k.genitiv}`,
      vrstaPrihoda: "716111 porez na dohodak · 722529 vodna · 722581 nesreće",
      racun: normalizeAccountDigits(k.budzet),
    });
    defs.push({
      kljuc: `${key}.nezap`,
      grupa: "kanton",
      kanton: key,
      korisnik: `Kantonalna služba za zapošljavanje ${k.genitiv}`,
      vrstaPrihoda: "712113 · nezaposlenost, kantonalni dio (70%)",
      racun: normalizeAccountDigits(k.nezapRacun),
    });
  }
  defs.push({
    kljuc: "FBIH.budzet",
    grupa: "federalni",
    kanton: null,
    korisnik: "Budžet Federacije BiH",
    vrstaPrihoda: "712112 · PIO/MIO i federalni porezi",
    racun: normalizeAccountDigits(SNAPSHOT.FBIH_BUDZET_RACUN),
  });
  defs.push({
    kljuc: "FBIH.zo",
    grupa: "federalni",
    kanton: null,
    korisnik: "Zavod zdravstvenog osiguranja i reosiguranja FBiH",
    vrstaPrihoda: "712111 · zdravstveno, federalni dio (10,2%)",
    racun: normalizeAccountDigits(SNAPSHOT.FBIH_ZO_RACUN),
  });
  defs.push({
    kljuc: "FBIH.nezap",
    grupa: "federalni",
    kanton: null,
    korisnik: "Federalni zavod za zapošljavanje",
    vrstaPrihoda: "712113 · nezaposlenost, federalni dio (30%)",
    racun: normalizeAccountDigits(SNAPSHOT.FBIH_NEZAP_RACUN),
  });
  defs.push({
    kljuc: "FOND.invalidi",
    grupa: "federalni",
    kanton: null,
    korisnik: "Fond za profesionalnu rehabilitaciju i zapošljavanje OSI",
    vrstaPrihoda: "722569 · 0,5% bruto plata svih radnika",
    racun: normalizeAccountDigits(SNAPSHOT.FOND_INVALIDI_RACUN),
  });
  defs.push({
    kljuc: "JRT.trezor",
    grupa: "federalni",
    kanton: null,
    korisnik: "JRT Trezor BiH, depozitni račun",
    vrstaPrihoda: "administrativne takse (federalne)",
    racun: normalizeAccountDigits(SNAPSHOT.JRT_TREZOR_BIH_RACUN),
  });
  defs.push({
    kljuc: "RS.budzet",
    grupa: "rs",
    kanton: null,
    korisnik: "Javni prihodi budžeta Republike Srpske",
    vrstaPrihoda: "doprinosi za radnike sa prebivalištem u RS",
    racun: RS_BUDZET_SEED,
  });
  for (const [key, racun] of Object.entries(KOMORE_SEED)) {
    const k = SNAPSHOT.KANTONI[key];
    defs.push({
      kljuc: `KOMORA.${key}`,
      grupa: "komora",
      kanton: key,
      korisnik: `Obrtnička komora ${k ? k.genitiv : key}`,
      vrstaPrihoda: "722567 · članarina obrtničke komore (ČOK)",
      racun,
    });
  }
  return defs.map((d) => ({ ...d, banka: bankNameFromAccount(d.racun) || null }));
}
const SEED_DEFS = seedDefs();

// ── Keš stanje ──────────────────────────────────────────────────────────────
let izBaze = new Map(); // kljuc → 16 cifara (samo redovi učitani iz baze)
let stariPoSlotu = new Map(); // kljuc → Set(16 cifara) ranijih brojeva (audit log)
let meta = null; // { izvor, datum } za liniju "podaci usklađeni sa…"
let verzija = 0; // raste na svako učitavanje; potrošači keširaju po njoj
let spojeno = null; // keširan rezultat buildMerged()

/** Trenutni broj (16 cifara) za slot: baza ako postoji, inače seed. */
function brojZaSlot(kljuc) {
  if (izBaze.has(kljuc)) return izBaze.get(kljuc);
  const def = SEED_DEFS.find((d) => d.kljuc === kljuc);
  return def ? def.racun : "";
}

function buildMerged() {
  const KANTONI = {};
  for (const [key, k] of Object.entries(SNAPSHOT.KANTONI)) {
    KANTONI[key] = {
      ...k,
      zoRacun: formatAccountDashed(brojZaSlot(`${key}.zo`)),
      budzet: formatAccountDashed(brojZaSlot(`${key}.budzet`)),
      nezapRacun: formatAccountDashed(brojZaSlot(`${key}.nezap`)),
    };
  }
  const KOMORE = {};
  for (const key of Object.keys(KOMORE_SEED)) {
    KOMORE[key] = brojZaSlot(`KOMORA.${key}`);
  }
  return {
    KANTONI,
    FBIH_BUDZET_RACUN: formatAccountDashed(brojZaSlot("FBIH.budzet")),
    FBIH_ZO_RACUN: formatAccountDashed(brojZaSlot("FBIH.zo")),
    FBIH_NEZAP_RACUN: formatAccountDashed(brojZaSlot("FBIH.nezap")),
    FOND_INVALIDI_RACUN: formatAccountDashed(brojZaSlot("FOND.invalidi")),
    JRT_TREZOR_BIH_RACUN: formatAccountDashed(brojZaSlot("JRT.trezor")),
    RS_BUDZET_RACUN: brojZaSlot("RS.budzet"),
    KOMORE,
  };
}

/** Trenutne vrijednosti (keširan objekat; NE mutirati). */
function trenutni() {
  if (!spojeno) spojeno = buildMerged();
  return spojeno;
}

function getVerzija() {
  return verzija;
}

/** Meta za "podaci usklađeni sa…" liniju (null dok se baza ne učita). */
function getMeta() {
  return meta;
}

/** Raniji brojevi po slotu (Map kljuc → Set cifara). Uvoz izvoda ih koristi
 *  da prepozna uplate na stari račun sa izvoda iz perioda prije izmjene. */
function stariBrojevi() {
  return stariPoSlotu;
}

/** Primijeni redove iz baze na keš (izdvojeno radi testova).
 *  logRows (opciono): audit zapisi iz kojih se skupljaju raniji brojevi. */
function primijeniRedove(rows, logRows) {
  const mapa = new Map();
  let zadnjiIzvor = null;
  let zadnjiIzvorTs = 0;
  let maxDatum = null;
  for (const r of rows) {
    const d = normalizeAccountDigits(r.racun);
    if (d.length === 16) mapa.set(r.kljuc, d);
    const ts = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    if (r.izvor && ts >= zadnjiIzvorTs) {
      zadnjiIzvor = r.izvor;
      zadnjiIzvorTs = ts;
    }
    for (const cand of [r.datumProvjere, r.updatedAt]) {
      if (!cand) continue;
      // DATEONLY stiže kao "GGGG-MM-DD" string, updatedAt kao Date objekat
      const iso = (cand instanceof Date ? cand.toISOString() : String(cand)).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
      if (!maxDatum || iso > maxDatum) maxDatum = iso;
    }
  }
  izBaze = mapa;
  meta = rows.length ? { izvor: zadnjiIzvor, datum: maxDatum } : null;

  // Raniji brojevi: iz audit loga + seed broj ako se razlikuje od trenutnog.
  const stari = new Map();
  const dodajStari = (kljuc, digits) => {
    const d = normalizeAccountDigits(digits);
    if (d.length !== 16) return;
    const trenutniBroj = mapa.get(kljuc);
    if (trenutniBroj && d === trenutniBroj) return;
    if (!stari.has(kljuc)) stari.set(kljuc, new Set());
    stari.get(kljuc).add(d);
  };
  for (const l of logRows || []) dodajStari(l.kljuc, l.stariRacun);
  for (const def of SEED_DEFS) {
    if (mapa.has(def.kljuc)) dodajStari(def.kljuc, def.racun);
  }
  stariPoSlotu = stari;

  spojeno = null;
  verzija += 1;
}

/** Učitaj šifarnik iz baze u keš. Tiho preživi nedostupnu bazu (ostaje seed). */
async function ucitaj() {
  try {
    const { UplatniRacun, UplatniRacunLog } = require("../models");
    const rows = await UplatniRacun.findAll({ raw: true });
    const logRows = await UplatniRacunLog.findAll({
      attributes: ["kljuc", "stariRacun"],
      where: { akcija: "izmjena" },
      raw: true,
    });
    primijeniRedove(rows, logRows);
    return true;
  } catch (err) {
    console.error("racuniService: učitavanje iz baze nije uspjelo:", err.message);
    return false;
  }
}

/** Ubaci slotove koji fale u bazi (nikad ne dira postojeće redove). */
async function seedNedostajuce() {
  const { UplatniRacun } = require("../models");
  const postojece = await UplatniRacun.findAll({ attributes: ["kljuc"], raw: true });
  const ima = new Set(postojece.map((r) => r.kljuc));
  const fale = SEED_DEFS.filter((d) => !ima.has(d.kljuc));
  if (!fale.length) return 0;
  await UplatniRacun.bulkCreate(
    fale.map((d) => ({ ...d, izvor: SEED_IZVOR })),
  );
  return fale.length;
}

/** Poziva se pri startu servera, poslije sequelize.sync(). */
async function init() {
  try {
    const ubaceno = await seedNedostajuce();
    if (ubaceno) console.log(`racuniService: seedovano ${ubaceno} uplatnih računa`);
  } catch (err) {
    console.error("racuniService: seed nije uspio:", err.message);
  }
  await ucitaj();
}

/** Poziva se poslije admin izmjene da keš odmah vidi novo stanje. */
async function osvjezi() {
  return ucitaj();
}

module.exports = {
  trenutni,
  getVerzija,
  getMeta,
  stariBrojevi,
  init,
  osvjezi,
  validirajRacun,
  mod97,
  // za admin kontroler i testove
  SEED_DEFS,
  SEED_IZVOR,
  primijeniRedove,
  formatAccountDashed,
  normalizeAccountDigits,
  bankNameFromAccount,
};
