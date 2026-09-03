"use client";

import Link from "next/link";
import styles from "./freelancer.module.css";

// Uputstvo za PK Freelancer: isti sadržaj vide gost na landingu i prijavljeni
// korisnik u tabu Uputstvo. Rokovi su stvarni: AMS-1035 u roku od 5 dana od
// primitka, GPD-1051 do 31. marta za prethodnu godinu.

type Korak = { naslov: string; tekst: React.ReactNode };

const KORACI: Korak[] = [
  {
    naslov: "Unesite uplatu čim novac legne",
    tekst: (
      <>
        Otvorite <Link href="/ams">AMS generator</Link>, unesite iznos, datum
        primitka i isplatioca, pa preuzmite obrazac. Uplata se tim preuzimanjem
        sama upisuje u evidenciju, bez posebnog klika. Uplate od ranije u godini
        unosite kroz <strong>Ručni unos uplate</strong> u tabu Uplate, obračun
        se računa isto. Uz paket se Dio 1 (ime, JMBG, adresa) popuni sam iz
        vaših podataka u tabu Postavke.
      </>
    ),
  },
  {
    naslov: "Preuzmite obrazac i tri uplatnice",
    tekst: (
      <>
        AMS-1035 štampate u dva primjerka. Uz njega idu tri uplatnice: doprinos
        za zdravstveno kantonalnom zavodu (89,8%), doprinos Zavodu zdravstvenog
        osiguranja i reosiguranja FBiH (10,2%) i porez na dohodak kantonalnom
        budžetu. Za uplatnice u obrascu birate kanton i općinu prebivališta.
      </>
    ),
  },
  {
    naslov: "Platite i predajte u roku od 5 dana",
    tekst: (
      <>
        Rok teče od dana primitka uplate. Platite uplatnice, pa obrazac sa
        dokazima o uplati odnesite u nadležnu poreznu ispostavu prema mjestu
        prebivališta, ili ga predajte elektronski ako imate kvalifikovani
        digitalni certifikat. Evidencija računa rok za svaku uplatu, a paket
        šalje podsjetnik na email dan prije roka i na dan roka.
      </>
    ),
  },
  {
    naslov: "Označite predano, pa predano i plaćeno",
    tekst: (
      <>
        U tabu Uplate status birate iz padajućeg izbornika: obračunato, predano
        (obrazac ste predali Poreznoj upravi) i predano i plaćeno (uplatili ste i
        porez sa doprinosom). To nije kozmetika: rok od 5 dana prati samo
        obračunate uplate, a u godišnju prijavu ulazi samo porez sa uplata
        označenih kao predano i plaćeno.
      </>
    ),
  },
  {
    naslov: "Sačuvajte dokaze uz uplatu",
    tekst: (
      <>
        Uz svaku uplatu, pod Prilozi, stoji slika ovjerenog AMS-a sa šaltera i
        dokaz o uplati iz banke. Tu su kad porezna zatraži, i kad vam trebaju
        godinama kasnije.
      </>
    ),
  },
  {
    naslov: "Pratite godinu i ponovite isplatioce",
    tekst: (
      <>
        Tab Pregled daje bruto, zdravstveno, porez i neto po mjesecima i za
        cijelu godinu, uz spisak otvorenih rokova. Isplatioce koji se ponavljaju
        sačuvate u tabu Isplatioci, pa Dio 2 obrasca popunjavate jednim klikom.
      </>
    ),
  },
  {
    naslov: "Upišite koeficijent sa porezne kartice",
    tekst: (
      <>
        U tabu Postavke upišite koeficijent ličnog odbitka sa svoje porezne
        kartice PK-1001. Osnovni odbitak je 300 KM mjesečno (koeficijent 1,00),
        a izdržavani članovi ga uvećavaju. Ako niste sigurni koliki je vaš,
        izračunajte ga u <Link href="/porezna-kartica">obrascu porezne kartice</Link>.
        Godišnji odbitak se računa sam i ulazi u red 18 obrasca GPD-1051. Mjesece
        smanjite samo ako kartica nije važila cijelu godinu. U istim postavkama
        upišite i kanton i općinu prebivališta: AMS generator i ručni unos ih
        onda predpopune, pa ih ne birate kod svake uplate.
      </>
    ),
  },
  {
    naslov: "U martu predajte GPD-1051",
    tekst: (
      <>
        Godišnja prijava se predaje do 31. marta za prethodnu kalendarsku
        godinu. Iz taba Godišnji pregled i GPD otvarate{" "}
        <Link href="/gpd">obrazac GPD-1051</Link> popunjen iz evidencije:
        osnovica sa AMS obrazaca (red 13, dohodak poslije normiranih rashoda i
        poslije doprinosa za zdravstveno), lični odbitak iz vašeg koeficijenta
        (red 18) i plaćeni porez po odbitku (red 28). Zato je za honorare porez
        na GPD-u jednak već plaćenom porezu i ne doplaćujete ništa. Doprinos za
        zdravstveno se posebno ne upisuje u GPD, evidencija ga vodi samo da
        znate koliko ste uplatili. Ostale izvore dohotka, plaću kod poslodavca
        ili najam, dodajete ručno.
      </>
    ),
  },
  {
    naslov: "Rokovi u vašem kalendaru, arhiva na kraju godine",
    tekst: (
      <>
        Tab Kalendar prikazuje sve rokove u godini, predaju svakog AMS-a i GPD u
        martu, i jednim klikom ih dodaje u Google, iPhone ili Outlook kalendar sa
        podsjetnikom dan prije. Na kraju godine, iz taba Godišnji pregled i GPD,
        preuzmete godišnju arhivu: jedan ZIP sa svim AMS obrascima, uplatnicama,
        prilozima, pregledom prihoda i Excel tabelom, za knjigovođu ili kontrolu.
        Tabelu uplata možete izvesti u Excel i iz taba Uplate. Priloge na telefonu
        slikate direktno kamerom, dugme Slikaj telefonom.
      </>
    ),
  },
  {
    naslov: "Potvrdu o prihodima preuzmete kad zatreba",
    tekst: (
      <>
        Pregled prihoda (PDF) u tabu Pregled daje sve uplate u godini sa
        zbirovima i vašim podacima, za banku, ambasadu ili stanodavca. Nije
        zvanična potvrda Porezne uprave: dokaz ostaju ovjereni AMS obrasci i
        uplatnice iz arhive.
      </>
    ),
  },
];

export default function FreelancerUputstvo() {
  return (
    <section className={styles.uputstvo}>
      <h2 className={styles.sectionTitle}>
        Kako radi, <em>korak po korak</em>
      </h2>
      <ol className={styles.uputstvoLista}>
        {KORACI.map((k, i) => (
          <li key={k.naslov} className={styles.uputstvoKorak}>
            <span className={styles.uputstvoNo} aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h3>{k.naslov}</h3>
              <p>{k.tekst}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.uputstvoNapomena}>
        Generator AMS-1035 obrasca i uplatnica ostaje besplatan i bez
        registracije. Evidencija, podsjetnici, GPD iz evidencije, pregled
        prihoda i arhiva priloga su dio paketa PK Freelancer.
      </p>
    </section>
  );
}
