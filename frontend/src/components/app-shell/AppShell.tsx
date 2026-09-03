"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { IconFileInvoice } from "@tabler/icons-react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { PrviObrtModal } from "./PrviObrtModal";
import { SoloUpitnik } from "./SoloUpitnik";
import { UpustvoDrawer } from "./UpustvoDrawer";
import { TrialBanner } from "./TrialBanner";
import { usePkOfficeMe, usePkOfficePristup } from "src/hooks/usePkOfficeMe";
import { PkOfficeUpsell } from "src/sections/dashboard/PkOfficeUpsell";
import { PkOfficePrekoLimita } from "src/sections/dashboard/PkOfficePrekoLimita";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dark tema: stariji dijelovi /app UI-ja (dashboard.module.css, StyledSelect,
  // RowActionsMenu...) koriste marketing CSS varijable (--white, --ink,
  // --paper...) koje nemaju dark vrijednosti pa ostaju svijetle. Klasa na
  // <body> aktivira njihove dark override-e iz pk-office.css i pokriva i
  // portale (meniji, modali) koji se renderuju direktno u body. Marketing
  // stranice nikad nemaju ovu klasu, pa ih override ne dira ni kad je .dark
  // klasa (globalni ThemeProvider) prisutna na <html>.
  useEffect(() => {
    document.body.classList.add("pk-app");
    return () => document.body.classList.remove("pk-app");
  }, []);

  // Naplata (PK_OFFICE_NAPLATA): korisnik bez Office paketa/probe umjesto
  // app sadržaja vidi upsell (pitch + mini cjenovnik + 30 dana probe).
  // Sidebar OSTAJE vidljiv (da se vidi šta app nudi), ali dok je zaključano
  // svaki klik na navigaciju i dalje prikazuje upsell umjesto sadržaja.
  // Dok flag nije uključen, pristup.enforced je false i sve radi kao prije.
  const { data: pristup } = usePkOfficePristup();
  const zakljucano = Boolean(pristup?.enforced && !pristup.hasOffice);
  // Prekoračenje: paket manji od broja aktivnih obrta (downgrade). Backend
  // blokira module (PREKO_LIMITA_PAKETA), ovdje umjesto sadržaja ide ekran
  // za deaktivaciju viška obrta.
  const prekoLimita = Boolean(
    pristup?.enforced && pristup.hasOffice && pristup.prekoLimita,
  );
  // Solo obrt: faktura je glavna radnja, pa na mobilnom pluta dugme "Nova
  // faktura" (na desktopu je u gornjoj traci)
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const solo = Boolean(activeOrg?.soloMode) && !zakljucano && !prekoLimita;

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
          ) : prekoLimita ? (
            <PkOfficePrekoLimita />
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
      {/* Solo upitnik (useSearchParams traži Suspense granicu) */}
      <Suspense fallback={null}>
        <SoloUpitnik />
      </Suspense>
      {solo && (
        <Link
          href="/app/fakture/nova"
          className="min-[900px]:hidden fixed bottom-5 right-5 z-30 inline-flex items-center gap-1.5 px-4 py-3 rounded-full bg-brand-600 text-white text-[13px] font-medium shadow-lg hover:opacity-90 transition-opacity"
        >
          <IconFileInvoice size={16} />
          Nova faktura
        </Link>
      )}
      {/* Kontekstualno upustvo (klizni panel zdesna), otvara ga HelpButton */}
      <UpustvoDrawer />
    </div>
  );
}
