'use client';
import styles from './ComingSoonModal.module.css';

interface Props {
  onClose: () => void;
}

export default function ComingSoonModal({ onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.icon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
        </div>
        <div className={styles.label}>Uskoro</div>
        <h3 className={styles.title}>Dolazi uskoro</h3>
        <p className={styles.desc}>
          Ova funkcija je trenutno u razvoju.
          Pratite nas za najave kada bude dostupna.
        </p>
        <button className={styles.btn} onClick={onClose}>
          Razumijem
        </button>
      </div>
    </div>
  );
}
