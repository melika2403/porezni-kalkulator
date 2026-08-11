# FAZA 1: Direktna ESC/P štampa naloga za plaćanje (modul Plate)

Dokument ima dva dijela:
- DIO A: Claude Code prompt (implementacija u PK)
- DIO B: Onboarding uputstvo za podešavanje radne stanice klijenta (za tebe / support)

Faza 0 brief (geometrija, mapa polja, formati) je referentni dokument. Vrijednosti odatle se koriste ovdje i NE smiju se mijenjati.

> **STATUS (10.08.2026): implementirano.** Vidi sekciju "STATUS implementacije" na dnu.

---

# DIO A: CLAUDE CODE PROMPT

## Kontekst

PK trenutno ima eksperimentalni generator PDF naloga za matrični pisač (EPSON LX-350) u admin panelu, sa mrežom pozicija (linija, kolona) i test stranicom. PDF pristup kroz Windows driver se pokazao nepouzdanim (driver komplikacije na klijentskim mašinama). Prelazimo POTPUNO na direktnu ESC/P štampu: PK generiše sirovi ESC/P tok kao `.prn` datoteku, koja se na klijentskom računaru sirovo kopira na pisač (podešavanje mimo PK, opisano u DIO B). Pisač sam interpretira kodove svojim ugrađenim fontom, kao stari DOS program.

ZADATAK: (1) POČISTITI postojeći PDF pristup za matrični pisač, (2) ESC/P generator, (3) ekran pregleda naloga prije štampe sa kvačicama, (4) dugme koje preuzima `.prn`.

## 0. Čišćenje starog pristupa (prvo uraditi)

- OBRISATI PDF generator za matrične naloge (pdf-lib kod za 195x101 stranice) i sve njegove pomoćne funkcije koje niko drugi ne koristi.
- OBRISATI UI elemente vezane za PDF matrični pristup (dugme "Generiši test PDF" u postojećem obliku, tekst uputa o continuous/fanfold štampi iz PDF čitača).
- ZADRŽATI: mrežu pozicija (linija, kolona po polju), kalibracione parametre (Pomak X/Y koncept prelazi u ESC/P kontekst ako zatreba), formatere vrijednosti (iznos, datumi, JIB), data model naloga. To se sve reusa u ESC/P generatoru.
- ZADRŽATI test stranicu u admin panelu, ali je prevezati na ESC/P: dugme "Generiši test .prn" (X-evi i 9-ke u svim poljima, broj naloga podesiv, kao dosadašnji test).
- VAŽNO, NE DIRATI: postojeći generator uplatnica (PDF za A4, ručno nošenje u banku). To je zaseban, produkcijski feature i nema veze sa ovim. Prije brisanja bilo čega provjeriti da fajl/funkcija nije dijeljena sa generatorom uplatnica.

## Smještaj feature-a

SVE iz ovog dokumenta ide u ADMIN PANEL (kao i dosadašnji test), da se može testirati bez da pravi klijenti išta vide. Struktura: admin stranica "Štampa naloga (matrični)" sa (a) test sekcijom (test .prn) i (b) pregled+štampa sekcijom vezanom na stvarni obračun plate (za sada dostupno samo adminu). Prebacivanje u klijentski UI je posebna, kasnija odluka i NIJE dio ovog zadatka.

## 1. ESC/P generator

Ulaz: lista naloga (isti data model koji već puni PDF generator). Izlaz: jedan `.prn` fajl (binarni Blob) sa svim odabranim nalozima.

Struktura toka, bajt po bajt:

**Inicijalizacija (jednom, početak fajla):**
- `ESC @` = `0x1B 0x40` (reset)
- `ESC ! 1` = `0x1B 0x21 0x01` (12 cpi, tačno kao stari program, red 10 opštih parametara)
- `ESC C 24` = `0x1B 0x43 0x18` (dužina forme 24 linije = 4 inča na 6 lpi = 101.6 mm, korak naloga na traci)
- `ESC O` = `0x1B 0x4F` (isključi skip-over-perforation, da pisač ne dodaje svoje margine)

**Po jednom nalogu:**
Za linije 1 do 21 (redom, bez preskakanja):
- Ako linija ima polja (po mapi iz Faza 0): za svako polje u liniji, sortirano po koloni:
  - Pozicioniraj: `ESC $ n1 n2` = `0x1B 0x24 n1 n2`, apsolutna horizontalna pozicija u 1/60 inča od lijeve margine. Za kolonu k (1-bazirano) na 12 cpi: `jedinice = (k - 1) * 5`, pa `n1 = jedinice % 256`, `n2 = jedinice / 256` (cijeli dio). Kolone iz mape su <= 77, pa jedinice <= 380, n2 je 0 ili 1.
  - Ispiši tekst polja kao ASCII bajtove (vidi tačku o karakterima ispod).
- Kraj linije: `CR LF` = `0x0D 0x0A` (i za prazne linije bez polja, samo CR LF).
- NAPOMENA: nakon 21. linije NE slati dodatne LF.
- Kraj naloga: `FF` = `0x0C`. Pisač sam skače na vrh sljedećeg naloga po ESC C 24.

**Kraj fajla:** ništa posebno (bez ESC @ na kraju, da ne resetuje ESC C prije zadnjeg FF).

**Karakteri:** naša slova (č, ć, ž, š, đ) u poljima (imena, svrha, primalac) TRANSLITERIRATI u ASCII: č→c, ć→c, ž→z, š→s, đ→dj (velika slova analogno). Razlog: pisač u default codepage nema naša slova, a nalog je čitljiv i bez njih, stari program radi isto. Napraviti util funkciju `toEscpAscii(text)`. Sve ostale ne-ASCII znakove zamijeniti sa `?`.

> **DOPUNA (vlasnik, 10.08.2026): stari program normalno ispisuje slova s kvačicama, pa je default NAŠA SLOVA.** Implementirano: PC852 (Latin 2) bajtovi za č/ć/ž/š/đ + eksplicitan izbor tabele u init sekvenci (`ESC ( t` dodijeli PC852 tabeli 1, d2=10, pa `ESC t 1`). ASCII transliteracija ostaje kao opcija (checkbox "Naša slova" na admin stranici) za pisač/podešavanje bez PC852 podrške.

**Dužine polja:** svako polje ima maksimalnu dužinu (prostor do sljedećeg polja u liniji ili do kolone 81). Tekst duži od maksimuma TVRDO ODREZATI na maksimum. Nikad ne prelamati u novi red, prelom bi pomjerio sve linije ispod.

**Format vrijednosti:** identičan postojećem PDF generatoru (iznos 999.999.999.999,00 stil, datumi, JIB 13 cifara itd.). Reusati postojeće formatere, ne pisati nove.

## 2. Ekran pregleda prije štampe

Klik na "Štampaj naloge" (u obračunu plata) NE preuzima fajl odmah, nego otvara ekran/modal pregleda:

**Gore: lista naloga u tabeli.** Kolone: kvačica, redni broj, primalac, svrha (skraćeno), račun primaoca, vrsta prihoda, iznos. Ispod tabele suma iznosa OZNAČENIH naloga (mijenja se sa kvačicama).

**Kvačice:**
- Svaki nalog ima checkbox, default svi označeni.
- Master checkbox u headeru (označi/odznači sve).
- Odznačen nalog se NE uključuje u `.prn` i ne ulazi u sumu.
- Ako je odznačeno sve, dugme štampe disabled.

**Ispod liste: vizuelni pregled naloga.** Za svaki OZNAČENI nalog, prikaz kako će izgledati na papiru: pozadinska slika/SVG pred-štampanog obrasca (nacrtati pojednostavljen obrazac: linije i kućice po izgledu Grafis naloga), preko nje tekst polja monospace fontom na pozicijama iz mreže (ista formula kao PDF: x = kolona × 2.1167mm, y = linija × 4.2333mm, skalirano na širinu prikaza). Navigacija strelicama prev/next kroz naloge ili vertikalni scroll, šta je jednostavnije u postojećem UI kitu.

**Dno, jedna akcija:**
- Dugme: "Štampaj X naloga" gdje je X broj označenih. Klik generiše `.prn` samo od označenih i pokreće download. Ime fajla: `nalozi-{firma-slug}-{MM}-{GGGG}.prn`.

**Nakon downloada:** prikazati kratku poruku: "Fajl je poslan na štampu. Ako se štampa ne pokrene sama, kliknite na preuzeti fajl u traci preuzimanja." (pokriva prvi put i slučaj bez auto-open).

## 3. Šta NE raditi

- NE mijenjati mrežu pozicija, geometriju ni formate iz Faza 0.
- NE dirati generator uplatnica (PDF za A4). Potpuno zaseban feature.
- NE izlagati ništa od ovoga van admin panela.
- NE pokušavati štampu direktno iz browsera (window.print, WebUSB itd.). Izlaz je isključivo `.prn` download.
- NE izmišljati vrijednosti računa/vrsta prihoda, dolaze iz postojećeg data modela.
- NE slati nikakve podatke naloga na eksterne servise.

## 4. Test

- Unit: generator za 1 nalog sa svim poljima popunjenim maksimalnim dužinama, snapshot očekivanih bajtova (hex). Provjeriti: ESC @ na početku, ESC ! 0x01, ESC C 0x18, tačno 21 CRLF po nalogu, FF na kraju svakog naloga, ESC $ vrijednosti za kolone 4 (15 jedinica: n1=15,n2=0) i 77 (380 jedinica: n1=124,n2=1).
- Unit: transliteracija (čćžšđ → cczsdj), rezanje predugih polja.
- Unit: kvačice: odznačen nalog nije u izlazu, suma se slaže.
- Ručno (radi developer): otvoriti `.prn` u hex vieweru i provjeriti da nema 0x00 bajtova ni UTF-8 višebajtnih sekvenci (0x00 legitimno postoji samo kao parametar escape sekvenci, npr. ESC $ n2=0).

---

# DIO B: ONBOARDING UPUTSTVO ZA RADNU STANICU (za tebe / support)

Cilj: da klik na "Štampaj naloge" u PK pokrene štampu na EPSON LX-350 bez ikakvog instaliranja na klijentov računar. Koriste se samo ugrađene Windows funkcije. Podešavanje traje ~5 minuta po računaru, radi se jednom (uživo ili preko AnyDeska).

## Zašto ovako mora

Browser iz sigurnosnih razloga ne smije slati podatke direktno na pisač. Zato PK preuzme mali `.prn` fajl (sirove komande za pisač, isto što stari Com_Soft program šalje), a Windows se jednom nauči da "otvaranje" takvog fajla znači: kopiraj ga sirovo na pisač. Pisač sam interpretira komande svojim ugrađenim fontom, pa je štampa brza i oštra kao iz starog programa, bez drivera, veličina papira i podešavanja štampe.

## Kompatibilnost pisača (VAŽNO za teren)

NE mora biti baš EPSON LX-350, to je samo referentni model. `.prn` tok su standardne Epson ESC/P komande, pa radi na:
- svim Epson 9-pin modelima (LX-300, LX-300+II, LX-350, FX-890, FX-2190...),
- Epson 24-pin LQ seriji (ESC/P2 je unazad kompatibilan),
- drugim brendovima (OKI, Panasonic, Star, Citizen, Tally...) kad su u **Epson ESC/P emulaciji** (većina jeste po defaultu; ako pisač štampa gluposti, u postavkama pisača prebaciti sa IBM ProPrinter na Epson emulaciju).

Jedino "naša slova" (PC852) zavise od modela: noviji Epsoni prihvate izbor tabele iz samog fajla, stariji/tuđi možda traže PC852 u postavkama pisača, a bez PC852 podrške ostaje ASCII opcija u PK. Ime share-a `LX350` u koracima je proizvoljno, za drugi pisač nazovi share kako hoćeš i to ime upiši u ftype komandu.

## Koraci podešavanja

**Preduslov:** matrični pisač radi na tom računaru (svejedno koji driver, driver se ovdje ne koristi za renderovanje).

**1. Podijeli pisač samom sebi (share):**
Postavke → Bluetooth i uređaji → Štampači i skeneri → EPSON LX-350 → Printer properties → kartica Sharing → uključi "Share this printer", ime share-a: `LX350` (bez razmaka). Sačuvaj.

Napomena: ime reda za štampu koje koristi stari program (npr. "EPSON LX-350" u vDos configu) NE dirati. Share je samo dodatno mrežno ime, ništa postojeće se ne mijenja.

**2. Nauči Windows šta sa .prn fajlovima:**
Start → ukucaj `cmd` → desni klik na Command Prompt → Run as administrator. U drugoj komandi PRIJE lijepljenja zamijeni `IME-RACUNARA` imenom računara (vidi se komandom `hostname`) i `LX350` imenom share-a iz koraka 1. Imena se pišu obično, BEZ znakova `%`; jedino `"%1"` ostaje tačno kako piše (oznaka za fajl koji se štampa). Zalijepi obje linije (Enter poslije svake):

```
assoc .prn=PKNalog
ftype PKNalog=cmd /c (type nul ^> "%1:Zone.Identifier") 2^>nul ^& copy /b "%1" "\\IME-RACUNARA\LX350"
```

VAŽNO: znakovi `^` su obavezni. Bez njih cmd pri lijepljenju ODMAH izvrši `>` i `&` (copy krene istog trena, u registar sjedne skraćena, nefunkcionalna komanda, a u folderu nastane junk fajl imena `%1`). Sa `^` se u registar upišu literalni `>` i `&`. Provjera `ftype PKNalog` zato ispisuje komandu BEZ kapica, to je ispravno stanje.

Šta rade: prva kaže da su `.prn` fajlovi tip "PKNalog", druga da se taj tip "otvara" tako što se prvo obriše browserova oznaka preuzimanja pa se fajl sirovo kopira na podijeljeni pisač LX350. Ovo su dva zapisa u Windows registru, ništa se ne instalira.

Zašto brisanje oznake: browser uz svaki preuzeti fajl upiše Mark of the Web (NTFS Zone.Identifier stream sa tekstom `[ZoneTransfer]` / `ZoneId=3`). Sadržaj samog `.prn` fajla je čist (počinje tačno sa ESC @, pokriveno testom), ali se na nekim mašinama ta oznaka nađe na putu do pisača i odštampa kao dva reda teksta prije naloga, što pomjeri papir i trajno pokvari top-of-form za sve naloge u nizu. `(type nul > "%1:Zone.Identifier") 2>nul` je isprazni (bezopasno i kad je nema), pa tek onda ide kopiranje.

Provjera odmah: u cmd ukucaj `ftype PKNalog` i mora ispisati gornju komandu.

**3. Test štampe:**
U PK generiši test naloge (postojeća test stranica) i preuzmi `.prn`. U Downloads folderu dvoklik na fajl. Pisač mora krenuti odmah. Ako je papir dobro uvučen (vrh naloga na vrhu glave), polja padaju u kućice.

**4. Uključi automatsko otvaranje (jedan klik, u browseru klijenta):**
Nakon prvog preuzimanja iz PK, u traci preuzimanja (Chrome: dole; Edge: gore desno) desni klik na preuzeti fajl → "Always open files of this type" / "Uvijek otvaraj datoteke ove vrste".

Od tog trenutka: klik na "Štampaj naloge" u PK → pisač kreće sam. To je ciljno stanje.

## Poznata ograničenja i rješenja

- **Novi računar / reinstalacija Windowsa:** ponoviti korake 1, 2 i 4 na toj mašini.
- **Chrome/Edge nekad ne nude "Always open" za neke tipove:** ako opcije nema, klijent ostaje na dva klika (dugme u PK + klik na fajl u traci). I to je prihvatljivo.
- **Pisač na drugom računaru u mreži:** isti princip, samo se kao `IME-RACUNARA` upiše ime računara na kojem je pisač (share se pravi tamo).
- **Štampa ne kreće, a fajl se otvara:** provjeriti da share `LX350` postoji (korak 1) i da pisač nije pauziran u redu za štampu.
- **Na papiru izađe `[ZoneTransfer]` / `ZoneId=3` prije naloga:** stanica ima staru verziju ftype komande (bez brisanja oznake preuzimanja), ponoviti korak 2 sa gornjom komandom.
- **"Access is denied" pri kopiranju iako share postoji:** u Windows firewallu uključiti "File and printer sharing" za privatnu mrežu, i provjeriti da "Password protected sharing" (Advanced sharing settings) ne blokira pristup; ako blokira, isključiti ga ili share otvoriti za Everyone (samo print).
- **Promjena imena računara:** ftype u registru drži staro ime (cmd ga ekspandira pri upisu), pa poslije preimenovanja ponoviti korak 2.
- **Naša slova izlaze pogrešno (kvačice):** PK šalje izbor PC852 tabele u samom fajlu; ako pisač to ignoriše, u Default Settings pisača postaviti Character Table na PC852, ili u PK isključiti opciju "Naša slova" (ASCII transliteracija).
- **Ponovna štampa:** svaki preuzeti `.prn` u Downloads folderu se može dvoklikom odštampati ponovo, koristan trag šta je kad štampano.

## Sigurnosna napomena

`.prn` fajl sadrži podatke naloga (imena, računi, iznosi) kao običan tekst. Downloads folder na klijentskom računaru ih zadržava. To je isti nivo izloženosti kao PDF nalozi ili izvodi koje knjigovođe već drže lokalno, ali pri onboardingu napomenuti da se Downloads povremeno čisti ako računar dijeli više ljudi.

---

# STATUS implementacije (10.08.2026)

Sve iz DIO A implementirano, u admin panelu (/admin/nalozi, "Štampa naloga"):

- **Čišćenje:** PDF matrični generator (nalogPlacanjePdf.ts, pdf-lib 195×101) OBRISAN; mreža polja (FIELD_MAP_TIP1) i test vrijednosti preseljeni u `frontend/src/sections/admin/nalozi/escpNalog.ts`. A4 uplatnice netaknute (potvrđeno da ništa nije dijeljeno).
- **Generator:** `escpNalog.ts` (bez ijednog importa, da ga backend testovi učitavaju direktno). Init + ESC $ + 21 CRLF + FF po spec-u. Kodne stranice: `pc852` (default, naša slova; init dodaje `ESC ( t` 03 00 01 0A 00 + `ESC t 1`) i `ascii` (toEscpAscii transliteracija; Đ→Dj/DJ po kontekstu). Tvrdo rezanje na prostor do sljedećeg polja (na BAJTOVIMA, pa đ→dj ne može prekoračiti). Kalibracija: `pomakKolona` (u ESC $ jedinicama po koloni, može negativan) i `pomakLinija` (0-3 prazne linije prije naloga).
- **Mapiranje vrijednosti:** `nalogVrijednosti.ts`: nalozi iz obračuna (isti adapter kao izvoz za e-bankarstvo, novi admin endpoint POST /api/admin/izvoz-naloga/nalozi) → polja obrasca. Formati po Faza 0 (iznos de-DE, datum DD.MM.GGGG, period DDMMGG, JIB/računi samo cifre). Svrha i primalac se prelijevaju po granicama riječi kroz svoje linije. **Polje "vrsta uplate" ostaje prazno: ne postoji u data modelu (spec: ne izmišljati); dodati kad se potvrdi vrijednost sa stvarnog naloga.**
- **Ekran:** test sekcija (broj naloga, pomaci, checkbox Naša slova, sve u localStorage) + pregled i štampa obračuna (firma/mjesec/datum uplate/objedini kantonalne, tabela sa kvačicama i sumom označenih, preskočeni sa razlogom, vizuelni pregled označenih na pojednostavljenom obrascu, "Štampaj X naloga" → `.prn`, poruka nakon downloada).
- **Testovi:** backend/test/escpNalog.test.js (13 testova: init bajtovi, ESC $ za kolone 4 i 77, 21 CRLF + FF, filtriranje, transliteracija, PC852 bajtovi, rezanje, kalibracija, formati mappera, čistoća toka).
- **Kompatibilnost:** nije vezano za LX-350; radi na svakom matričnom pisaču sa Epson ESC/P emulacijom (vidi "Kompatibilnost pisača" u DIO B). Admin stranica to i naglašava da klijente sa drugim modelom ne odvrati od probe.
- **OSTAJE:** probna štampa na stvarnom LX-350 (kalibracija pomaka, provjera PC852 izbora tabele na konkretnom primjerku pisača), vrijednost polja "vrsta uplate".
