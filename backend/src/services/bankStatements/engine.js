// Zajednički alati za parsiranje bankovnih izvoda iz PDF teksta sa
// koordinatama. Svaka banka ima svoj modul u banks/, a ovdje su helpers
// koje svi dijele: brojevi (EU/US format), datumi, kolone, redovi.
//
// Novčani iznosi se interno drže kao broj KM sa 2 decimale; sve sume se
// rade u feninzima (integer) da ne bude float greški.

/**
 * Parsiraj novčani iznos.
 * @param {string} str
 * @param {"eu"|"us"} format - eu: 1.234,56  us: 1,234.56
 * @returns {number|null}
 */
function parseAmount(str, format) {
  if (str == null) return null;
  let s = String(str).trim().replace(/\s/g, "").replace(/KM$/i, "");
  if (!s) return null;
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (format === "eu") {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number.parseFloat(s);
  return negative ? -n : n;
}

/** Da li string liči na novčani iznos u datom formatu. */
function looksLikeAmount(str, format) {
  return parseAmount(str, format) != null;
}

/**
 * Parsiraj datum u ISO (YYYY-MM-DD).
 * Podržava: dd.mm.yyyy, dd.mm.yy, dd/mm/yyyy, dd/mm/yy
 */
function parseDate(str) {
  if (!str) return null;
  const m = String(str)
    .trim()
    .match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})\.?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Centar tekstualnog elementa po x osi. */
function centerX(item) {
  return item.x + (item.w || 0) / 2;
}

/**
 * Dodijeli iznose iz reda kolonama po blizini centra elementa centru kolone.
 * @param {Array} items - elementi reda
 * @param {Array<{key:string,center:number}>} columns
 * @param {"eu"|"us"} format
 * @param {number} minX - ignoriši elemente lijevo od ovoga (tekst opisa)
 * @returns {Object<string, number>} npr. { duguje: 4000, potrazuje: 0 }
 */
function assignAmountsToColumns(items, columns, format, minX) {
  const out = {};
  for (const it of items) {
    if (it.x < minX) continue;
    const val = parseAmount(it.str, format);
    if (val == null) continue;
    let best = null;
    let bestDist = Infinity;
    for (const col of columns) {
      const d = Math.abs(centerX(it) - col.center);
      if (d < bestDist) {
        bestDist = d;
        best = col.key;
      }
    }
    // element mora biti razumno blizu kolone (pola razmaka među kolonama)
    if (best != null && bestDist < 60) out[best] = val;
  }
  return out;
}

/** Spoji tekst svih elemenata reda u jedan string. */
function rowText(row) {
  return row.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
}

/** Nađi prvi red (kroz sve stranice) čiji tekst zadovoljava regex. */
function findRowByText(pagesRows, regex) {
  for (const { rows } of pagesRows) {
    for (const row of rows) {
      if (regex.test(rowText(row))) return row;
    }
  }
  return null;
}

/** KM → feninzi (integer), sigurno za sume. */
function toCents(n) {
  return Math.round(n * 100);
}

function fromCents(c) {
  return c / 100;
}

/**
 * Univerzalna validacija rezultata parsiranja. Vraća {ok, errors, computed}.
 * Pravila:
 *  1. početno stanje + Σ priliv − Σ odliv = završno stanje
 *  2. ako banka deklariše sume prometa, moraju se poklopiti sa izračunatim
 *  3. ako transakcije nose saldo nakon (Raiffeisen), kontinuitet red-po-red
 */
function validateStatement(result) {
  const errors = [];
  let inCents = 0;
  let outCents = 0;
  for (const t of result.transactions) {
    if (t.direction === "in") inCents += toCents(t.amount);
    else outCents += toCents(t.amount);
  }

  if (result.openingBalance != null && result.closingBalance != null) {
    const expected = toCents(result.openingBalance) + inCents - outCents;
    const actual = toCents(result.closingBalance);
    if (expected !== actual) {
      errors.push(
        `Saldo se ne slaže: ${fromCents(toCents(result.openingBalance))} + ` +
          `${fromCents(inCents)} − ${fromCents(outCents)} = ${fromCents(expected)}, ` +
          `a izvod kaže ${fromCents(actual)}`,
      );
    }
  } else {
    errors.push("Nedostaje početno ili završno stanje na izvodu");
  }

  if (result.declaredTotals) {
    const { duguje, potrazuje } = result.declaredTotals;
    if (duguje != null && toCents(duguje) !== outCents) {
      errors.push(
        `Suma odliva (${fromCents(outCents)}) se ne slaže sa prometom na izvodu (${duguje})`,
      );
    }
    if (potrazuje != null && toCents(potrazuje) !== inCents) {
      errors.push(
        `Suma priliva (${fromCents(inCents)}) se ne slaže sa prometom na izvodu (${potrazuje})`,
      );
    }
  }

  if (
    result.openingBalance != null &&
    result.transactions.some((t) => t.balanceAfter != null)
  ) {
    let running = toCents(result.openingBalance);
    for (const t of result.transactions) {
      running += t.direction === "in" ? toCents(t.amount) : -toCents(t.amount);
      if (t.balanceAfter != null && toCents(t.balanceAfter) !== running) {
        errors.push(
          `Saldo nakon transakcije "${(t.description || "").slice(0, 40)}" ` +
            `(${t.balanceAfter}) se ne slaže sa izračunatim (${fromCents(running)})`,
        );
        running = toCents(t.balanceAfter); // nastavi od bankinog da ne kaskadira
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    computed: { totalIn: fromCents(inCents), totalOut: fromCents(outCents) },
  };
}

module.exports = {
  parseAmount,
  looksLikeAmount,
  parseDate,
  centerX,
  assignAmountsToColumns,
  rowText,
  findRowByText,
  validateStatement,
};
