'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styles from './Navbar.module.css';
import { me, logout, unwrap } from 'src/api/auth';
import { getOrganizations, getClientOrganizations } from 'src/api/profile';

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
    ],
  },
  {
    title: 'Plate, radnici i evidencija',
    items: [
      { label: 'Aktivni radnici', href: '/aktivni-radnici', desc: 'Centralni pregled radnika sa statusom prijave' },
      { label: 'Obračun plata', href: '/prijave-radnika?tab=obracun', desc: 'Mjesečni obračun, platni listići, uplatnice, 2001/2002' },
      { label: 'Prijave / odjave radnika', href: '/prijave-radnika', desc: 'JS3100 obrazac za PIO/ZZO' },
      { label: 'Šihterica', href: '/sihterica', desc: 'Mjesečna evidencija radnog vremena' },
    ],
  },
  {
    title: 'Ugovori i ostalo',
    items: [
      { label: 'Ugovor o pozajmici', href: '/ugovor-o-pozajmici' },
      { label: 'Ugovor o djelu', href: '/ugovor-o-djelu' },
      { label: 'Ugovor o radu i otkaz', href: '/ugovor-o-radu' },
      { label: 'Fakture i predračuni', href: '/fakture' },
      { label: 'Generator članskih kartica', href: '/clanske-kartice' },
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on route change or outside click
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
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
    <nav className={styles.nav}>
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
        {!isHome && (
          <Link href="/" className={styles.backHomeLink} title="Nazad na početnu">
            ← Početna
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
            </div>
          )}
        </div>

        <Link href="/sifre-djelatnosti">Šifre djelatnosti</Link>
        <Link href="/javni-prihodi">Javni prihodi</Link>
        <Link href="/blog">Blog</Link>
        <Link href={sectionHref('cijene')}>Pretplatnički paketi</Link>
        <Link href={sectionHref('kako')}>Kako radi</Link>
        <Link href={sectionHref('faq')}>FAQ</Link>
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
        {!isLoading && (user ? (
          <>
            {needsOrg && (
              <Link
                href="/profil"
                className={styles.addOrgHint}
                title="Dodajte svoju djelatnost da otključate sve funkcije"
              >
                <span className={styles.addOrgIcon}>+</span>
                Dodaj djelatnost
              </Link>
            )}
            {hasAnyOrg && (
              <Link
                href="/organizacije"
                className={styles.orgsLink}
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
            <Link href="/profil" className={styles.userChip} title="Moj profil">
              <span className={styles.userAvatar}>{user.firstName[0].toUpperCase()}</span>
              <span className={styles.userName}>{user.firstName}</span>
            </Link>
            <button className={styles.btnGhost} onClick={handleLogout}>Odjavi se</button>
          </>
        ) : (
          <>
            <Link href="/prijava" className={styles.btnGhost}>Prijavi se</Link>
            <Link href="/registracija" className={styles.btnPrimary}>Registruj se</Link>
          </>
        ))}
      </div>

      {mobileOpen && (
        <div className={styles.mobileBackdrop} onClick={() => setMobileOpen(false)}>
          <div className={styles.mobileDrawer} onClick={(e) => e.stopPropagation()}>
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

            <div className={styles.mobileGroup}>
              <div className={styles.mobileGroupTitle}>Reference i blog</div>
              <ul className={styles.mobileList}>
                <li>
                  <Link href="/sifre-djelatnosti" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    Šifre djelatnosti
                  </Link>
                </li>
                <li>
                  <Link href="/javni-prihodi" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    Javni prihodi
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>
                    Blog
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
