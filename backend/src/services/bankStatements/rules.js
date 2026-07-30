// Naučena pravila kategorizacije po organizaciji.
//
// Učenje: pri potvrdi stavke sa kategorijom upsert pravila
//   (protivračun ILI naziv protivstrane) + smjer → kategorija i partner.
// Primjena: pri uploadu, naučeno pravilo ima prednost nad seed pravilima
// (korisnik je eksplicitno rekao šta ta protivstrana znači za NJEGOV obrt).
//
// Partner se pamti uz kategoriju: kad se prvi put potvrdi da uplata ide
// dobavljaču X, svaka sljedeća uplata istoj protivstrani sama dolazi sa
// njegovom karticom. Partner iz pravila se poštuje samo ako partner još
// postoji u toj organizaciji (provjera je u pozivaocu).

const { BankMatchRule } = require("../../models/index");
const { normalizeAccount, lookupJavniPrihod } = require("./javniPrihodi");

// Iz ovih kategorija se ne uči po protivstrani: red provizije banke nosi
// račun i naziv onoga kome je plaćeno (banka naplati proviziju "po poslu"),
// pa bi se naučilo da je taj dobavljač provizija i sljedeći mjesec bi mu se
// plaćanje pogrešno svrstalo. Provizija se ionako pouzdano prepoznaje po
// opisu kroz seed pravila.
const KATEGORIJE_BEZ_UCENJA = new Set(["PROVIZIJA_BANKE"]);

// Računi javnih prihoda su izuzeti iz pravila po protivstrani: isti račun
// prima uplate različitog značenja (Budžet FBiH: PIO vlasnika I PIO radnika;
// kantonalni budžet: porez radnika, vodnu, nesreće i akontaciju vlasnika),
// pa bi jedno potvrđeno knjiženje "obojilo" sve buduće uplate na taj račun.
// Njih kategorišu seed lookup + vlasnikDoprinosi (po iznosu), svaki put.

function normalizeName(name) {
  return String(name || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);
}

/**
 * Ključevi pravila za transakciju. Uči se i po računu i po nazivu kad su oba
 * poznata: banke ne daju uvijek oba podatka, pa pravilo mora pogoditi i kad
 * sljedeći izvod nosi samo jedno od to dvoje. Pri primjeni račun ima prednost.
 */
function ruleKeysFor(tx) {
  const kljucevi = [];
  const account = normalizeAccount(tx.counterpartyAccount);
  if (account) kljucevi.push({ matchType: "ACCOUNT", matchValue: account });
  const name = normalizeName(tx.counterpartyName);
  if (name) kljucevi.push({ matchType: "NAME", matchValue: name });
  return kljucevi;
}

/**
 * Učitaj sva pravila organizacije i vrati funkciju za prijedlog kategorije.
 * Na vraćenoj funkciji stoji i `.partnerFor(tx)` za naučenog partnera; tako
 * postojeći pozivaoci (koji traže samo kategoriju) ostaju nepromijenjeni.
 * @returns {Promise<((tx:{counterpartyAccount?:string,counterpartyName?:string,direction:string}) => string|null) & {partnerFor: (tx:Object) => number|null}>}
 */
async function loadRuleSuggester(organizationId) {
  const rules = await BankMatchRule.findAll({
    where: { organizationId },
    raw: true,
  });
  const map = new Map();
  for (const r of rules) {
    map.set(`${r.matchType}|${r.matchValue}|${r.direction}`, r);
  }
  /** Pravilo za transakciju: račun ima prednost nad nazivom. */
  const nadjiPravilo = (tx) => {
    const direction = String(tx.direction || "").toUpperCase();
    const account = normalizeAccount(tx.counterpartyAccount);
    if (account && lookupJavniPrihod(account)) return null;
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

  const suggest = (tx) => nadjiPravilo(tx)?.category ?? null;
  suggest.partnerFor = (tx) => nadjiPravilo(tx)?.partnerId ?? null;
  return suggest;
}

/**
 * Zapamti potvrđen izbor korisnika. Postojeće pravilo se prepisuje
 * najnovijim izborom (korisnik je presudio) i broji potvrde.
 */
async function learnFromTransaction(organizationId, tx) {
  if (!tx.category) return;
  if (KATEGORIJE_BEZ_UCENJA.has(tx.category)) return;
  if (lookupJavniPrihod(normalizeAccount(tx.counterpartyAccount))) return;
  const direction = String(tx.direction || "").toUpperCase();
  const partnerId = tx.partnerId || null;
  for (const key of ruleKeysFor(tx)) {
    const [rule, created] = await BankMatchRule.findOrCreate({
      where: {
        organizationId,
        matchType: key.matchType,
        matchValue: key.matchValue,
        direction,
      },
      defaults: { category: tx.category, partnerId },
    });
    if (!created) {
      rule.category = tx.category;
      // partner se pamti kad je vezan; potvrda bez partnera ne briše naučenog
      // (stavka može biti potvrđena i prije nego se partner otvori)
      if (partnerId) rule.partnerId = partnerId;
      rule.timesConfirmed += 1;
      await rule.save();
    }
  }
}

module.exports = { loadRuleSuggester, learnFromTransaction };
