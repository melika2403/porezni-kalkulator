import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { OtkazTemplateData } from "./fillOtkazDocx";

const BLACK = rgb(0, 0, 0);

const PAGE_W = 595;
const PAGE_H = 842;
// Margin i line-gap su smanjeni dovoljno da odluka uvijek stane na 1 stranicu,
// a da i dalje izgleda formalno (font ostaje isti).
const MARGIN = 45;

const FS_TITLE = 14;
const FS_BODY = 11;
const FS_HEADING = 12;
const LINE_GAP = 1.32;

export async function fillOtkazPdf(data: OtkazTemplateData): Promise<Uint8Array> {
  const [regularBytes, boldBytes] = await Promise.all([
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontReg = await doc.embedFont(regularBytes);
  const fontBold = await doc.embedFont(boldBytes);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (need: number) => {
    if (y - need < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  function wrap(text: string, font: typeof fontReg, size: number, maxW: number): string[] {
    const out: string[] = [];
    const paragraphs = text.split("\n");
    for (const para of paragraphs) {
      if (!para) {
        out.push("");
        continue;
      }
      const words = para.split(" ");
      let line = "";
      for (const w of words) {
        const candidate = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(candidate, size) > maxW && line) {
          out.push(line);
          line = w;
        } else {
          line = candidate;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }

  const writeBlock = (
    text: string,
    opts: {
      font?: typeof fontReg;
      size?: number;
      align?: "left" | "center" | "right";
      gapAfter?: number;
    } = {},
  ) => {
    const font = opts.font ?? fontReg;
    const size = opts.size ?? FS_BODY;
    const align = opts.align ?? "left";
    const maxW = PAGE_W - 2 * MARGIN;
    const lines = wrap(text, font, size, maxW);
    const lineH = size * LINE_GAP;
    for (const line of lines) {
      ensureSpace(lineH);
      let x = MARGIN;
      if (align === "center") {
        const w = font.widthOfTextAtSize(line, size);
        x = (PAGE_W - w) / 2;
      } else if (align === "right") {
        const w = font.widthOfTextAtSize(line, size);
        x = PAGE_W - MARGIN - w;
      }
      page.drawText(line, { x, y: y - size, size, font, color: BLACK });
      y -= lineH;
    }
    y -= opts.gapAfter ?? 0;
  };

  const writeHeading = (text: string) => {
    y -= 2;
    writeBlock(text, { font: fontBold, size: FS_HEADING, align: "center", gapAfter: 2 });
  };

  // ─── Uvod ───
  writeBlock(
    `Na osnovu ${data.pravna_osnova} Zakona o radu Federacije Bosne i Hercegovine („Službene novine FBiH“, br. 26/16, 89/18, 44/22 i 39/24),`,
    { gapAfter: 6 },
  );
  // Poslodavac blok
  const yBlock = y;
  writeBlock(`Poslodavac: ${data.naziv_firme}`, { font: fontBold, gapAfter: 0 });
  writeBlock(`Adresa: ${data.adresa_poslodavca}`, { gapAfter: 0 });
  writeBlock(`JIB: ${data.jib_poslodavca}`, { gapAfter: 0 });
  writeBlock(`Zastupa: direktor ${data.ime_poslodavca}`, { gapAfter: 4 });
  void yBlock;
  writeBlock(`dana ${data.datum_odluke} donosi sljedeću:`, { gapAfter: 10 });

  // ─── Naslov ───
  // "ODLUKU" jer kontekst je "donosi sljedeću [ODLUKU]" (akuzativ).
  writeBlock("ODLUKU", { font: fontBold, size: FS_TITLE, align: "center", gapAfter: 0 });
  writeBlock(data.naslov2, { font: fontBold, align: "center", gapAfter: 10 });

  // ─── Članovi ───
  writeHeading("Član 1.");
  writeBlock(
    `Ugovor o radu broj ${data.broj_ugovora}, zaključen dana ${data.datum_ugovora} između Poslodavca ${data.naziv_firme} i Radnika:`,
    { gapAfter: 2 },
  );
  writeBlock(`Ime i prezime: ${data.ime_radnika}`, { font: fontBold, gapAfter: 0 });
  writeBlock(`JMBG: ${data.jmbg_radnika}`, { gapAfter: 0 });
  writeBlock(`Adresa: ${data.adresa_radnika}`, { gapAfter: 2 });
  writeBlock(`${data.nacin_prestanka}.`, { gapAfter: 6 });

  writeHeading("Član 2.");
  writeBlock(
    `Radni odnos prestaje dana ${data.datum_prestanka} Razlog prestanka radnog odnosa je: ${data.razlog_otkaza}.`,
    { gapAfter: 6 },
  );

  writeHeading("Član 3.");
  writeBlock(
    "Radniku će biti isplaćena sva pripadajuća prava iz radnog odnosa, uključujući plaću, poreze i doprinose, u skladu sa Zakonom o radu i poreznim propisima Federacije Bosne i Hercegovine.",
    { gapAfter: 6 },
  );

  writeHeading("Član 4.");
  writeBlock("Ova odluka stupa na snagu danom donošenja.", { gapAfter: 12 });

  // ─── Dostavljeno ───
  writeBlock("Dostavljeno:", { font: fontBold, gapAfter: 2 });
  writeBlock("1. Radniku", { gapAfter: 0 });
  writeBlock("2. Nadležnoj službi za zapošljavanje", { gapAfter: 0 });
  writeBlock("3. Arhiva", { gapAfter: 22 });

  // ─── Potpisi ───
  ensureSpace(60);
  const colW = (PAGE_W - 2 * MARGIN) / 2;
  const yLabel = y;
  page.drawText("Za Poslodavca", {
    x: MARGIN,
    y: yLabel - FS_BODY,
    size: FS_BODY,
    font: fontBold,
    color: BLACK,
  });
  page.drawText("Potpis Radnika", {
    x: MARGIN + colW,
    y: yLabel - FS_BODY,
    size: FS_BODY,
    font: fontBold,
    color: BLACK,
  });
  // Razmak label → linija mora dati prostor za stvarni rukopisni potpis
  // (otprilike 30 pt = 1 cm vertikalno).
  y = yLabel - FS_BODY * LINE_GAP - 30;

  const lineY = y;
  page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: MARGIN + colW - 30, y: lineY },
    thickness: 0.7,
    color: BLACK,
  });
  page.drawLine({
    start: { x: MARGIN + colW, y: lineY },
    end: { x: MARGIN + 2 * colW - 30, y: lineY },
    thickness: 0.7,
    color: BLACK,
  });

  y = lineY - FS_BODY - 2;
  page.drawText(data.ime_poslodavca || "", {
    x: MARGIN,
    y,
    size: FS_BODY,
    font: fontReg,
    color: BLACK,
  });
  page.drawText(data.ime_radnika || "", {
    x: MARGIN + colW,
    y,
    size: FS_BODY,
    font: fontReg,
    color: BLACK,
  });

  if (data.naziv_firme) {
    y -= FS_BODY * LINE_GAP;
    page.drawText(data.naziv_firme, {
      x: MARGIN,
      y,
      size: FS_BODY - 1,
      font: fontReg,
      color: BLACK,
    });
  }

  y -= 18;
  ensureSpace(20);
  writeBlock(`Datum: ${data.datum_odluke}`, { align: "right" });

  return doc.save();
}
