// Zaglavlje sekcije u dva reda: naziv sekcije, pa traka rubrika sa pretragom.
// Glavni navbar sajta ostaje iznad ovoga, ovo je drugi nivo navigacije.
import Link from "next/link";
import { RUBRIKE } from "src/data/vijesti";
import Pretraga from "./Pretraga";
import ProfilDugme from "./ProfilDugme";
import styles from "./vijesti.module.css";

export default function VijestiHeader({
  aktivnaRubrika,
  sekcija = "Vijesti",
  bezAktivne = false,
}: {
  aktivnaRubrika?: string;
  sekcija?: "Vijesti" | "Vodiči" | "Rasprave";
  /** Stranica nije nijedna rubrika (npr. profil), pa ništa nije označeno. */
  bezAktivne?: boolean;
}) {
  const osnova =
    sekcija === "Vodiči" ? "/vodici" : sekcija === "Rasprave" ? "/rasprave" : "/vijesti";
  return (
    <div className={styles.sectionHead}>
      <div className={styles.sectionHeadRed}>
        <Link href={osnova} className={styles.brand}>
          <span className={styles.brandName}>Porezni Kalkulator</span>
          <span className={styles.brandSep}>|</span>
          <span className={styles.brandSection}>{sekcija}</span>
        </Link>
        <Pretraga />
      </div>

      <nav className={styles.rubrike}>
        {/* na mobilnom rubrike klize horizontalno u jednom redu, a Rasprave i
            profil ostaju vidljivi uz desni rub van klizne trake */}
        <div className={styles.rubrikeScroll}>
          <Link
            href="/vijesti"
            className={`${styles.rubrikaLink} ${
              !bezAktivne && sekcija === "Vijesti" && !aktivnaRubrika
                ? styles.rubrikaAktivna
                : ""
            }`}
          >
            Najnovije
          </Link>
          {RUBRIKE.filter((r) => r.id !== "vodici").map((r) => (
            <Link
              key={r.id}
              href={`/vijesti/rubrika/${r.id}`}
              className={`${styles.rubrikaLink} ${
                !bezAktivne && aktivnaRubrika === r.id ? styles.rubrikaAktivna : ""
              }`}
            >
              {r.naziv}
            </Link>
          ))}
          <Link
            href="/vodici"
            className={`${styles.rubrikaLink} ${
              !bezAktivne && sekcija === "Vodiči" ? styles.rubrikaAktivna : ""
            }`}
          >
            Vodiči
          </Link>
        </div>
        {/* odvojeno uz desni rub: prostor korisnika, ne rubrika tekstova */}
        <Link
          href="/rasprave"
          className={`${styles.raspravePill} ${
            sekcija === "Rasprave" ? styles.raspravePillAktivna : ""
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Rasprave
        </Link>
        <ProfilDugme />
      </nav>
    </div>
  );
}
