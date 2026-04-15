import styles from './Pricing.module.css';

interface Plan {
  tier: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  ctaStyle: 'outline' | 'white' | 'dark';
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    tier: 'Besplatno',
    price: '0 KM',
    period: 'zauvijek besplatno',
    features: [
      'SPR-1053 obrazac',
      'GPD-1051 obrazac',
      'Preračun neto / bruto plate',
      'PDV kalkulator',
      'Bez registracije',
    ],
    cta: 'Počni odmah',
    ctaStyle: 'outline',
  },
  {
    tier: 'Registracija',
    price: 'Besplatno',
    period: 'sa registracijom',
    features: [
      'Sve iz besplatnog plana',
      'Stalna sredstva i amortizacija',
      'Historija GPD podataka po godinama',
      'Pohrana podataka obrta u SPR-u',
      'Izvoz u Docx / PDF',
    ],
    cta: 'Registruj se besplatno',
    ctaStyle: 'white',
    featured: true,
  },
  {
    tier: 'Pro pretplata',
    price: '99 KM',
    period: 'godišnje / po korisniku',
    features: [
      'Sve iz prethodnih planova',
      'Prijave radnika + ispis obrazaca',
      'Ugovori o radu',
      'Ugovori o djelu s troškovima',
      'Prioritetna podrška',
    ],
    cta: 'Pretplati se',
    ctaStyle: 'dark',
  },
];

export default function Pricing() {
  return (
    <section id="cijene" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.label}>Planovi i cijene</div>
        <h2 className={styles.h2}>
          Transparentne cijene,<br /><em>bez iznenađenja</em>
        </h2>
        <p className={styles.intro}>Počnite besplatno. Nadogradite kada vam zatreba više.</p>

        <div className={styles.grid}>
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`${styles.card} ${plan.featured ? styles.featured : ''}`}
            >
              {plan.featured && <div className={styles.popularTag}>Najpopularnije</div>}
              <div className={styles.tier}>{plan.tier}</div>
              <div className={styles.price}>{plan.price}</div>
              <div className={styles.period}>{plan.period}</div>
              <div className={styles.divider} />
              <ul className={styles.features}>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button className={`${styles.cta} ${styles[plan.ctaStyle]}`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
