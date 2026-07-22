// Izvještaj iz KUF-a / KIF-a po mjesecu kao PDF (A4 položeno): zaglavlje
// obrta i perioda, tabela sa svim kolonama, totali, paginacija. Font sa
// dijakriticima kao i ostali PDF-ovi (templates/arial.ttf preko fontkit-a).
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { UlazniRacun } from "src/api/partners";
import type { Invoice } from "src/api/invoices";
import { kifSign } from "./pdvObracun";

const A4L: [number, number] = [841.89, 595.28];
const M = 36; // margina
const INK = rgb(0.05, 0.05, 0.05);
const MUTED = rgb(0.42, 0.42, 0.42);
const LINE = rgb(0.72, 0.72, 0.72);

const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const datum = (iso: string | null | undefined) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
};

type Col = { label: string; w: number; right?: boolean };

function truncate(font: PDFFont, s: string, maxW: number, size: number) {
  if (font.widthOfTextAtSize(s, size) <= maxW) return s;
  let out = s;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxW) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

async function buildTablePdf(
  title: string,
  sub: string,
  cols: Col[],
  rows: string[][],
  totals: string[],
): Promise<Uint8Array> {
  const fontBytes = await fetch("/templates/arial.ttf").then((r) =>
    r.arrayBuffer(),
  );
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);

  // širine kolona skaliraju na dostupnu širinu
  const contentW = A4L[0] - 2 * M;
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  const scaled = cols.map((c) => ({ ...c, w: (c.w / totalW) * contentW }));

  const rowH = 15;
  const size = 7.5;

  let page: PDFPage;
  let y = 0;

  function cellX(i: number) {
    let x = M;
    for (let k = 0; k < i; k++) x += scaled[k].w;
    return x;
  }

  function drawRow(values: string[], { header = false, bold = false } = {}) {
    values.forEach((v, i) => {
      const c = scaled[i];
      const s = header ? 6.8 : size;
      const text = truncate(font, v, c.w - 6, s);
      const x = c.right
        ? cellX(i) + c.w - 3 - font.widthOfTextAtSize(text, s)
        : cellX(i) + 3;
      page.drawText(text, {
        x,
        y: y + 4,
        size: s,
        font,
        color: header ? MUTED : INK,
      });
      if (bold) {
        // pseudo-bold: isti tekst pomjeren 0.3pt
        page.drawText(text, { x: x + 0.3, y: y + 4, size: s, font, color: INK });
      }
    });
    page.drawLine({
      start: { x: M, y },
      end: { x: A4L[0] - M, y },
      thickness: header ? 0.9 : 0.4,
      color: LINE,
    });
    y -= rowH;
  }

  function newPage(first: boolean) {
    page = doc.addPage(A4L);
    y = A4L[1] - M - 10;
    if (first) {
      page.drawText(title, { x: M, y, size: 13, font, color: INK });
      y -= 16;
      page.drawText(sub, { x: M, y, size: 9, font, color: MUTED });
      y -= 22;
    }
    drawRow(
      scaled.map((c) => c.label),
      { header: true },
    );
  }

  newPage(true);
  for (const r of rows) {
    if (y < M + rowH) newPage(false);
    drawRow(r);
  }
  if (y < M + rowH) newPage(false);
  drawRow(totals, { bold: true });

  // broj stranice u podnožju
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`${i + 1} / ${pages.length}`, {
      x: A4L[0] - M - 24,
      y: M - 16,
      size: 7.5,
      font,
      color: MUTED,
    });
  });

  return doc.save();
}

function downloadBytes(bytes: Uint8Array, name: string) {
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

/** "05/2026" ili "01-06/2026" + sufiks za ime fajla */
function periodLabel(month: number, year: number, monthTo?: number) {
  const mm = String(month).padStart(2, "0");
  const mm2 =
    monthTo && monthTo !== month ? String(monthTo).padStart(2, "0") : null;
  return {
    label: mm2 ? `${mm}-${mm2}/${year}` : `${mm}/${year}`,
    file: mm2 ? `${mm}-${mm2}-${year}` : `${mm}-${year}`,
  };
}

// Vraća bajtove (koristi ih i download dugme i godišnja ZIP arhiva).
export async function buildKufPdfBytes(
  rows: UlazniRacun[],
  org: string,
  month: number,
  year: number,
  /** pregled raspona: izvještaj za više mjeseci (do uključivo) */
  monthTo?: number,
): Promise<{ bytes: Uint8Array; fileName: string }> {
  const period = periodLabel(month, year, monthTo);
  let ukupno = 0;
  let osnovicaSum = 0;
  let pdv = 0;
  let neodbitni = 0;
  const data = rows.map((r, i) => {
    const rPdv = Number(r.pdvIznos) || 0;
    const rUkupno = Number(r.iznos) || 0;
    // samo-PDV knjiženja (uvozni PDV po JCI) imaju ukupno 0: osnovica 0
    const rOsnovica = Math.max(rUkupno - rPdv, 0);
    const rNeodbitni =
      Number(r.pdvNeodbitniIznos) || (r.pdvNeodbitan ? rPdv : 0);
    ukupno += rUkupno;
    osnovicaSum += rOsnovica;
    pdv += rPdv;
    neodbitni += rNeodbitni;
    return [
      String(i + 1),
      r.tipDokumenta ?? "01",
      r.brojRacuna,
      datum(r.datumRacuna),
      datum(r.datumPrijema ?? r.datumRacuna),
      r.partner?.code != null ? String(r.partner.code).padStart(4, "0") : "",
      r.partner?.name ?? "",
      r.partner?.pdvBroj || r.partner?.jib || "",
      km(rUkupno),
      km(rOsnovica),
      km(rPdv),
      km(rPdv - rNeodbitni),
      km(rNeodbitni),
    ];
  });
  const cols: Col[] = [
    { label: "R.BR.", w: 28 },
    { label: "TIP", w: 22 },
    { label: "BROJ FAKTURE", w: 95 },
    { label: "DATUM", w: 48 },
    { label: "PRIJEM", w: 48 },
    { label: "ŠIFRA", w: 32 },
    { label: "DOBAVLJAČ", w: 150 },
    { label: "PDV BROJ / JIB", w: 78 },
    { label: "UKUPNO", w: 58, right: true },
    { label: "OSNOVICA", w: 58, right: true },
    { label: "PDV", w: 52, right: true },
    { label: "ODBITNI", w: 52, right: true },
    { label: "NEODBITNI", w: 52, right: true },
  ];
  const totals = [
    "",
    "",
    `Ukupno (${rows.length} stavki)`,
    "",
    "",
    "",
    "",
    "",
    km(ukupno),
    km(osnovicaSum),
    km(pdv),
    km(pdv - neodbitni),
    km(neodbitni),
  ];
  const bytes = await buildTablePdf(
    "Izvještaj iz KUF-a (knjiga ulaznih faktura)",
    `${org} · period ${period.label}`,
    cols,
    data,
    totals,
  );
  return { bytes, fileName: `KUF-${period.file}.pdf` };
}

export async function downloadKufPdf(
  rows: UlazniRacun[],
  org: string,
  month: number,
  year: number,
  monthTo?: number,
) {
  const { bytes, fileName } = await buildKufPdfBytes(
    rows,
    org,
    month,
    year,
    monthTo,
  );
  downloadBytes(bytes, fileName);
}

// Vraća bajtove (koristi ih i download dugme i godišnja ZIP arhiva).
export async function buildKifPdfBytes(
  rows: Invoice[],
  org: string,
  month: number,
  year: number,
  /** pregled raspona: izvještaj za više mjeseci (do uključivo) */
  monthTo?: number,
): Promise<{ bytes: Uint8Array; fileName: string }> {
  const period = periodLabel(month, year, monthTo);
  let ukupno = 0;
  let osnovica = 0;
  let pdv = 0;
  const data = rows.map((inv, i) => {
    // storno avansne i knjižne obavijesti idu negativno
    const sign = kifSign(inv);
    const gross = sign * (Number(inv.grossTotal) || 0);
    const net = sign * (Number(inv.netTotal) || 0);
    const vat = sign * (Number(inv.vatTotal) || 0);
    ukupno += gross;
    osnovica += net;
    pdv += vat;
    const tip =
      inv.kifTipDokumenta ??
      (inv.docType === "AVANSNA" || inv.docType === "STORNO_AVANSNE"
        ? "03"
        : inv.vrstaIsporuke === "IZVOZ"
          ? "04"
          : "01");
    return [
      String(i + 1),
      tip,
      inv.fullNumber,
      datum(inv.issueDate),
      inv.buyerName,
      inv.buyerVatNumber || inv.buyerIdNumber || "",
      km(gross),
      km(net),
      km(vat),
    ];
  });
  const cols: Col[] = [
    { label: "R.BR.", w: 30 },
    { label: "TIP", w: 24 },
    { label: "BROJ FAKTURE", w: 95 },
    { label: "DATUM", w: 52 },
    { label: "KUPAC", w: 210 },
    { label: "PDV BROJ / JIB", w: 90 },
    { label: "UKUPNO", w: 66, right: true },
    { label: "OSNOVICA", w: 66, right: true },
    { label: "PDV", w: 60, right: true },
  ];
  const totals = [
    "",
    "",
    `Ukupno (${rows.length} stavki)`,
    "",
    "",
    "",
    km(ukupno),
    km(osnovica),
    km(pdv),
  ];
  const bytes = await buildTablePdf(
    "Izvještaj iz KIF-a (knjiga izlaznih faktura)",
    `${org} · period ${period.label}`,
    cols,
    data,
    totals,
  );
  return { bytes, fileName: `KIF-${period.file}.pdf` };
}

export async function downloadKifPdf(
  rows: Invoice[],
  org: string,
  month: number,
  year: number,
  monthTo?: number,
) {
  const { bytes, fileName } = await buildKifPdfBytes(
    rows,
    org,
    month,
    year,
    monthTo,
  );
  downloadBytes(bytes, fileName);
}
