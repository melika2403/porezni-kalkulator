// Generički tabelarni PDF za robno (lager lista, popisna lista, obračun
// popisa): zaglavlje obrta, naslov, info linije, jedna ili više tabela sa
// totalima. Sve crno, puni nazivi kolona (prelamaju se), red usidren na vrh
// pa linije nikad ne prolaze kroz tekst. Isti vizuelni jezik kao KCM PDF.
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Organization } from "src/api/profile";

const M = 36;
const INK = rgb(0, 0, 0);

export type PdfCol = { label: string; w: number; right?: boolean };

export type PdfSection = {
  /** podnaslov iznad tabele (opciono) */
  heading?: string;
  cols: PdfCol[];
  rows: (string | string[])[][];
  /** red totala (bold), opciono */
  totals?: (string | string[])[];
};

export function datumHr(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
}

function wrapText(
  font: PDFFont,
  text: string,
  maxW: number,
  size: number,
  maxLines = 3,
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

export async function downloadTablePdf({
  fileName,
  landscape = false,
  org,
  title,
  subtitle,
  info = [],
  sections,
}: {
  fileName: string;
  landscape?: boolean;
  org: Organization;
  title: string;
  subtitle?: string;
  /** linije lijevo ispod naslova (npr. filteri ispisa) */
  info?: string[];
  sections: PdfSection[];
}) {
  const fontBytes = await fetch("/templates/arial.ttf").then((r) =>
    r.arrayBuffer(),
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);

  const pageSize: [number, number] = landscape
    ? [841.89, 595.28]
    : [595.28, 841.89];
  const size = 7.5;
  const lineH = 9.5;

  let page: PDFPage;
  let y = 0;
  // aktivna sekcija (za ponavljanje zaglavlja kolona na novoj strani)
  let active: { scaled: PdfCol[] } | null = null;

  function text(t: string, x: number, s: number, bold = false) {
    page.drawText(t, { x, y, size: s, font, color: INK });
    if (bold) page.drawText(t, { x: x + 0.3, y, size: s, font, color: INK });
  }

  function scaleCols(cols: PdfCol[]) {
    const contentW = pageSize[0] - 2 * M;
    const totalW = cols.reduce((s, c) => s + c.w, 0);
    return cols.map((c) => ({ ...c, w: (c.w / totalW) * contentW }));
  }

  function cellX(scaled: PdfCol[], i: number) {
    let x = M;
    for (let j = 0; j < i; j++) x += scaled[j].w;
    return x;
  }

  function drawRow(
    scaled: PdfCol[],
    values: (string | string[])[],
    { header = false, bold = false } = {},
  ) {
    const s = header ? 6.6 : size;
    const cells = values.map((v, i) => {
      if (Array.isArray(v)) return v;
      if (header) return wrapText(font, v, scaled[i].w - 5, s);
      return [v];
    });
    const rowLines = Math.max(...cells.map((c) => c.length), 1);
    const rowH = rowLines * lineH + 7;
    cells.forEach((lines, i) => {
      const c = scaled[i];
      lines.forEach((t, li) => {
        const x = c.right
          ? cellX(scaled, i) + c.w - 3 - font.widthOfTextAtSize(t, s)
          : cellX(scaled, i) + 3;
        const ty = y - (li + 1) * lineH - 1;
        page.drawText(t, { x, y: ty, size: s, font, color: INK });
        if (bold || header) {
          page.drawText(t, { x: x + 0.3, y: ty, size: s, font, color: INK });
        }
      });
    });
    page.drawLine({
      start: { x: M, y: y - rowH },
      end: { x: pageSize[0] - M, y: y - rowH },
      thickness: header ? 1 : 0.5,
      color: INK,
    });
    y -= rowH;
  }

  function newPage(first: boolean) {
    page = doc.addPage(pageSize);
    y = pageSize[1] - M - 8;
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
      const tw = font.widthOfTextAtSize(title, 12);
      text(title, (pageSize[0] - tw) / 2, 12, true);
      y -= 13;
      if (subtitle) {
        const sw = font.widthOfTextAtSize(subtitle, 8.5);
        text(subtitle, (pageSize[0] - sw) / 2, 8.5);
        y -= 13;
      }
      for (const line of info) {
        text(line, M, 8.5);
        y -= 11;
      }
      y -= 2;
      page.drawLine({
        start: { x: M, y },
        end: { x: pageSize[0] - M, y },
        thickness: 1,
        color: INK,
      });
      y -= 3;
    }
    if (active) {
      drawRow(
        active.scaled,
        active.scaled.map((c) => c.label),
        { header: true },
      );
    }
  }

  // prva strana bez aktivne sekcije (header sekcije crta petlja ispod)
  newPage(true);

  for (const section of sections) {
    const scaled = scaleCols(section.cols);
    active = { scaled };
    if (section.heading) {
      if (y - 40 < M) newPage(false);
      y -= 8;
      text(section.heading, M, 9.5, true);
      y -= 6;
    }
    drawRow(
      scaled,
      scaled.map((c) => c.label),
      { header: true },
    );
    for (const row of section.rows) {
      // tekstualne ćelije se prelamaju u max 2 reda (dugi nazivi artikala)
      const wrapped = row.map((v, i) =>
        Array.isArray(v)
          ? v
          : wrapText(font, String(v), scaled[i].w - 5, size, 2),
      );
      const rowLines = Math.max(...wrapped.map((l) => l.length), 1);
      if (y - (rowLines * lineH + 7) < M) newPage(false);
      drawRow(scaled, wrapped);
    }
    if (section.totals) {
      if (y - (lineH + 7) < M) newPage(false);
      drawRow(scaled, section.totals, { bold: true });
    }
    active = null;
  }

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(
      `PK Office · ispis ${new Date().toLocaleDateString("de-DE")}`,
      { x: M, y: M - 16, size: 7, font, color: INK },
    );
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: pageSize[0] - M - 24,
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
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
