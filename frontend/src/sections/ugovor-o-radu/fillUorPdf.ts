import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { UorTemplateData } from "./fillUorDocx";

const BLACK = rgb(0, 0, 0);

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 56;

const FS_TITLE = 14;
const FS_BODY = 11;
const FS_HEADING = 12;
const LINE_GAP = 1.45;

export async function fillUorPdf(data: UorTemplateData): Promise<Uint8Array> {
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
    y -= 4;
    writeBlock(text, { font: fontBold, size: FS_HEADING, align: "center", gapAfter: 4 });
  };

  // ─── Uvod ───
  writeBlock(
    "Na osnovu Zakona o radu Federacije Bosne i Hercegovine („Službene novine FBiH“, br. 26/16, 89/18, 44/22 i 39/24), ugovorne strane zaključuju:",
    { gapAfter: 14 },
  );

  // ─── Naslov ───
  if (data.probni_rad_block) {
    writeBlock("UGOVOR O PROBNOM RADU", {
      font: fontBold,
      size: FS_TITLE,
      align: "center",
      gapAfter: 4,
    });
  } else {
    writeBlock("UGOVOR O RADU", {
      font: fontBold,
      size: FS_TITLE,
      align: "center",
      gapAfter: 4,
    });
    writeBlock(`na ${data.tip_ugovora} vrijeme`, { align: "center", gapAfter: 4 });
  }
  writeBlock(`Br. ${data.broj_ugovora}`, { align: "center", gapAfter: 14 });

  // ─── Ugovorne strane ───
  writeBlock("Ugovorne strane", { font: fontBold, size: FS_HEADING, gapAfter: 6 });

  writeBlock(
    `1. Poslodavac: ${data.naziv_firme}, sa sjedištem u ${data.grad}, ${data.adresa_poslodavca}, JIB: ${data.jib_poslodavca}, kojeg zastupa direktor ${data.ime_poslodavca}`,
    { gapAfter: 4 },
  );
  writeBlock(
    `2. Radnik: ${data.ime_radnika}, JMBG: ${data.jmbg_radnika}, adresa: ${data.adresa_radnika}`,
    { gapAfter: 12 },
  );

  // ─── Članovi ───
  writeHeading("Član 1.");
  writeBlock(data.clan_1_tekst, { gapAfter: 8 });

  writeHeading("Član 2.");
  writeBlock(`Radni odnos zasniva se dana ${data.datum_pocetka_rada}`, { gapAfter: 8 });

  writeHeading("Član 3.");
  writeBlock(`Radnik će obavljati poslove radnog mjesta: ${data.radno_mjesto}.`, { gapAfter: 8 });

  writeHeading("Član 4.");
  writeBlock(`Mjesto rada je sjedište Poslodavca u ${data.mjesto_rada}.`, { gapAfter: 8 });

  writeHeading("Član 5.");
  writeBlock(data.clan_radno_vrijeme, { gapAfter: 8 });

  writeHeading("Član 6.");
  writeBlock(data.clan_plate, { gapAfter: 8 });

  writeHeading("Član 7.");
  writeBlock(
    "Poslodavac se obavezuje isplatiti plaću i pripadajuće naknade najkasnije do 30. dana u mjesecu za prethodni mjesec.",
    { gapAfter: 8 },
  );

  writeHeading("Član 8.");
  writeBlock(
    "Radnik ima pravo na dnevni odmor, sedmični odmor i godišnji odmor u skladu sa Zakonom o radu Federacije Bosne i Hercegovine.",
    { gapAfter: 8 },
  );

  writeHeading("Član 9.");
  writeBlock(
    "Radnik je dužan savjesno i odgovorno obavljati poslove radnog mjesta te čuvati poslovne interese Poslodavca.",
    { gapAfter: 8 },
  );

  writeHeading("Član 10.");
  writeBlock(
    "Za vrijeme trajanja radnog odnosa Radnik ne može bez prethodne pisane saglasnosti Poslodavca obavljati poslove koji predstavljaju konkurentsku djelatnost.",
    { gapAfter: 8 },
  );

  writeHeading("Član 11.");
  writeBlock(
    `Ovaj ugovor prestaje u slučajevima i pod uslovima propisanim Zakonom o radu Federacije Bosne i Hercegovine. Otkazni rok iznosi ${data.otkazni_rok}.`,
    { gapAfter: 8 },
  );

  writeHeading("Član 12.");
  writeBlock(
    "Na sva pitanja koja nisu uređena ovim ugovorom primjenjuju se odredbe Zakona o radu, kolektivnog ugovora i internih akata Poslodavca.",
    { gapAfter: 8 },
  );

  writeHeading("Član 13.");
  writeBlock(
    "Ovaj ugovor sačinjen je u dva (2) istovjetna primjerka, od kojih svaka ugovorna strana zadržava po jedan primjerak.",
    { gapAfter: 30 },
  );

  // ─── Potpisi ───
  ensureSpace(70);
  const colW = (PAGE_W - 2 * MARGIN) / 2;
  const yLabel = y;
  page.drawText("Za Poslodavca", {
    x: MARGIN,
    y: yLabel - FS_BODY,
    size: FS_BODY,
    font: fontBold,
    color: BLACK,
  });
  page.drawText("Radnik", {
    x: MARGIN + colW,
    y: yLabel - FS_BODY,
    size: FS_BODY,
    font: fontBold,
    color: BLACK,
  });
  y = yLabel - FS_BODY * LINE_GAP - 24;

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

  y = lineY - FS_BODY - 4;
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

  // Naziv firme ispod imena zastupnika (kurzivom)
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

  y -= 30;
  ensureSpace(20);
  writeBlock(`Datum: ${data.datum_ugovora}`, { align: "right" });

  return doc.save();
}
