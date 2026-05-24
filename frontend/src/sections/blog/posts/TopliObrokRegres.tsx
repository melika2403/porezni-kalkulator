import Link from "next/link";
import styles from "../blog.module.css";

export default function TopliObrokRegres() {
  return (
    <>
      <p className={styles.lead}>
        Topli obrok, regres i drugi neoporezivi dodaci na platu su zakonsko
        pravo radnika u FBiH i istovremeno način da poslodavac dodatno
        nagradi radnika bez plaćanja poreza i doprinosa. Ali iznosi su
        ograničeni propisanim maksimumima, iznad kojih sve postaje
        oporezivo kao redovan dohodak. U ovom članku objašnjavamo aktuelne
        neoporezive iznose za 2026. i kako ih pravilno obračunati.
      </p>

      <h2>Topli obrok (naknada za ishranu u toku rada)</h2>
      <p>
        Pravo radnika na toplji obrok je zakonsko (čl. 67 ZoR FBiH) i
        obavezno se isplaćuje za svaki dan kad radnik radi puno radno
        vrijeme. Neoporeziv je do propisanog dnevnog maksimuma.
      </p>

      <h3>Iznos za 2026.</h3>
      <ul>
        <li>
          <strong>Dnevni maksimum:</strong> do <strong>1% prosječne neto
          plate isplaćene u FBiH</strong> (prema posljednjem podatku Zavoda
          za statistiku FBiH)
        </li>
        <li>
          <strong>Praktično:</strong> oko 17 KM po radnom danu za 2026.
          (prosječna neto plata FBiH ~1.700 KM × 1% = 17 KM)
        </li>
        <li>
          <strong>Minimum:</strong> propisani minimum je oko 5,55 KM dnevno
        </li>
      </ul>
      <p>
        Za prosječno 21 radni dan u mjesecu, topli obrok mjesečno iznosi
        oko <strong>357 KM po radniku</strong> (neoporezivo).
      </p>

      <h3>Šta ako se isplaćuje iznad maksimuma?</h3>
      <p>
        Iznos iznad propisanog dnevnog maksimuma se smatra dijelom redovne
        plate i oporezuje se kao bruto plata: doprinosi iz 31%, porez na
        dohodak 10% itd. Drugim riječima, ako date 25 KM dnevno (umjesto
        max 17 KM), višak od 8 KM se oporezuje kao da je dio plate.
      </p>

      <h3>Kako se obračunava i isplaćuje</h3>
      <ul>
        <li>
          Topli obrok se obračunava na osnovu evidencije radnih dana
          (šihtericа)
        </li>
        <li>
          Isplaćuje se mjesečno, najčešće zajedno sa platom
        </li>
        <li>
          Mora biti odvojeno iskazan na platnom listiću (NE se uračunava u
          neto platu)
        </li>
        <li>
          Za dane bolovanja, godišnjeg odmora i sl., topli obrok se NE
          isplaćuje (osim ako kolektivni ugovor drugačije propisuje)
        </li>
      </ul>
      <p>
        Naša aplikacija za{" "}
        <Link href="/prijave-radnika?tab=obracun">obračun plata</Link>{" "}
        automatski računa topli obrok na osnovu broja radnih dana iz{" "}
        <Link href="/sihterica">šihterice</Link>.
      </p>

      <h2>Regres za godišnji odmor</h2>
      <p>
        Regres je jednokratna godišnja naknada koja se isplaćuje radniku
        povodom korištenja godišnjeg odmora. Regulisan članom 71 ZoR FBiH.
      </p>

      <h3>Iznos za 2026.</h3>
      <ul>
        <li>
          <strong>Neoporezivi maksimum:</strong> do{" "}
          <strong>
            50% prosječne neto plate isplaćene u FBiH u posljednja 3 mjeseca
          </strong>{" "}
          prije isplate regresa
        </li>
        <li>
          <strong>Praktično:</strong> oko 850 KM za 2026. (prosječna neto
          plata FBiH ~1.700 KM × 50% = 850 KM)
        </li>
        <li>
          <strong>Minimum nije zakonom propisan</strong> (ali kolektivni
          ugovori ga mogu propisati)
        </li>
      </ul>

      <h3>Kada se isplaćuje</h3>
      <p>
        Tipično prije ili tokom korištenja godišnjeg odmora (ljeto). Ako
        radnik radi manje od pune godine, regres se proporcionalno smanjuje.
      </p>

      <h3>Iznad maksimuma se oporezuje</h3>
      <p>
        Ako isplatite regres veći od 50% prosječne neto plate FBiH (za
        2026. oko 850 KM), višak se oporezuje kao redovan dohodak.
      </p>

      <h2>Putni trošak (naknada za dolazak na posao)</h2>
      <p>
        Naknada za prevoz na posao i sa posla je neoporeziva u sljedećim
        oblicima:
      </p>
      <ul>
        <li>
          <strong>Refundacija po stvarnoj cijeni karte</strong> javnog
          prevoza (mjesečna karta, dnevne karte)
        </li>
        <li>
          <strong>Naknada za vlastiti automobil</strong>: oko 0,30-0,40
          KM/km za rastojanje od stana do posla
        </li>
        <li>
          <strong>Organizovani prevoz od strane poslodavca</strong> (bus,
          službeni automobil): trošak je u potpunosti rashod firme
        </li>
      </ul>
      <p>
        Naknada za putni trošak NE smije se uračunavati u minimalnu platu,
        mora biti odvojeno iskazana na platnom listiću.
      </p>

      <h2>Druge neoporezive naknade</h2>

      <h3>Dnevnice za službena putovanja</h3>
      <ul>
        <li>U zemlji: do 25 KM dnevno (neoporezivo)</li>
        <li>U inostranstvu: prema propisima FBiH (varira po zemljama)</li>
        <li>Trebaju putni nalog i račune za smještaj</li>
      </ul>

      <h3>Otpremnina za penziju</h3>
      <ul>
        <li>Neoporeziva do iznosa 3 prosječne neto plate FBiH</li>
        <li>
          Isplaćuje se radniku koji odlazi u penziju kao priznanje za godine
          rada
        </li>
      </ul>

      <h3>Solidarna pomoć</h3>
      <ul>
        <li>U slučaju smrti člana porodice: do 2 prosječne neto plate FBiH</li>
        <li>U slučaju teške bolesti radnika ili člana porodice: do limita</li>
        <li>U slučaju elementarnih nepogoda</li>
      </ul>

      <h3>Pokloni i prigodne nagrade radnicima</h3>
      <ul>
        <li>
          <strong>Pokloni djeci radnika</strong> (do 15 godina) za Novu
          godinu, Božić, bajramske praznike, Uskrs/Vaskrs: do 100 KM po
          djetetu po prigodi
        </li>
        <li>
          <strong>Božićnice i bajramnice</strong> radnicima (jubilarne ili
          prigodne nagrade): u skladu sa kolektivnim ugovorom ili
          internim aktom firme, do propisanog neoporezivog limita
        </li>
        <li>
          Mora biti dokumentovano (spisak primalaca, računi za poklone ili
          odluka uprave o iznosu)
        </li>
      </ul>

      <h3>Stipendije i edukacija</h3>
      <ul>
        <li>
          Stipendije radnicima za stručno osposobljavanje vezano za posao
        </li>
        <li>Pokrivanje troškova kurseva, seminara, certifikata</li>
        <li>Mora biti dokumentovano kao trošak firme</li>
      </ul>

      <h2>Praktični obračun za radnika na minimalnoj plati</h2>
      <p>
        Radnik radi puno radno vrijeme, prosječno 21 radni dan mjesečno.
        Što sve može da dobije neoporezivo:
      </p>
      <ul>
        <li>Neto plata (minimalna): 1.027,00 KM</li>
        <li>Topli obrok (21 × 17 KM): 357,00 KM</li>
        <li>Putni trošak (mjesečna karta JKP GRAS): 65,00 KM</li>
        <li>
          Pokloni za 2 djece (Nova godina + bajram/božićnica): 200,00 KM po
          prigodi
        </li>
        <li>
          Regres (jednokratno tokom godine, max ~850 KM): prosječno 70,83
          KM/mjesec ekvivalent
        </li>
        <li>
          <strong>Ukupno mjesečno (sa proporcionalnim regresom): ~1.520 KM</strong>
        </li>
      </ul>
      <p>
        Sve gore navedeno radnik dobija bez ikakvih dodatnih poreza i
        doprinosa. Poslodavcu ovo košta isto kao iznos koji isplati (samo
        topli obrok i putni se odbijaju kao priznati rashod).
      </p>

      <h2>Šta poslodavac mora dokumentovati</h2>
      <p>
        Sve neoporezive isplate moraju biti uredno dokumentovane:
      </p>
      <ul>
        <li>
          <strong>Topli obrok:</strong> evidencija radnih dana (šihterica),
          isplata svakom radniku, jasno odvojeno na platnom listiću
        </li>
        <li>
          <strong>Regres:</strong> odluka uprave o isplati regresa, sa
          jasnim iznosom i osnovom, dokaz o korištenju godišnjeg odmora
        </li>
        <li>
          <strong>Putni trošak:</strong> računi za karte ili izračun
          kilometraže sa potvrdom stalnog prebivališta
        </li>
        <li>
          <strong>Dnevnice:</strong> putni nalozi sa svrhom putovanja,
          računima za smještaj i prevoz
        </li>
        <li>
          <strong>Solidarna pomoć:</strong> dokazi o razlozima (smrtni list,
          medicinska dokumentacija)
        </li>
      </ul>
      <p>
        Inspekcija rada i Porezna uprava redovno provjeravaju ove iznose.
        Bez dokumentacije, sve se može prekvalifikovati u oporezivi dohodak
        sa retroaktivnim doprinosima i porezima plus kaznama.
      </p>

      <h2>Najčešća pitanja</h2>

      <p>
        <strong>Da li je topli obrok obavezan?</strong>
      </p>
      <p>
        Zakon o radu FBiH propisuje pravo na "naknadu za ishranu u toku
        rada", što se u praksi tumači kao obavezan topli obrok. Ako
        poslodavac ne organizuje topli obrok niti isplaćuje naknadu,
        radnik može pokrenuti spor.
      </p>

      <p>
        <strong>Mogu li dati topli obrok u vidu vaučera ili kartica?</strong>
      </p>
      <p>
        Da, dozvoljeno je. Topli obrok se može isplatiti u novcu, kao
        organizovan obrok u kantini, vaučerima ili dopunom kartica. Bitno
        je da je iznos do propisanog dnevnog maksimuma neoporeziv.
      </p>

      <p>
        <strong>Šta sa toplim obrokom za dane bolovanja?</strong>
      </p>
      <p>
        Topli obrok se NE isplaćuje za dane kad radnik nije efektivno
        radio (bolovanje, godišnji, neopravdan izostanak). Ako poslodavac
        ipak isplati, taj dio se oporezuje kao redovan dohodak.
      </p>

      <p>
        <strong>Mogu li isplatiti regres u više rata?</strong>
      </p>
      <p>
        Da, dozvoljeno je. Često se isplaćuje 1/2 prije godišnjeg odmora i
        1/2 nakon. Ukupan godišnji iznos mora biti do neoporezivog
        maksimuma (50% prosječne neto plate FBiH).
      </p>

      <p>
        <strong>Šta ako radnik radi nepuno radno vrijeme?</strong>
      </p>
      <p>
        Topli obrok se isplaćuje proporcionalno radnim danima (ne satima).
        Radnik koji radi 4 sata dnevno ima isto pravo na cijeli dnevni
        topli obrok kao i onaj sa 8 sati, ali samo za dane kad efektivno
        radi.
      </p>

      <p>
        <strong>Da li su topli obrok i regres priznati rashod za firmu?</strong>
      </p>
      <p>
        Da, oba su priznati rashod za poslodavca (smanjuju osnovicu za
        porez na dobit/dohodak). Iznad neoporezivog maksimuma, dio koji se
        oporezuje kao plata takođe je priznati rashod, plus i doprinosi
        koje firma plaća na taj dio.
      </p>

      <p>
        <strong>Mogu li dati radniku poklon umjesto novca?</strong>
      </p>
      <p>
        Pokloni u stvarima (npr. mobitel za novogodišnju nagradu) se
        oporezuju kao redovan dohodak osim u izričito propisanim
        slučajevima (Sv. Nikola za djecu, jubileji). Sigurnije je
        ostati u novčanim isplatama prema propisanim limitima.
      </p>

      <p>
        <strong>Gdje pronaći aktuelnu prosječnu neto platu FBiH?</strong>
      </p>
      <p>
        Federalni zavod za statistiku FBiH (fzs.ba) objavljuje mjesečne i
        kvartalne podatke. Naša aplikacija se automatski ažurira kad nove
        objave izađu, tako da su iznosi toplog obroka i regresa u obračunu
        plata uvijek tačni.
      </p>

      <p>
        <strong>Izvor:</strong>{" "}
        <a
          href="https://aesc.ba/blog/neoporeziva-primanja"
          target="_blank"
          rel="noopener noreferrer"
        >
          Aesc.ba: Neoporezive isplate zaposlenicima u 2026.
        </a>
        ,{" "}
        <a
          href="https://unija.com/bs/neoporezive-naknade-i-pomoci-zaposlenicima-u-federaciji-bih/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Unija ETL: Neoporezive naknade u FBiH
        </a>
        , Zakon o radu FBiH (čl. 67, 71), Pravilnik o primjeni Zakona o
        porezu na dohodak FBiH. Iznosi propisani prema posljednjim podacima
        Federalnog zavoda za statistiku.
      </p>
    </>
  );
}
