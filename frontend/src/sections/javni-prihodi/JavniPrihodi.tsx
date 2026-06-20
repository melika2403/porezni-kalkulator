"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  VRSTE_PRIHODA_GROUPS,
  BUDZETSKE_ORGANIZACIJE,
  type VrstaPrihoda,
  type BudzetskaOrganizacija,
} from "src/data/javni-prihodi";
import { OPCINE_GROUPS, type OpcinaRacuni } from "src/data/opcine";
import {
  FEDERALNI_RACUNI,
  KANTONALNI_BUDZETI,
  KANTONALNI_ZZO,
  KANTONALNE_SLUZBE_ZAPOSLJAVANJE,
  FBIH_BUDZET_RACUN,
  FBIH_ZO_RACUN,
  type Racun,
} from "src/data/uplatni-racuni";
import styles from "./javni-prihodi.module.css";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d");
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const nText = normalize(text);
  const nQuery = normalize(query);
  if (!nQuery) return text;
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;
  let idx = nText.indexOf(nQuery);
  while (idx !== -1) {
    if (idx > lastEnd) parts.push(text.slice(lastEnd, idx));
    parts.push(
      <mark key={parts.length} className={styles.mark}>
        {text.slice(idx, idx + nQuery.length)}
      </mark>,
    );
    lastEnd = idx + nQuery.length;
    idx = nText.indexOf(nQuery, lastEnd);
  }
  if (lastEnd < text.length) parts.push(text.slice(lastEnd));
  return parts.length ? parts : text;
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }
      }}
      title={copied ? "Kopirano!" : `Kopiraj ${label || text}`}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

// Related tools shown in sidebar — naši ostali alati i obrasci
const RELATED_TOOLS = [
  { href: "/prijave-radnika?tab=obracun", label: "Obračun plata", desc: "Plate, doprinosi, uplatnice i 2001/2002" },
  { href: "/prijave-radnika", label: "JS3100", desc: "Prijava/odjava radnika online" },
  { href: "/sihterica", label: "Šihterica", desc: "Mjesečna evidencija radnog vremena" },
  { href: "/preracun-neto-bruto", label: "Neto ↔ Bruto plata", desc: "Brzi obračun plata i doprinosa" },
  { href: "/pdv-kalkulator", label: "PDV kalkulator", desc: "Preračun cijene sa i bez PDV-a" },
  { href: "/spr", label: "SPR-1053", desc: "Specifikacija dohotka samostalne djelatnosti" },
  { href: "/gpd", label: "GPD-1051", desc: "Godišnja porezna prijava" },
  { href: "/ams", label: "AMS-1035", desc: "Akontacija poreza po odbitku na druge samostalne djelatnosti" },
  { href: "/zo3", label: "ZO3", desc: "Prijava člana porodice na zdravstveno" },
  { href: "/amortizacija", label: "Stalna sredstva", desc: "Vođenje OS i amortizacija" },
  { href: "/sifre-djelatnosti", label: "Šifre djelatnosti FBiH", desc: "KD BiH 2010, sve šifre" },
  { href: "/ugovor-o-radu", label: "Ugovor o radu", desc: "Predložak ugovora i otkaza FBiH" },
  { href: "/ugovor-o-djelu", label: "Ugovor o djelu", desc: "Predložak + obračun poreza" },
  { href: "/fakture", label: "Fakture i predračuni", desc: "Generator faktura" },
];

// Quick access items (most-searched)
const QUICK_ACCESS = [
  { kind: "vrsta", code: "712112", label: "PIO/MIO doprinos" },
  { kind: "vrsta", code: "712111", label: "Zdravstveni doprinos" },
  { kind: "vrsta", code: "712113", label: "Doprinos nezaposlenost" },
  { kind: "vrsta", code: "716111", label: "Porez na dohodak" },
  { kind: "vrsta", code: "722529", label: "Vodna naknada" },
  { kind: "vrsta", code: "722581", label: "Naknada za nesreće" },
  { kind: "racun", code: FBIH_BUDZET_RACUN, label: "Budžet FBiH" },
  { kind: "racun", code: FBIH_ZO_RACUN, label: "ZZO FBiH" },
];

export default function JavniPrihodi() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 160);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === "Escape" && t === inputRef.current) {
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Build aggregated search index
  type Hit =
    | { kind: "racun"; item: Racun; group: string }
    | { kind: "vrsta"; item: VrstaPrihoda }
    | { kind: "budzetska"; item: BudzetskaOrganizacija }
    | { kind: "opcina"; item: OpcinaRacuni; kantonNaziv: string };

  const allItems: Hit[] = useMemo(() => {
    const hits: Hit[] = [];
    for (const it of FEDERALNI_RACUNI) hits.push({ kind: "racun", item: it, group: "Federalni računi i fondovi" });
    for (const it of KANTONALNI_BUDZETI) hits.push({ kind: "racun", item: it, group: "Kantonalni budžeti" });
    for (const it of KANTONALNI_ZZO) hits.push({ kind: "racun", item: it, group: "Kantonalni ZZO" });
    for (const it of KANTONALNE_SLUZBE_ZAPOSLJAVANJE) hits.push({ kind: "racun", item: it, group: "Kantonalne službe za zapošljavanje" });
    for (const g of OPCINE_GROUPS) {
      for (const o of g.opcine) hits.push({ kind: "opcina", item: o, kantonNaziv: g.kantonNaziv });
    }
    for (const g of VRSTE_PRIHODA_GROUPS) {
      for (const it of g.items) hits.push({ kind: "vrsta", item: it });
    }
    for (const it of BUDZETSKE_ORGANIZACIJE) hits.push({ kind: "budzetska", item: it });
    return hits;
  }, []);

  const results = useMemo(() => {
    if (!debounced) return [];
    const q = normalize(debounced);
    const out: Hit[] = [];
    for (const h of allItems) {
      let hay = "";
      if (h.kind === "racun") hay = `${h.item.naziv} ${h.item.racun} ${h.item.banka} ${h.item.napomena ?? ""}`;
      else if (h.kind === "vrsta") hay = `${h.item.code} ${h.item.name}`;
      else if (h.kind === "opcina") hay = `${h.item.name} ${h.item.kod} ${h.item.racuni.join(" ")} ${h.kantonNaziv}`;
      else hay = `${h.item.kod} ${h.item.naziv}`;
      if (normalize(hay).includes(q)) out.push(h);
      if (out.length >= 80) break;
    }
    return out;
  }, [debounced, allItems]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.label}>Referenca · PUFBiH pravilnik</div>
        <h1 className={styles.h1}>
          Uplatni računi javnih prihoda <em>FBiH</em>
        </h1>
        <p className={styles.subtitle}>
          Kompletna lista <strong>uplatnih računa</strong>–<strong>šifri vrsta prihoda</strong> i{" "}
          <strong>budžetskih organizacija</strong> za uplate javnih prihoda u Federaciji BiH, 
          prema prečišćenom tekstu Pravilnika Porezne uprave FBiH.
        </p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Naši alati i obrasci">
          <div className={styles.sidebarTitle}>Naši alati i obrasci</div>
          <p className={styles.sidebarLead}>
            Pronašli ste šifru ili račun? Evo šta vam može pomoći u svakodnevnom poslovanju.
          </p>
          <ul className={styles.sidebarList}>
            {RELATED_TOOLS.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className={styles.sidebarLink}>
                  <span className={styles.sidebarLinkLabel}>{t.label}</span>
                  <span className={styles.sidebarLinkDesc}>{t.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.content}>

      <div className={styles.searchRow}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          className={styles.search}
          placeholder="Pretraži po šifri ili nazivu (npr. 712112, PIO, vodna naknada)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Pretraga"
        />
        {query && (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => setQuery("")}
            aria-label="Očisti pretragu"
          >
            ✕
          </button>
        )}
      </div>
      <p className={styles.searchHint}>
        Pritisni <kbd>/</kbd> za pretragu · <kbd>Esc</kbd> da očistiš
      </p>

      {/* Quick access chips */}
      {!debounced && (
        <div className={styles.quickAccess}>
          {QUICK_ACCESS.map((q) => (
            <button
              key={q.code}
              type="button"
              className={styles.quickChip}
              onClick={() => setQuery(q.code)}
            >
              {q.label} · <strong>{q.code}</strong>
            </button>
          ))}
        </div>
      )}

      {/* Search results */}
      {debounced && (
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            {results.length === 0
              ? "Nema rezultata."
              : `${results.length} ${results.length === 1 ? "rezultat" : results.length < 5 ? "rezultata" : "rezultata"} za "${debounced}"`}
          </div>
          {results.length === 0 ? (
            <div className={styles.emptyResults}>
              Pokušaj drugim ključem, šifrom prihoda (npr. 712112) ili nazivom (npr. „doprinos“, „kazna“).
            </div>
          ) : (
            results.map((h, i) => {
              if (h.kind === "racun") {
                return (
                  <div key={`r${i}`} className={styles.resultItem}>
                    <span className={styles.resultKind}>Račun · {h.group}</span>
                    <span className={styles.resultCode}>{h.item.racun}</span>
                    <span className={styles.resultName}>{highlight(h.item.naziv, debounced)}</span>
                  </div>
                );
              }
              if (h.kind === "vrsta") {
                return (
                  <div key={`v${i}`} className={styles.resultItem}>
                    <span className={styles.resultKind}>Vrsta prihoda</span>
                    <span className={styles.resultCode}>{h.item.code}</span>
                    <span className={styles.resultName}>
                      {highlight(h.item.name || "–", debounced)}
                    </span>
                  </div>
                );
              }
              if (h.kind === "opcina") {
                return (
                  <div key={`o${i}`} className={styles.resultItem}>
                    <span className={styles.resultKind}>Općina · {h.kantonNaziv}</span>
                    <span className={styles.resultCode}>{h.item.kod}</span>
                    <span className={styles.resultName}>
                      {highlight(h.item.name, debounced)}
                      {h.item.racuni.length > 0 && (
                        <span style={{ color: "var(--mid)", fontSize: 12, marginLeft: 8 }}>
                          {h.item.racuni.length} račun
                          {h.item.racuni.length > 1 ? "a" : ""}
                        </span>
                      )}
                    </span>
                  </div>
                );
              }
              return (
                <div key={`b${i}`} className={styles.resultItem}>
                  <span className={styles.resultKind}>Budžetska org.</span>
                  <span className={styles.resultCode}>{h.item.kod}</span>
                  <span className={styles.resultName}>{highlight(h.item.naziv, debounced)}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Uplatni računi ─── */}
      {!debounced && (
        <>
          <section className={styles.section} id="uplatni-racuni">
            <h2 className={styles.sectionTitle}>
              Uplatni <em>računi</em>
            </h2>
            <p className={styles.sectionSub}>
              Brojevi depozitnih računa za uplatu javnih prihoda, federalni, kantonalni i fondovski.
              Za uplate doprinosa, poreza, naknada i drugih javnih obaveza.
            </p>

            <AccountGroup
              title="Federalni računi i fondovi"
              items={FEDERALNI_RACUNI}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
                </svg>
              }
            />
            <AccountGroup
              title="Kantonalni budžeti"
              items={KANTONALNI_BUDZETI}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6z" />
                </svg>
              }
            />
            <AccountGroup
              title="Kantonalni zavodi zdravstvenog osiguranja"
              items={KANTONALNI_ZZO}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M2 12h20" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              }
            />
            <AccountGroup
              title="Kantonalne službe za zapošljavanje"
              items={KANTONALNE_SLUZBE_ZAPOSLJAVANJE}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
          </section>

          {/* ─── Općinski budžeti ─── */}
          <section className={styles.section} id="opcinski-budzeti">
            <h2 className={styles.sectionTitle}>
              Općinski <em>budžeti</em>
            </h2>
            <p className={styles.sectionSub}>
              Računi javnih prihoda općinskih budžeta i <strong>trocifrene šifre općina</strong>{" "}
              (polje 14. platnog naloga) prema mjestu prebivališta poreznog obveznika. Grupisano
              po kantonima.
              <br />
              <span style={{ fontSize: 12, color: "var(--mid)" }}>
                Izvor: Pravilnik PUFBiH (sekcija 12.1.3, Računi budžeta jedinica lokalne
                samouprave). Mogu biti zastarjeli ako PUFBiH objavi noviju verziju, {" "}
                <a
                  href="https://www.pufbih.ba/v1/public/upload/zakoni/2f01a-precisceni-pravilnik-o-nacinu-uplate-pripadnosti-i-raspodjele-javnih-prihoda-u-fbih-precisceni-novi.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--sage)" }}
                >
                  otvori pravilnik (PDF) ↗
                </a>
              </span>
            </p>
            {OPCINE_GROUPS.map((g) => (
              <details key={g.kanton} className={styles.groupCard}>
                <summary className={styles.groupSummary}>
                  <span className={styles.groupLeft}>
                    <span className={styles.groupCode}>{g.kanton}</span>
                    <span className={styles.groupName}>{g.kantonNaziv}</span>
                  </span>
                  <span className={styles.groupCount}>{g.opcine.length}</span>
                  <svg className={styles.groupChev} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <div className={styles.groupBody}>
                  <table className={styles.opcTable}>
                    <thead>
                      <tr>
                        <th>Općina</th>
                        <th>Šifra</th>
                        <th>Banka</th>
                        <th>Broj računa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.opcine.map((o) => (
                        <tr key={o.kod + o.name} id={`opcina-${o.kod}`}>
                          <td className={styles.opcName}>{o.name}</td>
                          <td className={styles.opcKod}>
                            {o.kod && o.kod !== "–" ? (
                              <>
                                {o.kod}
                                <CopyBtn text={o.kod} label={`šifru ${o.kod}`} />
                              </>
                            ) : (
                              <span style={{ color: "var(--mid)" }}>–</span>
                            )}
                          </td>
                          <td className={styles.accBank}>{o.banka}</td>
                          <td className={styles.opcRacuni}>
                            {o.racuni.length === 0 ? (
                              <span style={{ color: "var(--mid)" }}>–</span>
                            ) : (
                              <div className={styles.racuniList}>
                                {o.racuni.map((r) => (
                                  <span key={r} className={styles.racunItem}>
                                    <span className={styles.accNum}>{r}</span>
                                    <CopyBtn text={r} label={`račun ${r}`} />
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </section>

          {/* ─── Vrste prihoda ─── */}
          <section className={styles.section} id="vrste-prihoda">
            <h2 className={styles.sectionTitle}>
              Vrste <em>prihoda</em>
            </h2>
            <p className={styles.sectionSub}>
              Šestocifrene šifre vrsta prihoda po ekonomskoj klasifikaciji, upisuju se u polje{" "}
              <strong>11. Vrsta prihoda</strong> platnog naloga. Grupisano po ekonomskoj grupi
              (prve tri cifre).
            </p>
            {VRSTE_PRIHODA_GROUPS.map((g) => (
              <details key={g.code} className={styles.groupCard}>
                <summary className={styles.groupSummary}>
                  <span className={styles.groupLeft}>
                    <span className={styles.groupCode}>{g.code}</span>
                    <span className={styles.groupName}>{g.name}</span>
                  </span>
                  <span className={styles.groupCount}>{g.items.length}</span>
                  <svg className={styles.groupChev} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <div className={styles.groupBody}>
                  <table className={styles.priList}>
                    <tbody>
                      {g.items.map((it) => (
                        <tr key={it.code} id={`prihod-${it.code}`}>
                          <td className={styles.priCode}>
                            {it.code}
                            <CopyBtn text={it.code} label={`šifru ${it.code}`} />
                          </td>
                          <td className={styles.priName}>
                            {it.name || <span style={{ color: "var(--mid)" }}>–</span>}
                            {it.section && <span className={styles.priSect}>{it.section}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </section>

          {/* ─── Budžetske organizacije ─── */}
          <section className={styles.section} id="budzetske-organizacije">
            <h2 className={styles.sectionTitle}>
              Budžetske <em>organizacije</em>
            </h2>
            <p className={styles.sectionSub}>
              Sedmocifrene šifre organizacione klasifikacije, upisuju se u polje{" "}
              <strong>15. Budžetska organizacija</strong> platnog naloga, kada se prihod prati po
              budžetskom korisniku.
            </p>
            <table className={styles.boTable}>
              <thead>
                <tr>
                  <th>Šifra</th>
                  <th>Naziv budžetske organizacije</th>
                </tr>
              </thead>
              <tbody>
                {BUDZETSKE_ORGANIZACIJE.map((b) => (
                  <tr key={b.kod}>
                    <td className={styles.boCode}>
                      {b.kod}
                      <CopyBtn text={b.kod} label={`šifru ${b.kod}`} />
                    </td>
                    <td>{b.naziv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className={styles.sourceNote}>
            <p style={{ margin: "0 0 0.6rem" }}>
              <strong>Federalni i kantonalni računi:</strong>{" "}
              <a
                href="https://www.pufbih.ba/servisi-za-obveznike/uplatni-racuni"
                target="_blank"
                rel="noopener noreferrer"
              >
                pufbih.ba/servisi-za-obveznike/uplatni-racuni
              </a>,{" "}
              uvijek aktuelni podaci sa zvanične PUFBiH stranice.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Općinski računi:</strong> Pravilnik o načinu uplate, pripadnosti i
              raspodjele javnih prihoda u FBiH (prečišćeni tekst),{" "}
              <a
                href="https://www.pufbih.ba/v1/public/upload/zakoni/2f01a-precisceni-pravilnik-o-nacinu-uplate-pripadnosti-i-raspodjele-javnih-prihoda-u-fbih-precisceni-novi.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                Porezna uprava FBiH (PDF)
              </a>
              . Za eventualne izmjene provjeri najnoviju verziju dokumenta na{" "}
              <a
                href="https://www.pufbih.ba/servisi-za-obveznike/uplatni-racuni"
                target="_blank"
                rel="noopener noreferrer"
              >
                pufbih.ba
              </a>
              .
            </p>
          </div>
        </>
      )}
        </div>
      </div>

      <section className={styles.faqSection}>
        <h2>Često postavljana pitanja</h2>
        <details className={styles.faqItem}>
          <summary>Šta je vrsta prihoda i gdje se upisuje u platni nalog?</summary>
          <p>
            Vrsta prihoda je šestocifrena šifra po ekonomskoj klasifikaciji javnih prihoda u FBiH
            (npr. <strong>712112</strong> za doprinos PIO/MIO, <strong>716111</strong> za porez na
            dohodak iz plate). Upisuje se u <strong>polje 11.</strong> platnog naloga i određuje na
            koji depozitni račun se prihod usmjerava.
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Koja je šifra za doprinos PIO/MIO i gdje se uplaćuje?</summary>
          <p>
            Doprinos za penzijsko i invalidsko osiguranje iz plaća i na plaće ima šifru{" "}
            <strong>712112</strong>. Uplaćuje se na račun Budžeta Federacije:{" "}
            <strong>102-050-00001066-98</strong> (Union banka d.d. Sarajevo).
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Kako se dijele doprinosi za zdravstveno osiguranje?</summary>
          <p>
            Doprinos za zdravstvo iz plate (<strong>712111</strong>) dijeli se: <strong>89,8%</strong> na
            kantonalni Zavod zdravstvenog osiguranja prema mjestu prebivališta radnika, i{" "}
            <strong>10,2%</strong> na federalni ZZO (<strong>102-050-00000640-18</strong>).
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Kako se dijeli doprinos za nezaposlenost?</summary>
          <p>
            Doprinos za nezaposlenost (<strong>712113</strong>): <strong>30%</strong> na račun
            Federalnog zavoda za zapošljavanje (<strong>161-000-00285700-03</strong>) i{" "}
            <strong>70%</strong> na kantonalnu službu za zapošljavanje prema prebivalištu radnika.
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Šta je trocifrena šifra općine i gdje se upisuje?</summary>
          <p>
            Šifra općine identifikuje općinu prema mjestu prebivališta poreznog obveznika ili
            sjedišta organizacije. Upisuje se u <strong>polje 14.</strong> platnog naloga.
            Primjeri: Centar Sarajevo = <strong>077</strong>, Tuzla = <strong>094</strong>, Grad
            Mostar = <strong>180</strong>.
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Šta je budžetska organizacija u platnom nalogu?</summary>
          <p>
            Budžetska organizacija je sedmocifrena šifra organizacione klasifikacije korisnika
            javnog prihoda. Upisuje se u <strong>polje 15.</strong> platnog naloga kada se prihod
            prati po budžetskom korisniku (npr. <strong>5102001</strong> za Federalni zavod za
            PIO/MIO).
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Da li su uplatni računi na ovoj stranici aktuelni?</summary>
          <p>
            Federalni i kantonalni računi (Budžet FBiH, ZZO, Federalni zavod za zapošljavanje,
            Fond invalida, kantonalni budžeti) sinhronizirani su sa{" "}
            <strong>live PUFBiH stranicom</strong> i uvijek su aktuelni. Općinski računi su iz
            najnovijeg pravilnika PUFBiH (sekcija 12.1.3), za 100% aktuelne podatke provjerite{" "}
            <a href="https://www.pufbih.ba/servisi-za-obveznike/uplatni-racuni" target="_blank" rel="noopener noreferrer">
              pufbih.ba
            </a>
            .
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Mogu li uplatiti više vrsta prihoda jednim nalogom?</summary>
          <p>
            Ne. Svaka vrsta prihoda (šifra) zahtijeva poseban platni nalog jer se različite šifre
            usmjeravaju na različite depozitne račune. Naša aplikacija u Obračunu plata automatski
            generiše posebne uplatnice za svaku vrstu prihoda, PIO, zdravstvo, nezaposlenost,
            porez i ostalo.
          </p>
        </details>
      </section>
    </main>
  );
}

function AccountGroup({
  title,
  items,
  defaultOpen = false,
  icon,
}: {
  title: string;
  items: Racun[];
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`${styles.accGroup} ${open ? styles.accGroupOpen : ""}`}>
      <button
        type="button"
        className={styles.accGroupHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.accGroupHeaderLeft}>
          {icon && <span className={styles.accGroupIcon}>{icon}</span>}
          <span className={styles.accGroupTitle}>
            {title}
            <span className={styles.accGroupCount}>{items.length}</span>
          </span>
        </span>
        <svg
          className={`${styles.accGroupChev} ${open ? styles.accGroupChevOpen : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <table className={styles.accTable}>
          <thead>
            <tr>
              <th>Naziv</th>
              <th>Banka</th>
              <th>Broj računa</th>
              <th>Napomena</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className={styles.accName}>{it.naziv}</td>
                <td className={styles.accBank}>{it.banka || "–"}</td>
                <td className={styles.accNum}>
                  {it.racun}
                  <CopyBtn text={it.racun} label={`račun ${it.racun}`} />
                </td>
                <td className={styles.accNote}>{it.napomena || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
