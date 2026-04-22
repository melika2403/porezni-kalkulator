'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styles from './Navbar.module.css';
import { me, logout, unwrap } from 'src/api/auth';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isHome = pathname === '/';

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => unwrap(me()),
    retry: false,
  });

  const sectionHref = (id: string) => isHome ? `#${id}` : `/#${id}`;

  const handleLogout = async () => {
    await logout();
    queryClient.setQueryData(['me'], null);
    queryClient.invalidateQueries({ queryKey: ['me'] });
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
        <Link href={sectionHref('cijene')}>Pretplatnički paketi</Link>
        <Link href={sectionHref('kako')}>Kako radi</Link>
        <Link href={sectionHref('faq')}>FAQ</Link>
      </div>

      <div className={styles.actions}>
        {!isLoading && (user ? (
          <>
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
