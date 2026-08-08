// Raiffeisen RBBHnet format platnih naloga (SM zaglavlje 211 + UJ redovi 345).
//
// Zvanična specifikacija NIJE javna: format je rekonstruisan bajt po bajt iz
// ORIGINALNIH izvoznih datoteka starog programa koje RBBHnet dokazano prima
// (test/fixtures/raiffeisen_*.txt, obračun 06/2026 za MELY OBRT). Potvrđeno
// na originalima: SM slog 211 znakova (opis je polje širine 35), UJ slogovi
// 345, CRLF završeci, BEZ EOF markera, CP852 (Ž = 0xA6). EKSPERIMENTALNO
// ostaje samo dok probni uvoz u RBBHnet ne prođe; format naloga za neto
// isplate je nepoznat (stari program izvozi SAMO javne prihode, pa i mi).
//
// Slogovi:
//   SM (zaglavlje, 1x, 211 znakova): 1-2 "SM", 3-18 račun platioca (16),
//     19-37 razmaci, 38-72 naziv (35), 73-107 adresa (35), 108-142 mjesto sa
//     PTT brojem (35), 143-159 ukupan iznos u feninzima (desno, razmaci),
//     160-164 broj naloga (desno), 165-167 "BAM", 168-176 razmaci,
//     177-211 opis (35, stari program piše skraćeno "PLATE ZA 2026060").
//   UJ (javni prihod, po nalogu): 1-2 "UJ", 3-11 redni broj (desno), 12-19
//     konstanta "8888 01 " (uočena u svim redovima; 01 je šifra plaćanja),
//     20-124 naziv primaoca (105), 125-140 račun primaoca (16), 141-176 iznos
//     u feninzima (desno, razmaci), 177-184 datum valute GGGGMMDD, 185-289
//     svrha (105), 290-299 poziv na broj (10), 300-312 JIB (13), 313 vrsta
//     uplate, 314-319 vrsta prihoda, 320-322 šifra općine, 323-329 budžetska
//     organizacija, 330-337 period od GGGGMMDD, 338-345 period do GGGGMMDD.
//
// Encoding: CP852 (potvrđeno u fixture: Ž = 0xA6 u "BUDŽET USK"), sve
// uppercase. Iznosi isključivo cijeli feninzi. Nepodržan znak ili pogrešna
// dužina ID polja baca grešku sa kontekstom.

const RECORD_LEN = 345; // UJ slogovi
const SM_LEN = 211; // SM zaglavlje (opis 177-211, širina 35)
const CRLF = Buffer.from([0x0d, 0x0a]);

// CP852 bajtovi za naša slova (uppercase; tekst se prvo diže u velika slova).
const CP852_MAPA = {
  "Č": 0xac,
  "Ć": 0x8f,
  "Ž": 0xa6,
  "Š": 0xe6,
  "Đ": 0xd1,
};

class RaiffeisenGreska extends Error {}

function enkodiraj(text, ctx) {
  const bajtovi = [];
  for (const znak of String(text).toUpperCase()) {
    const kod = znak.codePointAt(0);
    if (kod >= 0x20 && kod <= 0x7e) {
      bajtovi.push(kod);
      continue;
    }
    const zamjena = CP852_MAPA[znak];
    if (zamjena === undefined) {
      throw new RaiffeisenGreska(
        `Nepodržan znak ${JSON.stringify(znak)} u ${ctx.polje} (${ctx.nalog}): ${JSON.stringify(String(text))}`,
      );
    }
    bajtovi.push(zamjena);
  }
  return bajtovi;
}

function tekst(value, len, ctx) {
  const bajtovi = enkodiraj(String(value ?? ""), ctx).slice(0, len);
  while (bajtovi.length < len) bajtovi.push(0x20);
  return bajtovi;
}

function racun16(value, ctx) {
  const cifre = String(value ?? "").replace(/\D/g, "");
  if (cifre.length !== 16) {
    throw new RaiffeisenGreska(
      `${ctx.polje} (${ctx.nalog}) mora imati tačno 16 cifara, dobio ${cifre.length}: ${JSON.stringify(String(value ?? ""))}`,
    );
  }
  return [...cifre].map((c) => c.charCodeAt(0));
}

function fiksneCifre(value, len, ctx) {
  const s = String(value ?? "");
  if (!new RegExp(`^\\d{${len}}$`).test(s)) {
    throw new RaiffeisenGreska(
      `${ctx.polje} (${ctx.nalog}) mora imati tačno ${len} cifara, dobio: ${JSON.stringify(s)}`,
    );
  }
  return [...s].map((c) => c.charCodeAt(0));
}

// Iznos u feninzima, desno poravnat i dopunjen RAZMACIMA slijeva (fixture:
// " 31239", ne "031239").
function iznosDesno(feninzi, len, ctx) {
  if (!Number.isInteger(feninzi) || feninzi <= 0) {
    throw new RaiffeisenGreska(
      `${ctx.polje} (${ctx.nalog}) mora biti cijeli broj feninga veći od 0, dobio: ${feninzi}`,
    );
  }
  const s = String(feninzi);
  if (s.length > len) {
    throw new RaiffeisenGreska(`${ctx.polje} (${ctx.nalog}) ne staje u ${len} cifara: ${s}`);
  }
  return [...s.padStart(len, " ")].map((c) => c.charCodeAt(0));
}

function desno(value, len) {
  return [...String(value).padStart(len, " ")].map((c) => c.charCodeAt(0));
}

function datumGGGGMMDD(d, ctx) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new RaiffeisenGreska(`${ctx.polje} (${ctx.nalog}) nije ispravan datum`);
  }
  const p = (n) => String(n).padStart(2, "0");
  return [...`${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`].map((c) =>
    c.charCodeAt(0),
  );
}

function noviRed(len = RECORD_LEN) {
  return Buffer.alloc(len, 0x20);
}

function upisi(red, pozicija, bajtovi) {
  for (let i = 0; i < bajtovi.length; i++) red[pozicija - 1 + i] = bajtovi[i];
}

/**
 * @param {{
 *   platilac: { racun: string, naziv: string, adresa?: string, mjesto: string },
 *   datumValute: Date,
 *   opis?: string,        // SM opis; default "PLATE ZA GGGGMM" iz perioda prvog naloga
 *   nalozi: Array<Object>, // SAMO tip "javniPrihod" (kao stari program)
 * }} file
 * @returns {Buffer}
 */
function formatRaiffeisen(file) {
  if (!file || !file.platilac || !Array.isArray(file.nalozi)) {
    throw new RaiffeisenGreska("Neispravan ulaz: očekujem { platilac, datumValute, nalozi }");
  }
  if (file.nalozi.length === 0) {
    throw new RaiffeisenGreska("Datoteka bez ijednog naloga nema smisla");
  }
  for (const [i, n] of file.nalozi.entries()) {
    if (n.tip !== "javniPrihod") {
      throw new RaiffeisenGreska(
        `Raiffeisen izvoz za sada podržava samo javne prihode; nalog ${i + 1} je ${JSON.stringify(n.tip)} (format prenosa potvrditi sa bankom)`,
      );
    }
  }

  const hCtx = { nalog: "SM zaglavlje" };
  let suma = 0;
  for (const n of file.nalozi) suma += Number(n.iznosFeninga) || 0;

  // Stari program u opis piše skraćeni oblik ("PLATE ZA 2026060"); naš
  // default je čitljiviji "PLATE ZA GGGGMM", a golden test opis zadaje sam.
  const prviOd = file.nalozi[0].periodOd;
  const defaultOpis =
    prviOd instanceof Date && !Number.isNaN(prviOd.getTime())
      ? `PLATE ZA ${prviOd.getFullYear()}${String(prviOd.getMonth() + 1).padStart(2, "0")}`
      : "PLATE";

  const sm = noviRed(SM_LEN);
  upisi(sm, 1, enkodiraj("SM", { ...hCtx, polje: "prefiks" }));
  upisi(sm, 3, racun16(file.platilac.racun, { ...hCtx, polje: "račun platioca" }));
  upisi(sm, 38, tekst(file.platilac.naziv, 35, { ...hCtx, polje: "naziv platioca" }));
  upisi(sm, 73, tekst(file.platilac.adresa || "", 35, { ...hCtx, polje: "adresa platioca" }));
  upisi(sm, 108, tekst(file.platilac.mjesto, 35, { ...hCtx, polje: "mjesto platioca" }));
  upisi(sm, 143, iznosDesno(suma, 17, { ...hCtx, polje: "ukupan iznos" }));
  upisi(sm, 160, desno(file.nalozi.length, 5));
  upisi(sm, 165, enkodiraj("BAM", hCtx));
  upisi(sm, 177, tekst(file.opis || defaultOpis, SM_LEN - 176, { ...hCtx, polje: "opis" }));

  const redovi = [sm];
  file.nalozi.forEach((nalog, i) => {
    const ctx = { nalog: `nalog ${i + 1}` };
    const red = noviRed();
    upisi(red, 1, enkodiraj("UJ", { ...ctx, polje: "prefiks" }));
    upisi(red, 3, desno(i + 1, 9));
    // Konstanta iz svih redova starog programa; "01" je šifra plaćanja.
    upisi(red, 12, enkodiraj("8888 01 ", ctx));
    upisi(red, 20, tekst(nalog.naziv, 105, { ...ctx, polje: "naziv primaoca" }));
    upisi(red, 125, racun16(nalog.racun, { ...ctx, polje: "račun primaoca" }));
    upisi(red, 141, iznosDesno(nalog.iznosFeninga, 36, { ...ctx, polje: "iznos" }));
    upisi(red, 177, datumGGGGMMDD(file.datumValute, { ...ctx, polje: "datum valute" }));
    upisi(red, 185, tekst(nalog.svrha, 105, { ...ctx, polje: "svrha" }));
    upisi(red, 290, fiksneCifre(nalog.pozivNaBroj, 10, { ...ctx, polje: "poziv na broj" }));
    upisi(red, 300, fiksneCifre(nalog.jib, 13, { ...ctx, polje: "JIB" }));
    upisi(red, 313, enkodiraj("0", ctx)); // vrsta uplate: 0 redovna
    upisi(red, 314, fiksneCifre(nalog.vrstaPrihoda, 6, { ...ctx, polje: "vrsta prihoda" }));
    upisi(red, 320, fiksneCifre(nalog.opcina, 3, { ...ctx, polje: "šifra općine" }));
    upisi(red, 323, fiksneCifre(nalog.budzetskaOrganizacija, 7, { ...ctx, polje: "budžetska organizacija" }));
    upisi(red, 330, datumGGGGMMDD(nalog.periodOd, { ...ctx, polje: "porezni period od" }));
    upisi(red, 338, datumGGGGMMDD(nalog.periodDo, { ...ctx, polje: "porezni period do" }));
    redovi.push(red);
  });

  const dijelovi = [];
  for (const red of redovi) dijelovi.push(red, CRLF);
  // Bez EOF markera (pretpostavka; potvrditi na originalnim datotekama).
  return Buffer.concat(dijelovi);
}

// Mapa za dekodiranje cp852 bajtova nazad u slova (pregled u admin harnessu).
const CP852_U_SLOVO = new Map(
  Object.entries(CP852_MAPA).map(([slovo, bajt]) => [bajt, slovo]),
);

module.exports = { formatRaiffeisen, RaiffeisenGreska, RECORD_LEN, CP852_U_SLOVO };
