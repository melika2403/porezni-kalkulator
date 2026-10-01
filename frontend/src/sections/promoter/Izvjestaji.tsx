"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import { getPregledKampanje } from "src/api/partner";
import { fmtBroj, fmtCtr, porukaGreske } from "./format";
import { PREGLED_KEY } from "./kljucevi";
import { GRUPE, grupisiDan } from "./KlikoviGrafikon";
import { IzvozDugme, PeriodIzbor } from "./PregledKampanje";
import p from "./portal.module.css";

// Tabelarni prikaz po danima (i tekstualna alternativa grafikonu sa Pregleda).
export default function Izvjestaji() {
  const [dana, setDana] = useState(30);
  const { data, isLoading, error } = useQuery({
    queryKey: PREGLED_KEY(dana),
    queryFn: () => unwrap(getPregledKampanje(dana)),
    placeholderData: (prev) => prev,
  });

  const dani = [...(data?.poDanu ?? [])].reverse();

  return (
    <>
      <div className={p.zaglavlje}>
        <div>
          <h1 className={p.naslov}>Izvještaji</h1>
          <p className={p.podnaslov}>
            Prikazi i klikovi po danu i grupi pozicija. CSV sadrži detalje po kreativi, stranici i
            poziciji.
          </p>
        </div>
        <div className={p.akcijeZaglavlja}>
          <PeriodIzbor dana={dana} onChange={setDana} />
          <IzvozDugme dana={dana} />
        </div>
      </div>

      {error && <p className={p.greska}>{porukaGreske(error)}</p>}

      <section className={p.kartica}>
        {isLoading && !data ? (
          <p className={p.prazno}>Učitavanje...</p>
        ) : (
          <div className={p.tabelaOkvir} style={{ marginTop: -20 }}>
            <table className={p.tabela}>
              <thead>
                <tr>
                  <th>Dan</th>
                  <th>Prikazi</th>
                  {GRUPE.map((g) => (
                    <th key={g.id}>Klikovi, {g.naziv}</th>
                  ))}
                  <th>Klikovi ukupno</th>
                  <th>CTR</th>
                </tr>
              </thead>
              <tbody>
                {dani.map((d) => {
                  const prikazi = grupisiDan(d, "prikazi").reduce((a, b) => a + b, 0);
                  const kl = grupisiDan(d, "klikovi");
                  const ukupno = kl.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={d.datum}>
                      <td>{d.datum.split("-").reverse().join(".")}.</td>
                      <td className={p.broj}>{fmtBroj(prikazi)}</td>
                      {kl.map((v, i) => (
                        <td key={GRUPE[i].id}>{fmtBroj(v)}</td>
                      ))}
                      <td className={p.broj}>{fmtBroj(ukupno)}</td>
                      <td className={p.ctr}>{fmtCtr(prikazi, ukupno)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
