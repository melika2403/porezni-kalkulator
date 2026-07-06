<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pravopis: nikad em dash

Nikad ne koristi em dash (—) u kodu ni u tekstu vidljivom korisniku. Umjesto njega koristi zarez, dvotačku, tačku, običnu crticu (-) ili zagrade. Za prazne vrijednosti ("nema podatka") koristi en dash (–), ne em dash.

Postoji oko 1300 postojećih em dasheva u `src/` koji se čiste postepeno. `npm run check:emdash` puca ako nađe em dash u PK Office dijelu (`src/app/(app)`, `src/components/app-shell`, `src/sections/dashboard`). Novi kod ne smije uvoditi nove em dasheve nigdje.

# PK Office dizajn standard

Ovo je default dizajn sistem za svaki tab PK Office-a (`/app/*`) i šire u projektu. Ne izmišljaj novi stil po stranici, svaka stranica kreće od ovih tokena i komponenti. Glavni (marketing) dio aplikacije se NE dira, ovo vrijedi samo za PK Office i novi rad. Izuzetak (odluka vlasnika): stranice radnika na marketing dijelu (/organizacija/:id, /aktivni-radnici) koriste PK Office tabelu i modal forme kroz `src/styles/pk-embed.css` (Tailwind tokeni + utilities BEZ preflighta) i `.pk-scope` wrapper; dijeljene komponente su `src/sections/zaposlenici/WorkersTable.tsx` i `WorkerModal.tsx`.

## Standing pravila

1. Koristi ovaj sistem kao default. Ne pravi paralelni stil po stranici.
2. Nikad em dash (vidi gore). Zarez, dvotačka, srednja tačka (·), obična crtica (-) ili zagrada. Za prazne vrijednosti en dash (–).
3. Reuse dijeljenih komponenti (AppShell, TopBar, UserDropdown, Sidebar, OrgSwitcher, RowActionsMenu, kartice, badge-evi). Ne dupliraj stilove.
4. Mobilni je prioritet: tabele se ruše u kartice, sidebar postaje drawer.

## Tokeni

Paleta je već definisana kao Tailwind theme tokeni u `src/styles/pk-office.css`. Koristi te klase, NE uvodi sirove CSS varijable za /app:

| Namjena | Token (Tailwind) | Hex | Brief naziv |
| --- | --- | --- | --- |
| Glavna pozadina | `cream-50` | #f5f2eb | --paper |
| Chrome, kartice | `cream-100` | #ffffff | --side |
| Hover surface | `cream-200` | #ede8db | |
| Border (.5px) | `cream-300` | #d4cfc4 | --line |
| Primarna (sage) | `brand-600` | #3a5c42 | --sage |
| Sage soft | `brand-100` | #d6e8d9 | --sage-soft |
| Sage tamna | `brand-700` | #2d4633 | |
| Tekst (ink) | `text-primary` | #0f1a12 | --ink |
| Tekst muted | `text-tertiary` | #7a8a7d | --muted |
| Accent (terracotta) | `accent-500` | #c8622a | --accent |

Semantika boja (dosljedna kroz modul): zelena (`success`) = pozitivno / povezano / prilivi; amber (`warning`) = treba pažnju / nepovezano; plava (`info`) = info; siva/neutralna (`cream-200`/`text-secondary`) = odlivi i strukturno. Badge: `*-bg` pozadina + `*` tamniji tekst.

## Tipografija

- DM Serif Display (klasa `font-serif-display`): pozdrav i naslovi stranica/sekcija. DM Sans (400/500): sve ostalo.
- Naslov stranice: serif ~28px, ink. Pozdrav na Početnoj: serif ~26px, sage. Skala dosljedna kroz modul.
- Sitne letterspaced caps (eyebrow, grupne labele sidebara, KPI/stat labele, zaglavlja kolona) su NAMJERNE i odobrene, ne pretvarati ih u sentence case. Ostalo sentence case.

## Komponente i obrasci

- Kartica: bijela (`cream-100`), .5px border (`cream-300`), radius 12 (`rounded-xl`).
- Dropdown: NIKAD native `<select>` u /app. Koristi `PkSelect` (`src/components/app-shell/PkSelect.tsx`), wrapper oko marketing `StyledSelect`-a sa PK Office dimenzijama. Podržava `options`/`groups`, `searchable`, širina preko `wrapStyle`.
- Unos datuma: uvijek `PkDateInput` (`src/components/app-shell/PkDateInput.tsx`): auto-tačke pri kucanju (1106 → "11.06.") + kalendar dugme (native showPicker). Vrijednost je display string "DD.MM.GGGG.", za ISO `parseDateInput` iz `src/lib/dateInput.ts` (tu su i maska/format helperi, ne duplirati ih po stranicama).
- Unos iznosa (KM): uvijek `PkAmountInput` (`src/components/app-shell/PkAmountInput.tsx`): tačke hiljada se upisuju dok se kuca (1234 → "1.234"), na blur pune decimale ("1.234,00"). Vrijednost je display string, za broj `parseKm` iz `src/lib/amountInput.ts` (tu su i `formatKm`/maska, ne duplirati po stranicama).
- KPI/stat kartica: ikona u obojenom kvadratiću po semantici, caps label, velika serif brojka, sitan sub-tekst.
- Badge: `success`/`warning`/`info`/neutral, tekst u tamnijoj nijansi iste boje, radius 20.
- Liste i redovi: cijeli red klik na detalj, primarna akcija vidljiva, rijetke akcije u overflow meni (RowActionsMenu). Dugmad u redu rade stopPropagation.
- Prazna stanja: EmptyState. Napomene/upsell: InfoCallout.

## Shell

- TopBar (54px, puna širina): brand mark + "Porezni Kalkulator" lijevo, UserDropdown chip desno. Hamburger lijevo ispod ~900px.
- Sidebar (256px): header zona (PK Office wordmark + OrgSwitcher chip), nav grupe, footer sa "Nazad na Porezni Kalkulator". Ispod ~900px postaje off-canvas drawer.
