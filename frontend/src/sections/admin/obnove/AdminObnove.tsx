"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import {
  getExpiringRenewals,
  sendRenewalReminder,
  toggleRenewalTrial,
  type RenewalsResponse,
  type RenewalItem,
} from "src/api/renewals";
import styles from "./obnove.module.css";

// Paket se određuje po ROLI korisnika (izvor istine, kao u Korisnici/Finansije).
// subscription.plan je nepouzdan (stara baza zna držati "free").
const ROLE_LABELS: Record<string, string> = {
  USER: "Besplatno",
  PRO: "Pro",
  BUSINESS: "Business",
  ADMIN: "Admin",
};

// Boje paketa kao u ostatku panela: Pro = tamno zelena, Business = plava.
const ROLE_BADGE_CLASS: Record<string, string> = {
  USER: "planUser",
  PRO: "planPro",
  BUSINESS: "planBusiness",
  ADMIN: "planAdmin",
};

function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()}. ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

function daysLeftLabel(d: number) {
  if (d < 0) return `Isteklo prije ${Math.abs(d)} d`;
  if (d === 0) return "Ističe danas";
  if (d === 1) return "Ističe sutra";
  return `Za ${d} dana`;
}

function daysLeftClass(d: number) {
  if (d < 0) return styles.pillExpired;
  if (d <= 7) return styles.pillSoon;
  return styles.pillOk;
}

export default function AdminObnove() {
  const [days, setDays] = useState(30);
  const queryClient = useQueryClient();

  const query = useQuery<RenewalsResponse>({
    queryKey: ["renewals", days],
    queryFn: async () => {
      const r = await getExpiringRenewals(days);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });

  const items = query.data?.items ?? [];

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Obnove</h1>
            <div className={styles.meta}>
              Pretplate koje ističu u izabranom prozoru. Sve već istekle ostaju
              prikazane na vrhu dok ih ne riješite. Pošaljite podsjetnik jednim
              klikom.
            </div>
          </div>
          <div className={styles.daysPicker}>
            <label className={styles.fieldLabel}>Prozor</label>
            <select
              className={styles.select}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Narednih 7 dana</option>
              <option value={14}>Narednih 14 dana</option>
              <option value={30}>Narednih 30 dana</option>
              <option value={60}>Narednih 60 dana</option>
              <option value={90}>Narednih 90 dana</option>
              <option value={180}>Narednih 180 dana</option>
              <option value={365}>Narednih 365 dana</option>
            </select>
          </div>
        </div>

        <div className={styles.summary}>
          <span className={styles.summaryValue}>{items.length}</span>
          <span className={styles.summaryLabel}>
            pretplata u ovom prozoru
          </span>
        </div>

        {query.isLoading ? (
          <div className={styles.empty}>Učitavanje…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            Nema pretplata koje ističu u izabranom prozoru.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Korisnik</th>
                  <th>Plan</th>
                  <th>Ističe</th>
                  <th>Podsjetnik</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <RenewalRow
                    key={it.userId}
                    item={it}
                    onSent={() =>
                      queryClient.invalidateQueries({ queryKey: ["renewals"] })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

function RenewalRow({
  item,
  onSent,
}: {
  item: RenewalItem;
  onSent: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: async () => {
      const r = await sendRenewalReminder(item.userId);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      setError(null);
      onSent();
    },
    onError: (e: Error) => setError(e.message),
  });

  const trial = useMutation({
    mutationFn: async () => {
      const r = await toggleRenewalTrial(item.userId, !item.isTrial);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      setError(null);
      onSent();
    },
    onError: (e: Error) => setError(e.message),
  });

  const sentAt = formatDateTime(item.reminderSentAt);

  return (
    <tr>
      <td>
        <div className={styles.userName}>{item.name}</div>
        <div className={styles.userContact}>
          {item.email || "–"}
          {item.phone ? ` · ${item.phone}` : ""}
        </div>
      </td>
      <td>
        <span
          className={`${styles.planBadge} ${
            styles[ROLE_BADGE_CLASS[item.role] as keyof typeof styles] ?? ""
          }`}
        >
          {ROLE_LABELS[item.role] ?? item.role}
        </span>
        {item.isTrial && <span className={styles.trialBadge}>Trial</span>}
      </td>
      <td>
        <div className={styles.expireDate}>{formatDate(item.endDate)}</div>
        <span className={`${styles.pill} ${daysLeftClass(item.daysLeft)}`}>
          {daysLeftLabel(item.daysLeft)}
        </span>
      </td>
      <td>
        {sentAt ? (
          <span className={styles.sentInfo} title={`Poslano ${sentAt}`}>
            Poslano {sentAt}
          </span>
        ) : (
          <span className={styles.notSent}>Nije slano</span>
        )}
        {error && <div className={styles.errorMsg}>{error}</div>}
      </td>
      <td className={styles.actionCol}>
        <div className={styles.actionStack}>
          <button
            className={styles.btnPrimary}
            type="button"
            onClick={() => send.mutate()}
            disabled={send.isPending || !item.email}
            title={!item.email ? "Korisnik nema email" : "Pošalji podsjetnik"}
          >
            {send.isPending
              ? "Šaljem…"
              : item.reminderSentAt
                ? "Pošalji ponovo"
                : "Pošalji podsjetnik"}
          </button>
          <button
            type="button"
            className={`${styles.trialChip} ${
              item.isTrial ? styles.trialChipActive : ""
            }`}
            onClick={() => trial.mutate()}
            disabled={trial.isPending}
            title={
              item.isTrial
                ? "Skini oznaku probnog perioda"
                : "Označi kao probni period (trial)"
            }
          >
            {trial.isPending
              ? "…"
              : item.isTrial
                ? "Na trialu ✓"
                : "Označi kao trial"}
          </button>
        </div>
      </td>
    </tr>
  );
}
