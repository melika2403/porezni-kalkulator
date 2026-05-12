"use client";

import {
  IconCloudUpload,
  IconPencilPlus,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconLink,
  IconAlertCircle,
  IconReceipt2,
  IconCircleCheck,
  IconCalendarTime,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";

const MOCK_TRANSACTIONS = [
  {
    id: 1,
    date: "2026-05-08",
    description: "UPLATA — Faktura 0042/2026",
    counterparty: "Lagermax d.o.o.",
    amount: 1240.5,
    direction: "in" as const,
    status: "linked" as const,
    tag: "Auto-match",
  },
  {
    id: 2,
    date: "2026-05-07",
    description: "PROVIZIJA — mjesečna",
    counterparty: "UniCredit Bank",
    amount: -8.5,
    direction: "out" as const,
    status: "linked" as const,
    tag: "Bankovne usluge",
  },
  {
    id: 3,
    date: "2026-05-06",
    description: "UPLATA",
    counterparty: "Studio Ena",
    amount: 480.0,
    direction: "in" as const,
    status: "review" as const,
    tag: "Predlog: Faktura 0040",
  },
  {
    id: 4,
    date: "2026-05-05",
    description: "PLAĆANJE — Akontacija PIO maj",
    counterparty: "Porezna uprava FBiH",
    amount: -213.8,
    direction: "out" as const,
    status: "linked" as const,
    tag: "Doprinosi",
  },
  {
    id: 5,
    date: "2026-05-04",
    description: "UPLATA",
    counterparty: "Klikker d.o.o.",
    amount: 920.0,
    direction: "in" as const,
    status: "review" as const,
    tag: "Treba kategorizacija",
  },
];

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-6 hover:bg-white hover:border-brand-600/20 transition-colors">
      <div className="flex items-start justify-between mb-5">
        <div
          className={`w-11 h-11 rounded-lg flex items-center justify-center ${iconBg}`}
        >
          <Icon size={22} className={iconColor} />
        </div>
      </div>
      <div className="text-[10.5px] leading-4 font-semibold uppercase tracking-[0.14em] text-text-tertiary mb-2">
        {label}
      </div>
      <div className="font-serif-display text-[32px] leading-[1.05] text-text-primary tabular-nums truncate mb-1.5">
        {value}
      </div>
      {hint && (
        <div className="text-[12px] leading-4 text-text-tertiary truncate">
          {hint}
        </div>
      )}
    </div>
  );
}

export default function BankovniIzvodiPage() {
  return (
    <div className="px-8 py-10 lg:px-14 lg:py-14 max-w-[1440px] mx-auto">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-100 text-brand-700 text-[11.5px] font-medium tracking-[0.04em] border border-brand-600/15 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
          Finansije
        </div>
        <h1 className="font-serif-display text-[clamp(2.4rem,4.5vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
          Bankovni izvodi<span className="text-brand-600" style={{ fontStyle: "italic" }}>.</span>
        </h1>
        <p className="text-[15px] leading-7 text-text-tertiary mt-4 max-w-xl">
          Učitajte PDF/CSV izvod ili dodajte transakciju ručno. Auto-match
          povezuje sve sa fakturama i obavezama.
        </p>
      </div>

      {/* Upload + manual zone */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5 mb-10">
        <button
          type="button"
          onClick={() => alert("Upload modal — uskoro")}
          className="group rounded-xl border-2 border-dashed border-brand-600/30 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-600/50 transition-colors px-12 py-16 text-center"
        >
          <span className="w-16 h-16 rounded-full bg-brand-600 text-white inline-flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-[0_6px_20px_-4px_rgba(58,92,66,0.35)]">
            <IconCloudUpload size={28} />
          </span>
          <div className="font-serif-display text-[22px] leading-tight text-text-primary">
            Učitaj bankovni izvod
          </div>
          <div className="text-[13.5px] text-text-tertiary mt-2">
            Prevuci PDF/CSV ili klikni za odabir
          </div>
          <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cream-100 border border-cream-300 text-[11.5px] text-text-secondary">
            UniCredit · Raiffeisen · ASA · Sparkasse · Intesa
          </div>
        </button>

        <button
          type="button"
          onClick={() => alert("Ručni unos — uskoro")}
          className="rounded-xl border border-cream-300 bg-cream-100 hover:bg-white hover:border-brand-600/20 transition-colors px-10 py-16 text-center"
        >
          <span className="w-14 h-14 rounded-full bg-cream-200 text-text-primary inline-flex items-center justify-center mb-4">
            <IconPencilPlus size={24} />
          </span>
          <div className="font-serif-display text-[20px] leading-tight text-text-primary">
            Dodaj ručno
          </div>
          <div className="text-[13.5px] text-text-tertiary mt-2">
            Polog pazara, gotovinska uplata, jedna stavka
          </div>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        <MetricCard
          label="Učitano (maj)"
          value="47"
          hint="transakcija"
          icon={IconReceipt2}
          iconBg="bg-info-bg"
          iconColor="text-info"
        />
        <MetricCard
          label="Povezano"
          value="35"
          hint="74% automatski"
          icon={IconCircleCheck}
          iconBg="bg-success-bg"
          iconColor="text-success"
        />
        <MetricCard
          label="Nepovezano"
          value="12"
          hint="treba pregled"
          icon={IconAlertCircle}
          iconBg="bg-warning-bg"
          iconColor="text-warning"
        />
        <MetricCard
          label="Posljednji upload"
          value={formatDate("2026-05-08")}
          hint="UniCredit_05.pdf"
          icon={IconCalendarTime}
          iconBg="bg-cream-200"
          iconColor="text-text-secondary"
        />
      </div>

      {/* Transactions list */}
      <div className="rounded-xl bg-cream-100 border border-cream-300 overflow-hidden">
        <div className="px-6 lg:px-8 py-5 flex items-center justify-between border-b border-cream-300">
          <div>
            <h2 className="font-serif-display text-[22px] leading-tight text-text-primary">
              Posljednje transakcije
            </h2>
            <p className="text-[12.5px] text-text-tertiary mt-1">
              Mock podaci — pravi izvod stiže nakon uploada
            </p>
          </div>
          <button
            type="button"
            className="text-[12.5px] font-medium text-brand-700 hover:text-brand-600"
          >
            Sve →
          </button>
        </div>
        <ul className="divide-y divide-cream-300">
          {MOCK_TRANSACTIONS.map((t) => {
            const isIn = t.direction === "in";
            const isReview = t.status === "review";
            return (
              <li
                key={t.id}
                className="flex items-center gap-4 px-6 lg:px-8 py-4 hover:bg-cream-200/40 transition-colors"
              >
                <span
                  className={[
                    "w-11 h-11 rounded-full flex items-center justify-center shrink-0",
                    isIn
                      ? "bg-success-bg text-success"
                      : "bg-cream-200 text-text-secondary",
                  ].join(" ")}
                >
                  {isIn ? (
                    <IconArrowDownLeft size={19} />
                  ) : (
                    <IconArrowUpRight size={19} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[14px] font-medium text-text-primary">
                      {t.description}
                    </div>
                    <span
                      className={[
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium shrink-0",
                        isReview
                          ? "bg-warning-bg text-warning"
                          : "bg-success-bg text-success",
                      ].join(" ")}
                    >
                      {isReview ? (
                        <>
                          <IconAlertCircle size={10} /> za pregled
                        </>
                      ) : (
                        <>
                          <IconLink size={10} /> povezano
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-[12px] text-text-tertiary mt-1 truncate">
                    {t.counterparty} · {formatDate(t.date)} · {t.tag}
                  </div>
                </div>
                <div
                  className={[
                    "text-[15.5px] font-semibold tabular-nums whitespace-nowrap text-right shrink-0 tracking-tight",
                    isIn ? "text-success" : "text-text-primary",
                  ].join(" ")}
                >
                  {isIn ? "+" : ""}
                  {formatBAM(t.amount)}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
