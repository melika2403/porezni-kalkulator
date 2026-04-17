'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Navbar.module.css';
import { me, logout, type AuthUser } from 'src/api/auth';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    me().then((res) => {
      if (cancelled) return;
      setUser(res.ok ? res.data : null);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [pathname]);

  const sectionHref = (id: string) => isHome ? `#${id}` : `/#${id}`;

  const handleLogout = async () => {
    await logout();
    setUser(null);
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
        <Link href={sectionHref('funkcije')}>Funkcije</Link>
        <Link href={sectionHref('cijene')}>Cijene</Link>
        <Link href={sectionHref('kako')}>Kako radi</Link>
        <Link href={sectionHref('faq')}>FAQ</Link>
      </div>

      <div className={styles.actions}>
        {!loaded ? null : user ? (
          <>
            <span className={styles.userChip}>{user.firstName}</span>
            <button className={styles.btnGhost} onClick={handleLogout}>Odjavi se</button>
          </>
        ) : (
          <>
            <Link href="/prijava" className={styles.btnGhost}>Prijavi se</Link>
            <Link href="/registracija" className={styles.btnPrimary}>Registruj se</Link>
          </>
        )}
      </div>
    </nav>
  );
}
