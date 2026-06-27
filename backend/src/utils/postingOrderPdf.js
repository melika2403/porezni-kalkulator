// ──────────────────────────────────────────────────────────────────────────────
//  PDF naloga za knjiženje plate (KONTA / DUGUJE / POTRAŽUJE / SUMA).
//  Format prati klasičan računovodstveni nalog: zaglavlje sa firmom i periodom,
//  tabela konta po dugovnoj/potražnoj strani, te zatvarajuća SUMA.
// ──────────────────────────────────────────────────────────────────────────────

const { PDFDocument, rgb } = require("pdf-lib");
const { embedFonts } = require("./payslipPdf");

function fmtMoney(n) {
  return Number(n || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDateDot(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return String(iso);
  return `${d}.${m}.${y}.`;
}

/**
 * @param {Object} order rezultat buildPostingOrder ({ rows, sumaDuguje, sumaPotrazuje })
 * @param {Object} meta { orgName, year, month, datumKnjizenja (iso) }
 * @returns {Promise<Buffer>}
 */
async function generatePostingOrderPdf(order, meta) {
  const pdf = await PDFDocument.create();
  const { reg, bold } = await embedFonts(pdf);
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();
  const ink = rgb(0.06, 0.1, 0.07);
  const line = rgb(0.8, 0.78, 0.74);

  const mm = String(meta.month).padStart(2, "0");
  const yy = String(meta.year).slice(-2);

  let y = 800;
  const drawCentered = (text, size, font, color = ink) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  drawCentered(meta.orgName || "", 12, bold);
  y -= 18;
  drawCentered(`Knjiženje plate za ${mm}/${yy}`, 11, reg);
  y -= 15;
  drawCentered(`Datum knjiženja: ${fmtDateDot(meta.datumKnjizenja)}`, 10, reg);
  y -= 30;

  // Tabela: OPIS | KONTO | DUGUJE | POTRAŽUJE
  const left = 40;
  const colOpis = 40;
  const colKonto = 300;
  const colDuguje = 460; // desna ivica kolone DUGUJE (desno poravnato)
  const colPotraz = 555; // desna ivica kolone POTRAŽUJE
  const rowH = 18;

  const drawRight = (text, xRight, size, font, color = ink) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: xRight - w, y, size, font, color });
  };
  const truncate = (text, font, size, maxW) => {
    if (font.widthOfTextAtSize(text, size) <= maxW) return text;
    let t = text;
    while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxW) {
      t = t.slice(0, -1);
    }
    return t + "…";
  };
  const opisMaxW = colKonto - colOpis - 10;

  // Zaglavlje tabele
  page.drawText("OPIS", { x: colOpis, y, size: 9, font: bold, color: ink });
  page.drawText("KONTO", { x: colKonto, y, size: 9, font: bold, color: ink });
  drawRight("DUGUJE", colDuguje, 9, bold);
  drawRight("POTRAŽUJE", colPotraz, 9, bold);
  y -= 6;
  page.drawLine({
    start: { x: left, y },
    end: { x: colPotraz, y },
    thickness: 1,
    color: ink,
  });
  y -= rowH;

  for (const r of order.rows) {
    page.drawText(truncate(r.opis || "", reg, 9, opisMaxW), {
      x: colOpis,
      y,
      size: 9,
      font: reg,
      color: ink,
    });
    page.drawText(r.konto, { x: colKonto, y, size: 10, font: reg, color: ink });
    if (r.duguje !== 0) drawRight(fmtMoney(r.duguje), colDuguje, 10, reg);
    if (r.potrazuje !== 0) drawRight(fmtMoney(r.potrazuje), colPotraz, 10, reg);
    y -= 4;
    page.drawLine({
      start: { x: left, y },
      end: { x: colPotraz, y },
      thickness: 0.5,
      color: line,
    });
    y -= rowH - 4;
  }

  // SUMA
  y -= 2;
  page.drawLine({
    start: { x: left, y: y + rowH - 2 },
    end: { x: colPotraz, y: y + rowH - 2 },
    thickness: 1,
    color: ink,
  });
  page.drawText("SUMA", { x: colKonto, y, size: 10, font: bold, color: ink });
  drawRight(fmtMoney(order.sumaDuguje), colDuguje, 10, bold);
  drawRight(fmtMoney(order.sumaPotrazuje), colPotraz, 10, bold);

  return Buffer.from(await pdf.save());
}

module.exports = { generatePostingOrderPdf };
