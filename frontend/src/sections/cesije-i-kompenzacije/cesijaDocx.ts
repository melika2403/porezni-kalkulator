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
import type { CesijaData } from "./types";

const FONT = "Calibri";
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const CELL_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

function bold(text: string, size = 24): TextRun {
  return new TextRun({ text, font: FONT, bold: true, size });
}
function regular(text: string, size = 24): TextRun {
  return new TextRun({ text, font: FONT, size });
}
function centered(children: TextRun[]): Paragraph {
  return new Paragraph({ alignment: AlignmentType.CENTER, children });
}
function justified(children: TextRun[], spacing = 160): Paragraph {
  return new Paragraph({ alignment: AlignmentType.BOTH, spacing: { after: spacing }, children });
}
function emptyLine(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "", font: FONT, size: 24 })] });
}

function sigCell(label: string, name: string): TableCell {
  return new TableCell({
    width: { size: 33, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, font: FONT, bold: true, size: 24 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 700 },
        children: [new TextRun({ text: "______________", font: FONT, size: 22 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: name, font: FONT, bold: true, size: 22 })],
      }),
    ],
  });
}

export async function generateCesijaDocx(data: CesijaData): Promise<Blob> {
  const partyPara = (label: string, naziv: string, id: string, zastupnik: string) => {
    const runs: TextRun[] = [bold(`${label}: `), bold(naziv)];
    if (id.trim()) runs.push(regular(", JIB: "), bold(id));
    if (zastupnik.trim()) runs.push(regular(", kojeg zastupa "), bold(zastupnik));
    return justified(runs, 80);
  };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          justified([
            regular(
              "Na osnovu odredbi članova 436. do 445. Zakona o obligacionim odnosima, ugovorne strane zaključuju:",
            ),
          ]),
          emptyLine(),
          centered([bold("UGOVOR O CESIJI", 34)]),
          centered([regular("ustupanje potraživanja i obaveza", 20)]),
          emptyLine(),
          justified([
            regular("Zaključen u "),
            bold(data.mjesto),
            regular(" "),
            bold(data.datum),
            regular(" godine, između:"),
          ]),
          emptyLine(),
          partyPara("CEDENT (USTUPALAC)", data.cedentNaziv, data.cedentId, data.cedentZastupnik),
          partyPara("CESIONAR (PRIMALAC)", data.cesionarNaziv, data.cesionarId, data.cesionarZastupnik),
          partyPara("CESUS (PLATILAC)", data.cesusNaziv, data.cesusId, data.cesusZastupnik),
          emptyLine(),
          centered([bold("Član 1.")]),
          justified([
            regular("Cedent ustupa Cesionaru svoja potraživanja od Cesusa u iznosu od "),
            bold(data.iznosBroj),
            regular(data.iznosSlovima ? ` (slovima: ${data.iznosSlovima}).` : "."),
          ]),
          emptyLine(),
          centered([bold("Član 2.")]),
          justified([
            regular(
              "Cesionar prihvata ustupljena potraživanja od Cedenta čime je izmirena obaveza koju Cedent ima prema Cesionaru.",
            ),
          ]),
          emptyLine(),
          centered([bold("Član 3.")]),
          justified([
            regular("Ugovor je sačinjen u "),
            bold(data.brojPrimjeraka),
            regular(" istovjetna primjerka od kojih svaka od stranaka zadržava po jedan."),
          ]),
          emptyLine(),
          centered([bold("Član 4.")]),
          justified([
            regular("Za eventualne sporove po ovom ugovoru rješavat će nadležni sud u "),
            bold(data.sud),
            regular("."),
          ]),
          emptyLine(),
          emptyLine(),
          new Table({
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
                  sigCell("CEDENT", data.cedentNaziv),
                  sigCell("CESIONAR", data.cesionarNaziv),
                  sigCell("CESUS", data.cesusNaziv),
                ],
              }),
            ],
          }),
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
