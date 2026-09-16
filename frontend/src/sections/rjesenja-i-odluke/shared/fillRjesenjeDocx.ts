import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import type { RjesenjeComposed } from "./composed";
import { uklopiMemorandum, type RjesenjeRenderOpcije } from "./memorandum";

// Širina sadržaja A4 strane sa marginama od 1 inča: 11906 - 2 x 1440 twipa =
// 9026 twipa = 6,27 inča = 602 px pri 96 dpi (docx ImageRun radi u px).
const CONTENT_W_PX = 602;
const MEMORANDUM_MAX_H_PX = 160;

const FONT = "Calibri";
const SIZE = 22; // 11pt (docx koristi half-points)
const SIZE_HEADER = 25; // 12.5pt , zaglavlje firme
const SIZE_TITLE = 30; // 15pt , naslov (POTVRDA / RJEŠENJE ...)

const DEFAULT_DOSTAVITI = ["imenovanom radniku", "računovodstvu", "arhivi"];

function run(text: string, bold = false, size = SIZE): TextRun {
  return new TextRun({ text, font: FONT, bold, size });
}

function para(
  children: TextRun[],
  opts: {
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    after?: number;
    before?: number;
    indentLeft?: number;
  } = {},
): Paragraph {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
    indent: opts.indentLeft ? { left: opts.indentLeft } : undefined,
    children,
  });
}

export async function fillRjesenjeDocx(
  data: RjesenjeComposed,
  opcije: RjesenjeRenderOpcije = {},
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // Memorandum klijenta umjesto tekstualnog zaglavlja firme (kao na platnoj
  // listi): slika preko širine sadržaja, srazmjerno skalirana.
  if (opcije.memorandum) {
    const m = opcije.memorandum;
    const { width, height } = uklopiMemorandum(m, CONTENT_W_PX, MEMORANDUM_MAX_H_PX);
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [
          new ImageRun({
            type: m.tip,
            data: m.bytes,
            transformation: { width: Math.round(width), height: Math.round(height) },
          }),
        ],
      }),
    );
  } else {
    for (const line of data.zaglavlje) {
      children.push(para([run(line, true, SIZE_HEADER)], { after: 0 }));
    }
    children.push(para([run("")], { after: 80 }));
  }

  children.push(para([run(data.pravniOsnov)], { after: 120 }));

  children.push(para([run(`Broj: ${data.brojAkta}`)], { after: 0 }));
  children.push(para([run(data.mjestoDatum)], { after: 220 }));

  children.push(
    para([run(data.naslov, true, SIZE_TITLE)], {
      align: AlignmentType.CENTER,
      after: 220,
    }),
  );

  if (data.uvod) {
    children.push(
      para([run(data.uvod)], { align: AlignmentType.BOTH, after: 120 }),
    );
  }

  if (data.stavke?.length) {
    for (const s of data.stavke) {
      children.push(
        para([run(`-  ${s}`)], {
          align: AlignmentType.BOTH,
          after: 80,
          indentLeft: 360,
        }),
      );
    }
  }

  if (data.paragrafi?.length) {
    data.paragrafi.forEach((p, i) => {
      children.push(
        para([run(p)], {
          align: AlignmentType.BOTH,
          after: 160,
          before: i === 0 ? 80 : 0,
        }),
      );
    });
  }

  if (data.obrazlozenje) {
    children.push(para([run("Obrazloženje", true)], { after: 60 }));
    children.push(
      para([run(data.obrazlozenje)], {
        align: AlignmentType.BOTH,
        after: 200,
      }),
    );
  }

  if (data.pouka) {
    children.push(
      para([run("Pouka o pravnom lijeku: ", true), run(data.pouka)], {
        align: AlignmentType.BOTH,
        after: 260,
      }),
    );
  }

  // Potvrde prosljeđuju praznu listu (dostaviti: []) pa se blok preskače.
  const dostavitiList = data.dostaviti ?? DEFAULT_DOSTAVITI;
  if (dostavitiList.length > 0) {
    children.push(para([run("Dostaviti:", true)], { after: 0 }));
    for (const d of dostavitiList) {
      children.push(para([run(`-  ${d}`)], { after: 0 }));
    }
  }
  children.push(para([run("")], { after: 360 }));

  // Aneks (potpisRadnik): dvije kolone potpisa kroz tabelu bez okvira
  // (lijevo radnik, desno poslodavac). Ostali: samo POSLODAVAC desno.
  if (data.potpisRadnik) {
    const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const sigCell = (linije: Paragraph[]) =>
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: {
          top: noBorder,
          bottom: noBorder,
          left: noBorder,
          right: noBorder,
        },
        children: linije,
      });
    const stupac = (naslov: string, ime: string) => [
      para([run(naslov, true)], { align: AlignmentType.CENTER, after: 300 }),
      para([run("_____________________")], {
        align: AlignmentType.CENTER,
        after: 0,
      }),
      para([run(ime)], { align: AlignmentType.CENTER }),
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: noBorder,
          bottom: noBorder,
          left: noBorder,
          right: noBorder,
          insideHorizontal: noBorder,
          insideVertical: noBorder,
        },
        rows: [
          new TableRow({
            children: [
              sigCell(stupac("RADNIK", data.potpisRadnik)),
              sigCell(stupac("POSLODAVAC", data.potpisnik)),
            ],
          }),
        ],
      }),
    );
  } else {
    children.push(
      para([run("POSLODAVAC", true)], {
        align: AlignmentType.RIGHT,
        after: 360,
      }),
    );
    children.push(
      para([run("_____________________")], {
        align: AlignmentType.RIGHT,
        after: 0,
      }),
    );
    if (data.potpisnik) {
      children.push(
        para([run(data.potpisnik)], { align: AlignmentType.RIGHT }),
      );
    }
  }

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
