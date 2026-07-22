"use client";

// Mini karton radnika: obračuni plata po mjesecima izabrane godine
// (bruto, doprinosi iz osnovice, porez, neto) sa zbirom, kao skraćeni
// GIP na ekranu. Samo prikaz, ne dira obračune.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "src/components/app-shell/Modal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { listWorkerPayrolls, type Payroll } from "src/api/payroll";
import type { Worker } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM } from "src/lib/format";

const thCls =
  "px-3 py-2 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;

const MJESECI = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "August",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

function StatusBadge({ p }: { p: Payroll }) {
  if (p.imported) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-[20px] bg-info-bg text-info text-[11px] font-medium">
        uvezen
      </span>
    );
  }
  if (p.status === "ISPLACENO") {
    return (
      <span className="inline-block px-2 py-0.5 rounded-[20px] bg-success-bg text-success text-[11px] font-medium">
        isplaćeno
      </span>
    );
  }
  if (p.status === "OBRACUNATO") {
    return (
      <span className="inline-block px-2 py-0.5 rounded-[20px] bg-info-bg text-info text-[11px] font-medium">
        obračunato
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-warning-bg text-warning text-[11px] font-medium">
      u izradi
    </span>
  );
}

export function RadnikKartonModal({
  orgId,
  worker,
  onClose,
}: {
  orgId: number;
  worker: Worker;
  onClose: () => void;
}) {
  const tekucaGodina = new Date().getFullYear();
  const [godina, setGodina] = useState(tekucaGodina);
  // godine od prijave radnika (ili prošle godine ako nema) do tekuće
  const godine = useMemo(() => {
    const start = worker.prijavaDate
      ? Number(worker.prijavaDate.slice(0, 4))
      : tekucaGodina - 1;
    const out: number[] = [];
    for (let g = tekucaGodina; g >= Math.min(start, tekucaGodina); g--) {
      out.push(g);
    }
    return out;
  }, [worker.prijavaDate, tekucaGodina]);

  const { data: payrolls, isLoading } = useQuery({
    queryKey: ["karton", orgId, worker.id, godina],
    queryFn: () => unwrap(listWorkerPayrolls(orgId, godina, worker.id)),
  });

  const poMjesecu = useMemo(() => {
    const m = new Map<number, Payroll>();
    for (const p of payrolls ?? []) m.set(p.month, p);
    return m;
  }, [payrolls]);

  const sume = useMemo(() => {
    const rows = payrolls ?? [];
    const s = (f: (p: Payroll) => number) =>
      Math.round(rows.reduce((a, p) => a + f(p), 0) * 100) / 100;
    return {
      gross: s((p) => p.gross),
      doprinosi: s((p) => p.empTotal),
      porez: s((p) => p.incomeTax),
      net: s((p) => p.net),
      count: rows.length,
    };
  }, [payrolls]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Karton radnika: ${worker.firstName} ${worker.lastName}`}
      maxWidthClass="max-w-[720px]"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[120px]">
            <PkSelect
              ariaLabel="Godina kartona"
              value={String(godina)}
              onChange={(v) => setGodina(Number(v))}
              options={godine.map((g) => ({
                value: String(g),
                label: String(g),
              }))}
            />
          </div>
          <p className="text-[12px] text-text-tertiary">
            Obračuni plata po mjesecima; doprinosi su iz osnovice (na teret
            radnika). Kompletan godišnji pregled je GIP na stranici Plate.
          </p>
        </div>

        <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-300">
                <th className={thCls}>Mjesec</th>
                <th className={`${thCls} text-right`}>Bruto</th>
                <th className={`${thCls} text-right`}>Doprinosi</th>
                <th className={`${thCls} text-right`}>Porez</th>
                <th className={`${thCls} text-right`}>Neto</th>
                <th className={thCls}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className={tdCls} colSpan={6}>
                    Učitavanje...
                  </td>
                </tr>
              )}
              {!isLoading &&
                MJESECI.map((naziv, i) => {
                  const p = poMjesecu.get(i + 1);
                  if (!p) {
                    return (
                      <tr
                        key={naziv}
                        className="border-b border-cream-300 last:border-b-0"
                      >
                        <td className={`${tdCls} text-text-tertiary`}>
                          {naziv}
                        </td>
                        <td
                          className={`${tdNum} text-text-tertiary`}
                          colSpan={4}
                        >
                          –
                        </td>
                        <td className={tdCls} />
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={naziv}
                      className="border-b border-cream-300 last:border-b-0"
                    >
                      <td className={`${tdCls} font-medium`}>{naziv}</td>
                      <td className={tdNum}>{formatBAM(p.gross)}</td>
                      <td className={tdNum}>{formatBAM(p.empTotal)}</td>
                      <td className={tdNum}>{formatBAM(p.incomeTax)}</td>
                      <td className={`${tdNum} font-semibold`}>
                        {formatBAM(p.net)}
                      </td>
                      <td className={tdCls}>
                        <StatusBadge p={p} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            {sume.count > 0 && (
              <tfoot>
                <tr className="border-t border-cream-300 bg-cream-50">
                  <td className={`${tdCls} font-medium`}>
                    Ukupno ({sume.count} mj.)
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(sume.gross)}
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(sume.doprinosi)}
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(sume.porez)}
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(sume.net)}
                  </td>
                  <td className={tdCls} />
                </tr>
              </tfoot>
            )}
          </table>
          {!isLoading && sume.count === 0 && (
            <p className="text-[12.5px] text-text-tertiary px-3 py-3">
              Nema obračuna za {godina}. godinu.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Zatvori
          </button>
        </div>
      </div>
    </Modal>
  );
}
