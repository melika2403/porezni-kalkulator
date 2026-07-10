"use client";

// Roba / Kalkulacije: maloprodajne kalkulacije (KCM) + šifarnik artikala.
// Kalkulacija zadužuje maloprodaju po računu dobavljača i automatski knjiži
// taj račun u obaveze/KUF. Kasnije se na isti šifarnik veže i lager lista.
import { useRouter, useSearchParams } from "next/navigation";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { KalkulacijeTab } from "src/sections/kalkulacije/KalkulacijeTab";
import { ArtikliTab } from "src/sections/kalkulacije/ArtikliTab";
import { MarzaTab } from "src/sections/kalkulacije/MarzaTab";

type TabId = "kalkulacije" | "artikli" | "marza";

const TABS: { id: TabId; label: string }[] = [
  { id: "kalkulacije", label: "Kalkulacije" },
  { id: "artikli", label: "Artikli" },
  { id: "marza", label: "Marža" },
];

export default function KalkulacijePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const param = searchParams.get("tab");
  const activeTab: TabId =
    param === "artikli" ? "artikli" : param === "marza" ? "marza" : "kalkulacije";

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="font-serif-display text-[clamp(2rem,3.5vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
          Kalkulacije
          <span className="text-brand-600" style={{ fontStyle: "italic" }}>
            .
          </span>
        </h1>
        <p className="text-[14px] leading-6 text-text-tertiary mt-2 max-w-xl">
          Maloprodajne kalkulacije (KCM obrazac) i šifarnik artikala. Svaka
          kalkulacija automatski knjiži ulazni račun dobavljača u obaveze i
          KUF.
        </p>
      </div>

      <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => router.push(`/app/kalkulacije?tab=${tab.id}`)}
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

      {activeTab === "kalkulacije" && <KalkulacijeTab orgId={orgId} />}
      {activeTab === "artikli" && <ArtikliTab orgId={orgId} />}
      {activeTab === "marza" && <MarzaTab orgId={orgId} />}
    </div>
  );
}
