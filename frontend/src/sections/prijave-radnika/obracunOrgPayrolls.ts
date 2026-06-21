// ─────────────────────────────────────────────────────────────────────────────
//  Shared helper za "obračunaj sve" za jednu organizaciju. Sklapa istu logiku
//  koju ObracunPlata.handleCalcAll radi interno, ali kao samostalna async
//  funkcija koja se može pozvati iz bilo kog konteksta (npr. bulk obračun na
//  /organizacije pregledu, ili modal "Obračunaj sve" na ObracunPlata stranici).
//
//  Funkcija fetch-uje sama sve potrebne podatke (radnici, postojeći payrolli,
//  šihterica). Vraća strukturisan rezultat sa brojevima i listom razloga
//  preskakanja — caller ih može prikazati u UI-ju.
// ─────────────────────────────────────────────────────────────────────────────

import { calculatePayroll, listPayrolls } from "src/api/payroll";
import { getSihterica } from "src/api/sihterica";
import { getWorkers, type Organization, type Worker } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { getOsnovica } from "src/utils/obrtniciFbih";
import {
  computeProRateFactor,
  computeWorkerGrossBase,
  countSihtericaWorkDays,
  standardMinutesForMonth,
  standardWorkDaysForMonth,
  sumSihtericaMinutes,
} from "./ObracunPlata";

export type ObracunOrgResult = {
  organizationId: number;
  organizationName: string;
  calculated: number;
  skipped: number;
  skippedNames: string[];
  warnings: string[];
  error?: string;
};

// Filter za radnika koji je aktivan u datom obračun-mjesecu. Identično kao
// `isActiveForMonth` u ObracunPlata: prijavljen prije kraja mjeseca + nije
// odjavljen prije početka.
function isActiveForMonth(w: Worker, year: number, month: number): boolean {
  const mm = String(month).padStart(2, "0");
  const yyyy = String(year);
  const lastDay = new Date(year, month, 0).getDate();
  const startISO = `${yyyy}-${mm}-01`;
  const endISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  if (w.odjavaDate && w.odjavaDate.slice(0, 10) < startISO) return false;
  if (w.prijavaDate && w.prijavaDate.slice(0, 10) > endISO) return false;
  return true;
}

// Glavni helper: obračuna sve aktivne radnike + (za obrt) vlasnika za jednu
// org-u i jedan mjesec. Vraća rezultat (nikad ne baca — caller dobije strukturu
// koju može prikazati).
export async function obracunOrgPayrolls(input: {
  org: Pick<
    Organization,
    | "id"
    | "name"
    | "type"
    | "taxRegime"
    | "taxCategory"
    | "mealAllowancePerDay"
    | "ownerIsDirector"
    | "directorEngagement"
  >;
  year: number;
  month: number;
}): Promise<ObracunOrgResult> {
  const { org, year, month } = input;
  const result: ObracunOrgResult = {
    organizationId: org.id,
    organizationName: org.name,
    calculated: 0,
    skipped: 0,
    skippedNames: [],
    warnings: [],
  };

  // 1) Fetch radnika + payroll-a za TRENUTNI mjesec + payroll-a za PRETHODNI
  // mjesec (paralelno). Prethodni mjesec se koristi da naslijedimo neoporezive
  // dodatke (topli obrok, regres, putni trošak) — knjigovođa ne mora ulaziti
  // u svakog radnika pojedinačno da prepiše vrijednosti. Cross-year edge case:
  // januar → decembar prethodne godine.
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const [workersResp, payrollsResp, prevPayrollsResp] = await Promise.all([
    getWorkers(org.id),
    listPayrolls(org.id, year, month),
    listPayrolls(org.id, prevYear, prevMonth),
  ]);
  if (!workersResp.ok) {
    result.error = workersResp.error || "Greška pri učitavanju radnika";
    return result;
  }
  const allWorkers = workersResp.data;
  const existingPayrolls = payrollsResp.ok ? payrollsResp.data : [];
  const payrollByWorker = new Map(existingPayrolls.map((p) => [p.workerId, p]));
  const prevPayrolls = prevPayrollsResp.ok ? prevPayrollsResp.data : [];
  const prevPayrollByWorker = new Map(prevPayrolls.map((p) => [p.workerId, p]));

  // 2) Split: radnici (uključujući d.o.o. vlasnika ako je prijavljen) vs.
  // vlasnici obrta. BUSINESS = obrt → vlasnik ide u 2002 (poseban režim).
  // COMPANY = d.o.o. → vlasnik se tretira kao radnik SAMO ako je prijavljen
  // direktor (opcija 1). U opcijama 2/3/4 vlasnik nije uposlenik pa ne ulazi
  // u obračun (Worker VLASNIK, ako postoji, se preskače).
  const isObrt = org.type === "BUSINESS";
  const ownerEmployed =
    (org.ownerIsDirector ?? true) &&
    (org.directorEngagement ?? "ugovor_o_radu") === "ugovor_o_radu";
  const activeWorkers = allWorkers.filter((w) => isActiveForMonth(w, year, month));
  const radnici =
    isObrt || !ownerEmployed
      ? activeWorkers.filter((w) => w.role === "RADNIK")
      : // d.o.o. opcija 1: vlasnik je u radnicima SAMO ako ima unesen datum
        // prijave u ovoj org (isti princip kao forma vlasnika). Bez datuma
        // prijave (prebacio prijavu u drugu svoju org) se preskače.
        activeWorkers.filter(
          (w) => w.role === "RADNIK" || !!w.prijavaDate,
        );
  const vlasniciObrt = isObrt
    ? activeWorkers.filter((w) => w.role === "VLASNIK")
    : [];

  // 3) Prefetch šihterice paralelno za radnike koji nemaju existing.workedMinutes.
  const workersForSih = radnici.filter((w) => {
    const ep = payrollByWorker.get(w.id);
    return ep?.workedMinutes == null;
  });
  const sihResults = await Promise.all(
    workersForSih.map((w) => getSihterica(w.id, year, month)),
  );
  const sihMinutesByWorker = new Map<number, number>();
  const sihWorkDaysByWorker = new Map<number, number>();
  workersForSih.forEach((w, i) => {
    const r = sihResults[i];
    if (r.ok && r.data?.days) {
      const mins = sumSihtericaMinutes(r.data.days);
      if (mins > 0) sihMinutesByWorker.set(w.id, mins);
      const wd = countSihtericaWorkDays(r.data.days);
      if (wd > 0) sihWorkDaysByWorker.set(w.id, wd);
    }
  });
  const defaultMonthMinutes = standardMinutesForMonth(year, month);
  const defaultWorkDays = standardWorkDaysForMonth(year, month);
  const paymentDateForCalc = new Date(year, month, 0).toISOString().slice(0, 10);

  // 4) Loop radnika i obračunaj.
  for (const w of radnici) {
    const grossBase = computeWorkerGrossBase(w, paymentDateForCalc);
    if (grossBase <= 0) {
      result.skipped++;
      result.skippedNames.push(
        `${w.firstName} ${w.lastName}`.trim() + " (plata nije definisana)",
      );
      continue;
    }
    const proRateFactor = computeProRateFactor(w, year, month);
    const existingPayroll = payrollByWorker.get(w.id);
    const prevPayroll = prevPayrollByWorker.get(w.id);
    const workedMinutesDefault =
      existingPayroll?.workedMinutes == null
        ? sihMinutesByWorker.get(w.id) ?? defaultMonthMinutes
        : undefined;
    // Neoporezivi dodaci: nasljeđuju vrijednost iz prethodnog mjeseca tako da
    // bulk obračun nema potrebu da knjigovođa ulazi u svakog radnika ručno.
    // Kaskada:
    //   meal  → prevMonth.mealAllowance > worker.defaultMealAllowance > 0
    //   vacation → prevMonth.vacationBonus > 0 (regres nema sticky default
    //              jer je tradicionalno godišnji; ako je u proš mj. plaćen,
    //              user može u modalu obrisati ako ne treba ovaj mjesec)
    //   travel → prevMonth.travelExpense > worker.defaultTravelExpense > 0
    // VAŽNO: postojeći payroll ovog mjeseca (re-calc) već ima vrijednosti —
    // backend ih sam koristi kao fallback (vidi `pick` u calculate), pa
    // ne diramo. Šaljemo defaults samo kad pravimo NOVI payroll.
    const isNewPayroll = !existingPayroll;
    // Topli obrok: ako je postavljena dnevna stopa (radnik > firma), računa se
    // stopa × broj radnih dana (iz šihterice, inače standardni radni dani).
    // Inače se nasljeđuje iz prethodnog mjeseca / sticky default-a.
    const mealRatePerDay =
      w.mealAllowancePerDay != null
        ? Number(w.mealAllowancePerDay)
        : org.mealAllowancePerDay != null
          ? Number(org.mealAllowancePerDay)
          : null;
    let mealDefault: number | null = null;
    if (isNewPayroll) {
      if (mealRatePerDay != null) {
        const days = sihWorkDaysByWorker.get(w.id) ?? defaultWorkDays;
        mealDefault = Math.round(mealRatePerDay * days * 100) / 100;
      } else {
        mealDefault = Number(
          prevPayroll?.mealAllowance ?? w.defaultMealAllowance ?? 0,
        );
      }
    }
    const vacationDefault = isNewPayroll
      ? Number(prevPayroll?.vacationBonus ?? 0)
      : null;
    const travelDefault = isNewPayroll
      ? Number(prevPayroll?.travelExpense ?? w.defaultTravelExpense ?? 0)
      : null;
    try {
      await unwrap(
        calculatePayroll({
          organizationId: org.id,
          workerId: w.id,
          year,
          month,
          grossBase,
          taxCoefficient: Number(w.taxCoefficient ?? 1.0),
          minuliRadRate: Number(w.minuliRadRate ?? 0.4),
          // "Cilj neto za isplatu": pošalji ciljni neto pa backend fening-search
          // bira bruto da finalni neto padne tačno na njega (PUFBiH zaokruživanje
          // doprinosa inače zna promašiti za fening).
          ...((w.salaryType ?? "NETO_ISPLATA") === "NETO_ISPLATA" &&
          w.salaryNeto != null &&
          Number(w.salaryNeto) > 0
            ? { targetNet: Number(w.salaryNeto) }
            : {}),
          ...(proRateFactor < 1 ? { proRateFactor } : {}),
          ...(workedMinutesDefault !== undefined
            ? { workedMinutes: workedMinutesDefault }
            : {}),
          ...(mealDefault !== null && mealDefault > 0
            ? { mealAllowance: mealDefault }
            : {}),
          ...(vacationDefault !== null && vacationDefault > 0
            ? { vacationBonus: vacationDefault }
            : {}),
          ...(travelDefault !== null && travelDefault > 0
            ? { travelExpense: travelDefault }
            : {}),
        }),
      );
      result.calculated++;
    } catch (e) {
      console.error(`calc fail org=${org.id} worker=${w.id}`, e);
      result.skipped++;
      result.skippedNames.push(`${w.firstName} ${w.lastName}`.trim());
    }
  }

  // 5) Vlasnici obrta (BUSINESS) — koristi fiksnu osnovicu iz Sl. novina.
  if (isObrt && vlasniciObrt.length > 0) {
    if (!org.taxRegime) {
      result.warnings.push(
        `Vlasnici obrta nisu obračunati, nedostaje režim oporezivanja u profilu org-e`,
      );
    } else {
      let baseOsnovica = 0;
      try {
        baseOsnovica = getOsnovica(
          year,
          org.taxRegime,
          org.taxCategory || undefined,
        );
      } catch {
        baseOsnovica = 0;
      }
      if (baseOsnovica > 0) {
        for (const v of vlasniciObrt) {
          const proRateFactor = computeProRateFactor(v, year, month);
          try {
            await unwrap(
              calculatePayroll({
                organizationId: org.id,
                workerId: v.id,
                year,
                month,
                ...(proRateFactor < 1 ? { proRateFactor } : {}),
              }),
            );
            result.calculated++;
          } catch (e) {
            console.error(`vlasnik calc fail org=${org.id} worker=${v.id}`, e);
            result.skipped++;
            result.skippedNames.push(`${v.firstName} ${v.lastName}`.trim());
          }
        }
      } else {
        result.warnings.push(
          `Vlasnici obrta nisu obračunati, nije pronađena osnovica za režim ${org.taxRegime}`,
        );
      }
    }
  }

  // Sanity check: prazna org-a (bez aktivnih radnika i bez vlasnika obrta).
  if (radnici.length === 0 && vlasniciObrt.length === 0) {
    result.warnings.push("Nema aktivnih radnika za taj mjesec");
  }

  return result;
}
