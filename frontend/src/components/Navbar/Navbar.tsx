'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import styles from './Navbar.module.css';
import { me, logout, unwrap } from 'src/api/auth';
import { getOrganizations, getClientOrganizations } from 'src/api/profile';
import { getBrojObavjestenja } from 'src/api/vijestiKomentari';
import { PK_OFFICE_DASHBOARD_URL } from 'src/lib/pkOfficeUrl';

type MenuItem = { label: string; href: string; desc?: string };
type MenuGroup = { title: string; items: MenuItem[] };

const FUNCTION_GROUPS: MenuGroup[] = [
  {
    title: 'Brzi kalkulatori',
    items: [
      { label: 'PDV kalkulator', href: '/pdv-kalkulator', desc: 'Preračun cijene sa/bez PDV-a' },
      { label: 'Neto ↔ Bruto plata', href: '/preracun-neto-bruto', desc: 'Obračun plate i doprinosa' },
    ],
  },
  {
    title: 'Porezni obrasci',
    items: [
      { label: 'SPR-1053', href: '/spr', desc: 'Specifikacija dohotka samostalne djelatnosti' },
      { label: 'GPD-1051', href: '/gpd', desc: 'Godišnja porezna prijava' },
      { label: 'ZO3', href: '/zo3', desc: 'Zdravstveno osiguranje' },
      { label: 'AMS-1035', href: '/ams', desc: 'Akontacija poreza po odbitku' },
      { label: 'PK Freelancer', href: '/freelancer', desc: 'Evidencija honorara iz inostranstva, AMS i GPD' },
      { label: 'PK Office Solo', href: '/solo', desc: 'Vodi obrt sam, bez knjigovođe' },
    ],
  },
  {
    title: 'Plate, radnici i evidencija',
    items: [
      { label: 'Aktivni radnici', href: '/aktivni-radnici', desc: 'Centralni pregled radnika sa statusom prijave' },
      { label: 'Obračun plata', href: '/prijave-radnika?tab=obracun', desc: 'Mjesečni obračun, platni listići, uplatnice, 2001/2002' },
      { label: 'Prijave / odjave radnika', href: '/prijave-radnika', desc: 'JS3100 obrazac za PIO/ZZO' },
      { label: 'Šihterica', href: '/sihterica', desc: 'Mjesečna evidencija radnog vremena' },
      { label: 'Rješenja i odluke', href: '/rjesenja-i-odluke', desc: 'Godišnji odmor, regres, odsustva' },
    ],
  },
  {
    title: 'Ugovori i ostalo',
    items: [
      { label: 'Ugovor o pozajmici', href: '/ugovor-o-pozajmici' },
      { label: 'Ugovor o djelu', href: '/ugovor-o-djelu' },
      { label: 'Ugovor o radu i otkaz', href: '/ugovor-o-radu' },
      { label: 'Cesije i kompenzacije', href: '/cesije-i-kompenzacije' },
      { label: 'Fakture i predračuni', href: '/fakture' },
      { label: 'Stalna sredstva i amortizacija', href: '/amortizacija', desc: 'Vođenje OS i obračun' },
      { label: 'Kontakt / Pomoć', href: '/kontakt', desc: 'Pošalji nam upit ili prijedlog' },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isHome = pathname === '/';

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Tamna tema: isti next-themes provider (i pohrana) kao PK Office, pa je
  // izbor teme sinhronizovan između marketinga i /app. mounted čuva od
  // hydration mismatcha (server ne zna temu).
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // setTimeout-0: lint (set-state-in-effect) ne dozvoljava sinhroni setState
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  const isDark =
    mounted && (theme === 'system' ? resolvedTheme : theme) === 'dark';
  // "?" uz PK Office dugme: mali popover sa najjačim funkcijama
  const [pkInfoOpen, setPkInfoOpen] = useState(false);
  // Profil meni (chip sa avatarom → dropdown), isti obrazac kao PK Office
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pkInfoRef = useRef<HTMLSpanElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on route change or outside click
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
    setPkInfoOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Zaključaj scroll body-ja dok je mobile drawer otvoren
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!pkInfoOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pkInfoRef.current && !pkInfoRef.current.contains(e.target as Node)) {
        setPkInfoOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPkInfoOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [pkInfoOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [userMenuOpen]);

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => unwrap(me()),
    retry: false,
  });

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const res = await getOrganizations();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!user,
    retry: false,
  });
  // Klijentske org-e: backend filtrira po membership-u, role gate nije
  // potreban — bilo koji user može biti dodan kao član klijentske org.
  const clientOrgsQuery = useQuery({
    queryKey: ['clientOrganizations'],
    queryFn: async () => {
      const res = await getClientOrganizations();
      if (!res.ok) return [];
      return res.data;
    },
    enabled: !!user,
    retry: false,
  });
  // značka nepročitanih obavještenja iz Vijesti/Rasprava na linku Vijesti;
  // isti queryKey kao u sekciji Vijesti, pa se keš dijeli i gasi zajedno
  const { data: obavBroj } = useQuery({
    queryKey: ['vijesti-obavjestenja-broj'],
    queryFn: async () => {
      const res = await getBrojObavjestenja();
      return res.ok && res.data ? res.data : null;
    },
    enabled: !!user,
    retry: false,
    refetchInterval: 120000,
  });
  const neprocitano = obavBroj?.neprocitano ?? 0;

  const ownCount = orgsQuery.data?.length ?? 0;
  const clientCount = clientOrgsQuery.data?.length ?? 0;
  const hasAnyOrg = ownCount > 0 || clientCount > 0;
  // "Dodaj djelatnost" hint se prikazuje samo kad korisnik NEMA niti jednu
  // (vlastitu ni klijentsku) i nije već na profilu (gdje može da je doda).
  const needsOrg =
    !!user && orgsQuery.data != null && !hasAnyOrg && pathname !== '/profil';

  const sectionHref = (id: string) => isHome ? `#${id}` : `/#${id}`;

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className={styles.nav} data-marketing-chrome="navbar">
      <Link href="/" className={styles.logo}>
        <div className={styles.logoMark}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
            <rect x="3" y="3" width="8" height="8" rx="1" />
            <rect x="13" y="3" width="8" height="8" rx="1" />
            <rect x="3" y="13" width="8" height="8" rx="1" />
            <path d="M13 17h8M17 13v8" />
          </svg>
        </div>
        <span className={styles.logoText}>
          Porezni <span>Kalkulator</span>
        </span>
      </Link>

      <div className={styles.links}>
        <div className={styles.linksLeft}>
        {!isHome && (
          <Link
            href="/"
            className={styles.backHomeLink}
            title="Nazad na početnu"
            aria-label="Nazad na početnu"
          >
            ←
          </Link>
        )}

        <div className={styles.dropdown} ref={menuRef}>
          <button
            type="button"
            className={`${styles.dropdownTrigger} ${menuOpen ? styles.dropdownTriggerOpen : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            Funkcije
            <svg
              viewBox="0 0 12 12"
              className={`${styles.dropdownChevron} ${menuOpen ? styles.dropdownChevronOpen : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M3 4.5l3 3 3-3" />
            </svg>
          </button>

          {menuOpen && (
            <div className={styles.megaMenu} role="menu">
              {FUNCTION_GROUPS.map((group) => (
                <div key={group.title} className={styles.megaCol}>
                  <div className={styles.megaColTitle}>{group.title}</div>
                  <ul className={styles.megaList}>
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`${styles.megaItem} ${isActive ? styles.megaItemActive : ''}`}
                          >
                            <span className={styles.megaItemLabel}>{item.label}</span>
                            {item.desc && (
                              <span className={styles.megaItemDesc}>{item.desc}</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <Link
                href="/pk-office"
                className={styles.megaOfficeBanner}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.megaOfficeTag}>PK Office</span>
                <span className={styles.megaOfficeText}>
                  Kompletno knjigovodstvo obrta: KUF/KIF, PDV prijava, fakture,
                  bankovni izvodi, blagajna, lager
                </span>
                <span className={styles.megaOfficeCta}>Saznaj više →</span>
              </Link>
            </div>
          )}
        </div>

        <Link href="/sifre-djelatnosti">Šifre djelatnosti</Link>
        <Link href="/sifre-zanimanja">Šifre zanimanja</Link>
        <Link href="/javni-prihodi">Javni prihodi</Link>
        </div>
        {/* Vijesti su izdvojene kao pilula: sekcija sadržaja, ne još jedan link */}
        <Link href="/vijesti" className={styles.linkVijesti}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2V6" />
            <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
          </svg>
          Vijesti
          {neprocitano > 0 && (
            <span className={styles.linkVijestiZnacka}>
              {neprocitano > 9 ? '9+' : neprocitano}
            </span>
          )}
        </Link>
        <div className={styles.linksRight}>
          <Link href={sectionHref('cijene')}>Pretplatnički paketi</Link>
          <Link href={sectionHref('kako')} className={styles.linkSecondary}>Kako radi</Link>
          <Link href={sectionHref('faq')} className={styles.linkSecondary}>FAQ</Link>
        </div>
      </div>

      <button
        type="button"
        className={styles.hamburger}
        aria-label={mobileOpen ? "Zatvori meni" : "Otvori meni"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          title={isDark ? 'Svijetla tema' : 'Tamna tema'}
          aria-label={isDark ? 'Uključi svijetlu temu' : 'Uključi tamnu temu'}
        >
          {isDark ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
        {!isLoading && (user ? (
          <>
            {needsOrg && (
              <Link
                href="/profil?novaOrg=1"
                className={`${styles.addOrgHint} ${styles.hideOnMobile}`}
                title="Dodajte svoju djelatnost da otključate sve funkcije"
              >
                <span className={styles.addOrgIcon}>+</span>
                Dodaj djelatnost
              </Link>
            )}
            {user.role === 'PROMOTER' && (
              <Link
                href="/partner"
                className={`${styles.orgsLink} ${styles.hideOnMobile}`}
                title="Upravljanje reklamama"
              >
                Moje reklame
              </Link>
            )}
            {hasAnyOrg && (
              <Link
                href="/organizacije"
                className={`${styles.orgsLink} ${styles.hideOnMobile}`}
                title="Pregled svih organizacija i klijenata"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                </svg>
                Organizacije
              </Link>
            )}
            {/* PK Office dugme i "?" stoje čim su podaci učitani, i kad
                korisnik još nema nijedan obrt (tad je lijevo od njih "Dodaj
                djelatnost") i kad vodi samo klijentske obrte. */}
            {orgsQuery.data != null && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <a
                href={PK_OFFICE_DASHBOARD_URL}
                className={styles.btnApp}
                title="Otvori PK Office"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Briefcase, isti logo kao u PK Office sidebaru */}
                  <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
                  <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
                  <path d="M12 12l0 .01" />
                  <path d="M3 13a20 20 0 0 0 18 0" />
                </svg>
                PK Office
                <svg
                  className={styles.btnAppArrow}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
              <span
                ref={pkInfoRef}
                className={styles.hideOnMobile}
                style={{ position: "relative", display: "inline-flex" }}
              >
                <button
                  type="button"
                  title="Šta je PK Office?"
                  aria-label="Šta je PK Office?"
                  aria-expanded={pkInfoOpen}
                  onClick={() => setPkInfoOpen((v) => !v)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: pkInfoOpen ? "var(--accent)" : "var(--white)",
                    border: pkInfoOpen
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                    color: pkInfoOpen ? "var(--white)" : "var(--mid)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    flexShrink: 0,
                    fontFamily: "inherit",
                  }}
                >
                  ?
                </button>
                {pkInfoOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      width: 320,
                      background: "var(--white)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      boxShadow: "0 18px 44px -14px rgba(15,26,18,0.3)",
                      padding: "16px 18px",
                      zIndex: 200,
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--accent)",
                        marginBottom: 6,
                      }}
                    >
                      PK Office
                    </div>
                    <div
                      style={{
                        fontSize: 14.5,
                        fontWeight: 600,
                        color: "var(--ink)",
                        marginBottom: 10,
                      }}
                    >
                      Kompletno knjigovodstvo obrta, u browseru.
                    </div>
                    <ul
                      style={{
                        listStyle: "none",
                        margin: "0 0 12px",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {[
                        "Grupni uvoz izvoda: svi obrti odjednom",
                        "Automatsko knjiženje: KPR, KUF i KIF se pune sami",
                        "Plate: listići na email, MIP-1023 i svi obrasci",
                        "Fakture, partneri i kartice kupaca",
                        "PDV prijava, e-KUF/e-KIF, roba i blagajna",
                      ].map((f) => (
                        <li
                          key={f}
                          style={{
                            fontSize: 13,
                            lineHeight: 1.45,
                            color: "var(--ink)",
                            display: "flex",
                            gap: 7,
                          }}
                        >
                          <span style={{ color: "var(--accent)", flexShrink: 0 }}>
                            ✓
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <p
                      style={{
                        fontSize: 11.5,
                        lineHeight: 1.5,
                        color: "var(--mid)",
                        margin: "0 0 12px",
                      }}
                    >
                      Napomena: bez integracije sa fiskalnim kasama, program se
                      ne povezuje sa fiskalnim uređajem na računaru.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        href="/pk-office"
                        onClick={() => setPkInfoOpen(false)}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 600,
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          color: "var(--ink)",
                          textDecoration: "none",
                        }}
                      >
                        Saznaj više
                      </Link>
                      <Link
                        href="/pretplate#pk-office"
                        onClick={() => setPkInfoOpen(false)}
                        style={{
                          flex: 1,
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 600,
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "var(--accent)",
                          color: "var(--white)",
                          textDecoration: "none",
                        }}
                      >
                        Cjenovnik
                      </Link>
                    </div>
                  </div>
                )}
              </span>
              </span>
            )}
            <div
              ref={userMenuRef}
              className={`${styles.userMenuWrap} ${styles.hideOnMobile}`}
            >
              <button
                type="button"
                className={styles.userChipBtn}
                onClick={() => setUserMenuOpen((o) => !o)}
                title={`${user.firstName} ${user.lastName ?? ''}`.trim()}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className={styles.userAvatar}>
                  {`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()}
                </span>
                <span className={styles.userName}>{user.firstName}</span>
                <svg
                  className={`${styles.userChevron}${userMenuOpen ? ` ${styles.userChevronOpen}` : ''}`}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {userMenuOpen && (
                <div className={styles.userMenu} role="menu">
                  <div className={styles.userMenuHead}>
                    <span className={styles.userMenuAvatar}>
                      {`${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()}
                    </span>
                    <div className={styles.userMenuId}>
                      <div className={styles.userMenuName}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div className={styles.userMenuEmail}>{user.email}</div>
                    </div>
                  </div>
                  <div className={styles.userMenuSep} />
                  <Link
                    href="/profil"
                    className={styles.userMenuItem}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Moj profil
                  </Link>
                  <Link
                    href="/profil?tab=pretplata"
                    className={styles.userMenuItem}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                    </svg>
                    Pretplata
                  </Link>
                  <button
                    type="button"
                    className={`${styles.userMenuItem} ${styles.userMenuItemBtn}`}
                    onClick={() => {
                      setTheme(isDark ? 'light' : 'dark');
                      setUserMenuOpen(false);
                    }}
                  >
                    {isDark ? (
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                      </svg>
                    ) : (
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    )}
                    {isDark ? 'Svijetla tema' : 'Tamna tema'}
                  </button>
                  <div className={styles.userMenuSep} />
                  <button
                    type="button"
                    className={styles.userMenuLogout}
                    onClick={handleLogout}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    Odjavi se
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link
              href="/pk-office"
              className={`${styles.btnApp} ${styles.hideOnMobile}`}
              title="PK Office"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Briefcase, isti logo kao u PK Office sidebaru */}
                <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
                <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
                <path d="M12 12l0 .01" />
                <path d="M3 13a20 20 0 0 0 18 0" />
              </svg>
              PK Office
              <svg
                className={styles.btnAppArrow}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/prijava"
              className={`${styles.btnGhost} ${styles.hideOnMobile}`}
            >
              Prijavi se
            </Link>
            <Link href="/registracija" className={styles.btnPrimary}>Registruj se</Link>
          </>
        ))}
      </div>

      {mobileOpen && (
        <div className={styles.mobileBackdrop} onClick={() => setMobileOpen(false)}>
          <div className={styles.mobileDrawer} onClick={(e) => e.stopPropagation()}>
            {/* Izdvojeno na vrhu: sekcije sadržaja koje se svakodnevno čitaju,
                da ne potonu ispod dugačkih lista funkcija */}
            <div className={styles.mobileFeatured}>
              <Link
                href="/vijesti"
                className={`${styles.mobileFeaturedTile} ${styles.mobileFeaturedVijesti}`}
                onClick={() => setMobileOpen(false)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2V6" />
                  <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
                </svg>
                Vijesti
                {neprocitano > 0 && (
                  <span className={styles.mobileFeaturedZnacka}>
                    {neprocitano > 9 ? '9+' : neprocitano}
                  </span>
                )}
              </Link>
              <Link
                href="/vodici"
                className={styles.mobileFeaturedTile}
                onClick={() => setMobileOpen(false)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                Vodiči
              </Link>
              <Link
                href="/rasprave"
                className={`${styles.mobileFeaturedTile} ${styles.mobileFeaturedRasprave}`}
                onClick={() => setMobileOpen(false)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Rasprave
              </Link>
            </div>
            {!user && !isLoading && (
              <div className={styles.mobileGroup}>
                <div className={styles.mobileGroupTitle}>Nalog</div>
                <ul className={styles.mobileList}>
                  <li>
                    <Link
                      href="/prijava"
                      className={styles.mobileItem}
                      onClick={() => setMobileOpen(false)}
                    >
                      Prijavi se
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/registracija"
                      className={styles.mobileItem}
                      onClick={() => setMobileOpen(false)}
                    >
                      Registruj se
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/pk-office"
                      className={styles.mobileItem}
                      onClick={() => setMobileOpen(false)}
                    >
                      PK Office
                    </Link>
                  </li>
                </ul>
              </div>
            )}
            {user && (
              <div className={styles.mobileGroup}>
                <div className={styles.mobileGroupTitle}>Tvoj nalog</div>
                <ul className={styles.mobileList}>
                  {needsOrg && (
                    <li>
                      <Link
                        href="/profil?novaOrg=1"
                        className={styles.mobileItem}
                        onClick={() => setMobileOpen(false)}
                      >
                        Dodaj djelatnost
                      </Link>
                    </li>
                  )}
                  {user.role === 'PROMOTER' && (
                    <li>
                      <Link
                        href="/partner"
                        className={styles.mobileItem}
                        onClick={() => setMobileOpen(false)}
                      >
                        Moje reklame
                      </Link>
                    </li>
                  )}
                  {hasAnyOrg && (
                    <li>
                      <Link
                        href="/organizacije"
                        className={styles.mobileItem}
                        onClick={() => setMobileOpen(false)}
                      >
                        Organizacije
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link
                      href="/profil"
                      className={styles.mobileItem}
                      onClick={() => setMobileOpen(false)}
                    >
                      Moj profil
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`${styles.mobileItem} ${styles.mobileItemButton}`}
                      onClick={() => {
                        setMobileOpen(false);
                        handleLogout();
                      }}
                    >
                      Odjavi se
                    </button>
                  </li>
                </ul>
              </div>
            )}
            {FUNCTION_GROUPS.map((group) => (
              <div key={group.title} className={styles.mobileGroup}>
                <div className={styles.mobileGroupTitle}>{group.title}</div>
                <ul className={styles.mobileList}>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={styles.mobileItem}
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <Link
              href="/pk-office"
              className={styles.mobileOfficeBanner}
              onClick={() => setMobileOpen(false)}
            >
              <span className={styles.megaOfficeTag}>PK Office</span>
              <span className={styles.mobileOfficeText}>
                Kompletno knjigovodstvo obrta: KUF/KIF, PDV, fakture, izvodi,
                blagajna, lager
              </span>
              <span className={styles.megaOfficeCta}>Saznaj više →</span>
            </Link>

            {/* Vijesti, Vodiči i Rasprave su izdvojeni na vrhu drawera */}
            <div className={styles.mobileGroup}>
              <div className={styles.mobileGroupTitle}>Reference</div>
              <ul className={styles.mobileList}>
                <li>
                  <Link href="/sifre-djelatnosti" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    Šifre djelatnosti
                  </Link>
                </li>
                <li>
                  <Link href="/sifre-zanimanja" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    Šifre zanimanja
                  </Link>
                </li>
                <li>
                  <Link href="/javni-prihodi" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    Javni prihodi
                  </Link>
                </li>
              </ul>
            </div>

            <div className={styles.mobileGroup}>
              <div className={styles.mobileGroupTitle}>O aplikaciji</div>
              <ul className={styles.mobileList}>
                <li>
                  <Link href={sectionHref('cijene')} className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    Pretplatnički paketi
                  </Link>
                </li>
                <li>
                  <Link href={sectionHref('kako')} className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    Kako radi
                  </Link>
                </li>
                <li>
                  <Link href={sectionHref('faq')} className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/o-nama" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    O nama
                  </Link>
                </li>
                <li>
                  <Link href="/kontakt" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    Kontakt
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
