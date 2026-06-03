"use client";
import { useState, useRef } from "react";
import styles from "./plata.module.css";
import { fromGross, fromNet, deductionFromCoefficient } from "src/utils/payrollFbih";

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) => {
  const [i, d] = Math.max(0, n).toFixed(2).split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + d;
};

const parse = (v: string) => {
  const n = parseFloat(v.replace(/\.(?=\d{3})/g, "").replace(",", "."));
  return isNaN(n) || n < 0 ? 0 : n;
};

// ── Component ──────────────────────────────────────────────────────────────
type Mode = "grossToNet" | "netToGross";

export default function PreracunPlate() {
  const [mode,  setMode]  = useState<Mode>("grossToNet");
  const [input, setInput] = useState("");
  const [coeff, setCoeff] = useState("1");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? 0;
    const charsBeforeCursor = raw.slice(0, cursorPos).replace(/\./g, "").length;
    const cleaned    = raw.replace(/[^\d,]/g, "");
    const firstComma = cleaned.indexOf(",");
    const intDigits  = firstComma >= 0 ? cleaned.slice(0, firstComma) : cleaned;
    const decPart    = firstComma >= 0 ? cleaned.slice(firstComma + 1, firstComma + 3) : null;
    if (!intDigits && decPart === null) { setInput(""); return; }
    const formattedInt = intDigits ? intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
    const formatted    = decPart !== null ? `${formattedInt},${decPart}` : formattedInt;
    setInput(formatted);
    let counted = 0, newCursor = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ".") counted++;
      if (counted === charsBeforeCursor) { newCursor = i + 1; break; }
    }
    setTimeout(() => inputRef.current?.setSelectionRange(newCursor, newCursor), 0);
  };

  const salary = parse(input);
  const ded    = deductionFromCoefficient(parse(coeff));
  const result = salary > 0
    ? (mode === "grossToNet" ? fromGross(salary, ded) : fromNet(salary, ded))
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Kalkulator plate — FBiH</div>
        <h1 className={styles.h1}>
          Kalkulator plate FBiH — preračun <em>neto i bruto</em>
        </h1>
        <p className={styles.subtitle}>
          Online kalkulator plate za Federaciju BiH — preračunajte neto u bruto
          i bruto u neto po važećim stopama poreza i doprinosa. Unesite iznos i
          dobijete kompletan pregled obustava, besplatno i bez registracije.
        </p>
      </div>

      <div className={styles.toggleWrap}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${mode === "grossToNet" ? styles.toggleActive : ""}`}
          onClick={() => setMode("grossToNet")}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M10 3v14M5 13l5 5 5-5" />
          </svg>
          Bruto → Neto
          <span className={styles.toggleHint}>Unesite bruto, izračunajte neto</span>
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${mode === "netToGross" ? styles.toggleActive : ""}`}
          onClick={() => setMode("netToGross")}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M10 17V3M5 7l5-5 5 5" />
          </svg>
          Neto → Bruto
          <span className={styles.toggleHint}>Unesite neto, izračunajte bruto</span>
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.inputSection}>
          <label className={styles.inputLabel}>
            {mode === "grossToNet" ? "Bruto plata" : "Neto plata"}
          </label>
          <div className={styles.inputWrap}>
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={input}
              onChange={handleChange}
              onBlur={() => { const n = parse(input); setInput(n > 0 ? fmt(n) : ""); }}
              onFocus={(e) => e.target.select()}
              autoFocus
            />
            <span className={styles.inputSuffix}>KM</span>
          </div>
        </div>

        <div className={styles.settings}>
          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>Porezni koeficijent (vaš odbitak iz porezne kartice)</label>
            <input
              className={styles.settingInput}
              type="text"
              inputMode="decimal"
              value={coeff}
              onChange={(e) => setCoeff(e.target.value)}
            />
          </div>
          <div className={styles.settingNote}>
            Koeficijent <strong>1</strong> = 300 KM odbitka.
            Trenutni odbitak: <strong>{fmt(Math.max(parse(coeff), 0) * 300)} KM</strong>
          </div>
        </div>

        {result ? (
          <div className={styles.results}>

            <div className={styles.summaryBand}>
              <span>Bruto plata</span>
              <span>{fmt(result.gross)} KM</span>
            </div>

            <div className={styles.group}>
              <div className={styles.groupTitle}>Doprinosi iz plate (na teret zaposlenog)</div>
              <div className={styles.row}>
                <span className={styles.rowName}>PIO / MIO</span>
                <span className={styles.rowPct}>17%</span>
                <span className={styles.rowVal}>{fmt(result.empPio)} KM</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>Zdravstveno osiguranje</span>
                <span className={styles.rowPct}>12,5%</span>
                <span className={styles.rowVal}>{fmt(result.empZdravstvo)} KM</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>Osiguranje od nezaposlenosti</span>
                <span className={styles.rowPct}>1,5%</span>
                <span className={styles.rowVal}>{fmt(result.empNezaposlenost)} KM</span>
              </div>
              <div className={`${styles.row} ${styles.rowSubtotal}`}>
                <span className={styles.rowName}>Ukupno</span>
                <span className={styles.rowPct}>31%</span>
                <span className={styles.rowVal}>{fmt(result.empTotal)} KM</span>
              </div>
            </div>

            <div className={styles.group}>
              <div className={styles.groupTitle}>Porez na dohodak</div>
              <div className={styles.row}>
                <span className={styles.rowName}>Porezna osnovica</span>
                <span className={styles.rowPct}></span>
                <span className={styles.rowVal}>{fmt(result.taxBase)} KM</span>
              </div>
              <div className={`${styles.row} ${styles.rowSubtotal}`}>
                <span className={styles.rowName}>Porez na dohodak</span>
                <span className={styles.rowPct}>10%</span>
                <span className={styles.rowVal}>{fmt(result.incomeTax)} KM</span>
              </div>
            </div>

            <div className={styles.netBand}>
              <span className={styles.netLabel}>Neto plata</span>
              <span className={styles.netValue}>{fmt(result.net)} KM</span>
            </div>

            <div className={styles.group}>
              <div className={styles.groupTitle}>Doprinosi na platu (na teret poslodavca)</div>
              <div className={styles.row}>
                <span className={styles.rowName}>PIO / MIO</span>
                <span className={styles.rowPct}>2,5%</span>
                <span className={styles.rowVal}>{fmt(result.erpPio)} KM</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>Zdravstveno osiguranje</span>
                <span className={styles.rowPct}>2%</span>
                <span className={styles.rowVal}>{fmt(result.erpZdravstvo)} KM</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>Osiguranje od nezaposlenosti</span>
                <span className={styles.rowPct}>0,5%</span>
                <span className={styles.rowVal}>{fmt(result.erpNezaposlenost)} KM</span>
              </div>
              <div className={`${styles.row} ${styles.rowSubtotal}`}>
                <span className={styles.rowName}>Ukupno</span>
                <span className={styles.rowPct}>5%</span>
                <span className={styles.rowVal}>{fmt(result.erpTotal)} KM</span>
              </div>
            </div>

            <div className={styles.group}>
              <div className={styles.groupTitle}>Dodatni doprinosi na platu</div>
              <div className={styles.row}>
                <span className={styles.rowName}>Opća vodna naknada</span>
                <span className={styles.rowPct}>0,5%</span>
                <span className={styles.rowVal}>{fmt(result.vodnaNaknada)} KM</span>
              </div>
              <div className={styles.row}>
                <span className={styles.rowName}>Naknada za zaštitu od prirodnih nesreća</span>
                <span className={styles.rowPct}>0,5%</span>
                <span className={styles.rowVal}>{fmt(result.naknadaNesrece)} KM</span>
              </div>
              <div className={`${styles.row} ${styles.rowSubtotal}`}>
                <span className={styles.rowName}>Ukupno</span>
                <span className={styles.rowPct}>1%</span>
                <span className={styles.rowVal}>{fmt(result.vodnaNaknada + result.naknadaNesrece)} KM</span>
              </div>
            </div>

            <div className={styles.totalBand}>
              <span className={styles.totalLabel}>Ukupni trošak poslodavca</span>
              <span className={styles.totalValue}>{fmt(result.totalCost)} KM</span>
            </div>

          </div>
        ) : (
          <p className={styles.placeholder}>Unesite iznos da vidite preračun.</p>
        )}
      </div>

      {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
      <section className={styles.eduSection}>
        <h2>
          Kako se računa <em>neto plata</em> iz bruto plate u FBiH?
        </h2>
        <p>
          U Federaciji BiH plata se obračunava po precizno propisanom redoslijedu.
          Iz <strong>bruto plate</strong> radnika prvo se odbijaju <strong>doprinosi
          iz plate</strong> (ukupno 31%): PIO/MIO 17%, zdravstveno 12,5% i
          osiguranje od nezaposlenosti 1,5%. Tako se dobija porezna osnovica.
        </p>
        <p>
          Od porezne osnovice se zatim oduzima <strong>lični odbitak</strong>{" "}
          (300 KM mjesečno × koeficijent uzdržavanih članova) i na razliku se
          obračunava <strong>porez na dohodak po stopi od 10%</strong>.
        </p>
        <p>
          <strong>Neto plata</strong> = Bruto − doprinosi iz plate − porez na
          dohodak. To je iznos koji radnik dobija "na ruke" / na bankovni račun.
        </p>
      </section>

      <section className={styles.eduSection}>
        <h2>
          Šta čini <em>ukupan trošak</em> poslodavca?
        </h2>
        <p>
          Pored bruto plate, poslodavac plaća i <strong>doprinose na bruto
          platu</strong> (10,5% ukupno):
        </p>
        <ul>
          <li><strong>PIO/MIO 6%</strong> — Federalni zavod PIO/MIO,</li>
          <li><strong>Zdravstveno 4%</strong> — kantonalni i federalni zavod,</li>
          <li><strong>Nezaposlenost 0,5%</strong> — Služba zapošljavanja.</li>
        </ul>
        <p>
          Dodatne obaveze poslodavca koje ne ulaze u doprinose ali su porez na
          platu:
        </p>
        <ul>
          <li><strong>Opća vodna naknada 0,5%</strong> — uplata u FBiH budžet,</li>
          <li><strong>Naknada za zaštitu od nesreća 0,5%</strong> — uplata u FBiH budžet,</li>
          <li>
            <strong>Fond za rehabilitaciju OSI 0,5%</strong> — samo za privredna
            društva. Obrti su izuzeti.
          </li>
        </ul>
        <p>
          <strong>Ukupan trošak</strong> = Bruto plata + svi doprinosi na platu +
          naknade. Za obrte i d.o.o. razlikuje se za 0,5% (fond OSI).
        </p>
      </section>

      <section className={styles.eduSection}>
        <h2>
          Lični <em>odbitak</em> i uzdržavani članovi
        </h2>
        <p>
          <strong>Lični odbitak</strong> umanjuje poreznu osnovicu prije
          obračuna poreza na dohodak. Osnovni iznos je <strong>300 KM mjesečno</strong>{" "}
          (3.600 KM godišnje). Pripada svakom radniku koji je rezident FBiH.
        </p>
        <p>
          Iznos se uvećava za uzdržavane članove porodice — supružnika, djecu,
          roditelje, drugu rodbinu koju radnik izdržava. Faktor uvećanja zavisi
          od broja i vrste uzdržavanih članova; obračunava se preko poreznog
          koeficijenta (npr. 1,3 za jedno dijete, 1,5 za supružnika + dijete,
          itd.).
        </p>
        <p>
          Da bi se odbitak iskoristio, radnik mora poslodavcu dostaviti{" "}
          <strong>Poreznu karticu (Obrazac PK-1)</strong> sa odobrenim
          koeficijentom.
        </p>
      </section>

      <section className={styles.eduSection}>
        <h2>
          Stope i <em>uplatni računi</em> — pregled
        </h2>
        <ul>
          <li>
            <strong>PIO/MIO 17% (iz) + 6% (na)</strong> — vrsta prihoda 712112,
            Federalni zavod PIO/MIO.
          </li>
          <li>
            <strong>Zdravstveno 12,5% (iz) + 4% (na)</strong> — vrsta prihoda 712111,
            split 89,8% kantonalni / 10,2% federalni.
          </li>
          <li>
            <strong>Nezaposlenost 1,5% (iz) + 0,5% (na)</strong> — vrsta prihoda 712113,
            split 70% kantonalni / 30% federalni.
          </li>
          <li>
            <strong>Porez na dohodak 10%</strong> — vrsta prihoda 716111, kantonalni
            budžet po prebivalištu radnika.
          </li>
          <li>
            <strong>Opća vodna naknada 0,5%</strong> — vrsta prihoda 722529.
          </li>
          <li>
            <strong>Naknada za nesreće 0,5%</strong> — vrsta prihoda 722581.
          </li>
        </ul>
      </section>

      <section className={styles.eduSection}>
        <h2>
          Povezani <em>alati</em>
        </h2>
        <ul>
          <li>
            <a href="/prijave-radnika?tab=obracun">Obračun plata</a> — mjesečni
            obračun za sve radnike sa generisanjem platnih listića i uplatnica.
          </li>
          <li>
            <a href="/prijave-radnika">JS3100 — prijava/odjava radnika</a> —
            registracija osiguranika u sistem PIO/MIO i zdravstvenog.
          </li>
          <li>
            <a href="/javni-prihodi">Uplatni računi javnih prihoda</a> — svi
            računi i šifre za uplatu doprinosa i poreza.
          </li>
          <li>
            <a href="/sifre-djelatnosti">Šifre djelatnosti (KD BiH 2010)</a> —
            za registraciju radnika prema vrsti djelatnosti.
          </li>
        </ul>
        <h2 style={{ marginTop: "2rem" }}>
          Pročitaj <em>na blogu</em>
        </h2>
        <ul>
          <li>
            <a href="/blog/kako-se-racuna-neto-plata-fbih">
              Kako se računa neto plata u FBiH
            </a>{" "}
            — korak po korak kroz doprinose, lični odbitak i porez.
          </li>
          <li>
            <a href="/blog/minimalna-plata-fbih-2026">
              Minimalna plata u FBiH 2026
            </a>{" "}
            — iznos, doprinosi i trošak poslodavca.
          </li>
        </ul>
      </section>

      <section className={styles.eduSection}>
        <h2>
          Često postavljana <em>pitanja</em>
        </h2>
        <p>
          <strong>Koja je razlika između bruto i neto plate?</strong>
        </p>
        <p>
          Bruto plata je iznos prije svih odbitaka — iz nje se odbijaju
          doprinosi radnika (PIO/MIO 17%, zdravstveno 12,5%, nezaposlenost
          1,5% — ukupno 31%) i porez na dohodak (10% nakon ličnog odbitka).
          Neto plata je iznos koji radnik prima na račun.
        </p>

        <p>
          <strong>Koliko košta radnik poslodavca u FBiH?</strong>
        </p>
        <p>
          Ukupan trošak poslodavca = bruto plata + doprinosi na bruto
          (PIO/MIO 6%, zdravstvo 4%, nezaposlenost 0,5%) + opća vodna
          naknada (0,5%) + zaštita od prirodnih nesreća (0,5%). Za privredna
          društva (d.o.o.) dodaje se i fond invalida (0,5%). Obrti su izuzeti
          od fonda invalida.
        </p>

        <p>
          <strong>Koliki je lični odbitak u FBiH za 2026?</strong>
        </p>
        <p>
          Osnovni lični odbitak je 300 KM mjesečno (3.600 KM godišnje), uz
          mogućnost uvećanja za izdržavane članove porodice. Lični odbitak se
          oduzima od bruto plate prije obračuna poreza na dohodak (10%).
        </p>

        <p>
          <strong>Da li se kalkulator može koristiti za obrtnike i d.o.o.?</strong>
        </p>
        <p>
          Da. Kalkulator pokazuje neto, bruto i ukupan trošak za radnika u
          oba slučaja. Razlika je samo u fondu invalida (samo d.o.o. plaća
          0,5%). Za vlasnike obrta postoji poseban modul "Obračun plata"
          koji koristi fiksne osnovice prema poreznom režimu.
        </p>

        <p>
          <strong>Šta uključuju doprinosi iz plate (na teret radnika)?</strong>
        </p>
        <p>
          Doprinosi iz plate (31% bruto) finansiraju: PIO/MIO fond (penziono
          osiguranje, 17%), Federalni zavod zdravstvenog osiguranja (12,5%) i
          Federalni zavod za zapošljavanje (1,5%). Poslodavac ih obračunava,
          odbija od bruto plate i uplaćuje u korist budžeta.
        </p>
      </section>
    </div>
  );
}
