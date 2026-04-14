import styles from './HowItWorks.module.css';

const STEPS = [
  {
    num: '01',
    title: 'Odaberite alat',
    desc: 'SPR obrazac, obračun plate, PDV ili stalna sredstva — sve je dostupno s jednog dashboarda.',
  },
  {
    num: '02',
    title: 'Unesite podatke',
    desc: 'Jednostavni formulari s jasnim uputama. Podatke iz prošle godine možete učitati jednim klikom.',
  },
  {
    num: '03',
    title: 'Preuzmite ili ispišite',
    desc: 'Popunjeni obrazac, ugovor ili obračun je spreman za ispis ili preuzimanje u PDF/Excel formatu.',
  },
  {
    num: '04',
    title: 'Podatci su sačuvani',
    desc: 'Uz registraciju, svi vaši podaci su sigurno pohranjeni i dostupni iduće godine.',
  },
];

export default function HowItWorks() {
  return (
    <section id="kako" className={styles.section}>
      <div className={styles.label}>Kako radi</div>
      <h2 className={styles.h2}>
        Jednostavno kao<br /><em>jedan, dva, tri</em>
      </h2>
      <div className={styles.steps}>
        {STEPS.map((step) => (
          <div key={step.num}>
            <div className={styles.num}>{step.num}</div>
            <div className={styles.title}>{step.title}</div>
            <div className={styles.desc}>{step.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
