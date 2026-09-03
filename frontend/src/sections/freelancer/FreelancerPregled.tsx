"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import { getPregled, potvrdaUrl, setUplataStatus } from "src/api/freelancer";
import { useFreelancerPristup } from "src/components/FreelancerTrialCta/FreelancerTrialCta";
import GodinaSelect from "./GodinaSelect";
import { mnozina } from "src/lib/format";
import { MJESECI, fmtDatum, fmtKm, rokInfo, STATUS_TEKST } from "./format";
import { tabHref, useGodina, useOsvjeziEvidenciju } from "./hooks";
import Paginacija, { useStranice } from "./Paginacija";
import styles from "./freelancer.module.css";

const PRAZNO: never[] = [];

const BADGE: Record<string, string> = {
  OBRACUNATO: styles.badgeObracunato,
  PLACENO: styles.badgePlaceno,
  PREDANO: styles.badgePredano,
};

export default function FreelancerPregled() {
  const [godina, setGodina] = useGodina();
  const { hasAccess } = useFreelancerPristup();
  const osvjezi = useOsvjeziEvidenciju();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["freelancer-pregled", godina],
    queryFn: () => unwrap(getPregled(godina)),
  });
  const nepredane = useStranice(data?.nepredane ?? PRAZNO);
  const predano = useMutation({
    mutationFn: (id: number) => unwrap(setUplataStatus(id, "PREDANO")),
    onSuccess: osvjezi,
  });

  const otvoriPotvrdu = () => {
    if (!hasAccess) return;
    window.open(potvrdaUrl(godina), "_blank", "noopener");
  };

  return (
    <>
      <div className={styles.toolbar}>
        <GodinaSelect value={godina} onChange={setGodina} />
        <span className={styles.toolbarSpacer} />
        <Link href="/ams" className={styles.btnPrimary}>
          Nova uplata (AMS generator)
        </Link>
        <Link href={tabHref("uplate", godina, { novo: "1" })} className={styles.btnSecondary}>
          Ručni unos
        </Link>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={otvoriPotvrdu}
          disabled={!hasAccess || !data || data.broj === 0}
          title={
            !hasAccess
              ? "Pregled prihoda (PDF) je dio PK Freelancer paketa"
              : data && data.broj === 0
                ? "Nema uplata u izabranoj godini"
                : "Preuzmi PDF pregled prihoda za godinu"
          }
        >
          Pregled prihoda (PDF)
        </button>
        <Link href={tabHref("godisnji", godina)} className={styles.btnGhost}>
          GPD-1051
        </Link>
      </div>

      {isLoading && <div className={styles.empty}>Učitavanje pregleda...</div>}
      {isError && <div className={`${styles.alert} ${styles.alertErr}`}>Pregled se ne može učitati.</div>}

      {data && (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Primljeno (bruto)</div>
              <div className={styles.kpiValue}>
                {fmtKm(data.ukupno.bruto)}
                <small>KM</small>
              </div>
              <div className={styles.kpiSub}>
                {data.broj} {mnozina(data.broj, "uplata", "uplate", "uplata")} u {godina}.
              </div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Zdravstveno (4%)</div>
              <div className={styles.kpiValue}>
                {fmtKm(data.ukupno.zdravstveno)}
                <small>KM</small>
              </div>
              <div className={styles.kpiSub}>normirani rashodi {fmtKm(data.ukupno.rashodi)} KM</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Porez (10%)</div>
              <div className={styles.kpiValue}>
                {fmtKm(data.ukupno.porez)}
                <small>KM</small>
              </div>
              <div className={styles.kpiSub}>dohodak {fmtKm(data.ukupno.dohodak)} KM</div>
            </div>
            <div className={`${styles.kpi} ${styles.kpiSage}`}>
              <div className={styles.kpiLabel}>Neto</div>
              <div className={styles.kpiValue}>
                {fmtKm(data.ukupno.neto)}
                <small>KM</small>
              </div>
              <div className={styles.kpiSub}>
                {data.poStatusu.PLACENO} predano i plaćeno, {data.poStatusu.PREDANO} predano,{" "}
                {data.poStatusu.OBRACUNATO} obračunato
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span>
                Obaveze i <em>rokovi</em>
              </span>
              <span>AMS-1035 se predaje u roku od 5 dana od primitka</span>
            </h2>
            {data.nepredane.length === 0 ? (
              <div className={styles.empty}>
                Sve uplate u {godina}. su predane. Nema otvorenih rokova.
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Primljeno</th>
                      <th>Isplatilac</th>
                      <th className={styles.num}>Iznos</th>
                      <th>Status</th>
                      <th>Rok za predaju</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {nepredane.isjecak.map((n) => {
                      const rok = rokInfo(n.daniDoRoka, n.status);
                      return (
                        <tr key={n.id}>
                          <td data-label="Primljeno">{fmtDatum(n.datumPrimitka)}</td>
                          <td data-label="Isplatilac">{n.isplatilacNaziv}</td>
                          <td data-label="Iznos" className={styles.num}>
                            {fmtKm(n.iznosKm)} KM
                          </td>
                          <td data-label="Status">
                            <span className={`${styles.badge} ${BADGE[n.status]}`}>
                              {STATUS_TEKST[n.status]}
                            </span>
                          </td>
                          <td data-label="Rok">
                            {fmtDatum(n.rokPredaje)}
                            {rok && (
                              <span
                                className={`${styles.rok} ${
                                  rok.ton === "kasni"
                                    ? styles.rokKasni
                                    : rok.ton === "hitno"
                                      ? styles.rokHitno
                                      : styles.rokOk
                                }`}
                              >
                                {rok.tekst}
                              </span>
                            )}
                          </td>
                          <td data-label="">
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={`${styles.btnSecondary} ${styles.btnSmall}`}
                                onClick={() => predano.mutate(n.id)}
                                disabled={predano.isPending}
                              >
                                Označi predano
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <Paginacija {...nepredane} onPromjena={nepredane.setStranica} sta="uplata" />
              </div>
            )}
          </div>

          <div className={styles.grid2}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span>
                  Po <em>mjesecima</em>
                </span>
              </h2>
              {data.broj === 0 ? (
                <div className={styles.empty}>Nema uplata u {godina}. godini.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Mjesec</th>
                        <th className={styles.num}>Bruto</th>
                        <th className={styles.num}>Zdrav.</th>
                        <th className={styles.num}>Porez</th>
                        <th className={styles.num}>Neto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.poMjesecima
                        .filter((m) => m.broj > 0)
                        .map((m) => (
                          <tr key={m.mjesec}>
                            <td data-label="Mjesec">
                              {MJESECI[m.mjesec - 1]}{" "}
                              <span className={styles.muted}>({m.broj})</span>
                            </td>
                            <td data-label="Bruto" className={styles.num}>{fmtKm(m.bruto)}</td>
                            <td data-label="Zdravstveno" className={styles.num}>{fmtKm(m.zdravstveno)}</td>
                            <td data-label="Porez" className={styles.num}>{fmtKm(m.porez)}</td>
                            <td data-label="Neto" className={styles.num}>{fmtKm(m.neto)}</td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Ukupno</td>
                        <td className={styles.num}>{fmtKm(data.ukupno.bruto)}</td>
                        <td className={styles.num}>{fmtKm(data.ukupno.zdravstveno)}</td>
                        <td className={styles.num}>{fmtKm(data.ukupno.porez)}</td>
                        <td className={styles.num}>{fmtKm(data.ukupno.neto)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span>
                  Po <em>isplatiocima</em>
                </span>
              </h2>
              {data.poIsplatiocu.length === 0 ? (
                <div className={styles.empty}>Još nema isplatilaca u {godina}. godini.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Isplatilac</th>
                        <th className={styles.num}>Uplata</th>
                        <th className={styles.num}>Bruto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.poIsplatiocu.map((i) => (
                        <tr key={i.naziv}>
                          <td data-label="Isplatilac">{i.naziv}</td>
                          <td data-label="Uplata" className={styles.num}>{i.broj}</td>
                          <td data-label="Bruto" className={styles.num}>{fmtKm(i.bruto)} KM</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
