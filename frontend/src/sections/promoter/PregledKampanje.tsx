"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import { getPregledKampanje, preuzmiIzvoz } from "src/api/reklame";
import { kratkoStranice, nazivPozicije } from "src/data/reklame";
import { fmtBroj, fmtCtr, fmtTermin, porukaGreske } from "./format";
import { PREGLED_KEY } from "./kljucevi";
import KlikoviGrafikon, { Legenda } from "./KlikoviGrafikon";
import KreativaRed from "./KreativaRed";
import p from "./portal.module.css";

export const PERIODI = [
  { dana: 7, naziv: "Zadnjih 7 dana" },
  { dana: 30, naziv: "Zadnjih 30 dana" },
  { dana: 90, naziv: "Zadnjih 90 dana" },
];

function promjena(sada: number, prije: number): string {
  if (!prije) return sada ? "nema podataka za prethodni period" : "bez promjene";
  const pct = Math.round(((sada - prije) / prije) * 100);
  return `${pct > 0 ? "+" : ""}${pct}% vs. prethodni period`;
}

export function PeriodIzbor({
  dana,
  onChange,
}: {
  dana: number;
  onChange: (d: number) => void;
}) {
  return (
    <select
      className={p.select}
      value={dana}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label="Period"
    >
      {PERIODI.map((x) => (
        <option key={x.dana} value={x.dana}>
          {x.naziv}
        </option>
      ))}
    </select>
  );
}

export function IzvozDugme({ dana }: { dana: number }) {
  const izvoz = useMutation({ mutationFn: () => preuzmiIzvoz(dana) });
  return (
    <button
      type="button"
      className={p.dugmeZeleno}
      disabled={izvoz.isPending}
      onClick={() => izvoz.mutate()}
      title={izvoz.error ? porukaGreske(izvoz.error) : undefined}
    >
      {izvoz.isPending ? "Izvoz..." : "Izvoz CSV"}
    </button>
  );
}

export default function PregledKampanje() {
  const [dana, setDana] = useState(30);
  const { data, isLoading, error } = useQuery({
    queryKey: PREGLED_KEY(dana),
    queryFn: () => unwrap(getPregledKampanje(dana)),
    placeholderData: (prev) => prev,
  });

  const reklame = data?.reklame ?? [];
  const aktivne = reklame.filter((r) => r.stanje === "UTOKU").length;
  const brend = reklame[0]?.brend;
  const najranija = reklame.length
    ? reklame.reduce((m, r) => (r.pocetak < m ? r.pocetak : m), reklame[0].pocetak)
    : null;
  const u = data?.ukupno ?? { prikazi: 0, klikovi: 0 };
  const pr = data?.prethodno ?? { prikazi: 0, klikovi: 0 };

  return (
    <>
      <div className={p.zaglavlje}>
        <div>
          <h1 className={p.naslov}>Pregled kampanje</h1>
          <p className={p.podnaslov}>
            {brend ? `${brend} · bankarski partner` : "Bankarski partner"}
            {najranija ? `  ·  kampanja od ${fmtTermin(najranija, false)}` : ""}
          </p>
        </div>
        <div className={p.akcijeZaglavlja}>
          <PeriodIzbor dana={dana} onChange={setDana} />
          <IzvozDugme dana={dana} />
        </div>
      </div>

      {error && <p className={p.greska}>{porukaGreske(error)}</p>}

      <div className={p.kpiRed}>
        <div className={p.kpi}>
          <span className={p.kpiLabel}>Prikazi</span>
          <span className={p.kpiVrijednost}>{fmtBroj(u.prikazi)}</span>
          <span className={p.kpiSub}>{promjena(u.prikazi, pr.prikazi)}</span>
        </div>
        <div className={p.kpi}>
          <span className={p.kpiLabel}>Klikovi</span>
          <span className={p.kpiVrijednost}>{fmtBroj(u.klikovi)}</span>
          <span className={p.kpiSub}>{promjena(u.klikovi, pr.klikovi)}</span>
        </div>
        <div className={p.kpi}>
          <span className={p.kpiLabel}>CTR</span>
          <span className={p.kpiVrijednost}>{fmtCtr(u.prikazi, u.klikovi)}</span>
          <span className={p.kpiSub}>prosjek svih pozicija</span>
        </div>
        <div className={p.kpi}>
          <span className={p.kpiLabel}>Aktivne kreative</span>
          <span className={`${p.kpiVrijednost} ${p.kpiVrijednostTamna}`}>{aktivne}</span>
          <span className={p.kpiSub}>od {reklame.length} učitanih</span>
        </div>
      </div>

      <div className={p.srednjiRed}>
        <section className={p.kartica}>
          <div className={p.karticaGlava}>
            <h2 className={p.karticaNaslov}>Klikovi po danima</h2>
            <Legenda />
          </div>
          {isLoading && !data ? (
            <p className={p.prazno}>Učitavanje...</p>
          ) : (
            <KlikoviGrafikon poDanu={data?.poDanu ?? []} />
          )}
        </section>

        <section className={p.kartica}>
          <div className={p.karticaGlava}>
            <h2 className={p.karticaNaslov}>Kreative</h2>
            <Link href="/promoter/kreative/nova" className={p.dugmeCrveno}>
              + Nova kreativa
            </Link>
          </div>
          {reklame.length === 0 ? (
            <p className={p.prazno}>Još nema kreativa. Napravite prvu.</p>
          ) : (
            <ul className={p.kreativeLista}>
              {reklame.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <KreativaRed r={r} />
                </li>
              ))}
            </ul>
          )}
          {reklame.length > 5 && (
            <p className={p.napomena}>
              <Link href="/promoter/kreative">Sve kreative ({reklame.length})</Link>
            </p>
          )}
          <p className={p.napomena}>Promjene su vidljive na portalu odmah, bez odobrenja.</p>
        </section>
      </div>

      <section className={p.kartica}>
        <div className={p.karticaGlava}>
          <h2 className={p.karticaNaslov}>Rezultati po poziciji</h2>
        </div>
        {!data || data.poPoziciji.length === 0 ? (
          <p className={p.prazno}>U ovom periodu još nema prikaza.</p>
        ) : (
          <div className={p.tabelaOkvir}>
            <table className={p.tabela}>
              <thead>
                <tr>
                  <th>Pozicija</th>
                  <th>Stranica</th>
                  <th>Kreativa</th>
                  <th>Prikazi</th>
                  <th>Klikovi</th>
                  <th>CTR</th>
                  <th>Raspored</th>
                </tr>
              </thead>
              <tbody>
                {data.poPoziciji.map((r) => (
                  <tr key={`${r.pozicija}-${r.reklamaId}`}>
                    <td>{nazivPozicije(r.pozicija)}</td>
                    <td>{r.stranice.map(kratkoStranice).join(", ")}</td>
                    <td>{r.naziv}</td>
                    <td className={p.broj}>{fmtBroj(r.prikazi)}</td>
                    <td className={p.broj}>{fmtBroj(r.klikovi)}</td>
                    <td className={p.ctr}>{fmtCtr(r.prikazi, r.klikovi)}</td>
                    <td>
                      <Link href={`/promoter/kreative/${r.reklamaId}`} className={p.dugmeMalo}>
                        Promijeni
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
