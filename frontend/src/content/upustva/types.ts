// Tipizirani sadržaj upustava (klijentu okrenut tutorijal po stranici).
// Namjerno bez markdowna: puna kontrola nad PK stilom, bez novog dependencyja.
// Izvor istine za funkcionalnost je docs/pk-office-funkcionalnosti.md; ovo je
// uglađena, korak-po-korak verzija za krajnjeg korisnika.

export type Blok =
  | { t: "p"; text: string }
  | { t: "koraci"; stavke: string[] }
  | { t: "savjet"; text: string }
  | { t: "upozorenje"; text: string }
  // Slika iz public/ foldera (npr. "/uputstva/izvod-upload.png"), sa opisom.
  | { t: "slika"; src: string; opis?: string };

export type Sekcija = { naslov: string; blokovi: Blok[] };

export type Pitanje = { p: string; o: string };

export type Upustvo = {
  /** Naslov u zaglavlju panela, npr. "Bankovni izvodi". */
  naslov: string;
  /** Jedna rečenica: čemu stranica služi. */
  podnaslov: string;
  sekcije: Sekcija[];
  /** Detaljna pitanja i rubni slučajevi. */
  faq: Pitanje[];
};
