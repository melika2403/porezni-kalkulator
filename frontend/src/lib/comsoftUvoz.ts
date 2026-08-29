// Parsiranje Com_Soft (KPS) izvoza šifarnika za grupni uvoz: artikli i
// poslovni partneri, u XML ("Izvoz iz KPS") ili CSV obliku. Parsira se u
// browseru (DOMParser + TextDecoder), backend dobija već očišćen JSON.
//
// CSV iz Com_Softa je Windows-1250 sa ";" separatorom; XML je UTF-8.
// XML izvoz iza glavne sekcije sadrži i šifarnike (grupe, općine, banke...)
// koji se ovdje svjesno ignorišu.

export type UvozArtikal = {
  sifra: string;
  naziv: string;
  /** Com_Soft VrstaArtikla: "U" = usluga, ostalo roba */
  tip?: "ROBA" | "USLUGA";
  jm?: string;
  barkod?: string;
  oslobodjenPdv?: boolean;
  aktivan?: boolean;
};

export type UvozPartner = {
  sifra?: string;
  naziv: string;
  jib?: string;
  pdvBroj?: string;
  adresa?: string;
  mjesto?: string;
  telefon?: string;
  email?: string;
  racuni?: string[];
};

// ── pomoćne ──────────────────────────────────────────────────────────────────

async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // XML izvoz je UTF-8 (deklarisano u zaglavlju); CSV je Windows-1250.
  // Detekcija: probaj strogi UTF-8, ako pukne to je Windows-1250.
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1250").decode(bytes);
  }
}

function isXml(text: string): boolean {
  return text.trimStart().startsWith("<");
}

/**
 * CSV red sa standardnim navodnicima ("" = navodnik). Separator je ";" (tako
 * snima Com_Soft i Excel na našim postavkama), ali se prepoznaje i "," jer
 * korisnik popunjava naš šablon u programu sa engleskim postavkama; bez toga
 * bi cijeli red završio u jednoj ćeliji.
 */
function parseCsv(text: string): string[][] {
  const prviRed = text.split(/\r?\n/, 1)[0] ?? "";
  const sep =
    (prviRed.match(/;/g)?.length ?? 0) >= (prviRed.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      inQuotes = true;
    } else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** Nađi indeks kolone po dijelu naziva zaglavlja (bez kvačica, mala slova). */
function normHeaders(header: string[]): string[] {
  return header.map((h) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d"),
  );
}

function headerIndex(header: string[], ...needles: string[]): number {
  const norm = normHeaders(header);
  for (const needle of needles) {
    const i = norm.findIndex((h) => h.includes(needle));
    if (i >= 0) return i;
  }
  return -1;
}

// Excel trik ="..." iz našeg šablona (tekst kolone za šifru i barkod, da
// Excel ne pojede vodeće nule): skini omotač kad se šablon uveze direktno.
function bezExcelFormule(v: string): string {
  const m = /^="(.*)"$/.exec(v.trim());
  return m ? m[1] : v;
}

function csvBool(v: string | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  // Com_Soft: "Potvrđeno"/"Nepotvrđeno" (u 1250 dekodiranju uvijek čitljivo)
  return s.startsWith("potvr") || s === "true" || s === "da";
}

/** "17,00" → 17, "17%" → 17; prazno ili neprepoznato → null (NEPOZNATO). */
function csvNum(v: string | undefined): number | null {
  const s = (v ?? "").trim().replace(/%/g, "");
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function xmlDoc(text: string): Document {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("XML fajl se ne može pročitati (neispravan format).");
  }
  return doc;
}

function tag(el: Element, name: string): string {
  return el.getElementsByTagName(name)[0]?.textContent?.trim() ?? "";
}

// ── artikli ──────────────────────────────────────────────────────────────────

export async function parseArtikliFile(file: File): Promise<UvozArtikal[]> {
  const text = await readText(file);
  return isXml(text) ? parseArtikliXml(text) : parseArtikliCsv(text);
}

function parseArtikliXml(text: string): UvozArtikal[] {
  const doc = xmlDoc(text);
  const nodes = Array.from(doc.getElementsByTagName("Artikl"));
  if (nodes.length === 0) {
    throw new Error("U XML fajlu nema artikala (sekcija <Artikli>).");
  }
  return nodes.map((el) => {
    // SifraPorezneGrupe "017" → stopa 17, "000" → stvarno 0% (oslobođen).
    // PRAZNA/nepostojeća grupa je NEPOZNATO, ne 0: tada NE označavaj oslobođen
    // (isto kao CSV bez kolone "stopa pdv"), da Number("")===0 ne pretvori
    // artikle sa neunesenom grupom u lažno PDV-oslobođene.
    const grupa = tag(el, "SifraPorezneGrupe").replace(/\D/g, "");
    return {
      sifra: tag(el, "Sifra"),
      naziv: tag(el, "Naziv"),
      tip: (tag(el, "VrstaArtikla").toUpperCase() === "U"
        ? "USLUGA"
        : "ROBA") as "ROBA" | "USLUGA",
      jm: tag(el, "JedinicaMjere"),
      barkod: tag(el, "BarCode"),
      oslobodjenPdv: grupa !== "" && Number(grupa) === 0,
      aktivan: tag(el, "Aktivan").toLowerCase() !== "false",
    };
  });
}

function parseArtikliCsv(text: string): UvozArtikal[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV fajl je prazan.");
  const header = rows[0];
  const iSifra = headerIndex(header, "sifra");
  const iNaziv = headerIndex(header, "naziv");
  if (iSifra < 0 || iNaziv < 0) {
    throw new Error(
      'CSV zaglavlje nije prepoznato (očekujem kolone "Šifra" i "Naziv artikla").',
    );
  }
  if (iSifra === iNaziv) {
    // Ista kolona za oba znači da red nije razdvojen (pogrešan separator), pa
    // bi se cijeli red upisao kao šifra i naziv artikla.
    throw new Error(
      "CSV nije ispravno razdvojen na kolone. Snimite fajl kao CSV sa tačka-zarezom (;) ili preuzmite naš šablon.",
    );
  }
  const iJm = headerIndex(header, "j/m", "jedinica");
  const iStopa = headerIndex(header, "stopa pdv");
  const iBarkod = headerIndex(header, "bar kod", "barkod");
  const iAktivan = headerIndex(header, "aktivan");
  const iVrsta = headerIndex(header, "vrsta");
  return rows.slice(1).map((r) => ({
    sifra: bezExcelFormule((r[iSifra] ?? "").trim()),
    naziv: (r[iNaziv] ?? "").trim(),
    tip: (iVrsta >= 0 && (r[iVrsta] ?? "").trim().toUpperCase() === "U"
      ? "USLUGA"
      : "ROBA") as "ROBA" | "USLUGA",
    jm: iJm >= 0 ? (r[iJm] ?? "").trim() : undefined,
    barkod: iBarkod >= 0 ? bezExcelFormule((r[iBarkod] ?? "").trim()) : undefined,
    // PRAZNA stopa je NEPOZNATO, ne 0: prazna ćelija u našem šablonu je
    // normalna, a "oslobodjenPdv: true" bi dala pogrešan PDV na kalkulaciji
    // i u KUF-u. Isti guard postoji i u XML grani iznad.
    oslobodjenPdv: iStopa >= 0 ? csvNum(r[iStopa]) === 0 : false,
    // Prazno "Aktivan" znači aktivan (default), inače bi uvezeni artikli
    // bili nevidljivi u šifarniku i pri unosu kalkulacije.
    aktivan:
      iAktivan >= 0 && (r[iAktivan] ?? "").trim() !== ""
        ? csvBool(r[iAktivan])
        : true,
  }));
}

// ── šablon za ručni uvoz artikala ────────────────────────────────────────────
// CSV koji korisnik preuzme, popuni u Excelu i vrati (za liste koje ne dolaze
// iz Com_Softa). Zaglavlja odgovaraju parseArtikliCsv prepoznavanju; šifra i
// barkod idu kao ="..." da ih Excel drži kao tekst (vodeće nule).
export function sablonArtikalaCsv(): string {
  const esc = (v: string) =>
    /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const zaglavlje = [
    "Šifra*",
    "Naziv artikla*",
    "Vrsta (R = roba, U = usluga)",
    "J/M",
    "Stopa PDV",
    "Bar kod",
    "Aktivan",
  ];
  const primjer = [
    '="0001"',
    "Testni artikal",
    "R",
    "KOM",
    "17",
    '="3859123456789"',
    "da",
  ];
  return (
    "﻿" +
    [zaglavlje, primjer].map((r) => r.map(esc).join(";")).join("\r\n")
  );
}

// ── lager lista (uvoz početnog stanja zaliha) ────────────────────────────────

export type UvozLagerRed = {
  sifra: string;
  kolicina: number;
  mpc: number;
  nabavnaCijena?: number;
};

/** Broj koji podnosi i BA format ("1.234,56") i tehnički ("1234.56"). */
function lagerNum(v: string | undefined): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  let n: number;
  if (s.includes(",")) {
    // zarez = decimalni separator, tačke su hiljade
    n = Number(s.replace(/\./g, "").replace(",", "."));
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // BA cijeli broj sa hiljadnim separatorom bez decimala: "1.500" -> 1500,
    // "1.234.567" -> 1234567 (bez ovoga bi Number("1.500") dao 1.5)
    n = Number(s.replace(/\./g, ""));
  } else {
    // tehnički decimalni ("1234.56") ili prost cijeli broj ("1500")
    n = Number(s);
  }
  return Number.isFinite(n) ? n : null;
}

/** CSV lager liste: obavezne kolone Šifra, Količina i MPC (ili Cijena);
 *  opciono Nabavna cijena. Com_Soft izvoz (Windows-1250, ";") ili vlastiti
 *  fajl sa istim zaglavljem. */
export async function parseLagerFile(file: File): Promise<UvozLagerRed[]> {
  const text = await readText(file);
  if (isXml(text)) {
    throw new Error(
      "Za uvoz lagera pošaljite CSV fajl (XML izvoz lagera još nije podržan).",
    );
  }
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV fajl je prazan.");
  const header = rows[0];
  const iSifra = headerIndex(header, "sifra");
  const iKolicina = headerIndex(header, "kolicina", "stanje", "kol");
  // MPC: prvo eksplicitne (mpc/maloprodajna/prodajna); generička "cijena" NE
  // smije uhvatiti "Nabavna cijena" (inače se nabavna uveze kao maloprodajna)
  let iMpc = headerIndex(header, "mpc", "maloprodajna", "prodajna");
  if (iMpc < 0) {
    const norm = normHeaders(header);
    iMpc = norm.findIndex((h) => h.includes("cijena") && !h.includes("nabavna"));
  }
  if (iSifra < 0 || iKolicina < 0 || iMpc < 0) {
    throw new Error(
      'CSV zaglavlje nije prepoznato (očekujem kolone "Šifra", "Količina" i "MPC").',
    );
  }
  const iNabavna = headerIndex(header, "nabavna");
  return rows.slice(1).map((r) => {
    const nabavna = iNabavna >= 0 ? lagerNum(r[iNabavna]) : null;
    return {
      sifra: (r[iSifra] ?? "").trim(),
      kolicina: lagerNum(r[iKolicina]) ?? NaN,
      mpc: lagerNum(r[iMpc]) ?? NaN,
      nabavnaCijena: nabavna != null && nabavna > 0 ? nabavna : undefined,
    };
  });
}

// ── poslovni partneri ────────────────────────────────────────────────────────

export async function parsePartneriFile(file: File): Promise<UvozPartner[]> {
  const text = await readText(file);
  return isXml(text) ? parsePartneriXml(text) : parsePartneriCsv(text);
}

function parsePartneriXml(text: string): UvozPartner[] {
  const doc = xmlDoc(text);
  const nodes = Array.from(doc.getElementsByTagName("PoslovniPartner"));
  if (nodes.length === 0) {
    throw new Error(
      "U XML fajlu nema partnera (sekcija <PoslovniPartneri>).",
    );
  }
  return nodes.map((el) => {
    const racuni = Array.from(
      el.getElementsByTagName("BankaPoslovnogPartnera"),
    )
      .map((b) => tag(b, "BrojRacuna"))
      .filter(Boolean);
    return {
      sifra: tag(el, "Sifra"),
      naziv: tag(el, "Naziv"),
      jib: tag(el, "IDBroj"),
      pdvBroj: tag(el, "PDVBroj"),
      adresa: tag(el, "Adresa"),
      telefon: tag(el, "Telefon") || tag(el, "Mobitel"),
      email: tag(el, "EMail"),
      racuni,
    };
  });
}

function parsePartneriCsv(text: string): UvozPartner[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV fajl je prazan.");
  const header = rows[0];
  const iNaziv = headerIndex(header, "naziv");
  if (iNaziv < 0) {
    throw new Error('CSV zaglavlje nije prepoznato (očekujem kolonu "Naziv").');
  }
  const iSifra = headerIndex(header, "sifra");
  const iJib = headerIndex(header, "id broj");
  const iPdv = headerIndex(header, "pdv broj");
  const iAdresa = headerIndex(header, "adresa");
  const iMjesto = headerIndex(header, "mjesto");
  const iRacun = headerIndex(header, "racun glavne banke", "racun");
  return rows.slice(1).map((r) => {
    const racun = iRacun >= 0 ? (r[iRacun] ?? "").trim() : "";
    return {
      sifra: iSifra >= 0 ? (r[iSifra] ?? "").trim() : undefined,
      naziv: (r[iNaziv] ?? "").trim(),
      jib: iJib >= 0 ? (r[iJib] ?? "").trim() : undefined,
      pdvBroj: iPdv >= 0 ? (r[iPdv] ?? "").trim() : undefined,
      adresa: iAdresa >= 0 ? (r[iAdresa] ?? "").trim() : undefined,
      mjesto: iMjesto >= 0 ? (r[iMjesto] ?? "").trim() : undefined,
      racuni: racun ? [racun] : [],
    };
  });
}
