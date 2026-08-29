// ──────────────────────────────────────────────────────────────────────────────
//  SPISKOVI PRIMANJA ZA BANKE (prelazni račun): tri profila po banci, svaki
//  replicira STVARNU tabelu te banke (fajlovi klijenta, pročitani 30.08.2026,
//  vidi docs/plan-obustave-rekapitulacija-banke.md):
//    - UniCredit: JIB / ime i prezime / račun / iznos / svrha / vrsta uplate,
//      ODVOJENI redovi po vrsti isplate ("Plaća za 07/2026", ...)
//    - Raiffeisen: JIB / IME / PREZIME / račun (16 cifara) / iznos / svrha
//      ("NETO PLATA 03/26."), odvojeni redovi + red "TOTAL :"
//    - Intesa: naziv firme, svrha "UPLATA plate, toplog obroka i prevoza
//      MM/GG", kolone PREZIME I IME / PRAZNO / IZNOS / JMBG / RAČUN, jedan
//      ZBIRNI red po radniku + red "UKUPNO:"
//  Iznos "plate" je uvijek ZA ISPLATU (neto - obustave); obrok/prevoz/regres
//  puni. Modul je bez importa da ga backend testovi učitaju type-strippingom.
// ──────────────────────────────────────────────────────────────────────────────

export type SpisakRadnik = {
  /** Ime i prezime kako je uneseno ("Amar Amarović"). */
  ime: string;
  /** Odvojeno za Raiffeisen kolone IME / PREZIME. */
  imeSamo: string;
  prezime: string;
  /** Tekući račun radnika (bilo koji format, cifre se izvlače). */
  racun: string;
  /** JMBG (za Intesa profil); prazan string kad nije unesen. */
  jmbg: string;
  /** Neto plata VEĆ umanjena za obustave (za isplatu). */
  netoZaIsplatu: number;
  obrok: number;
  prevoz: number;
  regres: number;
};

export type SpisakUlaz = {
  /** JIB firme (samo cifre). */
  jib: string;
  nazivFirme: string;
  year: number;
  month: number;
  radnici: SpisakRadnik[];
};

// Ćelija: string, broj, ili null (prazna). Bold zaglavlja se određuju po redu.
export type SpisakCelija = string | number | null;
export type SpisakTabela = {
  /** Redovi radnog lista, 1-bazirano po redoslijedu. */
  redovi: SpisakCelija[][];
  /** Indeksi redova (0-bazirano) koji se stilizuju bold (zaglavlja, total). */
  boldRedovi: number[];
  /** Širine kolona (Excel jedinice), po koloni A, B, C... */
  sirineKolona: number[];
};

// Profili banaka: prve 3 cifre računa = šifra banke (isti izvor kao
// bankNameFromAccount na backendu).
export const SPISAK_PROFILI = [
  // datoteka = ime banke u nazivu fajla ("4201509550000 07-26 Unicredit.xlsx",
  // obrazac iz stvarnog fajla klijenta: JIB, mjesec-godina, banka).
  { kljuc: "unicredit", prefix: "338", naziv: "UniCredit banka", datoteka: "Unicredit" },
  { kljuc: "raiffeisen", prefix: "161", naziv: "Raiffeisen banka", datoteka: "Raiffeisen" },
  { kljuc: "intesa", prefix: "154", naziv: "Intesa Sanpaolo banka", datoteka: "Intesa" },
] as const;
export type SpisakProfil = (typeof SPISAK_PROFILI)[number]["kljuc"];

const zaokruzi2 = (n: number) => Math.round(n * 100) / 100;
export const racunCifre = (racun: string) =>
  String(racun || "").replace(/\D/g, "");

// Odvojeni redovi po vrsti isplate (UniCredit i Raiffeisen): [svrhaKljuc, iznos].
function vrsteIsplata(r: SpisakRadnik): Array<["plata" | "obrok" | "prevoz" | "regres", number]> {
  const out: Array<["plata" | "obrok" | "prevoz" | "regres", number]> = [];
  if (r.netoZaIsplatu > 0) out.push(["plata", zaokruzi2(r.netoZaIsplatu)]);
  if (r.obrok > 0) out.push(["obrok", zaokruzi2(r.obrok)]);
  if (r.prevoz > 0) out.push(["prevoz", zaokruzi2(r.prevoz)]);
  if (r.regres > 0) out.push(["regres", zaokruzi2(r.regres)]);
  return out;
}

// ── UniCredit ────────────────────────────────────────────────────────────────
// Svrhe doznake tačno kao u stvarnom spisku klijenta ("Plaća za 07/2026",
// "Prijevoz za 07/2026", "Topli obrok za 07/2026"); regres analogno.
export function tabelaUniCredit(ulaz: SpisakUlaz): SpisakTabela {
  const mmgggg = `${String(ulaz.month).padStart(2, "0")}/${ulaz.year}`;
  const svrhe = {
    plata: `Plaća za ${mmgggg}`,
    obrok: `Topli obrok za ${mmgggg}`,
    prevoz: `Prijevoz za ${mmgggg}`,
    regres: `Regres za ${mmgggg}`,
  };
  const redovi: SpisakCelija[][] = [
    [
      "JIB pravne osobe isplatitelja plaća",
      "Ime i prezime zaposlenika:",
      "Broj računa zaposlenika:",
      "Iznos u KM:",
      "Svrha doznake:",
      "Vrsta uplate:",
    ],
  ];
  for (const r of ulaz.radnici) {
    for (const [vrsta, iznos] of vrsteIsplata(r)) {
      redovi.push([ulaz.jib, r.ime, racunCifre(r.racun), iznos, svrhe[vrsta], "Redovno"]);
    }
  }
  return {
    redovi,
    boldRedovi: [0],
    // Širine kolona iz stvarnog fajla klijenta.
    sirineKolona: [31.4, 34.1, 23.1, 16.1, 28.6, 34.4],
  };
}

// ── Raiffeisen ───────────────────────────────────────────────────────────────
// Svrhe kao u stvarnoj tabeli ("NETO PLATA 03/26.", "TOPLI OBROK 03/26.");
// imena velikim slovima, račun 16 cifara bez crtica, na dnu red "TOTAL :".
export function tabelaRaiffeisen(ulaz: SpisakUlaz): SpisakTabela {
  const mmgg = `${String(ulaz.month).padStart(2, "0")}/${String(ulaz.year % 100).padStart(2, "0")}.`;
  const svrhe = {
    plata: `NETO PLATA ${mmgg}`,
    obrok: `TOPLI OBROK ${mmgg}`,
    prevoz: `PREVOZ ${mmgg}`,
    regres: `REGRES ${mmgg}`,
  };
  const redovi: SpisakCelija[][] = [
    [
      "JIB PRAVNOG LICA / NALOGODAVCA",
      "IME UPOSLENIKA",
      "PREZIME UPOSLENIKA",
      "RAČUN UPOSLENIKA",
      "IZNOS UPLATE",
      "SVRHA UPLATE",
    ],
  ];
  let total = 0;
  for (const r of ulaz.radnici) {
    for (const [vrsta, iznos] of vrsteIsplata(r)) {
      redovi.push([
        ulaz.jib,
        r.imeSamo.toLocaleUpperCase("bs"),
        r.prezime.toLocaleUpperCase("bs"),
        racunCifre(r.racun),
        iznos,
        svrhe[vrsta],
      ]);
      total += iznos;
    }
  }
  redovi.push([null, null, null, "TOTAL :", zaokruzi2(total), null]);
  return {
    redovi,
    boldRedovi: [0, redovi.length - 1],
    sirineKolona: [21.7, 14.9, 20.9, 21, 14.3, 46],
  };
}

// ── Intesa ───────────────────────────────────────────────────────────────────
// Raspored iz stvarnog fajla (stari .xls, parsiran na nivou ćelija): red 2
// naziv firme, red 4 svrha, red 6 zaglavlja PREZIME I IME / PRAZNO / IZNOS /
// JMBG / RAČUN, jedan ZBIRNI iznos po radniku, na dnu "UKUPNO:".
export function tabelaIntesa(ulaz: SpisakUlaz): SpisakTabela {
  const mmgg = `${String(ulaz.month).padStart(2, "0")}/${String(ulaz.year % 100).padStart(2, "0")}`;
  // Svrha nabraja samo vrste koje u mjesecu stvarno postoje.
  const imaObrok = ulaz.radnici.some((r) => r.obrok > 0);
  const imaPrevoz = ulaz.radnici.some((r) => r.prevoz > 0);
  const imaRegres = ulaz.radnici.some((r) => r.regres > 0);
  const dijelovi = ["plate"];
  if (imaObrok) dijelovi.push("toplog obroka");
  if (imaPrevoz) dijelovi.push("prevoza");
  if (imaRegres) dijelovi.push("regresa");
  const svrha =
    dijelovi.length > 1
      ? `UPLATA ${dijelovi.slice(0, -1).join(", ")} i ${dijelovi[dijelovi.length - 1]} ${mmgg}`
      : `UPLATA plate ${mmgg}`;

  const redovi: SpisakCelija[][] = [
    [null],
    [ulaz.nazivFirme],
    [null],
    [svrha],
    [null],
    ["PREZIME I IME:", "PRAZNO", "IZNOS:", "JMBG:", "RAČUN"],
  ];
  let ukupno = 0;
  for (const r of ulaz.radnici) {
    const zbir = zaokruzi2(r.netoZaIsplatu + r.obrok + r.prevoz + r.regres);
    if (!(zbir > 0)) continue;
    redovi.push([r.ime.toLocaleUpperCase("bs"), null, zbir, r.jmbg || null, racunCifre(r.racun)]);
    ukupno += zbir;
  }
  redovi.push([null, "UKUPNO:", zaokruzi2(ukupno), null, null]);
  return {
    redovi,
    boldRedovi: [1, 3, 5, redovi.length - 1],
    sirineKolona: [30, 10, 14, 16, 20],
  };
}

export function tabelaZaProfil(profil: SpisakProfil, ulaz: SpisakUlaz): SpisakTabela {
  if (profil === "unicredit") return tabelaUniCredit(ulaz);
  if (profil === "raiffeisen") return tabelaRaiffeisen(ulaz);
  return tabelaIntesa(ulaz);
}

// ── XLSX (SpreadsheetML) dijelovi ────────────────────────────────────────────
// Minimalan validan .xlsx: inline stringovi (bez sharedStrings), 2 stila
// (regular/bold), širine kolona. Zipovanje radi pozivalac (pizzip).

const xmlEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Kolonsko slovo: 0 → A, 1 → B ... (dovoljno do Z za naše profile).
const slovoKolone = (i: number) => String.fromCharCode(65 + i);

export function sheetXml(tabela: SpisakTabela): string {
  const bold = new Set(tabela.boldRedovi);
  const cols = tabela.sirineKolona
    .map(
      (w, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`,
    )
    .join("");
  const rows = tabela.redovi
    .map((red, ri) => {
      const s = bold.has(ri) ? ' s="1"' : "";
      const cells = red
        .map((cel, ci) => {
          if (cel == null) return "";
          const ref = `${slovoKolone(ci)}${ri + 1}`;
          if (typeof cel === "number") {
            // Iznosi kao pravi brojevi sa formatom #,##0.00 (prikaz 1.030,48),
            // isto kao u stvarnoj Raiffeisen tabeli.
            const stil = bold.has(ri) ? ' s="3"' : ' s="2"';
            return `<c r="${ref}"${stil}><v>${cel}</v></c>`;
          }
          return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cel)}</t></is></c>`;
        })
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<cols>${cols}</cols>` +
    `<sheetData>${rows}</sheetData>` +
    "</worksheet>"
  );
}

/** Svi dijelovi zip arhive: putanja → XML sadržaj. */
export function xlsxDijelovi(tabela: SpisakTabela): Record<string, string> {
  return {
    "[Content_Types].xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      "</Types>",
    "_rels/.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      "</Relationships>",
    "xl/workbook.xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Spisak" sheetId="1" r:id="rId1"/></sheets>' +
      "</workbook>",
    "xl/_rels/workbook.xml.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      "</Relationships>",
    "xl/styles.xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      // numFmt 164 = #,##0.00 (Excel ga po regionalnim postavkama prikaže
      // kao "1.030,48", kako je i u stvarnoj tabeli banke).
      '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
      '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
      '<borders count="1"><border/></borders>' +
      '<cellStyleXfs count="1"><xf/></cellStyleXfs>' +
      // 0 = obično, 1 = bold, 2 = iznos, 3 = bold iznos (TOTAL/UKUPNO red).
      '<cellXfs count="4">' +
      '<xf xfId="0"/>' +
      '<xf xfId="0" fontId="1" applyFont="1"/>' +
      '<xf xfId="0" numFmtId="164" applyNumberFormat="1"/>' +
      '<xf xfId="0" fontId="1" numFmtId="164" applyFont="1" applyNumberFormat="1"/>' +
      "</cellXfs>" +
      "</styleSheet>",
    "xl/worksheets/sheet1.xml": sheetXml(tabela),
  };
}
