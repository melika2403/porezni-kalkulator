// Obrazac ONŠ: obračun naknada za korištenje, zaštitu i unapređenje šuma.
// Replika obrasca iz prakse (predaje se ručno u Poreznu upravu): zaglavlje
// obveznika, tabela sa sekcijama 1.a (korištenje državnih šuma, za obrte
// prazna) i 2.b (općekorisne funkcije šuma, 0,07% od ukupnog prihoda, 100%
// budžet kantona), kolone uplata po kvartalima, datum + M.P. + potpis.
// A4 POLOŽENO kao original: 11 kolona dobije duplo više prostora.
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const A4: [number, number] = [841.89, 595.28];
const M = 42;
const INK = rgb(0, 0, 0);

const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export type OnsData = {
  nazivObrta: string;
  mjesto: string;
  sifraDjelatnosti: string;
  jib: string;
  ziroRacun: string;
  /** display format DD.MM.GGGG. */
  periodOd: string;
  periodDo: string;
  /** stopa u %, npr. 0.07 */
  stopa: number;
  osnovica: number;
  naknada: number;
  /** uplate po kvartalima (1-4), 0 = prazno */
  uplate: [number, number, number, number];
  datum: string;
};

function wrap(font: PDFFont, text: string, maxW: number, size: number) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const probe = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(probe, size) <= maxW) cur = probe;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export async function buildOnsPdf(d: OnsData): Promise<Uint8Array> {
  const fontBytes = await fetch("/templates/arial.ttf").then((r) =>
    r.arrayBuffer(),
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  const page: PDFPage = doc.addPage(A4);
  let y = A4[1] - M - 6;

  const text = (t: string, x: number, s: number, bold = false) => {
    page.drawText(t, { x, y, size: s, font, color: INK });
    if (bold) page.drawText(t, { x: x + 0.3, y, size: s, font, color: INK });
  };

  // zaglavlje obveznika (label | vrijednost sa linijom)
  const red = (label: string, value: string) => {
    text(label, M, 9);
    text(value, M + 150, 10, true);
    y -= 7;
    page.drawLine({
      start: { x: M + 145, y },
      end: { x: A4[0] - M, y },
      thickness: 0.5,
      color: INK,
    });
    y -= 16;
  };
  red("Obveznik uplate:", d.nazivObrta);
  red("Mjesto:", d.mjesto);
  red("Šifra djelatnosti:", d.sifraDjelatnosti);
  red("Identifikacioni broj:", d.jib);
  red("Broj žiro računa:", d.ziroRacun);

  y -= 8;
  const t1 = "ONŠ";
  text(t1, (A4[0] - font.widthOfTextAtSize(t1, 11)) / 2, 11, true);
  y -= 16;
  const t2 = "OBRAČUN NAKNADA ZA KORIŠTENJE, ZAŠTITU I UNAPREĐENJE ŠUMA";
  text(t2, (A4[0] - font.widthOfTextAtSize(t2, 11)) / 2, 11, true);
  y -= 14;
  const t3 = `ZA PERIOD od ${d.periodOd} do ${d.periodDo}`;
  text(t3, (A4[0] - font.widthOfTextAtSize(t3, 9.5)) / 2, 9.5);
  y -= 18;

  // tabela: 11 kolona kao original
  const cols = [
    { label: "Redni broj", w: 26 },
    { label: "Vrsta naknade", w: 141 },
    { label: "Oznaka za AOP", w: 32 },
    { label: "Stopa %", w: 30 },
    { label: "Osnovica (KM)", w: 52 },
    { label: "1. kvartal", w: 38, grupa: true },
    { label: "2. kvartal", w: 38, grupa: true },
    { label: "1. + 2. kvartal", w: 40, grupa: true },
    { label: "3. kvartal", w: 38, grupa: true },
    { label: "4. kvartal", w: 38, grupa: true },
    { label: "UKUPNO (8+9+10)", w: 42 },
  ];
  const totalW = cols.reduce((a, c) => a + c.w, 0);
  const scale = (A4[0] - 2 * M) / totalW;
  const widths = cols.map((c) => c.w * scale);
  const xAt = (i: number) => M + widths.slice(0, i).reduce((a, w) => a + w, 0);
  const tableRight = A4[0] - M;

  const rowLines = (topY: number, h: number) => {
    // vanjske i unutrašnje vertikale za red visine h ispod topY
    page.drawLine({
      start: { x: M, y: topY },
      end: { x: M, y: topY - h },
      thickness: 0.6,
      color: INK,
    });
    for (let i = 1; i <= cols.length; i++) {
      const x = i === cols.length ? tableRight : xAt(i);
      page.drawLine({
        start: { x, y: topY },
        end: { x, y: topY - h },
        thickness: 0.6,
        color: INK,
      });
    }
  };
  const hLine = (atY: number) =>
    page.drawLine({
      start: { x: M, y: atY },
      end: { x: tableRight, y: atY },
      thickness: 0.6,
      color: INK,
    });

  // zaglavlje: red 1 = "Uplata naknada" iznad kvartalnih kolona
  const headTop = y;
  const head1H = 12;
  const head2H = 30;
  hLine(headTop);
  // grupni natpis
  const grupaX = xAt(5);
  const grupaW = widths[5] + widths[6] + widths[7] + widths[8] + widths[9];
  y = headTop - 9.5;
  const gl = "Uplata naknada";
  text(gl, grupaX + (grupaW - font.widthOfTextAtSize(gl, 8)) / 2, 8, true);
  // vertikale reda 1: samo vanjske + granice grupe
  for (const x of [M, xAt(5), xAt(10), tableRight]) {
    page.drawLine({
      start: { x, y: headTop },
      end: { x, y: headTop - head1H },
      thickness: 0.6,
      color: INK,
    });
  }
  // kolone koje se protežu kroz oba reda zaglavlja (bez horizontale)
  for (const i of [1, 2, 3, 4]) {
    page.drawLine({
      start: { x: xAt(i), y: headTop },
      end: { x: xAt(i), y: headTop - head1H },
      thickness: 0.6,
      color: INK,
    });
  }
  page.drawLine({
    start: { x: xAt(5), y: headTop - head1H },
    end: { x: tableRight, y: headTop - head1H },
    thickness: 0.6,
    color: INK,
  });
  // red 2 zaglavlja: nazivi kolona
  const head2Top = headTop - head1H;
  for (let i = 0; i < cols.length; i++) {
    const lines = wrap(font, cols[i].label, widths[i] - 6, 7.5);
    let ly = head2Top - 9;
    for (const ln of lines.slice(0, 3)) {
      const lw = font.widthOfTextAtSize(ln, 7.5);
      page.drawText(ln, {
        x: xAt(i) + (widths[i] - lw) / 2,
        y: ly,
        size: 7.5,
        font,
        color: INK,
      });
      ly -= 8.5;
    }
  }
  rowLines(head2Top, head2H);
  hLine(head2Top - head2H);
  // red sa brojevima kolona 1-11
  let curY = head2Top - head2H;
  const numH = 10;
  for (let i = 0; i < cols.length; i++) {
    const n = String(i + 1);
    const lw = font.widthOfTextAtSize(n, 7);
    page.drawText(n, {
      x: xAt(i) + (widths[i] - lw) / 2,
      y: curY - 7.5,
      size: 7,
      font,
      color: INK,
    });
  }
  rowLines(curY, numH);
  hLine(curY - numH);
  curY -= numH;

  // red tabele: rb + naziv (wrap) + vrijednosti po kolonama
  const tableRow = (
    rb: string,
    naziv: string,
    vals: (string | null)[],
    bold = false,
  ) => {
    const nazivLines = wrap(font, naziv, widths[1] - 8, 8);
    const h = Math.max(15, nazivLines.length * 9.5 + 6);
    // rb
    page.drawText(rb, {
      x: xAt(0) + 3,
      y: curY - 10.5,
      size: 8,
      font,
      color: INK,
    });
    let ly = curY - 10.5;
    for (const ln of nazivLines) {
      page.drawText(ln, { x: xAt(1) + 4, y: ly, size: 8, font, color: INK });
      if (bold) {
        page.drawText(ln, {
          x: xAt(1) + 4.3,
          y: ly,
          size: 8,
          font,
          color: INK,
        });
      }
      ly -= 9.5;
    }
    // vrijednosti (kolone 3-11 = index 2-10), desno poravnate
    vals.forEach((v, vi) => {
      if (v == null || v === "") return;
      const i = vi + 2;
      const lw = font.widthOfTextAtSize(v, 8);
      page.drawText(v, {
        x: xAt(i) + widths[i] - lw - 4,
        y: curY - 10.5,
        size: 8,
        font,
        color: INK,
      });
    });
    rowLines(curY, h);
    hLine(curY - h);
    curY -= h;
  };

  const u = d.uplate;
  const u12 = u[0] + u[1];
  // kolona UKUPNO ima zaglavlje "8+9+10" = (1.+2. kvartal) + 3. kvartal + 4.
  // kvartal, dakle zbir svih uplaćenih kvartala (ne obračunata naknada)
  const uUkupno = u12 + u[2] + u[3];
  const fmtU = (n: number) => (n > 0 ? km(n) : "");

  tableRow(
    "1. a",
    "Naknada za korištenje državnih šuma (7% od prihoda od drveta računajući cijenu drveta na panju i prihoda ostvarenog od nedrvnih šumskih proizvoda)",
    [],
    true,
  );
  tableRow("", "Budžet Federacije BiH", ["", "1%"]);
  tableRow("", "Budžet Kantona", ["", "1%"]);
  tableRow("", "Račun Općina", ["", "5%"]);
  tableRow(
    "2. b",
    `Naknada za općekorisne funkcije šuma (${String(d.stopa).replace(".", ",")}% od ukupno ostvarenog prihoda)`,
    [],
    true,
  );
  tableRow("", "Budžet Federacije BiH", ["", "/"]);
  tableRow("", "Budžet Kantona", [
    "",
    "100%",
    km(d.osnovica),
    fmtU(u[0]),
    fmtU(u[1]),
    u12 > 0 ? km(u12) : "",
    fmtU(u[2]),
    fmtU(u[3]),
    uUkupno > 0 ? km(uUkupno) : "",
  ]);

  // potpis
  y = curY - 28;
  text(`Datum: ${d.datum}`, M + 60, 9);
  y -= 30;
  text("M. P.", M + 150, 9);
  const potpisX = A4[0] - M - 200;
  page.drawLine({
    start: { x: potpisX, y: y - 2 },
    end: { x: potpisX + 170, y: y - 2 },
    thickness: 0.6,
    color: INK,
  });
  page.drawText("Odgovorno lice", {
    x: potpisX + 50,
    y: y - 13,
    size: 8.5,
    font,
    color: INK,
  });

  return doc.save();
}
