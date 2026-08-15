// Podaci i pravila obrasca PK-1001 (zahtjev za izdavanje porezne kartice).
//
// Koeficijenti su iz Pravilnika o primjeni Zakona o porezu na dohodak (čl. 21):
// iznosi ličnog odbitka podijeljeni sa 300 KM (osnovni mjesečni lični odbitak).
// Pravila unosa su iz zvaničnog uputstva Porezne uprave FBiH za popunjavanje
// obrasca. Spec: docs/pk1001-porezna-kartica.md
//
// Bez importa i bez JSX-a: čisti podaci i računica, da se mogu testirati
// zasebno (backend testovi učitavaju direktno kroz Node type-stripping).

/** Mjesečni osnovni lični odbitak; koeficijent 1,0 = ovaj iznos. */
export const OSNOVNI_ODBITAK_KM = 300;

/** Koeficijent osnovnog ličnog odbitka, pripada svakom obvezniku sa karticom. */
export const KOEF_OSNOVNI = 1.0;
/** Izdržavani bračni drug (150 KM). */
export const KOEF_BRACNI_DRUG = 0.5;
/** Ostali izdržavani članovi uže porodice i invalidnost (90 KM). */
export const KOEF_OSTALI = 0.3;
export const KOEF_INVALIDNOST = 0.3;

/**
 * Koeficijent po redoslijedu djeteta: prvo 0,5 (150 KM), drugo 0,7 (210 KM),
 * treće i svako dalje 0,9 (270 KM). Djeca se unose od najstarijeg prema
 * najmlađem, redoslijed je taj koji određuje koeficijent.
 */
export function koefDjeteta(redniBroj: number): number {
  if (redniBroj <= 1) return 0.5;
  if (redniBroj === 2) return 0.7;
  return 0.9;
}

/**
 * Alimentacija (Dio 6): isti niz kao za djecu, 0,5 za bivšeg supružnika ili
 * prvo dijete, 0,7 za drugo, 0,9 za treće i dalje.
 */
export const koefAlimentacije = koefDjeteta;

/**
 * Koeficijent umanjen za udio u izdržavanju. Kad dijete izdržavaju oba
 * roditelja u omjeru 50/50, prvo dijete nosi 0,25 (primjer iz uputstva).
 * Udio je postotak (0-100); prazno se tretira kao 100%.
 */
export function koefSaUdjelom(koeficijent: number, udioPosto: number | null): number {
  const p = udioPosto == null || !Number.isFinite(udioPosto) ? 100 : udioPosto;
  const ogranicen = Math.max(0, Math.min(100, p));
  // Na dvije decimale, jer se toliko i štampa u kućice obrasca; kad bi se
  // računalo na tri, zbir odštampanih redova ne bi dao broj iz Dijela 8.
  return zaokruzi2(koeficijent * (ogranicen / 100));
}

const zaokruzi2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Prag vlastitog prihoda: ko mjesečno ima više od osnovnog ličnog odbitka
 * (300 KM) NIJE izdržavani član i ne unosi se u zahtjev. Vrijedi za bračnog
 * druga i za djecu (penzija, invalidnina, alimentacija, druga lična primanja).
 */
export function preciPrag(vlastitiPrihodKm: number | null): boolean {
  return (vlastitiPrihodKm ?? 0) > OSNOVNI_ODBITAK_KM;
}

// ── Model podataka koji se čuva na radniku ─────────────────────────────────

export type PkClan = {
  jmb: string;
  imePrezime: string;
  /** Dio 3, 4, 5: vlastiti mjesečni prihod u KM. */
  vlastitiPrihod: string;
  /** Dio 6: mjesečni iznos alimentacije u KM. */
  iznosAlimentacije: string;
  /** Dio 5, 6, 7: srodstvo (npr. majka, otac, bivša supruga). */
  srodstvo: string;
  /** Udio u izdržavanju u procentima; prazno = 100. */
  udioPosto: string;
  /**
   * Samo Dio 6 (alimentacija): bivši supružnik nosi fiksnih 0,5 i ne ulazi u
   * brojanje djece, dok djeca idu 0,5 / 0,7 / 0,9 po redoslijedu.
   */
  vrsta?: "SUPRUZNIK" | "DIJETE";
};

export const prazanClan = (): PkClan => ({
  jmb: "",
  imePrezime: "",
  vlastitiPrihod: "",
  iznosAlimentacije: "",
  srodstvo: "",
  udioPosto: "",
  vrsta: "DIJETE",
});

export type PkPodaci = {
  /** Dio 1, polje 3: ime jednog roditelja (nemamo ga na radniku). */
  imeRoditelja: string;
  /** Dio 1, polje 6: općina prebivališta. */
  opcina: string;
  /** Dio 3: bračni drug (najviše jedan). */
  bracniDrug: PkClan[];
  /** Dio 4: djeca, od najstarijeg prema najmlađem (najviše 5 na obrascu). */
  djeca: PkClan[];
  /** Dio 5: ostali izdržavani članovi uže porodice (najviše 4). */
  ostali: PkClan[];
  /** Dio 6: lica za koja obveznik plaća alimentaciju (najviše 4). */
  alimentacije: PkClan[];
  /** Dio 7: invalidnost obveznika i izdržavanih članova (najviše 3). */
  invalidnosti: PkClan[];
};

/** Koliko redova ima obrazac po dijelu (višak se ne može odštampati). */
export const MAX_REDOVA = {
  bracniDrug: 1,
  djeca: 5,
  ostali: 4,
  alimentacije: 4,
  invalidnosti: 3,
} as const;

export const prazniPodaci = (): PkPodaci => ({
  imeRoditelja: "",
  opcina: "",
  bracniDrug: [],
  djeca: [],
  ostali: [],
  alimentacije: [],
  invalidnosti: [],
});

// Podaci sa radnika mogu biti stari ili nepotpuni; svedi ih na siguran oblik.
export function normalizujPodatke(ulaz: unknown): PkPodaci {
  const o = (ulaz ?? {}) as Partial<PkPodaci>;
  const lista = (v: unknown, max: number): PkClan[] =>
    (Array.isArray(v) ? v : [])
      .slice(0, max)
      .map((c) => ({ ...prazanClan(), ...(c as Partial<PkClan>) }));
  return {
    imeRoditelja: typeof o.imeRoditelja === "string" ? o.imeRoditelja : "",
    opcina: typeof o.opcina === "string" ? o.opcina : "",
    bracniDrug: lista(o.bracniDrug, MAX_REDOVA.bracniDrug),
    djeca: lista(o.djeca, MAX_REDOVA.djeca),
    ostali: lista(o.ostali, MAX_REDOVA.ostali),
    alimentacije: lista(o.alimentacije, MAX_REDOVA.alimentacije),
    invalidnosti: lista(o.invalidnosti, MAX_REDOVA.invalidnosti),
  };
}

// ── Računica koeficijenata ─────────────────────────────────────────────────

// Iznos iz unosa u broj. Tačka je separator hiljada SAMO kad je tekst pisan
// domaćim formatom ("1.234,56" ili "1.234"); inače je decimalna ("250.50"),
// jer se prihod često prekopira iz izvoda ili Excela. Bez ove razlike bi
// "250.50" postalo 25050 KM i član bi pao preko praga od 300 KM.
const broj = (s: string): number | null => {
  let t = String(s ?? "").trim().replace(/\s+/g, "");
  if (!t) return null;
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "");
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export type RedSaKoeficijentom = {
  clan: PkClan;
  /** koeficijent prije udjela (npr. 0,7 za drugo dijete) */
  osnovni: number;
  /** koeficijent koji ide na obrazac (poslije udjela) */
  koeficijent: number;
  /** upozorenje ako član ne ispunjava uslov (prihod preko praga) */
  upozorenje: string | null;
  /**
   * Ide li red uopšte na obrazac. Član koji prelazi prag od 300 KM se po
   * uputstvu NE UNOSI u zahtjev, pa se ne štampa, ne troši redno mjesto
   * djeteta i ne ulazi u zbir. U formi ostaje vidljiv sa upozorenjem, da
   * knjigovođa vidi zašto ga nema na obrascu.
   */
  uObrascu: boolean;
};

export type PkRacun = {
  bracniDrug: RedSaKoeficijentom[];
  djeca: RedSaKoeficijentom[];
  ostali: RedSaKoeficijentom[];
  alimentacije: RedSaKoeficijentom[];
  invalidnosti: RedSaKoeficijentom[];
  /** zbir koeficijenata iz dijelova 3 do 7 (bez osnovnog) */
  zbirDodataka: number;
  /** ukupan koeficijent za Dio 8 = 1,0 + zbir dodataka */
  ukupno: number;
  /** mjesečni lični odbitak u KM po ovom koeficijentu */
  odbitakKm: number;
  /** članovi koji su unijeti a ne ispunjavaju uslov */
  upozorenja: string[];
};

export function izracunaj(podaci: PkPodaci): PkRacun {
  const upozorenja: string[] = [];
  const ime = (c: PkClan, zamjena: string) => c.imePrezime.trim() || zamjena;

  const red = (
    clan: PkClan,
    osnovni: number,
    provjeriPrag: boolean,
    opisUpozorenja: string,
  ): RedSaKoeficijentom => {
    const prelazi = provjeriPrag && preciPrag(broj(clan.vlastitiPrihod));
    const upozorenje = prelazi ? opisUpozorenja : null;
    if (upozorenje) upozorenja.push(upozorenje);
    return {
      clan,
      osnovni: prelazi ? 0 : osnovni,
      koeficijent: prelazi ? 0 : koefSaUdjelom(osnovni, broj(clan.udioPosto)),
      upozorenje,
      uObrascu: !prelazi,
    };
  };

  const bracniDrug = podaci.bracniDrug.map((c) =>
    red(
      c,
      KOEF_BRACNI_DRUG,
      true,
      `${ime(c, "Bračni drug")} ima vlastiti prihod veći od ${OSNOVNI_ODBITAK_KM} KM, pa se ne može navesti kao izdržavani član i neće biti na obrascu.`,
    ),
  );

  // Djeca: redni broj koji određuje koeficijent (0,5 / 0,7 / 0,9) broji SAMO
  // djecu koja idu na obrazac. Dijete preko praga se ne unosi, pa ne smije
  // ni pomjeriti sljedeće dijete na viši koeficijent.
  let rbDjeteta = 0;
  const djeca = podaci.djeca.map((c, i) => {
    const prelazi = preciPrag(broj(c.vlastitiPrihod));
    if (!prelazi) rbDjeteta += 1;
    return red(
      c,
      koefDjeteta(rbDjeteta || 1),
      true,
      `${ime(c, `${i + 1}. dijete`)} ima vlastiti prihod veći od ${OSNOVNI_ODBITAK_KM} KM, pa se ne unosi u zahtjev i neće biti na obrascu.`,
    );
  });

  const ostali = podaci.ostali.map((c) =>
    red(
      c,
      KOEF_OSTALI,
      true,
      `${ime(c, "Izdržavani član")} ima vlastiti prihod veći od ${OSNOVNI_ODBITAK_KM} KM, pa se ne može navesti kao izdržavani član i neće biti na obrascu.`,
    ),
  );

  // Dio 6: bivši supružnik nosi svojih 0,5 i NE troši redno mjesto djeteta.
  // Uputstvo: 0,5 za bivšeg supružnika i za prvo dijete, 0,7 za drugo, 0,9 za
  // treće. Bez ovog razdvajanja bi prvo dijete iza supružnika dobilo 0,7.
  let rbAlimDjeteta = 0;
  const alimentacije = podaci.alimentacije.map((c) => {
    if (c.vrsta === "SUPRUZNIK") return red(c, KOEF_BRACNI_DRUG, false, "");
    rbAlimDjeteta += 1;
    return red(c, koefAlimentacije(rbAlimDjeteta), false, "");
  });

  const invalidnosti = podaci.invalidnosti.map((c) =>
    red(c, KOEF_INVALIDNOST, false, ""),
  );

  // Zbir se računa od koeficijenata KAKO SU ZAOKRUŽENI za obrazac, da zbir
  // odštampanih redova uvijek da broj iz Dijela 8.
  const zbirDodataka = zaokruzi2(
    [...bracniDrug, ...djeca, ...ostali, ...alimentacije, ...invalidnosti].reduce(
      (s, r) => s + r.koeficijent,
      0,
    ),
  );
  const ukupno = zaokruzi2(KOEF_OSNOVNI + zbirDodataka);

  return {
    bracniDrug,
    djeca,
    ostali,
    alimentacije,
    invalidnosti,
    zbirDodataka,
    ukupno,
    odbitakKm: Math.round(ukupno * OSNOVNI_ODBITAK_KM * 100) / 100,
    upozorenja,
  };
}

// ── Formatiranje za obrazac ────────────────────────────────────────────────

/** "0,50" → { cijeli: "0", decimale: "50" }; obrazac ima zarez pred-štampan. */
export function podijeliBroj(
  vrijednost: number | null,
  decimala: number,
): { cijeli: string; decimale: string } {
  if (vrijednost == null || !Number.isFinite(vrijednost)) {
    return { cijeli: "", decimale: "" };
  }
  const s = vrijednost.toFixed(decimala);
  const [c, d] = s.split(".");
  return { cijeli: c, decimale: d ?? "" };
}

export const parsirajIznos = broj;

/**
 * Desno poravnanje za polje sa kućicama (comb): broj koji na obrascu stoji
 * lijevo od pred-štampanog zareza mora sjesti UZ zarez. Bez ovoga "100" u
 * polju od četiri kućice izgleda kao 1000.
 */
export function desnoPoravnaj(vrijednost: string, maxDuzina: number): string {
  const v = String(vrijednost ?? "");
  if (!v || !Number.isFinite(maxDuzina) || maxDuzina <= v.length) return v;
  return v.padStart(maxDuzina, " ");
}

/** Datum rođenja iz JMBG-a (prvih 7 cifara: DDMMGGG + stoljeće). */
export function datumRodjenjaIzJmbg(
  jmbg: string,
): { dan: string; mjesec: string; godina: string } | null {
  const d = String(jmbg ?? "").replace(/\D/g, "");
  if (d.length !== 13) return null;
  const dan = d.slice(0, 2);
  const mjesec = d.slice(2, 4);
  const gggG = Number(d.slice(4, 7));
  // JMBG nosi zadnje tri cifre godine; 000-999 uz prefiks 2 za 2000+
  const godina = gggG >= 800 ? 1000 + gggG : 2000 + gggG;
  const dn = Number(dan);
  const mj = Number(mjesec);
  if (dn < 1 || dn > 31 || mj < 1 || mj > 12) return null;
  return { dan, mjesec, godina: String(godina) };
}
