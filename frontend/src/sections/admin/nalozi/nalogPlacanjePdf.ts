// ──────────────────────────────────────────────────────────────────────────────
//  Nalog za plaćanje (matrični štampač, pred-štampani Grafis obrazac tip 1).
//  Render za štampu na EPSON LX-350 preko Windows drivera, kontinuirana
//  traktorska traka. Štampaju se SAMO varijabilna polja (obrazac je pred-štampan).
//
//  Pozicioniranje: jedini izvor istine je mreža (linija, kolona) iz starog
//  programa. mm se računa iz mreže + globalni kalibracioni offset:
//     X_mm = X_offset + (kolona - 1) × 2.1167   (12 cpi)
//     Y_mm = Y_offset + (linija - 1) × 4.2333   (6 lpi, od vrha)
//
//  Stranica = 195 × 101 mm (jedan nalog). Font: Courier @10pt = tačno 12 cpi
//  (advance 6pt = 2.1167 mm/znak), pa boxana polja (JIB, računi) padaju u kućice.
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const MM_TO_PT = 72 / 25.4; // 2.83465
export const PAGE_W_MM = 195;
export const PAGE_H_MM = 101;
const COL_MM = 2.1167; // 12 cpi
const LINE_MM = 4.2333; // 6 lpi
const FONT_SIZE = 10; // Courier @10pt → advance 6pt = jedna kolona (12 cpi)
// Baseline unutar linije (da tekst sjedne u liniju, ne iznad njene gornje ivice).
// Konstantan je za sve linije, pa ga globalni Y_offset apsorbuje pri kalibraciji.
const BASELINE_MM = 3.1;

export type NalogField = { key: string; line: number; col: number };

// Mapa polja, obrazac tip 1. Kolone VEĆ uključuju "horizontalni pomak" (+4) iz
// starog programa — ne dodavati ga ponovo.
export const FIELD_MAP_TIP1: NalogField[] = [
  { key: "uplatio1", line: 1, col: 21 },
  { key: "uplatio2", line: 2, col: 4 },
  { key: "uplatio3", line: 3, col: 4 },
  { key: "racunPosiljaoca", line: 3, col: 48 },
  { key: "svrha1", line: 4, col: 12 },
  { key: "svrha2", line: 5, col: 4 },
  { key: "racunPrimaoca", line: 5, col: 48 },
  { key: "svrha3", line: 6, col: 4 },
  { key: "primalac1", line: 7, col: 14 },
  { key: "iznos", line: 7, col: 48 },
  { key: "hitno", line: 7, col: 70 },
  { key: "primalac2", line: 8, col: 4 },
  { key: "primalac3", line: 9, col: 4 },
  { key: "brojObveznika", line: 10, col: 47 },
  { key: "vrstaUplate", line: 10, col: 77 },
  { key: "mjestoUplate", line: 11, col: 8 },
  { key: "datumUplate", line: 11, col: 26 },
  { key: "periodOd", line: 11, col: 70 },
  { key: "vrstaPrihoda", line: 12, col: 47 },
  { key: "periodDo", line: 13, col: 70 },
  { key: "opcina", line: 16, col: 47 },
  { key: "budzetskaOrg", line: 16, col: 63 },
  { key: "pozivNaBroj", line: 18, col: 47 },
];

export type NalogValues = Record<string, string>;

export interface NalogRenderOptions {
  xOffsetMm?: number; // globalni kalibracioni pomak (default 8)
  yOffsetMm?: number; // globalni kalibracioni pomak (default 6)
  count?: number; // broj naloga (stranica) u PDF-u, za test više odjednom
}

// Generiše PDF: jedna stranica = jedan nalog. Sve stranice su iste (za test
// poravnanja na više naloga odjednom na traktorskoj traci).
export async function buildNaloziPdf(
  values: NalogValues,
  opts: NalogRenderOptions = {},
): Promise<Uint8Array> {
  const xOff = Number.isFinite(opts.xOffsetMm) ? (opts.xOffsetMm as number) : 8;
  const yOff = Number.isFinite(opts.yOffsetMm) ? (opts.yOffsetMm as number) : 6;
  const count = Math.max(1, Math.min(Math.round(opts.count ?? 1), 50));

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const pageW = PAGE_W_MM * MM_TO_PT;
  const pageH = PAGE_H_MM * MM_TO_PT;
  const ink = rgb(0, 0, 0);

  for (let i = 0; i < count; i++) {
    const page = doc.addPage([pageW, pageH]);
    for (const f of FIELD_MAP_TIP1) {
      const text = values[f.key];
      if (!text) continue;
      const xMm = xOff + (f.col - 1) * COL_MM;
      const yMm = yOff + (f.line - 1) * LINE_MM + BASELINE_MM;
      page.drawText(text, {
        x: xMm * MM_TO_PT,
        y: pageH - yMm * MM_TO_PT,
        size: FONT_SIZE,
        font,
        color: ink,
      });
    }
  }

  return doc.save();
}

// Test vrijednosti (X-evi i 9-ke, kao F3 test iz starog programa) po formatima iz
// dokumenta. Digit-polja su 9-ke tačne dužine; tekst-polja su X-evi ograničene
// dužine da ne pregaze susjedno polje na istoj liniji.
export function testNalogValues(): NalogValues {
  return {
    uplatio1: "XXXXXXXXXXXXXXXXXXXX",
    uplatio2: "XXXXXXXXXXXXXXXXXXXXXXXXX",
    uplatio3: "XXXXXXXXXXXXXXXXXXXXXXXXX",
    racunPosiljaoca: "9999999999999999",
    svrha1: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    svrha2: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    racunPrimaoca: "9999999999999999",
    svrha3: "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    primalac1: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    iznos: "999.999.999.999,00",
    hitno: "X",
    primalac2: "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    primalac3: "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    brojObveznika: "9999999999999", // JIB 13 cifara
    vrstaUplate: "9",
    mjestoUplate: "XXXXXXXXXXXXXX",
    datumUplate: "99.99.9999",
    periodOd: "999999", // DDMMGG
    vrstaPrihoda: "999999",
    periodDo: "999999",
    opcina: "999",
    budzetskaOrg: "9999999",
    pozivNaBroj: "9999999999",
  };
}
