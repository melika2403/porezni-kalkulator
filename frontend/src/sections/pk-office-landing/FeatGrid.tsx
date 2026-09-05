import type { ComponentType } from "react";
import styles from "./pkOffice.module.css";

export type FeatItem = {
  icon: ComponentType<{ size?: number | string }>;
  name: string;
  desc: string;
  /** Kartica preko cijelog reda (popunjava zadnji red 3-kolonskog grida). */
  wide?: boolean;
};

/** Mreža kartica funkcija, ista na /pk-office i /solo (ikona, naziv, opis). */
export function FeatGrid({ items }: { items: FeatItem[] }) {
  return (
    <div className={styles.featGrid}>
      {items.map((f) => {
        const Icon = f.icon;
        return (
          <div
            key={f.name}
            className={[styles.feat, f.wide && styles.featWide].filter(Boolean).join(" ")}
          >
            <span className={styles.featIcon}>
              <Icon size={20} />
            </span>
            <p className={styles.featName}>{f.name}</p>
            <p className={styles.featDesc}>{f.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
