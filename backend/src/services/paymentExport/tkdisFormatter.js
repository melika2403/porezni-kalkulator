// TKDIS 336 formatter za izvoz platnih naloga u e-bankarstvo.
//
// Čist modul bez veze sa PK domenom: ulaz je TkdisFile objekat (platilac,
// datum valute, nalozi), izlaz Buffer spreman za binarno pisanje. Profil
// banke bira encoder (Halcom: YUSCII, UniCredit: Windows-1250) i da li se
// na kraj datoteke piše 0x1A (Halcom da, UniCredit ne). Sve ostalo je
// zajedničko: isti slog od 336 znakova, iste pozicije svih polja.
//
// Spec i izvori verifikacije: docs/faza0-tkdis-izvoz-halcom.md
// Golden test (bajt po bajt nad stvarnim Halcom datotekama): test/tkdisGolden.test.js
//
// Pravila kojih se ovaj modul drži:
//   - iznosi su ISKLJUČIVO cijeli feninzi (integer), nikad float
//   - tekstualna polja: toUpperCase → encoding → skraćivanje → dopuna razmacima
//   - numerička/ID polja se NE skraćuju: pogrešna dužina baca grešku
//   - nepodržan znak u encodingu baca grešku sa kontekstom (polje, vrijednost,
//     nalog), nikad tiho ispuštanje

const ROW_LEN = 336;
const CRLF = Buffer.from([0x0d, 0x0a]);
const EOF_1A = Buffer.from([0x1a]);

const PROFILI = new Set(["halcom", "unicredit"]);

// ── Encoderi ─────────────────────────────────────────────────────────────────
// Polja su uppercase pa su dovoljna velika slova. YUSCII (JUS I.B1.002):
// dijakritika se zapisuje ASCII znakovima; potvrđeno u fixtures (BUD@ET,
// BIHA], ZAPO[LJAVANJE). Windows-1250: prava dijakritika u cp1250 bajtovima.

const YUSCII_MAPA = {
  "Č": 0x5e, // ^
  "Ć": 0x5d, // ]
  "Ž": 0x40, // @
  "Š": 0x5b, // [
  "Đ": 0x5c, // \
};

const CP1250_MAPA = {
  "Č": 0xc8,
  "Ć": 0xc6,
  "Ž": 0x8e,
  "Š": 0x8a,
  "Đ": 0xd0,
};

class TkdisGreska extends Error {}

// Enkodira već-uppercase string u bajtove; nepodržan znak baca grešku sa
// kontekstom. ASCII 0x20-0x7E prolazi u oba encodinga.
function enkodiraj(text, mapa, ctx) {
  const bajtovi = [];
  for (const znak of String(text)) {
    const kod = znak.codePointAt(0);
    if (kod >= 0x20 && kod <= 0x7e) {
      bajtovi.push(kod);
      continue;
    }
    const zamjena = mapa[znak];
    if (zamjena === undefined) {
      throw new TkdisGreska(
        `Nepodržan znak ${JSON.stringify(znak)} u ${ctx.polje} (${ctx.nalog}): ` +
          `${JSON.stringify(String(text))}`,
      );
    }
    bajtovi.push(zamjena);
  }
  return bajtovi;
}

// ── Pomoćnici za polja ───────────────────────────────────────────────────────

// Tekstualno polje: uppercase → encoding → tvrdo skraćivanje na len →
// dopuna razmacima zdesna (redoslijed iz spec-a).
function tekst(value, len, mapa, ctx) {
  const bajtovi = enkodiraj(String(value ?? "").toUpperCase(), mapa, ctx).slice(0, len);
  while (bajtovi.length < len) bajtovi.push(0x20);
  return bajtovi;
}

// Broj fiksne dužine (JIB, općina, budžetska org, poziv na broj, vrsta
// prihoda): mora biti TAČNO len cifara, inače greška. Skraćivanje bi ovdje
// promijenilo značenje pa je zabranjeno.
function fiksneCifre(value, len, ctx) {
  const s = String(value ?? "");
  if (!new RegExp(`^\\d{${len}}$`).test(s)) {
    throw new TkdisGreska(
      `${ctx.polje} (${ctx.nalog}) mora imati tačno ${len} cifara, dobio: ${JSON.stringify(s)}`,
    );
  }
  return [...s].map((c) => c.charCodeAt(0));
}

// Iznos u feninzima: cijeli broj > 0, upisan sa vodećim nulama na len cifara.
function iznosCifre(feninzi, len, ctx) {
  if (!Number.isInteger(feninzi) || feninzi <= 0) {
    throw new TkdisGreska(
      `${ctx.polje} (${ctx.nalog}) mora biti cijeli broj feninga veći od 0, dobio: ${feninzi}`,
    );
  }
  const s = String(feninzi);
  if (s.length > len) {
    throw new TkdisGreska(
      `${ctx.polje} (${ctx.nalog}) ne staje u ${len} cifara: ${s}`,
    );
  }
  return [...s.padStart(len, "0")].map((c) => c.charCodeAt(0));
}

// Račun: ukloni sve što nije cifra, mora ostati tačno 16 → "NNN" + 13 + 2 razmaka.
function racun18(value, ctx) {
  const cifre = String(value ?? "").replace(/\D/g, "");
  if (cifre.length !== 16) {
    throw new TkdisGreska(
      `${ctx.polje} (${ctx.nalog}) mora imati tačno 16 cifara, dobio ${cifre.length}: ${JSON.stringify(String(value ?? ""))}`,
    );
  }
  return [...`${cifre}  `].map((c) => c.charCodeAt(0));
}

function validanDatum(d, ctx) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new TkdisGreska(`${ctx.polje} (${ctx.nalog}) nije ispravan datum`);
  }
  return d;
}

// DDMMGG (npr. 26.06.2026. → "260626")
function datumDdmmgg(d, ctx) {
  validanDatum(d, ctx);
  const p = (n) => String(n).padStart(2, "0");
  return [...`${p(d.getDate())}${p(d.getMonth() + 1)}${String(d.getFullYear()).slice(-2)}`].map(
    (c) => c.charCodeAt(0),
  );
}

// DD-MM-GGGG (poziv odobrenja)
function datumDdMmGggg(d, ctx) {
  validanDatum(d, ctx);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// ── Slaganje redova ──────────────────────────────────────────────────────────

function noviRed() {
  return Buffer.alloc(ROW_LEN, 0x20);
}

// Upiši bajtove na 1-baziranu poziciju spec tablice.
function upisi(red, pozicija, bajtovi) {
  for (let i = 0; i < bajtovi.length; i++) {
    red[pozicija - 1 + i] = bajtovi[i];
  }
}

function adresnaStavka(file, mapa) {
  const ctx = { polje: "platilac", nalog: "adresna stavka" };
  const red = noviRed();
  upisi(red, 1, racun18(file.platilac.racun, { ...ctx, polje: "račun platioca" }));
  upisi(red, 19, tekst(file.platilac.naziv, 35, mapa, { ...ctx, polje: "naziv platioca" }));
  upisi(red, 54, tekst(file.platilac.mjesto, 10, mapa, { ...ctx, polje: "mjesto platioca" }));
  upisi(red, 64, datumDdmmgg(file.datumValute, { ...ctx, polje: "datum valute" }));
  upisi(red, 324, [..."MULTI E-BANK"].map((c) => c.charCodeAt(0)));
  upisi(red, 336, [0x30]); // "0"
  return red;
}

function zbirnaStavka(file, sumaFeninga, mapa) {
  const ctx = { polje: "platilac", nalog: "zbirna stavka" };
  const red = noviRed();
  upisi(red, 1, racun18(file.platilac.racun, { ...ctx, polje: "račun platioca" }));
  upisi(red, 19, tekst(file.platilac.naziv, 35, mapa, { ...ctx, polje: "naziv platioca" }));
  upisi(red, 54, tekst(file.platilac.mjesto, 10, mapa, { ...ctx, polje: "mjesto platioca" }));
  upisi(red, 64, iznosCifre(sumaFeninga, 15, { ...ctx, polje: "zbroj iznosa" }));
  upisi(red, 79, [...String(file.nalozi.length).padStart(5, "0")].map((c) => c.charCodeAt(0)));
  upisi(red, 336, [0x39]); // "9"
  return red;
}

function individualnaStavka(nalog, file, mapa, redniBroj) {
  const ctx = { nalog: `nalog ${redniBroj}` };
  const jp = nalog.tip === "javniPrihod";
  if (!jp && nalog.tip !== "prenos") {
    throw new TkdisGreska(`Nepoznat tip naloga (${ctx.nalog}): ${JSON.stringify(nalog.tip)}`);
  }
  const red = noviRed();
  upisi(red, 1, racun18(nalog.racun, { ...ctx, polje: "račun primaoca" }));
  upisi(red, 19, tekst(nalog.naziv, 35, mapa, { ...ctx, polje: "naziv primaoca" }));
  upisi(red, 54, tekst(nalog.mjesto, 10, mapa, { ...ctx, polje: "mjesto primaoca" }));
  upisi(red, 64, [0x30]); // konstanta "0"
  // 65-66 model poziva zaduženja i 67-88 poziv zaduženja: prazno (razmaci)
  upisi(red, 89, tekst(nalog.svrha, 140, mapa, { ...ctx, polje: "svrha plaćanja" }));
  upisi(red, 229, [..."00000"].map((c) => c.charCodeAt(0)));

  // Šifra plaćanja: TRI polja po 2 znaka. Prenos: 01 / 10 / prazno (osim ako
  // pozivalac zada drugačije), javni prihod: fiksno 01 / 10 / 11.
  const sifra = (v, def) => {
    const s = String(v ?? def);
    if (!/^(\d{2}|)$/.test(s)) {
      throw new TkdisGreska(`Šifra plaćanja (${ctx.nalog}) mora biti 2 cifre ili prazna, dobio: ${JSON.stringify(s)}`);
    }
    return [...s.padEnd(2, " ")].map((c) => c.charCodeAt(0));
  };
  if (jp) {
    upisi(red, 234, sifra("01"));
    upisi(red, 236, sifra("10"));
    upisi(red, 238, sifra("11"));
  } else {
    upisi(red, 234, sifra(nalog.sifra1, "01"));
    upisi(red, 236, sifra(nalog.sifra2, "10"));
    upisi(red, 238, sifra(nalog.sifra3, ""));
  }

  upisi(red, 240, iznosCifre(nalog.iznosFeninga, 13, { ...ctx, polje: "iznos" }));

  // Poziv odobrenja: naše pravilo za oba profila je datum valute DD-MM-GGGG
  // uz model 00 (UniCredit ga validira, Halcomu ne smeta).
  upisi(red, 253, [..."00"].map((c) => c.charCodeAt(0)));
  const pozivOdobrenja = datumDdMmGggg(file.datumValute, { ...ctx, polje: "datum valute" });
  upisi(red, 255, [...pozivOdobrenja.padEnd(22, " ")].map((c) => c.charCodeAt(0)));

  upisi(red, 277, datumDdmmgg(file.datumValute, { ...ctx, polje: "datum valute" }));
  upisi(red, 283, [jp ? 0x31 : 0x30]); // tip dokumenta: 1 javni prihod, 0 prenos

  if (jp) {
    upisi(red, 284, fiksneCifre(nalog.jib, 13, { ...ctx, polje: "JIB" }));
    upisi(red, 297, [0x30]); // vrsta uplate: 0 redovna
    upisi(red, 298, fiksneCifre(nalog.vrstaPrihoda, 6, { ...ctx, polje: "vrsta prihoda" }));
    upisi(red, 304, datumDdmmgg(nalog.periodOd, { ...ctx, polje: "porezni period od" }));
    upisi(red, 310, datumDdmmgg(nalog.periodDo, { ...ctx, polje: "porezni period do" }));
    upisi(red, 316, fiksneCifre(nalog.opcina, 3, { ...ctx, polje: "šifra općine" }));
    upisi(red, 319, fiksneCifre(nalog.budzetskaOrganizacija, 7, { ...ctx, polje: "budžetska organizacija" }));
    upisi(red, 326, fiksneCifre(nalog.pozivNaBroj, 10, { ...ctx, polje: "poziv na broj" }));
  }
  // kod prenosa porezna polja (284-335) ostaju razmaci

  upisi(red, 336, [0x31]); // "1"
  return red;
}

// ── Glavna funkcija ──────────────────────────────────────────────────────────

/**
 * @param {{
 *   platilac: { racun: string, naziv: string, mjesto: string },
 *   datumValute: Date,
 *   nalozi: Array<Object>,
 * }} file
 * @param {"halcom"|"unicredit"} profil
 * @param {{ transliteracija?: "yuscii"|"cp1250" }} [opts] override encodinga
 *   (admin harness, za brzo testiranje); default prati profil banke.
 * @returns {Buffer}
 */
function formatTkdis(file, profil, opts = {}) {
  if (!PROFILI.has(profil)) {
    throw new TkdisGreska(`Nepoznat profil banke: ${JSON.stringify(profil)}`);
  }
  if (!file || !file.platilac || !Array.isArray(file.nalozi)) {
    throw new TkdisGreska("Neispravan ulaz: očekujem { platilac, datumValute, nalozi }");
  }
  if (file.nalozi.length === 0) {
    throw new TkdisGreska("Datoteka bez ijednog naloga nema smisla");
  }
  const translit =
    opts.transliteracija || (profil === "halcom" ? "yuscii" : "cp1250");
  if (translit !== "yuscii" && translit !== "cp1250") {
    throw new TkdisGreska(`Nepoznata transliteracija: ${JSON.stringify(translit)}`);
  }
  const mapa = translit === "yuscii" ? YUSCII_MAPA : CP1250_MAPA;

  let suma = 0;
  for (const n of file.nalozi) suma += Number(n.iznosFeninga) || 0;

  const redovi = [
    adresnaStavka(file, mapa),
    zbirnaStavka(file, suma, mapa),
    ...file.nalozi.map((n, i) => individualnaStavka(n, file, mapa, i + 1)),
  ];

  const dijelovi = [];
  for (const red of redovi) dijelovi.push(red, CRLF);
  // Halcom iza zadnjeg CRLF piše 0x1A (DOS kraj datoteke); UniCredit ne.
  if (profil === "halcom") dijelovi.push(EOF_1A);
  return Buffer.concat(dijelovi);
}

// Mapa za dekodiranje cp1250 bajtova nazad u slova (pregled u admin harnessu).
const CP1250_U_SLOVO = new Map(
  Object.entries(CP1250_MAPA).map(([slovo, bajt]) => [bajt, slovo]),
);

module.exports = { formatTkdis, TkdisGreska, ROW_LEN, CP1250_U_SLOVO };
