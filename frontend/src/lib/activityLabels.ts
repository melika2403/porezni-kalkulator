// Mašinski kod akcije → čitljiv naziv, DIJELJENO za admin ekrane (Aktivnost i
// kontrolna tabla). Ranije je svaki ekran imao svoju kopiju mape, pa je novi
// događaj negdje ostajao kao goli kod (npr. NALOG_STAMPA_GENERATE).
// Napomena: profil korisnika (Profil.tsx ACT_NAMES) namjerno ima KRAĆE nazive
// jer ih čita krajnji korisnik, pa ta mapa ostaje zasebna.
export const ACTION_LABELS: Record<string, string> = {
  AMS_GENERATE: "AMS-1035",
  SPR_GENERATE: "SPR-1053",
  GPD_GENERATE: "GPD-1051",
  ZO3_GENERATE: "ZO3 obrazac",
  PLDI_GENERATE: "PLDI-1043 (amortizacija)",
  SIH_GENERATE: "Šihterica",
  JS3100_GENERATE: "JS3100 prijava/odjava",
  PLATA_GENERATE: "Obračun plata",
  UGOVOR_RADU_GENERATE: "Ugovor o radu",
  OTKAZ_GENERATE: "Otkaz ugovora",
  UGOVOR_DJELU_GENERATE: "Ugovor o djelu",
  UGOVOR_POZAJMICA_GENERATE: "Ugovor o pozajmici",
  FAKTURA_GENERATE: "Faktura",
  PREDRACUN_GENERATE: "Predračun",
  KARTICA_GENERATE: "Članska kartica",
  RJESENJE_GENERATE: "Rješenja i odluke",
  RJESENJE_GO_GENERATE: "Rješenje (god. odmor)",
  CESIJA_GENERATE: "Ugovor o cesiji",
  KOMPENZACIJA_GENERATE: "Kompenzacija",
  // dokumenti obračuna plata i evidencije (dijeljeni generatori, pokrivaju
  // marketing, PK Office i bulk preuzimanja)
  OBRAZAC_2001_GENERATE: "Obrazac 2001 / 2001-A",
  OBRAZAC_2002_GENERATE: "Obrazac 2002",
  MIP_GENERATE: "MIP-1023",
  GIP_GENERATE: "GIP-1022",
  UPLATNICE_GENERATE: "Zbirne uplatnice",
  PLATNI_LISTIC_GENERATE: "Platni listić",
  NALOG_KNJIZENJE_GENERATE: "Nalog za knjiženje",
  LISTA_NALOGA_GENERATE: "Lista naloga za plaćanje",
  IZVOZ_BANKA_GENERATE: "Izvoz naloga za e-bankarstvo",
  NALOG_STAMPA_GENERATE: "Štampa naloga na matrični pisač",
  NALOG_STAMPA_TEST: "Probna štampa (podešavanje pisača)",
  SPECIFIKACIJE_GENERATE: "Specifikacije plata",
  REKAPITULACIJA_GENERATE: "Rekapitulacija isplata",
  ISPLATE_PO_BANKAMA_GENERATE: "Isplate po bankama",
  SPISAK_BANKE_GENERATE: "Spisak za banku (XLSX)",
  PK1001_GENERATE: "Porezna kartica (PK-1001)",
  EVIDENCIJA_GENERATE: "Matična evidencija",
  // prijave korisnika (backend logEvent; ne ulaze u javni brojač dokumenata)
  PRIJAVA: "Prijava korisnika",
  // PK Office radne akcije (backend logEvent)
  OFFICE_IZVOD_UCITAN: "PK Office: izvod učitan",
  OFFICE_IZVOD_RUCNI: "PK Office: ručni izvod",
  OFFICE_ULAZNI_RACUN: "PK Office: ulazni račun",
  OFFICE_KALKULACIJA: "PK Office: kalkulacija",
  OFFICE_BLAGAJNA_NALOG: "PK Office: blagajnički nalog",
  OFFICE_PUTNI_NALOG: "PK Office: putni nalog",
  OFFICE_POPIS: "PK Office: popis (inventura)",
  OFFICE_PREBIJANJE: "PK Office: kompenzacija/cesija",
  // uvozi iz drugog programa (prelazak kod nas)
  UVOZ_RADNIKA: "Uvoz radnika iz CSV-a",
  UVOZ_PARTNERA: "Uvoz partnera (XML/CSV)",
  UVOZ_ARTIKALA: "Uvoz artikala (XML/CSV)",
  UVOZ_PLATA: "Uvoz prethodnih plata",
  UVOZ_POCETNO_STANJE: "Uvoz početnog stanja lagera",
  OFFICE_BACKFILL: "PK Office: tehnički zapis (backfill)",
  OFFICE_BACKFILL_V2: "PK Office: tehnički zapis (backfill v2)",
  // PK Freelancer (marketing i evidencija)
  FREELANCER_PROMO_KLIK: "PK Freelancer: klik na reklamu",
  FREELANCER_PROBA_START: "PK Freelancer: pokrenuta proba",
  FREELANCER_UPLATA_SACUVANA: "PK Freelancer: uplata sačuvana",
  FREELANCER_INTERES: "PK Freelancer: iskazan interes (staro)",
  FREELANCER_INTERES_KLIK: "PK Freelancer: klik na ponudu (staro)",
  OFFICE_SOLO_PROMO_KLIK: "PK Office Solo: klik na reklamu",
  OFFICE_PROMO_KLIK: "PK Office za knjigovođe: klik na reklamu",
  // Sigurnost naloga (dvofaktorska prijava)
  "2FA_UKLJUCEN": "Dvofaktorska prijava uključena",
  "2FA_ISKLJUCEN": "Dvofaktorska prijava isključena",
  "2FA_NEUSPJEH": "Dvofaktorska prijava: pogrešan kod",
  "2FA_NOVI_KODOVI": "Dvofaktorska prijava: novi rezervni kodovi",
  ADMIN_2FA_ISKLJUCEN: "Administrator isključio dvofaktorsku prijavu",
};
/** Čitljiv naziv akcije; nepoznat kod ostaje kakav jeste. */
export function nazivAkcije(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
