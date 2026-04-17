import type { Metadata } from "next";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Uvjeti korištenja — Porezni Kalkulator BiH",
  description:
    "Uvjeti korištenja platforme Porezni Kalkulator BiH. Pročitajte pravila i odgovornosti vezane za korištenje naših besplatnih poreznih alata.",
  alternates: { canonical: "https://poreznikalkulator.ba/uvjeti" },
};

export default function UvjetiPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Pravni dokumenti</div>
        <h1 className={styles.h1}>Uvjeti <em>korištenja</em></h1>
        <p className={styles.lead}>
          Molimo vas da pažljivo pročitate ove uvjete prije korištenja platforme.
        </p>
      </div>

      <div className={styles.body}>
        <p className={styles.updated}>Zadnje ažuriranje: april 2026.</p>

        <h2>1. Prihvatanje uvjeta</h2>
        <p>
          Korištenjem web stranice poreznikalkulator.ba ("Platforma") prihvatate ove Uvjete korištenja u cijelosti.
          Ukoliko se ne slažete s bilo kojim dijelom ovih uvjeta, molimo vas da prestanete koristiti Platformu.
        </p>

        <h2>2. Opis usluge</h2>
        <p>
          Porezni Kalkulator BiH pruža besplatne online alate za porezne kalkulacije, izradu obrazaca i ugovora
          namijenjene korisnicima u Federaciji Bosne i Hercegovine. Usluga se pruža "kakva jest" i isključivo je
          informativnog karaktera.
        </p>

        <h2>3. Informativni karakter sadržaja</h2>
        <p>
          Sav sadržaj na Platformi, uključujući kalkulacije, obrasce i tekstove, pruža se isključivo u
          informativne svrhe i ne predstavlja pravni, porezni ni računovodstveni savjet. Porezni Kalkulator BiH
          ne snosi odgovornost za eventualne greške, netačnosti ili zastarjele informacije. Za specifične
          situacije preporučujemo konsultaciju s ovlaštenim stručnjakom.
        </p>

        <h2>4. Korištenje platforme</h2>
        <p>Korisnik se obavezuje da neće:</p>
        <ul>
          <li>koristiti Platformu u protupravne svrhe ili na način koji je zabranjen ovim uvjetima</li>
          <li>pokušavati neovlašteno pristupiti bilo kom dijelu Platforme ili njenim serverima</li>
          <li>distribuirati zlonamjerni softver putem Platforme</li>
          <li>ometati ili narušavati integritet ili rad Platforme</li>
          <li>prikupljati osobne podatke drugih korisnika bez njihovog pristanka</li>
        </ul>

        <h2>5. Intelektualno vlasništvo</h2>
        <p>
          Sav sadržaj Platforme, uključujući tekst, grafiku, logotipe, ikone i softver, vlasništvo je Porezni
          Kalkulator BiH ili njegovih davalaca licence i zaštićen je primjenjivim zakonima o autorskim pravima.
          Zabranjeno je reproduciranje, distribucija ili stvaranje izvedenih djela bez izričitog pisanog odobrenja.
        </p>

        <h2>6. Ograničenje odgovornosti</h2>
        <p>
          U mjeri dozvoljenoj važećim zakonom, Porezni Kalkulator BiH ne odgovara za direktnu, indirektnu,
          slučajnu, posebnu ili posljedičnu štetu koja nastane iz korištenja ili nemogućnosti korištenja Platforme,
          uključujući ali ne ograničavajući se na greške u kalkulacijama ili obrascu.
        </p>

        <h2>7. Oglašavanje</h2>
        <p>
          Platforma može prikazivati oglase trećih strana putem Google AdSense programa. Porezni Kalkulator BiH
          ne kontrolira sadržaj tih oglasa i ne snosi odgovornost za njih. Klikanjem na oglas korisnik napušta
          Platformu i podliježe uvjetima oglašivača.
        </p>

        <h2>8. Veze prema trećim stranama</h2>
        <p>
          Platforma može sadržavati veze prema web stranicama trećih strana. Ove veze pružaju se isključivo radi
          praktičnosti i ne podrazumijevaju odobravanje ili preuzimanje odgovornosti za sadržaj tih stranica.
        </p>

        <h2>9. Izmjene uvjeta</h2>
        <p>
          Zadržavamo pravo izmjene ovih Uvjeta u bilo koje vrijeme. Izmjene stupaju na snagu objavom na ovoj
          stranici. Nastavak korištenja Platforme nakon objave izmjena smatra se prihvatanjem novih uvjeta.
        </p>

        <h2>Kontakt</h2>
        <p>
          Za pitanja u vezi s ovim Uvjetima kontaktirajte nas na:{" "}
          <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>
        </p>
      </div>
    </div>
  );
}
