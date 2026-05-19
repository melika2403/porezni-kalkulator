import Link from "next/link";
import styles from "./JavniPrihodiTeaser.module.css";

const SAMPLE = [
  { code: "712112", label: "Doprinos PIO/MIO" },
  { code: "712111", label: "Doprinos zdravstvo" },
  { code: "712113", label: "Doprinos nezaposlenost" },
  { code: "716111", label: "Porez na dohodak" },
  { code: "722529", label: "Vodna naknada" },
  { code: "722581", label: "Naknada za nesreće" },
];

export default function JavniPrihodiTeaser() {
  return (
    <section className={styles.section} aria-labelledby="javni-prihodi-teaser-title">
      <div className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.preview}>
            <div className={styles.previewLabel}>Najtraženije šifre</div>
            <ul className={styles.chipList}>
              {SAMPLE.map((s) => (
                <li key={s.code}>
                  <Link href={`/javni-prihodi#prihod-${s.code}`} className={styles.chipLink}>
                    <span className={styles.chipCode}>{s.code}</span>
                    <span className={styles.chipName}>{s.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/javni-prihodi" className={styles.previewLink}>
              + svi računi i šifre →
            </Link>
          </div>
          <div className={styles.text}>
            <div className={styles.label}>Bonus — referenca</div>
            <h2 id="javni-prihodi-teaser-title" className={styles.h2}>
              Uplatni računi javnih prihoda FBiH
            </h2>
            <p className={styles.lead}>
              Trebate broj računa, šifru vrste prihoda ili budžetsku organizaciju za platni
              nalog? Pripremili smo kompletnu listu po prečišćenom tekstu{" "}
              <strong>Pravilnika Porezne uprave FBiH</strong> — federalni i kantonalni računi,
              <strong> 315 šifri vrsta prihoda</strong> i šifre budžetskih organizacija.
            </p>
            <p className={styles.lead}>
              Pretražite po šifri ili nazivu, kopirajte direktno u nalog — bez listanja PDF-a.
            </p>
            <Link href="/javni-prihodi" className={styles.cta}>
              Otvori listu →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
