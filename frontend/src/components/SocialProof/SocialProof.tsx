"use client";

// Social proof traka: stvarna brojka generisanih dokumenata (javni endpoint,
// backend zaokružuje) + trust poruke. Brojka se prikazuje tek od 100 naviše;
// ako backend nije dostupan, ostaju samo trust poruke.
import { useQuery } from "@tanstack/react-query";
import styles from "./SocialProof.module.css";
import { getPublicStats } from "src/api/publicStats";

const nf = new Intl.NumberFormat("bs-BA");

export default function SocialProof() {
  const { data } = useQuery({
    queryKey: ["public-stats"],
    queryFn: getPublicStats,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const documents = data?.documents ?? 0;
  const showCount = documents >= 100;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {showCount && (
          <div className={styles.item}>
            <span className={styles.big}>{nf.format(documents)}+</span>
            <span className={styles.itemTitle}>generisanih dokumenata</span>
            <span className={styles.itemDesc}>
              Obrasci, platni listići, uplatnice, fakture i ugovori koje su
              korisnici napravili na platformi.
            </span>
          </div>
        )}
        <div className={styles.item}>
          <span className={styles.itemIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <span className={styles.itemTitle}>Po propisima FBiH</span>
          <span className={styles.itemDesc}>
            Obračuni i obrasci prate važeće stope doprinosa i poreza, ažuriramo
            ih sa svakom izmjenom propisa.
          </span>
        </div>
        <div className={styles.item}>
          <span className={styles.itemIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="2" y="6" width="20" height="13" rx="2" />
              <path d="M2 10h20" />
              <path d="M6 15h4" />
            </svg>
          </span>
          <span className={styles.itemTitle}>Bez kartice</span>
          <span className={styles.itemDesc}>
            Probni period od 30 dana ne traži karticu, a pretplata se plaća po
            predračunu.
          </span>
        </div>
      </div>
    </section>
  );
}
