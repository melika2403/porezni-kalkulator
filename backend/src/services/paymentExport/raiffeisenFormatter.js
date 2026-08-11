// Raiffeisen RBBHnet format platnih naloga (SM zaglavlje 211 + UJ/UO redovi).
//
// Zvanična specifikacija NIJE javna: format je rekonstruisan bajt po bajt iz
// ORIGINALNIH izvoznih datoteka starog programa koje RBBHnet dokazano prima
// (test/fixtures/raiffeisen_*.txt: 06/2026 MELY OBRT, 08/2026 URBANLINE za
// novo online bankarstvo, te platasviradnici sa UO prenosima). CRLF završeci,
// BEZ EOF markera.
//
// Slogovi:
//   SM (zaglavlje, 1x, 211 znakova): 1-2 "SM", 3-18 račun platioca (16),
//     19-37 razmaci, 38-72 naziv (35), 73-107 adresa (35), 108-142 mjesto sa
//     PTT brojem (35), 143-159 ukupan iznos u feninzima (desno, razmaci),
//     160-164 broj naloga (desno), 165-167 "BAM", 168-176 razmaci,
//     177-211 opis (35, stari program piše skraćeno "PLATE ZA 2026060").
//   UJ (javni prihod, 345 znakova): 1-2 "UJ", 3-11 redni broj (desno), 12-19
//     konstanta "8888 01 " (uočena u svim redovima; 01 je šifra plaćanja),
//     20-124 naziv primaoca (105), 125-140 račun primaoca (16), 141-176 iznos
//     u feninzima (desno, razmaci), 177-184 datum valute GGGGMMDD, 185-289
//     svrha (105), 290-299 poziv na broj (10), 300-312 JIB (13), 313 vrsta
//     uplate, 314-319 vrsta prihoda, 320-322 šifra općine, 323-329 budžetska
//     organizacija, 330-337 period od GGGGMMDD, 338-345 period do GGGGMMDD.
//   UO (prenos/isplata plate, 313 znakova): identičan UJ rasporedu do kraja
//     svrhe + 24 razmaka (mjesto poziva, JIB-a i vrste uplate), BEZ poreskog
//     repa. Konstanta je "8889 07 ". U datoteci prenosi idu PRIJE javnih
//     prihoda (redoslijed iz originala), redni brojevi teku kroz sve naloge.
//
// Encoding: ČISTI ASCII, sve uppercase, kvačice se TRANSLITERIRAJU (Č/Ć→C,
// Š→S, Ž→Z, Đ→DJ). Com_Soft datoteke su praktično čist ASCII (u dva originala
// ukupno JEDAN CP852 bajt, došao iz njihovog registra primalaca); staro
// desktop RBBHnet bankarstvo toleriše CP852 bajtove, ali ih NOVO online
// bankarstvo odbija (uvoz padne bez broja naloga), pa je ASCII jedini format
// koji dokazano prolazi na OBA. Iznosi isključivo cijeli feninzi. Nepodržan
// znak ili pogrešna dužina ID polja baca grešku sa kontekstom.

const RECORD_LEN = 345; // UJ slogovi (javni prihodi)
const UO_LEN = 313; // UO slogovi (prenosi/plate, bez poreskog repa)
const SM_LEN = 211; // SM zaglavlje (opis 177-211, širina 35)
const CRLF = Buffer.from([0x0d, 0x0a]);

// ASCII transliteracija naših slova (uppercase; tekst se prvo diže u velika
// slova). Đ→DJ smije produžiti tekst: polja se poslije enkodiranja režu na
// svoju širinu pa pomaka pozicija nema.
const ASCII_MAPA = {
  "Č": "C",
  "Ć": "C",
  "Ž": "Z",
  "Š": "S",
  "Đ": "DJ",
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
    const zamjena = ASCII_MAPA[znak];
    if (zamjena === undefined) {
      throw new RaiffeisenGreska(
        `Nepodržan znak ${JSON.stringify(znak)} u ${ctx.polje} (${ctx.nalog}): ${JSON.stringify(String(text))}`,
      );
    }
    for (const z of zamjena) bajtovi.push(z.charCodeAt(0));
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
 *   platilac: { racun: string, naziv: string, adresa?: string, mjesto: string, mjestoSaPtt?: string },
 *   datumValute: Date,
 *   opis?: string,        // SM opis; default "PLATE ZA GGGGMM0" iz perioda prvog naloga
 *   nalozi: Array<Object>, // tip "javniPrihod" (UJ) i "prenos" (UO)
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
    if (n.tip !== "javniPrihod" && n.tip !== "prenos") {
      throw new RaiffeisenGreska(
        `Nepoznat tip naloga ${JSON.stringify(n.tip)} (nalog ${i + 1})`,
      );
    }
  }
  // Redoslijed kao u originalima: prenosi (UO) prije javnih prihoda (UJ),
  // unutar grupe zadržan zadani redoslijed. Redni brojevi teku kroz sve.
  const nalozi = [...file.nalozi].sort(
    (a, b) => (a.tip === "prenos" ? 0 : 1) - (b.tip === "prenos" ? 0 : 1),
  );

  const hCtx = { nalog: "SM zaglavlje" };
  let suma = 0;
  for (const n of nalozi) suma += Number(n.iznosFeninga) || 0;

  // Opis identičan starom programu: "PLATE ZA GGGGMM0" (završna nula
  // potvrđena u OBA Com_Soft originala: "PLATE ZA 2026060" za juni i
  // "PLATE ZA 2026070" za juli). Period se čita sa prvog naloga koji ga ima
  // (prenosi ga nemaju, a poslije sortiranja idu prvi).
  const prviOd = (nalozi.find((n) => n.periodOd instanceof Date) || {}).periodOd;
  const defaultOpis =
    prviOd instanceof Date && !Number.isNaN(prviOd.getTime())
      ? `PLATE ZA ${prviOd.getFullYear()}${String(prviOd.getMonth() + 1).padStart(2, "0")}0`
      : "PLATE";

  const sm = noviRed(SM_LEN);
  upisi(sm, 1, enkodiraj("SM", { ...hCtx, polje: "prefiks" }));
  upisi(sm, 3, racun16(file.platilac.racun, { ...hCtx, polje: "račun platioca" }));
  upisi(sm, 38, tekst(file.platilac.naziv, 35, { ...hCtx, polje: "naziv platioca" }));
  upisi(sm, 73, tekst(file.platilac.adresa || "", 35, { ...hCtx, polje: "adresa platioca" }));
  // Mjesto SA poštanskim brojem ("77220 CAZIN") kad ga adapter izvede
  // (mjestoSaPtt); golden test zadaje mjesto direktno pa ostaje netaknut.
  upisi(
    sm,
    108,
    tekst(file.platilac.mjestoSaPtt || file.platilac.mjesto, 35, {
      ...hCtx,
      polje: "mjesto platioca",
    }),
  );
  upisi(sm, 143, iznosDesno(suma, 17, { ...hCtx, polje: "ukupan iznos" }));
  upisi(sm, 160, desno(nalozi.length, 5));
  upisi(sm, 165, enkodiraj("BAM", hCtx));
  upisi(sm, 177, tekst(file.opis || defaultOpis, SM_LEN - 176, { ...hCtx, polje: "opis" }));

  const redovi = [sm];
  nalozi.forEach((nalog, i) => {
    const ctx = { nalog: `nalog ${i + 1}` };
    if (nalog.tip === "prenos") {
      // UO slog: isti raspored kao UJ do kraja svrhe, pa 24 razmaka
      // (bez poziva na broj, JIB-a, vrste uplate ni poreskog repa).
      const red = noviRed(UO_LEN);
      upisi(red, 1, enkodiraj("UO", { ...ctx, polje: "prefiks" }));
      upisi(red, 3, desno(i + 1, 9));
      upisi(red, 12, enkodiraj("8889 07 ", ctx));
      upisi(red, 20, tekst(nalog.naziv, 105, { ...ctx, polje: "naziv primaoca" }));
      upisi(red, 125, racun16(nalog.racun, { ...ctx, polje: "račun primaoca" }));
      upisi(red, 141, iznosDesno(nalog.iznosFeninga, 36, { ...ctx, polje: "iznos" }));
      upisi(red, 177, datumGGGGMMDD(file.datumValute, { ...ctx, polje: "datum valute" }));
      upisi(red, 185, tekst(nalog.svrha, 105, { ...ctx, polje: "svrha" }));
      redovi.push(red);
      return;
    }
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

// Izlaz je čisti ASCII pa dekodiranje za pregled ne treba mapu; prazna mapa
// ostaje radi kompatibilnosti sa admin harness pregledom (cp852 legacy izbor).
const CP852_U_SLOVO = new Map();

module.exports = { formatRaiffeisen, RaiffeisenGreska, RECORD_LEN, CP852_U_SLOVO };
