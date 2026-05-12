"use client";

import { usePathname } from "next/navigation";
import { UserDropdown } from "./UserDropdown";

const SEGMENT_LABEL: Record<string, string> = {
  dashboard: "Početna",
  "bankovni-izvodi": "Bankovni izvodi",
  inbox: "Inbox",
  transakcije: "Transakcije",
  fakture: "Fakture",
  partneri: "Partneri",
  kpr: "KPR-1041",
  pdv: "PDV evidencije",
  obrasci: "Obrasci",
  zaposlenici: "Zaposlenici",
  "obracuni-plata": "Obračuni plata",
  pretplata: "Pretplata",
  postavke: "Postavke obrta",
};

export function Header() {
  const pathname = usePathname() || "";
  const segments = pathname.split("/").filter(Boolean);
  const main = segments[1] || "";
  const title = SEGMENT_LABEL[main] || "PK Office";

  return (
    <header className="h-[76px] shrink-0 border-b border-cream-300 bg-cream-100 px-10 flex items-center gap-4">
      <h1 className="text-[20px] font-semibold text-text-primary tracking-tight">
        {title}
      </h1>

      <div className="flex-1" />

      <UserDropdown />
    </header>
  );
}
