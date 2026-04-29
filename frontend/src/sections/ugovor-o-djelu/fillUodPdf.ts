import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { UodTemplateData } from "./fillUodDocx";

const BLACK = rgb(0, 0, 0);

// A4 portrait
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 56;

const FS_TITLE = 14;
const FS_BODY = 11;
const FS_HEADING = 12;
const LINE_GAP = 1.45;

export async function fillUodPdf(data: UodTemplateData): Promise<Uint8Array> {
  // Use Arial (regular + bold) — same fonts already in templates folder
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

  // Word-wrap text to a max width
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
      align?: "left" | "center";
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
      }
      page.drawText(line, { x, y: y - size, size, font, color: BLACK });
      y -= lineH;
    }
    y -= opts.gapAfter ?? 0;
  };

  const writeHeading = (text: string) => {
    y -= 6;
    writeBlock(text, { font: fontBold, size: FS_HEADING, align: "center", gapAfter: 6 });
  };

  // ─── Title ───────────────────────────────────────────────────────────────
  writeBlock("U G O V O R   O   D J E L U", {
    font: fontBold,
    size: FS_TITLE,
    align: "center",
    gapAfter: 8,
  });
  if (data.brojUgovora) {
    writeBlock(`Br. ${data.brojUgovora}`, { align: "center", gapAfter: 14 });
  } else {
    y -= 14;
  }

  // ─── Intro ───────────────────────────────────────────────────────────────
  const placeText = data.mjestoZakljucenja
    ? ` u ${data.mjestoZakljucenja}`
    : "";
  writeBlock(
    `Zaključen dana ${data.datumFormatted}. godine${placeText} između:`,
    { gapAfter: 10 },
  );

  writeBlock(
    `1. ${data.naruciIme}${data.naruciAdresa ? ", " + data.naruciAdresa : ""}${data.naruciId ? ", JIB: " + data.naruciId : ""} (u daljem tekstu naručilac) i`,
    { gapAfter: 6 },
  );
  writeBlock(
    `2. ${data.izvrIme}${data.izvrAdresa ? ", " + data.izvrAdresa : ""}${data.izvrJmbg ? ", JMBG: " + data.izvrJmbg : ""} (u daljem tekstu izvršilac)`,
    { gapAfter: 12 },
  );

  // ─── Član 1 ──────────────────────────────────────────────────────────────
  writeHeading("Član 1.");
  writeBlock(
    `Naručilac posla naručuje, a Izvršilac posla prihvata ${data.predmet || "..."}.`,
    { gapAfter: 6 },
  );
  writeBlock(
    `Ugovorne strane su saglasne da se ovaj Ugovor zaključuje na period od ${data.rok || "______________________"}.`,
    { gapAfter: 10 },
  );

  // ─── Član 2 ──────────────────────────────────────────────────────────────
  writeHeading("Član 2.");
  writeBlock(
    `Naručilac se obavezuje da izvršiocu poslova isplati cijenu ugovorenog posla iz člana 1. ovog Ugovora u neto iznosu od ${data.netoFmt} KM (slovima: ${data.iznosSlovima}).`,
    { gapAfter: 6 },
  );
  writeBlock(
    data.izvrZiro
      ? `Isplata iz prethodnog stava izvršit će se na transakcijski žiro račun izvršioca posla broj ${data.izvrZiro}.`
      : `Isplata iz prethodnog stava izvršit će se na transakcijski žiro račun izvršioca posla.`,
    { gapAfter: 6 },
  );
  writeBlock("Porez po osnovu ovog ugovora snosi Naručilac.", { gapAfter: 10 });

  // ─── Član 3 ──────────────────────────────────────────────────────────────
  writeHeading("Član 3.");
  writeBlock(
    "Naručilac posla se obavezuje da izvršiocu posla obezbijedi adekvatne uslove za rad, te mu na vrijeme dostavi sve potrebne i vjerodostojne podatke i dokumenta koja su potrebna izvršiocu posla za izvršavanje svoje ugovorne obaveze iz člana 1. ovog Ugovora.",
    { gapAfter: 10 },
  );

  // ─── Član 4 ──────────────────────────────────────────────────────────────
  writeHeading("Član 4.");
  writeBlock(
    "Naručilac posla zadržava pravo da u toku izvršavanja obaveze izvršioca posla iz člana 1. ovog Ugovora vrši nadzor lično ili preko svog ovlaštenog lica, te daje upute, sugestije, prijedloge i primjedbe na rad izvršioca posla, kojih se izvršilac posla mora pridržavati.",
    { gapAfter: 10 },
  );

  // ─── Član 5 ──────────────────────────────────────────────────────────────
  writeHeading("Član 5.");
  writeBlock(
    "Ukoliko se jedna od ugovorenih strana ne bude pridržavala svojih obaveza navedenih u ovom Ugovoru, oštećena strana ima pravo raskinuti ovaj Ugovor, kao i zahtijevati od nesavjesne strane naknadu štete i učinjenih troškova.",
    { gapAfter: 10 },
  );

  // ─── Član 6 ──────────────────────────────────────────────────────────────
  writeHeading("Član 6.");
  writeBlock(
    "Ovaj Ugovor prestaje istekom roka na koji je zaključen navedenim u članu 1. stavu 2. ovog Ugovora, a takođe ga je moguće raskinuti pod uslovima da se ugovorne strane ne budu pridržavale svojih obaveza iz ovog Ugovora i ukoliko izvršilac posla ne bude prihvatao upute, sugestije, prijedloge i primjedbe naručioca posla navedene u članu 4. ovog Ugovora.",
    { gapAfter: 10 },
  );

  // ─── Član 7 ──────────────────────────────────────────────────────────────
  writeHeading("Član 7.");
  writeBlock(
    `Sve sporove koji eventualno proisteknu iz ovog Ugovora, ugovorne strane će rješavati sporazumno, a ako to ne bude moguće ugovorne strane ugovaraju nadležnost ${data.nadlezniSud || "______________________"}.`,
    { gapAfter: 10 },
  );

  // ─── Član 8 ──────────────────────────────────────────────────────────────
  writeHeading("Član 8.");
  writeBlock(
    "Ugovor je sačinjen u 2 (dva) istovjetna primjerka od kojih svaka ugovorna strana zadržava po 1 (jedan).",
    { gapAfter: 30 },
  );

  // ─── Signatures ──────────────────────────────────────────────────────────
  ensureSpace(60);
  const colW = (PAGE_W - 2 * MARGIN) / 2;
  const yLabel = y;
  const labelLeft = "Izvršilac poslova";
  const labelRight = "Naručilac poslova";
  page.drawText(labelLeft, {
    x: MARGIN,
    y: yLabel - FS_BODY,
    size: FS_BODY,
    font: fontBold,
    color: BLACK,
  });
  page.drawText(labelRight, {
    x: MARGIN + colW,
    y: yLabel - FS_BODY,
    size: FS_BODY,
    font: fontBold,
    color: BLACK,
  });
  y = yLabel - FS_BODY * LINE_GAP - 20;

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

  // Names below the lines
  y = lineY - FS_BODY - 4;
  page.drawText(data.izvrIme || "", {
    x: MARGIN,
    y,
    size: FS_BODY,
    font: fontReg,
    color: BLACK,
  });
  page.drawText(data.naruciIme || "", {
    x: MARGIN + colW,
    y,
    size: FS_BODY,
    font: fontReg,
    color: BLACK,
  });

  return doc.save();
}
