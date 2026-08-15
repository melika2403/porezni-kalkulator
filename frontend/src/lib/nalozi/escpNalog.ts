// ──────────────────────────────────────────────────────────────────────────────
//  Nalog za plaćanje (matrični štampač): direktna ESC/P štampa.
//
//  Generiše sirovi ESC/P tok (.prn) za EPSON LX-350 na pred-štampanom Grafis
//  obrascu (kontinuirana traktorska traka, korak naloga 4 inča = 24 linije na
//  6 lpi). Fajl se na klijentskom računaru sirovo kopira na pisač (assoc/ftype
//  + copy /b, vidi docs/faza1-escp-stampa-naloga.md DIO B), pisač interpretira
//  kodove svojim ugrađenim fontom, bez drivera.
//
//  Pozicioniranje: jedini izvor istine je mreža (linija, kolona) iz starog
//  programa (FIELD_MAP_TIP1). Horizontala ide ESC $ apsolutno u 1/60 inča:
//  na 12 cpi znak je 5/60 inča, pa kolona k → (k - 1) × 5 jedinica.
//
//  Fajl je NAMJERNO bez ijednog importa: backend unit testovi ga učitavaju
//  direktno kroz Node type-stripping (backend/test/escpNalog.test.js).
// ──────────────────────────────────────────────────────────────────────────────

export type NalogField = { key: string; line: number; col: number };
export type NalogValues = Record<string, string>;

// Mapa polja, obrazac tip 1. Kolone VEĆ uključuju "horizontalni pomak" (+4) iz
// starog programa, ne dodavati ga ponovo. Linije srednjeg pojasa (mjesto/
// datum/period/vrsta prihoda) i kolona budžetske organizacije su korigovane
// 12.8.2026. po poređenju sa referentnim Com_Soft ispisom na papiru.
export const FIELD_MAP_TIP1: NalogField[] = [
  { key: "uplatio1", line: 1, col: 21 },
  { key: "uplatio2", line: 2, col: 4 },
  { key: "uplatio3", line: 3, col: 4 },
  { key: "racunPosiljaoca", line: 3, col: 48 },
  { key: "svrha1", line: 4, col: 12 },
  { key: "svrha2", line: 5, col: 4 },
  { key: "racunPrimaoca", line: 5, col: 48 },
  { key: "svrha3", line: 6, col: 4 },
  { key: "primalac1", line: 7, col: 14 },
  { key: "iznos", line: 7, col: 48 },
  { key: "hitno", line: 7, col: 70 },
  { key: "primalac2", line: 8, col: 4 },
  { key: "primalac3", line: 9, col: 4 },
  { key: "brojObveznika", line: 10, col: 47 },
  { key: "vrstaUplate", line: 10, col: 77 },
  { key: "mjestoUplate", line: 12, col: 8 },
  { key: "datumUplate", line: 12, col: 26 },
  // period: parovi sa duplim razmakom (korak 4 znaka = korak kućica obrasca),
  // početak 2 lijevo od ranijeg; budžetska: razmak između svake cifre, 1 desno
  // (kalibrisano po probnoj štampi 13.8.2026.)
  { key: "periodOd", line: 12, col: 68 },
  { key: "vrstaPrihoda", line: 13, col: 47 },
  { key: "periodDo", line: 14, col: 68 },
  { key: "opcina", line: 16, col: 47 },
  { key: "budzetskaOrg", line: 16, col: 62 },
  { key: "pozivNaBroj", line: 18, col: 47 },
];

// Zadnja linija naloga sa sadržajem; poslije nje ide FF (bez dodatnih LF).
export const LINIJA_MAX = 21;
/** Dužina forme u linijama (ESC C 24), korak naloga na traci. */
export const DUZINA_FORME = 24;
/** Najveći pomak nadolje koji ne gura ispis u sljedeću formu. */
export const MAX_POMAK_LINIJA = DUZINA_FORME - LINIJA_MAX - 1;
// Tekst ne smije preko ove kolone (desna ivica obrasca).
const KOLONA_KRAJ = 81;

// Maksimalna dužina polja: prostor do sljedećeg polja u istoj liniji, inače do
// kolone 81. Duži tekst se TVRDO reže (prelom bi pomjerio sve linije ispod).
export const MAX_DUZINA: Record<string, number> = (() => {
  const poLiniji = new Map<number, NalogField[]>();
  for (const f of FIELD_MAP_TIP1) {
    const arr = poLiniji.get(f.line) || [];
    arr.push(f);
    poLiniji.set(f.line, arr);
  }
  const out: Record<string, number> = {};
  for (const arr of poLiniji.values()) {
    arr.sort((a, b) => a.col - b.col);
    for (let i = 0; i < arr.length; i++) {
      const kraj = i + 1 < arr.length ? arr[i + 1].col : KOLONA_KRAJ;
      out[arr[i].key] = kraj - arr[i].col;
    }
  }
  return out;
})();

// Polja po liniji, sortirana po koloni (izračunato jednom).
const POLJA_PO_LINIJI: Map<number, NalogField[]> = (() => {
  const m = new Map<number, NalogField[]>();
  for (const f of FIELD_MAP_TIP1) {
    const arr = m.get(f.line) || [];
    arr.push(f);
    m.set(f.line, arr);
  }
  for (const arr of m.values()) arr.sort((a, b) => a.col - b.col);
  return m;
})();

// ── Karakteri ────────────────────────────────────────────────────────────────
// PC852 (Latin 2) bajtovi za naša slova: pisač ih ispisuje sa kvačicama kad je
// izabrana tabela PC852 (stari program štampa isto tako). ASCII mod je rezerva
// za pisač/podešavanje bez PC852 podrške: transliteracija bez kvačica.
const PC852: Record<string, number> = {
  ć: 0x86,
  Ć: 0x8f,
  č: 0x9f,
  Č: 0xac,
  ž: 0xa7,
  Ž: 0xa6,
  š: 0xe7,
  Š: 0xe6,
  đ: 0xd0,
  Đ: 0xd1,
};

const ASCII_TR: Record<string, string> = {
  č: "c",
  ć: "c",
  ž: "z",
  š: "s",
  Č: "C",
  Ć: "C",
  Ž: "Z",
  Š: "S",
};

// Transliteracija u čisti ASCII: čćžšđ → cczs + dj; velika analogno, s tim da
// se Đ u SVE-VELIKOM kontekstu ("ĐURIĆ") piše "DJ", a u miješanom ("Đurić")
// "Dj". Ostali ne-ASCII znakovi postaju "?".
export function toEscpAscii(text: string): string {
  const chars = [...String(text)];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === "đ") {
      out += "dj";
      continue;
    }
    if (c === "Đ") {
      // sljedeće slovo veliko (ili ga nema, a prethodno je veliko) → "DJ"
      const next = chars.slice(i + 1).find((x) => /[a-zA-ZčćžšđČĆŽŠĐ]/.test(x));
      const prev = chars
        .slice(0, i)
        .reverse()
        .find((x) => /[a-zA-ZčćžšđČĆŽŠĐ]/.test(x));
      const ref = next ?? prev;
      out += ref && ref === ref.toUpperCase() ? "DJ" : "Dj";
      continue;
    }
    if (ASCII_TR[c] !== undefined) {
      out += ASCII_TR[c];
      continue;
    }
    const code = c.codePointAt(0) ?? 0;
    out += code >= 0x20 && code <= 0x7e ? c : "?";
  }
  return out;
}

export type KodnaStranica = "pc852" | "ascii";

// Tekst polja → bajtovi za pisač po izabranoj kodnoj stranici. Kontrolni i
// nepoznati ne-ASCII znakovi postaju "?" (0x3F), nikad sirovi višebajtni UTF-8.
export function encodePolje(text: string, kodna: KodnaStranica): number[] {
  if (kodna === "ascii") {
    return [...toEscpAscii(text)].map((c) => c.charCodeAt(0));
  }
  const out: number[] = [];
  for (const c of String(text)) {
    const pc = PC852[c];
    if (pc !== undefined) {
      out.push(pc);
      continue;
    }
    const code = c.codePointAt(0) ?? 0;
    out.push(code >= 0x20 && code <= 0x7e ? code : 0x3f);
  }
  return out;
}

export interface PrnOpts {
  /** pc852 (default): naša slova kao u starom programu; ascii: transliteracija */
  kodnaStranica?: KodnaStranica;
  /** kalibracija: pomak svih polja u kolonama (može i negativan) */
  pomakKolona?: number;
  /** kalibracija: prazne linije prije prve linije naloga (0-3, forma je 24) */
  pomakLinija?: number;
}

const clampInt = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)));

// Jedan .prn tok za listu naloga. Struktura po specifikaciji
// (docs/faza1-escp-stampa-naloga.md): init jednom, po nalogu linije 1-21 sa
// ESC $ pozicioniranjem i CRLF, pa FF; bez reseta na kraju fajla (resetovao bi
// ESC C dužinu forme prije zadnjeg skoka).
export function buildPrn(nalozi: NalogValues[], opts: PrnOpts = {}): Uint8Array {
  const kodna: KodnaStranica = opts.kodnaStranica ?? "pc852";
  const pomakK = clampInt(opts.pomakKolona ?? 0, -10, 20);
  // Najviše 2: nalog zauzima 21 liniju, a forma je 24 (ESC C 24). Sa pomakom
  // 3 se ispiše tačno 24 linije, pisač je već na vrhu sljedeće forme, pa bi
  // FF preskočio jedan prazan nalog na traci.
  const pomakL = clampInt(opts.pomakLinija ?? 0, 0, MAX_POMAK_LINIJA);

  const out: number[] = [
    0x1b, 0x40, // ESC @  reset (vraća i 6 lpi, pa je ESC C u linijama tačan)
    0x1b, 0x21, 0x01, // ESC ! 1  12 cpi (kao stari program)
    0x1b, 0x43, 0x18, // ESC C 24  dužina forme 24 linije = 4 inča = korak naloga
    0x1b, 0x4f, // ESC O  bez skip-over-perforation (pisač ne dodaje margine)
  ];
  if (kodna === "pc852") {
    // ESC ( t: dodijeli PC852 (d2=10) tabeli 1, pa ESC t 1: izaberi je.
    out.push(0x1b, 0x28, 0x74, 0x03, 0x00, 0x01, 0x0a, 0x00);
    out.push(0x1b, 0x74, 0x01);
  }

  for (const values of nalozi) {
    for (let i = 0; i < pomakL; i++) out.push(0x0d, 0x0a);
    for (let line = 1; line <= LINIJA_MAX; line++) {
      const polja = POLJA_PO_LINIJI.get(line);
      if (polja) {
        for (const f of polja) {
          const raw = values[f.key];
          if (!raw) continue;
          // ESC $ apsolutna pozicija u 1/60 inča; 12 cpi → 5 jedinica po koloni
          const jedinice = Math.max(0, f.col - 1 + pomakK) * 5;
          out.push(0x1b, 0x24, jedinice % 256, Math.floor(jedinice / 256));
          let bytes = encodePolje(raw, kodna);
          const max = MAX_DUZINA[f.key];
          if (bytes.length > max) bytes = bytes.slice(0, max);
          out.push(...bytes);
        }
      }
      out.push(0x0d, 0x0a);
    }
    out.push(0x0c); // FF: skok na vrh sljedećeg naloga po ESC C 24
  }

  return Uint8Array.from(out);
}

// Test vrijednosti (X-evi i 9-ke, kao F3 test iz starog programa). Dužine
// X-eva su TAČNE max dužine polja izbrojane sa referentnog Com_Soft ispisa:
// sve linije lijevog bloka završavaju na koloni 34 (npr. uplatio1: 21+13,
// svrha1: 12+22, primalac1: 14+20, ostale: 4+30). Računi u grupama 3+3+8+2,
// porezni period u parovima; datum ostaje naš format (odluka vlasnika).
const X = (n: number) => "X".repeat(n);

export function testNalogValues(): NalogValues {
  return {
    uplatio1: X(13),
    uplatio2: X(30),
    uplatio3: X(30),
    racunPosiljaoca: "999 999 99999999 99",
    svrha1: X(22),
    svrha2: X(30),
    racunPrimaoca: "999 999 99999999 99",
    svrha3: X(30),
    primalac1: X(20),
    iznos: "999.999.999.999,00",
    hitno: "X",
    primalac2: X(30),
    primalac3: X(30),
    brojObveznika: "9999999999999", // JIB 13 cifara
    vrstaUplate: "9",
    mjestoUplate: X(14),
    datumUplate: "99.99.9999",
    periodOd: "99  99  99", // DD MM GG, dupli razmak = korak kućica
    vrstaPrihoda: "999999",
    periodDo: "99  99  99",
    opcina: "999",
    budzetskaOrg: "9 9 9 9 9 9 9", // cifra po kućici
    pozivNaBroj: "9999999999",
  };
}
