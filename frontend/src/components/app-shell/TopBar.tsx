"use client";

import Link from "next/link";
import { IconMenu2, IconFileInvoice } from "@tabler/icons-react";
import { UserDropdown } from "./UserDropdown";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";

// Puni TopBar (54px) preko cijele širine: brand lijevo, UserDropdown desno.
// Ispod ~900px prikazuje hamburger koji otvara sidebar drawer.
// sticky: i kad stranica skrola cijelim body-jem (mali/nizak prozor, mobilni),
// traka ostaje na vrhu umjesto da nestane i ostavi prazninu.
export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  // Solo obrt: "Nova faktura" je glavna radnja i stoji u traci na svakom ekranu
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const solo = Boolean(activeOrg?.soloMode);
  return (
    <header className="sticky top-0 z-40 h-[54px] shrink-0 border-b border-cream-300 bg-cream-100 px-5 flex items-center gap-3">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Otvori meni"
        className="min-[900px]:hidden -ml-1 p-2 rounded-lg text-text-secondary hover:bg-cream-200 hover:text-text-primary transition-colors"
      >
        <IconMenu2 size={20} />
      </button>

      <Link href="/app/dashboard" className="flex items-center gap-3 group">
        <span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-brand-600 text-white shrink-0 group-hover:opacity-90 transition-opacity">
          <span className="text-[14px] font-medium leading-none">PK</span>
        </span>
        <span className="text-[15px] font-medium leading-none tracking-tight">
          <span className="text-text-primary">Porezni</span>{" "}
          <span className="text-brand-600">Kalkulator</span>
        </span>
      </Link>

      <div className="flex-1" />

      {solo && (
        <Link
          href="/app/fakture/nova"
          className="hidden min-[900px]:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <IconFileInvoice size={16} />
          Nova faktura
        </Link>
      )}

      <UserDropdown />
    </header>
  );
}
