// ──────────────────────────────────────────────────────────────────────────────
//  REKAPITULACIJA ISPLATA — jedna tabela za mjesec (zahtjev klijenta):
//  RB / Prezime i ime / Neto plata / Topli obrok / Prevoz / (Regres) /
//  Obustave / ZA ISPLATU, plus završni red UKUPNO. Kolona Regres se prikazuje
//  samo kad bar jedan radnik ima regres (odluka vlasnika, 30.08.2026).
//  Header i stil usklađeni sa "Specifikacije po radniku" PDF-om.
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import { trackEvent } from "src/api/activity";
import fontkit from "@pdf-lib/fontkit";

export type RekapRadnik = {
  workerName: string;
  net: number;
  mealAllowance: number;
  travelExpense: number;
  vacationBonus: number;
  obustave: number;
};

export interface RekapitulacijaData {
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
  perWorker: RekapRadnik[];
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
const TABLE_W = PAGE_W - 2 * MARGIN;

type Kolona = {
  label: string;
  w: number;
  align: "left" | "right";
  get: (r: RekapRadnik) => number | null;
};

// Širine bez kolone imena; ime dobija ostatak (sa Regresom je uže).
function kolone(imaRegres: boolean): Kolona[] {
  const fiksne: Kolona[] = [
    { label: "R.b.", w: 26, align: "right", get: () => null },
    { label: "Prezime i ime", w: 0, align: "left", get: () => null },
    { label: "Neto plata", w: 68, align: "right", get: (r) => r.net },
    { label: "Topli obrok", w: 64, align: "right", get: (r) => r.mealAllowance },
    { label: "Prevoz", w: 58, align: "right", get: (r) => r.travelExpense },
    ...(imaRegres
      ? [{ label: "Regres", w: 58, align: "right" as const, get: (r: RekapRadnik) => r.vacationBonus }]
      : []),
    { label: "Obustave", w: 62, align: "right", get: (r) => r.obustave },
    {
      label: "ZA ISPLATU",
      w: 76,
      align: "right",
      // Nikad negativno: kad obustave pređu iznos za isplatu, banci se
      // stvarno prenosi 0 (vidi obracunAdapter), pa i izvještaj mora
      // pokazati 0, inače se dva dokumenta za isti mjesec ne slažu.
      get: (r) =>
        Math.max(
          0,
          +(
            r.net +
            r.mealAllowance +
            r.travelExpense +
            r.vacationBonus -
            r.obustave
          ).toFixed(2),
        ),
    },
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
    // Skrati predugačak tekst (ime) da ne pregazi susjednu kolonu.
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
  data: RekapitulacijaData,
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
    page.drawText(data.organization.city, { x: MARGIN, y: y - 11, size: 11, font: bold });
    y -= 15;
  }
  if (data.organization.address) {
    page.drawText(data.organization.address, { x: MARGIN, y: y - 10, size: 10, font: reg });
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
  const title = "REKAPITULACIJA ISPLATA";
  const titleW = bold.widthOfTextAtSize(title, 14);
  page.drawText(title, { x: (PAGE_W - titleW) / 2, y: y - 12, size: 14, font: bold });
  y -= 20;

  const mm = String(data.month).padStart(2, "0");
  const sub = `- ${MONTH_NAMES[data.month - 1]} (${mm}) ${data.year}.godine -`;
  const subW = reg.widthOfTextAtSize(sub, 11);
  page.drawText(sub, { x: (PAGE_W - subW) / 2, y: y - 12, size: 11, font: reg });
  y -= 26;

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

export async function fillRekapitulacija(
  data: RekapitulacijaData,
): Promise<Uint8Array> {
  trackEvent("REKAPITULACIJA_GENERATE", "Rekapitulacija isplata", data.organizationId);

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

  const radnici = [...data.perWorker].sort((a, b) =>
    a.workerName.localeCompare(b.workerName, "bs"),
  );
  const imaRegres = radnici.some((r) => r.vacationBonus > 0);
  const cols = kolone(imaRegres);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = drawHeader(page, data, bold, reg);

  if (radnici.length === 0) {
    page.drawText("Nema isplata za prikaz u odabranom mjesecu.", {
      x: MARGIN,
      y: y - 14,
      size: 11,
      font: reg,
    });
    return await doc.save();
  }

  y = drawTableHeader(page, y, cols, bold);

  const rowH = 16;
  let redbr = 1;
  for (const r of radnici) {
    if (y < MARGIN + 44) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      page.drawText("Rekapitulacija isplata (nastavak)", {
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

  // Završni red UKUPNO po svim kolonama iznosa.
  if (y < MARGIN + 40) {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }
  const h = 22;
  page.drawRectangle({
    x: MARGIN,
    y: y - h,
    width: TABLE_W,
    height: h,
    color: rgb(0.85, 0.85, 0.85),
  });
  let x = MARGIN;
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    let tekst = "";
    if (i === 1) tekst = "UKUPNO:";
    else if (i > 1) {
      const suma = radnici.reduce((s, r) => s + (c.get(r) ?? 0), 0);
      tekst = fmt2(+suma.toFixed(2));
    }
    drawCellText(page, tekst, x + 3, y - 14, bold, 9, {
      align: i === 1 ? "left" : c.align,
      maxWidth: c.w - 6,
    });
    x += c.w;
  }
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.8,
  });
  page.drawLine({
    start: { x: MARGIN, y: y - h },
    end: { x: PAGE_W - MARGIN, y: y - h },
    thickness: 0.8,
  });

  return await doc.save();
}
