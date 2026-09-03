"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLastOrg } from "src/hooks/useLastOrg";
import styles from "./RadniciTabBar.module.css";

type ActiveKey =
  | "js3100"
  | "obracun"
  | "porezna-kartica"
  | "aktivni"
  | "ugovori"
  | "rjesenja"
  | "cesije";

function detectActive(pathname: string | null, tab: string | null): ActiveKey {
  if (pathname?.startsWith("/ugovor-o-radu")) return "ugovori";
  if (pathname?.startsWith("/cesije-i-kompenzacije")) return "cesije";
  if (pathname?.startsWith("/rjesenja-i-odluke")) return "rjesenja";
  if (pathname?.startsWith("/porezna-kartica")) return "porezna-kartica";
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

  // Zadnja odabrana org ima PREDNOST nad ?org= iz URL-a: URL zna biti
  // zastario (korisnik promijeni org u sidebaru, query param ostane stari),
  // a lastOrgId se upisuje na svaku efektivnu promjenu (usePamcenaOrg).
  const urlOrg = searchParams.get("org");
  const orgParam = lastOrgId
    ? String(lastOrgId)
    : urlOrg && Number(urlOrg) > 0
      ? urlOrg
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
      key: "porezna-kartica",
      label: "Porezna kartica",
      href: `/porezna-kartica${orgQs ? `?${orgQs}` : ""}`,
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
    {
      key: "rjesenja",
      label: "Rješenja i odluke",
      href: `/rjesenja-i-odluke${orgQs ? `?${orgQs}` : ""}`,
    },
    {
      key: "cesije",
      label: "Cesije i kompenzacije",
      href: `/cesije-i-kompenzacije${orgQs ? `?${orgQs}` : ""}`,
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
      <nav role="tablist" aria-label="Radnici i plate" className={styles.nav}>
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <Link
              key={t.key}
              href={t.href}
              role="tab"
              aria-selected={isActive}
              scroll={false}
              className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
