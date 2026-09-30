// Šifarnik slotova za reklame promotera. Frontend ima ogledalo u
// src/data/reklame.ts: novi ključ se dodaje na OBA mjesta, pa tek onda
// <ReklamaSlot> na stranicu.

// Pozicije na stranici (vidi mockupe AMS-1035):
//  - SIDEBAR_LIJEVO / SIDEBAR_DESNO: visoki stubovi pored obrasca (široki ekrani)
//  - INLINE: mala kartica "Sponzorisano" unutar obrasca
//  - DUGME: "Preuzimanje omogućila <brend>" na dugmetu za preuzimanje PDF-a
//  - MODAL: sponzorisana poruka u prozoru "Vaš obrazac je spreman"
const POZICIJE = ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO", "INLINE", "DUGME", "MODAL"];

// Stranice koje imaju slotove. "*" u reklami = sve ove.
const STRANICE = ["ams", "spr", "gpd", "vijesti"];

module.exports = { POZICIJE, STRANICE };
