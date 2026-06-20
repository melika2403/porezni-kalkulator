// ──────────────────────────────────────────────────────────────────────────────
//  Nalog za knjiženje plate — mapiranje mjesečnog obračuna na konta (duguje /
//  potražuje) i grupisanje po kontu. Doprinosi iz i na osnovicu se sabiraju u
//  jednu stavku po vrsti (PIO, zdravstvo, nezaposlenost). Bruto se NE knjiži
//  kao zaseban red, plata ide razloženo po stavkama.
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
};

// Redoslijed stavki na nalogu + naziv koji se prikazuje.
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
];

const round2 = (n) => +Number(n || 0).toFixed(2);

// Spaja default konta sa korisnikovim izmjenama (override po ključu i strani).
function resolveAccounts(overrides) {
  const out = {};
  for (const { key } of POSTING_ITEMS) {
    const def = DEFAULT_POSTING_ACCOUNTS[key];
    const ov = (overrides && overrides[key]) || {};
    out[key] = {
      d: (ov.d && String(ov.d).trim()) || def.d,
      p: (ov.p && String(ov.p).trim()) || def.p,
    };
  }
  return out;
}

// Iznosi stavki iz mjesečnih agregata. Doprinosi: iz + na osnovicu zajedno.
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
  };
}

// Gradi nalog: stavke + redovi grupisani po kontu + sume.
function buildPostingOrder(totals, overrides) {
  const acc = resolveAccounts(overrides);
  const amounts = amountsFromTotals(totals);

  const debitByKonto = new Map();
  const creditByKonto = new Map();
  const labelsByKonto = new Map(); // konto → [naziv stavke, ...]
  const add = (map, konto, amt) =>
    map.set(konto, round2((map.get(konto) || 0) + amt));
  const addLabel = (konto, label) => {
    const arr = labelsByKonto.get(konto) || [];
    if (!arr.includes(label)) arr.push(label);
    labelsByKonto.set(konto, arr);
  };

  const stavke = [];
  for (const { key, label } of POSTING_ITEMS) {
    const iznos = amounts[key];
    if (iznos <= 0) continue;
    stavke.push({ key, label, iznos, duguje: acc[key].d, potrazuje: acc[key].p });
    add(debitByKonto, acc[key].d, iznos);
    add(creditByKonto, acc[key].p, iznos);
    addLabel(acc[key].d, label);
    addLabel(acc[key].p, label);
  }

  // Redovi po kontu, sortirani po šifri (4xxx prije 5xxx). Svako konto je ili
  // dugovno (5xx) ili potražno (4xx), pa svaki red ima iznos u jednoj koloni.
  // opis = naziv(i) stavke koje mapiraju na to konto (spojeni ako ih je više).
  const kontoNum = (k) => Number(String(k).replace(/\D/g, "")) || 0;
  const allKonta = new Set([...debitByKonto.keys(), ...creditByKonto.keys()]);
  const rows = [...allKonta]
    .sort((a, b) => kontoNum(a) - kontoNum(b))
    .map((konto) => ({
      konto,
      opis: (labelsByKonto.get(konto) || []).join(", "),
      duguje: debitByKonto.get(konto) || 0,
      potrazuje: creditByKonto.get(konto) || 0,
    }));

  const sumaDuguje = round2(
    [...debitByKonto.values()].reduce((s, v) => s + v, 0),
  );
  const sumaPotrazuje = round2(
    [...creditByKonto.values()].reduce((s, v) => s + v, 0),
  );

  return {
    stavke,
    rows,
    sumaDuguje,
    sumaPotrazuje,
    balanced: Math.abs(sumaDuguje - sumaPotrazuje) < 0.01,
  };
}

module.exports = {
  DEFAULT_POSTING_ACCOUNTS,
  POSTING_ITEMS,
  resolveAccounts,
  buildPostingOrder,
};
