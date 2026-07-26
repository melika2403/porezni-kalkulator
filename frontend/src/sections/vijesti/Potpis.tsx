// Potpis autora u sekciji Vijesti: naš znak umjesto prazne siluete i plava
// kvačica kad je objava (ili komentar) od redakcije, da se službeni sadržaj
// razlikuje od korisničkog.
import { getBackendUrl } from "src/utils/backendUrl";
import styles from "./vijesti.module.css";

/** Naš znak iz navbara, u krugu. */
export function ZnakPK({ velicina = 40 }: { velicina?: number }) {
  return (
    <span
      className={styles.znakPk}
      style={{ width: velicina, height: velicina }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        width={velicina * 0.5}
        height={velicina * 0.5}
      >
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <path d="M13 17h8M17 13v8" />
      </svg>
    </span>
  );
}

/** Plava kvačica: potvrda da je autor iz redakcije. */
export function Kvacica({ velicina = 15 }: { velicina?: number }) {
  return (
    <span
      className={styles.kvacica}
      style={{ width: velicina, height: velicina }}
      title="Zvanični nalog, Porezni Kalkulator"
      aria-label="Zvanični nalog"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4">
        <path d="M5 13l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/**
 * Avatar uz potpis: slika ako je korisnik postavio, inače naš znak za
 * redakciju, odnosno inicijal za obične korisnike.
 */
export function Avatar({
  slika,
  sluzbeni,
  ime,
  velicina = 34,
}: {
  slika?: string | null;
  sluzbeni?: boolean;
  ime: string;
  velicina?: number;
}) {
  if (slika) {
    const src = slika.startsWith("http")
      ? slika
      : `${getBackendUrl()}${slika}`;
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        className={styles.avatarSlika}
        style={{ width: velicina, height: velicina }}
        src={src}
        alt=""
      />
    );
  }
  if (sluzbeni) return <ZnakPK velicina={velicina} />;
  return <AvatarSlovo ime={ime} velicina={velicina} />;
}

/** Avatar korisnika koji nije iz redakcije: inicijal u krugu. */
export function AvatarSlovo({
  ime,
  velicina = 34,
}: {
  ime: string;
  velicina?: number;
}) {
  const slovo = (ime || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className={styles.avatarSlovo}
      style={{ width: velicina, height: velicina, fontSize: velicina * 0.42 }}
      aria-hidden="true"
    >
      {slovo}
    </span>
  );
}
