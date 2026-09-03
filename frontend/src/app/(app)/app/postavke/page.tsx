"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ProfilTab } from "src/components/postavke/ProfilTab";
import { KorisniciTab } from "src/components/postavke/KorisniciTab";
import { NotifikacijeTab } from "src/components/postavke/NotifikacijeTab";
import { NacinRadaTab } from "src/components/postavke/NacinRadaTab";

// "nova-organizacija" nije u chip listi: otvara se iz org switchera
// ("Dodaj novi obrt") i renderuje ProfilTab u create modu.
type TabId =
  | "profil"
  | "nacin-rada"
  | "korisnici"
  | "notifikacije"
  | "nova-organizacija";

const TABS: { id: TabId; label: string }[] = [
  { id: "profil", label: "Profil obrta" },
  { id: "nacin-rada", label: "Način rada" },
  { id: "korisnici", label: "Korisnici i pristupi" },
  { id: "notifikacije", label: "Notifikacije" },
];

function isTabId(v: string | null): v is TabId {
  return (
    v === "profil" ||
    v === "nacin-rada" ||
    v === "korisnici" ||
    v === "notifikacije" ||
    v === "nova-organizacija"
  );
}

export default function PostavkePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const param = searchParams.get("tab");
  const activeTab: TabId = isTabId(param) ? param : "profil";

  function setTab(id: TabId) {
    router.push(`/app/postavke?tab=${id}`);
  }

  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10 max-w-[1200px] mx-auto">
      {/* Naslov stranice, isti kao na ostalim stranicama modula */}
      <div className="mb-6">
        <h1 className="font-serif-display text-[clamp(2rem,3.5vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
          {activeTab === "nova-organizacija" ? "Novi obrt" : "Postavke obrta"}
          <span className="text-brand-600" style={{ fontStyle: "italic" }}>
            .
          </span>
        </h1>
        <p className="text-[14px] leading-6 text-text-tertiary mt-2 max-w-xl">
          {activeTab === "nova-organizacija"
            ? "Podaci sa rješenja o registraciji; ostalo se može dopuniti kasnije."
            : "Podaci obrta, način rada i meni, pristup za članove tima i notifikacije."}
        </p>
      </div>

      {/* Sekundarna navigacija, chip stil */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={[
              "px-4 py-2 text-[13px] font-medium rounded-md transition-colors",
              activeTab === tab.id
                ? "bg-brand-100 text-brand-700"
                : "text-text-secondary hover:bg-cream-200 hover:text-text-primary",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
        {activeTab === "nova-organizacija" && (
          <span className="px-4 py-2 text-[13px] font-medium rounded-md bg-brand-100 text-brand-700">
            Novi obrt
          </span>
        )}
      </div>

      {activeTab === "profil" && <ProfilTab />}
      {activeTab === "nacin-rada" && <NacinRadaTab />}
      {activeTab === "korisnici" && <KorisniciTab />}
      {activeTab === "notifikacije" && <NotifikacijeTab />}
      {activeTab === "nova-organizacija" && <ProfilTab createMode />}
    </div>
  );
}
