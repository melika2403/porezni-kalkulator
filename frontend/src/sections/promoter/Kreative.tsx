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
import { kratkoStranice, nazivPozicije } from "src/data/reklame";
import { fmtBroj, fmtCtr, fmtTermin, porukaGreske } from "./format";
import { REKLAME_KEY } from "./kljucevi";
import { KreativaSlicica, StatusKreative, opisKreative } from "./KreativaRed";
import p from "./portal.module.css";

export default function Kreative() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: REKLAME_KEY,
    queryFn: () => unwrap(getMojeReklame()),
  });

  const osvjezi = () => {
    qc.invalidateQueries({ queryKey: REKLAME_KEY });
    qc.invalidateQueries({ queryKey: ["promoter-pregled"] });
    qc.invalidateQueries({ queryKey: ["reklame-aktivne"] });
  };

  const status = useMutation({
    mutationFn: (r: PromoterReklama) =>
      unwrap(promijeniStatusReklame(r.id, r.status === "AKTIVNA" ? "PAUZIRANA" : "AKTIVNA")),
    onSuccess: osvjezi,
  });
  const brisanje = useMutation({
    mutationFn: (id: number) => unwrap(obrisiReklamu(id)),
    onSuccess: osvjezi,
  });

  const lista = data ?? [];
  const greska = error || status.error || brisanje.error;

  return (
    <>
      <div className={p.zaglavlje}>
        <div>
          <h1 className={p.naslov}>Kreative</h1>
          <p className={p.podnaslov}>
            Kreativa ide uživo čim je sačuvate i vrti se samo u svom terminu. Više kreativa na
            istoj poziciji se prikazuje naizmjenično.
          </p>
        </div>
        <Link href="/promoter/kreative/nova" className={p.dugmeZeleno}>
          + Nova kreativa
        </Link>
      </div>

      {greska && <p className={p.greska}>{porukaGreske(greska)}</p>}

      <section className={p.kartica}>
        {isLoading ? (
          <p className={p.prazno}>Učitavanje...</p>
        ) : lista.length === 0 ? (
          <p className={p.prazno}>
            Još nema kreativa. <Link href="/promoter/kreative/nova">Napravite prvu.</Link>
          </p>
        ) : (
          <div className={p.tabelaOkvir} style={{ marginTop: -20 }}>
            <table className={p.tabela}>
              <thead>
                <tr>
                  <th>Kreativa</th>
                  <th>Status</th>
                  <th>Termin</th>
                  <th>Gdje</th>
                  <th>Prikazi</th>
                  <th>Klikovi</th>
                  <th>CTR</th>
                  <th aria-label="Akcije" />
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr
                    key={r.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/promoter/kreative/${r.id}`)}
                  >
                    <td>
                      <span style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 220 }}>
                        <KreativaSlicica r={r} />
                        <span style={{ minWidth: 0 }}>
                          <span className={p.kreativaNaziv}>{r.naziv}</span>
                          <span className={p.kreativaMeta}>{opisKreative(r)}</span>
                          {r.promoter && (
                            <span className={p.kreativaMeta}>
                              Promoter: {`${r.promoter.firstName} ${r.promoter.lastName}`.trim()}
                            </span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td>
                      <StatusKreative r={r} />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {fmtTermin(r.pocetak, false)} – {fmtTermin(r.kraj, false)}
                    </td>
                    <td>
                      <span className={p.kreativaMeta}>{r.stranice.map(kratkoStranice).join(", ")}</span>
                      <span className={p.kreativaMeta}>{r.pozicije.map(nazivPozicije).join(", ")}</span>
                    </td>
                    <td className={p.broj}>{fmtBroj(r.prikazi)}</td>
                    <td className={p.broj}>{fmtBroj(r.klikovi)}</td>
                    <td className={p.ctr}>{fmtCtr(r.prikazi, r.klikovi)}</td>
                    <td style={{ whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={p.dugmeMalo}
                        style={{ padding: "5px 12px" }}
                        disabled={status.isPending || r.stanje === "ISTEKLA"}
                        onClick={() => status.mutate(r)}
                      >
                        {r.status === "AKTIVNA" ? "Pauziraj" : "Pokreni"}
                      </button>{" "}
                      <button
                        type="button"
                        className={p.dugmeMalo}
                        style={{ padding: "5px 12px", color: "var(--err-text)" }}
                        disabled={brisanje.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Obrisati kreativu "${r.naziv}"? Brišu se i njeni prikazi i klikovi.`,
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
