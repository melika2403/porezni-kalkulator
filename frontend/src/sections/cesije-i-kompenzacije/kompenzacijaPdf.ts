import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { KompenzacijaData, KompStavka } from "./types";
import { formatBroj, kompTotals, collapseStavke } from "./money";

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN_L = 55;
const MARGIN_R = 55;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const BLACK = rgb(0, 0, 0);
const LINE = rgb(0.6, 0.6, 0.6);

type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

export async function generateKompenzacijaPdf(data: KompenzacijaData): Promise<Blob> {
  const [fontBytes, boldBytes] = await Promise.all([
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes);
  const fontBold = await pdfDoc.embedFont(boldBytes);
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  let y = PAGE_H - 55;

  const text = (
    s: string,
    x: number,
    yy: number,
    opts: { size?: number; bold?: boolean } = {},
  ) => {
    const { size = 10, bold = false } = opts;
    page.drawText(s, { x, y: yy, size, font: bold ? fontBold : font, color: BLACK });
  };
  const wrap = (s: string, f: Font, size: number, maxW: number): string[] => {
    const words = s.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(t, size) <= maxW) cur = t;
      else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const para = (s: string, size = 9.5, after = 8) => {
    for (const ln of wrap(s, font, size, CONTENT_W)) {
      text(ln, MARGIN_L, y, { size });
      y -= size + 4;
    }
    y -= after;
  };

  // ── Party blocks (side by side) ───────────────────────────────────────────
  const rightX = MARGIN_L + CONTENT_W / 2 + 10;
  const block = (x: number, startY: number, title: string, lines: string[]): number => {
    let yy = startY;
    text(title, x, yy, { size: 11.5, bold: true });
    yy -= 18;
    for (const ln of lines) {
      if (!ln) continue;
      for (const w of wrap(ln, font, 10.5, CONTENT_W / 2 - 14)) {
        text(w, x, yy, { size: 10.5 });
        yy -= 14;
      }
    }
    return yy;
  };
  const duznikLines = [
    data.duznikNaziv,
    data.duznikAdresa,
    data.duznikId ? `ID broj: ${data.duznikId}` : "",
    data.duznikPdv ? `PDV broj: ${data.duznikPdv}` : "",
    data.duznikSifra ? `Šifra: ${data.duznikSifra}` : "",
  ];
  const povjeriocLines = [
    data.povjeriocNaziv,
    data.povjeriocAdresa,
    data.povjeriocId ? `ID broj: ${data.povjeriocId}` : "",
    data.povjeriocPdv ? `PDV broj: ${data.povjeriocPdv}` : "",
    data.povjeriocSifra ? `Šifra: ${data.povjeriocSifra}` : "",
  ];
  const yL = block(MARGIN_L, y, "DUŽNIK", duznikLines);
  const yR = block(rightX, y, "POVJERILAC-VJEROVNIK", povjeriocLines);
  y = Math.min(yL, yR) - 6;

  if (data.broj || data.datum) {
    text(
      `Broj: ${data.broj || "-"}`,
      MARGIN_L,
      y,
      { size: 12 },
    );
    const dt = `Datum: ${data.datum || "-"}`;
    text(dt, PAGE_W - MARGIN_R - font.widthOfTextAtSize(dt, 11), y, { size: 11 });
    y -= 24;
  }

  // ── Title ─────────────────────────────────────────────────────────────────
  const title = "PRIJEDLOG ZA MEĐUSOBNU KOMPENZACIJU";
  text(title, (PAGE_W - fontBold.widthOfTextAtSize(title, 16)) / 2, y, {
    size: 16,
    bold: true,
  });
  y -= 26;

  para(
    'Na osnovu odredbi člana 336. do 343. Zakona o obligacionim odnosima ("Sl. list RBiH", br. 2/92, 13/93 i 13/94 i "Sl. novine FBiH", br. 29/03 i 42/11) izjavljujemo da smo saglasni za kompenzaciju-prijeboj međusobnih novčanih potraživanja na navedeni dan kako slijedi:',
    11,
    8,
  );
  if (data.datum) {
    para(`Datum zadnjeg evidentiranog prometa u knjiženju ${data.datum} godine`, 12, 12);
  }

  // ── Table helper ──────────────────────────────────────────────────────────
  const drawTable = (heading: string, stavke: KompStavka[], ukupno: number) => {
    text(heading, MARGIN_L, y, { size: 11, bold: true });
    y -= 16;
    const x0 = MARGIN_L;
    const wRb = 44;
    const wIznos = 120;
    const wOpis = CONTENT_W - wRb - wIznos;
    const xOpis = x0 + wRb;
    const xIznos = x0 + wRb + wOpis;
    const rowH = 19;

    const hline = (yy: number) => {
      page.drawLine({
        start: { x: x0, y: yy },
        end: { x: x0 + CONTENT_W, y: yy },
        thickness: 0.5,
        color: LINE,
      });
    };

    // header
    hline(y + 2);
    text("R.br.", x0 + 5, y - 13, { size: 10, bold: true });
    text("Broj računa / osnov", xOpis + 5, y - 13, { size: 10, bold: true });
    const ih = "Iznos (KM)";
    text(ih, xIznos + wIznos - 5 - fontBold.widthOfTextAtSize(ih, 10), y - 13, {
      size: 10,
      bold: true,
    });
    y -= rowH;
    hline(y + 2);

    const rows = stavke.length ? stavke : [{ opis: "", iznos: 0 }];
    rows.forEach((s, i) => {
      text(String(i + 1) + ".", x0 + 5, y - 13, { size: 11 });
      const opis = s.opis || "Početno stanje";
      text(opis.slice(0, 64), xOpis + 5, y - 13, { size: 11 });
      const iz = formatBroj(s.iznos || 0);
      text(iz, xIznos + wIznos - 5 - font.widthOfTextAtSize(iz, 11), y - 13, { size: 11 });
      y -= rowH;
      hline(y + 2);
    });

    // total
    text("UKUPNO:", xOpis + 5, y - 13, { size: 11, bold: true });
    const tu = formatBroj(ukupno);
    text(tu, xIznos + wIznos - 5 - fontBold.widthOfTextAtSize(tu, 11), y - 13, {
      size: 11,
      bold: true,
    });
    y -= rowH;
    hline(y + 2);
    // vertical lines
    [x0, xOpis, xIznos, x0 + CONTENT_W].forEach((xx) => {
      page.drawLine({
        start: { x: xx, y: y + 2 },
        end: { x: xx, y: y + 2 + rowH * (rows.length + 2) },
        thickness: 0.5,
        color: LINE,
      });
    });
    y -= 16;
  };

  const t = kompTotals(data);
  drawTable("OBAVEZE DUŽNIKA", collapseStavke(data.duznikStavke), t.ukupnoD);
  drawTable("OBAVEZE POVJERIOCA-VJEROVNIKA", collapseStavke(data.povjeriocStavke), t.ukupnoP);

  y -= 6;
  text(`Iznos za kompenzaciju: ${formatBroj(t.kompenzacija)} KM`, MARGIN_L, y, {
    size: 12,
    bold: true,
  });
  y -= 18;
  text(
    `Nekompenzirani iznos: ${formatBroj(t.nekompenzirani)} KM uplatiti na žiro račun.`,
    MARGIN_L,
    y,
    { size: 12, bold: true },
  );
  y -= 24;

  para(
    "Izjava je sastavljena u dva ovjerena i potpisana primjerka, s tim da se jedan ovjeren i potpisan primjerak vrati pošiljaocu radi odgovarajućih knjiženja. Učesnici u kompenzaciji-prijeboju obavezuju se provesti odgovarajuća knjiženja u svojim poslovnim knjigama na dan potpisivanja izjave.",
    11,
    22,
  );

  // ── Signatures ────────────────────────────────────────────────────────────
  const leftC = MARGIN_L + CONTENT_W / 4;
  const rightC = MARGIN_L + (CONTENT_W * 3) / 4;
  const sl = "Potpis i pečat dužnika:";
  const sr = "Potpis i pečat povjerioca-vjerovnika:";
  text(sl, leftC - font.widthOfTextAtSize(sl, 11) / 2, y, { size: 11 });
  text(sr, rightC - font.widthOfTextAtSize(sr, 11) / 2, y, { size: 11 });
  y -= 46;
  const ul = "______________________";
  text(ul, leftC - font.widthOfTextAtSize(ul, 11) / 2, y, { size: 11 });
  text(ul, rightC - font.widthOfTextAtSize(ul, 11) / 2, y, { size: 11 });
  y -= 15;
  const dN = data.duznikNaziv || "";
  const pN = data.povjeriocNaziv || "";
  text(dN, leftC - fontBold.widthOfTextAtSize(dN, 10.5) / 2, y, { size: 10.5, bold: true });
  text(pN, rightC - fontBold.widthOfTextAtSize(pN, 10.5) / 2, y, { size: 10.5, bold: true });

  const pdfBytes = await pdfDoc.save();
  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([arrayBuffer], { type: "application/pdf" });
}
