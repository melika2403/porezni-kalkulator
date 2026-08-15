// Šablonske rečenice i pomoćne funkcije koje sastavljamo iz forme i ubacujemo
// u placeholdere. Razlog: docxtemplater {{...}} placeholderi ne podržavaju
// ugnježdene vrijednosti, pa kompletne rečenice sklapa kod (sa pravopisno
// korektnim padežima i brojem mjeseci slovima).

export type TipUgovora = "neodredjeno" | "odredjeno";

export type TipPrestanka = "od_poslodavca" | "od_radnika" | "sporazumni";

export type TrajanjeJedinica = "mjeseci" | "godine";

export function formatDdMmYyyy(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y}.`;
}

// Genitivni oblik za "u trajanju od X mjeseca/mjeseci".
// 1, 2, 3, 4 (osim 11-19) → "mjeseca"; ostalo → "mjeseci".
function mjesecOblik(broj: number): string {
  const lastTwo = broj % 100;
  if (lastTwo >= 11 && lastTwo <= 19) return "mjeseci";
  const lastDigit = broj % 10;
  if (lastDigit >= 1 && lastDigit <= 4) return "mjeseca";
  return "mjeseci";
}

function godinaOblik(broj: number): string {
  // Max 3 godine, ali držimo se pravila: 1-4 → "godine", 5+ → "godina".
  const lastTwo = broj % 100;
  if (lastTwo >= 11 && lastTwo <= 19) return "godina";
  const lastDigit = broj % 10;
  if (lastDigit >= 1 && lastDigit <= 4) return "godine";
  return "godina";
}

export function trajanjeFormat(broj: number, jedinica: TrajanjeJedinica): string {
  if (broj <= 0) return "";
  const oblik = jedinica === "mjeseci" ? mjesecOblik(broj) : godinaOblik(broj);
  return `${broj} ${oblik}`;
}

export function trajanjeClan1(
  tip: TipUgovora,
  datumIstekaIso: string,
  trajanjeBroj?: number,
  trajanjeJedinica?: TrajanjeJedinica,
): string {
  if (tip === "neodredjeno") return "neodređeno vrijeme";
  const dat = formatDdMmYyyy(datumIstekaIso);
  const trajanjeTxt =
    trajanjeBroj && trajanjeJedinica ? trajanjeFormat(trajanjeBroj, trajanjeJedinica) : "";
  if (trajanjeTxt && dat) {
    return `određeno vrijeme, u trajanju od ${trajanjeTxt}, do ${dat} godine`;
  }
  if (trajanjeTxt) return `određeno vrijeme, u trajanju od ${trajanjeTxt}`;
  if (dat) return `određeno vrijeme, do ${dat} godine`;
  return "određeno vrijeme";
}

// Sastavlja cijeli tekst Člana 1.
//   Bez probnog: "Ugovor o radu zaključuje se na neodređeno vrijeme."
//                ili "...na određeno vrijeme, u trajanju od 6 mjeseci, do 14.11.2026. godine."
//   Sa probnim:  "Ugovor o probnom radu se zaključuje na period od 3 (tri) mjeseca,
//                počev od dana zasnivanja radnog odnosa."
//                (probni rad je sam po sebi ograničen — ne traži tip ugovora)
export function clan1Tekst(
  tip: TipUgovora,
  datumIstekaIso: string,
  probniRadEnabled: boolean,
  probniRadMjeseci: number,
  trajanjeBroj?: number,
  trajanjeJedinica?: TrajanjeJedinica,
): string {
  if (probniRadEnabled) {
    const n = Math.max(1, Math.min(6, Math.round(probniRadMjeseci || 3)));
    const slovima = MJESECI_SLOVIMA[n] ?? String(n);
    const oblik = n >= 5 ? "mjeseci" : "mjeseca";
    return `Ugovor o probnom radu se zaključuje na period od ${n} (${slovima}) ${oblik}, počev od dana zasnivanja radnog odnosa.`;
  }
  const trajanje = trajanjeClan1(tip, datumIstekaIso, trajanjeBroj, trajanjeJedinica);
  return `Ugovor o radu zaključuje se na ${trajanje}.`;
}

export function tipUgovoraRijec(tip: TipUgovora): string {
  return tip === "neodredjeno" ? "neodređeno" : "određeno";
}

const MJESECI_SLOVIMA: Record<number, string> = {
  1: "jedan",
  2: "dva",
  3: "tri",
  4: "četiri",
  5: "pet",
  6: "šest",
};

export function probniRadRecenica(enabled: boolean, mjeseci: number): string {
  if (!enabled) return "";
  const n = Math.max(1, Math.min(6, Math.round(mjeseci || 3)));
  const slovima = MJESECI_SLOVIMA[n] ?? String(n);
  const oblik = n >= 5 ? "mjeseci" : "mjeseca";
  return `Ugovara se probni rad u trajanju od ${n} (${slovima}) ${oblik}, počev od dana zasnivanja radnog odnosa.`;
}

// Vraća mapu brojeva članova {n4..n14} ovisno o tome je li probni rad
// uključen (tada je raspored 4..14) ili isključen (tada je raspored 3..13).
export function clanBrojevi(probniRadEnabled: boolean): Record<string, number> {
  const offset = probniRadEnabled ? 0 : -1;
  const out: Record<string, number> = {};
  for (let i = 4; i <= 14; i++) out[`n${i}`] = i + offset;
  return out;
}

// Sastavlja paragraf Člana o plati. Ako žiro nije unijet, izostavlja rečenicu
// o transakcijskom računu (umjesto praznog placeholdera u sredini rečenice).
export function clanPlate(
  bruto: string,
  neto: string,
  ziro: string,
  /** ugovoreno radno vrijeme u satima dnevno; 8 = puno radno vrijeme */
  satiDnevno = 8,
): string {
  // Kod nepunog radnog vremena plaća se NE odnosi na puni fond sati, pa bi
  // ta formulacija bila u suprotnosti sa Članom 5 istog ugovora.
  const n = Math.max(1, Math.min(8, Math.round(satiDnevno || 8)));
  const fond =
    n === 8
      ? "za puni fond radnih sati"
      : `za ugovoreno nepuno radno vrijeme od ${n} ${satOblik(n)} dnevno`;
  const start = `Osnovna bruto plaća Radnika ${fond} iznosi ${bruto} KM mjesečno`;
  const netoPart = neto ? `, što odgovara neto iznosu od ${neto} KM` : "";
  const ziroPart = ziro
    ? ` Plaća se isplaćuje na transakcijski račun Radnika broj ${ziro}.`
    : "";
  const end =
    " Radnik ima pravo na naknade i dodatke u skladu sa Zakonom o radu, kolektivnim ugovorom i poreznim propisima Federacije BiH.";
  return `${start}${netoPart}.${ziroPart}${end}`;
}

// Ugovoreno radno vrijeme (Član 5). Iste opcije kao u kartonu radnika
// (Worker.contractedHours, 1-8 sati dnevno); 8 sati je puno radno vrijeme,
// manje je nepuno pa se u ugovoru mora navesti i dnevni i sedmični fond.
export const RADNO_VRIJEME_OPCIJE = [
  { value: "8", label: "Puno radno vrijeme (8 sati dnevno, 40 sedmično)" },
  { value: "7", label: "Nepuno, 7 sati dnevno (35 sedmično)" },
  { value: "6", label: "Nepuno, 6 sati dnevno (30 sedmično)" },
  { value: "5", label: "Nepuno, 5 sati dnevno (25 sedmično)" },
  { value: "4", label: "Nepuno, 4 sata dnevno (20 sedmično)" },
  { value: "3", label: "Nepuno, 3 sata dnevno (15 sedmično)" },
  { value: "2", label: "Nepuno, 2 sata dnevno (10 sedmično)" },
  { value: "1", label: "Nepuno, 1 sat dnevno (5 sedmično)" },
];

// "1 sat", "2 sata", "5 sati" (uz brojeve 1-8 dovoljno je ovo pravilo).
function satOblik(broj: number): string {
  if (broj === 1) return "sat";
  return broj >= 2 && broj <= 4 ? "sata" : "sati";
}

export function clanRadnoVrijeme(satiDnevno: number): string {
  const n = Math.max(1, Math.min(8, Math.round(satiDnevno || 8)));
  const raspored =
    " Raspored radnog vremena određuje Poslodavac u skladu sa potrebama procesa rada.";
  if (n === 8) {
    return `Radnik će raditi puno radno vrijeme u trajanju od 40 sati sedmično.${raspored}`;
  }
  return `Radnik će raditi nepuno radno vrijeme u trajanju od ${n} ${satOblik(n)} dnevno, odnosno ${n * 5} sati sedmično.${raspored}`;
}

export function naslov2Otkaza(tip: TipPrestanka): string {
  switch (tip) {
    case "od_poslodavca":
      return "o otkazu ugovora o radu";
    case "od_radnika":
      return "o prestanku ugovora o radu";
    case "sporazumni":
      return "o sporazumnom prestanku ugovora o radu";
  }
}

export function nacinPrestanka(tip: TipPrestanka): string {
  switch (tip) {
    case "od_poslodavca":
      return "prestaje otkazom ugovora o radu od strane Poslodavca";
    case "od_radnika":
      return "prestaje otkazom ugovora o radu na zahtjev Radnika";
    case "sporazumni":
      return "prestaje sporazumnim raskidom ugovora o radu";
  }
}

// Razlozi prestanka ugovora o radu sa pripadnim članovima Zakona o radu FBiH
// (Sl. novine FBiH 26/16, 89/18, 44/22, 39/24 — prečišćeni tekst). Poredani po
// učestalosti u praksi (najčešći prvi).
export type RazlogOtkazaId =
  | "sporazumni"
  | "otkaz_poslodavac"
  | "otkaz_poslodavac_tehnoloski_visak"
  | "otkaz_radnik"
  | "istek_ugovora"
  | "penzija_65_15"
  | "penzija_40"
  | "nesposobnost"
  | "vanredni_poslodavac"
  | "pisano_upozorenje"
  | "vanredni_radnik"
  | "invalidnost"
  | "smrt"
  | "zatvor"
  | "drugo";

export interface RazlogOtkazaDef {
  id: RazlogOtkazaId;
  label: string;
  // Kratka rečenica za "Član 2" odluke — ime razloga + kratki opis.
  text: string;
  // Fraza koja se ubacuje u preambulu "Na osnovu __ Zakona o radu FBiH..."
  // Npr. "člana 96. stav (1) tačka a)". Bez perioda na kraju.
  pravnaOsnova: string;
  // Kratka referenca na član (za prikaz info badge-a u UI-ju).
  clan: string;
  // Pripadajući TipPrestanka (od_poslodavca / od_radnika / sporazumni).
  // Određuje naslov2 i nacin_prestanka u dokumentu. Smrt/penzija/istek
  // koriste "sporazumni" jer to daje neutralni naslov "o prestanku".
  tipPrestanka: TipPrestanka;
}

export const RAZLOZI_OTKAZA: RazlogOtkazaDef[] = [
  {
    id: "sporazumni",
    label: "Sporazumni prestanak ugovora o radu",
    text: "sporazumni prestanak ugovora o radu",
    pravnaOsnova: "člana 95.",
    clan: "Čl. 95",
    tipPrestanka: "sporazumni",
  },
  {
    id: "otkaz_poslodavac",
    label: "Otkaz od strane poslodavca (ekonomski/tehnički/organizacijski razlozi)",
    text: "otkaz od strane poslodavca iz ekonomskih, tehničkih ili organizacijskih razloga",
    pravnaOsnova: "člana 96. stav (1) tačka a)",
    clan: "Čl. 96 st. (1) tač. a)",
    tipPrestanka: "od_poslodavca",
  },
  {
    id: "otkaz_poslodavac_tehnoloski_visak",
    label: "Otkaz od strane poslodavca (tehnološki višak)",
    text: "otkaz od strane poslodavca jer je radnik postao tehnološki višak",
    pravnaOsnova: "člana 96. stav (1) tačka a)",
    clan: "Čl. 96 st. (1) tač. a)",
    tipPrestanka: "od_poslodavca",
  },
  {
    id: "otkaz_radnik",
    label: "Otkaz od strane radnika",
    text: "otkaz ugovora o radu na zahtjev radnika uz poštivanje otkaznog roka",
    pravnaOsnova: "člana 94. tačka f) i člana 105.",
    clan: "Čl. 94 tač. f) i čl. 105",
    tipPrestanka: "od_radnika",
  },
  {
    id: "istek_ugovora",
    label: "Istek ugovora na određeno vrijeme",
    text: "istek vremena na koje je zaključen ugovor o radu na određeno vrijeme",
    pravnaOsnova: "člana 94. tačka g)",
    clan: "Čl. 94 tač. g)",
    tipPrestanka: "sporazumni",
  },
  {
    id: "penzija_65_15",
    label: "Penzionisanje (65 god života + 15 god staža)",
    text: "navršenih 65 godina života i najmanje 15 godina staža osiguranja",
    pravnaOsnova: "člana 94. tačka c)",
    clan: "Čl. 94 tač. c)",
    tipPrestanka: "sporazumni",
  },
  {
    id: "penzija_40",
    label: "Penzionisanje (40 god staža osiguranja)",
    text: "navršenih 40 godina staža osiguranja",
    pravnaOsnova: "člana 94. tačka d)",
    clan: "Čl. 94 tač. d)",
    tipPrestanka: "sporazumni",
  },
  {
    id: "nesposobnost",
    label: "Nesposobnost radnika za obavljanje obaveza",
    text: "radnik nije u mogućnosti da izvršava svoje obaveze iz radnog odnosa",
    pravnaOsnova: "člana 96. stav (1) tačka b)",
    clan: "Čl. 96 st. (1) tač. b)",
    tipPrestanka: "od_poslodavca",
  },
  {
    id: "vanredni_poslodavac",
    label: "Vanredni otkaz (teža povreda radnih obaveza)",
    text: "vanredni otkaz zbog teže povrede radnih obaveza, bez obaveze poštivanja otkaznog roka",
    pravnaOsnova: "člana 97. stav (1)",
    clan: "Čl. 97 st. (1)",
    tipPrestanka: "od_poslodavca",
  },
  {
    id: "pisano_upozorenje",
    label: "Otkaz nakon pisanog upozorenja (lakša povreda)",
    text: "otkaz ugovora o radu nakon prethodnog pisanog upozorenja zbog ponovljene lakše povrede radnih obaveza",
    pravnaOsnova: "člana 97. stav (2)",
    clan: "Čl. 97 st. (2)",
    tipPrestanka: "od_poslodavca",
  },
  {
    id: "vanredni_radnik",
    label: "Vanredni otkaz od strane radnika (poslodavac odgovoran)",
    text: "vanredni otkaz od strane radnika jer je poslodavac odgovoran za povredu obaveza iz ugovora o radu",
    pravnaOsnova: "člana 99.",
    clan: "Čl. 99",
    tipPrestanka: "od_radnika",
  },
  {
    id: "invalidnost",
    label: "Invalidska penzija (gubitak radne sposobnosti)",
    text: "dostavljanje pravosnažnog rješenja o priznavanju prava na invalidsku penziju zbog gubitka radne sposobnosti",
    pravnaOsnova: "člana 94. tačka e)",
    clan: "Čl. 94 tač. e)",
    tipPrestanka: "sporazumni",
  },
  {
    id: "smrt",
    label: "Smrt radnika",
    text: "smrt radnika",
    pravnaOsnova: "člana 94. tačka a)",
    clan: "Čl. 94 tač. a)",
    tipPrestanka: "sporazumni",
  },
  {
    id: "zatvor",
    label: "Kazna zatvora duža od 3 mjeseca",
    text: "osuđivanje radnika na izdržavanje kazne zatvora u trajanju dužem od tri mjeseca",
    pravnaOsnova: "člana 94. tačka h)",
    clan: "Čl. 94 tač. h)",
    tipPrestanka: "sporazumni",
  },
  {
    id: "drugo",
    label: "Drugo (slobodan unos)",
    text: "",
    pravnaOsnova: "Zakona o radu",
    clan: "",
    tipPrestanka: "od_poslodavca",
  },
];

export function razlogById(id: RazlogOtkazaId): RazlogOtkazaDef | undefined {
  return RAZLOZI_OTKAZA.find((r) => r.id === id);
}

// Auto-broj ugovora se sad uzima iz backend-a po organizaciji+godini
// (vidi peekContractNumber / takeContractNumber u src/api/profile.ts).
