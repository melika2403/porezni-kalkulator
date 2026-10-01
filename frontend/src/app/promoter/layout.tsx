"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logout, me, unwrap } from "src/api/auth";
import { getMojeReklame } from "src/api/reklame";
import { useRole } from "src/hooks/useRole";
import { REKLAME_KEY } from "src/sections/promoter/kljucevi";
import p from "src/sections/promoter/portal.module.css";

// Partner portal oglašivača (banka partner). Vlastiti header i sidebar, bez
// marketing navbara i bez ijednog admin linka za promotera. Boje su fiksne
// (svijetle) po dizajnu portala, nezavisno od teme sajta.

const NAV: { href: string; label: string }[] = [
  { href: "/promoter", label: "Pregled" },
  { href: "/promoter/kreative", label: "Kreative" },
  { href: "/promoter/pozicije", label: "Pozicije" },
  { href: "/promoter/izvjestaji", label: "Izvještaji" },
  { href: "/promoter/postavke", label: "Postavke" },
];

function inicijali(tekst: string): string {
  const rijeci = tekst.trim().split(/\s+/).filter(Boolean);
  return (rijeci[0]?.[0] ?? "") + (rijeci[1]?.[0] ?? "");
}

export default function PromoterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, isLoading } = useRole();
  const dozvoljen = role === "PROMOTER" || role === "ADMIN";

  // paleta portala i na <body>: padajući meniji i modali se crtaju u body,
  // van .portal, pa bi u tamnoj temi sajta ispali tamni na svijetlom portalu
  useEffect(() => {
    document.body.classList.add(p.paleta);
    return () => document.body.classList.remove(p.paleta);
  }, []);

  if (isLoading) return null;

  if (!dozvoljen) {
    return (
      <div className={p.portal}>
        <div className={p.nemaPristupa}>
          <span className={p.logoZnak}>PK</span>
          <h1>{role ? "Nemate pristup" : "Partner portal"}</h1>
          <p>
            {role
              ? "Ovaj dio je samo za oglašivače. Ako ste partner i trebate pristup, javite nam se putem kontakt stranice."
              : "Prijavite se nalogom na koji je dodijeljena uloga oglašivača."}
          </p>
          <Link href={role ? "/kontakt" : "/prijava?next=/promoter"} className={p.dugmeZeleno}>
            {role ? "Kontakt" : "Prijava"}
          </Link>
        </div>
      </div>
    );
  }

  const aktivan = (href: string) =>
    href === "/promoter"
      ? pathname === "/promoter"
      : pathname === href || !!pathname?.startsWith(href + "/");

  return (
    <div className={p.portal}>
      <header className={p.topbar}>
        <Link href="/promoter" className={p.logo}>
          <span className={p.logoZnak}>PK</span>
          <span className={p.logoNaziv}>Porezni Kalkulator</span>
          <span className={p.logoPortal}>· Partner portal</span>
        </Link>
        <BrendMeni jeAdmin={role === "ADMIN"} />
      </header>

      <div className={p.tijelo}>
        <aside className={p.sidebar}>
          <nav className={p.nav} aria-label="Partner portal">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`${p.navLink} ${aktivan(n.href) ? p.navAktivan : ""}`}
                aria-current={aktivan(n.href) ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className={p.sidebarDno}>
            {role === "ADMIN" ? (
              <>
                Uloga: admin
                <br />
                Pristup svim oglašivačima
              </>
            ) : (
              <>
                Uloga: oglašivač
                <br />
                Pristup samo vlastitim podacima
              </>
            )}
          </div>
        </aside>

        <main className={p.sadrzaj}>{children}</main>
      </div>
    </div>
  );
}

function BrendMeni({ jeAdmin }: { jeAdmin: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [otvoren, setOtvoren] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: korisnik } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });
  // brend se čita iz zadnje kreative (jedna banka, isti brend na svima)
  const { data: reklame } = useQuery({
    queryKey: REKLAME_KEY,
    queryFn: () => unwrap(getMojeReklame()),
  });
  const brend = jeAdmin
    ? "Admin · svi oglašivači"
    : reklame?.[0]?.brend || `${korisnik?.firstName ?? ""} ${korisnik?.lastName ?? ""}`.trim();

  useEffect(() => {
    if (!otvoren) return;
    const klik = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOtvoren(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOtvoren(false);
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("keydown", esc);
    };
  }, [otvoren]);

  const odjava = async () => {
    await logout();
    qc.clear();
    router.push("/");
    router.refresh();
  };

  return (
    <div className={p.brendMeni} ref={ref}>
      <button
        type="button"
        className={p.brendChip}
        onClick={() => setOtvoren((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={otvoren}
      >
        <span className={p.brendInicijali}>{inicijali(brend).toUpperCase() || "?"}</span>
        <span className={p.brendNaziv}>{brend}</span>
      </button>
      {otvoren && (
        <div className={p.meni} role="menu">
          {korisnik?.email && <div className={p.meniEmail}>{korisnik.email}</div>}
          {jeAdmin && (
            <Link href="/admin" className={p.meniStavka} role="menuitem">
              Admin panel
            </Link>
          )}
          <Link href="/" className={p.meniStavka} role="menuitem">
            Nazad na sajt
          </Link>
          <button type="button" className={p.meniStavka} role="menuitem" onClick={odjava}>
            Odjava
          </button>
        </div>
      )}
    </div>
  );
}
