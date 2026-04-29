/* ─────────────────────────────────────────────────────────────────────────────
   Konvertor brojčanog iznosa u tekst (bosanski)
   Pokriva 0–999,999,999.99 — više nego dovoljno za UoD.
   Format izlaza: "hiljadu sto dvadeset dva KM i 08/100"
   ──────────────────────────────────────────────────────────────────────────── */

const ONES = [
  "nula", "jedan", "dva", "tri", "četiri", "pet", "šest", "sedam", "osam", "devet",
  "deset", "jedanaest", "dvanaest", "trinaest", "četrnaest",
  "petnaest", "šesnaest", "sedamnaest", "osamnaest", "devetnaest",
];

const TENS = ["", "", "dvadeset", "trideset", "četrdeset", "pedeset", "šezdeset", "sedamdeset", "osamdeset", "devedeset"];

const HUNDREDS = ["", "sto", "dvjesto", "tristo", "četiristo", "petsto", "šeststo", "sedamsto", "osamsto", "devetsto"];

// Convert 0–999 to words. femGender=true uses feminine forms (for "hiljada/hiljade")
function below1000(n: number, femGender: boolean = false): string {
  if (n === 0) return "";
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(HUNDREDS[Math.floor(n / 100)]);
    n = n % 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]);
    n = n % 10;
  }
  if (n > 0) {
    if (femGender && n === 1) parts.push("jedna");
    else if (femGender && n === 2) parts.push("dvije");
    else parts.push(ONES[n]);
  }
  return parts.join(" ");
}

function thousandsPart(n: number): string {
  if (n === 0) return "";
  if (n === 1) return "hiljadu"; // singular feminine accusative
  // 2-4 → "X hiljade", 5+ → "X hiljada"
  // For numbers ending in 21 etc, last digit determines plural form
  const last2 = n % 100;
  const last1 = n % 10;
  let suffix: string;
  if (last2 >= 11 && last2 <= 14) suffix = "hiljada";
  else if (last1 >= 2 && last1 <= 4) suffix = "hiljade";
  else if (last1 === 1) suffix = "hiljada"; // 21, 31, ... hiljada
  else suffix = "hiljada";
  return `${below1000(n, true)} ${suffix}`.trim();
}

function millionsPart(n: number): string {
  if (n === 0) return "";
  if (n === 1) return "milion";
  const last2 = n % 100;
  const last1 = n % 10;
  let suffix: string;
  if (last2 >= 11 && last2 <= 14) suffix = "miliona";
  else if (last1 >= 2 && last1 <= 4) suffix = "miliona";
  else suffix = "miliona";
  return `${below1000(n)} ${suffix}`.trim();
}

function toWords(n: number): string {
  if (n === 0) return "nula";
  const parts: string[] = [];
  if (n >= 1_000_000) {
    parts.push(millionsPart(Math.floor(n / 1_000_000)));
    n = n % 1_000_000;
  }
  if (n >= 1000) {
    parts.push(thousandsPart(Math.floor(n / 1000)));
    n = n % 1000;
  }
  if (n > 0) {
    parts.push(below1000(n));
  }
  return parts.filter(Boolean).join(" ").trim();
}

export function iznosUSlova(amount: number): string {
  if (!isFinite(amount) || amount < 0) return "";
  const integer = Math.floor(amount);
  const decimals = Math.round((amount - integer) * 100);
  const intWords = toWords(integer);
  const intCapitalized = intWords.charAt(0).toUpperCase() + intWords.slice(1);
  if (decimals === 0) {
    return `${intCapitalized} KM`;
  }
  return `${intCapitalized} KM i ${String(decimals).padStart(2, "0")}/100`;
}
