// Uputstvo za objavu teksta, prikazuje se u editoru (panel "Kako objaviti
// tekst"). Sadržaj stoji ovdje da se mijenja bez diranja editora, isto kao
// kontekstualna uputstva u PK Officeu.

export type UputstvoSekcija = { naslov: string; stavke: string[] };

export const VIJESTI_UPUTSTVO: UputstvoSekcija[] = [
  {
    naslov: "Prije pisanja",
    stavke: [
      "Odaberi jednu frazu koju čovjek kuca u Google. Piše se onako kako se traži: \"koliko košta radnik poslodavca\", ne \"analiza troškova rada\".",
      "Provjeri da već nemamo tekst na tu frazu. Dva teksta na istu frazu se međusobno guše. Ako imamo, ažuriraj postojeći umjesto da pišeš novi. Editor te sam upozori ako nađe sličan tekst.",
    ],
  },
  {
    naslov: "Naslov i uvod",
    stavke: [
      "Fokus fraza ide u naslov, po mogućnosti na početak.",
      "Prvi pasus mora odgovoriti na pitanje iz naslova. Ne uvod o tome kako je porezni sistem složen, nego broj, rok ili pravilo odmah.",
      "Ako tekst nosi godinu ili iznos, oni idu u naslov (\"2027\", \"1.000 KM\").",
    ],
  },
  {
    naslov: "Tijelo teksta",
    stavke: [
      "Podnaslovi su pitanja koja ljudi postavljaju (\"Ko je obavezan\", \"Do kada se predaje\", \"Šta ako se zakasni\").",
      "Vodič ide 1.200 riječi naviše, vijest može i 300, ali mora zaokružiti temu.",
      "Svaki iznos, stopa i rok dobiju izvor: Službene novine, broj i datum. Na temama para i poreza Google i čitalac traže dokaz.",
      "Najmanje jedna veza na naš alat (kalkulator plate, obrazac, PK Office) i jedna na naš raniji tekst.",
    ],
  },
  {
    naslov: "Slike",
    stavke: [
      "Format: WebP, a ako nemaš WebP onda JPG. PNG samo za snimke ekrana sa sitnim tekstom, jer je dosta teži.",
      "Dimenzije: 1200 x 675 piksela (odnos 16:9). To je isto što traži i dijeljenje na Facebooku i Viberu, pa ista slika pokriva i članak i dijeljenje.",
      "Težina do 300 KB. Slika se ne smanjuje automatski, pa ono što pošalješ to se i učitava kod čitaoca.",
      "Naslovna slika je obavezna, u alt opisu se kaže šta je na slici, ne fraza natrpana radi Googlea.",
      "Naziv fajla čitljiv, npr. minimalna-plata-fbih-2027.webp.",
      "Slike unutar teksta po istom pravilu, samo im širina može biti manja (npr. 900 piksela).",
    ],
  },
  {
    naslov: "Poslije objave",
    stavke: [
      "Adresa se ne mijenja nakon objave. Zato slug prije objave provjeri dva puta.",
      "Kad se propis promijeni, tekst se ažurira, ne piše se novi. Datum ažuriranja se prikazuje i pomaže rangiranju.",
      "Kod vodiča postavi datum sljedeće provjere, da tekst ne ostane sa starim stopama.",
    ],
  },
];

// Kratka pomoć uz pojedinačna polja.
export const POMOC_POLJA = {
  seoNaslov:
    "Ono što se vidi u Googleu. 50 do 60 znakova, sadrži frazu koju ljudi kucaju.",
  seoOpis:
    "Ne rangira, ali odlučuje o kliku. Obećaj šta čitalac saznaje, 140 do 160 znakova.",
  fokusFraza:
    "Jedna fraza kako je ljudi traže. Ne prikazuje se na stranici, služi kao mjera fokusa.",
  naslovnaAlt: "Opiši šta je na slici, ne trpaj ključne riječi.",
  naslovnaSlika:
    "WebP ili JPG, 1200 x 675 piksela (16:9), do 300 KB. Ista slika ide i u članak i u dijeljenje na društvenim mrežama.",
  sazetak: "Dvije rečenice koje stoje ispod naslova u listi i na vrhu teksta.",
  izvorPropisa:
    "Službene novine, broj i datum, ili link na propis. Podiže povjerenje i rangiranje na temama novca.",
  datumProvjere:
    "Kada vodič treba ponovo provjeriti. Poslije tog datuma stoji upozorenje u listi.",
} as const;
