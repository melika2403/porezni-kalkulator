// ─────────────────────────────────────────────────────────────────────────────
//  "Kopiraj u idući mjesec": raspored se prenosi IZ POPUNJENE šihterice, ne iz
//  auto-popune. Obrazac se ponavlja na 14 dana (dvije sedmice), pa se nastavlja
//  i rad u smjenama koje se mijenjaju svake sedmice (sedmica 08:00-16:30, pa
//  sedmica 14:30-23:00), a običan sedmični raspored ostaje isti kao do sada.
//
//  Dan idućeg mjeseca uzima dan iz tekućeg mjeseca koji je 14, 28 ili 42 dana
//  ranije (isti dan u sedmici i ista sedmica u ciklusu). Uzima se prvi koji je
//  "raspored": upisana vremena (sa pauzom) ili 9.1 na sedmični slobodan dan.
//  Godišnji, praznik, bolovanje i prazni dani se preskaču, pa se uzima dan još
//  14 dana ranije; ako ni jedan nije upotrebljiv, ide auto-popuna (slobodni
//  dani → 9.1, ostalo → početak/kraj/pauza iz auto-popune).
//
//  Slobodni dani = oni iz auto-popune + dani u sedmici koji su u tekućem
//  mjesecu SVAKI put 9.1 bez vremena, dok su ostali dani radni. Tako i radnik
//  čiji slobodni dani u auto-popuni nisu podešeni (npr. slobodan četvrtak)
//  dobije ispravan idući mjesec, a godišnji odmor se ne prenosi kao slobodan
//  dan (dok traje godišnji, isti dani u sedmici su u ostatku mjeseca radni).
// ─────────────────────────────────────────────────────────────────────────────

import type { DayEntry } from "./fillSihterica";

const CIKLUS_DANA = 14;

const PRAZAN: DayEntry = {
  startTime: "",
  endTime: "",
  zastoj: "",
  fieldWork: "",
  standby: "",
  absence: "",
  other: "",
};

function danUSedmici(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

// isto kao isEntryEmpty na stranici šihterice (sva polja dana)
function prazanDan(e: DayEntry | undefined): boolean {
  return (
    !e ||
    (!e.startTime &&
      !e.endTime &&
      !e.zastoj &&
      !e.fieldWork &&
      !e.standby &&
      !e.absence &&
      !e.other)
  );
}

const imaVremena = (e: DayEntry) => !!(e.startTime && e.endTime);

// Dani u sedmici koji su u mjesecu uvijek 9.1 bez vremena (bar dva puta),
// uz uslov da radnik u tom mjesecu ima i radnih dana.
function zakljuceniSlobodniDani(
  entries: DayEntry[],
  year: number,
  month: number,
  dim: number,
): Set<number> {
  const po91 = new Map<number, number>();
  const nije91 = new Set<number>();
  let radnih = 0;
  for (let d = 1; d <= dim; d++) {
    const e = entries[d - 1];
    if (prazanDan(e)) continue;
    const dow = danUSedmici(year, month, d);
    if (imaVremena(e)) radnih++;
    if (!imaVremena(e) && e.absence.trim() === "9.1") {
      po91.set(dow, (po91.get(dow) ?? 0) + 1);
    } else {
      nije91.add(dow);
    }
  }
  const out = new Set<number>();
  if (radnih === 0) return out;
  for (const [dow, n] of po91) if (n >= 2 && !nije91.has(dow)) out.add(dow);
  return out;
}

export function napraviIduciMjesec(input: {
  // tekući mjesec (izvor)
  year: number;
  month: number;
  entries: DayEntry[];
  // idući mjesec (cilj) i period prijave radnika u njemu
  nextYear: number;
  nextMonth: number;
  aktivanOd: number;
  aktivanDo: number;
  // sedmični slobodni dani radnika (Date.getDay()) i auto-popuna kao rezerva
  slobodniDani: Set<number>;
  autoStart: string;
  autoEnd: string;
  autoPauza: string;
}): (DayEntry | null)[] {
  const { year, month, entries, nextYear, nextMonth } = input;
  const dim = new Date(year, month, 0).getDate();
  const nDim = new Date(nextYear, nextMonth, 0).getDate();
  const slobodniDani = new Set([
    ...input.slobodniDani,
    ...zakljuceniSlobodniDani(entries, year, month, dim),
  ]);

  // Odsustvo u toku: skeniraj unazad od kraja mjeseca, preskoči prazne dane
  // i 9.1/9.2 (sedmični odmor/praznik na kraju mjeseca). Ako je zadnji
  // "radni" dan 9.3 ili 9.4 bez upisanih vremena → odsustvo se nastavlja.
  let nastaviSifru: string | null = null;
  for (let i = dim - 1; i >= 0; i--) {
    const e = entries[i];
    if (prazanDan(e)) continue;
    if (imaVremena(e)) break;
    const code = e.absence.trim();
    if (code === "9.3" || code === "9.4") {
      nastaviSifru = code;
      break;
    }
    if (code === "9.1" || code === "9.2") continue;
    break;
  }

  // Raspored iz izvornog dana ili null ako dan nije upotrebljiv (godišnji,
  // praznik, bolovanje, prazno).
  const rasporedIzDana = (day: number): DayEntry | null => {
    const e = entries[day - 1];
    if (prazanDan(e)) return null;
    if (imaVremena(e)) {
      return {
        ...PRAZAN,
        startTime: e.startTime,
        endTime: e.endTime,
        zastoj: e.zastoj || "",
      };
    }
    if (
      e.absence.trim() === "9.1" &&
      slobodniDani.has(danUSedmici(year, month, day))
    ) {
      return { ...PRAZAN, absence: "9.1" };
    }
    return null;
  };

  return Array.from({ length: nDim }, (_, i) => {
    const dayNum = i + 1;
    if (dayNum < input.aktivanOd || dayNum > input.aktivanDo) return null;
    const dow = danUSedmici(nextYear, nextMonth, dayNum);
    if (nastaviSifru) {
      return slobodniDani.has(dow)
        ? { ...PRAZAN, absence: "9.1" }
        : { ...PRAZAN, absence: nastaviSifru };
    }
    // Pozicija u ciklusu: dan idućeg mjeseca d odgovara danu tekućeg mjeseca
    // dim + d - 14·k (k ≥ 1). Za d > 14 prvo svedi u prvih 14 dana (isti
    // ciklus), pa idi unazad kroz tekući mjesec po 14 dana.
    const uCiklusu = ((dayNum - 1) % CIKLUS_DANA) + 1;
    for (let src = dim + uCiklusu - CIKLUS_DANA; src >= 1; src -= CIKLUS_DANA) {
      const r = rasporedIzDana(src);
      if (r) return r;
    }
    // Nema upotrebljivog dana u tekućem mjesecu: auto-popuna.
    if (slobodniDani.has(dow)) return { ...PRAZAN, absence: "9.1" };
    return {
      ...PRAZAN,
      startTime: input.autoStart,
      endTime: input.autoEnd,
      zastoj: input.autoPauza || "",
    };
  });
}
