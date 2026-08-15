// Imena AcroForm polja u šablonu PK-1001.pdf.
//
// Imena su uglavnom automatska ("undefined_N") jer ih je tako generisao alat
// kojim je obrazac napravljen, pa je mapa izvedena iz KOORDINATA polja i
// provjerena red po red. Ne mijenjati napamet; mapa je zapisana i u
// docs/pk1001-porezna-kartica.md, a backend/test/pk1001Polja.test.js provjerava
// da svako ime ovdje zaista postoji u šablonu i da prima vrijednost.
//
// Fajl je NAMJERNO bez importa, da ga backend testovi učitaju direktno
// (Node type-stripping).

// Redovi po dijelovima: [jmb, ime, iznos_cijeli, iznos_dec, srodstvo, udio,
// koef_cijeli, koef_dec]. Prazan string znači da te kolone nema na obrascu.
export type RedPolja = {
  jmb: string;
  ime: string;
  iznosCijeli: string;
  iznosDec: string;
  srodstvo: string;
  udio: string;
  koefCijeli: string;
  koefDec: string;
};

const red = (
  jmb: string,
  ime: string,
  iznosCijeli: string,
  iznosDec: string,
  srodstvo: string,
  udio: string,
  koefCijeli: string,
  koefDec: string,
): RedPolja => ({ jmb, ime, iznosCijeli, iznosDec, srodstvo, udio, koefCijeli, koefDec });

// Dio 3: bračni drug (1 red). Polje iznosa je u šablonu greškom nazvano
// "Dio 4  Podaci o izdržavanoj djeci", ali stoji u redu Dijela 3.
export const RED_BRACNI: RedPolja[] = [
  red("a JMB", "b Prezime i ime", "Dio 4  Podaci o izdržavanoj djeci", "undefined_6", "", "u", "Koeficodbitka", "undefined_7"),
];

// Dio 4: djeca (5 redova)
export const RED_DJECA: RedPolja[] = [
  red("a JMB_2.0", "b Prezime i ime_2", "c Vlastiti prihod", "undefined_8", "", "u_2", "Koeficodbitka_2", "undefined_9"),
  red("a JMB_2.1", "b Prezime i ime_3", "undefined_11", "undefined_12", "", "undefined_13", "undefined_14", "undefined_15"),
  red("a JMB_2.2", "b Prezime i ime_4", "undefined_17", "undefined_18", "", "undefined_19", "undefined_20", "undefined_21"),
  red("a JMB_2.3", "b Prezime i ime_5", "undefined_23", "undefined_24", "", "undefined_25", "undefined_26", "undefined_27"),
  red("a JMB_2.4", "b Prezime i ime_6", "undefined_29", "undefined_30", "", "undefined_31", "undefined_32", "undefined_33"),
];

// Dio 5: ostali izdržavani članovi uže porodice (4 reda)
export const RED_OSTALI: RedPolja[] = [
  red("a JMB_3", "b Prezime i ime_7", "c Vlastiti prihod_2", "undefined_34", "d Srodstvo", "u_3", "Koeficodbitka_3", "undefined_35"),
  red("undefined_36", "b Prezime i ime_8", "undefined_37", "undefined_38", "d Srodstvo_2", "undefined_39", "undefined_40", "undefined_41"),
  red("undefined_42", "b Prezime i ime_9", "undefined_43", "undefined_44", "d Srodstvo_3", "undefined_45", "undefined_46", "undefined_47"),
  red("undefined_48", "b Prezime i ime_10", "undefined_49", "undefined_50", "d Srodstvo_4", "undefined_51", "undefined_52", "undefined_53"),
];

// Dio 6: lica za koja se plaća alimentacija (4 reda); iznos = mjesečna alimentacija
export const RED_ALIMENTACIJE: RedPolja[] = [
  red("a JMB_4", "b Prezime i ime_11", "alimentacije", "undefined_54", "d Srodstvo_5", "u_4", "Koefic odbitka", "undefined_55"),
  red("undefined_56", "b Prezime i ime_12", "undefined_57", "undefined_58", "d Srodstvo_6", "undefined_59", "undefined_60", "undefined_61"),
  red("undefined_62", "b Prezime i ime_13", "undefined_63", "undefined_64", "d Srodstvo_7", "undefined_65", "undefined_66", "undefined_67"),
  red("undefined_68", "b Prezime i ime_14", "undefined_69", "undefined_70", "d Srodstvo_8", "undefined_71", "undefined_72", "undefined_73"),
];

// Dio 7: invalidnost (3 reda, nema kolone prihoda)
export const RED_INVALIDNOST: RedPolja[] = [
  red("a JMB_5", "b Prezime i ime_15", "", "", "d Srodstvo_9", "u_5", "Koefic odbitka_2", "undefined_74"),
  red("undefined_75", "b Prezime i ime_16", "", "", "d Srodstvo_10", "undefined_76", "undefined_77", "undefined_78"),
  red("undefined_79", "b Prezime i ime_17", "", "", "d Srodstvo_11", "undefined_80", "undefined_81", "undefined_82"),
];

// Dio 8 i 9
export const POLJE_UKUPAN_KOEF = "Text1";
export const POLJE_DATUM_PRIMJENE = [
  "odbitka poreznog obveznika zbir koeficijenata iz dijela 3 do 8",
  "undefined_83",
  "undefined_84",
];
export const POLJE_DATUM_PODNOSENJA = ["Datum podnošenja", "undefined_85", "undefined_86"];
