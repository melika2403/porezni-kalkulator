// Razlikovanje doprinosa VLASNIKA obrta od doprinosa RADNIKA na izvodu.
//
// Problem: isti računi javnih prihoda (Budžet FBiH za PIO, kantonalni ZZO,
// zavodi za zapošljavanje) primaju i doprinose vlasnika (KPR kolona 18) i
// doprinose iz plata radnika (dio bruto plate, KPR kolona 17). Po računu
// primaoca se to NE može razdvojiti, ali po iznosu može: vlasnikova osnovica
// je fiksna (Sl. novine, po režimu oporezivanja i kategoriji djelatnosti),
// pa su i njegovi mjesečni iznosi po nalogu unaprijed poznati.
//
// Očekivani iznosi vlasnika se skupe iz dva izvora:
//   1. podešavanja obrta (taxRegime + taxCategory → osnovica iz obrtniciFbih.js,
//      pa stope 19,5% / 14,5% / 2% i iste kantonalno-federalne podjele kao na
//      uplatnicama: zdravstvo 89,8/10,2, nezaposlenost 70/30)
//   2. stvarnih obračuna vlasnika u PK Office (Payroll za Worker-a VLASNIK):
//      pokriva pro-rate mjesece i starije godine
//
// Pravila prijedloga (samo kad obrt IMA radnike):
//   - iznos odgovara vlasnikovom iznosu za taj fond → DOPRINOSI_PODUZETNIKA
//   - inače → PLATE_ZAPOSLENIKA (pretpostavka: doprinosi radnika, dio bruto plate)
// Obrt bez radnika ili bez utvrdivih iznosa vlasnika: bez prijedloga odavde,
// odlučuju naučena/seed pravila (sve na tim računima je ionako vlasnikovo).

const { Organization, Worker, Payroll } = require("../../models/index");
const {
  getOsnovica,
  OSNOVICE_OBRTNICI_FBIH,
  OBRTNIK_PIO,
  OBRTNIK_ZDR,
  OBRTNIK_NEZAP,
} = require("../../utils/obrtniciFbih");
const { lookupJavniPrihod } = require("./javniPrihodi");

// Tolerancija poređenja u feninzima: pokriva razlike u zaokruživanju
// kantonalno-federalnih podjela kad knjigovođa računa "svojim" redoslijedom.
const TOLERANCIJA_CENTI = 2;

const r2 = (n) => +(Number(n) || 0).toFixed(2);
const toCents = (n) => Math.round(Math.abs(Number(n) || 0) * 100);

/**
 * Iz ukupnih mjesečnih doprinosa vlasnika izvedi iznose po nalogu (fondu),
 * onako kako se pojavljuju na izvodu. Ukupni zdr/nezap idu i u kantonalne i
 * u federalne setove: dio obrtnika plaća cijeli doprinos jednim nalogom.
 */
function dodajIznose(sets, { pio, zdr, nezap }) {
  const zdrKanton = r2(zdr * 0.898);
  const zdrFed = r2(zdr - zdrKanton);
  const nezapFed = r2(nezap * 0.3);
  const nezapKanton = r2(nezap - nezapFed);
  if (pio > 0) sets.PIO.add(toCents(pio));
  if (zdrKanton > 0) sets.ZDR_KANTON.add(toCents(zdrKanton));
  if (zdrFed > 0) sets.ZDR_FED.add(toCents(zdrFed));
  if (zdr > 0) {
    sets.ZDR_KANTON.add(toCents(zdr));
    sets.ZDR_FED.add(toCents(zdr));
  }
  if (nezapKanton > 0) sets.NEZAP_KANTON.add(toCents(nezapKanton));
  if (nezapFed > 0) sets.NEZAP_FED.add(toCents(nezapFed));
  if (nezap > 0) {
    sets.NEZAP_KANTON.add(toCents(nezap));
    sets.NEZAP_FED.add(toCents(nezap));
  }
}

const NOOP = () => null;

/**
 * Učitaj suggester za organizaciju: (tx) => "DOPRINOSI_PODUZETNIKA" |
 * "PLATE_ZAPOSLENIKA" | null. Null znači "nemam mišljenje" (nije račun
 * doprinosa, priliv, obrt bez radnika, iznosi vlasnika nepoznati).
 */
async function loadVlasnikDoprinosSuggester(organizationId) {
  // Samo obrt (BUSINESS): "doprinosi poduzetnika" je obrtnički pojam, a kod
  // d.o.o. je i vlasnik-direktor zaposlenik (njegovi obračuni NISU po fiksnoj
  // osnovici i ne smiju puniti očekivane iznose).
  const org = await Organization.findByPk(organizationId, {
    attributes: ["id", "type", "taxRegime", "taxCategory"],
  });
  if (!org || org.type !== "BUSINESS") return NOOP;

  const brojRadnika = await Worker.count({
    where: { organizationId, role: "RADNIK" },
  });
  if (brojRadnika === 0) return NOOP;

  const sets = {
    PIO: new Set(),
    ZDR_KANTON: new Set(),
    ZDR_FED: new Set(),
    NEZAP_KANTON: new Set(),
    NEZAP_FED: new Set(),
  };

  // 1. iz podešavanja obrta, za sve godine iz tabele osnovica
  if (org.taxRegime) {
    for (const year of Object.keys(OSNOVICE_OBRTNICI_FBIH)) {
      try {
        const osnovica = getOsnovica(
          Number(year),
          org.taxRegime,
          org.taxCategory || undefined,
        );
        dodajIznose(sets, {
          pio: r2(osnovica * OBRTNIK_PIO),
          zdr: r2(osnovica * OBRTNIK_ZDR),
          nezap: r2(osnovica * OBRTNIK_NEZAP),
        });
      } catch {
        // nepotpuna/nepoznata kombinacija režima i kategorije: preskoči godinu
      }
    }
  }

  // 2. iz stvarnih obračuna vlasnika (pokriva pro-rate i starije godine)
  const vlasnici = await Worker.findAll({
    where: { organizationId, role: "VLASNIK" },
    attributes: ["id"],
    raw: true,
  });
  if (vlasnici.length > 0) {
    const obracuni = await Payroll.findAll({
      where: { workerId: vlasnici.map((v) => v.id), organizationId },
      attributes: ["empPio", "empZdravstvo", "empNezaposlenost"],
      raw: true,
    });
    for (const o of obracuni) {
      dodajIznose(sets, {
        pio: r2(o.empPio),
        zdr: r2(o.empZdravstvo),
        nezap: r2(o.empNezaposlenost),
      });
    }
  }

  const imaIznosa = Object.values(sets).some((s) => s.size > 0);
  if (!imaIznosa) return NOOP;

  return napraviSuggester(sets);
}

/** Čisti dio suggestera (bez baze), izdvojen i radi testiranja. */
function napraviSuggester(sets) {
  return (tx) => {
    const direction = String(tx.direction || "").toUpperCase();
    if (direction !== "OUT" || !tx.counterpartyAccount) return null;
    const hit = lookupJavniPrihod(tx.counterpartyAccount);
    if (!hit || !hit.fond) return null;
    const set = sets[hit.fond];
    if (!set || set.size === 0) return null;
    const cents = toCents(tx.amount);
    if (cents <= 0) return null;
    for (const c of set) {
      if (Math.abs(c - cents) <= TOLERANCIJA_CENTI) {
        return "DOPRINOSI_PODUZETNIKA";
      }
    }
    return "PLATE_ZAPOSLENIKA";
  };
}

module.exports = { loadVlasnikDoprinosSuggester, napraviSuggester, dodajIznose };
