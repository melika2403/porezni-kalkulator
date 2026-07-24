"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCloudUpload,
  IconPencilPlus,
  IconAlertCircle,
  IconReceipt2,
  IconCircleCheck,
  IconCalendarEvent,
  IconLoader2,
  IconFileX,
  IconInbox,
  IconBuildingBank,
  IconFileText,
  IconChevronDown,
  IconChevronRight,
  IconTrash,
  IconScale,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { formatBAM, formatDate, mnozina } from "src/lib/format";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { Modal } from "src/components/app-shell/Modal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useBankSummary,
  useBankStatements,
  useUploadBankStatement,
  useDeleteBankStatement,
  useSetInitialBalance,
} from "src/hooks/useBankStatements";
import type { BankStatementInfo } from "src/api/bankStatements";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { bankNameFromAccount, formatBankAccount } from "src/lib/bankCodes";
import { parseDateInput, isoToDisplay } from "src/lib/dateInput";
import { parseKm, formatKm } from "src/lib/amountInput";

const MONTHS = [
  "januar", "februar", "mart", "april", "maj", "juni",
  "juli", "august", "septembar", "oktobar", "novembar", "decembar",
];

const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  UNSUPPORTED_BANK:
    "Format ove banke još ne podržavamo. Javite nam se na info@poreznikalkulator.ba, pošaljite uzorak izvoda i dodaćemo je u roku od par dana.",
  NO_TEXT_LAYER:
    "Ovaj PDF izgleda kao sken ili slika. Učitajte originalni PDF izvod iz e-bankinga, ne skeniranu verziju.",
  VALIDATION_FAILED:
    "Izvod je pročitan ali se promet ne slaže sa saldom, pa nije uvezen. Provjerite fajl ili nam ga pošaljite na provjeru.",
  PARSE_ERROR: "Izvod se ne može pročitati. Pošaljite nam fajl na provjeru.",
  DUPLICATE_STATEMENT: "Ovaj izvod je već učitan.",
  INVALID_FILE_TYPE: "Podržan je samo PDF fajl izvoda.",
  NETWORK_ERROR: "Greška u konekciji. Pokušajte ponovo.",
};

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tileBg,
  tileColor,
  valueSmall,
  onClick,
  active,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tileBg: string;
  tileColor: string;
  valueSmall?: boolean;
  /** klik na karticu filtrira listu izvoda ispod (toggle) */
  onClick?: () => void;
  active?: boolean;
}) {
  const inner = (
    <>
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${tileBg}`}
      >
        <Icon size={18} className={tileColor} />
      </div>
      <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
        {label}
      </div>
      <div
        className={[
          "font-serif-display leading-none tabular-nums text-text-primary",
          valueSmall ? "text-[20px]" : "text-[28px]",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="text-[13px] text-text-tertiary mt-1.5">{sub}</div>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          "bg-cream-100 border rounded-xl p-[18px] text-left cursor-pointer transition-colors",
          active
            ? "border-accent-500 shadow-[0_0_0_1px_var(--color-accent-500)]"
            : "border-cream-300 hover:border-text-tertiary",
        ].join(" ")}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
      {inner}
    </div>
  );
}

// ── Pomoćnici za grupisanje i sortiranje izvoda ──────────────────────────────

function godinaIzvoda(s: BankStatementInfo): number | null {
  const iso = s.statementDate ? String(s.statementDate).slice(0, 4) : "";
  const y = Number(iso);
  return Number.isInteger(y) && y > 2000 ? y : null;
}

function brojIzvoda(s: BankStatementInfo): number | null {
  const n = Number(String(s.statementNumber ?? "").trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

type YearSection = {
  year: number | null;
  items: BankStatementInfo[];
};

// Unutar grupe (banka+račun): sekcije po godinama (novija prva), a unutar
// godine izvodi od br. 1 do zadnjeg (bez broja idu na kraj, po datumu).
function yearSections(items: BankStatementInfo[]): YearSection[] {
  const byYear = new Map<number | null, BankStatementInfo[]>();
  for (const s of items) {
    const y = godinaIzvoda(s);
    const arr = byYear.get(y) ?? [];
    arr.push(s);
    byYear.set(y, arr);
  }
  const years = [...byYear.keys()].sort((a, b) => (b ?? 0) - (a ?? 0));
  return years.map((year) => ({
    year,
    items: (byYear.get(year) ?? []).slice().sort((a, b) => {
      const na = brojIzvoda(a);
      const nb = brojIzvoda(b);
      if (na != null && nb != null) return na - nb;
      if (na != null) return -1;
      if (nb != null) return 1;
      return String(a.statementDate ?? "").localeCompare(
        String(b.statementDate ?? ""),
      );
    }),
  }));
}

// Zadnje poznato stanje računa u grupi (najnoviji izvod sa closingBalance).
function zadnjeStanje(
  items: BankStatementInfo[],
): { balance: number; date: string | null } | null {
  let best: BankStatementInfo | null = null;
  for (const s of items) {
    if (s.closingBalance == null) continue;
    if (
      !best ||
      String(s.statementDate ?? "") > String(best.statementDate ?? "")
    ) {
      best = s;
    }
  }
  if (!best) return null;
  const balance = Number(best.closingBalance);
  if (!Number.isFinite(balance)) return null;
  return { balance, date: best.statementDate };
}

type ListFilter = "svi" | "pregled" | "bezKategorije";

export default function BankovniIzvodiPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // progres uploada više fajlova odjednom (Čitam izvod 2/5...)
  const [multiProgress, setMultiProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  // rezime ture sa više fajlova: koliko uvezeno + greške po fajlu
  const [multiRezime, setMultiRezime] = useState<{
    ok: number;
    errors: string[];
  } | null>(null);
  const [filter, setFilter] = useState<ListFilter>("svi");
  // sklopljene grupe banaka (ključ banka|račun); default sve raširene
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // izvod koji čeka potvrdu brisanja (naš modal umjesto window.confirm)
  const [zaBrisanje, setZaBrisanje] = useState<BankStatementInfo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const { data: summary } = useBankSummary(orgId);
  const { data: statements, isLoading: stLoading } = useBankStatements(orgId);
  const upload = useUploadBankStatement(orgId);
  const deleteStatement = useDeleteBankStatement(orgId);
  const setInitial = useSetInitialBalance(orgId);

  // ── Početno stanje računa (sidro salda bez historijskih izvoda) ──────────
  const [psOpen, setPsOpen] = useState(false);
  const [psAccount, setPsAccount] = useState(""); // račun ili "__custom"
  const [psCustom, setPsCustom] = useState("");
  const [psDate, setPsDate] = useState(
    `31.12.${new Date().getFullYear() - 1}.`,
  );
  const [psAmount, setPsAmount] = useState("");
  const [psError, setPsError] = useState<string | null>(null);

  // računi iz profila obrta + računi viđeni na izvodima (bez duplikata)
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null && psOpen,
  });
  const psOptions = (() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    const dodaj = (acc: string | null, bank?: string | null) => {
      const digits = String(acc ?? "").replace(/\D+/g, "");
      if (digits.length < 8 || seen.has(digits)) return;
      seen.add(digits);
      opts.push({
        value: acc as string,
        label: `${bank || bankNameFromAccount(acc as string) || "Banka"} · ${formatBankAccount(acc as string)}`,
      });
    };
    for (const s of statements ?? []) {
      if (s.bankId !== "pocetno") dodaj(s.account, s.bankName);
    }
    const profilni = fullOrg?.bankAccounts?.length
      ? fullOrg.bankAccounts
      : fullOrg?.bankAccount
        ? [fullOrg.bankAccount]
        : [];
    for (const a of profilni) dodaj(a);
    opts.push({ value: "__custom", label: "Drugi račun (upiši)" });
    return opts;
  })();

  function otvoriPocetnoStanje() {
    setPsError(null);
    setPsAmount("");
    setPsCustom("");
    // predizbor: prvi poznati račun; bez poznatih odmah ručni unos
    setPsAccount(psOptions.length > 1 ? psOptions[0].value : "__custom");
    setPsOpen(true);
  }

  // klik na red početnog stanja: modal prefillovan za izmjenu (nema stavki
  // pa detalj izvoda nema šta pokazati)
  function otvoriIzmjenuPocetnog(s: BankStatementInfo) {
    setPsError(null);
    const digits = String(s.account ?? "").replace(/\D+/g, "");
    const opt = psOptions.find(
      (o) => o.value !== "__custom" && o.value.replace(/\D+/g, "") === digits,
    );
    setPsAccount(opt ? opt.value : "__custom");
    setPsCustom(opt ? "" : (s.account ?? ""));
    if (s.statementDate) setPsDate(isoToDisplay(s.statementDate));
    setPsAmount(
      s.closingBalance != null ? formatKm(Number(s.closingBalance)) : "",
    );
    setPsOpen(true);
  }

  function sacuvajPocetnoStanje() {
    const account = psAccount === "__custom" ? psCustom : psAccount;
    const digits = account.replace(/\D+/g, "");
    if (digits.length < 8) {
      setPsError("Upišite ispravan žiro račun (najmanje 8 cifara).");
      return;
    }
    const iso = parseDateInput(psDate);
    if (!iso) {
      setPsError("Upišite ispravan datum stanja (npr. 31.12.2025.).");
      return;
    }
    const amount = parseKm(psAmount);
    if (amount == null || amount < 0) {
      setPsError("Upišite stanje računa u KM (0 ili više).");
      return;
    }
    setPsError(null);
    setInitial.mutate(
      { account, date: iso, amount },
      {
        onSuccess: () => setPsOpen(false),
        onError: () =>
          setPsError("Snimanje nije uspjelo. Pokušajte ponovo."),
      },
    );
  }

  function handleDelete(s: BankStatementInfo) {
    setZaBrisanje(s);
  }

  function porukaGreske(err: unknown): string {
    const code =
      err && typeof err === "object" && "error" in err
        ? String((err as { error: string }).error)
        : "PARSE_ERROR";
    return (
      UPLOAD_ERROR_MESSAGES[code] ??
      `Greška pri obradi izvoda (${code}). Pokušajte ponovo.`
    );
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || upload.isPending || multiProgress) {
      return;
    }
    const pdfs = Array.from(files);
    setUploadError(null);
    setMultiRezime(null);
    if (fileRef.current) fileRef.current.value = "";

    // jedan fajl: kao do sad, odmah otvori učitani izvod sa svim stavkama
    if (pdfs.length === 1) {
      upload.mutate(pdfs[0], {
        onSuccess: (data) => {
          router.push(`/app/bankovni-izvodi/${data.statementId}`);
        },
        onError: (err: unknown) => setUploadError(porukaGreske(err)),
      });
      return;
    }

    // više fajlova: sekvencijalno (kontinuitet salda vidi prethodno uvezene
    // izvode), po redu naziva fajla; na kraju rezime umjesto preusmjeravanja
    pdfs.sort((a, b) => a.name.localeCompare(b.name, "bs", { numeric: true }));
    setMultiProgress({ done: 0, total: pdfs.length });
    const errors: string[] = [];
    let ok = 0;
    try {
      for (let i = 0; i < pdfs.length; i++) {
        setMultiProgress({ done: i, total: pdfs.length });
        try {
          await upload.mutateAsync(pdfs[i]);
          ok++;
        } catch (err) {
          errors.push(`${pdfs[i].name}: ${porukaGreske(err)}`);
        }
      }
    } finally {
      setMultiProgress(null);
    }
    setMultiRezime({ ok, errors });
  }

  const now = new Date();
  const monthName = MONTHS[now.getMonth()];

  // brojevi za filter chipove (prije filtriranja)
  const zaPregledCount = (statements ?? []).filter(
    (s) => s.unmatchedCount > 0,
  ).length;
  const bezKategorijeCount = (statements ?? []).filter(
    (s) => (s.bezKategorijeCount ?? 0) > 0,
  ).length;

  const filtered = (statements ?? []).filter((s) => {
    if (filter === "pregled") return s.unmatchedCount > 0;
    if (filter === "bezKategorije") return (s.bezKategorijeCount ?? 0) > 0;
    return true;
  });

  // grupiši izvode po računu (po ciframa: banke i početno stanje pišu isti
  // račun različito formatiran); izvodi bez računa po nazivu banke
  const groups = new Map<string, { bankName: string; account: string | null; items: BankStatementInfo[] }>();
  for (const s of filtered) {
    const digits = String(s.account ?? "").replace(/\D+/g, "");
    const key = digits ? `acc:${digits}` : `${s.bankName ?? "Banka"}|`;
    const group = groups.get(key) ?? {
      bankName: s.bankName ?? "Banka",
      account: s.account,
      items: [],
    };
    group.items.push(s);
    groups.set(key, group);
  }
  // grupe uvijek istim redom: po nazivu banke pa broju računa (redoslijed sa
  // API-ja zavisi od vremena uploada pa bi grupe "šetale")
  const sortedGroups = [...groups.entries()].sort(([, a], [, b]) => {
    return (
      a.bankName.localeCompare(b.bankName, "bs") ||
      String(a.account ?? "").localeCompare(String(b.account ?? ""))
    );
  });
  const hasAny = (statements ?? []).length > 0;

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
          <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
          Finansije
        </div>
        <div className="flex items-center gap-4 mb-[5px]">
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary">
            Bankovni izvodi.
          </h1>
          <HelpButton slug="bankovni-izvodi" />
        </div>
        <p className="text-[13px] leading-6 text-text-tertiary max-w-[470px]">
          Učitajte PDF izvod iz e-bankinga. Promet se provjerava prema saldu
          izvoda prije uvoza, pa u knjige ne može ući pogrešno pročitan red.
        </p>
      </div>

      {/* Akcijske kartice */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 mb-4 items-stretch">
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            !upload.isPending && !multiProgress && fileRef.current?.click()
          }
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={[
            "rounded-xl border-2 border-dashed px-[18px] py-6 text-center cursor-pointer transition-colors",
            dragging
              ? "border-brand-600 bg-brand-100"
              : "border-brand-600/60 bg-brand-100/45 hover:bg-brand-100/75 hover:border-brand-600",
            upload.isPending || multiProgress
              ? "opacity-70 pointer-events-none"
              : "",
          ].join(" ")}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <span className="w-[54px] h-[54px] rounded-full bg-brand-600 text-white inline-flex items-center justify-center mb-3">
            {upload.isPending || multiProgress ? (
              <IconLoader2 size={26} className="animate-spin" />
            ) : (
              <IconCloudUpload size={26} />
            )}
          </span>
          <div className="font-serif-display text-[18px] leading-tight text-text-primary">
            {multiProgress
              ? `Čitam izvod ${multiProgress.done + 1}/${multiProgress.total}...`
              : upload.isPending
                ? "Čitam izvod..."
                : "Učitaj bankovne izvode"}
          </div>
          <div className="text-[12.5px] text-text-tertiary mt-1.5">
            Prevuci jedan ili više PDF-ova, ili klikni za odabir
          </div>
          <div className="text-[11px] text-text-tertiary mt-2.5">
            UniCredit · Raiffeisen · Sparkasse · KIB · BBI · MF · Ziraat
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/app/bankovni-izvodi/novi")}
          className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-text-tertiary transition-colors"
        >
          <span className="w-[46px] h-[46px] rounded-full bg-cream-200 text-text-secondary inline-flex items-center justify-center mb-3">
            <IconPencilPlus size={22} />
          </span>
          <div className="text-[15px] font-medium text-text-primary">
            Unesi izvod ručno
          </div>
          <div className="text-[11.5px] text-text-tertiary mt-1">
            Za banke koje još ne čitamo ili papirne izvode
          </div>
        </button>
      </div>

      {/* Grupni uvoz: vidljivo svima, i sa jednim obrtom */}
      <div className="rounded-xl border border-brand-600/25 bg-brand-100/50 px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] leading-6 text-text-primary flex items-center gap-2.5">
          <IconInbox size={17} className="text-brand-700 shrink-0" />
          <span>
            Na Inboxu ubacite izvode za <strong>sve obrte odjednom</strong>:
            svaki se sam prepozna po žiro računu i rasporedi na svoj obrt.
          </span>
        </span>
        <button
          type="button"
          onClick={() => router.push("/app/inbox?tab=izvodi")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          Grupni uvoz izvoda
          <IconChevronRight size={14} />
        </button>
      </div>

      {/* Greška uploada */}
      {uploadError && (
        <div className="rounded-xl border border-warning/30 bg-warning-bg text-warning px-4 py-3 mb-4 text-[13px] leading-5 flex items-start gap-2.5">
          <IconFileX size={17} className="shrink-0 mt-0.5" />
          <div>{uploadError}</div>
        </div>
      )}

      {/* Rezime ture sa više fajlova */}
      {multiRezime && (
        <div
          className={[
            "rounded-xl border px-4 py-3 mb-4 text-[13px] leading-5",
            multiRezime.errors.length
              ? "border-warning/30 bg-warning-bg text-warning"
              : "border-success/30 bg-success-bg text-success",
          ].join(" ")}
        >
          <div className="flex items-start gap-2.5">
            {multiRezime.errors.length ? (
              <IconFileX size={17} className="shrink-0 mt-0.5" />
            ) : (
              <IconCircleCheck size={17} className="shrink-0 mt-0.5" />
            )}
            <div>
              <div>
                Uvezeno {multiRezime.ok} od{" "}
                {multiRezime.ok + multiRezime.errors.length}{" "}
                {mnozina(
                  multiRezime.ok + multiRezime.errors.length,
                  "izvod",
                  "izvoda",
                  "izvoda",
                )}
                .
              </div>
              {multiRezime.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {multiRezime.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI red */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          label={`Učitano (${monthName})`}
          value={String(summary?.loadedThisMonth ?? 0)}
          sub="transakcija"
          icon={IconReceipt2}
          tileBg="bg-brand-100"
          tileColor="text-brand-700"
        />
        <Kpi
          label="Potvrđeno"
          value={String(summary?.confirmedThisMonth ?? 0)}
          sub="ovaj mjesec"
          icon={IconCircleCheck}
          tileBg="bg-brand-100"
          tileColor="text-brand-700"
        />
        <Kpi
          label="Za pregled"
          value={String(summary?.unmatched ?? 0)}
          sub={filter === "pregled" ? "filter uključen · klik za sve" : "treba potvrda · klik filtrira"}
          icon={IconAlertCircle}
          tileBg="bg-accent-bg"
          tileColor="text-accent-500"
          active={filter === "pregled"}
          onClick={() =>
            setFilter((f) => (f === "pregled" ? "svi" : "pregled"))
          }
        />
        <Kpi
          label="Posljednji upload"
          value={
            summary?.lastUpload?.statementDate
              ? formatDate(summary.lastUpload.statementDate)
              : "–"
          }
          sub={summary?.lastUpload?.fileName ?? "još nema izvoda"}
          icon={IconCalendarEvent}
          tileBg="bg-cream-200"
          tileColor="text-text-secondary"
          valueSmall
        />
      </div>

      {/* Izvodi po bankama */}
      <div className="rounded-xl bg-cream-100 border border-cream-300">
        <div className="pt-4 px-4 pb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif-display text-[21px] leading-tight text-text-primary">
              Izvodi
            </h2>
            <p className="text-[13px] italic text-text-tertiary mt-0.5">
              Po banci i računu; unutar godine od br. 1 do zadnjeg
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {hasAny &&
              (
                [
                  { id: "svi" as const, label: "Svi" },
                  {
                    id: "pregled" as const,
                    label: `Za pregled (${zaPregledCount})`,
                  },
                  {
                    id: "bezKategorije" as const,
                    label: `Bez kategorije (${bezKategorijeCount})`,
                  },
                ] satisfies { id: ListFilter; label: string }[]
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilter(c.id)}
                  className={[
                    "px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors",
                    filter === c.id
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-cream-50 text-text-secondary border-cream-300 hover:border-text-tertiary",
                  ].join(" ")}
                >
                  {c.label}
                </button>
              ))}
            <button
              type="button"
              onClick={otvoriPocetnoStanje}
              title="Upišite stanje računa na dan prije prvog učitanog izvoda (npr. 31.12. prethodne godine), da stanje bude tačno bez učitavanja starih izvoda"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-600 hover:text-white transition-colors ml-1"
            >
              <IconScale size={14} />
              Početno stanje računa
            </button>
          </div>
        </div>

        {!hasAny && !stLoading ? (
          <div className="px-4 py-12 text-center">
            <span className="w-12 h-12 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-3">
              <IconInbox size={22} />
            </span>
            <p className="text-[14px] font-medium text-text-primary">
              Još nema učitanih izvoda
            </p>
            <p className="text-[12.5px] text-text-tertiary mt-1 max-w-[360px] mx-auto">
              Učitajte prvi PDF izvod iznad. Otvoriće se sa svim stavkama,
              spreman za pregled i knjiženje.
            </p>
          </div>
        ) : groups.size === 0 && !stLoading ? (
          <div className="px-4 py-8 text-center text-[13px] text-text-tertiary">
            Nema izvoda za izabrani filter.
          </div>
        ) : (
          <div className="pb-2">
            {sortedGroups.map(([key, group]) => {
              const sections = yearSections(group.items);
              const stanje = zadnjeStanje(group.items);
              const sklopljena = collapsed.has(key);
              const brojIzvodaUGrupi = group.items.length;
              return (
                <div
                  key={key}
                  className="border-t border-cream-300/70 first:border-t-0"
                >
                  {/* zaglavlje banke: klik sklapa/rasklapa grupu */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(key)}
                    className="w-full flex items-center gap-2.5 px-4 pt-3.5 pb-2.5 text-left cursor-pointer hover:bg-[rgba(15,26,18,0.02)] transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 inline-flex items-center justify-center shrink-0">
                      <IconBuildingBank size={16} />
                    </span>
                    <span className="text-[15px] font-medium text-text-primary">
                      {group.bankName}
                    </span>
                    {group.account && (
                      <span className="text-[13.5px] text-text-tertiary tabular-nums">
                        {group.account}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-3 shrink-0">
                      {stanje && (
                        <span className="text-[12.5px] text-text-secondary tabular-nums">
                          Stanje:{" "}
                          <strong className="text-text-primary font-semibold">
                            {formatBAM(stanje.balance)}
                          </strong>
                          {stanje.date ? (
                            <span className="text-text-tertiary">
                              {" "}na {formatDate(stanje.date)}
                            </span>
                          ) : null}
                        </span>
                      )}
                      <span className="text-[12px] text-text-tertiary">
                        {brojIzvodaUGrupi}{" "}
                        {brojIzvodaUGrupi === 1 ? "izvod" : "izvoda"}
                      </span>
                      <IconChevronDown
                        size={16}
                        className={[
                          "text-text-tertiary transition-transform",
                          sklopljena ? "-rotate-90" : "",
                        ].join(" ")}
                      />
                    </span>
                  </button>

                  {!sklopljena &&
                    sections.map((sec) => (
                      <div key={`${key}|${sec.year ?? "bez"}`}>
                        {/* podnaslov godine samo kad grupa ima više godina */}
                        {sections.length > 1 && (
                          <div className="pl-[52px] pr-4 pt-1 pb-1 text-[11px] uppercase tracking-[0.06em] text-text-tertiary">
                            {sec.year ?? "Bez datuma"}
                          </div>
                        )}
                        <ul>
                          {sec.items.map((s, i) => {
                            const reviewed = s.txCount - s.unmatchedCount;
                            const num = brojIzvoda(s);
                            const prevNum =
                              i > 0 ? brojIzvoda(sec.items[i - 1]) : null;
                            // rupa u nizu brojeva unutar iste godine
                            const gapFrom =
                              num != null && prevNum != null && num > prevNum + 1
                                ? prevNum + 1
                                : null;
                            const gapTo = gapFrom != null ? (num as number) - 1 : null;
                            // statusna boja lijevog ruba reda
                            const rub =
                              s.unmatchedCount > 0
                                ? "border-l-accent-500"
                                : (s.bezKategorijeCount ?? 0) > 0
                                  ? "border-l-warning"
                                  : "border-l-transparent";
                            return (
                              <li key={s.id}>
                                {gapFrom != null && (
                                  <div className="flex items-center gap-2 pl-[52px] pr-4 py-1 text-[11.5px] text-warning">
                                    <span className="flex-1 border-t border-dashed border-warning/40" />
                                    možda nedostaje izvod br.{" "}
                                    {gapTo !== gapFrom
                                      ? `${gapFrom}-${gapTo}`
                                      : gapFrom}
                                    <span className="flex-1 border-t border-dashed border-warning/40" />
                                  </div>
                                )}
                                <div
                                  onClick={() =>
                                    s.bankId === "pocetno"
                                      ? otvoriIzmjenuPocetnog(s)
                                      : router.push(
                                          `/app/bankovni-izvodi/${s.id}`,
                                        )
                                  }
                                  className={[
                                    "flex items-center gap-3 pl-[49px] pr-4 py-[11px] cursor-pointer hover:bg-[rgba(15,26,18,0.025)] transition-colors border-b border-cream-300/50 border-l-[3px]",
                                    rub,
                                  ].join(" ")}
                                >
                                  <span className="w-8 h-8 rounded-lg bg-brand-100/60 text-brand-700 inline-flex items-center justify-center shrink-0">
                                    <IconFileText size={15} />
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[14.5px] font-medium text-text-primary">
                                      {s.bankId === "pocetno"
                                        ? "Početno stanje"
                                        : s.statementNumber
                                          ? `Izvod br. ${s.statementNumber}`
                                          : "Ručni izvod"}
                                      <span className="text-text-tertiary font-normal">
                                        {" "}· {s.statementDate ? formatDate(s.statementDate) : "bez datuma"}
                                      </span>
                                    </div>
                                    <div className="text-[12.5px] text-text-tertiary truncate mt-0.5 tabular-nums">
                                      {s.bankId === "pocetno" ? (
                                        <>
                                          Stanje računa na taj dan:{" "}
                                          <span className="text-text-secondary font-medium">
                                            {formatBAM(Number(s.closingBalance ?? 0))}
                                          </span>
                                          {" "}· polazna tačka, bez stavki
                                        </>
                                      ) : (
                                        <>
                                      {s.txCount}{" "}
                                      {mnozina(s.txCount, "stavka", "stavke", "stavki")}
                                      {(s.totalIn ?? 0) > 0 && (
                                        <>
                                          {" "}·{" "}
                                          <span className="text-success font-medium">
                                            +{formatBAM(s.totalIn as number)}
                                          </span>
                                        </>
                                      )}
                                      {(s.totalOut ?? 0) > 0 && (
                                        <>
                                          {" "}·{" "}
                                          <span className="text-text-secondary">
                                            -{formatBAM(s.totalOut as number)}
                                          </span>
                                        </>
                                      )}
                                      {s.fileName ? ` · ${s.fileName}` : ""}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {(s.bezKategorijeCount ?? 0) > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(
                                          `/app/bankovni-izvodi/${s.id}?bezKategorije=1`,
                                        );
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-medium shrink-0 bg-warning-bg text-warning hover:opacity-80 transition-opacity cursor-pointer"
                                      title="Potvrđene stavke bez KPR kategorije ne ulaze u KPR. Klik otvara izvod filtriran na te stavke."
                                    >
                                      <IconAlertCircle size={11} />{" "}
                                      {s.bezKategorijeCount} bez kategorije
                                    </button>
                                  )}
                                  {s.bankId !== "pocetno" && (
                                    <span
                                      className={[
                                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-medium shrink-0",
                                        s.unmatchedCount > 0
                                          ? "bg-accent-bg text-accent-500"
                                          : "bg-brand-100 text-brand-700",
                                      ].join(" ")}
                                    >
                                      {s.unmatchedCount > 0 ? (
                                        <>
                                          <IconAlertCircle size={11} /> {s.unmatchedCount} za pregled
                                        </>
                                      ) : (
                                        <>
                                          <IconCircleCheck size={11} /> potvrđen ({reviewed}/{s.txCount})
                                        </>
                                      )}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    title="Obriši izvod"
                                    disabled={deleteStatement.isPending}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(s);
                                    }}
                                    className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-cream-200 transition-colors shrink-0 disabled:opacity-50"
                                  >
                                    <IconTrash size={15} />
                                  </button>
                                  <IconChevronRight
                                    size={16}
                                    className="text-[rgba(15,26,18,0.28)] shrink-0"
                                  />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unos početnog stanja računa */}
      <Modal
        open={psOpen}
        onClose={() => setPsOpen(false)}
        title="Početno stanje računa"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPsOpen(false)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] font-medium text-text-secondary hover:bg-cream-200 transition-colors"
            >
              Otkaži
            </button>
            <button
              type="button"
              onClick={sacuvajPocetnoStanje}
              disabled={setInitial.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {setInitial.isPending ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : null}
              Sačuvaj stanje
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary mb-4">
          Ako ne želite učitavati stare izvode, upišite stanje računa na dan
          prije prvog izvoda koji jeste učitali (najčešće 31.12. prethodne
          godine, sa zadnjeg izvoda te godine). Program ga koristi kao
          polaznu tačku: stanje računa i kontrola nedostajućih izvoda se
          računaju od tog datuma. Po računu se čuva jedno početno stanje,
          ponovni unos ga mijenja.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1">
              Žiro račun
            </label>
            <PkSelect
              ariaLabel="Žiro račun"
              value={psAccount}
              onChange={(v) => setPsAccount(String(v ?? ""))}
              options={psOptions}
              wrapStyle={{ width: "100%" }}
            />
          </div>
          {psAccount === "__custom" && (
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1">
                Broj računa
              </label>
              <input
                type="text"
                value={psCustom}
                onChange={(e) => setPsCustom(e.target.value)}
                placeholder="npr. 161-000-00000000-00"
                className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13.5px] text-text-primary outline-none focus:border-brand-600 transition-colors"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1">
                Stanje na dan
              </label>
              <PkDateInput
                value={psDate}
                onChange={setPsDate}
                ariaLabel="Datum početnog stanja"
                inputClassName="bg-cream-50"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1">
                Stanje (KM)
              </label>
              <PkAmountInput
                value={psAmount}
                onChange={setPsAmount}
                ariaLabel="Iznos početnog stanja"
                className="bg-cream-50"
              />
            </div>
          </div>
          {psError && (
            <p className="text-[12.5px] text-danger">{psError}</p>
          )}
        </div>
      </Modal>

      {/* potvrda brisanja izvoda (PK modal umjesto browserskog dijaloga) */}
      <ConfirmModal
        open={zaBrisanje != null}
        onClose={() => setZaBrisanje(null)}
        title="Obriši izvod"
        message={
          zaBrisanje &&
          (zaBrisanje.bankId === "pocetno" ? (
            <>
              Obrisati{" "}
              <strong className="text-text-primary">početno stanje</strong>{" "}
              računa {zaBrisanje.account ?? ""}? Stanje računa i kontrola
              kontinuiteta izvoda više neće imati ovu polaznu tačku.
            </>
          ) : (
            <>
              Obrisati{" "}
              <strong className="text-text-primary">
                {zaBrisanje.statementNumber
                  ? `izvod br. ${zaBrisanje.statementNumber}`
                  : "ručni izvod"}
              </strong>{" "}
              ({zaBrisanje.bankName ?? "banka"}) i svih {zaBrisanje.txCount}{" "}
              stavki? Ovo se ne može poništiti, a povezane fakture i ulazni
              računi se vraćaju u otvoreno stanje.
            </>
          ))
        }
        confirmLabel="Da, obriši izvod"
        busy={deleteStatement.isPending}
        onConfirm={() => {
          if (!zaBrisanje) return;
          deleteStatement.mutate(zaBrisanje.id, {
            onSuccess: () => setZaBrisanje(null),
          });
        }}
      />
    </div>
  );
}
