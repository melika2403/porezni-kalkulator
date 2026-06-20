// ──────────────────────────────────────────────────────────────────────────────
//  PDF matične evidencije o radniku (Pravilnik Sl. novine FBiH 92/16).
//  Zaglavlje sa poslodavcem, naslov, 24 numerisane stavke (oznaka : vrijednost),
//  podnožje sa datumom izrade i zadnjom izmjenom podataka.
// ──────────────────────────────────────────────────────────────────────────────

const { PDFDocument, rgb } = require("pdf-lib");
const { embedFonts } = require("./payslipPdf");

function fmtDateDot(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}.${m}.${y}.`;
}

// Razbije predugu riječ (bez razmaka) na komade koji staju u širinu.
function breakWord(word, font, size, maxW) {
  if (font.widthOfTextAtSize(word, size) <= maxW) return [word];
  const chunks = [];
  let chunk = "";
  for (const ch of word) {
    if (chunk && font.widthOfTextAtSize(chunk + ch, size) > maxW) {
      chunks.push(chunk);
      chunk = ch;
    } else {
      chunk += ch;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

// Razbije tekst u redove koji staju u datu širinu.
function wrap(text, font, size, maxW) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let line = "";
  for (const rawWord of words) {
    for (const word of breakWord(rawWord, font, size, maxW)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * @param {Array<{n,label,value}>} items rezultat resolveEvidencija
 * @param {Object} meta { orgName, orgAddress, orgTaxNumber, datumIzrade(iso), zadnjaIzmjena(iso) }
 * @returns {Promise<Buffer>}
 */
async function generateEvidencijaPdf(items, meta) {
  const pdf = await PDFDocument.create();
  const { reg, bold } = await embedFonts(pdf);
  let page = pdf.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();
  const ink = rgb(0.06, 0.1, 0.07);
  const line = rgb(0.82, 0.8, 0.76);
  const left = 45;
  const right = width - 45;
  const numW = 18; // kolona broja
  const labelX = left + numW;
  const labelW = 215; // širina kolone naziva
  const valueX = labelX + labelW + 12;
  const valueW = right - valueX;

  let y = 805;

  // Zaglavlje poslodavca — svako u svom redu.
  page.drawText(meta.orgName || "", { x: left, y, size: 12, font: bold, color: ink });
  y -= 16;
  if (meta.orgAddress) {
    page.drawText(meta.orgAddress, { x: left, y, size: 10, font: reg, color: ink });
    y -= 14;
  }
  if (meta.orgTaxNumber) {
    page.drawText(`JIB: ${meta.orgTaxNumber}`, { x: left, y, size: 10, font: reg, color: ink });
    y -= 14;
  }
  y -= 12;
  const title = "MATIČNA EVIDENCIJA O RADNIKU";
  const tw = bold.widthOfTextAtSize(title, 13);
  page.drawText(title, { x: (width - tw) / 2, y, size: 13, font: bold, color: ink });
  y -= 6;
  const sub = "Pravilnik o sadržaju i načinu vođenja evidencije o radnicima (Sl. novine FBiH 92/16)";
  const sw = reg.widthOfTextAtSize(sub, 7.5);
  page.drawText(sub, { x: (width - sw) / 2, y: y - 8, size: 7.5, font: reg, color: rgb(0.45, 0.45, 0.42) });
  y -= 26;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 1, color: ink });
  y -= 16;

  const ensureSpace = (need) => {
    if (y - need < 50) {
      page = pdf.addPage([595.28, 841.89]);
      y = 800;
    }
  };

  for (const it of items) {
    const labelLines = wrap(it.label, bold, 8.5, labelW);
    const valueLines = wrap(it.value || "–", reg, 9, valueW);
    const rows = Math.max(labelLines.length, valueLines.length);
    const contentH = rows * 12;
    ensureSpace(contentH + 12);

    // Tekst: prva linija na baseline-u y, sljedeće 12pt niže.
    page.drawText(`${it.n}.`, { x: left, y, size: 8.5, font: bold, color: ink });
    labelLines.forEach((ln, i) => {
      page.drawText(ln, { x: labelX, y: y - i * 12, size: 8.5, font: bold, color: ink });
    });
    valueLines.forEach((ln, i) => {
      page.drawText(ln, { x: valueX, y: y - i * 12, size: 9, font: reg, color: ink });
    });
    // Linija ISPOD sadržaja (sa razmakom), pa sljedeća stavka još niže.
    const lineY = y - contentH + 4;
    page.drawLine({ start: { x: left, y: lineY }, end: { x: right, y: lineY }, thickness: 0.4, color: line });
    y = lineY - 12;
  }

  // Podnožje
  ensureSpace(60);
  y -= 14;
  const izrada = `Datum izrade evidencije: ${fmtDateDot(meta.datumIzrade)}`;
  const izmjena = meta.zadnjaIzmjena
    ? `Zadnja izmjena podataka: ${fmtDateDot(meta.zadnjaIzmjena)}`
    : "";
  page.drawText(izrada, { x: left, y, size: 8.5, font: reg, color: ink });
  if (izmjena) {
    page.drawText(izmjena, { x: left, y: y - 12, size: 8.5, font: reg, color: ink });
  }
  // Potpis poslodavca desno — tekst centriran nad linijom.
  const sigText = "Potpis ovlaštenog lica:";
  const sigLeft = right - 200;
  const sigCenter = (sigLeft + right) / 2;
  const sigW = reg.widthOfTextAtSize(sigText, 8.5);
  page.drawText(sigText, { x: sigCenter - sigW / 2, y, size: 8.5, font: reg, color: ink });
  page.drawLine({
    start: { x: sigLeft, y: y - 34 },
    end: { x: right, y: y - 34 },
    thickness: 0.6,
    color: ink,
  });

  return Buffer.from(await pdf.save());
}

module.exports = { generateEvidencijaPdf };
