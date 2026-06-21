"use client";

/* Adaptivni CTA za PK Office landing. Reuse ['me'] query (isti kao navbar) pa
   nema dodatnog poziva. Neprijavljen vidi "Registruj se"; prijavljen vidi
   "Otvori PK Office" (vodi u app). Tokom SSR-a (bez podataka) renderuje se
   neprijavljena varijanta, pa je staticki HTML + SEO i dalje "Registruj se". */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { IconArrowRight } from "@tabler/icons-react";
import { me, unwrap } from "src/api/auth";
import styles from "./pkOffice.module.css";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://app.poreznikalkulator.ba"
    : "/app");

export function LandingCta({ withSecondary = false }: { withSecondary?: boolean }) {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });

  if (user) {
    return (
      <a href={APP_URL} className={styles.btnPrimary}>
        Otvori PK Office
        <IconArrowRight size={17} />
      </a>
    );
  }

  return (
    <>
      <Link href="/registracija" className={styles.btnPrimary}>
        Registruj se besplatno
        <IconArrowRight size={17} />
      </Link>
      {withSecondary && (
        <Link href="/prijava" className={styles.btnGhost}>
          Prijavi se
        </Link>
      )}
    </>
  );
}
