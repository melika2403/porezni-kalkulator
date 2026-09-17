import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { RjesenjeComposed } from "./composed";
import { uklopiMemorandum, type RjesenjeRenderOpcije } from "./memorandum";

// Memorandum ide preko cijele širine strane (tako su dizajnirani), visina
// ograničena da naslov i tekst ostanu na prvoj strani.
const MEMORANDUM_MAX_H = 120;

const BLACK = rgb(0, 0, 0);
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 56;

const FS_TITLE = 15;
const FS_HEADER = 12.5;
const FS_BODY = 11;
const LINE_GAP = 1.45;

const DEFAULT_DOSTAVITI = ["imenovanom radniku", "računovodstvu", "arhivi"];

// Fontovi se učitaju jednom po učitavanju stranice i dijele kroz sva generisanja
// (embedFont kopira bajtove, pa je sigurno koristiti isti ArrayBuffer više puta).
let fontsPromise: Promise<[ArrayBuffer, ArrayBuffer]> | null = null;
function loadFonts(): Promise<[ArrayBuffer, ArrayBuffer]> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
      fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
    ]);
  }
  return fontsPromise;
}

export async function fillRjesenjePdf(
  data: RjesenjeComposed,
  opcije: RjesenjeRenderOpcije = {},
): Promise<Uint8Array> {
  const [regularBytes, boldBytes] = await loadFonts();

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontReg = await doc.embedFont(regularBytes);
  const fontBold = await doc.embedFont(boldBytes);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Memorandum klijenta umjesto tekstualnog zaglavlja (samo prva strana,
  // nastavak dokumenta nema zaglavlje ni inače). Greška pri ugradnji vraća
  // obično zaglavlje, dokument se uvijek generiše.
  let memorandumNacrtan = false;
  if (opcije.memorandum) {
    try {
      const m = opcije.memorandum;
      const img = m.tip === "png" ? await doc.embedPng(m.bytes) : await doc.embedJpg(m.bytes);
      const { width, height } = uklopiMemorandum(m, PAGE_W, MEMORANDUM_MAX_H);
      page.drawImage(img, { x: (PAGE_W - width) / 2, y: PAGE_H - height, width, height });
      y = PAGE_H - height - 18;
      memorandumNacrtan = true;
    } catch {
      memorandumNacrtan = false;
    }
  }

  const ensureSpace = (need: number) => {
    if (y - need < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  function wrap(
    text: string,
    font: typeof fontReg,
    size: number,
    maxW: number,
  ): string[] {
    const out: string[] = [];
    for (const para of text.split("\n")) {
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
      indent?: number;
    } = {},
  ) => {
    const font = opts.font ?? fontReg;
    const size = opts.size ?? FS_BODY;
    const align = opts.align ?? "left";
    const indent = opts.indent ?? 0;
    const maxW = PAGE_W - 2 * MARGIN - indent;
    const lines = wrap(text, font, size, maxW);
    const lineH = size * LINE_GAP;
    for (const line of lines) {
      ensureSpace(lineH);
      let x = MARGIN + indent;
      if (align === "center") {
        x = (PAGE_W - font.widthOfTextAtSize(line, size)) / 2;
      } else if (align === "right") {
        x = PAGE_W - MARGIN - font.widthOfTextAtSize(line, size);
      }
      page.drawText(line, { x, y: y - size, size, font, color: BLACK });
      y -= lineH;
    }
    y -= opts.gapAfter ?? 0;
  };

  // Zaglavlje firme (tekst), osim kad ga je zamijenio memorandum
  if (!memorandumNacrtan) {
    for (const line of data.zaglavlje) {
      writeBlock(line, { font: fontBold, size: FS_HEADER });
    }
    y -= 10;
  }

  // Pravni osnov
  writeBlock(data.pravniOsnov, { gapAfter: 8 });

  // Broj + mjesto/datum
  writeBlock(`Broj: ${data.brojAkta}`, {});
  writeBlock(data.mjestoDatum, { gapAfter: 14 });

  // Naslov
  writeBlock(data.naslov, {
    font: fontBold,
    size: FS_TITLE,
    align: "center",
    gapAfter: 14,
  });

  // Uvod
  if (data.uvod) writeBlock(data.uvod, { gapAfter: 6 });

  // Stavke
  if (data.stavke?.length) {
    for (const s of data.stavke) {
      writeBlock(`-  ${s}`, { gapAfter: 4, indent: 14 });
    }
    y -= 4;
  }

  // Pasusi
  if (data.paragrafi?.length) {
    for (const p of data.paragrafi) {
      writeBlock(p, { gapAfter: 8 });
    }
  }
  y -= 4;

  // Obrazloženje
  if (data.obrazlozenje) {
    writeBlock("Obrazloženje", { font: fontBold, gapAfter: 4 });
    writeBlock(data.obrazlozenje, { gapAfter: 12 });
  }

  // Pouka o pravnom lijeku
  if (data.pouka) {
    writeBlock(`Pouka o pravnom lijeku: ${data.pouka}`, { gapAfter: 16 });
  }

  // Dostaviti (rezerviši visinu cijelog bloka da se ne prelomi preko stranice).
  // Potvrde prosljeđuju praznu listu (dostaviti: []) pa se blok preskače.
  const dostavitiList = data.dostaviti ?? DEFAULT_DOSTAVITI;
  if (dostavitiList.length > 0) {
    ensureSpace(96);
    writeBlock("Dostaviti:", { font: fontBold, gapAfter: 2 });
    for (const d of dostavitiList) {
      writeBlock(`-  ${d}`, { indent: 10 });
    }
    y -= 28;
  }

  // Potpis. Aneks (potpisRadnik) ima dvije kolone: lijevo radnik, desno
  // poslodavac. Ostali dokumenti imaju samo POSLODAVAC desno.
  if (data.potpisRadnik) {
    ensureSpace(124);
    const colW = (PAGE_W - 2 * MARGIN) / 2;
    const leftCenter = MARGIN + colW / 2;
    const rightCenter = MARGIN + colW + colW / 2;
    // Iscrtaj jedan red teksta centriran oko date X-ose (bez pomicanja y).
    const centeredAt = (
      text: string,
      cx: number,
      font: typeof fontReg,
      size: number,
    ) => {
      const w = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: cx - w / 2, y: y - size, size, font, color: BLACK });
    };
    const row = (
      lijevo: { text: string; bold?: boolean; size?: number },
      desno: { text: string; bold?: boolean; size?: number },
      gap: number,
    ) => {
      const sizeL = lijevo.size ?? FS_BODY;
      const sizeR = desno.size ?? FS_BODY;
      const lineH = Math.max(sizeL, sizeR) * LINE_GAP;
      ensureSpace(lineH);
      if (lijevo.text)
        centeredAt(lijevo.text, leftCenter, lijevo.bold ? fontBold : fontReg, sizeL);
      if (desno.text)
        centeredAt(desno.text, rightCenter, desno.bold ? fontBold : fontReg, sizeR);
      y -= lineH + gap;
    };
    row({ text: "RADNIK", bold: true }, { text: "POSLODAVAC", bold: true }, 26);
    row(
      { text: "_____________________" },
      { text: "_____________________" },
      4,
    );
    row({ text: data.potpisRadnik }, { text: data.potpisnik }, 0);
    return doc.save();
  }

  ensureSpace(124);
  writeBlock("POSLODAVAC", { align: "right", font: fontBold, gapAfter: 24 });
  writeBlock("_____________________", { align: "right", gapAfter: 2 });
  if (data.potpisnik) {
    writeBlock(data.potpisnik, { align: "right" });
  }

  return doc.save();
}
