"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import {
  getAdminDashboard,
  getAdminEngagement,
  type AdminDashboard,
  type AdminEngagement,
} from "src/api/adminDashboard";
import styles from "./dashboard.module.css";

const ACTION_LABELS: Record<string, string> = {
  AMS_GENERATE: "AMS-1035",
  SPR_GENERATE: "SPR-1053",
  GPD_GENERATE: "GPD-1051",
  ZO3_GENERATE: "ZO3",
  PLDI_GENERATE: "Amortizacija",
  SIH_GENERATE: "Šihterica",
  JS3100_GENERATE: "JS3100",
  PLATA_GENERATE: "Obračun plata",
  UGOVOR_RADU_GENERATE: "Ugovor o radu",
  OTKAZ_GENERATE: "Otkaz",
  UGOVOR_DJELU_GENERATE: "Ugovor o djelu",
  UGOVOR_POZAJMICA_GENERATE: "Ugovor o pozajmici",
  FAKTURA_GENERATE: "Faktura",
  PREDRACUN_GENERATE: "Predračun",
  KARTICA_GENERATE: "Članska kartica",
};

function km(n: number) {
  return `${n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} KM`;
}

function yearOptions() {
  const now = new Date().getFullYear();
  const out: number[] = [];
  for (let y = now + 1; y >= 2026; y--) out.push(y);
  return out;
}

export default function AdminDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());

  const q = useQuery<AdminDashboard>({
    queryKey: ["admin-dashboard", year],
    queryFn: async () => {
      const r = await getAdminDashboard(year);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const d = q.data;

  const eng = useQuery<AdminEngagement>({
    queryKey: ["admin-engagement"],
    queryFn: async () => {
      const r = await getAdminEngagement();
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Pregled</h1>
            <div className={styles.meta}>
              {q.isFetching ? "Učitavanje…" : "Stanje biznisa na jednom mjestu."}
            </div>
          </div>
          <div className={styles.yearPicker}>
            <label className={styles.fieldLabel}>Godina</label>
            <select
              className={styles.select}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Finansije (godina) */}
        <div className={styles.kpiRow}>
          <Kpi label="Ukupno zarađeno" value={km(d?.finance.totalEarned ?? 0)} accent="earn" />
          <Kpi label="Ukupno uloženo" value={km(d?.finance.totalInvested ?? 0)} accent="spend" />
          <Kpi
            label="Profit"
            value={km(d?.finance.profit ?? 0)}
            accent={(d?.finance.profit ?? 0) >= 0 ? "profit" : "loss"}
          />
        </div>

        {/* Recurring (MRR/ARR/churn) */}
        <div className={styles.kpiRow}>
          <Kpi label="MRR (mjesečni recurring)" value={km(d?.recurring.mrr ?? 0)} accent="earn" />
          <Kpi label="ARR (godišnji recurring)" value={km(d?.recurring.arr ?? 0)} accent="profit" />
          <Kpi
            label="Odljev pretplata (30 dana)"
            value={`${d?.recurring.churned30 ?? 0} · ${d?.recurring.churnRate ?? 0}%`}
            accent={(d?.recurring.churnRate ?? 0) > 0 ? "loss" : "spend"}
          />
        </div>

        {/* Pretplate + korisnici */}
        <div className={styles.grid}>
          <Panel title="Pretplate">
            <Headline value={d?.subscriptions.active ?? 0} label="Aktivne pretplate" />
            <MetricList>
              <Metric label="PRO" value={d?.subscriptions.pro ?? 0} />
              <Metric label="BUSINESS" value={d?.subscriptions.business ?? 0} />
              <Metric label="Mjesečne" value={d?.subscriptions.byCycle.monthly ?? 0} />
              <Metric label="Godišnje" value={d?.subscriptions.byCycle.yearly ?? 0} />
            </MetricList>
            {d?.subscriptions.expiringSoon ? (
              <Link href="/admin/obnove" className={styles.warn}>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {d.subscriptions.expiringSoon} ističe u 30 dana
              </Link>
            ) : (
              <Link href="/admin/korisnici" className={styles.panelLink}>
                Upravljaj korisnicima →
              </Link>
            )}
          </Panel>

          <Panel title="Korisnici">
            <Headline value={d?.users.total ?? 0} label="Ukupno korisnika" />
            <MetricList>
              <Metric label="Novih (30 dana)" value={d?.users.new30 ?? 0} />
              <Metric label="Verifikovani" value={d?.users.verified ?? 0} />
              <Metric label="Organizacije" value={d?.orgs.total ?? 0} />
              <Metric label="Radnici" value={d?.orgs.workers ?? 0} />
            </MetricList>
          </Panel>

          <Panel title="Predračuni (pretplate)">
            <Headline
              value={km(d?.predracuni.paidAmount ?? 0)}
              label="Naplaćeno (plaćeni predračuni)"
            />
            <MetricList>
              <Metric label="Izdato" value={d?.predracuni.byStatus.ISSUED ?? 0} />
              <Metric label="Plaćeno" value={d?.predracuni.byStatus.PAID ?? 0} />
              <Metric label="Otkazano" value={d?.predracuni.byStatus.CANCELLED ?? 0} />
            </MetricList>
            <Link href="/admin/pretplate" className={styles.panelLink}>
              Svi predračuni →
            </Link>
          </Panel>

          <Panel title="Aktivnost (30 dana)">
            <Headline
              value={d?.activity.last30 ?? 0}
              label="Generisano dokumenata"
            />
            <MetricList>
              {(d?.activity.topActions ?? []).map((a) => (
                <Metric
                  key={a.action}
                  label={ACTION_LABELS[a.action] ?? a.action}
                  value={a.count}
                />
              ))}
            </MetricList>
            {(d?.activity.topActions?.length ?? 0) === 0 && (
              <span className={styles.muted}>Nema aktivnosti.</span>
            )}
            <Link href="/admin/aktivnost" className={styles.panelLink}>
              Detaljan pregled →
            </Link>
          </Panel>
        </div>

        {/* Trial konverzija + mjesečni trend */}
        <section className={styles.trendSection}>
          <div className={styles.trendHeader}>
            <h2 className={styles.panelTitle}>Trend i konverzija ({year})</h2>
            <div className={styles.trialPill} title="Trial korisnici koji su prešli na plaćenu pretplatu">
              Trial → plaćeno:{" "}
              <strong>
                {d?.trials.converted ?? 0}/{d?.trials.started ?? 0}
              </strong>{" "}
              ({d?.trials.rate ?? 0}%)
            </div>
          </div>
          <div className={styles.charts}>
            <BarChart
              title="Registracije po mjesecima"
              data={d?.monthly.registrations ?? []}
            />
            <BarChart
              title="Prihod po mjesecima"
              data={d?.monthly.revenue ?? []}
              money
            />
          </div>
        </section>

        {/* Konverzioni lijevak */}
        <section className={styles.trendSection}>
          <h2 className={styles.panelTitle}>Konverzioni lijevak ({year})</h2>
          <p className={styles.muted} style={{ marginTop: "0.3rem" }}>
            Anonimno je broj generacija dokumenata (eventi), ne jedinstvenih
            posjetilaca.
          </p>
          <Funnel funnel={d?.funnel} />
        </section>

        {/* Akvizicija, CAC + registracije po izvoru */}
        <div className={styles.grid} style={{ marginTop: "1rem" }}>
          <Panel title="Akvizicija (CAC)">
            <Headline
              value={d?.acquisition.cac != null ? km(d.acquisition.cac) : "–"}
              label="Trošak po plaćenom korisniku"
            />
            <MetricList>
              <Metric
                label="Marketing trošak"
                value={km(d?.acquisition.marketingSpend ?? 0)}
              />
              <Metric label="Novih plaćenih" value={d?.acquisition.newPaid ?? 0} />
            </MetricList>
            <span className={styles.muted}>
              Trošak je zbir troškova kategorije Marketing za {year}.
            </span>
          </Panel>

          <Panel title="Registracije po izvoru">
            {(d?.acquisition.bySource?.length ?? 0) > 0 ? (
              <MetricList>
                {(d?.acquisition.bySource ?? []).map((s) => (
                  <Metric key={s.source} label={s.source} value={s.count} />
                ))}
              </MetricList>
            ) : (
              <span className={styles.muted}>
                Nema registracija u {year}.
              </span>
            )}
            <span className={styles.muted}>
              Izvor se hvata iz utm_source pri prvoj posjeti.
            </span>
          </Panel>
        </div>

        {/* Engagement, ko aktivno koristi, ko spava */}
        <div className={styles.grid} style={{ marginTop: "1rem" }}>
          <Panel title="Najaktivniji korisnici (90 dana)">
            {(eng.data?.topActive?.length ?? 0) > 0 ? (
              <div className={styles.engList}>
                {eng.data!.topActive.map((u, i) => (
                  <div key={u.userId} className={styles.engRow}>
                    <span className={styles.engRank}>{i + 1}.</span>
                    <div className={styles.engWho}>
                      <div className={styles.engName}>{u.name}</div>
                      <div className={styles.engSub}>
                        {u.role ?? "–"} · {u.documents} dok · {u.invoices} fakt
                      </div>
                    </div>
                    <span className={styles.engCount}>{u.events}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className={styles.muted}>
                {eng.isLoading ? "Učitavanje…" : "Nema aktivnosti."}
              </span>
            )}
            <span className={styles.muted}>
              Broj = aktivnosti (dokumenti + fakture) u 90 dana.
            </span>
          </Panel>

          <Panel title="Uspavani korisnici">
            <span className={styles.muted} style={{ marginBottom: "0.5rem" }}>
              Registrovani bez aktivnosti zadnjih 60 dana, kandidati za
              reaktivaciju.
            </span>
            {(eng.data?.dormant?.length ?? 0) > 0 ? (
              <MetricList>
                {eng.data!.dormant.map((u) => (
                  <Metric
                    key={u.userId}
                    label={`${u.name} · ${u.role}`}
                    value={fmtShortDate(u.createdAt)}
                  />
                ))}
              </MetricList>
            ) : (
              <span className={styles.muted}>
                {eng.isLoading ? "Učitavanje…" : "Nema uspavanih korisnika."}
              </span>
            )}
          </Panel>
        </div>
      </div>
    </RoleGuard>
  );
}

function fmtShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

const FUNNEL_STEPS: { key: "anonymous" | "registrations" | "trials" | "paid"; label: string; color: string }[] = [
  { key: "anonymous", label: "Anonimne generacije", color: "#a8a29a" },
  { key: "registrations", label: "Registracije", color: "#1f5a8c" },
  { key: "trials", label: "Trial pokrenut", color: "#8a6d1f" },
  { key: "paid", label: "Plaćeno (konvertovano)", color: "#2d6e54" },
];

function Funnel({ funnel }: { funnel?: AdminDashboard["funnel"] }) {
  const f = funnel ?? { anonymous: 0, registrations: 0, trials: 0, paid: 0 };
  const max = Math.max(1, f.anonymous, f.registrations, f.trials, f.paid);
  return (
    <div className={styles.funnel}>
      {FUNNEL_STEPS.map((step, i) => {
        const value = f[step.key];
        const prev = i > 0 ? f[FUNNEL_STEPS[i - 1].key] : null;
        const conv =
          prev && prev > 0 ? Math.round((value / prev) * 1000) / 10 : null;
        return (
          <div key={step.key} className={styles.funnelRow}>
            <div className={styles.funnelLabel}>{step.label}</div>
            <div className={styles.funnelBarTrack}>
              <div
                className={styles.funnelBar}
                style={{
                  width: `${Math.max((value / max) * 100, 2)}%`,
                  background: step.color,
                }}
              >
                <span className={styles.funnelValue}>{value}</span>
              </div>
            </div>
            <div className={styles.funnelConv}>
              {conv != null ? `${conv}%` : "–"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Avg", "Sep", "Okt", "Nov", "Dec",
];

function BarChart({
  title,
  data,
  money,
}: {
  title: string;
  data: number[];
  money?: boolean;
}) {
  const series = data.length === 12 ? data : Array(12).fill(0);
  const max = Math.max(1, ...series);
  const fmt = (v: number) => (money ? km(v) : String(v));
  return (
    <div className={styles.chart}>
      <div className={styles.chartTitle}>{title}</div>
      <div className={styles.bars}>
        {series.map((v, i) => (
          <div key={i} className={styles.barCol} title={`${MONTHS[i]}: ${fmt(v)}`}>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ height: `${Math.round((v / max) * 100)}%` }}
              />
            </div>
            <span className={styles.barLabel}>{MONTHS[i][0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "earn" | "spend" | "profit" | "loss";
}) {
  return (
    <div className={`${styles.kpi} ${styles[accent]}`}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Headline({ value, label }: { value: number | string; label: string }) {
  return (
    <div className={styles.headline}>
      <span className={styles.headlineValue}>{value}</span>
      <span className={styles.headlineLabel}>{label}</span>
    </div>
  );
}

function MetricList({ children }: { children: React.ReactNode }) {
  return <div className={styles.metricList}>{children}</div>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
    </div>
  );
}
