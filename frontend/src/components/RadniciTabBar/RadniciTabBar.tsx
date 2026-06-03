"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLastOrg } from "src/hooks/useLastOrg";

type ActiveKey = "js3100" | "obracun" | "aktivni" | "ugovori";

function detectActive(pathname: string | null, tab: string | null): ActiveKey {
  if (pathname?.startsWith("/ugovor-o-radu")) return "ugovori";
  if (pathname?.startsWith("/aktivni-radnici")) return "aktivni";
  if (tab === "obracun") return "obracun";
  return "js3100";
}

// Zajednički sticky tab-bar koji se prikazuje na sve tri funkcije (JS3100,
// Obračun plata, Aktivni radnici). Aktivna kartica je određena trenutnim
// pathname-om i `?tab=` parametrom; svi linkovi propagiraju `?org=` da
// odabrana organizacija ostane ista kad korisnik prelazi između funkcija.
export default function RadniciTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { lastOrgId } = useLastOrg();

  const urlOrg = searchParams.get("org");
  const orgParam = urlOrg && Number(urlOrg) > 0
    ? urlOrg
    : lastOrgId
      ? String(lastOrgId)
      : null;
  const orgQs = orgParam ? `org=${orgParam}` : "";

  const active = detectActive(pathname, searchParams.get("tab"));

  const tabs: { key: ActiveKey; label: string; href: string }[] = [
    {
      key: "js3100",
      label: "JS3100 prijava / odjava",
      href: `/prijave-radnika${orgQs ? `?${orgQs}` : ""}`,
    },
    {
      key: "obracun",
      label: "Obračun plata",
      href: `/prijave-radnika?${["tab=obracun", orgQs].filter(Boolean).join("&")}`,
    },
    {
      key: "aktivni",
      label: "Aktivni radnici",
      href: `/aktivni-radnici${orgQs ? `?${orgQs}` : ""}`,
    },
    {
      key: "ugovori",
      label: "Ugovori",
      href: `/ugovor-o-radu${orgQs ? `?${orgQs}` : ""}`,
    },
  ];

  return (
    <div
      style={{
        position: "sticky",
        top: 64,
        marginTop: 64,
        zIndex: 30,
        background: "var(--paper, #faf8f3)",
        borderBottom: "1px solid #d4cfc4",
      }}
    >
      <nav
        role="tablist"
        aria-label="Radnici i plate"
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "0 2rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <Link
              key={t.key}
              href={t.href}
              role="tab"
              aria-selected={isActive}
              scroll={false}
              style={{
                padding: "0.7rem 1.1rem",
                fontSize: "0.92rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#111" : "#666",
                cursor: "pointer",
                borderBottom: `2px solid ${isActive ? "#3a5c42" : "transparent"}`,
                marginBottom: -1,
                fontFamily: "inherit",
                textDecoration: "none",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
