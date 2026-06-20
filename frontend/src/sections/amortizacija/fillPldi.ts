import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface PldiRowData {
  naziv: string;
  datumNabavke: string;
  brojDokumenta: string;
  nabavnaVrijednost: number | null;
  kvPocetak: number | null;
  vijekTrajanja: string;
  stopa: number;
  iznos: number | null;
  kvKraj: number | null;
  napomena: string;
  prodanoText?: string;
}

export interface PldiData {
  // Obveznik
  jmb: string;
  imeIPrezime: string;
  adresa: string;
  // Djelatnost
  jib: string;
  naziv: string;
  adresaDjelatnosti: string;
  vrstaSifra: string;
  vrstaNaziv: string;
  // Period
  godina: string;
  periodOd: string; // DD.MM.GGGG.
  periodDo: string; // DD.MM.GGGG.
  // Rows
  rows: PldiRowData[];
  // Totals
  totalNabavna: number;
  totalKv: number;
  totalIznos: number;
  totalKvKraj: number;
}

function fmtKm(n: number | null): string {
  if (n === null || n === 0) return "";
  const [int, dec] = n.toFixed(2).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + dec;
}

function safe(s: string | undefined | null): string {
  return s ?? "";
}

const ROW_SUFFIXES = ["Row1", "Row2", "Row3", "Row4", "Row5", "Row6", "Row7", "Row8"];
const COL_IDS = ["0", "1", "2", "3", "4", "5", "6", "7"];

interface PageTotals {
  nabavna: number;
  kv: number;
  iznos: number;
  kvKraj: number;
}

function r2(n: number) { return Math.round(n * 100) / 100; }

function pageTotalsFor(rows: PldiRowData[]): PageTotals {
  return {
    nabavna: r2(rows.reduce((s, r) => s + (r.nabavnaVrijednost ?? 0), 0)),
    kv:      r2(rows.reduce((s, r) => s + (r.kvPocetak ?? 0), 0)),
    iznos:   r2(rows.reduce((s, r) => s + (r.iznos ?? 0), 0)),
    kvKraj:  r2(rows.reduce((s, r) => s + (r.kvKraj ?? 0), 0)),
  };
}

async function fillPage(
  pdfDoc: PDFDocument,
  data: PldiData,
  rows: PldiRowData[],
  pageNum: number,
  totalPages: number,
  isFinalPage: boolean,
  arialBytes: ArrayBuffer,
): Promise<void> {
  const templateUrl = "/templates/Obrazac-PLDI-1043.pdf";
  const templateBytes = await fetch(templateUrl).then((r) => r.arrayBuffer());
  const templateDoc = await PDFDocument.load(templateBytes);
  templateDoc.registerFontkit(fontkit);

  const form = templateDoc.getForm();
  const arial = await templateDoc.embedFont(arialBytes);

  const setField = (name: string, value: string, fontSize = 10) => {
    try {
      const field = form.getTextField(name);
      field.setText(value);
      field.setFontSize(fontSize);
      field.updateAppearances(arial);
    } catch {
      // field not found — skip silently
    }
  };

  // ── Header ──
  setField("Period", `${data.periodOd} - ${data.periodDo}`);
  setField("Stranica", String(pageNum));
  setField("Od", String(totalPages));

  // ── Obveznik ──
  setField("1 JMB", safe(data.jmb));
  setField("2 Prezime i ime", safe(data.imeIPrezime));
  setField("3 Adresa", safe(data.adresa));

  // ── Djelatnost ──
  setField("4 JIB", safe(data.jib));
  setField("5 Naziv", safe(data.naziv));
  setField("6 Adresa", safe(data.adresaDjelatnosti));
  setField(
    "7 Vrsta djelatnosti šifra naziv",
    [data.vrstaSifra, data.vrstaNaziv].filter(Boolean).join(", "),
  );

  // ── Rows (max 8 per page) ──
  rows.slice(0, 8).forEach((row, i) => {
    const s = ROW_SUFFIXES[i];
    const c = COL_IDS[i];
    const globalIdx = (pageNum - 1) * 8 + i + 1;

    setField(`8 Red br.${c}`, String(globalIdx).padStart(2, "0"));
    setField(`Text1.${c}`, safe(row.naziv), 8);
    setField(`10 Datum nabavke ili ulaganja${s}`, safe(row.datumNabavke));
    setField(`11 Broj dokumenta${s}`, safe(row.brojDokumenta));
    setField(`12 Nabavna vrijednost${s}`, fmtKm(row.nabavnaVrijednost));
    setField(`13 Knjigovodstvena vrijednost${s}`, fmtKm(row.kvPocetak));
    setField(`14 Vijek trajanja${s}`, row.vijekTrajanja ? `${row.vijekTrajanja} god.` : "");
    setField(`15 Stopa amortizacije${s}`, row.stopa ? `${row.stopa}%` : "");
    setField(
      `16 Iznos amortizacije Kolone 12 x 15  100${s}`,
      fmtKm(row.iznos),
    );
    if (row.prodanoText) {
      setField(`17 Knjigovodsve na vrijednost sredstava na kraju godine Kolone 13  16${s}`, row.prodanoText, 7);
    } else {
      setField(`17 Knjigovodsve na vrijednost sredstava na kraju godine Kolone 13  16${s}`, fmtKm(row.kvKraj));
    }
  });

  // ── Totals — page sum on intermediate pages, grand total on final page ──
  const t = isFinalPage ? {
    nabavna: data.totalNabavna,
    kv:      data.totalKv,
    iznos:   data.totalIznos,
    kvKraj:  data.totalKvKraj,
  } : pageTotalsFor(rows);

  setField("12 Nabavna vrijednostUkupno za sve stranice  prijenos", fmtKm(t.nabavna));
  setField("13 Knjigovodstvena vrijednostUkupno za sve stranice  prijenos", fmtKm(t.kv));
  setField("16 Iznos amortizacije Kolone 12 x 15  100", fmtKm(t.iznos));
  setField("17 Knjigovodsve na vrijednost sredstava na kraju godine Kolone 13  16", fmtKm(t.kvKraj));

  form.flatten();

  const [filledPage] = await pdfDoc.copyPages(templateDoc, [0]);
  pdfDoc.addPage(filledPage);
}

export async function fillPldiTemplate(data: PldiData): Promise<Uint8Array> {
  const outputDoc = await PDFDocument.create();
  const arialBytes = await fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer());

  const totalPages = Math.max(1, Math.ceil(data.rows.length / 8));

  for (let p = 0; p < totalPages; p++) {
    const pageRows = data.rows.slice(p * 8, p * 8 + 8);
    await fillPage(outputDoc, data, pageRows, p + 1, totalPages, p === totalPages - 1, arialBytes);
  }

  return outputDoc.save();
}
