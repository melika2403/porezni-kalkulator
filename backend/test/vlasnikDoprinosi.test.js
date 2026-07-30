// Testovi razlikovanja doprinosa vlasnika obrta od doprinosa radnika po
// iznosu uplate (vlasnikDoprinosi.js). Setovi iznosa se pune isto kao u
// loadVlasnikDoprinosSuggester, samo bez baze.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  napraviSuggester,
  dodajIznose,
} = require("../src/services/bankStatements/vlasnikDoprinosi");
const {
  getOsnovica,
  OBRTNIK_PIO,
  OBRTNIK_ZDR,
  OBRTNIK_NEZAP,
} = require("../src/utils/obrtniciFbih");

// Računi javnih prihoda (normalizovane cifre iz uplatniRacuniData.json)
const RACUN_PIO_FBIH = "1020500000106698"; // Budžet FBiH
const RACUN_ZZO_USK = "3385002275166153"; // kantonalni ZZO (USK)
const RACUN_ZZO_FED = "1020500000064018"; // Federalni ZZO
const RACUN_NEZAP_FED = "1610000028570003"; // Federalni zavod za zapošljavanje
const RACUN_NEZAP_USK = "3380002210012958"; // kantonalna služba (USK)

const r2 = (n) => +n.toFixed(2);

function setoviZaObrt2026() {
  const sets = {
    PIO: new Set(),
    ZDR_KANTON: new Set(),
    ZDR_FED: new Set(),
    NEZAP_KANTON: new Set(),
    NEZAP_FED: new Set(),
  };
  // stvarni dohodak, obrt i srodne: osnovica 1602 KM (2026)
  const osnovica = getOsnovica(2026, "STVARNI_DOHODAK", "OBRT_SRODNE");
  dodajIznose(sets, {
    pio: r2(osnovica * OBRTNIK_PIO), // 312.39
    zdr: r2(osnovica * OBRTNIK_ZDR), // 232.29 → kanton 208.60 + fed 23.69
    nezap: r2(osnovica * OBRTNIK_NEZAP), // 32.04 → fed 9.61 + kanton 22.43
  });
  return sets;
}

test("vlasnikov PIO iznos na Budžet FBiH → DOPRINOSI_PODUZETNIKA", () => {
  const suggest = napraviSuggester(setoviZaObrt2026());
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_PIO_FBIH,
      amount: 312.39,
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
});

test("drugi iznos PIO na isti račun → PLATE_ZAPOSLENIKA (radnici)", () => {
  const suggest = napraviSuggester(setoviZaObrt2026());
  // npr. zbirni PIO za radnike
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_PIO_FBIH,
      amount: 743.6,
    }),
    "PLATE_ZAPOSLENIKA",
  );
});

test("zdravstvo: kantonalni i federalni dio vlasnika se prepoznaju", () => {
  const suggest = napraviSuggester(setoviZaObrt2026());
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_ZZO_USK,
      amount: 208.6,
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_ZZO_FED,
      amount: 23.69,
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
  // radnički zdr na kantonalni ZZO
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_ZZO_USK,
      amount: 391.19,
    }),
    "PLATE_ZAPOSLENIKA",
  );
});

test("cijeli zdr/nezap jednim nalogom na kantonalni račun se prepoznaje", () => {
  const suggest = napraviSuggester(setoviZaObrt2026());
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_ZZO_USK,
      amount: 232.29,
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_NEZAP_USK,
      amount: 32.04,
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
});

test("nezaposlenost: podjela 30/70 vlasnika se prepoznaje", () => {
  const suggest = napraviSuggester(setoviZaObrt2026());
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_NEZAP_FED,
      amount: 9.61,
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_NEZAP_USK,
      amount: 22.43,
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
});

test("tolerancija zaokruživanja ±2 feninga", () => {
  const suggest = napraviSuggester(setoviZaObrt2026());
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_ZZO_FED,
      amount: 23.7,
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_ZZO_FED,
      amount: 23.75,
    }),
    "PLATE_ZAPOSLENIKA",
  );
});

test("ne dira račune koji nisu doprinosi (kantonalni budžet, UIO)", () => {
  const suggest = napraviSuggester(setoviZaObrt2026());
  // USK budžet: porez na dohodak, nema fond → null (odlučuju seed pravila)
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: "3380002210005877",
      amount: 312.39,
    }),
    null,
  );
  // prilivi i stavke bez računa → null
  assert.equal(
    suggest({ direction: "in", counterpartyAccount: RACUN_PIO_FBIH, amount: 312.39 }),
    null,
  );
  assert.equal(suggest({ direction: "out", amount: 312.39 }), null);
});

test("iznosi iz Payroll snapshota vlasnika (pro-rate) se takođe prepoznaju", () => {
  const sets = {
    PIO: new Set(),
    ZDR_KANTON: new Set(),
    ZDR_FED: new Set(),
    NEZAP_KANTON: new Set(),
    NEZAP_FED: new Set(),
  };
  // pola mjeseca: osnovica 801 → pio 156.20, zdr 116.15, nezap 16.02
  dodajIznose(sets, { pio: 156.2, zdr: 116.15, nezap: 16.02 });
  const suggest = napraviSuggester(sets);
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_PIO_FBIH,
      amount: 156.2,
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
  // zdr kanton: 116.15 × 0.898 = 104.30
  assert.equal(
    suggest({
      direction: "out",
      counterpartyAccount: RACUN_ZZO_USK,
      amount: 104.3,
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
});
