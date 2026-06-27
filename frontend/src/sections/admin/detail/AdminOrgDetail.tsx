"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getOrgDetail,
  getOrgWorkers,
  getOrgPayrolls,
  getOrgDocuments,
  adminDownloadUrl,
} from "src/api/admin/adminDetail";
import { unwrap } from "src/api/auth";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import styles from "./detail.module.css";

const MJESECI = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const TYPE_LABEL: Record<string, string> = {
  COMPANY: "d.o.o.",
  BUSINESS: "Obrt",
};
const PAYROLL_STATUS: Record<string, string> = {
  DRAFT: "Nacrt",
  OBRACUNATO: "Obračunato",
  ISPLACENO: "Isplaćeno",
};

function fmt(n: number) {
  return Number(n || 0)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "–";
  const d = String(iso).slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}.` : "–";
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  const empty =
    value == null || value === "" || (typeof value === "string" && !value.trim());
  return (
    <div className={styles.infoItem}>
      <div className={styles.infoLabel}>{label}</div>
      <div className={styles.infoValue}>{empty ? "–" : value}</div>
    </div>
  );
}

export default function AdminOrgDetail({ orgId }: { orgId: number }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | null>(null);

  const detailQ = useQuery({
    queryKey: ["admin-org-detail", orgId],
    queryFn: () => unwrap(getOrgDetail(orgId)),
  });
  const workersQ = useQuery({
    queryKey: ["admin-org-workers", orgId],
    queryFn: () => unwrap(getOrgWorkers(orgId)),
  });
  const payrollsQ = useQuery({
    queryKey: ["admin-org-payrolls", orgId, year, month],
    queryFn: () => unwrap(getOrgPayrolls(orgId, year, month ?? undefined)),
    placeholderData: (p) => p,
  });
  const docsQ = useQuery({
    queryKey: ["admin-org-docs", orgId],
    queryFn: () => unwrap(getOrgDocuments(orgId)),
  });

  const org = detailQ.data;
  const workers = workersQ.data?.items ?? [];
  const payrolls = payrollsQ.data;
  const docs = docsQ.data;
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  if (detailQ.isLoading) {
    return <div className={styles.loading}>Učitavanje...</div>;
  }
  if (!org) {
    return <div className={styles.loading}>Organizacija nije pronađena.</div>;
  }

  return (
    <div className={styles.page}>
      <Link href="/admin/organizacije" className={styles.back}>
        ← Sve organizacije
      </Link>

      <div className={styles.head}>
        <div>
          <div className={styles.title}>{org.name}</div>
          <div className={styles.subtitle}>
            {[
              org.taxNumber ? `JIB ${org.taxNumber}` : null,
              org.pdvNumber ? `PDV ${org.pdvNumber}` : null,
              [org.address, org.city].filter(Boolean).join(", ") || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span className={`${styles.badge} ${styles.badgeNeutral}`}>
            {TYPE_LABEL[org.type] ?? org.type}
          </span>
          {org.isClientOrg && (
            <span className={`${styles.badge} ${styles.badgeBlue}`}>klijent</span>
          )}
        </div>
      </div>

      <div className={styles.countsRow}>
        <div className={styles.countCard}>
          <div className={styles.countLabel}>Radnici</div>
          <div className={styles.countValue}>{org.counts.workers}</div>
        </div>
        <div className={styles.countCard}>
          <div className={styles.countLabel}>Obračuni</div>
          <div className={styles.countValue}>{org.counts.payrolls}</div>
        </div>
        <div className={styles.countCard}>
          <div className={styles.countLabel}>Dokumenti</div>
          <div className={styles.countValue}>{org.counts.forms}</div>
        </div>
        <div className={styles.countCard}>
          <div className={styles.countLabel}>Fakture</div>
          <div className={styles.countValue}>{org.counts.invoices}</div>
        </div>
      </div>

      {/* Podaci */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>Podaci firme</div>
        </div>
        <div className={styles.card}>
          <div className={styles.infoGrid}>
            <Info label="Naziv" value={org.name} />
            <Info label="Tip" value={TYPE_LABEL[org.type] ?? org.type} />
            <Info label="JIB / porezni broj" value={org.taxNumber} />
            <Info label="PDV broj" value={org.pdvNumber} />
            <Info
              label="Djelatnost"
              value={[org.activityCode, org.activityName]
                .filter(Boolean)
                .join(" ")}
            />
            <Info label="E-mail" value={org.email} />
            <Info label="Telefon" value={org.phone} />
            <Info label="Adresa" value={org.address} />
            <Info label="Grad" value={org.city} />
            <Info label="Žiro račun" value={org.bankAccount} />
            <Info label="Režim oporezivanja" value={org.taxRegime} />
            <Info
              label="Topli obrok / dan"
              value={
                org.mealAllowancePerDay != null
                  ? `${fmt(org.mealAllowancePerDay)} KM`
                  : null
              }
            />
            <Info
              label="Vlasnik"
              value={
                org.owner
                  ? `${org.owner.firstName} ${org.owner.lastName}`
                  : null
              }
            />
            <Info
              label="Kreirao"
              value={
                org.createdBy
                  ? `${org.createdBy.firstName} ${org.createdBy.lastName} (${org.createdBy.email ?? "–"})`
                  : null
              }
            />
            <Info label="Kreirano" value={fmtDate(org.createdAt)} />
          </div>
        </div>
      </div>

      {/* Radnici */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>Radnici ({workers.length})</div>
        </div>
        <div className={styles.card}>
          {workers.length === 0 ? (
            <div className={styles.empty}>Nema unesenih radnika.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ime</th>
                  <th>Uloga</th>
                  <th>Pozicija</th>
                  <th>Status</th>
                  <th className={styles.num}>Plata</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id}>
                    <td>
                      {w.firstName} {w.lastName}
                    </td>
                    <td>{w.role === "VLASNIK" ? "Vlasnik" : "Radnik"}</td>
                    <td>{w.position || "–"}</td>
                    <td>{w.employmentStatus}</td>
                    <td className={styles.num}>
                      {w.salaryBruto != null
                        ? `${fmt(w.salaryBruto)} bruto`
                        : w.salaryNeto != null
                          ? `${fmt(w.salaryNeto)} neto`
                          : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Obračuni plata */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>Obračuni plata</div>
          <StyledSelect
            value={year}
            onChange={(v) => {
              setYear(Number(v));
              setMonth(null);
            }}
            ariaLabel="Godina"
            wrapStyle={{ minWidth: 140 }}
            groups={[
              {
                options: years.map((y) => ({ value: y, label: `${y}.` })),
              },
            ]}
          />
        </div>

        <div className={styles.monthGrid} style={{ marginBottom: "0.9rem" }}>
          {MJESECI.map((name, i) => {
            const m = i + 1;
            const data = payrolls?.byMonth.find((x) => x.month === m);
            const has = !!data && data.count > 0;
            return (
              <button
                key={m}
                type="button"
                disabled={!has}
                className={`${styles.monthBtn} ${
                  month === m ? styles.monthBtnActive : ""
                } ${!has ? styles.monthBtnEmpty : ""}`}
                onClick={() => has && setMonth(month === m ? null : m)}
              >
                <div className={styles.monthName}>{name}</div>
                <div className={styles.monthMeta}>
                  {has
                    ? `${data!.count} obr. · ${fmt(data!.costSum)} KM`
                    : "nema"}
                </div>
              </button>
            );
          })}
        </div>

        {month && payrolls?.items && payrolls.items.length > 0 && (
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Radnik</th>
                  <th>Status</th>
                  <th className={styles.num}>Bruto</th>
                  <th className={styles.num}>Doprinosi (iz)</th>
                  <th className={styles.num}>Porez</th>
                  <th className={styles.num}>Neto</th>
                  <th className={styles.num}>Topli obrok</th>
                  <th className={styles.num}>Ukupan trošak</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.workerName}</td>
                    <td>{PAYROLL_STATUS[p.status] ?? p.status}</td>
                    <td className={styles.num}>{fmt(p.gross)}</td>
                    <td className={styles.num}>{fmt(p.empTotal)}</td>
                    <td className={styles.num}>{fmt(p.incomeTax)}</td>
                    <td className={styles.num}>{fmt(p.net)}</td>
                    <td className={styles.num}>{fmt(p.mealAllowance)}</td>
                    <td className={styles.num}>{fmt(p.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
              {payrolls.summary && (
                <tfoot className={styles.tfoot}>
                  <tr>
                    <td colSpan={2}>Ukupno ({payrolls.items.length})</td>
                    <td className={styles.num}>{fmt(payrolls.summary.gross)}</td>
                    <td className={styles.num}>
                      {fmt(payrolls.summary.empTotal)}
                    </td>
                    <td className={styles.num}>
                      {fmt(payrolls.summary.incomeTax)}
                    </td>
                    <td className={styles.num}>{fmt(payrolls.summary.net)}</td>
                    <td className={styles.num}></td>
                    <td className={styles.num}>
                      {fmt(payrolls.summary.totalCost)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        {!month && (
          <div className={styles.empty} style={{ padding: "0.6rem 0" }}>
            Izaberite mjesec za prikaz pojedinačnih obračuna.
          </div>
        )}
      </div>

      {/* Dokumenti */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>Dokumenti</div>
        </div>
        <div className={styles.card}>
          {!docs ||
          (docs.forms.length === 0 &&
            docs.payrollDocuments.length === 0 &&
            docs.workerDocuments.length === 0) ? (
            <div className={styles.empty}>Nema sačuvanih dokumenata.</div>
          ) : (
            <div className={styles.docList}>
              {docs.workerDocuments.length > 0 && (
                <div className={styles.groupLabel}>Ugovori i prijave</div>
              )}
              {docs.workerDocuments.map((d) => (
                <div key={`w${d.id}`} className={styles.docRow}>
                  <div className={styles.docMain}>
                    <div className={styles.docName}>
                      {d.type}
                      {d.number ? ` ${d.number}` : ""}
                    </div>
                    <div className={styles.docMeta}>
                      {d.originalName} · {d.format}
                    </div>
                  </div>
                  <a
                    className={styles.docLink}
                    href={adminDownloadUrl(d.downloadUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Preuzmi
                  </a>
                </div>
              ))}

              {docs.payrollDocuments.length > 0 && (
                <div className={styles.groupLabel}>
                  Platne liste i uplatnice
                </div>
              )}
              {docs.payrollDocuments.map((d) => (
                <div key={`p${d.id}`} className={styles.docRow}>
                  <div className={styles.docMain}>
                    <div className={styles.docName}>{d.type}</div>
                    <div className={styles.docMeta}>
                      {d.originalName}
                      {d.period ? ` · ${d.period}` : ""}
                    </div>
                  </div>
                  <a
                    className={styles.docLink}
                    href={adminDownloadUrl(d.downloadUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Preuzmi
                  </a>
                </div>
              ))}

              {docs.forms.length > 0 && (
                <div className={styles.groupLabel}>Obrasci</div>
              )}
              {docs.forms.map((f) => (
                <div key={`f${f.id}`} className={styles.docRow}>
                  <div className={styles.docMain}>
                    <div className={styles.docName}>
                      {f.type}
                      {f.title ? ` · ${f.title}` : ""}
                    </div>
                    <div className={styles.docMeta}>
                      {[
                        f.status,
                        f.month && f.year
                          ? `${String(f.month).padStart(2, "0")}/${f.year}`
                          : f.year,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  {f.pdfUrl ? (
                    <a
                      className={styles.docLink}
                      href={f.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Otvori
                    </a>
                  ) : (
                    <span className={styles.docMeta}>bez PDF-a</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
