// ─────────────────────────────────────────────────────────────────────────────
//  Zajednički builderi za specifikacije 2001 / 2001-A / 2002.
//
//  Logika je izvučena iz mutacija u ObracunPlata.tsx (obrazac2001Mutation,
//  obrazac2001AMutation, obrazac2002Mutation) da bi je mogao koristiti i bulk
//  download na /organizacije ("Preuzmi 2001/2002 za sve org-e"). Brojevi i
//  polja su IDENTIČNI pojedinačnom preuzimanju, jedan izvor istine.
//
//  Builderi su čiste funkcije: primaju org + radnike + payroll snapshot-e i
//  vraćaju Data objekat za fill*Template. Ne diraju bazu.
// ─────────────────────────────────────────────────────────────────────────────

import type { Organization, Worker } from "src/api/profile";
import type { Payroll } from "src/api/payroll";
import {
  EMP_PIO,
  EMP_ZDRAVSTVO,
  EMP_NEZAPOSLENOST,
  ERP_PIO,
  ERP_ZDRAVSTVO,
  ERP_NEZAPOSLENOST,
} from "src/utils/payrollFbih";
import type { Obrazac2001Data } from "./fillObrazac2001";
import type { Obrazac2001AData } from "./fillObrazac2001A";
import type { Obrazac2002Data, VrstaSamostalne2002 } from "./fillObrazac2002";

// Org polja koja builderi stvarno koriste — i Organization i
// OrganizationWithPayrollStatus ih imaju.
export type OrgZaObrasce = Pick<
  Organization,
  | "id"
  | "name"
  | "taxNumber"
  | "address"
  | "city"
  | "activityCode"
  | "activityName"
  | "taxRegime"
  | "taxCategory"
>;

const fmt2 = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const r2 = (n: number) => Math.round(n * 100) / 100;

// Radnik aktivan u obračun-mjesecu: prijavljen prije kraja mjeseca + nije
// odjavljen prije početka. Ista logika kao u ObracunPlata/obracunOrgPayrolls.
export function isActiveForMonth(
  w: Worker,
  year: number,
  month: number,
): boolean {
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  const lastDay = new Date(year, month, 0).getDate();
  const startISO = `${yyyy}-${mm}-01`;
  const endISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  if (w.odjavaDate && w.odjavaDate.slice(0, 10) < startISO) return false;
  if (w.prijavaDate && w.prijavaDate.slice(0, 10) > endISO) return false;
  return true;
}

// JEDINO pravilo ko ulazi u obračun mjeseca. Koriste ga stranica obračuna
// plata, "Obračunaj sve" (obracunOrgPayrolls), bulk obračun i bulk 2001/2002
// na /organizacije i PK Office, da svi uvijek vide iste radnike:
//   • samo radnici aktivni u mjesecu (po datumima prijave/odjave)
//   • obrt (BUSINESS): radnici = RADNIK, vlasnik ide na 2002
//   • d.o.o.: vlasnik-direktor na ugovoru o radu sa datumom prijave je radnik
//     (2001); u opcijama 2/3/4 vlasnik nije uposlenik; 2002 se ne generiše
// Radnici se dalje dijele po entitetu prebivališta: FBiH → 2001, RS → 2001-A.
export function splitWorkersForObrasce(
  org: Pick<Organization, "type" | "ownerIsDirector" | "directorEngagement">,
  workers: Worker[],
  year: number,
  month: number,
): {
  radnici: Worker[];
  radniciFbih: Worker[];
  radniciRs: Worker[];
  vlasnici2002: Worker[];
} {
  const isObrt = org.type === "BUSINESS";
  const ownerEmployed =
    (org.ownerIsDirector ?? true) &&
    (org.directorEngagement ?? "ugovor_o_radu") === "ugovor_o_radu";
  const active = workers.filter((w) => isActiveForMonth(w, year, month));
  // vlasnik-direktor d.o.o. ide iza radnika (redoslijed kao u tabeli obračuna)
  const radnici = [
    ...active.filter((w) => w.role === "RADNIK"),
    ...(!isObrt && ownerEmployed
      ? active.filter((w) => w.role === "VLASNIK" && !!w.prijavaDate)
      : []),
  ];
  return {
    radnici,
    radniciFbih: radnici.filter((w) => w.prebivalisteEntitet !== "RS"),
    radniciRs: radnici.filter((w) => w.prebivalisteEntitet === "RS"),
    vlasnici2002: isObrt ? active.filter((w) => w.role === "VLASNIK") : [],
  };
}

// Period (od-do): pun mjesec ako su svi radnici aktivni cijeli mjesec, skraćen
// za mid-month prijave/odjave. periodOd = MIN(effectiveStart) preko radnika,
// periodDo = MAX(effectiveEnd). Radnici van mjeseca se preskaču.
function periodForWorkers(
  workers: Worker[],
  year: number,
  month: number,
): { periodOdISO: string; periodDoISO: string } {
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  const lastDay = new Date(year, month, 0).getDate();
  const startOfMonthISO = `${yyyy}-${mm}-01`;
  const endOfMonthISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const startDates: string[] = [];
  const endDates: string[] = [];
  for (const w of workers) {
    const prijava = w.prijavaDate ? w.prijavaDate.slice(0, 10) : null;
    const odjava = w.odjavaDate ? w.odjavaDate.slice(0, 10) : null;
    if (prijava && prijava > endOfMonthISO) continue;
    if (odjava && odjava < startOfMonthISO) continue;
    startDates.push(
      prijava && prijava > startOfMonthISO ? prijava : startOfMonthISO,
    );
    endDates.push(odjava && odjava < endOfMonthISO ? odjava : endOfMonthISO);
  }
  return {
    periodOdISO: startDates.length ? startDates.sort()[0] : startOfMonthISO,
    periodDoISO: endDates.length
      ? endDates.sort().slice(-1)[0]
      : endOfMonthISO,
  };
}

// Datum za dio 5 (potpis): iz paymentDate (YYYY-MM-DD) → DD.MM.GGGG.
function datumFromPaymentDate(paymentDate: string): string {
  const d = new Date(paymentDate);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}.`;
}

// ── Obrazac 2001 — mjesečna specifikacija plata (FBiH radnici) ──────────────
export function build2001Data(input: {
  organization: OrgZaObrasce;
  radniciFbih: Worker[];
  payrollByWorker: Map<number, Payroll>;
  year: number;
  month: number;
  paymentDate: string; // YYYY-MM-DD
}): Obrazac2001Data {
  const { organization, radniciFbih, payrollByWorker, year, month } = input;
  const yyyy = String(year);
  const radniciPayrolls = radniciFbih
    .map((w) => payrollByWorker.get(w.id))
    .filter((p): p is Payroll => !!p);
  const { periodOdISO, periodDoISO } = periodForWorkers(
    radniciFbih.filter((w) => payrollByWorker.has(w.id)),
    year,
    month,
  );
  const [, periodOdMm, periodOdDan] = periodOdISO.split("-");
  const [, periodDoMm, periodDoDan] = periodDoISO.split("-");
  const t = {
    gross: radniciPayrolls.reduce((a, p) => a + (p.gross || 0), 0),
    tax: radniciPayrolls.reduce((a, p) => a + (p.incomeTax || 0), 0),
    koristBruto: radniciPayrolls.reduce((a, p) => a + (p.koristBruto || 0), 0),
  };
  // t.gross je UKUPNA osnovica (plate + korist). Za 2001: polje 8 = plate u
  // novcu (osnovica minus korist), polje 9 = korist (plaće u stvarima),
  // polje 10 = ukupno (= t.gross).
  const grossBruto = t.gross;
  const placeUNovcuVal = +(t.gross - t.koristBruto).toFixed(2);

  // PUFBiH metod: doprinose (polja 16-28) preračunava na UKUPAN bruto
  // (stopa × ukupne plaće), svaki zaokružen jednom. Naš zbir po radniku
  // (round-then-sum) odstupa za par feninga pa polje 30 ne bi pristajalo uz
  // njihovu provjeru. Porez (29) ostaje naš zbir (PUFBiH ga uzima kako se
  // upiše). Tako se 2001 polje 30 poklapa sa PUFBiH preračunom 1:1.
  const G = t.gross;
  const o16 = r2(G * EMP_PIO);
  const o17 = r2(G * EMP_ZDRAVSTVO);
  const o18 = r2(G * EMP_NEZAPOSLENOST);
  const o19 = r2(o16 + o17 + o18);
  const o20 = r2(G * ERP_PIO);
  const o21 = r2(G * ERP_ZDRAVSTVO);
  const o22 = r2(G * ERP_NEZAPOSLENOST);
  const o25 = r2(o20 + o21 + o22);
  const o26 = r2(o16 + o20);
  const o27 = r2(o17 + o21);
  const o28 = r2(o18 + o22);
  const o30 = r2(o26 + o27 + o28 + t.tax);
  return {
    organizationId: organization.id,
    // Dio 1
    naziv: organization.name || "",
    jib: (organization.taxNumber || "").replace(/\D/g, ""),
    adresa: organization.address || "",
    opcina: organization.city || "",
    periodOdDan: periodOdDan,
    periodOdMjesec: periodOdMm,
    periodOdGodina: yyyy,
    periodDoDan: periodDoDan,
    periodDoMjesec: periodDoMm,
    periodDoGodina: yyyy,
    vrstaDjelatnosti: [organization.activityCode, organization.activityName]
      .filter(Boolean)
      .join(" "),
    // 2001 obrazac obuhvata samo FBiH radnike.
    brojZaposlenih: String(radniciFbih.length),
    placeUNovcu: fmt2(placeUNovcuVal),
    placeUStvarima: t.koristBruto > 0 ? fmt2(t.koristBruto) : "",
    ukupnePlace: fmt2(grossBruto),
    nerezident: false,
    izuzeci: false,
    konsolidacija: false,
    sportskiKolektiv: false,
    vrstaIsplate: "DOPRINOSA_I_POREZA",
    // Dio 2 — iz osnovice (zaposlenik). Iznosi = stopa × ukupan bruto (PUFBiH metod).
    pioStopa: "17,00",
    pioIznos: fmt2(o16),
    zdrStopa: "12,50",
    zdrIznos: fmt2(o17),
    nezapStopa: "1,50",
    nezapIznos: fmt2(o18),
    empUkupnoIznos: fmt2(o19),
    // Dio 3 — na osnovicu (poslodavac)
    erpPioStopa: "2,50",
    erpPioIznos: fmt2(o20),
    erpZdrStopa: "2,00",
    erpZdrIznos: fmt2(o21),
    erpNezapStopa: "0,50",
    erpNezapIznos: fmt2(o22),
    dodatniPioStopa: "",
    dodatniPioIznos: "",
    dodatniZdrStopa: "",
    dodatniZdrIznos: "",
    erpUkupnoIznos: fmt2(o25),
    // Dio 4 — obaveze
    obavezePio: fmt2(o26),
    obavezeZdr: fmt2(o27),
    obavezeNezap: fmt2(o28),
    obavezePorez: fmt2(t.tax),
    obavezeUkupno: fmt2(o30),
    // Dio 5
    potpisObveznika: "",
    datum: datumFromPaymentDate(input.paymentDate),
  };
}

// ── Obrazac 2001-A — specifikacija za radnike sa prebivalištem u RS ─────────
// Isti izračun kao 2001, ali samo RS radnici, uz redove "od čega u FBiH"
// (27a, 28a, 30a). Zdravstvo 10,2% i nezaposlenost 30% ostaju u FBiH.
export function build2001AData(input: {
  organization: OrgZaObrasce;
  radniciRs: Worker[];
  payrollByWorker: Map<number, Payroll>;
  year: number;
  month: number;
  paymentDate: string; // YYYY-MM-DD
}): Obrazac2001AData {
  const { organization, radniciRs, payrollByWorker, year, month } = input;
  const yyyy = String(year);
  const rsPayrolls = radniciRs
    .map((w) => payrollByWorker.get(w.id))
    .filter((p): p is Payroll => !!p);
  const { periodOdISO, periodDoISO } = periodForWorkers(
    radniciRs.filter((x) => payrollByWorker.has(x.id)),
    year,
    month,
  );
  const [, periodOdMm, periodOdDan] = periodOdISO.split("-");
  const [, periodDoMm, periodDoDan] = periodDoISO.split("-");
  const t = {
    gross: rsPayrolls.reduce((a, p) => a + (p.gross || 0), 0),
    tax: rsPayrolls.reduce((a, p) => a + (p.incomeTax || 0), 0),
    koristBruto: rsPayrolls.reduce((a, p) => a + (p.koristBruto || 0), 0),
  };
  // PUFBiH metod (kao standardni 2001): doprinosi na UKUPAN bruto
  // (stopa × ukupne plaće), zaokruženo jednom. Porez (29) ostaje naš zbir.
  const G = t.gross;
  const o16 = r2(G * EMP_PIO);
  const o17 = r2(G * EMP_ZDRAVSTVO);
  const o18 = r2(G * EMP_NEZAPOSLENOST);
  const o19 = r2(o16 + o17 + o18);
  const o20 = r2(G * ERP_PIO);
  const o21 = r2(G * ERP_ZDRAVSTVO);
  const o22 = r2(G * ERP_NEZAPOSLENOST);
  const o25 = r2(o20 + o21 + o22);
  const obavezePio = r2(o16 + o20);
  const obavezeZdr = r2(o17 + o21);
  const obavezeNezap = r2(o18 + o22);
  // FBiH zadržani dio: zdravstvo 10,2%, nezaposlenost 30% (ostatak ide u RS).
  // Zaokruži 27a/28a na fening PRIJE zbira da 30a = 26 + 27a + 28a + 29
  // tačno odgovara prikazanim (zaokruženim) iznosima na obrascu.
  const obavezeZdrFBiH = r2(obavezeZdr * 0.102);
  const obavezeNezapFBiH = r2(obavezeNezap * 0.3);
  const obavezeUkupno = r2(obavezePio + obavezeZdr + obavezeNezap + t.tax);
  const obavezeUkupnoFBiH = r2(
    obavezePio + obavezeZdrFBiH + obavezeNezapFBiH + t.tax,
  );
  return {
    organizationId: organization.id,
    naziv: organization.name || "",
    jib: (organization.taxNumber || "").replace(/\D/g, ""),
    adresa: organization.address || "",
    opcina: organization.city || "",
    periodOdDan,
    periodOdMjesec: periodOdMm,
    periodOdGodina: yyyy,
    periodDoDan,
    periodDoMjesec: periodDoMm,
    periodDoGodina: yyyy,
    vrstaDjelatnosti: [organization.activityCode, organization.activityName]
      .filter(Boolean)
      .join(" "),
    brojZaposlenih: String(radniciRs.length),
    placeUNovcu: fmt2(+(t.gross - t.koristBruto).toFixed(2)),
    placeUStvarima: t.koristBruto > 0 ? fmt2(t.koristBruto) : "",
    ukupnePlace: fmt2(t.gross),
    nerezident: false,
    izuzeci: false,
    konsolidacija: false,
    sportskiKolektiv: false,
    vrstaIsplate: "DOPRINOSA_I_POREZA",
    pioStopa: "17,00",
    pioIznos: fmt2(o16),
    zdrStopa: "12,50",
    zdrIznos: fmt2(o17),
    nezapStopa: "1,50",
    nezapIznos: fmt2(o18),
    empUkupnoIznos: fmt2(o19),
    erpPioStopa: "2,50",
    erpPioIznos: fmt2(o20),
    erpZdrStopa: "2,00",
    erpZdrIznos: fmt2(o21),
    erpNezapStopa: "0,50",
    erpNezapIznos: fmt2(o22),
    dodatniPioStopa: "",
    dodatniPioIznos: "",
    dodatniZdrStopa: "",
    dodatniZdrIznos: "",
    erpUkupnoIznos: fmt2(o25),
    obavezePio: fmt2(obavezePio),
    obavezeZdr: fmt2(obavezeZdr),
    obavezeZdrFBiHStopa: "10,20",
    obavezeZdrFBiH: fmt2(obavezeZdrFBiH),
    obavezeNezap: fmt2(obavezeNezap),
    obavezeNezapFBiHStopa: "30,00",
    obavezeNezapFBiH: fmt2(obavezeNezapFBiH),
    obavezePorez: fmt2(t.tax),
    obavezeUkupno: fmt2(obavezeUkupno),
    obavezeUkupnoFBiH: fmt2(obavezeUkupnoFBiH),
    potpisObveznika: "",
    datum: datumFromPaymentDate(input.paymentDate),
  };
}

// ── Obrazac 2002 — specifikacija doprinosa vlasnika obrta ───────────────────
export function build2002Data(input: {
  organization: OrgZaObrasce;
  vlasnik: Worker;
  payroll: Payroll;
  allWorkersCount: number;
  year: number;
  month: number;
}): Obrazac2002Data {
  const { organization, vlasnik, payroll: p, allWorkersCount, year, month } =
    input;
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  const lastDay = new Date(year, month, 0).getDate();

  // Period (od-do) za 2002: skraćen ako je vlasnik prijavljen mid-month
  // ili odjavljen prije kraja mjeseca. Inače pun kalendarski mjesec.
  const startOfMonthISO = `${yyyy}-${mm}-01`;
  const endOfMonthISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const vlPrijava = vlasnik.prijavaDate ? vlasnik.prijavaDate.slice(0, 10) : null;
  const vlOdjava = vlasnik.odjavaDate ? vlasnik.odjavaDate.slice(0, 10) : null;
  const periodOdISO =
    vlPrijava && vlPrijava > startOfMonthISO ? vlPrijava : startOfMonthISO;
  const periodDoISO =
    vlOdjava && vlOdjava < endOfMonthISO ? vlOdjava : endOfMonthISO;
  const [, periodOdMm, periodOdDan] = periodOdISO.split("-");
  const [, periodDoMm, periodDoDan] = periodDoISO.split("-");

  const vrstaSamostalne: VrstaSamostalne2002 = (() => {
    switch (organization.taxCategory) {
      case "SLOBODNA_ZANIMANJA":
        return "SLOBODNO_ZANIMANJE";
      case "OBRT_SRODNE":
        return "DJELATNOST_OBRTA";
      case "ESNAFSKI_ZANATI":
        return "NISKO_AKUMULACIJSKA";
      case "POLJOPRIVREDA_SUMARSTVO":
        return "POLJOPRIVREDA_SUMARSTVO";
      case "TRGOVAC_POJEDINAC":
        return "TRGOVAC_POJEDINAC";
      case "TAXI":
        // Taxi nije eksplicitno na formi; mapira se u nisko akumulacijska
        return "NISKO_AKUMULACIJSKA";
      default:
        return "DJELATNOST_OBRTA";
    }
  })();

  // Radni sati: za period (od-do). Payroll snapshot je već pro-rated
  // (calcMutation šalje proRateFactor; backend skalira osnovicu), pa
  // ovdje samo računamo satnicu za prikaz na formi.
  const countWorkDays = (fromIso: string, toIso: string) => {
    const fromD = new Date(fromIso);
    const toD = new Date(toIso);
    let count = 0;
    for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6) count++;
    }
    return count;
  };
  const standardSati = countWorkDays(periodOdISO, periodDoISO) * 8;

  return {
    organizationId: organization.id,
    naziv: organization.name || "",
    jib: (organization.taxNumber || "").replace(/\D/g, ""),
    operacija: "PRIJAVA",
    periodOdDan: periodOdDan,
    periodOdMjesec: periodOdMm,
    periodOdGodina: yyyy,
    periodDoDan: periodDoDan,
    periodDoMjesec: periodDoMm,
    periodDoGodina: yyyy,
    adresa: organization.address || "",
    opcina: organization.city || "",
    // Po pravilima Porezne uprave FBiH, vlasnik se računa kao "zaposleni"
    // pri popunjavanju broja zaposlenih (= ukupno svih radnika u org-u).
    brojZaposlenih: String(allWorkersCount),
    vrstaDjelatnosti: [organization.activityCode, organization.activityName]
      .filter(Boolean)
      .join(" "),
    vrstaSamostalne,
    dohodakNa:
      organization.taxRegime === "STVARNI_DOHODAK"
        ? "POSLOVNIH_KNJIGA"
        : "PAUSALNO",
    // Skalirana osnovica (gross) za skraćeni period, pa osnovica × stopa =
    // doprinos štima na formi. grossBase (puna mjesečna) ostaje samo fallback.
    osnovica: fmt2(Number(p.gross ?? p.grossBase) || 0),
    brojRadnihSati: String(standardSati),
    brojRadnihSatiBolovanje: "0",
    datumUplateDan: String(lastDay).padStart(2, "0"),
    datumUplateMjesec: mm,
    datumUplateGodina: yyyy,

    prezimeIme: `${vlasnik.firstName} ${vlasnik.lastName}`.trim(),
    jmb: (vlasnik.jmbg || "").replace(/\D/g, ""),
    adresaPoduzetnika: vlasnik.address || "",
    opcinaPoduzetnika: vlasnik.city || "",

    pioStopa: "19,50",
    pioIznos: fmt2(Number(p.empPio) || 0),
    zdrStopa: "14,50",
    zdrIznos: fmt2(Number(p.empZdravstvo) || 0),
    nezapStopa: "2,00",
    nezapIznos: fmt2(Number(p.empNezaposlenost) || 0),
    ukupnoIznos: fmt2(Number(p.empTotal) || 0),

    potpis: "",
    datum: `${String(lastDay).padStart(2, "0")}.${mm}.${yyyy}.`,
  };
}
