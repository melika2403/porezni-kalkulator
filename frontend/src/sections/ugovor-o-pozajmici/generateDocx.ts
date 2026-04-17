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

export interface UgovorData {
  vrsta: string; // e.g. "novčanoj"
  datum: string;
  mjesto: string;
  zajmodavac: string;
  zajmoprimac: string;
  zajmodavacAdresa: string;
  zajmoprimacAdresa: string;
  zajmodavacID: string;
  zajmoprimacID: string;
  iznos: string;
  uvjetiDavanja: string;
  svrha: string;
  ziroRacun: string;
  banka: string;
  kamatnaStopa: string;
  napomene: string;
  brojPrimjeraka: string;
  kopijePoPrimjerku: string;
}

const FONT = "Calibri";

function bold(text: string, size = 24): TextRun {
  return new TextRun({ text, font: FONT, bold: true, size });
}

function regular(text: string, size = 24): TextRun {
  return new TextRun({ text, font: FONT, size });
}

function underlineBold(text: string, size = 24): TextRun {
  return new TextRun({ text, font: FONT, bold: true, underline: {}, size });
}

function centeredPara(children: TextRun[]): Paragraph {
  return new Paragraph({ alignment: AlignmentType.CENTER, children });
}

function justifiedPara(children: TextRun[], spacing = 160): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    spacing: { after: spacing },
    children,
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: "", font: FONT, size: 24 })],
  });
}

export async function generateDocx(data: UgovorData): Promise<Blob> {
  const {
    vrsta,
    datum,
    mjesto,
    zajmodavac,
    zajmoprimac,
    zajmodavacAdresa,
    zajmoprimacAdresa,
    zajmodavacID,
    zajmoprimacID,
    iznos,
    uvjetiDavanja,
    svrha,
    ziroRacun,
    banka,
    kamatnaStopa,
    napomene,
    brojPrimjeraka,
    kopijePoPrimjerku,
  } = data;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1701 },
          },
        },
        children: [
          // Title
          centeredPara([bold("U  G  O  V  O  R", 28)]),
          centeredPara([bold(`O   ${vrsta.toUpperCase()}   POZAJMICI`, 28)]),
          emptyLine(),
          emptyLine(),

          // Preamble
          justifiedPara([
            regular("Zaključen dana "),
            bold(datum),
            regular(" godine u "),
            bold(mjesto),
            regular("  između:"),
          ]),
          emptyLine(),

          // Parties
          justifiedPara([
            regular("Zajmodavac "),
            bold(zajmodavac),
            bold(`, ${zajmodavacAdresa}, ${zajmodavacID}`),
            regular(" (u daljem tekstu  "),
            regular("zajmodavac)  i"),
          ]),
          emptyLine(),
          justifiedPara([
            regular("Zajmoprimac "),
            bold(zajmoprimac),
            bold(`, ${zajmoprimacAdresa}, ${zajmoprimacID}`),
            regular("(u daljem tekstu     "),
            regular("zajmoprimac)."),
          ]),
          emptyLine(),

          // Član 1
          centeredPara([bold("Član 1.")]),
          justifiedPara([
            regular("Zajmodavac daje, a zajmoprimac prima zajam-pozajmicu u iznosu od "),
            bold(iznos),
          ]),
          emptyLine(),

          // Član 2
          centeredPara([bold("Član 2.")]),
          justifiedPara([
            regular("Zajam-pozajmica se daje "),
            bold(vrsta.replace(/j$/, "")),
            regular(" "),
            bold(uvjetiDavanja),
            regular(". Svrha pozajmice je "),
            bold(svrha),
          ]),
          emptyLine(),

          // Član 3
          centeredPara([bold("Član 3.")]),
          justifiedPara([
            regular("Zajmodavac će uplatiti iznos iz Člana 1. ovog ugovora na žiro račun "),
            bold(ziroRacun),
            regular(" otvoren kod "),
            bold(banka),
          ]),
          emptyLine(),

          // Član 4
          centeredPara([bold("Član 4.")]),
          justifiedPara([
            regular("Na ime ugovorenog zajma-pozajmice iz Člana 1. ovog ugovora, ugovorena kamatna stopa iznosi "),
            bold(kamatnaStopa),
            regular("."),
          ]),
          emptyLine(),

          // Član 5
          centeredPara([bold("Član 5.")]),
          justifiedPara([
            regular("Ugovorene strane u svemu prihvataju odredbe ovog ugovora "),
            bold(napomene),
            regular("."),
          ]),
          emptyLine(),

          // Član 6
          centeredPara([bold("Član 6.")]),
          justifiedPara([
            regular("Ovaj ugovor sačinjen je u "),
            bold(brojPrimjeraka),
            regular(", od kojih svaka ugovorena strana zadržava po "),
            bold(kopijePoPrimjerku),
            regular("."),
          ]),
          emptyLine(),
          emptyLine(),
          emptyLine(),
          emptyLine(),

          // Signature block — 2-column table, no borders, each column centered
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            rows: [
              // Row 1 — labels
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "Z A J M O D A V A C", font: FONT, size: 24 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "Z A J M O P R I M A C", font: FONT, size: 24 })],
                      }),
                    ],
                  }),
                ],
              }),
              // Row 2 — signature lines (with top spacing for signing room)
              new TableRow({
                children: [
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 720 },
                        children: [new TextRun({ text: "_________________________", font: FONT, size: 24 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 720 },
                        children: [new TextRun({ text: "_________________________", font: FONT, size: 24 })],
                      }),
                    ],
                  }),
                ],
              }),
              // Row 3 — names
              new TableRow({
                children: [
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: zajmodavac, font: FONT, bold: true, size: 24 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: zajmoprimac, font: FONT, bold: true, size: 24 })],
                      }),
                    ],
                  }),
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
