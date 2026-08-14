# Faza 2: štampa naloga na obračunu plata (za korisnike)

> STATUS: PLAN ODOBREN, ČEKA IZVOĐENJE. Vlasnik je plan prihvatio 13.08.2026. uz
> dopune za uputstvo (vidi DIO C). Kreće se tek na njegov izričit znak.
>
> Preduslov koji još nije potvrđen: probna štampa kalibracije od 13.08. (porezni
> period i budžetska organizacija u svoje kućice, vrsta uplate "0"). Ako ta
> proba traži još pomaka, prvo se to zaključa pa onda ovo.

Cilj: štampu naloga na matričnom pisaču, koja sada postoji samo kao admin alat
(/admin/nalozi, Faza 1), dati korisnicima na obračunu plata. Format .prn i
mreža polja se NE mijenjaju, samo se seli i pakuje u korisnički tok.

## DIO A: gdje i kako izgleda

### Dugme

Novo dugme **"Štampa naloga"** u kartici "Dokumenti za {mjesec} {godina}.",
red **BANKA**, odmah iza "Izvoz za e-bankarstvo", isti plavi stil (btnTintBlue)
kao susjedi, ikona pisača. Red tako nosi tri načina da isti nalozi odu u banku
(A4 uplatnice, datoteka za e-bankarstvo, matrični obrazac), pa rekapitulaciju i
specifikacije.

Kapija: ista Pro provjera kao uplatnice i izvoz (`canGenerate`), isti tooltip
"Dostupno uz Pro pretplatu" kad plan ne dozvoljava.

Odbačena alternativa (za slučaj da red postane pretrpan): stavka u padajućem
meniju uz "Preuzmi uplatnice". Odbačeno jer se funkcija koristi svaki mjesec, pa
je jedan klik manje vrijedniji od uštede prostora. Premještanje je sitna izmjena.

### Modal

Isti oblik i širina kao modal "Izvoz za e-bankarstvo" (korisnik ga već zna).
Naslov: **"Štampa naloga na matričnom pisaču"**. Odozgo nadolje:

1. **Datum uplate**: uvijek predpopunjen današnjim datumom (isto pravilo kao
   izvoz, odluka vlasnika).
2. **Lista naloga sa kvačicama**: redni broj, primalac, svrha skraćeno, iznos;
   kvačica u zaglavlju označava/odznačava sve; ispod liste suma OZNAČENIH. Sve
   označeno na otvaranju.
3. **Preskočeni**: ako neki nalog ispadne (radnik bez ispravnog računa), žuta
   traka "Nisu u listi" sa razlogom, identično izvozu.
4. **Pregled na obrascu**: sklopljen, dugme "Prikaži kako pada na obrazac";
   otvoren prikazuje pojednostavljeni Grafis obrazac sa stvarnim podacima na
   njihovim pozicijama, za označene naloge.
5. **Podešavanje pisača**: sklopljeno (DIO B).
6. **Prvo podešavanje računara**: sklopljeno, ali AUTOMATSKI OTVORENO prvi put
   na tom računaru (dok postavke još nisu snimljene u pregledniku) (DIO C).

Podnožje: "Odustani" + tamno **"Štampaj N naloga"**.

Ako je uključeno objedinjavanje kantonalnih, modal to samo napomene u jednom
redu (kao izvoz), bez zasebne kvačice, da se ne razidje sa uplatnicama.

### Preuzimanje

Klik na "Štampaj N naloga" pravi .prn u pregledniku (ništa se ne šalje nazad na
server) i preuzima ga kao `nalozi-{firma}-{MM}-{GGGG}.prn`, pa se ispiše
postojeća poruka: "Fajl je poslan na štampu. Ako se štampa ne pokrene sama,
kliknite na preuzeti fajl u traci preuzimanja."

Štampa NE mijenja status obračuna i ništa ne upisuje u bazu.

## DIO B: podešavanje pisača (u modalu, sklopljeno)

Pamti se **po računaru** (localStorage, ključ `pk_nalog_escp`), jer kalibracija
zavisi od konkretnog pisača i papira; knjigovođa sa dva računara ima dva
različito namještena pisača.

- **Pomak po kolonama** (-10 do 20) i **pomak po linijama** (0 do 3).
- **Naša slova (kvačice)**, uključeno; isključiti ako pisač nema PC852 tabelu.
- Dugme **"Preuzmi test nalog"**: list sa X-evima i devetkama, da se kalibracija
  radi bez trošenja pravih naloga.

Admin stranica /admin/nalozi ostaje netaknuta, kao alat za kalibraciju i probe.

## DIO C: uputstvo "Prvo podešavanje računara" (dopune vlasnika)

Tekst se preuzima sa admin stranice, ali sa OVIM izmjenama:

1. **Nigdje ne pisati LX-350 kao ime pisača.** Umjesto toga: "naziv vašeg
   pisača". Model se spominje samo u napomeni da ne mora biti određeni model.
2. **Dvije cmd linije razdvojiti u dva numerisana koraka** (ionako se lijepe
   odvojeno, svaka sa svojim Enterom): "Korak 1: zalijepite ovu liniju" pa
   "Korak 2: zalijepite ovu liniju". Svaka linija u svom okviru sa svojim
   dugmetom Kopiraj.
3. **Jasno naglasiti šta se u liniji mijenja, a šta ostaje netaknuto.**
4. **Detaljno objasniti zašto to mora kroz cmd**, jer će ljudi biti skeptični da
   pokreću naredbe. Tekst ispod je gotov, koristiti ga.

### Koraci (redoslijed u modalu)

**Korak 1. Podijelite pisač samom sebi (share)**
Postavke → Bluetooth i uređaji → Štampači i skeneri → naziv vašeg pisača →
Printer properties → kartica Sharing → uključite "Share this printer" → za ime
share-a upišite kratko ime bez razmaka, npr. `PISAC` → Sačuvaj.
To ime zapamtite, treba u koraku 3.

**Korak 2. Otvorite Command Prompt kao administrator**
Start → ukucajte `cmd` → desni klik na Command Prompt → Run as administrator.

**Korak 3. Zalijepite prvu liniju, pa Enter**

```
assoc .prn=PKNalog
```

U ovoj liniji se NIŠTA ne mijenja, lijepi se tačno ovakva.

**Korak 4. Zalijepite drugu liniju, pa Enter**

```
ftype PKNalog=cmd /c (type nul ^> "%1:Zone.Identifier") 2^>nul ^& copy /b "%1" "\\IME-RACUNARA\PISAC"
```

U ovoj liniji mijenjate SAMO dvije stvari, obje na samom kraju:

- `IME-RACUNARA` → ime vašeg računara. Saznajete ga tako što u istom prozoru
  ukucate `hostname` i pritisnete Enter.
- `PISAC` → ime koje ste dali pisaču u koraku 1.

Ostalo ostavite tačno kako piše, posebno:

- `"%1"` na oba mjesta (to je oznaka za fajl koji se štampa, nije nešto što se
  zamjenjuje).
- Znakove `^` (bez njih cmd odmah izvrši dio linije umjesto da je zapamti).
- Imena se pišu obično, BEZ znakova `%` oko njih.

Provjera odmah: ukucajte `ftype PKNalog`. Mora ispisati liniju, ali BEZ znakova
`^`. To je ispravno, `^` služe samo pri upisu.

**Korak 5. Test štampe**
U modalu preuzmite test nalog i u Downloads folderu dvoklik na fajl. Pisač mora
krenuti odmah. Ako polja ne padaju u kućice, koristite pomake iz podešavanja.

**Korak 6. Automatsko otvaranje (jedan klik ubuduće)**
Poslije prvog preuzimanja, u traci preuzimanja desni klik na fajl → "Always open
files of this type" / "Uvijek otvaraj datoteke ove vrste". Od tada klik na
Štampaj znači da pisač kreće sam.

### Zašto ovo mora kroz cmd (tekst za modal, sklopljen ispod koraka)

Naslov: **"Zašto se ovo radi kroz Command Prompt"**

Preglednik iz sigurnosnih razloga ne smije slati podatke direktno na pisač. Da
smije, bilo koja stranica na internetu mogla bi vam štampati šta hoće. Zato PK
ne štampa sam, nego preuzme mali fajl sa komandama za pisač, tačno onakav kakav
je stari DOS program slao. Windows sam ne zna šta bi sa takvim fajlom, pa mu se
to kaže jednom, i tome služe ove dvije linije.

Šta one tačno rade: upisuju dva zapisa u Windows registar. Prvi kaže da .prn
fajlovi imaju svoju vrstu (nazvali smo je PKNalog). Drugi kaže šta znači otvoriti
takav fajl: kopirati ga na vaš pisač. To je isto pravilo po kojem Windows zna da
.pdf otvara u čitaču PDF-a, samo za našu vrstu fajla.

Zašto baš cmd, a ne kroz Postavke: veza između vrste fajla i komande ne postoji
nigdje u Postavkama Windowsa. Jedini način da se upiše su ove dvije naredbe.
`assoc` i `ftype` su dio samog Windowsa od njegovih početaka, nisu program koji
se skida ni instalira.

Zašto "Run as administrator": zapis ide u dio registra koji vrijedi za sve
korisnike računara, a njega Windows ne dozvoljava mijenjati bez administratorskih
prava.

Šta ovo NE radi: ne šalje ništa na internet, ne dira red za štampu koji koristi
vaš stari program, ne mijenja drivere i ne instalira nijedan program.

Ako se predomislite: briše se jednako lako, u istom prozoru ukucate
`assoc .prn=` i `ftype PKNalog=` (prazno iza znaka jednakosti) i sve je kao prije.

### Ako zapne (zadržati postojeći spisak)

- "Access is denied": u firewallu uključiti "File and printer sharing";
  provjeriti da "Password protected sharing" ne blokira.
- Pisač na drugom računaru u mreži: kao IME-RACUNARA upisati ime računara na
  kojem je pisač (share se pravi tamo).
- Fajl se otvara a štampa ne kreće: provjeriti da share iz koraka 1 postoji i da
  pisač nije pauziran u redu za štampu.
- Kvačice izlaze pogrešno: u Default Settings pisača postaviti Character Table na
  PC852, ili isključiti opciju "Naša slova".
- Na papiru izađe "[ZoneTransfer]" prije naloga: stanica ima staru verziju linije
  iz koraka 4, ponoviti korak 4.
- Drugi model pisača štampa gluposti: pisač je vjerovatno u IBM ProPrinter modu,
  u njegovim postavkama izabrati Epson ESC/P emulaciju.
- Novi računar, reinstalacija Windowsa ili promjena imena računara: ponoviti
  korake 1, 3, 4 i 6.

Napomena koja ostaje: ne mora biti određeni model pisača, radi svaki matrični sa
Epson ESC/P emulacijom (Epson LX/FX/LQ, a i OKI/Panasonic/Star/Citizen kad su u
Epson modu).

## DIO D: tehnički zahvat

1. **Nova korisnička ruta** `POST /api/payroll/nalozi-za-stampu`:
   `requireAuth` + `planGate` (PRO) + `assertOrgAccess`, isti posao kao
   postojeći admin `listNaloziZaStampu` (zajednički handler, druga provjera
   pristupa). Admin ruta ostaje.
2. **Selidba modula**: `escpNalog.ts` i `nalogVrijednosti.ts` iz
   `frontend/src/sections/admin/nalozi/` u dijeljeni folder (prijedlog:
   `frontend/src/lib/nalozi/`).
   **ZAMKA: `backend/test/escpNalog.test.js` ima fiksnu putanju do tih fajlova**
   (učitava ih kroz Node type-stripping) i mora se ažurirati u istoj izmjeni,
   inače testovi puknu.
3. **Dijeljena komponenta modala** (prijedlog:
   `frontend/src/components/StampaNalogaModal/`), koju koriste i obračun i
   admin stranica, da uputstvo i podešavanje ne postoje u dvije verzije.
4. **ObracunPlata.tsx**: dugme u DocRow "Banka" + stanje modala. Komponenta je
   dijeljena, pa se dugme pojavi svuda gdje se ona koristi; pri izvođenju
   provjeriti kako to izgleda u PK Office prikazu.
5. **Provjere**: postojeći backend testovi generatora (nova putanja), tsc,
   eslint, em dash, build; ručno E2E kroz modal.
6. **Dokumentacija**: dopuniti docs/faza1-escp-stampa-naloga.md statusom da je
   funkcija izašla iz admin panela, i docs/pk-office-funkcionalnosti.md ako se
   dugme vidi u PK Office prikazu.
