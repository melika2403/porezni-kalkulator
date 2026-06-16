"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconBuildingBank,
  IconInbox,
  IconArrowsExchange,
  IconFileInvoice,
  IconAddressBook,
  IconBook2,
  IconReceiptTax,
  IconFileText,
  IconUsers,
  IconCoins,
  IconCreditCard,
  IconSettings,
  IconArrowLeft,
  IconBriefcase,
} from "@tabler/icons-react";
import { OrgSwitcher } from "./OrgSwitcher";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { useBankSummary } from "src/hooks/useBankStatements";
import styles from "./Sidebar.module.css";

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    stroke?: number;
    className?: string;
  }>;
  badge?: string;
};

type NavGroup = { label?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/app/dashboard", label: "Početna", icon: IconLayoutDashboard },
    ],
  },
  {
    label: "Finansije",
    items: [
      {
        href: "/app/bankovni-izvodi",
        label: "Bankovni izvodi",
        icon: IconBuildingBank,
        // badge: broj stavki za pregled, puni se dinamički u renderu
        badge: "dynamic-unmatched",
      },
      { href: "/app/inbox", label: "Inbox", icon: IconInbox },
      {
        href: "/app/transakcije",
        label: "Transakcije",
        icon: IconArrowsExchange,
      },
      { href: "/app/fakture", label: "Fakture", icon: IconFileInvoice },
      { href: "/app/partneri", label: "Partneri", icon: IconAddressBook },
    ],
  },
  {
    label: "Knjige i evidencije",
    items: [
      { href: "/app/kpr", label: "KPR-1041", icon: IconBook2 },
      { href: "/app/pdv", label: "PDV evidencije", icon: IconReceiptTax },
      { href: "/app/obrasci", label: "Obrasci", icon: IconFileText },
    ],
  },
  {
    label: "Zaposlenici",
    items: [
      { href: "/app/zaposlenici", label: "Zaposlenici", icon: IconUsers },
      { href: "/app/obracuni-plata", label: "Obračuni plata", icon: IconCoins },
    ],
  },
  {
    label: "Račun",
    items: [
      { href: "/app/pretplata", label: "Pretplata", icon: IconCreditCard },
      { href: "/app/postavke", label: "Postavke obrta", icon: IconSettings },
    ],
  },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname() || "";

  // badge za bankovne izvode: stvaran broj stavki koje čekaju pregled
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const { data: bankSummary } = useBankSummary(activeOrg?.id ?? null);
  const unmatchedCount = bankSummary?.unmatched ?? 0;

  function badgeFor(item: NavItem): string | null {
    if (item.badge === "dynamic-unmatched") {
      return unmatchedCount > 0 ? String(unmatchedCount) : null;
    }
    return item.badge ?? null;
  }

  return (
    <>
      {open && (
        <div className={styles.overlay} onClick={onClose} aria-hidden />
      )}

      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        {/* Header: brand + org switcher */}
        <div className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandIcon} aria-hidden>
              <IconBriefcase size={20} stroke={1.8} />
            </span>
            <span className={styles.brandTitle}>PK Office</span>
          </div>
          <OrgSwitcher />
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className={styles.groupLabel}>{group.label}</div>
              )}
              <div className={styles.navList}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                    >
                      <span className={styles.navIcon}>
                        <Icon size={19} stroke={1.8} />
                      </span>
                      <span className={styles.navLabel}>{item.label}</span>
                      {badgeFor(item) && (
                        <span className={styles.navBadge}>{badgeFor(item)}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={styles.foot}>
          <a href={MARKETING_URL} className={styles.backLink}>
            <IconArrowLeft
              size={18}
              stroke={1.8}
              className={styles.backIcon}
            />
            Nazad na Porezni Kalkulator
          </a>
        </div>
      </aside>
    </>
  );
}
