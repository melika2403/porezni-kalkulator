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
- **Pretraga**: kad korisnik ima više od 5 obrta, na vrhu liste je
  search polje (autofokus, kucanje odmah filtrira). Traži po nazivu bez
  dijakritika ("cevap" nađe "Ćevabdžinicu") i po ID/poreskom broju
  (cifre); filtrira i sekciju "Dodaj u PK Office". Enter bira prvi
  pogodak, Escape briše pretragu odnosno zatvara listu.
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

- Pozdrav po dobu dana (Dobro jutro / Dobar dan / Dobro veče) sa punim
  datumom.
- **Traka aktivnog obrta** ispod pozdrava: inicijali, naziv obrta i badge
  "Moj obrt" / "Klijent". Traka je ujedno prekidač obrta (isti dropdown
  kao u sidebaru, sa pretragom preko 5 obrta i grupama Moji obrti /
  Klijenti), pa se klijent mijenja bez odlaska u bočnu traku. Ista
  komponenta `OrgSwitcher` u varijanti `inline`.
- **Lična karta obrta** uz traku: JIB, PDV status (Obveznik / Nije
  obveznik, tooltip sa datumom ulaska u sistem), žiro račun i datum
  zadnjeg izvoda (amber ako je stariji od 30 dana).
- **Brze akcije** ispod zaglavlja: Učitaj izvod, Nova faktura,
  Blagajnički nalog, Nova kalkulacija.
- **Prvi koraci**: obrt koji još nema nijedan izvod dobije checklist
  (dopuni podatke obrta, učitaj prvi izvod, dodaj radnike, izdaj prvu
  fakturu) sa oznakama šta je već urađeno; nestaje čim se učita prvi
  izvod.
- **Trenutno stanje računa**: završno stanje sa zadnjeg učitanog izvoda;
  za više banaka zbir zadnjih stanja po svakom računu. Ako je zadnji
  izvod stariji od 30 dana, amber napomena da je stanje zastarjelo.
- **Plate kartica**: status obračuna plata (obračunate/isplaćene/nisu) i
  da li je MIP-1023 XML preuzet, za protekli mjesec (od 25. u mjesecu
  prelazi na tekući), plus broj radnika i neto suma mjeseca. Dugme vodi
  na Obračune plata.
- **KPI kartice su klikabilne**: Potražuje / Duguje vode na transakcije
  filtrirane po smjeru, Otvorene fakture na izdane fakture, Nepovezane
  transakcije na stavke koje čekaju pregled.
- **Svi obrti** (samo kad korisnik vodi više obrta): red po obrtu sa
  datumom zadnjeg izvoda (amber ako je star ili ga nema), statusom plata
  i MIP oznakom za prikazani mjesec; klik na red mijenja aktivni obrt.
- **Posljednje transakcije**: zadnje 4 stavke sa izvoda, uz kategoriju
  knjiženja kao mali chip.
- **Predstojeće obaveze**: rokovi za tekući mjesec (akontacija doprinosa,
  akontacija poreza na dohodak, PDV za obveznike; svi do 10. u mjesecu za
  prethodni mjesec), neriješene prve po roku. Status "gotovo" se izvodi
  automatski: postoji potvrđena uplata te kategorije na izvodu u tekućem
  mjesecu. Prošao rok bez uplate = oznaka "kasni".

## 4. Bankovni izvodi: upload PDF-a

Stranica: Finansije → Bankovni izvodi.

- **Učitaj bankovne izvode** (drag&drop ili klik): prima jedan ili više
  PDF izvoda iz e-bankinga odjednom. Podržane banke: UniCredit,
  Raiffeisen, Sparkasse, KIB, BBI, MF Banka, ZiraatBank (BBI/MF/Ziraat
  dijele Asseco format pa srodne banke često rade odmah). Više fajlova
  se uvozi sekvencijalno (po nazivu fajla, da kontinuitet salda vidi
  prethodne), uz progres "Čitam izvod 2/5..." i rezime na kraju
  (koliko uvezeno + greška po fajlu).
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
- Nakon uspješnog uploada jednog fajla otvara se izvod sa svim
  stavkama; kod više fajlova ostaje se na listi (izvodi su u njoj
  poredani po banci i broju).
- **Početno stanje računa** (dugme iznad liste izvoda): za obrte koji
  ne žele učitavati historijske izvode. Upiše se račun, datum (tipično
  31.12. prethodne godine) i stanje u KM; program napravi poseban
  "izvod" bez stavki (bankId `pocetno`, opening = closing = iznos) koji
  služi kao sidro: kontinuitet salda prvog pravog izvoda se veže na
  njega, a stanje računa je tačno bez starih izvoda. Po računu postoji
  najviše jedno (ponovni unos ili klik na red u listi ga mijenja);
  red u listi se zove "Početno stanje" i nema statusnu značku.
  Za račune čije banke ne čitamo (ručni izvodi bez salda) se stanje
  računa u KPI-ju računa kao: sidro + promet ručnih izvoda poslije
  njegovog datuma. Poređenje računa (kontinuitet, stanje, grupisanje
  liste) ide po ciframa jer banke pišu račun različito formatiran.

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

1. **Doprinosi vlasnika vs. radnika po iznosu** (samo obrt SA
   radnicima): isti računi primaju i doprinose vlasnika (KPR kolona 18)
   i doprinose iz plata radnika (dio bruto plate, kolona 17), pa se
   razdvajaju po iznosu uplate. Očekivani iznosi vlasnika se računaju iz
   podešavanja obrta (režim oporezivanja + kategorija djelatnosti →
   osnovica iz Sl. novina, stope 19,5% PIO / 14,5% zdravstvo / 2%
   nezaposlenost, podjele 89,8/10,2 i 70/30 kao na uplatnicama) i
   dopunjuju stvarnim obračunima vlasnika iz PK Office (pokriva
   pro-rate mjesece). Poklapanje (±2 feninga) → "Doprinosi
   poduzetnika"; drugi iznos na računu doprinosa → "Bruto plate
   zaposlenika". Obrt bez radnika ili bez utvrdivih iznosa: sve ostaje
   doprinosi poduzetnika (kao ranije). Servis:
   `backend/src/services/bankStatements/vlasnikDoprinosi.js`.
2. **Naučena pravila**: kad korisnik potvrdi stavku sa kategorijom,
   sistem zapamti protivračun/naziv → kategorija za tu organizaciju i
   ubuduće sam predlaže. Zadnja potvrda je presudna. Izuzetak su računi
   javnih prihoda: po njima se ne uči niti se pravila primjenjuju (isti
   račun prima uplate različitog značenja), njih svaki put kategorišu
   šifarnik + logika iznosa iz tačke 1.
3. **Računi javnih prihoda** (šifarnik): doprinosi (ZZO/PIO/
   zapošljavanje), porez na dohodak (kantonalni budžeti), PDV (UIO).
4. **Obrasci u opisu**: polog pazara, provizije/naknade, POS prilivi,
   pozajmice, rate kredita.
5. Default: priliv → prihod preko računa; odliv → bez prijedloga.

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
pojedinačne stavke bez kategorije pokušava auto-popunu (doprinosi
vlasnika po iznosu, pa naučena pravila, pa heuristike) osim kad
korisnik kategoriju eksplicitno obriše.

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
- **Ulazak/izlazak iz sistema PDV-a usred godine**: u Postavkama obrta
  uz prekidač "U sistemu PDV-a" postoje opcioni datumi "U sistemu PDV-a
  od" (prazno = obveznik cijelu godinu, default) i "Izašao iz sistema
  PDV-a" (prazno = nikad nije bio). Dok su datumi prazni, ponašanje je
  identično starom (PDV split po trenutnom flagu). Sa upisanim datumom
  KPR izdvaja PDV **po dokumentu**: naplata vezana za izlaznu fakturu
  prati PDV sa fakture (naplata stare ne-PDV fakture nema PDV-a ni
  poslije ulaska), plaćanje vezano za ulazni račun srazmjerno odbitnom
  PDV-u sa računa (ako je obrt bio u PDV-u na datum računa), a nevezane
  stavke i pazari po datumu transakcije u odnosu na PDV prozor
  [od, do). Prošli mjeseci se ne mijenjaju retroaktivno.
- **Preuzmi KPR-1041 (PDF)**: popunjava službeni obrazac, sve
  centrirano u ćelijama, JIB i JMB vlasnika u kućice, ime i adresa
  vlasnika (iz profila obrta, rola VLASNIK), paginacija sa Donos
  redom i kumulativnim "Ukupno za sve stranice - prenos".
- **KPI traka**: Ukupni prihodi (15), Ukupni rashodi (21) i **Dohodak
  (15 - 21)** za period, osnova za SPR i akontacije; uvijek puna
  knjiga, filteri je ne diraju.
- **Grupisanje po mjesecima**: podnaslov za svaki mjesec sa
  međuzbirom (prihodi, rashodi, dohodak mjeseca); default prikaz je
  cijela godina.
- **Ekranski filteri**: chips Sve / Prihodi / Rashodi + kategorija
  (sa brojem stavki); footer tada pokazuje "Ukupno (filtrirano)".
  PDF uvijek štampa punu knjigu.
- **Klik na red otvara izvor**: stavka sa izvoda vodi na taj izvod,
  pazar iz KP-1042 prebacuje na tab Knjige prometa.
- **"Sačini SPR"** u zaglavlju vodi na /app/obrasci (SPR-1053 se
  popunjava automatski iz ove knjige).
- Zaglavlje tabele je sticky (vidljivo pri skrolu duge knjige,
  vertikalni skrol unutar kartice).
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
- **PDV default po statusu obrta**: checkbox "Obračunavam PDV" prati
  isPdvObveznik izabranog prodavca (obveznik → uključen i stavke nude
  17%, neobveznik → isključen pa se PDV kolona i ne prikazuje). Ručna
  promjena checkboxa (ili učitana faktura kod uređivanja/dupliranja)
  ima prednost i ne pregazi se. Ako neobveznik ipak uključi PDV,
  ispod toggle reda se pokaže amber upozorenje (propisi ne dozvoljavaju
  PDV na fakturi neobveznika), ali snimanje se NE blokira. Kod ručno
  upisanog prodavca (marketing forma bez organizacije) status je
  nepoznat pa se default ne dira i upozorenja nema.
- **"Samo sačuvaj"**: pored "Spremi i preuzmi PDF" postoji i dugme koje
  fakturu samo snimi bez preuzimanja PDF-a (u edit modu se zove
  "Sačuvaj izmjene"); PDF se uvijek može skinuti kasnije sa liste.
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
  e-KIF-u, PDF izvještaju i kartici partnera. Na kartici, zbirnom
  izvještaju i IOS-u odobrenja OSTAJU na strani svog računa u minusu:
  kod kupca na dugovnoj, kod dobavljača na potražnoj (i umanjuju
  otvorene sume). PDV razlika na KPI-u računa predznak i isključuje
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
- Sortiranje liste (radi na svim tabovima), grupisan dropdown: najnovija
  aktivnost (default), najveći promet, naziv A-Ž / Ž-A, šifra rastuće /
  opadajuće, njihov dug najveći / najmanji, naš dug najveći / najmanji.
  Rijetke akcije reda (knjiženje ulaznog računa, spajanje, brisanje) su u
  overflow (tri tačke) meniju; brisanje traži potvrdu kroz modal.
- **KPI traka**: "Njihov dug (potraživanja)" sa brojem dužnika, "Naš dug
  (obaveze)" sa brojem dobavljača koji čekaju plaćanje i "Aktivni
  partneri". Klik na karticu duga filtrira listu na dužnike te strane i
  sortira po dugu (najveći prvo); ponovni klik ili pilula "Samo dužnici" /
  "Samo naše obaveze" uklanja filter.
- **Izvoz (CSV)**: dugme u zaglavlju izvozi trenutno filtriranu listu u
  CSV za Excel (BOM + ";" separator): šifra, naziv, JIB, PDV broj,
  adresa, kontakt, žiro računi, promet, njihov/naš dug, zadnja
  aktivnost, napomena.
- **Spajanje duplikata** ("Spoji sa drugim partnerom" u overflow meniju):
  sav promet izvornog partnera (transakcije sa izvoda, ulazni računi,
  prebijanja, kalkulacije, razduženja) prelazi na izabranog ciljnog,
  žiro računi se uniraju, prazna polja ciljnog se popune iz izvornog
  (uklj. JIB, pa vezanje faktura ostaje), izvorni se briše. Nepovratno,
  traži potvrdu u modalu sa pretragom ciljnog partnera.
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
  adresom). Klik na prijedlog otvara popunjenu formu, a **"Dodaj sve"**
  doda sve pronađene odjednom (sa podacima koje već imamo). Ne nude se:
  stavke sa kategorijom čija protivstrana nije partner (javni prihodi:
  porezi, doprinosi, PDV; pazar; prenos između vlastitih računa;
  pozajmice vlasnika; krediti i rate; bankarske provizije; plate;
  "ostalo bez KPR") niti protivračuni koji su vlastiti računi obrta.
  Kategorizacijom stavke na izvodu prijedlog nestaje sam.
- **"Nije partner" (X na prijedlogu)**: uklanja prijedlog trajno, uz
  potvrdu; pamti se po žiro računu i nazivu
  (organizations.partnerSuggestionHides JSON), pa se više ne predlaže ni
  sa izvoda ni sa faktura. Transakcije ostaju netaknute. Endpoint:
  POST /api/partners/:orgId/suggestions/hide.
- **Godišnji pregled**: lista partnera i kartica partnera su default na
  tekućoj godini (picker "Godina GGGG" / "Sve godine"). Godina filtrira
  promet, broj transakcija, fakturisano i zadnju aktivnost; DUGOVI
  (otvorene stavke, obje strane) su UVIJEK živi, ukupni, bez obzira na
  godinu, jer se po njima radi naplata i opomene. Backend: GET
  /api/partners/:orgId?year=GGGG i kartica sa ?from=&to=.
- **Donos na kartici**: kartica za izabranu godinu počinje redom "Donos
  iz ranijeg perioda" = početno stanje + sav promet prije godine, računa
  se ŽIVO pri svakom pogledu (nema kopiranja salda u novu godinu, pa
  naknadna knjiženja u staroj godini automatski ispravljaju donos).
  Zaključno stanje godine = saldo na dnu. Isti donos ide u PDF karticu
  (prazan period štampe = izabrana godina pregleda). Kod pregleda "Sve
  godine" se početno stanje vidi kao vlastiti red na svom datumu.
- **Početna stanja partnera (migracija)**: PartnerOpeningBalance (jedan
  po partneru: datum, kupacIznos = duguje nama, dobavljacIznos = mi
  dugujemo). Unos pojedinačno (kartica partnera → red "Poč. stanje") ili
  grupno ("Početna stanja" iznad liste: tabela svih partnera sa dvije
  kolone, zajednički datum, pretraga; 0 u oba polja briše stanje).
  Efekti: FIFO tretira početno stanje kao najstariji dokument (uplate ga
  zatvaraju prije novih faktura), otvoreni dio ulazi u žive dugove na
  listi i kartici (i u "kasni"), u IOS (red "Početno stanje (donos)",
  valuta = datum stanja) i u opomenu. Endpoints: GET/POST
  /api/partners/:orgId/opening-balances, PUT
  /api/partners/:orgId/:partnerId/opening-balance.
- **Ne-partner kategorije i kartica**: stavke sa kategorijom koja nije
  promet partnera (ista lista kao gore: provizija banke, pazar, prenos,
  krediti, javni prihodi...) se NE vežu automatski na partnera pri
  uvozu izvoda (banke uz plaćanje dobavljaču knjiže i proviziju sa
  imenom dobavljača u opisu, pa je name-match ranije vezao proviziju na
  karticu). Promjena kategorije stavke u ne-partner kategoriju
  automatski skida vezu s partnerom (osim ako se u istom patchu
  eksplicitno šalje partnerId). I kad veza postoji (stari podaci ili
  ručno vezano), te stavke se NE prikazuju u kartici partnera niti
  ulaze u njegov promet/statistiku. KPR knjiženje se ne mijenja
  (kategorija i dalje vlada).
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
- **Uvoz partnera od drugog obrta** (dugme "Od drugog obrta", vidljivo
  samo kad korisnik ima više obrta): mnogi obrti dijele iste dobavljače
  (knjigovodstvo, BH Telecom, elektrodistribucija, vodovod...), pa se
  šifarnik ne prekucava. U modalu se izabere izvorni obrt (bilo koji
  obrt korisnika, provjera članstva na backendu), prikaže se njegov
  šifarnik sa checkboxovima (default sve označeno, "Označi/Poništi sve")
  i uveze odabrano. Kopiraju se SAMO matični podaci partnera (naziv,
  ID/PDV broj, adresa, kontakt, žiro računi, kupac/dobavljač flagovi,
  napomena), a NE promet, dugovi, početna stanja ni veze transakcija.
  Duplikati se preskaču po istom pravilu kao Com_Soft uvoz (ID broj, pa
  labavo normalizovan naziv) uz listu preskočenih sa razlogom; nevezane
  transakcije ciljnog obrta se odmah vežu na nove partnere. Endpoint:
  `POST /api/partners/:orgId/uvoz-iz-obrta` (OWNER/ADMIN + plan gate).

### Kartica partnera

Klik na partnera otvara karticu (olovka u redu uređuje podatke):

- Zaglavlje sa svim podacima (JIB, PDV, adresa, računi sa imenima
  banaka, telefon, email i interna napomena).
- KPI: naplaćeno od partnera, plaćeno partneru, njihov dug (otvorene
  fakture), naš dug (otvoreni ulazni računi). Kartice duga prikazuju i
  **dospjelost**: "od toga kasni X KM" (stavke prošle roka plaćanja).
- **IOS (izvod otvorenih stavki)**: red ispod kartice prometa, izbor
  "na dan" (prazno = danas), "IOS kupca (PDF)" (naša potraživanja:
  otvorene fakture), "IOS dobavljača (PDF)" (naše obaveze: otvoreni
  ulazni računi) i "Pošalji IOS" na email partnera. Standardna forma:
  povjerilac/dužnik blok, tabela stavki (dokument, datum, valuta,
  iznos), UKUPNO, rok od 8 dana za ovjeren primjerak, blok "Potvrda
  stanja" (slaže / ne slaže + primjedbe) i potpisi obje strane.
  Stavka je "otvorena na dan" i ako je plaćena poslije tog dana
  (rekonstrukcija stanja unazad); odobrenja (KO, storno avansa) ulaze
  negativno.
- **"Nova faktura"** u zaglavlju otvara formu fakture sa ovim partnerom
  već izabranim kao kupcem (/app/fakture/nova?partner=ID).
- **Klik na red web kartice prometa** otvara izvor knjiženja: uplata i
  plaćanje vode na svoj izvod, faktura na listu faktura sa upisanom
  pretragom tog broja (?q=); ulazni računi su sekcija na istoj stranici.
- **Ulazni računi (knjiženje faktura dobavljača)**: "Proknjiži ulazni
  račun" sa brojem računa dobavljača, datumom, rokom plaćanja, iznosom i
  PDV iznosom (opciono). Status: otvoren / plaćen / kasni (rok prošao).
- **Automatsko zatvaranje**: potvrđena isplata partneru na izvodu
  automatski označava njegov otvoren ulazni račun plaćenim (po tačnom
  iznosu ako je jedinstven, ili po broju računa u opisu uplate).
  Radi u oba smjera: ako je izvod stigao prije knjiženja, račun se
  zatvara odmah pri knjiženju. Vraćanje stavke iz potvrde ponovo otvara
  račun. Ručno "Plaćen" / "Vrati" postoji za gotovinska plaćanja.
  Isplata veže samo račun izdat najkasnije na njen dan; kod više istih
  iznosa zatvara se najstariji, a pri knjiženju računa gledaju se samo
  isplate od datuma računa (29.09.2026).
- **Zatvaranje stavki (veze Z)**: dugme "Zatvaranje stavki" iznad kartice
  prometa uključuje označavanje; traka ispod tabele sabira duguje i
  potražuje označenih stavki i pokazuje razliku. "Zatvori (Z)" radi samo
  kad je razlika 0,00 (npr. jedna uplata za dva računa). Veza dobija
  oznaku Z1, Z2... (po partneru i strani), redovi zelenu podlogu, a
  dokumenti u vezi status plaćen (pa ih kalkulacije, ulazni računi, IOS i
  opomene vide zatvorenim); zatvorena plaćanja ne ulaze u FIFO raspodjelu.
  U vezu ulaze plaćanja, računi/fakture, knjižne obavijesti (u minusu) i
  početno stanje. Automatske 1:1 veze (isplata vezana za račun, uplata za
  fakturu) prikazuju se kao ZA1, ZA2... Klik na oznaku otvara vezu: ručna
  vraća prethodne statuse dokumenata, automatska odvezuje uplatu.
  "Poredaj po vezama" stavlja stavke iste veze jednu ispod druge, na
  ekranu i u PDF-u kartice (kolona "Veza" + legenda). Veza se sama otvara
  kad se njena stavka izmijeni ili obriše (stavka izvoda vraćena iz
  potvrde, drugi partner, brisanje izvoda/prebijanja, izmjena iznosa ili
  brisanje računa, promjena statusa ili brisanje fakture, izmjena
  početnog stanja). Kalkulacija čiji je račun u vezi se ne može mijenjati
  dok se veza ne otvori. Spajanje partnera prenosi veze na ciljnog
  partnera. Tabele: partner_zatvaranja, partner_zatvaranje_stavke; kolona
  zatvaranjeId na bank_transactions, ulazni_racuni i invoices.
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
  (datumi su master, status derivat; zanimanje iz Klasifikacije
  zanimanja FBiH: picker puni naziv i sedmocifrenu šifru za JS3100
  obrazac), ugovor o radu i plata (vrsta i
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
- **Status tabovi, pretraga i sortiranje**: pilule Prijavljeni /
  Odjavljeni / Svi (sa brojevima; nacrti samo pod "Svi", default
  Prijavljeni), pretraga po imenu, JMBG-u ili radnom mjestu, sortiranje
  u oba smjera (prezime, datum prijave, plata); vlasnik je uvijek prvi
  red. Podnaslov broji prijavljene sa ispravnom deklinacijom (1
  prijavljen radnik / 3 prijavljena radnika / 5 prijavljenih radnika).
- **Upozorenje na nepotpune podatke**: žuta ikonica uz ime kad radniku
  fali nešto bitno za obračune i obrasce (JMBG, žiro račun, stručna
  sprema; za vlasnika samo JMBG), stilizovani tooltip na hover kaže
  šta tačno fali (šifra zanimanja namjerno NE izbacuje upozorenje,
  odluka vlasnika).
- **Spisak radnika PDF i CSV**: dugmad u traci filtera; izvoz prati
  aktivne filtere (ime, radno mjesto, JMBG, prijava/odjava, status,
  plata; CSV ima i grad).
- **Memorandum klijenta na platnim listama** (postavka po organizaciji):
  u uređivanju organizacije, ispod loga, otprema se slika zaglavlja
  (PNG/JPG, maks. 3 MB i 4000x2000 px, provjera po sadržaju fajla, ne po
  ekstenziji). Kad postoji, štampa se na vrhu platne liste UMJESTO
  standardnog zaglavlja (naziv, adresa, ID broj); visina je ograničena na
  100 pt jer listić nema više rezerve, viša slika se srazmjerno smanji.
  Bez memoranduma sve ostaje kao prije. Od 16.9.2026. isti memorandum ide
  i u zaglavlje svih dokumenata na /rjesenja-i-odluke (rješenja, odluke,
  potvrde, aneks), u PDF i DOCX: kad je organizacija odabrana u bočnoj
  traci i ima memorandum, slika se povuče sa backenda i ugradi na klijentu
  umjesto linija naziv/adresa/grad (PDF preko cijele širine, do 120 pt;
  DOCX preko širine sadržaja, do 160 px), a forma to javi napomenom pod
  Poslodavac. Bez odabrane organizacije ostaje tekstualno zaglavlje.
- **Naziv dokumenta plate je postavka profila** (Profil → Postavke
  dokumenata): "Platni listić" (standardno) ili "Platna lista". Mijenja
  naslov na PDF-u, naziv fajla i tekst emaila radniku, za sve organizacije
  tog korisnika. Kolona `users.payslipNaziv` (NULL = standardno).
- **Uvoz artikala je dograđen na isti obrazac** (30.08.2026.): u
  postojećem modalu uvoza (Kalkulacije → Artikli → Uvoz, XML iz
  Com_Softa ili CSV) sad postoji "Preuzmi šablon (CSV)" za ručne liste
  (obavezni šifra i naziv; šifra i barkod u šablonu kao tekst da Excel
  ne pojede vodeće nule) i pregled po redovima PRIJE upisa
  (novi / preskočen / greška sa razlogom). UvozSifarnikaModal je dobio
  opcione propove `sablon` i `pregled` (partneri nepromijenjeni).
- **Uvoz radnika (CSV)**: dugme "Uvoz (CSV)" pored izvoza otvara modal
  sa preuzimanjem šablona (Ime*, Prezime*, JMBG, grad, adresa, kontakt,
  žiro račun, radno mjesto, Datum prijave*, neto/bruto plata,
  koeficijent, sati dnevno, staž). Fajl se parsira uz obavezan PREGLED
  prije upisa (novi / preskočen / greška sa razlogom po redu); uvoz
  SAMO DODAJE nove radnike, postojeći (isti JMBG ili ime i prezime) se
  preskaču i ne mijenjaju. Upis ide kroz standardni endpoint kreiranja
  radnika (sve validacije + limit paketa), tolerišu se ";" i ",",
  UTF-8 i windows-1250, domaći datumi i iznosi. Ista dva dugmeta
  (izvoz + uvoz, dijeljene komponente) postoje i na marketing strani
  na /aktivni-radnici.
- **Evidencija uvoza u Aktivnosti**: svaki uspješan uvoz (radnici,
  partneri, artikli, početno stanje lagera, prethodne plate) ostavlja
  jedan zapis po fajlu u admin Aktivnosti i na profilu korisnika
  (npr. "12 od 15 radnika"), kao i štampa naloga na matrični pisač.
- **Karton radnika** (kebab meni, i za vlasnika kao "Karton
  obračuna"): modal sa obračunima po mjesecima izabrane godine (bruto,
  doprinosi iz osnovice, porez, neto, status obračuna, oznaka za
  uvezene), zbir na dnu; godine od prijave radnika do tekuće. Backend:
  GET /api/payroll sad prima opcioni month i workerId (bez month vraća
  cijelu godinu).
- Akcije po redu: vidljivo "Uredi" + kebab meni. U meniju radnika (ne
  vlasnika) je grupa "Kadrovski dokumenti": Ugovor o radu, Otkaz
  ugovora i Rješenja i odluke otvaraju postojeće marketing generatore
  u NOVOJ kartici, predpopunjene (?org= i ?worker= predizbor koji
  generatori već podržavaju); app ostaje otvoren. **Matična
  evidencija** se otvara direktno u PK Office modalu (isti
  EvidencijaModal kao na /organizacije, predizabran radnik). Ispod je
  "Ostalo" sa Obriši (uz potvrdu).
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
  topli obrok, plus drugi red sa **bruto, doprinosima iz plate i
  porezom**; KPI kartice: ukupno neto, doprinosi, porez, ukupan trošak.
  Klik na red radnika otvara **Karton radnika** (isti modal kao na
  Zaposlenicima: obračuni po mjesecima godine). Godine u izborniku:
  tekuća i 3 unazad.
- Akcije za mjesec: **Sve platne liste (PDF)**, **MIP-1023 XML**
  (preuzimanje se bilježi pa Početna zna da je MIP riješen), **Nalog za
  knjiženje (PDF)** (konta po agencijskoj konvenciji), **Rekapitulacija
  (PDF)** (tabela po radnicima: bruto, doprinosi iz i na, porez, neto,
  naknade, ukupan trošak, sa sumama; vlasnik nije u njoj, on ima 2002),
  **Izvoz u e-bankarstvo** (od 03.09.2026.; isti `POST /api/payroll/bank-export`
  i isti nalozi kao na marketing obračunu, u PK Office modalu
  `IzvozBankaModal`: banka sa predpopunom zadnjeg izbora po obrtu
  `organizations.bankExportBank`, datum valute uvijek današnji, više datoteka
  za Raiffeisen, lista preskočenih stavki; šifarnik banaka i poruke dijeljeni u
  `src/lib/bankExport.ts`),
  **Pošalji listiće email-om** (modal sa dva načina: svakom radniku na
  njegov email, bez email-a se preskaču i navedu u rezimeu; ILI svi
  listići mjeseca u JEDNOM PDF-u na jednu upisanu adresu, npr. email
  firme koji se predpopuni iz podataka obrta, pa firma štampa i uruči
  radnicima ručno, radnicima se tada ne šalje ništa; backend
  `toEmail` mod na `POST /api/payroll/email-payslips-bulk`, isti
  spojeni PDF kao "Sve platne liste") i **Označi mjesec isplaćenim**.
  Ista opcija "Sve na jedan email" postoji i na marketing obračunu
  (stavka u dropdown-u dugmeta za slanje listića).
- **Datum isplate** (polje u traci akcija): upisuje se na sve obračune
  mjeseca i koriste ga MIP XML, platne liste i uplatnice; prazno =
  ukloni datum.
- Platna lista po radniku (PDF) jednim klikom + **email pojedinačno**
  (koverta uz red; onemogućena sa tooltipom ako radnik nema email).
- **Upozorenje bez obračuna**: žuta traka kad je neki radnik po
  datumima prijave/odjave bio prijavljen u izabranom mjesecu a nema
  nijedan obračun (inače bi se propust vidio tek kad u MIP-u fali red).
- **Godišnji pregled**: 12 mjeseci izabrane godine sa statusom
  (prazno / nacrt / obračunato / isplaćeno), oznakom "uvezeno" (mjesec
  sadrži uvezene plate) i "MIP ✓" kad je XML preuzet; klik na mjesec ga
  otvara. Backend GET /api/payroll sad radi i bez month parametra
  (cijela godina).
- **Uvezi prethodne plate** (dugme u godišnjem pregledu): za klijenta
  koji pređe na PK Office u toku godine, da godišnji GIP-1022 bude
  kompletan. Grid radnici x 12 mjeseci: po ćeliji bruto, porezni
  koeficijent po radniku, datum isplate po mjesecu (default zadnji dan),
  "popuni udesno" kopira bruto kroz prazne mjesece. Backend iz bruta
  računa doprinose/porez/neto BEZ minulog rada (POST /api/payroll/import).
  ISTI modal (PK dizajn, UvozPlataPkModal) koristi i marketing stranica
  obračuna, a podaci su isti Payroll zapisi pa je sinhronizacija
  automatska. Mjeseci sa stvarnim obračunom su
  zaključani; stvarni obračun preuzima uvezeni. Uvezeni obračun nosi
  badge "uvezeno" u listi radnika, a MIP za takav mjesec traži potvrdu
  (vjerovatno već predat iz starog programa).
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
- **Rok predaje**: traka na vrhu pokazuje rok za izabrani mjesec (10. u
  narednom mjesecu; subota/nedjelja pomjeraju na prvi radni dan). Zeleni
  badge kad je prijava proknjižena; upozorenje kad je rok prošao a
  prijava nije proknjižena u Stanje.
- **Pretraga KUF/KIF**: broj fakture, dobavljač/kupac ili iznos, uz
  postojeće filtere (tip/vrsta/dokument); toolbar drži filtere lijevo i
  akcije knjige desno. Dobavljač u KUF redu je link na karticu partnera.
- **KPI kartice** ispod knjige: Izlazni PDV (51), Ulazni odbitni (61) i
  Polje 71 (obojeno: obaveza/pretplata/izmireno).
- **Tab "Godina"**: rekapitulacija prijave po mjesecima (stavki, 51, 61,
  polje 71, rok, status proknjiženosti; "nije proknjiženo" poslije roka
  je istaknuto), red vodi na prijavu tog mjeseca, totali za godinu.
- Kontrola prijave dodatno upozorava kad **prethodni mjesec** ima stavke
  u knjigama a prijava mu nije proknjižena u Stanje (zaboravljena
  prijava).
- **D-PDV "Predloži iz knjiga"**: popuni polja izvediva iz KUF/KIF za
  mjesec (izdate KO kupcima, primljene KO, usluge od inostranih lica tip
  05, posebna šema tip 08) i **zalihe bez PDV-a sa lager liste** na
  zadnji dan mjeseca (MPC / 1,17). Popunjeno se pregleda pa sačuva.
- **Stanje PDV-a: Izvještaj (PDF)**: lista knjiženja sa tekućim saldom i
  završnim stanjem, za arhivu i usaglašavanje sa UINO karticom.

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
- **Probni period**: JEDINA proba na platformi (od 24.07.2026. stari PRO
  trial se više ne nudi). Jednom po korisniku (users.pkOfficeTrialEndsAt),
  podrazumijevano na nivou paketa Office Tim (10 obrta), a uz nju idu i SVE
  Business funkcije na marketing dijelu (efektivna rola BUSINESS): ugovori,
  plate bez limita, fakture, neograničeni klijenti.
  **Nivo probe** (users.pkOfficeTrialPlan, od 03.09.2026.): prazno znači Tim,
  "office_1" znači Solo proba (1 obrt). Solo se dodjeljuje SAMO na izričit
  zahtjev: dugme u bloku "PK Office Solo" na /freelancer landingu
  (`?officeTrial=auto&trialPlan=solo`) ili odgovor "vodim knjige sam sebi" u
  Solo upitniku / Postavke → Način rada, i to samo dok korisnik ima najviše
  jedan obrt (POST /api/pk-office/trial/plan, 409 VISE_OBRTA inače). Opšte
  CTA-ove i dalje daju Tim probu, da knjigovođa isproba sve klijente.
  Anti-rotacija prati nivo: na Tim probi deaktivacija oslobađa slot odmah, na
  Solo probi ne (isto kao plaćeni Solo, jedan obrt je jedan obrt). Zato je isti CTA ispravan i
  za korisnika koji PK Office nikad neće otvoriti (npr. d.o.o.).
  Zajednička komponenta: `src/components/OfficeTrialCta` (tamnozelena
  traka + terakota dugme) i hook `useOfficeTrial()`; koriste je
  GeneratePaywall (svi obrasci), profil (tab Klijenti), šihterica,
  fakture i /pretplate. Prijavljen korisnik probu aktivira NA LICU MJESTA
  (POST /api/pk-office/trial iz same trake), ostaje na stranici i ne gubi
  unesene podatke obrasca; potvrdu sa datumom isteka pokazuje globalni
  `TrialToast` (montiran u root layoutu, pa preživi nestanak paywall-a),
  a osvježen `["me"]` odmah otključa dugmad za preuzimanje. Ko VEĆ PLAĆA
  paket (Pro, Business ili Office) probu ne dobija na paywall-u, tamo mu
  ide nadogradnja: proba nosi Business funkcije, pa bi Pro pretplatniku
  dala nadogradnju besplatno i potrošila mu jedinu probu na nešto što nije
  PK Office. Probu i dalje može sam pokrenuti sa /pretplate#pk-office.
  Legacy link `?trial=auto` aktivira probu kao `?officeTrial=auto`, a
  `?trial=1` (stari mailovi, bookmark) samo prikazuje ponudu, jer
  jednokratna proba ne smije nestati pukim otvaranjem linka.
  Neregistrovani do probe dolaze
  kroz marketing CTA-ove ("Isprobaj 30 dana besplatno" na /pretplate,
  landingu i početnoj): registracija → verifikacija maila → trial se
  aktivira automatski (users.wantsOfficeTrial), a /pretplate?officeTrial=auto
  skroluje na PK Office sekciju i pokazuje potvrdu. Pri startu probe se
  SVI obrti korisnika automatski aktiviraju u PK Office ako ih ima do
  limita (10 za Tim, 1 za Solo); sa više od limita korisnik sam bira. Na Tim
  probi NEMA anti-rotacije (deaktivacija odmah oslobađa slot, da se svi
  klijenti mogu isprobati); Solo proba taj izuzetak nema.
- **Kraj probe (od 03.09.2026.)**: korisnik ne ostaje sam sa cjenovnikom.
  Sistem računa PREPORUČENI paket (preporuceniPlanZa: broj obrta kojima
  upravlja + Solo režim/proba → OFFICE_1/2/10/25/50) i svuda nudi direktan
  link na predračun za taj paket (`/pretplate?plan=X&cycle=yearly#pk-office`):
  u traci probe, na zidu poslije isteka i u mailovima. Sekvenca mailova
  (notificationsService, dedup po korisniku i danu): na polovini probe
  (15 dana prije kraja), 7 dana prije, na dan isteka, pa 3 i 14 dana POSLIJE
  isteka ("podaci vas čekaju"); preskaču se korisnici koji su u međuvremenu
  kupili office paket. Zid poslije isteka prikazuje i predračun koji čeka
  uplatu (samo za office pakete) sa linkom na PDF, umjesto da korisnika koji
  je već naručio opet šalje na cjenovnik.
- **Probe u admin panelu (od 03.09.2026.)**: probe se ne vode kao pretplate,
  pa ih /admin/aktivne-pretplate prikazuje kao redove samo za prikaz (bez akcija
  nad paketom, filter "Samo probe"), a /admin/korisnici kao zasebne oznake:
  "Office trial" (nepromijenjeno), "Office Solo trial" (terakota, odvojena
  od Tima) i "Freelancer trial" (šljiva), sa datumima od/do u kolonama kao
  i Office trial. Paket PK Freelancer u obje liste nosi šljivu.
- **Automatska aktivacija po uplati** (services/aktivacijaPaketa.js): kad
  admin označi predračun kao PLAĆEN, pretplata se upiše sama iz podataka
  predračuna (plan malim slovima, ciklus, period), PRO/BUSINESS usklade i
  rolu, a korisnik dobija mail "Paket X je aktiviran". Vrijedi za sve
  planove (office_*, freelancer, pro, business). Neuspjeh aktivacije ne
  poništava oznaku plaćanja, nego se vraća adminu u odgovoru.
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
  `/deaktiviraj`, `/trial`, `/trial/plan` (pkOfficeGateController); kolone
  organizations.pkOfficeEnabled/ActivatedAt/DisabledAt i
  users.pkOfficeTrialEndsAt/pkOfficeTrialPlan.
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
"Uvoz izvoda", "Poruke i obavijesti" i "Podrška (Live chat)".

**Uvoz izvoda** je agencijski alat za knjigovođe koje vode više obrta:
jedino mjesto u PK Office koje ne zavisi od izabrane organizacije nego
radi preko svih organizacija korisnika (gdje je OWNER/ADMIN).

- **Tok**: prevučeš do 50 PDF izvoda odjednom (za različite obrte i
  banke izmiješano) → "Prepoznaj izvode" (ništa se još ne knjiži) →
  program parsira svaki izvod, prepozna kojem obrtu pripada i prikaže
  listu → potvrda po izvodu ili "Proknjiži sve spremne" (sa progresom
  "Knjižim 3/7..."; obuhvata i ručno dodijeljene izvode, a izvode sa
  upozorenjima namjerno NE: oni traže potvrdu po izvodu). Višak preko
  50 fajlova se ne odbacuje tiho: stoji poruka koliko ih nije dodano.
- **Lista preživi navigaciju**: stanje ture (redovi, statusi, fajlovi)
  živi u module store-u dok je kartica browsera otvorena, pa odlazak na
  drugu stranicu i povratak ne briše prikaz; čisti se tek klikom na
  "Ukloni završene".
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
  Iznad liste je rezime po statusima, a redovi koji traže akciju
  sortiraju se na vrh (proknjiženi tonu na dno). Unutar istog statusa
  redovi idu po obrtu (naziv abecedno), a izvodi istog obrta po broju
  izvoda od manjeg ka većem (bez broja na kraj, po datumu). Dugme
  "Ukloni završene" čisti proknjižene i duplikate iz liste.
- **Pregled stavki**: svaki izvod u listi se može raširiti i vidjeti
  sve stavke (datum, protivstrana/opis, iznos) prije knjiženja.
- **Knjiženje**: svaki potvrđeni izvod prolazi kroz isti uvoz kao na
  Bankovnim izvodima te organizacije (validacija salda, auto-match
  faktura/partnera/kategorija, upozorenja).
- **Pop-up detalj izvoda**: "Otvori izvod i pregledaj stavke" (i
  "Pogledaj postojeći izvod" kod duplikata) otvara PUNI detalj izvoda u
  pop-upu, bez prebacivanja aktivnog obrta i bez napuštanja Inboxa:
  potvrda stavki (pojedinačno i "Potvrdi sve"), promjena kategorije,
  uređivanje, brisanje. Naslov pop-upa nosi naziv obrta. Knjigovođa
  tako u jednom prolazu kroz Inbox potvrdi stavke za sve obrte.
  Komponenta je dijeljena (IzvodDetalj.tsx): stranica
  /app/bankovni-izvodi/[id] je tanki omotač oko iste.
- **KPR status na proknjiženom redu**: "proknjižen" znači da je izvod
  učitan u bankovne izvode obrta; stavke ulaze u KPR tek potvrdom. Red
  zato pokazuje žuto upozorenje "N stavki čeka potvrdu da uđe u KPR",
  tekst eventualnih upozorenja sa knjiženja (kontinuitet salda, naziv
  obrta nije na izvodu), i dugme **"Potvrdi sve stavke"** koje potvrdi
  cijeli izvod direktno sa reda (isti endpoint kao "Potvrdi sve" u
  pregledu; stavke bez kategorije ne ulaze u KPR dok je ne dobiju).
  Nakon potvrde red pokazuje "Sve stavke potvrđene za KPR." U traci
  iznad liste je i globalno **"Potvrdi sve izvode (N)"**: sekvencijalno
  potvrdi stavke svih proknjiženih izvoda sa progresom
  ("Potvrđujem 3/7..."). Ako korisnik stavke potvrdi u pop-up pregledu
  izvoda (pojedinačno ili "Potvrdi sve"), red to sam prepozna pri
  zatvaranju pregleda i označi se završenim; dugme na redu ostaje samo
  kad neka stavka još čeka potvrdu.
- **Vidljivost**: grupni uvoz se nudi svima (i sa jednim obrtom) i na
  Početnoj (istaknuta kartica sa dugmetom "Otvori grupni uvoz") i na
  stranici Bankovni izvodi (traka ispod polja za učitavanje).

**Poruke i obavijesti**: obavijesti koje admin objavi (info/upozorenje/
uspjeh, sa publikom i rokom isteka) + automatska upozorenja o isteku
pretplate. Ulaskom u tab se označe pročitanim; broj nepročitanih stoji
na tabu i uz Inbox u sidebaru (zajedno sa porukama podrške).

**Podrška (Live chat)**: razgovori sa administracijom u realnom vremenu
(Socket.IO, historija preživi refresh). Više razgovora po korisniku,
filteri Otvoreni/Zatvoreni/Svi (zatvoreni ostaju čitljivi kao arhiva),
zatvoren razgovor je samo za čitanje dok ga admin ponovo ne otvori,
datumski separatori u niti ("Danas"/"Juče"/datum), status "Tim je
online". Admin strana (/admin/podrska) ima iste razgovore, zatvaranje,
ponovno otvaranje i trajno brisanje razgovora. Ako korisnik nije online
kad podrška odgovori, dobije email (isključivo u postavkama).

### Sistemske notifikacije (email + in-app)

Postavke na `/app/postavke?tab=notifikacije`: org-vezane podešava svaki
član obrta za sebe (čuva se na članstvu), a "Odgovor podrške" važi za
cijeli nalog. Default je SVE uključeno; svaka notifikacija je ili vezana
za zakonski rok ili se šalje samo kad ima sadržaja.

- **Rok doprinosa i poreza / PDV prijava**: email 7. i 10. u mjesecu u
  08h, SAMO ako uplata te kategorije nije evidentirana na izvodu
  (potvrđena stavka). PDV samo za obveznike.
- **Plate i MIP**: 5. u mjesecu ako plate za prethodni mjesec nisu
  obračunate; 12. ako jesu a MIP-1023 nije preuzet.
- **Godišnji rokovi**: 20.01. za GIP-1022 (rok 31.01.) i 20.03. za
  GPD/SPR (rok 31.03.; preskače obrte sa već spremljenim GPD-om).
- **Sedmični pregled**: ponedjeljkom, nepovezane transakcije + dospjele
  fakture + izvodi stariji od 30 dana; šalje se samo ako ima nečega.
- **Istek pretplate**: automatski email samo PLAĆENIM pretplatnicima.
  Godišnja: 30 dana, 7 dana i na dan isteka. Mjesečna: 3 dana i na dan
  isteka. Pretplata bez upisanog ciklusa se vodi kao godišnja. Isti mail
  admin može poslati i ručno iz `/admin` → Obnove.
- **Istek PK Office probe**: email 7 dana prije i na dan isteka, jer
  proba živi na `users.pkOfficeTrialEndsAt` i ne vidi je podsjetnik za
  pretplate. Preskaču se korisnici koji su u međuvremenu kupili office
  paket. Mail vodi na /pretplate#pk-office i kaže da podaci ostaju
  sačuvani, a da prestaje pristup PK Office modulima i Business
  funkcijama.
- **In-app**: iste stvari kao kartice u Inbox → Poruke i obavijesti
  (klik vodi na stranicu), plus obavijest kad KOLEGA učita izvod za
  zajednički obrt. Broj nepročitanih ulazi u badge na tabu i sidebaru.

Pravila protiv spama: sve zbirno PO KORISNIKU (knjigovođa sa 30 obrta
dobije jedan email sa listom obrta), dedup log garantuje da se isti
podsjetnik nikad ne šalje dvaput (job je idempotentan i smije se
ponoviti nakon restarta), a svaki email u footeru vodi na postavke
notifikacija. Scheduler: jednom dnevno u 08h (interna provjera svakih
10 min, bez vanjskih servisa).

## 18. Obrasci (SPR-1053, GPD-1051, ČOK i ONŠ iz knjiga)

Stranica `/app/obrasci`: priprema godišnjih poreznih obrazaca iz knjiga
izabrane organizacije, uz izbor godine (default prethodna godina, jer se
godišnji obrasci predaju za nju). Redoslijed je uvijek: prvo SPR, pa GPD
(SPR je zvanično prilog godišnje prijave).

### ČOK i ONŠ (kantonalne naknade, predaju se ručno u PU)

Dvije kartice na `/app/obrasci`; obračun se sprema na profil (kartica
odmah pokazuje "za uplatu X KM" bez otvaranja modala) i preuzima kao PDF
za štampu i ovjeru. Kanton se izvodi iz sjedišta obrta (šifarnik općina
KANTONI), sa ručnom promjenom; iz kantona idu naziv poreznog ureda
(Bihać, Sarajevo, Tuzla...), komora i računi. Sve auto-vrijednosti su
editabilne. Šifarnik: `src/sections/obrasci/kantonalni.ts`.

- **Obrazac ČOK** (godišnja članarina obrtničkoj komori kantona):
  osnovica NIJE promet nego osnovica za obračun doprinosa vlasnika
  (r.br. 10 obrasca 2002) x broj mjeseci. Default se vuče iz vlasnikovih
  obračuna doprinosa (najčešći mjesečni bruto + broj obračunatih
  mjeseci), fallback režimska osnovica x 12. Stopa default 0,50%
  (editabilna, skupština komore je mijenja godišnje). PDF replika
  zvaničnog obrasca: zaglavlje PU FBiH sa kantonalnim uredom i
  ispostavom, Dio 1 (JIB u kućicama, obrtnik, obrt, udruženje DA/NE),
  Dio 2 (obračun sa "X x N" formatom osnovice), Dio 3 (izjava).
  Podaci za uplatu: vrsta prihoda 722567; žiro računi komora poznati za
  USK (1020220000053653) i KS (3387302220433691), ostali se dopunjuju u
  KOMORA_RACUNI kad ih komore dostave.
- **Obrazac ONŠ** (naknade za šume): naknada za općekorisne funkcije
  šuma 0,07% od UKUPNO ostvarenog prihoda (osnovica = prihodi iz KPR-a
  za period, dugme za ponovno povlačenje kad se period skrati), 100%
  budžet kantona. Sekcija 1.a (7% od prihoda od drveta) ostaje prazna
  za obične obrte. Evidencija uplata po kvartalima (ručno), obračun na
  nivou perioda. PDF replika obrasca sa 11 kolona (AOP, stopa,
  osnovica, kvartali, ukupno), A4 položeno kao original. Podaci za uplatu: budžet kantona (računi
  iz payroll šifarnika), vrsta prihoda 722471, šifra općine sjedišta.
- Backend: forms.type ENUM proširen sa COK/ONS (ensureFormTypeEnum),
  VALID_TYPES u documentsController; spremljeni obrasci se listaju na
  stranici kao SPR/GPD (preuzimanje regeneriše PDF iz snimljenih
  podataka).

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
  polja, kvačica sprema), ne vraća se u panel. Iznad panela stoji
  napomena o tipkovnici, a **F3** skače pravo na polje MPC (kad je
  ostalo predpopunjeno iz prethodnog unosa artikla). **PageDown** odmah
  dodaje stavku čim su količina, cijena i MPC popunjeni (predpopunjeni
  artikli: izbor artikla + količina + PageDown, bez niza Entera). Ulazak
  u polje količine označi postojeću vrijednost (kao kod cijene), pa
  kucanje piše preko nje. Za neobveznika sa opcijom "Automatski dodaj
  PDV na cijenu" rastav "cijena bez PDV-a + 17% = upisana" se ispisuje i
  za PREDPOPUNJENU cijenu (ne samo ručno unesenu), da se cijena može
  provjeriti prema ulaznoj fakturi koja iskazuje cijene bez PDV-a.
- **Izbor artikla ne izlistava cijeli šifarnik**: prazno polje (strelica)
  nudi **zadnjih 10 korištenih** artikala (`zadnjaUpotreba` = MAX datum
  kalkulacije po artiklu, računa se u `listArtikli`), a kucanje pretražuje
  cijeli šifarnik i vraća do 20 pogodaka **rangiranih**: tačna šifra ili
  bar kod, šifra počinje upitom, naziv počinje upitom, naziv sadrži upit;
  unutar istog ranga prvi su skorije korišteni. Na dnu panela stoji
  "Prikazano N od M", da se vidi kad treba suziti pretragu.
- **Ispis i potpisnici**: PDF se preuzima sa liste ili dugmetom "Preuzmi
  PDF" na formi kalkulacije; to dugme ispisuje SNIMLJENO stanje bez
  spremanja, pa radi i kad je kalkulacija zaključana (ulazni račun
  plaćen). U dnu PDF-a su potpisnici: lijevo "Kalkulaciju uradio" (ime
  iz dugmeta "Potpisnik" iznad liste kalkulacija, kolona
  `organizations.kalkulacijePotpisnik`, PUT
  `/api/kalkulacije/:orgId/potpisnik`, OWNER/ADMIN), desno "Kalkulaciju
  primio" sa nazivom obrta ispod linije. Prazan potpisnik = prazna
  linija za ručni potpis.
- **Broj kalkulacije**: numeracija ide po godini i sama daje sljedeći
  slobodan broj, ali se u zaglavlju može upisati i **ručno** (npr.
  nastavak numeracije iz starog programa), i pri unosu i pri izmjeni.
  Duplikat u istoj godini se odbija (409 `BROJ_ZAUZET`, poruka kaže da
  broj drži druga kalkulacija); broj se oslobodi kad se toj kalkulaciji
  promijeni broj ili se obriše. Kopija kalkulacije uvijek dobija svoj
  novi broj.
- **Obračun kalkulacije**: drugi pod-tab prikazuje sve kolone KCM
  obrasca (iznos, rabat, fakturna, zavisni, nabavni iznos i cijena,
  marža, bez PDV-a, PDV, MPC, maloprodajni iznos) sa sumama; gore su
  stalno vidljive kontrolne sume, gdje se "Ukupan iznos računa"
  (fakturna + ulazni PDV) poredi sa računom dobavljača.
- **Računica** (PDV obveznik): cijene se unose bez PDV-a; MPC sadrži
  17%; ukalkulisani PDV = maloprodajna − maloprodajna/1,17; ulazni PDV =
  17% na fakturnu vrijednost (zavisni trošak nema ulaznog PDV-a). Obrt
  koji NIJE u PDV-u unosi cijene sa PDV-om i nema PDV kolona.
- **Ulazni PDV sa računa** (opciono polje u zaglavlju, samo PDV
  obveznik): odbitni PDV kako piše na računu dobavljača. Ako se zbog
  zaokruživanja kod dobavljača razlikuje od obračunatih 17% po stavkama,
  u KUF (odbitni PDV), iznos ulaznog računa i kontrolu iznosa ide iznos
  sa računa; prazno polje znači obračunatih 17% (placeholder pokazuje
  taj iznos). Traka suma tada nosi labelu "Ulazni PDV (sa računa)". Pri
  uređivanju kalkulacije polje se predpopuni samo ako je iznos ranije
  bio pregažen (razlika prema zbiru stavki).
- **Automatski dodaj PDV na cijenu** (checkbox u zaglavlju, samo obrt
  koji NIJE u PDV-u): računi obično nose veleprodajne cijene (bez
  PDV-a), a za neobveznika PDV nije odbitan nego ulazi u nabavnu
  cijenu. Uz uključenu opciju se kuca cijena direktno sa računa, a u
  polju se na Enter (ili pri dodavanju stavke) vidljivo uveća za 17%
  (x 1,17), uz info poruku sa računicom. Konvertuje se samo ručno
  ukucana cijena, jednom: predpopuna iz zadnje stavke je već sa PDV-om
  i ne dira se. Izbor opcije se pamti po obrtu (localStorage).
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
- **Enter tok kroz unos**: Enter vodi artikal → količina → cijena →
  rabat → zavisni → marža → MPC; Enter na MPC-u dodaje stavku i vraća
  fokus na artikal (unos bez miša, red za redom).
- **Kontrola iznosa računa** (opciono polje u zaglavlju): upiše se
  ukupan iznos sa fakture dobavljača, pa traka suma živo pokazuje
  "slaže se (0,00)" (zeleno) ili razliku (crveno) prema unesenim
  stavkama.
- **Predpopuna iz zadnje stavke**: izbor artikla koji je već bio na
  nekoj kalkulaciji odmah popuni količinu, cijenu, rabat, zavisni i MPC
  kao na zadnjem prometu (uz info iz koje kalkulacije), pa se unos
  ponavljajuće robe svede na Enter-Enter. Pored artikla su dugmad za
  **karticu artikla** (promet i stanje, isti modal kao na lageru) i
  **uređivanje artikla**.
- **Upozorenje na drugu MPC**: ako artikal na lageru već ima stanje po
  nekoj MPC a unosi se druga, žuta napomena javlja da nova MPC pravi
  odvojenu lager stavku i upućuje na nivelaciju za promjenu cijene.
- **Upozorenje na maržu u minusu** (MPC ne pokriva nabavnu cijenu):
  žuta napomena već u panelu unosa dok se kuca, marža u redu stavke
  crvena i podebljana sa ikonom upozorenja (i na tabu Obračun
  kalkulacije), a ispod tabele stoji žuta traka sa spiskom svih stavki
  u minusu. Spremanje se NE blokira (prodaja ispod nabavne zna biti
  namjerna, npr. rasprodaja).
- **Zavisni troškovi (KM)** na nivou kalkulacije: iznos (npr. prevoz sa
  posebne fakture) se dugmetom "Rasporedi" raspodijeli na SVE stavke
  proporcionalno fakturnoj vrijednosti (kao jednak zavisni %).
- **Status plaćanja na listi**: kolona "Plaćanje" (plaćen / otvoren /
  kasni po ulaznom računu kalkulacije), dobavljač je link na karticu
  partnera. Na kartici partnera računi iz kalkulacija nose oznaku
  **"KLC broj"** (npr. "KLC 1/26 · Račun 123"), i u listi računa i na
  kartici prometa (web i PDF), pa se odmah zna da je račun kalkulacija.
- **Šifarnik proširen**: kolone Stanje i MPC sa lager liste (usluge "–"),
  klik na red otvara karticu artikla, checkbox "Sakrij neaktivne" i
  **Izvoz (CSV)** za Excel (podaci + stanje + MPC).
- **Marža tab**: brzi periodi (Ovaj mjesec, Prošli mjesec, Cijela
  godina) i napomena da je marža ukalkulisana (iz kalkulacija), ne
  realizovana prodaja.
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
- **Lager lista**: presjek "zaključno sa datumom" (radi i retroaktivno)
  uz brze datume (Danas, Kraj prošlog mjeseca, 31.12. prošle godine),
  status pod-tabovi (Ima na lageru / Nema / Manjak / Sve), pretraga,
  sortiranje u OBA smjera po šifri, nazivu, količini i vrijednosti,
  kolona "Zadnji ulaz" (datum zadnje kalkulacije, otkriva stajaću robu),
  footer sa brojem stavki I artikala (isti artikal sa dvije MPC = dva
  reda). **PDF i CSV prate aktivne filtere**: šta je na ekranu, to ide
  u fajl (naslov "LAGER LISTA na dan X", ispisani filteri, totali); CSV
  za Excel uvijek nosi i nabavne kolone i zadnji ulaz.
- **Traka vrijednosti zalihe** iznad tabele (za prikazane stavke):
  maloprodajna vrijednost, vrijednost bez PDV-a (obveznik; isti broj
  koji D-PDV predpopuna vuče za zalihe), nabavna vrijednost i
  ukalkulisana marža (RUC). Nabavna je prosječna iz kalkulacija.
- **Checkbox "Prikaži nabavne cijene"**: dodaje kolone nabavna cijena
  i nabavna vrijednost u tabelu i PDF (interna verzija liste); default
  isključeno pa obična lista ostaje čista.
- **Manjak badge**: crveni broj na status tabu "Manjak" čim negdje
  postoji negativno stanje (obično greška u knjiženju: fali kalkulacija
  ili popis), vidljiv sa bilo kog status taba.
- **Brza nivelacija iz reda**: ikona cijene u akcijama reda vodi na tab
  Nivelacije sa već izabranim artiklom i starom MPC i predispunjenom
  količinom (promjena cijene u dva klika).
- **Uvoz početnog stanja lagera** (dugme na Lager listi): CSV sa
  kolonama Šifra/Količina/MPC (opciono Nabavna cijena; podržan
  Com_Soft izvoz, Windows-1250). Parsira se u browseru uz pregled (šta
  se uvozi, šta se preskače i zašto; artikli se traže po šifri u
  šifarniku), backend kreira DRAFT **popis početnog stanja** SAMO sa
  uvezenim redovima (ne dira ostalu robu; "Osvježi stanje" mu ne dodaje
  snapshot redove). Popis nosi badge "početno stanje", pregleda se i
  proknjiži na tabu Popis: tek tada količine ulaze u lager, a TKM
  dobije red "Početno stanje zaliha po popisu X". Upozorenje u modalu:
  ručno vrijednosno početno stanje TKM-a za istu godinu treba ukloniti
  da se ne dupla.
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
  Unos, uređivanje i brisanje su blokirani ako bi saldo blagajne na
  kraju bilo kojeg dana otišao u minus (pokriva i unazad datirane
  izmjene). Kod uređivanja tip i broj naloga ostaju, datum mora ostati
  u istoj godini. Akcija "Kopiraj" otvara novi nalog predpopunjen
  postojećim (današnji datum), za ponavljajuće unose tipa dnevni pazar.
  Polja uplatilac/primalac i osnov nude prijedloge iz ranijih naloga.
- **Dnevnik**: za izabrani dan: donos (saldo prethodnog dana), nalozi,
  promet naplata/isplata, saldo na kraju dana; redni broj dnevnika =
  redni broj dana sa prometom u godini. Brzi periodi (Danas, Jučer,
  Ovaj/Prošli mjesec). Višednevni period se grupiše po danima: svaki
  dan ima svoj podnaslov sa brojem dnevnika, prometom, saldom dana i
  dugmetom za PDF tog dnevnika.
- **PDF**: pojedinačni nalog (sa iznosom slovima i potpisima blagajnik/
  uplatilac-primalac/odgovorno lice), blagajnički dnevnik za dan (sa
  potpisima) i "Dnevnici za period" (jedan PDF, stranica po danu sa
  prometom, za štampu svih dnevnika na kraju mjeseca).
- **Blagajnički maksimum**: iznos po obrtu
  (organizations.blagajnickiMaksimum, interna odluka); uređuje se sa
  blagajne (olovka u traci suma), upozorenje kad saldo pređe maksimum +
  dugme "Položi pazar", i PDF "Odluka o visini blagajničkog maksimuma".
- **Položi pazar**: brza akcija koja otvara nalog za isplatu
  predpopunjen viškom iznad maksimuma (ili cijelim saldom ako maksimum
  nije utvrđen) i osnovom "Polaganje pazara na transakcijski račun".
- **Početno stanje**: dok prije izabranog perioda nema prometa, ponuđen
  je unos početnog stanja (nalog za naplatu sa osnovom "Početno stanje
  blagajne") za prelazak sa postojeće blagajne u toku godine.
- Kod isplate preko 200 KM modal prikazuje napomenu o ograničenju
  gotovinskih plaćanja robe/usluga (bez blokiranja, jer polaganje
  pazara i plate nisu ograničeni).

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
  prevozno sredstvo, polazak/povratak (datum + vrijeme sa maskom
  HH:MM), dnevnica (default 25 KM), broj dnevnica sa prijedlogom iz
  trajanja puta koji se **sam upisuje** dok korisnik ne ukuca svoj
  broj, akontacija, troškovi prevoza/smještaja/ostalo, **vlastito
  vozilo** (pređeni km x KM po km = naknada, posebna stavka obračuna),
  izvještaj sa puta. Nalog se može dopuniti nakon puta.
- **Predpopuna iz zadnjeg naloga radnika**: izbor radnika povuče
  prevozno sredstvo, relaciju, svrhu i KM/km stopu sa njegovog zadnjeg
  naloga (samo u prazna polja). **Kopiraj nalog** (ikona u redu): novi
  nalog sa istim radnikom/relacijom/svrhom/prevozom i km stopom, novi
  datumi i prazne dnevnice.
- **Upozorenje na oporezivi dio**: dnevnica veća od 25 KM dobije žutu
  napomenu da se razlika oporezuje kao plata.
- Numeracija po obrtu i godini; obračun: dnevnice + vlastito vozilo +
  troškovi − akontacija = za isplatu (ili za povrat u blagajnu).
- **Evidencija isplate**: kolona "Isplata" (otvoren/isplaćen sa datumom
  u tooltipu). Dugme isplate otvara modal: "Isplati iz blagajne"
  (kreira blagajnički nalog isplate sa osnovom "Putni nalog X,
  relacija" pa upiše oznaku sa vezom; poštuje guard minimalnog salda,
  poruka ako nema gotovine) ili "Samo označi isplaćenim" (isplata preko
  računa). Oznaka se može poništiti (blagajnički nalog se tada NE briše
  automatski, upozorenje kaže da se ukloni na Blagajni). Backend: POST
  /api/putni-nalozi/:orgId/:id/isplata; kolone predjeniKm, kmStopa,
  isplacenoDatum, blagajnaNalogId (ensureColumns).
- **Lista**: filter po radniku, pretraga (relacija/svrha/broj/ime),
  footer sa sumama (dnevnice, ukupno, za isplatu). **Knjiga putnih
  naloga (PDF)**: evidencija za godinu, prati filtere, sa kolonom
  datuma isplate.
- **PDF**: nalog (ko/kuda/zašto/čime/kada + potpis nalogodavca) +
  obračun putnih troškova (sa stavkom "Upotreba vlastitog vozila: X km
  x Y KM", za isplatu i slovima) + izvještaj + potpisi; napomena da se
  prilažu računi.

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

## 27. Stalna sredstva, zaključak godine, opomene i arhiva

### Stalna sredstva i amortizacija (dijeljeno sa /amortizacija)

Nativna PK stranica `/app/stalna-sredstva` (sidebar → Knjige i
evidencije): unos i pregled registra direktno u aplikaciji. Podaci su
ISTI PLDI zapis (Form po obrtu i godini) koji koristi i marketing
/amortizacija, pa je sinhronizacija automatska u oba smjera: šta se
unese ovdje vidi se tamo i obrnuto.

- Stranica: izbor godine, KPI (broj sredstava, nabavna, godišnja
  amortizacija, vrijednost na kraju), tabela sa svim PLDI kolonama
  (datum nabavke, br. dokumenta, nabavna, početna vrijednost, vijek,
  stopa, mjeseci, amortizacija, kraj godine, prodaja/otpis; dijeljena
  calcRow logika sa PLDI obrascem), modal za novo/izmjenu (uključuje
  ručnu stopu i ručne mjesece), preuzimanje popunjenog obrasca
  PLDI-1043 (prazna polja obveznika se za PDF dopune iz podataka obrta
  i vlasnika) i knjiženje amortizacije u KPR.
- **Ručni period obračuna**: za obrt otvoren/zatvoren u toku godine
  (checkbox + od/do); amortizacija se računa za period, a knjiženje u
  KPR ide na KRAJ PERIODA umjesto na 31.12. (backend prima datum).
- **Prenos u sljedeću godinu**: ista logika kao marketing strana;
  prenose se neprodana sredstva, nabavna ostaje ista, početna
  vrijednost = vrijednost na kraju tekuće godine, ručne stope/mjeseci
  se resetuju; postojaći podaci sljedeće godine se zamjenjuju uz
  potvrdu.
- Na knjiženju ulaznog računa checkbox **"Stalno sredstvo"** (naziv +
  vijek trajanja sa stopom): uz knjiženje se sredstvo automatski doda u
  PLDI registar godine (nabavna = iznos bez odbitnog PDV-a, početna KV =
  nabavna, broj dokumenta = broj računa).
- **Knjiženje godišnje amortizacije u KPR**: dugme na Zaključku godine;
  kreira interni izvod AM-GGGG na 31.12. sa CONFIRMED stavkom kategorije
  "Amortizacija (godišnji obračun)" (KPR kolona 19). Iznos se računa
  istom logikom kao PLDI obrazac (calcRow). Duplo knjiženje je
  blokirano (postojeći AM izvod → 409).

### Zaključak godine (na /app/obrasci)

Checklist zakonskih koraka za izabranu godinu, statusi iz knjiga:
popis robe na 31.12. (proknjižen popis godine), obračun amortizacije
(PLDI + iznos), amortizacija proknjižena u KPR (sa dugmetom), GIP-1022
(rok 31.01.), SPR/GPD (rok 31.03., detekcija spremljenih), ČOK i ONŠ.

### Arhiva godine (ZIP)

Dugme na Zaključku godine: ZIP sa KPR-1041, KUF i KIF za cijelu godinu
(PDF-ovi se grade client-side istim builderima kao na svojim
stranicama). Za arhiviranje ili inspekciju.

### Opomena kupcu (kartica partnera)

Kad partner ima dospjeli dug preko roka, na kartici se pojavi red
"Dospjeli dug X KM" sa izborom vrste (Opomena / Opomena pred utuženje),
PDF i slanje emailom. Sadržaj po praksi: povjerilac/dužnik, tabela
dospjelih računa (dokument, datum, valuta, iznos) sa odobrenjima u
minusu, ukupan dug, rok 8 dana, račun za uplatu, upozorenje (nivo 2:
zatezna kamata + sudski postupak), "zanemarite ako ste platili".

## 28. Uputstva (kontekstualna pomoć po stranici)

Uz naslov skoro svake stranice u /app stoji dugme **Uputstvo** (plavo,
naglašeno). Klik otvara klizni panel zdesna sa uputstvom baš za tu stranicu;
stranica ispod se ne pomjera. Panel se zatvara na X, Escape ili klik van njega.

Sadržaj panela je isti obrazac za svaku temu: kratak uvod (čemu služi), sekcije
"korak po korak", zeleni savjeti i amber upozorenja, te rasklopiva **Česta
pitanja** (rubni slučajevi, npr. zašto stavka nije ušla u KPR). Namijenjeno
klijentu/pripravniku koji vodi obrt, ne kao jedan veliki priručnik.

Pokriveno je sve osim Pretplate i Postavki obrta (tu se nema šta objašnjavati).

Na Početnoj dugme nosi label **"Kako početi"** i otvara vodič kroz redoslijed
rada koji povezuje sve stranice (obrt → izvodi → KPR → fakture → plate → roba →
PDV → godišnji obrasci), pa novi klijent ima jedan tok od praznog obrta do kraja
godine.

Uz tekstualne blokove tema podržava i **slike** (blok `{ t: "slika", src, opis }`);
screenshotovi idu u `frontend/public/uputstva/` (konvencija u README tamo).

Tehnički: dugme je `HelpButton` (dobije `slug`), panel `UpustvoDrawer` (montiran
jednom u AppShell-u), povezani sitnim storom `src/lib/upustvo-store.ts`. Sadržaj
je tipiziran po temi u `src/content/upustva/` (jedan fajl po ruti + registry u
`index.ts`), bez markdown dependencyja. Nova stranica = novi fajl teme, red u
registru i `HelpButton slug="..."` uz naslov. Izvor istine za tekst je ovaj
dokument; panel je njegova uglađena, klijentu okrenuta verzija.

## 29. PK Office Solo (vodim sam sebi)

Paket **Office Solo** (`office_1`, 1 obrt, 100 KM godišnje + PDV, 10 KM
mjesečno) je za obrtnika koji vodi knjige sam, bez knjigovođe. Isti motor kao
PK Office, isti obračuni; razlika je samo šta se vidi i kako se vodi za ruku.
Ulazi u ljestvicu ispod Office Starta (ista cijena po obrtu), viši paketi ga
uključuju, a Solo uključuje i PK Freelancer (link pod "Ostalo").

**Ulaz bez obrta.** Korisnik koji uđe u /app bez ijednog obrta ne dobija više
modal koji šalje u Postavke: naslovnica sama prikazuje formu za prvi obrt
(ista forma kao Postavke > Novi obrt, `ProfilTab createMode`). Obrt se odmah
aktivira u PK Office i korisnik ostaje na naslovnici sa upitnikom.

**Upitnik (Solo upitnik).** Dva pitanja: ko vodi knjige (ja sam / knjigovođa)
i šta obrt koristi (radnici, roba i maloprodaja, blagajna, putni nalozi,
stalna sredstva). Otvara se sam za vlastiti obrt bez popunjenog upitnika na
Solo paketu ili sa uključenim Solo režimom, i na `/app/dashboard?solo=upitnik`
poslije kreiranja obrta. Odgovori se čuvaju na obrtu (`organizations.soloMode`,
`organizations.soloModuli` JSON) i mijenjaju u **Postavke obrta > Način rada**.
PDV se ne bira ovdje nego kroz status PDV obveznika na Profilu obrta.

**Suženi meni.** U Solo režimu sidebar prikazuje: Početna; "Svaki mjesec"
(Fakture, Bankovni izvodi, Doprinosi i uplatnice [= Obračuni plata; uz modul
Radnici vraća se naziv Obračuni plata], PDV evidencije ako je obveznik,
Blagajna ako je modul); "Knjige i obrasci" (KPR-1041, Obrasci i kraj godine,
Kupci i dobavljači, Transakcije, Stalna sredstva ako je modul); "Dodatni
moduli" (Zaposlenici, Putni nalozi, Kalkulacije i Lager, po upitniku);
"Ostalo" (Inbox, PK Freelancer); Račun. Agencijske stvari (grupni uvoz,
klijenti, više obrta) se ne vide. Sve ostale stranice su iste kao u punom
PK Office-u.

**Solo naslovnica.** Umjesto pregleda za knjigovođu: lista **"Šta trebam ovaj
mjesec"** sa rokom i statusom (gotovo / čeka / kasni) i linkom na ekran gdje se
rješava: bankovni izvod za prošli mjesec (učitan ove mjeseca), transakcije
povezane i proknjižene (nema nepovezanih), obračun doprinosa vlasnika
(Obrazac 2002) za obračunski mjesec (status iz payroll-status), plus
obaveze iz `obligationsService` (doprinosi, akontacija poreza, PDV) koje se
zazelene kad potvrđena uplata stigne na izvod. Ispod: brze radnje (Nova
faktura kao primarna, Kopiraj zadnju fakturu, Učitaj izvod, Doprinosi i
uplatnice, Obrasci i kraj godine), KPI za mjesec (naplaćeno, plaćeno,
otvorene fakture, stanje računa), zadnje transakcije i vodiči (Prvi mjesec,
Kraj godine, Rječnik pojmova).

**Faktura kao glavna radnja.** "Nova faktura" stoji u gornjoj traci na
svakom ekranu (na mobilnom pluta dolje desno). Forma fakture u Solo režimu
sakriva napredna polja (vrsta isporuke, valuta, jezik) iza dugmeta
**Napredno**, a jedan prekidač **Inostrani kupac** postavlja sve odjednom:
izvoz bez PDV-a, EUR i dvojezičnu fakturu.

**Jezik fakture.** Nova kolona `invoices.jezik` (bs / en / bs-en). PDF
(`invoicePdf.js`, rječnik labela `labelsFor`) ispisuje sve labele na
izabranom jeziku; dvojezična verzija ima kratke "bs / en" labele, drugi red
zaglavlja tabele na engleskom i iznos slovima na oba jezika. Napomena o PDV-u
sada zavisi od vrste isporuke: obračunat / nije obveznik / izvoz / oslobođena
isporuka. Email kupcu ide na engleskom kad je jezik en ili bs-en.

**Ponavljajuće fakture.** Pripremljeni računi dobili su `autoDan` (1-28) i
`autoEmail`: dnevni job (`ponavljajuceFaktureJob` u notificationsService) tog
dana sam napravi fakturu (mjesečno svaki mjesec, kvartalno u 1/4/7/10,
godišnje u januaru; sedmični ostaju ručni), idempotentno preko
`lastInvoicedAt`, po želji je odmah pošalje kupcu, a vlasnik dobije in-app
obavijest. Ručno "Fakturiši sve" ostaje.

**Uputstva korak po korak.** Četiri Solo teme u sistemu uputstava:
`solo-pocetna` (mjesečna rutina i "šta ako"), `solo-prvi-mjesec`,
`solo-kraj-godine`, `solo-rjecnik`. Pisana bez žargona, svaki korak kaže gdje
se klikne.

**Paket u kodu.** `OFFICE_1` u `config/pricing.js` i `data/pricing.ts`
(prvi u listi, `officePlanForCount(1)` sada vraća Solo), enumi
`subscriptions.plan` / `predracuni.plan` prošireni kroz
`ensureOfficePlanEnums` (novi markeri), regexi paketa u
subscriptionsController, userRepository i admin listama uključuju `1`.
Limit kreiranja organizacija je vezan za plan (Solo 1, Start 2; greška
`OFFICE_SOLO_LIMIT`), a deaktivacija jedinog Solo slota oslobađa slot odmah
(bez anti-rotacije do 1. u mjesecu). Labela paketa je "PK Office Solo (1 obrt)",
zamjena uz `officeMaxObrta` hvata i taj oblik.

**Landing /solo (od 4.9.2026.).** Marketing stranica za obrtnika koji vodi sam
(`sections/solo-landing`, isti CSS modul kao /pk-office, boje PK Office-a):
hero, primjer Solo naslovnice sa listom obaveza, "Mjesec u četiri koraka",
šta je u paketu, za koga je (i kad ipak treba knjigovođa), cijena sa
kalkulatorom uštede (`SoloUsteda`, dijeljen sa reklamom na /freelancer), FAQ
(`faq.ts`, isti tekst u FAQPage JSON-LD) i završni poziv. Dugme `SoloCta`
bira odredište po stanju korisnika: gost ide na registraciju sa Solo probom,
prijavljen bez probe odmah na Solo probu, korisnik sa probom ili paketom u
app, potrošena proba na predračun. Klikovi se bilježe kao
`OFFICE_SOLO_PROMO_KLIK` sa izvorom `solo-hero`, `solo-cijena`, `solo-dno`.
Linkovi na /solo: navbar (Porezni obrasci), footer, sitemap, uvod PK Office
sekcije na /pretplate, planLead na /pk-office i reklama SoloReklama. Meta
reklame za Solo vode ovdje, ne na /pk-office.

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
