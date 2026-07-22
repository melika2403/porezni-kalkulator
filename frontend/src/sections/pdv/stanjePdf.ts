// PDF izvještaj stanja PDV-a: lista knjiženja (kao UINO "Moja glavna
// knjiga") sa tekućim saldom i završnim stanjem, za štampu/arhivu i
// usaglašavanje sa karticom na e-portalu. Sve crno, isti vizuelni jezik
// kao ostali knjigovodstveni ispisi.
import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { PdvKnjizenje } from "src/api/pdv";

const A4: [number, number] = [595.28, 841.89];
const M = 42;
const INK = rgb(0, 0, 0);

const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const datumHr = (iso: string) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
};

const periodHr = (p: string | null) => {
  if (!p) return "";
  const [y, m] = p.split("-");
  return `${m}/${y}.`;
};

const VRSTA: Record<string, string> = {
  OBAVEZA: "Obaveza po prijavi",
  PRETPLATA: "Pretplata po prijavi",
  UPLATA: "Uplata PDV-a",
  POVRAT: "Primljen povrat",
  KOREKCIJA: "Korekcija",
};

async function loadFont(doc: PDFDocument): Promise<PDFFont> {
  const fontBytes = await fetch("/templates/arial.ttf").then((r) =>
    r.arrayBuffer(),
  );
  doc.registerFontkit(fontkit);
  return doc.embedFont(fontBytes);
}

function download(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Redovi = knjiženja hronološki, saldo je već izračunat kumulativno. */
export async function downloadStanjePdvPdf(
  redovi: (PdvKnjizenje & { saldo: number })[],
  orgName: string,
) {
  const doc = await PDFDocument.create();
  const font = await loadFont(doc);
  let page = doc.addPage(A4);
  let y = A4[1] - M - 10;

  const cols = [
    { label: "R.B.", w: 30 },
    { label: "DATUM", w: 62 },
    { label: "VRSTA", w: 118 },
    { label: "PERIOD", w: 52 },
    { label: "OPIS", w: 105 },
    { label: "ZADUŽENJE", w: 66, right: true },
    { label: "ODOBRENJE", w: 66, right: true },
    { label: "SALDO", w: 70, right: true },
  ];
  const contentW = A4[0] - 2 * M;
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  const scaled = cols.map((c) => ({ ...c, w: (c.w / totalW) * contentW }));
  const lineH = 10;

  const text = (t: string, x: number, s: number, bold = false) => {
    page.drawText(t, { x, y, size: s, font, color: INK });
    if (bold) page.drawText(t, { x: x + 0.3, y, size: s, font, color: INK });
  };

  function cellX(i: number) {
    let x = M;
    for (let j = 0; j < i; j++) x += scaled[j].w;
    return x;
  }

  function drawRow(values: string[], { header = false, bold = false } = {}) {
    const s = header ? 7.2 : 8;
    const rowH = lineH + 7;
    values.forEach((v, i) => {
      const c = scaled[i];
      let t = v;
      while (t.length > 1 && font.widthOfTextAtSize(t, s) > c.w - 5) {
        t = t.slice(0, -1);
      }
      const x = c.right
        ? cellX(i) + c.w - 3 - font.widthOfTextAtSize(t, s)
        : cellX(i) + 3;
      page.drawText(t, { x, y: y - lineH - 1, size: s, font, color: INK });
      if (bold || header) {
        page.drawText(t, {
          x: x + 0.3,
          y: y - lineH - 1,
          size: s,
          font,
          color: INK,
        });
      }
    });
    page.drawLine({
      start: { x: M, y: y - rowH },
      end: { x: A4[0] - M, y: y - rowH },
      thickness: header ? 1 : 0.5,
      color: INK,
    });
    y -= rowH;
  }

  function newPage() {
    page = doc.addPage(A4);
    y = A4[1] - M - 10;
    drawRow(
      scaled.map((c) => c.label),
      { header: true },
    );
  }

  // zaglavlje
  text(orgName, M, 11, true);
  y -= 24;
  const title = "STANJE PDV-a (knjiženja prema UINO)";
  const tw = font.widthOfTextAtSize(title, 13);
  text(title, (A4[0] - tw) / 2, 13, true);
  y -= 14;
  const sub = `na dan ${datumHr(new Date().toISOString())}`;
  const sw = font.widthOfTextAtSize(sub, 9);
  text(sub, (A4[0] - sw) / 2, 9);
  y -= 18;
  page.drawLine({
    start: { x: M, y },
    end: { x: A4[0] - M, y },
    thickness: 1,
    color: INK,
  });
  y -= 3;

  drawRow(
    scaled.map((c) => c.label),
    { header: true },
  );
  redovi.forEach((k, i) => {
    if (y - 60 < M) newPage();
    drawRow([
      `${i + 1}.`,
      datumHr(k.datum),
      VRSTA[k.vrsta] ?? k.vrsta,
      periodHr(k.period),
      k.opis ?? "",
      k.zaduzenje ? km(k.iznos) : "",
      k.zaduzenje ? "" : km(k.iznos),
      km(k.saldo),
    ]);
  });

  const zaduzeno = redovi.reduce((s, k) => s + (k.zaduzenje ? k.iznos : 0), 0);
  const odobreno = redovi.reduce((s, k) => s + (k.zaduzenje ? 0 : k.iznos), 0);
  const saldo = redovi.length > 0 ? redovi[redovi.length - 1].saldo : 0;
  drawRow(
    ["", "", "UKUPNO", "", "", km(zaduzeno), km(odobreno), km(saldo)],
    { bold: true },
  );

  // završno stanje riječima
  if (y - 40 < M) newPage();
  y -= 18;
  const zakljucak =
    saldo === 0
      ? "Stanje na dan ispisa: izmireno (0,00 KM)."
      : saldo > 0
        ? `Stanje na dan ispisa: dug prema UINO ${km(saldo)} KM.`
        : `Stanje na dan ispisa: pretplata ${km(-saldo)} KM.`;
  text(zakljucak, M, 10, true);

  // footer
  page.drawText(
    `ispis ${datumHr(new Date().toISOString())} · poreznikalkulator.ba`,
    { x: M, y: M - 18, size: 7.5, font, color: rgb(0.42, 0.45, 0.42) },
  );

  download(
    await doc.save(),
    `Stanje-PDV-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
