// PK Freelancer: obračun AMS-a (mora biti identičan /ams stranici), rokovi,
// normalizacija ulaza i čitanje CBBiH kursne liste.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  obracunajAms,
  rokPredaje,
  danaDoRoka,
  normalizujUplatu,
  bezOdsutnihStanja,
  validanIsoDatum,
} = require("../src/services/freelancerUplate");
const { izvuciKurs, kursNaDan } = require("../src/services/cbbhKurs");

test("obračun: primjer 2.000 KM, 20% rashoda (kao u vodičima i na /ams)", () => {
  const o = obracunajAms({ iznosKm: 2000, stopaRashoda: 20 });
  assert.equal(o.rashodi, 400);
  assert.equal(o.dohodak, 1600);
  assert.equal(o.zdravstveno, 64);
  assert.equal(o.zdravstvenoKanton, 57.47);
  assert.equal(o.zdravstvenoFbih, 6.53);
  assert.equal(o.osnovica, 1536);
  assert.equal(o.porez, 153.6);
  assert.equal(o.razlika, 153.6);
  assert.equal(o.neto, 2000 - 64 - 153.6);
});

test("obračun: 30% autorske naknade i porezni kredit smanjuje razliku", () => {
  const o = obracunajAms({ iznosKm: 1000, stopaRashoda: 30, porezniKredit: 20 });
  assert.equal(o.rashodi, 300);
  assert.equal(o.dohodak, 700);
  assert.equal(o.zdravstveno, 28);
  assert.equal(o.osnovica, 672);
  assert.equal(o.porez, 67.2);
  assert.equal(o.porezniKredit, 20);
  assert.equal(o.razlika, 47.2);
  assert.equal(o.neto, 1000 - 28 - 47.2);
});

test("rok predaje je 5 dana od primitka, i preko granice mjeseca", () => {
  assert.equal(rokPredaje("2026-08-29"), "2026-09-03");
  assert.equal(rokPredaje("2026-02-26"), "2026-03-03");
  assert.equal(danaDoRoka("2026-08-29", "2026-09-01"), 2);
  assert.equal(danaDoRoka("2026-08-20", "2026-09-01"), -7);
});

test("ISO datum: odbija nepostojeće i pogrešno formatirane", () => {
  assert.equal(validanIsoDatum("2026-02-30"), false);
  assert.equal(validanIsoDatum("01.09.2026."), false);
  assert.equal(validanIsoDatum("2026-09-01"), true);
});

test("normalizacija: KM uplata, period iz datuma, server računa obračun", () => {
  const { errors, data } = normalizujUplatu(
    {
      datumPrimitka: "2026-08-29",
      isplatilacNaziv: "  Upwork Global Inc. ",
      iznosKm: "2000",
      // klijent pokuša poslati svoj obračun: ignoriše se
      porez: 1,
      zdravstveno: 1,
    },
    { danas: "2026-09-01" },
  );
  assert.deepEqual(errors, []);
  assert.equal(data.periodMjesec, 8);
  assert.equal(data.periodGodina, 2026);
  assert.equal(data.valuta, "BAM");
  assert.equal(data.kurs, 1);
  assert.equal(data.iznosValuta, 2000);
  assert.equal(data.isplatilacNaziv, "Upwork Global Inc.");
  assert.equal(data.porez, 153.6);
  assert.equal(data.zdravstveno, 64);
  assert.equal(data.status, "OBRACUNATO");
});

test("normalizacija: strana valuta traži kurs, EUR ga zna sam", () => {
  const usd = normalizujUplatu(
    { datumPrimitka: "2026-08-29", isplatilacNaziv: "X", valuta: "usd", iznosValuta: 1000 },
    { danas: "2026-09-01" },
  );
  assert.ok(usd.errors.some((e) => /kurs/i.test(e)));

  const eur = normalizujUplatu(
    { datumPrimitka: "2026-08-29", isplatilacNaziv: "X", valuta: "EUR", iznosValuta: 1000 },
    { danas: "2026-09-01" },
  );
  assert.deepEqual(eur.errors, []);
  assert.equal(eur.data.kurs, 1.95583);
  assert.equal(eur.data.iznosKm, 1955.83);

  const usdOk = normalizujUplatu(
    { datumPrimitka: "2026-08-29", isplatilacNaziv: "X", valuta: "USD", iznosValuta: 1000, kurs: 1.679833 },
    { danas: "2026-09-01" },
  );
  assert.deepEqual(usdOk.errors, []);
  assert.equal(usdOk.data.iznosKm, 1679.83);
});

test("normalizacija: greške za datum u budućnosti, stopu, status i prevelik snimak", () => {
  const r = normalizujUplatu(
    {
      datumPrimitka: "2026-09-10",
      isplatilacNaziv: "X",
      iznosKm: 10,
      stopaRashoda: 25,
      status: "NESTO",
      amsPodaci: { x: "a".repeat(30000) },
    },
    { danas: "2026-09-01" },
  );
  assert.ok(r.errors.some((e) => /raspona/.test(e)));
  assert.ok(r.errors.some((e) => /20% ili 30%/.test(e)));
  assert.ok(r.errors.some((e) => /Status/.test(e)));
  assert.ok(r.errors.some((e) => /prevelik/.test(e)));
  assert.equal(r.data.amsPodaci, null);
});

test("iznos u KM mora pratiti iznos u valuti i kurs", () => {
  const osnova = {
    datumPrimitka: "2026-08-29",
    isplatilacNaziv: "X",
    valuta: "USD",
    iznosValuta: 1000,
    kurs: 1.679833,
  };
  // podmetnut iznos u KM: potvrda bi ispisala 1.000,00 USD u redu od 100 KM
  const lazan = normalizujUplatu({ ...osnova, iznosKm: 100 }, { danas: "2026-09-01" });
  assert.ok(lazan.errors.some((e) => /ne odgovara iznosu u valuti/.test(e)));

  // razlika u zaokruživanju (do 0,02 KM) je dozvoljena
  const skoro = normalizujUplatu({ ...osnova, iznosKm: 1679.85 }, { danas: "2026-09-01" });
  assert.deepEqual(skoro.errors, []);
  assert.equal(skoro.data.iznosKm, 1679.85);

  const previse = normalizujUplatu({ ...osnova, iznosKm: 1679.86 }, { danas: "2026-09-01" });
  assert.ok(previse.errors.some((e) => /ne odgovara iznosu u valuti/.test(e)));
});

test("gornje granice: iznos u valuti, kurs i porezni kredit", () => {
  const veliki = normalizujUplatu(
    {
      datumPrimitka: "2026-08-29",
      isplatilacNaziv: "X",
      valuta: "USD",
      iznosValuta: 2e9,
      kurs: 1.679833,
    },
    { danas: "2026-09-01" },
  );
  assert.ok(veliki.errors.some((e) => /Iznos u valuti je prevelik/.test(e)));

  const kurs = normalizujUplatu(
    {
      datumPrimitka: "2026-08-29",
      isplatilacNaziv: "X",
      valuta: "USD",
      iznosValuta: 10,
      kurs: 5e6,
    },
    { danas: "2026-09-01" },
  );
  assert.ok(kurs.errors.some((e) => /Kurs je izvan/.test(e)));

  const kredit = normalizujUplatu(
    {
      datumPrimitka: "2026-08-29",
      isplatilacNaziv: "X",
      iznosKm: 1000,
      porezniKredit: 5000,
    },
    { danas: "2026-09-01" },
  );
  assert.ok(kredit.errors.some((e) => /Porezni kredit ne može biti veći/.test(e)));
});

test("izmjena: status i datumi bez ključa u tijelu se ne diraju", () => {
  const { data } = normalizujUplatu(
    { datumPrimitka: "2026-08-29", isplatilacNaziv: "X", iznosKm: 1000 },
    { danas: "2026-09-01" },
  );
  assert.equal(data.status, "OBRACUNATO");
  const patch = bezOdsutnihStanja(data, {
    datumPrimitka: "2026-08-29",
    isplatilacNaziv: "X",
    iznosKm: 1000,
  });
  assert.equal("status" in patch, false);
  assert.equal("datumPlacanja" in patch, false);
  assert.equal("datumPredaje" in patch, false);
  assert.equal(patch.iznosKm, 1000);

  const saStatusom = bezOdsutnihStanja(data, { status: "OBRACUNATO", datumPredaje: null });
  assert.equal(saStatusom.status, "OBRACUNATO");
  assert.equal(saStatusom.datumPredaje, null);
  assert.equal("datumPlacanja" in saStatusom, false);
});

test("CBBiH: srednji kurs po jedinici, Units > 1 se dijeli", () => {
  const items = [
    { AlphaCode: "USD", Units: 1, Buy: "1.675633", Middle: "1.679833", Sell: "1.684033" },
    { AlphaCode: "JPY", Units: 100, Middle: "1.130000" },
    { AlphaCode: "GBP", Units: 1, Middle: "2,281650" },
  ];
  assert.equal(izvuciKurs(items, "usd"), 1.679833);
  assert.equal(izvuciKurs(items, "JPY"), 0.0113);
  assert.equal(izvuciKurs(items, "GBP"), 2.28165);
  assert.equal(izvuciKurs(items, "CHF"), null);
  assert.equal(izvuciKurs(null, "USD"), null);
});

test("CBBiH: neuspjeh se kešira, pad servisa ne visi kroz sve pokušaje", async () => {
  const original = globalThis.fetch;
  let poziva = 0;
  globalThis.fetch = async () => {
    poziva += 1;
    throw new Error("mreža nedostupna");
  };
  try {
    assert.equal(await kursNaDan("USD", "2019-04-10"), null);
    assert.ok(poziva <= 4, `najviše dan i 3 koraka unazad, bilo ${poziva}`);
    const dosad = poziva;
    assert.equal(await kursNaDan("USD", "2019-04-10"), null);
    assert.equal(poziva, dosad, "ponovljeni zahtjev ne ide opet na mrežu");
  } finally {
    globalThis.fetch = original;
  }
});

test("keš kursnih lista ima granicu (javna ruta ne smije puniti memoriju)", async () => {
  const original = globalThis.fetch;
  let poziva = 0;
  globalThis.fetch = async (url) => {
    poziva += 1;
    const datum = String(url).slice(-10);
    return {
      ok: true,
      json: async () => ({
        Date: datum,
        CurrencyExchangeItems: [{ AlphaCode: "USD", Units: 1, Middle: "1,700000" }],
      }),
    };
  };
  try {
    const dan = (i) => new Date(Date.UTC(2016, 0, 1 + i)).toISOString().slice(0, 10);
    for (let i = 0; i < 520; i++) {
      assert.ok(await kursNaDan("USD", dan(i)));
    }
    const dosad = poziva;
    await kursNaDan("USD", dan(519));
    assert.equal(poziva, dosad, "skorašnji datum se i dalje čita iz keša");
    await kursNaDan("USD", dan(0));
    assert.equal(poziva, dosad + 1, "najstariji datum je izbačen, pa se traži ponovo");
  } finally {
    globalThis.fetch = original;
  }
});
