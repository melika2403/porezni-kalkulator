"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getUserDetail } from "src/api/admin/adminDetail";
import { listActivity, type ActivityListResponse } from "src/api/activity";
import { unwrap } from "src/api/auth";
import styles from "./detail.module.css";

const TYPE_LABEL: Record<string, string> = {
  COMPANY: "d.o.o.",
  BUSINESS: "Obrt",
};

const ROLE_LABEL: Record<string, string> = {
  USER: "Korisnik",
  PRO: "Pro",
  BUSINESS: "Business",
  ADMIN: "Admin",
};

// plan pretplate uklj. office pakete (u bazi lowercase office_2..office_50)
const PLAN_LABEL: Record<string, string> = {
  free: "Besplatan",
  pro: "Pro",
  business: "Business",
  office_2: "Office Start (do 2 obrta)",
  office_10: "Office Tim (do 10 obrta)",
  office_25: "Office Agencija (do 25 obrta)",
  office_50: "Office Agencija+ (do 50 obrta)",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "–";
  const d = String(iso).slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}.` : "–";
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}. ${p(d.getHours())}:${p(d.getMinutes())}`;
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

export default function AdminUserDetail({ userId }: { userId: number }) {
  const userQ = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => unwrap(getUserDetail(userId)),
  });
  const activityQ = useQuery<ActivityListResponse>({
    queryKey: ["admin-user-activity", userId],
    queryFn: async () => {
      const r = await listActivity({ userId, limit: 50 });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const u = userQ.data;
  const activity = activityQ.data?.items ?? [];

  if (userQ.isLoading) {
    return <div className={styles.loading}>Učitavanje...</div>;
  }
  if (!u) {
    return <div className={styles.loading}>Korisnik nije pronađen.</div>;
  }

  const sub = u.subscription;

  return (
    <div className={styles.page}>
      <Link href="/admin/korisnici" className={styles.back}>
        ← Svi korisnici
      </Link>

      <div className={styles.head}>
        <div>
          <div className={styles.title}>
            {u.firstName} {u.lastName}
          </div>
          <div className={styles.subtitle}>{u.email}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className={`${styles.badge} ${styles.badgeSage}`}>{u.role}</span>
          {/* PK Office se ne vidi iz role (rola ostaje npr. BUSINESS):
              trial/paket dobijaju vlastiti bedž da se odmah primijeti */}
          {u.pkOffice?.trialAktivan && (
            <span
              className={`${styles.badge} ${styles.badgeAmber}`}
              title={`Office trial do ${fmtDate(u.pkOffice.trialEndsAt)}`}
            >
              Office trial
            </span>
          )}
          {u.pkOffice?.plan && (
            <span className={`${styles.badge} ${styles.badgeSage}`}>
              {u.pkOffice.planNaziv ?? u.pkOffice.plan}
            </span>
          )}
          <span
            className={`${styles.badge} ${
              u.isEmailVerified ? styles.badgeGreen : styles.badgeAmber
            }`}
          >
            {u.isEmailVerified ? "verifikovan" : "neverifikovan"}
          </span>
        </div>
      </div>

      <div className={styles.countsRow}>
        <div className={styles.countCard}>
          <div className={styles.countLabel}>Organizacije</div>
          <div className={styles.countValue}>{u.organizations.length}</div>
        </div>
        <div className={styles.countCard}>
          <div className={styles.countLabel}>Dokumenti</div>
          <div className={styles.countValue}>{u.counts.forms}</div>
        </div>
        <div className={styles.countCard}>
          <div className={styles.countLabel}>Fakture</div>
          <div className={styles.countValue}>{u.counts.invoices}</div>
        </div>
      </div>

      {/* Podaci */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>Podaci korisnika</div>
        </div>
        <div className={styles.card}>
          <div className={styles.infoGrid}>
            <Info label="Ime i prezime" value={`${u.firstName} ${u.lastName}`} />
            <Info label="E-mail" value={u.email} />
            <Info label="Telefon" value={u.phone} />
            <Info
              label="Adresa"
              value={[u.address, u.city].filter(Boolean).join(", ")}
            />
            <Info label="Uloga" value={ROLE_LABEL[u.role] ?? u.role} />
            <Info label="Registracija" value={fmtDate(u.createdAt)} />
            <Info
              label="Trial iskorišten"
              value={u.trialUsedAt ? fmtDate(u.trialUsedAt) : "ne"}
            />
            <Info label="Izvor (UTM)" value={u.utmSource} />
            <Info label="Kampanja (UTM)" value={u.utmCampaign} />
          </div>
        </div>
      </div>

      {/* Pretplata */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>Pretplata</div>
        </div>
        <div className={styles.card}>
          {sub ? (
            <div className={styles.infoGrid}>
              <Info
                label="Plan"
                value={
                  PLAN_LABEL[String(sub.plan ?? "").toLowerCase()] ?? sub.plan
                }
              />
              <Info
                label="Ciklus"
                value={
                  sub.billingCycle === "monthly"
                    ? "Mjesečno"
                    : sub.billingCycle === "yearly"
                      ? "Godišnje"
                      : sub.billingCycle
                }
              />
              <Info label="Od" value={fmtDate(sub.startDate)} />
              <Info label="Do" value={fmtDate(sub.endDate)} />
              <Info label="Aktivna" value={sub.isActive ? "da" : "ne"} />
              <Info label="Trial" value={sub.isTrial ? "da" : "ne"} />
            </div>
          ) : (
            <div className={styles.empty}>Korisnik nema pretplatu.</div>
          )}
        </div>
      </div>

      {/* PK Office */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>PK Office</div>
        </div>
        <div className={styles.card}>
          {u.pkOffice?.hasOffice || (u.pkOffice?.aktivnihObrta ?? 0) > 0 ? (
            <div className={styles.infoGrid}>
              <Info
                label="Pristup"
                value={
                  u.pkOffice.plan
                    ? (u.pkOffice.planNaziv ?? u.pkOffice.plan)
                    : u.pkOffice.trialAktivan
                      ? "Probni period (Office Tim)"
                      : "istekao"
                }
              />
              <Info
                label="Office trial"
                value={
                  u.pkOffice.trialEndsAt
                    ? `${u.pkOffice.trialAktivan ? "aktivan do" : "istekao"} ${fmtDate(u.pkOffice.trialEndsAt)}`
                    : "nije korišten"
                }
              />
              <Info
                label="Aktivirani obrti (granica)"
                value={`${u.pkOffice.aktivnihObrta}${
                  u.pkOffice.maxObrta != null
                    ? ` / ${u.pkOffice.maxObrta}`
                    : ""
                }`}
              />
            </div>
          ) : (
            <div className={styles.empty}>
              Korisnik ne koristi PK Office
              {u.pkOffice?.trialEndsAt
                ? ` (trial istekao ${fmtDate(u.pkOffice.trialEndsAt)})`
                : " (trial nije korišten)"}
              .
            </div>
          )}
        </div>
      </div>

      {/* Organizacije */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>
            Organizacije ({u.organizations.length})
          </div>
        </div>
        <div className={styles.card}>
          {u.organizations.length === 0 ? (
            <div className={styles.empty}>Korisnik nema organizacija.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Naziv</th>
                  <th>Tip</th>
                  <th>Uloga</th>
                  <th>PK Office</th>
                </tr>
              </thead>
              <tbody>
                {u.organizations.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link
                        href={`/admin/organizacije/${o.id}`}
                        className={styles.orgLink}
                      >
                        {o.name}
                      </Link>
                      {o.isClientOrg ? " (klijent)" : ""}
                    </td>
                    <td>{TYPE_LABEL[o.type] ?? o.type}</td>
                    <td>{o.role}</td>
                    <td>
                      {o.pkOfficeEnabled
                        ? `aktiviran${o.pkOfficeActivatedAt ? ` (${fmtDate(o.pkOfficeActivatedAt)})` : ""}`
                        : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Aktivnost */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionTitle}>Posljednja aktivnost</div>
        </div>
        <div className={styles.card}>
          {activity.length === 0 ? (
            <div className={styles.empty}>Nema zabilježene aktivnosti.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vrijeme</th>
                  <th>Akcija</th>
                  <th>Organizacija</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDateTime(a.createdAt)}</td>
                    <td>{a.label || a.action}</td>
                    <td>{a.organization?.name ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
