import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  TabStopType,
  TabStopPosition,
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
            regular("Zajmodavac "),
            regular("daje, a "),
            regular("zajmoprimac"),
            regular(` prima zajam-pozajmicu u iznosu od ${iznos}`),
          ]),
          emptyLine(),

          // Član 2
          centeredPara([bold("Član 2.")]),
          justifiedPara([
            regular("Zajam-pozajmica  se daje"),
            regular(` ${vrsta} `),
            regular(` ${uvjetiDavanja}. Svrha pozajmice je `),
            regular(svrha),
          ]),
          emptyLine(),

          // Član 3
          centeredPara([bold("Član 3.")]),
          justifiedPara([
            regular("Zajmodavac "),
            regular("će uplatiti iznos iz Člana 1. ovog ugovora na "),
            regular("žiro račun"),
            regular(` ${ziroRacun} otvoren kod `),
            regular(banka),
          ]),
          emptyLine(),

          // Član 4
          centeredPara([bold("Član 4.")]),
          justifiedPara([
            regular(
              "Na ime ugovorenog zajma-pozajmice iz Člana 1. ovog ugovora, ",
            ),
            regular("ugovorena kamatna stopa iznosi "),
            regular(`${kamatnaStopa}.`),
          ]),
          emptyLine(),

          // Član 5
          centeredPara([bold("Član 5.")]),
          justifiedPara([
            regular(
              "Ugovorene strane u svemu prihvataju odredbe ovog  ugovora",
            ),
            regular(` ${napomene}.`),
          ]),
          emptyLine(),

          // Član 6
          centeredPara([bold("Član 6.")]),
          justifiedPara([
            regular("Ovaj ugovor sačinjen je  u"),
            regular(
              ` ${brojPrimjeraka}, od kojih svaka ugovorena strana zadržava po`,
            ),
            regular(` ${kopijePoPrimjerku}.`),
          ]),
          emptyLine(),
          emptyLine(),
          emptyLine(),

          // Signature line
          new Paragraph({
            alignment: AlignmentType.LEFT,
            tabStops: [
              { type: TabStopType.CENTER, position: TabStopPosition.MAX },
            ],
            children: [
              new TextRun({
                text: "       Z A J M O D A V A C",
                font: FONT,
                size: 24,
              }),
              new TextRun({
                text: "\t       Z A J M O P R I M A C",
                font: FONT,
                size: 24,
              }),
            ],
          }),
          emptyLine(),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            tabStops: [
              { type: TabStopType.CENTER, position: TabStopPosition.MAX },
            ],
            children: [
              new TextRun({
                text: "   _______________________",
                font: FONT,
                size: 24,
              }),
              new TextRun({
                text: "\t   _______________________________",
                font: FONT,
                size: 24,
              }),
            ],
          }),
          emptyLine(),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            tabStops: [
              { type: TabStopType.CENTER, position: TabStopPosition.MAX },
            ],
            children: [
              new TextRun({
                text: `        ${zajmodavac}`,
                font: FONT,
                size: 24,
              }),
              new TextRun({
                text: `\t        ${zajmoprimac}`,
                font: FONT,
                size: 24,
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
