import Link from "next/link";
import styles from "./SifreTeaser.module.css";

const SAMPLE_AREAS = [
  { code: "C", name: "Prerađivačka industrija" },
  { code: "F", name: "Građevinarstvo" },
  { code: "G", name: "Trgovina; popravak vozila" },
  { code: "I", name: "Hotelijerstvo i ugostiteljstvo" },
  { code: "J", name: "Informacije i komunikacije" },
  { code: "M", name: "Stručne i tehničke djelatnosti" },
];

export default function SifreTeaser() {
  return (
    <section className={styles.section} aria-labelledby="sifre-teaser-title">
      <div className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.text}>
            <div className={styles.label}>Bonus — referenca</div>
            <h2 id="sifre-teaser-title" className={styles.h2}>
              Šifre djelatnosti FBiH
            </h2>
            <p className={styles.lead}>
              Otvarate obrt ili registrujete novu djelatnost? Pripremili smo kompletnu listu šifri
              djelatnosti za <strong>Federaciju BiH</strong> prema <strong>KD BiH 2010</strong>{" "}
              (NACE Rev. 2) — sa <strong>detaljnim opisima</strong> šta svaki razred uključuje, a
              šta izuzima.
            </p>
            <p className={styles.lead}>
              Pretražite po nazivu ili šifri, otkrijte primjere djelatnosti i odmah pređite na
              alate koje ćete koristiti svakodnevno (šihterica, JS3100, ugovori).
            </p>
            <Link href="/sifre-djelatnosti" className={styles.cta}>
              Otvori listu šifri →
            </Link>
          </div>
          <div className={styles.preview}>
            <div className={styles.previewLabel}>21 područje • 88 oblasti • 615 razreda</div>
            <ul className={styles.areaList}>
              {SAMPLE_AREAS.map((a) => (
                <li key={a.code}>
                  <Link
                    href={`/sifre-djelatnosti#podrucje-${a.code}`}
                    className={styles.areaLink}
                  >
                    <span className={styles.areaCode}>{a.code}</span>
                    <span className={styles.areaName}>{a.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/sifre-djelatnosti" className={styles.previewLink}>
              + sva područja od A do U
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
