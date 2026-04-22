'use client';
import { useState } from 'react';
import styles from './Pricing.module.css';
import ComingSoonModal from '../ComingSoonModal/ComingSoonModal';

interface Plan {
  tier: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  ctaStyle: 'outline' | 'white' | 'blue-white';
  variant?: 'pro' | 'business';
  tag?: string;
  action: 'scroll' | 'soon';
}

const PLANS: Plan[] = [
  {
    tier: 'Besplatno',
    price: '0 KM',
    period: 'zauvijek besplatno',
    features: [
      'SPR-1053 i GPD-1051 obrazac',
      'izrada i automatska popuna ZO3 obrazca',
      'AMS-1035 generator zajedno sa uplatnicama',
      'Stalna sredstva i amortizacija kroz godine',
      'Historija svih dokumenata po godinama ili obrascima',
      'Pohrana podataka obrta u svim dokumentima',
      'Izvoz u Docx / PDF',
    ],
    cta: 'Počni besplatno',
    ctaStyle: 'outline',
    action: 'scroll',
  },
  {
    tier: 'Pro',
    price: '--,-- KM',
    period: 'godišnje / po korisniku',
    features: [
      'Sve iz besplatnog plana',
      'Šihterica — Evidencija radnog vremena',
      'Višestruke vlastite djelatnosti',
      'Mogućnost dodavanja do 20 klijenata i fizičkih lica',
      'Prijave/odjake radika, izrada JS3000 obrasca',
      'Obračun plata i doprinosa za vlasnika obrta i zaposlene',
      'Generisanje uplatnica za plate i doprinose',
    ],
    cta: 'Pretplati se na Pro',
    ctaStyle: 'white',
    variant: 'pro',
    tag: 'Najpopularnije',
    action: 'soon',
  },
  {
    tier: 'Business',
    price: '--,-- KM',
    period: 'godišnje / po korisniku',
    features: [
      'Sve iz Pro plana',
      'Upravljanje neograničenim brojem klijenata i fizičkih lica',
      'Višekorisnički pristup (tim)',
      'Ugovori o djelu i automatski obračun poreza i doprinosa',
      'Dodavanje radnika na klijente i automatsko popunjavanje obrazaca s njihovim podacima',
      'Prioritetna podrška',
    ],
    cta: 'Pretplati se na Business',
    ctaStyle: 'blue-white',
    variant: 'business',
    tag: 'Najbolja vrijednost',
    action: 'soon',
  },
];

export default function Pricing() {
  const [showModal, setShowModal] = useState(false);

  const handleCta = (action: Plan['action']) => {
    if (action === 'scroll') {
      document.getElementById('funkcije')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <section id="cijene" className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.label}>Pretplatnički paketi</div>
          <h2 className={styles.h2}>
            Transparentne cijene,<br /><em>bez iznenađenja</em>
          </h2>
          <p className={styles.intro}>Počnite besplatno. Nadogradite kada vam zatreba više.</p>

          <div className={styles.grid}>
            {PLANS.map((plan) => (
              <div
                key={plan.tier}
                className={`${styles.card} ${plan.variant === 'pro' ? styles.featuredPro : ''} ${plan.variant === 'business' ? styles.featuredBusiness : ''}`}
              >
                {plan.tag && <div className={styles.popularTag}>{plan.tag}</div>}
                <div className={styles.tier}>{plan.tier}</div>
                <div className={styles.price}>{plan.price}</div>
                <div className={styles.period}>{plan.period}</div>
                <div className={styles.divider} />
                <ul className={styles.features}>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button
                  className={`${styles.cta} ${plan.ctaStyle === 'outline' ? styles.outline : plan.ctaStyle === 'white' ? styles.white : styles.blueWhite}`}
                  onClick={() => handleCta(plan.action)}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showModal && <ComingSoonModal onClose={() => setShowModal(false)} />}
    </>
  );
}
