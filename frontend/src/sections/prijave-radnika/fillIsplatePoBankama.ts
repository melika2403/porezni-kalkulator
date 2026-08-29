// ──────────────────────────────────────────────────────────────────────────────
//  ISPLATE PO BANKAMA — pregled primanja radnika grupisan po banci (naziv iz
//  prve 3 cifre žiro računa). Za svaku banku tabela kao rekapitulacija +
//  kolona žiro račun; radnik bez računa ide u grupu "Bez upisanog računa" na
//  dnu (nikad tiho ispušten). Landscape zbog broja kolona.
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import { trackEvent } from "src/api/activity";
import fontkit from "@pdf-lib/fontkit";

export type IsplataBankaRadnik = {
  workerName: string;
  bankAccount: string | null;
  net: number;
  mealAllowance: number;
  travelExpense: number;
  vacationBonus: number;
  obustave: number;
};

export interface IsplatePoBankamaData {
  organizationId?: number | null;
  organization: {
    name: string;
    taxNumber: string | null;
    pdvNumber: string | null;
    address: string | null;
    city: string | null;
    bankAccount: string | null;
    activityCode?: string | null;
  };
  year: number;
  month: number;
  perWorker: IsplataBankaRadnik[];
  /** prefix (prve 3 cifre računa) → naziv banke */
  bankName: (account: string) => string;
}

const fmt2 = (n: number): string =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const MONTH_NAMES = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "juni",
  "juli",
  "august",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
];

// Landscape A4.
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 30;
const TABLE_W = PAGE_W - 2 * MARGIN;

type Kolona = {
  label: string;
  w: number;
  align: "left" | "right";
  get: (r: IsplataBankaRadnik) => number | null;
};

// Nikad negativno: kad obustave pređu iznos za isplatu, banci se prenosi 0
// (vidi obracunAdapter), pa izvještaj mora pokazati isto.
const zaIsplatu = (r: IsplataBankaRadnik) =>
  Math.max(
    0,
    +(r.net + r.mealAllowance + r.travelExpense + r.vacationBonus - r.obustave).toFixed(2),
  );

function kolone(imaRegres: boolean): Kolona[] {
  const fiksne: Kolona[] = [
    { label: "R.b.", w: 26, align: "right", get: () => null },
    { label: "Prezime i ime", w: 0, align: "left", get: () => null },
    { label: "Žiro račun", w: 150, align: "left", get: () => null },
    { label: "Neto plata", w: 78, align: "right", get: (r) => r.net },
    { label: "Topli obrok", w: 72, align: "right", get: (r) => r.mealAllowance },
    { label: "Prevoz", w: 66, align: "right", get: (r) => r.travelExpense },
    ...(imaRegres
      ? [{ label: "Regres", w: 66, align: "right" as const, get: (r: IsplataBankaRadnik) => r.vacationBonus }]
      : []),
    { label: "Obustave", w: 70, align: "right", get: (r) => r.obustave },
    { label: "ZA ISPLATU", w: 84, align: "right", get: zaIsplatu },
  ];
  const zauzeto = fiksne.reduce((s, c) => s + c.w, 0);
  fiksne[1].w = TABLE_W - zauzeto;
  return fiksne;
}

function drawCellText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  options: { align?: "left" | "right"; maxWidth?: number } = {},
) {
  const { align = "left", maxWidth } = options;
  let drawX = x;
  let drawText = text;
  if (maxWidth) {
    while (
      drawText.length > 1 &&
      font.widthOfTextAtSize(drawText, size) > maxWidth
    ) {
      drawText = drawText.slice(0, -1);
    }
  }
  if (align === "right" && maxWidth) {
    const w = font.widthOfTextAtSize(drawText, size);
    drawX = x + maxWidth - w;
  }
  page.drawText(drawText, { x: drawX, y, size, font, color: rgb(0, 0, 0) });
}

function drawHeader(
  page: PDFPage,
  data: IsplatePoBankamaData,
  bold: PDFFont,
  reg: PDFFont,
): number {
  let y = PAGE_H - MARGIN;

  page.drawText(data.organization.name || "", { x: MARGIN, y: y - 12, size: 13, font: bold });
  y -= 18;
  if (data.organization.city) {
    page.drawText(data.organization.city, { x: MARGIN, y: y - 11, size: 11, font: bold });
    y -= 15;
  }
  if (data.organization.bankAccount) {
    page.drawText(`Žiro račun: ${data.organization.bankAccount}`, {
      x: MARGIN,
      y: y - 10,
      size: 10,
      font: reg,
    });
    y -= 14;
  }
  let rightY = PAGE_H - MARGIN - 12;
  const rightX = PAGE_W - MARGIN - 220;
  if (data.organization.taxNumber) {
    page.drawText(`Identifikacijski broj: ${data.organization.taxNumber}`, {
      x: rightX,
      y: rightY,
      size: 10,
      font: reg,
    });
    rightY -= 14;
  }

  y = Math.min(y, rightY) - 16;
  const title = "ISPLATE PO BANKAMA";
  const titleW = bold.widthOfTextAtSize(title, 14);
  page.drawText(title, { x: (PAGE_W - titleW) / 2, y: y - 12, size: 14, font: bold });
  y -= 20;
  const mm = String(data.month).padStart(2, "0");
  const sub = `- ${MONTH_NAMES[data.month - 1]} (${mm}) ${data.year}.godine -`;
  const subW = reg.widthOfTextAtSize(sub, 11);
  page.drawText(sub, { x: (PAGE_W - subW) / 2, y: y - 12, size: 11, font: reg });
  y -= 24;
  return y;
}

function drawTableHeader(
  page: PDFPage,
  yTop: number,
  cols: Kolona[],
  bold: PDFFont,
): number {
  page.drawRectangle({
    x: MARGIN,
    y: yTop - 16,
    width: TABLE_W,
    height: 16,
    color: rgb(0.93, 0.93, 0.93),
  });
  let x = MARGIN;
  for (const c of cols) {
    drawCellText(page, c.label, x + 3, yTop - 11, bold, 8.5, {
      align: c.align,
      maxWidth: c.w - 6,
    });
    x += c.w;
  }
  page.drawLine({ start: { x: MARGIN, y: yTop }, end: { x: PAGE_W - MARGIN, y: yTop }, thickness: 0.6 });
  page.drawLine({ start: { x: MARGIN, y: yTop - 16 }, end: { x: PAGE_W - MARGIN, y: yTop - 16 }, thickness: 0.6 });
  return yTop - 16;
}

function drawTotalRed(
  page: PDFPage,
  yTop: number,
  cols: Kolona[],
  radnici: IsplataBankaRadnik[],
  label: string,
  bold: PDFFont,
  jaka: boolean,
): number {
  const h = jaka ? 22 : 20;
  page.drawRectangle({
    x: MARGIN,
    y: yTop - h,
    width: TABLE_W,
    height: h,
    color: jaka ? rgb(0.82, 0.82, 0.82) : rgb(0.93, 0.93, 0.93),
  });
  let x = MARGIN;
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    let tekst = "";
    if (i === 1) tekst = label;
    else if (i > 2) {
      const suma = radnici.reduce((s, r) => s + (c.get(r) ?? 0), 0);
      tekst = fmt2(+suma.toFixed(2));
    }
    drawCellText(page, tekst, x + 3, yTop - (jaka ? 14 : 13), bold, jaka ? 9.5 : 9, {
      align: i === 1 ? "left" : c.align,
      maxWidth: c.w - 6,
    });
    x += c.w;
  }
  page.drawLine({ start: { x: MARGIN, y: yTop }, end: { x: PAGE_W - MARGIN, y: yTop }, thickness: 0.6 });
  page.drawLine({ start: { x: MARGIN, y: yTop - h }, end: { x: PAGE_W - MARGIN, y: yTop - h }, thickness: 0.6 });
  return yTop - h;
}

export async function fillIsplatePoBankama(
  data: IsplatePoBankamaData,
): Promise<Uint8Array> {
  trackEvent("ISPLATE_PO_BANKAMA_GENERATE", "Isplate po bankama", data.organizationId);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  let reg: PDFFont;
  let bold: PDFFont;
  try {
    const [regBytes, boldBytes] = await Promise.all([
      fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
      fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
    ]);
    reg = await doc.embedFont(regBytes);
    bold = await doc.embedFont(boldBytes);
  } catch {
    reg = await doc.embedFont(StandardFonts.Helvetica);
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  // Grupisanje po banci (prefix računa); bez računa = posebna grupa na dnu.
  const grupe = new Map<string, { naziv: string; radnici: IsplataBankaRadnik[] }>();
  const bezRacuna: IsplataBankaRadnik[] = [];
  for (const r of data.perWorker) {
    const cifre = (r.bankAccount || "").replace(/\D/g, "");
    if (cifre.length < 3) {
      bezRacuna.push(r);
      continue;
    }
    const prefix = cifre.slice(0, 3);
    if (!grupe.has(prefix)) {
      grupe.set(prefix, { naziv: data.bankName(cifre), radnici: [] });
    }
    grupe.get(prefix)!.radnici.push(r);
  }
  const sortiraneGrupe = [...grupe.values()].sort((a, b) =>
    a.naziv.localeCompare(b.naziv, "bs"),
  );
  if (bezRacuna.length > 0) {
    sortiraneGrupe.push({ naziv: "Bez upisanog računa", radnici: bezRacuna });
  }

  const imaRegres = data.perWorker.some((r) => r.vacationBonus > 0);
  const cols = kolone(imaRegres);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = drawHeader(page, data, bold, reg);

  if (sortiraneGrupe.length === 0) {
    page.drawText("Nema isplata za prikaz u odabranom mjesecu.", {
      x: MARGIN,
      y: y - 14,
      size: 11,
      font: reg,
    });
    return await doc.save();
  }

  const rowH = 16;
  for (const grupa of sortiraneGrupe) {
    const radnici = [...grupa.radnici].sort((a, b) =>
      a.workerName.localeCompare(b.workerName, "bs"),
    );
    // Naslov grupe + zaglavlje + bar 1 red + subtotal.
    if (y < MARGIN + 96) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    page.drawRectangle({
      x: MARGIN,
      y: y - 18,
      width: TABLE_W,
      height: 18,
      color: rgb(0.85, 0.85, 0.85),
    });
    page.drawText(
      `${grupa.naziv.toUpperCase()} · ${radnici.length} ${radnici.length === 1 ? "radnik" : "radnika"}`,
      { x: MARGIN + 6, y: y - 13, size: 10.5, font: bold },
    );
    y -= 18;
    y = drawTableHeader(page, y, cols, bold);

    let redbr = 1;
    for (const r of radnici) {
      if (y < MARGIN + 44) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
        page.drawText(`${grupa.naziv} (nastavak)`, {
          x: MARGIN,
          y: y - 12,
          size: 9,
          font: bold,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 18;
        y = drawTableHeader(page, y, cols, bold);
      }
      let x = MARGIN;
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        const isZbir = i === cols.length - 1;
        let tekst = "";
        if (i === 0) tekst = `${redbr}.`;
        else if (i === 1) tekst = r.workerName;
        else if (i === 2) tekst = r.bankAccount || "–";
        else {
          const v = c.get(r);
          tekst = v != null ? fmt2(v) : "";
        }
        drawCellText(page, tekst, x + 3, y - 11, isZbir ? bold : reg, isZbir ? 9 : 8.5, {
          align: c.align,
          maxWidth: c.w - 6,
        });
        x += c.w;
      }
      page.drawLine({
        start: { x: MARGIN, y: y - rowH },
        end: { x: PAGE_W - MARGIN, y: y - rowH },
        thickness: 0.3,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= rowH;
      redbr += 1;
    }

    if (y < MARGIN + 30) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    y = drawTotalRed(page, y, cols, radnici, `Zbir, ${grupa.naziv}:`, bold, false);
    y -= 12;
  }

  if (y < MARGIN + 34) {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }
  drawTotalRed(page, y, cols, data.perWorker, "U K U P N O   S V E:", bold, true);

  return await doc.save();
}
