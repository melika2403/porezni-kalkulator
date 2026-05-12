"use client";

import Link from "next/link";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconFileInvoice,
  IconAlertCircle,
  IconCircleCheck,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";

const MOCK_TRANSACTIONS = [
  { id: 1, date: "2026-05-08", desc: "Faktura 0042/2026 — Lagermax", amount: 1240.5, dir: "in" as const },
  { id: 2, date: "2026-05-07", desc: "Mjesečna provizija banke", amount: -8.5, dir: "out" as const },
  { id: 3, date: "2026-05-06", desc: "Studio Ena", amount: 480.0, dir: "in" as const },
  { id: 4, date: "2026-05-05", desc: "Akontacija PIO maj", amount: -213.8, dir: "out" as const },
];

const MOCK_OBLIGATIONS = [
  { id: 1, due: "2026-05-15", title: "Akontacija doprinosa za maj", status: "pending" as const },
  { id: 2, due: "2026-05-20", title: "PDV prijava — april", status: "pending" as const },
  { id: 3, due: "2026-05-31", title: "GPD-1051 dopuna", status: "pending" as const },
  { id: 4, due: "2026-04-30", title: "Akontacija doprinosa za april", status: "done" as const },
];

type DeltaType = "up" | "warn" | undefined;

function MetricCard({
  label,
  value,
  delta,
  deltaType,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaType?: DeltaType;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="group bg-cream-100 border border-cream-300 rounded-xl p-6 hover:bg-white hover:border-brand-600/20 transition-colors">
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
      <div className="font-serif-display text-[32px] leading-[1.05] text-text-primary tabular-nums truncate mb-2">
        {value}
      </div>
      {delta && (
        <div
          className={[
            "text-[12px] leading-4 font-medium",
            deltaType === "up"
              ? "text-success"
              : deltaType === "warn"
                ? "text-warning"
                : "text-text-tertiary",
          ].join(" ")}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  subtitle,
  link,
  children,
}: {
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-cream-300">
        <div className="min-w-0">
          <h3 className="font-serif-display text-[22px] leading-tight text-text-primary truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[12.5px] leading-5 text-text-tertiary mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {link && (
          <Link
            href={link.href}
            className="text-[12.5px] leading-5 font-medium text-brand-700 hover:text-brand-600 shrink-0 self-center"
          >
            {link.label}
          </Link>
        )}
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { data } = usePkOfficeMe();
  const firstName = data?.firstName?.trim();
  const greeting = firstName ? `Dobar dan, ${firstName}` : "Dobar dan";

  const now = new Date();
  const MONTHS = [
    "Januar", "Februar", "Mart", "April", "Maj", "Juni",
    "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
  ];
  const period = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="px-8 py-10 lg:px-14 lg:py-14 max-w-[1440px] mx-auto">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-100 text-brand-700 text-[11.5px] font-medium tracking-[0.04em] border border-brand-600/15 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
          {period}
        </div>
        <h1 className="font-serif-display text-[clamp(2.4rem,4.5vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
          {greeting}<span className="text-brand-600" style={{ fontStyle: "italic" }}>.</span>
        </h1>
        <p className="text-[15px] leading-7 text-text-tertiary mt-4 max-w-xl">
          Evo brzog pregleda tvog obrta za ovaj mjesec. Sve cifre su uživo iz povezanih izvora.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Prilivi"
          value={formatBAM(8420.5)}
          icon={IconArrowDownLeft}
          iconBg="bg-success-bg"
          iconColor="text-success"
          delta="+12% od prošlog mjeseca"
          deltaType="up"
        />
        <MetricCard
          label="Odlivi"
          value={formatBAM(3175.2)}
          icon={IconArrowUpRight}
          iconBg="bg-cream-200"
          iconColor="text-text-secondary"
          delta="ovaj mjesec"
        />
        <MetricCard
          label="Otvorene fakture"
          value="6"
          icon={IconFileInvoice}
          iconBg="bg-info-bg"
          iconColor="text-info"
          delta={`${formatBAM(2840)} ukupno`}
        />
        <MetricCard
          label="Nepovezane transakcije"
          value="12"
          icon={IconAlertCircle}
          iconBg="bg-warning-bg"
          iconColor="text-warning"
          delta="treba pregled"
          deltaType="warn"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card
          title="Posljednje transakcije"
          subtitle="4 stavke ovaj tjedan"
          link={{ href: "/app/transakcije", label: "Sve →" }}
        >
          <ul>
            {MOCK_TRANSACTIONS.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3.5 px-3 py-3 rounded-lg hover:bg-cream-200/60 transition cursor-pointer"
              >
                <span
                  className={[
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    t.dir === "in"
                      ? "bg-success-bg text-success"
                      : "bg-cream-200 text-text-secondary",
                  ].join(" ")}
                >
                  {t.dir === "in" ? (
                    <IconArrowDownLeft size={18} />
                  ) : (
                    <IconArrowUpRight size={18} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] leading-5 font-medium text-text-primary truncate">
                    {t.desc}
                  </div>
                  <div className="text-[11.5px] leading-4 text-text-tertiary mt-0.5">
                    {formatDate(t.date)}
                  </div>
                </div>
                <div
                  className={[
                    "text-[14px] leading-5 font-semibold tabular-nums whitespace-nowrap shrink-0",
                    t.dir === "in" ? "text-success" : "text-text-primary",
                  ].join(" ")}
                >
                  {t.dir === "in" ? "+" : ""}
                  {formatBAM(t.amount)}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Predstojeće obaveze"
          subtitle="3 na čekanju · 1 završeno"
          link={{ href: "/app/obrasci", label: "Sve →" }}
        >
          <ul>
            {MOCK_OBLIGATIONS.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3.5 px-3 py-3 rounded-lg hover:bg-cream-200/60 transition cursor-pointer"
              >
                <span
                  className={[
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    o.status === "done"
                      ? "bg-success-bg text-success"
                      : "bg-warning-bg text-warning",
                  ].join(" ")}
                >
                  {o.status === "done" ? (
                    <IconCircleCheck size={18} />
                  ) : (
                    <IconAlertCircle size={18} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] leading-5 font-medium text-text-primary truncate">
                    {o.title}
                  </div>
                  <div className="text-[11.5px] leading-4 text-text-tertiary mt-0.5">
                    rok {formatDate(o.due)}
                  </div>
                </div>
                <span
                  className={[
                    "text-[10.5px] leading-4 font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full shrink-0",
                    o.status === "done"
                      ? "bg-success-bg text-success"
                      : "bg-warning-bg text-warning",
                  ].join(" ")}
                >
                  {o.status === "done" ? "gotovo" : "čeka"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
