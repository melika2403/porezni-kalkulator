// Šifarnik slotova za reklame promotera. Frontend ima ogledalo u
// src/data/partner.ts: novi ključ se dodaje na OBA mjesta, pa tek onda
// <ReklamaStub>/<ReklamaInline>/<ReklamaBaner> na stranicu.

// Pozicije na stranici (vidi mockupe AMS-1035):
//  - SIDEBAR_LIJEVO / SIDEBAR_DESNO: visoki stubovi pored obrasca (široki ekrani)
//  - INLINE: mala kartica "Sponzorisano" unutar obrasca
//  - DUGME: "Preuzimanje omogućila <brend>" na dugmetu za preuzimanje PDF-a
//  - MODAL: sponzorisana poruka u prozoru "Vaš obrazac je spreman"
//  - BANER: veliki baner, SAMO na početnoj ispod Pretplata (najveća pozicija)
//  - BANER_ISPOD: baner ispod obrasca na alatima, vodičima i raspravama;
//    glavno mjesto na mobitelu (bočnih stubova tamo nema)
//  - SPONZOR: "Uz podršku <brend>" na vodiču ili vijesti koju banka sponzoriše
//    (bira se u admin editoru teksta, ne u portalu)
const POZICIJE = [
  "SIDEBAR_LIJEVO",
  "SIDEBAR_DESNO",
  "INLINE",
  "DUGME",
  "MODAL",
  "BANER",
  "BANER_ISPOD",
  "SPONZOR",
];

// Pozicije koje partner bira na kreativi (SPONZOR dodjeljuje admin na tekstu)
const POZICIJE_KREATIVE = POZICIJE.filter((p) => p !== "SPONZOR");

// Stranice koje imaju slotove. "*" u reklami = sve ove. Porezna kartica i
// ostali plaćeni dijelovi namjerno nemaju reklame.
const STRANICE = [
  "pocetna",
  "ams",
  "spr",
  "gpd",
  "zo3",
  "pozajmica",
  "pdv",
  "neto_bruto",
  "sifre_djelatnosti",
  "sifre_zanimanja",
  "javni_prihodi",
  "vijesti",
  "vodici",
  "rasprave",
];

// Periodi poreznih rokova (FBiH) za kampanje "pojačano pred rokove": kreativa
// sa tim rokom dobija FAKTOR_ROKA puta veću težinu u rotaciji dok period traje.
//  - MJESECNI: 1. do 10. u mjesecu (doprinosi, porez na dohodak, PDV za
//    prethodni mjesec)
//  - GODISNJI: 1.1. do 31.3. (GPD-1051 i SPR-1053 za prethodnu godinu)
const ROKOVI = {
  MJESECNI: (d) => d.dan <= 10,
  GODISNJI: (d) => d.mjesec <= 3,
};
const FAKTOR_ROKA = 3;

// Nazivi za CSV i PDF izvještaj (frontend ima svoje u src/data/partner.ts)
const NAZIVI_POZICIJA = {
  SIDEBAR_LIJEVO: "Bočni stub lijevo",
  SIDEBAR_DESNO: "Bočni stub desno",
  INLINE: "Kartica u obrascu",
  BANER: "Veliki baner na početnoj",
  BANER_ISPOD: "Baner ispod obrasca",
  DUGME: "Dugme za preuzimanje",
  MODAL: "Poruka poslije preuzimanja",
  SPONZOR: "Sponzorisan tekst",
};
const NAZIVI_STRANICA = {
  pocetna: "Početna",
  ams: "AMS-1035",
  spr: "SPR-1053",
  gpd: "GPD-1051",
  zo3: "ZO-3",
  pozajmica: "Ugovor o pozajmici",
  pdv: "PDV kalkulator",
  neto_bruto: "Preračun neto/bruto",
  sifre_djelatnosti: "Šifre djelatnosti",
  sifre_zanimanja: "Šifre zanimanja",
  javni_prihodi: "Javni prihodi",
  vijesti: "Vijesti",
  vodici: "Vodiči",
  rasprave: "Rasprave",
};

module.exports = {
  POZICIJE,
  POZICIJE_KREATIVE,
  STRANICE,
  ROKOVI,
  FAKTOR_ROKA,
  NAZIVI_POZICIJA,
  NAZIVI_STRANICA,
};
