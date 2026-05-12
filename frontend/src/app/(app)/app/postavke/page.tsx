"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ProfilTab } from "src/components/postavke/ProfilTab";
import { KorisniciTab } from "src/components/postavke/KorisniciTab";
import { NotifikacijeTab } from "src/components/postavke/NotifikacijeTab";

type TabId = "profil" | "korisnici" | "notifikacije";

const TABS: { id: TabId; label: string }[] = [
  { id: "profil", label: "Profil obrta" },
  { id: "korisnici", label: "Korisnici i pristupi" },
  { id: "notifikacije", label: "Notifikacije" },
];

function isTabId(v: string | null): v is TabId {
  return v === "profil" || v === "korisnici" || v === "notifikacije";
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
      {/* Sekundarna navigacija — chip stil */}
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
      </div>

      {activeTab === "profil" && <ProfilTab />}
      {activeTab === "korisnici" && <KorisniciTab />}
      {activeTab === "notifikacije" && <NotifikacijeTab />}
    </div>
  );
}
