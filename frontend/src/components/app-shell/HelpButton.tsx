"use client";

// Dugme "Upustvo" koje stoji uz naslov svake PK Office stranice. Otvara
// UpustvoDrawer (montiran jednom u AppShell-u) sa upustvom za dati slug.
import { IconHelpCircle } from "@tabler/icons-react";
import { openUpustvo } from "src/lib/upustvo-store";

export function HelpButton({
  slug,
  label = "Uputstvo",
  className = "",
  uTok = false,
}: {
  /** Segment rute, npr. "bankovni-izvodi". Mora postojati u registru upustava. */
  slug: string;
  /** Tekst dugmeta; default "Uputstvo". Npr. "Kako početi" za vodič. */
  label?: string;
  className?: string;
  /** Uz naslov dugme ide desno (ml-auto). Kad ih je više u nizu (vodiči na
      naslovnici) ostaju u toku jedno uz drugo, inače se razbacaju po redu. */
  uTok?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => openUpustvo(slug)}
      className={`inline-flex items-center gap-1.5 ${uTok ? "" : "ml-auto"} px-3.5 py-1.5 rounded-full bg-info-bg text-info border border-info/40 text-[13px] font-semibold hover:bg-[#c9ddee] transition-colors ${className}`}
    >
      <IconHelpCircle size={16} />
      {label}
    </button>
  );
}
