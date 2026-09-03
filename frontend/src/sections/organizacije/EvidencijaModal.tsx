"use client";

// Matična evidencija o radniku (Sl. nov. FBiH 92/16) u PK Office modalu:
// izbor radnika, pregled 24 stavke, dopuna podataka, snimanje + PDF.
// Logika i podaci identični staroj verziji, promijenjen je samo izgled.
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import { sortirajRadnike } from "src/lib/radniciSort";
import {
  getWorkers,
  getEvidencija,
  saveEvidencija,
  downloadEvidencijaPdf,
  type Worker,
} from "src/api/profile";
import DateInput from "src/components/DateInput/DateInput";
import { Modal } from "src/components/app-shell/Modal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import "src/styles/pk-embed.css";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";
const labelCls =
  "block text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1";

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
    // Isto redanje kao sidebari i aktivni radnici: prijavljeni po datumu
    // prijave, odjavljeni na dno po datumu odjave.
    return sortirajRadnike(ws);
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

  return (
    <Modal
      open
      onClose={onClose}
      title="Matična evidencija o radnicima"
      maxWidthClass="max-w-[760px]"
      footer={
        workerId != null && evidQ.data ? (
          <>
            <span className="mr-auto self-center text-[12px] text-text-tertiary">
              {evidQ.data.zadnjaIzmjena
                ? `Zadnja izmjena: ${fmtDot(evidQ.data.zadnjaIzmjena)}`
                : ""}
            </span>
            {saved && (
              <span className="self-center text-[12.5px] text-success font-medium">
                Sačuvano
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Zatvori
            </button>
            <button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
            >
              {saveMut.isPending ? "Snimam…" : "Sačuvaj"}
            </button>
            <button
              type="button"
              onClick={() => pdfMut.mutate()}
              disabled={pdfMut.isPending}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {pdfMut.isPending ? "Pripremam…" : "Preuzmi PDF"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Zatvori
          </button>
        )
      }
    >
      <div className="space-y-4">
        <p className="text-[12.5px] text-text-tertiary -mt-1">{orgName}</p>

        <div>
          <label className={labelCls}>Radnik</label>
          {locked ? (
            <div className="rounded-lg border border-cream-300 bg-cream-200/60 px-3 py-2 text-[13.5px] font-medium text-text-primary">
              {lockWorkerName || evidQ.data?.workerName || "Radnik"}
            </div>
          ) : (
            <PkSelect
              ariaLabel="Radnik"
              value={workerId != null ? String(workerId) : ""}
              onChange={(v) => setWorkerId(v ? Number(v) : null)}
              searchable
              searchPlaceholder="Traži radnika..."
              placeholder="Izaberi radnika"
              options={[
                { value: "", label: "Izaberi radnika" },
                ...workers.map((w: Worker) => ({
                  value: String(w.id),
                  label: `${w.firstName} ${w.lastName}${
                    w.role === "VLASNIK" ? " (vlasnik/direktor)" : ""
                  }${w.employmentStatus === "ODJAVLJEN" ? " (odjavljen)" : ""}`,
                })),
              ]}
              wrapStyle={{ width: "100%" }}
            />
          )}
        </div>

        {workerId == null ? (
          <p className="text-[13px] text-text-tertiary">
            Izaberite radnika da otvorite njegovu evidenciju.
          </p>
        ) : evidQ.isLoading ? (
          <p className="text-[13px] text-text-tertiary">Učitavam…</p>
        ) : evidQ.data ? (
          <>
            {/* Pregled svih 24 stavke */}
            <div className="rounded-xl border border-cream-300 overflow-hidden">
              {evidQ.data.items.map((it) => (
                <div
                  key={it.n}
                  className="flex gap-3 px-3.5 py-2 text-[13px] border-b border-cream-300/60 last:border-0"
                >
                  <span className="text-text-tertiary min-w-[20px] tabular-nums">
                    {it.n}.
                  </span>
                  <span className="flex-1 text-text-secondary">{it.label}</span>
                  <span className="flex-1 font-medium text-text-primary">
                    {it.value || "–"}
                  </span>
                </div>
              ))}
            </div>

            {/* Dopuna podataka (čuva se u evidenciji, ne dira radnika) */}
            <div>
              <div className="text-[11.5px] font-semibold uppercase tracking-wider text-brand-700 border-b border-cream-300 pb-1.5 mb-3">
                Dopuni / izmijeni podatke
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {evidQ.data.editable.map((f) => (
                  <div key={f.key}>
                    <label className={labelCls}>{f.label}</label>
                    {f.type === "date" ? (
                      <DateInput
                        value={form[f.key] ?? ""}
                        onValueChange={(iso) => setField(f.key, iso)}
                        className={inputCls}
                      />
                    ) : (
                      <input
                        className={inputCls}
                        type="text"
                        value={form[f.key] ?? ""}
                        placeholder={f.placeholder || ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-danger">
            Greška pri učitavanju evidencije.
          </p>
        )}
      </div>
    </Modal>
  );
}
