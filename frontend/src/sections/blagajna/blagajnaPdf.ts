// PDF za blagajnu: pojedinačni nalog za naplatu/isplatu (sa iznosom
// slovima i potpisima) i blagajnički dnevnik za dan (donos, promet, saldo,
// potpisi). Sve crno, isti vizuelni jezik kao ostali robni/knjigovodstveni
// ispisi.
import { PDFDocument, PDFFont, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Organization } from "src/api/profile";
import type { BlagajnaData, BlagajnaNalog } from "src/api/blagajna";
import { iznosUSlova } from "src/sections/ugovor-o-djelu/iznosSlovima";

const A4: [number, number] = [595.28, 841.89];
const M = 42;
const INK = rgb(0, 0, 0);

const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const datumHr = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
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

/** Nalog za naplatu / isplatu (jedan nalog = jedna A4 strana). */
export async function downloadNalogPdf(n: BlagajnaNalog, org: Organization) {
  const doc = await PDFDocument.create();
  const font = await loadFont(doc);
  const page = doc.addPage(A4);
  let y = A4[1] - M - 10;

  const text = (t: string, x: number, s: number, bold = false) => {
    page.drawText(t, { x, y, size: s, font, color: INK });
    if (bold) page.drawText(t, { x: x + 0.3, y, size: s, font, color: INK });
  };
  const line = (yy: number, thickness = 0.7) =>
    page.drawLine({
      start: { x: M, y: yy },
      end: { x: A4[0] - M, y: yy },
      thickness,
      color: INK,
    });

  // zaglavlje obrta
  text(org.name, M, 11, true);
  y -= 13;
  const adresa = [org.address, org.city].filter(Boolean).join(", ");
  if (adresa) {
    text(adresa, M, 8.5);
    y -= 11;
  }
  if (org.taxNumber) {
    text(`ID broj: ${org.taxNumber}`, M, 8.5);
    y -= 11;
  }
  y -= 14;

  const naplata = n.tip === "NAPLATA";
  const title = naplata
    ? `NALOG BLAGAJNI DA NAPLATI broj ${n.oznaka}`
    : `NALOG BLAGAJNI DA ISPLATI broj ${n.oznaka}`;
  const tw = font.widthOfTextAtSize(title, 13);
  text(title, (A4[0] - tw) / 2, 13, true);
  y -= 14;
  const sub = `Datum: ${datumHr(n.datum)}`;
  const sw = font.widthOfTextAtSize(sub, 9);
  text(sub, (A4[0] - sw) / 2, 9);
  y -= 20;
  line(y);
  y -= 24;

  const red = (label: string, value: string) => {
    text(label, M, 9);
    text(value, M + 150, 10, true);
    y -= 8;
    page.drawLine({
      start: { x: M + 145, y },
      end: { x: A4[0] - M, y },
      thickness: 0.5,
      color: INK,
    });
    y -= 20;
  };

  red(naplata ? "Naplaćeno od:" : "Isplaćeno kome:", n.lice);
  red("Osnov (svrha):", n.osnov);
  red("Iznos (KM):", km(n.iznos));
  red("Slovima:", iznosUSlova(n.iznos));
  if (n.napomena) red("Napomena:", n.napomena);

  // potpisi
  y -= 40;
  const potpis = (label: string, x: number) => {
    page.drawLine({
      start: { x, y },
      end: { x: x + 140, y },
      thickness: 0.7,
      color: INK,
    });
    const lw = font.widthOfTextAtSize(label, 8.5);
    page.drawText(label, {
      x: x + (140 - lw) / 2,
      y: y - 12,
      size: 8.5,
      font,
      color: INK,
    });
  };
  potpis("Blagajnik", M);
  potpis(naplata ? "Uplatilac" : "Primalac", (A4[0] - 140) / 2);
  potpis("Odgovorno lice", A4[0] - M - 140);

  download(
    await doc.save(),
    `Nalog-${naplata ? "naplata" : "isplata"}-${n.broj}-${String(n.godina).slice(-2)}.pdf`,
  );
}

/** Blagajnički dnevnik za jedan dan: donos, nalozi, promet, saldo, potpisi. */
export async function downloadDnevnikPdf(
  data: BlagajnaData,
  org: Organization,
) {
  const doc = await PDFDocument.create();
  const font = await loadFont(doc);
  let page = doc.addPage(A4);
  let y = A4[1] - M - 10;

  const cols = [
    { label: "R.B.", w: 30 },
    { label: "BROJ NALOGA", w: 66 },
    { label: "OSNOV (SVRHA)", w: 190 },
    { label: "UPLATILAC / PRIMALAC", w: 120 },
    { label: "NAPLATA", w: 70, right: true },
    { label: "ISPLATA", w: 70, right: true },
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
  text(org.name, M, 11, true);
  y -= 13;
  const adresa = [org.address, org.city].filter(Boolean).join(", ");
  if (adresa) {
    text(adresa, M, 8.5);
    y -= 11;
  }
  if (org.taxNumber) {
    text(`ID broj: ${org.taxNumber}`, M, 8.5);
    y -= 11;
  }
  y -= 12;
  const title = `BLAGAJNIČKI DNEVNIK broj ${data.dnevnikBroj}`;
  const tw = font.widthOfTextAtSize(title, 13);
  text(title, (A4[0] - tw) / 2, 13, true);
  y -= 14;
  const sub = `za dan ${datumHr(data.from)}`;
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
  drawRow(["", "", "Donos (saldo prethodnog dana)", "", km(data.donos), ""], {
    bold: true,
  });
  data.nalozi.forEach((n, i) => {
    if (y - 60 < M) newPage();
    drawRow([
      `${i + 1}.`,
      `${n.tip === "NAPLATA" ? "N" : "I"}-${n.oznaka}`,
      n.osnov,
      n.lice,
      n.tip === "NAPLATA" ? km(n.iznos) : "",
      n.tip === "ISPLATA" ? km(n.iznos) : "",
    ]);
  });
  drawRow(
    ["", "", "Promet dana", "", km(data.naplate), km(data.isplate)],
    { bold: true },
  );
  drawRow(
    ["", "", "Saldo blagajne na kraju dana", "", km(data.saldo), ""],
    { bold: true },
  );

  // potpisi
  if (y - 70 < M) newPage();
  y -= 46;
  const potpis = (label: string, x: number) => {
    page.drawLine({
      start: { x, y },
      end: { x: x + 150, y },
      thickness: 0.7,
      color: INK,
    });
    const lw = font.widthOfTextAtSize(label, 8.5);
    page.drawText(label, {
      x: x + (150 - lw) / 2,
      y: y - 12,
      size: 8.5,
      font,
      color: INK,
    });
  };
  potpis("Blagajnik", M);
  potpis("Kontrolisao (odgovorno lice)", A4[0] - M - 150);

  download(await doc.save(), `Blagajnicki-dnevnik-${data.from}.pdf`);
}
