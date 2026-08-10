# Faza 0: Izvoz platnih naloga u e-bankarstvo (Halcom, UniCredit, Raiffeisen)

## Cilj

Iz obračuna plata u Poreznom Kalkulatoru generisati tekstualnu datoteku koju knjigovođa direktno uvozi u e-bankarstvo, umjesto ručnog prekucavanja naloga.

Ključno otkriće: **Halcom i UniCredit koriste isti format**. Slog od 336 znakova, iste pozicije svih polja. UniCredit je preuzeo Halcomov TKDIS (u njihovoj XML varijanti se polja doslovno zovu `halcomSifra1/2/3`). Razlikuju se samo encoding i par pravila popune. Zato se gradi **jedan formatter sa profilima banaka**.

| Banka | Format | Encoding | Status |
|---|---|---|---|
| Halcom (više banaka) | TKDIS 336 | YUSCII 7-bit | spec + 2 fixture datoteke + screenshot maske |
| UniCredit e-ba Plus | TKDIS 336 | Windows-1250 | zvanična spec tablica (B2B dokument) + 2 fixture datoteke |
| Raiffeisen RBBHnet | vlastiti 345 | CP852 (tolerantno) | spec nije javna, traži se od banke; 2 fixture datoteke |

Redoslijed: prvo Halcom do kraja (uključujući test uvoz), pa UniCredit profil (pola dana), Raiffeisen tek kad banka dostavi specifikaciju.

## Izvori verifikacije

| Izvor | Šta potvrđuje |
|---|---|
| `izvoz_naloga.txt` (Halcom izvoz) | 3 naloga: doprinos PIO, porez na dohodak, neto plata; 1691 bajt |
| `MAX_COP.txt` (Halcom izvoz) | 1 nalog: naknada fondu; skraćivanje mjesta; 1015 bajta |
| Screenshot Halcom maske | mapiranje svakog polja maske na poziciju u datoteci |
| UniCredit "e-ba Plus B2B" PDF | zvanična tablica validacije svih polja, TXT i XML |
| Zvanična Halcom TKDIS spec za BiH | https://support.halcom.com/app/uploads/2021/11/Formati_PPD_BA.pdf |
| `sviradnici_unicredit_*.txt`, `vlasnik_unicredit_*.txt` | postojeći izvoz iz starog programa u UniCredit format (drugi, stariji 300-znakovni format, NE koristi se kao uzor, ali potvrđuje domenske podatke) |
| `plataradnicifbih_161_*.txt`, `platavlasnik_161_*.txt` | postojeći izvoz u Raiffeisen 345 format |

Halcom fixtures idu u repo i nikad se ne mijenjaju. (Svjesna odluka: fixtures sadrže stvarne podatke klijenata, repo je privatan; anonimizacija bi obesmislila golden test.)

Screenshot naloga BUDŽET USK od 411,24 KM odgovara redu 4 datoteke `izvoz_naloga.txt`. Provjereno svako polje:

| Maska u Halcomu | U datoteci | Poz. |
|---|---|---|
| Račun primaoca 338000-2210005877 | `3380002210005877` | 1 |
| Primalac BUDŽET USK | `BUD@ET USK` | 19 |
| Mjesto BIHAĆ | `BIHA]` | 54 |
| Svrha POREZ NA DOHODAK | isto | 89 |
| Iznos 411,24 | `0000000041124` | 240 |
| Datum valute 26.06.2026 | `260626` | 277 |
| Broj poreznog obveznika 4263909740008 | isto | 284 |
| Vrsta uplate 0 | `0` | 297 |
| Vrsta prihoda 716111 | isto | 298 |
| Porezni period 01.06 do 30.06.2026 | `010626` `300626` | 304 |
| Općina 019 | `019` | 316 |
| Budžetska organizacija 0000000 | isto | 319 |
| Poziv na broj 0000000006 | isto | 326 |

Napomena: adresa platioca postoji u maski ali se **ne izvozi** u TKDIS. Halcom je pri uvozu popunjava iz vlastitih postavki "Moji računi".

## Struktura datoteke (TKDIS 336, Halcom i UniCredit)

Fixed-width, pozicijski. Svaki red tačno 336 znakova, dopunjen razmacima, iza njega CRLF (`0x0D 0x0A`).

Kraj datoteke: Halcom dodaje bajt `0x1A` iza zadnjeg CRLF-a. UniCreditova specifikacija ga ne spominje. Profil banke određuje da li se piše.

Halcom invarijanta: veličina = brojRedova x 338 + 1.

Redoslijed redova (UniCredit ga eksplicitno validira i javlja grešku kod pogrešnog rasporeda):

1. Adresna stavka (tip `0`), tačno jedna
2. Zbirna stavka (tip `9`), tačno jedna
3. Individualne stavke (tip `1`), po jedna za svaki nalog

Račun platioca postoji **samo** u adresnoj i zbirnoj stavci. Posljedica: jedna datoteka = jedna firma. UniCredit dodatno validira: zbroj u zbirnoj mora biti jednak sumi stavki, broj naloga mora odgovarati.

## Encoding po profilu banke

Transliteracija je zamjenjiva strategija:

```ts
interface Transliterator {
  encode(text: string): string;
}
```

**Halcom: YUSCII (JUS I.B1.002).** Halcom interno čuva pravu dijakritiku (maska prikazuje BUDŽET, BIHAĆ, NUHOVIĆ), YUSCII postoji samo u TKDIS sloju. Sve uppercase, pa mapiranje:

| Slovo | Znak | Bajt |
|---|---|---|
| Č | `^` | 0x5E |
| Ć | `]` | 0x5D |
| Ž | `@` | 0x40 |
| Š | `[` | 0x5B |
| Đ | `\` | 0x5C |

Potvrđeno u fixtures: `BUD@ET FBIH`, `BIHA]`, `ELVEDIN NUHOVI]`, `ZAPO[LJAVANJE`.

**UniCredit: Windows-1250.** Zvanično u specifikaciji. Dijakritika ostaje prava dijakritika, samo se enkodira u cp1250 bajtove (Ž = 0x8E itd). Uppercase zadržati radi konzistentnosti.

Redoslijed operacija za svako tekstualno polje:

1. `toUpperCase()`
2. Transliteracija/encoding po profilu
3. Skraćivanje na dužinu polja
4. Dopuna razmacima zdesna

Validacija nakon koraka 2: za YUSCII svi bajtovi moraju biti 0x20 do 0x7E; za cp1250 znak mora postojati u kodnoj stranici. Ako ne, formatter **baca grešku**. Tiho ispuštanje znaka u platnom nalogu je neprihvatljivo. Greška mora nositi kontekst: polje, vrijednost i redni broj naloga.

## Adresna stavka (tip 0)

| Poz. | Duž. | Sadržaj | UniCredit validacija |
|---|---|---|---|
| 1 | 18 | Račun platioca: 3 + 13 + 2 razmaka | obavezno, 16 + 2 |
| 19 | 35 | Naziv platioca | obavezno |
| 54 | 10 | Mjesto platioca | obavezno |
| 64 | 6 | Datum valute DDMMGG | mora biti >= današnji |
| 70 | 254 | Razmaci | provjerava se dužina i praznina |
| 324 | 12 | Konstanta `MULTI E-BANK` | provjerava se doslovno |
| 336 | 1 | Konstanta `0` | |

Halcom napomena: datum na 64 se upisuje samo ako je isti na svim nalozima. Kod plata uvijek jeste.

## Zbirna stavka (tip 9)

| Poz. | Duž. | Sadržaj | UniCredit validacija |
|---|---|---|---|
| 1 | 18 | Račun platioca | obavezno |
| 19 | 35 | Naziv platioca | obavezno |
| 54 | 10 | Mjesto platioca | obavezno |
| 64 | 15 | Zbroj iznosa u feninzima, nule slijeva | = suma stavki, bez decimalne tačke |
| 79 | 5 | Broj naloga, nule slijeva | = broj stavki |
| 84 | 252 | Razmaci | |
| 336 | 1 | Konstanta `9` | |

## Individualna stavka (tip 1)

| Poz. | Duž. | Sadržaj | UniCredit validacija |
|---|---|---|---|
| 1 | 18 | Račun primaoca: 3 + 13 + 2 razmaka | obavezno |
| 19 | 35 | Naziv primaoca | obavezno |
| 54 | 10 | Mjesto primaoca | obavezno |
| 64 | 1 | Konstanta `0` | |
| 65 | 2 | Model poziva zaduženja | 2 cifre ili prazno |
| 67 | 22 | Poziv zaduženja | prazno ili brojevi |
| 89 | 140 | Svrha plaćanja | obavezno |
| 229 | 5 | Konstanta `00000` | doslovno |
| 234 | 2 | Šifra 1 | broj ili prazno |
| 236 | 2 | Šifra 2 | broj ili prazno |
| 238 | 2 | Šifra 3 | broj ili prazno |
| 240 | 13 | Iznos u feninzima, nule slijeva | broj bez decimalne tačke |
| 253 | 2 | Model poziva odobrenja, `00` | 2 cifre ili prazno |
| 255 | 22 | Poziv odobrenja | **datum >= današnji, DD-MM-GGGG, ostatak razmaci** |
| 277 | 6 | Datum valute DDMMGG | >= današnji (u spec tablici piše dužina 3, to je štamparska greška, mora 6 jer tip dokumenta počinje na 283) |
| 283 | 1 | Tip dokumenta: `0` prenos, `1` JP | |
| 284 | 13 | JIB \* | 13 cifara / prazno |
| 297 | 1 | Vrsta uplate \* | 0, 1 ili 2 / prazno |
| 298 | 6 | Vrsta prihoda \* | broj / prazno |
| 304 | 6 | Porezni period od DDMMGG \* | datum / prazno |
| 310 | 6 | Porezni period do DDMMGG \* | datum / prazno |
| 316 | 3 | Šifra općine \* | 3 cifre / prazno |
| 319 | 7 | Budžetska organizacija \* | 7 cifara / prazno |
| 326 | 10 | Poziv na broj \* | 10 cifara / prazno |
| 336 | 1 | Konstanta `1` | |

Polja \* samo kad je tip dokumenta `1`; kod tipa `0` ostaju razmaci.

### Šifra plaćanja su TRI polja, ne jedno

UniCreditova spec razbija pozicije 234 do 239 na šifru 1, 2 i 3, po 2 znaka. Time se objašnjava ono što je u Halcom fixtures izgledalo kao jedna vrijednost:

| Vrsta naloga | Š1 | Š2 | Š3 | Sirovo na 234 |
|---|---|---|---|---|
| Neto plata (prenos) | `01` | `10` | prazno | `0110  ` |
| Javni prihod | `01` | `10` | `11` | `011011` |

Modelirati kao tri polja sa ovim defaultima.

### Poziv odobrenja: upisati datum valute

Ranija odluka (ostaviti prazno) se **mijenja**. UniCredit zahtijeva datum >= današnji u obliku `DD-MM-GGGG`. Halcomu prolazi bilo šta (u fixtures su datumi iz 2019). Zato **oba profila upisuju datum valute kao `DD-MM-GGGG`**, ostatak od 22 znaka razmaci, model poziva odobrenja `00`. Jedno pravilo, obje banke zadovoljne.

## Pravila transformacije

**Račun.** Isti broj u tri zapisa:

| Gdje | Oblik | Primjer |
|---|---|---|
| PK baza | 3-3-8-2 | `186-222-03109539-77` |
| Halcom maska | 6-10 | `186222-0310953977` |
| TKDIS | 3 + 13 + 2 razmaka | `1862220310953977  ` |

Pravilo: ukloni sve što nije cifra, provjeri tačno 16, `[0..3]` pa `[3..16]` pa dva razmaka.

**Iznos.** Isključivo cijeli feninzi kroz cijeli pipeline, nikad float. Zbroj u zbirnoj = zbroj feninga stavki.

**Datumi.** DDMMGG u poljima, DD-MM-GGGG u pozivu odobrenja. Porezni period od = prvi dan mjeseca obračuna, do = zadnji dan izračunat kalendarski.

**Datum valute.** Bira korisnik pri izvozu (datum isplate, ne obračuna). UniCredit validira >= današnji dan, pa UI treba upozoriti ako korisnik izabere prošli datum (upozorenje, ne blokada).

**Poziv na broj (samo JP).** Broj mjeseca obračuna, nule do 10 znakova. Potvrđeno: 06/26 daje `0000000006`, 05/26 daje `0000000005`.

**Skraćivanje.** Mjesto tvrdo na 10 (potvrđeno: `BOSANSKA K`). Naziv tvrdo na 35, uz izuzetak stalnih primaoca (vidi imenik).

## Ugovor podataka

Formatter ne zna šta je plata. Prima:

```ts
type BankProfile = "halcom" | "unicredit";

type TkdisFile = {
  platilac: { racun: string; naziv: string; mjesto: string };
  datumValute: Date;
  nalozi: TkdisNalog[];
};

type TkdisNalog =
  | {
      tip: "prenos";
      racun: string;
      naziv: string;
      mjesto: string;
      svrha: string;
      sifra1: string; // default "01"
      sifra2: string; // default "10"
      sifra3: string; // default "" za prenos
      iznosFeninga: number;
    }
  | {
      tip: "javniPrihod";
      racun: string;
      naziv: string;
      mjesto: string;
      svrha: string;
      iznosFeninga: number; // sifre fiksno 01/10/11
      jib: string;
      vrstaPrihoda: string;
      periodOd: Date;
      periodDo: Date;
      opcina: string;
      budzetskaOrganizacija: string;
      pozivNaBroj: string;
    };
```

Profil banke određuje: encoder (YUSCII / cp1250), pisanje `0x1A` na kraju (da / ne). Sve ostalo je zajedničko.

Izlaz je `Buffer`, ne string. Piše se binarno.

## Otvoreno pitanje: kako Halcom određuje nalogodavca

Individualne stavke ne nose račun platioca. Pri uvozu su moguća tri ponašanja:

- **A.** Zaglavlje određuje nalogodavca, Halcom sam nađe račun iz "Moji računi"
- **B.** Nalogodavac je izabran u aplikaciji, zaglavlje se ignoriše
- **C.** Neslaganje daje grešku

Test T3 odgovara u jednom pokušaju. **Za arhitekturu nije bitno**: u sva tri slučaja je jedna datoteka po firmi. Razlikuje se samo uputstvo korisniku.

**RIJEŠENO (10.8.2026., test na stvarnoj banci):** ponašanje je kombinacija A i C. Halcom čita račun platioca iz zaglavlja datoteke i podatke nalogodavca popuni iz svojih postavki; ako se račun iz datoteke ne slaže sa izabranim računom u aplikaciji, daje jasno upozorenje sa izborom Da/Ne ("Račun terećenja u nalozima se ne slaže s trenutno izbranim računom..."). Naše zaglavlje radi ispravno, izmjene nisu potrebne.

## Faze

### Faza 1. Test harness u admin panelu

Ruta zaštićena **na serveru** (provjera role u API ruti, ne sakriveno dugme).

Ekran: izbor firme i obračuna, izbor datuma valute, izbor profila banke, izbor transliteracije (za brzo testiranje), pregled datoteke u monospace fontu **sa lenjirom pozicija iznad**, download.

### Faza 2. Golden test i formatter

Golden test se piše **prije** implementacije. Rekonstruiše ulazne objekte za oba Halcom fixture fajla i poredi izlaz bajt po bajt. Prvo pada, pa se piše formatter dok ne prođe.

Za UniCredit profil nema fixture iz stvarne banke (stare datoteke iz prethodnog programa su drugi format). Test za UniCredit: isti ulaz kao Halcom fixture, provjera da se izlaz razlikuje SAMO u encodingu dijakritike, pozivu odobrenja i završnom bajtu.

### Faza 3. Adapter iz obračuna plata

Mapira postojeće uplatnice u `TkdisNalog[]`. Neto plate = `prenos`, doprinosi i porezi = `javniPrihod`. Vrste prihoda, općine i budžetske organizacije se već izvode u generatoru uplatnica; ovo je preslikavanje, uz human review mapiranja prije puštanja.

### Faza 4. Test uvoz u Halcom

Ljestvica od najjeftinijeg:

**T1. Identitet bez uvoza.** Za obračun juni 2026 (OPTIKA VIZUS) generiši datoteku i uporedi sa `izvoz_naloga.txt`. Očekivane razlike samo: poziv odobrenja (mi pišemo datum valute umjesto naslijeđenih datuma) i model `00`. Sve ostalo bajt identično.

**T2. Uvoz sa ispravnim nalogodavcem.** Kvačice, iznosi, porezna polja, prihvatanje našeg poziva odobrenja.

**T3. Uvoz sa pogrešnim nalogodavcem.** Razrješava A/B/C.

**T4. Rubni slučajevi.** Đ u imenu radnika, naziv duži od 35, mjesto Bosanska Krupa, iznos preko 10.000 KM.

**Sigurnost.** Uvezeni nalozi moraju sletjeti među pripremljene i čekati potpis. Provjeriti na prvom uvozu, testne naloge obrisati.

- STATUS (10.8.2026.): **Halcom uvoz potvrđen na stvarnoj banci.** Svih 17 naloga (uključujući neto plate radnika) uvezeno u status PRIPREMLJEN, sva polja ispravna (vrsta prihoda, općina, budžetska organizacija, poziv na broj, porezni period, datum valute). T2 i T3 prošli, T3 vidi "Otvoreno pitanje" iznad. **Raiffeisen uvoz u RBBHnet takođe potvrđen** (javni prihodi).

### Faza 5. UniCredit profil

Pola dana: cp1250 encoder, bez `0x1A`, isti formatter. Test uvoz kod klijenta koji ima e-ba Plus, ista ljestvica T2 do T4.

### Faza 6. Puštanje korisnicima

Dugme na obračunu sa izborom banke, download. Interface `PaymentFileExporter` za buduće formate. Predvidjeti "Izvezi sve firme" (ZIP), jer biro obračunava desetine firmi.

- STATUS (10.8.2026.): implementirano. Dugme "Izvoz za e-bankarstvo" na /prijave-radnika (tab Obračun) u redu akcija mjeseca, modal sa izborom banke (Halcom, Raiffeisen, UniCredit, BBI, ASA, Sparkasse; posljednje tri dijele ELBA profil), datumom valute (default datum isplate mjeseca), preuzimanjem, prikazom preskočenih naloga i uputstvom sa kontakt porukama (uvoz ne radi / banke nema na listi → info@poreznikalkulator.ba). Endpoint POST /api/payroll/bank-export: requireAuth + isti plan gate kao uplatnice (PRO+) + assertOrgAccess; transliteracija automatska po banci (halcom→yuscii, unicredit/elba→cp1250, raiffeisen→cp852), objedinjavanje kantonalnih prati postavku korisnika (kao PDF uplatnice). Zajednička logika `generisiDatoteku` u paymentExportController; admin harness na /admin/izvoz-naloga ostaje za kalibraciju. PK Office korisnici dolaze kroz postojeći link sa /app/obracuni-plata. Izbor banke se pamti po organizaciji (Organization.bankExportBank, ensureColumns) i predpopunjava se pri sljedećem izvozu. "Izvezi sve firme" (ZIP) ostaje za kasnije po potrebi.

## Kasnije, van scope-a

**ELBA formatter (BBI + ASA + Sparkasse).** Vidi "Dopune nakon reviewa" ispod: javno dokumentovan TXT verzija 2 format, isti adapter, drugi (jednostavniji) formatter. Ide odmah poslije UniCredit profila, prije Raiffeisena.

**UniCredit REST API.** e-ba Plus B2B ima GET za stanje računa i POST za slanje XML naloga uz API ključ koji korisnik sam generiše; nalozi stižu u status ZAPRIMLJEN i potpisuju se u aplikaciji. Kandidat za PK Office: slanje naloga bez datoteke i čitanje stanja. XML polja su ista kao TXT (halcomSifra1/2/3 itd), pa adapter ostaje isti.

**Raiffeisen RBBHnet.** Format 345 znakova sa SM/UJ prefiksima, spec nije javna. RBBHnet učitava txt za domaća plaćanja (ne ino, ne zbirne uplate). Akcija: tražiti specifikaciju od poslovnog bankara. Kodna stranica im je tolerantna (preporuka Win 1250, stari program koristi CP852).
   - STATUS: implementirano (services/paymentExport/raiffeisenFormatter.js + profil "raiffeisen" u harnessu). Format rekonstruisan i verifikovan bajt po bajt na ORIGINALNIM izvoznim datotekama starog programa (fixtures raiffeisen_platavlasnik_161.txt i raiffeisen_plataradnici_161.txt, obračun 06/2026 MELY OBRT). Na originalima potvrđeno: SM zaglavlje 211 znakova (opis polje 35), UJ slogovi 345, CRLF, BEZ EOF markera, CP852 (Ž = 0xA6). Golden testovi porede kompletne datoteke bez izuzetaka. Probni uvoz u RBBHnet POTVRĐEN 10.8.2026. (javni prihodi). Format naloga za NETO isplate je i dalje nepoznat (stari program izvozi samo javne prihode, pa i mi: prenosi se preskaču uz razlog); korisnik će ručno unijeti jedan nalog neto plate u RBBHnet i izvesti ga u txt kao primjer, pa se prenos slog dodaje istim postupkom (dekodiranje bajt po bajt + golden test). SM zaglavlje nosi i PTT broj uz mjesto ("77245 BUZIM"); mi pišemo samo grad dok ne dodamo poštanske brojeve.

**Neto plate u UniCredit/Raiffeisen uzorcima.** Stari program izvozi samo javne prihode, nijedan uzorak nema nalog neto plate. Za Halcom imamo primjer neto plate u fixture. Za ostale banke provjeriti na test uvozu.

## Otvorene stavke i review gate

**Naziv stalnih primaoca.** Puni nazivi fondova ne staju u 35 znakova. Registar stalnih primaoca dobija polje `nazivZaNalog` (max 35, encoding-safe) **i polje `mjestoZaNalog` (max 10)**, jer TKDIS traži i mjesto primaoca koje generator uplatnica danas nema. **Prečica:** Halcom ima izvoz imenika poslovnih partnera (CSV, polje 1 naziv do 35, polje 6 račun). Izvesti imenik iz Halcoma kao seed, kratice su već godinama dotjerane. Odobrava čovjek.

**Model poziva odobrenja `00`.** U Halcom fixtures stoji `00` uz datum. Zadržati `00` u oba profila.

## Dopune nakon reviewa (7.8.2026.)

1. **Mjesto primaoca.** Naš generator uplatnica nema mjesto primaoca, a TKDIS ga traži (poz. 54, fixture: BIHAĆ). Rješenje: registar stalnih primaoca nosi i `mjestoZaNalog`; seed iz Halcom imenika.
2. **Naziv primaoca je kod nas višelinijski.** `primalac` niz u uplatnicama (npr. "Budžet Federacije BiH" + "Doprinos za PIO/MIO") ima opis u drugoj liniji. Adapter uzima SAMO prvu liniju, ili naziv iz registra stalnih primaoca. Nikad join svih linija.
3. **Adapter se hrani iz Payroll snapshota u bazi (backend).** Marketing obračun i PK Office dijele iste Payroll zapise; adapter na backendu pokriva oba UI-ja. Frontend generatori uplatnica se NE diraju i NE dupliraju.
4. **Budžetska organizacija.** Kad je prazna kod nas, u JP nalog se piše `0000000` (potvrđeno u fixture), ne razmaci.
5. **Radnik bez tekućeg računa.** Nalog neto plate se preskače uz jasnu listu preskočenih (ko i zašto). Ne ruši se cijela datoteka, ne ispušta se tiho.
6. **Greške sa kontekstom.** Svaka greška encodera/validacije nosi polje, vrijednost i nalog na koji se odnosi.
7. **ELBA platforma (BBI, ASA, Sparkasse): drugi formatter, isti adapter.** BBI (eBBI) i ASA (ELBA v5) koriste istu ELBA platformu; format uvoza je javno dokumentovan (BBI uputstvo Appendix C; ASA ELBA v5 uputstvo 7.1.2.1). "TXT verzija 2": kodna strana Windows-1250, slogovi odvojeni CR, polja TAB-om, prva linija kontrolna (broj naloga TAB suma iznosa). Polja: RBR_NALOGA, NAZIV_POSILJAOCA, RACUN_PRIMAOCA, NAZIV_PRIMAOCA, IZNOS (decimalna tačka), OPIS_PLACANJA, HITNOST (T/F), pa JP polja: JP_TAX_NO, JP_VRSTA_UPLATE, JP_VRSTA_PRIHODA, JP_PERIOD_OD, JP_PERIOD_DO (yyyy-mm-dd), JP_OPCINA, JP_BUDZ_ORG, JP_POZIV_NA_BROJ. Sve iz istog `TkdisNalog` ugovora, bez mjesta primaoca i bez šifri plaćanja. Fixture trik: ELBA ima i EXPORT naloga u istom formatu, izvesti par naloga iz banke kao golden test. Redoslijed: Halcom, UniCredit, ELBA v2, Raiffeisen.
   - Izvori: BBI uputstvo (https://e.bbi.ba/help/Uputstvo.pdf), ASA ELBA v5 (https://www.asabanka.ba/wp-content/uploads/2025/01/ELBA-KOR-01-ELBA-dokumentacija.pdf). ASA nudi i Halcom kao posebnu uslugu.
   - STATUS: implementirano (services/paymentExport/elbaFormatter.js + profil "elba" u harnessu). Bez fixture-a iz banke: strukturni testovi po zvaničnoj spec, prije produkcije izvesti par naloga iz eBBI/ELBA (isti format) kao fixture i uraditi probni uvoz.
8. **Read-only garancija.** Izvoz ništa ne mijenja u obračunima, dokumentima ni preračunima: adapter samo čita Payroll snapshotove, formatter je samostalan modul. Jedina nova tabela (kasnije) je registar stalnih primaoca.
