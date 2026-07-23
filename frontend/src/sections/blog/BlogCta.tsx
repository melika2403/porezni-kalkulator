import Link from "next/link";
import styles from "./blog.module.css";

/** Reklamni blok na kraju članka: vodi na naš alat opisan u tekstu. */
export function BlogCta({
  title,
  text,
  href,
  button,
}: {
  title: string;
  text: string;
  href: string;
  button: string;
}) {
  return (
    <div className={styles.ctaBox}>
      <div className={styles.ctaLabel}>Naš alat</div>
      <div className={styles.ctaTitle}>{title}</div>
      <p className={styles.ctaText}>{text}</p>
      <Link href={href} className={styles.ctaBtn}>
        {button}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

/** Veliki PK Office banner (PK Office paleta) za članke o vođenju obrta. */
export function PkOfficeCta({
  text = "PK Office je kompletan program za vođenje obrta: učitate bankovni izvod, a KPR, fakture, plate, blagajna i godišnji obrasci se popunjavaju sami. Sve iz ovog članka na jednom mjestu, bez tabela i ručnog prekucavanja.",
}: {
  text?: string;
}) {
  return (
    <div className={styles.pkCta}>
      <span className={styles.pkCtaBadge}>
        <span className={styles.pkCtaDot} />
        PK Office
      </span>
      <div className={styles.pkCtaTitle}>
        Vodite obrt bez prekucavanja i propuštenih rokova
      </div>
      <p className={styles.pkCtaText}>{text}</p>
      <p className={styles.pkCtaFeatures}>
        Bankovni izvodi · KPR · Fakture · Plate i doprinosi · Blagajna ·
        PDV evidencije · SPR i GPD
      </p>
      <Link href="/pk-office" className={styles.pkCtaBtn}>
        Isprobajte besplatno 30 dana
        <span aria-hidden="true">→</span>
      </Link>
      <span className={styles.pkCtaHint}>
        Bez kartice, otkažete kad želite.
      </span>
    </div>
  );
}
