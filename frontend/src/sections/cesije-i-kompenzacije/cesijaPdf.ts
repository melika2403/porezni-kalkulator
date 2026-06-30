import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { CesijaData } from "./types";

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN_L = 75;
const MARGIN_R = 75;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

interface DrawCtx {
  page: ReturnType<PDFDocument["addPage"]>;
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  y: number;
}

function wrapText(
  text: string,
  font: DrawCtx["font"],
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function paragraph(
  ctx: DrawCtx,
  text: string,
  opts: { size?: number; bold?: boolean; align?: "left" | "center"; after?: number } = {},
): void {
  const { size = 11, bold = false, align = "left", after = 10 } = opts;
  const f = bold ? ctx.fontBold : ctx.font;
  const lineHeight = size + 6;
  for (const line of wrapText(text, f, size, CONTENT_W)) {
    let x = MARGIN_L;
    if (align === "center") x = (PAGE_W - f.widthOfTextAtSize(line, size)) / 2;
    ctx.page.drawText(line, { x, y: ctx.y, size, font: f, color: rgb(0, 0, 0) });
    ctx.y -= lineHeight;
  }
  ctx.y -= after;
}

// Paragraf sa miješanim bold/regular dijelovima i prelamanjem po riječima.
function richParagraph(
  ctx: DrawCtx,
  runs: { text: string; bold?: boolean }[],
  opts: { size?: number; after?: number } = {},
): void {
  const { size = 11, after = 10 } = opts;
  const lineHeight = size + 6;
  type Tok = { text: string; bold: boolean };
  const tokens: Tok[] = [];
  for (const r of runs) {
    for (const part of r.text.split(/(\s+)/)) {
      if (part.length) tokens.push({ text: part, bold: !!r.bold });
    }
  }
  let line: Tok[] = [];
  let lineW = 0;
  const flush = () => {
    let x = MARGIN_L;
    for (const t of line) {
      const f = t.bold ? ctx.fontBold : ctx.font;
      ctx.page.drawText(t.text, { x, y: ctx.y, size, font: f, color: rgb(0, 0, 0) });
      x += f.widthOfTextAtSize(t.text, size);
    }
    ctx.y -= lineHeight;
    line = [];
    lineW = 0;
  };
  for (const t of tokens) {
    const f = t.bold ? ctx.fontBold : ctx.font;
    const w = f.widthOfTextAtSize(t.text, size);
    if (lineW + w > CONTENT_W && line.length) {
      flush();
      if (/^\s+$/.test(t.text)) continue; // ne počinji red razmakom
    }
    line.push(t);
    lineW += w;
  }
  if (line.length) flush();
  ctx.y -= after;
}

export async function generateCesijaPdf(data: CesijaData): Promise<Blob> {
  const [fontBytes, boldFontBytes] = await Promise.all([
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes);
  const fontBold = await pdfDoc.embedFont(boldFontBytes);

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const ctx: DrawCtx = { page, font, fontBold, y: PAGE_H - 70 };

  // Pravni osnov (prije naslova)
  paragraph(
    ctx,
    "Na osnovu odredbi članova 436. do 445. Zakona o obligacionim odnosima, ugovorne strane zaključuju:",
    { size: 10.5, after: 14 },
  );

  // Naslov
  paragraph(ctx, "UGOVOR O CESIJI", { size: 18, bold: true, align: "center", after: 3 });
  paragraph(ctx, "ustupanje potraživanja i obaveza", { size: 10, align: "center", after: 18 });

  paragraph(ctx, `Zaključen u ${data.mjesto} ${data.datum} godine, između:`, {
    size: 11,
    after: 10,
  });

  const partyLine = (label: string, naziv: string, id: string, zastupnik: string) => {
    const runs: { text: string; bold?: boolean }[] = [
      { text: `${label}: `, bold: true },
      { text: naziv },
    ];
    if (id.trim()) runs.push({ text: `, JIB: ${id}` });
    if (zastupnik.trim()) runs.push({ text: `, kojeg zastupa ${zastupnik}` });
    richParagraph(ctx, runs, { size: 11, after: 7 });
  };
  partyLine("CEDENT (USTUPALAC)", data.cedentNaziv, data.cedentId, data.cedentZastupnik);
  partyLine("CESIONAR (PRIMALAC)", data.cesionarNaziv, data.cesionarId, data.cesionarZastupnik);
  partyLine("CESUS (PLATILAC)", data.cesusNaziv, data.cesusId, data.cesusZastupnik);
  ctx.y -= 8;

  // Članovi
  paragraph(ctx, "Član 1.", { bold: true, align: "center", after: 6 });
  richParagraph(
    ctx,
    [
      { text: "Cedent ustupa Cesionaru svoja potraživanja od Cesusa u iznosu od " },
      { text: data.iznosBroj, bold: true },
      { text: data.iznosSlovima ? ` (slovima: ${data.iznosSlovima}).` : "." },
    ],
    { after: 14 },
  );

  paragraph(ctx, "Član 2.", { bold: true, align: "center", after: 6 });
  paragraph(
    ctx,
    "Cesionar prihvata ustupljena potraživanja od Cedenta čime je izmirena obaveza koju Cedent ima prema Cesionaru.",
    { after: 14 },
  );

  paragraph(ctx, "Član 3.", { bold: true, align: "center", after: 6 });
  paragraph(
    ctx,
    `Ugovor je sačinjen u ${data.brojPrimjeraka} istovjetna primjerka od kojih svaka od stranaka zadržava po jedan.`,
    { after: 14 },
  );

  paragraph(ctx, "Član 4.", { bold: true, align: "center", after: 6 });
  paragraph(
    ctx,
    `Za eventualne sporove po ovom ugovoru rješavat će nadležni sud u ${data.sud}.`,
    { after: 36 },
  );

  // Potpisi: 3 kolone (CEDENT / CESIONAR / CESUS)
  const colW = CONTENT_W / 3;
  const centers = [0, 1, 2].map((i) => MARGIN_L + colW * i + colW / 2);
  const labels = ["CEDENT", "CESIONAR", "CESUS"];
  const names = [data.cedentNaziv, data.cesionarNaziv, data.cesusNaziv];
  const sigSize = 11.5;
  const nameSize = 10.5;
  const line = "______________";

  labels.forEach((lbl, i) => {
    page.drawText(lbl, {
      x: centers[i] - fontBold.widthOfTextAtSize(lbl, sigSize) / 2,
      y: ctx.y,
      size: sigSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  });
  ctx.y -= 50;
  centers.forEach((cx) => {
    page.drawText(line, {
      x: cx - font.widthOfTextAtSize(line, sigSize) / 2,
      y: ctx.y,
      size: sigSize,
      font,
      color: rgb(0, 0, 0),
    });
  });
  ctx.y -= 14;
  names.forEach((nm, i) => {
    const t = nm || "";
    page.drawText(t, {
      x: centers[i] - fontBold.widthOfTextAtSize(t, nameSize) / 2,
      y: ctx.y,
      size: nameSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  });

  const pdfBytes = await pdfDoc.save();
  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([arrayBuffer], { type: "application/pdf" });
}
