"use client";

// Vizuelni pregled jednog naloga na pojednostavljenom Grafis obrascu.
// Ista geometrija kao štampa: x = (kolona-1) x 2.1167 mm, y = (linija-1) x
// 4.2333 mm, skalirano na širinu prikaza (papir 195x101 mm). Nije vjeran
// izgled obrasca, služi da se vidi da polja padaju na svoja mjesta.

import { FIELD_MAP_TIP1, type NalogValues } from "src/lib/nalozi/escpNalog";
import {
  MAX_POMAK_KOLONA,
  MAX_POMAK_LINIJA,
  MIN_POMAK_KOLONA,
  MIN_POMAK_LINIJA,
} from "src/lib/nalozi/postavke";

const PAPIR_W_MM = 195;
const PAPIR_H_MM = 101;
const COL_MM = 2.1167;
const LINE_MM = 4.2333;
const PRIKAZ_W = 720; // px
const SCALE = PRIKAZ_W / PAPIR_W_MM;
const CHAR_PX = COL_MM * SCALE;
const LINE_PX = LINE_MM * SCALE;
// Courier advance = 0.6 em → font-size da znak zauzme tačno jednu kolonu
const FONT_PX = CHAR_PX / 0.6;

const OBRAZAC_LABELE: { text: string; line: number; col: number }[] = [
  { text: "UPLATIO JE", line: 1, col: 4 },
  { text: "SVRHA", line: 4, col: 4 },
  { text: "PRIMALAC", line: 7, col: 4 },
  { text: "RAČUN POŠILJAOCA", line: 2.25, col: 48 },
  { text: "RAČUN PRIMAOCA", line: 4.25, col: 48 },
  { text: "IZNOS", line: 6.25, col: 48 },
  { text: "HITNO", line: 6.25, col: 70 },
  { text: "BROJ OBVEZNIKA", line: 9.25, col: 47 },
  { text: "VRSTA UPLATE", line: 9.25, col: 68 },
  { text: "MJESTO I DATUM UPLATE", line: 11.25, col: 8 },
  { text: "PERIOD OD", line: 11.25, col: 68 },
  { text: "VRSTA PRIHODA", line: 12.25, col: 47 },
  { text: "PERIOD DO", line: 13.25, col: 68 },
  { text: "OPĆINA", line: 15.25, col: 47 },
  { text: "BUDŽ. ORGANIZACIJA", line: 15.25, col: 62 },
  { text: "POZIV NA BROJ", line: 17.25, col: 47 },
];

// Kućice desnog bloka: samo širina po polju, a linija i kolona se ČITAJU iz
// FIELD_MAP_TIP1, da se pregled ne može razići sa stvarnom mrežom štampe.
const KUCICA_SIRINA: Record<string, number> = {
  racunPosiljaoca: 19, // grupe 3+3+8+2
  racunPrimaoca: 19,
  iznos: 19,
  hitno: 3,
  brojObveznika: 13, // JIB
  vrstaUplate: 2,
  periodOd: 10, // "DD  MM  GG"
  vrstaPrihoda: 6,
  periodDo: 10,
  opcina: 3,
  budzetskaOrg: 13, // cifra po kućici, "9 9 9 9 9 9 9"
  pozivNaBroj: 10,
};

const OBRAZAC_KUCICE: { line: number; col: number; w: number }[] =
  FIELD_MAP_TIP1.filter((f) => KUCICA_SIRINA[f.key] != null).map((f) => ({
    line: f.line,
    col: f.col,
    w: KUCICA_SIRINA[f.key],
  }));

export default function NalogPapir({
  values,
  naslov,
  /** kalibracioni pomaci, da pregled prati ono što će izaći na papir */
  pomakKolona = 0,
  pomakLinija = 0,
}: {
  values: NalogValues;
  naslov: string;
  pomakKolona?: number;
  pomakLinija?: number;
}) {
  const ogranici = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)));
  const kolona = ogranici(pomakKolona, MIN_POMAK_KOLONA, MAX_POMAK_KOLONA);
  const linija = ogranici(pomakLinija, MIN_POMAK_LINIJA, MAX_POMAK_LINIJA);

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          fontSize: 12.5,
          color: "var(--mid, #7a8a7d)",
          margin: "0 0 0.3rem",
        }}
      >
        {naslov}
      </div>
      <div
        style={{
          position: "relative",
          width: PRIKAZ_W,
          height: PAPIR_H_MM * SCALE,
          background: "#fffdf6",
          border: "1px solid #c9c2b4",
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        {OBRAZAC_LABELE.map((l, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: (l.col - 1) * CHAR_PX,
              top: (l.line - 1) * LINE_PX,
              fontSize: 8,
              letterSpacing: "0.04em",
              color: "#a49a86",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {l.text}
          </span>
        ))}
        {OBRAZAC_KUCICE.map((k, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: (k.col - 1) * CHAR_PX - 2,
              top: (k.line - 1) * LINE_PX - 1,
              width: k.w * CHAR_PX + 4,
              height: LINE_PX + 2,
              border: "1px solid #cdc5b5",
              borderRadius: 2,
            }}
          />
        ))}
        {FIELD_MAP_TIP1.map((f) => {
          const text = values[f.key];
          if (!text) return null;
          return (
            <span
              key={f.key}
              style={{
                position: "absolute",
                // iste granice i zaokruživanje kao buildPrn, da pregled ne
                // pokazuje poziciju koja se neće odštampati
                left: Math.max(0, f.col - 1 + kolona) * CHAR_PX,
                top: (f.line - 1 + linija) * LINE_PX,
                fontFamily: '"Courier New", monospace',
                fontSize: FONT_PX,
                lineHeight: `${LINE_PX}px`,
                color: "#1a1a1a",
                whiteSpace: "pre",
              }}
            >
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
