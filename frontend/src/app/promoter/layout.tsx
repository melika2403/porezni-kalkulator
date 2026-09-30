"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "src/hooks/useRole";
// isti shell kao admin panel (sidebar + sadržaj), bez ijednog admin linka
import styles from "../admin/adminLayout.module.css";
import s from "src/sections/promoter/promoter.module.css";

const NAV_ITEMS: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/promoter",
    label: "Moje reklame",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="8" rx="1" />
        <rect x="14" y="15" width="7" height="6" rx="1" />
      </svg>
    ),
  },
  {
    href: "/promoter/reklame/nova",
    label: "Nova reklama",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
];

// Pristup: PROMOTER (oglašivač) i ADMIN (podrška). Backend isto provjerava
// na svakoj ruti, ovo je samo da UI ne prikaže prazan dashboard.
export default function PromoterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, isLoading } = useRole();

  if (isLoading) return null;

  if (!role) {
    return (
      <div className={s.nemaPristupa}>
        <h1>Prijava za oglašivače</h1>
        <p>Prijavite se nalogom na koji je dodijeljena uloga oglašivača.</p>
        <Link href="/prijava?next=/promoter" className={s.primarno}>
          Prijava
        </Link>
      </div>
    );
  }

  if (role !== "PROMOTER" && role !== "ADMIN") {
    return (
      <div className={s.nemaPristupa}>
        <h1>Nemate pristup</h1>
        <p>
          Ovaj dio je samo za oglašivače. Ako ste partner i trebate pristup,
          javite nam se putem kontakt stranice.
        </p>
        <Link href="/kontakt" className={s.primarno}>
          Kontakt
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
              <path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" />
            </svg>
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandLabel}>
              {role === "ADMIN" ? "Admin · sve reklame" : "Oglašivač"}
            </span>
            <span className={styles.brandTitle}>Reklame</span>
          </div>
        </div>

        <div className={styles.navHeader}>Navigacija</div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/promoter"
                ? pathname === "/promoter" ||
                  (pathname?.startsWith("/promoter/reklame/") &&
                    pathname !== "/promoter/reklame/nova")
                : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFoot}>
          {role === "ADMIN" && (
            <Link href="/admin" className={styles.backLink}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11L4 7l5-4" />
              </svg>
              Nazad na admin panel
            </Link>
          )}
          <Link href="/" className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11L4 7l5-4" />
            </svg>
            Nazad na sajt
          </Link>
        </div>
      </aside>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
