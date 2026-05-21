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
    a: 'Apsolutno. SPR-1053, GPD-1051, ZO3 obrazac, ugovor o pozajmici, AMS obrazac, preračun plate i PDV kalkulator su dostupni bez ikakve registracije.',
  },
  {
    q: 'Kako da dodam novu djelatnost (obrt ili firmu)?',
    a: 'Nakon registracije i prijave, otvorite "Profil" iz gornjeg menija i u sekciji "Moje djelatnosti" kliknite "+ Nova djelatnost". Unesite osnovne podatke (naziv, JIB, adresa, kanton, općina) — ti podaci se kasnije auto-popunjavaju u svakom obrascu i obračunu plata.',
  },
  {
    q: 'Kako dodajem radnike i vlasnika obrta?',
    a: 'U sekciji "Aktivni radnici" odaberite djelatnost i kliknite "+ Novi radnik". Možete unijeti i radnika i vlasnika obrta — za vlasnika označite ulogu "Vlasnik" da se prepozna u obračunu plata i Obrazac 2002 generaciji. Podaci o radniku se zatim koriste u JS3100 obrascu, ugovorima o radu i mjesečnom obračunu plata bez ponovnog unosa.',
  },
  {
    q: 'Kako funkcioniše godišnja pretplata?',
    a: 'Pretplata se naplaćuje jednom godišnje i daje vam pristup svim premium funkcijama — prijave radnika, obračun plata, ugovori o radu i ugovori o djelu. Možete otkazati u bilo kom trenutku.',
  },
  {
    q: 'Da li mogu koristiti aplikaciju za više firmi/obrta?',
    a: 'Da, uz pretplatu. Omogućava vam da kreirate i upravljate neograničenim brojem firmi, obrta i fizičkih lica unutar jednog naloga. Knjigovođe mogu pozivati klijente da im daju pristup vlastitim djelatnostima.',
  },
  {
    q: 'Mogu li dijeliti pristup djelatnosti sa svojim knjigovođom?',
    a: 'Da. Na stranici djelatnosti otvorite "Članovi" i pozovite knjigovođu putem email-a. Možete im dodijeliti ulogu "Pregled" ili "Uređivanje" — knjigovođa tada vidi vaše podatke u svom nalogu i može generisati obrasce i obračune u vaše ime.',
  },
  {
    q: 'Kako se generišu uplatnice za uplatu obaveza u banku?',
    a: 'U sekciji "Obračun plata" nakon klika "Obračunaj sve" za odabrani mjesec, otvara se "Pregled mjeseca" sa svim zbirnim uplatnicama — PIO/MIO, zdravstvo (kantonalno i federalno), nezaposlenost, porez na dohodak, vodna naknada i naknada za nesreće. Kliknite "Preuzmi uplatnice" za jedan kombinovani PDF spreman za banku.',
  },
  {
    q: 'Čuvaju li se podaci iz prethodnih mjeseci?',
    a: 'Da. Svi mjesečni obračuni, radnici, organizacije i generisani obrasci ostaju u vašem profilu. Možete se vratiti na bilo koji prethodni mjesec, ponovo preuzeti dokumente ili kopirati podatke u novi obračun.',
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
