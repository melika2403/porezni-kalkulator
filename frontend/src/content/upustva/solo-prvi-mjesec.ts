import type { Upustvo } from "./types";

// PK Office Solo: vodič za prvi mjesec, od praznog obrta do prve zatvorene
// liste obaveza.
export const soloPrviMjesec: Upustvo = {
  naslov: "Prvi mjesec u PK Office Solo",
  podnaslov:
    "Jednokratna priprema traje oko sat vremena. Poslije toga mjesec se svodi na fakture, jedan izvod i doprinose.",
  sekcije: [
    {
      naslov: "Dan 1: dopunite obrt",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Postavke obrta, Profil obrta: provjerite naziv, JIB, adresu i grad (iz grada se izvode kanton i općina za uplatnice), šifru djelatnosti i žiro račun. Ovi podaci idu na fakture, uplatnice i obrasce.",
            "PDV: ako ste u sistemu PDV-a, upišite PDV broj i datum ulaska. Ako niste, ostavite isključeno; fakture tada nose napomenu da PDV nije obračunat.",
            "Logo: dodajte logo obrta, pojavljuje se na fakturama.",
            "Postavke obrta, Način rada: provjerite module. Radnici, roba, blagajna, putni nalozi i stalna sredstva se uključuju samo ako ih stvarno imate.",
          ],
        },
        {
          t: "savjet",
          text: "Podatke prepišite sa rješenja o registraciji obrta i uvjerenja o poreznoj registraciji (JIB). Šifra djelatnosti se bira iz liste, ne kuca.",
        },
      ],
    },
    {
      naslov: "Dan 1: kupci i prva faktura",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Kupci i dobavljači: unesite stalne kupce (naziv, adresa, ID broj, PDV broj ako ga imaju, email za slanje faktura). Možete ih dodati i usput, direktno sa fakture.",
            "Nova faktura: izaberite kupca, unesite stavke (naziv, količina, cijena), snimite. Broj fakture se dodjeljuje sam i nastavlja se kroz godinu.",
            "Ako prelazite iz drugog programa usred godine: brojevi faktura nastavljaju od broja koji upišete u Postavkama fakturisanja, da numeracija ostane neprekinuta.",
            "Kupcu koji plaća svakog mjeseca isto napravite šablon (Fakture, Pripremljeni računi) i upišite dan u mjesecu: faktura će se praviti sama, po želji i slati emailom.",
          ],
        },
      ],
    },
    {
      naslov: "Početak mjeseca: prvi izvod i doprinosi",
      blokovi: [
        {
          t: "koraci",
          stavke: [
            "Iz e-bankinga preuzmite izvod za prethodni mjesec kao PDF i učitajte ga na Bankovni izvodi. Podržane su sve veće banke u FBiH.",
            "Prođite stavke: aplikacija predloži kategoriju, vi potvrdite. Uplate kupaca se vežu za fakture, doprinosi i porezi se prepoznaju po računima javnih prihoda.",
            "Doprinosi i uplatnice: obračunajte doprinose vlasnika, preuzmite uplatnice (ili nalog za e-bankarstvo) i platite do 10. Obrazac 2002 predajte Poreznoj upravi.",
            "Pogledajte KPR-1041: prihodi i rashodi iz potvrđenih stavki su tu, po datumu uplate.",
          ],
        },
        {
          t: "upozorenje",
          text: "Ako ste ranije u godini već vodili knjige drugdje, KPR za te mjesece ne prepisujete stavku po stavku: učitajte izvode za te mjesece i potvrdite ih, KPR se popuni sam i za njih.",
        },
      ],
    },
    {
      naslov: "Kraj prvog mjeseca",
      blokovi: [
        {
          t: "p",
          text: "Na Početnoj su sve stavke zelene: izvod učitan, transakcije potvrđene, doprinosi plaćeni i predani, akontacija plaćena, PDV prijavljen ako ste obveznik. Od sada je svaki mjesec isti.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Koliko izvoda treba učitati ako sam obrt otvorio prije nekoliko mjeseci?",
      o: "Sve od početka godine, ili od početka rada obrta ako je otvoren ove godine. KPR i godišnji obrasci moraju pokriti cijelu godinu.",
    },
    {
      p: "Nemam PDF izvoda, samo pristup e-bankingu na telefonu.",
      o: "Svaka banka u e-bankingu nudi preuzimanje izvoda kao PDF (Izvodi ili Dokumenti). Preuzmite ga na telefon i učitajte direktno iz aplikacije, radi i na mobitelu.",
    },
    {
      p: "Šta ako pogriješim kategoriju na izvodu?",
      o: "Otvorite transakciju i promijenite kategoriju, KPR se odmah preračuna. Potvrđene stavke možete mijenjati dok ne zaključite godinu.",
    },
  ],
};
