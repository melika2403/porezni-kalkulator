"use client";

// Pregled Klasifikacije zanimanja u FBiH (KZBiH-08 / ISCO-08): abecedni
// spisak 4.193 zanimanja sa šiframa, pretraga po nazivu ili šifri i kopiranje
// šifre jednim klikom. Prikaz šifre je zvanični, SA tačkom (4110.001), a
// kopira se BEZ tačke (4110001) jer se tako upisuje u JS3100.
// Raspored (sidebar sa našim alatima + collapsible sekcije + "Otvori sve")
// prati /sifre-djelatnosti.
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import PkOfficePromo from "src/components/PkOfficePromo/PkOfficePromo";
import { ZANIMANJA_FBIH, type Zanimanje } from "src/data/zanimanja-fbih";
import {
  filtrirajZanimanja,
  normalizujTekst,
  pocetnoSlovo,
  sifraSaTackom,
} from "src/lib/zanimanjaSearch";
import styles from "./sifre-zanimanja.module.css";
import { ReklamaStub } from "src/components/PartnerSlot/Slot";

const PRIKAZ_LIMIT = 400;

const RELATED_TOOLS = [
  { href: "/prijave-radnika", label: "JS3100 prijava / odjava", desc: "Obrazac u koji se šifra zanimanja upisuje" },
  { href: "/aktivni-radnici", label: "Aktivni radnici", desc: "Karton radnika sa zanimanjem i JS3100 podacima" },
  { href: "/prijave-radnika?tab=obracun", label: "Obračun plata", desc: "Plate, doprinosi, uplatnice i 2001/2002" },
  { href: "/sihterica", label: "Šihterica", desc: "Mjesečna evidencija radnog vremena" },
  { href: "/ugovor-o-radu", label: "Ugovor o radu", desc: "Predložak ugovora i otkaza FBiH" },
  { href: "/rjesenja-i-odluke", label: "Rješenja i odluke", desc: "Godišnji odmor, regres, odsustva" },
  { href: "/sifre-djelatnosti", label: "Šifre djelatnosti", desc: "KD BiH 2010 za registraciju obrta" },
  { href: "/javni-prihodi", label: "Javni prihodi", desc: "Uplatni računi i vrste prihoda FBiH" },
];

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const nText = normalizujTekst(text);
  const nQuery = normalizujTekst(query);
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

function CopyBtn({ sifra }: { sifra: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ""}`}
      onClick={() => {
        // kopira se BEZ tačke: tačno ono što se upisuje u JS3100
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(sifra).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }
      }}
      title={copied ? "Kopirano!" : `Kopiraj ${sifra} (bez tačke, za JS3100)`}
      aria-label={`Kopiraj šifru ${sifra}`}
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

function Red({ z, query }: { z: Zanimanje; query: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.sifra}>
        {sifraSaTackom(z.sifra)}
        <CopyBtn sifra={z.sifra} />
      </span>
      <span className={styles.naziv}>{highlight(z.naziv, query)}</span>
    </div>
  );
}

export default function SifreZanimanja() {
  const [query, setQuery] = useState("");
  const [allOpen, setAllOpen] = useState(false);

  // Abecedne sekcije: podaci su već sortirani bosanskim collatorom, pa su
  // slova uzastopna; digrafi Lj/Nj/Dž su zasebna slova (bosanska abeceda).
  const sekcije = useMemo(() => {
    const out: { slovo: string; stavke: Zanimanje[] }[] = [];
    for (const z of ZANIMANJA_FBIH) {
      const slovo = pocetnoSlovo(z.naziv);
      const zadnja = out[out.length - 1];
      if (zadnja && zadnja.slovo === slovo) zadnja.stavke.push(z);
      else out.push({ slovo, stavke: [z] });
    }
    return out;
  }, []);

  const q = query.trim();
  const rezultati = useMemo(
    () => (q ? filtrirajZanimanja(ZANIMANJA_FBIH, q, Infinity) : null),
    [q],
  );

  // Otvori/zatvori sve <details> sekcije (isti mehanizam kao šifre djelatnosti)
  const toggleAll = useCallback(() => {
    const next = !allOpen;
    setAllOpen(next);
    document
      .querySelectorAll<HTMLDetailsElement>(`.${styles.letterSection}`)
      .forEach((el) => {
        el.open = next;
      });
  }, [allOpen]);

  const skociNaSlovo = useCallback((slovo: string) => {
    const el = document.getElementById(`slovo-${slovo}`) as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.label}>Klasifikacija zanimanja u FBiH · KZBiH-08</div>
        <h1 className={styles.h1}>
          Šifre <em>zanimanja</em> u FBiH
        </h1>
        <p className={styles.subtitle}>
          Kompletan abecedni spisak <strong>{ZANIMANJA_FBIH.length.toLocaleString("de-DE")} zanimanja</strong> iz
          zvanične Klasifikacije zanimanja u Federaciji BiH (KZBiH-08, po
          međunarodnom standardu ISCO-08). Šifra se zvanično piše sa tačkom
          (npr. 4110.001), a u <strong>JS3100 obrazac</strong> se upisuje{" "}
          <strong>bez tačke, svih 7 cifara</strong>, pa dugme za kopiranje
          kopira šifru spremnu za upis.
        </p>

        <div className={styles.searchRow}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            className={styles.search}
            placeholder="Pretraži po nazivu ili šifri (npr. konobar ili 5131)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className={styles.clearBtn} onClick={() => setQuery("")}>
              Očisti
            </button>
          )}
        </div>
        <p className={styles.countLine}>
          {rezultati
            ? `${rezultati.length.toLocaleString("de-DE")} pogodaka`
            : `${ZANIMANJA_FBIH.length.toLocaleString("de-DE")} zanimanja, A do Ž`}
        </p>
      </header>

      <div className={styles.layout}>
        {/* baner banke partnera skroz desno, uz lijevi sidebar po visini (od 1780px);
            sadržaj stranice ostaje pune širine */}
        <ReklamaStub stranica="sifre_zanimanja" strana="desno" raspored="uzOkvir" />
        <aside className={styles.sidebar} aria-label="Alati na našoj stranici">
          <PkOfficePromo />
          <div className={styles.sidebarTitle}>Naši alati i obrasci</div>
          <p className={styles.sidebarLead}>
            Pronašli ste šifru? Evo šta vam može pomoći kod prijave radnika i
            u svakodnevnom poslovanju.
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
          {!rezultati && (
            <>
              <nav className={styles.letterNav} aria-label="Skok na slovo">
                {sekcije.map((s) => (
                  <button
                    key={s.slovo}
                    type="button"
                    className={styles.letterChip}
                    onClick={() => skociNaSlovo(s.slovo)}
                  >
                    {s.slovo}
                  </button>
                ))}
              </nav>
              <div className={styles.toolbar}>
                <button
                  type="button"
                  className={styles.toolbarBtn}
                  onClick={toggleAll}
                  aria-pressed={allOpen}
                >
                  {allOpen ? "Zatvori sve" : "Otvori sve"}
                </button>
              </div>
            </>
          )}

          {rezultati ? (
            rezultati.length === 0 ? (
              <div className={styles.empty}>
                Nema zanimanja za "{q}". Pokušajte kraći pojam ili dio šifre.
              </div>
            ) : (
              <div className={styles.list}>
                {rezultati.slice(0, PRIKAZ_LIMIT).map((z) => (
                  <Red key={z.sifra} z={z} query={q} />
                ))}
                {rezultati.length > PRIKAZ_LIMIT && (
                  <p className={styles.moreNote}>
                    Prikazano prvih {PRIKAZ_LIMIT} od{" "}
                    {rezultati.length.toLocaleString("de-DE")} pogodaka, suzite
                    pretragu.
                  </p>
                )}
              </div>
            )
          ) : (
            sekcije.map((s) => (
              <details
                key={s.slovo}
                id={`slovo-${s.slovo}`}
                className={styles.letterSection}
              >
                <summary className={styles.letterSummary}>
                  <span className={styles.letterTitle}>{s.slovo}</span>
                  <span className={styles.letterCount}>
                    {s.stavke.length}{" "}
                    {s.stavke.length === 1 ? "zanimanje" : "zanimanja"}
                  </span>
                </summary>
                <div className={styles.list}>
                  {s.stavke.map((z) => (
                    <Red key={z.sifra} z={z} query="" />
                  ))}
                </div>
              </details>
            ))
          )}

          <section className={styles.faqSection}>
            <h2 className={styles.faqTitle}>Česta pitanja</h2>
            <details className={styles.faqItem}>
              <summary>Šta je Klasifikacija zanimanja u FBiH (KZBiH-08)?</summary>
              <p>
                To je obavezan statistički standard za evidentiranje zanimanja u
                Federaciji BiH, donesen Odlukom o klasifikaciji zanimanja u FBiH
                (Službene novine FBiH 40/04, sa kasnijim dopunama). Zasnovana je
                na klasifikaciji KZBiH-08, odnosno međunarodnom standardu
                ISCO-08, i objavljuje je Federalni zavod za statistiku.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Kako se šifra zanimanja upisuje u JS3100 obrazac?</summary>
              <p>
                U polje "Zanimanje, Šifra" upisuje se svih 7 cifara BEZ tačke:
                npr. zanimanje 5131.002 upisuje se kao 5131002. U polje
                "Zanimanje, Opis" upisuje se naziv zanimanja sa ovog spiska.
                Dugme za kopiranje pored svake šifre kopira je bez tačke, a naš
                JS3100 obrazac i karton radnika nude izbor sa liste, pa se oba
                polja popune automatski.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Šta znače cifre u šifri zanimanja?</summary>
              <p>
                Prve 4 cifre su ISCO-08 jedinična grupa zanimanja (npr. 5131 su
                konobari), a zadnje 3 cifre su redni broj konkretnog zanimanja
                unutar grupe. Zvanično se piše sa tačkom (5131.002), a u obrasce
                se unosi bez tačke.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Koje zanimanje izabrati ako nema tačnog naziva?</summary>
              <p>
                Bira se najbliže zanimanje iz iste grupe poslova, klasifikacija
                razlikuje zanimanje (vrstu posla) od radnog mjesta (naziva
                pozicije kod poslodavca). Ako postoji više srodnih, uzmite ono
                koje najbolje opisuje pretežni posao radnika.
              </p>
            </details>
            <details className={styles.faqItem}>
              <summary>Koliko zanimanja ima i koliko je spisak ažuran?</summary>
              <p>
                Spisak sadrži {ZANIMANJA_FBIH.length.toLocaleString("de-DE")}{" "}
                zanimanja, uključujući dopunu iz 2022. godine kojom je
                definisano 30 novih zanimanja. Za službene potrebe mjerodavan je
                tekst objavljen u Službenim novinama FBiH i na stranicama
                Federalnog zavoda za statistiku (fzs.ba).
              </p>
            </details>
          </section>

          <p className={styles.footnote}>
            Izvor: Klasifikacija zanimanja u Federaciji BiH, abecedni spisak
            zanimanja (KZBiH-08 / ISCO-08), Federalni zavod za statistiku;
            Odluka o klasifikaciji zanimanja u FBiH, Službene novine FBiH 40/04
            sa dopunama. Pregled je informativan, za službene potrebe mjerodavan
            je zvanični tekst.
          </p>
        </main>
      </div>
    </div>
  );
}
