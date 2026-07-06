"use client";

// Zbirno mjesečno knjiženje pazara u KIF: bruto pazar sa PDV-om, PDV se
// računa preračunatom stopom 17/117, kupci su krajnji potrošači (KP auto).
// Kao pomoć se prikazuje zbir potvrđenih pologa pazara sa izvoda za period
// (kategorija PAZAR), jer se pazar tako i prati kroz mjesec. Stavka je čista
// PDV evidencija: ne stvara potraživanje i ne dira KPR (pologe već knjiži).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { proknjiziPazar } from "src/api/invoices";
import { searchBankTransactions } from "src/api/bankStatements";
import { unwrap } from "src/api/auth";
import { formatBAM } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";

const MJESECI = [
  "januar", "februar", "mart", "april", "maj", "juni",
  "juli", "august", "septembar", "oktobar", "novembar", "decembar",
];

export function PazarModal({
  open,
  orgId,
  month,
  year,
  onClose,
}: {
  open: boolean;
  orgId: number | null;
  month: number;
  year: number;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Proknjiži pazar · ${MJESECI[month - 1]} ${year}.`}
    >
      {open && orgId != null && (
        <PazarForm
          key={`${orgId}-${year}-${month}`}
          orgId={orgId}
          month={month}
          year={year}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function PazarForm({
  orgId,
  month,
  year,
  onClose,
}: {
  orgId: number;
  month: number;
  year: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const mm = String(month).padStart(2, "0");
  const [iznos, setIznos] = useState("");
  const [brojDokumenta, setBrojDokumenta] = useState(`PAZAR-${mm}/${year}`);
  const [error, setError] = useState<string | null>(null);

  // zbir potvrđenih pologa pazara sa izvoda za period (pomoć pri unosu)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const { data: polozi } = useQuery({
    queryKey: ["pazar-polozi", orgId, year, month],
    queryFn: () =>
      unwrap(
        searchBankTransactions(orgId, {
          category: "PAZAR",
          status: "CONFIRMED",
          direction: "IN",
          dateFrom: `${year}-${mm}-01`,
          dateTo: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
          limit: 500,
        }),
      ),
  });
  const pologSum = (polozi?.items ?? []).reduce(
    (s, t) => s + (Number(t.amount) || 0),
    0,
  );

  const iznosNum = parseKm(iznos) ?? 0;
  const pdv = Math.round(((iznosNum * 17) / 117) * 100) / 100;

  const save = useMutation({
    mutationFn: async () => {
      const res = await proknjiziPazar({
        organizationId: orgId,
        month,
        year,
        iznos: iznosNum,
        brojDokumenta: brojDokumenta.trim() || undefined,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
    },
    onError: () => setError("Greška pri snimanju, pokušajte ponovo."),
  });

  const labelCls =
    "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Ukupan pazar (KM, sa PDV-om)</label>
          <PkAmountInput
            value={iznos}
            onChange={setIznos}
            ariaLabel="Ukupan pazar"
            className="bg-cream-50"
          />
          {iznosNum > 0 && (
            <p className="text-[11.5px] text-text-tertiary mt-1">
              PDV (17/117): {formatBAM(pdv)} · osnovica:{" "}
              {formatBAM(iznosNum - pdv)}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Broj dokumenta</label>
          <input
            value={brojDokumenta}
            onChange={(e) => setBrojDokumenta(e.target.value)}
            className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
          />
          <p className="text-[11px] text-text-tertiary mt-1">
            Ide u KIF i e-KIF kao broj dokumenta (može i broj fiskalnog
            izvještaja).
          </p>
        </div>
      </div>

      {pologSum > 0 && (
        <div className="rounded-lg bg-info-bg border border-info/20 px-3 py-2.5 text-[12.5px] text-text-secondary flex flex-wrap items-center gap-2">
          <span>
            Polozi pazara na izvodima za {MJESECI[month - 1]}:{" "}
            <span className="font-semibold text-text-primary tabular-nums">
              {formatBAM(pologSum)}
            </span>{" "}
            ({(polozi?.items ?? []).length} uplata)
          </span>
          <button
            type="button"
            onClick={() => setIznos(formatKm(pologSum))}
            className="px-2.5 py-1 rounded-md border border-info/40 text-info text-[12px] font-medium hover:brightness-95 transition-[filter]"
          >
            Preuzmi iznos
          </button>
        </div>
      )}

      <p className="text-[11.5px] text-text-tertiary">
        Knjiži se zbirno za mjesec (zadnji dan mjeseca), kao gotovinska
        naplata: ulazi u KIF, e-KIF i PDV prijavu, a PDV ide u krajnju
        potrošnju (polja 32/33/34). Ne stvara potraživanje i ne dira KPR,
        prihod tamo već knjiže polozi sa izvoda.
      </p>
      {error && <p className="text-[12.5px] text-accent-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
        >
          Odustani
        </button>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => {
            setError(null);
            if (!(iznosNum > 0)) {
              setError("Unesite ukupan pazar za mjesec.");
              return;
            }
            save.mutate();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {save.isPending && <IconLoader2 size={15} className="animate-spin" />}
          Proknjiži pazar
        </button>
      </div>
    </div>
  );
}
