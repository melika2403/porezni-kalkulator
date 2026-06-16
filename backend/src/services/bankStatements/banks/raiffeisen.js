// Raiffeisen Bank d.d. BiH — izvod sa kolonama:
//   DATUM | OPIS PROMJENE | DOKUMENT | PROMET (Na teret / U korist) | SALDO
// US format brojeva (18,577.86). Jedina banka sa saldom po redu, pa imamo
// najjaču validaciju (kontinuitet salda red-po-red). Nastavci opisa dolaze
// ISPOD anchor reda pa se vežu za posljednji viđeni anchor.

const {
  parseAmount,
  parseDate,
  rowText,
  findRowByText,
  assignAmountsToColumns,
} = require("../engine");

const FORMAT = "us";

function detect(pagesRows, allText) {
  return /Raiffeisen BANK/i.test(allText) || /Izvod za komitenta broj/i.test(allText);
}

function parse(pagesRows) {
  const warnings = [];
  const meta = {
    bankName: "Raiffeisen Bank",
    account: null,
    statementNumber: null,
    statementDate: null,
    currency: null,
  };

  const headerRow = findRowByText(pagesRows, /DATUM\s+OPIS PROMJENE/i);
  if (!headerRow) throw new Error("Raiffeisen: nema zaglavlja tabele");
  // pod-naslovi kolona iznosa su u sljedećem redu ("Na teret" / "U korist"),
  // a SALDO u glavnom; centri se određuju iz oba
  const saldoHeader = headerRow.items.find((i) => /^SALDO$/i.test(i.str));
  const subHeader = findRowByText(pagesRows, /Na teret\s+U korist/i);
  const naTeretH = subHeader.items.find((i) => /Na teret/i.test(i.str));
  const uKoristH = subHeader.items.find((i) => /U korist/i.test(i.str));
  const columns = [
    { key: "duguje", center: naTeretH.x + 15 },
    { key: "potrazuje", center: uKoristH.x + 15 },
    { key: "saldo", center: saldoHeader.x + 10 },
  ];

  for (const { rows } of pagesRows) {
    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/Izvod za komitenta broj:\s*(\d+)/i))) {
        meta.statementNumber = m[1];
      }
      if ((m = text.match(/na dan:\s*(\d{2}\.\d{2}\.\d{4})/i))) {
        meta.statementDate = parseDate(m[1]);
      }
      if ((m = text.match(/^TRN:\s*(\d{10,20})/i))) {
        meta.account = m[1];
      }
      if ((m = text.match(/^Valuta:\s*(\d{3})\s*([A-Z]{2,3})/i))) {
        meta.currency = m[2] === "KM" ? "BAM" : m[2];
      }
    }
  }

  let openingBalance = null;
  let closingBalance = null;
  const declaredTotals = {};
  const transactions = [];
  let current = null;

  for (const { rows } of pagesRows) {
    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/PRETHODNI SALDO:\s*(-?[\d.,]+)/i))) {
        openingBalance = parseAmount(m[1], FORMAT);
        continue;
      }
      if ((m = text.match(/NOVI SALDO:\s*(-?[\d.,]+)/i))) {
        closingBalance = parseAmount(m[1], FORMAT);
        continue;
      }
      if (/Ukupan promet:/i.test(text) || /^U korist\s/i.test(text)) {
        // "Ukupan promet: Na teret X" pa u sljedećem redu "U korist Y"
        if ((m = text.match(/Na teret\s+(-?[\d.,]+)/i))) {
          declaredTotals.duguje = parseAmount(m[1], FORMAT);
        }
        if ((m = text.match(/U korist\s+(-?[\d.,]+)/i))) {
          declaredTotals.potrazuje = parseAmount(m[1], FORMAT);
        }
        current = null;
        continue;
      }

      const dateItem = row.items.find(
        (i) => i.x < 60 && parseDate(i.str) != null,
      );
      const amounts = assignAmountsToColumns(row.items, columns, FORMAT, 370);

      if (dateItem && (amounts.duguje != null || amounts.potrazuje != null)) {
        const duguje = amounts.duguje || 0;
        const potrazuje = amounts.potrazuje || 0;
        const direction = potrazuje > 0 ? "in" : "out";
        const opis = row.items
          .filter((i) => i.x >= 60 && i.x < 290)
          .map((i) => i.str)
          .join(" ");
        const dokument = row.items.find((i) => i.x >= 290 && i.x < 370);
        current = {
          date: parseDate(dateItem.str),
          description: opis.trim(),
          reference: dokument ? dokument.str.trim() : null,
          amount: direction === "in" ? potrazuje : duguje,
          direction,
          balanceAfter: amounts.saldo != null ? amounts.saldo : null,
          counterpartyName: null,
          counterpartyAccount: null,
        };
        transactions.push(current);
      } else if (current) {
        // nastavak opisa (npr. "/1861410310551807 BABILON DOO ...")
        const extra = row.items
          .filter((i) => i.x >= 60 && i.x < 290)
          .map((i) => i.str)
          .join(" ")
          .trim();
        if (extra) {
          current.description = `${current.description} ${extra}`.trim();
          // protivračun + naziv iz nastavka oblika "/RACUN NAZIV..."
          const cm = extra.match(/^\/(\d{16})\s*(.*)/);
          if (cm) {
            current.counterpartyAccount = cm[1];
            if (cm[2]) current.counterpartyName = cm[2].trim();
          } else if (current.counterpartyName) {
            current.counterpartyName = `${current.counterpartyName} ${extra}`.trim();
          }
        }
      }
    }
    current = null; // ne prenosi nastavke preko granice stranice
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

module.exports = { id: "raiffeisen", name: "Raiffeisen Bank", detect, parse };
