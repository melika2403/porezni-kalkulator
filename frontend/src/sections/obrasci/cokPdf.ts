// Obrazac ČOK: godišnji pregled obračunate i uplaćene članarine Obrtničkoj
// komori kantona. Replika zvaničnog obrasca (predaje se ručno u Poreznu
// upravu): zaglavlje PU FBiH sa kantonalnim uredom i ispostavom, Dio 1
// (podaci o obvezniku, JIB u kućicama), Dio 2 (obračun: osnovica doprinosa
// x mjeseci, stopa, obračunato, uplaćeno, razlika), Dio 3 (izjava).
import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const A4: [number, number] = [595.28, 841.89];
const M = 46;
const INK = rgb(0, 0, 0);

const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export type CokData = {
  godina: number;
  /** sjedište kantonalnog poreznog ureda, npr. "Bihać" */
  uredGrad: string;
  /** genitiv kantona za naslov, npr. "Unsko-sanskog kantona" */
  kantonGenitiv: string;
  ispostava: string;
  jib: string;
  obrtnik: string;
  nazivObrta: string;
  sjediste: string;
  clanUdruzenja: boolean;
  nazivUdruzenja: string;
  mjesecnaOsnovica: number;
  mjeseci: number;
  ukupno: number;
  /** stopa u %, npr. 0.5 */
  stopa: number;
  clanarina: number;
  uplaceno: number;
  razlika: number;
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

export async function buildCokPdf(d: CokData): Promise<Uint8Array> {
  const fontBytes = await fetch("/templates/arial.ttf").then((r) =>
    r.arrayBuffer(),
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  const page = doc.addPage(A4);
  let y = A4[1] - M;

  const text = (t: string, x: number, s: number, bold = false, atY = y) => {
    page.drawText(t, { x, y: atY, size: s, font, color: INK });
    if (bold) {
      page.drawText(t, { x: x + 0.3, y: atY, size: s, font, color: INK });
    }
  };

  // zaglavlje: institucije lijevo, oznaka obrasca desno
  const lijevo = [
    "Bosna i Hercegovina",
    "FEDERACIJA BOSNE I HERCEGOVINE",
    "Federalno ministarstvo finansija/financija",
    "POREZNA UPRAVA FEDERACIJE BiH",
    `Kantonalni porezni ured ${d.uredGrad}`,
    `Ispostava ${d.ispostava}`,
  ];
  let ly = y;
  for (const [i, ln] of lijevo.entries()) {
    text(ln, M, 8.5, i === 3 || i === 4, ly);
    ly -= 11;
  }
  text("Obrazac ČOK", A4[0] - M - 90, 11, true, y);
  // DLN kućica
  page.drawRectangle({
    x: A4[0] - M - 90,
    y: y - 42,
    width: 90,
    height: 24,
    borderColor: INK,
    borderWidth: 0.8,
  });
  text("DLN", A4[0] - M - 86, 8, false, y - 32);

  y = ly - 18;

  // naslov
  const t1 = "GODIŠNJI PREGLED";
  text(t1, (A4[0] - font.widthOfTextAtSize(t1, 13)) / 2, 13, true);
  y -= 15;
  const t2 = "obračunate i uplaćene članarine Obrtničkoj komori";
  text(t2, (A4[0] - font.widthOfTextAtSize(t2, 10.5)) / 2, 10.5);
  y -= 13;
  const t3 = d.kantonGenitiv;
  text(t3, (A4[0] - font.widthOfTextAtSize(t3, 10.5)) / 2, 10.5, true);
  y -= 13;
  const t4 = `za period od 01.01. do 31.12.${d.godina}.`;
  text(t4, (A4[0] - font.widthOfTextAtSize(t4, 9.5)) / 2, 9.5);
  y -= 24;

  // Dio 1
  text("Dio 1 - Podaci o obvezniku uplate članarine Obrtničkoj komori", M, 10, true);
  y -= 18;

  // JIB kućice
  text("1) JIB:", M, 9);
  const jibDigits = d.jib.replace(/\D/g, "").slice(0, 13).padEnd(13, " ");
  const boxW = 17;
  let bx = M + 60;
  for (let i = 0; i < 13; i++) {
    page.drawRectangle({
      x: bx,
      y: y - 5,
      width: boxW,
      height: 16,
      borderColor: INK,
      borderWidth: 0.7,
    });
    const ch = jibDigits[i].trim();
    if (ch) {
      const cw = font.widthOfTextAtSize(ch, 10);
      text(ch, bx + (boxW - cw) / 2, 10, false, y - 1);
    }
    bx += boxW;
  }
  y -= 26;

  const poljeRed = (label: string, value: string) => {
    text(label, M, 9);
    text(value, M + 175, 10, true);
    y -= 7;
    page.drawLine({
      start: { x: M + 170, y },
      end: { x: A4[0] - M, y },
      thickness: 0.5,
      color: INK,
    });
    y -= 16;
  };
  poljeRed("2) OBRTNIK (prezime i ime):", d.obrtnik);
  poljeRed("3) NAZIV OBRTA:", d.nazivObrta);
  poljeRed("4) SJEDIŠTE I ADRESA:", d.sjediste);

  // 5) član udruženja (kućice) + 6) naziv udruženja
  text("5) Obrtnik je član strukovnog ili općeg udruženja:", M, 9);
  const daX = M + 240;
  const box = (x: number, checked: boolean) => {
    page.drawRectangle({
      x,
      y: y - 2,
      width: 10,
      height: 10,
      borderColor: INK,
      borderWidth: 0.7,
    });
    if (checked) text("X", x + 2.4, 8.5, true, y - 0.5);
  };
  text("DA", daX - 16, 9);
  box(daX, d.clanUdruzenja);
  text("NE", daX + 24, 9);
  box(daX + 40, !d.clanUdruzenja);
  text("6) Naziv udruženja:", daX + 70, 9);
  if (d.nazivUdruzenja) text(d.nazivUdruzenja, daX + 150, 9, true);
  y -= 26;

  // Dio 2: tabela obračuna
  text("Dio 2 - Podaci o obračunu i uplati članarine Obrtničkoj komori", M, 10, true);
  y -= 14;

  const colRb = 40;
  const colIznos = 120;
  const colEl = A4[0] - 2 * M - colRb - colIznos;
  const rows: [string, string, string, boolean][] = [
    ["Redni broj", "ELEMENTI", "IZNOS (KM)", true],
    [
      "1.",
      "Osnovica za obračun doprinosa (podatak sa rednog broja 10. obrasca 2002)",
      `${km(d.mjesecnaOsnovica)} x ${d.mjeseci}`,
      false,
    ],
    ["2.", "Ukupno (redni broj 1.)", km(d.ukupno), false],
    [
      "*3.",
      "Stopa za obračun članarine",
      `${String(d.stopa).replace(".", ",")} %`,
      false,
    ],
    [
      "4.",
      `Obračunata članarina za period od 01.01. do 31.12.${d.godina}. (redni broj 2. x redni broj 3.)`,
      km(d.clanarina),
      false,
    ],
    [
      "5.",
      `Uplaćeno za obračunski period od 01.01. do 31.12.${d.godina}.`,
      d.uplaceno > 0 ? km(d.uplaceno) : "-",
      false,
    ],
    ["6.", "Razlika za uplatu", km(d.razlika), true],
  ];
  const xRb = M;
  const xEl = M + colRb;
  const xIz = M + colRb + colEl;
  const tableTop = y;
  let curY = y;
  for (const [rb, el, iznos, bold] of rows) {
    const elLines = wrap(font, el, colEl - 10, 8.5);
    const h = Math.max(16, elLines.length * 10 + 7);
    text(rb, xRb + 4, 8.5, bold, curY - 11);
    let ey = curY - 11;
    for (const ln of elLines) {
      text(ln, xEl + 5, 8.5, bold, ey);
      ey -= 10;
    }
    const iw = font.widthOfTextAtSize(iznos, 9);
    text(iznos, xIz + colIznos - iw - 6, 9, true, curY - 11);
    // linije reda
    page.drawLine({
      start: { x: M, y: curY - h },
      end: { x: A4[0] - M, y: curY - h },
      thickness: 0.6,
      color: INK,
    });
    curY -= h;
  }
  // vanjski okvir i vertikale
  page.drawLine({
    start: { x: M, y: tableTop },
    end: { x: A4[0] - M, y: tableTop },
    thickness: 0.6,
    color: INK,
  });
  for (const x of [M, xEl, xIz, A4[0] - M]) {
    page.drawLine({
      start: { x, y: tableTop },
      end: { x, y: curY },
      thickness: 0.6,
      color: INK,
    });
  }
  y = curY - 12;

  const fusnota =
    "*Odluku o visini stope za obračun članarine Skupština Obrtničke komore Federacije BiH, u pravilu, donosi krajem tekuće godine, za narednu budžetsku godinu.";
  for (const ln of wrap(font, fusnota, A4[0] - 2 * M, 7.5)) {
    text(ln, M, 7.5);
    y -= 9.5;
  }
  y -= 16;

  // Dio 3
  text("Dio 3 - Izjava obveznika uplate članarine Obrtničkoj komori", M, 10, true);
  y -= 16;
  const izjava =
    "Upoznat sam sa sankcijama propisanim Zakonom o Poreznoj upravi Federacije BiH i izjavljujem da su svi podaci navedeni u ovoj prijavi i prilozima tačni, potpuni i jasni.";
  const izjavaTop = y + 10;
  for (const ln of wrap(font, izjava, A4[0] - 2 * M - 16, 8.5)) {
    text(ln, M + 8, 8.5);
    y -= 11;
  }
  page.drawRectangle({
    x: M,
    y: y - 4,
    width: A4[0] - 2 * M,
    height: izjavaTop - y + 4,
    borderColor: INK,
    borderWidth: 0.6,
  });
  y -= 34;

  text("Potpis obrtnika: ______________________________", M, 9);
  text(`Datum: ${d.datum}`, A4[0] - M - 150, 9);

  return doc.save();
}
