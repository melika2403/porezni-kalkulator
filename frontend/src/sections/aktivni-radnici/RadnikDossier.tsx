"use client";

// Karton radnika u PK Office stilu (podaci i akcije isti kao prije, samo
// dizajn): zaglavlje sa avatarom i statusom, brze akcije, info kartice,
// dokumenti. "Uredi" otvara punu PK formu radnika na licu mjesta.
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import EvidencijaModal from "src/sections/organizacije/EvidencijaModal";
import {
  deleteWorkerDocument,
  getAllMyWorkers,
  getOrganization,
  listWorkerDocuments,
  workerDocumentDownloadUrl,
  type WorkerDocument,
  type WorkerDocumentType,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import {
  IconArrowLeft,
  IconCalendar,
  IconClipboardList,
  IconCrown,
  IconDownload,
  IconFileText,
  IconNotebook,
  IconPencil,
  IconTrash,
  IconUserOff,
} from "@tabler/icons-react";
import styles from "./aktivniRadnici.module.css";
import "src/styles/pk-embed.css";
import { parseJmbg } from "src/utils/jmbg";
import { useNotice } from "src/components/Notice/Notice";
import { formatBAM, formatDate, formatDateTime } from "src/lib/format";
import { WorkerModal } from "src/sections/zaposlenici/WorkerModal";
import { WorkerStatusBadge } from "src/sections/zaposlenici/WorkersTable";

const DOC_TYPE_LABEL: Record<WorkerDocumentType, string> = {
  UGOVOR: "Ugovor o radu",
  OTKAZ: "Otkaz ugovora",
  JS3100_PRIJAVA: "JS3100 prijava",
  JS3100_ODJAVA: "JS3100 odjava",
  RJESENJE_GO: "Rješenje o godišnjem odmoru",
  RJESENJE_GO_SRAZMJERNI: "Rješenje o GO (srazmjerni)",
  ODLUKA_REGRES: "Odluka o isplati regresa",
  ODLUKA_PRIGODNA_NAGRADA: "Odluka o prigodnoj nagradi",
  RJESENJE_PLACENO_ODSUSTVO: "Rješenje o plaćenom odsustvu",
  RJESENJE_NEPLACENO_ODSUSTVO: "Rješenje o neplaćenom odsustvu",
  POTVRDA_ZAPOSLENJE: "Potvrda o zaposlenju",
  POTVRDA_PLATA: "Potvrda o visini primanja",
  POTVRDA_STAZ: "Potvrda o radnom stažu",
  ODLUKA_VOZILO: "Odluka o korištenju službenog vozila",
  ANEKS_UGOVORA: "Aneks ugovora o radu",
  ODLUKA_PROMJENA_PLATE: "Odluka o promjeni plate",
  UPOZORENJE_OTKAZ: "Upozorenje pred otkaz",
  RJESENJE_PORODILJSKO: "Rješenje o porodiljskom odsustvu",
  ODLUKA_OTPREMNINA: "Odluka o isplati otpremnine",
  ODLUKA_TOPLI_OBROK: "Odluka o pravu na topli obrok",
};

function fmtSize(b: number | null): string {
  if (b == null) return "–";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

const actionBtn =
  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-cream-300 bg-cream-100 text-[13px] font-medium text-text-primary hover:bg-cream-200 transition-colors";

export default function RadnikDossier({ workerId }: { workerId: number }) {
  const queryClient = useQueryClient();
  const { confirm: confirmDialog } = useNotice();
  const [evidencijaOpen, setEvidencijaOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const workersQuery = useQuery({
    queryKey: ["allMyWorkers"],
    queryFn: () => unwrap(getAllMyWorkers()),
  });

  const worker = workersQuery.data?.find((w) => w.id === workerId);

  // Tip organizacije treba punoj formi (obrt vlasnik nema ugovor/platu).
  const orgQuery = useQuery({
    queryKey: ["pk-org", worker?.organizationId ?? null],
    queryFn: () => unwrap(getOrganization(worker!.organizationId)),
    enabled: !!worker,
  });

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
        <Link href="/aktivni-radnici" className={styles.backLink}>
          ← Nazad na listu radnika
        </Link>
        <div className={styles.empty} style={{ marginTop: "1.5rem" }}>
          Radnik nije pronađen ili nemate pristup.
        </div>
      </main>
    );
  }

  const docs = docsQuery.data ?? [];
  const jmbgInfo = worker.jmbg ? parseJmbg(worker.jmbg) : null;
  const initials =
    `${worker.firstName[0] ?? ""}${worker.lastName[0] ?? ""}`.toUpperCase();

  return (
    <main className={styles.page}>
      <div className="pk-scope space-y-5">
        <Link
          href="/aktivni-radnici"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:text-brand-600"
        >
          <IconArrowLeft size={15} />
          Nazad na listu radnika
        </Link>

        {/* Zaglavlje */}
        <div className="bg-cream-100 border border-cream-300 rounded-xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <span
                className={[
                  "w-14 h-14 rounded-full inline-flex items-center justify-center text-[19px] font-semibold shrink-0",
                  worker.role === "VLASNIK"
                    ? "bg-brand-600 text-white"
                    : "bg-brand-100 text-brand-700",
                ].join(" ")}
              >
                {initials}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] leading-4 font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
                  {worker.organizationName}
                </div>
                <h1 className="font-serif-display text-[26px] leading-8 text-text-primary">
                  {worker.firstName} {worker.lastName}
                </h1>
                <div className="flex items-center gap-2 flex-wrap mt-1.5 text-[12.5px] text-text-secondary">
                  <WorkerStatusBadge status={worker.employmentStatus} />
                  {worker.role === "VLASNIK" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-brand-100 text-brand-700">
                      <IconCrown size={11} /> vlasnik
                    </span>
                  )}
                  {worker.position && <span>{worker.position}</span>}
                  {worker.contractType && (
                    <span>
                      {worker.contractType === "NEODREDJENO"
                        ? "Neodređeno"
                        : "Određeno"}
                      {worker.contractType === "ODREDJENO" &&
                      worker.contractEndDate
                        ? ` do ${formatDate(worker.contractEndDate)}`
                        : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
            >
              <IconPencil size={15} />
              Uredi radnika
            </button>
          </div>

          {/* Brze akcije: generisanje dokumenata sa auto-popunom */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-cream-300">
            <Link
              href={`/ugovor-o-radu?org=${worker.organizationId}&worker=${worker.id}&tab=ugovor`}
              className={actionBtn}
            >
              <IconFileText size={15} className="text-brand-600" />
              Ugovor o radu
            </Link>
            {worker.employmentStatus === "PRIJAVLJEN" && (
              <Link
                href={`/ugovor-o-radu?org=${worker.organizationId}&worker=${worker.id}&tab=otkaz`}
                className={actionBtn}
              >
                <IconUserOff size={15} className="text-accent-500" />
                Otkaz
              </Link>
            )}
            <Link
              href={`/prijave-radnika?org=${worker.organizationId}&worker=${worker.id}&vrsta=${
                worker.employmentStatus === "PRIJAVLJEN" ? "ODJAVA" : "PRIJAVA"
              }`}
              className={actionBtn}
            >
              <IconClipboardList size={15} className="text-info" />
              JS3100
            </Link>
            <Link
              href={`/rjesenja-i-odluke?org=${worker.organizationId}&worker=${worker.id}`}
              className={actionBtn}
            >
              <IconCalendar size={15} className="text-success" />
              Godišnji odmor
            </Link>
            <button
              type="button"
              className={actionBtn}
              onClick={() => setEvidencijaOpen(true)}
              title="Matična evidencija o radniku (Sl. nov. FBiH 92/16)"
            >
              <IconNotebook size={15} className="text-text-secondary" />
              Evidencija
            </button>
          </div>
        </div>

        {/* Info kartice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoBlock title="Lični podaci">
            <Row label="JMBG" value={worker.jmbg ?? "–"} />
            <Row
              label="Datum rođenja"
              value={
                jmbgInfo?.birthDateIso ? formatDate(jmbgInfo.birthDateIso) : "–"
              }
            />
            <Row
              label="Spol"
              value={
                worker.spol === "M"
                  ? "Muški"
                  : worker.spol === "Z"
                    ? "Ženski"
                    : "–"
              }
            />
            <Row label="Adresa" value={worker.address ?? "–"} />
            <Row label="Grad" value={worker.city ?? "–"} />
            <Row label="Email" value={worker.email ?? "–"} />
            <Row label="Žiro" value={worker.bankAccount ?? "–"} />
          </InfoBlock>

          <InfoBlock title="Ugovor o radu">
            <Row label="Broj ugovora" value={worker.contractNumber ?? "–"} />
            <Row label="Pozicija" value={worker.position ?? "–"} />
            <Row
              label="Bruto plata"
              value={worker.salaryBruto != null ? formatBAM(worker.salaryBruto) : "–"}
            />
            <Row
              label="Neto plata"
              value={worker.salaryNeto != null ? formatBAM(worker.salaryNeto) : "–"}
            />
            <Row
              label="Probni rad"
              value={worker.probationMonths ? `${worker.probationMonths} mj.` : "–"}
            />
            <Row label="Otkazni rok" value={worker.noticePeriod ?? "–"} />
          </InfoBlock>

          <InfoBlock title="Radni odnos">
            <Row
              label="Datum početka rada"
              value={worker.startDate ? formatDate(worker.startDate) : "–"}
            />
            <Row
              label="Datum prijave"
              value={worker.prijavaDate ? formatDate(worker.prijavaDate) : "–"}
            />
            <Row
              label="Datum odjave"
              value={worker.odjavaDate ? formatDate(worker.odjavaDate) : "–"}
            />
            <Row
              label="Kraj radnog odnosa"
              value={worker.endDate ? formatDate(worker.endDate) : "–"}
            />
          </InfoBlock>
        </div>

        {/* Dokumenti */}
        <div className="bg-cream-100 border border-cream-300 rounded-xl p-5">
          <h2 className="text-[14px] leading-5 font-semibold text-text-primary mb-4">
            Generisani dokumenti
          </h2>
          {docsQuery.isLoading ? (
            <p className="text-[13px] text-text-tertiary">
              Učitavam dokumente…
            </p>
          ) : docs.length === 0 ? (
            <p className="text-[13px] text-text-tertiary">
              Još nema generisanih dokumenata za ovog radnika.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-text-tertiary">
                    <th className="py-2 font-semibold">Tip</th>
                    <th className="py-2 font-semibold">Broj</th>
                    <th className="py-2 font-semibold">Format</th>
                    <th className="py-2 font-semibold">Veličina</th>
                    <th className="py-2 font-semibold">Datum</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d: WorkerDocument) => (
                    <tr
                      key={d.id}
                      className="border-b border-cream-300/70 last:border-0"
                    >
                      <td className="py-3 font-medium text-text-primary">
                        {DOC_TYPE_LABEL[d.type]}
                      </td>
                      <td className="py-3 text-text-secondary whitespace-nowrap">
                        {d.number ?? "–"}
                      </td>
                      <td className="py-3 text-text-secondary">{d.format}</td>
                      <td className="py-3 text-text-secondary whitespace-nowrap">
                        {fmtSize(d.sizeBytes)}
                      </td>
                      <td className="py-3 text-text-secondary whitespace-nowrap">
                        {formatDateTime(d.createdAt)}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <a
                          href={workerDocumentDownloadUrl(d.id)}
                          download
                          title="Preuzmi"
                          className="inline-flex p-1.5 rounded-lg text-text-tertiary hover:bg-cream-200 hover:text-brand-600 transition-colors"
                        >
                          <IconDownload size={16} />
                        </a>
                        <button
                          type="button"
                          title="Obriši dokument"
                          onClick={async () => {
                            const ok = await confirmDialog(
                              `Izbrisati dokument "${d.originalName}"?`,
                            );
                            if (ok) deleteMutation.mutate(d.id);
                          }}
                          className="inline-flex p-1.5 rounded-lg text-text-tertiary hover:bg-cream-200 hover:text-accent-500 transition-colors"
                        >
                          <IconTrash size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {editOpen && (
        <div className="pk-scope">
          <WorkerModal
            key={worker.id}
            orgId={worker.organizationId}
            orgType={orgQuery.data?.type ?? null}
            worker={worker}
            onClose={() => {
              setEditOpen(false);
              queryClient.invalidateQueries({ queryKey: ["allMyWorkers"] });
            }}
          />
        </div>
      )}
    </main>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-5">
      <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-brand-700 border-b border-cream-300 pb-2 mb-3">
        {title}
      </h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px] leading-5">
      <dt className="text-text-tertiary shrink-0">{label}</dt>
      <dd className="text-text-primary text-right break-all">{value}</dd>
    </div>
  );
}
