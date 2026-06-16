// Asseco SEE format izvoda — koriste ga više banaka u BiH (potvrđeno:
// BBI, MF Banka, ZiraatBank; prepoznaje se po "UKUPNO ZA IZVOD" +
// "Prethodno stanje" strukturi). Transakcije su numerisani blokovi:
//   N.  [naziv protivstrane]              [iznos u Duguje ili Potražuje]
//       Račun: <protivračun>
//       Nalog: <referenca>   Šifra pl.: NN
//       <opis u više redova>
//       Poziv na br.(odobrenja): ...
//       Datum izvršenja: dd.mm.yyyy  (ili samo "Datum:")
// US format brojeva (1,196.43).

const {
  parseAmount,
  parseDate,
  rowText,
  findRowByText,
  assignAmountsToColumns,
} = require("../engine");

const FORMAT = "us";

const KNOWN_BANKS = [
  { match: /Bosna Bank International/i, name: "BBI Banka" },
  { match: /MF banka/i, name: "MF Banka" },
  { match: /ZIRAATBANK/i, name: "Ziraat Bank" },
  { match: /ASA BANKA/i, name: "ASA Banka" },
];

const LABEL_RE =
  /^(Nalog|Račun|Šifra pl\.?|Datum izvršenja|Datum obrade|Vreme prijema|Datum|Poziv na br\.?\s*\(?.*?\)?)\s*:?$/i;

function detect(pagesRows, allText) {
  return (
    /UKUPNO ZA IZVOD/i.test(allText) &&
    /Prethodno stanje/i.test(allText) &&
    /Novo stanje/i.test(allText)
  );
}

function parse(pagesRows) {
  const warnings = [];
  const allText = pagesRows
    .map(({ rows }) => rows.map(rowText).join("\n"))
    .join("\n");
  const known = KNOWN_BANKS.find((b) => b.match.test(allText));
  const meta = {
    bankName: known ? known.name : "Banka (Asseco izvod)",
    account: null,
    statementNumber: null,
    statementDate: null,
    currency: "BAM",
  };

  for (const { rows } of pagesRows) {
    for (const row of rows) {
      const text = rowText(row);
      let m;
      if ((m = text.match(/IZVOD BROJ\s+(\d+)/i))) {
        meta.statementNumber = m[1];
      }
      if ((m = text.match(/^Od:\s*(\d{2}\.\d{2}\.\d{4})/i))) {
        meta.statementDate = parseDate(m[1]);
      }
      if (!meta.account && (m = text.match(/Račun:\s*([\d-]{10,30})/i))) {
        meta.account = m[1];
      }
    }
  }

  // zaglavlje kolona: red koji sadrži "Duguje" i "Potražuje" desno
  const headerRow = findRowByText(pagesRows, /Duguje\s+Potražuje\s*$/i);
  if (!headerRow) throw new Error("Asseco: nema zaglavlja kolona");
  const dH = headerRow.items.find((i) => /^Duguje$/i.test(i.str) && i.x > 350);
  const pH = headerRow.items.find((i) => /^Potražuje$/i.test(i.str) && i.x > 450);
  if (!dH || !pH) throw new Error("Asseco: ne mogu locirati kolone iznosa");
  const columns = [
    { key: "duguje", center: dH.x + 15 },
    { key: "potrazuje", center: pH.x + 15 },
  ];

  let openingBalance = null;
  let closingBalance = null;
  const declaredTotals = {};
  const declaredCounts = {};
  const transactions = [];

  let block = null;
  const flush = () => {
    if (!block) return;
    const duguje = block.amounts.duguje || 0;
    const potrazuje = block.amounts.potrazuje || 0;
    if (duguje === 0 && potrazuje === 0) {
      warnings.push(`Blok ${block.ordinal} nema iznos, preskočen.`);
      block = null;
      return;
    }
    const direction = potrazuje > 0 ? "in" : "out";
    transactions.push({
      date: block.date || meta.statementDate,
      description: block.opisParts.join(" ").replace(/\s+/g, " ").trim(),
      reference: block.reference,
      amount: direction === "in" ? potrazuje : duguje,
      direction,
      balanceAfter: null,
      counterpartyName: block.nameParts.length
        ? block.nameParts.join(" ").replace(/\s+/g, " ").trim()
        : null,
      counterpartyAccount: block.counterpartyAccount,
    });
    block = null;
  };

  for (const { rows } of pagesRows) {
    for (const row of rows) {
      const text = rowText(row);
      let m;

      if (/UKUPNO ZA IZVOD/i.test(text)) {
        flush();
        continue;
      }
      if ((m = text.match(/Prethodno stanje:\s*(-?[\d.,]+)/i))) {
        openingBalance = parseAmount(m[1], FORMAT);
        continue;
      }
      if ((m = text.match(/Novo stanje:\s*(-?[\d.,]+)/i))) {
        closingBalance = parseAmount(m[1], FORMAT);
        continue;
      }
      if ((m = text.match(/Ukupno stavki duguje:\s*(\d+)\s+(-?[\d.,]+)/i))) {
        declaredCounts.duguje = Number(m[1]);
        declaredTotals.duguje = parseAmount(m[2], FORMAT);
        continue;
      }
      if ((m = text.match(/Ukupno stavki potražuje:\s*(\d+)\s+(-?[\d.,]+)/i))) {
        declaredCounts.potrazuje = Number(m[1]);
        declaredTotals.potrazuje = parseAmount(m[2], FORMAT);
        continue;
      }

      const first = row.items[0];
      const isAnchor =
        first && first.x < 35 && /^\d+\.$/.test(first.str.trim());

      if (isAnchor) {
        flush();
        block = {
          ordinal: first.str.trim(),
          nameParts: [],
          opisParts: [],
          amounts: assignAmountsToColumns(row.items, columns, FORMAT, 380),
          reference: null,
          counterpartyAccount: null,
          date: null,
        };
        const name = row.items
          .filter((i) => i.x >= 40 && i.x < 380)
          .map((i) => i.str)
          .join(" ")
          .trim();
        if (name) block.nameParts.push(name);
        continue;
      }

      if (!block) continue;

      const label = first && LABEL_RE.test(first.str.trim()) ? first : null;
      if (label) {
        const labelName = label.str.trim().replace(/:$/, "");
        const valueItems = row.items.filter((i) => i !== label);
        const value = valueItems.map((i) => i.str).join(" ").trim();
        if (/^Račun/i.test(labelName)) {
          const am = value.match(/(\d{10,20})/);
          if (am) block.counterpartyAccount = am[1];
        } else if (/^Nalog/i.test(labelName)) {
          block.reference = value.split(/\s{2,}|Šifra pl/i)[0].trim() || value;
          // na istom redu može biti i "Šifra pl.: N" — ignorišemo šifru
          const refOnly = valueItems
            .filter((i) => i.x < 290)
            .map((i) => i.str)
            .join(" ")
            .trim();
          if (refOnly) block.reference = refOnly;
        } else if (/^Datum izvršenja$/i.test(labelName) || /^Datum$/i.test(labelName)) {
          const dateItem = valueItems.find((i) => parseDate(i.str) != null);
          if (dateItem) block.date = parseDate(dateItem.str);
        } else if (/^Poziv na br/i.test(labelName)) {
          if (value) block.opisParts.push(`Poziv na br: ${value}`);
        }
        // Datum obrade / Vreme prijema: ignorisano
        continue;
      }

      // bez labele: opis (x≈85-95) ili nastavak naziva (x≈50-65)
      if (first && first.x >= 78 && first.x < 110) {
        block.opisParts.push(
          row.items.map((i) => i.str).join(" ").trim(),
        );
      } else if (first && first.x >= 40 && first.x < 78) {
        block.nameParts.push(
          row.items
            .filter((i) => i.x < 380)
            .map((i) => i.str)
            .join(" ")
            .trim(),
        );
      }
    }
    flush();
  }

  // dodatna provjera: broj stavki koje banka deklariše
  const outCount = transactions.filter((t) => t.direction === "out").length;
  const inCount = transactions.filter((t) => t.direction === "in").length;
  if (declaredCounts.duguje != null && declaredCounts.duguje !== outCount) {
    warnings.push(
      `Broj duguje stavki (${outCount}) se ne slaže sa izvodom (${declaredCounts.duguje})`,
    );
  }
  if (declaredCounts.potrazuje != null && declaredCounts.potrazuje !== inCount) {
    warnings.push(
      `Broj potražuje stavki (${inCount}) se ne slaže sa izvodom (${declaredCounts.potrazuje})`,
    );
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

module.exports = { id: "asseco", name: "Asseco format", detect, parse };
