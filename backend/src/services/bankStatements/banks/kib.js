// KIB — Komercijalno-investiciona banka d.d. Velika Kladuša.
// Blok format: red sa rednim brojem + opis, pa red sa partijom/pozivom i
// iznosom u koloni Duguje (Isplate sa rn.) ili Potražuje (Uplate na rn.).
// EU format brojeva. Staro/Novo stanje + Suma prometa.
// NAPOMENA: izvod nema datum po transakciji — koristi se datum izvoda.

const {
  parseAmount,
  parseDate,
  rowText,
  findRowByText,
  assignAmountsToColumns,
} = require("../engine");

const FORMAT = "eu";

function detect(pagesRows, allText) {
  return /KOMERCIJALNO-INVESTICIONA BANKA/i.test(allText);
}

function parse(pagesRows) {
  // KIB izvod nema datum po transakciji — datum izvoda je datum svih stavki.
  const warnings = [];
  const meta = {
    bankName: "KIB Banka",
    account: null,
    statementNumber: null,
    statementDate: null,
    currency: null,
  };

  const dugujeHeader = findRowByText(pagesRows, /Duguje\s+Potražuje/i);
  if (!dugujeHeader) throw new Error("KIB: nema zaglavlja kolona");
  const dH = dugujeHeader.items.find((i) => /^Duguje$/i.test(i.str));
  const pH = dugujeHeader.items.find((i) => /^Potražuje$/i.test(i.str));
  const columns = [
    { key: "duguje", center: dH.x + 15 },
    { key: "potrazuje", center: pH.x + 15 },
  ];

  for (const { rows } of pagesRows) {
    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/IZVOD br\.?\s*(\d+)/i))) {
        meta.statementNumber = m[1];
      }
      if ((m = text.match(/Datum:\s*(\d{2}[./]\d{2}[./]\d{4})/i))) {
        meta.statementDate = parseDate(m[1]);
      }
      if ((m = text.match(/Partija:\s*(\d{10,20})/i))) {
        meta.account = m[1];
      }
      if ((m = text.match(/Valuta:\s*(KM|BAM|[A-Z]{3})/i))) {
        meta.currency = m[1] === "KM" ? "BAM" : m[1];
      }
    }
  }

  let openingBalance = null;
  let closingBalance = null;
  const declaredTotals = {};
  const transactions = [];

  for (const { rows } of pagesRows) {
    // granice tabele: od reda "Rbr ..." do "Suma prometa:"
    const headerIdx = rows.findIndex((r) => /^Rbr\s/i.test(rowText(r)));
    const sumaIdx = rows.findIndex((r) => /Suma prometa:/i.test(rowText(r)));

    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/Staro stanje:\s*(-?[\d.,]+)/i))) {
        openingBalance = parseAmount(m[1], FORMAT);
      }
      if ((m = text.match(/Novo stanje:\s*(-?[\d.,]+)/i))) {
        closingBalance = parseAmount(m[1], FORMAT);
      }
      if (/Suma prometa:/i.test(text)) {
        const amounts = assignAmountsToColumns(row.items, columns, FORMAT, 430);
        if (amounts.duguje != null) declaredTotals.duguje = amounts.duguje;
        if (amounts.potrazuje != null) declaredTotals.potrazuje = amounts.potrazuje;
      }
    }

    if (headerIdx === -1) continue;
    const tableRows = rows.slice(
      headerIdx + 1,
      sumaIdx === -1 ? rows.length : sumaIdx,
    );

    // blok počinje redom čiji je prvi element redni broj na x<30
    let block = null;
    const flush = () => {
      if (!block) return;
      const duguje = block.amounts.duguje || 0;
      const potrazuje = block.amounts.potrazuje || 0;
      if (duguje === 0 && potrazuje === 0) {
        warnings.push(`KIB: blok bez iznosa: "${block.opis.slice(0, 50)}"`);
        block = null;
        return;
      }
      const direction = potrazuje > 0 ? "in" : "out";
      transactions.push({
        date: meta.statementDate,
        description: block.opis.replace(/\s+/g, " ").trim(),
        reference: null,
        amount: direction === "in" ? potrazuje : duguje,
        direction,
        balanceAfter: null,
        counterpartyName: null,
        counterpartyAccount: block.counterpartyAccount,
      });
      block = null;
    };

    for (const row of tableRows) {
      const first = row.items[0];
      const isAnchor = first && first.x < 30 && /^\d+$/.test(first.str.trim());
      if (isAnchor) {
        flush();
        block = { opis: "", amounts: {}, counterpartyAccount: null };
      }
      if (!block) continue;
      const textParts = row.items
        .filter((i) => i.x >= 30 && i.x < 430)
        .map((i) => i.str)
        .join(" ")
        .trim();
      if (textParts) {
        block.opis = `${block.opis} ${textParts}`.trim();
        // protivračun na početku reda sa pozivom (16 cifara)
        const cm = textParts.match(/^(\d{16})\s*\//);
        if (cm) block.counterpartyAccount = cm[1];
      }
      const amounts = assignAmountsToColumns(row.items, columns, FORMAT, 430);
      if (amounts.duguje != null) block.amounts.duguje = amounts.duguje;
      if (amounts.potrazuje != null) block.amounts.potrazuje = amounts.potrazuje;
    }
    flush();
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

module.exports = { id: "kib", name: "KIB Banka", detect, parse };
