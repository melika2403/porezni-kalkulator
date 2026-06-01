"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { KD_BIH_DETAILED, type KdBihArea } from "src/data/kd-bih-detailed";
import styles from "./sifre-djelatnosti.module.css";

type SearchHit = {
  area: KdBihArea;
  oblastCode?: string;
  granaCode?: string;
  razredCode?: string;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

const RELATED_TOOLS = [
  { href: "/sihterica", label: "Šihterica", desc: "Mjesečna evidencija radnog vremena" },
  { href: "/preracun-neto-bruto", label: "Neto ↔ Bruto plata", desc: "Brzi obračun plata i doprinosa" },
  { href: "/pdv-kalkulator", label: "PDV kalkulator", desc: "Preračun cijene sa i bez PDV-a" },
  { href: "/spr", label: "SPR-1053", desc: "Specifikacija dohotka samostalne djelatnosti" },
  { href: "/gpd", label: "GPD-1051", desc: "Godišnja porezna prijava" },
  { href: "/zo3", label: "ZO3", desc: "Prijava člana porodice na zdravstveno" },
  { href: "/ams", label: "AMS-1035", desc: "Akontacija poreza po odbitku na druge samostalne djelatnosti" },
  { href: "/amortizacija", label: "Stalna sredstva", desc: "Vođenje OS i amortizacija" },
  { href: "/prijave-radnika?tab=obracun", label: "Obračun plata", desc: "Plate, doprinosi, uplatnice i 2001/2002" },
  { href: "/prijave-radnika", label: "JS3100", desc: "Prijava/odjava radnika online" },
  { href: "/ugovor-o-radu", label: "Ugovor o radu", desc: "Predložak ugovora i otkaza FBiH" },
  { href: "/ugovor-o-djelu", label: "Ugovor o djelu", desc: "Predložak + obračun poreza" },
  { href: "/ugovor-o-pozajmici", label: "Ugovor o pozajmici", desc: "Word/PDF predložak" },
  { href: "/fakture", label: "Fakture i predračuni", desc: "Generator faktura" },
  { href: "/clanske-kartice", label: "Članske kartice", desc: "Generator s QR kodom" },
];

const AREA_NAMES_CASUAL: Record<string, string> = {
  A: "Poljoprivreda i šumarstvo",
  B: "Vađenje ruda i kamena",
  C: "Prerađivačka industrija",
  D: "Energija, plin, klimatizacija",
  E: "Voda, otpad, okoliš",
  F: "Građevinarstvo",
  G: "Trgovina i popravak vozila",
  H: "Prijevoz i skladištenje",
  I: "Ugostiteljstvo i smještaj",
  J: "Informacije i komunikacije",
  K: "Finansije i osiguranje",
  L: "Poslovanje nekretninama",
  M: "Stručne i tehničke djelatnosti",
  N: "Administrativne usluge",
  O: "Javna uprava i odbrana",
  P: "Obrazovanje",
  Q: "Zdravstvena zaštita",
  R: "Umjetnost i rekreacija",
  S: "Ostale uslužne djelatnosti",
  T: "Djelatnosti domaćinstava",
  U: "Vanteritorijalne organizacije",
};

/** Wraps occurrences of `query` in `text` with <mark>. Matching is diacritic-insensitive. */
function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return text;

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;
  let idx = normalizedText.indexOf(normalizedQuery);
  while (idx !== -1) {
    if (idx > lastEnd) parts.push(text.slice(lastEnd, idx));
    parts.push(
      <mark key={parts.length} className={styles.mark}>
        {text.slice(idx, idx + normalizedQuery.length)}
      </mark>,
    );
    lastEnd = idx + normalizedQuery.length;
    idx = normalizedText.indexOf(normalizedQuery, lastEnd);
  }
  if (lastEnd < text.length) parts.push(text.slice(lastEnd));
  return parts.length ? parts : text;
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
      aria-label={`Kopiraj šifru ${code}`}
      title={copied ? "Kopirano!" : "Kopiraj šifru"}
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

// Header lines koje sadrže "isključ" su izuzeci (npr. "Isključuje:",
// "Ova grana isključuje:") — renderujemo ih s distinktnim stilom da korisnik
// jasno vidi da su nabrojane djelatnosti IZUZETE iz ovog razreda.
const EXCLUDE_HEADER_RE = /isključ/i;

function renderDescription(text: string) {
  if (!text) return null;
  // PDF-extracted tekst: bullet stavke su uvučene (4+ razmaka), opcionalno sa
  // "-" za pod-stavke. Ne-uvučene linije su ili (a) header-i (završavaju ":",
  // npr. "Ovaj razred uključuje:", "Isključuje:") ili (b) intro paragrafi.
  // Linije se mogu prelomiti usred fraze (npr. "(vidi\n          88.99)") —
  // spajamo ih dok zagrada nije zatvorena.
  const rawLines = text.split("\n").map((l) => l.replace(/\s+$/, ""));

  type DescNode =
    | { kind: "header"; text: string; exclude: boolean }
    | { kind: "para"; text: string }
    | { kind: "list"; items: string[] };
  const nodes: DescNode[] = [];

  let listItems: string[] = [];
  let paraBuf = "";

  const isBullet = (l: string) => /^\s{2,}[-•]?\s*\S/.test(l);
  const unbalancedParens = (s: string) =>
    (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length > 0;

  const flushList = () => {
    if (listItems.length) {
      nodes.push({ kind: "list", items: listItems });
      listItems = [];
    }
  };
  const flushPara = () => {
    if (paraBuf.trim()) {
      nodes.push({ kind: "para", text: paraBuf.trim() });
      paraBuf = "";
    }
  };

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Prazna linija: kraj paragrafa. Lista se nastavlja (PDF ume da ubaci
      // prazne linije unutar grupe stavki).
      flushPara();
      continue;
    }
    // Header: ne-uvučena linija koja završava ":".
    if (!isBullet(line) && /:$/.test(trimmed)) {
      flushPara();
      flushList();
      nodes.push({
        kind: "header",
        text: trimmed,
        exclude: EXCLUDE_HEADER_RE.test(trimmed),
      });
      continue;
    }
    if (isBullet(line)) {
      flushPara();
      const item = line.replace(/^\s+[-•]?\s*/, "");
      // Nastavak prelomljene stavke: prethodna ima otvorenu zagradu → spoji.
      if (listItems.length && unbalancedParens(listItems[listItems.length - 1])) {
        listItems[listItems.length - 1] += " " + item;
      } else {
        listItems.push(item);
      }
    } else {
      // Intro paragraf (ne-uvučen, ne završava ":").
      flushList();
      paraBuf += (paraBuf ? " " : "") + trimmed;
    }
  }
  flushPara();
  flushList();

  return nodes.map((n, i) => {
    if (n.kind === "header") {
      return (
        <p
          key={i}
          className={n.exclude ? styles.descExcludeHeader : styles.descHeader}
        >
          {n.text}
        </p>
      );
    }
    if (n.kind === "para") {
      return (
        <p key={i} className={styles.descPara}>
          {n.text}
        </p>
      );
    }
    return (
      <ul key={i} className={styles.descList}>
        {n.items.map((it, j) => (
          <li key={j}>{it}</li>
        ))}
      </ul>
    );
  });
}

export default function SifreDjelatnosti() {
  const [query, setQuery] = useState("");
  const [activeArea, setActiveArea] = useState<string>("");
  const [allOpen, setAllOpen] = useState(false);
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [pendingNavCode, setPendingNavCode] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const stickyInputRef = useRef<HTMLInputElement>(null);
  const mainSearchRow = useRef<HTMLDivElement>(null);

  // Debounce search
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 180);
    return () => clearTimeout(t);
  }, [query]);

  // Keyboard shortcuts: '/' focuses search, Esc clears
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "Escape" && target === searchInputRef.current) {
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // When a search result is clicked we set pendingNavCode and clear the query.
  // Once the accordion view renders (debouncedQuery empty AND DOM committed),
  // this effect fires: opens parent <details> and scrolls the razred into view.
  useEffect(() => {
    if (!pendingNavCode || debouncedQuery) return;
    // Wait two frames so React has committed the new DOM and the browser laid it out.
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetId = `sifra-${pendingNavCode}`;
        const el = document.getElementById(targetId);
        if (el) {
          let parent: HTMLElement | null = el.parentElement;
          while (parent) {
            if (parent.tagName === "DETAILS") {
              (parent as HTMLDetailsElement).open = true;
            }
            parent = parent.parentElement;
          }
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", `#${targetId}`);
        }
        setPendingNavCode(null);
      });
    });
    return () => cancelAnimationFrame(raf1);
  }, [pendingNavCode, debouncedQuery]);

  // Show floating sticky search when the hero search row scrolls out of view
  useEffect(() => {
    const el = mainSearchRow.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickySearch(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Expand/collapse all <details> in the content area
  const toggleAll = useCallback(() => {
    const next = !allOpen;
    setAllOpen(next);
    document
      .querySelectorAll<HTMLDetailsElement>(`.${styles.oblast}`)
      .forEach((el) => {
        el.open = next;
      });
  }, [allOpen]);

  const hits = useMemo<SearchHit[]>(() => {
    if (!debouncedQuery) return [];
    const q = normalize(debouncedQuery);
    const results: SearchHit[] = [];
    for (const area of KD_BIH_DETAILED) {
      for (const oblast of area.oblasti) {
        for (const grana of oblast.grane) {
          for (const razred of grana.razredi) {
            const blob = normalize(`${razred.code} ${razred.name} ${oblast.name} ${grana.name}`);
            if (blob.includes(q)) {
              results.push({
                area,
                oblastCode: oblast.code,
                granaCode: grana.code,
                razredCode: razred.code,
              });
            }
          }
        }
      }
    }
    return results.slice(0, 80);
  }, [debouncedQuery]);

  const allAreaCodes = KD_BIH_DETAILED.map((a) => a.code);

  return (
    <div className={styles.page}>
      <div
        className={`${styles.stickyBar} ${showStickySearch ? styles.stickyBarVisible : ""}`}
        aria-hidden={!showStickySearch}
      >
        <div className={styles.stickyInner}>
          <svg
            className={styles.stickySearchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={stickyInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pretraga šifri…"
            className={styles.stickySearch}
            aria-label="Pretraga šifri djelatnosti"
            tabIndex={showStickySearch ? 0 : -1}
          />
          {query && (
            <button
              type="button"
              className={styles.stickyClearBtn}
              onClick={() => setQuery("")}
              aria-label="Očisti pretragu"
              tabIndex={showStickySearch ? 0 : -1}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.label}>Klasifikacija djelatnosti BiH 2010 • NACE Rev. 2</div>
        <h1 className={styles.h1}>
          Šifre djelatnosti <em>FBiH</em>
        </h1>
        <p className={styles.subtitle}>
          Kompletna lista <strong>šifri djelatnosti</strong> za Federaciju BiH prema Klasifikaciji
          djelatnosti BiH 2010 (KD BiH 2010), zasnovanoj na evropskoj NACE Rev. 2 klasifikaciji.
          Pronađite <strong>šifru za vašu djelatnost</strong>, pogledajte koje su djelatnosti uključene,
          a koje izuzete, te otkrijte alate koji vam mogu pomoći pri otvaranju obrta ili
          administriranju radnika.
        </p>

        <div ref={mainSearchRow} className={styles.searchRow}>
          <svg
            className={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pretraga: 'programiranje', 'frizer', '62.01'…"
            className={styles.search}
            aria-label="Pretraga šifri djelatnosti"
          />
          {query && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => setQuery("")}
              aria-label="Očisti pretragu"
            >
              ×
            </button>
          )}
        </div>

        {!debouncedQuery && (
          <nav className={styles.areaNav} aria-label="Brza navigacija po područjima">
            {allAreaCodes.map((code) => (
              <a
                key={code}
                href={`#podrucje-${code}`}
                className={styles.areaPill}
                onClick={() => setActiveArea(code)}
                title={AREA_NAMES_CASUAL[code]}
              >
                <span className={styles.areaPillCode}>{code}</span>
                <span className={styles.areaPillName}>
                  {AREA_NAMES_CASUAL[code]}
                </span>
              </a>
            ))}
          </nav>
        )}
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Alati na našoj stranici">
          <div className={styles.sidebarTitle}>Naši alati i obrasci</div>
          <p className={styles.sidebarLead}>
            Pronašli ste šifru? Evo šta vam može pomoći u otvaranju obrta i svakodnevnom poslovanju.
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

        <main className={styles.content}>
          {!debouncedQuery && (
            <div className={styles.toolbar}>
              <button
                type="button"
                className={styles.toolbarBtn}
                onClick={toggleAll}
                aria-pressed={allOpen}
              >
                {allOpen ? "Zatvori sve" : "Otvori sve"}
              </button>
              <span className={styles.toolbarHint}>
                Pritisni <kbd className={styles.kbd}>/</kbd> za pretragu
              </span>
            </div>
          )}
          {debouncedQuery ? (
            <section className={styles.searchResults}>
              <div className={styles.resultsHeader}>
                {hits.length > 0
                  ? `Pronađeno ${hits.length}${hits.length === 80 ? "+" : ""} rezultata za „${debouncedQuery}"`
                  : `Nema rezultata za „${debouncedQuery}"`}
              </div>
              {hits.map((h, i) => {
                const oblast = h.area.oblasti.find((o) => o.code === h.oblastCode);
                const grana = oblast?.grane.find((g) => g.code === h.granaCode);
                const razred = grana?.razredi.find((r) => r.code === h.razredCode);
                if (!razred || !oblast || !grana) return null;
                return (
                  <a
                    key={`${h.razredCode}-${i}`}
                    href={`#sifra-${razred.code}`}
                    className={styles.resultCard}
                    onClick={(e) => {
                      e.preventDefault();
                      setPendingNavCode(razred.code);
                      setQuery("");
                      setDebouncedQuery(""); // bypass 180ms debounce so accordion renders this frame
                    }}
                  >
                    <div className={styles.resultCode}>
                      {highlight(razred.code, debouncedQuery)}
                    </div>
                    <div className={styles.resultBody}>
                      <div className={styles.resultName}>
                        {highlight(razred.name, debouncedQuery)}
                      </div>
                      <div className={styles.resultPath}>
                        Područje {h.area.code} › {oblast.code} {oblast.name}
                      </div>
                    </div>
                  </a>
                );
              })}
            </section>
          ) : (
            KD_BIH_DETAILED.map((area) => (
              <section
                key={area.code}
                id={`podrucje-${area.code}`}
                className={styles.areaSection}
              >
                <header className={styles.areaHeader}>
                  <div className={styles.areaCode}>Područje {area.code}</div>
                  <h2 className={styles.areaTitle}>{AREA_NAMES_CASUAL[area.code] || area.name}</h2>
                  {area.description && (
                    <div className={styles.areaIntro}>{renderDescription(area.description)}</div>
                  )}
                </header>

                {area.oblasti.map((oblast) => (
                  <details key={oblast.code} className={styles.oblast}>
                    <summary className={styles.oblastSummary}>
                      <span className={styles.oblastCode}>{oblast.code}</span>
                      <span className={styles.oblastName}>{oblast.name}</span>
                    </summary>
                    <div className={styles.oblastBody}>
                      {oblast.description && (
                        <div className={styles.oblastIntro}>
                          {renderDescription(oblast.description)}
                        </div>
                      )}
                      {oblast.grane.map((grana) => (
                        <div key={grana.code} className={styles.grana}>
                          <h4 className={styles.granaTitle}>
                            <span className={styles.granaCode}>{grana.code}</span>
                            {grana.name}
                          </h4>
                          {grana.description && (
                            <div className={styles.granaIntro}>
                              {renderDescription(grana.description)}
                            </div>
                          )}
                          {grana.razredi.map((razred) => (
                            <article
                              key={razred.code}
                              id={`sifra-${razred.code}`}
                              className={styles.razred}
                            >
                              <h5 className={styles.razredTitle}>
                                <span className={styles.razredCode}>{razred.code}</span>
                                <span className={styles.razredName}>{razred.name}</span>
                                <CopyCodeButton code={razred.code} />
                              </h5>
                              {razred.description && (
                                <div className={styles.razredDesc}>
                                  {renderDescription(razred.description)}
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </section>
            ))
          )}
        </main>
      </div>

      <section className={styles.faqSection}>
        <h2>Često postavljana pitanja</h2>
        <details className={styles.faqItem}>
          <summary>Šta je KD BiH 2010?</summary>
          <p>
            Klasifikacija djelatnosti Bosne i Hercegovine 2010 (KD BiH 2010) je službeni standard za
            razvrstavanje ekonomskih djelatnosti u BiH, donesen na osnovu Zakona o KD BiH i objavljen
            u Službenom glasniku. Zasnovana je na evropskoj NACE Rev. 2 klasifikaciji, čime se
            osigurava usporedivost podataka sa EU i međunarodnim standardima.
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Kako da pronađem pravu šifru djelatnosti za moj obrt?</summary>
          <p>
            Pretražite po ključnoj riječi (npr. „programiranje", „frizer", „prevoz") ili po šifri
            ako je već znate. Otvorite područje i oblast, pa pročitajte šta razred uključuje, a šta
            izuzima — često postoji slična djelatnost u drugoj oblasti. Ako ste i dalje u dilemi,
            konsultujte ovlaštenog knjigovođu ili nadležnu poreznu ispostavu.
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Koja je razlika između područja, oblasti, grane i razreda?</summary>
          <p>
            KD BiH 2010 ima četiri nivoa hijerarhije: <strong>područje</strong> (slovo A–U),{" "}
            <strong>oblast</strong> (dvocifreni broj, npr. 62), <strong>grana</strong> (tri cifre,
            npr. 62.0) i <strong>razred</strong> (četiri cifre, npr. 62.01). Razred je najuži nivo
            koji se koristi prilikom registracije djelatnosti.
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Mogu li registrovati više djelatnosti?</summary>
          <p>
            Da. Pri registraciji obrta navodi se glavna (pretežna) djelatnost, ali se može
            registrovati i više sporednih. Glavna djelatnost je ona koja generiše najveću dodatnu
            vrijednost ili zapošljava najviše ljudi.
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Da li se šifre djelatnosti razlikuju u FBiH i RS?</summary>
          <p>
            Ne — KD BiH je jedinstvena na nivou cijele BiH i identična u oba entiteta, jer je
            preuzeta iz Zakona o KD BiH ("Službeni glasnik BiH"). Razlikuje se samo nadležni organ
            za registraciju (FBiH: kantonalna porezna uprava; RS: Poreska uprava RS).
          </p>
        </details>
        <details className={styles.faqItem}>
          <summary>Šta znači NACE Rev. 2?</summary>
          <p>
            NACE Rev. 2 je statistička klasifikacija ekonomskih djelatnosti Evropske unije (verzija
            2008). KD BiH 2010 je nacionalna verzija usaglašena s NACE Rev. 2, što znači da prve
            četiri cifre svake šifre odgovaraju evropskoj klasifikaciji.
          </p>
        </details>
      </section>

      <footer className={styles.footnote}>
        <p>
          Izvor: Klasifikacija djelatnosti Bosne i Hercegovine 2010 (KD BiH 2010) — Agencija za
          statistiku BiH i Federalni zavod za statistiku, na osnovu Zakona o KD BiH (Sl. glasnik BiH
          br. 76/06) i evropske klasifikacije NACE Rev. 2.
        </p>
      </footer>
    </div>
  );
}
