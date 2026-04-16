'use client';

import { useState } from 'react';
import styles from './Faq.module.css';

const FAQS = [
  {
    q: 'Da li su podaci sigurni?',
    a: 'Svi podaci su šifrirani i pohranjeni na sigurnim serverima. Nikada ne dijelimo vaše podatke s trećim stranama.',
  },
  {
    q: 'Da li su obrasci u skladu s važećim propisima?',
    a: 'Da. Aplikacija se redovno ažurira prema važećim propisima Federacije BiH. U slučaju izmjene zakona ili obrazaca, odmah ažuriramo sistem.',
  },
  {
    q: 'Mogu li koristiti aplikaciju bez registracije?',
    a: 'Apsolutno. SPR-1053, GPD-1051, preračun plate i PDV kalkulator su dostupni bez ikakve registracije.',
  },
  {
    q: 'Kako funkcioniše godišnja pretplata?',
    a: 'Pretplata se naplaćuje jednom godišnje i daje vam pristup svim premium funkcijama — prijave radnika, ugovori o radu i ugovori o djelu. Možete otkazati u bilo kom trenutku.',
  },
  {
    q: 'Da li mogu koristiti aplikaciju za više firmi/obrta?',
    a: 'Trenutno je svaki korisnički nalog vezan za jednu firmu/obrt. Podrška za više firmi/obrta po nalogu je u planu za buduće verzije.',
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (i: number) => setOpen(open === i ? null : i);

  return (
    <section id="faq" className={styles.section}>
      <div className={styles.label}>Česta pitanja</div>
      <h2 className={styles.h2}>
        Imate pitanja?<br /><em>Imamo odgovore.</em>
      </h2>
      <div className={styles.list}>
        {FAQS.map((item, i) => (
          <div key={i} className={styles.item}>
            <button
              className={`${styles.question} ${open === i ? styles.open : ''}`}
              onClick={() => toggle(i)}
            >
              {item.q}
            </button>
            {open === i && <div className={styles.answer}>{item.a}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
