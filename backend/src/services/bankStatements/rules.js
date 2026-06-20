// Naučena pravila kategorizacije po organizaciji.
//
// Učenje: pri potvrdi stavke sa kategorijom upsert pravila
//   (protivračun ILI naziv protivstrane) + smjer → kategorija.
// Primjena: pri uploadu, naučeno pravilo ima prednost nad seed pravilima
// (korisnik je eksplicitno rekao šta ta protivstrana znači za NJEGOV obrt).

const { BankMatchRule } = require("../../models/index");
const { normalizeAccount } = require("./javniPrihodi");

function normalizeName(name) {
  return String(name || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);
}

/** Ključ pravila za transakciju: račun ima prednost nad nazivom. */
function ruleKeyFor(tx) {
  const account = normalizeAccount(tx.counterpartyAccount);
  if (account) return { matchType: "ACCOUNT", matchValue: account };
  const name = normalizeName(tx.counterpartyName);
  if (name) return { matchType: "NAME", matchValue: name };
  return null;
}

/**
 * Učitaj sva pravila organizacije i vrati funkciju za prijedlog.
 * @returns {Promise<(tx:{counterpartyAccount?:string,counterpartyName?:string,direction:string}) => string|null>}
 */
async function loadRuleSuggester(organizationId) {
  const rules = await BankMatchRule.findAll({
    where: { organizationId },
    raw: true,
  });
  const map = new Map();
  for (const r of rules) {
    map.set(`${r.matchType}|${r.matchValue}|${r.direction}`, r.category);
  }
  return (tx) => {
    const direction = String(tx.direction || "").toUpperCase();
    const account = normalizeAccount(tx.counterpartyAccount);
    if (account) {
      const hit = map.get(`ACCOUNT|${account}|${direction}`);
      if (hit) return hit;
    }
    const name = normalizeName(tx.counterpartyName);
    if (name) {
      const hit = map.get(`NAME|${name}|${direction}`);
      if (hit) return hit;
    }
    return null;
  };
}

/**
 * Zapamti potvrđen izbor korisnika. Postojeće pravilo se prepisuje
 * najnovijim izborom (korisnik je presudio) i broji potvrde.
 */
async function learnFromTransaction(organizationId, tx) {
  if (!tx.category) return;
  const key = ruleKeyFor(tx);
  if (!key) return;
  const direction = String(tx.direction || "").toUpperCase();
  const [rule, created] = await BankMatchRule.findOrCreate({
    where: {
      organizationId,
      matchType: key.matchType,
      matchValue: key.matchValue,
      direction,
    },
    defaults: { category: tx.category },
  });
  if (!created) {
    rule.category = tx.category;
    rule.timesConfirmed += 1;
    await rule.save();
  }
}

module.exports = { loadRuleSuggester, learnFromTransaction };
