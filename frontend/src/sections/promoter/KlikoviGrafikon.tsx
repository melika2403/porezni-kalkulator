"use client";

import { useState } from "react";
import type { PregledKampanje } from "src/api/partner";
import type { ReklamaPozicija } from "src/data/partner";
import { fmtBroj, fmtDan } from "./format";
import p from "./portal.module.css";

// Složeni stupci klikova po danu, po grupi pozicija. Paleta je provjerena
// validatorom (dataviz): sve tri prolaze CVD i normal-vision razmak; svijetla
// roza ima nizak kontrast prema bijeloj, pa uz grafikon uvijek idu legenda,
// tooltip i tabelarni prikaz (Izvještaji).
export const GRUPE: {
  id: string;
  naziv: string;
  pozicije: ReklamaPozicija[];
  boja: string;
}[] = [
  // bočni stubovi i široki baner na početnoj: ista vrsta (vizuelni baner)
  {
    id: "bocni",
    naziv: "banneri",
    pozicije: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "BANER", "BANER_ISPOD"],
    boja: "#d9232d",
  },
  // sponzorisan tekst je nativni format (oznaka "Uz podršku" u vodiču/vijesti)
  {
    id: "nativna",
    naziv: "nativna poruka",
    pozicije: ["INLINE", "MODAL", "SPONZOR"],
    boja: "#ef8f95",
  },
  { id: "dugme", naziv: "dugme za preuzimanje", pozicije: ["DUGME"], boja: "#a61b24" },
];

export function grupisiDan(
  dan: PregledKampanje["poDanu"][number],
  metrika: "klikovi" | "prikazi",
): number[] {
  return GRUPE.map((g) =>
    g.pozicije.reduce((z, poz) => z + (dan.pozicije[poz]?.[metrika] ?? 0), 0),
  );
}

const W = 900;
const H = 320;
const LIJEVO = 36;
const DOLE = 28;
const GORE = 10;
const RAZMAK = 2; // razmak između segmenata (boja pozadine)

function lijepMaks(v: number): { maks: number; korak: number } {
  if (v <= 0) return { maks: 4, korak: 1 };
  const grubo = v / 4;
  const red = 10 ** Math.floor(Math.log10(grubo));
  const korak = [1, 2, 2.5, 5, 10].map((m) => m * red).find((k) => k >= grubo) ?? 10 * red;
  return { maks: Math.ceil(v / korak) * korak, korak };
}

// pravougaonik sa zaobljenim gornjim uglovima (kraj podatka), ravno dno
function gornjiZaobljen(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export default function KlikoviGrafikon({ poDanu }: { poDanu: PregledKampanje["poDanu"] }) {
  const [aktivan, setAktivan] = useState<number | null>(null);

  const nizovi = poDanu.map((d) => grupisiDan(d, "klikovi"));
  const zbirovi = nizovi.map((n) => n.reduce((a, b) => a + b, 0));
  const { maks, korak } = lijepMaks(Math.max(0, ...zbirovi));
  const sirinaPlot = W - LIJEVO;
  const visinaPlot = H - DOLE - GORE;
  const slot = sirinaPlot / Math.max(1, poDanu.length);
  const sirinaStupca = Math.max(3, Math.min(26, slot * 0.62));
  const y = (v: number) => GORE + visinaPlot - (v / maks) * visinaPlot;
  const korakOznake = Math.max(1, Math.ceil(poDanu.length / 6));
  const crte = Array.from({ length: Math.round(maks / korak) + 1 }, (_, i) => i * korak);
  const prazno = zbirovi.every((z) => z === 0);

  const a = aktivan !== null ? aktivan : null;

  return (
    <div className={p.grafikon}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Klikovi po danima, ukupno ${fmtBroj(zbirovi.reduce((x, z) => x + z, 0))}`}
        onMouseLeave={() => setAktivan(null)}
      >
        {crte.map((v) => (
          <g key={v}>
            <line className={p.mrezaLinija} x1={LIJEVO} x2={W} y1={y(v)} y2={y(v)} />
            <text className={p.osaTekst} x={LIJEVO - 10} y={y(v) + 4} textAnchor="end">
              {fmtBroj(v)}
            </text>
          </g>
        ))}

        {poDanu.map((d, i) => {
          const cx = LIJEVO + slot * i + slot / 2;
          const x = cx - sirinaStupca / 2;
          let dno = y(0);
          const segmenti = nizovi[i];
          const posljednji = segmenti.reduce((z, v, k) => (v > 0 ? k : z), -1);
          return (
            <g
              key={d.datum}
              className={`${p.stubac} ${a === i ? p.stubacAktivan : ""}`}
              onMouseEnter={() => setAktivan(i)}
              onFocus={() => setAktivan(i)}
              onBlur={() => setAktivan(null)}
              tabIndex={0}
              aria-label={`${fmtDan(d.datum)}: ${fmtBroj(zbirovi[i])} klikova`}
            >
              {/* zona pogotka veća od stupca: cijela visina i širina dana */}
              <rect className={p.stubacPogodak} x={LIJEVO + slot * i} y={GORE} width={slot} height={visinaPlot} />
              {segmenti.map((v, k) => {
                if (v <= 0) return null;
                const h = (v / maks) * visinaPlot;
                const vrh = dno - h;
                // razmak ispod svakog segmenta osim prvog na osnovici
                const odDna = dno === y(0) ? 0 : RAZMAK;
                const visina = Math.max(1, h - odDna);
                const el =
                  k === posljednji ? (
                    <path key={k} d={gornjiZaobljen(x, vrh, sirinaStupca, visina, 4)} fill={GRUPE[k].boja} />
                  ) : (
                    <rect key={k} x={x} y={vrh} width={sirinaStupca} height={visina} fill={GRUPE[k].boja} />
                  );
                dno = vrh;
                return el;
              })}
              {i % korakOznake === 0 && (
                <text className={p.osaTekst} x={cx} y={H - 6} textAnchor="middle">
                  {fmtDan(d.datum, true)}
                </text>
              )}
            </g>
          );
        })}

        {prazno && (
          <text className={p.osaTekst} x={LIJEVO + sirinaPlot / 2} y={GORE + visinaPlot / 2} textAnchor="middle">
            U ovom periodu još nema klikova
          </text>
        )}
      </svg>

      {a !== null && poDanu[a] && (
        <div
          className={p.tooltip}
          style={{
            // uz rubove se tooltip ne smije odsjeći
            left: `${Math.min(86, Math.max(14, ((LIJEVO + slot * a + slot / 2) / W) * 100))}%`,
            top: `${(y(zbirovi[a]) / H) * 100}%`,
          }}
        >
          <div className={p.tooltipNaslov}>{fmtDan(poDanu[a].datum)}</div>
          {GRUPE.map((g, k) => (
            <div key={g.id} className={p.tooltipRed}>
              <span>
                <span className={p.legendaKvadrat} style={{ background: g.boja }} />
                {g.naziv}
              </span>
              <strong>{fmtBroj(nizovi[a][k])}</strong>
            </div>
          ))}
          <div className={`${p.tooltipRed} ${p.tooltipUkupno}`}>
            <span>ukupno klikova</span>
            <strong>{fmtBroj(zbirovi[a])}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export function Legenda() {
  return (
    <div className={p.legenda}>
      {GRUPE.map((g) => (
        <span key={g.id} className={p.legendaStavka}>
          <span className={p.legendaKvadrat} style={{ background: g.boja }} />
          {g.naziv}
        </span>
      ))}
    </div>
  );
}
