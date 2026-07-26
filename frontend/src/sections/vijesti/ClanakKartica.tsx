// Kartice članka u tri veličine. Veličina je posljedica pozicije na naslovnoj,
// nije zasebna postavka u editoru.
import Link from "next/link";
import type { Clanak } from "src/api/vijesti";
import { nazivRubrike, putanjaClanka } from "src/data/vijesti";
import { relativnoVrijeme, slikaUrl } from "src/lib/vijestiServer";
import styles from "./vijesti.module.css";

function Meta({ c }: { c: Clanak }) {
  return (
    <div className={styles.meta}>
      <span className={styles.metaRubrika}>{nazivRubrike(c.rubrika)}</span>
      <span>·</span>
      <span>{relativnoVrijeme(c.datumObjave)}</span>
      {c.tip === "VODIC" && <span className={styles.oznakaVodic}>Vodič</span>}
      {/* brojke se pokazuju tek kad postoje, da kartica ne bude puna nula */}
      {c.brojKomentara > 0 && (
        <span className={styles.metaBrojka} title="komentara">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {c.brojKomentara}
        </span>
      )}
      {c.brojDijeljenja > 0 && (
        <span className={styles.metaBrojka} title="dijeljenja">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          {c.brojDijeljenja}
        </span>
      )}
    </div>
  );
}

export function VodecaKartica({ c }: { c: Clanak }) {
  const slika = slikaUrl(c.naslovnaSlika);
  return (
    <Link href={putanjaClanka(c.tip, c.slug)} className={styles.vodeca}>
      {slika ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className={styles.vodecaSlika} src={slika} alt={c.naslovnaAlt || ""} />
      ) : (
        <div
          className={`${styles.vodecaSlika} ${styles.bezSlike} ${styles.bezSlikeVelika}`}
        >
          {nazivRubrike(c.rubrika)}
        </div>
      )}
      <h2 className={styles.vodecaNaslov}>{c.naslov}</h2>
      <Meta c={c} />
      {c.sazetak && <p className={styles.vodecaSazetak}>{c.sazetak}</p>}
    </Link>
  );
}

/** Kartica sa velikom slikom na vrhu: izdvojene vijesti i blokovi rubrika. */
export function KarticaSaSlikom({ c }: { c: Clanak }) {
  const slika = slikaUrl(c.naslovnaSlika);
  return (
    <Link href={putanjaClanka(c.tip, c.slug)} className={styles.karticaSlikom}>
      {slika ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          className={styles.karticaSlikomSlika}
          src={slika}
          alt={c.naslovnaAlt || ""}
        />
      ) : (
        <div
          className={`${styles.karticaSlikomSlika} ${styles.bezSlike} ${styles.bezSlikeMala}`}
        >
          {nazivRubrike(c.rubrika)}
        </div>
      )}
      <div className={styles.karticaSlikomTijelo}>
        <h3 className={styles.karticaSlikomNaslov}>{c.naslov}</h3>
        <Meta c={c} />
      </div>
    </Link>
  );
}

export function MalaKartica({ c, uRijeci = false }: { c: Clanak; uRijeci?: boolean }) {
  const slika = slikaUrl(c.naslovnaSlika);
  return (
    <Link
      href={putanjaClanka(c.tip, c.slug)}
      className={uRijeci ? styles.rijekaItem : styles.kartica}
    >
      {slika ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className={styles.karticaSlika} src={slika} alt={c.naslovnaAlt || ""} />
      ) : (
        <div className={`${styles.karticaSlika} ${styles.bezSlike}`} />
      )}
      <div>
        <h3 className={styles.karticaNaslov}>{c.naslov}</h3>
        <Meta c={c} />
      </div>
    </Link>
  );
}

/** Kraći zapis bez slike: dva takva stoje u petom stupcu bloka rubrike. */
export function BocniZapis({ c }: { c: Clanak }) {
  return (
    <Link href={putanjaClanka(c.tip, c.slug)} className={styles.blokBocniItem}>
      <span className={styles.metaRubrika} style={{ fontSize: 11 }}>
        {nazivRubrike(c.rubrika)}
      </span>
      <h3 className={styles.blokBocniNaslov}>{c.naslov}</h3>
      <Meta c={c} />
    </Link>
  );
}

export function VodicKartica({ c }: { c: Clanak }) {
  const slika = slikaUrl(c.naslovnaSlika);
  return (
    <Link href={putanjaClanka(c.tip, c.slug)} className={styles.vodicKartica}>
      {slika && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          className={styles.vodicSlika}
          src={slika}
          alt={c.naslovnaAlt || ""}
        />
      )}
      <h3 className={styles.vodicNaslov}>{c.naslov}</h3>
      {c.sazetak && <p className={styles.vodicSazetak}>{c.sazetak}</p>}
      <div className={styles.meta}>
        <span>{c.vrijemeCitanja} čitanja</span>
        {c.datumAzuriranja && (
          <>
            <span>·</span>
            <span>ažurirano {relativnoVrijeme(c.datumAzuriranja)}</span>
          </>
        )}
      </div>
    </Link>
  );
}
