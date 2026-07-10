// TKM (trgovačka knjiga na malo) kao PDF, A4 uspravno, po Pravilniku
// (Sl. novine FBiH 56/2025, čl. 16 i 19): kolone r.br, datum, opis promjene,
// zaduženje, razduženje; na kraju svake stranice zbir sa prenosom, na vrhu
// sljedeće donos prethodne stranice. Sve crnom bojom, bez skraćenica.
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Organization } from "src/api/profile";
import type { TkmEvent } from "src/api/lager";

const A4: [number, number] = [595.28, 841.89];
const M = 36;
const INK = rgb(0, 0, 0);

const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const datumHr = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
};

type Col = { label: string; w: number; right?: boolean };

function wrapText(
  font: PDFFont,
  text: string,
  maxW: number,
  size: number,
  maxLines = 2,
): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const probe = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(probe, size) <= maxW) {
      cur = probe;
      continue;
    }
    if (cur) lines.push(cur);
    let w = word;
    while (font.widthOfTextAtSize(w, size) > maxW && w.length > 1) {
      let cut = w.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxW) {
        cut--;
      }
      lines.push(w.slice(0, cut));
      w = w.slice(cut);
    }
    cur = w;
  }
  if (cur) lines.push(cur);
  if (lines.length === 0) lines.push("");
  return lines.slice(0, maxLines);
}

export async function downloadTkmPdf({
  org,
  godina,
  donos,
  events,
  zakljucena = false,
}: {
  org: Organization;
  godina: number;
  donos: number;
  events: TkmEvent[];
  /** istekla poslovna godina: ispis bloka o zaključenju (čl. 21) */
  zakljucena?: boolean;
}) {
  const fontBytes = await fetch("/templates/arial.ttf").then((r) =>
    r.arrayBuffer(),
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);

  const cols: Col[] = [
    { label: "R.B.", w: 30 },
    { label: "DATUM", w: 62 },
    { label: "OPIS PROMJENE", w: 250 },
    { label: "ZADUŽENJE", w: 90, right: true },
    { label: "RAZDUŽENJE", w: 90, right: true },
  ];
  const contentW = A4[0] - 2 * M;
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  const scaled = cols.map((c) => ({ ...c, w: (c.w / totalW) * contentW }));

  const size = 8;
  const lineH = 10;

  let page: PDFPage;
  let y = 0;
  // kumulativi za prenos/donos po stranici (čl. 19)
  let cumZad = 0;
  let cumRaz = 0;

  function cellX(i: number) {
    let x = M;
    for (let j = 0; j < i; j++) x += scaled[j].w;
    return x;
  }

  function drawRow(
    values: (string | string[])[],
    { header = false, bold = false } = {},
  ) {
    const s = header ? 7 : size;
    const cells = values.map((v, i) =>
      Array.isArray(v) ? v : header ? wrapText(font, v, scaled[i].w - 5, s) : [v],
    );
    const rowLines = Math.max(...cells.map((c) => c.length), 1);
    const rowH = rowLines * lineH + 6;
    cells.forEach((lines, i) => {
      const c = scaled[i];
      lines.forEach((t, li) => {
        const x = c.right
          ? cellX(i) + c.w - 3 - font.widthOfTextAtSize(t, s)
          : cellX(i) + 3;
        const ty = y - (li + 1) * lineH;
        page.drawText(t, { x, y: ty, size: s, font, color: INK });
        if (bold || header) {
          page.drawText(t, { x: x + 0.3, y: ty, size: s, font, color: INK });
        }
      });
    });
    page.drawLine({
      start: { x: M, y: y - rowH },
      end: { x: A4[0] - M, y: y - rowH },
      thickness: header ? 1 : 0.5,
      color: INK,
    });
    y -= rowH;
  }

  function text(t: string, x: number, s: number, bold = false) {
    page.drawText(t, { x, y, size: s, font, color: INK });
    if (bold) page.drawText(t, { x: x + 0.3, y, size: s, font, color: INK });
  }

  function newPage(first: boolean) {
    page = doc.addPage(A4);
    y = A4[1] - M - 8;
    if (first) {
      text(org.name, M, 11, true);
      y -= 13;
      const adresa = [org.address, org.city].filter(Boolean).join(", ");
      if (adresa) {
        text(adresa, M, 8.5);
        y -= 11;
      }
      if (org.taxNumber) {
        text(`ID broj: ${org.taxNumber}`, M, 8.5);
        y -= 11;
      }
      y -= 6;
      const title = "TRGOVAČKA KNJIGA NA MALO - Obrazac TKM";
      const tw = font.widthOfTextAtSize(title, 12);
      text(title, (A4[0] - tw) / 2, 12, true);
      y -= 13;
      const sub = `za ${godina}. godinu`;
      const sw = font.widthOfTextAtSize(sub, 8.5);
      text(sub, (A4[0] - sw) / 2, 8.5);
      y -= 14;
      page.drawLine({
        start: { x: M, y },
        end: { x: A4[0] - M, y },
        thickness: 1,
        color: INK,
      });
      y -= 3;
    }
    drawRow(
      scaled.map((c) => c.label),
      { header: true },
    );
    if (!first) {
      // donos zbira sa prethodne stranice (čl. 19)
      drawRow(
        ["", "", "Donos sa prethodne stranice", km(cumZad), km(cumRaz)],
        { bold: true },
      );
    }
  }

  function ensureSpace(needH: number) {
    if (y - needH - (lineH + 6) < M) {
      // prenos zbira na sljedeću stranicu (čl. 19)
      drawRow(
        ["", "", "Prenos na sljedeću stranicu", km(cumZad), km(cumRaz)],
        { bold: true },
      );
      newPage(false);
    }
  }

  newPage(true);

  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  let rb = 0;

  // početno stanje (saldo prenesen iz prethodne godine)
  if (donos !== 0) {
    rb += 1;
    cumZad = r2(cumZad + donos);
    drawRow([
      `${rb}.`,
      `01.01.${godina}.`,
      "Početno stanje (prenos salda iz prethodne godine)",
      km(donos),
      "",
    ]);
  }

  for (const e of events) {
    const opisLines = wrapText(font, e.opis, scaled[2].w - 6, size, 2);
    ensureSpace(opisLines.length * lineH + 6);
    rb += 1;
    cumZad = r2(cumZad + e.zaduzenje);
    cumRaz = r2(cumRaz + e.razduzenje);
    drawRow([
      `${rb}.`,
      datumHr(e.datum),
      opisLines,
      e.zaduzenje ? km(e.zaduzenje) : "",
      e.razduzenje ? km(e.razduzenje) : "",
    ]);
  }

  ensureSpace(2 * (lineH + 6));
  drawRow(["", "", "Ukupno", km(cumZad), km(cumRaz)], { bold: true });
  drawRow(
    ["", "", "Saldo (vrijednost zaliha)", km(r2(cumZad - cumRaz)), ""],
    { bold: true },
  );

  // zaključenje knjige (čl. 21): tekst + potpis odgovornog lica; ako nema
  // mjesta ide na praznu stranu (bez tabelarnog zaglavlja/prenosa)
  if (y - 70 < M) {
    page = doc.addPage(A4);
    y = A4[1] - M - 8;
  }
  y -= 22;
  if (zakljucena) {
    text(
      `Trgovačka knjiga za trgovinu na malo zaključena je sa 31.12.${godina}. godine.`,
      M,
      8.5,
    );
    y -= 12;
    text(
      `Saldo od ${km(r2(cumZad - cumRaz))} KM prenosi se u ${godina + 1}. godinu kao početno stanje.`,
      M,
      8.5,
    );
    y -= 24;
  }
  text("M.P.", M + 60, 8.5);
  text(
    "Odgovorno lice: _______________________",
    A4[0] - M - 220,
    8.5,
  );

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(
      `PK Office · ispis ${new Date().toLocaleDateString("de-DE")}`,
      { x: M, y: M - 16, size: 7, font, color: INK },
    );
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: A4[0] - M - 24,
      y: M - 16,
      size: 7.5,
      font,
      color: INK,
    });
  });

  const bytes = await doc.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `TKM-${godina}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
