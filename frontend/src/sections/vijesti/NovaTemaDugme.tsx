"use client";

/* Dugme za otvaranje nove teme. Prijavljenog vodi na formu, a neprijavljenom
   otvara naš popup sa prijavom i registracijom umjesto da ga pusti na formu
   koju ionako ne može poslati. */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import styles from "./vijesti.module.css";

export default function NovaTemaDugme({
  className,
}: {
  className?: string;
}) {
  const router = useRouter();
  const [popup, setPopup] = useState(false);

  const { data: korisnik, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  function klik() {
    if (isLoading) return;
    if (korisnik) {
      router.push("/rasprave/nova");
      return;
    }
    setPopup(true);
  }

  return (
    <>
      <button
        type="button"
        className={className ?? styles.sideCtaBtn}
        onClick={klik}
      >
        Otvori novu temu &rarr;
      </button>

      {popup && (
        <div
          className={styles.potpisModal}
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPopup(false);
          }}
        >
          <div className={styles.potpisKutija}>
            <h2 className={styles.potpisNaslov}>Prijavite se za novu temu</h2>
            <p className={styles.potpisTekst}>
              Teme i odgovore u Raspravama objavljuju prijavljeni korisnici, pa
              iza svakog pitanja stoji stvaran nalog. Nalog je besplatan i
              traje minut.
            </p>
            <div className={styles.komFormaRed}>
              <button
                type="button"
                className={styles.komAkcija}
                onClick={() => setPopup(false)}
              >
                Odustani
              </button>
              <span className={styles.komPrijavaDugmad}>
                <Link
                  href={`/prijava?next=${encodeURIComponent("/rasprave/nova")}`}
                  className={styles.komPrijavaBtn}
                >
                  Prijavi se
                </Link>
                <Link
                  href={`/registracija?next=${encodeURIComponent("/rasprave/nova")}`}
                  className={`${styles.komPrijavaBtn} ${styles.komPrijavaBtnPuni}`}
                >
                  Registruj se besplatno
                </Link>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
