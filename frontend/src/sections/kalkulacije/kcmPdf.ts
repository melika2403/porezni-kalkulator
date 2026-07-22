// Ispis maloprodajne kalkulacije (KCM obrazac) kao PDF, A4 položeno:
// zaglavlje obrta i računa dobavljača, tabela svih kolona obračuna, totali,
// paginacija. Sve crnom bojom, puni nazivi kolona (prelamaju se u više
// redova), duži naziv artikla se prelama u drugi red. Font sa dijakriticima
// kao ostali PDF-ovi (templates/arial.ttf preko fontkit-a).
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { KalkulacijaDetail } from "src/api/kalkulacije";
import type { Organization } from "src/api/profile";

const A4L: [number, number] = [841.89, 595.28];
const M = 36;
const INK = rgb(0, 0, 0);
const LINE = rgb(0, 0, 0);

const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const cij = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
const kol = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 3 });
const pct = (n: number) =>
  `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

const datum = (iso: string | null | undefined) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
};

type Col = { label: string; w: number; right?: boolean };

// prelom teksta po riječima da stane u širinu; preduga riječ se siječe
function wrapText(
  font: PDFFont,
  text: string,
  maxW: number,
  size: number,
  maxLines = 3,
): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const probe = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(probe, size) <= maxW) {
      cur = probe;
      continue;
    }
    if (cur) lines.push(cur);
    // riječ šira od kolone: sijeci po znakovima
    let w = word;
    while (font.widthOfTextAtSize(w, size) > maxW && w.length > 1) {
      let cut = w.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxW) {
        cut--;
      }
      lines.push(w.slice(0, cut));
      w = w.slice(cut);
    }
    cur = w;
  }
  if (cur) lines.push(cur);
  if (lines.length === 0) lines.push("");
  return lines.slice(0, maxLines);
}

export async function downloadKcmPdf(
  k: KalkulacijaDetail,
  org: Organization,
) {
  const fontBytes = await fetch("/templates/arial.ttf").then((r) =>
    r.arrayBuffer(),
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);

  const cols: Col[] = [
    { label: "R.B.", w: 20 },
    { label: "ŠIFRA", w: 32 },
    { label: "NAZIV ARTIKLA", w: 98 },
    { label: "JED. MJERE", w: 32 },
    { label: "KOLIČINA", w: 40, right: true },
    { label: "CIJENA", w: 42, right: true },
    { label: "IZNOS", w: 44, right: true },
    { label: "RABAT", w: 38, right: true },
    { label: "FAKTURNA VRIJEDNOST", w: 50, right: true },
    { label: "ZAVISNI TROŠAK", w: 44, right: true },
    { label: "NABAVNI IZNOS", w: 46, right: true },
    { label: "NABAVNA CIJENA", w: 44, right: true },
    { label: "MARŽA %", w: 40, right: true },
    { label: "IZNOS MARŽE", w: 44, right: true },
    { label: "IZNOS BEZ PDV-a", w: 46, right: true },
    { label: "IZNOS PDV-a", w: 42, right: true },
    { label: "MPC", w: 36, right: true },
    { label: "MALOPRODAJNI IZNOS", w: 64, right: true },
  ];
  const contentW = A4L[0] - 2 * M;
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  const scaled = cols.map((c) => ({ ...c, w: (c.w / totalW) * contentW }));

  const size = 7;
  const lineH = 9;

  let page: PDFPage;
  let y = 0;

  function cellX(i: number) {
    let x = M;
    for (let j = 0; j < i; j++) x += scaled[j].w;
    return x;
  }

  // red tabele: vrijednost može biti string ili više linija (prelom);
  // visina reda prati najvišu ćeliju. Red je usidren na VRH (y): tekst se
  // crta prema dolje, granična linija na dnu reda, pa ništa iznad reda ne
  // može biti presječeno.
  function drawRow(
    values: (string | string[])[],
    { header = false, bold = false } = {},
  ) {
    const s = header ? 6.3 : size;
    const cells = values.map((v, i) => {
      if (Array.isArray(v)) return v;
      if (header) return wrapText(font, v, scaled[i].w - 5, s);
      return [v];
    });
    const rowLines = Math.max(...cells.map((c) => c.length), 1);
    const rowH = rowLines * lineH + 7;

    cells.forEach((lines, i) => {
      const c = scaled[i];
      lines.forEach((text, li) => {
        const x = c.right
          ? cellX(i) + c.w - 3 - font.widthOfTextAtSize(text, s)
          : cellX(i) + 3;
        const ty = y - (li + 1) * lineH - 1;
        page.drawText(text, { x, y: ty, size: s, font, color: INK });
        if (bold || header) {
          page.drawText(text, { x: x + 0.3, y: ty, size: s, font, color: INK });
        }
      });
    });
    page.drawLine({
      start: { x: M, y: y - rowH },
      end: { x: A4L[0] - M, y: y - rowH },
      thickness: header ? 1 : 0.5,
      color: LINE,
    });
    y -= rowH;
  }

  function text(t: string, x: number, size2: number, bold = false) {
    page.drawText(t, { x, y, size: size2, font, color: INK });
    if (bold) {
      page.drawText(t, { x: x + 0.3, y, size: size2, font, color: INK });
    }
  }

  function newPage(first: boolean) {
    page = doc.addPage(A4L);
    y = A4L[1] - M - 4;
    if (first) {
      // obrt
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
      y -= 3;
      // naslov
      const title = `MALOPRODAJNA KALKULACIJA - Obrazac KCM broj ${k.oznaka}`;
      const tw = font.widthOfTextAtSize(title, 15);
      text(title, (A4L[0] - tw) / 2, 15, true);
      y -= 16;
      const sub = `Datum zaduženja/kalkulacije: ${datum(k.datum)} godine`;
      const sw = font.widthOfTextAtSize(sub, 8.5);
      text(sub, (A4L[0] - sw) / 2, 8.5);
      y -= 18;
      // podaci računa
      text(`Dobavljač: ${k.partner?.name ?? ""}`, M, 10);
      text(`Broj računa: ${k.brojRacuna}`, A4L[0] - M - 220, 8.5);
      y -= 13;
      text(
        `Iznos ulaznog PDV-a: ${km(k.ulazniPdv)}    Ukupni iznos računa: ${km(k.iznosRacuna)}`,
        M,
        10,
        true,
      );
      text(`Datum računa: ${datum(k.datumRacuna)}`, A4L[0] - M - 220, 8.5);
      y -= 12;
      // linija koja odvaja zaglavlje dokumenta od stavki
      page.drawLine({
        start: { x: M, y },
        end: { x: A4L[0] - M, y },
        thickness: 1,
        color: LINE,
      });
      y -= 3;
    }
    drawRow(
      scaled.map((c) => c.label),
      { header: true },
    );
  }

  newPage(true);

  let s = {
    iznos: 0,
    rabat: 0,
    fakturna: 0,
    zavisni: 0,
    nabavni: 0,
    marza: 0,
    bezPdv: 0,
    pdv: 0,
    malopr: 0,
  };
  k.stavke.forEach((st, i) => {
    const nazivLines = wrapText(font, st.naziv, scaled[2].w - 6, size, 2);
    const neededH = nazivLines.length * lineH + 7;
    if (y - neededH < M) newPage(false);
    s = {
      iznos: s.iznos + st.iznos,
      rabat: s.rabat + st.rabatIznos,
      fakturna: s.fakturna + st.fakturnaVrijednost,
      zavisni: s.zavisni + st.zavisniTrosak,
      nabavni: s.nabavni + st.nabavniIznos,
      marza: s.marza + st.marzaIznos,
      bezPdv: s.bezPdv + st.vrijednostBezPdv,
      pdv: s.pdv + st.pdvIznos,
      malopr: s.malopr + st.maloprodajniIznos,
    };
    drawRow([
      `${i + 1}.`,
      st.sifra,
      nazivLines,
      st.jm,
      kol(st.kolicina),
      cij(st.cijena),
      km(st.iznos),
      km(st.rabatIznos),
      km(st.fakturnaVrijednost),
      km(st.zavisniTrosak),
      km(st.nabavniIznos),
      cij(st.nabavnaCijena),
      pct(st.marzaPct),
      km(st.marzaIznos),
      km(st.vrijednostBezPdv),
      km(st.pdvIznos),
      km(st.mpc),
      km(st.maloprodajniIznos),
    ]);
  });
  if (y - (lineH + 7) < M) newPage(false);
  drawRow(
    [
      "",
      "",
      `Ukupno (${k.stavke.length} stavki)`,
      "",
      "",
      "",
      km(s.iznos),
      km(s.rabat),
      km(s.fakturna),
      km(s.zavisni),
      km(s.nabavni),
      "",
      "",
      km(s.marza),
      km(s.bezPdv),
      km(s.pdv),
      "",
      km(s.malopr),
    ],
    { bold: true },
  );

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(
      `PK Office · ispis ${new Date().toLocaleDateString("de-DE")}`,
      { x: M, y: M - 16, size: 7, font, color: INK },
    );
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: A4L[0] - M - 24,
      y: M - 16,
      size: 7.5,
      font,
      color: INK,
    });
  });

  const bytes = await doc.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Kalkulacija-${k.broj}-${String(k.godina).slice(-2)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
