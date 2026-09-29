"use client";

// Admin lista SVIH pretplata: paket, period, status, office slotovi.
// Ovdje se paket i DODJELJUJE (uklj. office_2/10/25/50): po emailu korisnika,
// sa ciklusom i početkom; endDate backend računa iz ciklusa. Office paketi ne
// diraju rolu korisnika (effectiveRole ih diže na BUSINESS), a broj slotova u
// PK Office slijedi iz paketa (OFFICE_PLANS.maxObrta), ništa se ne podešava.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import DateInput from "src/components/DateInput/DateInput";
import {
  getAdminSubscriptions,
  type AdminSubscription,
} from "src/api/adminSubscriptions";
import { getUsers, upsertSubscription } from "src/api/profile";
import { toggleRenewalTrial } from "src/api/renewals";
import { unwrap } from "src/api/auth";
import { mnozina } from "src/lib/format";
import styles from "../obnove/obnove.module.css";

const PLAN_OPTIONS = [
  { value: "PRO", label: "Pro" },
  { value: "BUSINESS", label: "Business" },
  { value: "office_1", label: "Office Solo (1 obrt)" },
  { value: "office_2", label: "Office Start (do 2 obrta)" },
  { value: "office_10", label: "Office Tim (do 10 obrta)" },
  { value: "office_25", label: "Office Agencija (do 25 obrta)" },
  { value: "office_50", label: "Office Agencija+ (do 50 obrta)" },
  { value: "freelancer", label: "PK Freelancer (50 KM godišnje)" },
];

const PLAN_LABEL: Record<string, string> = {
  free: "Besplatno",
  pro: "Pro",
  business: "Business",
  office_1: "Office Solo",
  office_2: "Office Start",
  office_10: "Office Tim",
  office_25: "Office Agencija",
  office_50: "Office Agencija+",
  freelancer: "PK Freelancer",
};

function planLabel(plan: string | null) {
  if (!plan) return "–";
  return PLAN_LABEL[plan.toLowerCase()] ?? plan;
}

function planBadgeClass(plan: string | null) {
  const p = (plan ?? "").toLowerCase();
  if (p.startsWith("office")) return styles.planOffice;
  if (p === "freelancer") return styles.planFreelancer;
  if (p === "business") return styles.planBusiness;
  if (p === "pro") return styles.planPro;
  return styles.planUser;
}

// Probe (Office Tim, Office Solo, PK Freelancer) su odvojene oznake: svaka
// nosi boju svog proizvoda, da se u listi na prvi pogled razlikuju.
const PROBA_OZNAKA: Record<
  NonNullable<AdminSubscription["proba"]>,
  { label: string; cls: string }
> = {
  office: { label: "Office trial", cls: "planTrialSoft" },
  office_solo: { label: "Office Solo trial", cls: "planTrialSolo" },
  freelancer: { label: "Freelancer trial", cls: "planFreelancerTrial" },
};

// Paket za prikaz: pravi plan iz pretplate; za stare zapise (plan prazan ili
// "free" a rola PRO/BUSINESS, dodijeljeno prije uvođenja planova) izvedi iz role.
function paketOd(s: AdminSubscription): string | null {
  const p = (s.plan ?? "").toLowerCase();
  if (p && p !== "free") return p;
  const r = (s.user?.role ?? "").toUpperCase();
  if (r === "PRO" || r === "BUSINESS") return r.toLowerCase();
  return null;
}

function formatDate(iso: string | null) {
  if (!iso) return "–";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}.` : "–";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nextDay(iso: string) {
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// planovi koje backend prihvata pri dodjeli; "free" (trial) se ne šalje,
// produženje takvog reda samo pomjera period (produži trial)
const ASSIGNABLE_PLAN = /^(pro|business|freelancer|office_(1|2|10|25|50))$/i;

function istekla(s: AdminSubscription) {
  if (!s.isActive) return true;
  if (!s.endDate) return false;
  return String(s.endDate).slice(0, 10) < todayIso();
}

export default function AdminAktivnePretplate() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "aktivne" | "istekle">(
    "aktivne",
  );
  const [planFilter, setPlanFilter] = useState("");

  const query = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => unwrap(getAdminSubscriptions()),
  });

  const items = useMemo(() => {
    let rows = query.data ?? [];
    if (statusFilter === "aktivne") rows = rows.filter((s) => !istekla(s));
    if (statusFilter === "istekle") rows = rows.filter(istekla);
    if (planFilter === "office") {
      rows = rows.filter((s) => (paketOd(s) ?? "").startsWith("office"));
    } else if (planFilter === "proba") {
      rows = rows.filter((s) => !!s.proba);
    } else if (planFilter) {
      rows = rows.filter((s) => (paketOd(s) ?? "") === planFilter);
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (s) =>
          (s.user?.name ?? "").toLowerCase().includes(needle) ||
          (s.user?.email ?? "").toLowerCase().includes(needle),
      );
    }
    return rows;
  }, [query.data, statusFilter, planFilter, q]);

  // ── dodjela / produženje paketa po emailu ─────────────────────────────────
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("office_10");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [start, setStart] = useState(todayIso());
  const [assignMsg, setAssignMsg] = useState<string | null>(null);
  const [assignErr, setAssignErr] = useState<string | null>(null);

  const assign = useMutation({
    mutationFn: async () => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) throw new Error("Unesi email korisnika.");
      const res = await unwrap(getUsers({ email: trimmed, limit: 5 }));
      const user = (res.items ?? []).find(
        (u) => (u.email ?? "").toLowerCase() === trimmed,
      );
      if (!user) throw new Error("Korisnik sa tim emailom nije pronađen.");
      await unwrap(
        upsertSubscription(user.id, {
          plan,
          billingCycle: cycle,
          startDate: start,
          isActive: true,
        }),
      );
      return user;
    },
    onSuccess: (user: { firstName?: string; lastName?: string }) => {
      setAssignErr(null);
      setAssignMsg(
        `Paket ${planLabel(plan)} dodijeljen: ${[user.firstName, user.lastName].filter(Boolean).join(" ")}.`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => {
      setAssignMsg(null);
      setAssignErr(e.message || "Greška pri dodjeli paketa.");
    },
  });

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Pretplate</h1>
            <div className={styles.meta}>
              Sve pretplate (izvor istine: subscriptions, ne predračuni). Office
              paketi ne mijenjaju rolu korisnika; broj slotova u PK Office
              slijedi iz paketa. Najbrži tok: Predračuni → Aktiviraj pretplatu.
            </div>
          </div>
        </div>

        {/* dodjela paketa */}
        <div className={styles.assignBox}>
          <div>
            <label className={styles.fieldLabel}>Email korisnika</label>
            <input
              className={styles.input}
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="korisnik@email.ba"
              style={{ minWidth: 220 }}
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>Paket</label>
            <StyledSelect
              value={plan}
              onChange={(v) => setPlan(String(v))}
              ariaLabel="Paket"
              groups={[{ options: PLAN_OPTIONS }]}
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>Ciklus</label>
            <StyledSelect
              value={cycle}
              onChange={(v) => setCycle(v === "monthly" ? "monthly" : "yearly")}
              ariaLabel="Ciklus"
              groups={[
                {
                  options: [
                    { value: "monthly", label: "Mjesečno" },
                    { value: "yearly", label: "Godišnje" },
                  ],
                },
              ]}
            />
          </div>
          <div className={styles.dateField}>
            <label className={styles.fieldLabel}>Početak</label>
            {/* uvijek DD.MM.GGGG. format (standard projekta), ne native date */}
            <DateInput
              className={styles.input}
              value={start}
              onValueChange={setStart}
            />
          </div>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={assign.isPending}
            onClick={() => assign.mutate()}
          >
            {assign.isPending ? "Dodjeljujem…" : "Dodijeli / produži"}
          </button>
          {assignMsg && <span className={styles.assignMsg}>{assignMsg}</span>}
          {assignErr && <span className={styles.errorMsg}>{assignErr}</span>}
        </div>

        {/* filteri */}
        <div className={styles.filtersRow}>
          <div>
            <label className={styles.fieldLabel}>Pretraga</label>
            <input
              className={styles.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ime ili email"
              style={{ minWidth: 200 }}
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>Status</label>
            <StyledSelect
              value={statusFilter}
              onChange={(v) =>
                setStatusFilter(v === "aktivne" || v === "istekle" ? v : "")
              }
              ariaLabel="Status"
              groups={[
                {
                  options: [
                    { value: "aktivne", label: "Aktivne" },
                    { value: "istekle", label: "Istekle / neaktivne" },
                    { value: "", label: "Sve" },
                  ],
                },
              ]}
            />
          </div>
          <div>
            <label className={styles.fieldLabel}>Paket</label>
            <StyledSelect
              value={planFilter}
              onChange={(v) => setPlanFilter(String(v ?? ""))}
              ariaLabel="Paket filter"
              groups={[
                {
                  options: [
                    { value: "", label: "Svi paketi" },
                    { value: "pro", label: "Pro" },
                    { value: "business", label: "Business" },
                    { value: "office", label: "PK Office (svi)" },
                    { value: "office_1", label: "Office Solo" },
                    { value: "office_2", label: "Office Start" },
                    { value: "office_10", label: "Office Tim" },
                    { value: "office_25", label: "Office Agencija" },
                    { value: "office_50", label: "Office Agencija+" },
                    { value: "freelancer", label: "PK Freelancer" },
                    { value: "proba", label: "Samo probe" },
                  ],
                },
              ]}
            />
          </div>
          <div className={styles.summary} style={{ marginLeft: "auto" }}>
            <span className={styles.summaryValue}>{items.length}</span>
            <span className={styles.summaryLabel}>
              {(() => {
                const probe = items.filter((s) => s.proba).length;
                if (!probe) return "pretplata";
                return `${mnozina(items.length, "red", "reda", "redova")} (${items.length - probe} ${mnozina(items.length - probe, "pretplata", "pretplate", "pretplata")}, ${probe} ${mnozina(probe, "proba", "probe", "proba")})`;
              })()}
            </span>
          </div>
        </div>

        {query.isLoading ? (
          <div className={styles.empty}>Učitavanje…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>Nema pretplata za izabrane filtere.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Korisnik</th>
                  <th>Paket</th>
                  <th>Ciklus</th>
                  <th>Period</th>
                  <th>PK Office slotovi</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <SubRow
                    // isti korisnik može imati paket, Office probu i Freelancer
                    // probu istovremeno (tri reda), pa ključ mora nositi i vrstu
                    key={`${s.proba ?? "paket"}-${s.userId}`}
                    s={s}
                    onChanged={() =>
                      queryClient.invalidateQueries({
                        queryKey: ["admin-subscriptions"],
                      })
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

function SubRow({
  s,
  onChanged,
}: {
  s: AdminSubscription;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const paket = paketOd(s);
  // Poseban PK Office limit obrta (dogovor van cjenovnika, npr. 100 po
  // cijeni Agencija+ paketa). null = forma zatvorena.
  const [limitForma, setLimitForma] = useState<string | null>(null);

  const snimiLimit = useMutation({
    mutationFn: async () => {
      const t = (limitForma ?? "").trim();
      const n = t === "" ? null : Number(t);
      if (n !== null && (!Number.isInteger(n) || n < 1 || n > 1000)) {
        throw new Error("Limit mora biti cijeli broj 1-1000, ili prazno.");
      }
      await unwrap(upsertSubscription(s.userId, { officeMaxObrta: n }));
    },
    onSuccess: () => {
      setError(null);
      setLimitForma(null);
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  const produzi = useMutation({
    mutationFn: async () => {
      // kontinuitet: novi period kreće dan nakon isteka (ili danas ako je
      // pretplata već istekla); endDate backend računa iz ciklusa. Šalje se i
      // paket (za stare zapise izveden iz role) da se plan u bazi popuni.
      const end = s.endDate ? String(s.endDate).slice(0, 10) : null;
      const start = end && end >= todayIso() ? nextDay(end) : todayIso();
      await unwrap(
        upsertSubscription(s.userId, {
          startDate: start,
          billingCycle: s.billingCycle ?? "monthly",
          isActive: true,
          ...(paket && ASSIGNABLE_PLAN.test(paket) ? { plan: paket } : {}),
        }),
      );
    },
    onSuccess: () => {
      setError(null);
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  // stara/kriva oznaka triala (npr. kupio paket a bedž ostao): skini jednim klikom
  const skiniTrial = useMutation({
    mutationFn: async () => {
      const r = await toggleRenewalTrial(s.userId, false);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      setError(null);
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deaktiviraj = useMutation({
    mutationFn: () =>
      unwrap(upsertSubscription(s.userId, { isActive: false })),
    onSuccess: () => {
      setError(null);
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <tr>
      <td>
        <div className={styles.userName}>{s.user?.name || `#${s.userId}`}</div>
        <div className={styles.userContact}>{s.user?.email || "–"}</div>
      </td>
      <td>
        {s.proba ? (
          <span
            className={`${styles.planBadge} ${
              styles[PROBA_OZNAKA[s.proba].cls as keyof typeof styles] ?? ""
            }`}
            title="Probni period, ne pretplata: ističe sam, ništa se ne naplaćuje"
          >
            {PROBA_OZNAKA[s.proba].label}
          </span>
        ) : (
          <>
            <span className={`${styles.planBadge} ${planBadgeClass(paket)}`}>
              {paket ? planLabel(paket) : "Besplatno"}
            </span>
            {s.isTrial && <span className={styles.trialBadge}>Trial</span>}
          </>
        )}
      </td>
      <td>{s.billingCycle === "yearly" ? "godišnje" : s.billingCycle === "monthly" ? "mjesečno" : "–"}</td>
      <td>
        <div className={styles.expireDate}>
          {formatDate(s.startDate)} do {formatDate(s.endDate)}
        </div>
        <StatusPill s={s} />
      </td>
      <td>
        {s.officeSlotovi ? (
          <span className={styles.sentInfo}>
            {s.officeSlotovi.zauzeto} / {s.officeSlotovi.max} obrta
            {s.officeSlotovi.poseban && (
              <span
                className={styles.trialBadge}
                style={{ marginLeft: 6 }}
                title="Poseban dogovor: individualni limit umjesto limita paketa"
              >
                poseban
              </span>
            )}
          </span>
        ) : (
          <span className={styles.notSent}>–</span>
        )}
        {s.officeSlotovi && limitForma !== null && (
          <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
            <input
              value={limitForma}
              onChange={(e) => setLimitForma(e.target.value.replace(/\D/g, ""))}
              placeholder={`paket: ${s.officeSlotovi.max}`}
              inputMode="numeric"
              style={{
                width: 90,
                padding: "0.3rem 0.5rem",
                border: "1px solid var(--border, #d4cfc4)",
                borderRadius: 6,
                fontSize: 12.5,
                fontFamily: "inherit",
              }}
            />
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={snimiLimit.isPending}
              onClick={() => snimiLimit.mutate()}
              title="Prazno polje skida poseban limit i vraća limit paketa"
            >
              {snimiLimit.isPending ? "…" : "Sačuvaj"}
            </button>
            <button
              type="button"
              className={styles.trialChip}
              onClick={() => setLimitForma(null)}
            >
              Otkaži
            </button>
          </div>
        )}
        {error && <div className={styles.errorMsg}>{error}</div>}
      </td>
      <td className={styles.actionCol}>
        {/* Proba nije pretplata: nema šta da se produžava ni deaktivira, pa red
            stoji samo kao informacija dok proba traje. */}
        {s.proba ? (
          <span className={styles.sentInfo}>trial, ističe sam</span>
        ) : (
        <div className={styles.actionStack}>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={produzi.isPending}
            onClick={() => produzi.mutate()}
            title="Produži za jedan ciklus (mjesec/godina) od isteka"
          >
            {produzi.isPending ? "Produžavam…" : "Produži"}
          </button>
          {s.isTrial && (
            <button
              type="button"
              className={styles.trialChip}
              disabled={skiniTrial.isPending}
              onClick={() => skiniTrial.mutate()}
              title="Skini trial oznaku (npr. kad je korisnik u međuvremenu kupio paket)"
            >
              {skiniTrial.isPending ? "…" : "Skini trial"}
            </button>
          )}
          {s.isActive && (
            <button
              type="button"
              className={styles.trialChip}
              disabled={deaktiviraj.isPending}
              onClick={() => deaktiviraj.mutate()}
            >
              {deaktiviraj.isPending ? "…" : "Deaktiviraj"}
            </button>
          )}
          {s.officeSlotovi && limitForma === null && (
            <button
              type="button"
              className={styles.trialChip}
              onClick={() =>
                setLimitForma(
                  s.officeSlotovi?.poseban ? String(s.officeSlotovi.max) : "",
                )
              }
              title="Poseban dogovor: individualni limit obrta umjesto limita paketa (npr. 100 po cijeni Agencija+)"
            >
              Limit obrta
            </button>
          )}
        </div>
        )}
      </td>
    </tr>
  );
}

// Statusna boja perioda: crveno = istekla/neaktivna, žuto = ističe uskoro,
// zeleno = aktivna. Da se lista može skenirati pogledom.
function StatusPill({ s }: { s: AdminSubscription }) {
  if (!s.isActive) {
    return (
      <span className={`${styles.pill} ${styles.pillExpired}`}>neaktivna</span>
    );
  }
  const end = s.endDate ? String(s.endDate).slice(0, 10) : null;
  if (!end) {
    return <span className={`${styles.pill} ${styles.pillOk}`}>aktivna</span>;
  }
  const days = Math.round(
    (new Date(`${end}T00:00:00`).getTime() -
      new Date(`${todayIso()}T00:00:00`).getTime()) /
      86400000,
  );
  if (days < 0) {
    return (
      <span className={`${styles.pill} ${styles.pillExpired}`}>
        istekla prije {-days} d
      </span>
    );
  }
  if (days <= 14) {
    return (
      <span className={`${styles.pill} ${styles.pillSoon}`}>
        ističe za {days} d
      </span>
    );
  }
  return <span className={`${styles.pill} ${styles.pillOk}`}>aktivna</span>;
}
