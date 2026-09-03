"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import { listUplate, type FreelancerUplata } from "src/api/freelancer";
import GodinaSelect from "./GodinaSelect";
import { MJESECI, fmtDatum, fmtKm, STATUS_TEKST } from "./format";
import { tabHref, useGodina } from "./hooks";
import { preuzmiBajtove } from "./izvoz";
import styles from "./freelancer.module.css";

type Vrsta = "rok" | "gpd";
type Dogadjaj = {
  datum: string;
  naslov: string;
  opis: string;
  vrsta: Vrsta;
  gotovo: boolean;
  uplataId?: number;
};

const danasIso = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

/** Svi rokovi u godini: predaja AMS-a po uplati, pa GPD za tu godinu u martu naredne. */
function dogadjaji(uplate: FreelancerUplata[], godina: number): Dogadjaj[] {
  const lista: Dogadjaj[] = uplate.map((u) => ({
    datum: u.rokPredaje,
    naslov: `Predaja AMS-1035: ${u.isplatilacNaziv}`,
    opis: `${fmtKm(u.iznosKm)} KM primljeno ${fmtDatum(u.datumPrimitka)}, status: ${STATUS_TEKST[u.status].toLowerCase()}`,
    vrsta: "rok",
    gotovo: u.status !== "OBRACUNATO",
    uplataId: u.id,
  }));
  lista.push({
    datum: `${godina + 1}-03-01`,
    naslov: `Počinje predaja GPD-1051 za ${godina}.`,
    opis: `Godišnja prijava poreza na dohodak za ${godina}. predaje se od 1. do 31. marta ${godina + 1}. Otvorite je iz taba Godišnji pregled i GPD, popunjenu iz evidencije.`,
    vrsta: "gpd",
    gotovo: false,
  });
  lista.push({
    datum: `${godina + 1}-03-31`,
    naslov: `Zadnji dan za GPD-1051 za ${godina}.`,
    opis: "Rok za predaju godišnje prijave poreza na dohodak Poreznoj upravi.",
    vrsta: "gpd",
    gotovo: false,
  });
  return lista.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
}

const icsTekst = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDan = (iso: string) => iso.slice(0, 10).replace(/-/g, "");
const sutra = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** iCalendar fajl: cjelodnevni događaji sa podsjetnikom dan prije. */
function napraviIcs(lista: Dogadjaj[], godina: number) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const redovi = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Porezni Kalkulator//PK Freelancer//BS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:PK Freelancer ${godina}`,
  ];
  lista.forEach((e) => {
    // UID mora biti STABILAN između izvoza: kalendar po njemu prepozna isti
    // rok i ažurira ga umjesto da ga doda drugi put. Rok uplate se veže za id
    // uplate, a GPD za svoj datum (mjesto u listi se mijenja kako se rokovi
    // rješavaju, pa indeks nije upotrebljiv).
    redovi.push(
      "BEGIN:VEVENT",
      `UID:pkf-${godina}-${e.uplataId ? `u${e.uplataId}` : `gpd-${e.datum}`}@poreznikalkulator.ba`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDan(e.datum)}`,
      `DTEND;VALUE=DATE:${icsDan(sutra(e.datum))}`,
      `SUMMARY:${icsTekst(e.naslov)}`,
      `DESCRIPTION:${icsTekst(e.opis)}`,
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsTekst(e.naslov)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  });
  redovi.push("END:VCALENDAR");
  // iCalendar traži CRLF i redove do 75 bajtova; naši su kratki osim opisa
  return redovi
    .map((r) => (r.length > 73 ? r.match(/.{1,73}/g)!.join("\r\n ") : r))
    .join("\r\n");
}

function googleUrl(e: Dogadjaj) {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.naslov,
    dates: `${icsDan(e.datum)}/${icsDan(sutra(e.datum))}`,
    details: e.opis,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export default function FreelancerKalendar() {
  const [godina, setGodina] = useGodina();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["freelancer-uplate", godina],
    queryFn: () => unwrap(listUplate(godina)),
  });
  const lista = useMemo(() => dogadjaji(data?.items ?? [], godina), [data, godina]);
  const danas = danasIso();
  const otvoreni = lista.filter((e) => !e.gotovo);
  const sljedeci = otvoreni.find((e) => e.datum >= danas) ?? null;
  const kasni = otvoreni.filter((e) => e.vrsta === "rok" && e.datum < danas).length;

  // grupisanje po mjesecu, redom kroz godinu (GPD pada u mart naredne)
  const poMjesecu = useMemo(() => {
    const m = new Map<string, Dogadjaj[]>();
    for (const e of lista) {
      const k = e.datum.slice(0, 7);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return [...m.entries()];
  }, [lista]);

  const preuzmiIcs = () => {
    const ics = napraviIcs(otvoreni, godina);
    preuzmiBajtove(new TextEncoder().encode(ics), `PK-Freelancer-${godina}.ics`, "text/calendar;charset=utf-8");
  };

  return (
    <>
      <div className={styles.toolbar}>
        <GodinaSelect value={godina} onChange={setGodina} />
        <span className={styles.toolbarSpacer} />
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={preuzmiIcs}
          disabled={otvoreni.length === 0}
          title="Fajl za Google kalendar, iPhone, Outlook: otvorite ga i rokovi se dodaju sa podsjetnikom dan prije"
        >
          Dodaj u kalendar (.ics)
        </button>
      </div>

      {isLoading && <div className={styles.empty}>Učitavanje...</div>}
      {isError && <div className={`${styles.alert} ${styles.alertErr}`}>Rokovi se ne mogu učitati.</div>}

      {data && (
        <>
          <div className={styles.kpiGrid}>
            <div className={`${styles.kpi} ${sljedeci ? styles.kpiSage : ""}`}>
              <div className={styles.kpiLabel}>Sljedeći rok</div>
              <div className={styles.kpiValue}>{sljedeci ? fmtDatum(sljedeci.datum) : "–"}</div>
              <div className={styles.kpiSub}>{sljedeci ? sljedeci.naslov : "nema otvorenih rokova"}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Otvoreno</div>
              <div className={styles.kpiValue}>{otvoreni.filter((e) => e.vrsta === "rok").length}</div>
              <div className={styles.kpiSub}>AMS obrazaca čeka predaju</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>Kasni</div>
              <div className={styles.kpiValue}>{kasni}</div>
              <div className={styles.kpiSub}>rok prošao, obrazac nije predan</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>GPD-1051</div>
              <div className={styles.kpiValue}>31.03.{godina + 1}.</div>
              <div className={styles.kpiSub}>godišnja prijava za {godina}.</div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span>
                Rokovi u <em>{godina}.</em>
              </span>
              <span>rok za AMS je 5 dana od primitka, GPD do 31. marta</span>
            </h2>
            {poMjesecu.length === 0 ? (
              <div className={styles.empty}>Nema rokova: u {godina}. nema unesenih uplata.</div>
            ) : (
              <div className={styles.kalendar}>
                {poMjesecu.map(([kljuc, stavke]) => {
                  const [y, m] = kljuc.split("-").map(Number);
                  return (
                    <section key={kljuc} className={styles.kalMjesec}>
                      <h3 className={styles.kalMjesecNaslov}>
                        {MJESECI[m - 1]} {y}.
                      </h3>
                      <ul className={styles.kalLista}>
                        {stavke.map((e, i) => {
                          const prosao = e.datum < danas;
                          const ton = e.gotovo
                            ? styles.kalGotovo
                            : e.datum === danas
                              ? styles.kalDanas
                              : prosao
                                ? styles.kalKasni
                                : "";
                          return (
                            <li key={`${e.datum}-${i}`} className={`${styles.kalStavka} ${ton}`}>
                              <span className={styles.kalDatum}>{fmtDatum(e.datum)}</span>
                              <span className={styles.kalTekst}>
                                <strong>{e.naslov}</strong>
                                <span>{e.opis}</span>
                              </span>
                              <span className={styles.kalAkcije}>
                                {e.gotovo ? (
                                  <span className={`${styles.badge} ${styles.badgePredano}`}>riješeno</span>
                                ) : e.datum === danas ? (
                                  <span className={`${styles.badge} ${styles.badgeObracunato}`}>danas</span>
                                ) : prosao && e.vrsta === "rok" ? (
                                  <span className={`${styles.badge} ${styles.badgeKasni}`}>kasni</span>
                                ) : null}
                                {e.uplataId ? (
                                  <Link href={tabHref("uplate", godina)} className={`${styles.btnGhost} ${styles.btnSmall}`}>
                                    Uplata
                                  </Link>
                                ) : (
                                  <a
                                    href={googleUrl(e)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${styles.btnGhost} ${styles.btnSmall}`}
                                  >
                                    Google kalendar
                                  </a>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
            <p className={styles.hint} style={{ marginTop: "0.9rem" }}>
              Dugme "Dodaj u kalendar" preuzima .ics fajl sa svim otvorenim rokovima; otvorite ga na
              telefonu ili računaru i rokovi ulaze u vaš kalendar sa podsjetnikom dan prije. Rokovi
              koji su već riješeni se ne izvoze. Email podsjetnike podešavate u Postavkama.
            </p>
          </div>
        </>
      )}
    </>
  );
}
