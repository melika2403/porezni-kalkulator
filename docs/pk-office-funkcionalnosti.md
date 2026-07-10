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
- "Dodaj novi obrt" otvara punu formu (Postavke, tab "Novi obrt"): isti
  izgled kao "Profil obrta", na vrhu izbor "Moj obrt" / "Obrt klijenta".
  Za klijenta: ime, prezime, JMBG, grad (prebivalište, sa liste, za
  obračun doprinosa) i opcioni datum prijave vlasnika (sa datumom je
  odmah PRIJAVLJEN i ulazi u obračun doprinosa vlasnika; bez datuma
  ostaje DRAFT pa se prijava radi kroz JS3100). Vlasnik klijentskog obrta
  se vodi kao prijavljeni radnik. Grad obrta se bira sa liste (kanton i
  općina za uplatnice), JIB se ovdje može unijeti (u izmjeni je
  zaključan), logo se dodaje tek nakon kreiranja. Na "Kreiraj obrt":
  obrt se kreira, aktivira u PK Office slot i postaje aktivna
  organizacija (otvore se njegove postavke); vidi se i na marketing
  strani (/organizacije), isti Organization zapis. Ako su slotovi paketa
  puni, obrt je kreiran ali ostaje van PK Office uz jasnu poruku. PK
  Office pretplatnici i trial korisnici mogu kreirati obrte bez obzira
  na marketing rolu (limit je slot, ne rola); bez uključene naplate
  vrijede stari limiti po planu.

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
  banaka). Grupa se klikom na zaglavlje sklapa/rasklapa, a u zaglavlju
  stoji **zadnje poznato stanje računa** (closingBalance najnovijeg
  izvoda) i broj izvoda. Unutar grupe izvodi idu **po godinama (novija
  prva), a unutar godine od br. 1 do zadnjeg**; ručni izvodi bez broja
  su na kraju godine i pišu se "Ručni izvod" (ne "br. ?").
- Svaki red: broj, datum, broj stavki + **zbir priliva (+, zeleno) i
  odliva (-)**, statusne značke ("N za pregled", "N bez kategorije",
  "potvrđen (n/n)"), kantica za brisanje (uz potvrdu). Lijevi rub reda
  nosi statusnu boju (crveno za pregled, žuto bez kategorije). **Rupa u
  nizu brojeva** unutar godine se označi isprekidanom linijom "možda
  nedostaje izvod br. X" između redova.
- **Filteri liste**: chipovi Svi / Za pregled / Bez kategorije (sa
  brojačima); KPI kartica "Za pregled" je klikabilna i pali isti filter.
  Klik na žutu značku "bez kategorije" otvara izvod filtriran samo na
  te stavke (?bezKategorije=1, uz dugme "Prikaži sve stavke").
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
- **KPR kategorija po stavci sa živim prijedlogom**: dok se kuca opis
  ili protivstrana, program predlaže kategoriju (naučena pravila obrta
  imaju prednost, pa seed heuristike; prilivi default "Prihod, naplata
  preko računa"). Prijedlog je označen u labeli ("· prijedlog") i može
  se ručno promijeniti; opcije su grupisane "Ide u KPR" (sa brojem
  kolone) i "Ne ide u KPR", plus "Bez kategorije (odluči kasnije)".
  Snimanje stavke sa kategorijom uči pravilo za tu protivstranu.
- Kontrolna traka uživo pokazuje slaganje po koloni (i koliko fali ili
  je višak); **snimanje je moguće tek kad se zbir stavki poklopi sa
  unesenim prometom**, a pored sivog dugmeta piše šta još nedostaje.
- Snimljene stavke su odmah potvrđene (korisnik ih je pregledao pri
  unosu) i vraća se na listu izvoda.

Potvrda i kategorija su odvojene stvari: potvrđena stavka **bez**
kategorije ne ulazi u KPR. Zato lista izvoda uz "potvrđen (n/n)" nosi i
žutu oznaku "X bez kategorije" kad takvih stavki ima, a potvrda
pojedinačne stavke bez kategorije pokušava auto-popunu (naučena pravila
pa heuristike) osim kad korisnik kategoriju eksplicitno obriše.

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

- Sve stavke sa svih izvoda na jednom mjestu, najnovije prvo, grupisane
  **podnaslovima po danu**.
- **Pretraga**: opis, protivstrana, referenca, protivračun, ili tačan
  iznos (npr. "480" nađe uplatu od 480,00 KM).
- **Filteri**: smjer (potražuje/duguje), status (za pregled / potvrđeno /
  zanemareno), kategorija (uključujući "bez kategorije"), period od/do +
  **brzi periodi** (Ovaj mjesec / Prošli mjesec / Ova godina).
- **Sume filtriranog skupa**: iznad liste Prilivi / Odlivi / Neto za SVE
  rezultate filtera (ne samo stranicu), pa filteri rade kao
  mini-izvještaj (npr. kategorija + period = koliko je to koštalo).
- **Masovne akcije**: checkbox po redu, pa "Potvrdi označene" ili
  "Dodijeli kategoriju označenima" (stavka pogrešnog smjera za izabranu
  kategoriju se preskoči i prijavi). Backend: PATCH
  /transactions/bulk, ista logika kao pojedinačni update (učenje
  pravila, sync faktura/ulaznih računa).
- Red prikazuje iz kog je izvoda stavka; **banka + broj izvoda je link**
  na izvod, a **kategorija je klik-filter**. Ručni izvodi bez broja pišu
  "Ručni izvod". Svaki red ima "Uredi" dugme (isti modal kao klik).
- **CSV izvoz** filtriranih rezultata (do 5000 stavki, sa BOM za Excel).
- Klik otvara isti modal kao na izvodu (kategorija, potvrda, detalji) +
  link "Otvori izvod" na matični izvod.
- Paginacija: 20 rezultata po stranici, dugmad Prethodna/Sljedeća i
  brojač "X–Y od Z"; novi filter vraća na prvu stranicu i briše izbor.

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
- KPI red (kartice su klikabilne, klik filtrira listu): njihov dug
  (otvorene fakture), naš dug (otvoreni ulazni računi), **Dospjelo (rok
  prošao)**: iznos otvorenog kojem je rok već istekao na obje strane,
  saldo otvorenog; za PDV obveznike i PDV razlika tekuće godine
  (izlazni minus ulazni PDV) kao najava buduće KIF/KUF obaveze.
- Badge "kasni" na obje strane kad rok prođe (nenaplaćena faktura,
  neplaćen račun), a uz rok u redu stoji i broj dana ("rok 06.08.2026.
  (za 27 d)" / "(kasni 3 d)"); kod PDV obveznika je PDV split pri
  knjiženju ulaznog računa default uključen (podaci za budući KUF).
- **Pretraga + filteri** (izlazne/ulazne/sve): broj, kupac/dobavljač ili
  iznos; filter po partneru (combobox); period od/do sa brzim chipovima
  (Ovaj mjesec / Prošli mjesec / Ova godina). Desno **sume filtriranog**:
  Ukupno / Naplaćeno / Otvoreno (odnosno Plaćeno za ulazne). Status
  filter izlaznih ima i "Kasne sa naplatom".
- **Prijedlog naplate sa izvoda**: ako na izvodima postoji nepovezan
  priliv identičnog iznosa, izdana faktura dobije plavi chip "moguća
  uplata na izvodu br. X" koji vodi na izvod (poveže se tamo).
- **Email kupcu iz overflow menija**: "Pošalji kupcu emailom" (PDF u
  prilogu) i "Pošalji podsjetnik za plaćanje" (ista faktura + predložen
  tekst opomene, može se urediti); adresa default sa fakture. U redu se
  vidi "email poslan DD.MM.GGGG." (emailSentAt).
- Tab "Sve" je grupisan **podnaslovima po mjesecima**.
- **Prijedlozi kompenzacije** na tabu Kompenzacije i cesije: partneri sa
  otvorenim dugom na OBJE strane se automatski izlistaju ("možete
  prebiti X KM") sa dugmetom koje otvara kompenzaciju sa predizabranim
  partnerom.
- Lista izlaznih: broj, kupac, datumi (izdavanja, rok, naplate), iznos,
  status (nacrt / izdana / naplaćena / stornirana), filter po statusu,
  PDF preuzimanje.
- **Stavke fakture iz šifarnika artikala**: u PK Office-u je polje
  naziva živa pretraga (kao izbor artikla na kalkulacijama): kucanjem se
  filtriraju artikli šifarnika (isti šifarnik kao kalkulacije i lager,
  roba i usluge; izbor popuni naziv, JM i PDV status) i snimljeni
  šabloni stavki (pamte i cijenu), uz strelice + Enter. Na dnu liste je
  "+ Dodaj u šifarnik" koje ukucani tekst snimi kao novi artikal
  (default vrsta usluga) i odmah ga ubaci u stavku. Stara dugmad
  (📋 šabloni / 💾 snimi) ostaju samo na marketing strani forme.
  Brojčana polja (količina, cijena, rabat, PDV) na fokus selektuju
  sadržaj, pa kucanje odmah piše preko nule.
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
- **Knjiži samo PDV (KIF)**: dugme na KIF tabu, ogledalo KUF opcije
  "samo PDV evidencija". Modal: partner, datum, broj dokumenta
  (slobodan tekst), iznos PDV-a. Pravi KIF red sa osnovicom i ukupnim
  iznosom 0, samo izlazni PDV; ulazi u e-KIF (tip 01) i prijavu, ne
  stvara potraživanje i ne dira KPR.
- **Posebna šema u građevinarstvu (čl. 40)**, format potvrđen iz
  stvarnih e-fajlova, knjiži se RUČNO (datum = kad je PDV uplaćen):
  - kad KUPAC uplati naš PDV: naša faktura ide u KIF normalno, a u KUF
    se knjiži "Samo PDV evidencija" (postojeći checkbox u knjiženju
    ulaznog računa): partner = kupac, broj "POSEBNA ŠEMA U
    GRAĐEVINARSTVU", tip dokumenta 08, samo iznos PDV-a. Neto 0.
  - kad MI uplatimo PDV za dobavljača: njegov račun ide u KUF
    normalno, a u KIF se knjiži "Knjiži samo PDV": partner =
    dobavljač, isti tekst kao broj, iznos PDV-a. Neto 0.
  - D-PDV ima PŠG polja na obje strane, popunjavaju se ručno.
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
- **Ukupni promet** (dugme u zaglavlju): PDF izvještaj prometa po partneru
  za izabrani period. Tri vrste: **Dobavljači** i **Kupci** (kolone šifra,
  naziv, duguje, potražuje, saldo sa ukupnim redom) i **Svi partneri**,
  gdje su kupci i dobavljači zajedno, a partner koji je oboje je u JEDNOM
  redu sa kolonama "Njihov dug" (fakture minus uplate), "Naš dug" (računi
  minus plaćanja) i "Razlika" (osnova za kompenzaciju). Ista logika kao
  kartica partnera, pa se izvještaj i kartice uvijek slažu. Period je
  predpopunjen (1.1. tekuće godine do danas) uz brze prečice "Cijela
  godina" (tekuća/prošla) i "Sve" (cijeli promet od početka).
- **Grupni uvoz partnera** (dugme "Uvoz" u zaglavlju): prihvata Com_Soft
  KPS izvoz (XML) ili CSV (Windows-1250, ";" separator). Uvoze se naziv,
  ID broj, PDV broj, adresa, mjesto, telefon, email i žiro računi;
  postojeći partneri (isti ID broj ili isti labavo normalizovan naziv) se
  **preskaču bez izmjena**, a nakon uvoza se prikaže lista preskočenih sa
  razlogom. JIB kod uvoza nije obavezan (stari šifarnici ga često nemaju):
  takvi partneri se uvezu bez ID broja i posebno se prebroje uz napomenu
  da ih treba dopuniti za KUF/KIF. Postojeće nevezane transakcije sa
  izvoda se odmah automatski vežu na uvezene partnere (po žiro računu pa
  po nazivu).

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
- Akcije po redu: vidljivo "Uredi" + kebab meni. U meniju radnika (ne
  vlasnika) je grupa "Kadrovski dokumenti": Ugovor o radu, Otkaz
  ugovora i Rješenja i odluke otvaraju postojeće marketing generatore
  u NOVOJ kartici, predpopunjene (?org= i ?worker= predizbor koji
  generatori već podržavaju); app ostaje otvoren. Ispod je "Ostalo" sa
  Obriši (uz potvrdu).
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

### Stanje PDV-a (kontrola plaćanja i pretplate)

Peti tab na /app/pdv: knjiga knjiženja prema UINO, pandan "Mojoj glavnoj
knjizi" na UINO e-portalu (uporedivo 1:1).

- **Knjiženja**: obaveza po prijavi (zadužuje), pretplata po prijavi
  (odobrava), uplata PDV-a (odobrava), primljen povrat od UINO
  (zadužuje, jer smanjuje pretplatu) i ručna korekcija (kamata, kazna,
  ispravka; smjer se bira). Saldo teče kroz tabelu kao u glavnoj knjizi.
- **Status kartica**: trenutno stanje CRVENO ako je dug, ZELENO ako je
  0,00 ili pretplata, uz raspis po periodima (koji mjesec nosi dug ili
  pretplatu i koliko).
- **Baner na vrhu PDV stranice**: dok postoji dug, na svim tabovima
  stoji crveni baner sa iznosom (zeleni kad je izmireno/pretplata), plus
  broj stavki sa izvoda koje čekaju knjiženje.
- **Iz prijave jednim klikom**: na tabu PDV prijava dugme "Proknjiži u
  stanje PDV-a" knjiži polje 71 kao obavezu (ili pretplatu ako je
  negativno) za taj period; period se ne može duplo proknjižiti (izmjena
  = obriši pa ponovo).
- **Prepoznavanje sa izvoda**: potvrđene stavke izvoda kategorija
  "Uplata PDV-a (UIO)" i "Povrat PDV-a" se automatski nude za knjiženje
  (sekcija "Prepoznato sa izvoda"); klik otvara predpopunjen modal
  (period se pogodi kao prethodni mjesec od datuma stavke). Knjiženje se
  veže za stavku pa se ista uplata ne nudi ponovo; brisanjem knjiženja
  stavka se opet nudi.

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

## 16a. Naplata, slotovi i probni period (iza PK_OFFICE_NAPLATA)

Cijeli sistem naplate je iza env prekidača `PK_OFFICE_NAPLATA`: dok nije
"true", sve radi kao prije (pun pristup, bez limita, ništa od navedenog se
ne prikazuje). Launch naplate = uključiti flag.

- **Office paketi** (subscriptions.plan `office_2/10/25/50`, admin ručno
  aktivira po uplati predračuna): limit broja obrta u PK Office po paketu
  (2/10/25/50). Paketi Tim i veći uključuju kompletan Business bez
  ograničenja; Start je sve-u-jednom za svoja 2 obrta.
- **Slotovi**: obrt se EKSPLICITNO aktivira u PK Office. Upravljanje na
  /organizacije (panel "PK Office obrti": brojač slotova, aktiviraj /
  deaktiviraj sa dvoklik potvrdom) i u PK Office org switcheru (nudi samo
  aktivirane; grupa "Dodaj u PK Office" aktivira preostale uz brojač).
  Deaktivacija NE briše podatke, a slot oslobađa tek od narednog mjeseca
  (obrt deaktiviran u tekućem mjesecu i dalje zauzima slot), da se slotovi
  ne rotiraju. Korisnici bez Office paketa (USER/PRO/BUSINESS) ovaj UI
  uopšte ne vide.
- **Upsell**: korisnik bez Office paketa/probe koji uđe u app umjesto
  sadržaja vidi upsell stranicu (pitch, udarne funkcije, mini cjenovnik,
  link na /pretplate#pk-office), personalizovanu brojem organizacija koje
  već vodi ("klijenti su već tu, nema migracije").
- **Probni period**: dugme "Probaj 30 dana besplatno" na upsell stranici,
  jednom po korisniku (users.pkOfficeTrialEndsAt), na nivou paketa Office
  Tim (10 obrta); odvojen od PRO triala. Neregistrovani do probe dolaze
  kroz marketing CTA-ove ("Isprobaj 30 dana besplatno" na /pretplate,
  landingu i početnoj): registracija → verifikacija maila → trial se
  aktivira automatski (users.wantsOfficeTrial), a /pretplate?officeTrial=auto
  skroluje na PK Office sekciju i pokazuje potvrdu. Pri startu probe se
  SVI obrti korisnika automatski aktiviraju u PK Office ako ih ima do
  limita (10); sa više od limita korisnik sam bira. U probnom periodu
  NEMA anti-rotacije: deaktivacija odmah oslobađa slot, da se svi
  klijenti mogu isprobati prije izbora paketa.
- **Vidljivost probe za korisnika**: dok trial traje, na vrhu PK Office-a
  stoji traka "Probni period je aktivan, vrijedi do DD.MM.GGGG." sa
  linkovima "Upravljaj pretplatom" (profil, tab Pretplata) i "Zatraži
  predračun za paket" (/pretplate#pk-office). Traka se može sakriti
  (localStorage po datumu isteka), ali se u zadnjih 7 dana vraća i mijenja
  boju u upozorenje. Na profilu (tab Pretplata) trial ima svoju sekciju:
  do kada vrijedi, napomena da podaci ostaju sačuvani i poslije probe, i
  dugme za predračun pravog paketa. Korisnik bez ijednog obrta na ulazu u
  /app dobija modal dobrodošlice sa pozivom da doda prvi obrt (vodi na
  postojeću formu u Postavkama).
- Backend: `/api/pk-office/pristup`, `/organizacije/:id/aktiviraj`,
  `/deaktiviraj`, `/trial` (pkOfficeGateController); kolone
  organizations.pkOfficeEnabled/ActivatedAt/DisabledAt.
- **Role i pristupi (agencijski tim)**: office paket kupuje JEDAN korisnik
  (nosilac), a njegov tim NASLJEĐUJE pristup kroz postojeće članstvo u
  obrtu (OrganizationMember): član (bilo koja org rola) obrta koji je
  aktiviran u PK Office, a čiji vlasnik ima aktivan office paket/trial,
  dobija pristup scope-a "naslijedjen" (radi u tim obrtima, ali ne vidi
  slot panel niti upravlja slotovima; kreiranje obrta mu ide po vlastitoj
  roli). Nosilac ima scope "vlastiti". Sjedišta su besplatna (naplata je
  po obrtu). Office paket takođe diže EFEKTIVNU marketing rolu nosioca
  na BUSINESS (tierService.getEffectiveRole: requireOwnerTier,
  org.effectiveTier i /me effectiveRole) pa office pretplatnik i njegov
  tim dobijaju Business funkcije; rola u bazi se NE mijenja. Office
  Start je ograničen na UKUPNO 2 obrta kroz limit kreiranja
  (OFFICE_START_LIMIT), Tim i veći su neograničeni na marketing strani.
- **Per-request gate (requireOfficeOrg)**: kad je naplata uključena, čisto
  PK Office moduli (kalkulacije, lager, blagajna, putni nalozi,
  prebijanja, PDV, bankovni izvodi) po zahtjevu provjeravaju da je obrt
  aktiviran u PK Office (ORG_NIJE_U_PK_OFFICE) i da korisnik ima office
  pristup, vlastiti ili naslijeđen kroz taj obrt (NEMA_OFFICE_PRISTUPA).
  Dijeljeni moduli (fakture, partneri, KPR) namjerno NISU gate-ovani
  (koristi ih i marketing Business). Bez naplate je no-op.
- **VIEWER rola** (organization_members.role enum + ensureMemberRoleEnum):
  read-only član, npr. vlasnik obrta koji samo gleda svoje knjige kod
  knjigovođe. Sve GET rute PK Office modula primaju VIEWER, write rute
  ne. Dodjeljuje se u Postavke → Korisnici i pristupi ("Uvid").
- **Admin panel**: /admin/aktivne-pretplate = lista SVIH pretplata
  (korisnik, paket, ciklus, period, office slotovi X/max) + forma za
  dodjelu/produženje paketa po emailu (uklj. office_2/10/25/50; office
  paketi ne diraju rolu) + Produži/Deaktiviraj po redu. Na listi
  predračuna (/admin/pretplate) dugme "Aktiviraj pretplatu" povuče
  paket/ciklus sa predračuna, upsertuje pretplatu (početak periodStart
  ili danas) i označi predračun plaćenim.

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
- **Vidljivost**: korisnicima koji vode više od jednog obrta grupni
  uvoz se nudi i na Početnoj (istaknuta kartica sa dugmetom "Otvori
  grupni uvoz") i na stranici Bankovni izvodi (traka ispod polja za
  učitavanje); korisnici sa jednim obrtom te ulaze ne vide.

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
  PDF je dostupan UVIJEK, ne samo pri knjiženju: svaki red u listi
  "Kompenzacije i cesije" ima PDF dugme koje dokument regeneriše iz
  snimljenih podataka (stavke sa smjerom, partneri, org), a i modal
  nakon "Proknjiži" nudi "Preuzmi PDF" umjesto ugašene dugmadi.
  VAŽNO za dokument: prikazuju se CIJELI dokumenti (pun iznos fakture i
  računa, backend uz stavku vraća oznaku i punIznos), nikad djelimično
  alocirani KPR iznosi; kompenzuje se manji zbir, a razliku generator
  ispiše kao "Nekompenzirani iznos ... uplatiti na žiro račun". Ugovor
  o cesiji ne prikazuje stavke, samo ukupan ustupljeni (manji) iznos.
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

## 20. Kalkulacije (maloprodaja) i šifarnik artikala

Nova sidebar grupa "Roba" sa stranicom `/app/kalkulacije` (tabovi
"Kalkulacije" i "Artikli"). Maloprodajna kalkulacija (KCM obrazac) je
zaduženje maloprodaje po računu dobavljača; na isti šifarnik artikala se
kasnije veže lager lista.

- **Artikli (šifarnik)**: šifra (automatska "0001", "0002"... ili ručna),
  naziv, **vrsta (roba ili usluga)**, jedinica mjere, bar kod, opcija
  "oslobođen PDV-a". Jedan šifarnik za sve: ROBA ide u kalkulacije i
  lager, USLUGA se nudi samo na fakturama (nema zalihe). Artikal
  korišten na kalkulacijama se ne briše nego deaktivira (stare
  kalkulacije čuvaju snapshot šifre/naziva). Novi artikal se može dodati
  i direktno iz unosa kalkulacije. Isti šifarnik se nudi i pri unosu
  stavki fakture (vidi 10.).
- **Grupni uvoz artikala** (dugme "Uvoz" na tabu Artikli): prihvata
  Com_Soft KPS izvoz (XML) ili CSV (Windows-1250, ";" separator). Uvoze
  se šifra, naziv, jedinica mjere, bar kod i PDV status (stopa 0 =
  oslobođen). Artikli čija **šifra već postoji se preskaču** bez izmjena,
  a nakon uvoza se prikaže šta je preskočeno i zašto (šifra postoji,
  duplikat u fajlu, nema naziv...).
- **Ispis šifarnika** (dugme "Preuzmi PDF" na tabu Artikli): tabela svih
  artikala (šifra, naziv, J/M, bar kod, PDV, status) sa zaglavljem obrta;
  ispis prati aktivnu pretragu.
- **Unos kalkulacije** (`/app/kalkulacije/nova`): zaglavlje (dobavljač iz
  partnera + "Novi", broj i datum računa, datum kalkulacije, po potrebi
  "račun bez PDV-a"), pa panel za unos JEDNOG artikla: artikal se bira
  kucanjem (šifra ili naziv, strelice + Enter), zatim količina, fakturna
  cijena (do 5 decimala), rabat %, zavisni trošak %, marža % i MPC.
  **Marža i MPC su dvosmjerni**: upiši jedno, drugo se izračuna. Enter
  ili "Dodaj stavku" knjiži red i vraća fokus na artikal, pa se roba
  kuca red za redom kao u desktop programima. Živi obračun ispod polja.
  Unesena stavka se **uređuje direktno u tabeli** (olovka pretvara red u
  polja, kvačica sprema), ne vraća se u panel.
- **Obračun kalkulacije**: drugi pod-tab prikazuje sve kolone KCM
  obrasca (iznos, rabat, fakturna, zavisni, nabavni iznos i cijena,
  marža, bez PDV-a, PDV, MPC, maloprodajni iznos) sa sumama; gore su
  stalno vidljive kontrolne sume, gdje se "Ukupan iznos računa"
  (fakturna + ulazni PDV) poredi sa računom dobavljača.
- **Računica** (PDV obveznik): cijene se unose bez PDV-a; MPC sadrži
  17%; ukalkulisani PDV = maloprodajna − maloprodajna/1,17; ulazni PDV =
  17% na fakturnu vrijednost (zavisni trošak nema ulaznog PDV-a). Obrt
  koji NIJE u PDV-u unosi cijene sa PDV-om i nema PDV kolona.
- **KUF/obaveze automatski**: spremanje kalkulacije knjiži i ulazni
  račun dobavljača (broj/datum računa, fakturna vrijednost + ulazni
  PDV; zavisni troškovi NISU dio tog računa). Račun se vidi na
  Partnerima i u KUF-u i zatvara se uplatom sa izvoda kao svaki drugi.
  Izmjena/brisanje kalkulacije sinhronizuje odnosno briše račun; ako je
  račun već plaćen, izmjena je blokirana dok se uplata ne razveže.
- **Pregled**: numerisana lista sa filterima (godina, period od-do,
  dobavljač, tekst pretraga po broju/broju računa/dobavljaču), sume na
  dnu, uređivanje, brisanje i **PDF ispis KCM obrasca** (A4 položeno,
  sve crno, puni nazivi kolona sa prelomom, zaglavlje obrta odvojeno
  linijom od stavki).
- **Kopiranje kalkulacije** (ikona kopiranja u redu liste): otvara unos
  nove kalkulacije predpopunjen dobavljačem i SVIM stavkama originala
  (količine, cijene, rabati, marže, MPC). Broj računa i datumi se unose
  iznova (novi račun dobavljača), spremanjem nastaje nova kalkulacija sa
  svojim brojem i svojim ulaznim računom u KUF-u; original se ne dira.
- Numeracija: redni broj po obrtu i godini (1/26, 2/26...), bez
  maloprodajnih objekata (jedan objekat po obrtu).

## 21. Lager lista i popis (inventura)

Stranica `/app/lager` u grupi "Roba", tabovi "Lager lista" i "Popis
(inventura)". Stanje zaliha se IZVODI (ništa se ne duplira): ulazi su
količine iz kalkulacija, a korekcije dolaze iz proknjiženih popisa.
Popis je jedino razduženje: PK Office nema kasu po artiklima (pazar se
knjiži ukupno), pa se tokom godine lager puni nabavkama, a na popisu se
svodi na stvarno izbrojano stanje (tok knjigovođe: kalkulacije tokom
godine, klijent izbroji robu, unos količina, obračun).

- **Zaliha po artiklu I PO CIJENI**: isti artikal nabavljan po dvije
  MPC = dva reda lagera (kao "Sa više cijena" u desktop programima).
- **Kartica artikla**: klik na red lagera (ili ikona) otvara karticu:
  stanje + hronološki svi događaji (kalkulacije sa dobavljačem i
  cijenama, popisi, nivelacije, povrati, otpisi) sa tekućim stanjem,
  uređivanje artikla i **PDF ispis kartice**.
- **Lager lista**: presjek "zaključno sa datumom" (radi i retroaktivno),
  status pod-tabovi (Ima na lageru / Nema / Manjak / Sve), pretraga,
  sortiranje po šifri ili nazivu, sume količine i maloprodajne
  vrijednosti. **PDF prati aktivne filtere**: šta je na ekranu, to ide
  na papir (naslov "LAGER LISTA na dan X", ispisani filteri, totali).
- **Popis**: "Novi popis" snima knjigovodstveno stanje na datum (svi
  artikli sa prometom, i sa stanjem 0 radi viška). Unos izbrojanih
  količina direktno u tabeli (pretraga, nespremljeni unosi označeni),
  "Osvježi stanje" povuče naknadno unesene kalkulacije. Živi **obračun
  popisa** kao u desktop programima: maloprodajna vrijednost, iznos
  PDV-a, razlika u cijeni, nabavna vrijednost i broj stavki, u kolonama
  knjigovodstveno / po popisu / višak / manjak (nabavna = prosječna iz
  kalkulacija po artiklu i cijeni).
- **Proknjižavanje** (uz potvrdu sa iznosima manjka/viška) zaključava
  popis i od njegovog datuma lager računa popisane količine;
  "Otknjiži" vraća u izradu radi ispravke. Brisanje uklanja korekciju.
- **Dva PDF-a**: "Popisna lista" (prazna kolona IZBROJANA KOLIČINA, za
  brojanje u radnji, bez knjigovodstvenih količina da ne navode) i
  "Obračun popisa" (A4 položeno: sve stavke sa razlikama i vrijednosti
  razlike + tabela obračuna).
- Numeracija popisa po obrtu i godini (1/26, 2/26...).

### TKM (trgovačka knjiga na malo)

Treći tab na `/app/lager`. Zakonska knjiga po Pravilniku o obliku,
sadržaju i načinu vođenja trgovačke knjige (Sl. novine FBiH 56/2025, po
Zakonu o unutrašnjoj trgovini 87/24), čl. 16-17: kolone r.br, datum,
opis promjene, zaduženje, razduženje. Knjiga se IZVODI iz dokumenata
(ništa se ne unosi ručno):

- **Zaduženje**: maloprodajna vrijednost svake kalkulacije (sa brojem
  kalkulacije, dobavljačem i brojem računa u opisu, čl. 17c) + višak po
  proknjiženom popisu + početno stanje (prenos salda iz prethodne
  godine, čl. 21).
- **Razduženje**: pazar (dokumenti "Proknjiži pazar") + manjak po
  proknjiženom popisu.
- Na ekranu i tekući saldo (vrijednost zaliha u maloprodaji).
- **PDF po pravilniku**: 5 kolona, sabiranje na svakoj stranici sa
  "Prenos na sljedeću stranicu" i "Donos sa prethodne stranice"
  (čl. 19), na kraju Ukupno + Saldo. Sve crno, A4 uspravno.
- **Pazar u TKM-u je ODVOJEN od KIF-a** (odluka vlasnika): TKM
  razduženje po pazaru čita samo svoju evidenciju (tkm_pazari), a KIF
  knjiženje pazara je i dalje na PDV stranici.
  - **Dnevni unos pazara**: dugme "Unesi dnevni pazar" na TKM tabu;
    datum + bruto iznos + opis, uz prijedlog pologa pazara sa izvoda za
    taj dan (kategorija PAZAR, "Preuzmi iznos"). **Ne ide u KIF ni PDV
    prijavu**, samo razdužuje TKM. Pogrešan unos se briše ikonom korpe
    direktno u TKM tabeli.
  - **Mjesečno KIF knjiženje pazara** (PDV stranica) ima checkbox
    "Razduži i TKM ovim iznosom": označen upisuje isti iznos i u TKM
    (zadnji dan mjeseca). Pravilo: ili mjesečno sa checkboxom ili dnevni
    unosi, ne oboje za isti period.
- **Zaključenje na ispisu**: za isteklu godinu PDF na kraju ispisuje
  blok o zaključenju (čl. 21: saldo se prenosi u narednu godinu kao
  početno stanje) + M.P. i potpis odgovornog lica (potpis blok ide na
  svaki ispis).
- **Ručno početno stanje**: kartica na vrhu TKM taba, za obrte koji u
  PK Office ulaze sa već zaduženom radnjom: iznos (+ napomena) se knjiži
  kao prvi red zaduženja 01.01. te godine, ulazi u saldo i PDF; unos
  0,00 briše red. Automatski prenos salda iz prethodne godine i dalje
  radi uz to (uključuje i ručna početna stanja ranijih godina).

### Nivelacije (zapisnik o promjeni cijena)

Tab "Nivelacije" na `/app/lager`. Prebacuje količinu artikla sa stare
maloprodajne cijene na novu (zalihe se vode po artiklu i MPC-u, pa se na
lageru bira konkretan red: artikal + stara cijena + raspoloživo stanje).
Više stavki po zapisniku; količina ne može preći stanje na staroj cijeni
na datum nivelacije. Razlika vrijednosti automatski ulazi u TKM
(povećanje = zaduženje, smanjenje = storno, čl. 17. Pravilnika), a red
na novoj cijeni nasljeđuje prosječnu nabavnu za buduće obračune.
**Zapisnik PDF**: stara/nova cijena, količina, vrijednosti po staroj i
novoj, razlika, sa totalima. Brisanje vraća količine na staru cijenu.

### Povrat dobavljaču i otpis

Tab "Povrat i otpis" na `/app/lager`. Oba razdužuju lager (stavke se
biraju sa lagera po artiklu i MPC-u, do raspoloživog stanja) i ulaze u
TKM kao storno zaduženja po maloprodajnoj vrijednosti:

- **Povrat dobavljaču**: partner obavezan; spremanjem se automatski
  knjiži **knjižna obavijest u KUF** (vrsta dokumenta "knjižna
  obavijest", pa prijava i e-KUF automatski umanjuju nabavke i ulazni
  PDV): iznos = nabavna vrijednost vraćene robe + ulazni PDV. Broj KO
  dobavljača se može upisati, inače se dodjeljuje automatski. Brisanje
  povrata briše i KO iz KUF-a.
- **Otpis**: razlog (kalo, rastur, kvar, lom, istek roka, ostalo), bez
  KUF efekta.
- PDF za oba: stavke sa količinom, MPC, maloprodajnom i nabavnom
  vrijednošću.

### Izvještaj o marži (razlici u cijeni)

Tab "Marža" na `/app/kalkulacije`: iz snimljenih stavki kalkulacija, za
period od-do, grupisano **po artiklu** (količina, nabavna, prodajna bez
PDV-a, marža KM i %, maloprodajna) ili **po dobavljaču** (broj
kalkulacija + iste vrijednosti). Sume na dnu i PDF ispis. Pokazuje
ukalkulisanu zaradu, ne stvarnu prodaju.

## 22. Blagajna

Stranica `/app/blagajna` (grupa Finansije). Nalozi za naplatu i isplatu
gotovine + izvedeni blagajnički dnevnik, po Uredbi o uslovima i načinu
plaćanja gotovim novcem (Sl. novine FBiH 48/15 i 82/15: gotovinska
plaćanja robe/usluga do 200 KM po računu, pazar na račun isti ili
naredni radni dan, blagajnički maksimum internom odlukom).

- **Nalozi**: naplata (N-1/26...) i isplata (I-1/26...), numeracija po
  tipu i godini; datum, iznos, uplatilac/primalac, osnov, napomena.
  Isplata je blokirana ako bi saldo blagajne otišao u minus.
- **Dnevnik**: za izabrani dan: donos (saldo prethodnog dana), nalozi,
  promet naplata/isplata, saldo na kraju dana; redni broj dnevnika =
  redni broj dana sa prometom u godini. Period od-do daje pregled i
  saldo za raspon.
- **PDF**: pojedinačni nalog (sa iznosom slovima i potpisima blagajnik/
  uplatilac-primalac/odgovorno lice) i blagajnički dnevnik za dan (sa
  potpisima).

## 23. Vlasnik obrta na obračunima (doprinosi + Obrazac 2002)

Na `/app/obracuni-plata` je dodana kartica vlasnika obrta (samo za
type=BUSINESS): status obračuna za mjesec, osnovica i doprinosi 36%.

- **"Obračunaj doprinose"** poziva postojeći payroll calculate direktno
  iz PK Office (vlasnik ima fiksnu osnovicu po režimu/kategoriji iz Sl.
  novina, pa ne treba unos bruta): uslov je postavljen režim
  oporezivanja na postavkama obrta.
- **"Obrazac 2002"** (specifikacija uz uplatu doprinosa poduzetnika) se
  preuzima čim je vlasnik obračunat; isti sadržaj kao na marketing
  obračunu (period skraćen za mid-month prijavu/odjavu, broj zaposlenih
  uključuje vlasnika).
- MIP-1023 NAMJERNO ne uključuje vlasnika obrta (po pravilima PU FBiH
  vlasnik nije u MIP-u; njegov ekvivalent je Obrazac 2002).

## 24. Putni nalozi

Stranica `/app/putni-nalozi` (grupa Zaposlenici). Nalozi za službena
putovanja sa obračunom troškova, po Pravilniku o primjeni Zakona o
porezu na dohodak (neoporeziva dnevnica 25 KM; puna 24h = 1 dnevnica,
preko 12h = 1, 8-12h = 0,5).

- Forma: radnik/vlasnik iz liste ili ručni unos imena, relacija, svrha,
  prevozno sredstvo, polazak/povratak (datum + vrijeme), dnevnica
  (default 25 KM), broj dnevnica sa **prijedlogom iz trajanja puta**,
  akontacija, troškovi prevoza/smještaja/ostalo, izvještaj sa puta.
  Nalog se može dopuniti nakon puta (obračun troškova).
- Numeracija po obrtu i godini; obračun: dnevnice + troškovi − akontacija
  = za isplatu (ili za povrat u blagajnu).
- **PDF**: nalog (ko/kuda/zašto/čime/kada + potpis nalogodavca) +
  obračun putnih troškova (za isplatu i slovima) + izvještaj + potpisi;
  napomena da se prilažu računi.

## 25. Zbirni obračun uz KPR (pregled poslovanja)

Dugme "Zbirni obračun" na `/app/kpr`: INFORMATIVNI pregled poslovanja za
slobodan period (za banku ili klijenta; nije zvanični obrazac, što piše
i na ispisu). Modal: period od-do, pregled na ekranu, PDF.

- **Prihodi i rashodi po kategorijama** iz potvrđenih transakcija (isti
  izvor kao KPR; za PDV obveznike neto bez PDV-a), sortirano po iznosu,
  samo kategorije sa prometom.
- **Amortizacija iz PLDI** kao red rashoda, srazmjerno mjesecima
  perioda (podržan i period preko više godina).
- **Dobit/gubitak** + informativna porez sekcija: osnovica, porez 10%,
  uplaćene akontacije u periodu (kategorija porez na dohodak vlasnika sa
  izvoda), razlika za uplatu/povrat, sa napomenom da je porez gruba
  procjena (bez ličnog odbitka; pravi obračun radi SPR/GPD).
- PDF: A4, redovi label + iznos (stil Com_Soft primjera), potpis
  "Poreski obveznik".

## 26. Knjiga prometa (KP-1042)

Drugi tab na `/app/kpr` (KPR-1041 | Knjiga prometa). Zakonska knjiga za
obrte koji naplaćuju u gotovini a NISU trgovci (frizeri, serviseri,
ugostitelji...; trgovci koji vode TKM su izuzeti, što piše na tabu).

- Upisuje se SAMO promet (prihod) u gotovini, dnevno, najkasnije
  naredni dan; rashodi ne postoje u ovoj knjizi.
- **Evidencija je zajednička sa dnevnim pazarom TKM-a** (tabela
  tkm_pazari): jedan unos puni obje knjige; unos ne ide u KIF/PDV.
- Prikaz: godina + mjesec filter, godišnji redni brojevi (r.br se
  dodjeljuje na punoj godini pa tek onda filtrira mjesec), suma,
  brisanje upisa (briše se i iz TKM-a).
- **PDF KP-1042**: redni broj, datum upisa, broj dokumenta/opis, iznos
  prometa u gotovini, sa prodajnim mjestom u zaglavlju i totalima.
- EPO-1044 NAMJERNO nije rađena (odluka vlasnika: kartice kupaca i
  dobavljača pokrivaju potraživanja/obaveze).
- **Izvor pazara u KPR** (checkbox po obrtu, na KP tabu): uključeno →
  svaki upis dnevnog prometa iz KP-1042 ulazi u KPR kao prihod u
  gotovini (kolona 11, sa PDV splitom za obveznike, dokument
  "KP-1042"), a **polozi sa izvoda kategorije "Pazar" se BEZUSLOVNO
  isključuju iz KPR-a** (i ručno potvrđeni) da se isti novac ne knjiži
  dvaput; ostale kategorije prihoda ulaze normalno. Isključeno
  (default): kao do sada, pazar u KPR ide iz pologa sa izvoda.
  Računovodstveno ispravnije uključeno: prihod na dan prometa, polog je
  samo prenos novca. Flag: organizations.kprPazarIzKp.

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
