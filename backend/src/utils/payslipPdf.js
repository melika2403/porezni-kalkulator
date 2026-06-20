// ──────────────────────────────────────────────────────────────────────────────
//  Generator platnog listića (PDF) — jedna stranica po radniku.
//  Čista A4 forma sa firmom u headeru, podacima radnika, satima, obračunom
//  bruto→neto, doprinosima poslodavca i datumom isplate.
// ──────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { kantonForOpcina } = require("./uplatnicaPdf");

const FONT_REG_PATH = path.join(__dirname, "..", "assets", "fonts", "arial.ttf");
const FONT_BOLD_PATH = path.join(__dirname, "..", "assets", "fonts", "arialbd.ttf");

// ── Format helpers ──────────────────────────────────────────────────────────
const fmtKM = (n) =>
  Number(n || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " KM";

const fmtHours = (mins) => {
  if (mins == null) return "–";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

const MONTHS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

function fmtDateDDMMYYYY(d) {
  if (!d) return "–";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "–";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}.`;
}

// Radni staž: razlika između startDate i paymentDate u godinama/mjesecima
function workTenure(startDateStr, paymentDateStr) {
  if (!startDateStr) return "–";
  const start = new Date(startDateStr);
  const end = paymentDateStr ? new Date(paymentDateStr) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "–";
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years < 0) return "–";
  if (years === 0 && months === 0) return "< 1 mjesec";
  const parts = [];
  if (years > 0) parts.push(`${years} god.`);
  if (months > 0) parts.push(`${months} mj.`);
  return parts.join(" ");
}

// ── Konstante za rate ───────────────────────────────────────────────────────
const FOND_INVALIDI_RATE = 0.005;

// ── Glavna funkcija ─────────────────────────────────────────────────────────
/**
 * Generiše jednu stranicu platnog listića za radnika.
 * @param {Object} pdfDoc - postojeći PDFDocument (multi-page)
 * @param {Object} payroll - Payroll snapshot
 * @param {Object} organization - Organization (sa city, taxNumber, pdvNumber, address)
 * @param {Object} worker - Worker (firstName, lastName, jmbg, position, startDate, address, city)
 * @param {string} paymentDateIso - YYYY-MM-DD (datum isplate)
 * @param {Object} fonts - { reg, bold } - već embedovani fontovi
 */
function addPayslipPage(pdfDoc, payroll, organization, worker, paymentDateIso, fonts) {
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  // Sve boje teksta su crne radi maksimalne čitljivosti pri štampi.
  // Sive boje su preslabe za laser/inkjet print pa korisnik ne može jasno
  // pročitati platni listić.
  const ink = rgb(0, 0, 0);
  const mid = rgb(0, 0, 0);
  const accent = rgb(0, 0, 0);
  const border = rgb(0.4, 0.4, 0.4);
  const borderStrong = rgb(0, 0, 0);

  const drawText = (txt, x, y, opts = {}) => {
    const size = opts.size ?? 9;
    const font = opts.bold ? fonts.bold : fonts.reg;
    const color = opts.color ?? ink;
    page.drawText(String(txt ?? "–"), { x, y, size, font, color });
  };

  const drawRightText = (txt, xRight, y, opts = {}) => {
    const size = opts.size ?? 9;
    const font = opts.bold ? fonts.bold : fonts.reg;
    const color = opts.color ?? ink;
    const str = String(txt ?? "–");
    const w = font.widthOfTextAtSize(str, size);
    page.drawText(str, { x: xRight - w, y, size, font, color });
  };

  const drawLine = (x1, y1, x2, y2, color = border, thickness = 0.5) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });
  };

  const drawRect = (x, y, w, h, opts = {}) => {
    page.drawRectangle({
      x, y, width: w, height: h,
      color: opts.fill,
      borderColor: opts.border,
      borderWidth: opts.borderWidth ?? 0,
    });
  };

  const MARGIN = 40;
  let cursorY = PAGE_H - MARGIN;

  // ── HEADER: firma ─────────────────────────────────────────────────────────
  drawText(organization.name || "–", MARGIN, cursorY, { size: 13, bold: true });
  cursorY -= 16;

  const orgParts = [];
  if (organization.address) orgParts.push(organization.address);
  if (organization.city) orgParts.push(organization.city);
  if (orgParts.length) {
    drawText(orgParts.join(", "), MARGIN, cursorY, { size: 9, color: mid });
    cursorY -= 12;
  }

  // Kanton iz lookup-a
  const kantonInfo = kantonForOpcina(organization.city || "");
  if (kantonInfo) {
    drawText(kantonInfo.kantonData.ime, MARGIN, cursorY, { size: 9, color: mid });
    cursorY -= 12;
  }

  if (organization.taxNumber) {
    drawText(`ID broj: ${organization.taxNumber}`, MARGIN, cursorY, { size: 9, color: mid });
    cursorY -= 12;
  }
  if (organization.pdvNumber) {
    drawText(`PDV broj: ${organization.pdvNumber}`, MARGIN, cursorY, { size: 9, color: mid });
    cursorY -= 12;
  }

  cursorY -= 8;
  drawLine(MARGIN, cursorY, PAGE_W - MARGIN, cursorY, accent, 1.2);
  cursorY -= 22;

  // ── TITLE ─────────────────────────────────────────────────────────────────
  const title = "PLATNI LISTIĆ";
  const titleSize = 18;
  const titleW = fonts.bold.widthOfTextAtSize(title, titleSize);
  drawText(title, (PAGE_W - titleW) / 2, cursorY, { size: titleSize, bold: true, color: accent });
  cursorY -= 16;

  const monthName = MONTHS[payroll.month - 1].toLowerCase();
  const monthNum = String(payroll.month).padStart(2, "0");
  const periodStr = `za mjesec ${monthName} (${monthNum}) ${payroll.year}.`;
  const periodSize = 11;
  const periodW = fonts.reg.widthOfTextAtSize(periodStr, periodSize);
  drawText(periodStr, (PAGE_W - periodW) / 2, cursorY, { size: periodSize, color: mid });
  cursorY -= 28;

  // ── WORKER INFO (dvije kolone) ─────────────────────────────────────────────
  const colLeftX = MARGIN;
  const colRightX = PAGE_W / 2 + 10;
  const labelColor = mid;
  const labelSize = 8;
  const valueSize = 10;

  const drawField = (label, value, x, y) => {
    drawText(label.toUpperCase(), x, y, { size: labelSize, color: labelColor });
    drawText(value || "–", x, y - 12, { size: valueSize, bold: false });
  };

  const workerName = `${worker.firstName || ""} ${worker.lastName || ""}`.trim();

  drawField("Radnik", workerName, colLeftX, cursorY);
  drawField("JMBG", worker.jmbg || "–", colRightX, cursorY);
  cursorY -= 24;

  drawField("Radno mjesto", worker.position || "–", colLeftX, cursorY);
  drawField("Datum prijave", fmtDateDDMMYYYY(worker.startDate), colRightX, cursorY);
  cursorY -= 24;

  drawField("Ukupan radni staž", workTenure(worker.startDate, paymentDateIso), colLeftX, cursorY);
  drawField("Adresa", worker.address || "–", colRightX, cursorY);
  cursorY -= 22;

  // Linija razdvajanja
  drawLine(MARGIN, cursorY, PAGE_W - MARGIN, cursorY, border, 0.5);
  cursorY -= 18;

  // ── SATI ──────────────────────────────────────────────────────────────────
  drawText("Obračunato vrijeme", MARGIN, cursorY, { size: 10, bold: true, color: accent });
  cursorY -= 13;

  const drawHourRow = (label, value, y) => {
    drawText(label, MARGIN + 4, y, { size: 9, color: ink });
    drawRightText(value, PAGE_W - MARGIN - 4, y, { size: 9, bold: false });
  };

  drawHourRow("Odrađeno", fmtHours(payroll.workedMinutes), cursorY);
  cursorY -= 13;
  if (payroll.sickDays && payroll.sickDays > 0) {
    drawHourRow("Bolovanje (dana)", String(payroll.sickDays), cursorY);
    cursorY -= 13;
  }
  if (payroll.vacationDays && payroll.vacationDays > 0) {
    drawHourRow("Godišnji odmor (dana)", String(payroll.vacationDays), cursorY);
    cursorY -= 13;
  }
  if (Number(payroll.overtimeHours) > 0) {
    drawHourRow("Prekovremeni rad (sati)", Number(payroll.overtimeHours).toFixed(2), cursorY);
    cursorY -= 13;
  }
  if (Number(payroll.nightHours) > 0) {
    drawHourRow("Noćni rad (sati)", Number(payroll.nightHours).toFixed(2), cursorY);
    cursorY -= 13;
  }
  if (Number(payroll.sundayHours) > 0) {
    drawHourRow("Rad nedjeljom (sati)", Number(payroll.sundayHours).toFixed(2), cursorY);
    cursorY -= 13;
  }
  if (Number(payroll.holidayHours) > 0) {
    drawHourRow("Rad na praznik (sati)", Number(payroll.holidayHours).toFixed(2), cursorY);
    cursorY -= 13;
  }
  cursorY -= 12;

  // ── OBRAČUN PLATE — bruto, doprinosi, porez, neto ─────────────────────────
  drawText("Obračun plate", MARGIN, cursorY, { size: 10, bold: true, color: accent });
  cursorY -= 13;

  const drawSummaryRow = (label, value, y, opts = {}) => {
    const indent = opts.indent ? 16 : 4;
    drawText(label, MARGIN + indent, y, {
      size: opts.bold ? 9.5 : 9,
      bold: opts.bold,
      color: opts.bold ? ink : (opts.indent ? mid : ink),
    });
    drawRightText(fmtKM(value), PAGE_W - MARGIN - 4, y, {
      size: opts.bold ? 9.5 : 9,
      bold: opts.bold,
    });
  };

  // Bruto: ako ima minuli rad ili uvećanja, prikaži osnovicu + sve dodatke + ukupno bruto.
  // Inače samo "Bruto plata".
  const grossBaseVal =
    payroll.grossBase != null ? Number(payroll.grossBase) : Number(payroll.gross);
  const minuliAmt = Number(payroll.minuliRadAmount) || 0;
  const minuliRate = Number(payroll.minuliRadRate) || 0;
  const minuliYrs = Number(payroll.minuliRadYears) || 0;
  const overtimeAmt = Number(payroll.overtimeAmount) || 0;
  const nightAmt = Number(payroll.nightAmount) || 0;
  const sundayAmt = Number(payroll.sundayAmount) || 0;
  const holidayAmt = Number(payroll.holidayAmount) || 0;
  const fmtPct = (n) =>
    Number(n || 0).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fmtH = (n) =>
    Number(n || 0).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const hasBreakdown =
    (minuliAmt > 0 && minuliRate > 0) ||
    overtimeAmt > 0 || nightAmt > 0 || sundayAmt > 0 || holidayAmt > 0;

  if (hasBreakdown) {
    drawSummaryRow("Bruto plata (osnovica)", grossBaseVal, cursorY);
    cursorY -= 13;
    if (minuliAmt > 0 && minuliRate > 0) {
      const minuliLabel = `Minuli rad (${fmtPct(minuliRate)}% × ${minuliYrs} god.)`;
      drawSummaryRow(minuliLabel, minuliAmt, cursorY);
      cursorY -= 13;
    }
    if (overtimeAmt > 0) {
      const lbl = `Prekovremeni rad (${fmtH(payroll.overtimeHours)}h × ${fmtPct(payroll.overtimeRate)}%)`;
      drawSummaryRow(lbl, overtimeAmt, cursorY);
      cursorY -= 13;
    }
    if (nightAmt > 0) {
      const lbl = `Noćni rad (${fmtH(payroll.nightHours)}h × ${fmtPct(payroll.nightRate)}%)`;
      drawSummaryRow(lbl, nightAmt, cursorY);
      cursorY -= 13;
    }
    if (sundayAmt > 0) {
      const lbl = `Rad nedjeljom (${fmtH(payroll.sundayHours)}h × ${fmtPct(payroll.sundayRate)}%)`;
      drawSummaryRow(lbl, sundayAmt, cursorY);
      cursorY -= 13;
    }
    if (holidayAmt > 0) {
      const lbl = `Rad na praznik (${fmtH(payroll.holidayHours)}h × ${fmtPct(payroll.holidayRate)}%)`;
      drawSummaryRow(lbl, holidayAmt, cursorY);
      cursorY -= 13;
    }
    drawSummaryRow("Bruto plata ukupno", payroll.gross, cursorY, { bold: true });
    cursorY -= 16;
  } else {
    drawSummaryRow("Bruto plata", payroll.gross, cursorY, { bold: true });
    cursorY -= 16;
  }

  drawText("Doprinosi iz plate", MARGIN + 4, cursorY, { size: 9, color: mid });
  cursorY -= 13;
  drawSummaryRow("PIO/MIO (17%)", payroll.empPio, cursorY, { indent: true });
  cursorY -= 13;
  drawSummaryRow("Zdravstveno osiguranje (12,5%)", payroll.empZdravstvo, cursorY, { indent: true });
  cursorY -= 13;
  drawSummaryRow("Osiguranje od nezaposlenosti (1,5%)", payroll.empNezaposlenost, cursorY, { indent: true });
  cursorY -= 15;
  drawSummaryRow("Ukupno doprinosa iz plate", payroll.empTotal, cursorY, { bold: true });
  cursorY -= 14;
  // Tanka razdjelna crta između sekcija (doprinosi → porez)
  drawLine(MARGIN, cursorY, PAGE_W - MARGIN, cursorY, border, 0.5);
  cursorY -= 12;

  const taxCoeff = Number(payroll.taxCoefficient) || 0;
  const taxDed = Number(payroll.deduction) || 0;
  const odbitakLabel = `Lični odbitak (koef ${taxCoeff.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  drawSummaryRow(odbitakLabel, taxDed, cursorY);
  cursorY -= 13;
  drawSummaryRow("Porezna osnovica", payroll.taxBase, cursorY);
  cursorY -= 13;
  drawSummaryRow("Porez na dohodak (10%)", payroll.incomeTax, cursorY, { bold: true });
  cursorY -= 22;

  // NETO PLATA — istaknuto bold, vertikalno centrirano između dvije crte
  drawLine(MARGIN, cursorY + 7, PAGE_W - MARGIN, cursorY + 7, borderStrong, 0.9);
  drawText("NETO PLATA", MARGIN + 4, cursorY - 7, { size: 12, bold: true, color: accent });
  drawRightText(fmtKM(payroll.net), PAGE_W - MARGIN - 4, cursorY - 7, { size: 12, bold: true, color: accent });
  drawLine(MARGIN, cursorY - 18, PAGE_W - MARGIN, cursorY - 18, borderStrong, 0.9);
  cursorY -= 30;

  // ── DODACI (neoporezivi) ──────────────────────────────────────────────────
  const hasMeal = Number(payroll.mealAllowance) > 0;
  const hasVac = Number(payroll.vacationBonus) > 0;
  const hasTravel = Number(payroll.travelExpense) > 0;
  if (hasMeal || hasVac || hasTravel) {
    drawText("Naknade radniku", MARGIN, cursorY, { size: 10, bold: true, color: accent });
    cursorY -= 13;
    if (hasMeal) {
      drawSummaryRow("Topli obrok", payroll.mealAllowance, cursorY);
      cursorY -= 13;
    }
    if (hasVac) {
      drawSummaryRow("Regres", payroll.vacationBonus, cursorY);
      cursorY -= 13;
    }
    if (hasTravel) {
      drawSummaryRow("Putni trošak", payroll.travelExpense, cursorY);
      cursorY -= 13;
    }
    cursorY -= 6;

    const totalToWorker =
      Number(payroll.net || 0) +
      Number(payroll.mealAllowance || 0) +
      Number(payroll.vacationBonus || 0) +
      Number(payroll.travelExpense || 0);
    drawLine(MARGIN, cursorY + 7, PAGE_W - MARGIN, cursorY + 7, borderStrong, 0.9);
    drawText("UKUPNO ZA ISPLATU", MARGIN + 4, cursorY - 7, { size: 12, bold: true, color: accent });
    drawRightText(fmtKM(totalToWorker), PAGE_W - MARGIN - 4, cursorY - 7, { size: 12, bold: true, color: accent });
    drawLine(MARGIN, cursorY - 18, PAGE_W - MARGIN, cursorY - 18, borderStrong, 0.9);
    cursorY -= 30;
  }

  // ── DOPRINOSI NA PLATU (poslodavac) + naknade ────────────────────────────
  drawText("Obaveze poslodavca", MARGIN, cursorY, { size: 10, bold: true, color: accent });
  cursorY -= 13;

  drawText("Doprinosi na platu", MARGIN + 4, cursorY, { size: 9, color: mid });
  cursorY -= 13;
  drawSummaryRow("PIO/MIO (2,5%)", payroll.erpPio, cursorY, { indent: true });
  cursorY -= 13;
  drawSummaryRow("Zdravstveno osiguranje (2%)", payroll.erpZdravstvo, cursorY, { indent: true });
  cursorY -= 13;
  drawSummaryRow("Osiguranje od nezaposlenosti (0,5%)", payroll.erpNezaposlenost, cursorY, { indent: true });
  cursorY -= 15;
  drawSummaryRow("Ukupno doprinosa na platu", payroll.erpTotal, cursorY, { bold: true });
  cursorY -= 14;
  drawLine(MARGIN, cursorY, PAGE_W - MARGIN, cursorY, border, 0.5);
  cursorY -= 12;

  drawSummaryRow("Opća vodna naknada (0,5% × neto)", payroll.vodnaNaknada, cursorY);
  cursorY -= 13;
  drawSummaryRow("Zaštita od prirodnih nesreća (0,5% × neto)", payroll.naknadaNesrece, cursorY);
  cursorY -= 22;
  // Fond invalida (0,5% × bruto) NIJE per-worker stavka — uplaćuje se zbirno
  // na nivou organizacije, pa se ne prikazuje na platnom listiću radnika.

  const totalCost = Number(payroll.totalCost || 0);
  drawLine(MARGIN, cursorY + 7, PAGE_W - MARGIN, cursorY + 7, borderStrong, 0.9);
  drawText("UKUPAN TROŠAK POSLODAVCA", MARGIN + 4, cursorY - 7, { size: 12, bold: true, color: accent });
  drawRightText(fmtKM(totalCost), PAGE_W - MARGIN - 4, cursorY - 7, { size: 12, bold: true, color: accent });
  drawLine(MARGIN, cursorY - 18, PAGE_W - MARGIN, cursorY - 18, borderStrong, 0.9);
  cursorY -= 28;

  // ── FOOTER: datum isplate + potpisi ───────────────────────────────────────
  drawLine(MARGIN, cursorY, PAGE_W - MARGIN, cursorY, border, 0.5);
  cursorY -= 18;

  const datumLabel = "Datum isplate plate:";
  drawText(datumLabel, MARGIN, cursorY, { size: 9, color: mid });
  const datumLabelW = fonts.reg.widthOfTextAtSize(datumLabel, 9);
  drawText(
    fmtDateDDMMYYYY(paymentDateIso),
    MARGIN + datumLabelW + 8,
    cursorY,
    { size: 10, bold: true },
  );
  cursorY -= 50;

  // Potpisi: dvije linije
  const sigW = 180;
  const sigGap = 40;
  const totalSigW = sigW * 2 + sigGap;
  const sigStartX = (PAGE_W - totalSigW) / 2;
  drawLine(sigStartX, cursorY, sigStartX + sigW, cursorY, ink, 0.6);
  drawLine(sigStartX + sigW + sigGap, cursorY, sigStartX + 2 * sigW + sigGap, cursorY, ink, 0.6);
  cursorY -= 12;
  const lbl1 = "Potpis radnika";
  const lbl2 = "Potpis poslodavca";
  drawText(lbl1, sigStartX + (sigW - fonts.reg.widthOfTextAtSize(lbl1, 9)) / 2, cursorY, { size: 9, color: mid });
  drawText(lbl2, sigStartX + sigW + sigGap + (sigW - fonts.reg.widthOfTextAtSize(lbl2, 9)) / 2, cursorY, { size: 9, color: mid });
}

// Cached fonts
let cachedFontReg = null;
let cachedFontBold = null;

async function embedFonts(pdfDoc) {
  if (!cachedFontReg) cachedFontReg = fs.readFileSync(FONT_REG_PATH);
  if (!cachedFontBold) cachedFontBold = fs.readFileSync(FONT_BOLD_PATH);
  pdfDoc.registerFontkit(fontkit);
  const reg = await pdfDoc.embedFont(cachedFontReg, { subset: true });
  const bold = await pdfDoc.embedFont(cachedFontBold, { subset: true });
  return { reg, bold };
}

/**
 * Generiše kombinovani PDF sa platnim listićima za sve radnike (jedna stranica po radniku).
 * @param {Array<{payroll, worker}>} items
 * @param {Object} organization
 * @param {string} paymentDateIso
 * @returns {Promise<Buffer>}
 */
async function generatePayslipsCombined(items, organization, paymentDateIso) {
  const pdf = await PDFDocument.create();
  const fonts = await embedFonts(pdf);
  for (const { payroll, worker } of items) {
    addPayslipPage(pdf, payroll, organization, worker, paymentDateIso, fonts);
  }
  return Buffer.from(await pdf.save());
}

module.exports = {
  addPayslipPage,
  embedFonts,
  generatePayslipsCombined,
};
