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
  orgCity?: string;
  orgTaxNumber?: string;
  /** Set of weekday numbers (0=Ned, 1=Pon, ..., 6=Sub) that are weekly days off.
   *  On these days, absence code "9.1" is treated as sedmični odmor (0h). */
  weeklyDaysOff?: number[];
  /** Paid-absence codes that count as 8h in totals. Defaults to all 5
   *  (9.1 godišnji, 9.2 praznik, 9.3 bolovanje, 9.4 porodiljsko, 9.5 plaćeno). */
  countAbsenceCodes?: string[];
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

const ROW_STEP = 16;
const ROWS_P1 = Array.from({ length: 22 }, (_, i) => 418 - i * ROW_STEP);
const ROWS_P2 = Array.from({ length: 9 }, (_, i) => 510 - i * ROW_STEP);

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

// Codes that represent PAID absence — count as standard 8h workday in totals
const PAID_ABSENCE_DEFAULT = new Set(["9.1", "9.2", "9.3", "9.4", "9.5"]);
const PAID_ABSENCE_MINS = 8 * 60;

function calcDailyMins(
  entry: DayEntry,
  isWeeklyDayOff: boolean,
  countCodes: Set<string>,
): number {
  // Manually entered times override absence code semantics.
  const start = parseTimeToMins(entry.startTime);
  const end = parseTimeToMins(entry.endTime);
  if (start !== null && end !== null) {
    const zastojMins = Math.round((parseFloat(entry.zastoj.replace(",", ".")) || 0) * 60);
    return Math.max(0, end - start - zastojMins);
  }
  if (entry.absence) {
    const code = entry.absence.trim();
    if (PAID_ABSENCE_DEFAULT.has(code)) {
      if (code === "9.1" && isWeeklyDayOff) return 0;
      return countCodes.has(code) ? PAID_ABSENCE_MINS : 0;
    }
  }
  return 0;
}

function calcTotalDaily(
  entry: DayEntry,
  isWeeklyDayOff: boolean,
  countCodes: Set<string>,
): string {
  const mins = calcDailyMins(entry, isWeeklyDayOff, countCodes);
  return mins > 0 ? minsToHM(mins) : "";
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

function drawLeft(
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
  page.drawText(text, { x: col[0] + 3, y, size, font, color: BLACK });
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

  // Novi template ima jedan FreeText box za podatke o firmi — unutar njega
  // crtamo 3 linije stack-ovane od vrha: naziv, adresa, JIB. Stari template
  // imao je 3 odvojena boxa (OrgName/OrgAddress/OrgJIB) — kod podržava oba
  // slučaja: ako naiđe na jedan box (bilo kojeg od poznatih imena), tretira
  // ga kao kombinovani; ako naiđe na više, koristi svaki za svoju vrijednost.
  const KNOWN_HEADER_NAMES = new Set(["OrgName", "OrgAddress", "OrgJIB", "OrgInfo", "OrgHeader"]);
  const addressLine = [data.orgAddress, data.orgCity]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(", ");
  const orgLines = [
    { text: data.orgName ?? "", size: 14 },
    { text: addressLine, size: 11 },
    { text: data.orgTaxNumber ? `ID: ${data.orgTaxNumber}` : "", size: 11 },
  ];
  try {
    const page0 = doc.getPage(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = page0.node as any;
    const annotsAny = node.Annots?.();
    if (annotsAny) {
      const arr: unknown[] = annotsAny.asArray ? annotsAny.asArray() : annotsAny;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = doc.context as any;

      // Prikupi sve header anotacije sa rect-ovima.
      type AnnInfo = {
        index: number;
        name: string;
        x1: number;
        y1: number;
        y2: number;
      };
      const headerAnns: AnnInfo[] = [];
      for (let i = 0; i < arr.length; i++) {
        const obj = ctx.lookup(arr[i]);
        if (!obj || !obj.get) continue;
        const subtypeStr = obj.get(ctx.obj("Subtype"))?.toString?.() ?? "";
        if (!subtypeStr.includes("FreeText")) continue;
        const tRaw = obj.get(ctx.obj("T"))?.toString?.() ?? "";
        const t = tRaw.replace(/^\(|\)$/g, "").trim();
        if (!KNOWN_HEADER_NAMES.has(t)) continue;
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
        headerAnns.push({ index: i, name: t, x1, y1, y2 });
      }

      const indicesToRemove: number[] = [];

      if (headerAnns.length === 1) {
        // Novi template — jedan box, 3 linije unutra od vrha.
        const ann = headerAnns[0];
        let y = ann.y2 - 4; // 4pt padding ispod gornjeg ruba
        for (const line of orgLines) {
          if (!line.text) continue;
          y -= line.size; // baseline = top minus font size
          page0.drawText(line.text, {
            x: ann.x1 + 4,
            y,
            size: line.size,
            font,
            color: BLACK,
          });
          y -= 3; // razmak između linija
        }
        indicesToRemove.push(ann.index);
      } else if (headerAnns.length > 1) {
        // Stari template — 3 odvojena boxa, svaki za svoju vrijednost.
        const valueByName: Record<string, string> = {
          OrgName: data.orgName ?? "",
          OrgAddress: data.orgAddress ?? "",
          OrgJIB: data.orgTaxNumber ?? "",
        };
        for (const ann of headerAnns) {
          const text = valueByName[ann.name];
          if (text) {
            const size = ann.name === "OrgName" ? 14 : 11;
            const x = ann.x1 + 4;
            const y = (ann.y1 + ann.y2) / 2 - size / 3 - 12;
            page0.drawText(text, { x, y, size, font, color: BLACK });
          }
          indicesToRemove.push(ann.index);
        }
      }

      // Skini anotacije nakon crtanja (da se ne vidi border/ikona).
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawL = (page: any, text: string, col: [number, number], rowY: number, size?: number) => {
    drawLeft(page, text, col, rowY + Y_OFFSET, font, size);
  };

  // Header
  const monthStr = `${MONTH_NAMES[data.month - 1]} (${String(data.month).padStart(2, "0")})`;
  draw(page1, monthStr, [430, 545], 509);
  draw(page1, String(data.year), [545, 605], 509);
  draw(page1, data.workerName, [197, 344], 495);

  const daysInMonth = new Date(data.year, data.month, 0).getDate();
  const weeklyOffSet = new Set(data.weeklyDaysOff ?? []);
  const isWeeklyOff = (dayNum: number) =>
    weeklyOffSet.has(new Date(data.year, data.month - 1, dayNum).getDay());
  const countCodes = data.countAbsenceCodes
    ? new Set(data.countAbsenceCodes)
    : PAID_ABSENCE_DEFAULT;

  // Page 1: days 1–22
  for (let i = 0; i < 22 && i + 1 <= daysInMonth; i++) {
    const dayNum = i + 1;
    const date = new Date(data.year, data.month - 1, dayNum);
    const dd = String(dayNum).padStart(2, "0");
    const mm = String(data.month).padStart(2, "0");
    const label = `${dd}.${mm}.${data.year}. ${DAY_NAMES[date.getDay()]}`;
    const y = ROWS_P1[i];

    drawL(page1, label, COLS.date, y, 8);

    const entry = data.days[i];
    if (entry) {
      const wOff = isWeeklyOff(dayNum);
      const xMark = entry.absence && !entry.startTime && !entry.endTime;
      if (xMark) {
        draw(page1, "x", COLS.startTime, y);
        draw(page1, "x", COLS.endTime, y);
      } else {
        draw(page1, entry.startTime, COLS.startTime, y);
        draw(page1, entry.endTime, COLS.endTime, y);
      }
      draw(page1, entry.zastoj ? `${entry.zastoj}h` : "", COLS.zastoj, y);
      draw(page1, calcTotalDaily(entry, wOff, countCodes), COLS.totalDaily, y);
      draw(page1, entry.fieldWork, COLS.fieldWork, y);
      draw(page1, entry.standby, COLS.standby, y);
      draw(page1, entry.absence, COLS.absence, y);
      draw(page1, entry.other, COLS.other, y);
      draw(page1, calcTotalDaily(entry, wOff, countCodes), COLS.totalHrs, y);
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

    drawL(page2, label, COLS.date, y, 8);

    const entry = data.days[i + 22];
    if (entry) {
      const wOff = isWeeklyOff(dayNum);
      const xMark = entry.absence && !entry.startTime && !entry.endTime;
      if (xMark) {
        draw(page2, "x", COLS.startTime, y);
        draw(page2, "x", COLS.endTime, y);
      } else {
        draw(page2, entry.startTime, COLS.startTime, y);
        draw(page2, entry.endTime, COLS.endTime, y);
      }
      draw(page2, entry.zastoj ? `${entry.zastoj}h` : "", COLS.zastoj, y);
      draw(page2, calcTotalDaily(entry, wOff, countCodes), COLS.totalDaily, y);
      draw(page2, entry.fieldWork, COLS.fieldWork, y);
      draw(page2, entry.standby, COLS.standby, y);
      draw(page2, entry.absence, COLS.absence, y);
      draw(page2, entry.other, COLS.other, y);
      draw(page2, calcTotalDaily(entry, wOff, countCodes), COLS.totalHrs, y);
    }
  }

  // Total monthly hours — sum of daily minutes across all days
  // (includes paid absences like godišnji/bolovanje as 8h)
  let totalMins = 0;
  for (let i = 0; i < daysInMonth; i++) {
    const entry = data.days[i];
    if (!entry) continue;
    totalMins += calcDailyMins(entry, isWeeklyOff(i + 1), countCodes);
  }
  if (totalMins > 0) {
    draw(page2, minsToHM(totalMins), COLS.totalHrs, 365, 12);
  }

  while (doc.getPageCount() > 2) {
    doc.removePage(doc.getPageCount() - 1);
  }

  return doc.save();
}
