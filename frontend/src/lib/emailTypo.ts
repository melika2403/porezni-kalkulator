// Prepoznavanje tipfelera u domenu email adrese (gmall.com, gmial.com,
// hotmial.com, gmail.con...). Vraća predloženu ispravnu adresu ili null.
// Samo prijedlog: nikad ne blokira unos, korisnik odlučuje.

const KNOWN_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.de",
  "outlook.com",
  "outlook.de",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.de",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mail.com",
  "email.com",
  "aol.com",
  "gmx.de",
  "gmx.net",
  "gmx.at",
  "web.de",
  "t-online.de",
  "bluewin.ch",
  "bih.net.ba",
  "tel.net.ba",
  "teol.net",
  "logosoft.ba",
];
const KNOWN_SET = new Set(KNOWN_DOMAINS);

// česti tipfeleri u završetku domena
const TLD_TYPOS: Record<string, string> = {
  con: "com",
  cmo: "com",
  ocm: "com",
  vom: "com",
  xom: "com",
  comm: "com",
  cpm: "com",
  cim: "com",
  coom: "com",
  nte: "net",
  ent: "net",
  nett: "net",
  ogr: "org",
  bs: "ba",
  baa: "ba",
};

/** Damerau-Levenshtein (optimal string alignment): zamjena susjednih slova je 1 korak. */
function distance(a: string, b: string): number {
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function closestKnown(domain: string): string | null {
  // kratki domeni (web.ba, gmx.at) su lako legitimni: tamo samo 1 slovo razlike
  const maxDist = domain.length <= 7 ? 1 : 2;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const known of KNOWN_DOMAINS) {
    const dist = distance(domain, known);
    if (dist < bestDist) {
      bestDist = dist;
      best = known;
    }
  }
  return best && bestDist > 0 && bestDist <= maxDist ? best : null;
}

/**
 * @returns predložena adresa (npr. "ana@gmail.com") ili null ako nema prijedloga
 */
export function suggestEmailFix(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  let domain = email.slice(at + 1);

  // zarez umjesto tačke, duple tačke, tačka na kraju
  domain = domain.replace(/,/g, ".").replace(/\.{2,}/g, ".").replace(/\.$/, "");
  if (!domain) return null;

  if (!KNOWN_SET.has(domain)) {
    // bez tačke: "gmailcom" ili samo "gmail"
    const exactOrClosest = (d: string) => (KNOWN_SET.has(d) ? d : closestKnown(d));
    const known =
      closestKnown(domain) ??
      exactOrClosest(domain.replace(/(com|net|de|ba)$/, ".$1")) ??
      (domain.includes(".") ? null : exactOrClosest(`${domain}.com`));
    if (known) {
      domain = known;
    } else {
      const dot = domain.lastIndexOf(".");
      if (dot > 0) {
        const tld = domain.slice(dot + 1);
        const fixedTld = TLD_TYPOS[tld];
        if (fixedTld) {
          const withTld = `${domain.slice(0, dot)}.${fixedTld}`;
          domain = closestKnown(withTld) ?? withTld;
        }
      }
      // gmail postoji samo kao gmail.com
      if (/^gmail\.(?!com$)/.test(domain)) domain = "gmail.com";
    }
  }

  const suggestion = `${local}@${domain}`;
  return suggestion === email ? null : suggestion;
}
