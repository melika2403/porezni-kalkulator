import type { Upustvo } from "./types";

export const kalkulacije: Upustvo = {
  naslov: "Kalkulacije",
  podnaslov:
    "Maloprodajne kalkulacije (KCM): brz unos artikala, sa automatskim knjiženjem ulaznog računa u KUF.",
  sekcije: [
    {
      naslov: "Unos kalkulacije",
      blokovi: [
        {
          t: "p",
          text: "Kalkulacija formira maloprodajnu cijenu (MPC) iz nabavne cijene, marže i PDV-a. Unos je brz: Enter vodi na sljedeći artikal.",
        },
        {
          t: "koraci",
          stavke: [
            "Otvorite novu kalkulaciju i odaberite dobavljača.",
            "Broj kalkulacije ostavite prazan (dobija sljedeći slobodan) ili upišite svoj.",
            "Dodajte artikle iz šifarnika ili nove.",
            "Za svaki unesite nabavnu cijenu i maržu ili MPC (jedno računa drugo).",
            "Sačuvajte kalkulaciju.",
          ],
        },
        {
          t: "savjet",
          text: "Marža i MPC su povezane: promijenite jedno i drugo se preračuna. Tako lako pogodite željenu cijenu na polici.",
        },
      ],
    },
    {
      naslov: "Tipkovnica kod unosa",
      blokovi: [
        {
          t: "p",
          text: "Unos je pravljen da se radi bez miša, kao u desktop programima.",
        },
        {
          t: "koraci",
          stavke: [
            "Enter prebacuje na sljedeće polje: artikal, količina, cijena, rabat, zavisni trošak, marža, MPC.",
            "Enter na polju MPC dodaje stavku i vraća vas na unos artikla.",
            "F3 skače pravo na maloprodajnu cijenu, kad je ostalo već popunjeno iz prethodnog unosa.",
            "PageDown odmah dodaje stavku čim su količina, cijena i MPC popunjeni: za predpopunjene artikle jedan pritisak umjesto niza Entera.",
            "Ulazak u polje količine ili cijene označi postojeću vrijednost, pa kucanje odmah piše preko nje.",
            "Strelica uz polje artikla otvara zadnjih 10 korištenih artikala; kucanjem se traži po cijelom šifarniku.",
          ],
        },
      ],
    },
    {
      naslov: "Izbor artikla",
      blokovi: [
        {
          t: "p",
          text: "Polje artikla ne izlistava cijeli šifarnik. Prazno polje (strelica) nudi zadnjih 10 artikala korištenih na kalkulacijama, a čim počnete kucati traži se po šifri, nazivu i bar kodu.",
        },
        {
          t: "savjet",
          text: "Prvo se nude najbliži pogoci: tačna šifra ili bar kod, pa šifra koja počinje upisanim, pa naziv koji počinje upisanim, pa naziv koji ga sadrži. Unutar istog reda prvi su artikli koje ste skorije koristili. Na dnu liste piše koliko je prikazano od ukupnog broja pogodaka, pa se vidi kad treba suziti pretragu.",
        },
      ],
    },
    {
      naslov: "Broj kalkulacije",
      blokovi: [
        {
          t: "p",
          text: "Numeracija ide po godini i sama dodjeljuje sljedeći slobodan broj, ali broj možete i upisati: i pri otvaranju nove i kod izmjene postojeće kalkulacije.",
        },
        {
          t: "savjet",
          text: "Isti broj ne mogu imati dvije kalkulacije u istoj godini. Ako je broj zauzet, program to javi i ne dozvoli snimanje dok toj drugoj kalkulaciji ne promijenite broj ili je ne obrišete.",
        },
      ],
    },
    {
      naslov: "Ispis i potpisnici",
      blokovi: [
        {
          t: "p",
          text: "PDF kalkulacije (KCM obrazac) se preuzima sa liste (ikona za preuzimanje) ili dugmetom Preuzmi PDF na samoj kalkulaciji. To dugme ispisuje snimljeno stanje bez spremanja, pa radi i kad je kalkulacija zaključana jer joj je ulazni račun već plaćen.",
        },
        {
          t: "p",
          text: "U dnu PDF-a su potpisnici: lijevo Kalkulaciju uradio (ime koje upišete dugmetom Potpisnik iznad liste kalkulacija), desno Kalkulaciju primio sa nazivom obrta. Potpisnik vrijedi za taj obrt i može se promijeniti u svakom trenutku.",
        },
      ],
    },
    {
      naslov: "Veza sa KUF i lagerom",
      blokovi: [
        {
          t: "p",
          text: "Snimljena kalkulacija automatski knjiži ulazni račun u KUF, a artikli iz šifarnika su osnova za lager listu.",
        },
      ],
    },
  ],
  faq: [
    {
      p: "Kako da brzo unesem puno artikala?",
      o: "Enter vodi kroz polja i na MPC-u dodaje stavku, pa se cijela kalkulacija može otkucati bez miša. F3 skače pravo na maloprodajnu cijenu, a PageDown odmah dodaje stavku čim su količina, cijena i MPC popunjeni (kod predpopunjenih artikala: izaberete artikal, ukucate količinu, PageDown).",
    },
    {
      p: "Obrt nije u PDV-u: kako da provjerim predpopunjenu cijenu prema fakturi?",
      o: "Uz uključenu opciju Automatski dodaj PDV na cijenu, ispod polja se i za predpopunjenu cijenu ispiše rastav: cijena bez PDV-a + 17% = upisana cijena. Iznos bez PDV-a poredite sa ulaznom fakturom (dobavljači cijene iskazuju bez PDV-a).",
    },
    {
      p: "Kako da odštampam kalkulaciju kojoj je račun već plaćen?",
      o: "Otvorite je i kliknite Preuzmi PDF. To dugme ispisuje snimljeno stanje bez spremanja, pa radi i kad su izmjene zaključane zbog plaćenog računa.",
    },
    {
      p: "Zašto lista artikala ne pokazuje cijeli šifarnik?",
      o: "Kod šifarnika od stotinu stavki abecedni popis ne pomaže. Zato prazno polje nudi zadnjih 10 korištenih artikala, a kucanje pretražuje cijeli šifarnik po šifri, nazivu i bar kodu i pokazuje do 20 najbližih pogodaka.",
    },
    {
      p: "Mogu li sam odrediti broj kalkulacije?",
      o: "Da. Polje Broj kalkulacije ostavite prazno za sljedeći slobodan, ili upišite svoj (npr. da nastavite numeraciju iz starog programa). Broj se može promijeniti i naknadno, kroz izmjenu kalkulacije.",
    },
    {
      p: "Šta ako je broj koji želim već zauzet?",
      o: "Program javi koja kalkulacija ga koristi i ne dozvoli duplikat u istoj godini. Toj kalkulaciji promijenite broj (ili je obrišite), pa se broj oslobodi.",
    },
    {
      p: "Šta ako unesem MPC umjesto marže?",
      o: "Program izračuna maržu iz MPC-a i obrnuto. Unesite ono što vam je poznato, drugo se popuni samo.",
    },
    {
      p: "Knjiži li se nešto automatski?",
      o: "Da. Kalkulacija sama unese ulazni račun dobavljača u KUF, pa ga ne morate unositi posebno.",
    },
  ],
};
