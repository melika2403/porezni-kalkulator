import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface DayEntry {
  startTime: string;
  endTime: string;
  zastoj: string;
  fieldWork: string;
  standby: string;
  absence: string;
  other: string;
}

export interface SihtenicaData {
  workerName: string;
  month: number;
  year: number;
  days: (DayEntry | null)[];
  orgName?: string;
  orgAddress?: string;
  orgTaxNumber?: string;
}

const BLACK = rgb(0, 0, 0);
const FONT_SIZE = 10;
const Y_OFFSET = 4;

const COLS: Record<string, [number, number]> = {
  date:       [100, 163],
  startTime:  [167, 221],
  endTime:    [224, 287],
  zastoj:     [291, 344],
  totalDaily: [349, 435],
  fieldWork:  [438, 501],
  standby:    [503, 570],
  absence:    [573, 655],
  other:      [658, 734],
  totalHrs:   [736, 805],
};

const ROWS_P1 = [418,402,386,370,354,338,322,306,290,274,258,242,227,210,194,179,163,147,131,114,99,83];
const ROWS_P2 = [510,493,477,461,446,429,413,398,382];

function parseTimeToMins(hhmm: string): number | null {
  if (!hhmm) return null;
  const parts = hhmm.split(":");
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function minsToHM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function calcTotalDaily(entry: DayEntry): string {
  const start = parseTimeToMins(entry.startTime);
  const end = parseTimeToMins(entry.endTime);
  if (start === null || end === null) return "";
  const zastojMins = Math.round((parseFloat(entry.zastoj.replace(",", ".")) || 0) * 60);
  const total = end - start - zastojMins;
  if (total <= 0) return "";
  return minsToHM(total);
}

function calcTotalHrs(entry: DayEntry): string {
  return calcTotalDaily(entry);
}

function drawCentered(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  text: string,
  col: [number, number],
  y: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  font: any,
  size: number = FONT_SIZE,
) {
  if (!text) return;
  const textWidth = font.widthOfTextAtSize(text, size);
  const cellWidth = col[1] - col[0];
  const x = col[0] + Math.max(0, (cellWidth - textWidth) / 2);
  page.drawText(text, { x, y, size, font, color: BLACK });
}

const DAY_NAMES = ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"];
const MONTH_NAMES = ["Januar","Februar","Mart","April","Maj","Juni","Juli","August","Septembar","Oktobar","Novembar","Decembar"];

export async function fillSihterica(data: SihtenicaData): Promise<Uint8Array> {
  const [templateBytes, fontBytes] = await Promise.all([
    fetch("/templates/Šiherica-Evidencija radnog vremena.pdf").then((r) => r.arrayBuffer()),
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);

  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);

  // Find named FreeText annotations on page 1 (T = OrgName / OrgAddress / OrgJIB)
  // and draw the values left-aligned inside their boxes.
  const headerByName: Record<string, string> = {
    OrgName: data.orgName ?? "",
    OrgAddress: data.orgAddress ?? "",
    OrgJIB: data.orgTaxNumber ?? "",
  };
  try {
    const page0 = doc.getPage(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = page0.node as any;
    const annotsAny = node.Annots?.();
    if (annotsAny) {
      const arr: unknown[] = annotsAny.asArray ? annotsAny.asArray() : annotsAny;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = doc.context as any;

      const indicesToRemove: number[] = [];
      for (let i = 0; i < arr.length; i++) {
        const obj = ctx.lookup(arr[i]);
        if (!obj || !obj.get) continue;
        const subtypeStr = obj.get(ctx.obj("Subtype"))?.toString?.() ?? "";
        if (!subtypeStr.includes("FreeText")) continue;
        const tRaw = obj.get(ctx.obj("T"))?.toString?.() ?? "";
        const t = tRaw.replace(/^\(|\)$/g, "").trim();
        if (!(t in headerByName)) continue;
        const text = headerByName[t];
        const rectObj = obj.get(ctx.obj("Rect"));
        if (!rectObj || !rectObj.asArray) continue;
        const rArr = rectObj.asArray();
        const x1 = rArr[0]?.asNumber?.();
        const y1 = rArr[1]?.asNumber?.();
        const y2 = rArr[3]?.asNumber?.();
        if (
          typeof x1 !== "number" ||
          typeof y1 !== "number" ||
          typeof y2 !== "number"
        ) continue;
        if (text) {
          const size = t === "OrgName" ? 15 : 13;
          const x = x1 + 4;
          const y = (y1 + y2) / 2 - size / 3;
          page0.drawText(text, { x, y, size, font, color: BLACK });
        }
        indicesToRemove.push(i);
      }
      // Remove the annotations so their visual overlay (border/icon) doesn't cover our text
      indicesToRemove.sort((a, b) => b - a).forEach((idx) => {
        if (typeof annotsAny.remove === "function") annotsAny.remove(idx);
      });
    }
  } catch {
    /* silently ignore */
  }

  const page1 = doc.getPage(0);
  const page2 = doc.getPage(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const draw = (page: any, text: string, col: [number, number], rowY: number, size?: number) => {
    drawCentered(page, text, col, rowY + Y_OFFSET, font, size);
  };

  // Header
  const monthStr = MONTH_NAMES[data.month - 1];
  draw(page1, monthStr, [430, 545], 509);
  draw(page1, String(data.year), [545, 605], 509);
  draw(page1, data.workerName, [197, 344], 495);

  const daysInMonth = new Date(data.year, data.month, 0).getDate();

  // Page 1: days 1–22
  for (let i = 0; i < 22 && i + 1 <= daysInMonth; i++) {
    const dayNum = i + 1;
    const date = new Date(data.year, data.month - 1, dayNum);
    const dd = String(dayNum).padStart(2, "0");
    const mm = String(data.month).padStart(2, "0");
    const label = `${dd}.${mm}.${data.year}. ${DAY_NAMES[date.getDay()]}`;
    const y = ROWS_P1[i];

    draw(page1, label, COLS.date, y, 8);

    const entry = data.days[i];
    if (entry) {
      const xMark = entry.absence && !entry.startTime && !entry.endTime;
      draw(page1, xMark ? "x" : entry.startTime, COLS.startTime, y);
      draw(page1, xMark ? "x" : entry.endTime, COLS.endTime, y);
      draw(page1, entry.zastoj, COLS.zastoj, y);
      draw(page1, calcTotalDaily(entry), COLS.totalDaily, y);
      draw(page1, entry.fieldWork, COLS.fieldWork, y);
      draw(page1, entry.standby, COLS.standby, y);
      draw(page1, entry.absence, COLS.absence, y);
      draw(page1, entry.other, COLS.other, y);
      draw(page1, calcTotalHrs(entry), COLS.totalHrs, y);
    }
  }

  // Page 2: days 23–31
  for (let i = 0; i < 9 && i + 23 <= daysInMonth; i++) {
    const dayNum = i + 23;
    const date = new Date(data.year, data.month - 1, dayNum);
    const dd = String(dayNum).padStart(2, "0");
    const mm = String(data.month).padStart(2, "0");
    const label = `${dd}.${mm}.${data.year}. ${DAY_NAMES[date.getDay()]}`;
    const y = ROWS_P2[i];

    draw(page2, label, COLS.date, y, 8);

    const entry = data.days[i + 22];
    if (entry) {
      const xMark = entry.absence && !entry.startTime && !entry.endTime;
      draw(page2, xMark ? "x" : entry.startTime, COLS.startTime, y);
      draw(page2, xMark ? "x" : entry.endTime, COLS.endTime, y);
      draw(page2, entry.zastoj, COLS.zastoj, y);
      draw(page2, calcTotalDaily(entry), COLS.totalDaily, y);
      draw(page2, entry.fieldWork, COLS.fieldWork, y);
      draw(page2, entry.standby, COLS.standby, y);
      draw(page2, entry.absence, COLS.absence, y);
      draw(page2, entry.other, COLS.other, y);
      draw(page2, calcTotalHrs(entry), COLS.totalHrs, y);
    }
  }

  // Total monthly hours — sum of daily minutes across all days
  let totalMins = 0;
  for (let i = 0; i < daysInMonth; i++) {
    const entry = data.days[i];
    if (!entry) continue;
    const start = parseTimeToMins(entry.startTime);
    const end = parseTimeToMins(entry.endTime);
    if (start === null || end === null) continue;
    const zastojMins = Math.round((parseFloat(entry.zastoj.replace(",", ".")) || 0) * 60);
    const total = end - start - zastojMins;
    if (total > 0) totalMins += total;
  }
  if (totalMins > 0) {
    draw(page2, minsToHM(totalMins), COLS.totalHrs, 365);
  }

  while (doc.getPageCount() > 2) {
    doc.removePage(doc.getPageCount() - 1);
  }

  return doc.save();
}
