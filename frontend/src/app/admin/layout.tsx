"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import styles from "./adminLayout.module.css";

// ── Stavke admin sidebar-a ────────────────────────────────────────────────────
const NAV_ITEMS: {
  href: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    href: "/admin/korisnici",
    label: "Korisnici",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/pretplate",
    label: "Predračuni",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.brandIcon} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandLabel}>Admin</span>
              <span className={styles.brandTitle}>Kontrolni panel</span>
            </div>
          </div>

          {/* Navigacija */}
          <div className={styles.navHeader}>Navigacija</div>
          <nav className={styles.nav}>
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                pathname?.startsWith(item.href + "/");
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

          {/* Footer */}
          <div className={styles.sidebarFoot}>
            <Link href="/" className={styles.backLink}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11L4 7l5-4" />
              </svg>
              Nazad na sajt
            </Link>
          </div>
        </aside>

        <main className={styles.content}>{children}</main>
      </div>
    </RoleGuard>
  );
}
