"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  getWorkers,
  getEvidencija,
  saveEvidencija,
  downloadEvidencijaPdf,
  type Worker,
} from "src/api/profile";
import DateInput from "src/components/DateInput/DateInput";
import styles from "./organizacije.module.css";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EvidencijaModal({
  orgId,
  orgName,
  orgType = "COMPANY",
  ownerEmployed = true,
  initialWorkerId,
  lockWorkerName,
  onClose,
}: {
  orgId: number;
  orgName: string;
  orgType?: "COMPANY" | "BUSINESS";
  // d.o.o. vlasnik je u radnom odnosu samo kao prijavljeni direktor (opcija 1).
  ownerEmployed?: boolean;
  // Kad se otvori za konkretnog radnika (npr. iz njegovog dossiera): pretodabran
  // radnik i sakriven padajući izbornik (prikazuje se ime kao oznaka).
  initialWorkerId?: number;
  lockWorkerName?: string;
  onClose: () => void;
}) {
  const workersQ = useQuery({
    queryKey: ["workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId)),
  });
  const locked = initialWorkerId != null;
  const [workerId, setWorkerId] = useState<number | null>(
    initialWorkerId ?? null,
  );

  const evidQ = useQuery({
    queryKey: ["evidencija", orgId, workerId],
    queryFn: () => unwrap(getEvidencija(orgId, workerId as number)),
    enabled: workerId != null,
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  // Portal na body da modal ne bude zarobljen u stacking kontekstu reda
  // (inače navbar prelazi preko njega).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ISO (YYYY-MM-DD) → DD.MM.GGGG za prikaz.
  const fmtDot = (iso: string | null) => {
    if (!iso) return "";
    const [y, m, d] = String(iso).slice(0, 10).split("-");
    return y && m && d ? `${d}.${m}.${y}.` : String(iso);
  };

  useEffect(() => {
    if (evidQ.data) {
      const f: Record<string, string> = {};
      for (const e of evidQ.data.editable) f[e.key] = e.value;
      setForm(f);
      setSaved(false);
    }
  }, [evidQ.data]);

  // Radnici: svi RADNIK; plus d.o.o. vlasnik AKO je prijavljeni direktor
  // (opcija 1, u radnom odnosu). Obrt-vlasnik i d.o.o. opcije 2/3/4 se izuzimaju
  // (nisu zaposlenici, pa nemaju matičnu evidenciju).
  const workers = useMemo(() => {
    const ws = (workersQ.data ?? []).filter(
      (w) =>
        w.role === "RADNIK" ||
        (w.role === "VLASNIK" && orgType === "COMPANY" && ownerEmployed),
    );
    return [...ws].sort((a, b) => {
      const ao = a.employmentStatus === "ODJAVLJEN" ? 1 : 0;
      const bo = b.employmentStatus === "ODJAVLJEN" ? 1 : 0;
      if (ao !== bo) return ao - bo;
      return `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
        "bs",
      );
    });
  }, [workersQ.data, orgType, ownerEmployed]);

  const saveMut = useMutation({
    mutationFn: () => unwrap(saveEvidencija(orgId, workerId as number, form)),
    onSuccess: () => {
      setSaved(true);
      evidQ.refetch();
    },
  });

  // PDF: snimi trenutni unos pa preuzmi (da PDF odgovara prikazu).
  const pdfMut = useMutation({
    mutationFn: async () => {
      await unwrap(saveEvidencija(orgId, workerId as number, form));
      const r = await downloadEvidencijaPdf(
        orgId,
        workerId as number,
        evidQ.data?.workerName ?? "",
      );
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: (r) => {
      setSaved(true);
      triggerDownload(r.blob, r.filename);
    },
  });

  const setField = (k: string, v: string) => {
    setSaved(false);
    setForm((p) => ({ ...p, [k]: v }));
  };

  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: "#7a8a7d",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  };
  if (!mounted) return null;

  const overlay = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 26, 18, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          width: "min(760px, 100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "1.4rem 1.6rem",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "0.3rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: 20, margin: 0 }}>Matična evidencija o radnicima</h2>
            <p style={{ fontSize: 13, color: "#666", margin: "0.2rem 0 0" }}>
              {orgName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori"
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "#7a8a7d",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ margin: "0.9rem 0" }}>
          <label style={label}>Radnik</label>
          {locked ? (
            <div
              style={{
                marginTop: 4,
                padding: "0.55rem 0.75rem",
                background: "#f3efe6",
                border: "1px solid #ede8db",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: "#0f1a12",
              }}
            >
              {lockWorkerName || evidQ.data?.workerName || "Radnik"}
            </div>
          ) : (
            <select
              className={styles.input}
              style={{ marginTop: 4, width: "100%" }}
              value={workerId ?? ""}
              onChange={(e) =>
                setWorkerId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Izaberi radnika</option>
              {workers.map((w: Worker) => (
                <option key={w.id} value={w.id}>
                  {w.firstName} {w.lastName}
                  {w.role === "VLASNIK" ? " (vlasnik/direktor)" : ""}
                  {w.employmentStatus === "ODJAVLJEN" ? " (odjavljen)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {workerId == null ? (
          <p style={{ color: "#666", fontSize: 13 }}>
            Izaberite radnika da otvorite njegovu evidenciju.
          </p>
        ) : evidQ.isLoading ? (
          <p style={{ color: "#666" }}>Učitavam…</p>
        ) : evidQ.data ? (
          <>
            {/* Pregled svih 24 stavke */}
            <div
              style={{
                border: "1px solid #ede8db",
                borderRadius: 10,
                padding: "0.5rem 0.8rem",
                marginBottom: "1rem",
              }}
            >
              {evidQ.data.items.map((it) => (
                <div
                  key={it.n}
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    padding: "0.3rem 0",
                    borderBottom: "1px solid #f3efe6",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#999", minWidth: 18 }}>{it.n}.</span>
                  <span style={{ flex: 1, color: "#555" }}>{it.label}</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>
                    {it.value || "–"}
                  </span>
                </div>
              ))}
            </div>

            {/* Dopuna podataka (čuva se u evidenciji, ne dira radnika) */}
            <p style={{ ...label, marginBottom: 6 }}>
              Dopuni / izmijeni podatke
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.7rem",
              }}
            >
              {evidQ.data.editable.map((f) => (
                <div key={f.key}>
                  <label style={{ ...label, fontSize: 10.5 }}>{f.label}</label>
                  {f.type === "date" ? (
                    <div style={{ marginTop: 3 }}>
                      <DateInput
                        value={form[f.key] ?? ""}
                        onValueChange={(iso) => setField(f.key, iso)}
                        className={styles.input}
                      />
                    </div>
                  ) : (
                    <input
                      className={styles.input}
                      style={{ marginTop: 3, width: "100%" }}
                      type="text"
                      value={form[f.key] ?? ""}
                      placeholder={f.placeholder || ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "1.2rem",
                gap: "0.6rem",
              }}
            >
              <span style={{ fontSize: 12, color: "#7a8a7d" }}>
                {evidQ.data.zadnjaIzmjena
                  ? `Zadnja izmjena: ${fmtDot(evidQ.data.zadnjaIzmjena)}`
                  : ""}
              </span>
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                {saved && (
                  <span style={{ fontSize: 13, color: "#3a5c42" }}>Sačuvano</span>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: "none",
                    border: "1px solid #d4cfc4",
                    borderRadius: 8,
                    padding: "0.55rem 1rem",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Zatvori
                </button>
                <button
                  type="button"
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending}
                  style={{
                    background: "none",
                    border: "1px solid #d4cfc4",
                    borderRadius: 8,
                    padding: "0.55rem 1rem",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {saveMut.isPending ? "Snimam…" : "Sačuvaj"}
                </button>
                <button
                  type="button"
                  onClick={() => pdfMut.mutate()}
                  disabled={pdfMut.isPending}
                  style={{
                    background: "#3a5c42",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "0.55rem 1.2rem",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {pdfMut.isPending ? "Pripremam…" : "Preuzmi PDF"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: "#b3261e" }}>Greška pri učitavanju evidencije.</p>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
