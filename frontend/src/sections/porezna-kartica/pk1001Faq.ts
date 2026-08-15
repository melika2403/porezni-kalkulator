// Česta pitanja o poreznoj kartici. Jedan izvor za dvije upotrebe: vidljivi
// akordeon na stranici i FAQPage JSON-LD za pretraživače, da se sadržaj ne
// razlazi između onoga što korisnik vidi i onoga što Google indeksira.

export type FaqStavka = { q: string; a: string };

export const PK1001_FAQ: FaqStavka[] = [
  {
    q: "Ko podnosi zahtjev za poreznu karticu?",
    a: "Zahtjev podnosi sam porezni obveznik, dakle radnik, svojoj nadležnoj ispostavi Porezne uprave FBiH. Poslodavac ili knjigovođa mu obično popuni obrazac, ali potpis i predaja su na radniku.",
  },
  {
    q: "Koja je razlika između obrasca PK-1001 i PK-1002?",
    a: "PK-1001 je zahtjev za izdavanje porezne kartice koji podnosi radnik, a PK-1002 je sama porezna kartica koju Porezna uprava izdaje na osnovu tog zahtjeva. Poslodavac čuva karticu PK-1002 dok traje radni odnos.",
  },
  {
    q: "Koliki su koeficijenti ličnog odbitka u FBiH?",
    a: "Osnovni lični odbitak je 300 KM mjesečno i njemu odgovara koeficijent 1,0. Izdržavani bračni drug nosi 0,5, prvo dijete 0,5, drugo dijete 0,7, treće i svako dalje dijete 0,9, ostali izdržavani članovi uže porodice 0,3, a vlastita invalidnost ili invalidnost izdržavanog člana 0,3. Mjesečni lični odbitak je ukupan koeficijent pomnožen sa 300 KM.",
  },
  {
    q: "Ko se ne može navesti kao izdržavani član?",
    a: "Član koji ima vlastiti mjesečni prihod veći od 300 KM, dakle veći od osnovnog ličnog odbitka. U taj prihod ulaze penzija, invalidski dodaci, alimentacija i druga lična primanja. To pravilo vrijedi i za bračnog druga i za djecu.",
  },
  {
    q: "Kako se dijeli koeficijent kad dijete izdržavaju oba roditelja?",
    a: "U zahtjev se upisuje udio u izdržavanju u procentima, a koeficijent se srazmjerno umanjuje. Kod omjera 50 prema 50 prvo dijete nosi koeficijent 0,25 umjesto 0,5.",
  },
  {
    q: "Vrijedi li lični odbitak unazad?",
    a: "Ne. Lični odbitak se primjenjuje od datuma izdavanja porezne kartice, pa zahtjev treba predati odmah pri zaposlenju ili odmah po promjeni okolnosti, a ne na kraju godine.",
  },
  {
    q: "Šta se radi kad se rodi dijete ili se promijene okolnosti?",
    a: "Podnosi se novi zahtjev PK-1001 sa označenom opcijom Izmjena. Zahtjev je uvijek potpuna slika stanja, ne dopuna: navode se svi izdržavani članovi koji vrijede u tom trenutku, a ko se skida sa kartice jednostavno se ne upisuje. Porezna uprava zatim izdaje novu karticu, a novi koeficijent vrijedi od datuma izdavanja.",
  },
  {
    q: "Koji dokumenti se prilažu uz zahtjev?",
    a: "Dokaz o prebivalištu (CIPS prijava), a za svakog izdržavanog člana odgovarajući dokaz: izvod iz matične knjige rođenih ili vjenčanih, potvrda o nezaposlenosti ili prihodima, rješenje o invalidnosti, sudsko rješenje o alimentaciji.",
  },
  {
    q: "Koliko košta izdavanje porezne kartice?",
    a: "Porezna kartica se izdaje bez naknade, na osnovu dokumentovanog zahtjeva podnesenog nadležnoj ispostavi Porezne uprave FBiH.",
  },
  {
    q: "Šta poslodavac radi sa karticom?",
    a: "Poslodavac karticu čuva dok traje radni odnos i koeficijent sa nje koristi u mjesečnom obračunu plate. Kod prestanka radnog odnosa karticu vraća radniku.",
  },
  {
    q: "Šta ako je u obračunu korišten pogrešan koeficijent?",
    a: "Obračuni se moraju ispraviti, a korekcija se prijavljuje Poreznoj upravi za svakog radnika pojedinačno. Zato je najsigurnije da koeficijent iz kartice bude upisan u karton radnika, što aplikacija nudi jednim klikom.",
  },
];

// Isti sadržaj kao FAQPage strukturirani podaci.
export const pk1001FaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PK1001_FAQ.map((s) => ({
    "@type": "Question",
    name: s.q,
    acceptedAnswer: { "@type": "Answer", text: s.a },
  })),
};
