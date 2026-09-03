"use client";

import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import Dashboard from "./Dashboard";
import SoloDashboard from "./SoloDashboard";
import { SoloUlaz } from "./SoloUlaz";

// Naslovnica bira prikaz po stanju korisnika:
//  - bez ijednog obrta: ulaz sa formom za prvi obrt (bez odlaska u Postavke),
//  - Solo obrt ("vodim sam sebi"): lista obaveza i faktura kao glavna radnja,
//  - inače puni PK Office dashboard (knjigovođa, više obrta).
export default function DashboardSwitch() {
  const { data: me, isPending, isSuccess } = usePkOfficeMe();
  const orgs = me?.organizations ?? [];
  const activeOrg = me?.activeOrganization ?? orgs[0] ?? null;

  // Dok se ne zna ko je korisnik ne montira se puni dashboard: on odmah
  // ispali svoje zahtjeve, pa bi ga Solo prikaz (ili ulaz za prvi obrt)
  // odmah zamijenio. Neutralan skeleton drži mjesto do odgovora.
  if (isPending) return <NaslovnicaSkeleton />;
  if (isSuccess && orgs.length === 0) return <SoloUlaz />;
  if (activeOrg?.soloMode) return <SoloDashboard />;
  return <Dashboard />;
}

function NaslovnicaSkeleton() {
  return (
    <div
      className="px-8 py-8 lg:px-12 lg:py-10 max-w-[1100px] mx-auto animate-pulse"
      role="status"
      aria-label="Učitavanje naslovnice"
    >
      <div className="h-5 w-32 rounded bg-cream-200 mb-4" />
      <div className="h-8 w-72 max-w-full rounded bg-cream-200 mb-3" />
      <div className="h-3.5 w-56 max-w-full rounded bg-cream-200 mb-7" />

      <div className="flex flex-wrap gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 w-40 rounded-lg bg-cream-200" />
        ))}
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 px-5 py-5 mb-5">
        <div className="h-4 w-48 rounded bg-cream-200 mb-4" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-full rounded bg-cream-200 mb-3 last:mb-0" />
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[76px] rounded-xl border border-cream-300 bg-cream-100" />
        ))}
      </div>
    </div>
  );
}
