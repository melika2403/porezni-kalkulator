# Obustave na platu, rekapitulacija isplata i spiskovi za banke

> STATUS: IMPLEMENTIRANO + REVIEW POPRAVKE 30.08.2026., čeka test vlasnika.
>
> Review je našao da obustava nije bila provedena kroz PDF uplatnice (one su
> glasile na pun neto), da je sticky upis na karton radnika brisao obustavu
> pri obračunu ranijeg mjeseca, i da raščlamba obustava gura potpise van
> stranice listića. Sve popravljeno; iznos "za isplatu" je svuda clampovan na
> nulu (banka u tom slučaju stvarno prenese 0).
> Sva otvorena pitanja zatvorena. Testovi: backend/test/obracunAdapter.test.js
> (obustave u izvozu naloga) i backend/test/spisakBanke.test.js (golden
> testovi sva tri profila spiska).
> Izvor zahtjeva: mail klijenta (OD Računovodstvo Jahić, 29.08.2026.) sa tri
> molbe + UniCredit template "TEMPLATE ZA UNOS PODATAKA_2025.xlsx".
> Branch 194 (platna lista, izvještaji, obustave) je upravo ovaj posao.

## Šta klijent traži i šta to stvarno znači

1. **Obustave (odbitci) na platu**: firma plaća rate kredita za radnike, pa
   iznos za isplatu radniku treba umanjiti za ratu. Treba i evidencija (da se
   ne kuca svaki mjesec) i prikaz na platnoj listi.
2. **Jedna tabela za mjesec**: rb, ime i prezime, plata, topli obrok, prevoz,
   umanjenja, i zbir (plata + obrok + prevoz - umanjenja).
3. **Spisak primanja po banci**: neke banke traže da se plate uplate zbirno na
   njihov prelazni račun uz spisak radnika, pa banka raspoređuje dalje.
   Klijent predlaže ručno šifriranje banaka na radniku.

## Šta kažu stvarni spiskovi (sva tri pročitana, 30.08.2026.)

Klijent je uz prazni template poslao i STVARNE tabele (folder Desktop/tabele),
a vlasnik projekta ima i Raiffeisen format. Tri banke, tri različita formata:

| Banka | Kolone | Granulacija |
| --- | --- | --- |
| UniCredit (`4201509550000 07-26 Unicredit.xlsx`) | JIB isplatioca, ime i prezime, broj računa, iznos KM, svrha, vrsta uplate ("Redovno") | ODVOJENI redovi: "Plaća za 07/2026", "Topli obrok za 07/2026", "Prijevoz za 07/2026" |
| Raiffeisen (`TABELA SPISKOVI ZA PLATE.xlsx`) | JIB nalogodavca, IME, PREZIME (odvojene kolone), račun (16 cifara bez crtica), iznos, svrha ("NETO PLATA 03/26.", "TOPLI OBROK 03/26.") | ODVOJENI redovi po vrsti |
| Intesa (`Plate to i prevoz intesa 07-2026.xls`, stari binarni .xls, parsiran na nivou ćelija) | red 2 naziv firme; red 4 svrha "UPLATA plate, toplog obroka i prevoza 07/26"; red 6 zaglavlja: A PREZIME I IME, B prazna ("PRAZNO"), C IZNOS, D JMBG, E RAČUN; na dnu red UKUPNO (SUM) | JEDAN ZBIRNI iznos po radniku (plata+obrok+prevoz), sa JMBG-om i računom |

Zaključci koji mijenjaju raniji plan:
- **Ime i prezime, ne šifra.** Prazni UniCredit template nudi "kodiranu šifru
  zaposlenika", ali stvarni spisak koji klijent predaje koristi ime i prezime.
  Odustaje se od generisane oznake R{id}.
- **Nema univerzalnog spiska.** Granulacija i kolone se razlikuju po banci,
  pa spisak dobija PROFIL PO BANCI (kao izvoz naloga): unicredit, raiffeisen,
  intesa. Svaki profil se popunjava u svoj šablon.
- Iznos "plate" u spisku je uvijek **za isplatu** (net - obustave); obrok i
  prevoz puni iznosi; Intesa zbir = ukupno za isplatu radniku.

## Ključne odluke dizajna

- **Banka se NE šifruje ručno.** U BiH su prve tri cifre žiro računa šifra
  banke, a `bankNameFromAccount` (backend/src/services/bankStatements/
  bankCodes.js, mapa 16 banaka) to već radi. Klijent ne unosi ništa: izvještaj
  po bankama se grupiše automatski iz računa radnika.
- **Obustava ne dira poreze, doprinose ni neto.** To je raspolaganje već
  obračunatom neto platom. Mijenja se samo "ukupno za isplatu":
  `net + obrok + regres + prevoz - obustave`.
- **Stari obračuni se ne diraju** (payroll data safety): nova kolona ima
  default 0, ništa se ne re-derivira.
- **U spiskovima ide ime i prezime radnika** (tako rade stvarni spiskovi sve
  tri banke); ideja sa kodiranom šifrom `R{workerId}` je odbačena.

## 1. Obustave

**Evidencija na radniku** (trajne obustave, npr. rata kredita):
- nova JSON kolona `workers.obustave` kroz `ensureColumns`: lista
  `{ naziv, iznos, aktivna }` (naziv npr. "Kredit UniCredit, rata").
- uređuje se u kartonu radnika (WorkerModal, nova sekcija "Obustave na
  platu"), dijeljena forma pa vrijedi svugdje.

**Obračunski modal** (prijedlog vlasnika, prihvaćen): nova sekcija
"OBUSTAVE (KM)" odmah ispod "Neoporezivi dodaci":
- predpopuni se zbirom aktivnih obustava sa radnika, isti obrazac kao topli
  obrok (ručna izmjena za taj mjesec + "vrati na auto");
- ispod polja raščlamba stavki (naziv + iznos) kad dolaze sa radnika.

**Snapshot na obračunu**: `payrolls.obustave` DECIMAL default 0 +
`payrolls.obustaveStavke` JSON (snapshot liste za prikaz na listiću).
Preliminarni izračun u modalu dobija red "Obustave" i red "Za isplatu".

**Zakonsko upozorenje** (ne blokira): ako obustave prelaze 1/3 neto plate,
žuta napomena da ZoR FBiH za prisilne obustave dozvoljava najviše 1/3 plaće
(1/2 samo za zakonsko izdržavanje). Informativno, jer dobrovoljne obustave
mogu biti i veće.

**Gdje se obustava odražava** (sve čita isti snapshot; PDF uplatnice su
dodane naknadno, poslije reviewa, jer su bile ispuštene):
- platni listić (`payslipPdf.js`): redovi obustava (naziv + iznos), pa
  "UKUPNO ZA ISPLATU" umanjen i nikad negativan; sekcija se prikazuje i kad
  nema dodataka a ima obustava. Raščlamba po redovima se crta samo kad na
  stranici ima mjesta, inače ide zbirni red plus sitan red sa stavkama
  (listić je fiksno jednostranični);
- PDF uplatnice (mjesečne i pojedinačne): "Neto plata" glasi na neto minus
  obustave, isto kao nalozi;
- specifikacije po radniku i lista naloga: kolona/red obustava;
- **izvoz naloga u e-bankarstvo i štampa naloga**: prenos "Neto plata" =
  `net - obustave` (adapter je zajednički, jedna izmjena pokriva oba). Ako je
  obustava >= neto plate, nalog ide u "preskočene" sa jasnim razlogom, nikad
  tiho ni negativan;
- mjesečni pregled (zbirne kartice): "Za isplatu radnicima" umanjen.

**Svjesno VAN opsega (faza 2, spomenuti klijentu):** automatski nalog za
plaćanje kreditoru (traži račun primaoca po obustavi) i konto obustava u
nalogu za knjiženje. MVP: firma ratu plaća kako i sad plaća, mi samo
umanjujemo isplatu radniku i uredno prikazujemo.

## 2. Rekapitulacija isplata (jedna tabela)

Novi PDF "Rekapitulacija isplata" u stilu postojećih (isti header kao
specifikacije/lista naloga): jedna tabela za mjesec,

| RB | Prezime i ime | Neto plata | Topli obrok | Prevoz | (Regres) | Obustave | ZA ISPLATU |

+ završni red UKUPNO po svim kolonama. Kolona Regres samo kad bar jedan
radnik ima regres (da tabela ne bude pretrpana). Izvor podataka: isti
`monthlySummary.perWorker` koji hrane specifikacije, + obustave.

UI: nova stavka u postojećem split-meniju "Specifikacije po radniku" (red
BANKA u Dokumentima mjeseca): "Rekapitulacija isplata (jedna tabela)".

## 3. Isplate po bankama

**PDF "Isplate po bankama"**: grupisano po banci radnika (naziv banke iz
prve 3 cifre računa + broj radnika + suma grupe), unutar grupe tabela kao
rekapitulacija + kolona žiro račun. Radnik bez računa ide u posebnu grupu
"Bez upisanog računa" na dnu (nikad tiho ispušten).

**Spiskovi po profilu banke (XLSX)**: tri generatora, svaki popunjava
STVARNI šablon svoje banke (šabloni idu u `frontend/public/templates/`,
popunjavanje pizzip + XML sheet-a, isti pristup kao docx šabloni; bez nove
dependencije). Standing pravilo "formati za banku se ne pogađaju" je
zadovoljeno: imamo sva tri stvarna fajla. Golden test za svaki (popuni +
pročitaj nazad).

- **UniCredit**: po radniku sa UniCredit računom JEDAN RED PO VRSTI isplate
  koja postoji (plata = net - obustave, topli obrok, prevoz, regres); kolone
  JIB firme / ime i prezime / račun / iznos / svrha "Plaća za MM/GGGG",
  "Topli obrok za MM/GGGG", "Prijevoz za MM/GGGG" / vrsta uplate "Redovno".
- **Raiffeisen**: isti princip odvojenih redova; kolone JIB / IME / PREZIME
  (odvojeno, iz postojećeg razdvajanja imena) / račun 16 cifara bez crtica /
  iznos / svrha "NETO PLATA MM/GG.", "TOPLI OBROK MM/GG."...
- **Intesa**: JEDAN red po radniku, raspored kao u stvarnom fajlu: red 2
  naziv firme, red 4 svrha "UPLATA plate, toplog obroka i prevoza MM/GG",
  red 6 zaglavlja PREZIME I IME / (prazna kolona) / IZNOS / JMBG / RAČUN,
  redovi radnika sa zbirnim iznosom za isplatu, na dnu UKUPNO (suma).
  Original je stari binarni .xls: generišemo XLSX sa identičnim rasporedom
  (klijent po potrebi snimi kao .xls); ako banka insistira baš na .xls,
  doradimo kasnije. JMBG = dekriptovani JMBG radnika; radnik bez JMBG-a ili
  računa dobija prazno polje + upozorenje uz preuzimanje.

UI: split-meni uz rekapitulaciju dobija "Isplate po bankama (PDF)" i
"Spisak za banku (XLSX)" koji nudi profil (UniCredit / Raiffeisen / Intesa),
predizabran po banci sa najviše radnika.

## Redoslijed rada (SVE URAĐENO 30.08.2026.)

1. [x] Obustave: kolone kroz ensureColumns (workers.obustave JSON,
   payrolls.obustave DECIMAL default 0, payrolls.obustaveStavke JSON),
   sekcija u WorkerModal (dijeljena forma), sekcija "Obustave na platu (KM)"
   u obračunskom modalu (auto-predpopuna + vrati na auto + upozorenja 1/3 i
   >= neto), preliminarni izračun (red Obustave + Ukupno za isplatu
   radniku), platni listić (redovi obustava + umanjen UKUPNO ZA ISPLATU),
   obracunAdapter (net - obustave, >= neto u preskočene sa razlogom, pokriva
   izvoz u e-bankarstvo I štampu naloga), monthlySummary (perWorker.obustave,
   totals.obustave/zaIsplatu), specifikacije i lista naloga (neto umanjen +
   napomena), "Obračunaj sve" (obustave samo za NOVI obračun, ručna izmjena
   mjeseca preživi bulk), kartice mjeseca.
2. [x] Rekapitulacija isplata PDF (fillRekapitulacija.ts) + stavka u
   split-meniju.
3. [x] Isplate po bankama PDF (fillIsplatePoBankama.ts, landscape, grupa
   "Bez upisanog računa") + tri XLSX profila (spisakBanke.ts bez importa +
   spisakBankeXlsx.ts pizzip; golden testovi u backend/test/spisakBanke.test.js).
   Intesa spisak upozori na radnike bez JMBG-a (prazna ćelija, ne ispušta ih).
4. [x] Provjere: tsc bez grešaka, eslint 0 grešaka na izmijenjenim
   fajlovima, check:emdash ok, backend testovi 122/122 + 7 golden, build.

Napomena za PK Office: /app/obracuni-plata rekapitulacija je troškovna
(bruto/doprinosi/porez/neto), obustave je ne mijenjaju pa nije dirana; novi
dokumenti se preuzimaju na marketing obračunu (isti kao i ostali dokumenti
mjeseca).

## Otvorena pitanja: SVA ZATVORENA (vlasnik, 30.08.2026.)

1. Kolona Regres u rekapitulaciji: SAMO KAD POSTOJI.
2. Odvojeni redovi ili jedan po radniku: odgovoreno stvarnim tabelama,
   UniCredit i Raiffeisen odvojeni redovi po vrsti, Intesa jedan zbirni red.
3. Obustava veća od neto plate: PRESKOČITI nalog uz jasno upozorenje, ne
   blokirati snimanje obračuna.

Potvrđeno od vlasnika (29.08.2026.): obustave rade kao topli obrok, unese se
jednom na radniku i prenosi se u svaki idući mjesec dok se ne izmijeni.
