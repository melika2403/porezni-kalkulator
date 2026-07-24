// ──────────────────────────────────────────────────────────────────────────────
//  SPECIFIKACIJE PO RADNIKU — popis ko prima koliko i na koji žiro račun.
//  Sadrži 4 sekcije (samo one koje imaju iznose):
//    1. Neto plate
//    2. Topli obrok
//    3. Putni trošak
//    4. Regres
//  Format usklađen sa "Lista naloga" PDF-om (isti header, fontovi, kolone).
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import { trackEvent } from "src/api/activity";
import fontkit from "@pdf-lib/fontkit";

export type WorkerPayItem = {
  workerName: string;
  bankAccount: string | null;
  net: number;
  mealAllowance: number;
  vacationBonus: number;
  travelExpense: number;
};

export interface SpecifikacijeData {
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
  perWorker: WorkerPayItem[];
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

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 28;

// Kolone — total 539pt.
const COLS = {
  redbr: 35,
  ime: 230,
  acc: 175,
  iznos: 99,
};

function drawCellText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  options: { align?: "left" | "right" | "center"; maxWidth?: number } = {},
) {
  const { align = "left", maxWidth } = options;
  let drawX = x;
  if (align === "right" && maxWidth) {
    const w = font.widthOfTextAtSize(text, size);
    drawX = x + maxWidth - w;
  } else if (align === "center" && maxWidth) {
    const w = font.widthOfTextAtSize(text, size);
    drawX = x + (maxWidth - w) / 2;
  }
  page.drawText(text, { x: drawX, y, size, font, color: rgb(0, 0, 0) });
}

function drawHeader(
  page: PDFPage,
  data: SpecifikacijeData,
  bold: PDFFont,
  reg: PDFFont,
): number {
  let y = PAGE_H - MARGIN;

  page.drawText(data.organization.name || "", {
    x: MARGIN,
    y: y - 12,
    size: 13,
    font: bold,
  });
  y -= 18;

  if (data.organization.city) {
    page.drawText(data.organization.city, {
      x: MARGIN,
      y: y - 11,
      size: 11,
      font: bold,
    });
    y -= 15;
  }
  if (data.organization.address) {
    page.drawText(data.organization.address, {
      x: MARGIN,
      y: y - 10,
      size: 10,
      font: reg,
    });
    y -= 14;
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
  if (data.organization.pdvNumber) {
    page.drawText(`PDV broj: ${data.organization.pdvNumber}`, {
      x: rightX,
      y: rightY,
      size: 10,
      font: reg,
    });
    rightY -= 14;
  }
  if (data.organization.activityCode) {
    page.drawText(`Šifra djelatnosti: ${data.organization.activityCode}`, {
      x: rightX,
      y: rightY,
      size: 10,
      font: reg,
    });
    rightY -= 14;
  }

  y = Math.min(y, rightY) - 18;
  const title = "SPECIFIKACIJE PO RADNIKU";
  const titleW = bold.widthOfTextAtSize(title, 14);
  page.drawText(title, {
    x: (PAGE_W - titleW) / 2,
    y: y - 12,
    size: 14,
    font: bold,
  });
  y -= 20;

  const mm = String(data.month).padStart(2, "0");
  const sub = `- ${MONTH_NAMES[data.month - 1]} (${mm}) ${data.year}.godine -`;
  const subW = reg.widthOfTextAtSize(sub, 11);
  page.drawText(sub, {
    x: (PAGE_W - subW) / 2,
    y: y - 12,
    size: 11,
    font: reg,
  });
  y -= 26;

  return y;
}

function drawTableHeader(page: PDFPage, yTop: number, bold: PDFFont): number {
  const cols = [
    { label: "R.b.", w: COLS.redbr, align: "right" as const },
    { label: "Ime i prezime", w: COLS.ime, align: "left" as const },
    { label: "Žiro račun", w: COLS.acc, align: "left" as const },
    { label: "Iznos (KM)", w: COLS.iznos, align: "right" as const },
  ];
  page.drawRectangle({
    x: MARGIN,
    y: yTop - 16,
    width: PAGE_W - 2 * MARGIN,
    height: 16,
    color: rgb(0.93, 0.93, 0.93),
  });
  let x = MARGIN;
  for (const c of cols) {
    drawCellText(page, c.label, x + 4, yTop - 11, bold, 9, {
      align: c.align,
      maxWidth: c.w - 8,
    });
    x += c.w;
  }
  page.drawLine({
    start: { x: MARGIN, y: yTop },
    end: { x: PAGE_W - MARGIN, y: yTop },
    thickness: 0.6,
  });
  page.drawLine({
    start: { x: MARGIN, y: yTop - 16 },
    end: { x: PAGE_W - MARGIN, y: yTop - 16 },
    thickness: 0.6,
  });
  return yTop - 16;
}

function drawSectionHeader(
  page: PDFPage,
  yTop: number,
  text: string,
  bold: PDFFont,
): number {
  page.drawRectangle({
    x: MARGIN,
    y: yTop - 18,
    width: PAGE_W - 2 * MARGIN,
    height: 18,
    color: rgb(0.85, 0.85, 0.85),
  });
  page.drawText(text, {
    x: MARGIN + 6,
    y: yTop - 13,
    size: 10.5,
    font: bold,
  });
  page.drawLine({
    start: { x: MARGIN, y: yTop },
    end: { x: PAGE_W - MARGIN, y: yTop },
    thickness: 0.4,
  });
  page.drawLine({
    start: { x: MARGIN, y: yTop - 18 },
    end: { x: PAGE_W - MARGIN, y: yTop - 18 },
    thickness: 0.4,
  });
  return yTop - 18;
}

function drawWorkerRow(
  page: PDFPage,
  yTop: number,
  redbr: number,
  name: string,
  account: string,
  iznos: number,
  reg: PDFFont,
  bold: PDFFont,
): number {
  const rowH = 16;
  let x = MARGIN;
  drawCellText(page, `${redbr}.`, x + 4, yTop - 11, reg, 9, {
    align: "right",
    maxWidth: COLS.redbr - 8,
  });
  x += COLS.redbr;
  drawCellText(page, name, x + 4, yTop - 11, reg, 9, {
    maxWidth: COLS.ime - 8,
  });
  x += COLS.ime;
  drawCellText(page, account || "–", x + 4, yTop - 11, reg, 9, {
    maxWidth: COLS.acc - 8,
  });
  x += COLS.acc;
  drawCellText(page, fmt2(iznos), x + 4, yTop - 11, bold, 9.5, {
    align: "right",
    maxWidth: COLS.iznos - 8,
  });
  page.drawLine({
    start: { x: MARGIN, y: yTop - rowH },
    end: { x: PAGE_W - MARGIN, y: yTop - rowH },
    thickness: 0.3,
    color: rgb(0.7, 0.7, 0.7),
  });
  return yTop - rowH;
}

function drawSubtotal(
  page: PDFPage,
  yTop: number,
  total: number,
  label: string,
  bold: PDFFont,
): number {
  const h = 20;
  page.drawRectangle({
    x: MARGIN,
    y: yTop - h,
    width: PAGE_W - 2 * MARGIN,
    height: h,
    color: rgb(0.93, 0.93, 0.93),
  });
  drawCellText(page, label, MARGIN + 6, yTop - 13, bold, 10);
  const x = MARGIN + COLS.redbr + COLS.ime + COLS.acc;
  drawCellText(page, fmt2(total), x + 4, yTop - 13, bold, 10.5, {
    align: "right",
    maxWidth: COLS.iznos - 8,
  });
  page.drawLine({
    start: { x: MARGIN, y: yTop },
    end: { x: PAGE_W - MARGIN, y: yTop },
    thickness: 0.6,
  });
  page.drawLine({
    start: { x: MARGIN, y: yTop - h },
    end: { x: PAGE_W - MARGIN, y: yTop - h },
    thickness: 0.6,
  });
  return yTop - h;
}

type SectionDef = {
  title: string;
  getAmount: (w: WorkerPayItem) => number;
};

const SECTIONS: SectionDef[] = [
  { title: "NETO PLATE", getAmount: (w) => w.net },
  { title: "TOPLI OBROK", getAmount: (w) => w.mealAllowance },
  { title: "PUTNI TROŠAK", getAmount: (w) => w.travelExpense },
  { title: "REGRES", getAmount: (w) => w.vacationBonus },
];

export async function fillSpecifikacije(
  data: SpecifikacijeData,
): Promise<Uint8Array> {
  // statistika generisanja (admin Aktivnost); best-effort, ne blokira
  trackEvent("SPECIFIKACIJE_GENERATE", "Specifikacije plata");

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

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = drawHeader(page, data, bold, reg);

  // Sort radnika abecedno po prezime + ime (stabilan red unutar sekcija).
  const sortedWorkers = [...data.perWorker].sort((a, b) =>
    a.workerName.localeCompare(b.workerName, "bs"),
  );

  let anyDrawn = false;
  let grandTotal = 0;
  for (const sec of SECTIONS) {
    const rows = sortedWorkers
      .map((w) => ({ w, amt: sec.getAmount(w) }))
      .filter((x) => x.amt > 0);
    if (rows.length === 0) continue;

    // Section header + tabela: treba prostor za section header (18) + table
    // header (16) + barem 1 red (16) + subtotal (20) ≈ 70pt. Threshold malo
    // veći da izbjegnemo orphan header na kraju stranice.
    if (y < MARGIN + 90) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    y = drawSectionHeader(page, y, sec.title, bold);
    y = drawTableHeader(page, y, bold);

    let sum = 0;
    let redbr = 1;
    for (const { w, amt } of rows) {
      // Treba prostor za 1 red (16) — nakon toga ide ili sljedeći red ili subtotal.
      if (y < MARGIN + 40) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
        // "[Sekcija] — nastavak" indikator na novoj stranici
        page.drawText(`${sec.title} (nastavak)`, {
          x: MARGIN,
          y: y - 12,
          size: 9,
          font: bold,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 18;
        y = drawTableHeader(page, y, bold);
      }
      y = drawWorkerRow(
        page,
        y,
        redbr,
        w.workerName,
        w.bankAccount || "",
        amt,
        reg,
        bold,
      );
      sum += amt;
      redbr += 1;
    }
    if (y < MARGIN + 30) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    y = drawSubtotal(page, y, sum, `Zbir, ${sec.title}:`, bold);
    y -= 12;
    grandTotal += sum;
    anyDrawn = true;
  }

  if (!anyDrawn) {
    page.drawText("Nema isplata za prikaz u odabranom mjesecu.", {
      x: MARGIN,
      y: y - 14,
      size: 11,
      font: reg,
    });
  } else {
    // Ukupan zbir svega
    if (y < MARGIN + 40) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    drawGrandTotal(page, y, grandTotal, bold);
  }

  return await doc.save();
}

function drawGrandTotal(
  page: PDFPage,
  yTop: number,
  total: number,
  bold: PDFFont,
): number {
  const h = 24;
  page.drawRectangle({
    x: MARGIN,
    y: yTop - h,
    width: PAGE_W - 2 * MARGIN,
    height: h,
    color: rgb(0.82, 0.82, 0.82),
  });
  drawCellText(page, "U K U P N O   S V E:", MARGIN + 6, yTop - 15, bold, 11);
  const x = MARGIN + COLS.redbr + COLS.ime + COLS.acc;
  drawCellText(page, fmt2(total), x + 4, yTop - 15, bold, 11.5, {
    align: "right",
    maxWidth: COLS.iznos - 8,
  });
  page.drawLine({
    start: { x: MARGIN, y: yTop },
    end: { x: PAGE_W - MARGIN, y: yTop },
    thickness: 0.8,
  });
  page.drawLine({
    start: { x: MARGIN, y: yTop - h },
    end: { x: PAGE_W - MARGIN, y: yTop - h },
    thickness: 0.8,
  });
  return yTop - h;
}
