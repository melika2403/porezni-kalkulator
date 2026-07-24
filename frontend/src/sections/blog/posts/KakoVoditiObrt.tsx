import Link from "next/link";
import styles from "../blog.module.css";
import { PkOfficeCta } from "../BlogCta";

export default function KakoVoditiObrt() {
  return (
    <>
      <p className={styles.lead}>
        Otvoriti obrt u FBiH je relativno jednostavno, ali pravilno ga
        voditi je ono što razdvaja miran san od panike pred inspekcijom.
        Obrtnik u stvarnom režimu ima jasno propisane knjige, mjesečne
        uplate i godišnje obrasce, i sve to stane u jedan uredan sistem
        kad se zna redoslijed. U ovom vodiču prolazimo kroz sve što se od
        obrta očekuje: koje knjige se vode, šta se plaća mjesečno, kako sa
        radnicima, šta uraditi na kraju godine i koje greške najčešće
        koštaju.
      </p>

      <p>
        Ako obrt tek planirate otvoriti, prvo pročitajte naš vodič{" "}
        <Link href="/blog/otvaranje-obrta-fbih-korak-po-korak">
          otvaranje obrta u FBiH korak po korak
        </Link>
        : svi potrebni dokumenti, takse i redoslijed registracije, korak po
        korak. Ovaj članak nastavlja tamo gdje taj staje, od prvog dana
        rada.
      </p>

      <h2>1. Knjiga prihoda i rashoda (KPR-1041): temelj svega</h2>
      <p>
        Obrtnik u stvarnom režimu obavezno vodi <strong>Knjigu prihoda i
        rashoda (obrazac KPR-1041)</strong>. U nju hronološki ulaze svi
        poslovni prihodi (naplata preko računa, pazar u gotovini, prihod u
        stvarima i uslugama) i svi priznati rashodi (roba i materijal,
        plate, doprinosi, režije, ostali troškovi). Na kraju godine razlika
        prihoda i rashoda je osnovica za porez na dohodak.
      </p>
      <ul>
        <li>
          <strong>Prihod se knjiži po naplati</strong>, ne po izdavanju
          fakture (princip blagajne). Faktura izdana u decembru a naplaćena
          u januaru je prihod januara.
        </li>
        <li>
          <strong>Rashod mora imati dokument</strong>: račun dobavljača,
          izvod, obračun plate. Bez papira nema priznatog troška, detaljnije
          u članku{" "}
          <Link href="/blog/priznati-rashodi-obrta-2026">
            šta sve može u trošak obrta
          </Link>
          .
        </li>
        <li>
          KPR se vodi uredno i ažurno; u praksi to znači da se knjiži čim
          stigne izvod, a ne jednom godišnje u martu.
        </li>
      </ul>

      <h2>2. Bankovni izvod: izvor istine</h2>
      <p>
        Skoro sve što se dešava u obrtu prije ili kasnije prođe kroz žiro
        račun: naplate faktura, polog pazara, plaćanja dobavljačima, uplate
        doprinosa i poreza, bankarske provizije. Zato je najzdravija navika
        u vođenju obrta: <strong>svaki izvod se obradi čim stigne</strong>.
        Svaka stavka dobije svoju kategoriju (prihod, roba, režije, javni
        prihodi...), pa KPR praktično nastaje sam od sebe, a stanje računa
        se uvijek zna.
      </p>
      <p>
        Izvode čuvajte hronološki i bez rupa: izvodi se numerišu redom
        (br. 1, 2, 3...) i završno stanje jednog mora biti početno stanje
        sljedećeg. Rupa u nizu je prvi znak da nešto nije proknjiženo.
      </p>

      <h2>3. Fakture: numeracija i naplata</h2>
      <p>
        Fakture se izdaju sa neprekinutom numeracijom po godini (1/26,
        2/26...), sa jasnim podacima obrta (naziv, adresa, ID broj, žiro
        račun) i kupca. Za gotovinski promet je tu fiskalni račun sa kase, a
        fakture idu za bezgotovinsku naplatu. Dvije stvari koje se najčešće
        zapuste:
      </p>
      <ul>
        <li>
          <strong>Praćenje naplate</strong>: izdana faktura nije prihod dok
          nije naplaćena, ali jeste potraživanje. Vodite listu otvorenih
          faktura i šaljite opomene prije nego što dug zastari.
        </li>
        <li>
          <strong>Ulazni računi</strong>: račune dobavljača knjižite čim
          stignu, sa rokom plaćanja. Tako uvijek znate i svoj dug i čiji
          novac čekate.
        </li>
      </ul>

      <h2>4. Mjesečne obaveze vlasnika: doprinosi i akontacija poreza</h2>
      <p>
        Vlasnik obrta sam sebi plaća <strong>doprinose</strong> (PIO,
        zdravstvo, nezaposlenost) na propisanu osnovicu, svakog mjeseca, do
        10. u mjesecu za prethodni mjesec, uz specifikaciju{" "}
        <Link href="/spr">obrazac 2001 / uplatnice</Link>. Uz to ide i{" "}
        <strong>mjesečna akontacija poreza na dohodak</strong>, određena
        rješenjem Porezne uprave na osnovu prošlogodišnjeg SPR-a.
      </p>
      <ul>
        <li>Doprinosi vlasnika se plaćaju i kad obrt taj mjesec nema prihoda.</li>
        <li>
          Uplate idu na tačno propisane račune javnih prihoda po kantonu;
          pogrešan račun znači neproknjiženu uplatu i kamate.
        </li>
        <li>Sačuvajte svaku uplatnicu: to je i rashod u KPR-u.</li>
      </ul>

      <h2>5. Radnici: prijava, plata, šihterica</h2>
      <p>
        Ako obrt ima radnike, uz plate ide cijeli paket obaveza:
      </p>
      <ul>
        <li>
          <strong>Prijava radnika</strong> (JS3100) prije početka rada,
          ugovor o radu najkasnije dan prije.
        </li>
        <li>
          <strong>Mjesečni obračun plate</strong>: bruto, doprinosi 31% iz
          plate + doprinosi na platu, porez 10% nakon ličnog odbitka.
          Formula i primjeri su u članku{" "}
          <Link href="/blog/kako-se-racuna-neto-plata-fbih">
            kako se računa neto plata
          </Link>
          , a ukupan trošak u{" "}
          <Link href="/blog/koliko-kosta-radnik-poslodavca-fbih">
            koliko košta radnik poslodavca
          </Link>
          .
        </li>
        <li>
          <strong>MIP-1023</strong> se predaje Poreznoj upravi za svaki
          mjesec isplate plate.
        </li>
        <li>
          <strong>Šihterica</strong> (evidencija radnog vremena) je zakonska
          obaveza i osnova za obračun: prisustva, godišnji, bolovanja.
        </li>
        <li>
          Topli obrok, prevoz i regres su neoporezivi do propisanih iznosa
          (vidi{" "}
          <Link href="/blog/topli-obrok-regres-fbih-2026">
            topli obrok i regres
          </Link>
          ).
        </li>
      </ul>

      <h2>6. Gotovina i blagajna</h2>
      <p>
        Gotovinski promet ide preko fiskalne kase, a pazar se redovno
        polaže na žiro račun. Ako u obrtu postoji gotovinska kasa
        (plaćanja i naplate u kešu), vodi se <strong>blagajnički
        dnevnik</strong>: nalozi za naplatu i isplatu, dnevni saldo koji
        nikad ne smije biti u minusu i interni blagajnički maksimum.
      </p>

      <h2>7. PDV: samo ako ste obveznik</h2>
      <p>
        Ulaskom u sistem PDV-a (obavezno preko 100.000 KM godišnjeg
        prometa, detalji u članku{" "}
        <Link href="/blog/pdv-obveznik-prag-100000-km">prag 100.000 KM</Link>
        ) obrt dobija novi mjesečni ritam: <strong>KIF i KUF</strong>{" "}
        (knjige izlaznih i ulaznih faktura), <strong>PDV prijava do 10. u
        mjesecu</strong> za prethodni mjesec i e-podnošenje kod UINO. PDV
        se tada iskazuje na svakoj fakturi, a ulazni PDV sa računa
        dobavljača se odbija.
      </p>

      <h2>8. Kraj godine: SPR, GPD i amortizacija</h2>
      <ul>
        <li>
          <strong>Popis (inventura)</strong> robe i materijala na 31.12. za
          obrte koji drže zalihe.
        </li>
        <li>
          <strong>Amortizacija</strong>: oprema i stalna sredstva se ne
          troše odjednom nego kroz godišnji obračun (PLDI-1043).
        </li>
        <li>
          <strong>SPR-1053</strong>: specifikacija prihoda i rashoda iz
          KPR-a, podnosi se do <strong>31.03.</strong> za prethodnu godinu.
        </li>
        <li>
          <strong>GPD-1051</strong>: godišnja prijava poreza na dohodak,
          isti rok, na osnovu SPR-a (vodič:{" "}
          <Link href="/blog/gpd-1051-korak-po-korak">
            GPD-1051 korak po korak
          </Link>
          ).
        </li>
        <li>
          Po rješenju za novu godinu kreću nove mjesečne akontacije.
        </li>
      </ul>

      <h2>Kalendar rokova koji vrijedi zalijepiti na zid</h2>
      <ul>
        <li>
          <strong>Do 10. u mjesecu:</strong> doprinosi i akontacija poreza
          vlasnika za prethodni mjesec; PDV prijava (obveznici).
        </li>
        <li>
          <strong>Uz svaku isplatu plata:</strong> doprinosi i porez na
          plate + MIP-1023.
        </li>
        <li>
          <strong>31.12.:</strong> popis zaliha, presjek kartica kupaca i
          dobavljača.
        </li>
        <li>
          <strong>31.03.:</strong> SPR-1053 i GPD-1051 za prethodnu godinu.
        </li>
      </ul>

      <h2>Najčešće greške u vođenju obrta</h2>
      <ul>
        <li>
          <strong>Knjiženje jednom godišnje.</strong> KPR koji se
          rekonstruiše u martu iz kutije papira uvijek ima rupe, a rupe se
          na kontroli tumače na štetu obveznika.
        </li>
        <li>
          <strong>Miješanje privatnog i poslovnog novca.</strong> Privatna
          potrošnja sa poslovnog računa nije rashod; vodite je kao
          izuzimanje vlasnika.
        </li>
        <li>
          <strong>Trošak bez dokumenta.</strong> Nema računa, nema rashoda.
        </li>
        <li>
          <strong>Zaboravljena naplata stare fakture.</strong> Naplata je
          prihod u momentu naplate, i mora u KPR i kad je faktura iz prošle
          godine.
        </li>
        <li>
          <strong>Pogrešni računi javnih prihoda.</strong> Kantonalni računi
          se razlikuju; uplata na pogrešan račun se ne priznaje sama od
          sebe.
        </li>
      </ul>

      <h2>Kako sve ovo držati pod kontrolom</h2>
      <p>
        Redoslijed koji radi u praksi: izvod se učita čim stigne, svaka
        stavka dobije kategoriju, fakture i ulazni računi se knjiže isti
        dan kad nastanu, plate se obračunaju do 10. u mjesecu, a kraj
        godine je onda samo zbir već urednih knjiga. To se može voditi
        ručno u sveskama i tabelama, ali 2026. za to postoje programi koji
        veći dio posla odrade sami.
      </p>

      <PkOfficeCta />
    </>
  );
}
