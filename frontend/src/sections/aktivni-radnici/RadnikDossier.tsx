"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EvidencijaModal from "src/sections/organizacije/EvidencijaModal";
import {
  deleteWorkerDocument,
  getAllMyWorkers,
  listWorkerDocuments,
  workerDocumentDownloadUrl,
  type WorkerDocument,
  type WorkerDocumentType,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import styles from "./aktivniRadnici.module.css";
import { parseJmbg } from "src/utils/jmbg";
import { useNotice } from "src/components/Notice/Notice";

const DOC_TYPE_LABEL: Record<WorkerDocumentType, string> = {
  UGOVOR: "Ugovor o radu",
  OTKAZ: "Otkaz ugovora",
  JS3100_PRIJAVA: "JS3100 prijava",
  JS3100_ODJAVA: "JS3100 odjava",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}.`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtKm(n: number | null): string {
  if (n == null) return "–";
  return (
    n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
    " KM"
  );
}

function fmtSize(b: number | null): string {
  if (b == null) return "–";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

const STATUS_LABEL: Record<string, string> = {
  PRIJAVLJEN: "Prijavljen",
  DRAFT: "Draft",
  ODJAVLJEN: "Odjavljen",
};

const STATUS_CLASS: Record<string, string> = {
  PRIJAVLJEN: styles.badgeActive,
  DRAFT: styles.badgeDraft,
  ODJAVLJEN: styles.badgeInactive,
};

export default function RadnikDossier({ workerId }: { workerId: number }) {
  const queryClient = useQueryClient();
  const { confirm: confirmDialog } = useNotice();
  const [evidencijaOpen, setEvidencijaOpen] = useState(false);

  const workersQuery = useQuery({
    queryKey: ["allMyWorkers"],
    queryFn: () => unwrap(getAllMyWorkers()),
  });

  const worker = workersQuery.data?.find((w) => w.id === workerId);

  const docsQuery = useQuery({
    queryKey: ["workerDocuments", workerId],
    queryFn: () => unwrap(listWorkerDocuments(workerId)),
    enabled: !!worker,
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: number) => unwrap(deleteWorkerDocument(docId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workerDocuments", workerId] });
    },
  });

  if (workersQuery.isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.empty}>Učitavam…</div>
      </main>
    );
  }

  if (!worker) {
    return (
      <main className={styles.page}>
        <Link href="/aktivni-radnici" className={styles.actionLink}>
          ← Nazad na listu
        </Link>
        <div className={styles.empty} style={{ marginTop: "1.5rem" }}>
          Radnik nije pronađen ili nemate pristup.
        </div>
      </main>
    );
  }

  const docs = docsQuery.data ?? [];
  const jmbgInfo = worker.jmbg ? parseJmbg(worker.jmbg) : null;

  return (
    <main className={styles.page}>
      <Link href="/aktivni-radnici" className={styles.backLink}>
        ← Nazad na listu radnika
      </Link>

      <div className={styles.dossierHeader}>
        <div>
          <p className={styles.label}>{worker.organizationName}</p>
          <h1 className={styles.h1}>
            {worker.firstName} <em>{worker.lastName}</em>
          </h1>
          <div className={styles.dossierMeta}>
            <span
              className={`${styles.badge} ${
                STATUS_CLASS[worker.employmentStatus] ?? styles.badgeDraft
              }`}
            >
              {STATUS_LABEL[worker.employmentStatus] ?? worker.employmentStatus}
            </span>
            {worker.position && <span>{worker.position}</span>}
            {worker.contractType && (
              <span>
                {worker.contractType === "NEODREDJENO" ? "Neodređeno" : "Određeno"}
                {worker.contractType === "ODREDJENO" && worker.contractEndDate
                  ? ` do ${fmtDate(worker.contractEndDate)}`
                  : ""}
              </span>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <Link
            href={`/ugovor-o-radu?org=${worker.organizationId}&worker=${worker.id}&tab=ugovor`}
            className={styles.btnPrimary}
          >
            📄 Generiši ugovor
          </Link>
          {worker.employmentStatus === "PRIJAVLJEN" && (
            <Link
              href={`/ugovor-o-radu?org=${worker.organizationId}&worker=${worker.id}&tab=otkaz`}
              className={styles.actionLink}
            >
              ❌ Otkaz
            </Link>
          )}
          <Link
            href={`/prijave-radnika?org=${worker.organizationId}&worker=${worker.id}&vrsta=${
              worker.employmentStatus === "PRIJAVLJEN" ? "ODJAVA" : "PRIJAVA"
            }`}
            className={styles.actionLink}
          >
            📋 JS3100
          </Link>
          <button
            type="button"
            className={styles.actionLink}
            style={{ border: "none", cursor: "pointer", fontFamily: "inherit" }}
            onClick={() => setEvidencijaOpen(true)}
            title="Matična evidencija o radniku (Sl. nov. FBiH 92/16)"
          >
            📒 Evidencija
          </button>
          <Link href={`/organizacija/${worker.organizationId}`} className={styles.actionLink}>
            ✏️ Uredi
          </Link>
        </div>
      </div>

      {evidencijaOpen && (
        <EvidencijaModal
          orgId={worker.organizationId}
          orgName={worker.organizationName}
          initialWorkerId={worker.id}
          lockWorkerName={`${worker.firstName} ${worker.lastName}`}
          onClose={() => setEvidencijaOpen(false)}
        />
      )}

      {/* Info grid */}
      <div className={styles.infoGrid}>
        <InfoBlock title="Lični podaci">
          <Row label="JMBG" value={worker.jmbg ?? "–"} />
          <Row label="Datum rođenja" value={fmtDate(jmbgInfo?.birthDateIso ?? null)} />
          <Row label="Spol" value={worker.spol === "M" ? "Muški" : worker.spol === "Z" ? "Ženski" : "–"} />
          <Row label="Adresa" value={worker.address ?? "–"} />
          <Row label="Grad" value={worker.city ?? "–"} />
          <Row label="Email" value={worker.email ?? "–"} />
          <Row label="Žiro" value={worker.bankAccount ?? "–"} />
        </InfoBlock>

        <InfoBlock title="Ugovor o radu">
          <Row label="Broj ugovora" value={worker.contractNumber ?? "–"} />
          <Row label="Pozicija" value={worker.position ?? "–"} />
          <Row label="Bruto plata" value={fmtKm(worker.salaryBruto)} />
          <Row label="Neto plata" value={fmtKm(worker.salaryNeto)} />
          <Row label="Probni rad" value={worker.probationMonths ? `${worker.probationMonths} mj.` : "–"} />
          <Row label="Otkazni rok" value={worker.noticePeriod ?? "–"} />
        </InfoBlock>

        <InfoBlock title="Radni odnos">
          <Row label="Datum početka rada" value={fmtDate(worker.startDate)} />
          <Row label="Datum prijave" value={fmtDate(worker.prijavaDate)} />
          <Row label="Datum odjave" value={fmtDate(worker.odjavaDate)} />
          <Row label="Kraj radnog odnosa" value={fmtDate(worker.endDate)} />
        </InfoBlock>
      </div>

      {/* Dokumenti */}
      <h2 className={styles.sectionH2}>Generisani dokumenti</h2>
      <div className={styles.tableWrap}>
        {docsQuery.isLoading ? (
          <div className={styles.empty}>Učitavam dokumente…</div>
        ) : docs.length === 0 ? (
          <div className={styles.empty}>
            Još nema generisanih dokumenata za ovog radnika.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tip</th>
                <th>Broj</th>
                <th>Format</th>
                <th>Veličina</th>
                <th>Datum</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d: WorkerDocument) => (
                <tr key={d.id}>
                  <td className={styles.nameCell}>{DOC_TYPE_LABEL[d.type]}</td>
                  <td className={styles.muted}>{d.number ?? "–"}</td>
                  <td>{d.format}</td>
                  <td className={styles.muted}>{fmtSize(d.sizeBytes)}</td>
                  <td className={styles.muted}>{fmtDateTime(d.createdAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      <a
                        href={workerDocumentDownloadUrl(d.id)}
                        className={styles.actionLink}
                        download
                      >
                        ⬇ Preuzmi
                      </a>
                      <button
                        type="button"
                        className={styles.actionLink}
                        style={{ background: "#fee2e2", color: "#991b1b" }}
                        onClick={async () => {
                          const ok = await confirmDialog(
                            `Izbrisati dokument "${d.originalName}"?`,
                          );
                          if (ok) deleteMutation.mutate(d.id);
                        }}
                      >
                        🗑 Briši
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.infoBlock}>
      <h3 className={styles.infoTitle}>{title}</h3>
      <dl className={styles.infoList}>{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
