"use client";

import { useMemo, useRef } from "react";
import { klikUrl, reklamaSlikaUrl, type JavnaReklama } from "src/api/partner";
import type { Clanak } from "src/api/vijesti";
import { bojeBrenda } from "./Kartica";
import { usePrikaz } from "./useSlot";
import styles from "./partnerSlot.module.css";

/**
 * "Uz podršku <brend>" na sponzorisanom vodiču ili vijesti. Diskretna traka
 * ispod uvoda: logo partnera i link (kroz klik redirect, sa UTM oznakama).
 * Prikazi i klikovi idu u izvještaj partnera kao pozicija SPONZOR.
 */
export default function SponzorTeksta({
  sponzor,
  stranica,
}: {
  sponzor: NonNullable<Clanak["sponzor"]>;
  stranica: "vijesti" | "vodici";
}) {
  const ref = useRef<HTMLDivElement>(null);
  // usePrikaz treba samo id kreative
  const zaBrojanje = useMemo(() => ({ id: sponzor.id }) as JavnaReklama, [sponzor.id]);
  usePrikaz(ref, zaBrojanje, stranica, "SPONZOR");
  const logo = reklamaSlikaUrl(sponzor.logoUrl);

  return (
    <div ref={ref} className={styles.sponzor} style={bojeBrenda(sponzor.boja)}>
      <span className={styles.sponzorOznaka}>Uz podršku</span>
      <span className={styles.brend}>
        {logo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={logo} alt={sponzor.brend} className={styles.brendLogo} />
        ) : (
          sponzor.brend
        )}
      </span>
      <a
        href={klikUrl(sponzor.id, stranica, "SPONZOR")}
        target="_blank"
        rel="sponsored nofollow noopener"
        className={styles.sponzorLink}
      >
        {sponzor.ctaTekst || "Saznajte više"}
      </a>
    </div>
  );
}
