"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { useLastOrg } from "src/hooks/useLastOrg";
import {
  getClientOrganizations,
  getOrganizations,
  getWorkers,
  type Organization,
  type Worker,
} from "src/api/profile";
import {
  calculatePayroll,
  deletePayroll,
  generateMonthlyPayslips,
  generateMonthlyUplatnice,
  generateWorkerPayslip,
  getMonthlySummary,
  listPayrolls,
  markMonthPaid,
  patchPayroll,
  savePayrollInputs,
  type MonthlyUplatnicaSummary,
  type Payroll,
  type PayrollDocumentType,
} from "src/api/payroll";
import { getSihterica } from "src/api/sihterica";
import {
  fromGross,
  fromNet,
  deductionFromCoefficient,
  computeMinContribBase,
} from "src/utils/payrollFbih";
import DateInput from "src/components/DateInput/DateInput";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import { useNotice } from "src/components/Notice/Notice";
import PreviewRegisterGate from "src/components/PreviewRegisterGate/PreviewRegisterGate";
import { useRole } from "src/hooks/useRole";
import {
  getOsnovica,
  KATEGORIJA_PAUSALNI_LABELS,
  KATEGORIJA_STVARNI_LABELS,
  REZIM_LABELS,
} from "src/utils/obrtniciFbih";
import {
  fillObrazac2001Template,
  type Obrazac2001Data,
} from "./fillObrazac2001";
import {
  fillMip1023Template,
  type Mip1023Data,
  type Mip1023Row,
} from "./fillMip1023";
import { kantonForOpcina } from "src/data/uplatni-racuni";
import {
  fillObrazac2002Template,
  type Obrazac2002Data,
  type VrstaSamostalne2002,
} from "./fillObrazac2002";
import styles from "./obracunPlata.module.css";
import js3Styles from "./js3100.module.css";

const MONTHS = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "August",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

const STATUS_LABEL: Record<Payroll["status"], string> = {
  DRAFT: "Draft",
  OBRACUNATO: "Obračunato",
  ISPLACENO: "Isplaćeno",
};

const UPLATNICA_LABEL: Record<PayrollDocumentType, string> = {
  PLATNA_LISTA: "Platna lista",
  UPLATNICA_NETO: "Neto plata (radniku)",
  UPLATNICA_PIO: "PIO/MIO doprinos",
  UPLATNICA_ZDR: "Zdravstveno — kantonalni",
  UPLATNICA_ZDR_FED: "Zdravstveno — federalni",
  UPLATNICA_NEZAP: "Nezaposlenost — federalni",
  UPLATNICA_NEZAP_KANT: "Nezaposlenost — kantonalni",
  UPLATNICA_POREZ: "Porez na dohodak",
  UPLATNICA_VODNA: "Opća vodna naknada",
  UPLATNICA_NESRECE: "Zaštita od nesreća",
  UPLATNICA_INVALIDI: "Fond za rehabilitaciju OSI",
};

const STATUS_CLASS: Record<Payroll["status"], string> = {
  DRAFT: styles.badgeDraft,
  OBRACUNATO: styles.badgeOk,
  ISPLACENO: styles.badgePaid,
};

const fmtKM = (n: number | null | undefined): string => {
  if (n == null) return "—";
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const minutesToHoursLabel = (mins: number | null): string => {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
};

// Suma minuta iz sihterice (jednostavna, koristi samo startTime+endTime, bez
// pause/zastoj). Override je uvijek dostupan u modalu.
function sumSihtericaMinutes(days: unknown): number {
  if (!Array.isArray(days)) return 0;
  let total = 0;
  for (const d of days) {
    if (!d || typeof d !== "object") continue;
    const e = d as { startTime?: string; endTime?: string; zastoj?: string };
    if (!e.startTime || !e.endTime) continue;
    const [sH, sM] = e.startTime.split(":").map((x) => parseInt(x, 10));
    const [eH, eM] = e.endTime.split(":").map((x) => parseInt(x, 10));
    if (Number.isNaN(sH) || Number.isNaN(eH)) continue;
    const start = sH * 60 + (sM || 0);
    const end = eH * 60 + (eM || 0);
    const zastoj = e.zastoj
      ? Math.round((parseFloat(e.zastoj.replace(",", ".")) || 0) * 60)
      : 0;
    total += Math.max(0, end - start - zastoj);
  }
  return total;
}

// Standardni mjesečni radni fond = broj radnih dana (Pon–Pet) × 8h.
// Ako se sihterica ne vodi, koristi se ova vrijednost kao default.
function workDaysInMonth(year: number, month: number): number {
  const last = new Date(year, month, 0).getDate();
  let n = 0;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) n++; // Ned (0) i Sub (6) nisu radni
  }
  return n;
}

function standardMinutesForMonth(year: number, month: number): number {
  return workDaysInMonth(year, month) * 8 * 60;
}

const todayYM = () => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

export default function ObracunPlata() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  if (userLoading) return <div className={js3Styles.page} />;

  if (!user) {
    return (
      <PreviewRegisterGate
        pageLabel="Obračun plata"
        pageTitle={<>Obračun <em>plata</em> i doprinosa</>}
        pageSubtitle="Mjesečni obračun bruto/neto plata, doprinosa i poreza za radnike u FBiH."
        featureName="obračuna plata i JS3100 obrasca"
        previewDesc="dodavati radnike, unositi sate i vidjeti kompletan mjesečni obračun (bruto/neto, doprinosi, porezi, ukupan trošak)"
        proUnlocks="Preuzimanje platnih listića, uplatnica i obrazaca 2001/2002"
      />
    );
  }

  return (
    <main className={js3Styles.page}>
      <div className={js3Styles.header}>
        <div className={js3Styles.label}>Obračun plata</div>
        <h1 className={js3Styles.h1}>
          Obračun <em>plata</em> i doprinosa
        </h1>
        <p className={js3Styles.subtitle}>
          Mjesečni obračun bruto/neto plata, doprinosa i poreza za radnike (FBiH).
          Iznosi se mogu individualno podesiti po radniku.
        </p>
      </div>
      <ObracunPlataApp />
    </main>
  );
}

function ObracunPlataApp() {
  const queryClient = useQueryClient();
  const init = todayYM();
  const searchParams = useSearchParams();
  const { lastOrgId, setLastOrgId } = useLastOrg();
  const [year, setYear] = useState(init.year);
  const [month, setMonth] = useState(init.month);
  const initialOrgId = (() => {
    const v = searchParams.get("org");
    const fromUrl = v ? Number(v) || null : null;
    return fromUrl ?? lastOrgId ?? null;
  })();
  const [orgId, setOrgIdInternal] = useState<number | null>(initialOrgId);
  const [openWorkerId, setOpenWorkerId] = useState<number | null>(null);

  // Perzistira odabranu organizaciju u localStorage — koristi se i u JS3100,
  // Aktivnim radnicima i Ugovorima.
  const setOrgId = useCallback(
    (id: number | null) => {
      setOrgIdInternal(id);
      if (id != null) setLastOrgId(id);
    },
    [setLastOrgId],
  );

  const { hasRole } = useRole();
  const canSeeClients = hasRole("PRO", "BUSINESS", "ADMIN");
  const canGenerate = hasRole("PRO", "BUSINESS", "ADMIN");
  const { confirm: confirmDialog, notify } = useNotice();

  const orgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
  });
  const clientOrgsQuery = useQuery({
    queryKey: ["clientOrganizations"],
    queryFn: () => unwrap(getClientOrganizations()),
    enabled: canSeeClients,
  });

  // Spojene organizacije: vlastite + klijentske (knjigovođa koji upravlja
  // tuđim obrtima). Dedup po id-u za slučaj preklapanja.
  const allOrgs = useMemo<Organization[]>(() => {
    const map = new Map<number, Organization>();
    for (const o of orgsQuery.data ?? []) map.set(o.id, o);
    for (const o of clientOrgsQuery.data ?? []) if (!map.has(o.id)) map.set(o.id, o);
    return Array.from(map.values());
  }, [orgsQuery.data, clientOrgsQuery.data]);

  if (orgId === null && allOrgs.length > 0) {
    setOrgId(allOrgs[0].id);
  }

  const workersQuery = useQuery({
    queryKey: ["workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId!)),
    enabled: !!orgId,
  });

  const payrollsQuery = useQuery({
    queryKey: ["payrolls", orgId, year, month],
    queryFn: () => unwrap(listPayrolls(orgId!, year, month)),
    enabled: !!orgId,
  });

  // Aktivnost za odabrani obračunski mjesec:
  //   • Odjavljen PRIJE ovog mjeseca → ne pripada obračunu (sakri).
  //   • Prijavljen POSLIJE ovog mjeseca → još nije aktivan (sakri).
  //   • Mid-month prijava ili odjava → ostaje u obračunu, banner upozorenja
  //     se prikazuje, bruto se ručno proporcionalno upiše.
  const monthBounds = useMemo(() => {
    const yyyy = String(year);
    const mm = String(month).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startISO: `${yyyy}-${mm}-01`,
      endISO: `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`,
    };
  }, [year, month]);

  const isActiveForMonth = useCallback(
    (w: Worker): boolean => {
      if (w.odjavaDate && w.odjavaDate.slice(0, 10) < monthBounds.startISO) {
        return false;
      }
      if (w.prijavaDate && w.prijavaDate.slice(0, 10) > monthBounds.endISO) {
        return false;
      }
      return true;
    },
    [monthBounds],
  );

  const radniciRaw = useMemo(
    () =>
      (workersQuery.data ?? []).filter(
        (w) => w.role === "RADNIK" && isActiveForMonth(w),
      ),
    [workersQuery.data, isActiveForMonth],
  );
  const vlasniciRaw = useMemo(
    () =>
      (workersQuery.data ?? []).filter(
        (w) => w.role === "VLASNIK" && isActiveForMonth(w),
      ),
    [workersQuery.data, isActiveForMonth],
  );

  const currentOrg = useMemo<Organization | null>(() => {
    const own = (orgsQuery.data ?? []).find((o) => o.id === orgId);
    if (own) return own;
    return (clientOrgsQuery.data ?? []).find((o) => o.id === orgId) ?? null;
  }, [orgsQuery.data, clientOrgsQuery.data, orgId]);

  // U obrtu (BUSINESS) vlasnik ide poseban tretman (Obrazac 2002, fiksna
  // osnovica), pa stoji u zasebnoj sekciji. U d.o.o. (COMPANY) vlasnik se
  // obračunava kao standardni radnik (Obrazac 2001, bruto/neto/doprinosi).
  const isObrt = currentOrg?.type === "BUSINESS";
  const radnici = useMemo(
    () => (isObrt ? radniciRaw : [...radniciRaw, ...vlasniciRaw]),
    [isObrt, radniciRaw, vlasniciRaw],
  );
  const vlasnici = useMemo(
    () => (isObrt ? vlasniciRaw : []),
    [isObrt, vlasniciRaw],
  );

  const payrollByWorker = useMemo(() => {
    const map = new Map<number, Payroll>();
    for (const p of payrollsQuery.data ?? []) map.set(p.workerId, p);
    return map;
  }, [payrollsQuery.data]);

  // Agregati za footer. "Ukupan trošak" uključuje i fond invalida (0,5% × bruto),
  // tako da bude konzistentan sa "Ukupan trošak poslodavca" u Pregledu mjeseca.
  // Fond invalida (0,5%) plaćaju samo COMPANY (privredna društva). Obrti
  // (BUSINESS) su izuzeti.
  const fondInvalidiApplies = currentOrg?.type !== "BUSINESS";

  const totals = useMemo(() => {
    let net = 0;
    let cost = 0;
    let empContrib = 0;
    let erpContrib = 0;
    let tax = 0;
    let invalidi = 0;
    let count = 0;
    // Filtriraj payrolle samo na one čiji workerId i dalje postoji u
    // radnici/vlasnici listi. Ako je radnik obrisan, njegov payroll ostaje
    // u DB (nema CASCADE), ali ne smijemo ga uračunati u footer totale.
    const validWorkerIds = new Set([
      ...radnici.map((w) => w.id),
      ...vlasnici.map((w) => w.id),
    ]);
    for (const p of payrollsQuery.data ?? []) {
      if (!validWorkerIds.has(p.workerId)) continue;
      const gross = Number(p.gross) || 0;
      const fondInv = fondInvalidiApplies ? gross * 0.005 : 0;
      net += Number(p.net) || 0;
      cost += (Number(p.totalCost) || 0) + fondInv;
      empContrib += Number(p.empTotal) || 0;
      erpContrib += Number(p.erpTotal) || 0;
      tax += Number(p.incomeTax) || 0;
      invalidi += fondInv;
      count++;
    }
    return { net, cost, empContrib, erpContrib, tax, invalidi, count };
  }, [payrollsQuery.data, fondInvalidiApplies, radnici, vlasnici]);

  // Helper: invalidira SVE keševe vezane za payroll obračun ovog mjeseca
  // (payrolls + monthlySummary). Koristi se nakon svake calc/delete operacije
  // da bi Pregled mjeseca, Zbirne uplatnice i footer totali odmah refreshali.
  const invalidatePayrollCaches = () => {
    queryClient.invalidateQueries({ queryKey: ["payrolls", orgId, year, month] });
    queryClient.invalidateQueries({ queryKey: ["monthlySummary", orgId, year, month] });
  };

  const calcMutation = useMutation({
    mutationFn: (payload: Parameters<typeof calculatePayroll>[0]) =>
      unwrap(calculatePayroll(payload)),
    onSuccess: () => {
      invalidatePayrollCaches();
    },
  });

  // Pro-rate factor za vlasnika obrta na osnovu prijavaDate / odjavaDate.
  // Vraća broj između 0 i 1, ili 1 (pun mjesec) ako nema mid-month događaja.
  const computeVlasnikProRate = (vlasnik: Worker): number => {
    const lastDay = new Date(year, month, 0).getDate();
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);
    const startISO = `${yyyy}-${mm}-01`;
    const endISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
    const prijava = vlasnik.prijavaDate?.slice(0, 10) ?? null;
    const odjava = vlasnik.odjavaDate?.slice(0, 10) ?? null;
    if ((!prijava || prijava <= startISO) && (!odjava || odjava >= endISO)) {
      return 1;
    }
    const effStart = prijava && prijava > startISO ? prijava : startISO;
    const effEnd = odjava && odjava < endISO ? odjava : endISO;
    const countWorkDays = (fromIso: string, toIso: string) => {
      const fromD = new Date(fromIso);
      const toD = new Date(toIso);
      let c = 0;
      for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
        const wd = d.getDay();
        if (wd !== 0 && wd !== 6) c++;
      }
      return c;
    };
    const wdInMonth = countWorkDays(startISO, endISO);
    const wdInPeriod = countWorkDays(effStart, effEnd);
    if (wdInMonth <= 0) return 1;
    return wdInPeriod / wdInMonth;
  };

  const handleCalcAll = async () => {
    if (!orgId) return;
    let calculated = 0;
    let skipped = 0;
    const skippedNames: string[] = [];
    // 1) Radnici (uključujući d.o.o. vlasnika — on je u `radnici` po obrtu).
    for (const w of radnici) {
      // Pokušaj prvo bruto, pa fallback na neto preko fromNet sa koeficijentom
      let grossBase = Number(w.salaryBruto) || 0;
      if (grossBase <= 0 && w.salaryNeto && Number(w.salaryNeto) > 0) {
        const ded = deductionFromCoefficient(Number(w.taxCoefficient ?? 1));
        const calc = fromNet(Number(w.salaryNeto), ded);
        if (calc.gross > 0) grossBase = calc.gross;
      }
      if (grossBase <= 0) {
        skipped++;
        skippedNames.push(`${w.firstName} ${w.lastName}`.trim());
        continue;
      }
      try {
        await unwrap(
          calculatePayroll({
            organizationId: orgId,
            workerId: w.id,
            year,
            month,
            grossBase,
            taxCoefficient: Number(w.taxCoefficient ?? 1.0),
            minuliRadRate: Number(w.minuliRadRate ?? 0.4),
          }),
        );
        calculated++;
      } catch (e) {
        console.error("calc fail", w.id, e);
        skipped++;
        skippedNames.push(`${w.firstName} ${w.lastName}`.trim());
      }
    }

    // 2) Vlasnici obrta (samo za BUSINESS) — backend koristi fiksnu osnovicu
    //    iz org.taxRegime + taxCategory. Mid-month pro-rate se računa lokalno
    //    i šalje kao grossBase ako je djelimičan mjesec.
    if (currentOrg?.type === "BUSINESS" && currentOrg.taxRegime) {
      let baseOsnovica = 0;
      try {
        baseOsnovica = getOsnovica(
          year,
          currentOrg.taxRegime,
          currentOrg.taxCategory || undefined,
        );
      } catch {
        baseOsnovica = 0;
      }
      if (baseOsnovica > 0) {
        for (const v of vlasnici) {
          const factor = computeVlasnikProRate(v);
          const scaledOsnovica = baseOsnovica * factor;
          try {
            await unwrap(
              calculatePayroll({
                organizationId: orgId,
                workerId: v.id,
                year,
                month,
                // Šalji grossBase samo ako je djelimičan mjesec; inače backend
                // koristi punu fiksnu osnovicu.
                ...(factor < 1 ? { grossBase: scaledOsnovica } : {}),
              }),
            );
            calculated++;
          } catch (e) {
            console.error("vlasnik calc fail", v.id, e);
            skipped++;
            skippedNames.push(`${v.firstName} ${v.lastName}`.trim());
          }
        }
      } else if (vlasnici.length > 0) {
        // Bez režima ne možemo izračunati vlasnika — javi korisniku.
        skipped += vlasnici.length;
        for (const v of vlasnici) {
          skippedNames.push(`${v.firstName} ${v.lastName}`.trim() + " (nedostaje režim)");
        }
      }
    }

    invalidatePayrollCaches();
    if (calculated === 0 && skipped > 0) {
      notify(
        `Nijedan obračun nije izvršen. Radnici/vlasnici bez plate ili režima: ${skippedNames.join(", ")}.`,
        "error",
      );
    } else if (skipped > 0) {
      notify(
        `Obračunato ${calculated}, preskočeno ${skipped}: ${skippedNames.join(", ")}.`,
        "info",
      );
    } else if (calculated > 0) {
      notify(`Obračunato ${calculated} radnik(a).`, "success");
    }
  };

  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const handleDeleteAll = async () => {
    if (!orgId) return;
    const payrolls = payrollsQuery.data ?? [];
    if (payrolls.length === 0) return;
    const ok = await confirmDialog(
      `Obrisati SVE obračune (${payrolls.length}) za ${MONTHS[month - 1]} ${year}? ` +
        `Ova akcija se ne može poništiti — svi platni listići, uplatnice i obrasci 2001/2002 za ovaj mjesec će biti uklonjeni.`,
    );
    if (!ok) return;
    setIsDeletingAll(true);
    let deleted = 0;
    let failed = 0;
    for (const p of payrolls) {
      try {
        await unwrap(deletePayroll(p.id));
        deleted++;
      } catch (e) {
        failed++;
        console.error("delete fail", p.id, e);
      }
    }
    setIsDeletingAll(false);
    invalidatePayrollCaches();
    if (failed > 0) {
      notify(`Obrisano ${deleted}, neuspješno ${failed}.`, "error");
    } else {
      notify(`Obrisano ${deleted} obračun(a) za ${MONTHS[month - 1]} ${year}.`, "success");
    }
  };

  const yearOptions = useMemo(() => {
    const ny = init.year;
    return [ny, ny - 1, ny - 2];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init.year]);

  // Detektuj radnike/vlasnike čiji prijavaDate ili odjavaDate pada unutar
  // obračun mjeseca — generiše warning banner pa korisnik može prilagoditi
  // bruto platu (ručno) ili znati zašto je obračun manji.
  const midMonthWarnings = useMemo(() => {
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);
    const lastDay = new Date(year, month, 0).getDate();
    const startISO = `${yyyy}-${mm}-01`;
    const endISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
    const totalDays = lastDay;
    const fmtDate = (iso: string) => {
      const [, m, d] = iso.split("-");
      return `${d}.${m}.${yyyy}.`;
    };
    type Warn = {
      workerId: number;
      name: string;
      kind: "prijava" | "odjava";
      date: string;
      days: number;
    };
    const warnings: Warn[] = [];
    for (const w of [...radnici, ...vlasnici]) {
      const prijava = w.prijavaDate ? w.prijavaDate.slice(0, 10) : null;
      const odjava = w.odjavaDate ? w.odjavaDate.slice(0, 10) : null;
      const name = `${w.firstName} ${w.lastName}`.trim();
      if (prijava && prijava > startISO && prijava <= endISO) {
        const day = parseInt(prijava.slice(8, 10), 10);
        const daysActive = totalDays - day + 1;
        warnings.push({
          workerId: w.id,
          name,
          kind: "prijava",
          date: fmtDate(prijava),
          days: daysActive,
        });
      }
      if (odjava && odjava >= startISO && odjava < endISO) {
        const day = parseInt(odjava.slice(8, 10), 10);
        warnings.push({
          workerId: w.id,
          name,
          kind: "odjava",
          date: fmtDate(odjava),
          days: day,
        });
      }
    }
    return warnings;
  }, [radnici, vlasnici, year, month]);

  return (
    <div>
      {!canGenerate && (
        <GeneratePaywall
          tier="PRO"
          what="Preuzimanje platnih listića, uplatnica i obrazaca 2001/2002"
        />
      )}
      {midMonthWarnings.length > 0 && (
        <div
          style={{
            margin: "0 0 1.25rem",
            padding: "0.95rem 1.1rem",
            background: "#fffbeb",
            border: "1px solid #f59e0b",
            borderRadius: 10,
            fontSize: 14,
            color: "#92400e",
            lineHeight: 1.55,
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>
            ⚠️ Djelimičan mjesec — provjerite bruto plate
          </strong>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {midMonthWarnings.map((w, i) => (
              <li key={`${w.workerId}-${w.kind}-${i}`}>
                <strong>{w.name}</strong>{" "}
                {w.kind === "prijava" ? (
                  <>
                    je prijavljen <strong>{w.date}</strong> — aktivan je samo{" "}
                    <strong>{w.days}</strong> dan
                    {w.days === 1 ? "" : w.days < 5 ? "a" : "a"} u mjesecu.
                  </>
                ) : (
                  <>
                    je odjavljen <strong>{w.date}</strong> — radio je samo{" "}
                    <strong>{w.days}</strong> dan
                    {w.days === 1 ? "" : w.days < 5 ? "a" : "a"} u mjesecu.
                  </>
                )}
              </li>
            ))}
          </ul>
          <p style={{ margin: "0.6rem 0 0", fontSize: 12.5, color: "#78350f" }}>
            Bruto plata radnika upišite proporcionalno (npr. {`mjesečna_bruto × dani_aktivnosti / ukupni_dani`}).
            Obrazac 2001 period će se automatski prilagoditi datumima.
            {isObrt && " Vlasnik 2002 doprinosi se automatski pro-rate-uju po radnim danima."}
          </p>
        </div>
      )}
      <div className={js3Styles.section}>
        <h2 className={js3Styles.sectionTitle}>
          Mjesec <em>obračuna</em>
        </h2>
        <div className={js3Styles.fieldGrid}>
          <div className={js3Styles.fieldGroup}>
            <label className={js3Styles.fieldLabel} htmlFor="org">
              Organizacija
            </label>
            <select
              id="org"
              className={js3Styles.fieldSelect}
              value={orgId ?? ""}
              onChange={(e) =>
                setOrgId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Odaberi —</option>
              {(orgsQuery.data?.length ?? 0) > 0 && (
                <optgroup label="Moje organizacije">
                  {orgsQuery.data!.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {canSeeClients && (clientOrgsQuery.data?.length ?? 0) > 0 && (
                <optgroup label="Klijentske organizacije">
                  {clientOrgsQuery.data!.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className={js3Styles.fieldGroup}>
            <label className={js3Styles.fieldLabel} htmlFor="period">
              Period (mjesec / godina)
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <select
                id="period"
                className={js3Styles.fieldSelect}
                style={{ flex: 2 }}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className={js3Styles.fieldSelect}
                style={{ flex: 1 }}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                aria-label="Godina"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.6rem",
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          {(payrollsQuery.data?.length ?? 0) > 0 && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={handleDeleteAll}
              disabled={isDeletingAll || calcMutation.isPending}
              style={{
                color: "#b91c1c",
                borderColor: "#fecaca",
              }}
            >
              {isDeletingAll
                ? "Brisanje…"
                : `Obriši obračun za sve (${payrollsQuery.data?.length ?? 0})`}
            </button>
          )}
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleCalcAll}
            disabled={
              !orgId ||
              (radnici.length === 0 && vlasnici.length === 0) ||
              calcMutation.isPending
            }
          >
            {calcMutation.isPending
              ? "Obračunavanje…"
              : `Obračunaj sve (${radnici.length + vlasnici.length})`}
          </button>
        </div>
      </div>

      {/* Sekcija vlasnika obrta — fiksna osnovica iz Sl. novina */}
      {currentOrg?.type === "BUSINESS" && vlasnici.length > 0 && (
        <VlasniciSection
          orgId={orgId!}
          year={year}
          month={month}
          organization={currentOrg}
          vlasnici={vlasnici}
          payrollByWorker={payrollByWorker}
          allWorkersCount={radnici.length + vlasnici.length}
          canGenerate={canGenerate}
        />
      )}

      {orgId && workersQuery.isLoading ? (
        <div className={styles.empty}>Učitavam radnike…</div>
      ) : radnici.length === 0 && vlasnici.length === 0 ? (
        <div className={styles.empty}>
          Nema dodanih radnika za ovu organizaciju.{" "}
          <Link href={`/aktivni-radnici${orgId ? `?org=${orgId}` : ""}`} className={styles.btnGhost}>
            Dodaj radnike →
          </Link>
        </div>
      ) : radnici.length === 0 ? (
        <div className={styles.empty}>
          Nema dodanih radnika (pored vlasnika).{" "}
          <Link href={`/aktivni-radnici${orgId ? `?org=${orgId}` : ""}`} className={styles.btnGhost}>
            Dodaj radnike →
          </Link>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Radnik</th>
                <th className={styles.num}>Bruto</th>
                <th className={styles.num}>Koef.</th>
                <th className={styles.num}>Sati</th>
                <th className={styles.num}>Neto</th>
                <th className={styles.num}>Trošak</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {radnici.map((w) => {
                const p = payrollByWorker.get(w.id);
                const status: Payroll["status"] | null = p?.status ?? null;
                return (
                  <tr
                    key={w.id}
                    className={styles.rowClickable}
                    onClick={() => setOpenWorkerId(w.id)}
                  >
                    <td>
                      {status ? (
                        <span
                          className={`${styles.badge} ${STATUS_CLASS[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeNone}`}>
                          Nije obračunato
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>
                        {w.firstName} {w.lastName}
                      </strong>
                      {w.position ? (
                        <div className={styles.muted} style={{ fontSize: "0.8rem" }}>
                          {w.position}
                        </div>
                      ) : null}
                    </td>
                    <td className={styles.num}>
                      {fmtKM(p?.gross ?? w.salaryBruto)}
                    </td>
                    <td className={styles.num}>
                      {(p?.taxCoefficient ?? w.taxCoefficient ?? 1).toFixed(2)}
                    </td>
                    <td className={styles.num}>
                      {minutesToHoursLabel(p?.workedMinutes ?? null)}
                    </td>
                    <td className={styles.num}>{fmtKM(p?.net ?? null)}</td>
                    <td className={styles.num}>{fmtKM(p?.totalCost ?? null)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenWorkerId(w.id);
                          }}
                          title="Uredi obračun radnika"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                          Detalji
                        </button>
                        {p && p.gross > 0 && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!canGenerate) return;
                              const r = await generateWorkerPayslip(p.id);
                              if (r.ok) triggerBlobDownload(r.blob, r.filename);
                            }}
                            disabled={!canGenerate}
                            title={canGenerate ? "Preuzmi platni listić za ovog radnika" : "Dostupno uz Pro pretplatu"}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Listić
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totals.count > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Radnika obračunato</span>
            <span className={styles.summaryValue}>{totals.count}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Ukupno neto</span>
            <span className={styles.summaryValue}>{fmtKM(totals.net)} KM</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Porez na dohodak</span>
            <span className={styles.summaryValue}>{fmtKM(totals.tax)} KM</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Doprinosi iz</span>
            <span className={styles.summaryValue}>
              {fmtKM(totals.empContrib)} KM
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Doprinosi na</span>
            <span className={styles.summaryValue}>
              {fmtKM(totals.erpContrib)} KM
            </span>
          </div>
          {fondInvalidiApplies && (
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Fond invalida</span>
              <span className={styles.summaryValue}>
                {fmtKM(totals.invalidi)} KM
              </span>
            </div>
          )}
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Ukupan trošak</span>
            <span className={styles.summaryValue}>{fmtKM(totals.cost)} KM</span>
          </div>
        </div>
      )}

      {orgId !== null && totals.count > 0 && (
        <MonthlyPanel
          orgId={orgId}
          year={year}
          month={month}
          organization={allOrgs.find((o) => o.id === orgId) ?? null}
          totalWorkersCount={radnici.length + vlasnici.length}
          radnici={radnici}
          payrollByWorker={payrollByWorker}
          canGenerate={canGenerate}
        />
      )}

      {openWorkerId !== null && orgId !== null && (
        <PayrollModal
          orgId={orgId}
          year={year}
          month={month}
          worker={radnici.find((w) => w.id === openWorkerId)!}
          payroll={payrollByWorker.get(openWorkerId) ?? null}
          onClose={() => setOpenWorkerId(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Monthly panel — zbirni prikaz svih uplatnica po vrsti za mjesec.
//  Doprinosi/porezi se uplaćuju zbirno po vrsti (svi radnici u jednoj uplatnici),
//  a neto plate, topli obrok i putni trošak idu odvojeno svakom radniku.
// ─────────────────────────────────────────────────────────────────────────────

function fmtAccount(s: string): string {
  if (!s) return "—";
  return s;
}

function BulkMarkPaidAction({
  isPending,
  onMark,
}: {
  isPending: boolean;
  onMark: () => Promise<number>;
}) {
  const { confirm: confirmDialog, notify } = useNotice();
  const handleClick = async () => {
    const ok = await confirmDialog(
      "Označiti SVE obračune u ovom mjesecu kao isplaćene?",
    );
    if (!ok) return;
    try {
      const updated = await onMark();
      notify(`Označeno ${updated} obračun(a) kao isplaćeni.`, "success");
    } catch (e) {
      notify(
        "Greška pri označavanju: " + ((e as Error)?.message || "nepoznata"),
        "error",
      );
    }
  };
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "0.85rem" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--mid)",
          padding: "0.5rem 1rem",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: "0.85rem",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="14"
          height="14"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {isPending ? "Označavam…" : "Označi sve obračune kao isplaćene"}
      </button>
    </div>
  );
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Vlasnik obrta sekcija — fiksna osnovica + 36% doprinosa ────────────────
function VlasniciSection({
  orgId,
  year,
  month,
  organization,
  vlasnici,
  payrollByWorker,
  allWorkersCount,
  canGenerate,
}: {
  orgId: number;
  year: number;
  month: number;
  organization: Organization;
  vlasnici: Worker[];
  payrollByWorker: Map<number, Payroll>;
  allWorkersCount: number;
  canGenerate: boolean;
}) {
  const queryClient = useQueryClient();

  // Izračun osnovice na osnovu režima + kategorije organizacije.
  const osnovicaInfo = useMemo(() => {
    if (!organization.taxRegime) return null;
    try {
      const o = getOsnovica(
        year,
        organization.taxRegime,
        organization.taxCategory || undefined,
      );
      return { osnovica: o, error: null as string | null };
    } catch (e) {
      return {
        osnovica: 0,
        error: e instanceof Error ? e.message : "Greška u podešavanju režima",
      };
    }
  }, [year, organization.taxRegime, organization.taxCategory]);

  // Helper: računa pro-rate factor za vlasnika ako je prijavljen/odjavljen
  // unutar obračun mjeseca. Vraća { factor, scaledOsnovica } ili null
  // ako nema pro-rate (pun mjesec).
  const getVlasnikFactor = (vlasnik: Worker) => {
    const lastDay = new Date(year, month, 0).getDate();
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);
    const startISO = `${yyyy}-${mm}-01`;
    const endISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
    const prijava = vlasnik.prijavaDate?.slice(0, 10) ?? null;
    const odjava = vlasnik.odjavaDate?.slice(0, 10) ?? null;
    if (!osnovicaInfo) return null;
    const baseOsn = osnovicaInfo.osnovica;
    if (!baseOsn) return null;
    if ((!prijava || prijava <= startISO) && (!odjava || odjava >= endISO)) {
      return null; // pun mjesec — nema pro-rate
    }
    const effStart = prijava && prijava > startISO ? prijava : startISO;
    const effEnd = odjava && odjava < endISO ? odjava : endISO;
    // Računaj radne dane unutar perioda i unutar cijelog mjeseca
    const countWorkDays = (fromIso: string, toIso: string) => {
      const fromD = new Date(fromIso);
      const toD = new Date(toIso);
      let c = 0;
      for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
        const wd = d.getDay();
        if (wd !== 0 && wd !== 6) c++;
      }
      return c;
    };
    const wdInMonth = countWorkDays(startISO, endISO);
    const wdInPeriod = countWorkDays(effStart, effEnd);
    if (wdInMonth <= 0) return null;
    const factor = wdInPeriod / wdInMonth;
    return { factor, scaledOsnovica: baseOsn * factor };
  };

  const calcMutation = useMutation({
    mutationFn: (workerId: number) => {
      const vlasnik = vlasnici.find((v) => v.id === workerId);
      const proRate = vlasnik ? getVlasnikFactor(vlasnik) : null;
      return unwrap(
        calculatePayroll({
          organizationId: orgId,
          workerId,
          year,
          month,
          // Ako je mid-month, šaljemo pro-rated osnovicu kao grossBase.
          // Backend će izračunati doprinose proporcionalno toj osnovici,
          // pa će Pregled mjeseca, uplatnice i 2002 obrazac svi biti
          // automatski sinhroniziovani.
          ...(proRate ? { grossBase: proRate.scaledOsnovica } : {}),
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payrolls", orgId, year, month],
      });
      queryClient.invalidateQueries({
        queryKey: ["monthlySummary", orgId, year, month],
      });
    },
  });

  // Obrazac 2002 — generišemo klijentski iz worker (vlasnik) + org + payroll
  // snapshot. Vlasnik se predhodno mora obračunati (klik "Obračunaj").
  const obrazac2002Mutation = useMutation({
    mutationFn: async (vlasnik: Worker) => {
      const p = payrollByWorker.get(vlasnik.id);
      if (!p) {
        throw new Error("Vlasnik nije obračunat za ovaj mjesec");
      }
      if (!organization.taxRegime) {
        throw new Error("Postavi režim oporezivanja na organizaciji");
      }
      const fmt2 = (n: number) =>
        n.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      const mm = String(month).padStart(2, "0");
      const yyyy = String(year);
      const lastDay = new Date(year, month, 0).getDate();

      // Period (od-do) za 2002: skraćen ako je vlasnik prijavljen mid-month
      // ili odjavljen prije kraja mjeseca. Inače pun kalendarski mjesec.
      const startOfMonthISO = `${yyyy}-${mm}-01`;
      const endOfMonthISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
      const vlPrijava = vlasnik.prijavaDate
        ? vlasnik.prijavaDate.slice(0, 10)
        : null;
      const vlOdjava = vlasnik.odjavaDate
        ? vlasnik.odjavaDate.slice(0, 10)
        : null;
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
      // (calcMutation šalje scaled grossBase za mid-month vlasnika), pa
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

      const data: Obrazac2002Data = {
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
        osnovica: fmt2(Number(p.grossBase ?? p.gross) || 0),
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

      const bytes = await fillObrazac2002Template(data);
      const safeName = `${vlasnik.firstName}_${vlasnik.lastName}`.replace(
        /[^A-Za-z0-9_]/g,
        "_",
      );
      return {
        bytes,
        filename: `Obrazac-2002-${safeName}-${yyyy}-${mm}.pdf`,
      };
    },
    onSuccess: ({ bytes, filename }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      triggerBlobDownload(blob, filename);
    },
  });

  const kategorijaLabel = (() => {
    if (!organization.taxCategory) return "";
    if (organization.taxRegime === "STVARNI_DOHODAK") {
      return KATEGORIJA_STVARNI_LABELS[
        organization.taxCategory as keyof typeof KATEGORIJA_STVARNI_LABELS
      ];
    }
    if (organization.taxRegime === "PAUSALNI") {
      return KATEGORIJA_PAUSALNI_LABELS[
        organization.taxCategory as keyof typeof KATEGORIJA_PAUSALNI_LABELS
      ];
    }
    return "";
  })();

  // Doprinosi: PIO 19.5%, ZDR 14.5%, NEZAP 2% = 36%
  const o = osnovicaInfo?.osnovica ?? 0;
  const pio = o * 0.195;
  const zdr = o * 0.145;
  const nezap = o * 0.02;
  const total = pio + zdr + nezap;

  if (!organization.taxRegime) {
    return (
      <div className={styles.warning} style={{ marginBottom: "1rem" }}>
        Organizacija nema postavljen režim oporezivanja vlasnika. Postavi ga u{" "}
        <Link href="/profil" className={styles.btnGhost}>
          Profil → Moje organizacije
        </Link>{" "}
        kako bi se mogao obračunati vlasnik.
      </div>
    );
  }

  if (osnovicaInfo?.error) {
    return (
      <div className={styles.errorMsg} style={{ marginBottom: "1rem" }}>
        {osnovicaInfo.error}
      </div>
    );
  }

  return (
    <section
      style={{
        marginTop: "1rem",
        padding: "1rem 1.25rem",
        border: "1px solid var(--border, #d4cfc4)",
        borderRadius: "10px",
        background: "var(--paper, #faf8f3)",
      }}
    >
      <h3
        style={{
          fontFamily: "DM Serif Display, serif",
          fontSize: "1.15rem",
          margin: "0 0 0.5rem",
        }}
      >
        Vlasnik obrta
      </h3>
      <p className={styles.muted} style={{ margin: "0 0 0.8rem", fontSize: "0.85rem" }}>
        {REZIM_LABELS[organization.taxRegime]}
        {kategorijaLabel ? ` — ${kategorijaLabel}` : ""}
      </p>

      <div className={styles.summary} style={{ marginBottom: "1rem" }}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Osnovica</span>
          <span className={styles.summaryValue}>{fmtKM(o)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>PIO/MIO (19,5%)</span>
          <span className={styles.summaryValue}>{fmtKM(pio)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Zdravstveno (14,5%)</span>
          <span className={styles.summaryValue}>{fmtKM(zdr)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Nezaposlenost (2%)</span>
          <span className={styles.summaryValue}>{fmtKM(nezap)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Ukupno doprinosa (36%)</span>
          <span className={styles.summaryValue} style={{ color: "#b91c1c" }}>
            {fmtKM(total)} KM
          </span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Vlasnik</th>
              <th className={styles.num}>Osnovica</th>
              <th className={styles.num}>Doprinosi (36%)</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {vlasnici.map((v) => {
              const p = payrollByWorker.get(v.id);
              const status: Payroll["status"] | null = p?.status ?? null;
              return (
                <tr key={v.id}>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        status ? STATUS_CLASS[status] : styles.badgeNone
                      }`}
                    >
                      {status ? STATUS_LABEL[status] : "Nije obračunato"}
                    </span>
                  </td>
                  <td>
                    <strong>
                      {v.firstName} {v.lastName}
                    </strong>
                    {v.position && (
                      <div className={styles.muted} style={{ fontSize: "0.8rem" }}>
                        {v.position}
                      </div>
                    )}
                  </td>
                  <td className={styles.num}>{fmtKM(o)}</td>
                  <td className={styles.num}>{fmtKM(total)}</td>
                  <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => calcMutation.mutate(v.id)}
                      disabled={calcMutation.isPending}
                      title="Obračunaj vlasnika"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      {calcMutation.isPending ? "Obračun…" : "Obračunaj"}
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => obrazac2002Mutation.mutate(v)}
                      disabled={obrazac2002Mutation.isPending || !p || p.status === "DRAFT" || !canGenerate}
                      title={canGenerate ? "Preuzmi Obrazac 2002" : "Dostupno uz Pro pretplatu"}
                      style={{
                        background: "var(--sage, #3a5c42)",
                        borderColor: "var(--sage, #3a5c42)",
                        color: "#fff",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Obrazac 2002
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(calcMutation.isError || obrazac2002Mutation.isError) && (
        <div className={styles.errorMsg} style={{ marginTop: "0.6rem" }}>
          {(calcMutation.error as Error)?.message ||
            (obrazac2002Mutation.error as Error)?.message ||
            "Greška"}
        </div>
      )}
    </section>
  );
}

function MonthlyPanel({
  orgId,
  year,
  month,
  organization,
  totalWorkersCount,
  radnici,
  payrollByWorker,
  canGenerate,
}: {
  orgId: number;
  year: number;
  month: number;
  organization: Organization | null;
  totalWorkersCount: number;
  radnici: Worker[];
  payrollByWorker: Map<number, Payroll>;
  canGenerate: boolean;
}) {
  // Datum isplate plate (YYYY-MM-DD). Default: zadnji dan mjeseca obračuna.
  const defaultPaymentDate = (() => {
    const last = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  })();
  const [paymentDate, setPaymentDate] = useState<string>(defaultPaymentDate);

  // Reset kada se promijeni mjesec/godina
  useEffect(() => {
    setPaymentDate(defaultPaymentDate);
  }, [defaultPaymentDate]);

  const summaryQuery = useQuery({
    queryKey: ["monthlySummary", orgId, year, month],
    queryFn: () => unwrap(getMonthlySummary(orgId, year, month)),
  });

  const uplatniceMutation = useMutation({
    mutationFn: async () => {
      const r = await generateMonthlyUplatnice(orgId, year, month, paymentDate);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: (r) => triggerBlobDownload(r.blob, r.filename),
  });

  const payslipsMutation = useMutation({
    mutationFn: async () => {
      const r = await generateMonthlyPayslips(orgId, year, month, paymentDate);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: (r) => triggerBlobDownload(r.blob, r.filename),
  });

  const queryClientMP = useQueryClient();
  const markAllPaidMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Nedostaje organizacija");
      return unwrap(markMonthPaid({ organizationId: orgId, year, month }));
    },
    onSuccess: () => {
      queryClientMP.invalidateQueries({ queryKey: ["payrolls", orgId, year, month] });
      queryClientMP.invalidateQueries({ queryKey: ["monthlySummary", orgId, year, month] });
    },
  });

  // Obrazac 2001 — mjesečna specifikacija plata za Poreznu upravu FBiH.
  // Generiše se klijentski iz monthly summary podataka + organization info.
  const obrazac2001Mutation = useMutation({
    mutationFn: async () => {
      if (!summaryQuery.data || !organization) {
        throw new Error("Nedostaju podaci o organizaciji ili obračunu");
      }
      const lastDay = new Date(year, month, 0).getDate();
      const mm = String(month).padStart(2, "0");
      const yyyy = String(year);
      const fmt2 = (n: number) =>
        n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      // 2001 ide samo za radnike — sumiraj payrolle radnika (ignoriši vlasnike).
      const radniciPayrolls = radnici
        .map((w) => payrollByWorker.get(w.id))
        .filter((p): p is Payroll => !!p);
      // Period (od-do): pun mjesec ako svi radnici aktivni cijeli mjesec,
      // skraćen ako su prijavljeni mid-month ili odjavljeni prije kraja.
      // Formula: periodOd = MIN(MAX(početakMjeseca, prijavaDate)) preko radnika,
      //          periodDo = MAX(MIN(krajMjeseca, odjavaDate ?? krajMjeseca)).
      // Defensive: skipa radnike čiji datumi padaju izvan obračun mjeseca
      // (npr. prijavljen poslije ili odjavljen prije mjeseca).
      const startOfMonthISO = `${yyyy}-${mm}-01`;
      const endOfMonthISO = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
      const radniciWithPayroll = radnici.filter((w) => payrollByWorker.has(w.id));
      const startDates: string[] = [];
      const endDates: string[] = [];
      for (const w of radniciWithPayroll) {
        const prijava = w.prijavaDate ? w.prijavaDate.slice(0, 10) : null;
        const odjava = w.odjavaDate ? w.odjavaDate.slice(0, 10) : null;
        // Radnik nije bio aktivan tokom ovog mjeseca → preskoči
        if (prijava && prijava > endOfMonthISO) continue;
        if (odjava && odjava < startOfMonthISO) continue;
        const effectiveStart = prijava && prijava > startOfMonthISO ? prijava : startOfMonthISO;
        const effectiveEnd = odjava && odjava < endOfMonthISO ? odjava : endOfMonthISO;
        startDates.push(effectiveStart);
        endDates.push(effectiveEnd);
      }
      const periodOdISO = startDates.length ? startDates.sort()[0] : startOfMonthISO;
      const periodDoISO = endDates.length ? endDates.sort().slice(-1)[0] : endOfMonthISO;
      const [, periodOdMm, periodOdDan] = periodOdISO.split("-");
      const [, periodDoMm, periodDoDan] = periodDoISO.split("-");
      const t = {
        gross: radniciPayrolls.reduce((a, p) => a + (p.gross || 0), 0),
        empPio: radniciPayrolls.reduce((a, p) => a + (p.empPio || 0), 0),
        empZdr: radniciPayrolls.reduce((a, p) => a + (p.empZdravstvo || 0), 0),
        empNezap: radniciPayrolls.reduce((a, p) => a + (p.empNezaposlenost || 0), 0),
        empContrib: radniciPayrolls.reduce((a, p) => a + (p.empTotal || 0), 0),
        erpPio: radniciPayrolls.reduce((a, p) => a + (p.erpPio || 0), 0),
        erpZdr: radniciPayrolls.reduce((a, p) => a + (p.erpZdravstvo || 0), 0),
        erpNezap: radniciPayrolls.reduce((a, p) => a + (p.erpNezaposlenost || 0), 0),
        erpContrib: radniciPayrolls.reduce((a, p) => a + (p.erpTotal || 0), 0),
        tax: radniciPayrolls.reduce((a, p) => a + (p.incomeTax || 0), 0),
      };
      const grossBruto = t.gross;
      const data: Obrazac2001Data = {
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
        // 2001 obrazac obuhvata samo radnike (vlasnici idu na 2002).
        brojZaposlenih: String(radnici.length),
        placeUNovcu: fmt2(grossBruto),
        placeUStvarima: "",
        ukupnePlace: fmt2(grossBruto),
        nerezident: false,
        izuzeci: false,
        konsolidacija: false,
        sportskiKolektiv: false,
        vrstaIsplate: "DOPRINOSA_I_POREZA",
        // Dio 2 — iz osnovice (zaposlenik)
        pioStopa: "17,00",
        pioIznos: fmt2(t.empPio),
        zdrStopa: "12,50",
        zdrIznos: fmt2(t.empZdr),
        nezapStopa: "1,50",
        nezapIznos: fmt2(t.empNezap),
        empUkupnoIznos: fmt2(t.empContrib),
        // Dio 3 — na osnovicu (poslodavac)
        erpPioStopa: "2,50",
        erpPioIznos: fmt2(t.erpPio),
        erpZdrStopa: "2,00",
        erpZdrIznos: fmt2(t.erpZdr),
        erpNezapStopa: "0,50",
        erpNezapIznos: fmt2(t.erpNezap),
        dodatniPioStopa: "",
        dodatniPioIznos: "",
        dodatniZdrStopa: "",
        dodatniZdrIznos: "",
        erpUkupnoIznos: fmt2(t.erpContrib),
        // Dio 4 — obaveze
        obavezePio: fmt2(t.empPio + t.erpPio),
        obavezeZdr: fmt2(t.empZdr + t.erpZdr),
        obavezeNezap: fmt2(t.empNezap + t.erpNezap),
        obavezePorez: fmt2(t.tax),
        obavezeUkupno: fmt2(
          t.empPio + t.erpPio + t.empZdr + t.erpZdr + t.empNezap + t.erpNezap + t.tax,
        ),
        // Dio 5
        potpisObveznika: "",
        datum: (() => {
          const d = new Date(paymentDate);
          if (Number.isNaN(d.getTime())) return "";
          return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}.`;
        })(),
      };
      const bytes = await fillObrazac2001Template(data);
      return { bytes, filename: `Obrazac-2001-${yyyy}-${mm}.pdf` };
    },
    onSuccess: ({ bytes, filename }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      triggerBlobDownload(blob, filename);
    },
  });

  // MIP-1023 — mjesečni izvještaj o isplaćenim plaćama za PUFBiH (XML kroz nPIS,
  // PDF za štampu). Generiše se klijentski iz payroll-a radnika + organizacije.
  // Za sada: prvi list (max 5 radnika). Multi-page će biti dodano u sljedećoj iteraciji.
  const mip1023Mutation = useMutation({
    mutationFn: async () => {
      if (!summaryQuery.data || !organization) {
        throw new Error("Nedostaju podaci o organizaciji ili obračunu");
      }
      const mm = String(month).padStart(2, "0");
      const yyyy = String(year);
      const fmt2 = (n: number) =>
        n.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      // MIP obuhvata radnike (vlasnici idu posebno — za obrt nije u MIP-u).
      // Za d.o.o. vlasnik je već u radnici listi (mješa se sa radnicima).
      const radniciPayrolls = radnici
        .map((w) => ({ w, p: payrollByWorker.get(w.id) }))
        .filter(
          (x): x is { w: Worker; p: Payroll } => !!x.p && x.p.gross > 0,
        );

      const t = {
        gross: radniciPayrolls.reduce((a, x) => a + (x.p.gross || 0), 0),
        empContrib: radniciPayrolls.reduce(
          (a, x) => a + (x.p.empTotal || 0),
          0,
        ),
        licniOdbitak: radniciPayrolls.reduce(
          (a, x) => a + (x.p.deduction || 0),
          0,
        ),
        tax: radniciPayrolls.reduce((a, x) => a + (x.p.incomeTax || 0), 0),
        erpPio: radniciPayrolls.reduce((a, x) => a + (x.p.erpPio || 0), 0),
        erpZdr: radniciPayrolls.reduce(
          (a, x) => a + (x.p.erpZdravstvo || 0),
          0,
        ),
        erpNezap: radniciPayrolls.reduce(
          (a, x) => a + (x.p.erpNezaposlenost || 0),
          0,
        ),
      };

      const datumIsplate = (() => {
        const d = new Date(paymentDate);
        if (Number.isNaN(d.getTime())) return "";
        return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}.`;
      })();

      const rows: Mip1023Row[] = radniciPayrolls.slice(0, 5).map(({ w, p }) => {
        const bruto = Number(p.gross) || 0;
        const koristi = 0;
        const ukupanPrihod = bruto + koristi;
        const empPio = Number(p.empPio) || 0;
        const empZdr = Number(p.empZdravstvo) || 0;
        const empNezap = Number(p.empNezaposlenost) || 0;
        const empUkupno = empPio + empZdr + empNezap;
        const prihodUmanjen = ukupanPrihod - empUkupno;
        const faktor = Number(p.taxCoefficient ?? 1);
        const iznosOdbitka = Number(p.deduction) || faktor * 300;
        const osnovicaPoreza = Math.max(0, prihodUmanjen - iznosOdbitka);
        const iznosPoreza = osnovicaPoreza * 0.1;
        const radniSati = p.workedMinutes
          ? Math.round((p.workedMinutes / 60) * 100) / 100
          : 168;
        const bolovanjeSati = (p.sickDays || 0) * 8;
        // Šifra općine prebivališta — 3-cifrena iz uplatni-racuni.ts mapinga.
        const opcinaInfo = kantonForOpcina(w.city || "");
        const opcinaKod = opcinaInfo?.opcinaKod || "";

        return {
          vrstaIsplate: "1",
          jmb: w.jmbg || "",
          opcina: opcinaKod,
          datumIsplate,
          brojRadnihSati: String(radniSati),
          brojRadnihSatiBolovanje: String(bolovanjeSati),
          brutoPlaca: fmt2(bruto),
          koristi: fmt2(koristi),
          ukupanPrihod: fmt2(ukupanPrihod),
          pioDoprinos: fmt2(empPio),
          imePrezime: `${w.firstName} ${w.lastName}`.trim(),
          zdrDoprinos: fmt2(empZdr),
          nezapDoprinos: fmt2(empNezap),
          ukupanDoprinos: fmt2(empUkupno),
          prihodUmanjen: fmt2(prihodUmanjen),
          faktorOdbitka: faktor.toFixed(1),
          iznosOdbitka: fmt2(iznosOdbitka),
          osnovicaPoreza: fmt2(osnovicaPoreza),
          iznosPoreza: fmt2(iznosPoreza),
          satiUvecaniStaz: "0",
          stepenUvecanja: "00",
          sifraRadnogMjesta: "0",
          doprinosPioStaz: "0,00",
        };
      });

      const data: Mip1023Data = {
        jib: (organization.taxNumber || "").replace(/\D/g, ""),
        naziv: organization.name || "",
        sifraDjelatnosti: organization.activityCode || "",
        brojZaposlenih: String(radniciPayrolls.length),
        mjesec: mm,
        godinaSuffix: yyyy.slice(-2),
        ukupanPrihod: fmt2(t.gross),
        ukupanDoprinos: fmt2(t.empContrib),
        ukupanLicniOdbitak: fmt2(t.licniOdbitak),
        ukupanPorez: fmt2(t.tax),
        poslodavacPio: fmt2(t.erpPio),
        poslodavacZdr: fmt2(t.erpZdr),
        poslodavacNezap: fmt2(t.erpNezap),
        poslodavacDodatniZdr: "0,00",
        datumPotpisa: datumIsplate,
        rows,
      };

      const bytes = await fillMip1023Template(data);
      return { bytes, filename: `MIP-1023-${yyyy}-${mm}.pdf` };
    },
    onSuccess: ({ bytes, filename }) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      triggerBlobDownload(blob, filename);
    },
  });

  if (summaryQuery.isLoading) {
    return (
      <div className={styles.empty} style={{ marginTop: "1.5rem" }}>
        Učitavam mjesečni pregled…
      </div>
    );
  }

  const s = summaryQuery.data;
  if (!s) return null;

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2
        style={{
          fontFamily: "DM Serif Display, serif",
          fontSize: "1.4rem",
          margin: "0 0 0.5rem",
        }}
      >
        Pregled mjeseca — {MONTHS[month - 1]} {year}
      </h2>
      <p className={styles.muted} style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>
        Doprinosi i porezi se uplaćuju zbirno za sve radnike u jednoj uplatnici po vrsti.
        Neto plata, topli obrok i putni trošak idu odvojeno svakom radniku.
      </p>

      <div className={styles.summary} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Bruto ukupno</span>
          <span className={styles.summaryValue}>{fmtKM(s.totals.gross)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Neto za isplatu</span>
          <span className={styles.summaryValue}>{fmtKM(s.totals.net)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Topli obrok</span>
          <span className={styles.summaryValue}>{fmtKM(s.totals.meal)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Regres</span>
          <span className={styles.summaryValue}>{fmtKM(s.totals.vacation)} KM</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Putni trošak</span>
          <span className={styles.summaryValue}>{fmtKM(s.totals.travel)} KM</span>
        </div>
        {organization?.type !== "BUSINESS" && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Fond invalida</span>
            <span className={styles.summaryValue}>{fmtKM(s.totals.invalidi)} KM</span>
          </div>
        )}
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Ukupan trošak poslodavca</span>
          <span className={styles.summaryValue} style={{ color: "#b91c1c" }}>
            {fmtKM(s.totals.totalCost)} KM
          </span>
        </div>
      </div>

      {/* Zbirne uplatnice (doprinosi i porezi) — jedna po vrsti */}
      <div className={styles.subsectionTitle}>
        Zbirne uplatnice — doprinosi i porezi
      </div>
      <div className={styles.uplCardsList}>
        {s.uplatnice.map((u: MonthlyUplatnicaSummary, i: number) => {
          // Group header: pokaži kad je ovaj entry prvi u svojoj grupi
          // (vlasnik / radnici). Samo za obrt sa razdvojenim grupama.
          const prevGroup = i > 0 ? s.uplatnice[i - 1].group : null;
          const showHeader = u.group && u.group !== prevGroup;
          return (
            <div key={`${u.type}-${u.opcinaKod || ""}-${i}`} style={{ display: "contents" }}>
              {showHeader && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--sage)",
                    padding: "0.5rem 0 0.25rem",
                    marginTop: i === 0 ? 0 : "0.5rem",
                  }}
                >
                  {u.group === "vlasnik"
                    ? "Uplatnice vlasnika"
                    : "Uplatnice radnika"}
                </div>
              )}
              <div className={styles.uplCard}>
                <span className={styles.uplCardNum}>{i + 1}</span>
                <div className={styles.uplCardBody}>
                  <div className={styles.uplCardTitle}>{u.label}</div>
                  <div className={styles.uplCardSub}>
                    {u.account || "—"}
                    {Array.isArray(u.primalac) && u.primalac.length
                      ? ` · ${u.primalac.join(" · ")}`
                      : ""}
                    {` · Vrsta prihoda: ${u.vrstaPrihoda || "—"}`}
                    {` · Budžetska org.: ${u.budgetOrg || "0000000"}`}
                  </div>
                </div>
                <span className={styles.uplCardIznos}>{fmtKM(u.amount)} KM</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.totalCostRow}>
        <span className={styles.totalCostLabel}>Zbir doprinosa i poreza</span>
        <span className={styles.totalCostValue}>
          {fmtKM(s.uplatnice.reduce((acc, u) => acc + (u.amount || 0), 0))} KM
        </span>
      </div>

      {/* Per-worker uplatnice — neto plata + dodaci (idu pojedinačno radnicima) */}
      {s.perWorker && s.perWorker.length > 0 && (
        <>
          <div className={styles.subsectionTitle}>
            Uplate radnicima — neto plate i dodaci
          </div>
          <div className={styles.uplCardsList}>
            {s.perWorker.flatMap((w, idx) => {
              const items: React.ReactNode[] = [];
              if (w.net > 0) {
                items.push(
                  <div key={`${w.workerId}-net`} className={styles.uplCard}>
                    <span className={styles.uplCardWorker}>{w.workerName}</span>
                    <div className={styles.uplCardBody}>
                      <div className={styles.uplCardTitle}>Neto plata</div>
                      <div className={styles.uplCardSub}>
                        {w.bankAccount || "Žiro račun nije unesen za radnika"}
                      </div>
                    </div>
                    <span className={styles.uplCardIznos}>{fmtKM(w.net)} KM</span>
                  </div>,
                );
              }
              if (w.mealAllowance > 0) {
                items.push(
                  <div key={`${w.workerId}-meal`} className={styles.uplCard}>
                    <span className={styles.uplCardWorker}>{w.workerName}</span>
                    <div className={styles.uplCardBody}>
                      <div className={styles.uplCardTitle}>Topli obrok</div>
                      <div className={styles.uplCardSub}>
                        {w.bankAccount || "—"}
                      </div>
                    </div>
                    <span className={styles.uplCardIznos}>{fmtKM(w.mealAllowance)} KM</span>
                  </div>,
                );
              }
              if (w.vacationBonus > 0) {
                items.push(
                  <div key={`${w.workerId}-vac`} className={styles.uplCard}>
                    <span className={styles.uplCardWorker}>{w.workerName}</span>
                    <div className={styles.uplCardBody}>
                      <div className={styles.uplCardTitle}>Regres</div>
                      <div className={styles.uplCardSub}>
                        {w.bankAccount || "—"}
                      </div>
                    </div>
                    <span className={styles.uplCardIznos}>{fmtKM(w.vacationBonus)} KM</span>
                  </div>,
                );
              }
              if (w.travelExpense > 0) {
                items.push(
                  <div key={`${w.workerId}-tr`} className={styles.uplCard}>
                    <span className={styles.uplCardWorker}>{w.workerName}</span>
                    <div className={styles.uplCardBody}>
                      <div className={styles.uplCardTitle}>Putni trošak</div>
                      <div className={styles.uplCardSub}>
                        {w.bankAccount || "—"}
                      </div>
                    </div>
                    <span className={styles.uplCardIznos}>{fmtKM(w.travelExpense)} KM</span>
                  </div>,
                );
              }
              return items;
            })}
          </div>

          <div className={styles.totalCostRow}>
            <span className={styles.totalCostLabel}>Zbir isplata radnicima</span>
            <span className={styles.totalCostValue}>
              {fmtKM(
                s.totals.net +
                  s.totals.meal +
                  s.totals.vacation +
                  s.totals.travel,
              )}{" "}
              KM
            </span>
          </div>
        </>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          marginTop: "1.5rem",
        }}
      >
        <div className={js3Styles.fieldGroup} style={{ maxWidth: 280, width: "100%" }}>
          <label className={js3Styles.fieldLabel} htmlFor="paymentDate">
            Datum isplate plate
          </label>
          <DateInput
            id="paymentDate"
            value={paymentDate}
            onValueChange={(iso) => setPaymentDate(iso)}
            className={js3Styles.fieldInput}
          />
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => payslipsMutation.mutate()}
            disabled={
              payslipsMutation.isPending || !canGenerate || radnici.length === 0
            }
            title={
              !canGenerate
                ? "Dostupno uz Pro pretplatu"
                : radnici.length === 0
                ? "Vlasnik obrta nema platni listić — listići se generišu samo za radnike."
                : undefined
            }
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "0.95rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {payslipsMutation.isPending
              ? "Generišem…"
              : "Preuzmi platne listiće"}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => uplatniceMutation.mutate()}
            disabled={uplatniceMutation.isPending || !canGenerate}
            title={canGenerate ? undefined : "Dostupno uz Pro pretplatu"}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "0.95rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {uplatniceMutation.isPending
              ? "Generišem…"
              : "Preuzmi uplatnice"}
          </button>
          {radnici.length > 0 && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => obrazac2001Mutation.mutate()}
              disabled={obrazac2001Mutation.isPending || !organization || !canGenerate}
              title={canGenerate ? undefined : "Dostupno uz Pro pretplatu"}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "0.95rem",
                background: "var(--sage, #3a5c42)",
                borderColor: "var(--sage, #3a5c42)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {obrazac2001Mutation.isPending
                ? "Generišem…"
                : "Preuzmi Obrazac 2001"}
            </button>
          )}
          {radnici.length > 0 && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => mip1023Mutation.mutate()}
              disabled={mip1023Mutation.isPending || !organization || !canGenerate}
              title={canGenerate ? undefined : "Dostupno uz Pro pretplatu"}
              style={{
                padding: "0.75rem 1.5rem",
                fontSize: "0.95rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {mip1023Mutation.isPending ? "Generišem…" : "Preuzmi MIP-1023"}
            </button>
          )}
        </div>

        {/* Bulk označavanje obračuna kao isplaćeni */}
        <BulkMarkPaidAction
          isPending={markAllPaidMutation.isPending}
          onMark={async () => {
            const updated = (await markAllPaidMutation.mutateAsync()).updated;
            return updated;
          }}
        />
      </div>

      {(uplatniceMutation.isError ||
        payslipsMutation.isError ||
        obrazac2001Mutation.isError ||
        mip1023Mutation.isError) && (
        <div className={styles.errorMsg} style={{ marginTop: "0.6rem" }}>
          {uplatniceMutation.error?.message ||
            payslipsMutation.error?.message ||
            obrazac2001Mutation.error?.message ||
            mip1023Mutation.error?.message ||
            "Greška pri generisanju dokumenata"}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Modal: detalji obračuna za jednog radnika
// ─────────────────────────────────────────────────────────────────────────────

function PayrollModal({
  orgId,
  year,
  month,
  worker,
  payroll,
  onClose,
}: {
  orgId: number;
  year: number;
  month: number;
  worker: Worker;
  payroll: Payroll | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const existing = payroll;

  // Sihterica auto-fetch za pre-fill workedMinutes ako nema snapshot vrijednosti.
  const sihQuery = useQuery({
    queryKey: ["sihterica", worker.id, year, month],
    queryFn: () => unwrap(getSihterica(worker.id, year, month)),
  });

  const sihMinutes = useMemo(() => {
    const data = sihQuery.data;
    if (!data || typeof data !== "object") return 0;
    return sumSihtericaMinutes((data as { days?: unknown }).days);
  }, [sihQuery.data]);

  // Form state — inicijalizacija iz postojećeg snapshot-a ili sa worker default-a.
  // "gross" je BRUTO OSNOVICA (ono što user upiše iz ugovora), bez minulog rada.
  // Prioritet: existing payroll sa realnim brutom > worker.salaryBruto >
  // preračun iz worker.salaryNeto. DRAFT sa grossBase=0 se ignoriše.
  const [gross, setGross] = useState<string>(() => {
    if (existing) {
      const base = existing.grossBase ?? existing.gross;
      const baseNum = Number(base);
      if (Number.isFinite(baseNum) && baseNum > 0) {
        return String(base);
      }
      // existing postoji ali je DRAFT bez bruta — fall through na worker
    }
    if (worker.salaryBruto != null && Number(worker.salaryBruto) > 0) {
      return String(worker.salaryBruto);
    }
    if (worker.salaryNeto != null && Number(worker.salaryNeto) > 0) {
      const ded = deductionFromCoefficient(Number(worker.taxCoefficient ?? 1));
      const calc = fromNet(Number(worker.salaryNeto), ded);
      return calc.gross > 0 ? calc.gross.toFixed(2) : "";
    }
    return "";
  });
  const [coeff, setCoeff] = useState<string>(() =>
    existing
      ? String(existing.taxCoefficient)
      : String(worker.taxCoefficient ?? 1),
  );
  // Bi-direkciono polje bruto ↔ neto. Kad user upiše neto, sistem računa
  // bruto OSNOVICU unazad uzimajući u obzir minuli rad (množilac M),
  // koeficijent (deduction) i uvećanja (U). Formula:
  //   fullGross = fromNet(targetNet, deduction).gross
  //   base      = fullGross / (M + U)
  // Tako neto = stvarni iznos koji radnik prima na račun, a bruto osnovica
  // se podešava ako se promijeni minuli rad/koeficijent.
  const [netoDisplay, setNetoDisplay] = useState<string>("");
  const lastEditRef = useRef<"gross" | "neto">("gross");
  const [minuliRad, setMinuliRad] = useState<string>(() => {
    if (existing?.minuliRadRate != null) return String(existing.minuliRadRate);
    return String(worker.minuliRadRate ?? 0.4);
  });
  // Sati se prikazuju decimalno (npr. "174" ili "174,5"). Konvertuje se u minute
  // pri slanju na server (workedMinutes = hours × 60).
  const minutesToHoursStr = (mins: number | null | undefined): string => {
    if (mins == null) return "";
    const h = mins / 60;
    return Number.isInteger(h) ? String(h) : h.toFixed(2).replace(".", ",");
  };
  const [workedHours, setWorkedHours] = useState<string>(() =>
    minutesToHoursStr(existing?.workedMinutes),
  );
  const [sickDays, setSickDays] = useState<string>(() =>
    existing ? String(existing.sickDays) : "0",
  );
  const [vacationDays, setVacationDays] = useState<string>(() =>
    existing ? String(existing.vacationDays ?? 0) : "0",
  );
  const [overtime, setOvertime] = useState<string>(() =>
    existing ? String(existing.overtimeHours) : "0",
  );
  const [night, setNight] = useState<string>(() =>
    existing ? String(existing.nightHours) : "0",
  );
  const [sunday, setSunday] = useState<string>(() =>
    existing ? String(existing.sundayHours) : "0",
  );
  const [holiday, setHoliday] = useState<string>(() =>
    existing ? String(existing.holidayHours) : "0",
  );
  // Stope uvećanja — placeholderi su zakonski minimumi (čl. 76 ZoR FBiH).
  // Default vrijednost dolazi iz Worker modela; mogu se override-ati po obračunu.
  const [overtimeRate, setOvertimeRate] = useState<string>(() => {
    if (existing?.overtimeRate != null) return String(existing.overtimeRate);
    return String(worker.overtimeRate ?? 25);
  });
  const [nightRate, setNightRate] = useState<string>(() => {
    if (existing?.nightRate != null) return String(existing.nightRate);
    return String(worker.nightRate ?? 25);
  });
  const [sundayRate, setSundayRate] = useState<string>(() => {
    if (existing?.sundayRate != null) return String(existing.sundayRate);
    return String(worker.sundayRate ?? 20);
  });
  const [holidayRate, setHolidayRate] = useState<string>(() => {
    if (existing?.holidayRate != null) return String(existing.holidayRate);
    return String(worker.holidayRate ?? 50);
  });
  const [meal, setMeal] = useState<string>(() => {
    if (existing) return String(existing.mealAllowance);
    return String(worker.defaultMealAllowance ?? 0);
  });
  // Regres se NE pamti — resetuje se svaki mjesec (godišnje samo jednom).
  const [vacation, setVacation] = useState<string>(() =>
    existing ? String(existing.vacationBonus) : "0",
  );
  const [travel, setTravel] = useState<string>(() => {
    if (existing) return String(existing.travelExpense);
    return String(worker.defaultTravelExpense ?? 0);
  });
  const [error, setError] = useState<string | null>(null);

  // Auto-prefill:
  //   1) Ako postoji šihterica → koristi njene minute
  //   2) Inače → standardni mjesečni fond (radni dani × 8h)
  // Korisnik može uvijek ručno mijenjati.
  useEffect(() => {
    if (existing?.workedMinutes != null) return;
    if (workedHours !== "") return;
    if (sihMinutes > 0) {
      setWorkedHours(minutesToHoursStr(sihMinutes));
    } else if (!sihQuery.isLoading) {
      setWorkedHours(minutesToHoursStr(standardMinutesForMonth(year, month)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sihMinutes, sihQuery.isLoading]);

  const parseNum = (s: string): number => {
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  // Preview izračun u modalu (bez minimum-base logike — server primjenjuje to).
  // Efektivni bruto = osnovica + minuli rad + uvećanja (po istoj logici kao server).
  const previewBreakdown = useMemo(() => {
    const base = parseNum(gross);
    if (base <= 0) return null;
    const hourly = base / 174;
    const ot = parseNum(overtime) * hourly * (parseNum(overtimeRate) / 100);
    const nt = parseNum(night) * hourly * (parseNum(nightRate) / 100);
    const su = parseNum(sunday) * hourly * (parseNum(sundayRate) / 100);
    const ho = parseNum(holiday) * hourly * (parseNum(holidayRate) / 100);
    const uvecanja = ot + nt + su + ho;
    return {
      base,
      overtimeAmt: ot,
      nightAmt: nt,
      sundayAmt: su,
      holidayAmt: ho,
      uvecanja,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gross, overtime, night, sunday, holiday, overtimeRate, nightRate, sundayRate, holidayRate]);

  // Efektivni bruto = osnovica + minuli rad + uvećanja. Isti agregat se koristi
  // za obračun doprinosa i za logiku minimalne osnovice (warning).
  const effectiveGross = useMemo(() => {
    const base = parseNum(gross);
    if (base <= 0 || !previewBreakdown) return 0;
    const minuliRate = parseNum(minuliRad) / 100;
    const startDate = worker.startDate ? new Date(worker.startDate) : null;
    const now = new Date();
    let years = 0;
    if (startDate && !Number.isNaN(startDate.getTime())) {
      years = now.getFullYear() - startDate.getFullYear();
      const md = now.getMonth() - startDate.getMonth();
      if (md < 0 || (md === 0 && now.getDate() < startDate.getDate())) years -= 1;
      years = Math.max(0, years);
    }
    const minuliAmt = base * minuliRate * years;
    return base + minuliAmt + previewBreakdown.uvecanja;
  }, [gross, minuliRad, previewBreakdown, worker.startDate]);

  const preview = useMemo(() => {
    if (effectiveGross <= 0) return null;
    const ded = deductionFromCoefficient(parseNum(coeff));
    return fromGross(effectiveGross, ded);
  }, [effectiveGross, coeff]);

  // Multiplikator (M) i koeficijent uvećanja (U) za inverz neto → bruto.
  // fullGross = base × M + base × U = base × (M + U)
  const yearsOfService = useMemo(() => {
    const startDate = worker.startDate ? new Date(worker.startDate) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) return 0;
    const now = new Date();
    let y = now.getFullYear() - startDate.getFullYear();
    const md = now.getMonth() - startDate.getMonth();
    if (md < 0 || (md === 0 && now.getDate() < startDate.getDate())) y -= 1;
    return Math.max(0, y);
  }, [worker.startDate]);

  const grossFactor = useMemo(() => {
    const minuliM = 1 + (parseNum(minuliRad) / 100) * yearsOfService;
    const hourlyU =
      (parseNum(overtime) * parseNum(overtimeRate) +
        parseNum(night) * parseNum(nightRate) +
        parseNum(sunday) * parseNum(sundayRate) +
        parseNum(holiday) * parseNum(holidayRate)) /
      (174 * 100);
    return minuliM + hourlyU;
  }, [
    minuliRad,
    yearsOfService,
    overtime,
    overtimeRate,
    night,
    nightRate,
    sunday,
    sundayRate,
    holiday,
    holidayRate,
  ]);

  // Sync netoDisplay iz preview-a kad god se promijeni gross (ili bilo koji
  // input koji utiče na preview), osim ako je user upravo upisao neto.
  useEffect(() => {
    if (lastEditRef.current === "neto") {
      // Vrati flag na "gross" da sljedeća iteracija opet sinhronizira.
      lastEditRef.current = "gross";
      return;
    }
    if (!preview || preview.net <= 0) {
      setNetoDisplay("");
      return;
    }
    setNetoDisplay(preview.net.toFixed(2));
  }, [preview]);

  const handleNetoChange = (v: string) => {
    lastEditRef.current = "neto";
    setNetoDisplay(v);
    const targetNet = Number(v.replace(",", "."));
    if (!Number.isFinite(targetNet) || targetNet <= 0) {
      setGross("");
      return;
    }
    const ded = deductionFromCoefficient(parseNum(coeff));
    const fullGross = fromNet(targetNet, ded).gross;
    if (!Number.isFinite(fullGross) || fullGross <= 0 || grossFactor <= 0) {
      setGross("");
      return;
    }
    const base = fullGross / grossFactor;
    if (Number.isFinite(base) && base > 0) {
      setGross(base.toFixed(2));
    }
  };

  const calcMutation = useMutation({
    mutationFn: () =>
      unwrap(
        calculatePayroll({
          organizationId: orgId,
          workerId: worker.id,
          year,
          month,
          grossBase: parseNum(gross),
          minuliRadRate: parseNum(minuliRad),
          taxCoefficient: parseNum(coeff),
          workedMinutes: workedHours
            ? Math.round(parseNum(workedHours) * 60)
            : null,
          sickDays: parseInt(sickDays, 10) || 0,
          vacationDays: parseInt(vacationDays, 10) || 0,
          overtimeHours: parseNum(overtime),
          nightHours: parseNum(night),
          sundayHours: parseNum(sunday),
          holidayHours: parseNum(holiday),
          overtimeRate: parseNum(overtimeRate),
          nightRate: parseNum(nightRate),
          sundayRate: parseNum(sundayRate),
          holidayRate: parseNum(holidayRate),
          mealAllowance: parseNum(meal),
          vacationBonus: parseNum(vacation),
          travelExpense: parseNum(travel),
        }),
      ),
    onSuccess: () => {
      // Modal ostaje otvoren — user može dalje pregledati bez gubitka konteksta.
      queryClient.invalidateQueries({
        queryKey: ["payrolls", orgId, year, month],
      });
      queryClient.invalidateQueries({
        queryKey: ["monthlySummary", orgId, year, month],
      });
      // Backend je sticky-upisao stope/naknade na workera — refetch da bi
      // sljedeći mjesec vidio nove default-e.
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      setError(null);
    },
    onError: (e: Error) => setError(e.message || "Greška pri obračunu"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => unwrap(deletePayroll(existing!.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payrolls", orgId, year, month],
      });
      queryClient.invalidateQueries({
        queryKey: ["monthlySummary", orgId, year, month],
      });
      onClose();
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: () => unwrap(patchPayroll(existing!.id, { status: "ISPLACENO" })),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payrolls", orgId, year, month],
      });
      queryClient.invalidateQueries({
        queryKey: ["monthlySummary", orgId, year, month],
      });
    },
  });

  // Inline potvrda brisanja (zamjena za native confirm dialog)
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Min. osnovica zavisi od ugovorenog radnog vremena radnika i koeficijenta
  // porezne kartice (Zakon o doprinosima FBiH, čl. 7, izmjene 33/25 od
  // 01.07.2025). Računa se preko helpera iz payrollFbih.
  const minBaseInfo = useMemo(
    () => computeMinContribBase(parseNum(coeff), worker.contractedHours ?? 8),
    [coeff, worker.contractedHours],
  );
  // Warning poredi EFEKTIVNI bruto sa PRORAČUNATIM pragom — ako radnik nije
  // odradio pun mjesec (npr. zbog bolovanja ili kasnog početka), proporcionalno
  // niža bruto je legitimna i ne treba warning. Standardni fond = 174h.
  const STANDARD_HOURS = 174;
  const workedH = workedHours ? parseNum(workedHours) : 0;
  const workedRatio = workedH > 0 ? Math.min(workedH / STANDARD_HOURS, 1) : 1;
  const minBaseThreshold = minBaseInfo.minBase * workedRatio;
  const minBaseApplied = effectiveGross > 0 && effectiveGross < minBaseThreshold;

  // Modal se zatvara samo kad je i mousedown i mouseup na backdrop-u.
  // Bez ovoga, drag selekcija iz modala van zatvori modal čim user otpusti miš.
  const mouseDownOnBackdropRef = useRef(false);

  // ── Dirty tracking + auto-save na zatvaranje ──────────────────────────────
  // Korisnik može unijeti dodatak (npr. topli obrok 300 KM) i zatvoriti modal —
  // vrijednost se automatski sprema da bi "Obračunaj sve" kasnije imala podatke.
  const numericFromExisting = (v: number | null | undefined, fallback = 0) =>
    v != null ? Number(v) : fallback;

  const isDirty = useMemo(() => {
    const cur = {
      gross: parseNum(gross),
      coeff: parseNum(coeff),
      minuli: parseNum(minuliRad),
      workedMinutes: workedHours ? Math.round(parseNum(workedHours) * 60) : null,
      sickDays: parseInt(sickDays, 10) || 0,
      vacationDays: parseInt(vacationDays, 10) || 0,
      overtime: parseNum(overtime),
      night: parseNum(night),
      sunday: parseNum(sunday),
      holiday: parseNum(holiday),
      overtimeRate: parseNum(overtimeRate),
      nightRate: parseNum(nightRate),
      sundayRate: parseNum(sundayRate),
      holidayRate: parseNum(holidayRate),
      meal: parseNum(meal),
      vacation: parseNum(vacation),
      travel: parseNum(travel),
    };
    // Originalna bruto vrijednost — ista logika kao gross init state.
    const origGrossFromWorker = (() => {
      if (worker.salaryBruto != null && Number(worker.salaryBruto) > 0) {
        return Number(worker.salaryBruto);
      }
      if (worker.salaryNeto != null && Number(worker.salaryNeto) > 0) {
        const ded = deductionFromCoefficient(Number(worker.taxCoefficient ?? 1));
        const calc = fromNet(Number(worker.salaryNeto), ded);
        return calc.gross > 0 ? Number(calc.gross.toFixed(2)) : 0;
      }
      return 0;
    })();
    const existingGrossNum = existing
      ? Number(existing.grossBase ?? existing.gross)
      : 0;
    const orig = {
      gross: existingGrossNum > 0 ? existingGrossNum : origGrossFromWorker,
      coeff: existing
        ? Number(existing.taxCoefficient)
        : Number(worker.taxCoefficient ?? 1),
      minuli: existing?.minuliRadRate != null
        ? Number(existing.minuliRadRate)
        : Number(worker.minuliRadRate ?? 0.4),
      workedMinutes: existing?.workedMinutes ?? null,
      sickDays: numericFromExisting(existing?.sickDays),
      vacationDays: numericFromExisting(existing?.vacationDays),
      overtime: numericFromExisting(existing?.overtimeHours),
      night: numericFromExisting(existing?.nightHours),
      sunday: numericFromExisting(existing?.sundayHours),
      holiday: numericFromExisting(existing?.holidayHours),
      overtimeRate: existing?.overtimeRate != null
        ? Number(existing.overtimeRate)
        : Number(worker.overtimeRate ?? 25),
      nightRate: existing?.nightRate != null
        ? Number(existing.nightRate)
        : Number(worker.nightRate ?? 25),
      sundayRate: existing?.sundayRate != null
        ? Number(existing.sundayRate)
        : Number(worker.sundayRate ?? 20),
      holidayRate: existing?.holidayRate != null
        ? Number(existing.holidayRate)
        : Number(worker.holidayRate ?? 50),
      meal: existing?.mealAllowance != null
        ? Number(existing.mealAllowance)
        : Number(worker.defaultMealAllowance ?? 0),
      vacation: numericFromExisting(existing?.vacationBonus),
      travel: existing?.travelExpense != null
        ? Number(existing.travelExpense)
        : Number(worker.defaultTravelExpense ?? 0),
    };
    return (
      cur.gross !== orig.gross ||
      cur.coeff !== orig.coeff ||
      cur.minuli !== orig.minuli ||
      cur.workedMinutes !== orig.workedMinutes ||
      cur.sickDays !== orig.sickDays ||
      cur.vacationDays !== orig.vacationDays ||
      cur.overtime !== orig.overtime ||
      cur.night !== orig.night ||
      cur.sunday !== orig.sunday ||
      cur.holiday !== orig.holiday ||
      cur.overtimeRate !== orig.overtimeRate ||
      cur.nightRate !== orig.nightRate ||
      cur.sundayRate !== orig.sundayRate ||
      cur.holidayRate !== orig.holidayRate ||
      cur.meal !== orig.meal ||
      cur.vacation !== orig.vacation ||
      cur.travel !== orig.travel
    );
  }, [
    gross, coeff, minuliRad, workedHours, sickDays, vacationDays, overtime, night, sunday, holiday,
    overtimeRate, nightRate, sundayRate, holidayRate,
    meal, vacation, travel, existing, worker,
  ]);

  const isSavingRef = useRef(false);
  const handleClose = async () => {
    if (isDirty && !isSavingRef.current) {
      isSavingRef.current = true;
      try {
        // SAMO sprema input polja, ne pokreće puni obračun. Korisnik mora
        // eksplicitno kliknuti "Obračunaj" ili "Obračunaj sve" za izračun.
        await unwrap(
          savePayrollInputs({
            organizationId: orgId,
            workerId: worker.id,
            year,
            month,
            workedMinutes: workedHours
              ? Math.round(parseNum(workedHours) * 60)
              : null,
            sickDays: parseInt(sickDays, 10) || 0,
            vacationDays: parseInt(vacationDays, 10) || 0,
            overtimeHours: parseNum(overtime),
            nightHours: parseNum(night),
            sundayHours: parseNum(sunday),
            holidayHours: parseNum(holiday),
            overtimeRate: parseNum(overtimeRate),
            nightRate: parseNum(nightRate),
            sundayRate: parseNum(sundayRate),
            holidayRate: parseNum(holidayRate),
            mealAllowance: parseNum(meal),
            vacationBonus: parseNum(vacation),
            travelExpense: parseNum(travel),
            taxCoefficient: parseNum(coeff),
            minuliRadRate: parseNum(minuliRad),
          }),
        );
        queryClient.invalidateQueries({
          queryKey: ["payrolls", orgId, year, month],
        });
        queryClient.invalidateQueries({
          queryKey: ["monthlySummary", orgId, year, month],
        });
        queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      } catch {
        // ako spremanje pukne, ipak zatvori — error se vidi u toast / tabeli
      } finally {
        isSavingRef.current = false;
      }
    }
    onClose();
  };

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(e) => {
        mouseDownOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) {
          handleClose();
        }
        mouseDownOnBackdropRef.current = false;
      }}
    >
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Obračun — {worker.firstName} {worker.lastName} · {MONTHS[month - 1]} {year}
          </h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={handleClose}
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Osnovica, koeficijent i minuli rad</div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Bruto osnovica (KM)</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={gross}
                  onChange={(e) => {
                    lastEditRef.current = "gross";
                    setGross(e.target.value);
                  }}
                  placeholder="Iz ugovora, bez minulog rada"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Neto (iznos na ruke)</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={netoDisplay}
                  onChange={(e) => handleNetoChange(e.target.value)}
                  placeholder="Iznos koji radnik prima na račun"
                />
                <p className={styles.note} style={{ margin: "0.3rem 0 0" }}>
                  Uračunava minuli rad i koeficijent
                </p>
              </div>
            </div>
            <div className={styles.grid2} style={{ marginTop: "0.8rem" }}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Porezni koeficijent (1.0 = 300 KM odbitka)
                </label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={coeff}
                  onChange={(e) => setCoeff(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Minuli rad (% godišnje)
                </label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={minuliRad}
                  onChange={(e) => setMinuliRad(e.target.value)}
                  placeholder="0,4"
                />
                {(() => {
                  const years = worker.startDate
                    ? (() => {
                        const s = new Date(worker.startDate as string);
                        const e = new Date(`${year}-${String(month).padStart(2, "0")}-01`);
                        // Posljednji dan mjeseca:
                        const end = new Date(year, month, 0);
                        let y = end.getFullYear() - s.getFullYear();
                        const md = end.getMonth() - s.getMonth();
                        if (md < 0 || (md === 0 && end.getDate() < s.getDate())) y -= 1;
                        return Math.max(0, y);
                      })()
                    : 0;
                  const baseN = parseNum(gross);
                  const rateN = parseNum(minuliRad);
                  const amt = +(baseN * (rateN / 100) * years).toFixed(2);
                  return (
                    <p className={styles.note} style={{ margin: "0.3rem 0 0" }}>
                      {worker.startDate
                        ? `${years} god. staža × ${rateN.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}% × ${fmtKM(baseN)} = ${fmtKM(amt)} KM`
                        : "Nije postavljen datum prijave radnika"}
                    </p>
                  );
                })()}
              </div>
            </div>
            {minBaseApplied && (
              <div className={styles.warning}>
                {minBaseInfo.workTimeCategory === "FULL" && (
                  <>
                    Bruto je ispod zakonske minimalne osnovice za doprinose
                    ({fmtKM(minBaseInfo.minBase)} KM, Zakon o doprinosima FBiH čl. 7).
                    Obračun se izvršava na unesenu bruto platu — provjeri da li
                    je iznos ispravan.
                  </>
                )}
                {minBaseInfo.workTimeCategory === "PART_OVER_4" && (
                  <>
                    Radnik je na nepunom radnom vremenu ({minBaseInfo.contractedHours}h).
                    Zakon o doprinosima FBiH (čl. 7, izmjene 33/25 od 01.07.2025) NE
                    dozvoljava srazmjerno smanjenje minimalne osnovice — minimum
                    je puna osnovica ({fmtKM(minBaseInfo.minBase)} KM), a bruto je
                    ispod toga. Provjeri iznos.
                  </>
                )}
                {minBaseInfo.workTimeCategory === "PART_UNDER_4" && (
                  <>
                    Nepuno radno vrijeme ({minBaseInfo.contractedHours}h). Srazmjerna
                    minimalna osnovica je {fmtKM(minBaseInfo.minBase)} KM (min. 50% od
                    pune osnovice {fmtKM(minBaseInfo.fullMinBase)} KM), a bruto je
                    ispod toga. Provjeri iznos.
                  </>
                )}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Radni sati</div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "0.5rem",
                  }}
                >
                  <label className={styles.fieldLabel}>Odrađeni sati</label>
                  {sihMinutes > 0 ? (
                    <button
                      type="button"
                      onClick={() => setWorkedHours(minutesToHoursStr(sihMinutes))}
                      title={`Upiši ${minutesToHoursLabel(sihMinutes)} iz šihterice`}
                      style={{
                        background: "transparent",
                        border: 0,
                        padding: 0,
                        font: "inherit",
                        fontSize: "0.78rem",
                        color: "var(--accent, #2563eb)",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Iz šihterice ({minutesToHoursLabel(sihMinutes)})
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--mid, #888)",
                      }}
                    >
                      Šihterica nije popunjena
                    </span>
                  )}
                </div>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={workedHours}
                  onChange={(e) => setWorkedHours(e.target.value)}
                  placeholder={`Standard: ${standardMinutesForMonth(year, month) / 60}h`}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Dani bolovanja (1–42)</label>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={42}
                  value={sickDays}
                  onChange={(e) => setSickDays(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Dani godišnjeg odmora</label>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  max={31}
                  value={vacationDays}
                  onChange={(e) => setVacationDays(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Uvećanja</div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Prekovremeni — sati</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={overtime}
                  onChange={(e) => setOvertime(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Prekovremeni — stopa (%)</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  placeholder="25"
                  value={overtimeRate}
                  onChange={(e) => setOvertimeRate(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Noćni rad — sati</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={night}
                  onChange={(e) => setNight(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Noćni rad — stopa (%)</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  placeholder="25"
                  value={nightRate}
                  onChange={(e) => setNightRate(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nedjelja — sati</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={sunday}
                  onChange={(e) => setSunday(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nedjelja — stopa (%)</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  placeholder="20"
                  value={sundayRate}
                  onChange={(e) => setSundayRate(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Praznici — sati</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={holiday}
                  onChange={(e) => setHoliday(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Praznici — stopa (%)</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  placeholder="50"
                  value={holidayRate}
                  onChange={(e) => setHolidayRate(e.target.value)}
                />
              </div>
            </div>
            {previewBreakdown && previewBreakdown.uvecanja > 0 && (
              <p className={styles.note}>
                Ukupno uvećanja: <strong>{fmtKM(previewBreakdown.uvecanja)} KM</strong> — dodaje se na bruto osnovicu.
              </p>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Neoporezivi dodaci (KM)</div>
            <div className={styles.grid3}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Topli obrok</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={meal}
                  onChange={(e) => setMeal(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Regres</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={vacation}
                  onChange={(e) => setVacation(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Putni trošak</label>
                <input
                  className={styles.input}
                  type="text"
                  inputMode="decimal"
                  value={travel}
                  onChange={(e) => setTravel(e.target.value)}
                />
              </div>
            </div>
          </div>

          {preview && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Preliminarni izračun</div>
              <div className={styles.resultGrid}>
                <span className={styles.label}>Bruto</span>
                <span className={styles.value}>{fmtKM(preview.gross)} KM</span>

                <span className={styles.label}>Doprinosi iz plate (31%)</span>
                <span className={styles.value}>{fmtKM(preview.empTotal)} KM</span>

                <span className={styles.label}>Porez na dohodak (10%)</span>
                <span className={styles.value}>{fmtKM(preview.incomeTax)} KM</span>

                <span className={`${styles.label} ${styles.strong}`}>Neto</span>
                <span className={`${styles.value} ${styles.strong}`}>
                  {fmtKM(preview.net)} KM
                </span>

                <span className={styles.label}>Doprinosi na platu (5%)</span>
                <span className={styles.value}>{fmtKM(preview.erpTotal)} KM</span>

                <span className={styles.label}>Vodna + nesreće (1% × neto)</span>
                <span className={styles.value}>
                  {fmtKM(preview.vodnaNaknada + preview.naknadaNesrece)} KM
                </span>

                <span className={`${styles.label} ${styles.strong}`}>
                  Ukupan trošak poslodavca
                </span>
                <span className={`${styles.value} ${styles.strong}`}>
                  {fmtKM(
                    preview.totalCost +
                      parseNum(meal) +
                      parseNum(vacation) +
                      parseNum(travel),
                  )}{" "}
                  KM
                </span>
              </div>
              <p className={styles.note}>
                Doprinosi se obračunavaju na stvarnu bruto platu. Konačni
                izračun se snima u snapshot pri klikanju "Obračunaj".
              </p>
            </div>
          )}

          {error && <div className={styles.errorMsg}>{error}</div>}

          {calcMutation.isSuccess && !error && (
            <div className={styles.warning} style={{ background: "#d1fae5", borderColor: "#10b981", color: "#065f46" }}>
              Obračun sačuvan. Možeš nastaviti uređivanje ili zatvoriti obračun.
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {existing && !confirmDelete && (
            <button
              type="button"
              className={`${styles.btnDanger} ${styles.left}`}
              onClick={() => setConfirmDelete(true)}
              disabled={deleteMutation.isPending}
            >
              Obriši
            </button>
          )}
          {existing && confirmDelete && (
            <div className={styles.left} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#b91c1c" }}>
                Sigurno obrisati obračun?
              </span>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Brišem…" : "Da, obriši"}
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
              >
                Otkaži
              </button>
            </div>
          )}
          {existing && existing.status !== "ISPLACENO" && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => markPaidMutation.mutate()}
              disabled={markPaidMutation.isPending}
            >
              {markPaidMutation.isPending ? "…" : "Označi kao isplaćeno"}
            </button>
          )}
          <button type="button" className={styles.btnGhost} onClick={handleClose}>
            Zatvori
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setError(null);
              calcMutation.mutate();
            }}
            disabled={calcMutation.isPending || parseNum(gross) <= 0}
          >
            {calcMutation.isPending ? "Obračunavanje…" : "Obračunaj"}
          </button>
        </div>
      </div>
    </div>
  );
}
