import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import type { KompenzacijaData, KompStavka } from "./types";
import { formatBroj, kompTotals, collapseStavke } from "./money";

const FONT = "Calibri";
type BS = (typeof BorderStyle)[keyof typeof BorderStyle];
type Align = (typeof AlignmentType)[keyof typeof AlignmentType];
type Edge = { style: BS; size: number; color: string };
type CellBorderSet = { top: Edge; bottom: Edge; left: Edge; right: Edge };
const NO_BORDER: Edge = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const THIN: Edge = { style: BorderStyle.SINGLE, size: 2, color: "999999" };
const CELL_NO_BORDER: CellBorderSet = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };
const CELL_THIN: CellBorderSet = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function run(text: string, bold = false, size = 18): TextRun {
  return new TextRun({ text, font: FONT, bold, size });
}
function p(children: TextRun[], align: Align = AlignmentType.LEFT, after = 80): Paragraph {
  return new Paragraph({ alignment: align, spacing: { after }, children });
}
function empty(): Paragraph {
  return new Paragraph({ children: [run("")] });
}

function cell(children: Paragraph[], widthPct: number, borders: CellBorderSet = CELL_THIN): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders,
    children,
  });
}

function obavezeTable(heading: string, stavke: KompStavka[], ukupno: number): Table {
  const rows = stavke.length ? stavke : [{ opis: "", iznos: 0 }];
  const headerRow = new TableRow({
    children: [
      cell([p([run("R.br.", true, 20)])], 12),
      cell([p([run("Broj računa / osnov", true, 20)])], 58),
      cell([p([run("Iznos (KM)", true, 20)], AlignmentType.RIGHT)], 30),
    ],
  });
  const dataRows = rows.map(
    (s, i) =>
      new TableRow({
        children: [
          cell([p([run(`${i + 1}.`, false, 22)])], 12),
          cell([p([run(s.opis || "Početno stanje", false, 22)])], 58),
          cell([p([run(formatBroj(s.iznos || 0), false, 22)], AlignmentType.RIGHT)], 30),
        ],
      }),
  );
  const totalRow = new TableRow({
    children: [
      cell([p([run("", true, 22)])], 12),
      cell([p([run("UKUPNO:", true, 22)], AlignmentType.RIGHT)], 58),
      cell([p([run(formatBroj(ukupno), true, 22)], AlignmentType.RIGHT)], 30),
    ],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, totalRow],
  });
}

export async function generateKompenzacijaDocx(data: KompenzacijaData): Promise<Blob> {
  const t = kompTotals(data);

  const partyBlock = (title: string, naziv: string, adresa: string, id: string, pdv: string, sifra: string): Paragraph[] => {
    const lines: Paragraph[] = [p([run(title, true, 24)], AlignmentType.LEFT, 40)];
    if (naziv) lines.push(p([run(naziv, true, 21)], AlignmentType.LEFT, 20));
    if (adresa) lines.push(p([run(adresa, false, 21)], AlignmentType.LEFT, 20));
    if (id) lines.push(p([run(`ID broj: ${id}`, false, 21)], AlignmentType.LEFT, 20));
    if (pdv) lines.push(p([run(`PDV broj: ${pdv}`, false, 21)], AlignmentType.LEFT, 20));
    if (sifra) lines.push(p([run(`Šifra: ${sifra}`, false, 21)], AlignmentType.LEFT, 20));
    return lines;
  };

  const partiesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          cell(partyBlock("DUŽNIK", data.duznikNaziv, data.duznikAdresa, data.duznikId, data.duznikPdv, data.duznikSifra), 50, CELL_NO_BORDER),
          cell(partyBlock("POVJERILAC-VJEROVNIK", data.povjeriocNaziv, data.povjeriocAdresa, data.povjeriocId, data.povjeriocPdv, data.povjeriocSifra), 50, CELL_NO_BORDER),
        ],
      }),
    ],
  });

  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          cell([p([run("Potpis i pečat dužnika:", false, 22)], AlignmentType.CENTER)], 50, CELL_NO_BORDER),
          cell([p([run("Potpis i pečat povjerioca-vjerovnika:", false, 22)], AlignmentType.CENTER)], 50, CELL_NO_BORDER),
        ],
      }),
      new TableRow({
        children: [
          cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [run("______________________", false, 22)] })], 50, CELL_NO_BORDER),
          cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [run("______________________", false, 22)] })], 50, CELL_NO_BORDER),
        ],
      }),
      new TableRow({
        children: [
          cell([p([run(data.duznikNaziv || "", true, 21)], AlignmentType.CENTER)], 50, CELL_NO_BORDER),
          cell([p([run(data.povjeriocNaziv || "", true, 21)], AlignmentType.CENTER)], 50, CELL_NO_BORDER),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 },
          },
        },
        children: [
          partiesTable,
          p([run(`Broj: ${data.broj || "-"}`, false, 24), run("          "), run(`Datum: ${data.datum || "-"}`, false, 22)], AlignmentType.LEFT, 120),
          p([run("PRIJEDLOG ZA MEĐUSOBNU KOMPENZACIJU", true, 32)], AlignmentType.CENTER, 160),
          p([
            run(
              'Na osnovu odredbi člana 336. do 343. Zakona o obligacionim odnosima ("Sl. list RBiH", br. 2/92, 13/93 i 13/94 i "Sl. novine FBiH", br. 29/03 i 42/11) izjavljujemo da smo saglasni za kompenzaciju-prijeboj međusobnih novčanih potraživanja na navedeni dan kako slijedi:',
              false,
              22,
            ),
          ], AlignmentType.BOTH, 120),
          ...(data.datum
            ? [p([run(`Datum zadnjeg evidentiranog prometa u knjiženju ${data.datum} godine`, false, 24)], AlignmentType.LEFT, 120)]
            : []),
          p([run("OBAVEZE DUŽNIKA", true, 22)], AlignmentType.LEFT, 60),
          obavezeTable("OBAVEZE DUŽNIKA", collapseStavke(data.duznikStavke), t.ukupnoD),
          empty(),
          p([run("OBAVEZE POVJERIOCA-VJEROVNIKA", true, 22)], AlignmentType.LEFT, 60),
          obavezeTable("OBAVEZE POVJERIOCA-VJEROVNIKA", collapseStavke(data.povjeriocStavke), t.ukupnoP),
          empty(),
          p([run(`Iznos za kompenzaciju: ${formatBroj(t.kompenzacija)} KM`, true, 24)], AlignmentType.LEFT, 60),
          p([run(`Nekompenzirani iznos: ${formatBroj(t.nekompenzirani)} KM uplatiti na žiro račun.`, true, 24)], AlignmentType.LEFT, 160),
          p([
            run(
              "Izjava je sastavljena u dva ovjerena i potpisana primjerka, s tim da se jedan ovjeren i potpisan primjerak vrati pošiljaocu radi odgovarajućih knjiženja. Učesnici u kompenzaciji-prijeboju obavezuju se provesti odgovarajuća knjiženja u svojim poslovnim knjigama na dan potpisivanja izjave.",
              false,
              22,
            ),
          ], AlignmentType.BOTH, 300),
          sigTable,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
