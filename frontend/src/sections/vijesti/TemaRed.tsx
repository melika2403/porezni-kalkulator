// Jedan red u listi rasprava: bedž vrste, naslov, autor i aktivnost, a desno
// broj odgovora, da se na prvi pogled vidi gdje ima života.
import Link from "next/link";
import type { Tema } from "src/api/rasprave";
import { nazivRubrike } from "src/data/vijesti";
import { relativnoVrijeme } from "src/lib/vijestiServer";
import { Kvacica } from "./Potpis";
import styles from "./vijesti.module.css";

/** "26.07.2026." iz ISO zapisa, format datuma koji važi svugdje na sajtu. */
function datumKratko(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

export function TemaRed({ t }: { t: Tema }) {
  return (
    <Link href={`/rasprave/${t.slug}`} className={styles.temaKartica}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.meta} style={{ marginBottom: "0.35rem" }}>
          {t.prikvacena && <span className={styles.temaBedzZakljucana}>📌</span>}
          <span
            className={`${styles.temaBedz} ${
              t.vrsta === "PITANJE" ? styles.temaBedzPitanje : styles.temaBedzRasprava
            }`}
          >
            {t.vrsta === "PITANJE" ? "Pitanje" : "Rasprava"}
          </span>
          {t.rijesena && (
            <span className={`${styles.temaBedz} ${styles.temaBedzRijeseno}`}>
              ✓ Riješeno
            </span>
          )}
          {t.zakljucana && (
            <span className={`${styles.temaBedz} ${styles.temaBedzZakljucana}`}>
              Zaključana
            </span>
          )}
          {t.rubrika && (
            <span className={styles.metaRubrika}>{nazivRubrike(t.rubrika)}</span>
          )}
        </div>
        <h2 className={styles.temaNaslov}>{t.naslov}</h2>
        <div className={styles.meta}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            {t.autor.potpis}
            {t.autor.sluzbeni && <Kvacica velicina={12} />}
          </span>
          {/* na uskom ekranu ostaju autor i aktivnost, ostalo se sakriva */}
          <span className={styles.sakrijUsko}>
            · objavljena {datumKratko(t.createdAt)}
          </span>
          <span>· aktivno {relativnoVrijeme(t.zadnjaAktivnost)}</span>
          <span className={styles.sakrijUsko}>· {t.brojPregleda} pregleda</span>
        </div>
      </div>
      <span className={styles.temaOdgovori}>
        <span className={styles.temaOdgovoriBroj}>{t.brojOdgovora}</span>
        <span className={styles.temaOdgovoriOznaka}>
          {t.brojOdgovora === 1 ? "odgovor" : "odgovora"}
        </span>
      </span>
    </Link>
  );
}
