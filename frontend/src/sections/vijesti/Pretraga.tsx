"use client";

// Polje za pretragu u zaglavlju sekcije. Šalje na /vijesti/pretraga?q=...
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./vijesti.module.css";

export default function Pretraga({ pocetni = "" }: { pocetni?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(pocetni);

  function trazi() {
    const t = q.trim();
    router.push(t ? `/vijesti/pretraga?q=${encodeURIComponent(t)}` : "/vijesti/pretraga");
  }

  return (
    <div className={styles.pretraga}>
      <input
        className={styles.pretragaInput}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") trazi();
        }}
        placeholder="Pretraži vijesti"
        aria-label="Pretraži vijesti i vodiče"
      />
      <button
        type="button"
        className={styles.pretragaBtn}
        onClick={trazi}
        aria-label="Traži"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>
    </div>
  );
}
