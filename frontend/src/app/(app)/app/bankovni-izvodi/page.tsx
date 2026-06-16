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
  IconChevronRight,
  IconTrash,
} from "@tabler/icons-react";
import { formatDate } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useBankSummary,
  useBankStatements,
  useUploadBankStatement,
  useDeleteBankStatement,
} from "src/hooks/useBankStatements";
import type { BankStatementInfo } from "src/api/bankStatements";

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
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tileBg: string;
  tileColor: string;
  valueSmall?: boolean;
}) {
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
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
    </div>
  );
}

export default function BankovniIzvodiPage() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const { data: summary } = useBankSummary(orgId);
  const { data: statements, isLoading: stLoading } = useBankStatements(orgId);
  const upload = useUploadBankStatement(orgId);
  const deleteStatement = useDeleteBankStatement(orgId);

  function handleDelete(s: BankStatementInfo) {
    const sure = window.confirm(
      `Obrisati izvod br. ${s.statementNumber ?? "?"} (${s.bankName ?? "banka"}) i svih ${s.txCount} stavki? Ovo se ne može poništiti.`,
    );
    if (sure) deleteStatement.mutate(s.id);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || upload.isPending) return;
    setUploadError(null);
    upload.mutate(files[0], {
      onSuccess: (data) => {
        // odmah otvori učitani izvod sa svim stavkama
        router.push(`/app/bankovni-izvodi/${data.statementId}`);
      },
      onError: (err: unknown) => {
        const code =
          err && typeof err === "object" && "error" in err
            ? String((err as { error: string }).error)
            : "PARSE_ERROR";
        setUploadError(
          UPLOAD_ERROR_MESSAGES[code] ??
            `Greška pri obradi izvoda (${code}). Pokušajte ponovo.`,
        );
      },
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  const now = new Date();
  const monthName = MONTHS[now.getMonth()];

  // grupiši izvode po banci + računu
  const groups = new Map<string, { bankName: string; account: string | null; items: BankStatementInfo[] }>();
  for (const s of statements ?? []) {
    const key = `${s.bankName ?? "Banka"}|${s.account ?? ""}`;
    const group = groups.get(key) ?? {
      bankName: s.bankName ?? "Banka",
      account: s.account,
      items: [],
    };
    group.items.push(s);
    groups.set(key, group);
  }
  const hasAny = (statements ?? []).length > 0;

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
          <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
          Finansije
        </div>
        <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
          Bankovni izvodi.
        </h1>
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
          onClick={() => !upload.isPending && fileRef.current?.click()}
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
            upload.isPending ? "opacity-70 pointer-events-none" : "",
          ].join(" ")}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <span className="w-[54px] h-[54px] rounded-full bg-brand-600 text-white inline-flex items-center justify-center mb-3">
            {upload.isPending ? (
              <IconLoader2 size={26} className="animate-spin" />
            ) : (
              <IconCloudUpload size={26} />
            )}
          </span>
          <div className="font-serif-display text-[18px] leading-tight text-text-primary">
            {upload.isPending ? "Čitam izvod..." : "Učitaj bankovni izvod"}
          </div>
          <div className="text-[12.5px] text-text-tertiary mt-1.5">
            Prevuci PDF ili klikni za odabir
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

      {/* Greška uploada */}
      {uploadError && (
        <div className="rounded-xl border border-warning/30 bg-warning-bg text-warning px-4 py-3 mb-4 text-[13px] leading-5 flex items-start gap-2.5">
          <IconFileX size={17} className="shrink-0 mt-0.5" />
          <div>{uploadError}</div>
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
          sub="treba potvrda"
          icon={IconAlertCircle}
          tileBg="bg-accent-bg"
          tileColor="text-accent-500"
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
        <div className="pt-4 px-4 pb-3">
          <h2 className="font-serif-display text-[21px] leading-tight text-text-primary">
            Izvodi
          </h2>
          <p className="text-[13px] italic text-text-tertiary mt-0.5">
            Grupisani po banci i računu, najnoviji prvo
          </p>
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
        ) : (
          <div className="pb-2">
            {[...groups.values()].map((group) => (
              <div key={`${group.bankName}|${group.account}`}>
                <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                  <span className="w-8 h-8 rounded-lg bg-cream-200 text-text-secondary inline-flex items-center justify-center">
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
                </div>
                <ul>
                  {group.items.map((s) => {
                    const reviewed = s.txCount - s.unmatchedCount;
                    return (
                      <li
                        key={s.id}
                        onClick={() => router.push(`/app/bankovni-izvodi/${s.id}`)}
                        className="flex items-center gap-3 pl-[52px] pr-4 py-[11px] cursor-pointer hover:bg-[rgba(15,26,18,0.025)] transition-colors border-b border-cream-300/50 last:border-b-0"
                      >
                        <span className="w-8 h-8 rounded-lg bg-brand-100/60 text-brand-700 inline-flex items-center justify-center shrink-0">
                          <IconFileText size={15} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14.5px] font-medium text-text-primary">
                            Izvod br. {s.statementNumber ?? "?"}
                            <span className="text-text-tertiary font-normal">
                              {" "}· {s.statementDate ? formatDate(s.statementDate) : "bez datuma"}
                            </span>
                          </div>
                          <div className="text-[12.5px] text-text-tertiary truncate mt-0.5">
                            {s.txCount}{" "}
                            {s.txCount === 1 ? "stavka" : "stavki"}
                            {s.fileName ? ` · ${s.fileName}` : ""}
                          </div>
                        </div>
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
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
