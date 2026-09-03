// PK Freelancer: čisti helperi za evidenciju uplata (bez modela, testabilno).
//
// Obračun MORA biti identičan onom na /ams (frontend/src/sections/ams/Ams.tsx,
// "computed"): normirani rashodi 20% (30% autorske naknade), doprinos za
// zdravstveno 4% na dohodak, porez 10% na osnovicu (dohodak - zdravstveno),
// zdravstveno se dijeli 89,8% kantonu i 10,2% FBiH. Zaokruživanje na 2
// decimale poslije svakog koraka, isto kao u obrascu.

const STATUSI = ["OBRACUNATO", "PLACENO", "PREDANO"];
// valute sa CBBiH kursne liste + KM
const VALUTE = [
  "BAM", "EUR", "USD", "GBP", "CHF", "CAD", "AUD", "SEK", "NOK", "DKK",
  "JPY", "PLN", "CZK", "HUF", "TRY", "RSD", "CNY", "RUB",
];
const EUR_KURS = 1.95583;
const ROK_DANA = 5;
const MAX_SNIMAK_ZNAKOVA = 20000;
// Gornje granice prate kolone u bazi: novac je DECIMAL(12,2), kurs DECIMAL(14,6).
// Bez njih veći broj daje 500 ili tiho odsječen iznos u evidenciji.
const MAX_IZNOS = 1e9;
const MAX_KURS = 1e6;
// Dozvoljeno odstupanje klijentovog preračuna u KM (zaokruživanje kursa).
const MAX_ODSTUPANJE_KM = 0.02;
// Stanje zapisa (status i datumi) se kod izmjene ne dira ako klijent ta polja
// nije poslao, npr. ponovno preuzimanje obrasca sa /ams ne šalje status.
const POLJA_STANJA = ["status", "datumPlacanja", "datumPredaje"];

const r2 = (n) => Math.round(Number(n) * 100) / 100;

function obracunajAms({ iznosKm, stopaRashoda = 20, porezniKredit = 0 }) {
  const bruto = r2(Number(iznosKm) || 0);
  const pct = Math.min(Math.max(Number(stopaRashoda) || 0, 0), 100);
  const rashodi = r2(bruto * (pct / 100));
  const dohodak = r2(bruto - rashodi);
  const zdravstveno = r2(dohodak * 0.04);
  const osnovica = r2(dohodak - zdravstveno);
  const porez = r2(osnovica * 0.1);
  const kredit = r2(Math.max(Number(porezniKredit) || 0, 0));
  const razlika = r2(porez - kredit);
  const zdravstvenoKanton = r2(zdravstveno * 0.898);
  const zdravstvenoFbih = r2(zdravstveno * 0.102);
  const neto = r2(bruto - zdravstveno - razlika);
  return {
    rashodi,
    dohodak,
    zdravstveno,
    zdravstvenoKanton,
    zdravstvenoFbih,
    osnovica,
    porez,
    porezniKredit: kredit,
    razlika,
    neto,
  };
}

// ── Datumi (ISO yyyy-mm-dd, bez vremenskih zona) ─────────────────────────────
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function validanIsoDatum(s) {
  if (typeof s !== "string" || !ISO_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function pomjeriDan(iso, dana) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dana)).toISOString().slice(0, 10);
}

function danasIso(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Rok za predaju AMS-1035: 5 dana od dana primitka. */
function rokPredaje(datumPrimitka) {
  return pomjeriDan(datumPrimitka, ROK_DANA);
}

/** Koliko dana do roka (negativno = prošao). */
function danaDoRoka(datumPrimitka, danas = danasIso()) {
  const rok = rokPredaje(datumPrimitka);
  return Math.round((Date.parse(rok) - Date.parse(danas)) / 86400000);
}

// ── Normalizacija ulaza ──────────────────────────────────────────────────────
function tekst(v, max) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function broj(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim()) return Number(v.trim().replace(",", "."));
  return NaN;
}

function cijeliBroj(v) {
  const n = broj(v);
  return Number.isInteger(n) ? n : NaN;
}

function snimak(v, errors, naziv) {
  if (v === undefined || v === null) return null;
  if (typeof v !== "object" || Array.isArray(v)) {
    errors.push(`${naziv}: neispravan snimak obrasca.`);
    return null;
  }
  let s;
  try {
    s = JSON.stringify(v);
  } catch {
    errors.push(`${naziv}: neispravan snimak obrasca.`);
    return null;
  }
  if (s.length > MAX_SNIMAK_ZNAKOVA) {
    errors.push(`${naziv}: snimak obrasca je prevelik.`);
    return null;
  }
  return v;
}

/**
 * Normalizuje i validira tijelo zahtjeva za uplatu. Server uvijek sam računa
 * obračun iz iznosa u KM; iznosi koje klijent pošalje za obračun se ignorišu.
 * @returns {{ errors: string[], data: object }}
 */
function normalizujUplatu(body, { danas = danasIso() } = {}) {
  const errors = [];
  const b = body && typeof body === "object" ? body : {};

  const datumPrimitka = tekst(b.datumPrimitka, 10);
  if (!datumPrimitka || !validanIsoDatum(datumPrimitka)) {
    errors.push("Datum primitka nije ispravan.");
  } else {
    const godina = Number(datumPrimitka.slice(0, 4));
    if (godina < 2015 || datumPrimitka > pomjeriDan(danas, 1)) {
      errors.push("Datum primitka je van dozvoljenog raspona.");
    }
  }
  const [gDatum, mDatum] = datumPrimitka
    ? datumPrimitka.split("-").map(Number)
    : [NaN, NaN];

  let periodMjesec = b.periodMjesec == null || b.periodMjesec === ""
    ? mDatum
    : cijeliBroj(b.periodMjesec);
  if (!(periodMjesec >= 1 && periodMjesec <= 12)) {
    errors.push("Period (mjesec) nije ispravan.");
    periodMjesec = null;
  }
  let periodGodina = b.periodGodina == null || b.periodGodina === ""
    ? gDatum
    : cijeliBroj(b.periodGodina);
  if (!(periodGodina >= 2015 && periodGodina <= 2100)) {
    errors.push("Period (godina) nije ispravan.");
    periodGodina = null;
  }

  const isplatilacNaziv = tekst(b.isplatilacNaziv, 255);
  if (!isplatilacNaziv) errors.push("Naziv isplatioca je obavezan.");

  const valuta = (tekst(b.valuta, 3) || "BAM").toUpperCase();
  if (!VALUTE.includes(valuta)) errors.push("Valuta nije podržana.");

  let iznosKm;
  let iznosValuta;
  let kurs;
  if (valuta === "BAM") {
    iznosKm = r2(broj(b.iznosKm));
    iznosValuta = iznosKm;
    kurs = 1;
  } else {
    iznosValuta = r2(broj(b.iznosValuta));
    kurs = broj(b.kurs);
    if (!(kurs > 0)) kurs = valuta === "EUR" ? EUR_KURS : NaN;
    if (!(kurs > 0)) errors.push("Kurs za preračun u KM je obavezan.");
    else if (kurs > MAX_KURS) errors.push("Kurs je izvan dozvoljenog raspona.");
    else kurs = Math.round(kurs * 1e6) / 1e6;
    if (!(iznosValuta > 0)) errors.push("Iznos u valuti mora biti veći od nule.");
    else if (iznosValuta > MAX_IZNOS) errors.push("Iznos u valuti je prevelik.");
    const poslano = broj(b.iznosKm);
    if (poslano > 0) {
      iznosKm = r2(poslano);
      // Klijent smije poslati svoj preračun, ali mora se slagati sa valutom i
      // kursom, inače potvrda o prihodima ispiše iznos koji nije taj novac.
      const ocekivano = r2(iznosValuta * kurs);
      if (
        ocekivano > 0 &&
        Math.abs(iznosKm - ocekivano) > MAX_ODSTUPANJE_KM + 1e-9
      ) {
        errors.push(
          `Iznos u KM ne odgovara iznosu u valuti i kursu (očekivano ${ocekivano.toFixed(2)} KM).`,
        );
      }
    } else {
      iznosKm = r2(iznosValuta * kurs);
    }
  }
  if (!(iznosKm > 0)) {
    errors.push("Iznos u KM mora biti veći od nule.");
  } else if (iznosKm > MAX_IZNOS) {
    errors.push("Iznos u KM je prevelik.");
  }

  const stopaRashoda = cijeliBroj(b.stopaRashoda ?? 20);
  if (stopaRashoda !== 20 && stopaRashoda !== 30) {
    errors.push("Normirani rashodi mogu biti 20% ili 30%.");
  }
  let porezniKredit = b.porezniKredit == null || b.porezniKredit === ""
    ? 0
    : broj(b.porezniKredit);
  if (!(porezniKredit >= 0)) {
    errors.push("Porezni kredit ne može biti negativan.");
    porezniKredit = 0;
  } else if (iznosKm > 0 && porezniKredit > iznosKm) {
    errors.push("Porezni kredit ne može biti veći od iznosa u KM.");
  }

  const status = (tekst(b.status, 20) || "OBRACUNATO").toUpperCase();
  if (!STATUSI.includes(status)) errors.push("Status nije ispravan.");

  const datumPlacanja = tekst(b.datumPlacanja, 10);
  if (datumPlacanja && !validanIsoDatum(datumPlacanja)) {
    errors.push("Datum plaćanja nije ispravan.");
  }
  const datumPredaje = tekst(b.datumPredaje, 10);
  if (datumPredaje && !validanIsoDatum(datumPredaje)) {
    errors.push("Datum predaje nije ispravan.");
  }

  const amsPodaci = snimak(b.amsPodaci, errors, "AMS");
  const uplatnicaPodaci = snimak(b.uplatnicaPodaci, errors, "Uplatnice");

  const isplatilacIdRaw = cijeliBroj(b.isplatilacId);
  const isplatilacId = isplatilacIdRaw > 0 ? isplatilacIdRaw : null;

  const obracun = errors.length
    ? null
    : obracunajAms({ iznosKm, stopaRashoda, porezniKredit });

  return {
    errors,
    data: {
      datumPrimitka,
      periodMjesec,
      periodGodina,
      primalacIme: tekst(b.primalacIme, 255) ?? tekst(amsPodaci?.imeIPrezime, 255),
      primalacJmbg: tekst(b.primalacJmbg, 13) ?? tekst(amsPodaci?.jmbg, 13),
      primalacAdresa: tekst(b.primalacAdresa, 255) ?? tekst(amsPodaci?.adresa, 255),
      isplatilacId,
      isplatilacNaziv,
      isplatilacAdresa: tekst(b.isplatilacAdresa, 255),
      isplatilacGrad: tekst(b.isplatilacGrad, 120),
      isplatilacDrzava: tekst(b.isplatilacDrzava, 120),
      valuta,
      iznosValuta,
      kurs,
      iznosKm,
      stopaRashoda,
      kantonKey: tekst(b.kantonKey, 10),
      opcinaKod: tekst(b.opcinaKod, 10),
      opcinaIme: tekst(b.opcinaIme, 120),
      ziroRacun: tekst(b.ziroRacun, 40),
      status,
      datumPlacanja: datumPlacanja || null,
      datumPredaje: datumPredaje || null,
      napomena: tekst(b.napomena, 2000),
      amsPodaci,
      uplatnicaPodaci,
      ...(obracun || {}),
    },
  };
}

/**
 * Priprema podatke za IZMJENU postojeće uplate: izbacuje status i datume koje
 * klijent nije poslao, jer normalizacija za njih vraća podrazumijevane
 * vrijednosti (OBRACUNATO, null) pa bi se izgubilo već zabilježeno plaćanje.
 * @param {object} data rezultat normalizujUplatu().data
 * @param {object} body originalno tijelo zahtjeva
 */
function bezOdsutnihStanja(data, body) {
  const b = body && typeof body === "object" ? body : {};
  const out = { ...data };
  for (const k of POLJA_STANJA) {
    if (!(k in b)) delete out[k];
  }
  return out;
}

module.exports = {
  STATUSI,
  VALUTE,
  EUR_KURS,
  ROK_DANA,
  MAX_IZNOS,
  MAX_KURS,
  MAX_ODSTUPANJE_KM,
  bezOdsutnihStanja,
  r2,
  obracunajAms,
  validanIsoDatum,
  pomjeriDan,
  danasIso,
  rokPredaje,
  danaDoRoka,
  normalizujUplatu,
};
