// ─────────────────────────────────────────────────────────────────────────────
//  Kartica prometa partnera (kupca ili dobavljača) - PDF
//  Tabela: Rb, Datum, Dokument/Opis, Duguje, Potražuje, Saldo; sa UKUPNO
//  redom i paginacijom. Stil po uzoru na klasične knjigovodstvene kartice.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

const FONTS_DIR = path.join(__dirname, "..", "assets", "fonts");
const FONT_REG = path.join(FONTS_DIR, "arial.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "arialbd.ttf");

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.45, 0.42);
const LINE = rgb(0.78, 0.76, 0.72);

function withThousands(s) {
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [int, dec] = body.split(".");
  const intT = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + intT + (dec ? "," + dec : "");
}
const fmt2 = (n) => withThousands(Number(n || 0).toFixed(2));

function fmtDate(d) {
  if (!d) return "";
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split("-");
  return y && m && day ? `${day}.${m}.${y}.` : "";
}

/**
 * @param {object} input
 * @param {object} input.org      naša organizacija {name, address, city, jib}
 * @param {object} input.partner  partner {name, code, jib, address, city}
 * @param {"kupac"|"dobavljac"} input.type
 * @param {{from: string, to: string}} input.period  ISO datumi
 * @param {Array<{date: string, label: string, duguje: number, potrazuje: number}>} input.rows
 *   hronološki redovi; saldo se računa kumulativno (duguje - potražuje)
 * @returns {Promise<Buffer>}
 */
async function buildKarticaPdf({ org, partner, type, period, rows }) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const reg = await doc.embedFont(fs.readFileSync(FONT_REG), { subset: true });
  const bold = await doc.embedFont(fs.readFileSync(FONT_BOLD), {
    subset: true,
  });

  const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait
  const M = 42;
  const tableW = PAGE.w - 2 * M;

  // kolone: rb 28, datum 62, opis flex, duguje 78, potražuje 78, saldo 84
  const cols = [
    { key: "rb", w: 28, align: "right", title: "Rb" },
    { key: "date", w: 62, align: "left", title: "Datum" },
    { key: "label", w: tableW - 28 - 62 - 78 - 78 - 84, align: "left", title: "Opis knjiženja" },
    { key: "duguje", w: 78, align: "right", title: "Duguje" },
    { key: "potrazuje", w: 78, align: "right", title: "Potražuje" },
    { key: "saldo", w: 84, align: "right", title: "Saldo" },
  ];

  const title =
    type === "kupac"
      ? `Kartica kupca ${String(partner.code || "").padStart(4, "0")}`
      : `Kartica dobavljača ${String(partner.code || "").padStart(4, "0")}`;

  let page = null;
  let y = 0;
  let pageNum = 0;
  const totalPagesHolder = [];

  function drawText(text, x, yy, { font = reg, size = 9, color = INK, align = "left", width = 0 } = {}) {
    const t = String(text ?? "");
    let tx = x;
    if (align === "right") tx = x + width - font.widthOfTextAtSize(t, size);
    else if (align === "center") tx = x + (width - font.widthOfTextAtSize(t, size)) / 2;
    page.drawText(t, { x: tx, y: yy, size, font, color });
  }

  function truncate(text, font, size, maxW) {
    let t = String(text ?? "");
    if (font.widthOfTextAtSize(t, size) <= maxW) return t;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxW) {
      t = t.slice(0, -1);
    }
    return `${t}...`;
  }

  function newPage() {
    page = doc.addPage([PAGE.w, PAGE.h]);
    pageNum += 1;
    y = PAGE.h - M;

    if (pageNum === 1) {
      // naša organizacija (istaknuto)
      drawText(org.name || "", M, y - 12, { font: bold, size: 13 });
      drawText(
        [org.address, org.city].filter(Boolean).join(", "),
        M,
        y - 27,
        { size: 10 },
      );
      drawText(org.jib ? `JIB: ${org.jib}` : "", M, y - 41, { size: 10 });

      // naslov + period, centrirano preko cijele širine
      drawText(title, M, y - 76, {
        font: bold,
        size: 16,
        align: "center",
        width: tableW,
      });
      drawText(
        `za period od ${fmtDate(period.from)} do ${fmtDate(period.to)}`,
        M,
        y - 93,
        { font: bold, size: 10, align: "center", width: tableW },
      );

      // partner blok
      const px = M;
      let py = y - 122;
      drawText(type === "kupac" ? "Kupac:" : "Dobavljač:", px, py, {
        size: 10.5,
        color: MUTED,
      });
      drawText(partner.name || "", px + 72, py, { font: bold, size: 11.5 });
      py -= 15;
      const partnerLine2 = [
        [partner.address, partner.city].filter(Boolean).join(", "),
        partner.jib ? `JIB: ${partner.jib}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      if (partnerLine2) {
        drawText(partnerLine2, px + 72, py, { size: 10 });
        py -= 15;
      }
      y = py - 12;
    } else {
      drawText(`${title} (nastavak)`, M, y - 12, { font: bold, size: 10 });
      y -= 30;
    }

    // zaglavlje tabele
    const headH = 18;
    page.drawRectangle({
      x: M,
      y: y - headH,
      width: tableW,
      height: headH,
      color: rgb(0.93, 0.92, 0.89),
    });
    let cx = M;
    for (const c of cols) {
      drawText(c.title, cx + 3, y - headH + 5.5, {
        font: bold,
        size: 8,
        align: c.align,
        width: c.w - 6,
        color: INK,
      });
      cx += c.w;
    }
    page.drawLine({
      start: { x: M, y: y - headH },
      end: { x: M + tableW, y: y - headH },
      thickness: 0.7,
      color: LINE,
    });
    y -= headH;
  }

  newPage();

  const rowH = 15;
  let saldo = 0;
  let sumDuguje = 0;
  let sumPotrazuje = 0;

  rows.forEach((r, idx) => {
    if (y - rowH < M + 40) newPage();
    saldo += (r.duguje || 0) - (r.potrazuje || 0);
    sumDuguje += r.duguje || 0;
    sumPotrazuje += r.potrazuje || 0;

    let cx = M;
    const vals = {
      rb: `${idx + 1}.`,
      date: fmtDate(r.date),
      label: truncate(r.label, reg, 8.5, cols[2].w - 8),
      duguje: r.duguje ? fmt2(r.duguje) : "",
      potrazuje: r.potrazuje ? fmt2(r.potrazuje) : "",
      saldo: fmt2(saldo),
    };
    for (const c of cols) {
      drawText(vals[c.key], cx + 3, y - rowH + 4.5, {
        size: 8.5,
        align: c.align,
        width: c.w - 6,
      });
      cx += c.w;
    }
    page.drawLine({
      start: { x: M, y: y - rowH },
      end: { x: M + tableW, y: y - rowH },
      thickness: 0.4,
      color: LINE,
    });
    y -= rowH;
  });

  // UKUPNO red
  if (y - 20 < M + 30) newPage();
  let cx = M;
  const totals = {
    rb: "",
    date: "",
    label: "UKUPNO:",
    duguje: fmt2(sumDuguje),
    potrazuje: fmt2(sumPotrazuje),
    saldo: fmt2(saldo),
  };
  for (const c of cols) {
    drawText(totals[c.key], cx + 3, y - 16 + 4.5, {
      font: bold,
      size: 8.5,
      align: c.key === "label" ? "right" : c.align,
      width: c.w - 6,
    });
    cx += c.w;
  }
  page.drawLine({
    start: { x: M, y: y - 18 },
    end: { x: M + tableW, y: y - 18 },
    thickness: 0.9,
    color: INK,
  });

  // footeri sa brojem stranice (naknadno, kad znamo ukupan broj)
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    const t = `Stranica ${i + 1}/${pages.length} · ispis ${fmtDate(
      new Date().toISOString(),
    )} · poreznikalkulator.ba`;
    pg.drawText(t, {
      x: M,
      y: M - 18,
      size: 7.5,
      font: reg,
      color: MUTED,
    });
  });
  void totalPagesHolder;

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

module.exports = { buildKarticaPdf };
