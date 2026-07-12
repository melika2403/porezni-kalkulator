"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { PrviObrtModal } from "./PrviObrtModal";
import { UpustvoDrawer } from "./UpustvoDrawer";
import { TrialBanner } from "./TrialBanner";
import { usePkOfficePristup } from "src/hooks/usePkOfficeMe";
import { PkOfficeUpsell } from "src/sections/dashboard/PkOfficeUpsell";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Naplata (PK_OFFICE_NAPLATA): korisnik bez Office paketa/probe umjesto
  // app sadržaja vidi upsell (pitch + mini cjenovnik + 30 dana probe).
  // Sidebar OSTAJE vidljiv (da se vidi šta app nudi), ali dok je zaključano
  // svaki klik na navigaciju i dalje prikazuje upsell umjesto sadržaja.
  // Dok flag nije uključen, pristup.enforced je false i sve radi kao prije.
  const { data: pristup } = usePkOfficePristup();
  const zakljucano = Boolean(pristup?.enforced && !pristup.hasOffice);

  return (
    <div className="min-h-screen flex flex-col bg-cream-50 text-text-primary">
      <TopBar onMenuClick={() => setDrawerOpen(true)} />
      <div className="flex flex-1 min-h-0 min-[900px]:h-[calc(100vh-54px)]">
        <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        {/* overflow-y-scroll (umjesto auto): scrollbar traka je uvijek tu,
            pa se sadržaj ne pomjera lijevo-desno kad promjena taba/stranice
            produži ili skrati sadržaj */}
        <main className="flex-1 min-w-0 overflow-y-scroll overflow-x-hidden [scrollbar-gutter:stable]">
          {zakljucano ? (
            <PkOfficeUpsell />
          ) : (
            <>
              <TrialBanner />
              {children}
            </>
          )}
        </main>
      </div>
      {/* korisnik sa pristupom a bez ijednog obrta: dobrodošlica sa pozivom
          da doda prvi obrt (sam se ne prikazuje čim obrt postoji) */}
      <PrviObrtModal />
      {/* Kontekstualno upustvo (klizni panel zdesna), otvara ga HelpButton */}
      <UpustvoDrawer />
    </div>
  );
}
