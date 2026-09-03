import type { Upustvo } from "./types";

// PK Office Solo: rječnik pojmova koje obrtnik sreće u aplikaciji i kod
// Porezne uprave, bez žargona.
export const soloRjecnik: Upustvo = {
  naslov: "Rječnik pojmova",
  podnaslov:
    "Kratka objašnjenja skraćenica i izraza iz aplikacije i obrazaca Porezne uprave FBiH.",
  sekcije: [
    {
      naslov: "Knjige i obrasci",
      blokovi: [
        { t: "p", text: "KPR-1041, Knjiga prihoda i rashoda: glavna knjiga obrta. Prihod je ono što je naplaćeno, rashod ono što je plaćeno (po datumu na izvodu). Puni se sama iz potvrđenih stavki izvoda." },
        { t: "p", text: "SPR-1053, Specifikacija za utvrđivanje dohotka: godišnji obrazac koji sabira KPR (prihodi, rashodi, doprinosi) i daje dohodak obrta. Prilog uz GPD." },
        { t: "p", text: "GPD-1051, Godišnja prijava poreza na dohodak: prijava fizičkog lica za cijelu godinu, sa dohotkom obrta iz SPR-a i ostalim dohocima. Rok 31. mart." },
        { t: "p", text: "Obrazac 2002: mjesečna prijava doprinosa vlasnika obrta (PIO, zdravstvo, nezaposlenost). Predaje se uz uplatu do 10. u mjesecu za prethodni mjesec." },
        { t: "p", text: "Obrazac 2001 i MIP-1023: obrasci za plate radnika (2001 uz isplatu plate, MIP mjesečni izvještaj). Vidite ih samo ako imate modul Radnici." },
        { t: "p", text: "JS3100: prijava ili odjava radnika kod Porezne uprave (PIO, zdravstvo). Isto samo uz modul Radnici." },
        { t: "p", text: "KUF i KIF: knjige ulaznih i izlaznih faktura za PDV obveznike. Pune se same iz ulaznih računa i faktura." },
        { t: "p", text: "PLDI, popisna lista dugotrajne imovine: evidencija stalnih sredstava (oprema, vozila) i njihove amortizacije." },
      ],
    },
    {
      naslov: "Porezi i doprinosi",
      blokovi: [
        { t: "p", text: "Doprinosi vlasnika: mjesečni iznos za penzijsko, zdravstveno i osiguranje od nezaposlenosti koji obrtnik plaća za sebe, na osnovicu koju propisuje FBiH. Aplikacija ga obračuna i napravi uplatnice." },
        { t: "p", text: "Akontacija poreza na dohodak: mjesečni predujam poreza koji Porezna uprava odredi rješenjem na osnovu prošlogodišnjeg GPD-a. Na kraju godine se poravna kroz GPD." },
        { t: "p", text: "PDV: porez na dodanu vrijednost, 17%. Obveznik postajete kad promet pređe prag ili dobrovoljno; tada fakture nose PDV, a mjesečno se prijavljuje UIO." },
        { t: "p", text: "Uplatnica: nalog za plaćanje javnih prihoda sa tačnim računom, vrstom prihoda i šifrom općine. Aplikacija ih popunjava; možete ih i izvesti za e-bankarstvo." },
        { t: "p", text: "Vrsta prihoda i šifra općine: brojevi na uplatnici po kojima budžet zna kome ide novac. Zavise od vašeg prebivališta (grad iz profila obrta)." },
        { t: "p", text: "nPIS: elektronski sistem Porezne uprave FBiH za predaju obrazaca uz kvalifikovani elektronski potpis." },
      ],
    },
    {
      naslov: "Fakture i izvodi",
      blokovi: [
        { t: "p", text: "Faktura i predračun: faktura je račun za obavljen posao (ulazi u knjige), predračun je ponuda prije posla (ne ulazi u knjige dok se ne pretvori u fakturu)." },
        { t: "p", text: "Avansna faktura: račun za uplatu unaprijed; kod PDV obveznika PDV se plaća već na avans." },
        { t: "p", text: "Izvoz usluga i inostrani kupac: faktura stranom kupcu ide bez PDV-a, obično u eurima. Aplikacija je pravi dvojezično i knjiži u KM po kursu." },
        { t: "p", text: "Bankovni izvod: dokument banke sa svim uplatama i isplatama u periodu. PDF iz e-bankinga učitavate u aplikaciju." },
        { t: "p", text: "Kategorija transakcije: čemu stavka izvoda služi (prihod od kupca, doprinosi, banka, privatno...). Određuje da li i gdje ide u KPR." },
        { t: "p", text: "Potvrđena stavka: transakcija koju ste pregledali i potvrdili. Samo potvrđene stavke ulaze u KPR i mijenjaju listu obaveza." },
        { t: "p", text: "Povezana faktura: uplata na izvodu vezana za konkretnu fakturu, koja time postaje naplaćena." },
        { t: "p", text: "JIB i PDV broj: JIB je 13-cifreni porezni broj obrta, PDV broj je 12-cifreni broj UIO za PDV obveznike." },
      ],
    },
  ],
  faq: [
    {
      p: "Gdje vidim koje je obrasce moj obrt dužan predavati?",
      o: "Na Početnoj lista obaveza prikazuje samo ono što važi za vaš obrt (PDV samo ako ste obveznik, plate samo uz modul Radnici). Godišnji obrasci su u Obrasci i kraj godine.",
    },
  ],
};
