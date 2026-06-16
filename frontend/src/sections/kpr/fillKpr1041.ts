// Popunjavanje službenog KPR-1041 obrasca (Knjiga prihoda i rashoda).
// Template: /templates/KPR-1041.pdf — 2 stranice landscape A4 (842x595),
// bez AcroForm polja. Sve koordinate su izmjerene iz vektorske mreže
// linija obrasca (backend/scripts pdfjs ekstrakcija), u PDF prostoru
// (y od dna stranice). Stranica 1 prima 13 redova, stranica nastavka 16
// (plus Donos red) i kopira se po potrebi.
import { PDFDocument, PDFFont, PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { KprData, KprRow, KprCols } from "src/api/bankStatements";

const ROWS_PAGE_1 = 13;
const ROWS_PAGE_N = 16;

// baseline y pozicije redova (PDF prostor, od dna), izmjerene iz linija ćelija
const P1_ROW_Y = [291, 275, 258, 242, 226, 209, 193, 177, 160, 144, 128, 111, 94];
const P1_TOTAL_Y = 78;
const PN_DONOS_Y = 411;
const PN_ROW_Y = [395, 379, 362, 346, 329, 313, 297, 280, 264, 248, 231, 215, 199, 182, 166, 148];
const PN_TOTAL_Y = 130;

// kućice za JMB i JIB (po jedna cifra), izmjerene: y=436, visina 13.8, širina 16.1
const JMB_BOX_X = [42.5, 58.6, 74.6, 90.7, 106.8, 122.9, 139, 155.1, 171.1, 187.2, 203.3, 219.4, 235.5];
const JIB_BOX_X = [427.5, 443.6, 459.7, 475.8, 491.8, 507.9, 524, 540.1, 556.2, 572.2, 588.3, 604.4, 620.5];
const BOX_W = 16.1;
const BOX_DIGIT_Y = 440;

// stranica/od kućice gore desno (x 774.4..808.7): broj centriran u kućici.
// Kućica "od" vrijednosti je na stranici nastavka 5pt više nego na prvoj.
const PAGE_BOX_CENTER_X = 791.5;
const PAGE_NUM_Y = 537; // vrijednost ispod "stranica" labele (obje stranice)
const P1_PAGE_TOTAL_Y = 504; // vrijednost ispod "od", prva stranica
const PN_PAGE_TOTAL_Y = 509; // vrijednost ispod "od", stranica nastavka

// centri kolona, izračunati iz vertikalnih linija tabele
// [36, 59.6, 98.8, 153.1, 251.1, 296.2, 341.3, 386.2, 431.2, 485.1,
//  539.1, 593.1, 656.9, 695, 742.7, 808.6]
const COL_CENTER = {
  rbr: 47.8,
  datum: 79.2,
  brojDok: 126,
  opis: 202.1,
};
const NUM_COLS: Array<{ key: keyof KprCols; center: number }> = [
  { key: "k11", center: 273.7 },
  { key: "k12", center: 318.8 },
  { key: "k13", center: 363.8 },
  { key: "k14", center: 408.7 },
  { key: "k15", center: 458.2 },
  { key: "k16", center: 512.1 },
  { key: "k17", center: 566.1 },
  { key: "k18", center: 625 },
  { key: "k19", center: 676 },
  { key: "k20", center: 718.9 },
  { key: "k21", center: 775.7 },
];

/** 1234.56 → "1.234,56" (bez KM sufiksa, za ćelije obrasca) */
function fmt(n: number): string {
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}.`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

type Ctx = { font: PDFFont; size: number };

function drawLeft(page: PDFPage, ctx: Ctx, text: string, x: number, y: number) {
  if (!text) return;
  page.drawText(text, { x, y, size: ctx.size, font: ctx.font });
}

function drawCentered(page: PDFPage, ctx: Ctx, text: string, centerX: number, y: number) {
  if (!text) return;
  const w = ctx.font.widthOfTextAtSize(text, ctx.size);
  page.drawText(text, { x: centerX - w / 2, y, size: ctx.size, font: ctx.font });
}

/** Upiši cifre u kućice obrasca, po jedna cifra centrirana u svaku. */
function drawBoxedDigits(
  page: PDFPage,
  ctx: Ctx,
  value: string,
  boxesX: number[],
  y: number,
) {
  const digits = value.replace(/\D/g, "").slice(0, boxesX.length);
  for (let i = 0; i < digits.length; i++) {
    const w = ctx.font.widthOfTextAtSize(digits[i], ctx.size);
    page.drawText(digits[i], {
      x: boxesX[i] + BOX_W / 2 - w / 2,
      y,
      size: ctx.size,
      font: ctx.font,
    });
  }
}

function drawNumberRow(
  page: PDFPage,
  ctx: Ctx,
  cols: KprCols,
  y: number,
  { showZeros = false }: { showZeros?: boolean } = {},
) {
  for (const { key, center } of NUM_COLS) {
    const v = cols[key];
    if (!showZeros && (!v || Math.abs(v) < 0.005)) continue;
    drawCentered(page, ctx, fmt(v), center, y);
  }
}

function addCols(acc: KprCols, row: KprCols) {
  for (const { key } of NUM_COLS) acc[key] = Math.round((acc[key] + row[key]) * 100) / 100;
}

function emptyCols(): KprCols {
  return { k11: 0, k12: 0, k13: 0, k14: 0, k15: 0, k16: 0, k17: 0, k18: 0, k19: 0, k20: 0, k21: 0 };
}

export async function fillKpr1041(
  data: KprData,
  // za testiranje van browsera: bajtovi se mogu ubrizgati umjesto fetch-a
  assets?: { templateBytes: ArrayBuffer; fontBytes: ArrayBuffer },
): Promise<Uint8Array> {
  const [templateBytes, fontBytes] = assets
    ? [assets.templateBytes, assets.fontBytes]
    : await Promise.all([
        fetch("/templates/KPR-1041.pdf").then((r) => r.arrayBuffer()),
        fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
      ]);

  const template = await PDFDocument.load(templateBytes);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);

  const rows = data.rows;
  const pageCount =
    rows.length <= ROWS_PAGE_1
      ? 1
      : 1 + Math.ceil((rows.length - ROWS_PAGE_1) / ROWS_PAGE_N);

  // sastavi dokument: stranica 1 + N kopija stranice nastavka
  const [p1] = await doc.copyPages(template, [0]);
  doc.addPage(p1);
  for (let i = 1; i < pageCount; i++) {
    const [pn] = await doc.copyPages(template, [1]);
    doc.addPage(pn);
  }

  const cell: Ctx = { font, size: 7 };
  const head: Ctx = { font, size: 9 };

  // zaglavlje prve stranice
  const page1 = doc.getPage(0);
  drawLeft(page1, { font, size: 11 }, `${fmtDate(data.from)} - ${fmtDate(data.to)}`, 575, 516);
  // lijeva strana: vlasnik (JMB u kućice, ime, adresa)
  drawBoxedDigits(page1, { font, size: 10 }, data.obveznik.vlasnikJmb, JMB_BOX_X, BOX_DIGIT_Y);
  drawLeft(page1, head, truncate(data.obveznik.vlasnikIme, 50), 115, 419);
  drawLeft(page1, head, truncate(data.obveznik.vlasnikAdresa, 52), 85, 398);
  // desna strana: djelatnost (JIB u kućice, naziv, adresa)
  drawBoxedDigits(page1, { font, size: 10 }, data.obveznik.jib, JIB_BOX_X, BOX_DIGIT_Y);
  drawLeft(page1, head, truncate(data.obveznik.naziv, 42), 470, 419);
  drawLeft(page1, head, truncate(data.obveznik.adresa, 42), 480, 398);

  const running = emptyCols();
  let rowIdx = 0;

  for (let p = 0; p < pageCount; p++) {
    const page = doc.getPage(p);
    const rowYs = p === 0 ? P1_ROW_Y : PN_ROW_Y;
    const totalY = p === 0 ? P1_TOTAL_Y : PN_TOTAL_Y;

    // stranica X od Y: brojevi centrirani u svojim kućicama
    drawCentered(page, { font, size: 10 }, String(p + 1), PAGE_BOX_CENTER_X, PAGE_NUM_Y);
    drawCentered(
      page,
      { font, size: 10 },
      String(pageCount),
      PAGE_BOX_CENTER_X,
      p === 0 ? P1_PAGE_TOTAL_Y : PN_PAGE_TOTAL_Y,
    );

    // donos sa prethodne stranice
    if (p > 0) {
      drawNumberRow(page, cell, running, PN_DONOS_Y, { showZeros: true });
    }

    for (let i = 0; i < rowYs.length && rowIdx < rows.length; i++, rowIdx++) {
      const row: KprRow = rows[rowIdx];
      const y = rowYs[i];
      drawCentered(page, cell, String(row.rbr), COL_CENTER.rbr, y);
      drawCentered(page, cell, fmtDate(row.datum), COL_CENTER.datum, y);
      drawCentered(page, cell, truncate(row.brojDokumenta, 13), COL_CENTER.brojDok, y);
      drawCentered(page, cell, truncate(row.opis, 25), COL_CENTER.opis, y);
      drawNumberRow(page, cell, row, y);
      addCols(running, row);
    }

    // "Ukupno za sve stranice - prenos" (kumulativ; na zadnjoj = ukupno)
    drawNumberRow(page, cell, running, totalY, { showZeros: true });
  }

  return doc.save();
}

/** Pokreni download popunjenog obrasca u browseru. */
export async function downloadKpr1041(data: KprData) {
  const bytes = await fillKpr1041(data);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `KPR-1041-${data.from}_${data.to}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
