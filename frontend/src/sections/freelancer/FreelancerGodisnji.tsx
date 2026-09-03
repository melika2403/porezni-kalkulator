"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import { getGpdPodaci, listUplate, potvrdaUrl } from "src/api/freelancer";
import { godisnjaArhiva, preuzmiBajtove } from "./izvoz";
import FreelancerTrialCta, {
  useFreelancerPristup,
} from "src/components/FreelancerTrialCta/FreelancerTrialCta";
import GodinaSelect from "./GodinaSelect";
import Paginacija, { useStranice } from "./Paginacija";
import { mnozina } from "src/lib/format";
import { fmtDatum, fmtKm, STATUS_TEKST } from "./format";
import { tabHref, useGodina } from "./hooks";
import styles from "./freelancer.module.css";

const PRAZNO: never[] = [];

export default function FreelancerGodisnji() {
  const [godina, setGodina] = useGodina();
  const { hasAccess } = useFreelancerPristup();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["freelancer-gpd", godina],
    queryFn: () => unwrap(getGpdPodaci(godina)),
  });
  const stranice = useStranice(data?.uplate ?? PRAZNO);
  // godišnja arhiva se pakuje u pregledniku: obrasci, uplatnice, prilozi,
  // pregled prihoda i Excel, sve u jedan ZIP za knjigovođu ili kontrolu
  const [arhiva, setArhiva] = useState<{ korak: string | null; poruka: string | null }>({
    korak: null,
    poruka: null,
  });
  const preuzmiArhivu = async () => {
    setArhiva({ korak: "Priprema", poruka: null });
    try {
      const uplate = (await unwrap(listUplate(godina))).items;
      const rez = await godisnjaArhiva(uplate, godina, (k) => setArhiva({ korak: k, poruka: null }));
      preuzmiBajtove(rez.bytes, rez.ime, "application/zip");
      setArhiva({
        korak: null,
        poruka: rez.propusteno.length
          ? `Arhiva je preuzeta, ali nije stalo: ${rez.propusteno.join(", ")}.`
          : null,
      });
    } catch {
      setArhiva({ korak: null, poruka: "Arhiva nije napravljena. Pokušajte ponovo." });
    }
  };

  return (
    <>
      <div className={styles.toolbar}>
        <GodinaSelect value={godina} onChange={setGodina} />
        <span className={styles.toolbarSpacer} />
        {hasAccess ? (
          <Link
            href={`/gpd?frl=${godina}`}
            className={styles.btnPrimary}
            aria-disabled={!data || data.brojUplata === 0}
            onClick={(e) => {
              if (!data || data.brojUplata === 0) e.preventDefault();
            }}
          >
            Otvori GPD-1051 sa ovim podacima
          </Link>
        ) : (
          <Link href="/gpd" className={styles.btnGhost}>
            Otvori prazan GPD-1051
          </Link>
        )}
        <button
          type="button"
          className={styles.btnSecondary}
          disabled={!hasAccess || !data || data.brojUplata === 0}
          onClick={() => window.open(potvrdaUrl(godina), "_blank", "noopener")}
          title={!hasAccess ? "Pregled prihoda (PDF) je dio PK Freelancer paketa" : undefined}
        >
          Pregled prihoda (PDF)
        </button>
        <button
          type="button"
          className={styles.btnGhost}
          disabled={!hasAccess || !data || data.brojUplata === 0 || arhiva.korak !== null}
          onClick={preuzmiArhivu}
          title={
            !hasAccess
              ? "Godišnja arhiva je dio PK Freelancer paketa"
              : "ZIP sa svim AMS obrascima, uplatnicama, prilozima, pregledom prihoda i Excel tabelom za godinu"
          }
        >
          {arhiva.korak ? `Pakujem: ${arhiva.korak}...` : "Godišnja arhiva (ZIP)"}
        </button>
      </div>
      {arhiva.poruka && (
        <div className={`${styles.alert} ${styles.alertWarn}`} role="status">
          {arhiva.poruka}{" "}
          <button
            type="button"
            className={`${styles.btnGhost} ${styles.btnSmall}`}
            onClick={() => setArhiva({ korak: null, poruka: null })}
          >
            U redu
          </button>
        </div>
      )}

      {!hasAccess && (
        <FreelancerTrialCta what="GPD-1051 popunjen iz evidencije i pregled prihoda za banku su dio paketa. Evidenciju i dalje vidite besplatno." />
      )}

      {isLoading && <div className={styles.empty}>Učitavanje...</div>}
      {isError && <div className={`${styles.alert} ${styles.alertErr}`}>Podaci se ne mogu učitati.</div>}

      {data && (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Osnovica (red 13)</div>
              <div className={styles.kpiValue}>{fmtKm(data.osnovica ?? data.dohodak - data.zdravstveno)}<small>KM</small></div>
              <div className={styles.kpiSub}>dohodak {fmtKm(data.dohodak)} KM minus zdravstveno, kao na AMS obrascu</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Porez po odbitku (red 28)</div>
              <div className={styles.kpiValue}>{fmtKm(data.porezPlacen)}<small>KM</small></div>
              <div className={styles.kpiSub}>
                {data.brojNeplacenih > 0
                  ? `obračunato ${fmtKm(data.porezObracunat)} KM, ${data.brojNeplacenih} ${data.brojNeplacenih === 1 ? "uplata nije" : "uplate nisu"} označene kao predano i plaćeno`
                  : "sve uplate označene kao predano i plaćeno"}
              </div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Zdravstveno (4%)</div>
              <div className={styles.kpiValue}>{fmtKm(data.zdravstveno)}<small>KM</small></div>
              <div className={styles.kpiSub}>
                {data.zdravstvenoPlaceno != null && data.zdravstvenoPlaceno !== data.zdravstveno
                  ? `uz predano i plaćeno ${fmtKm(data.zdravstvenoPlaceno)} KM, ne ulazi u GPD`
                  : "doprinos uz honorare, ne ulazi u GPD"}
              </div>
            </div>
            <div className={`${styles.kpi} ${styles.kpiSage}`}>
              <div className={styles.kpiLabel}>Neto zarađeno</div>
              <div className={styles.kpiValue}>{fmtKm(data.neto ?? 0)}<small>KM</small></div>
              <div className={styles.kpiSub}>
                {data.brojUplata} {mnozina(data.brojUplata, "uplata", "uplate", "uplata")},
                GPD-1051 do 31. marta {godina + 1}.
              </div>
            </div>
          </div>

          {data.brojNeplacenih > 0 && (
            <div className={`${styles.alert} ${styles.alertWarn}`}>
              U GPD ulazi samo porez sa uplata označenih kao predano i plaćeno. Označite statuse u{" "}
              <Link href={tabHref("uplate", godina)}>Uplatama</Link> prije popunjavanja, ili iznos
              ispravite ručno na obrascu.
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span>
                Šta ide u <em>GPD-1051</em>
              </span>
              <span>sva polja na obrascu ostaju editabilna</span>
            </h2>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "13.5px", lineHeight: 1.7 }}>
              <li>Dio 1: ime, JMBG i adresa iz zadnje uplate u evidenciji.</li>
              <li>
                Red 13, dohodak od drugih samostalnih djelatnosti: zbir osnovica sa AMS obrazaca (dohodak
                poslije normiranih rashoda i poslije doprinosa za zdravstveno). Tako je porez na GPD-u isti
                kao već plaćeni porez po odbitku i za jedan izvor prihoda razlika je nula.
              </li>
              <li>
                Red 18, lični odbitak: iz koeficijenta porezne kartice upisanog u{" "}
                <Link href={tabHref("postavke", godina)}>Postavkama</Link>
                {data.licniOdbitak ? ` (${fmtKm(data.licniOdbitak)} KM)` : " (nije upisan, pa ostaje prazan)"}.
              </li>
              <li>Red 28, porez plaćen po odbitku: zbir poreza sa uplata označenih kao predano i plaćeno.</li>
              <li>Doprinos za zdravstveno (4%) ne ulazi u GPD; ovdje se vodi samo kao pregled uplaćenog.</li>
            </ul>
          </div>

          <div className={styles.tableWrap}>
            {data.uplate.length === 0 ? (
              <div className={styles.empty}>Nema uplata u {godina}. godini.</div>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Primljeno</th>
                      <th>Isplatilac</th>
                      <th className={styles.num}>Bruto</th>
                      <th className={styles.num}>Dohodak</th>
                      <th className={styles.num}>Zdrav.</th>
                      <th className={styles.num}>Osnovica (red 13)</th>
                      <th className={styles.num}>Porez</th>
                      <th className={styles.num}>Neto</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stranice.isjecak.map((u) => (
                      <tr key={u.id}>
                        <td data-label="Primljeno">{fmtDatum(u.datumPrimitka)}</td>
                        <td data-label="Isplatilac">{u.isplatilacNaziv}</td>
                        <td data-label="Bruto" className={styles.num}>{fmtKm(u.iznosKm)}</td>
                        <td data-label="Dohodak" className={styles.num}>{fmtKm(u.dohodak)}</td>
                        <td data-label="Zdravstveno" className={styles.num}>{fmtKm(u.zdravstveno)}</td>
                        <td data-label="Osnovica" className={styles.num}>
                          {fmtKm(u.osnovica ?? u.dohodak - u.zdravstveno)}
                        </td>
                        <td data-label="Porez" className={styles.num}>{fmtKm(u.razlika)}</td>
                        <td data-label="Neto" className={`${styles.num} ${styles.strong}`}>
                          {fmtKm(u.neto ?? u.iznosKm - u.zdravstveno - u.razlika)}
                        </td>
                        <td data-label="Status">{STATUS_TEKST[u.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Ukupno za {godina}. ({data.uplate.length} {mnozina(data.uplate.length, "uplata", "uplate", "uplata")})</td>
                      <td className={styles.num}>{fmtKm(data.bruto)}</td>
                      <td className={styles.num}>{fmtKm(data.dohodak)}</td>
                      <td className={styles.num}>{fmtKm(data.zdravstveno)}</td>
                      <td className={styles.num}>{fmtKm(data.osnovica ?? data.dohodak - data.zdravstveno)}</td>
                      <td className={styles.num}>{fmtKm(data.porezObracunat)}</td>
                      <td className={styles.num}>{fmtKm(data.neto ?? 0)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                <Paginacija {...stranice} onPromjena={stranice.setStranica} sta="uplata" />
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
