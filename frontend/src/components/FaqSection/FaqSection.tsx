"use client";

import { useState } from "react";
import styles from "src/components/Faq/Faq.module.css";

export interface FaqItem {
  q: string;
  a: string;
}

export default function FaqSection({ items, title = "Često postavljena pitanja" }: { items: FaqItem[]; title?: string }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid var(--border)" }}>
      <div className={styles.label}>FAQ</div>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.5rem", marginBottom: "1.5rem", letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <div className={styles.list}>
        {items.map((item, i) => (
          <div key={i} className={styles.item}>
            <button
              type="button"
              className={`${styles.question} ${open === i ? styles.open : ""}`}
              onClick={() => setOpen(open === i ? null : i)}
            >
              {item.q}
            </button>
            {/* Odgovor je UVIJEK u HTML-u, samo skriven: stranice uz ovaj FAQ
                prijavljuju FAQPage strukturirane podatke, a Google traži da
                taj tekst zaista postoji na stranici. Uslovno renderovanje ga
                je ostavljalo samo u JSON-LD-u. */}
            <div className={styles.answer} hidden={open !== i}>
              {item.a}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
