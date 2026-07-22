"use client";

// Inbox ima dva odvojena dijela koja se rade paralelno:
// - "Uvoz izvoda": grupni uvoz i rasknjižavanje izvoda za sve obrte
// - "Poruke": napomene, upozorenja i chat sa administracijom
import { useSearchParams, useRouter } from "next/navigation";
import { UvozIzvodaTab } from "src/sections/inbox/UvozIzvodaTab";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { PorukeTab } from "src/sections/inbox/PorukeTab";
import { PodrskaTab } from "src/sections/inbox/PodrskaTab";
import { useSupportUnread } from "src/api/support";
import { useNotificationsUnread } from "src/api/announcements";

type TabId = "izvodi" | "poruke" | "podrska";

const TABS: { id: TabId; label: string }[] = [
  { id: "izvodi", label: "Uvoz izvoda" },
  { id: "poruke", label: "Poruke i obavijesti" },
  { id: "podrska", label: "Podrška (Live chat)" },
];

function isTabId(v: string | null): v is TabId {
  return v === "izvodi" || v === "poruke" || v === "podrska";
}

export default function InboxPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const param = searchParams.get("tab");
  const activeTab: TabId = isTabId(param) ? param : "izvodi";
  const supportUnread = useSupportUnread();
  const { unread: porukeUnread, setUnread: setPorukeUnread } =
    useNotificationsUnread();

  function setTab(id: TabId) {
    router.push(`/app/inbox?tab=${id}`);
  }

  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <h1 className="font-serif-display text-[clamp(2rem,3.5vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
            Inbox
            <span className="text-brand-600" style={{ fontStyle: "italic" }}>
              .
            </span>
          </h1>
          <HelpButton slug="inbox" />
        </div>
        <p className="text-[14px] leading-6 text-text-tertiary mt-2 max-w-xl">
          Prijem izvoda za sve vaše obrte, obavijesti i poruke na jednom
          mjestu.
        </p>
      </div>

      {/* Sekundarna navigacija: segmented pilula, aktivni tab popunjen */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={[
              "px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
            ].join(" ")}
          >
            {tab.label}
            {(() => {
              const count =
                tab.id === "podrska"
                  ? supportUnread
                  : tab.id === "poruke"
                    ? porukeUnread
                    : 0;
              if (count <= 0) return null;
              return (
                <span
                  className={[
                    "ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-medium",
                    activeTab === tab.id
                      ? "bg-white/25 text-white"
                      : "bg-brand-600 text-white",
                  ].join(" ")}
                >
                  {count}
                </span>
              );
            })()}
          </button>
        ))}
      </div>

      {activeTab === "izvodi" && <UvozIzvodaTab />}
      {activeTab === "poruke" && (
        <PorukeTab onMarkedRead={() => setPorukeUnread(0)} />
      )}
      {activeTab === "podrska" && <PodrskaTab />}
    </div>
  );
}
