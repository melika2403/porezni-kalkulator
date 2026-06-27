// ──────────────────────────────────────────────────────────────────────────────
//  Nalog za knjiženje plate — mapiranje mjesečnog obračuna na konta (duguje /
//  potražuje) i grupisanje po kontu. Bruto se NE knjiži kao zaseban red, plata
//  ide razloženo po stavkama.
//
//  POTRAŽNA strana (obaveze) je uvijek PO FONDU: doprinosi iz + na osnovicu se
//  saberu po vrsti (PIO/zdravstvo/nezaposlenost) na 452xxx.
//
//  DUGOVNA strana (trošak) ima dva moda:
//   - default ("po nosiocu"): svi doprinosi iz osnovice (radnik) na jedan konto
//     (520-0100), svi na osnovicu (poslodavac) na drugi (520-0200). Prati
//     Obrazac 2001 (red 17 → 520010, red 23 → 520020).
//   - "po fondu" (splitByContribution=true): doprinosi razdvojeni PIO/zdravstvo/
//     nezaposlenost kao i potražna strana.
//
//  Konto format: XXX-XXXX (npr. 4520 → 452-0000, 4522 → 452-2000).
//  Default konta su standardna agencijska konvencija; korisnik (agencija) ih
//  može prepraviti, izmjene se pamte na nivou korisnika i vrijede za sve njegove
//  organizacije. Prikaz se grupiše po kontu: ako dvije stavke dijele isto konto,
//  spoje se u jedan red (otud lijeva i desna strana mogu imati različit broj
//  redova, a SUMA duguje uvijek = SUMA potražuje).
// ──────────────────────────────────────────────────────────────────────────────

// d = trošak (duguje), p = obaveza (potražuje).
const DEFAULT_POSTING_ACCOUNTS = {
  neto: { d: "520-1000", p: "450-0000" },
  pio: { d: "520-2000", p: "452-0000" },
  zdravstvo: { d: "520-3000", p: "452-2000" },
  nezaposlenost: { d: "520-4000", p: "452-4000" },
  porez: { d: "555-0002", p: "451-0000" },
  nesrece: { d: "555-1000", p: "451-2000" },
  vodna: { d: "555-2000", p: "451-4000" },
  invalidi: { d: "555-8000", p: "451-7000" },
  topli: { d: "524-0000", p: "456-1000" },
  putni: { d: "524-2000", p: "456-2000" },
  regres: { d: "524-3000", p: "456-3000" },
  // Korist u naravi (službeno vozilo): nenovčani "neto" dio koristi (vrijednost
  // koja se ne isplaćuje radniku). Doprinosi i porez koristi su već u svojim
  // redovima. d = trošak plaće u naravi, p = protustavka (prihod od date koristi
  // ili potraživanje od radnika — agencija prilagodi po svom kontnom planu;
  // ovo su placeholder default konta). Da li je priznat/nepriznat rashod bira
  // agencija izborom konta.
  korist: { d: "520-5000", p: "679-0000" },
  // Dugovna-only (mod "po nosiocu"): zbirna konta doprinosa po nosiocu tereta.
  doprinosiRadnik: { d: "520-0100", p: null },
  doprinosiPoslodavac: { d: "520-0200", p: null },
};

// Stavke sa potražnom stranom (obaveze po fondu). Redoslijed = redoslijed na nalogu.
const POSTING_ITEMS = [
  { key: "neto", label: "Neto plata" },
  { key: "pio", label: "Doprinos PIO/MIO" },
  { key: "zdravstvo", label: "Doprinos zdravstveno osiguranje" },
  { key: "nezaposlenost", label: "Doprinos osiguranje od nezaposlenosti" },
  { key: "porez", label: "Porez na dohodak" },
  { key: "nesrece", label: "Naknada za zaštitu od nesreća" },
  { key: "vodna", label: "Opća vodna naknada" },
  { key: "invalidi", label: "Fond za rehabilitaciju i zapošljavanje OSI" },
  { key: "topli", label: "Topli obrok" },
  { key: "putni", label: "Prevoz na posao" },
  { key: "regres", label: "Regres za godišnji odmor" },
  { key: "korist", label: "Korist u naravi (službeno vozilo)" },
];

// Dodatne dugovne stavke za mod "po nosiocu".
const BURDEN_DEBIT_ITEMS = [
  {
    key: "doprinosiRadnik",
    label: "Doprinosi iz osnovice (na teret osiguranika)",
  },
  {
    key: "doprinosiPoslodavac",
    label: "Doprinosi na osnovicu (na teret poslodavca)",
  },
];

const LABELS = Object.fromEntries(
  [...POSTING_ITEMS, ...BURDEN_DEBIT_ITEMS].map((i) => [i.key, i.label]),
);

// Redoslijed dugovnih stavki u modu "po nosiocu" (doprinosi zbirno po nosiocu).
const PO_NOSIOCU_DEBIT_ORDER = [
  "neto",
  "doprinosiRadnik",
  "doprinosiPoslodavac",
  "porez",
  "nesrece",
  "vodna",
  "invalidi",
  "topli",
  "putni",
  "regres",
  "korist",
];

const round2 = (n) => +Number(n || 0).toFixed(2);

// Spaja default konta sa korisnikovim izmjenama (override po ključu i strani).
function resolveAccounts(overrides) {
  const out = {};
  for (const key of Object.keys(DEFAULT_POSTING_ACCOUNTS)) {
    const def = DEFAULT_POSTING_ACCOUNTS[key];
    const ov = (overrides && overrides[key]) || {};
    out[key] = {
      d: (ov.d && String(ov.d).trim()) || def.d,
      p: (ov.p && String(ov.p).trim()) || def.p || null,
    };
  }
  return out;
}

// Iznosi stavki iz mjesečnih agregata. Po fondu: iz + na osnovicu zajedno.
function amountsFromTotals(t) {
  return {
    neto: round2(t.net),
    pio: round2((t.empPio || 0) + (t.erpPio || 0)),
    zdravstvo: round2((t.empZdr || 0) + (t.erpZdr || 0)),
    nezaposlenost: round2((t.empNezap || 0) + (t.erpNezap || 0)),
    porez: round2(t.porez),
    nesrece: round2(t.nesrece),
    vodna: round2(t.vodna),
    invalidi: round2(t.invalidi),
    topli: round2(t.meal),
    putni: round2(t.travel),
    regres: round2(t.regres),
    korist: round2(t.koristNonCash),
  };
}

// Gradi nalog: redovi grupisani po kontu + sume.
// splitByContribution=false (default) → dugovna po nosiocu (520-0100/520-0200).
// splitByContribution=true → dugovna po fondu (kao potražna).
function buildPostingOrder(totals, overrides, splitByContribution = false) {
  const acc = resolveAccounts(overrides);
  const amounts = amountsFromTotals(totals);

  const debitByKonto = new Map();
  const creditByKonto = new Map();
  const labelsByKonto = new Map(); // konto → [naziv stavke, ...]
  const add = (map, konto, amt) => {
    if (!konto) return;
    map.set(konto, round2((map.get(konto) || 0) + amt));
  };
  const addLabel = (konto, label) => {
    if (!konto) return;
    const arr = labelsByKonto.get(konto) || [];
    if (!arr.includes(label)) arr.push(label);
    labelsByKonto.set(konto, arr);
  };

  // ── Potražna (obaveze), uvijek po fondu ──
  for (const { key, label } of POSTING_ITEMS) {
    const iznos = amounts[key];
    if (iznos === 0) continue; // negativne korekcije (npr. povrat) ostaju
    add(creditByKonto, acc[key].p, iznos);
    addLabel(acc[key].p, label);
  }

  // ── Dugovna (trošak) ──
  if (splitByContribution) {
    // Po fondu (kao potražna).
    for (const { key, label } of POSTING_ITEMS) {
      const iznos = amounts[key];
      if (iznos === 0) continue; // negativne korekcije (npr. povrat) ostaju
      add(debitByKonto, acc[key].d, iznos);
      addLabel(acc[key].d, label);
    }
  } else {
    // Po nosiocu: doprinosi zbirno radnik (iz osnovice) / poslodavac (na osnovicu).
    const radnik = round2(
      (totals.empPio || 0) + (totals.empZdr || 0) + (totals.empNezap || 0),
    );
    const poslodavac = round2(
      (totals.erpPio || 0) + (totals.erpZdr || 0) + (totals.erpNezap || 0),
    );
    const debitAmount = (key) =>
      key === "doprinosiRadnik"
        ? radnik
        : key === "doprinosiPoslodavac"
          ? poslodavac
          : amounts[key];
    for (const key of PO_NOSIOCU_DEBIT_ORDER) {
      const iznos = debitAmount(key);
      if (iznos === 0) continue; // negativne korekcije (npr. povrat) ostaju
      add(debitByKonto, acc[key].d, iznos);
      addLabel(acc[key].d, LABELS[key]);
    }
  }

  // Redovi po kontu, sortirani po šifri. Svako konto je dugovno (5xx) ili
  // potražno (4xx), pa svaki red ima iznos u jednoj koloni.
  const kontoNum = (k) => Number(String(k).replace(/\D/g, "")) || 0;
  const allKonta = new Set([...debitByKonto.keys(), ...creditByKonto.keys()]);
  const rows = [...allKonta]
    .sort((a, b) => kontoNum(a) - kontoNum(b))
    .map((konto) => ({
      konto,
      opis: (labelsByKonto.get(konto) || []).join(", "),
      duguje: debitByKonto.get(konto) || 0,
      potrazuje: creditByKonto.get(konto) || 0,
    }))
    // Konto koje se izbalansira na 0 (npr. + i - na istom kontu) ne prikazuj.
    .filter((r) => r.duguje !== 0 || r.potrazuje !== 0);

  const sumaDuguje = round2(
    [...debitByKonto.values()].reduce((s, v) => s + v, 0),
  );
  const sumaPotrazuje = round2(
    [...creditByKonto.values()].reduce((s, v) => s + v, 0),
  );

  return {
    rows,
    sumaDuguje,
    sumaPotrazuje,
    balanced: Math.abs(sumaDuguje - sumaPotrazuje) < 0.01,
  };
}

module.exports = {
  DEFAULT_POSTING_ACCOUNTS,
  POSTING_ITEMS,
  BURDEN_DEBIT_ITEMS,
  PO_NOSIOCU_DEBIT_ORDER,
  resolveAccounts,
  buildPostingOrder,
};
