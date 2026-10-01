"use client";
import { useState, useRef } from "react";
import styles from "./pdv.module.css";
import { ReklamaBanerIspod, ReklamaInline, ReklamaStub } from "src/components/PartnerSlot/Slot";

const PDV_RATE   = 0.17;
const BAM_TO_EUR = 1.95583; // fixed peg

type Mode     = "toBrutto" | "toNetto";
type Currency = "KM" | "EUR";

const fmt = (n: number) => {
  const [intPart, decPart] = n.toFixed(2).split(".");
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + decPart;
};

const parse = (v: string) => {
  const normalized = v.replace(/\.(?=\d{3})/g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return isNaN(n) || n < 0 ? 0 : n;
};

export default function PdvKalkulator() {
  const [mode, setMode]     = useState<Mode>("toBrutto");
  const [currency, setCurrency] = useState<Currency>("KM");
  const [input, setInput]    = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? 0;
    const charsBeforeCursor = raw.slice(0, cursorPos).replace(/\./g, "").length;

    const cleaned   = raw.replace(/[^\d,]/g, "");
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

  const switchCurrency = (next: Currency) => {
    if (next === currency) return;
    const n = parse(input);
    if (n > 0) {
      const converted = next === "EUR" ? n / BAM_TO_EUR : n * BAM_TO_EUR;
      setInput(fmt(converted));
    }
    setCurrency(next);
  };

  const value    = parse(input);
  const netto    = mode === "toBrutto" ? value : value / (1 + PDV_RATE);
  const pdv      = netto * PDV_RATE;
  const brutto   = netto + pdv;
  const hasValue = value > 0;

  const sym      = currency;
  const factor   = currency === "KM" ? 1 / BAM_TO_EUR : BAM_TO_EUR;
  const altSym   = currency === "KM" ? "EUR" : "KM";
  const nettoAlt  = netto  * factor;
  const pdvAlt    = pdv    * factor;
  const bruttoAlt = brutto * factor;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>PDV Kalkulator</div>
        <h1 className={styles.h1}>
          PDV kalkulator BiH, preračun PDV-a <em>u oba smjera</em>
        </h1>
        <p className={styles.subtitle}>
          Online PDV kalkulator za Bosnu i Hercegovinu, stopa PDV-a iznosi{" "}
          <strong>17%</strong>. Izračunajte iznos PDV-a iz neto ili bruto cijene
          i dobijete rezultat odmah, besplatno i bez registracije.
        </p>
      </div>

      <div className={styles.toggleWrap}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${mode === "toBrutto" ? styles.toggleActive : ""}`}
          onClick={() => setMode("toBrutto")}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="10" cy="10" r="8" />
            <path d="M10 6v4l3 2" />
          </svg>
          Dodaj PDV
          <span className={styles.toggleHint}>Cijena bez PDV-a → s PDV-om</span>
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${mode === "toNetto" ? styles.toggleActive : ""}`}
          onClick={() => setMode("toNetto")}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 10h12M10 4l6 6-6 6" />
          </svg>
          Izvuci PDV
          <span className={styles.toggleHint}>Cijena s PDV-om → bez PDV-a</span>
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.inputSection}>
          <div className={styles.inputLabelRow}>
            <label className={styles.inputLabel}>
              {mode === "toBrutto" ? `Cijena bez PDV-a` : `Cijena s PDV-om`}
            </label>
            <div className={styles.currencyToggle}>
              <button
                type="button"
                className={`${styles.currBtn} ${currency === "KM" ? styles.currActive : ""}`}
                onClick={() => switchCurrency("KM")}
              >KM</button>
              <button
                type="button"
                className={`${styles.currBtn} ${currency === "EUR" ? styles.currActive : ""}`}
                onClick={() => switchCurrency("EUR")}
              >EUR</button>
            </div>
          </div>
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
            <span className={styles.inputSuffix}>{sym}</span>
          </div>
        </div>

        <div className={`${styles.results} ${hasValue ? styles.resultsVisible : ""}`}>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>Cijena bez PDV-a</span>
            <div className={styles.resultValueGroup}>
              <span className={styles.resultValue}>{fmt(netto)} {sym}</span>
              {currency === "EUR" && <span className={styles.resultAlt}>≈ {fmt(nettoAlt)} {altSym}</span>}
            </div>
          </div>
          <div className={`${styles.resultRow} ${styles.resultRowPdv}`}>
            <span className={styles.resultLabel}>
              PDV
              <span className={styles.rateTag}>17%</span>
            </span>
            <div className={styles.resultValueGroup}>
              <span className={`${styles.resultValue} ${styles.pdvValue}`}>+ {fmt(pdv)} {sym}</span>
              {currency === "EUR" && <span className={styles.resultAlt}>≈ {fmt(pdvAlt)} {altSym}</span>}
            </div>
          </div>
          <div className={`${styles.resultRow} ${styles.resultRowTotal}`}>
            <span className={styles.resultLabel}>Cijena s PDV-om</span>
            <div className={styles.resultValueGroup}>
              <span className={`${styles.resultValue} ${styles.totalValue}`}>{fmt(brutto)} {sym}</span>
              {currency === "EUR" && <span className={styles.resultAlt}>≈ {fmt(bruttoAlt)} {altSym}</span>}
            </div>
          </div>
        </div>

        {!hasValue && (
          <p className={styles.placeholder}>
            Unesite iznos da vidite preračun.
          </p>
        )}
      </div>

      {/* kartica banke partnera odmah ispod rezultata (i na mobitelu) */}
      <ReklamaInline stranica="pdv" className={styles.partnerInline} />

      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoTitle}>Formula: bez PDV-a → s PDV-om</div>
          <div className={styles.infoFormula}>Cijena s PDV-om = Cijena × 1,17</div>
          <div className={styles.infoDesc}>
            Npr. 100,00 KM × 1,17 = <strong>117,00 KM</strong>
          </div>
        </div>
        <div className={styles.infoCard}>
          <div className={styles.infoTitle}>Formula: s PDV-om → bez PDV-a</div>
          <div className={styles.infoFormula}>Cijena bez PDV-a = Cijena ÷ 1,17</div>
          <div className={styles.infoDesc}>
            Npr. 117,00 KM ÷ 1,17 = <strong>100,00 KM</strong>
          </div>
        </div>
        <div className={styles.infoCard}>
          <div className={styles.infoTitle}>Kurs KM / EUR</div>
          <div className={styles.infoFormula}>1 EUR = 1,95583 KM</div>
          <div className={styles.infoDesc}>
            Fiksni kurs, Bosna i Hercegovina koristi currency board vezan za euro od 1997. godine.
          </div>
        </div>
      </div>

      {/* široki baner ispod alata; bočni stubovi izvan okvira od 760px (od 1440px) */}
      <ReklamaBanerIspod stranica="pdv" />
      <ReklamaStub stranica="pdv" strana="lijevo" raspored="fiksno" okvir={760} />
      <ReklamaStub stranica="pdv" strana="desno" raspored="fiksno" okvir={760} />

      {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
      <section className={styles.eduSection}>
        <h2>
          Šta je PDV u <em>Bosni i Hercegovini</em>?
        </h2>
        <p>
          <strong>Porez na dodanu vrijednost (PDV)</strong> je opći potrošački
          porez koji se obračunava na isporuke dobara i usluga u svim fazama
          prometa. U Bosni i Hercegovini se primjenjuje{" "}
          <strong>jedinstvena stopa PDV-a od 17%</strong> i administrira ga{" "}
          <strong>Uprava za indirektno oporezivanje (UINO)</strong> na nivou
          države, što znači da je ista stopa na cijeloj teritoriji, i u FBiH,
          i u Republici Srpskoj, i u Brčko Distriktu.
        </p>
        <p>
          PDV plaća krajnji potrošač kroz cijenu, ali ga obračunava i uplaćuje
          PDV obveznik (preduzeće ili obrtnik) registrovan u UINO. Razlika
          između izlaznog PDV-a (na prodaji) i ulaznog PDV-a (na nabavkama)
          predstavlja obavezu za uplatu, ili pravo na povrat ako je ulazni PDV
          veći.
        </p>
      </section>

      <section className={styles.eduSection}>
        <h2>
          Kako se <em>obračunava</em> PDV, formule
        </h2>
        <p>
          Postoje dva smjera preračuna PDV-a, ovisno o tome da li krećete od
          cijene bez PDV-a (neto) ili sa PDV-om (bruto / maloprodajna cijena):
        </p>
        <ul>
          <li>
            <strong>Bez PDV-a → s PDV-om</strong>: pomnožite cijenu sa{" "}
            <strong>1,17</strong>. Primjer: 100,00 KM × 1,17 ={" "}
            <strong>117,00 KM</strong>.
          </li>
          <li>
            <strong>S PDV-om → bez PDV-a</strong>: podijelite cijenu sa{" "}
            <strong>1,17</strong>. Primjer: 117,00 KM ÷ 1,17 ={" "}
            <strong>100,00 KM</strong>.
          </li>
          <li>
            <strong>Iznos PDV-a iz neto cijene</strong>: pomnožite sa{" "}
            <strong>0,17</strong>. Primjer: 100,00 × 0,17 = 17,00 KM.
          </li>
          <li>
            <strong>Iznos PDV-a iz bruto cijene</strong>: pomnožite sa{" "}
            <strong>17/117</strong> (≈ 0,1453). Primjer: 117,00 × 0,1453 ≈ 17,00 KM.
          </li>
        </ul>
      </section>

      <section className={styles.eduSection}>
        <h2>
          Ko mora biti <em>PDV obveznik</em>?
        </h2>
        <p>
          Obavezna registracija u sistem PDV-a u BiH nastupa kada godišnji
          oporezivi promet pređe <strong>100.000,00 KM</strong>. Ispod tog
          praga registracija je dobrovoljna, obrtnici i mala preduzeća mogu
          izabrati da se ne registruju, što znači da ne obračunavaju PDV na
          svojim računima ali ni ne mogu odbijati ulazni PDV.
        </p>
        <p>Registracija je obavezna i u određenim specifičnim slučajevima:</p>
        <ul>
          <li>uvoznici dobara (bez obzira na promet),</li>
          <li>isporučioci određenih usluga primaocima u BiH koji su PDV obveznici,</li>
          <li>pružanje elektronskih usluga krajnjim potrošačima u BiH.</li>
        </ul>
      </section>

      <section className={styles.eduSection}>
        <h2>
          Rokovi i <em>predaja PDV prijave</em>
        </h2>
        <p>
          PDV prijava se predaje UINO-u <strong>do 10. u mjesecu</strong> za
          prethodni mjesec. Istovremeno se vrši i uplata obračunate obaveze na
          račune UINO-a.
        </p>
        <p>
          PDV obveznici takođe vode <strong>e-KUF</strong> (knjigu ulaznih
          faktura) i <strong>e-KIF</strong> (knjigu izlaznih faktura), koje se
          dostavljaju UINO-u <strong>do 20. u mjesecu</strong> za prethodni mjesec.
        </p>
      </section>

      <section className={styles.eduSection}>
        <h2>
          Povezani <em>alati</em>
        </h2>
        <ul>
          <li>
            <a href="/fakture">Fakture i računi</a>, generišite račune sa
            ispravnim PDV obračunom.
          </li>
          <li>
            <a href="/spr">SPR-1053, specifikacija dohotka</a>, za obrtnike
            koji su PDV obveznici.
          </li>
          <li>
            <a href="/javni-prihodi">Uplatni računi javnih prihoda</a>, UINO
            računi za uplatu PDV-a.
          </li>
        </ul>
        <h2 style={{ marginTop: "2rem" }}>
          Pročitaj <em>na blogu</em>
        </h2>
        <ul>
          <li>
            <a href="/vodici/pdv-obveznik-prag-100000-km">
              PDV obveznik, prag 100.000 KM
            </a>,{" "}
            kada postajete obvezni za PDV i šta to znači.
          </li>
        </ul>
      </section>

      <section className={styles.eduSection}>
        <h2>
          Često postavljana <em>pitanja</em>
        </h2>
        <p>
          <strong>Kolika je stopa PDV-a u BiH?</strong>
        </p>
        <p>
          U Bosni i Hercegovini postoji jedinstvena stopa PDV-a od 17%
          (jedna od najnižih u Evropi). Primjenjuje se na isporuke roba i
          usluga u zemlji, uvoz i neke usluge ka inostranstvu. Izvoz je
          oslobođen sa pravom odbitka (0% stopa).
        </p>

        <p>
          <strong>Kako izbiti PDV iz cijene sa PDV-om?</strong>
        </p>
        <p>
          Iz maloprodajne cijene (sa PDV-om) PDV se računa po formuli:
          PDV = cijena × (17 / 117). Cijena bez PDV-a = cijena × (100 / 117).
          Npr. iz 117 KM dobijete 17 KM PDV-a i 100 KM osnovice.
        </p>

        <p>
          <strong>Kako dodati PDV na cijenu bez PDV-a?</strong>
        </p>
        <p>
          Na osnovicu (cijenu bez PDV-a) jednostavno pomnožite sa 1,17.
          Npr. 100 KM × 1,17 = 117 KM maloprodajna cijena. PDV iznos =
          100 × 0,17 = 17 KM.
        </p>

        <p>
          <strong>Kada postajem PDV obveznik u BiH?</strong>
        </p>
        <p>
          Obveznik PDV-a postajete kada vam godišnji promet pređe 50.000 KM
          (oporezivih isporuka). Tada se morate registrovati kod UINO i
          dobiti PDV broj. Ispod ovog praga registracija je dobrovoljna.
        </p>

        <p>
          <strong>Da li svi obrti moraju biti PDV obveznici?</strong>
        </p>
        <p>
          Ne. Obrti koji imaju godišnji promet ispod 50.000 KM nisu obvezni
          biti PDV obveznici. Mnogi se ipak registruju dobrovoljno jer to
          omogućava odbitak ulaznog PDV-a (na nabavku robe, opreme, usluga).
        </p>

        <p>
          <strong>Kada se podnosi PDV prijava?</strong>
        </p>
        <p>
          PDV prijava se podnosi UINO mjesečno (ili tromjesečno za male
          obveznike), do <strong>10. u mjesecu</strong> za prethodni mjesec.
          Plaća se iznos razlike između izlaznog i ulaznog PDV-a. Ako je
          ulazni veći od izlaznog, ostaje pretplaćeni iznos za prebijanje.
        </p>

        <p>
          <strong>Koje su kazne za neispravan obračun PDV-a?</strong>
        </p>
        <p>
          UINO može izreći novčanu kaznu za prekršaj u izradi i podnošenju
          PDV prijave, neuplatu PDV-a u roku, ili izdavanje fakture bez
          obaveznih elemenata. Kazne idu od nekoliko stotina do nekoliko
          hiljada KM, plus kamatu na neuplaćeni iznos.
        </p>
      </section>
    </div>
  );
}
