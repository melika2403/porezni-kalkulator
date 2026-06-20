// UniCredit Bank d.d. — izvod sa kolonama:
//   Referenca | Datum | Opis | Duguje | Potražuje
// EU format brojeva (4.000,00). Stari/Novi saldo na kraju. Opis u više
// redova koji okružuju "anchor" red (red sa datumom i iznosima), pa se
// dodatni redovi vežu za najbliži anchor po y.

const {
  parseAmount,
  parseDate,
  rowText,
  findRowByText,
  assignAmountsToColumns,
} = require("../engine");

const FORMAT = "eu";

function detect(pagesRows, allText) {
  return /UNICREDIT BANK/i.test(allText) && /IZVADAK\s*\/\s*IZVOD/i.test(allText);
}

function parse(pagesRows) {
  const warnings = [];
  const meta = {
    bankName: "UniCredit Bank",
    account: null,
    statementNumber: null,
    statementDate: null,
    currency: null,
  };

  const headerRow = findRowByText(pagesRows, /Referenca\s+Datum\s+Opis/);
  if (!headerRow) throw new Error("UniCredit: nema zaglavlja tabele");
  const dugujeHeader = headerRow.items.find((i) => /^Duguje$/i.test(i.str));
  const potrazujeHeader = headerRow.items.find((i) => /^Potražuje$/i.test(i.str));
  // vrijednosti su desno poravnate, centar vrijednosti je malo desno od
  // centra naslova kolone; koristimo centar naslova + mali pomak
  const columns = [
    { key: "duguje", center: dugujeHeader.x + 20 },
    { key: "potrazuje", center: potrazujeHeader.x + 20 },
  ];

  // meta podaci
  for (const { rows } of pagesRows) {
    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/IZVADAK\s*\/\s*IZVOD br:\s*(\d+)/i))) {
        meta.statementNumber = m[1];
      }
      if ((m = text.match(/Na dan:\s*(\d{2}\.\d{2}\.\d{4})/i))) {
        meta.statementDate = parseDate(m[1]);
      }
      if ((m = text.match(/^T\.R:\s*(\d{10,20})/i))) {
        meta.account = m[1];
      }
      if ((m = text.match(/^Valuta:\s*([A-Z]{3})/i))) {
        meta.currency = m[1];
      }
    }
  }

  let openingBalance = null;
  let closingBalance = null;
  const declaredTotals = {};
  const transactions = [];

  for (const { rows } of pagesRows) {
    // granice tabele na ovoj stranici
    const headerIdx = rows.findIndex((r) => /Referenca\s+Datum\s+Opis/.test(rowText(r)));
    const endIdx = rows.findIndex((r) => /Promet u valuti:/i.test(rowText(r)));

    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/Stari saldo:\s*(-?[\d.,]+)/i))) {
        openingBalance = parseAmount(m[1], FORMAT);
      }
      if ((m = text.match(/Novi saldo:\s*(-?[\d.,]+)/i))) {
        closingBalance = parseAmount(m[1], FORMAT);
      }
      if (/Promet u valuti:/i.test(text)) {
        const amounts = assignAmountsToColumns(row.items, columns, FORMAT, 400);
        if (amounts.duguje != null) declaredTotals.duguje = amounts.duguje;
        if (amounts.potrazuje != null) declaredTotals.potrazuje = amounts.potrazuje;
      }
    }

    if (headerIdx === -1) continue;
    const tableRows = rows.slice(
      headerIdx + 1,
      endIdx === -1 ? rows.length : endIdx,
    );

    // anchor = red sa datumom u koloni datuma i bar jednim iznosom desno
    const anchors = [];
    const others = [];
    for (const row of tableRows) {
      const dateItem = row.items.find(
        (i) => i.x > 80 && i.x < 135 && parseDate(i.str) != null,
      );
      const amounts = assignAmountsToColumns(row.items, columns, FORMAT, 400);
      if (dateItem && (amounts.duguje != null || amounts.potrazuje != null)) {
        const refItem = row.items.find((i) => i.x < 80);
        anchors.push({
          row,
          date: parseDate(dateItem.str),
          reference: refItem ? refItem.str.trim() : null,
          amounts,
          opisParts: row.items
            .filter((i) => i.x >= 135 && i.x < 430)
            .map((i) => ({ y: row.y, str: i.str })),
        });
      } else {
        others.push(row);
      }
    }

    // ostali redovi (nastavci opisa) idu najbližem anchoru po y
    for (const row of others) {
      if (anchors.length === 0) break;
      let best = anchors[0];
      for (const a of anchors) {
        if (Math.abs(a.row.y - row.y) < Math.abs(best.row.y - row.y)) best = a;
      }
      const text = row.items
        .filter((i) => i.x >= 135 && i.x < 430)
        .map((i) => i.str)
        .join(" ");
      if (text.trim()) best.opisParts.push({ y: row.y, str: text });
    }

    for (const a of anchors) {
      const duguje = a.amounts.duguje || 0;
      const potrazuje = a.amounts.potrazuje || 0;
      const direction = potrazuje > 0 ? "in" : "out";
      const description = a.opisParts
        .sort((p, q) => p.y - q.y)
        .map((p) => p.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      transactions.push({
        date: a.date,
        description,
        reference: a.reference,
        amount: direction === "in" ? potrazuje : duguje,
        direction,
        balanceAfter: null,
        counterpartyName: null,
        counterpartyAccount: null,
      });
    }
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

module.exports = { id: "unicredit", name: "UniCredit Bank", detect, parse };
