// ──────────────────────────────────────────────────────────────────────────────
//  Orchestrator za generisanje svih uplatnica iz Payroll snapshot-a.
//  Vraća array { type, filename, bytes } za 8 vrsta uplatnica:
//    PLATNA_LISTA (TODO Faza 4), UPLATNICA_NETO, UPLATNICA_PIO, UPLATNICA_ZDR,
//    UPLATNICA_NEZAP, UPLATNICA_POREZ, UPLATNICA_VODNA, UPLATNICA_NESRECE,
//    UPLATNICA_INVALIDI
// ──────────────────────────────────────────────────────────────────────────────
const {
  KANTONI,
  FBIH_BUDZET_RACUN,
  FBIH_ZO_RACUN,
  FBIH_NEZAP_RACUN,
  FOND_INVALIDI_RACUN,
  kantonForOpcina,
  generateUplatnica,
} = require("./uplatnicaPdf");

// Stopa za fond invalida — 0,5% × ukupne bruto plate (po radniku se obračunava
// na nivou organizacije, ali za sad generišemo po radniku).
const FOND_INVALIDI_RATE = 0.005;

// ── Default konfiguracija ──────────────────────────────────────────────────
// Sve vrste prihoda i računi za FBiH. Korisnik može override-ati per-organization
// preko Organization.payrollAccounts JSON polja.
function buildDefaults(kantonKey) {
  const k = KANTONI[kantonKey];
  return {
    pio: {
      account: FBIH_BUDZET_RACUN,
      vrstaPrihoda: "712112",
      budgetOrg: "5102001",
      primalac: ["Budžet Federacije BiH", "Doprinos za PIO/MIO"],
    },
    zdrKanton: {
      account: k ? k.zoRacun : "",
      vrstaPrihoda: "712116",
      budgetOrg: "",
      primalac: k
        ? ["Zavod zdravstvenog osiguranja", k.genitiv]
        : ["Zavod zdravstvenog osiguranja"],
    },
    zdrFed: {
      account: FBIH_ZO_RACUN,
      vrstaPrihoda: "712116",
      budgetOrg: "",
      primalac: ["Zavod zdravstvenog osiguranja i reosiguranja FBiH"],
    },
    nezapFed: {
      account: FBIH_NEZAP_RACUN,
      vrstaPrihoda: "712113",
      budgetOrg: "",
      primalac: ["Federalni zavod za zapošljavanje"],
    },
    nezapKanton: {
      account: k ? k.nezapRacun : "",
      vrstaPrihoda: "712113",
      budgetOrg: "",
      primalac: k
        ? ["Kantonalna služba za zapošljavanje", k.genitiv]
        : ["Kantonalna služba za zapošljavanje"],
    },
    porez: {
      account: k ? k.budzet : "",
      vrstaPrihoda: "716113",
      budgetOrg: "",
      primalac: k ? ["Budžet " + k.genitiv] : ["Budžet kantona"],
    },
    vodna: {
      // Vodne naknade idu na KANTONALNI budžet firme (sjedište), po Zakonu
      // o vodama. Općina = općina firme.
      account: k ? k.budzet : "",
      vrstaPrihoda: "722581",
      budgetOrg: "",
      primalac: k ? ["Budžet " + k.genitiv, "Opća vodna naknada"] : ["Budžet kantona", "Opća vodna naknada"],
    },
    nesrece: {
      // Naknada za zaštitu od prirodnih nesreća — kantonalni budžet firme.
      account: k ? k.budzet : "",
      vrstaPrihoda: "722441",
      budgetOrg: "",
      primalac: k
        ? ["Budžet " + k.genitiv, "Naknada za zaštitu od prirodnih nesreća"]
        : ["Budžet kantona", "Naknada za zaštitu od prirodnih nesreća"],
    },
    fondInvalidi: {
      account: FOND_INVALIDI_RACUN,
      vrstaPrihoda: "722569",
      budgetOrg: "",
      primalac: [
        "Fond za profesionalnu rehabilitaciju i",
        "zapošljavanje osoba sa invaliditetom",
      ],
    },
  };
}

// Merge user override over defaults. Override može biti djelimičan
// (samo polja koja korisnik mijenja).
function mergePayrollAccounts(defaults, override) {
  if (!override || typeof override !== "object") return defaults;
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (override[key] && typeof override[key] === "object") {
      const o = override[key];
      out[key] = {
        account: o.account || defaults[key].account,
        vrstaPrihoda: o.vrstaPrihoda || defaults[key].vrstaPrihoda,
        budgetOrg: o.budgetOrg ?? defaults[key].budgetOrg ?? "",
        primalac: Array.isArray(o.primalac) && o.primalac.length
          ? o.primalac
          : defaults[key].primalac,
      };
    }
  }
  return out;
}

// Resolve effective payroll accounts for an organization based on its city + override.
function resolvePayrollAccounts(organization) {
  const opcinaInfo = kantonForOpcina(organization?.city || "");
  const kantonKey = opcinaInfo?.kantonKey || null;
  const defaults = buildDefaults(kantonKey);
  const merged = mergePayrollAccounts(defaults, organization?.payrollAccounts);
  return { kantonKey, opcinaKod: opcinaInfo?.opcinaKod || "", opcinaIme: organization?.city || "", accounts: merged };
}

// ── Helper: kreiraj doprinos/porez uplatnicu (sa "javnim prihodima") ────────
async function makeDoprinosUplatnica(payroll, organization, opcinaIme, opcinaKod, kmIznos, accountDef, svrha, datum) {
  return generateUplatnica({
    uplatio: [
      organization.name || "",
      [organization.address, organization.city].filter(Boolean).join(", "),
    ],
    svrha,
    primatelj: Array.isArray(accountDef.primalac) ? accountDef.primalac : [accountDef.primalac],
    racunPosilDigits: organization.bankAccount
      ? organization.bankAccount.replace(/-/g, "")
      : undefined,
    racunPrimDigits: (accountDef.account || "").replace(/-/g, ""),
    kmIznos,
    vrstaProhoda: accountDef.vrstaPrihoda || "",
    // Za doprinose: broj poreznog obveznika = JIB firme (ne JMBG radnika)
    brojObveznika: (organization.taxNumber || "").replace(/\D/g, ""),
    budgetOrg: accountDef.budgetOrg || "",
    opcinaKod,
    opcinaIme,
    datum,
    periodMjesec: String(payroll.month).padStart(2, "0"),
    periodGodina: String(payroll.year),
  });
}

/**
 * Generiše sve uplatnice za jedan Payroll snapshot.
 * @param {Object} payroll - Payroll Sequelize instance (.get() već primijenjen)
 * @param {Object} organization - Organization (sa payrollAccounts i city)
 * @param {Object} worker - Worker (firstName, lastName, jmbg, bankAccount, address, city)
 * @returns {Promise<Array<{type, filename, bytes, mimeType}>>}
 */
async function generateAllUplatnice(payroll, organization, worker) {
  const { opcinaKod, opcinaIme, accounts } = resolvePayrollAccounts(organization);

  const datum = new Date().toISOString().slice(0, 10);
  const monthYear = `${String(payroll.month).padStart(2, "0")}/${payroll.year}`;

  // Iznosi iz snapshot-a
  const net = Number(payroll.net) || 0;
  const empPio = Number(payroll.empPio) || 0;
  const erpPio = Number(payroll.erpPio) || 0;
  const empZdr = Number(payroll.empZdravstvo) || 0;
  const erpZdr = Number(payroll.erpZdravstvo) || 0;
  const empNezap = Number(payroll.empNezaposlenost) || 0;
  const erpNezap = Number(payroll.erpNezaposlenost) || 0;
  const porez = Number(payroll.incomeTax) || 0;
  const vodna = Number(payroll.vodnaNaknada) || 0;
  const nesrece = Number(payroll.naknadaNesrece) || 0;
  const gross = Number(payroll.gross) || 0;
  const invalidiIznos = +(gross * FOND_INVALIDI_RATE).toFixed(2);

  // Sumirani iznosi
  const pioTotal = +(empPio + erpPio).toFixed(2);
  const zdravstvoTotal = +(empZdr + erpZdr).toFixed(2);
  // Zdravstvo se dijeli na kantonalni (89,8%) i federalni (10,2%) dio
  const zdrKanton = +(zdravstvoTotal * 0.898).toFixed(2);
  const zdrFed = +(zdravstvoTotal - zdrKanton).toFixed(2);
  const nezapTotal = +(empNezap + erpNezap).toFixed(2);
  // Nezaposlenost: 30% federalni (Federalni zavod za zapošljavanje),
  // 70% kantonalni (kantonalna služba za zapošljavanje prema prebivalištu)
  const nezapFed = +(nezapTotal * 0.3).toFixed(2);
  const nezapKanton = +(nezapTotal - nezapFed).toFixed(2);

  const workerName = `${worker.firstName || ""} ${worker.lastName || ""}`.trim();
  const workerAddress = [worker.address, worker.city].filter(Boolean).join(", ");
  const safeName = workerName.replace(/\s+/g, "_");
  const safeYM = monthYear.replace("/", "-");

  const results = [];

  // ── 1. UPLATNICA_NETO — neto plata radniku (BEZ javnih prihoda) ───────────
  if (net > 0) {
    const bytes = await generateUplatnica({
      uplatio: [organization.name || "", [organization.address, organization.city].filter(Boolean).join(", ")],
      svrha: `Isplata neto plate za ${monthYear} — ${workerName}`,
      primatelj: [workerName, workerAddress],
      racunPosilDigits: organization.bankAccount ? organization.bankAccount.replace(/-/g, "") : undefined,
      racunPrimDigits: worker.bankAccount ? worker.bankAccount.replace(/-/g, "") : "",
      kmIznos: net,
      opcinaIme,
      datum,
      periodMjesec: String(payroll.month).padStart(2, "0"),
      periodGodina: String(payroll.year),
      skipJavniPrihodi: true, // ← isplata radniku nije javni prihod
    });
    results.push({
      type: "UPLATNICA_NETO",
      filename: `uplatnica-neto-${safeName}-${safeYM}.pdf`,
      bytes,
      mimeType: "application/pdf",
    });
  }

  const push = (type, suffix, bytes) =>
    results.push({
      type,
      filename: `uplatnica-${suffix}-${safeName}-${safeYM}.pdf`,
      bytes,
      mimeType: "application/pdf",
    });

  // ── 2. PIO/MIO doprinos ───────────────────────────────────────────────────
  if (pioTotal > 0) {
    push("UPLATNICA_PIO", "pio",
      await makeDoprinosUplatnica(payroll, organization, opcinaIme, opcinaKod, pioTotal,
        accounts.pio, `Doprinos za PIO/MIO za ${monthYear} — ${workerName}`, datum));
  }

  // ── 3. Zdravstvo — kantonalni dio (89,8%) ─────────────────────────────────
  if (zdrKanton > 0) {
    push("UPLATNICA_ZDR", "zdr-kant",
      await makeDoprinosUplatnica(payroll, organization, opcinaIme, opcinaKod, zdrKanton,
        accounts.zdrKanton, `Doprinos za zdravstvo (kantonalni) za ${monthYear} — ${workerName}`, datum));
  }

  // ── 4. Zdravstvo — federalni dio (10,2%) ──────────────────────────────────
  if (zdrFed > 0) {
    push("UPLATNICA_ZDR_FED", "zdr-fed",
      await makeDoprinosUplatnica(payroll, organization, opcinaIme, opcinaKod, zdrFed,
        accounts.zdrFed, `Doprinos za zdravstvo (federalni) za ${monthYear} — ${workerName}`, datum));
  }

  // ── 5. Nezaposlenost — federalni dio (30%) ────────────────────────────────
  if (nezapFed > 0) {
    push("UPLATNICA_NEZAP", "nezap-fed",
      await makeDoprinosUplatnica(payroll, organization, opcinaIme, opcinaKod, nezapFed,
        accounts.nezapFed, `Doprinos za nezaposlenost (federalni) za ${monthYear} — ${workerName}`, datum));
  }

  // ── 6. Nezaposlenost — kantonalni dio (70%) ───────────────────────────────
  if (nezapKanton > 0) {
    push("UPLATNICA_NEZAP_KANT", "nezap-kant",
      await makeDoprinosUplatnica(payroll, organization, opcinaIme, opcinaKod, nezapKanton,
        accounts.nezapKanton, `Doprinos za nezaposlenost (kantonalni) za ${monthYear} — ${workerName}`, datum));
  }

  // ── 7. Porez na dohodak ───────────────────────────────────────────────────
  if (porez > 0) {
    push("UPLATNICA_POREZ", "porez",
      await makeDoprinosUplatnica(payroll, organization, opcinaIme, opcinaKod, porez,
        accounts.porez, `Porez na dohodak iz plate za ${monthYear} — ${workerName}`, datum));
  }

  // ── 8. Opća vodna naknada ─────────────────────────────────────────────────
  if (vodna > 0) {
    push("UPLATNICA_VODNA", "vodna",
      await makeDoprinosUplatnica(payroll, organization, opcinaIme, opcinaKod, vodna,
        accounts.vodna, `Opća vodna naknada za ${monthYear} — ${workerName}`, datum));
  }

  // ── 9. Zaštita od prirodnih nesreća ──────────────────────────────────────
  if (nesrece > 0) {
    push("UPLATNICA_NESRECE", "nesrece",
      await makeDoprinosUplatnica(payroll, organization, opcinaIme, opcinaKod, nesrece,
        accounts.nesrece, `Naknada za zaštitu od prirodnih nesreća za ${monthYear} — ${workerName}`, datum));
  }

  // ── 10. Fond za rehabilitaciju OSI (0,5% × bruto) ─────────────────────────
  if (invalidiIznos > 0) {
    push("UPLATNICA_INVALIDI", "invalidi",
      await makeDoprinosUplatnica(payroll, organization, opcinaIme, opcinaKod, invalidiIznos,
        accounts.fondInvalidi,
        `Naknada za rehabilitaciju i zapošljavanje OSI za ${monthYear} — ${workerName}`, datum));
  }

  return results;
}

module.exports = {
  generateAllUplatnice,
  resolvePayrollAccounts,
  buildDefaults,
  mergePayrollAccounts,
  FOND_INVALIDI_RATE,
};
