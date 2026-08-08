// ELBA "TXT format verzija 2" za izvoz platnih naloga (UPP, domaći platni
// promet). ELBA platformu koriste BBI (eBBI), ASA Banka (ELBA v5) i
// Sparkasse (netBanking), pa jedan formatter pokriva sve tri.
//
// Format (zvanično dokumentovan u BBI uputstvu, Appendix C, i ASA ELBA v5
// uputstvu, poglavlje 7.1.2.1):
//   - tekst datoteka, kodna strana Windows-1250
//   - slogovi (nalozi) odvojeni CR znakom (0x0D)
//   - polja unutar naloga odvojena TAB znakom (0x09), BEZ navodnika
//   - prva linija je kontrolna: broj naloga TAB kontrolna suma (zbir iznosa)
//   - iznosi sa decimalnom TAČKOM (numeric(15,2)), datumi yyyy-mm-dd
//   - polja ne smiju sadržavati CR ni TAB
//
// Polja UPP naloga, redom: RBR_NALOGA, NAZIV_POSILJAOCA, RACUN_PRIMAOCA,
// NAZIV_PRIMAOCA, IZNOS, OPIS_PLACANJA, HITNOST (T/F), pa SAMO za javne
// prihode: JP_TAX_NO, JP_VRSTA_UPLATE, JP_VRSTA_PRIHODA, JP_PERIOD_OD,
// JP_PERIOD_DO, JP_OPCINA, JP_BUDZ_ORG, JP_POZIV_NA_BROJ.
//
// Ulaz je ISTI TkdisFile/TkdisNalog ugovor kao za TKDIS formatter (isti
// adapter iz obračuna); datum valute se ovdje NE upisuje: ELBA uvezene
// naloge datira u aplikaciji pri potpisivanju. Iznosi su cijeli feninzi.
// Napomena: nema javnog fixture-a iz banke; strukturu potvrditi izvozom par
// naloga iz eBBI/ELBA (isti format) i probnim uvozom, kao i za Halcom.

const CR = Buffer.from([0x0d]);
const TAB = 0x09;

// Windows-1250 za naša slova, velika i mala (ELBA ne traži uppercase, tekst
// ide u izvornom obliku iz obračuna).
const CP1250_MAPA = {
  "Č": 0xc8, "Ć": 0xc6, "Ž": 0x8e, "Š": 0x8a, "Đ": 0xd0,
  "č": 0xe8, "ć": 0xe6, "ž": 0x9e, "š": 0x9a, "đ": 0xf0,
};

class ElbaGreska extends Error {}

function enkodiraj(text, ctx) {
  const bajtovi = [];
  for (const znak of String(text)) {
    const kod = znak.codePointAt(0);
    if (kod === TAB || kod === 0x0d || kod === 0x0a) {
      throw new ElbaGreska(
        `${ctx.polje} (${ctx.nalog}) ne smije sadržavati TAB ni novi red: ${JSON.stringify(String(text))}`,
      );
    }
    if (kod >= 0x20 && kod <= 0x7e) {
      bajtovi.push(kod);
      continue;
    }
    const zamjena = CP1250_MAPA[znak];
    if (zamjena === undefined) {
      throw new ElbaGreska(
        `Nepodržan znak ${JSON.stringify(znak)} u ${ctx.polje} (${ctx.nalog}): ${JSON.stringify(String(text))}`,
      );
    }
    bajtovi.push(zamjena);
  }
  return bajtovi;
}

// Tekstualno polje: encoding pa tvrdo skraćivanje na varchar(N) limit.
function polje(value, maxLen, ctx) {
  return enkodiraj(String(value ?? ""), ctx).slice(0, maxLen);
}

function racun16(value, ctx) {
  const cifre = String(value ?? "").replace(/\D/g, "");
  if (cifre.length !== 16) {
    throw new ElbaGreska(
      `${ctx.polje} (${ctx.nalog}) mora imati tačno 16 cifara, dobio ${cifre.length}: ${JSON.stringify(String(value ?? ""))}`,
    );
  }
  return cifre;
}

function fiksneCifre(value, len, ctx) {
  const s = String(value ?? "");
  if (!new RegExp(`^\\d{${len}}$`).test(s)) {
    throw new ElbaGreska(
      `${ctx.polje} (${ctx.nalog}) mora imati tačno ${len} cifara, dobio: ${JSON.stringify(s)}`,
    );
  }
  return s;
}

// Iznos: cijeli feninzi → "1234.56" (decimalna tačka, kako spec traži).
function iznosKmString(feninzi, ctx) {
  if (!Number.isInteger(feninzi) || feninzi <= 0) {
    throw new ElbaGreska(
      `${ctx.polje} (${ctx.nalog}) mora biti cijeli broj feninga veći od 0, dobio: ${feninzi}`,
    );
  }
  return `${Math.floor(feninzi / 100)}.${String(feninzi % 100).padStart(2, "0")}`;
}

function datumIso(d, ctx) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new ElbaGreska(`${ctx.polje} (${ctx.nalog}) nije ispravan datum`);
  }
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * @param {{
 *   platilac: { racun: string, naziv: string, mjesto: string },
 *   datumValute: Date,   // ne upisuje se u ELBA datoteku
 *   nalozi: Array<Object>,
 * }} file  isti ugovor kao formatTkdis
 * @returns {Buffer}
 */
function formatElba(file) {
  if (!file || !file.platilac || !Array.isArray(file.nalozi)) {
    throw new ElbaGreska("Neispravan ulaz: očekujem { platilac, datumValute, nalozi }");
  }
  if (file.nalozi.length === 0) {
    throw new ElbaGreska("Datoteka bez ijednog naloga nema smisla");
  }

  const redovi = [];
  let sumaFeninga = 0;

  file.nalozi.forEach((nalog, i) => {
    const ctx = { nalog: `nalog ${i + 1}` };
    const jp = nalog.tip === "javniPrihod";
    if (!jp && nalog.tip !== "prenos") {
      throw new ElbaGreska(`Nepoznat tip naloga (${ctx.nalog}): ${JSON.stringify(nalog.tip)}`);
    }
    sumaFeninga += Number(nalog.iznosFeninga) || 0;

    const polja = [
      enkodiraj(String(i + 1), { ...ctx, polje: "redni broj" }),
      polje(file.platilac.naziv, 150, { ...ctx, polje: "naziv pošiljaoca" }),
      enkodiraj(racun16(nalog.racun, { ...ctx, polje: "račun primaoca" }), ctx),
      polje(nalog.naziv, 160, { ...ctx, polje: "naziv primaoca" }),
      enkodiraj(iznosKmString(nalog.iznosFeninga, { ...ctx, polje: "iznos" }), ctx),
      polje(nalog.svrha, 250, { ...ctx, polje: "opis plaćanja" }),
      enkodiraj("F", ctx), // hitnost: F = nije hitno
    ];
    if (jp) {
      polja.push(
        enkodiraj(fiksneCifre(nalog.jib, 13, { ...ctx, polje: "JIB" }), ctx),
        enkodiraj("0", ctx), // vrsta uplate: 0 redovna
        enkodiraj(fiksneCifre(nalog.vrstaPrihoda, 6, { ...ctx, polje: "vrsta prihoda" }), ctx),
        enkodiraj(datumIso(nalog.periodOd, { ...ctx, polje: "porezni period od" }), ctx),
        enkodiraj(datumIso(nalog.periodDo, { ...ctx, polje: "porezni period do" }), ctx),
        enkodiraj(fiksneCifre(nalog.opcina, 3, { ...ctx, polje: "šifra općine" }), ctx),
        enkodiraj(fiksneCifre(nalog.budzetskaOrganizacija, 7, { ...ctx, polje: "budžetska organizacija" }), ctx),
        enkodiraj(fiksneCifre(nalog.pozivNaBroj, 10, { ...ctx, polje: "poziv na broj" }), ctx),
      );
    }

    const red = [];
    polja.forEach((p, idx) => {
      if (idx > 0) red.push(TAB);
      red.push(...p);
    });
    redovi.push(Buffer.from(red));
  });

  // Kontrolna linija: broj naloga TAB suma iznosa (decimalna tačka).
  const kontrolna = Buffer.from(
    [
      ...enkodiraj(String(file.nalozi.length), { nalog: "kontrolna linija", polje: "broj naloga" }),
      TAB,
      ...enkodiraj(iznosKmString(sumaFeninga, { nalog: "kontrolna linija", polje: "kontrolna suma" }), {}),
    ],
  );

  const dijelovi = [kontrolna, CR];
  for (const red of redovi) dijelovi.push(red, CR);
  return Buffer.concat(dijelovi);
}

// Mapa za dekodiranje cp1250 bajtova nazad u slova (pregled u admin harnessu),
// uključuje i mala slova kojih u TKDIS (uppercase) mapi nema.
const CP1250_U_SLOVO = new Map(
  Object.entries(CP1250_MAPA).map(([slovo, bajt]) => [bajt, slovo]),
);

module.exports = { formatElba, ElbaGreska, CP1250_U_SLOVO };
