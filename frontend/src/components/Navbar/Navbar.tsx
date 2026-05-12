'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styles from './Navbar.module.css';
import { me, logout, unwrap } from 'src/api/auth';
import { getOrganizations } from 'src/api/profile';

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
      { label: 'Šihterica', href: '/sihterica', desc: 'Mjesečna evidencija radnog vremena' },
      { label: 'Prijave/odjave radnika', href: '/prijave-radnika', desc: 'JS3100 obrazac' },
      { label: 'Stalna sredstva i amortizacija', href: '/amortizacija', desc: 'Vođenje OS i obračun' },
    ],
  },
  {
    title: 'Ugovori i ostalo',
    items: [
      { label: 'Ugovor o pozajmici', href: '/ugovor-o-pozajmici' },
      { label: 'Ugovor o djelu', href: '/ugovor-o-djelu' },
      { label: 'Fakture i predračuni', href: '/fakture' },
      { label: 'Generator članskih kartica', href: '/clanske-kartice' },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isHome = pathname === '/';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on route change or outside click
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
  const needsOrg =
    !!user && orgsQuery.data && orgsQuery.data.length === 0 && pathname !== '/profil';

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

        <Link href={sectionHref('cijene')}>Pretplatnički paketi</Link>
        <Link href={sectionHref('kako')}>Kako radi</Link>
        <Link href={sectionHref('faq')}>FAQ</Link>
      </div>

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
            {!needsOrg && orgsQuery.data && orgsQuery.data.length > 0 && (
              <a
                href={
                  process.env.NEXT_PUBLIC_APP_URL ??
                  (process.env.NODE_ENV === "production"
                    ? "https://app.poreznikalkulator.ba"
                    : "/app")
                }
                className={styles.btnApp}
                title="Otvori PK Office"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Otvori App
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
    </nav>
  );
}
