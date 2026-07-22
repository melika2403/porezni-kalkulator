// Obračun PDV prijave (Obrazac P PDV) iz KUF/KIF za izabrani mjesec.
// Brojevi polja prate ZVANIČNI obrazac: 11/12/13 izlazi (bez PDV-a),
// 21/22/23 ulazi (bez PDV-a), 41/42/43 ulazni PDV, 51 izlazni PDV,
// 61 = 41+42+43, 71 = 51 − 61 (pozitivno = uplata do 10. u mjesecu,
// negativno = porezni kredit / uz polje 80 zahtjev za povrat),
// 32/33/34 = PDV na isporuke licima koja nisu registrovani PDV obveznici
// (krajnja potrošnja), po entitetu.
import type { Invoice } from "src/api/invoices";
import type { UlazniRacun } from "src/api/partners";

export type PdvPrijavaOrg = {
  naziv: string;
  adresa: string;
  mjesto: string;
  pdvBroj: string;
  /** FBIH | RS | BD (entitet sjedišta, za raspodjelu krajnje potrošnje) */
  jurisdiction: string | null;
};

export type PdvPrijava = {
  month: number;
  year: number;
  org: PdvPrijavaOrg;
  /** 11: isporuke bez PDV, osim polja 12 i 13 (oporezive) */
  p11: number;
  /** 12: vrijednost izvoza */
  p12: number;
  /** 13: isporuke oslobođene PDV-a */
  p13: number;
  /** 21: sve nabavke bez PDV, osim polja 22 i 23 */
  p21: number;
  /** 22: vrijednost uvoza */
  p22: number;
  /** 23: nabavke od poljoprivrednika (paušalista) */
  p23: number;
  /** 41: ulazni PDV od registrovanih obveznika, osim 42 i 43 (odbitni) */
  p41: number;
  /** 42: PDV na uvoz (odbitni) */
  p42: number;
  /** 43: paušalna naknada za poljoprivrednike */
  p43: number;
  /** 51: PDV obračunat na izlaze */
  p51: number;
  /** 61: ulazni PDV ukupno (41+42+43) */
  p61: number;
  /** 71: razlika 51 − 61 */
  p71: number;
  /** 32/33/34: PDV na isporuke neregistrovanim licima, FBiH / RS / BD */
  kp32: number;
  kp33: number;
  kp34: number;
  /** neodbitni ulazni PDV (informativno, nije u 41/42/61) */
  pdvNeodbitni: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** default vrsta dokumenta u KIF-u iz vrste izlaznog dokumenta */
function defaultVrstaDokumenta(inv: Invoice) {
  switch (inv.docType) {
    case "AVANSNA":
      return "AVANSNA" as const;
    case "STORNO_AVANSNE":
      return "STORNO_AVANSNE" as const;
    case "KNJIZNA_OBAVIJEST":
      return "KNJIZNA_OBAVIJEST" as const;
    default:
      return "REDOVNA" as const;
  }
}

/** predznak dokumenta u knjigama: storno avansne i knjižna obavijest umanjuju */
export function kifSign(inv: Invoice): 1 | -1 {
  const vrsta = inv.kifVrstaDokumenta ?? defaultVrstaDokumenta(inv);
  return vrsta === "KNJIZNA_OBAVIJEST" || vrsta === "STORNO_AVANSNE" ? -1 : 1;
}

/**
 * Izvedene KIF klasifikacije kad ih korisnik nije izričito postavio
 * (koriste se i za predpopunu modala "Uredi knjiženje" i u obračunu).
 */
export function deriveKifDefaults(inv: Invoice, orgJurisdiction: string | null) {
  const vat = Number(inv.vatTotal) || 0;
  // avansna i njen storno idu sa tipom 03 (primljeni avansi); izvoz 04
  const tip =
    inv.docType === "AVANSNA" || inv.docType === "STORNO_AVANSNE"
      ? ("03" as const)
      : inv.vrstaIsporuke === "IZVOZ"
        ? ("04" as const)
        : ("01" as const);
  const vrstaFakture =
    inv.vrstaIsporuke === "IZVOZ"
      ? ("INOSTRANI_KUPAC" as const)
      : inv.vrstaIsporuke === "OSLOBODJENA"
        ? ("OSTALO_NEOPOREZOVANO" as const)
        : ("DOMACI_KUPAC" as const);
  // krajnja potrošnja: PDV na isporuke kupcima koji nisu registrovani
  // PDV obveznici (heuristika: kupac bez upisanog PDV broja)
  const kp =
    !inv.buyerVatNumber && vat > 0
      ? {
          entitet: (orgJurisdiction ?? "FBIH") as "FBIH" | "RS" | "BD",
          iznos: vat,
        }
      : { entitet: null, iznos: 0 };
  return {
    tipDokumenta: inv.kifTipDokumenta ?? tip,
    vrstaFakture: inv.kifVrstaFakture ?? vrstaFakture,
    vrstaDokumenta: inv.kifVrstaDokumenta ?? defaultVrstaDokumenta(inv),
    kpEntitet:
      inv.kifKpEntitet === "NISTA"
        ? null
        : (inv.kifKpEntitet ?? kp.entitet),
    kpIznos:
      inv.kifKpEntitet != null
        ? inv.kifKpEntitet === "NISTA"
          ? 0
          : (Number(inv.kifKpIznos) ?? 0) || 0
        : kp.iznos,
  };
}

export function computePdvPrijava(
  kifRows: Invoice[],
  kufRows: UlazniRacun[],
  org: PdvPrijavaOrg,
  month: number,
  year: number,
): PdvPrijava {
  let p11 = 0;
  let p12 = 0;
  let p13 = 0;
  let p51 = 0;
  let kp32 = 0;
  let kp33 = 0;
  let kp34 = 0;
  for (const inv of kifRows) {
    const kif = deriveKifDefaults(inv, org.jurisdiction);
    // knjižne obavijesti i storno avansa UMANJUJU isporuke i izlazni PDV
    const sign =
      kif.vrstaDokumenta === "KNJIZNA_OBAVIJEST" ||
      kif.vrstaDokumenta === "STORNO_AVANSNE"
        ? -1
        : 1;
    const net = (Number(inv.netTotal) || 0) * sign;
    const vat = (Number(inv.vatTotal) || 0) * sign;
    if (inv.vrstaIsporuke === "IZVOZ") p12 += net;
    else if (inv.vrstaIsporuke === "OSLOBODJENA") p13 += net;
    else p11 += net;
    p51 += vat;
    // krajnja potrošnja (polja 32/33/34) po entitetu
    const kpIznos = kif.kpIznos * sign;
    if (kif.kpEntitet === "FBIH") kp32 += kpIznos;
    else if (kif.kpEntitet === "RS") kp33 += kpIznos;
    else if (kif.kpEntitet === "BD") kp34 += kpIznos;
  }

  let p21 = 0;
  let p22 = 0;
  let p23 = 0;
  let p41 = 0;
  let p42 = 0;
  let p43 = 0;
  let pdvNeodbitni = 0;
  for (const r of kufRows) {
    // knjižne obavijesti i storno avansa UMANJUJU nabavke i ulazni PDV
    const sign =
      r.vrstaDokumenta === "KNJIZNA_OBAVIJEST" ||
      r.vrstaDokumenta === "STORNO_AVANSNE"
        ? -1
        : 1;
    const ukupno = Number(r.iznos) || 0;
    const pdv = Number(r.pdvIznos) || 0;
    // iznos je mjerodavan; boolean pokriva knjiženja prije migracije
    const neodbitni = Math.min(
      Number(r.pdvNeodbitniIznos) || (r.pdvNeodbitan ? pdv : 0),
      pdv,
    );
    // samo-PDV knjiženja (uvozni PDV po JCI) imaju ukupno 0: osnovica je 0
    const osnovica = Math.max(ukupno - pdv, 0);

    if (r.vrstaNabavke === "OD_NEOBVEZNIKA") {
      // otkup od poljoprivrednika: osnovica u 23, paušalna naknada u 43
      p23 += sign * ukupno;
      p43 += sign * (Number(r.pausalnaNaknada) || 0);
      continue;
    }
    if (r.vrstaNabavke === "UVOZ") p22 += sign * osnovica;
    else p21 += sign * osnovica;

    if (r.vrstaDokumenta === "PDV_NA_CEKANJU") {
      // odbitak još ne teče: cijeli PDV van polja 41/42/61
      pdvNeodbitni += sign * pdv;
    } else {
      pdvNeodbitni += sign * neodbitni;
      const odbitni = pdv - neodbitni;
      if (r.vrstaNabavke === "UVOZ") p42 += sign * odbitni;
      else p41 += sign * odbitni;
    }

    // krajnja potrošnja iz KUF-a: neodbitni PDV je krajnja potrošnja
    // obveznika (eksplicitni unos ima prednost, inače entitet sjedišta)
    const kufKp = r.kpEntitet
      ? { entitet: r.kpEntitet, iznos: Number(r.kpIznos) || 0 }
      : neodbitni > 0
        ? { entitet: org.jurisdiction ?? "FBIH", iznos: neodbitni }
        : null;
    if (kufKp) {
      const iznos = sign * kufKp.iznos;
      if (kufKp.entitet === "FBIH") kp32 += iznos;
      else if (kufKp.entitet === "RS") kp33 += iznos;
      else if (kufKp.entitet === "BD") kp34 += iznos;
    }
  }

  const p61 = p41 + p42 + p43;
  return {
    month,
    year,
    org,
    p11: r2(p11),
    p12: r2(p12),
    p13: r2(p13),
    p21: r2(p21),
    p22: r2(p22),
    p23: r2(p23),
    p41: r2(p41),
    p42: r2(p42),
    p43: r2(p43),
    p51: r2(p51),
    p61: r2(p61),
    p71: r2(p51 - p61),
    kp32: r2(kp32),
    kp33: r2(kp33),
    kp34: r2(kp34),
    pdvNeodbitni: r2(pdvNeodbitni),
  };
}

/** "1.234,56" bez valute (obrazac je implicitno u KM) */
export const fmtIznos = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Zadnji dan perioda, npr. "31.05.2026." */
export function lastDayOfPeriod(month: number, year: number): string {
  const d = new Date(year, month, 0).getDate();
  return `${String(d).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}.`;
}
