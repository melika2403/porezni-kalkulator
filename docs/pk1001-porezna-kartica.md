# PK-1001: zahtjev za izdavanje porezne kartice

> STATUS: URAĐENO 15.08.2026. Stranica /porezna-kartica je živa, kartica u
> traci stoji između Obračuna plata i Aktivnih radnika, Pro kapija je ista kao
> na obračunu. Testovi pravila: backend/test/pk1001.test.js (11 testova).

Obrazac PK-1001 je ZAHTJEV koji radnik podnosi Poreznoj upravi FBiH da mu izda
poreznu karticu (obrazac PK-1002). Poslodavac karticu čuva dok traje radni
odnos i po njoj primjenjuje lični odbitak. Bez kartice koeficijent je nula, pa
radnik plaća puni porez. Lični odbitak vrijedi od datuma izdavanja, ne unazad.

Izvori: [obrazac PK-1001](https://www.pufbih.ba/v1/public/upload/obrasci/6fea6-pk_1001_bs_int2.pdf),
[zvanično uputstvo za popunjavanje](https://pufbih.ba/v1/public/upload/files/Uputstvo_PK_1001_BS.pdf),
[Pravilnik o primjeni Zakona o porezu na dohodak](https://www.paragraf.ba/propisi/fbih/pravilnik-o-primjeni-zakona-o-porezu-na-dohodak.html).

## 1. Gdje ide

Nova stranica **`/porezna-kartica`** i nova kartica **"Porezna kartica"** u
traci Radnici i plate (`RadniciTabBar`), **između "Obračun plata" i "Aktivni
radnici"** (odluka vlasnika).

Gating: `hasAccessToTier("PRO")`, isto kao Obračun plata. Bez plana forma se
vidi ali se PDF ne generiše, uz poruku "Dostupno uz Pro pretplatu".

Radnik se bira iz istog sidebara kao na JS3100 (`WorkersSidebar`), pa se podaci
povlače iz kartona radnika i organizacije.

## 2. Pravila obrasca (iz zvaničnog uputstva)

Koeficijenti (Pravilnik čl. 21, iznosi podijeljeni sa 300 KM):

| Osnov | Iznos | Koeficijent |
| --- | --- | --- |
| Osnovni lični odbitak (uvijek) | 300 KM | 1,0 |
| Izdržavani bračni drug | 150 KM | 0,5 |
| Prvo dijete | 150 KM | 0,5 |
| Drugo dijete | 210 KM | 0,7 |
| Treće i svako dalje dijete | 270 KM | 0,9 |
| Ostali izdržavani članovi uže porodice | 90 KM | 0,3 |
| Vlastita invalidnost / invalidnost izdržavanog člana | 90 KM | 0,3 |

Ključna pravila koja aplikacija mora poštovati:

- **Prag od 300 KM**: ko ima vlastiti mjesečni prihod veći od 300 KM (penzija,
  invalidnina, alimentacija, druga lična primanja) NIJE izdržavani član i ne
  unosi se. Vrijedi za bračnog druga i za djecu.
- **Djeca se unose od najstarijeg prema najmlađem**, jer redoslijed određuje
  koeficijent (0,5 / 0,7 / 0,9).
- **Udio u %**: ako oba roditelja izdržavaju dijete, koeficijent se dijeli po
  procentu. Primjer iz uputstva: omjer 50/50 daje koeficijent 0,25 za prvo
  dijete. Isto važi za dijelove 5 i 7.
- **Alimentacija (Dio 6)**: koeficijent 0,5 za bivšeg supružnika i za prvo
  dijete, 0,7 za drugo, 0,9 za treće.
- **Dio 8**: ukupan koeficijent = 1,0 + zbir svih koeficijenata iz dijelova
  3 do 7, plus **datum od kojeg se koeficijent primjenjuje**.

## 3. Mapa polja u PDF-u (provjerena, 150 AcroForm polja, 1 stranica A4)

Imena polja su uglavnom automatska ("undefined_N"), pa je mapa izvedena iz
koordinata. Kolone se ponavljaju po istom rasporedu, x pozicije u zagradi.

**Zaglavlje**: checkbox `Prvo izdavanje` / `Izmjena` / `Poništavanje`.

**Dio 1, podaci o obvezniku**: `1 Prezime`, `2 Ime`, `3 Ime jednog roditelja`,
`4 JMB`, `5 Adresa prebivališta`, `fill_1` (6, općina),
`comb_2`+`undefined`+`undefined_2` (7, **datum rođenja** dd/mm/gggg),
`8 Telefon`+`undefined_3`+`undefined_4` (3+2+6 znakova).

**Dio 2, poslodavac**: `undefined_5` (9, JIB/JMB), `10 Naziv poslodavca`,
checkbox `Zaposlen` / `Nezaposlen`.

**Dio 3, bračni drug** (1 red): JMB `a JMB`, ime `b Prezime i ime`, prihod
`Dio 4  Podaci o izdržavanoj djeci`(!) + `undefined_6`, udio `u`,
koeficijent `Koeficodbitka` + `undefined_7`.
Napomena: ime polja za prihod je pogrešno automatski nazvano, to je stvarno
kolona c) vlastiti prihod u Dijelu 3.

**Dio 4, djeca** (5 redova): JMB `a JMB_2.0`..`a JMB_2.4`, ime
`b Prezime i ime_2`..`_6`, prihod/udio/koeficijent redom
(`c Vlastiti prihod`,`undefined_8`,`u_2`,`Koeficodbitka_2`,`undefined_9`),
pa `undefined_11..15`, `undefined_17..21`, `undefined_23..27`, `undefined_29..33`.

**Dio 5, ostali izdržavani** (4 reda): JMB `a JMB_3`,`undefined_36`,`_42`,`_48`;
ime `b Prezime i ime_7`..`_10`; prihod `c Vlastiti prihod_2`+`undefined_34`, pa
`_37/_38`, `_43/_44`, `_49/_50`; srodstvo `d Srodstvo`..`_4`; udio `u_3`,`_39`,
`_45`,`_51`; koeficijent `Koeficodbitka_3`+`undefined_35`, `_40/_41`, `_46/_47`,
`_52/_53`.

**Dio 6, alimentacija** (4 reda): JMB `a JMB_4`,`undefined_56`,`_62`,`_68`; ime
`b Prezime i ime_11`..`_14`; iznos alimentacije `alimentacije`+`undefined_54`,
pa `_57/_58`, `_63/_64`, `_69/_70`; srodstvo `d Srodstvo_5`..`_8`; udio `u_4`,
`_59`,`_65`,`_71`; koeficijent `Koefic odbitka`+`undefined_55`, `_60/_61`,
`_66/_67`, `_72/_73`.

**Dio 7, invalidnost** (3 reda, bez kolone prihoda): JMB `a JMB_5`,
`undefined_75`,`_79`; ime `b Prezime i ime_15`..`_17`; srodstvo
`d Srodstvo_9`..`_11`; udio `u_5`,`_76`,`_80`; koeficijent
`Koefic odbitka_2`+`undefined_74`, `_77/_78`, `_81/_82`.

**Dio 8**: `Text1` (ukupan koeficijent), pa datum primjene
`odbitka poreznog obveznika zbir koeficijenata iz dijela 3 do 8`(!) +
`undefined_83` + `undefined_84` (dd/mm/gggg).

**Dio 9**: datum podnošenja `Datum podnošenja` + `undefined_85` + `undefined_86`.

Svi novčani iznosi i koeficijenti su podijeljeni u dva polja (cijeli dio +
decimale), jer je zarez pred-štampan na obrascu.

## 4. Podaci: šta imamo, šta se dodaje

Iz kartona radnika: ime, prezime, JMBG (iz njega i datum rođenja), adresa,
grad, telefon. Iz organizacije: JIB i naziv. **Nedostaje "ime jednog roditelja"
i svi izdržavani članovi.**

Novo, na radniku (jedna JSON kolona kroz `ensureColumns`, npr.
`poreznaKarticaPodaci`): ime roditelja, općina prebivališta ako se razlikuje od
grada, te liste za dijelove 3 do 7 (bračni drug, djeca, ostali, alimentacije,
invalidnosti) sa poljima JMB, ime, prihod/iznos, srodstvo, udio %.

Razlog čuvanja: obrazac se ponavlja kod svake izmjene (novo dijete, supružnik
se zaposlio), a knjigovođa ne treba ponovo kucati.

## 5. Integracija sa obračunom

Ukupan koeficijent iz Dijela 8 je tačno ono što se danas ručno upisuje u polje
"Porezni koeficijent" na radniku i što obračun koristi za lični odbitak. Poslije
popunjavanja nudi se dugme **"Upiši koeficijent X,XX na radnika"**, pa se karton
i obrazac ne mogu razići. Ako se razlikuju, prikazati upozorenje.

Napomena u UI-ju: koeficijent se primjenjuje tek od datuma izdavanja kartice,
ne unazad.

## 6. SEO (zahtjev vlasnika)

Stranica mora biti indeksabilna kao i ostale marketing stranice:

- `metadata` u `app/porezna-kartica/page.tsx`: naslov i opis sa ključnim
  terminima ("porezna kartica", "PK-1001", "lični odbitak", "FBiH"), canonical,
  robots index/follow, OpenGraph.
- Ispod forme edu sekcija (kao `PrijaveRadnikaEdu`): šta je porezna kartica,
  ko je podnosi i kome, koji dokumenti se prilažu, tabela koeficijenata, prag
  od 300 KM, šta radi poslodavac sa PK-1002, šta ako radnik nema karticu.
- **FAQ blok** sa pitanjima koja ljudi guglaju (ko podnosi zahtjev, koliko
  košta, koliko traje izdavanje, šta ako se rodi dijete, vrijedi li unazad,
  šta ako radnik nema karticu) + `FAQPage` JSON-LD.
- Interni linkovi na obračun plata, JS3100 i ugovor o radu, i obrnuto.
- Dodati stranicu u `sitemap.ts`.

## 7. Redoslijed rada

1. Šablon `PK-1001.pdf` u `frontend/public/templates/`.
2. `fillPk1001.ts` sa mapom iz tačke 3 (pdf-lib + arial, `updateFieldAppearances`
   pa `flatten`, kvačice se crtaju nakon flatten-a kao u `fillJs3100`).
3. Kolona na radniku + čuvanje/čitanje kroz postojeći worker API.
4. Sekcija `PoreznaKartica.tsx`: izbor radnika, Dio 1 i 2 predpopunjeni,
   uređivanje izdržavanih članova, automatski izračun koeficijenata po
   pravilima iz tačke 2, prikaz ukupnog koeficijenta, dugme za upis na radnika.
5. Stranica + tab + SEO sadržaj + FAQ + sitemap.
6. Provjere (tsc, eslint, em dash, build), pa dopuna
   `docs/pk-office-funkcionalnosti.md` ako se pojavi i u PK Office prikazu.

## 8. Kako je izvedeno (15.08.2026)

- `frontend/public/templates/PK-1001.pdf`: šablon skinut sa PUFBiH.
- `frontend/src/sections/porezna-kartica/pk1001Podaci.ts`: model podataka,
  koeficijenti i pravila (prag 300 KM, redoslijed djece, udio u izdržavanju),
  bez importa da ga backend testovi učitavaju direktno.
- `fillPk1001.ts`: mapa svih polja iz tačke 3 + popunjavanje (pdf-lib, arial
  zbog kvačica, `updateFieldAppearances` pa `flatten`).
- `PoreznaKartica.tsx`: forma sa sidebarom radnika, uređivanje pet grupa
  izdržavanih članova, živi izračun koeficijenata, upozorenja, snimanje na
  radnika i upis koeficijenta u karton.
- `PoreznaKarticaEdu.tsx` + `app/porezna-kartica/page.tsx`: SEO sadržaj, FAQ,
  `SoftwareApplication` i `FAQPage` JSON-LD, canonical i OpenGraph.
- Backend: kolona `workers.poreznaKarticaPodaci` (JSON) kroz `ensureColumns`,
  model, `toPublicWorker` i prihvat u `update` (validacija da je objekat).
- `RadniciTabBar`: sedma kartica; stilovi preseljeni u
  `RadniciTabBar.module.css`, širina 1380px kao sadržaj ispod i sakrivena
  scroll traka (sa sedam kartica se pojavljivala na desktopu).

Odstupanja od plana: nema. Ostaje na korisniku probni ispis na stvarnom
obrascu, da se potvrdi da vrijednosti padaju u prave kućice.

## 9. Izmjena kartice i pamćenje podataka

- **Zahtjev je uvijek POTPUNA slika, ne dopuna.** Kod izmjene se upisuju svi
  izdržavani članovi koji vrijede u tom trenutku, a ko se skida sa kartice se
  jednostavno ne navodi. Zato radi i kad prvobitna kartica nije rađena kod nas:
  ne treba nam nikakva istorija, samo trenutno stanje.
- Radi toga forma ispod izbora vrste zahtjeva objašnjava razliku: Izmjena za
  promjenu sastava izdržavanih članova, Poništavanje samo kad kartica prestaje
  da važi u cijelosti.
- **Podaci se snime i automatski pri preuzimanju PDF-a** (ne samo dugmetom
  Sačuvaj), jer bi ih inače izgubio ko zaboravi kliknuti, a čuvaju se upravo
  zato da se kod sljedeće izmjene ne kucaju ponovo. Greška snimanja se javi u
  poruci, ali ne poništava već preuzeti obrazac.
- Poslije izmjene treba upisati novi koeficijent na radnika (dugme u Dijelu 8),
  ali tek od datuma izdavanja nove kartice, jer odbitak ne vrijedi unazad.

## 11. Ispravke iz reviewa (15.08.2026)

Adversarni review (7 uglova, svaki nalaz provjeravala tri skeptika) našao je
tri greške koje mijenjaju BROJEVE na obrascu, pa su prve popravljene:

- **Dio 6, bivši supružnik je trošio mjesto prvog djeteta.** Koeficijent se
  vezao za redni broj REDA, pa je prvo dijete iza supružnika dobijalo 0,7
  umjesto 0,5, a drugo 0,9 umjesto 0,7 (0,40 koeficijenta = 120 KM previše
  mjesečnog odbitka). Sada red ima vrstu (bivši supružnik ili dijete, bira se
  u formi), supružnik nosi fiksnih 0,5 i ne ulazi u brojanje djece.
- **Dijete preko praga od 300 KM je trošilo redno mjesto.** Takvo dijete se po
  uputstvu uopšte ne unosi, pa sada ne dobija ni redni broj: sljedeće dijete
  ostaje "prvo" (0,5). Uz to se član preko praga više NE štampa na obrazac
  (ranije je izlazio sa koeficijentom 0,00, što izgleda kao greška u
  popunjavanju); u formi ostaje vidljiv sa upozorenjem.
- **Član o plati u ugovoru o radu** je i kod nepunog radnog vremena tvrdio "za
  puni fond radnih sati", u suprotnosti sa Članom 5 istog ugovora. Sada se
  formulacija mijenja prema ugovorenim satima.

Ostale ispravke:

- Koeficijenti se računaju i zbrajaju na DVIJE decimale (toliko se i štampa),
  pa zbir odštampanih redova sada tačno daje broj iz Dijela 8.
- `parsirajIznos` više ne briše sve tačke: "250.50" je 250,50 KM, a ne 25050
  (član je zbog toga padao preko praga).
- Greške pri popunjavanju PDF-a se više ne gutaju u konzolu: vrijednost duža od
  broja kućica se skrati, a korisnik dobije popis polja koja treba provjeriti.
  Polja slobodnog teksta (imena, adrese) dobijaju automatsku veličinu fonta, pa
  se dug naziv smanji umjesto da bude odsječen.
- Nesačuvane izmjene se snime pri prelasku na drugog radnika (ranije su tiho
  nestajale), a vrsta zahtjeva se resetuje sa radnikom.
- Backend: podaci obrasca imaju ograničenje veličine i oblika, a **JMBG-ovi
  izdržavanih članova se kriptuju** kao i JMBG radnika (ranije su stajali u
  čistom tekstu u JSON koloni).
- Štampa naloga: pomak nadolje ograničen na 2 (sa 3 bi ispis zauzeo svih 24
  reda forme pa bi FF preskočio jedan prazan nalog), negativan pomak kolona se
  sada može otkucati (polje je bilo type=number pa je minus nestajao), a
  pregled primjenjuje iste granice kao štampa.
- SEO: naslov i forma su izašli iz Suspense granice pa ih sada ima u statičkom
  HTML-u (ranije nijedan h1), FAQ odgovori su u DOM-u (skriveni atributom
  `hidden`) jer stranica prijavljuje FAQPage strukturirane podatke, dodan je
  datum provjere u contentMeta i interni link sa /prijave-radnika.

## 10. Zamka sa comb poljima (probni ispis 15.08.2026)

Prvi probni ispis je pokazao popunjena imena i srodstva, ali PRAZAN JMB, iznose,
udjele i koeficijente u dijelovima 3 do 7. Uzrok: **comb polja** (ona sa kućicom
po znaku) u ovom šablonu nemaju `/DA` zapis, pa `setFontSize` na njima baca
`MissingDAEntryError`. Taj poziv je bio prvi u zajedničkom `try` bloku, pa je
`setText` koji ide poslije nikad nije ni izvršen, a `catch` je ispisivao
zavaravajuću poruku "polje nije pronađeno". Pogođeno je bilo **96 od 145**
tekstualnih polja, a obrazac je izgledao ispravno jer su se ne-comb polja
(imena, srodstvo) uredno punila.

Ispravke:

- `setFontSize` ide u zaseban `try` i smije pasti (tim poljima veličinu ionako
  računa pdf-lib po širini kućice); `setText` i `updateAppearances` su odvojeni
  i njihova greška se prijavljuje sa stvarnom porukom.
- Mapa imena polja izdvojena u `pk1001Polja.ts` (bez importa), a
  `backend/test/pk1001Polja.test.js` puni SVA polja iz mape nad stvarnim
  šablonom i traži da svako vrati svoju vrijednost. Test bi ovu grešku uhvatio.
- Svi naši unosi se ispisuju **podebljano** (arialbd), da se odvoje od
  pred-štampanog teksta obrasca.

Drugi probni ispis je otkrio još dvije sitnice, obje ispravljene:

- **Veličina fonta u dijelovima 3 i 4.** Polja tih dijelova su viša (9,6 i 9,2)
  od onih u dijelovima 5 do 7 (7,3), a pdf-lib za polje bez `/DA` bira veličinu
  po VISINI polja, pa su dijelovi 3 i 4 dobijali font 13 i cifre su punile
  kućicu do ivice, dok su 5 do 7 dobijali 10 i izgledali uredno. Rješenje:
  poljima bez `/DA` se `/DA` prvo napravi, pa im se zada ista veličina (10 za
  brojeve u redovima), tako da svi dijelovi izgledaju isto.
- **Poravnanje iznosa uz zarez.** Zarez je pred-štampan, a comb polje puni
  kućice slijeva, pa je "100" u polju od četiri kućice izgledalo kao 1000.
  Cijeli dio iznosa i udio u procentima se sada dopunjavaju razmacima do pune
  dužine polja (`desnoPoravnaj` u pk1001Podaci.ts, pokriveno testom), a
  decimale ostaju uz zarez slijeva.
