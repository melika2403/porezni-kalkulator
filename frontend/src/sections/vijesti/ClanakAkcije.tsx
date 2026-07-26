"use client";

/* Dugmad u lijevoj traci članka: brojka dijeljenja, dijeljenje i, samo za
   administratore, prečica na uređivanje tog teksta u admin panelu. */

import { useState } from "react";
import Link from "next/link";
import { useRole } from "src/hooks/useRole";
import { getBackendUrl } from "src/utils/backendUrl";
import { objaviBrojDijeljenja } from "./BrojDijeljenja";
import styles from "./vijesti.module.css";

export function PodijeliDugme({ naslov, slug }: { naslov: string; slug: string }) {
  const [poruka, setPoruka] = useState<string | null>(null);

  async function zabiljezi() {
    try {
      const res = await fetch(
        `${getBackendUrl()}/api/vijesti/${encodeURIComponent(slug)}/dijeljenje`,
        { method: "POST", keepalive: true },
      );
      const j = (await res.json()) as { data?: { brojDijeljenja?: number } };
      if (typeof j.data?.brojDijeljenja === "number") {
        objaviBrojDijeljenja(slug, j.data.brojDijeljenja);
      }
    } catch {
      // brojka nije bitnija od radnje, tiho preskačemo
    }
  }

  async function podijeli() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    // na mobitelu sistemski dijalog, na desktopu kopiranje linka
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: naslov, url });
        await zabiljezi();
        return;
      } catch {
        // korisnik odustao, pada na kopiranje
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setPoruka("Link kopiran");
      setTimeout(() => setPoruka(null), 2500);
      await zabiljezi();
    } catch {
      setPoruka("Kopiranje nije uspjelo");
      setTimeout(() => setPoruka(null), 2500);
    }
  }

  return (
    <div>
      <button type="button" className={styles.railDugme} onClick={podijeli}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <path d="M12 3v13M8 7l4-4 4 4" />
          </svg>
        Podijeli
      </button>
      {poruka && <div className={styles.railOznaka}>{poruka}</div>}
    </div>
  );
}

export function UrediDugme({ id }: { id: number }) {
  const { role } = useRole();
  if (role !== "ADMIN") return null;
  return (
    <Link
      href={`/admin/vijesti/${id}`}
      className={`${styles.railDugme} ${styles.railDugmeAdmin}`}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
      Uredi tekst
    </Link>
  );
}
