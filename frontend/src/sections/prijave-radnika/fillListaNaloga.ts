// ──────────────────────────────────────────────────────────────────────────────
//  LISTA NALOGA ZA PLACANJE — mjesečni rekapitulacija naloga za banku.
//  Sadrži:
//    1. Doprinose i poreze za radnike (po vrstama, zbirno po opcini)
//    2. (Obrt) Doprinose za vlasnika (zaseban set)
//    3. Prenos plate i topli obrok/regres/putni, grupisano po banci radnika
//  Format inspirisan klasičnim "LISTA NALOGA" iz starih programa za plate.
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import { trackEvent } from "src/api/activity";
import fontkit from "@pdf-lib/fontkit";

export type UplatnicaItem = {
  type: string;
  label: string;
  amount: number;
  account: string;
  vrstaPrihoda: string;
  budgetOrg?: string;
  primalac?: string[];
  opcinaIme?: string;
  opcinaKod?: string;
  group?: "vlasnik" | "radnici" | null;
};

export type WorkerPay = {
  workerName: string;
  bankAccount: string | null;
  net: number;
  mealAllowance: number;
  vacationBonus: number;
  travelExpense: number;
};

export interface ListaNalogaData {
  /** za dnevnik aktivnosti (admin vidi za koju org-u je dokument) */
  organizationId?: number | null;
  organization: {
    name: string;
    taxNumber: string | null; // JIB
    pdvNumber: string | null;
    address: string | null;
    city: string | null;
    bankAccount: string | null;
    activityCode?: string | null;
  };
  year: number;
  month: number;
  opcinaFirmeKod: string; // 3-cifrena šifra općine firme
  uplatnice: UplatnicaItem[];
  perWorker: WorkerPay[];
}

const fmt2 = (n: number): string =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Redoslijed doprinosa u listi (po želji korisnika).
const VRSTA_ORDER: Record<string, number> = {
  UPLATNICA_PIO: 1,
  UPLATNICA_ZDR: 2,
  UPLATNICA_ZDR_FED: 3,
  UPLATNICA_NEZAP_KANT: 4,
  UPLATNICA_NEZAP: 5,
  UPLATNICA_POREZ: 6,
  UPLATNICA_INVALIDI: 7,
  UPLATNICA_NESRECE: 8,
  UPLATNICA_VODNA: 9,
};

// Naziv svrhe (Svrha uplate kolona) po type-u.
const VRSTA_SVRHA: Record<string, string[]> = {
  UPLATNICA_PIO: ["DOPRINOS ZA PIO"],
  UPLATNICA_ZDR: ["DOPRINOS ZA ZDRAV. 89,8%"],
  UPLATNICA_ZDR_FED: ["DOPRINOS ZA ZDRAV. 10,2%"],
  UPLATNICA_NEZAP_KANT: ["DOPRINOS ZA OSIGURANJE", "OD NEZAPOSLENOSTI 70%"],
  UPLATNICA_NEZAP: ["DOPRINOS ZA OSIGURANJE", "OD NEZAPOSLENOSTI 30%"],
  UPLATNICA_POREZ: ["POREZ NA DOHODAK"],
  UPLATNICA_INVALIDI: ["FOND ZA REHABILITACIJU", "I ZAPOŠLJAVANJE OSI"],
  UPLATNICA_NESRECE: ["NAKNADA ZA ZAŠTITU OD", "PRIRODNIH NESREĆA"],
  UPLATNICA_VODNA: ["OPĆA VODNA NAKNADA"],
};

// Wrap text na max širinu (vraća array linija).
function wrapText(
  text: string,
  width: number,
  font: PDFFont,
  size: number,
): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    const wWidth = font.widthOfTextAtSize(candidate, size);
    if (wWidth > width && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

type NalogRow = {
  sifra: string;
  svrha: string[];
  primalac: string[];
  accountUplatilac: string;
  accountPrimalac: string;
  prihod: string; // vrsta prihoda code (može biti prazan za plate)
  opcina: string;
  iznos: number;
};

function buildDoprinosRows(
  uplatnice: UplatnicaItem[],
  group: "radnici" | "vlasnik" | null,
  uplatilacAcc: string,
  startSifra: number,
): { rows: NalogRow[]; nextSifra: number } {
  // Filtriraj po grupi (null = sve), zatim sortiraj po VRSTA_ORDER.
  const filtered = uplatnice
    .filter((u) => {
      if (group === null) return !u.group || u.group === "radnici";
      return u.group === group;
    })
    .filter((u) => u.amount > 0)
    .sort((a, b) => (VRSTA_ORDER[a.type] || 99) - (VRSTA_ORDER[b.type] || 99));

  const rows: NalogRow[] = [];
  let sifra = startSifra;
  for (const u of filtered) {
    rows.push({
      sifra: String(sifra).padStart(4, "0"),
      svrha: VRSTA_SVRHA[u.type] || [u.label.toUpperCase()],
      primalac: u.primalac && u.primalac.length > 0 ? u.primalac : [u.budgetOrg || ""],
      accountUplatilac: uplatilacAcc,
      accountPrimalac: u.account,
      prihod: u.vrstaPrihoda,
      opcina: u.opcinaKod || "",
      iznos: u.amount,
    });
    sifra += 1;
  }
  return { rows, nextSifra: sifra };
}

function buildPlateRows(
  perWorker: WorkerPay[],
  uplatilacAcc: string,
  opcinaFirme: string,
  startSifra: number,
): { rows: NalogRow[]; nextSifra: number } {
  // Zbirne stavke (4 maksimalno) — sumirano kroz sve radnike.
  // Detaljne specifikacije po radniku idu u zasebni PDF "Specifikacije".
  let net = 0;
  let meal = 0;
  let vac = 0;
  let trv = 0;
  for (const w of perWorker) {
    net += w.net;
    meal += w.mealAllowance;
    vac += w.vacationBonus;
    trv += w.travelExpense;
  }

  const types: { svrha: string[]; iznos: number }[] = [];
  if (net > 0)
    types.push({
      svrha: ["PRENOS PLATE", "PO DOSTAVLJENOM SPISKU"],
      iznos: net,
    });
  if (meal > 0)
    types.push({
      svrha: ["TOPLI OBROK", "PO DOSTAVLJENOM SPISKU"],
      iznos: meal,
    });
  if (vac > 0)
    types.push({
      svrha: ["REGRES", "PO DOSTAVLJENOM SPISKU"],
      iznos: vac,
    });
  if (trv > 0)
    types.push({
      svrha: ["PUTNI TROŠAK", "PO DOSTAVLJENOM SPISKU"],
      iznos: trv,
    });

  const rows: NalogRow[] = [];
  let sifra = startSifra;
  for (const t of types) {
    rows.push({
      sifra: String(sifra).padStart(4, "0"),
      svrha: t.svrha,
      primalac: ["RADNICI"],
      accountUplatilac: uplatilacAcc,
      accountPrimalac: "",
      prihod: "",
      opcina: opcinaFirme,
      iznos: t.iznos,
    });
    sifra += 1;
  }
  return { rows, nextSifra: sifra };
}

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

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 28;

// Kolone — širine. Total 539pt (PAGE_W - 2*MARGIN = 539.28).
const COLS = {
  redbr: 25,
  sifra: 38,
  svrha: 125,
  primalac: 130,
  acc: 95,
  prihod: 50,
  iznos: 76,
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
  data: ListaNalogaData,
  bold: PDFFont,
  reg: PDFFont,
): number {
  let y = PAGE_H - MARGIN;

  // Org name + ID block
  page.drawText(`${data.organization.name || ""}`, {
    x: MARGIN,
    y: y - 12,
    size: 13,
    font: bold,
  });
  y -= 18;

  // City
  if (data.organization.city) {
    page.drawText(data.organization.city, {
      x: MARGIN,
      y: y - 11,
      size: 11,
      font: bold,
    });
    y -= 15;
  }

  // Address
  if (data.organization.address) {
    page.drawText(data.organization.address, {
      x: MARGIN,
      y: y - 10,
      size: 10,
      font: reg,
    });
    y -= 14;
  }

  // Žiro račun firme
  if (data.organization.bankAccount) {
    page.drawText(`Žiro račun: ${data.organization.bankAccount}`, {
      x: MARGIN,
      y: y - 10,
      size: 10,
      font: reg,
    });
    y -= 14;
  }

  // Right side: identifikacijski / PDV
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

  // Title — centered
  y = Math.min(y, rightY) - 18;
  const title = "LISTA NALOGA ZA PLAĆANJE";
  const titleW = bold.widthOfTextAtSize(title, 14);
  page.drawText(title, {
    x: (PAGE_W - titleW) / 2,
    y: y - 12,
    size: 14,
    font: bold,
  });
  y -= 20;

  const mm = String(data.month).padStart(2, "0");
  const sub = `- Plata za ${MONTH_NAMES[data.month - 1]} (${mm}) ${data.year}.godine -`;
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

function drawTableHeader(
  page: PDFPage,
  yTop: number,
  bold: PDFFont,
): number {
  const cols = [
    { label: "R.b.", w: COLS.redbr },
    { label: "Šifra", w: COLS.sifra },
    { label: "Svrha uplate", w: COLS.svrha },
    { label: "Uplata u korist", w: COLS.primalac },
    { label: "Račun primaoca", w: COLS.acc },
    { label: "Prihod / Općina", w: COLS.prihod },
    { label: "Iznos (KM)", w: COLS.iznos },
  ];
  let x = MARGIN;
  // Light gray header background
  page.drawRectangle({
    x: MARGIN,
    y: yTop - 14,
    width: PAGE_W - 2 * MARGIN,
    height: 14,
    color: rgb(0.93, 0.93, 0.93),
  });
  for (const c of cols) {
    drawCellText(page, c.label, x + 2, yTop - 10, bold, 7.5, {
      align: c.label === "Iznos (KM)" ? "right" : "left",
      maxWidth: c.w - 4,
    });
    x += c.w;
  }
  // Top + bottom border
  page.drawLine({
    start: { x: MARGIN, y: yTop },
    end: { x: PAGE_W - MARGIN, y: yTop },
    thickness: 0.6,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: MARGIN, y: yTop - 14 },
    end: { x: PAGE_W - MARGIN, y: yTop - 14 },
    thickness: 0.6,
    color: rgb(0, 0, 0),
  });
  return yTop - 14;
}

function drawRow(
  page: PDFPage,
  yTop: number,
  redbr: number,
  row: NalogRow,
  reg: PDFFont,
  bold: PDFFont,
): number {
  const lineH = 10;
  // Wrap dugačke tekstove tako da svaka linija stane u kolonu.
  const svrhaLines: string[] = [];
  for (const line of row.svrha) {
    const wrapped = wrapText(line, COLS.svrha - 4, reg, 8);
    svrhaLines.push(...(wrapped.length > 0 ? wrapped : [line]));
  }
  const primalacLines: string[] = [];
  for (const line of row.primalac) {
    const wrapped = wrapText(line, COLS.primalac - 4, reg, 8);
    primalacLines.push(...(wrapped.length > 0 ? wrapped : [line]));
  }

  // Račun: prikazuje se samo račun primaoca (na koji se uplaćuje). Račun
  // uplatioca (naš žiro) se ne prikazuje, isti je za sve naloge i nije potreban.
  const accLines = row.accountPrimalac ? 1 : 0;
  const numLines = Math.max(2, svrhaLines.length, primalacLines.length, accLines);
  const rowH = numLines * lineH + 4;

  let x = MARGIN;
  drawCellText(page, `${redbr}.`, x + 2, yTop - 10, reg, 8, {
    align: "right",
    maxWidth: COLS.redbr - 4,
  });
  x += COLS.redbr;
  drawCellText(page, row.sifra, x + 2, yTop - 10, reg, 8, {
    align: "left",
    maxWidth: COLS.sifra - 4,
  });
  x += COLS.sifra;

  for (let i = 0; i < svrhaLines.length; i++) {
    drawCellText(page, svrhaLines[i], x + 2, yTop - 10 - i * lineH, reg, 8, {
      maxWidth: COLS.svrha - 4,
    });
  }
  x += COLS.svrha;

  for (let i = 0; i < primalacLines.length; i++) {
    drawCellText(page, primalacLines[i], x + 2, yTop - 10 - i * lineH, reg, 8, {
      maxWidth: COLS.primalac - 4,
    });
  }
  x += COLS.primalac;

  // Račun primaoca (na koji se uplaćuje). Račun uplatioca se ne prikazuje.
  if (row.accountPrimalac) {
    drawCellText(page, row.accountPrimalac, x + 2, yTop - 10, reg, 7.5, {
      maxWidth: COLS.acc - 4,
    });
  }
  x += COLS.acc;

  if (row.prihod) {
    drawCellText(page, row.prihod, x + 2, yTop - 10, reg, 8, {
      maxWidth: COLS.prihod - 4,
    });
  }
  if (row.opcina) {
    drawCellText(page, row.opcina, x + 2, yTop - 10 - lineH, reg, 8, {
      maxWidth: COLS.prihod - 4,
    });
  }
  x += COLS.prihod;

  drawCellText(page, fmt2(row.iznos), x + 2, yTop - 10, bold, 8.5, {
    align: "right",
    maxWidth: COLS.iznos - 4,
  });

  page.drawLine({
    start: { x: MARGIN, y: yTop - rowH },
    end: { x: PAGE_W - MARGIN, y: yTop - rowH },
    thickness: 0.3,
    color: rgb(0.6, 0.6, 0.6),
  });

  return yTop - rowH;
}

function drawSectionHeader(
  page: PDFPage,
  yTop: number,
  text: string,
  bold: PDFFont,
): number {
  page.drawRectangle({
    x: MARGIN,
    y: yTop - 14,
    width: PAGE_W - 2 * MARGIN,
    height: 14,
    color: rgb(0.87, 0.87, 0.87),
  });
  page.drawText(text, {
    x: MARGIN + 4,
    y: yTop - 10,
    size: 8.5,
    font: bold,
  });
  page.drawLine({
    start: { x: MARGIN, y: yTop - 14 },
    end: { x: PAGE_W - MARGIN, y: yTop - 14 },
    thickness: 0.4,
    color: rgb(0, 0, 0),
  });
  return yTop - 14;
}

function drawTotalRow(
  page: PDFPage,
  yTop: number,
  total: number,
  bold: PDFFont,
  label = "U K U P N O:",
  bg: [number, number, number] = [0.93, 0.93, 0.93],
  size = 10,
): number {
  const h = 18;
  page.drawRectangle({
    x: MARGIN,
    y: yTop - h,
    width: PAGE_W - 2 * MARGIN,
    height: h,
    color: rgb(bg[0], bg[1], bg[2]),
  });
  drawCellText(page, label, MARGIN + 4, yTop - 12, bold, size - 0.5);
  const x =
    MARGIN +
    COLS.redbr +
    COLS.sifra +
    COLS.svrha +
    COLS.primalac +
    COLS.acc +
    COLS.prihod;
  drawCellText(page, fmt2(total), x + 2, yTop - 12, bold, size, {
    align: "right",
    maxWidth: COLS.iznos - 4,
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

export async function fillListaNaloga(data: ListaNalogaData): Promise<Uint8Array> {
  // statistika generisanja (admin Aktivnost); best-effort, ne blokira
  trackEvent("LISTA_NALOGA_GENERATE", "Lista naloga za plaćanje", data.organizationId);

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
  y = drawTableHeader(page, y, bold);

  const uplatilacAcc = data.organization.bankAccount || "";
  const hasVlasnik = data.uplatnice.some((u) => u.group === "vlasnik");
  let sifra = 1;
  let redbr = 1;
  let grandTotal = 0;
  let doprinosiTotal = 0;

  type Section = {
    title?: string;
    rows: NalogRow[];
    subtotalLabel?: string;
  };
  const doprinosiSections: Section[] = [];

  const doprinosiRadnici = buildDoprinosRows(
    data.uplatnice,
    hasVlasnik ? "radnici" : null,
    uplatilacAcc,
    sifra,
  );
  if (doprinosiRadnici.rows.length > 0) {
    doprinosiSections.push({
      title: hasVlasnik ? "DOPRINOSI ZA RADNIKE" : undefined,
      rows: doprinosiRadnici.rows,
      subtotalLabel: hasVlasnik ? "Zbir za radnike:" : undefined,
    });
    sifra = doprinosiRadnici.nextSifra;
  }

  if (hasVlasnik) {
    const doprinosiVlasnik = buildDoprinosRows(
      data.uplatnice,
      "vlasnik",
      uplatilacAcc,
      sifra,
    );
    if (doprinosiVlasnik.rows.length > 0) {
      doprinosiSections.push({
        title: "DOPRINOSI ZA VLASNIKA OBRTA",
        rows: doprinosiVlasnik.rows,
        subtotalLabel: "Zbir za vlasnika:",
      });
      sifra = doprinosiVlasnik.nextSifra;
    }
  }

  // Helper za crtanje sekcije sa pagination logikom.
  const drawSection = (sec: Section): number => {
    if (sec.title) {
      if (y < MARGIN + 90) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
      y = drawSectionHeader(page, y, sec.title, bold);
      y = drawTableHeader(page, y, bold);
    }
    let secTotal = 0;
    for (const row of sec.rows) {
      if (y < MARGIN + 50) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
        if (sec.title) {
          page.drawText(`${sec.title} (nastavak)`, {
            x: MARGIN,
            y: y - 12,
            size: 9,
            font: bold,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= 18;
        }
        y = drawTableHeader(page, y, bold);
      }
      y = drawRow(page, y, redbr, row, reg, bold);
      secTotal += row.iznos;
      redbr += 1;
    }
    if (sec.subtotalLabel) {
      if (y < MARGIN + 30) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
      y = drawTotalRow(
        page,
        y,
        secTotal,
        bold,
        sec.subtotalLabel,
        [0.97, 0.97, 0.97],
        9,
      );
    }
    return secTotal;
  };

  for (const sec of doprinosiSections) {
    doprinosiTotal += drawSection(sec);
  }
  grandTotal += doprinosiTotal;

  // Ukupni zbir doprinosa (između doprinosa i isplata).
  if (doprinosiSections.length > 0) {
    if (y < MARGIN + 30) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    y = drawTotalRow(
      page,
      y,
      doprinosiTotal,
      bold,
      "Ukupno doprinosi:",
      [0.9, 0.9, 0.9],
      9.5,
    );
  }

  // Isplate radnicima — 4 zbirne stavke.
  const plate = buildPlateRows(
    data.perWorker,
    uplatilacAcc,
    data.opcinaFirmeKod,
    sifra,
  );
  if (plate.rows.length > 0) {
    const isplateTotal = drawSection({
      title: "ISPLATE RADNICIMA",
      rows: plate.rows,
      subtotalLabel: "Ukupno isplate:",
    });
    grandTotal += isplateTotal;
  }

  // Finalni ukupni zbir svega (doprinosi + isplate).
  if (y < MARGIN + 40) {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }
  drawTotalRow(page, y, grandTotal, bold, "U K U P N O   S V E:", [0.82, 0.82, 0.82], 11);

  return await doc.save();
}
