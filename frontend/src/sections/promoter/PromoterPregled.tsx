"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  getMojeReklame,
  obrisiReklamu,
  promijeniStatusReklame,
  type PromoterReklama,
} from "src/api/reklame";
import { nazivPozicije, nazivStranice } from "src/data/reklame";
import { STANJE, fmtBroj, fmtCtr, fmtTermin, porukaGreske } from "./format";
import s from "./promoter.module.css";

export const REKLAME_KEY = ["promoter-reklame"];

export default function PromoterPregled() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: reklame, isLoading, error } = useQuery({
    queryKey: REKLAME_KEY,
    queryFn: () => unwrap(getMojeReklame()),
  });

  const status = useMutation({
    mutationFn: (r: PromoterReklama) =>
      unwrap(
        promijeniStatusReklame(r.id, r.status === "AKTIVNA" ? "PAUZIRANA" : "AKTIVNA"),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: REKLAME_KEY }),
  });

  const brisanje = useMutation({
    mutationFn: (id: number) => unwrap(obrisiReklamu(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: REKLAME_KEY }),
  });

  const lista = reklame ?? [];
  const uToku = lista.filter((r) => r.stanje === "UTOKU").length;
  const zakazane = lista.filter((r) => r.stanje === "ZAKAZANA").length;
  const prikazi = lista.reduce((z, r) => z + r.prikazi, 0);
  const klikovi = lista.reduce((z, r) => z + r.klikovi, 0);

  return (
    <div className={s.stranica}>
      <div className={s.zaglavlje}>
        <div>
          <p className={s.eyebrow}>Oglašivač</p>
          <h1 className={s.naslov}>Moje reklame</h1>
          <p className={s.podnaslov}>
            Reklama ide uživo čim je sačuvate i vrti se samo u terminu koji
            zadate. Kad je više reklama na istoj poziciji, prikazuju se
            naizmjenično.
          </p>
        </div>
        <Link href="/promoter/reklame/nova" className={s.primarno}>
          + Nova reklama
        </Link>
      </div>

      <div className={s.kpiRed}>
        <Kpi label="U toku" vrijednost={fmtBroj(uToku)} sub={`${zakazane} zakazano`} />
        <Kpi label="Prikazi" vrijednost={fmtBroj(prikazi)} sub="ukupno" />
        <Kpi label="Klikovi" vrijednost={fmtBroj(klikovi)} sub="ukupno" />
        <Kpi label="CTR" vrijednost={fmtCtr(prikazi, klikovi)} sub="klikovi / prikazi" />
      </div>

      {error && <p className={s.greska}>{porukaGreske(error)}</p>}
      {(status.error || brisanje.error) && (
        <p className={s.greska}>{porukaGreske(status.error || brisanje.error)}</p>
      )}

      {isLoading ? (
        <p className={s.prazno}>Učitavanje...</p>
      ) : lista.length === 0 ? (
        <div className={s.praznoStanje}>
          <p className={s.praznoNaslov}>Još nemate nijednu reklamu</p>
          <p>
            Napravite prvu: izaberite stranice i pozicije, učitajte baner ili
            popunite šablon, i zadajte termin prikazivanja.
          </p>
          <Link href="/promoter/reklame/nova" className={s.primarno}>
            Napravi reklamu
          </Link>
        </div>
      ) : (
        <div className={s.kartica}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Reklama</th>
                <th>Stanje</th>
                <th>Termin</th>
                <th>Gdje</th>
                <th className={s.broj}>Prikazi</th>
                <th className={s.broj}>Klikovi</th>
                <th className={s.broj}>CTR</th>
                <th aria-label="Akcije" />
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => {
                const st = STANJE[r.stanje];
                return (
                  <tr
                    key={r.id}
                    className={s.red}
                    onClick={() => router.push(`/promoter/reklame/${r.id}`)}
                  >
                    <td data-label="Reklama">
                      <span className={s.redNaziv}>{r.naziv}</span>
                      <span className={s.redSub}>
                        {r.brend} · {r.format === "SLIKA" ? "baner" : "šablon"}
                      </span>
                      {r.promoter && (
                        <span className={s.redSub}>
                          Promoter: {`${r.promoter.firstName} ${r.promoter.lastName}`.trim()}
                          {r.promoter.email ? ` (${r.promoter.email})` : ""}
                        </span>
                      )}
                    </td>
                    <td data-label="Stanje">
                      <span className={`${s.badge} ${s[st.cls]}`}>{st.label}</span>
                    </td>
                    <td data-label="Termin" className={s.nowrap}>
                      {fmtTermin(r.pocetak, false)} – {fmtTermin(r.kraj, false)}
                    </td>
                    <td data-label="Gdje">
                      <span className={s.redSub}>
                        {r.stranice.map(nazivStranice).join(", ")}
                      </span>
                      <span className={s.redSub}>
                        {r.pozicije.map(nazivPozicije).join(", ")}
                      </span>
                    </td>
                    <td data-label="Prikazi" className={s.broj}>
                      {fmtBroj(r.prikazi)}
                    </td>
                    <td data-label="Klikovi" className={s.broj}>
                      {fmtBroj(r.klikovi)}
                    </td>
                    <td data-label="CTR" className={s.broj}>
                      {fmtCtr(r.prikazi, r.klikovi)}
                    </td>
                    <td className={s.akcije} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={s.sekundarnoMalo}
                        disabled={status.isPending || r.stanje === "ISTEKLA"}
                        onClick={() => status.mutate(r)}
                      >
                        {r.status === "AKTIVNA" ? "Pauziraj" : "Pokreni"}
                      </button>
                      <button
                        type="button"
                        className={s.opasnoMalo}
                        disabled={brisanje.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Obrisati reklamu "${r.naziv}"? Brišu se i njeni prikazi i klikovi.`,
                            )
                          ) {
                            brisanje.mutate(r.id);
                          }
                        }}
                      >
                        Obriši
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, vrijednost, sub }: { label: string; vrijednost: string; sub: string }) {
  return (
    <div className={s.kpi}>
      <span className={s.kpiLabel}>{label}</span>
      <span className={s.kpiVrijednost}>{vrijednost}</span>
      <span className={s.kpiSub}>{sub}</span>
    </div>
  );
}
