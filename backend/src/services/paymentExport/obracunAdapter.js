// Adapter: mjesečni obračun plata → TkdisNalog[] za izvoz u e-bankarstvo.
//
// NE izmišlja nove naloge: preslikava TAČNO onu listu koju gradi postojeći
// generator mjesečnih uplatnica (payrollController.generateMonthlyUplatnice):
//   1. zbirni javni prihodi kroz buildAllUplatnice (PIO, zdravstvo kantonalno
//      po općini + federalno, nezaposlenost 70/30, porez po općini radnika,
//      vodna, nesreće, fond invalida, RS varijante; opcija objedinjavanja
//      kantonalnih po kantonu sa šifrom opštine sjedišta)
//   2. lične isplate po radniku (neto plata, topli obrok, regres, putni
//      trošak) kao prenosi na tekući račun radnika
// Iznosi, računi, vrste prihoda, budžetske organizacije i svrhe su isti kao
// na uplatnicama. Adapter SAMO ČITA payroll podatke, ništa ne mijenja.
//
// Spec: docs/faza0-tkdis-izvoz-halcom.md (posebno "Dopune nakon reviewa").

const {
  buildAllUplatnice,
  getAccountInfo,
  VRSTA_SVRHA_MAP,
} = require("../../controllers/payrollController");
const { FOND_INVALIDI_RATE } = require("../../utils/payrollUplatnice");
const { pttZaGrad } = require("./pttBrojevi");

// TKDIS traži mjesto primaoca koje uplatnice nemaju. Do registra stalnih
// primaoca (sa Halcom kraticama) važi ugrađena mapa: federalni primaoci su u
// Sarajevu, Budžet RS u Banjoj Luci, kantonalni primaoci u sjedištu kantona.
const SJEDISTE_KANTONA = {
  USK: "BIHAĆ",
  POS: "ORAŠJE",
  TUZ: "TUZLA",
  ZDK: "ZENICA",
  BPK: "GORAŽDE",
  SBK: "TRAVNIK",
  HNK: "MOSTAR",
  ZHK: "ŠIROKI BRIJEG",
  KS: "SARAJEVO",
  K10: "LIVNO",
};
const FEDERALNE_VRSTE = new Set(["pio", "zdrFed", "nezapFed", "fondInvalidi"]);

function mjestoPrimaoca(entry) {
  if (entry.source === "rs") return "BANJA LUKA";
  if (FEDERALNE_VRSTE.has(entry.vrsta)) return "SARAJEVO";
  // kantonalne vrste + vodna/nesreće (kantonalni budžet firme)
  return SJEDISTE_KANTONA[entry.kantonKey] || entry.opcinaIme || "";
}

// TKDIS naziv je jedno polje od 35 znakova: uzima se SAMO prva linija naziva
// primaoca sa uplatnice (druga linija je opis, ne naziv).
function prvaLinija(primalac) {
  if (Array.isArray(primalac)) return String(primalac[0] || "");
  return String(primalac || "");
}

const kmUFeninge = (km) => Math.round((Number(km) || 0) * 100);

/**
 * Iz obračuna mjeseca gradi TkdisFile (bez datuma valute, njega bira korisnik
 * pri izvozu) + listu preskočenih ličnih isplata (radnik bez tekućeg računa).
 *
 * @param {{
 *   org: Object,            // Organization plain (name, city, bankAccount, taxNumber, type, payrollAccounts)
 *   payrolls: Array<Object>, // Payroll zapisi mjeseca (orphani već izbačeni)
 *   workerMap: Map<number, Object>,
 *   year: number, month: number,
 *   datumValute: Date,
 *   combineKantonal: boolean,
 * }} input
 * @returns {{ file: Object, preskoceni: Array<{radnik: string, stavka: string, iznosKm: number, razlog: string}> }}
 */
function buildTkdisIzObracuna(input) {
  const { org, payrolls, workerMap, year, month, datumValute, combineKantonal } = input;
  const monthYear = `${String(month).padStart(2, "0")}/${year}`;
  const jib = String(org.taxNumber || "").replace(/\D/g, "");
  const periodOd = new Date(year, month - 1, 1);
  const periodDo = new Date(year, month, 0);
  // Poziv na broj za javne prihode: broj mjeseca obračuna na 10 cifara
  // (potvrđeno u Halcom fixture: juni → 0000000006).
  const pozivNaBroj = String(month).padStart(10, "0");

  const nalozi = [];
  const preskoceni = [];

  // ── 1. Zbirni javni prihodi, identično mjesečnim uplatnicama ──────────────
  const entries = buildAllUplatnice(payrolls, workerMap, org, {
    fondInvalidiRate: FOND_INVALIDI_RATE,
    combineKantonal: !!combineKantonal,
  });
  for (const e of entries) {
    if (!(e.amount > 0)) continue;
    const acc = getAccountInfo(e.vrsta, e.kantonKey, org.payrollAccounts);
    const groupLabel =
      e.group === "vlasnik" ? "Vlasnik, " : e.group === "radnici" ? "Radnici, " : "";
    if (!acc || !String(acc.account || "").trim()) {
      // Nikad tiho: nalog bez računa primaoca (npr. grad organizacije nije u
      // šifarniku kantona) ide u preskočene sa razlogom, ne nestaje iz datoteke.
      preskoceni.push({
        radnik: "",
        stavka: `${groupLabel}${VRSTA_SVRHA_MAP[e.vrsta] || e.vrsta}`,
        iznosKm: +Number(e.amount).toFixed(2),
        razlog:
          "nije određen račun primaoca: provjerite grad organizacije (kanton) i postavke uplatnica",
      });
      continue;
    }
    nalozi.push({
      tip: "javniPrihod",
      racun: acc.account,
      naziv: prvaLinija(acc.primalac),
      mjesto: mjestoPrimaoca(e),
      svrha: `${groupLabel}${VRSTA_SVRHA_MAP[e.vrsta] || e.vrsta} za ${monthYear}`,
      iznosFeninga: kmUFeninge(e.amount),
      jib,
      vrstaPrihoda: acc.vrstaPrihoda || "",
      periodOd,
      periodDo,
      opcina: e.opcinaKod || "",
      // prazna budžetska organizacija se na nalogu piše kao 7 nula
      // (potvrđeno u fixture, vidi dopunu 4 u spec dokumentu)
      budzetskaOrganizacija: acc.budgetOrg || "0000000",
      pozivNaBroj,
    });
  }

  // ── 2. Lične isplate po radniku, identično mjesečnim uplatnicama ──────────
  for (const p of payrolls) {
    const w = workerMap.get(p.workerId);
    if (!w) continue;
    // Vlasnik obrta NEMA platu: njegov obračun je samo za doprinose (Obrazac
    // 2002, uključeni u javne prihode iznad), pa se za njega ne prave nalozi
    // ličnih isplata NITI upozorenje o tekućem računu. Kod d.o.o. vlasnik sa
    // ugovorom o radu ima pravu platu i prolazi normalno.
    if (org.type === "BUSINESS" && w.role === "VLASNIK") continue;
    const workerName = `${w.firstName || ""} ${w.lastName || ""}`.trim();
    // Neto plata se isplaćuje umanjena za obustave (rate kredita radnika).
    // Obustava >= neto: nalog za platu se ne pravi, uz jasan razlog u
    // preskočenima (guard iznosKm > 0 ispod bi ga inače tiho progutao).
    const netKm = Number(p.net) || 0;
    const obustaveKm = Math.max(0, Number(p.obustave) || 0);
    const netZaIsplatu = +(netKm - obustaveKm).toFixed(2);
    if (netKm > 0 && obustaveKm >= netKm) {
      preskoceni.push({
        radnik: workerName,
        stavka: "Neto plata",
        iznosKm: +netKm.toFixed(2),
        razlog: `obustave (${obustaveKm.toFixed(2).replace(".", ",")} KM) su veće ili jednake neto plati, nalog nije generisan`,
      });
    }
    // kategorija dijeli Raiffeisen izvoz u zasebne datoteke (banka bira
    // vrstu plaćanja i šifru svrhe po paketu pri uvozu); ostali formati je
    // ignorišu
    const stavke = [
      ["Neto plata", netZaIsplatu, "Isplata neto plate", "plata"],
      ["Topli obrok", Number(p.mealAllowance) || 0, "Topli obrok (neoporezivi)", "obrok"],
      ["Regres", Number(p.vacationBonus) || 0, "Regres za godišnji odmor", "regres"],
      ["Putni trošak", Number(p.travelExpense) || 0, "Putni trošak (neoporezivi)", "prevoz"],
    ];
    for (const [label, iznosKm, svrha, kategorija] of stavke) {
      if (!(iznosKm > 0)) continue;
      const racunCifre = String(w.bankAccount || "").replace(/\D/g, "");
      if (racunCifre.length !== 16) {
        // Nalog bez ispravnog računa se NE izvozi: preskoči uz jasan razlog,
        // nikad tiho i nikad rušenjem cijele datoteke.
        preskoceni.push({
          radnik: workerName,
          stavka: label,
          iznosKm: +Number(iznosKm).toFixed(2),
          razlog: w.bankAccount
            ? `tekući račun nije ispravan (${w.bankAccount})`
            : "nema upisan tekući račun",
        });
        continue;
      }
      nalozi.push({
        tip: "prenos",
        kategorija,
        racun: racunCifre,
        naziv: workerName,
        mjesto: w.city || org.city || "",
        svrha: `${svrha} za ${monthYear}, ${workerName}`,
        sifra1: "01",
        sifra2: "10",
        sifra3: "",
        iznosFeninga: kmUFeninge(iznosKm),
      });
    }
  }

  return {
    file: {
      platilac: {
        racun: org.bankAccount || "",
        naziv: org.name || "",
        // adresa treba samo Raiffeisen SM zaglavlju; TKDIS i ELBA je ignorišu
        adresa: org.address || "",
        mjesto: org.city || "",
        // Raiffeisen SM piše mjesto SA poštanskim brojem ("77220 CAZIN",
        // potvrđeno u Com_Soft datotekama koje novo online bankarstvo prima).
        // Odvojeno polje da se TKDIS/ELBA tok (bez PTT) uopšte ne dira.
        mjestoSaPtt: (() => {
          const grad = String(org.city || "").trim();
          if (/^\d/.test(grad)) return grad; // PTT već upisan uz grad
          const ptt = pttZaGrad(grad);
          return ptt ? `${ptt} ${grad}` : grad;
        })(),
      },
      datumValute,
      nalozi,
    },
    preskoceni,
  };
}

module.exports = { buildTkdisIzObracuna };
