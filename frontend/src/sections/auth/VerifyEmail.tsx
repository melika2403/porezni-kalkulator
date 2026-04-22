'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import styles from './auth.module.css';
import { verifyEmail } from 'src/api/auth';

type State = 'loading' | 'success' | 'error' | 'no-token';

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('no-token');
      return;
    }

    verifyEmail(token).then((res) => {
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['me'] });
        setState('success');
        setTimeout(() => router.push('/profil'), 2500);
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
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.label}>Verifikacija</div>
          <h1 className={styles.h1}>Email <em>potvrđen</em></h1>
          <p className={styles.lead}>Vaš račun je aktiviran. Preusmjeravamo vas na profil...</p>
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
