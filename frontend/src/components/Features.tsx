import styles from './Features.module.css';

type Badge = 'free' | 'reg' | 'pro';

interface Feature {
  title: string;
  desc: string;
  badge: Badge;
  iconColor: 'sage' | 'accent' | 'dark';
  icon: React.ReactNode;
}

const BADGE_LABELS: Record<Badge, string> = {
  free: 'Besplatno',
  reg:  'Registracija',
  pro:  'Godišnja pretplata',
};

const FEATURES: Feature[] = [
  {
    title: 'SPR-1053 obrazac',
    desc: 'Automatska izrada obrasca za porez na dohodak iz samostalne djelatnosti. Unesite podatke, preuzmite popunjeni obrazac.',
    badge: 'free',
    iconColor: 'sage',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: 'GPD-1051 obrazac',
    desc: 'Godišnja prijava poreza na dohodak. Mogućnost pohrane podataka iz prethodnih godina uz registraciju.',
    badge: 'free',
    iconColor: 'sage',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: 'Preračun neto / bruto plate',
    desc: 'Unesite neto ili bruto iznos — odmah dobijate sve doprinose, poreze i prireze prema kantonalnim stopama.',
    badge: 'free',
    iconColor: 'sage',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: 'PDV kalkulator',
    desc: 'Brzi preračun PDV-a u oba smjera — iz cijene bez PDV-a ili iz maloprodajne cijene s PDV-om.',
    badge: 'free',
    iconColor: 'sage',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
      </svg>
    ),
  },
  {
    title: 'Stalna sredstva i amortizacija',
    desc: 'Evidencija stalnih sredstava s automatskim obračunom amortizacije kroz godine. Historija i pregled po godinama.',
    badge: 'reg',
    iconColor: 'accent',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z" />
      </svg>
    ),
  },
  {
    title: 'Prijave radnika',
    desc: 'Unos i evidencija svih radnika s automatskim ispisom prijavnih obrazaca u PDF formatu.',
    badge: 'pro',
    iconColor: 'dark',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    title: 'Ugovori o radu',
    desc: 'Automatska izrada ugovora o radu na osnovu unesenih podataka o radniku. Ispis i preuzimanje u jednom kliku.',
    badge: 'pro',
    iconColor: 'dark',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    title: 'Ugovori o djelu',
    desc: 'Izrada ugovora o djelu s automatskim obračunom troškova, poreza i doprinosa na honorar.',
    badge: 'pro',
    iconColor: 'dark',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section id="funkcije" className={styles.section}>
      <div className={styles.header}>
        <div className={styles.label}>Što dobijate</div>
        <h2 className={styles.h2}>
          Sve što vam treba<br /><em>na jednom ekranu</em>
        </h2>
        <p className={styles.intro}>
          Od jednostavnog preračuna plate do kompletnih obrazaca i ugovora za radnike.
        </p>
      </div>

      <div className={styles.grid}>
        {FEATURES.map((f) => (
          <div key={f.title} className={styles.cell}>
            <div className={`${styles.icon} ${styles[`icon_${f.iconColor}`]}`}>
              {f.icon}
            </div>
            <div className={styles.cellTitle}>{f.title}</div>
            <div className={styles.cellDesc}>{f.desc}</div>
            <span className={`${styles.badge} ${styles[`badge_${f.badge}`]}`}>
              {BADGE_LABELS[f.badge]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
