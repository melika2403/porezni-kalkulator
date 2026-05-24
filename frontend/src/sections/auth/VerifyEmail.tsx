'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import styles from './auth.module.css';
import { verifyEmail } from 'src/api/auth';

type State = 'loading' | 'success' | 'error' | 'no-token';

// Whitelist: dozvoli redirect samo na interne (relative) putanje.
function safeNext(raw: string | null): string {
  if (!raw) return '/profil';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/profil';
  return raw;
}

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>('loading');
  const [redirectTo, setRedirectTo] = useState<string>('/profil');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('no-token');
      return;
    }

    verifyEmail(token).then((res) => {
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['me'] });
        // Pročitaj sačuvani next iz Register flow-a (anonimni je krenuo iz
        // paywall-a sa ?next=/pretplate?trial=1 i sl.). Inače padni na /profil.
        let next = '/profil';
        if (typeof window !== 'undefined') {
          try {
            const stored = window.localStorage.getItem('postRegisterNext');
            if (stored) {
              next = safeNext(stored);
              window.localStorage.removeItem('postRegisterNext');
            }
          } catch {}
        }
        setRedirectTo(next);
        setState('success');
        setTimeout(() => router.push(next), 2500);
      } else {
        setState('error');
      }
    });
  }, []);

  if (state === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.label}>Verifikacija</div>
          <h1 className={styles.h1}>Provjeravamo <em>link</em>...</h1>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    const targetLabel = redirectTo.startsWith('/pretplate')
      ? 'aktivaciju pretplate'
      : redirectTo === '/profil'
        ? 'profil'
        : 'sljedeću stranicu';
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.label}>Verifikacija</div>
          <h1 className={styles.h1}>Email <em>potvrđen</em></h1>
          <p className={styles.lead}>
            Vaš račun je aktiviran. Preusmjeravamo vas na {targetLabel}...
          </p>
        </div>
      </div>
    );
  }

  if (state === 'no-token') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.label}>Verifikacija</div>
          <h1 className={styles.h1}>Nevažeći <em>link</em></h1>
          <p className={styles.lead}>Link za verifikaciju nije ispravan.</p>
        </div>
        <div className={styles.footer}>
          <Link href="/prijava">Nazad na prijavu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Verifikacija</div>
        <h1 className={styles.h1}>Link <em>istekao</em></h1>
        <p className={styles.lead}>
          Link za verifikaciju je nevažeći ili je istekao. Prijavite se i zatražite novi link.
        </p>
      </div>
      <div className={styles.footer}>
        <Link href="/prijava">Idi na prijavu</Link>
      </div>
    </div>
  );
}
