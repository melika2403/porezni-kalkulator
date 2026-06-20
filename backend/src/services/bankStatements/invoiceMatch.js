// Auto-match priliva sa izvoda na otvorene (izdane, nenaplaćene) fakture.
//
// Signali, od najjačeg ka najslabijem:
//   1. broj fakture u opisu/referenci (sve varijante: 0042-2026, 0042/2026,
//      42/2026, 42-26...) — sam po sebi dovoljan
//   2. tačan iznos (grossTotal) + naziv kupca prepoznat u protivstrani/opisu
//   3. samo tačan iznos NIJE dovoljan (previše lažnih pogodaka)
// Više kandidata sa istim najboljim skorom = preskoči (dvosmisleno).
//
// Match je PRIJEDLOG: veza + kategorija se upišu na stavku, ali faktura
// postaje PAID tek kad korisnik potvrdi stavku.

const { Invoice } = require("../../models/index");

/** "0042-2026" → varijante za pretragu po tekstu (uppercase). */
function numberVariants(fullNumber, year) {
  const m = String(fullNumber || "").match(/^(\d+)[-/](\d{4})$/);
  const padded = m ? m[1] : String(fullNumber || "");
  const seq = String(Number(padded) || padded);
  const fullYear = m ? m[2] : String(year || "");
  const yy = fullYear.slice(-2);
  const variants = new Set();
  for (const p of [padded, seq]) {
    if (!p) continue;
    for (const y of [fullYear, yy]) {
      if (!y) continue;
      for (const sep of ["-", "/"]) {
        variants.add(`${p}${sep}${y}`);
      }
    }
  }
  return [...variants];
}

/** tokeni naziva kupca (bez pravne forme) za grubu provjeru protivstrane */
function buyerTokens(name) {
  return String(name || "")
    .toUpperCase()
    .replace(/[^A-ZČĆĐŠŽ0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !["DOO", "D.O.O", "OBRT", "VL"].includes(t));
}

/**
 * Učitaj otvorene fakture organizacije i vrati matcher funkciju.
 * @returns {Promise<(tx: {direction:string, amount:number|string, description?:string,
 *   reference?:string, counterpartyName?:string}) => number|null>} invoiceId ili null
 */
async function loadInvoiceMatcher(organizationId) {
  const open = await Invoice.findAll({
    where: {
      organizationId,
      type: "INVOICE",
      status: "ISSUED",
      currency: "BAM",
    },
    attributes: ["id", "fullNumber", "year", "grossTotal", "buyerName"],
    raw: true,
  });
  if (open.length === 0) return () => null;

  const candidates = open.map((inv) => ({
    id: inv.id,
    grossCents: Math.round(Number(inv.grossTotal) * 100),
    variants: numberVariants(inv.fullNumber, inv.year),
    tokens: buyerTokens(inv.buyerName),
  }));

  return (tx) => {
    if (String(tx.direction).toUpperCase() !== "IN") return null;
    const text = `${tx.description || ""} ${tx.reference || ""} ${tx.counterpartyName || ""}`.toUpperCase();
    const amountCents = Math.round(Number(tx.amount) * 100);

    let bestScore = 0;
    let best = null;
    let tie = false;
    for (const c of candidates) {
      const byNumber = c.variants.some((v) => text.includes(v));
      const byAmount = c.grossCents === amountCents;
      const byBuyer =
        c.tokens.length > 0 && c.tokens.some((t) => text.includes(t));

      let score = 0;
      if (byNumber && byAmount) score = 4;
      else if (byNumber) score = 3;
      else if (byAmount && byBuyer) score = 2;
      // samo iznos ili samo kupac: nedovoljno

      if (score > bestScore) {
        bestScore = score;
        best = c;
        tie = false;
      } else if (score === bestScore && score > 0 && best && c.id !== best.id) {
        tie = true;
      }
    }
    if (bestScore === 0 || tie) return null;
    return best.id;
  };
}

module.exports = { loadInvoiceMatcher, numberVariants };
