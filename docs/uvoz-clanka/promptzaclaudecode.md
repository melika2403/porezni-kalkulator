# Prompt za Claude Code — uvoz vijesti iz JSON fajla

Kopiraj sve ispod linije u Claude Code, u folderu projekta poreznikalkulator.ba. Uz prompt mu daj i fajl `clanak-primjer.json` (stavi ga u folder projekta ili priloži u razgovor) da ima čime testirati.

---

U admin dijelu sajta imamo stranicu "Novi tekst" za kreiranje vijesti (polja: Naslov, Nadnaslov, Adresa/slug, Sažetak, tekst u rich-text editoru, Vrsta, Rubrika, Tagovi, checkbox "Prikaži u rijeci vijesti", Pozicija na naslovnoj, Naslovna slika sa Alt opisom, SEO sekcija sa Fokus frazom, SEO naslovom i SEO opisom, Potpis autora, Izvor propisa, opcija Zakaži objavu, i sidebar "Provjera prije objave" sa validacijama). Pronađi tu formu u kodu prije nego što išta mijenjaš.

Zadatak: dodaj funkciju **"Uvezi iz fajla"** na stranicu "Novi tekst".

## Ponašanje

1. Pored naslova stranice "Novi tekst" dodaj dugme "Uvezi iz fajla" (stilom usklađeno sa postojećim dugmadima). Klik otvara izbor fajla, prihvata samo .json.
2. Fajl je u formatu "pk-vijest" verzija 1 — tačna šema:

```json
{
  "format": "pk-vijest",
  "verzija": 1,
  "naslov": "string",
  "nadnaslov": "string",
  "slug": "string (opciono)",
  "sazetak": "string, 80-300 znakova",
  "tekst_html": "string, HTML sa dozvoljenim tagovima: p, h2, h3, ul, ol, li, strong, em, a, blockquote",
  "vrsta": "vijest | vodic (opciono, default vijest; vidi dopunu na dnu)",
  "rubrika": "jedna od: Propisi i izmjene | Porezi i doprinosi | Plate i radnici | PDV | Obrti i knjige | Vodiči",
  "tagovi": "string, tagovi odvojeni zarezom",
  "prikazi_u_rijeci_vijesti": true,
  "pozicija_na_naslovnoj": "string, tekst opcije u selectu",
  "fokus_fraza": "string",
  "seo_naslov": "string, 50-60 znakova",
  "seo_opis": "string, 140-160 znakova",
  "naslovna_slika": {
    "fajl": "ime.jpg",
    "alt": "string",
    "base64": "base64 sadržaj JPG slike 1200x675"
  },
  "potpis_autora": "string",
  "izvor_propisa": "string",
  "izvorna_objava": { "naziv": "string", "url": "string", "datum": "GGGG-MM-DD" },
  "prioritet": "visok | srednji | nizak",
  "zakazi_objavu": null
}
```

3. Nakon učitavanja: validiraj da je `format === "pk-vijest"` i `verzija === 1`, inače prikaži jasnu poruku greške i ne diraj formu. Nevalidan JSON isto tako.
4. Popuni sva polja forme iz JSON-a. `rubrika` i `pozicija_na_naslovnoj` se biraju po vidljivom tekstu opcije; ako opcija ne postoji, ostavi default i prikaži upozorenje. `tekst_html` ide u editor kao sadržaj. `slug`: popuni samo ako se slug inače generiše automatski iz naslova — ne smije pregaziti logiku "poslije objave se više ne mijenja".
5. `naslovna_slika.base64` dekodiraj u JPG i provuci kroz **istu putanju kojom ide ručni upload slike** (isti resize/optimizacija/storage), pa popuni Alt opis iz `naslovna_slika.alt`. Ne zaobilazi postojeći upload pipeline.
6. Sve popunjeno mora okinuti postojeće validacije: brojači znakova i sidebar "Provjera prije objave" moraju se osvježiti kao da je korisnik sve ručno ukucao.
7. Status ostaje **Nacrt**. Uvoz nikad ne objavljuje niti zakazuje objavu; `zakazi_objavu` za sada ignoriši (rezervisano za kasnije).
8. Sigurnost: `tekst_html` sanitizuj prije ubacivanja (dozvoljeni samo tagovi iz šeme, bez script/style/on* atributa, linkovi samo http/https). Nepoznata polja u JSON-u ignoriši bez greške; polja koja fale ostavi prazna.
9. Ako u formi već ima unesenog sadržaja, prije popunjavanja pitaj korisnika za potvrdu da će sadržaj biti pregažen.

## Testiranje

U projektu je `clanak-primjer.json` sa pravim podacima i pravom base64 slikom. Testiraj: uvezi ga, provjeri da su sva polja popunjena, da je slika postavljena sa alt opisom, da checklist "Provjera prije objave" pokazuje ispravno stanje, i da Sačuvaj pravi normalan nacrt. Testiraj i greške: fajl koji nije JSON, JSON bez `format` polja, JSON bez slike.

---

## Dopuna 4.9.2026: vodiči kroz isti uvoz

Isti fajl "pk-vijest" v1 sada može donijeti i vodič:

- `"vrsta": "vodic"` postavlja Vrstu na **Vodič** (stalna stranica na `/vodici/<slug>`, semafor traži najmanje 1200 riječi) i rubriku na **Vodiči** ako `rubrika` nije navedena. Bilo šta drugo osim `"vijest"` i `"vodic"` daje upozorenje i ostaje Vijest.
- `"rubrika"` prima i `Vodiči` (uz postojećih pet).
- `"sljedeca_provjera": "GGGG-MM-DD"` (samo vodič) puni polje **Sljedeća provjera**, datum kad treba provjeriti stope i iznose u tekstu.
- Prvi vodič u ovom formatu (honorar iz inostranstva, AMS-1035) napravljen je 4.9.2026. i čuva se van repozitorija, u folderu `pk-reklame/vodic-ams` na Desktopu vlasnika; naslovna slika je JPG 1200x675 u base64, kao i kod vijesti.
