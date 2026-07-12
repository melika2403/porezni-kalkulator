# Slike za uputstva (PK Office)

Screenshotovi koji se prikazuju u panelu Uputstvo (klizni panel zdesna u /app).

## Kako dodati sliku

1. Snimi screenshot ekrana (najbolje širine ~900px, PNG).
2. Spusti fajl ovdje, npr. `bankovni-izvodi-upload.png`.
   Preporuka za ime: `<slug-stranice>-<sta-prikazuje>.png`.
3. U temi (`frontend/src/content/upustva/<slug>.ts`) dodaj blok slike unutar
   neke sekcije:

   ```ts
   { t: "slika", src: "/uputstva/bankovni-izvodi-upload.png", opis: "Polje za učitavanje PDF izvoda" }
   ```

Putanja u `src` je od korijena sajta (Next.js `public/`), pa
`public/uputstva/x.png` postaje `/uputstva/x.png`.

`opis` je opcion (prikazuje se kao potpis ispod slike i kao alt tekst).
