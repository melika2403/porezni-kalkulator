// ──────────────────────────────────────────────────────────────────────────────
//  MF banka a.d. Banja Luka — XML nalozi za uvoz u Web Banking (24x7 iBank).
//
//  Predložak su STVARNI izvozi iz MF Web Bankinga (klijent, 01.09.2026.):
//  "PIO NALOG.xml" (javni prihod, ibank.payment.budgetary sa budgetary
//  blokom) i "PLATA NALOG FX2004.xml" (lična isplata, ibank.payment.pp3).
//  Zvanična iBank FX spec potvrđuje da pmtorderrq nosi VIŠE pmtorder
//  elemenata (maxoccurs = unbounded), pa cijeli obračun ide u jedan fajl.
//
//  Vjerno izvoznom predlošku: UTF-16 LE sa BOM, bez XML deklaracije, sve u
//  jednoj liniji, prazna polja kao samozatvarajući tagovi (<bankid />).
//  Root bez count atributa (kao MF izvoz); ako probni uvoz zatraži count,
//  dodati count="N" na pmtorderrq (starija FX spec ga je imala).
//  Diakritika ide izravno (UTF-16), NEMA transliteracije.
//
//  Validacija je tvrda kao kod TKDIS/ELBA formattera: nalog javnog prihoda sa
//  praznim ili prekratkim poljem se ODBIJA (ne izvozi se prazan tag), a izvoz
//  je dozvoljen samo sa računa u MF banci. trnuid je deterministički pa
//  ponovljeni uvoz istog obračuna banka prepozna kao duplikat.
// ──────────────────────────────────────────────────────────────────────────────
const { createHash } = require("crypto");

const MF_BANK_PREFIX = "572";
const MF_BANK_NAME = "MF banka a.d. Banja Luka";

class MfGreska extends Error {}

const digits = (s) => String(s || "").replace(/\D/g, "");

// Polja javnog prihoda su fiksne dužine (šifra općine 3, vrsta prihoda 6,
// budžetska organizacija 7, poziv na broj 10, porezni broj 13). Pogrešna
// dužina se NE skraćuje i NE propušta prazna: banka bi nalog primila, a
// Trezor ga ne bi mogao proknjižiti na pravu općinu i pravi javni prihod.
// Isto pravilo kao fiksneCifre u tkdisFormatter.js i elbaFormatter.js.
function fiksneCifre(value, len, ctx) {
  const s = String(value ?? "");
  if (!new RegExp(`^\\d{${len}}$`).test(s)) {
    throw new MfGreska(
      `MF izvoz: ${ctx.polje} (${ctx.nalog}) mora imati tačno ${len} cifara, dobio: ${JSON.stringify(s)}`,
    );
  }
  return s;
}

// Identifikator naloga (trnuid) mora biti STABILAN: banka po njemu prepoznaje
// da je isti nalog već uvezen. Nasumičan GUID bi kod ponovljenog uvoza istog
// obračuna napravio duple naloge, pa se GUID izvodi (RFC 4122 v5, SHA-1) iz
// nepromjenjivih podataka naloga: račun platioca, datum valute, redni broj
// naloga u datoteci, iznos i račun primaoca.
const MF_TRNUID_NAMESPACE = "poreznikalkulator.ba/mf-izvoz";

function trnuid(sjeme) {
  const bajtovi = createHash("sha1")
    .update(`${MF_TRNUID_NAMESPACE}|${sjeme}`)
    .digest()
    .subarray(0, 16);
  bajtovi[6] = (bajtovi[6] & 0x0f) | 0x50; // verzija 5
  bajtovi[8] = (bajtovi[8] & 0x3f) | 0x80; // RFC 4122 varijanta
  const h = bajtovi.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// <tag>vrijednost</tag>, a prazno kao <tag /> (kao u MF izvozu)
const tag = (name, value) => {
  const v = String(value ?? "").trim();
  return v ? `<${name}>${esc(v)}</${name}>` : `<${name} />`;
};

// Datum (Date ili ISO string) → "GGGG-MM-DDT00:00:00" po lokalnom kalendaru
function isoDatum(d) {
  if (d instanceof Date && !Number.isNaN(d.getTime())) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T00:00:00`;
  }
  const s = String(d || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new MfGreska(`MF izvoz: neispravan datum "${d}"`);
  }
  return `${s}T00:00:00`;
}

function iznosKm(feninga) {
  return (Math.round(Number(feninga) || 0) / 100).toFixed(2);
}

// budgetary blok: popunjen za javne prihode, prazan (svi tagovi) za prenose,
// tačno kao u oba MF primjera
function budgetaryBlok(n) {
  if (!n) {
    return (
      "<budgetary>" +
      tag("validationaccountid", "") +
      tag("validationaccountdescription", "") +
      tag("datefrom", "") +
      tag("dateto", "") +
      tag("county", "") +
      tag("paymentcode", "") +
      tag("budgetarybeneficiary", "") +
      tag("taxaccount", "") +
      tag("incomecode", "") +
      "</budgetary>"
    );
  }
  return (
    "<budgetary>" +
    tag("validationaccountid", digits(n.racun)) +
    tag("validationaccountdescription", n.naziv) +
    tag("datefrom", isoDatum(n.periodOd)) +
    tag("dateto", isoDatum(n.periodDo)) +
    tag("county", n.opcina) +
    // vrsta uplate: 0 = redovna (kao na uplatnicama i u MF primjeru)
    tag("paymentcode", "0") +
    tag("budgetarybeneficiary", n.budzetskaOrganizacija) +
    tag("taxaccount", n.jib) +
    tag("incomecode", n.vrstaPrihoda) +
    "</budgetary>"
  );
}

/**
 * @param {{ platilac: {racun, naziv, adresa, mjesto, mjestoSaPtt},
 *           datumValute: Date, nalozi: Array<Object> }} file  (obracunAdapter)
 * @returns {Buffer} UTF-16 LE (BOM) XML za uvoz u MF Web Banking
 */
function formatMfXml(file) {
  const platilacRacun = digits(file.platilac?.racun);
  if (platilacRacun.length !== 16) {
    throw new MfGreska(
      `MF izvoz: žiro račun organizacije mora imati 16 cifara (uneseno: "${file.platilac?.racun || ""}"). Upišite račun organizacije na profilu.`,
    );
  }
  // Datoteka tvrdi da je platilac u MF banci (naziv banke je konstanta,
  // hitnost INT/ACH se računa u odnosu na MF): račun druge banke ovdje nema
  // šta tražiti, izvoz bi banci poslao neistinit podatak.
  if (!platilacRacun.startsWith(MF_BANK_PREFIX)) {
    throw new MfGreska(
      `MF izvoz: ovaj izvoz je namijenjen računu u MF banci (${MF_BANK_PREFIX}...), a račun organizacije je "${file.platilac?.racun || ""}". Izaberite profil banke kod koje vam je otvoren račun.`,
    );
  }
  const platilacNaziv = String(file.platilac?.naziv || "").trim();
  if (!platilacNaziv) {
    throw new MfGreska("MF izvoz: organizacija nema naziv.");
  }
  // "GNJILAVAC BB,77220, CAZIN" u primjeru: adresa + PTT + grad
  const platilacCity = [
    String(file.platilac?.adresa || "").trim(),
    String(file.platilac?.mjestoSaPtt || file.platilac?.mjesto || "").trim(),
  ]
    .filter(Boolean)
    .join(", ");
  const dtdue = isoDatum(file.datumValute);

  const orders = [];
  for (const n of file.nalozi || []) {
    const racun = digits(n.racun);
    if (racun.length !== 16) {
      throw new MfGreska(
        `MF izvoz: račun primaoca "${n.racun}" (${n.naziv}) nema 16 cifara.`,
      );
    }
    if (!(n.iznosFeninga > 0)) continue;
    const javni = n.tip === "javniPrihod";
    // redni broj naloga u datoteci (i za poruke o grešci i za trnuid)
    const redniBroj = orders.length + 1;
    const ctx = { nalog: `nalog ${redniBroj}, ${String(n.naziv || "").trim()}` };
    if (javni) {
      if (!digits(n.jib)) {
        throw new MfGreska(
          `MF izvoz: organizacija nema upisan JIB (obavezan na nalozima javnih prihoda; ${ctx.nalog}).`,
        );
      }
      // nalozi javnih prihoda: sva polja naloga moraju biti tačne dužine
      fiksneCifre(n.jib, 13, { ...ctx, polje: "porezni broj obveznika (JIB)" });
      fiksneCifre(n.opcina, 3, { ...ctx, polje: "šifra općine" });
      fiksneCifre(n.vrstaPrihoda, 6, { ...ctx, polje: "vrsta prihoda" });
      fiksneCifre(n.budzetskaOrganizacija, 7, {
        ...ctx,
        polje: "budžetska organizacija",
      });
      fiksneCifre(n.pozivNaBroj, 10, { ...ctx, polje: "poziv na broj" });
    }
    const iznos = iznosKm(n.iznosFeninga);
    orders.push(
      "<pmtorder>" +
        "<companyinfo>" +
        tag("name", platilacNaziv) +
        tag("city", platilacCity) +
        "</companyinfo>" +
        "<accountinfo>" +
        tag("acctid", platilacRacun) +
        tag("bankid", "") +
        tag("bankname", MF_BANK_NAME) +
        "</accountinfo>" +
        "<payeecompanyinfo>" +
        // naziv primaoca: MF izvoz ga siječe na 50 znakova (puni naziv ide u
        // validationaccountdescription), radimo isto
        tag("name", String(n.naziv || "").trim().slice(0, 50)) +
        tag("city", n.mjesto) +
        "</payeecompanyinfo>" +
        "<payeeaccountinfo>" +
        tag("acctid", racun) +
        tag("bankid", "") +
        tag("bankname", "") +
        "</payeeaccountinfo>" +
        tag("trntype", javni ? "ibank.payment.budgetary" : "ibank.payment.pp3") +
        tag(
          "trnuid",
          trnuid(`${platilacRacun}|${dtdue}|${redniBroj}|${iznos}|${racun}`),
        ) +
        tag("dtdue", dtdue) +
        tag("trnamt", iznos) +
        tag("purpose", n.svrha) +
        // šifre plaćanja iz MF izvoza: 43 lična primanja, 999 javni prihodi
        tag("purposecode", javni ? "999" : "43") +
        tag("curdef", "BAM") +
        tag("refmodel", "") +
        tag("refnumber", "") +
        tag("payeerefmodel", "") +
        tag("payeerefnumber", javni ? n.pozivNaBroj : "") +
        budgetaryBlok(javni ? n : null) +
        // INT = interni prenos unutar MF banke, ACH = kliring prema drugim
        // bankama (PIO primjer prema Union banci je ACH)
        tag("urgency", racun.startsWith(MF_BANK_PREFIX) ? "INT" : "ACH") +
        tag("priority", "0") +
        tag("taxid", "") +
        tag("fitid", "") +
        "<properties><notification>" +
        tag("channel", "ibank.rc") +
        "</notification></properties>" +
        "</pmtorder>",
    );
  }

  if (orders.length === 0) {
    throw new MfGreska("MF izvoz: nema nijednog naloga za izvoz.");
  }

  const xml = "<pmtorderrq>" + orders.join("") + "</pmtorderrq>";
  // UTF-16 LE sa BOM, kao originalni MF izvoz
  return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(xml, "utf16le")]);
}

module.exports = { formatMfXml, MfGreska, MF_BANK_PREFIX };
