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
export function clanPlate(bruto: string, neto: string, ziro: string): string {
  const start = `Osnovna bruto plaća Radnika za puni fond radnih sati iznosi ${bruto} KM mjesečno`;
  const netoPart = neto ? `, što odgovara neto iznosu od ${neto} KM` : "";
  const ziroPart = ziro
    ? ` Plaća se isplaćuje na transakcijski račun Radnika broj ${ziro}.`
    : "";
  const end =
    " Radnik ima pravo na naknade i dodatke u skladu sa Zakonom o radu, kolektivnim ugovorom i poreznim propisima Federacije BiH.";
  return `${start}${netoPart}.${ziroPart}${end}`;
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

// Auto-broj ugovora se sad uzima iz backend-a po organizaciji+godini
// (vidi peekContractNumber / takeContractNumber u src/api/profile.ts).
