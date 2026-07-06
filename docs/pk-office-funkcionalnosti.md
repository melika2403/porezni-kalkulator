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
- **Provjera vlasnika izvoda**: ako se u tekstu izvoda ne prepozna naziv
  organizacije, izvod se uveze ali sa jasnim upozorenjem da je možda
  učitan izvod druge firme (nema blokade).
- **Računi u profilu**: lista žiro računa se vidi i uređuje SAMO u PK
  Office postavkama (Postavke → Profil obrta); prvi je glavni i koristi
  se na fakturama i uplatnicama. Marketing forma organizacije ima samo
  glavni račun (izmjena tamo sinhronizuje prvi element liste). Novi
  račun viđen na učitanom izvodu se automatski dodaje u listu (osim kad
  je aktivno upozorenje o vlasniku); isto i za ručno upisan račun kod
  ručnog unosa izvoda.
- PK Office postavke obrta pokrivaju ista polja kao marketing forma
  (naziv, adresa, grad, djelatnost iz KD šifrarnika, entitet, režim i
  kategorija, PDV, kontakt, default tip plate, topli obrok); obje strane
  snimaju u istu organizaciju pa je izmjena bilo gdje vidljiva svugdje.
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
  novog), broj izvoda (opciono, uz prijedlog: zadnji uneseni broj + 1) i
  datum (default danas).
- Unose se **ukupan promet duguje i potražuje** sa izvoda (u istom redu,
  kucaju se jedno za drugim) kao kontrolne sume, pa stavke (smjer
  Duguje/Potražuje, opis, protivstrana, iznos). Stavke nemaju svoj
  datum: sve nose datum izvoda.
- Brzi unos: Enter u polju iznosa dodaje novu stavku i fokusira njen
  opis; datum izvoda ima auto-tačke i kalendar, iznosi se formatiraju
  pri kucanju ("1.234,00"). Prazan opis podrazumijevano dobija
  "Izvod N" (broj sa vrha).
- **Protivstrana je autocomplete partnera**: traži po nazivu, šifri ili
  žiro računu; potvrdom prijedloga stavka se veže na partnera (ide na
  njegovu karticu, a isplata dobavljaču zatvara njegov otvoren ulazni
  račun). "+ Novi partner" otvara formu sa prenesenim ukucanim
  tekstom (naziv ili žiro račun) i po snimanju odmah poveže red.
  Slobodan tekst bez potvrde ostaje obična protivstrana (backend i
  dalje pokušava auto-match po tačnom nazivu/računu).
- Kontrolna traka uživo pokazuje slaganje po koloni (i koliko fali ili
  je višak); **snimanje je moguće tek kad se zbir stavki poklopi sa
  unesenim prometom**, a pored sivog dugmeta piše šta još nedostaje.
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
- Paginacija: 20 rezultata po stranici, dugmad Prethodna/Sljedeća i
  brojač "X–Y od Z"; novi filter vraća na prvu stranicu.

## 10. Fakture i auto-match naplate

Stranica: Finansije → Fakture.

- Fakture su **dijeljene sa Poreznim Kalkulatorom** (isti podaci): šta se
  izda na main page, vidi se u PK Office i obratno. "Nova faktura" otvara
  istu formu unutar PK Office-a (/app/fakture/nova) i nakon snimanja
  vraća na listu.
- **Prodavac se ne unosi**: u PK Office formi je prodavac uvijek aktivna
  organizacija iz sidebara (kartica Prodavac je sakrivena, prikazuje se
  samo naziv i adresa sa linkom na postavke obrta). Naziv, adresa,
  telefon, e-mail, ID/PDV broj, glavni žiro račun i logo se povlače iz
  postavki obrta; telefon, e-mail i logo se ispisuju u zaglavlju PDF-a.
  Kod dupliranja fakture prodavac se uzima iz svježih postavki, ne sa
  stare fakture. Logo se u PK Office-u postavlja u Postavke → Profil
  (sekcija Logo); entitet se u postavkama ne bira (sjedište obrta je u
  FBiH, podrazumijeva se).
- Tri taba sa brojačima: **Izlazne** (naše fakture), **Ulazne** (svi
  ulazni računi dobavljača, isti podaci kao na karticama partnera:
  označi plaćenim, vrati u otvoreno, obriši, link na karticu) i **Sve**
  (glavna knjiga dokumenata: izlazne i ulazne hronološki zajedno).
- KPI red: njihov dug (otvorene fakture), naš dug (otvoreni ulazni
  računi), saldo otvorenog; za PDV obveznike i PDV razlika tekuće godine
  (izlazni minus ulazni PDV) kao najava buduće KIF/KUF obaveze.
- Badge "kasni" na obje strane kad rok prođe (nenaplaćena faktura,
  neplaćen račun); kod PDV obveznika je PDV split pri knjiženju ulaznog
  računa default uključen (podaci za budući KUF).
- Lista izlaznih: broj, kupac, datumi (izdavanja, rok, naplate), iznos,
  status (nacrt / izdana / naplaćena / stornirana), filter po statusu,
  PDF preuzimanje.
- **Avansna faktura**: dugme "Avansna faktura" otvara pojednostavljenu
  formu (kupac + opis + primljeni iznos sa PDV-om; PDV se računa
  preračunatom stopom 17/117, opcija bez PDV-a za neoporezive avanse).
  Ima SVOJU numeraciju (A-0001-2026...), odmah se vodi kao naplaćena
  (avans je primljen novac), a u KIF ulazi kao tip 03 / vrsta avansna.
- **Storno avansne fakture**: ISKLJUČIVO akcija nad postojećom avansnom
  ("Storniraj avans" u meniju reda), tipično kad se izda konačna
  faktura. Pravi se vezani dokument sa istim iznosima u A- seriji koji
  u KIF, PDV prijavu i karticu partnera ulazi NEGATIVNO. Jedna avansna
  se može stornirati samo jednom; na listi avansna dobija oznaku
  "stornirana (A-xxxx)".
- **Knjižna obavijest**: akcija na standardnoj izdanoj/naplaćenoj
  fakturi; modal traži iznos umanjenja (sa PDV-om, može i djelimično,
  više obavijesti po fakturi) i razlog. Dokument ima KO- seriju, u
  knjige ulazi negativno, a PDF nosi zakonsku napomenu da kupac PDV
  obveznik ispravlja odbitak ulaznog PDV-a (čl. 20. st. 11. ZPDV).
- **Pretvaranje predračuna u fakturu**: akcija "Pretvori u fakturu" u
  meniju reda predračuna; nova faktura dobija današnji datum i sljedeći
  F- broj, stavke i kupac se prenose, predračun dobija oznaku
  "pretvoren u F-xxxx" i ne može se pretvoriti dvaput.
- **Kopiranje fakture**: akcija "Kopiraj" u meniju reda (standardne
  fakture i predračuni). Modal: datum novog računa (default danas; rok
  plaćanja isti razmak kao original), kupac isti ili zamjena partnerom
  iz šifarnika, read-only pregled stavki i cijena sa totalom, checkbox
  "Obriši staru fakturu nakon kopiranja" (default ISKLJUČEN; briše se
  tek kad kopija uspije). Kopija ide standardnim redoslijedom: sljedeći
  broj serije i mjesto u KIF-u po novom datumu; prodavac se uzima iz
  svježih postavki obrta. Za izmjenu stavki/cijena dugme "Otvori u
  formi" otvara kompletnu formu predpopunjenu iz originala.
- Iznosi u bazi su UVIJEK pozitivni; predznak (storno/KO = minus) se
  izvodi iz vrste dokumenta, dosljedno u listi, KIF-u, PDV prijavi,
  e-KIF-u, PDF izvještaju i kartici partnera (tamo storno/KO idu u
  potražuje). PDV razlika na KPI-u računa predznak i isključuje
  predračune.
- **Samo PDV evidencija (KUF)**: checkbox u knjiženju ulaznog računa za
  stavke koje pripadaju samo KUF-u, tipično uvoz (odbitni PDV sa JCI,
  plaćen UINO-u/špediteru, dok račun ino dobavljača ide zasebno bez
  PDV-a). Takva stavka ulazi u KUF, e-KUF i prijavu, ali NE stvara
  obavezu: ne ulazi u naš dug, karticu partnera ni auto-match, u listi
  nosi oznaku "PDV evidencija" i odmah je zatvorena.
- **Proknjiži pazar (KIF)**: dugme na KIF tabu /app/pdv za PDV
  obveznike. Zbirno mjesečno knjiženje gotovinskog prometa: unese se
  bruto pazar (PDV se računa preračunatom stopom 17/117), broj
  dokumenta (default PAZAR-MM/GGGG, može broj fiskalnog izvještaja);
  modal predloži zbir potvrđenih pologa pazara sa izvoda za taj mjesec
  (kategorija PAZAR) uz dugme "Preuzmi iznos". Stavka se knjiži na
  zadnji dan mjeseca kao gotovinska naplata: ulazi u KIF, e-KIF i
  prijavu, PDV ide u krajnju potrošnju (32/33/34), ne stvara
  potraživanje i NE dira KPR (prihod tamo već knjiže polozi sa izvoda).
- **Brisanje iz knjiga**: svaki red KUF-a i KIF-a ima ikonu korpe (uz
  potvrdu). Briše se sam dokument (ulazni račun odnosno izlazni
  dokument), trajno: nestaje iz knjige, e-evidencije, prijave i sa
  liste faktura; transakcije sa izvoda ostaju netaknute.
- **Kontrola knjiga na prijavi**: iznad pregleda prijave stoji kontrolni
  red sa izlaznim PDV-om iz KIF-a (polje 51) i odbitnim iz KUF-a
  (polje 61) + upozorenja: fakture u nacrtu za period (ne ulaze u KIF),
  ulazni računi dobavljača PDV obveznika bez unesenog PDV iznosa
  (zaboravljen split) i izvozne fakture bez broja JCI.
- Planirano: posebna šema u građevinarstvu (čl. 40 ZPDV): oznaka u
  KUF/KIF knjiženju, odbitak po plaćanju (mehanizam kao "PDV na
  čekanju"), posebne kolone u e-KUF/e-KIF (čeka se primjer CSV-a sa
  PŠG stavkom iz korisnikovog starog programa).
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
- Četiri taba sa brojačima: **Kupci** (naplaćeno + otvorene fakture),
  **Dobavljači** (plaćeno), **Svi aktivni** (kolone Promet, "Njihov dug"
  i "Naš dug" za kompenzacije; "Naš dug" se puni kad stigne knjiženje
  ulaznih računa) i **Imenik** (svi uneseni partneri, i oni bez prometa,
  za pregled i uređivanje). U prva tri taba su samo partneri sa kojima
  se poslovalo.
- Sortiranje liste: najnovija aktivnost (default), abecedno ili po
  šifri. Rijetke akcije reda (knjiženje ulaznog računa, brisanje) su u
  overflow (tri tačke) meniju; brisanje traži potvrdu kroz modal.
- **Partner se može povezati i direktno sa izvoda**: u modalu stavke
  (detalj izvoda ili Transakcije) polje "Partner (kartica)" traži po
  nazivu/šifri/računu, "+ Novi partner" otvara formu sa prenesenom
  protivstranom i računom. Povezivanjem stavke nestaje i odgovarajući
  prijedlog na Partnerima.
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

- Tabela radnika i vlasnika obrta (podaci dijeljeni sa Poreznim
  Kalkulatorom): ime sa avatarom (vlasnik istaknut), JMBG, datum
  prijave i odjave, status (prijavljen / odjavljen / nacrt) i plata
  (za vlasnika obrta osnovica za doprinose po režimu).
- Dodavanje i uređivanje ide direktno u PK Office-u: klik na red ili
  olovčica otvara modal sa PUNOM formom radnika (paritet sa marketing
  formom): lični podaci (JMBG sa validacijom i auto-spolom, lična,
  stručna sprema), adresa i banka (FBiH grad sa liste ili RS opština,
  račun sa maskom, email za platne listiće), JS3100 prijava/odjava
  (datumi su master, status derivat), ugovor o radu i plata (vrsta i
  trajanje ugovora, radno vrijeme, topli obrok, putni trošak, tip
  plate bruto/neto, probni rad, otkazni rok, broj ugovora), porezni
  koeficijent i minuli rad (datum prvog zaposljenja ili staž prije
  firme). Ista polja i payload logika kao marketing forma, pa se
  izmjene vide na obje strane.
- Pravila brisanja radnika (backend guard + poruke u modalu):
  vlasnik se ne briše nikad (organizacija ne postoji bez vlasnika,
  akcija se i ne nudi); radnik označen kao direktor/potpisnik d.o.o.-a
  se ne briše dok se ne odabere zamjena; radnik sa bilo kojim
  obračunom plate se ne briše nikad, ni narednih godina (obračuni se
  čuvaju trajno: GIP, penzijski staž, kontrole), njega se samo
  odjavljuje. Brisanje prolazi samo za radnike bez ijednog obračuna.
  Za PRIJAVLJENOG radnika potvrda nosi veliko crveno upozorenje
  (ispravan postupak je odjava), za odjavljene standardna potvrda.
- Limiti plana isti kao na marketing strani (PRO 5 radnika, free 1).
- Akcije po redu: vidljivo "Uredi" + kebab meni (Obriši uz potvrdu).
- Ista tabela i ista modal forma koriste se i na marketing stranicama
  /organizacija/:id i /aktivni-radnici (na aktivnim radnicima uz brze
  akcije: Ugovor i Uredi vidljivi, u meniju JS3100, Otkaz, Karton
  radnika, Obriši). Jedan izvor forme = izmjena radnika izgleda i
  ponaša se isto na obje strane.
- U istom (PK) stilu su i: karton radnika (/aktivni-radnici/:id,
  zaglavlje sa avatarom i brzim akcijama, info kartice, dokumenti,
  Uredi otvara punu formu), kartice "Direktor i potpisnik" i "Pristup
  korisnicima" na /organizacija/:id, i "+ Novi radnik" u sidebaru
  (šihterica, plata...) koji sad otvara punu formu (stari brzi unos
  QuickAddWorkerModal je obrisan).

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

## 14. Rješenja i odluke (kadrovski akti)

Stranica: Porezni Kalkulator → Rješenja i odluke (`/rjesenja-i-odluke`).
Dostupna i preko dugmeta "Godišnji odmor" u dosijeu radnika (Aktivni
radnici) koje auto-popuni radnika i firmu.

- Dokumenti su grupisani u 4 kategorije (dropdown po kategoriji, ispod
  piše koji je dokument izabran):
  - **Potvrde**: Potvrda o zaposlenju, Potvrda o visini primanja, Potvrda
    o radnom stažu.
  - **Rješenja**: o godišnjem odmoru (u cjelosti / dva dijela / period),
    o plaćenom odsustvu (čl. 53.), o neplaćenom odsustvu (čl. 54.), o
    porodiljskom odsustvu (čl. 62.).
  - **Nagrade i isplate**: Odluka o regresu, o prigodnoj nagradi, o
    isplati otpremnine (čl. 111.), o pravu na topli obrok.
  - **Radni odnos**: Odluka o promjeni plate, Aneks ugovora o radu (oba
    potpisa), Odluka o korištenju službenog vozila, Upozorenje pred otkaz
    (čl. 96.).
- Auto-popuna iz profila radnika: ime, radno mjesto, rod, JMBG, datum
  zaposlenja, radni staž (izračunato trajanje), period zadnja 3 mjeseca,
  prosječna neto plaća iz obračuna (potvrda o primanjima), stara plaća i
  broj/datum ugovora. Sve je editabilno.
- Uslovni tekst po dokumentu, opciono obrazloženje i pouka o pravnom
  lijeku. Veće zaglavlje firme i naslov u izlazu.
- Preuzimanje u **PDF** i **Word (DOCX)**; dokument se arhivira u dosije
  radnika. Preuzimanje je Business funkcija; pregled je dostupan svima.
- Napomena: pravni tekst za upozorenje, otpremninu i aneks treba provjeriti
  za konkretan slučaj prije upotrebe.

---

## 15. PDV evidencije (KUF i KIF)

Stranica: Knjige i evidencije → PDV evidencije (za PDV obveznike; ostali
vide uputu da uključe PDV status u postavkama obrta).

- Dva taba sa brojačima: **KUF** (knjiga ulaznih faktura, puni se iz
  proknjiženih ulaznih računa) i **KIF** (knjiga izlaznih faktura, puni
  se iz izdanih/naplaćenih faktura; nacrti i stornirane ne ulaze).
  Pregled po mjesecima (izbor mjeseca i godine).
- Kolone knjige: r.br., tip dokumenta, broj i datum fakture, datum
  prijema (KUF), partner, JIB/PDV broj, vrsta, ukupno, osnovica, PDV;
  red totala na dnu. KUF se filtrira po **datumu prijema** (odbitak
  pripada mjesecu prijema fakture).
- **Knjiženje u KUF** na ulaznom računu (sekcija za PDV obveznike):
  - datum prijema (prazno = datum računa);
  - vrsta fakture: domaći dobavljač / uvoz / poljoprivrednik (paušal);
  - tip dokumenta 01-09 po UINO evidencijama (roba i usluge iz zemlje,
    vlastita potrošnja, dati avansi, uvozna faktura-JCI, usluge iz
    inostranstva, naknadna umanjenja, ispravak odbitka, posebna šema
    građevinarstva, ostalo);
  - vrsta dokumenta: redovna / avansna / knjižna obavijest / storno
    avansne / PDV na čekanju / ostalo;
  - kod uvoza: broj i datum JCI;
  - **PDV koji se ne može odbiti kao iznos** (npr. gorivo za putnički
    auto: dio PDV-a odbitni, dio ne); ulazi u KUF ali ne u polje 61;
  - kod poljoprivrednika: paušalna naknada (polja 23/43 prijave);
  - krajnja potrošnja: entitet + iznos. Neodbitni PDV je krajnja
    potrošnja obveznika, pa se KP popuni automatski (entitet sjedišta +
    iznos neodbitnog PDV-a; entitet se može promijeniti ako se troši u
    drugom entitetu). Napomena: dobavljač koji nije u PDV-u ne stvara
    KP (nema PDV-a na fakturi).
  **Vrsta isporuke** na fakturi (oporeziva / izvoz / oslobođena; izvoz
  i oslobođena automatski isključuju obračun PDV-a).
- **Knjiženje u KIF**: olovčica na redu KIF-a otvara modal sa tipom
  dokumenta 01-09 (roba i usluge iz zemlje, vlastita potrošnja,
  primljeni avansi, izvozna faktura-JCI, usluge stranom licu, PDV-SL-2,
  manjak, donacije, ostalo), vrstom fakture (domaći / inostrani kupac,
  vanposlovne svrhe, ostalo neoporezovano, gotovinska naplata uz / bez
  računa), vrstom dokumenta i krajnjom potrošnjom (entitet + iznos).
  Defaulti se izvode automatski: izvoz → tip 04 + inostrani kupac;
  kupac bez PDV broja → KP = entitet sjedišta sa iznosom PDV-a.
- Obračun prijave poštuje klasifikacije: knjižne obavijesti i storno
  avansa umanjuju isporuke/nabavke i PDV, "PDV na čekanju" ne ulazi u
  odbitak, poljoprivrednik puni polja 23/43, uvoz 22/42, krajnja
  potrošnja polja 32/33/34 po entitetu.
- **Otvaranje knjiženja**: klik na red KUF-a otvara kompletno knjiženje
  (sva polja editabilna, kao unos); klik na red KIF-a otvara pregled
  fakture na ekranu (zaglavlje, prodavac/kupac, stavke, totali) sa
  dugmadima "Knjiženje u KIF" i "PDF". Isti pregled/knjiženje se otvara
  i klikom na red u Fakturama (izlazne → pregled, ulazne → knjiženje).
- **Preuzmi izvještaj (PDF)**: dugme na KUF/KIF tabu preuzima izvještaj
  za izabrani mjesec kao PDF (A4 položeno, zaglavlje obrta i perioda,
  sve kolone uklj. datum prijema, šifru, tip i odbitni/neodbitni PDV,
  totali, paginacija sa ponovljenim zaglavljem).
- **JCI za izvoznu fakturu**: u knjiženju u KIF, izbor tipa 04 (izvozna
  faktura) otvara polja broj i datum JCI; upisuje se pri knjiženju (JCI
  se dobije nakon carinjenja), a u e-KIF ide umjesto broja fakture.
  Referentni broj JCI ima 18 znakova (npr. 26BA010802012345H3: godina +
  BA + šifra ispostave + broj), unos je ograničen na 18 i velika slova.
- **Matični podaci partnera iz knjiženja**: ikonica pored dobavljača u
  knjiženju ulaznog računa i na kartici kupca u pregledu fakture otvara
  uređivanje partnera (JIB, PDV broj, adresa...) bez odlaska na
  Partnere. Kupac na fakturi je snapshot pa se partner traži po PDV
  broju / JIB-u / nazivu; ako ne postoji, otvori se novi predpopunjen.
- **Filteri izvještaja**: iznad KUF/KIF tabele su filteri po tipu
  dokumenta, vrsti fakture i vrsti dokumenta (kao u starijim
  programima). Važe za tabelu, totale i PDF izvještaj; PDV prijava,
  sažetak ispod knjige i e-KUF/e-KIF UVIJEK idu iz kompletne knjige
  (uz aktivni filter piše koliko je stavki prikazano od ukupno).
- **Pregled raspona mjeseci**: na KUF/KIF tabu se pored mjeseca bira i
  "do mjeseca" (npr. januar do decembra = cijela godina). Raspon važi
  za tabelu, totale i PDF izvještaj (KUF-01-06-2026.pdf, u zaglavlju
  period 01-06/2026); PDV prijava, D-PDV i e-KUF/e-KIF ostaju strogo
  mjesečni (e-dugme je kod raspona onemogućeno uz objašnjenje, sažetak
  za prijavu se skriva).
- Sažetak ispod knjige: izlazni PDV (KIF), ulazni odbitni PDV (KUF) i
  polje 71 (obaveza / kredit).
- **Tab PDV prijava**: pregled prijave NA EKRANU (raspored prati
  zvanični Obrazac P PDV), obračunato automatski iz KUF/KIF za izabrani
  mjesec, nula ručnog unosa; ispod je "Preuzmi PDV prijavu (PDF)"
  (pomoćni crno-bijeli obrazac sa kojeg se vrijednosti unose na UINO
  e-portal). Polja po zvaničnom obrascu: 11 isporuke (osim 12 i 13),
  12 izvoz, 13 oslobođene; 21 nabavke (osim 22 i 23), 22 uvoz, 23 od
  poljoprivrednika; 41 ulazni PDV domaći odbitni, 42 PDV na uvoz,
  43 paušalna naknada; 51 izlazni PDV; 61 = 41+42+43; 71 = 51 − 61
  (pozitivno = uplata do 10. u mjesecu; negativno = kredit, uz
  checkbox polja 80 zahtjev za povrat); 32/33/34 = PDV na isporuke
  licima koja nisu registrovani obveznici (kupci bez PDV broja),
  po entitetu sjedišta.
- **Tab D-PDV** (Dodatak uz PDV prijavu): čisto ručni unos po mjesecu,
  čuva se u bazi (pdv_dodaci). Struktura kao zvanični obrazac: isporuke
  (10 stavki) i nabavke (9 stavki + zalihe) sa kolonama Bez PDV-a / PDV;
  pretežna djelatnost default iz profila obrta. Predpopuna iz podataka
  moguća kasnije.
- **Preuzmi obrazac (.xls)**: dugme na D-PDV tabu prvo sačuva unos, pa
  popuni zvanični UINO obrazac i preuzme ga kao `D-PDV_MM-GGGG.xls`,
  vizuelno identičan originalu (ivice, kućice, formule ostaju).
  Popunjava se zaglavlje (naziv, ID broj u kućice, adresa, period,
  pretežna djelatnost, mjesto, datum, odgovorno lice), iznosi stavki
  (prazno = 0) i mašinski sheet "Polja iz obrasca" koji UINO čita.
  Obrazac se šalje e-mailom nadležnom regionalnom centru UINO
  (dpdvrcsa/dpdvrctz/dpdvrcmo/dpdvrcbl@uino.gov.ba). Tehnika: predložak
  `frontend/public/templates/dpdv.xls` je original sa uino.gov.ba u koji
  su kroz Excel upisani placeholder-i fiksnih dužina
  (`scripts/dpdv-prep-template.ps1`), a aplikacija samo prepiše bajtove
  na offsetima iz `scripts/dpdv-find-offsets.js`
  (`src/sections/pdv/dpdvExcel.ts`). Ako UINO promijeni obrazac,
  ponoviti obje skripte i zalijepiti nove tabele offseta.
- **e-KUF / e-KIF (CSV)**: dugme na KUF/KIF tabu preuzima elektronsku
  evidenciju za izabrani mjesec u formatu koji UINO e-portal prihvata
  (UTF-8 sa BOM, `;` separator, decimalna tačka, ISO datumi; red 1 =
  zaglavlje, redovi 2 = stavke, red 3 = totali sa brojem stavki). Ime
  fajla `PDVBROJ_GGMM_1_01.csv` (e-KUF) odnosno `_2_01.csv` (e-KIF).
  Redni brojevi stavki teku kroz cijelu godinu. Za uvoz (KUF) i izvoz
  (KIF, tip 04) se umjesto broja fakture šalje broj JCI; knjižne
  obavijesti i storno avansa idu kao negativne stavke; dobavljači koji
  nisu PDV obveznici se šalju bez PDV broja (samo JIB). Prije
  generisanja se provjeravaju JIB (13 cifara) i PDV brojevi (12 cifara)
  partnera i JCI kod uvoza/izvoza; ako nešto fali, fajl se ne pravi
  nego se iznad knjige ispiše lista šta tačno ispraviti. Ako partner
  nema upisan JIB, izvodi se kao "4" + PDV broj.

## 16. Pretplata (tab u PK Office)

Stranica `/app/pretplata` je pregled i samoposluga oko pretplate na
PK Office. Nema automatske naplate: pretplata se plaća uplatnicom po
predračunu, a admin je aktivira/produžava kad evidentira uplatu.

- **KPI red**: član od (datum registracije), dana do isteka (amber kad
  se bliži kraj), ukupno uplaćeno (zbir plaćenih predračuna).
- **Trenutni plan**: naziv plana, status badge (aktivna/istekla, probni
  period), ciklus naplate, vrijedi od-do sa progress barom perioda.
  Dugme "Promijeni plan" vodi na /pretplate. Otkazivanja nema jer nema
  auto-naplate: ako se novi predračun ne uplati, pretplata sama istekne.
- **Obnova**: blok se pojavi kad ostane 30 dana ili manje (godišnja),
  odnosno 7 dana (mjesečna), ili kad je isteklo. Dugme generiše
  predračun za obnovu; novi period ide u kontinuitetu (počinje dan
  nakon isteka tekuće; ako je već isteklo, od danas). PDF se otvori i
  pošalje na email. Ako izdati predračun za obnovu već postoji, umjesto
  dugmeta se prikaže "čeka uplatu" sa linkom na PDF (nema duplikata).
- **Podaci za uplatu**: primalac, transakcijski račun, svrha = broj
  predračuna.
- **Moji predračuni**: tabela svih predračuna (broj, datum, plan i
  ciklus, period koji pokriva, iznos, status Izdat/Plaćen/Otkazan) sa
  preuzimanjem PDF-a (`GET /api/subscription/invoices/:id/pdf`, samo
  vlastiti).
- **Historija uplata**: plaćeni predračuni sa datumom evidentiranja
  uplate i periodom koji je uplata pokrila.
- **Iskorištenje**: pločice sa stvarnim brojkama (organizacije,
  klijenti, radnici, fakture, obračuni plata ovaj mjesec sa razlikom
  prema prošlom, dokumenti) iz `/api/me/stats`. Limiti plana se
  prikazuju kao progress barovi samo kad limit stvarno postoji; na
  planovima bez limita ide jedna rečenica umjesto tri "neograničeno".

## 17. Inbox (grupni uvoz izvoda, poruke, podrška)

Stranica `/app/inbox` ima tri taba (segmented pilula navigacija):
"Uvoz izvoda", "Poruke i obavijesti" i "Podrška (Live chat)". Poruke i
Podrška su u izradi (odvojeno se rade); Uvoz izvoda je funkcionalan.

**Uvoz izvoda** je agencijski alat za knjigovođe koje vode više obrta:
jedino mjesto u PK Office koje ne zavisi od izabrane organizacije nego
radi preko svih organizacija korisnika (gdje je OWNER/ADMIN).

- **Tok**: prevučeš do 20 PDF izvoda odjednom (za različite obrte i
  banke izmiješano) → "Pokreni knjiženje" → program parsira svaki
  izvod, prepozna kojem obrtu pripada i prikaže listu → potvrda po
  izvodu ili "Proknjiži sve spremne". Ništa se ne knjiži bez potvrde.
- **Prepoznavanje obrta**: po žiro računu sa izvoda, uparenom sa
  računima organizacije (glavni račun + lista svih viđenih računa koja
  se automatski dopunjava pri svakom uvozu). Deterministično, bez
  nagađanja.
- **Statusi**: SPREMNO (zeleno, knjiži se jednim klikom), TRAŽI PREGLED
  (žuto: upozorenja tipa kontinuitet salda, naziv firme nije nađen na
  izvodu), VEĆ UČITAN (duplikat po računu + broju izvoda + datumu,
  preskače se), NIJE PREPOZNAT / VIŠE OBRTA (crveno: ručna dodjela
  obrta iz padajuće liste; program tada zapamti račun za ubuduće),
  GREŠKA (nepodržana banka, sken bez teksta, saldo se ne slaže).
- **Pregled stavki**: svaki izvod u listi se može raširiti i vidjeti
  sve stavke (datum, protivstrana/opis, iznos) prije knjiženja.
- **Knjiženje**: svaki potvrđeni izvod prolazi kroz isti uvoz kao na
  Bankovnim izvodima te organizacije (validacija salda, auto-match
  faktura/partnera/kategorija, upozorenja), pa se stavke dalje
  potvrđuju tamo.

## 18. Obrasci (SPR-1053 i GPD-1051 iz knjiga)

Stranica `/app/obrasci`: priprema godišnjih poreznih obrazaca iz knjiga
izabrane organizacije, uz izbor godine (default prethodna godina, jer se
godišnji obrasci predaju za nju). Redoslijed je uvijek: prvo SPR, pa GPD
(SPR je zvanično prilog godišnje prijave).

- **SPR-1053, "Pripremi iz knjiga"**: otvara modal U APLIKACIJI sa
  povučenim ciframa. Obveznik i djelatnost iz organizacije i vlasnika;
  prihodi (gotovina, preko računa, stvari/usluge) i rashodi (roba i
  materijal, bruto plate, doprinosi, ostali) iz KPR-a za tu godinu;
  amortizacija (red 22) iz PLDI obrasca iste organizacije i godine.
  Cifre dolaze ISKLJUČIVO iz KPR-a (princip blagajne, ono što porezna
  vidi), nikad iz obračuna plata. Sve je editabilno; dohodak (red 28) i
  mjesečna akontacija (red 29) se računaju uživo. Dugmad: "Snimi na
  profil" i "Snimi i preuzmi PDF" (isti službeni PDF kao marketing
  generator). Upozorenja u modalu: KPR bez potvrđenih stavki za godinu,
  nepotvrđene stavke, PLDI ne postoji, paušalni režim, nepotpuni podaci
  vlasnika.
- **GPD-1051, "Otvori GPD"**: isto modal u aplikaciji. Red 9 (dohodak od
  samostalne djelatnosti) se puni iz reda 28 SNIMLJENOG SPR-a za istu
  organizaciju i godinu; lični odbitak iz koeficijenta porezne kartice
  vlasnika (koef x 3.600 KM za punu godinu); uplaćene akontacije poreza
  se PREDLAŽU kao zbir uplata prema budžetu kantona sa izvoda. Druge
  izvore dohotka (plata kod poslodavca, najam...) korisnik unosi ručno
  u istom modalu (redovi 8-14, odbici, porez po odbitku...). Obračun
  poreza (osnovica, 10%, doplata/povrat) uživo; kod povrata izbor
  opcije i račun. PDF + snimanje na profil odmah iz modala.
- Marketing generatori /spr i /gpd i dalje razumiju parametre
  `?pkOrg=&pkYear=` (prefill iz knjiga), ali PK Office tok ide kroz
  modale, bez napuštanja aplikacije.
- **Akontacije poreza**: posebna lista na stranici (odvojeno od KPR-a,
  jer te uplate nisu rashod): sve uplate kategorije "porez na dohodak
  vlasnika" u godini, po mjesecu uplate, sa ukupnim zbirom koji ide u
  GPD red 29.
- **Paušalni režim**: cifre se ne povlače (SPR za paušalce ide
  drugačije), povuku se samo podaci obveznika, uz jasno upozorenje.
- Statusi na karticama pokazuju da li je SPR/GPD za izabranu godinu već
  snimljen na profilu.

## 19. Kompenzacije i cesije (knjiženje bez novca)

Novi pod-tab "Kompenzacije i cesije" na `/app/fakture`: zatvaranje kupaca
i dobavljača bez novca, sa automatskim ulaskom u KPR. Svako knjiženje
kreira poseban interni "izvod" (Kompenzacija/Cesija) sa odmah potvrđenim
stavkama, pa sve postojeće (KPR, kartica partnera, PDV) radi samo od sebe.

- **Kompenzacija**: nude se SAMO partneri sa otvorenim stavkama na obje
  strane (njihove fakture + naši ulazni računi). Checkboxima se biraju
  stavke na obje strane; prebija se manji zbir, razlika ostaje otvorena.
  Prečica postoji i na kartici partnera (dugme se pojavi kad partner ima
  dug na obje strane).
- **Cesija (v1: mi smo cedent)**: ručni izbor, kupac/dužnik (cesus) čije
  fakture ustupamo + dobavljač (cesionar) čije račune izmirujemo.
- **KPR**: prihodna strana ide u kolonu 12 (kao standardna naplata preko
  računa, odluka vlasnika), rashodna u k16 (roba/materijal) ili k19
  (ostali rashodi) po izboru u modalu. PDV split za obveznike automatski
  (17/117 u kolone 14/20).
- **Djelimično zatvaranje**: fakture nemaju parcijalno plaćanje, pa puna
  alokacija zatvara dokument, a stavka na strani viška ostaje otvorena
  (u KPR ulazi samo prebijeni dio); modal to jasno ispiše.
- **Dokumenti**: "Proknjiži i preuzmi PDF" generiše prijedlog
  kompenzacije odnosno trostrani ugovor o cesiji (isti generatori kao
  marketing /cesije-i-kompenzacije), predpopunjene stranama i stavkama.
- **Brisanje**: uklanja KPR stavke i vraća fakture/račune u otvoreno
  (postojeći revert mehanizam).
- Broj dokumenta automatski po tipu i godini: K-1/2026, C-1/2026...
- Račun koji je "samo PDV evidencija" (npr. uvoz) ne stvara obavezu i ne
  može se prebijati.

Uz to, kategorije transakcija sad imaju i varijante BEZ PDV-a: "Prihod
bez PDV-a (izvoz, inostranstvo)" (kolona 12, puni iznos), "Nabavka robe
i materijala bez PDV-a" (k16) i "Ostali rashodi bez PDV-a" (k19). Za
prilive/odlive na koje PDV nije obračunat KPR više ne izbija 17/117.
Program uči po partneru: jednom potvrđena kategorija se kod sljedeće
transakcije istog partnera sama predloži.

Kod nove fakture u PK Office (/app/fakture/nova) kupac se bira iz liste
partnera organizacije (pretraga po nazivu/šifri) ili se doda novi
partner direktno iz forme; izbor puni sva polja kupca (JIB veže fakturu
na karticu partnera).

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
