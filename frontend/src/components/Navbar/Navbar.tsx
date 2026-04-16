'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';
import ComingSoonModal from '../ComingSoonModal/ComingSoonModal';

export default function Navbar() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
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
          <Link href="#funkcije">Funkcije</Link>
          <Link href="#cijene">Cijene</Link>
          <Link href="#kako">Kako radi</Link>
          <Link href="#faq">FAQ</Link>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnGhost} onClick={() => setShowModal(true)}>Prijavi se</button>
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>Registruj se</button>
        </div>
      </nav>

      {showModal && <ComingSoonModal onClose={() => setShowModal(false)} />}
    </>
  );
}
