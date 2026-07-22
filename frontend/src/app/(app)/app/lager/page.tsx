"use client";

// Roba / Lager lista: stanje zaliha po artiklu i MPC-u na datum presjeka,
// izvedeno iz kalkulacija i proknjiženih popisa. Popis (inventura) je
// jedino razduženje: pazar se knjiži ukupno, ne po artiklima.
import { useRouter, useSearchParams } from "next/navigation";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { LagerTab } from "src/sections/lager/LagerTab";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { PopisTab } from "src/sections/lager/PopisTab";
import { NivelacijeTab } from "src/sections/lager/NivelacijeTab";
import { RazduzenjaTab } from "src/sections/lager/RazduzenjaTab";
import { TkmTab } from "src/sections/lager/TkmTab";

type TabId = "lager" | "popis" | "nivelacije" | "razduzenja" | "tkm";

const TABS: { id: TabId; label: string }[] = [
  { id: "lager", label: "Lager lista" },
  { id: "popis", label: "Popis (inventura)" },
  { id: "nivelacije", label: "Nivelacije" },
  { id: "razduzenja", label: "Povrat i otpis" },
  { id: "tkm", label: "TKM" },
];

function isTabId(v: string | null): v is TabId {
  return (
    v === "lager" ||
    v === "popis" ||
    v === "nivelacije" ||
    v === "razduzenja" ||
    v === "tkm"
  );
}

export default function LagerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const param = searchParams.get("tab");
  const activeTab: TabId = isTabId(param) ? param : "lager";

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <h1 className="font-serif-display text-[clamp(2rem,3.5vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
            Lager lista
            <span className="text-brand-600" style={{ fontStyle: "italic" }}>
              .
            </span>
          </h1>
          <HelpButton slug="lager" />
        </div>
        <p className="text-[14px] leading-6 text-text-tertiary mt-2 max-w-xl">
          Stanje zaliha po artiklu i cijeni, izvedeno iz kalkulacija i
          proknjiženih popisa. Popis svodi lager na stvarno izbrojano stanje.
        </p>
      </div>

      <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => router.push(`/app/lager?tab=${tab.id}`)}
            className={[
              "px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "lager" && <LagerTab orgId={orgId} />}
      {activeTab === "popis" && <PopisTab orgId={orgId} />}
      {activeTab === "nivelacije" && <NivelacijeTab orgId={orgId} />}
      {activeTab === "razduzenja" && <RazduzenjaTab orgId={orgId} />}
      {activeTab === "tkm" && <TkmTab orgId={orgId} />}
    </div>
  );
}
