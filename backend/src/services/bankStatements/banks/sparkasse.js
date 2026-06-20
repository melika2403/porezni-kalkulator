// Sparkasse Bank d.d. BiH — izvod sa kolonama:
//   BROJ | KOME/OD KOGA | OPIS | BANKA | DUGUJE | POTRAŽUJE
// US format brojeva. POČETNO/TRENUTNO STANJE + UKUPNO red. Nastavci
// (ime primaoca u više redova) dolaze ispod anchor reda.
// NAPOMENA: nema datuma po transakciji — koristi se "na dan" datum izvoda.

const {
  parseAmount,
  parseDate,
  rowText,
  findRowByText,
  assignAmountsToColumns,
} = require("../engine");

const FORMAT = "us";

function detect(pagesRows, allText) {
  return /SPARKASSE BANK/i.test(allText);
}

function parse(pagesRows) {
  // Sparkasse izvod nema datum po transakciji — datum izvoda je datum svih stavki.
  const warnings = [];
  const meta = {
    bankName: "Sparkasse Bank",
    account: null,
    statementNumber: null,
    statementDate: null,
    currency: "BAM",
  };

  const headerRow = findRowByText(pagesRows, /BROJ\s+KOME\/OD KOGA\s+OPIS/i);
  if (!headerRow) throw new Error("Sparkasse: nema zaglavlja tabele");
  const dH = headerRow.items.find((i) => /^DUGUJE$/i.test(i.str));
  const pH = headerRow.items.find((i) => /^POTRAŽUJE$/i.test(i.str));
  const columns = [
    { key: "duguje", center: dH.x + 15 },
    { key: "potrazuje", center: pH.x + 15 },
  ];

  for (const { rows } of pagesRows) {
    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/Izvod broj\s+(\d+)\s+od\s+\d{2}\.\d{2}\.\d{4}\s+na dan\s+(\d{2}\.\d{2}\.\d{4})/i))) {
        meta.statementNumber = m[1];
        meta.statementDate = parseDate(m[2]);
      }
      if ((m = text.match(/Broj transakcijskog računa:\s*(\d{10,20})/i))) {
        meta.account = m[1];
      }
    }
  }

  let openingBalance = null;
  let closingBalance = null;
  const declaredTotals = {};
  const transactions = [];
  let current = null;

  for (const { rows } of pagesRows) {
    const headerIdx = rows.findIndex((r) =>
      /BROJ\s+KOME\/OD KOGA\s+OPIS/i.test(rowText(r)),
    );

    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/POČETNO STANJE:\s*(-?[\d.,]+)/i))) {
        openingBalance = parseAmount(m[1], FORMAT);
        current = null;
      }
      if ((m = text.match(/TRENUTNO STANJE:\s*(-?[\d.,]+)/i))) {
        closingBalance = parseAmount(m[1], FORMAT);
      }
      if (/^UKUPNO:/i.test(text)) {
        const amounts = assignAmountsToColumns(row.items, columns, FORMAT, 450);
        if (amounts.duguje != null) declaredTotals.duguje = amounts.duguje;
        if (amounts.potrazuje != null) declaredTotals.potrazuje = amounts.potrazuje;
        current = null;
      }
    }

    if (headerIdx === -1) continue;
    const endIdx = rows.findIndex((r) => /^UKUPNO:/i.test(rowText(r)));
    const tableRows = rows.slice(
      headerIdx + 1,
      endIdx === -1 ? rows.length : endIdx,
    );

    for (const row of tableRows) {
      const first = row.items[0];
      const isAnchor =
        first && first.x < 60 && /^\d{6,}$/.test(first.str.trim());
      const amounts = assignAmountsToColumns(row.items, columns, FORMAT, 450);

      if (isAnchor && (amounts.duguje != null || amounts.potrazuje != null)) {
        const duguje = amounts.duguje || 0;
        const potrazuje = amounts.potrazuje || 0;
        const direction = potrazuje > 0 ? "in" : "out";
        const kome = row.items
          .filter((i) => i.x >= 60 && i.x < 225)
          .map((i) => i.str)
          .join(" ")
          .trim();
        const opis = row.items
          .filter((i) => i.x >= 225 && i.x < 375)
          .map((i) => i.str)
          .join(" ")
          .trim();
        // protivračun u "kome" polju oblika "/1994510006970557NAZIV..."
        let counterpartyAccount = null;
        let counterpartyName = kome;
        const cm = kome.match(/^\/(\d{16})(.*)/);
        if (cm) {
          counterpartyAccount = cm[1];
          counterpartyName = cm[2].trim();
        }
        current = {
          date: meta.statementDate,
          description: opis,
          reference: first.str.trim(),
          amount: direction === "in" ? potrazuje : duguje,
          direction,
          balanceAfter: null,
          counterpartyName,
          counterpartyAccount,
        };
        transactions.push(current);
      } else if (current) {
        const extraName = row.items
          .filter((i) => i.x >= 60 && i.x < 225)
          .map((i) => i.str)
          .join(" ")
          .trim();
        const extraOpis = row.items
          .filter((i) => i.x >= 225 && i.x < 375)
          .map((i) => i.str)
          .join(" ")
          .trim();
        if (extraName) {
          current.counterpartyName =
            `${current.counterpartyName || ""} ${extraName}`.trim();
        }
        if (extraOpis) {
          current.description = `${current.description} ${extraOpis}`.trim();
        }
      }
    }
    current = null;
  }

  return {
    ...meta,
    openingBalance,
    closingBalance,
    declaredTotals,
    transactions,
    warnings,
  };
}

module.exports = { id: "sparkasse", name: "Sparkasse Bank", detect, parse };
