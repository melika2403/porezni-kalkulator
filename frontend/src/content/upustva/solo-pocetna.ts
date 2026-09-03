import type { Upustvo } from "./types";

// PK Office Solo: naslovnica "vodim sam sebi". Pisano za obrtnika bez
// knjigovođe: bez žargona, svaki korak kaže gdje se klikne i šta se dobije.
export const soloPocetna: Upustvo = {
  naslov: "Vodim knjige sam sebi",
  podnaslov:
    "Solo režim vam svaki mjesec pokazuje tačno šta treba uraditi i dokle ste stigli. Ovdje je cijela mjesečna rutina, korak po korak, i šta uraditi kad nešto ne štima.",
  sekcije: [
    {
      naslov: "Šta vidite na Početnoj",
      blokovi: [
        {
          t: "p",
          text: "Na vrhu je lista \"Šta trebam ovaj mjesec\". Svaka stavka ima rok i status: gotovo (zeleno), čeka ili kasni. Klik na stavku vodi tačno na ekran gdje se to rješava. Kad je sve zeleno, za taj mjesec ste završili.",
        },
        {
          t: "p",
          text: "Ispod su brojevi za tekući mjesec: koliko je naplaćeno, koliko plaćeno, koje fakture još čekaju naplatu i stanje računa po zadnjem izvodu. Sve dolazi sa vaših izvoda i faktura, ništa se ne unosi ručno.",
        },
        {
          t: "p",
          text: "Dugme Nova faktura je uvijek u gornjoj traci (na mobitelu pluta dolje desno). Faktura je najčešća radnja u obrtu, pa nikad nije dalje od jednog klika.",
        },
      ],
    },
    {
      naslov: "Mjesečna rutina, korak po korak",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Kad obavite posao: Nova faktura. Izaberite kupca iz šifarnika (ili ga upišite, sačuva se za sljedeći put), unesite stavke i snimite. PDF možete odmah preuzeti ili poslati kupcu emailom iz aplikacije.",
            "Početkom mjeseca preuzmite izvod za prethodni mjesec iz e-bankinga (PDF) i učitajte ga na Bankovni izvodi. Aplikacija sama prepozna uplate kupaca i veže ih za fakture, koje time postaju naplaćene.",
            "Prođite transakcije na izvodu: svaka dobije kategoriju (prihod od kupca, doprinosi, banka...). Provjerite i potvrdite. Tek potvrđena stavka ulazi u Knjigu prihoda i rashoda (KPR).",
            "Doprinosi i uplatnice: obračunajte doprinose vlasnika za prethodni mjesec, preuzmite uplatnice i platite ih do 10. u mjesecu. Obrazac 2002 iz istog ekrana predajete Poreznoj upravi.",
            "Ako vam je Porezna uprava odredila akontaciju poreza na dohodak, platite je do 10. Kad uplata stigne na izvod i potvrdite je, stavka na listi obaveza postaje zelena.",
            "Ako ste PDV obveznik: PDV evidencije se pune same iz faktura i ulaznih računa. Do 10. provjerite prijavu i platite PDV.",
            "Pogledajte listu obaveza. Sve zeleno znači da je mjesec zatvoren.",
          ],
        },
        {
          t: "savjet",
          text: "Radite u ovom redoslijedu: prvo izvod, pa potvrde, pa doprinosi. Većina stavki na listi obaveza se sama zazeleni čim potvrdite uplate sa izvoda.",
        },
      ],
    },
    {
      naslov: "Šta ako",
      blokovi: [
        {
          t: "p",
          text: "Kupac je platio manje ili u dva dijela: na izvodu uplatu vežite za fakturu; ako ne pokriva cijeli iznos, faktura ostaje otvorena dok ne stigne ostatak, a na kartici kupca vidite koliko još duguje.",
        },
        {
          t: "p",
          text: "Izvod nije prepoznao fakturu: otvorite transakciju i ručno izaberite fakturu u polju Poveži fakturu. Sljedeći put aplikacija uči iz vašeg izbora.",
        },
        {
          t: "p",
          text: "Zaboravili ste doprinose za prošli mjesec: obračunajte ih i platite odmah, lista obaveza pokazuje kasni dok uplata ne stigne na izvod. Kod Porezne uprave se za kašnjenje računa zatezna kamata, ali obračun je isti.",
        },
        {
          t: "p",
          text: "Inostrani kupac: na fakturi označite Inostrani kupac. Faktura ide bez PDV-a (izvoz), u eurima i dvojezično (bosanski i engleski), a u KPR se knjiži po kursu na dan uplate.",
        },
        {
          t: "upozorenje",
          text: "Aplikacija računa i priprema obrasce, ali ne predaje ih umjesto vas. Obrazac 2002, PDV prijavu i godišnje obrasce predajete sami, elektronski (nPIS) ili na šalteru. Ako niste sigurni oko porezne situacije, provjerite sa poreznim savjetnikom.",
        },
      ],
    },
    {
      naslov: "Kraj godine",
      blokovi: [
        {
          t: "p",
          text: "U januaru i februaru na Obrasci i kraj godine napravite SPR-1053 iz KPR-a, GPD-1051 iz SPR-a, i pokrenite zaključak godine. Za to postoji poseban vodič Kraj godine na Početnoj.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Da li mi uopšte treba knjigovođa?",
      o: "Obrt bez radnika i robe u FBiH može voditi knjige sam: KPR, doprinose vlasnika, PDV ako je obveznik i godišnje obrasce. Solo režim vas vodi kroz to. Knjigovođa ili porezni savjetnik ostaje pametan izbor za nejasne situacije (promjena režima, kontrola, veliki iznosi).",
    },
    {
      p: "Šta ako dobijem radnika ili počnem prodavati robu?",
      o: "U Postavke obrta, Način rada uključite modul Radnici ili Roba. Meni dobija zaposlenike, plate i JS3100 prijave, odnosno kalkulacije i lager. Ništa što ste do tada unijeli se ne mijenja.",
    },
    {
      p: "Mogu li isključiti Solo režim?",
      o: "Da, u Postavke obrta, Način rada. Tada vidite puni PK Office meni sa svim modulima, kao knjigovođe. Podaci i obračuni su isti u oba režima.",
    },
    {
      p: "Zašto neka obaveza i dalje kasni iako sam platio?",
      o: "Lista obaveza gleda potvrđene uplate sa izvoda. Dok ne učitate izvod sa tom uplatom i ne potvrdite stavku, aplikacija ne zna da je plaćeno.",
    },
  ],
};
