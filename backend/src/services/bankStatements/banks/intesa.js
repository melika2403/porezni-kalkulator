// Intesa Sanpaolo Banka d.d. BiH. Dva formata izvoda, oba US format brojeva:
//
//  1) Transakcijski račun (KM), "I Z V O D B R O J":
//       Broj naloga | Datum | Dat. val. | Opis promjene | Kome / Od koga | Banka | Duguje | Potražuje
//     Prethodni saldo / UKUPNO / NOVI SALDO. Protivstrana u više redova
//     ("3383502200648888-" pa "/3383502200648888UPRAVA ZA ...").
//
//  2) Devizni račun, "IZVOD ZA KOMITENTA":
//       Dat. obrade | Dat. valute | Opis promjene | Nalog | Duguje | Potražuje | Duguje KM | Potražuje KM
//     STARO/NOVO STANJE u valuti i KM, PROMET NA DAN po danu, UKUPAN PROMET
//     je kumulativ (ne promet izvoda) pa se ignoriše. Knjige se vode u KM,
//     pa se uzimaju KM kolone; valutne kolone služe za validaciju.

const { parseAmount, parseDate, rowText, findRowByText } = require("../engine");

const FORMAT = "us";

function detect(pagesRows) {
  // samo zaglavlje prve stranice: "Intesa" se pojavljuje i kao banka
  // protivstrane na izvodima drugih banaka
  const first = pagesRows[0] && pagesRows[0].rows.slice(0, 3);
  return !!first && first.some((r) => /INTESA SANPAOLO BANKA/i.test(rowText(r)));
}

/**
 * Iznosi u redu dodijeljeni kolonama po desnoj ivici (vrijednosti su desno
 * poravnate, a devizne kolone su preusko razmaknute za poređenje centara).
 */
function amountsByRightEdge(items, columns, minX) {
  const out = {};
  for (const it of items) {
    if (it.x < minX) continue;
    const val = parseAmount(it.str, FORMAT);
    if (val == null) continue;
    const right = it.x + (it.w || 0);
    let best = null;
    let bestDist = Infinity;
    for (const col of columns) {
      const d = Math.abs(right - col.right);
      if (d < bestDist) {
        bestDist = d;
        best = col.key;
      }
    }
    if (best != null && bestDist < 25) out[best] = val;
  }
  return out;
}

function colRight(headerRow, regex) {
  const it = headerRow.items.find((i) => regex.test(i.str.trim()));
  return it ? it.x + (it.w || 0) : null;
}

function textBetween(row, fromX, toX) {
  return row.items
    .filter((i) => i.x >= fromX && i.x < toX)
    .map((i) => i.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── 1) transakcijski račun (KM) ─────────────────────────────────────────

const KM_HEADER = /Broj naloga\s+Datum/i;

function parseKm(pagesRows) {
  const warnings = [];
  const meta = {
    bankName: "Intesa Sanpaolo Banka",
    account: null,
    statementNumber: null,
    statementDate: null,
    currency: "BAM",
  };

  const headerRow = findRowByText(pagesRows, KM_HEADER);
  const dR = colRight(headerRow, /^Duguje$/i);
  const pR = colRight(headerRow, /^Potražuje$/i);
  if (dR == null || pR == null) throw new Error("Intesa: nema kolona Duguje/Potražuje");
  const columns = [
    { key: "duguje", right: dR },
    { key: "potrazuje", right: pR },
  ];
  const komeX = headerRow.items.find((i) => /^Kome/i.test(i.str)).x - 5;
  const bankaX = headerRow.items.find((i) => /^Banka$/i.test(i.str)).x - 5;
  const amountsX = bankaX + 100;

  let openingBalance = null;
  let closingBalance = null;
  const declaredTotals = {};
  const transactions = [];

  for (const { rows } of pagesRows) {
    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/I\s*Z\s*V\s*O\s*D\s+B\s*R\s*O\s*J:?\s*(\d+)/i))) {
        meta.statementNumber = m[1];
      }
      if ((m = text.match(/Na dan:\s*(\d{2}\.\d{2}\.\d{4})/i))) {
        meta.statementDate = parseDate(m[1]);
      }
      if ((m = text.match(/Transakcijski ra[cč]un:\s*(\d{10,20})/i))) {
        meta.account = m[1];
      }
      if ((m = text.match(/Prethodni saldo\s+(-?[\d.,]+)/i))) {
        openingBalance = parseAmount(m[1], FORMAT);
      }
      if ((m = text.match(/NOVI SALDO\s+(-?[\d.,]+)/i))) {
        closingBalance = parseAmount(m[1], FORMAT);
      }
      if (/^UKUPNO\b/i.test(text)) {
        const a = amountsByRightEdge(row.items, columns, amountsX);
        if (a.duguje != null) declaredTotals.duguje = a.duguje;
        if (a.potrazuje != null) declaredTotals.potrazuje = a.potrazuje;
      }
    }

    const headerIdx = rows.findIndex((r) => KM_HEADER.test(rowText(r)));
    if (headerIdx === -1) continue;
    const endIdx = rows.findIndex(
      (r, i) => i > headerIdx && /^(UKUPNO|NOVI SALDO)\b/i.test(rowText(r)),
    );
    const tableRows = rows.slice(headerIdx + 1, endIdx === -1 ? rows.length : endIdx);

    let current = null;
    for (const row of tableRows) {
      const first = row.items[0];
      const amounts = amountsByRightEdge(row.items, columns, amountsX);
      const isAnchor =
        first &&
        first.x < 75 &&
        /^\d{5,}$/.test(first.str.trim()) &&
        (amounts.duguje != null || amounts.potrazuje != null);

      if (isAnchor) {
        const duguje = amounts.duguje || 0;
        const potrazuje = amounts.potrazuje || 0;
        const direction = potrazuje > 0 ? "in" : "out";
        const dates = row.items
          .filter((i) => i.x < 170)
          .map((i) => parseDate(i.str))
          .filter(Boolean);
        const kome = textBetween(row, komeX, bankaX);
        let counterpartyAccount = null;
        let counterpartyName = kome;
        const cm = kome.match(/^\/?(\d{16})-?\s*(.*)$/);
        if (cm) {
          counterpartyAccount = cm[1];
          counterpartyName = cm[2].trim();
        }
        current = {
          date: dates[0] || meta.statementDate,
          valueDate: dates[1] || null,
          description: textBetween(row, 165, komeX),
          reference: first.str.trim(),
          amount: direction === "in" ? potrazuje : duguje,
          direction,
          balanceAfter: null,
          counterpartyName,
          counterpartyAccount,
        };
        transactions.push(current);
      } else if (current) {
        const extraOpis = textBetween(row, 165, komeX);
        let extraName = textBetween(row, komeX, bankaX);
        // nastavak protivstrane ponavlja račun: "/3383502200648888UPRAVA ZA"
        const cm = extraName.match(/^\/?(\d{16})-?\s*(.*)$/);
        if (cm) {
          if (!current.counterpartyAccount) current.counterpartyAccount = cm[1];
          extraName = cm[2].trim();
        }
        if (extraName) {
          current.counterpartyName = `${current.counterpartyName || ""} ${extraName}`.trim();
        }
        if (extraOpis) {
          current.description = `${current.description} ${extraOpis}`.trim();
        }
      }
    }
  }

  for (const t of transactions) {
    if (!t.counterpartyName) t.counterpartyName = null;
    delete t.valueDate;
  }

  return { ...meta, openingBalance, closingBalance, declaredTotals, transactions, warnings };
}

// ─── 2) devizni račun ────────────────────────────────────────────────────

const FX_HEADER = /Dat\.\s*obrade\s+Dat\.\s*valute/i;
const AMT = "(-?[\\d,]+\\.\\d{2})";

function parseFx(pagesRows) {
  const warnings = [];
  const meta = {
    bankName: "Intesa Sanpaolo Banka",
    account: null,
    statementNumber: null,
    statementDate: null,
    currency: "BAM",
  };
  let fxCurrency = null;

  const headerRow = findRowByText(pagesRows, FX_HEADER);
  const columns = [
    { key: "duguje", right: colRight(headerRow, /^Duguje$/i) },
    { key: "potrazuje", right: colRight(headerRow, /^Potražuje$/i) },
    { key: "dugujeKm", right: colRight(headerRow, /^Duguje KM$/i) },
    { key: "potrazujeKm", right: colRight(headerRow, /^Potražuje KM$/i) },
  ];
  if (columns.some((c) => c.right == null)) throw new Error("Intesa devizni: nema kolona iznosa");
  const nalogX = headerRow.items.find((i) => /^Nalog$/i.test(i.str)).x - 10;
  const amountsX = nalogX + 60;

  let opening = null; // { fx, km }
  let closing = null;
  const dayTotalsKm = { duguje: 0, potrazuje: 0 };
  let hasDayTotals = false;
  const transactions = [];

  for (const { rows } of pagesRows) {
    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/Broj izvoda:\s*(\d+)/i))) meta.statementNumber = m[1];
      if ((m = text.match(/DO\s*:\s*(\d{2}\.\d{2}\.\d{4})/i))) {
        meta.statementDate = parseDate(m[1]);
      }
      if ((m = text.match(/^Konto\s+(\d{6,20})/i))) meta.account = m[1];
      if ((m = text.match(/^Valuta\s+\d{3}\s+([A-Z]{3})/i))) fxCurrency = m[1];
      if ((m = text.match(new RegExp(`STARO STANJE NA DAN:\\s*\\S+\\s+${AMT}\\s+${AMT}`, "i")))) {
        opening = { fx: parseAmount(m[1], FORMAT), km: parseAmount(m[2], FORMAT) };
      }
      if ((m = text.match(new RegExp(`NOVO STANJE NA DAN:\\s*(?:\\d{2}\\.\\d{2}\\.\\d{4}\\s+)?${AMT}\\s+${AMT}`, "i")))) {
        closing = { fx: parseAmount(m[1], FORMAT), km: parseAmount(m[2], FORMAT) };
      }
      if (/PROMET NA DAN:/i.test(text) && !/UKUPAN/i.test(text)) {
        const a = amountsByRightEdge(row.items, columns, amountsX);
        dayTotalsKm.duguje += Math.round((a.dugujeKm || 0) * 100);
        dayTotalsKm.potrazuje += Math.round((a.potrazujeKm || 0) * 100);
        hasDayTotals = true;
      }
    }

    const headerIdx = rows.findIndex((r) => FX_HEADER.test(rowText(r)));
    if (headerIdx === -1) continue;

    let current = null;
    for (const row of rows.slice(headerIdx + 1)) {
      const text = rowText(row);
      if (/NOVO STANJE NA DAN:/i.test(text)) break;
      if (/PROMET NA DAN:|UKUPAN PROMET:|STARO STANJE NA DAN:/i.test(text)) {
        current = null;
        continue;
      }
      const first = row.items[0];
      const amounts = amountsByRightEdge(row.items, columns, amountsX);
      const isAnchor =
        first && first.x < 20 && parseDate(first.str) && Object.keys(amounts).length > 0;

      if (isAnchor) {
        const inFx = (amounts.potrazuje || 0) > 0;
        const direction = inFx || (amounts.potrazujeKm || 0) > 0 ? "in" : "out";
        const amountFx = direction === "in" ? amounts.potrazuje || 0 : amounts.duguje || 0;
        const amountKm = direction === "in" ? amounts.potrazujeKm || 0 : amounts.dugujeKm || 0;
        const nalog = textBetween(row, nalogX, amountsX);
        current = {
          date: parseDate(first.str),
          description: textBetween(row, 95, nalogX),
          reference: nalog || null,
          amount: amountKm,
          direction,
          balanceAfter: null,
          counterpartyName: null,
          counterpartyAccount: null,
          _fx: amountFx,
        };
        transactions.push(current);
      } else if (current) {
        const extra = textBetween(row, 95, nalogX);
        if (extra) current.description = `${current.description} ${extra}`.trim();
      }
    }
  }

  if (!opening || !closing) throw new Error("Intesa devizni: nema starog ili novog stanja");

  // validacija u valuti računa: tu nema zaokruživanja preračuna
  let fxCents = Math.round(opening.fx * 100);
  for (const t of transactions) {
    fxCents += (t.direction === "in" ? 1 : -1) * Math.round(t._fx * 100);
  }
  if (fxCents !== Math.round(closing.fx * 100)) {
    throw new Error(
      `saldo u ${fxCurrency || "valuti"} se ne slaže: izračunato ${fxCents / 100}, izvod kaže ${closing.fx}`,
    );
  }

  // KM kolone su preračunate stavka po stavka pa KM saldo može odstupati
  // od zbira zaokruženih iznosa (1 fening po stavci)
  let kmCents = Math.round(opening.km * 100);
  for (const t of transactions) {
    kmCents += (t.direction === "in" ? 1 : -1) * Math.round(t.amount * 100);
  }
  const roundingCents = Math.round(closing.km * 100) - kmCents;
  if (roundingCents !== 0) {
    warnings.push(
      `Devizni račun (${fxCurrency || "valuta"}): KM saldo odstupa ${(roundingCents / 100).toFixed(2)} KM ` +
        `od zbira stavki zbog zaokruživanja preračuna po kursu CBBiH.`,
    );
  }

  for (const t of transactions) {
    t.description = `${t.description} (${t._fx.toFixed(2)} ${fxCurrency || ""})`.replace(/\s+\)/, ")");
    delete t._fx;
  }

  return {
    ...meta,
    openingBalance: opening.km,
    closingBalance: closing.km,
    declaredTotals: hasDayTotals
      ? { duguje: dayTotalsKm.duguje / 100, potrazuje: dayTotalsKm.potrazuje / 100 }
      : {},
    // dozvoljeno odstupanje salda zbog preračuna (validacija u valuti je prošla)
    balanceToleranceCents: transactions.length,
    transactions,
    warnings,
  };
}

function parse(pagesRows) {
  if (findRowByText(pagesRows, FX_HEADER)) return parseFx(pagesRows);
  if (findRowByText(pagesRows, KM_HEADER)) return parseKm(pagesRows);
  throw new Error("Intesa: nepoznat format izvoda");
}

module.exports = { id: "intesa", name: "Intesa Sanpaolo Banka", detect, parse };
