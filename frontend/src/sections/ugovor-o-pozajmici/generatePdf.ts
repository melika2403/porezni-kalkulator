import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { UgovorData } from "./generateDocx";

const PT = 1; // 1 pt
const PAGE_W = 595.28; // A4
const PAGE_H = 841.89; // A4
const MARGIN_L = 85;
const MARGIN_R = 85;
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

function drawLine(
  ctx: DrawCtx,
  segments: { text: string; bold?: boolean }[],
  size = 11,
  align: "left" | "center" = "left",
  lineGap = 6,
): number {
  const { page, font, fontBold } = ctx;
  const lineHeight = size + lineGap;

  // Build full text for centering
  const fullText = segments.map((s) => s.text).join("");
  const lines = wrapText(fullText, font, size, CONTENT_W);

  for (const line of lines) {
    let x = MARGIN_L;
    if (align === "center") {
      const w = font.widthOfTextAtSize(line, size);
      x = (PAGE_W - w) / 2;
    }

    // For centered/simple lines draw as-is
    if (align === "center" || segments.length === 1) {
      const f = segments[0]?.bold ? fontBold : font;
      page.drawText(line, { x, y: ctx.y, size, font: f, color: rgb(0, 0, 0) });
    } else {
      // Multi-segment: draw segments sequentially (only for single-line content)
      let curX = MARGIN_L;
      for (const seg of segments) {
        const f = seg.bold ? fontBold : font;
        page.drawText(seg.text, {
          x: curX,
          y: ctx.y,
          size,
          font: f,
          color: rgb(0, 0, 0),
        });
        curX += f.widthOfTextAtSize(seg.text, size);
      }
    }

    ctx.y -= lineHeight;
  }

  return ctx.y;
}

function drawParagraph(
  ctx: DrawCtx,
  segments: { text: string; bold?: boolean }[],
  size = 11,
  align: "left" | "center" = "left",
  afterGap = 10,
): void {
  const { page, font, fontBold } = ctx;
  const lineHeight = size + 6;

  const fullText = segments.map((s) => s.text).join("");
  const lines = wrapText(fullText, font, size, CONTENT_W);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let x = MARGIN_L;

    if (align === "center") {
      const w = font.widthOfTextAtSize(line, size);
      x = (PAGE_W - w) / 2;
    }

    if (align === "center" || segments.length === 1) {
      const f = segments[0]?.bold ? fontBold : font;
      page.drawText(line, { x, y: ctx.y, size, font: f, color: rgb(0, 0, 0) });
    } else {
      // For multi-segment paragraphs, only the first line gets rich rendering
      if (i === 0) {
        let curX = MARGIN_L;
        let remaining = line;
        for (const seg of segments) {
          if (!remaining) break;
          const portion =
            seg.text.length <= remaining.length ? seg.text : remaining;
          const f = seg.bold ? fontBold : font;
          page.drawText(portion, {
            x: curX,
            y: ctx.y,
            size,
            font: f,
            color: rgb(0, 0, 0),
          });
          curX += f.widthOfTextAtSize(portion, size);
          remaining = remaining.slice(portion.length);
        }
      } else {
        page.drawText(line, {
          x: MARGIN_L,
          y: ctx.y,
          size,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    ctx.y -= lineHeight;
  }

  ctx.y -= afterGap;
}

export async function generatePdf(data: UgovorData): Promise<Blob> {
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

  const {
    vrsta,
    datum,
    mjesto,
    zajmodavac,
    zajmoprimac,
    zajmodavacAdresa,
    zajmoprimacAdresa,
    zajmodavacID,
    zajmoprimacID,
    iznos,
    uvjetiDavanja,
    svrha,
    ziroRacun,
    banka,
    kamatnaStopa,
    napomene,
    brojPrimjeraka,
    kopijePoPrimjerku,
  } = data;

  // Title
  drawParagraph(
    ctx,
    [{ text: "U  G  O  V  O  R", bold: true }],
    14,
    "center",
    4,
  );
  drawParagraph(
    ctx,
    [{ text: `O   ${vrsta.toUpperCase()}   POZAJMICI`, bold: true }],
    14,
    "center",
    20,
  );

  // Preamble
  drawParagraph(
    ctx,
    [
      { text: "Zaključen dana " },
      { text: datum, bold: true },
      { text: " godine u " },
      { text: mjesto, bold: true },
      { text: "  između:" },
    ],
    11,
    "left",
    8,
  );

  // Parties
  drawParagraph(
    ctx,
    [
      { text: "Zajmodavac " },
      { text: zajmodavac, bold: true },
      { text: `, ${zajmodavacAdresa}, ${zajmodavacID}`, bold: true },
      { text: " (u daljem tekstu zajmodavac)  i" },
    ],
    11,
    "left",
    8,
  );

  drawParagraph(
    ctx,
    [
      { text: "Zajmoprimac " },
      { text: zajmoprimac, bold: true },
      { text: `, ${zajmoprimacAdresa}, ${zajmoprimacID}`, bold: true },
      { text: " (u daljem tekstu zajmoprimac)." },
    ],
    11,
    "left",
    14,
  );

  // Član 1
  drawParagraph(ctx, [{ text: "Član 1.", bold: true }], 11, "center", 6);
  drawParagraph(
    ctx,
    [
      {
        text: "Zajmodavac daje, a zajmoprimac prima zajam-pozajmicu u iznosu od ",
      },
      { text: iznos, bold: true },
    ],
    11,
    "left",
    14,
  );

  // Član 2
  drawParagraph(ctx, [{ text: "Član 2.", bold: true }], 11, "center", 6);
  drawParagraph(
    ctx,
    [
      {
        text: `Zajam-pozajmica se daje ${vrsta} ${uvjetiDavanja}. Svrha pozajmice je ${svrha}`,
      },
    ],
    11,
    "left",
    14,
  );

  // Član 3
  drawParagraph(ctx, [{ text: "Član 3.", bold: true }], 11, "center", 6);
  drawParagraph(
    ctx,
    [
      {
        text: "Zajmodavac će uplatiti iznos iz Člana 1. ovog ugovora na žiro račun ",
      },
      { text: ziroRacun, bold: true },
      { text: " otvoren kod " },
      { text: banka, bold: true },
    ],
    11,
    "left",
    14,
  );

  // Član 4
  drawParagraph(ctx, [{ text: "Član 4.", bold: true }], 11, "center", 6);
  drawParagraph(
    ctx,
    [
      {
        text: "Na ime ugovorenog zajma-pozajmice iz Člana 1. ovog ugovora, ugovorena kamatna stopa iznosi ",
      },
      { text: kamatnaStopa, bold: true },
      { text: "." },
    ],
    11,
    "left",
    14,
  );

  // Član 5
  drawParagraph(ctx, [{ text: "Član 5.", bold: true }], 11, "center", 6);
  drawParagraph(
    ctx,
    [
      {
        text: `Ugovorene strane u svemu prihvataju odredbe ovog ugovora ${napomene}.`,
      },
    ],
    11,
    "left",
    14,
  );

  // Član 6
  drawParagraph(ctx, [{ text: "Član 6.", bold: true }], 11, "center", 6);
  drawParagraph(
    ctx,
    [
      {
        text: `Ovaj ugovor sačinjen je u ${brojPrimjeraka}, od kojih svaka ugovorena strana zadržava po ${kopijePoPrimjerku}.`,
      },
    ],
    11,
    "left",
    30,
  );

  // Signature block
  const sigY = ctx.y;
  const colLeft = MARGIN_L + 20;
  const colRight = PAGE_W / 2 + 20;

  page.drawText("Z A J M O D A V A C", {
    x: colLeft,
    y: sigY,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText("Z A J M O P R I M A C", {
    x: colRight,
    y: sigY,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  ctx.y -= 18;
  page.drawText("_______________________", {
    x: colLeft,
    y: ctx.y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText("_______________________________", {
    x: colRight,
    y: ctx.y,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });

  ctx.y -= 16;
  page.drawText(zajmodavac, {
    x: colLeft,
    y: ctx.y,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText(zajmoprimac, {
    x: colRight,
    y: ctx.y,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([arrayBuffer], { type: "application/pdf" });
}
