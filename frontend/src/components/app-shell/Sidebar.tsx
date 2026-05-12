"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconBuildingBank,
  IconInbox,
  IconArrowsExchange,
  IconFileInvoice,
  IconUsers,
  IconBook,
  IconReceiptTax,
  IconFileText,
  IconIdBadge2,
  IconCash,
  IconCreditCard,
  IconSettings,
  IconArrowLeft,
  IconCalculator,
} from "@tabler/icons-react";
import { OrgSwitcher } from "./OrgSwitcher";

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
        badge: "12",
      },
      { href: "/app/inbox", label: "Inbox", icon: IconInbox },
      {
        href: "/app/transakcije",
        label: "Transakcije",
        icon: IconArrowsExchange,
      },
      { href: "/app/fakture", label: "Fakture", icon: IconFileInvoice },
      { href: "/app/partneri", label: "Partneri", icon: IconUsers },
    ],
  },
  {
    label: "Knjige i evidencije",
    items: [
      { href: "/app/kpr", label: "KPR-1041", icon: IconBook },
      { href: "/app/pdv", label: "PDV evidencije", icon: IconReceiptTax },
      { href: "/app/obrasci", label: "Obrasci", icon: IconFileText },
    ],
  },
  {
    label: "Zaposlenici",
    items: [
      { href: "/app/zaposlenici", label: "Zaposlenici", icon: IconIdBadge2 },
      { href: "/app/obracuni-plata", label: "Obračuni plata", icon: IconCash },
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

export function Sidebar() {
  const pathname = usePathname() || "";

  return (
    <aside className="w-[340px] xl:w-[380px] shrink-0 border-r border-cream-300 bg-cream-100 flex flex-col h-screen sticky top-0">
      {/* Back to Porezni Kalkulator — top, velika */}
      <a
        href={MARKETING_URL}
        className="group flex items-center gap-2.5 mx-5 mt-5 px-4 py-3 rounded-lg bg-cream-50 border border-cream-300 hover:bg-cream-200 hover:border-text-tertiary/40 text-text-secondary hover:text-text-primary text-[13.5px] font-medium transition-colors"
      >
        <IconArrowLeft
          size={18}
          className="transition-transform group-hover:-translate-x-0.5 shrink-0"
        />
        <IconCalculator size={18} className="text-brand-600 shrink-0" />
        <span className="flex-1 truncate">Porezni Kalkulator</span>
      </a>

      {/* Brand */}
      <Link href="/app/dashboard" className="px-6 pt-7 pb-7 flex items-center gap-3 group">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-600 text-white shrink-0 group-hover:opacity-90 transition-opacity">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </span>
        <span className="text-[26px] font-semibold text-text-primary tracking-tight leading-none">
          PK Office
        </span>
      </Link>

      {/* Nav — naše originalne kategorije, krupne stavke */}
      <nav className="flex-1 overflow-y-auto px-4 pb-3">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-6" : ""}>
            {group.label && (
              <div className="px-4 mb-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                {group.label}
              </div>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "flex items-center gap-4 px-4 py-3.5 rounded-xl text-[16px] leading-6 transition-colors",
                        active
                          ? "bg-brand-100 text-brand-700 font-medium"
                          : "text-text-secondary hover:bg-cream-200 hover:text-text-primary",
                      ].join(" ")}
                    >
                      <Icon
                        size={26}
                        stroke={1.85}
                        className={
                          active
                            ? "text-brand-700 shrink-0"
                            : "text-text-secondary shrink-0"
                        }
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={[
                            "min-w-[26px] h-[24px] px-2 inline-flex items-center justify-center rounded-full text-[12px] font-semibold shrink-0",
                            active
                              ? "bg-brand-600 text-white"
                              : "bg-cream-200 text-text-secondary",
                          ].join(" ")}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Org switcher u dnu — kompaktna kartica */}
      <div className="p-4 border-t border-cream-300">
        <OrgSwitcher />
      </div>
    </aside>
  );
}
