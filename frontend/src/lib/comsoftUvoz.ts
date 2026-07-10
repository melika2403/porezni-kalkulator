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

/** CSV red sa ";" separatorom i standardnim navodnicima ("" = navodnik). */
function parseCsv(text: string): string[][] {
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
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ";") {
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
function headerIndex(header: string[], ...needles: string[]): number {
  const norm = header.map((h) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d"),
  );
  for (const needle of needles) {
    const i = norm.findIndex((h) => h.includes(needle));
    if (i >= 0) return i;
  }
  return -1;
}

function csvBool(v: string | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  // Com_Soft: "Potvrđeno"/"Nepotvrđeno" (u 1250 dekodiranju uvijek čitljivo)
  return s.startsWith("potvr") || s === "true" || s === "da";
}

/** "17,00" → 17 */
function csvNum(v: string | undefined): number {
  const n = Number((v ?? "").trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
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
  const iJm = headerIndex(header, "j/m", "jedinica");
  const iStopa = headerIndex(header, "stopa pdv");
  const iBarkod = headerIndex(header, "bar kod", "barkod");
  const iAktivan = headerIndex(header, "aktivan");
  const iVrsta = headerIndex(header, "vrsta");
  return rows.slice(1).map((r) => ({
    sifra: (r[iSifra] ?? "").trim(),
    naziv: (r[iNaziv] ?? "").trim(),
    tip: (iVrsta >= 0 && (r[iVrsta] ?? "").trim().toUpperCase() === "U"
      ? "USLUGA"
      : "ROBA") as "ROBA" | "USLUGA",
    jm: iJm >= 0 ? (r[iJm] ?? "").trim() : undefined,
    barkod: iBarkod >= 0 ? (r[iBarkod] ?? "").trim() : undefined,
    oslobodjenPdv: iStopa >= 0 ? csvNum(r[iStopa]) === 0 : false,
    aktivan: iAktivan >= 0 ? csvBool(r[iAktivan]) : true,
  }));
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
