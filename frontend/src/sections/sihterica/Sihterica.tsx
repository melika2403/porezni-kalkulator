"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./sihterica.module.css";
import {
  getClientOrganizations,
  getOrganizations,
  getWorkers,
  type Organization,
  updateWorker,
} from "src/api/profile";
import {
  getSihterica,
  getSihtericaMonths,
  getSihtericaWorkerMonths,
  saveSihterica,
  deleteSihterica,
} from "src/api/sihterica";
import RoleGuard from "src/components/RoleGuard/RoleGuard";
import PreviewRegisterGate from "src/components/PreviewRegisterGate/PreviewRegisterGate";
import OrgSelect from "src/components/OrgSelect/OrgSelect";
import { useRole } from "src/hooks/useRole";
import { me, unwrap } from "src/api/auth";
import { fillSihterica, type DayEntry } from "./fillSihterica";
import SaveToast from "src/components/SaveToast/SaveToast";
import { useNotice } from "src/components/Notice/Notice";
import Link from "next/link";

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

const DAY_NAMES_SHORT = ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"];

const EMPTY_ENTRY: DayEntry = {
  startTime: "",
  endTime: "",
  zastoj: "",
  fieldWork: "",
  standby: "",
  absence: "",
  other: "",
};

function emptyMonth(): DayEntry[] {
  return Array.from({ length: 31 }, () => ({ ...EMPTY_ENTRY }));
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

function parseTimeToMins(hhmm: string): number | null {
  if (!hhmm) return null;
  const parts = hhmm.split(":");
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Codes that represent PAID absence — count as standard 8h workday in totals
// Counted by default; user can opt-out per code via auto-popuna checkboxes.
const PAID_ABSENCE_DEFAULT = new Set(["9.1", "9.2", "9.3", "9.4", "9.5"]);
const PAID_ABSENCE_MINS = 8 * 60;

function calcDailyMins(
  entry: DayEntry,
  isWeeklyDayOff: boolean,
  countCodes: Set<string>,
): number {
  // Manually entered times always win — if both Početak and Kraj exist,
  // we compute from them regardless of any absence code.
  const start = parseTimeToMins(entry.startTime);
  const end = parseTimeToMins(entry.endTime);
  if (start !== null && end !== null) {
    const zastojMins = Math.round(
      (parseFloat(entry.zastoj.replace(",", ".")) || 0) * 60,
    );
    return Math.max(0, end - start - zastojMins);
  }
  // No times entered → fall back to absence-code semantics.
  // Paid absence (9.1–9.5) → 8h if enabled in countCodes, else 0h.
  // Sedmični odmor (9.1 on weekly day-off) → always 0h.
  if (entry.absence) {
    const code = entry.absence.trim();
    if (PAID_ABSENCE_DEFAULT.has(code)) {
      if (code === "9.1" && isWeeklyDayOff) return 0;
      return countCodes.has(code) ? PAID_ABSENCE_MINS : 0;
    }
  }
  return 0;
}

function minsToLabel(mins: number): string {
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function calcTotalDaily(
  entry: DayEntry,
  isWeeklyDayOff: boolean,
  countCodes: Set<string>,
): string {
  return minsToLabel(calcDailyMins(entry, isWeeklyDayOff, countCodes));
}

function isEntryEmpty(e: DayEntry): boolean {
  return (
    !e.startTime &&
    !e.endTime &&
    !e.zastoj &&
    !e.fieldWork &&
    !e.standby &&
    !e.absence &&
    !e.other
  );
}

function TimeOrXInput({
  value,
  onChange,
  placeholder,
  showX,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  showX: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!value && !focused && showX) {
    return (
      <span
        className={styles.cellAuto}
        onClick={() => {
          setFocused(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        style={{ cursor: "text", color: "var(--mid)" }}
      >
        x
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      className={styles.cellInput}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      maxLength={5}
    />
  );
}

function HourInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (value && !focused) {
    return (
      <span
        className={styles.cellAuto}
        onClick={() => {
          setFocused(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        style={{ cursor: "text" }}
      >
        {value}h
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      className={styles.cellInput}
      type="text"
      placeholder="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      maxLength={5}
    />
  );
}

type ColKey = keyof DayEntry;

const COL_HEADERS = [
  { key: "rbr", label: "Rbr.", width: 32 },
  { key: "date", label: "Datum", width: 140 },
  { key: "startTime", label: "Početak", width: 64 },
  { key: "endTime", label: "Kraj", width: 64 },
  { key: "zastoj", label: "Zastoj/Prekid/Pauza (h)", width: 100 },
  { key: "totalDaily", label: "Uk. dnevnih sati", width: 110 },
  { key: "fieldWork", label: "Terenski (h)", width: 62 },
  { key: "standby", label: "Pripravnost (h)", width: 64 },
  { key: "absence", label: "Odsustvo (šifra)", width: 80 },
  { key: "other", label: "Ostalo (šifra)", width: 80 },
  { key: "totalHrs", label: "Uk. sati", width: 110 },
] as const;

export default function Sihterica() {
  return (
    <RoleGuard
      roles={["USER", "PRO", "BUSINESS", "ADMIN"]}
      mode="hide"
      fallback={<UpgradeGate />}
    >
      <SihtericaApp />
    </RoleGuard>
  );
}

function NapomenaSection() {
  return (
    <section className={styles.napomenaSection}>
      <h2 className={styles.napomenaTitle}>
        Kako popuniti šihtericu — vodič i šifre odsustva (FBiH)
      </h2>

      <div className={styles.napomenaBlock}>
        <p className={styles.napomenaIntro}>
          <strong>Kako se računaju ukupni sati:</strong>
        </p>
        <ul className={styles.napomenaList}>
          <li>
            <strong>Radni dan</strong> — ukupni sati = (Kraj − Početak) − Pauza.
          </li>
          <li>
            <strong>Ručno upisana vremena uvijek pobjeđuju.</strong> Ako upišete
            Početak i Kraj, dan se računa po vremenima — bez obzira da li je
            upisan i kod odsustva.
          </li>
          <li>
            <strong>Plaćena odsustva</strong> (kodovi 9.1 godišnji odmor, 9.2
            praznik, 9.3 bolovanje, 9.4 porodiljsko, 9.5 plaćeno odsustvo){" "}
            <strong>bez upisanih vremena</strong> računaju se kao{" "}
            <strong>puni radni dan</strong> u ukupnom fondu.
          </li>
          <li>
            Putem <strong>checkbox-ova</strong> &ldquo;Računaj odsustvo u ukupne
            sate za: Godišnji (9.1) / Praznik (9.2) / Bolovanje (9.3)&rdquo; u
            panelu Auto-popuna birate da li se ti dani računaju kao{" "}
            <strong>puni radni dan</strong> ili se <strong>ne računaju</strong>{" "}
            u ukupnom fondu sati. Postavka se pamti per korisnik. Kodovi 9.4 i
            9.5 se uvijek računaju kao puni radni dan.
          </li>
          <li>
            <strong>Sedmični odmor</strong> (kod 9.1 na danima koji su označeni
            kao slobodni u sedmici, npr. subota/nedjelja) → uvijek 0 sati, bez
            obzira na checkbox.
          </li>
          <li>
            <strong>Neplaćena odsustva</strong> (9.6 neplaćeno, 9.9 štrajk,
            9.10 lockout, itd.) → 0 sati, ne ulazi u zbir.
          </li>
          <li>
            <strong>Terenski rad</strong> i <strong>pripravnost</strong>{" "}
            evidentiraju se zasebno i ne dodaju se na ukupni fond radnih sati.
          </li>
        </ul>
      </div>

      <div className={styles.napomenaBlock}>
        <p className={styles.napomenaIntro}>
          U kolonu 9) <em>Vrijeme neprisustva na poslu</em>, potrebno je
          evidentirati vrijeme neprisustva i oznaku (broj) vrste neprisustva:
        </p>
        <ol className={styles.napomenaList}>
          <li>vrijeme korištenja odmora (sedmičnog i godišnjeg),</li>
          <li>
            vrijeme za dane u koje se ne radi i praznike utvrđene posebnim
            propisom,
          </li>
          <li>
            vrijeme spriječenosti za rad zbog privremene nesposobnosti za rad,
          </li>
          <li>
            vrijeme porođajnog odsustva, roditeljskih dopusta, mirovanja radnog
            odnosa ili korištenja drugih prava u skladu s posebnim propisom,
          </li>
          <li>vrijeme plaćenog odsustva,</li>
          <li>vrijeme neplaćenog odsustva,</li>
          <li>
            vrijeme neprisutnosti u toku dnevnog rasporeda radnog vremena po
            zahtjevu radnika,
          </li>
          <li>
            vrijeme neprisutnosti u toku dnevnog rasporeda radnog vremena u
            kojima radnik svojom krivnjom ne obavlja ugovorene poslove,
          </li>
          <li>vrijeme provedeno u štrajku,</li>
          <li>vrijeme isključenja s rada (lockout).</li>
        </ol>
      </div>

      <div className={styles.napomenaBlock}>
        <p className={styles.napomenaIntro}>
          U kolonu 10) <em>Ostali podaci o radnom vremenu</em>, potrebno je
          evidentirati vrijeme i oznaku (broj) za sljedeće podatke:
        </p>
        <ol className={styles.napomenaList}>
          <li>noćni rad,</li>
          <li>prekovremeni rad,</li>
          <li>smjenski rad,</li>
          <li>dvokratni rad,</li>
          <li>rad u dane praznika,</li>
          <li>neradnih dana utvrđene posebnim propisom,</li>
          <li>drugo.</li>
        </ol>
      </div>
    </section>
  );
}

function UpgradeGate() {
  return (
    <PreviewRegisterGate
      pageLabel="Evidencija radnog vremena"
      pageTitle={<>Šihterica — <em>evidencija radnog vremena</em></>}
      pageSubtitle="Mjesečna evidencija radnog vremena za radnike u FBiH. Auto-popuna sa profila, izvoz u PDF i CSV."
      featureName="šihterice"
      previewDesc="unositi radnike, popunjavati evidenciju i vidjeti zbirne sate (redovni, prekovremeni, slobodni dani)"
      proUnlocks="Preuzimanje PDF i CSV obrasca"
    />
  );
}

function SihtericaApp() {
  const queryClient = useQueryClient();
  const { notify } = useNotice();
  const now = new Date();
  const { hasRole } = useRole();
  const canExport = hasRole("PRO", "BUSINESS", "ADMIN");
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });
  const trialAvailable =
    meQuery.data?.role === "USER" && !meQuery.data?.trialUsedAt;
  const userId = meQuery.data?.id ?? null;

  // Whether each paid-absence code counts as 8h in totals.
  // Persisted per user in localStorage; defaults to "count" for backwards compat.
  const [countGodisnji, setCountGodisnji] = useState(true);
  const [countPraznik, setCountPraznik] = useState(true);
  const [countBolovanje, setCountBolovanje] = useState(true);

  const restoredCountForUser = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    if (restoredCountForUser.current === userId) return;
    restoredCountForUser.current = userId;
    const read = (code: string) => {
      const v = window.localStorage.getItem(
        `sihterica.${userId}.count.${code}`,
      );
      return v === null ? true : v === "1";
    };
    setCountGodisnji(read("9.1"));
    setCountPraznik(read("9.2"));
    setCountBolovanje(read("9.3"));
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    window.localStorage.setItem(
      `sihterica.${userId}.count.9.1`,
      countGodisnji ? "1" : "0",
    );
  }, [countGodisnji, userId]);
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    window.localStorage.setItem(
      `sihterica.${userId}.count.9.2`,
      countPraznik ? "1" : "0",
    );
  }, [countPraznik, userId]);
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    window.localStorage.setItem(
      `sihterica.${userId}.count.9.3`,
      countBolovanje ? "1" : "0",
    );
  }, [countBolovanje, userId]);

  const countCodes = useMemo(() => {
    const set = new Set(PAID_ABSENCE_DEFAULT);
    if (!countGodisnji) set.delete("9.1");
    if (!countPraznik) set.delete("9.2");
    if (!countBolovanje) set.delete("9.3");
    return set;
  }, [countGodisnji, countPraznik, countBolovanje]);

  const [orgId, setOrgId] = useState<number | null>(null);
  const [workerId, setWorkerId] = useState<number | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<DayEntry[]>(() => emptyMonth());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [showNewYear, setShowNewYear] = useState(false);
  const [newYearVal, setNewYearVal] = useState("");
  const newYearRef = useRef<HTMLInputElement>(null);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { hasRole: hasRoleForOrgs } = useRole();
  const canSeeClients = hasRoleForOrgs("PRO", "BUSINESS", "ADMIN");

  const ownOrgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await getOrganizations();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
  const clientOrgsQuery = useQuery({
    queryKey: ["clientOrganizations"],
    queryFn: async () => {
      const res = await getClientOrganizations();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: canSeeClients,
  });

  // Spojene organizacije: vlastite + klijentske (knjigovođa upravlja tuđim
  // obrtima). Dedup po id-u.
  const orgsQuery = useMemo(() => {
    const map = new Map<number, Organization>();
    for (const o of ownOrgsQuery.data ?? []) map.set(o.id, o);
    for (const o of clientOrgsQuery.data ?? []) if (!map.has(o.id)) map.set(o.id, o);
    return {
      data: Array.from(map.values()),
      isLoading: ownOrgsQuery.isLoading || clientOrgsQuery.isLoading,
    };
  }, [
    ownOrgsQuery.data,
    ownOrgsQuery.isLoading,
    clientOrgsQuery.data,
    clientOrgsQuery.isLoading,
  ]);

  // Auto-select organization if user has only one
  useEffect(() => {
    if (orgId) return;
    const orgs = orgsQuery.data;
    if (orgs && orgs.length === 1) {
      setOrgId(orgs[0].id);
    }
  }, [orgsQuery.data, orgId]);

  const workersQuery = useQuery({
    queryKey: ["workers", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await getWorkers(orgId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!orgId,
  });

  // Auto-select first worker when workers list loads
  useEffect(() => {
    if (!orgId || workerId) return;
    const workers = workersQuery.data;
    if (workers && workers.length > 0) {
      setWorkerId(workers[0].id);
    }
  }, [workersQuery.data, orgId, workerId]);

  // map: workerId -> [{year, month}] — used to show dot indicator in sidebar
  const workerMonthsQuery = useQuery({
    queryKey: ["sihtericaWorkerMonths", orgId],
    queryFn: async () => {
      if (!orgId) return {};
      const res = await getSihtericaWorkerMonths(orgId);
      if (!res.ok) return {};
      return res.data ?? {};
    },
    enabled: !!orgId,
  });

  // months saved for currently selected worker
  const monthsQuery = useQuery({
    queryKey: ["sihtericaMonths", workerId],
    queryFn: async () => {
      if (!workerId) return [];
      const res = await getSihtericaMonths(workerId);
      if (!res.ok) return [];
      return res.data ?? [];
    },
    enabled: !!workerId,
  });

  // current sihterica data (year/month/worker)
  const dataQuery = useQuery({
    queryKey: ["sihtericaData", workerId, year, month],
    queryFn: async () => {
      if (!workerId) return null;
      const res = await getSihterica(workerId, year, month);
      if (!res.ok) return null;
      return res.data;
    },
    enabled: !!workerId,
  });

  // when data arrives (or worker/year/month changes), populate entries
  const lastLoadedKey = useRef<string>("");
  useEffect(() => {
    const key = `${workerId}-${year}-${month}`;
    if (lastLoadedKey.current === key && dataQuery.data === undefined) return;
    if (dataQuery.isLoading) return;
    lastLoadedKey.current = key;
    if (dataQuery.data?.days) {
      const loaded = emptyMonth();
      dataQuery.data.days.forEach((d, i) => {
        if (d) loaded[i] = { ...EMPTY_ENTRY, ...d };
      });
      setEntries(loaded);
    } else {
      setEntries(emptyMonth());
    }
    setSaveStatus("idle");
  }, [workerId, year, month, dataQuery.data, dataQuery.isLoading]);

  // when worker is first selected, jump to most recent saved month (or stay on current)
  const lastInitWorker = useRef<number | null>(null);
  useEffect(() => {
    if (!workerId || workerId === lastInitWorker.current) return;
    if (monthsQuery.isLoading) return;
    lastInitWorker.current = workerId;
    const months = monthsQuery.data ?? [];
    if (months.length > 0) {
      setYear(months[0].year);
      setMonth(months[0].month);
    } else {
      setYear(now.getFullYear());
      setMonth(now.getMonth() + 1);
    }
  }, [workerId, monthsQuery.data, monthsQuery.isLoading, now]);

  const selectedWorker =
    workersQuery.data?.find((w) => w.id === workerId) ?? null;
  const workerName = selectedWorker
    ? `${selectedWorker.firstName} ${selectedWorker.lastName}`
    : "";

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const savedMonths = monthsQuery.data ?? [];
  const currentMonthSaved = savedMonths.some(
    (m) => m.year === year && m.month === month,
  );

  // ─── Auto-fill state ───────────────────────────────────────────────────────
  const [autoStart, setAutoStart] = useState("");
  const [autoEnd, setAutoEnd] = useState("");
  const [autoPause, setAutoPause] = useState("");
  const [autoDaysOff, setAutoDaysOff] = useState<Set<number>>(new Set([0, 6]));
  const [autoOverwrite, setAutoOverwrite] = useState(true);
  const [autoHolidays, setAutoHolidays] = useState<string>(""); // comma-separated days like "1,5,15"
  const [autoVacationFrom, setAutoVacationFrom] = useState<string>("");
  const [autoVacationTo, setAutoVacationTo] = useState<string>("");
  const [autoSickFrom, setAutoSickFrom] = useState<string>("");
  const [autoSickTo, setAutoSickTo] = useState<string>("");

  // load defaults from worker
  const lastLoadedWorkerPrefs = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedWorker || lastLoadedWorkerPrefs.current === selectedWorker.id)
      return;
    lastLoadedWorkerPrefs.current = selectedWorker.id;
    setAutoStart(selectedWorker.defaultStartTime ?? "08:00");
    setAutoEnd(selectedWorker.defaultEndTime ?? "16:00");
    setAutoPause(selectedWorker.defaultPause ?? "");
    if (selectedWorker.defaultDaysOff) {
      const nums = selectedWorker.defaultDaysOff
        .split(",")
        .map((n) => parseInt(n.trim()))
        .filter((n) => !isNaN(n));
      setAutoDaysOff(new Set(nums));
    } else {
      setAutoDaysOff(new Set([0, 6]));
    }
    setAutoHolidays("");
    setAutoVacationFrom("");
    setAutoVacationTo("");
    setAutoSickFrom("");
    setAutoSickTo("");
  }, [selectedWorker]);

  // Reset month-specific auto-popuna fields whenever month/year changes
  useEffect(() => {
    setAutoHolidays("");
    setAutoVacationFrom("");
    setAutoVacationTo("");
    setAutoSickFrom("");
    setAutoSickTo("");
  }, [year, month]);

  const toggleDayOff = (d: number) => {
    setAutoDaysOff((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const handleAutoFill = useCallback(async () => {
    if (!workerId) return;
    const holidayDays = new Set(
      autoHolidays
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 31),
    );

    // Build day sets from day-of-month ranges
    const rangeToDays = (fromStr: string, toStr: string): Set<number> => {
      const set = new Set<number>();
      const from = parseInt(fromStr);
      const to = parseInt(toStr);
      if (isNaN(from) || isNaN(to)) return set;
      const lo = Math.max(1, Math.min(from, to));
      const hi = Math.min(daysInMonth, Math.max(from, to));
      for (let d = lo; d <= hi; d++) set.add(d);
      return set;
    };
    const vacationDays = rangeToDays(autoVacationFrom, autoVacationTo);
    const sickDays = rangeToDays(autoSickFrom, autoSickTo);

    const next = entries.map((e) => ({ ...e }));
    for (let i = 0; i < daysInMonth; i++) {
      const dayNum = i + 1;
      const dow = getDayOfWeek(year, month, dayNum);
      const isSick = sickDays.has(dayNum);
      const isVacation = vacationDays.has(dayNum);
      const isHoliday = holidayDays.has(dayNum);
      const isDayOff = autoDaysOff.has(dow);
      const e = next[i];
      const hasAny =
        e.startTime ||
        e.endTime ||
        e.zastoj ||
        e.fieldWork ||
        e.standby ||
        e.absence ||
        e.other;
      if (!autoOverwrite && hasAny) continue;
      if (autoOverwrite) {
        next[i] = { ...EMPTY_ENTRY };
      }
      if (isSick) {
        next[i].absence = "9.3";
      } else if (isVacation) {
        next[i].absence = "9.1";
      } else if (isHoliday) {
        next[i].absence = "9.2";
      } else if (isDayOff) {
        next[i].absence = "9.1";
      } else {
        next[i].startTime = autoStart;
        next[i].endTime = autoEnd;
        if (autoPause) next[i].zastoj = autoPause;
      }
    }
    setEntries(next);

    // persist worker preferences
    if (selectedWorker?.organizationId) {
      void updateWorker(selectedWorker.organizationId, workerId, {
        defaultStartTime: autoStart || null,
        defaultEndTime: autoEnd || null,
        defaultPause: autoPause || null,
        defaultDaysOff: [...autoDaysOff].sort().join(","),
      }).then(() => {
        queryClient.invalidateQueries({
          queryKey: ["workers", selectedWorker.organizationId],
        });
      });
    }
  }, [
    workerId,
    entries,
    daysInMonth,
    year,
    month,
    autoStart,
    autoEnd,
    autoPause,
    autoDaysOff,
    autoOverwrite,
    autoHolidays,
    autoVacationFrom,
    autoVacationTo,
    autoSickFrom,
    autoSickTo,
    selectedWorker,
    queryClient,
  ]);

  const updateEntry = useCallback(
    (dayIdx: number, field: ColKey, value: string) => {
      setEntries((prev) => {
        const next = [...prev];
        next[dayIdx] = { ...next[dayIdx], [field]: value };
        return next;
      });
      setSaveStatus("idle");
    },
    [],
  );

  // ─── Auto-save (debounced) ─────────────────────────────────────────────────
  const isDirty = useRef(false);
  useEffect(() => {
    isDirty.current = false;
  }, [workerId, year, month]);

  useEffect(() => {
    isDirty.current = true;
  }, [entries]);

  useEffect(() => {
    if (!workerId) return;
    if (!isDirty.current) return;
    const handle = setTimeout(async () => {
      const allEmpty = entries.every(isEntryEmpty);
      if (allEmpty && !currentMonthSaved) return;
      setSaveStatus("saving");
      const days = entries
        .slice(0, daysInMonth)
        .map((e) => (isEntryEmpty(e) ? null : e));
      const res = await saveSihterica({ workerId, year, month, days });
      if (res.ok) {
        setSaveStatus("saved");
        isDirty.current = false;
        queryClient.invalidateQueries({
          queryKey: ["sihtericaMonths", workerId],
        });
        queryClient.invalidateQueries({
          queryKey: ["sihtericaWorkerMonths", orgId],
        });
      } else {
        setSaveStatus("error");
      }
    }, 1000);
    return () => clearTimeout(handle);
  }, [
    entries,
    workerId,
    year,
    month,
    daysInMonth,
    currentMonthSaved,
    orgId,
    queryClient,
  ]);

  // ─── PDF export ────────────────────────────────────────────────────────────
  const selectedOrg = orgsQuery.data?.find((o) => o.id === orgId) ?? null;

  const handleExport = useCallback(async () => {
    const pdfBytes = await fillSihterica({
      workerName,
      month,
      year,
      days: entries
        .slice(0, daysInMonth)
        .map((e) => (isEntryEmpty(e) ? null : e)),
      orgName: selectedOrg?.name ?? "",
      orgAddress: selectedOrg?.address ?? "",
      orgCity: selectedOrg?.city ?? "",
      orgTaxNumber: selectedOrg?.taxNumber ?? "",
      weeklyDaysOff: [...autoDaysOff],
      countAbsenceCodes: [...countCodes],
    });

    const blob = new Blob([new Uint8Array(pdfBytes)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const wName = workerName ? `_${workerName.replace(/\s+/g, "_")}` : "";
    a.download = `Sihterica${wName}_${String(month).padStart(2, "0")}_${year}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [workerName, month, year, entries, daysInMonth, selectedOrg, autoDaysOff, countCodes]);

  // ─── Bulk export — all workers in selected org for current month ───────────
  const [bulkExporting, setBulkExporting] = useState(false);
  const [bulkExportingPdf, setBulkExportingPdf] = useState(false);

  // Builder: generiše PDF bytes po radniku za odabrani mjesec. Dijeli ga
  // PDF i ZIP varijante bulk exporta.
  const buildBulkSihtericePdfs = useCallback(async (): Promise<
    Array<{ safeName: string; bytes: Uint8Array }>
  > => {
    if (!orgId || !workersQuery.data || workersQuery.data.length === 0) return [];
    const out: Array<{ safeName: string; bytes: Uint8Array }> = [];
    for (const w of workersQuery.data) {
      const res = await getSihterica(w.id, year, month);
      const data = res.ok ? res.data : null;
      const dim = getDaysInMonth(year, month);
      const days: (DayEntry | null)[] = Array.from({ length: dim }, (_, i) => {
        const d = data?.days?.[i];
        if (!d) return null;
        if (isEntryEmpty(d)) return null;
        return { ...EMPTY_ENTRY, ...d };
      });
      const hasAny = days.some((d) => d !== null);
      if (!hasAny) continue;

      const workerDaysOff = w.defaultDaysOff
        ? w.defaultDaysOff
            .split(",")
            .map((s) => parseInt(s.trim()))
            .filter((n) => !isNaN(n))
        : [0, 6];
      const pdfBytes = await fillSihterica({
        workerName: `${w.firstName} ${w.lastName}`.trim(),
        month,
        year,
        days,
        orgName: selectedOrg?.name ?? "",
        orgAddress: selectedOrg?.address ?? "",
        orgCity: selectedOrg?.city ?? "",
        orgTaxNumber: selectedOrg?.taxNumber ?? "",
        weeklyDaysOff: workerDaysOff,
        countAbsenceCodes: [...countCodes],
      });
      const safeName = `${w.firstName}_${w.lastName}`.replace(/\s+/g, "_");
      out.push({ safeName, bytes: pdfBytes });
    }
    return out;
  }, [orgId, workersQuery.data, year, month, selectedOrg, countCodes]);

  const handleBulkExport = useCallback(async () => {
    if (!orgId || !workersQuery.data || workersQuery.data.length === 0) return;
    setBulkExporting(true);
    try {
      const items = await buildBulkSihtericePdfs();
      if (items.length === 0) {
        notify("Nijedan radnik nema sačuvane podatke za odabrani mjesec.", "warning");
        return;
      }
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const { safeName, bytes } of items) {
        zip.file(
          `Sihterica_${safeName}_${String(month).padStart(2, "0")}_${year}.pdf`,
          bytes,
        );
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const orgSafe = (selectedOrg?.name ?? "Organizacija").replace(/\s+/g, "_");
      a.download = `Sihterice_${orgSafe}_${String(month).padStart(2, "0")}_${year}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBulkExporting(false);
    }
  }, [orgId, workersQuery.data, year, month, selectedOrg, notify, buildBulkSihtericePdfs]);

  const handleBulkExportPdf = useCallback(async () => {
    if (!orgId || !workersQuery.data || workersQuery.data.length === 0) return;
    setBulkExportingPdf(true);
    try {
      const items = await buildBulkSihtericePdfs();
      if (items.length === 0) {
        notify("Nijedan radnik nema sačuvane podatke za odabrani mjesec.", "warning");
        return;
      }
      // Merge svih PDF-ova u jedan dokument (stranica po radniku).
      const { PDFDocument } = await import("pdf-lib");
      const finalDoc = await PDFDocument.create();
      for (const { bytes } of items) {
        const src = await PDFDocument.load(bytes);
        const pages = await finalDoc.copyPages(src, src.getPageIndices());
        for (const p of pages) finalDoc.addPage(p);
      }
      const finalBytes = await finalDoc.save();
      const blob = new Blob([new Uint8Array(finalBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const orgSafe = (selectedOrg?.name ?? "Organizacija").replace(/\s+/g, "_");
      a.download = `Sihterice_${orgSafe}_${String(month).padStart(2, "0")}_${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBulkExportingPdf(false);
    }
  }, [orgId, workersQuery.data, year, month, selectedOrg, notify, buildBulkSihtericePdfs]);

  // ─── Delete current month ──────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!workerId) return;
    if (savedMonths.length <= 1) return;
    const res = await deleteSihterica(workerId, year, month);
    if (!res.ok) return;
    setConfirmDelete(false);
    queryClient.invalidateQueries({ queryKey: ["sihtericaMonths", workerId] });
    queryClient.invalidateQueries({
      queryKey: ["sihtericaWorkerMonths", orgId],
    });
    // jump to next remaining month
    const remaining = savedMonths.filter(
      (m) => !(m.year === year && m.month === month),
    );
    if (remaining.length > 0) {
      setYear(remaining[0].year);
      setMonth(remaining[0].month);
    } else {
      setYear(now.getFullYear());
      setMonth(now.getMonth() + 1);
    }
  }, [workerId, year, month, savedMonths, queryClient, orgId, now]);

  // ─── Year/month picker ─────────────────────────────────────────────────────
  // Years added via "Nova godina" that don't yet have any months — kept visible until explicitly deleted
  const [localYears, setLocalYears] = useState<Set<number>>(new Set());
  const [confirmDeleteYear, setConfirmDeleteYear] = useState<number | null>(null);

  // Reset local years when worker changes
  useEffect(() => {
    setLocalYears(new Set());
    setConfirmDeleteYear(null);
  }, [workerId]);

  const allYears = useMemo(() => {
    const set = new Set<number>();
    savedMonths.forEach((m) => set.add(m.year));
    localYears.forEach((y) => set.add(y));
    set.add(year);
    set.add(now.getFullYear());
    return [...set].sort((a, b) => a - b);
  }, [savedMonths, localYears, year, now]);

  const handleDeleteYear = useCallback(async (yr: number) => {
    if (!workerId) return;
    const monthsForYear = savedMonths.filter((m) => m.year === yr);
    // Delete each saved month for this year
    for (const m of monthsForYear) {
      await deleteSihterica(workerId, m.year, m.month);
    }
    setLocalYears((prev) => {
      const next = new Set(prev);
      next.delete(yr);
      return next;
    });
    setConfirmDeleteYear(null);
    queryClient.invalidateQueries({ queryKey: ["sihtericaMonths", workerId] });
    queryClient.invalidateQueries({ queryKey: ["sihtericaWorkerMonths", orgId] });
    // If we deleted the active year, switch to nearest remaining
    if (year === yr) {
      const remaining = [...new Set(savedMonths.filter((m) => m.year !== yr).map((m) => m.year))];
      const nextYear = remaining.length > 0 ? Math.max(...remaining) : now.getFullYear();
      setYear(nextYear);
      setMonth(1);
    }
  }, [workerId, savedMonths, queryClient, orgId, year, now]);

  const monthsInYear = useMemo(() => {
    return savedMonths.filter((m) => m.year === year).map((m) => m.month);
  }, [savedMonths, year]);

  // ─── Sidebar ───────────────────────────────────────────────────────────────
  const workerMonthsMap = workerMonthsQuery.data ?? {};

  const sidebar = (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>Organizacija</div>
      <div className={styles.sidebarOrgWrap}>
        <OrgSelect
          className={styles.sidebarOrgSelect}
          value={orgId}
          onChange={(v) => {
            setOrgId(v);
            setWorkerId(null);
            lastInitWorker.current = null;
          }}
          ownOrgs={ownOrgsQuery.data ?? []}
          clientOrgs={clientOrgsQuery.data ?? []}
        />
      </div>

      {!orgsQuery.isLoading && (orgsQuery.data?.length ?? 0) === 0 && (
        <div className={styles.sidebarHint}>
          <p className={styles.sidebarHintText}>
            Nemate dodanu nijednu djelatnost. Dodajte svoju djelatnost na
            profilu da biste počeli sa šihtericom.
          </p>
          <Link href="/profil" className={styles.sidebarHintLink}>
            Dodaj djelatnost →
          </Link>
        </div>
      )}

      <div className={styles.sidebarHeader}>Radnici</div>
      {!orgId && (
        <div className={styles.sidebarEmpty}>
          {(orgsQuery.data?.length ?? 0) === 0
            ? "Prvo dodajte djelatnost."
            : "Odaberite organizaciju."}
        </div>
      )}
      {orgId && workersQuery.isLoading && (
        <div className={styles.sidebarEmpty}>Učitavam…</div>
      )}
      {orgId &&
        !workersQuery.isLoading &&
        (workersQuery.data?.length ?? 0) === 0 && (
          <div className={styles.sidebarEmpty}>
            Ova organizacija nema radnika.
          </div>
        )}
      {orgId && (workersQuery.data?.length ?? 0) > 0 && (
        <div className={styles.sidebarList}>
          {workersQuery.data!.map((w) => {
            const wMonths = workerMonthsMap[String(w.id)] ?? [];
            const hasData = wMonths.length > 0;
            const isActive = workerId === w.id;
            const label = `${w.firstName} ${w.lastName}`.trim() || `#${w.id}`;
            return (
              <div key={w.id} className={styles.sidebarItemWrap}>
                <button
                  className={`${styles.sidebarItem}${isActive ? ` ${styles.sidebarItemActive}` : ""}`}
                  onClick={() => {
                    if (workerId !== w.id) {
                      setWorkerId(w.id);
                      lastInitWorker.current = null;
                    }
                  }}
                >
                  <span
                    className={
                      hasData ? styles.sidebarDot : styles.sidebarDotEmpty
                    }
                  />
                  <span className={styles.sidebarName}>{label}</span>
                  {hasData && (
                    <span className={styles.sidebarCount}>
                      {wMonths.length}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {orgId && (
        <div className={styles.sidebarHint}>
          <p className={styles.sidebarHintText}>
            Radnike dodajte i uređujte na stranici svoje djelatnosti.
          </p>
          <Link
            href={`/organizacija/${orgId}`}
            className={styles.sidebarHintLink}
          >
            Otvori djelatnost →
          </Link>
        </div>
      )}
    </aside>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.pageOuter}>
      <SaveToast status={saveStatus} />
      <div className={styles.header}>
        <div className={styles.label}>Evidencija radnog vremena</div>
        <h1 className={styles.h1}>
          Šihterica online — <em>evidencija radnog vremena</em> (FBiH)
        </h1>
        <p className={styles.subtitle}>
          Kako popuniti šihtericu? Vodite mjesečnu evidenciju radnog vremena
          radnika prema propisima FBiH — popunite šihtericu online i preuzmite
          popunjeni PDF obrazac za sve radnike.
        </p>
      </div>

      <div className={styles.pageLayout}>
        {sidebar}

        <div className={styles.page}>
          {!workerId ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👤</div>
              <p className={styles.emptyText}>
                {orgId
                  ? "Odaberite radnika iz lijeve liste."
                  : "Odaberite organizaciju i radnika za evidenciju."}
              </p>
            </div>
          ) : (
            <>
              {/* Year/month bar */}
              <div className={styles.periodBar}>
                <div className={styles.yearChips}>
                  {allYears.map((y) => (
                    <button
                      key={y}
                      className={`${styles.yearChip}${y === year ? ` ${styles.yearChipActive}` : ""}`}
                      onClick={() => {
                        setYear(y);
                        const ms = savedMonths.filter((m) => m.year === y);
                        if (
                          ms.length > 0 &&
                          !ms.some((m) => m.month === month)
                        ) {
                          setMonth(ms[0].month);
                        }
                      }}
                    >
                      {y}
                    </button>
                  ))}
                  {showNewYear ? (
                    <input
                      ref={newYearRef}
                      autoFocus
                      className={styles.yearInput}
                      value={newYearVal}
                      placeholder="GGGG"
                      maxLength={4}
                      inputMode="numeric"
                      onChange={(e) =>
                        setNewYearVal(e.target.value.replace(/\D/g, ""))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newYearVal.length === 4) {
                          setYear(parseInt(newYearVal));
                          setMonth(1);
                          setShowNewYear(false);
                          setNewYearVal("");
                        }
                        if (e.key === "Escape") {
                          setShowNewYear(false);
                          setNewYearVal("");
                        }
                      }}
                      onBlur={() => {
                        if (newYearVal.length === 4) {
                          setYear(parseInt(newYearVal));
                          setMonth(1);
                        }
                        setShowNewYear(false);
                        setNewYearVal("");
                      }}
                    />
                  ) : (
                    <button
                      className={`${styles.yearChip} ${styles.yearChipNew}`}
                      onClick={() => {
                        const nextYear = (allYears.length > 0 ? Math.max(...allYears) : new Date().getFullYear()) + 1;
                        setLocalYears((prev) => new Set(prev).add(nextYear));
                        setYear(nextYear);
                        setMonth(1);
                      }}
                      title="Otvori narednu godinu"
                    >
                      + Nova godina
                    </button>
                  )}

                  {confirmDeleteYear !== null ? (
                    <span className={styles.yearDeleteConfirm}>
                      Obrisati cijelu {confirmDeleteYear}. godinu?
                      <button
                        type="button"
                        className={styles.yearDeleteConfirmYes}
                        onClick={() => handleDeleteYear(confirmDeleteYear)}
                      >
                        Da, obriši
                      </button>
                      <button
                        type="button"
                        className={styles.yearDeleteConfirmNo}
                        onClick={() => setConfirmDeleteYear(null)}
                      >
                        Odustani
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.yearDeleteRight}
                      onClick={() => setConfirmDeleteYear(year)}
                      title={`Obriši godinu ${year}`}
                    >
                      🗑 Obriši godinu
                    </button>
                  )}
                </div>

                <div className={styles.monthChips}>
                  {MONTHS.map((m, i) => {
                    const mNum = i + 1;
                    const hasData = monthsInYear.includes(mNum);
                    const isActive = mNum === month;
                    return (
                      <button
                        key={mNum}
                        className={`${styles.monthChip}${isActive ? ` ${styles.monthChipActive}` : ""}${hasData ? ` ${styles.monthChipHasData}` : ""}`}
                        onClick={() => setMonth(mNum)}
                        title={hasData ? "Sačuvano" : "Prazno"}
                      >
                        {m.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Worker title */}
              <div className={styles.workerHeader}>
                <h2 className={styles.workerName}>
                  {workerName}
                  <span className={styles.workerPeriod}>
                    {" — "}
                    {MONTHS[month - 1]} {year}
                  </span>
                </h2>
                {currentMonthSaved &&
                  savedMonths.length > 1 &&
                  !confirmDelete && (
                    <button
                      className={styles.deleteMonthBtn}
                      onClick={() => setConfirmDelete(true)}
                    >
                      🗑 Obriši mjesec
                    </button>
                  )}
                {confirmDelete && (
                  <div className={styles.deleteInline}>
                    <span>Sigurni ste?</span>
                    <button
                      className={styles.deleteInlineConfirm}
                      onClick={handleDelete}
                    >
                      Da, obriši
                    </button>
                    <button
                      className={styles.deleteInlineCancel}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Odustani
                    </button>
                  </div>
                )}
              </div>

              {/* Auto-fill panel */}
              <div className={styles.autoFillPanel}>
                <div className={styles.autoFillHeader}>
                  <span className={styles.autoFillTitle}>
                    Auto-popuna mjeseca
                  </span>
                </div>
                <div className={styles.autoFillRow}>
                  <label className={styles.autoFillField}>
                    <span className={styles.autoFillLabel}>Početak</span>
                    <input
                      type="text"
                      className={styles.autoFillInput}
                      value={autoStart}
                      onChange={(e) => setAutoStart(e.target.value)}
                      placeholder="08:00"
                      maxLength={5}
                    />
                  </label>
                  <label className={styles.autoFillField}>
                    <span className={styles.autoFillLabel}>Kraj</span>
                    <input
                      type="text"
                      className={styles.autoFillInput}
                      value={autoEnd}
                      onChange={(e) => setAutoEnd(e.target.value)}
                      placeholder="16:00"
                      maxLength={5}
                    />
                  </label>
                  <label className={styles.autoFillField}>
                    <span className={styles.autoFillLabel}>Pauza (h)</span>
                    <input
                      type="text"
                      className={styles.autoFillInput}
                      value={autoPause}
                      onChange={(e) => setAutoPause(e.target.value)}
                      placeholder="1"
                      maxLength={5}
                    />
                  </label>
                  <div className={styles.autoFillField}>
                    <span className={styles.autoFillLabel}>
                      Slobodni dani (9.1)
                    </span>
                    <div className={styles.autoFillDays}>
                      {["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"].map(
                        (label, idx) => {
                          const dow = idx === 6 ? 0 : idx + 1; // map Pon..Ned to Date.getDay()
                          const checked = autoDaysOff.has(dow);
                          return (
                            <button
                              key={label}
                              type="button"
                              className={`${styles.autoFillDayChip}${checked ? ` ${styles.autoFillDayChipActive}` : ""}`}
                              onClick={() => toggleDayOff(dow)}
                            >
                              {label}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                  <label className={styles.autoFillField} style={{ flex: 1 }}>
                    <span className={styles.autoFillLabel}>
                      Praznici u mjesecu (9.2) — dani
                    </span>
                    <input
                      type="text"
                      className={styles.autoFillInput}
                      value={autoHolidays}
                      onChange={(e) => setAutoHolidays(e.target.value)}
                      placeholder="npr. 1, 2, 25"
                    />
                  </label>
                </div>

                <div className={styles.autoFillCheckboxRow}>
                  <label className={styles.autoFillCheckbox}>
                    <input
                      type="checkbox"
                      checked={autoOverwrite}
                      onChange={(e) => setAutoOverwrite(e.target.checked)}
                    />
                    Pregazi već upisana polja
                  </label>
                  <span className={styles.autoFillCountLabel}>
                    Računaj odsustvo u ukupne sate za:
                  </span>
                  <label className={styles.autoFillCheckbox}>
                    <input
                      type="checkbox"
                      checked={countGodisnji}
                      onChange={(e) => setCountGodisnji(e.target.checked)}
                    />
                    Godišnji (9.1)
                  </label>
                  <label className={styles.autoFillCheckbox}>
                    <input
                      type="checkbox"
                      checked={countPraznik}
                      onChange={(e) => setCountPraznik(e.target.checked)}
                    />
                    Praznik (9.2)
                  </label>
                  <label className={styles.autoFillCheckbox}>
                    <input
                      type="checkbox"
                      checked={countBolovanje}
                      onChange={(e) => setCountBolovanje(e.target.checked)}
                    />
                    Bolovanje (9.3)
                  </label>
                </div>

                <div className={styles.autoFillRow2}>
                  <div className={styles.autoFillField}>
                    <span className={styles.autoFillLabel}>
                      Godišnji odmor (9.1)
                    </span>
                    <div className={styles.autoFillRange}>
                      <input
                        type="text"
                        className={styles.autoFillInputSm}
                        value={autoVacationFrom}
                        onChange={(e) =>
                          setAutoVacationFrom(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="od"
                        maxLength={2}
                        inputMode="numeric"
                      />
                      <span className={styles.autoFillRangeSep}>–</span>
                      <input
                        type="text"
                        className={styles.autoFillInputSm}
                        value={autoVacationTo}
                        onChange={(e) =>
                          setAutoVacationTo(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="do"
                        maxLength={2}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  <div className={styles.autoFillField}>
                    <span className={styles.autoFillLabel}>
                      Bolovanje (9.3)
                    </span>
                    <div className={styles.autoFillRange}>
                      <input
                        type="text"
                        className={styles.autoFillInputSm}
                        value={autoSickFrom}
                        onChange={(e) =>
                          setAutoSickFrom(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="od"
                        maxLength={2}
                        inputMode="numeric"
                      />
                      <span className={styles.autoFillRangeSep}>–</span>
                      <input
                        type="text"
                        className={styles.autoFillInputSm}
                        value={autoSickTo}
                        onChange={(e) =>
                          setAutoSickTo(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="do"
                        maxLength={2}
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.autoFillBtn}
                    onClick={handleAutoFill}
                  >
                    Popuni mjesec →
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {COL_HEADERS.map((col) => (
                        <th key={col.key} style={{ minWidth: col.width }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const dayNum = i + 1;
                      const dow = getDayOfWeek(year, month, dayNum);
                      const isWeekend = dow === 0 || dow === 6;
                      const entry = entries[i];
                      const dd = String(dayNum).padStart(2, "0");
                      const mm = String(month).padStart(2, "0");
                      const dateLabel = `${dd}.${mm}.${year}. ${DAY_NAMES_SHORT[dow]}`;

                      return (
                        <tr key={dayNum}>
                          <td>
                            <div
                              className={`${styles.dayCell}${isWeekend ? ` ${styles.weekend}` : ""}`}
                            >
                              {dayNum}.
                            </div>
                          </td>
                          <td>
                            <div
                              className={`${styles.dayCell} ${styles.dayCellFull}${isWeekend ? ` ${styles.weekend}` : ""}`}
                            >
                              {dateLabel}
                            </div>
                          </td>
                          <td>
                            <TimeOrXInput
                              value={entry.startTime}
                              onChange={(v) => updateEntry(i, "startTime", v)}
                              placeholder="08:00"
                              showX={!!entry.absence}
                            />
                          </td>
                          <td>
                            <TimeOrXInput
                              value={entry.endTime}
                              onChange={(v) => updateEntry(i, "endTime", v)}
                              placeholder="16:00"
                              showX={!!entry.absence}
                            />
                          </td>
                          <td>
                            <HourInput
                              value={entry.zastoj}
                              onChange={(v) => updateEntry(i, "zastoj", v)}
                            />
                          </td>
                          <td>
                            <span className={styles.cellAuto}>{calcTotalDaily(entry, autoDaysOff.has(dow), countCodes)}</span>
                          </td>
                          <td>
                            <HourInput
                              value={entry.fieldWork}
                              onChange={(v) => updateEntry(i, "fieldWork", v)}
                            />
                          </td>
                          <td>
                            <HourInput
                              value={entry.standby}
                              onChange={(v) => updateEntry(i, "standby", v)}
                            />
                          </td>
                          <td>
                            <input
                              className={styles.cellInput}
                              type="text"
                              placeholder={isEntryEmpty(entry) ? "npr. 9.1" : ""}
                              value={entry.absence}
                              onChange={(e) =>
                                updateEntry(i, "absence", e.target.value)
                              }
                              maxLength={6}
                            />
                          </td>
                          <td>
                            <input
                              className={styles.cellInput}
                              type="text"
                              placeholder={isEntryEmpty(entry) ? "npr. 10.2" : ""}
                              value={entry.other}
                              onChange={(e) =>
                                updateEntry(i, "other", e.target.value)
                              }
                              maxLength={6}
                            />
                          </td>
                          <td>
                            <span className={styles.cellAuto}>{calcTotalDaily(entry, autoDaysOff.has(dow), countCodes)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={styles.totalRow}>
                      <td colSpan={10} className={styles.totalLabel}>
                        Ukupno radnih sati u mjesecu
                      </td>
                      <td colSpan={1} className={styles.totalValue}>
                        {minsToLabel(
                          Array.from({ length: daysInMonth }, (_, i) => {
                            const dayDow = getDayOfWeek(year, month, i + 1);
                            return calcDailyMins(entries[i], autoDaysOff.has(dayDow), countCodes);
                          }).reduce((a, b) => a + b, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {!canExport && (
                <div className={styles.exportPaywall}>
                  <div className={styles.exportPaywallIcon}>
                    {trialAvailable ? "🎁" : "🔒"}
                  </div>
                  <div className={styles.exportPaywallText}>
                    {trialAvailable ? (
                      <>
                        <strong>Probajte 30 dana besplatno</strong> i preuzmite
                        PDF obrazac. Bez kartice, bez automatske naplate —
                        nakon 30 dana automatski se vraćate na besplatan plan.
                      </>
                    ) : (
                      <>
                        <strong>Preuzimanje PDF obrasca</strong> dostupno je uz{" "}
                        <strong>Pro</strong> ili <strong>Business</strong>{" "}
                        pretplatu. Vaši uneseni podaci se čuvaju — kada
                        aktivirate pretplatu, samo kliknite preuzmi.
                      </>
                    )}
                  </div>
                  <a
                    href={
                      trialAvailable ? "/pretplate?trial=1" : "/profil#pretplata"
                    }
                    className={styles.exportPaywallBtn}
                  >
                    {trialAvailable
                      ? "Aktiviraj 30 dana besplatno →"
                      : "Pogledaj pretplate →"}
                  </a>
                </div>
              )}
              <div className={styles.actions}>
                <div style={{ display: "inline-flex", alignItems: "stretch" }}>
                  <button
                    type="button"
                    className={styles.exportBtnSecondary}
                    onClick={handleBulkExportPdf}
                    disabled={
                      !canExport ||
                      bulkExportingPdf ||
                      bulkExporting ||
                      !workersQuery.data ||
                      workersQuery.data.length === 0
                    }
                    title={
                      canExport
                        ? "Svi radnici u jednom PDF-u (jedna stranica po radniku)"
                        : "Dostupno uz Pro ili Business pretplatu"
                    }
                    style={{
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      borderRight: "none",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
                    </svg>
                    {bulkExportingPdf
                      ? "Generišem PDF…"
                      : "Sve radnike (PDF)"}
                  </button>
                  <button
                    type="button"
                    className={styles.exportBtnSecondary}
                    onClick={handleBulkExport}
                    disabled={
                      !canExport ||
                      bulkExporting ||
                      bulkExportingPdf ||
                      !workersQuery.data ||
                      workersQuery.data.length === 0
                    }
                    title={
                      canExport
                        ? "ZIP sa zasebnim PDF-om po radniku"
                        : "Dostupno uz Pro ili Business pretplatu"
                    }
                    style={{
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      paddingLeft: "0.9rem",
                      paddingRight: "0.9rem",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
                    </svg>
                    {bulkExporting ? "ZIP…" : "ZIP"}
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.exportBtn}
                  onClick={handleExport}
                  disabled={!canExport}
                  title={
                    canExport ? undefined : "Dostupno uz Pro ili Business pretplatu"
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
                  </svg>
                  Preuzmi PDF
                </button>
              </div>

              <p className={styles.dataNapomena}>
                Vaši podaci se automatski čuvaju i ostaju dostupni za naredne
                posjete.
              </p>
            </>
          )}

          {/* Napomena (uvijek vidljiva, dijeljeni komponent — vidi i guest) */}
          <NapomenaSection />
        </div>
      </div>
    </div>
  );
}
