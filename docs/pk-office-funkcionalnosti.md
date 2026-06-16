# PK Office: pregled funkcionalnosti (osnova za tutorijal)

Ovaj dokument bilježi sve što je izgrađeno u PK Office modulu, korak po
korak iz ugla korisnika. Služi kao izvor za tutorijal / upute za upotrebu.
Održavati ga uz svaku novu funkcionalnost.

Posljednje ažuriranje: juni 2026.

---

## 1. Ulaz u PK Office

- PK Office je dio aplikacije za obrte (app.poreznikalkulator.ba, u dev-u
  localhost:3000/app). Traži prijavu; bez prijave preusmjerava na /prijava.
- Gore je traka sa brandom i profilom; lijevo sidebar sa navigacijom
  grupisanom u: Finansije, Knjige i evidencije, Zaposlenici, Račun.
- "Bankovni izvodi" u sidebaru nosi badge sa brojem stavki koje čekaju
  pregled (skriva se kad je nula).

## 2. Izbor organizacije (OrgSwitcher)

- U vrhu sidebara je aktivna organizacija. Klik otvara listu svih obrta
  korisnika, grupisanu na "Moji obrti" i "Klijenti" (za računovođe).
- PK Office radi SAMO sa obrtima; d.o.o. organizacije se ne nude.
- Ime se prikazuje u dva reda ako je dugačko; "Dodaj novi obrt" na dnu.

## 3. Početna (dashboard)

- Pozdrav sa punim datumom, imenom aktivne organizacije i badge-om
  "Moj obrt" / "Klijent".
- **Trenutno stanje računa**: završno stanje sa zadnjeg učitanog izvoda;
  za više banaka zbir zadnjih stanja po svakom računu.
- **Plate kartica**: status obračuna plata (obračunate/isplaćene/nisu) i
  da li je MIP-1023 XML preuzet, za protekli mjesec (od 25. u mjesecu
  prelazi na tekući). Dugme vodi na Obračune plata.
- **Potražuje / Duguje**: stvaran promet tekućeg mjeseca sa izvoda.
- **Otvorene fakture**: broj izdanih nenaplaćenih faktura + ukupno
  potraživanje.
- **Nepovezane transakcije**: broj stavki koje čekaju pregled.
- **Posljednje transakcije**: zadnje 4 stavke sa izvoda.
- **Predstojeće obaveze**: rokovi za tekući mjesec (akontacija doprinosa,
  akontacija poreza na dohodak, PDV za obveznike; svi do 10. u mjesecu za
  prethodni mjesec). Status "gotovo" se izvodi automatski: postoji
  potvrđena uplata te kategorije na izvodu u tekućem mjesecu. Prošao rok
  bez uplate = oznaka "kasni".

## 4. Bankovni izvodi: upload PDF-a

Stranica: Finansije → Bankovni izvodi.

- **Učitaj bankovni izvod** (drag&drop ili klik): prima PDF izvod iz
  e-bankinga. Podržane banke: UniCredit, Raiffeisen, Sparkasse, KIB,
  BBI, MF Banka, ZiraatBank (BBI/MF/Ziraat dijele Asseco format pa
  srodne banke često rade odmah).
- Svaki izvod prolazi **validaciju salda**: početno stanje + potražuje −
  duguje mora dati završno stanje (kod Raiffeisena i saldo red-po-red).
  Izvod koji se ne slaže NE ulazi u knjige nego vraća grešku.
- **Kontinuitet salda**: ako početno stanje novog izvoda ne odgovara
  završnom stanju prethodnog izvoda istog računa, izvod se uveze ali sa
  upozorenjem "možda nedostaje izvod između".
- Greške koje korisnik može vidjeti: nepoznata banka (uputa da nam
  pošalje uzorak), skeniran PDF (treba original iz e-bankinga),
  duplikat (isti izvod već učitan), neslaganje salda.
- Nakon uspješnog uploada otvara se izvod sa svim stavkama.

## 5. Izvodi: lista i detalj

- Lista izvoda je **grupisana po banci i računu** (obrt može imati više
  banaka). Svaki izvod: broj, datum, broj stavki, status ("N za pregled"
  ili "potvrđen"), kantica za brisanje (uz potvrdu).
- Detalj izvoda: početno stanje, potražuje, duguje, završno stanje,
  napomene parsera, lista stavki.
- Svaka stavka ima **prijedlog kategorije** (vidi tačku 6), badge
  statusa i dugme "Potvrdi". Klik na stavku otvara modal sa svim
  detaljima (iznos, datum, protivstrana, protivračun, referenca, puni
  opis sa izvoda) i izborom kategorije.
- **Potvrdi sve (N)**: potvrdi sve stavke odjednom i vrati na listu.
- Potvrđene stavke ulaze u KPR; "ne ide u KPR" kategorije ne.

## 6. Kategorije i automatika

Svaka stavka dobija kategoriju koja određuje KPR kolonu:

- Prihodi: naplata preko računa (kolona 12), pazar u gotovini (11,
  POLOG PAZARA sa izvoda), prihod u stvarima (13).
- Rashodi: roba/materijal (16), bruto plate zaposlenika (17), doprinosi
  poduzetnika (18), ostali rashodi i bankarska provizija (19).
- "Ne ide u KPR" (nije prihod ni rashod): pozajmice, krediti, povrat
  PDV-a, uplata PDV-a UIO-u, porez na dohodak vlasnika, oprema (ide u
  stalna sredstva), prenosi između vlastitih računa.

Prijedlozi se daju automatski:

1. **Naučena pravila**: kad korisnik potvrdi stavku sa kategorijom,
   sistem zapamti protivračun/naziv → kategorija za tu organizaciju i
   ubuduće sam predlaže. Zadnja potvrda je presudna.
2. **Računi javnih prihoda** (šifarnik): doprinosi (ZZO/PIO/
   zapošljavanje), porez na dohodak (kantonalni budžeti), PDV (UIO).
3. **Obrasci u opisu**: polog pazara, provizije/naknade, POS prilivi,
   pozajmice, rate kredita.
4. Default: priliv → prihod preko računa; odliv → bez prijedloga.

PDV obveznici: kategorije sa PDV-om izbijaju 17% (kolone 14 / 20),
kolone 15 i 21 daju osnovicu. Inostrane uplate i fakture bez PDV-a se
rješavaju izborom kategorije / korekcijom.

## 7. Ručni unos izvoda

Za banke koje još ne čitamo ili papirne izvode ("Unesi izvod ručno"):

- Bira se žiro račun (iz profila, sa liste poznatih računa, ili upis
  novog), broj izvoda (opciono) i datum (DD.MM.YYYY., default danas).
- Unose se **ukupan promet duguje i potražuje** sa izvoda kao kontrolne
  sume, pa stavke (smjer Duguje/Potražuje, datum, opis, protivstrana,
  iznos).
- Kontrolna traka uživo pokazuje slaganje; **snimanje je moguće tek kad
  se zbir stavki poklopi sa unesenim prometom**.
- Snimljene stavke su odmah potvrđene (korisnik ih je pregledao pri
  unosu) i vraća se na listu izvoda.

## 8. KPR-1041 (Knjiga prihoda i rashoda)

Stranica: Knjige i evidencije → KPR-1041.

- Knjiga se **izvodi automatski iz potvrđenih stavki** (princip
  blagajne: prihod na datum naplate, rashod na datum plaćanja). Nema
  ručnog unosa u KPR; promjena kategorije/statusa stavke odmah mijenja
  knjigu.
- Pregled po godini ili **ručni period** (checkbox, od/do, za obrte
  otvorene/zatvorene u toku godine).
- Kolone 11-21 po službenom obrascu; PDV kolone (14, 20) vide samo PDV
  obveznici. Opis je kratak tip knjiženja ("Polog pazara", "Bankarska
  provizija"...), dokument je "Izvod N".
- **Preuzmi KPR-1041 (PDF)**: popunjava službeni obrazac, sve
  centrirano u ćelijama, JIB i JMB vlasnika u kućice, ime i adresa
  vlasnika (iz profila obrta, rola VLASNIK), paginacija sa Donos
  redom i kumulativnim "Ukupno za sve stranice - prenos".
- Napomena na stranici podsjeća da knjiga zahtijeva sve izvode od
  početka godine (ili otvaranja obrta).

## 9. Transakcije (flat pregled)

Stranica: Finansije → Transakcije.

- Sve stavke sa svih izvoda na jednom mjestu, najnovije prvo.
- **Pretraga**: opis, protivstrana, referenca, protivračun, ili tačan
  iznos (npr. "480" nađe uplatu od 480,00 KM).
- **Filteri**: smjer (potražuje/duguje), status (za pregled / potvrđeno /
  zanemareno), kategorija (uključujući "bez kategorije"), period od/do.
- Red prikazuje i iz kog je izvoda stavka (banka + broj izvoda).
- Klik otvara isti modal kao na izvodu (kategorija, potvrda, detalji) +
  link "Otvori izvod" na matični izvod.
- "Učitaj još" za listanje preko 50 rezultata.

## 10. Fakture i auto-match naplate

Stranica: Finansije → Fakture.

- Fakture su **dijeljene sa Poreznim Kalkulatorom** (isti podaci): šta se
  izda na main page, vidi se u PK Office i obratno. "Nova faktura" vodi na
  postojeću formu za izdavanje.
- Lista za aktivnu organizaciju: broj, kupac, datumi (izdavanja, rok,
  naplate), iznos, status (nacrt / izdana / naplaćena / stornirana),
  filter po statusu, zbir otvorenog potraživanja, PDF preuzimanje.
- **Auto-match naplate**: pri uploadu izvoda svaki priliv se poredi sa
  otvorenim (izdanim) fakturama organizacije:
  - broj fakture u opisu/referenci (0042-2026, 0042/2026, 42/26...) je
    dovoljan signal; broj + tačan iznos je najjači
  - tačan iznos + prepoznat kupac u protivstrani je dovoljan
  - samo iznos NIJE dovoljan (previše lažnih pogodaka); dvosmisleni
    slučajevi se preskaču
- Pogodak je PRIJEDLOG: stavka dobija vezu na fakturu i kategoriju
  "Prihod, naplata preko računa". **Tek potvrdom stavke faktura postaje
  naplaćena (PAID) sa datumom priliva** (princip blagajne). Vraćanje
  stavke u pregled vraća fakturu na izdanu.
- U modalu stavke (prilivi) je i ručni izbor fakture za povezivanje kad
  automatika ne pogodi.
- "Naplaćena" dugme na fakturi postoji i za naplate mimo izvoda
  (gotovina, kompenzacija).

## 11. Poslovni partneri

Stranica: Finansije → Partneri.

- Jedan registar svih partnera; **tip se ne bira ručno** nego se izvodi iz
  poslovanja: kupac = ima uplata ili faktura, dobavljač = ima isplata.
- Četiri taba: **Kupci** (naplaćeno + otvorene fakture), **Dobavljači**
  (plaćeno), **Svi aktivni** (kolone "Njihov dug" i "Naš dug" za
  kompenzacije; "Naš dug" se puni kad stigne knjiženje ulaznih računa) i
  **Imenik** (svi uneseni partneri, i oni bez prometa, za pregled i
  uređivanje). U prva tri taba su samo partneri sa kojima se poslovalo.
- Partner ima: naziv, JIB, PDV broj, adresu, grad, email, telefon, žiro
  račune i napomenu. Računi se unose u formatu XXX-XXX-XXXXXXXX-XX uz
  automatski prikaz imena banke i "Dodaj još jedan račun" za više banaka.
  Dodavanje/uređivanje kroz modal (klik na red), brisanje skida vezu,
  transakcije ostaju.
- **Auto-vezanje preko žiro računa**: kad se partneru upiše račun, sve
  postojeće transakcije sa tim protivračunom se odmah vežu za njega, a
  svaki novi izvod (PDF ili ručni) ih veže automatski pri učitavanju.
- **Prijedlozi**: sistem nudi partnere pronađene u podacima, protustrane
  sa izvoda (sa brojem transakcija) i kupce sa faktura (sa JIB-om i
  adresom). Klik na prijedlog otvara popunjenu formu. Uplate javnih
  prihoda (porezi, doprinosi) se ne nude kao partneri.
- Statistika po partneru: ukupno naplaćeno/plaćeno (potvrđene stavke),
  broj transakcija, zadnja aktivnost, otvorene fakture (po JIB-u ili
  nazivu kupca).
- Napomena: kategorije se i dalje uče po računu (vidi 5.), pa partner čije
  su uplate jednom označene npr. kao "Roba i materijal" dobija tu
  kategoriju na svim budućim stavkama dok se ručno ne promijeni.
- Obavezna polja partnera: naziv i JIB (13 cifara). PDV broj (12 cifara)
  je opcioni, ali upisan znači da se partner vodi kao PDV obveznik
  (osnova za KUF/KIF).

### Kartica partnera

Klik na partnera otvara karticu (olovka u redu uređuje podatke):

- Zaglavlje sa svim podacima (JIB, PDV, adresa, računi sa imenima banaka).
- KPI: naplaćeno od partnera, plaćeno partneru, njihov dug (otvorene
  fakture), naš dug (otvoreni ulazni računi).
- **Ulazni računi (knjiženje faktura dobavljača)**: "Proknjiži ulazni
  račun" sa brojem računa dobavljača, datumom, rokom plaćanja, iznosom i
  PDV iznosom (opciono). Status: otvoren / plaćen / kasni (rok prošao).
- **Automatsko zatvaranje**: potvrđena isplata partneru na izvodu
  automatski označava njegov otvoren ulazni račun plaćenim (po tačnom
  iznosu ako je jedinstven, ili po broju računa u opisu uplate).
  Radi u oba smjera: ako je izvod stigao prije knjiženja, račun se
  zatvara odmah pri knjiženju. Vraćanje stavke iz potvrde ponovo otvara
  račun. Ručno "Plaćen" / "Vrati" postoji za gotovinska plaćanja.
- Sekcije: ulazni računi, naše fakture partneru (sa statusom naplate),
  sve transakcije sa izvoda (oznaka "zatvorio račun" na isplati koja je
  zatvorila ulazni račun).
- **Šifra partnera**: svaki partner dobija redni broj u organizaciji
  (prikaz "0003"), vidi se u listi, kartici i izboru dobavljača.
- **Kartica prometa (PDF)**: "Kartica kupca" (fakture duguju, uplate
  potražuju) i "Kartica dobavljača" (njegovi računi potražuju, naša
  plaćanja duguju), sa kumulativnim saldom, UKUPNO redom i paginacijom.
  Preuzimanje PDF-a ili **slanje direktno na email partnera** (ako je
  upisan; ako je partner i kupac i dobavljač, šalju se obje kartice).
  Uz dugmad je izbor perioda štampe (od/do); bez izbora se štampa
  cijeli period prometa.
- **Web kartica prometa**: na stranici partnera je ista tabela kao na
  PDF-u (Rb, Datum, Opis, Duguje, Potražuje, kumulativni Saldo) sa
  UKUPNO redom i saldom na dnu; negativan saldo je istaknut. Ako je
  partner i kupac i dobavljač, prebacuje se toggle-om.
- **Vezanje transakcija za partnera**: po žiro računu (najpouzdanije)
  ili po nazivu protivstrane sa labavim uparivanjem: velika/mala slova,
  kvačice (Ć=C) i pravne forme (doo, d.o.o., dd, pzu, szr...) se
  ignorišu. Isto uparivanje važi za vezanje faktura na kupce.
- **Pretraga** (svi tabovi): kuca se slovo po slovo; tekst traži po
  nazivu i gradu (bez obzira na kvačice i velika slova), a brojevi po
  šifri (prioritet), JIB-u i žiro računima.
- **Kolone po tabu**: Kupci i Dobavljači prikazuju dugovnu stranu,
  potražnu stranu i saldo (kao na kartici); Svi aktivni prikazuje
  "Njihov dug" / "Naš dug" (osnova za kompenzaciju).
- Uređivanje podataka partnera: olovka u listi ili "Uredi podatke" na
  kartici partnera.
- Datumi se svuda unose kao DD.MM.GGGG., a tačke se same upisuju tokom
  kucanja.
- **Knjiženje ulaznog računa, dva ulaza**: sa kartice partnera (dobavljač
  fiksiran) ili globalno sa liste partnera ("Proknjiži ulazni račun"),
  gdje se dobavljač bira iz liste (sa šiframa), a plusić odmah dodaje
  novog partnera pa vraća na knjiženje.
- **Rok plaćanja**: ako se ne unese, podrazumijeva se 30 dana od datuma
  računa.
- **PDV na ulaznom računu** (samo za obrte PDV obveznike): checkbox
  "Faktura sadrži PDV (17%)"; iz ukupnog iznosa program sam izbije PDV
  (17/117) i prikaže osnovicu + PDV. PDV iznos se čuva odvojeno (osnova
  za KUF). Bez checkboxa se podrazumijeva da fakture nema PDV; obrti van
  PDV sistema ovaj izbor ne vide.

## 12. Zaposlenici

Stranica: Zaposlenici → Zaposlenici.

- Lista radnika i vlasnika obrta (podaci dijeljeni sa Poreznim
  Kalkulatorom): ime, uloga (vlasnik istaknut), status (prijavljen /
  odjavljen / nacrt), pozicija, period rada i ugovorena plata.
- Dodavanje i izmjene se rade na Poreznom Kalkulatoru ("Dodaj / uredi
  radnike"), a u PK Office se sve odmah vidi.

## 13. Obračuni plata

Stranica: Zaposlenici → Obračuni plata.

- Pregled obračuna po mjesecu (default: prethodni mjesec do 25. u
  tekućem): po radniku neto, status (nacrt / obračunato / isplaćeno),
  topli obrok; KPI kartice: ukupno neto, doprinosi, porez, ukupan trošak.
- Akcije za mjesec: **Sve platne liste (PDF)**, **MIP-1023 XML**
  (preuzimanje se bilježi pa Početna zna da je MIP riješen),
  **Označi mjesec isplaćenim**.
- Platna lista po radniku (PDF) jednim klikom.
- Sam obračun (sati, bolovanja, izmjene) se radi na Poreznom Kalkulatoru
  ("Obračunaj plate"); status plata i MIP-a se vidi i na Početnoj.

---

## Tehnička bilješka (za razvoj, ne za tutorijal)

- Parseri: `backend/src/services/bankStatements/` (engine + bank moduli
  + kategorije + pravila + javni prihodi). Nova banka = novi modul;
  layout se snima alatom `node scripts/dumpPdf.js <pdf>`.
- Testovi: `cd backend && npm test` (fixture izvodi svih banaka +
  kategorizacija).
- KPR servis: `backend/src/services/kpr.js`; PDF fill:
  `frontend/src/sections/kpr/fillKpr1041.ts` (koordinate izmjerene iz
  vektorske mreže obrasca; test: `node scripts/test-kpr-fill.mjs N`).
- Slijedi: Transakcije tab (flat pretraga), fakture u PK Office +
  auto-match priliva, KUF/KIF + PDV prijave (zadnje).
