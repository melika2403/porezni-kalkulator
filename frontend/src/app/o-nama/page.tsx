import type { Metadata } from "next";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "O nama",
  description:
    "Porezni Kalkulator BiH je online platforma za poduzetnike, obrtnike i računovođe u FBiH, porezni obrasci, ugovori, evidencije radnika i šifre djelatnosti.",
  alternates: { canonical: "https://www.poreznikalkulator.ba/o-nama" },
};

export default function ONamaPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>O nama</div>
        <h1 className={styles.h1}>
          Porezni Kalkulator <em>BiH</em>
        </h1>
        <p className={styles.lead}>
          Online platforma za poduzetnike, obrtnike, freelancere i računovođe u Federaciji Bosne i
          Hercegovine, od prvog kalkulatora do kompletnog vođenja klijenata.
        </p>
      </div>

      <div className={styles.body}>
        <h2>Šta je Porezni Kalkulator BiH?</h2>
        <p>
          Porezni Kalkulator BiH je online platforma namijenjena fizičkim i pravnim licima koja
          obavljaju privrednu djelatnost u Federaciji BiH. Nudi skup praktičnih alata koji
          olakšavaju svakodnevne porezne, ugovorne i računovodstvene obaveze, bez instaliranja
          softvera, sa automatskim popunjavanjem obrazaca iz vašeg profila i mogućnošću vođenja
          više klijenata istovremeno.
        </p>

        <h2>Naša misija</h2>
        <p>
          Vjerujemo da pristup jasnim i tačnim poreznim alatima treba biti dostupan svima, od
          freelancera koji prvi put otvara obrt, do iskusnih računovodstvenih agencija s desetinama
          klijenata. Naša misija je da papirologiju u FBiH učinimo bržom, tačnijom i jeftinijom.
        </p>

        <h2>Šta nudimo?</h2>

        <h3>Besplatni alati</h3>
        <ul>
          <li>
            <strong>Šifre djelatnosti FBiH</strong>, kompletna lista šifri prema KD BiH 2010 (NACE
            Rev. 2), sa detaljnim opisima i pretragom
          </li>
          <li>
            <strong>PDV kalkulator</strong>, preračun cijene sa i bez PDV-a, prikaz u KM i EUR
          </li>
          <li>
            <strong>Preračun neto ↔ bruto plate</strong>, obračun doprinosa, poreza na dohodak i
            osnovnog ličnog odbitka po važećim stopama u FBiH
          </li>
          <li>
            <strong>SPR-1053</strong>, specifikacija dohotka od samostalne djelatnosti
          </li>
          <li>
            <strong>GPD-1051</strong>, godišnja porezna prijava
          </li>
          <li>
            <strong>ZO3</strong>, prijava člana porodice na zdravstveno osiguranje
          </li>
          <li>
            <strong>AMS-1035</strong>, akontacija poreza po odbitku
          </li>
          <li>
            <strong>Ugovor o pozajmici</strong>, Word/PDF predložak
          </li>
          <li>
            <strong>Stalna sredstva i amortizacija</strong>, vođenje OS i automatski godišnji
            obračun
          </li>
          <li>
            <strong>Šihterica</strong>, mjesečna evidencija radnog vremena radnika
          </li>
        </ul>

        <h3>Pro pretplata (30 dana besplatno)</h3>
        <p>
          Pro pretplata donosi <strong>automatsku popunu svih obrazaca i ugovora</strong> iz
          podataka vašeg profila (firma/obrt, JIB, adresa, podaci o vlasniku i radnicima), više ne
          morate ručno upisivati iste podatke svaki put. Pored toga, Pro otključava:
        </p>
        <ul>
          <li>
            <strong>JS3100</strong>, prijava, odjava i promjena podataka radnika online
          </li>
          <li>
            <strong>Ugovor o djelu</strong>, predložak + automatski obračun poreza i uplatnice
          </li>
          <li>
            <strong>Fakture i predračuni</strong>, generator faktura s redoslijednim brojevima,
            čuvanjem za sljedeći put i izvozom u PDF
          </li>
          <li>
            <strong>Generator članskih kartica</strong>, kartice s QR kodom, pojedinačno ili bulk
            import iz Excel-a
          </li>
        </ul>

        <h3>Business pretplata</h3>
        <p>
          Business uključuje sve iz Pro paketa, a dodatno omogućava:
        </p>
        <ul>
          <li>
            <strong>Ugovor o radu i otkaz</strong>, predlošci u Word i PDF formatu, usklađeni sa
            Zakonom o radu FBiH
          </li>
          <li>
            <strong>Aktivni radnici</strong>, centralni pregled radnika sa statusom prijave,
            podataka za platu i ugovor
          </li>
          <li>
            <strong>Vođenje klijenata</strong>, fizička i pravna lica iz jednog naloga, idealno za
            računovodstvene agencije i knjigovođe
          </li>
          <li>Brzo prebacivanje konteksta, radite za bilo kojeg klijenta jednim klikom</li>
        </ul>

        <h2>Pretplatnički paketi</h2>
        <p>
          Aplikacija se koristi po modelu pretplate: <strong>Free</strong> (besplatno, brzi alati i
          preview svih dokumenata), <strong>Pro</strong> (puno korištenje obrazaca i ugovora,{" "}
          <strong>30 dana besplatno</strong> bez kartice) i <strong>Business</strong> (Pro + vođenje
          klijenata, ugovor o radu, aktivni radnici). Detaljan pregled paketa i cijena dostupan je
          na stranici <Link href="/pretplate">Pretplate</Link>.
        </p>

        <h2>Tačnost podataka</h2>
        <p>
          Sve stope doprinosa, porezni odbici i obrasci ažuriraju se u skladu s važećim propisima
          Federacije BiH. Sadržaj platforme je informativnog karaktera i ne zamjenjuje savjet
          ovlaštenog poreznog savjetnika ili računovođe. Za specifične porezne situacije
          preporučujemo konsultaciju sa stručnjakom.
        </p>

        <h2>Kontakt</h2>
        <p>
          Za pitanja, prijedloge, prijavu grešaka ili poslovnu saradnju možete nas kontaktirati
          putem stranice <Link href="/kontakt">Kontakt</Link> ili direktno na{" "}
          <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>.
        </p>
      </div>
    </div>
  );
}
