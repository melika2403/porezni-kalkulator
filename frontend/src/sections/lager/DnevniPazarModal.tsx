"use client";

// Dnevni unos pazara SAMO za TKM (ne ide u KIF ni PDV evidencije): datum +
// bruto iznos, kao prijedlog se nudi polog pazara sa izvoda za taj dan
// (kategorija PAZAR). KIF knjiženje pazara je odvojeno (PDV stranica), a
// tamo checkbox "razduži i TKM" upisuje mjesečni red u ovu istu evidenciju.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { useAddTkmPazar } from "src/hooks/useLager";
import { searchBankTransactions } from "src/api/bankStatements";
import { unwrap } from "src/api/auth";
import { formatBAM } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";

const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";

export function DnevniPazarModal({
  open,
  orgId,
  onClose,
}: {
  open: boolean;
  orgId: number | null;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Dnevni unos pazara">
      {open && orgId != null && (
        <DnevniPazarForm key={orgId} orgId={orgId} onClose={onClose} />
      )}
    </Modal>
  );
}

function DnevniPazarForm({
  orgId,
  onClose,
}: {
  orgId: number;
  onClose: () => void;
}) {
  const addM = useAddTkmPazar(orgId);
  const [datumS, setDatumS] = useState(todayFormatted());
  const [iznos, setIznos] = useState("");
  const [opis, setOpis] = useState("");
  const [error, setError] = useState<string | null>(null);

  const datumIso = parseDateInput(datumS);

  // polog pazara sa izvoda za taj dan, kao prijedlog iznosa
  const { data: polozi } = useQuery({
    queryKey: ["pazar-polozi-dan", orgId, datumIso],
    queryFn: () =>
      unwrap(
        searchBankTransactions(orgId, {
          category: "PAZAR",
          status: "CONFIRMED",
          direction: "IN",
          dateFrom: datumIso as string,
          dateTo: datumIso as string,
          limit: 100,
        }),
      ),
    enabled: datumIso != null,
  });
  const pologSum = (polozi?.items ?? []).reduce(
    (s, t) => s + (Number(t.amount) || 0),
    0,
  );

  const iznosNum = parseKm(iznos) ?? 0;

  async function spremi() {
    setError(null);
    if (!datumIso) return setError("Unesite ispravan datum.");
    if (!(iznosNum > 0)) return setError("Unesite iznos dnevnog pazara.");
    try {
      await addM.mutateAsync({
        datum: datumIso,
        iznos: iznosNum,
        opis: opis.trim() || undefined,
      });
      onClose();
    } catch {
      setError("Greška pri snimanju, pokušajte ponovo.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Datum pazara</label>
          <PkDateInput
            value={datumS}
            onChange={setDatumS}
            ariaLabel="Datum pazara"
            className="w-full"
            inputClassName="bg-cream-50"
          />
        </div>
        <div>
          <label className={labelCls}>Ukupan dnevni pazar (KM)</label>
          <PkAmountInput
            value={iznos}
            onChange={setIznos}
            ariaLabel="Dnevni pazar"
            className="bg-cream-50"
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Opis (opciono)</label>
          <input
            value={opis}
            onChange={(e) => setOpis(e.target.value)}
            placeholder="npr. dnevni izvještaj kase br. 123"
            className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
          />
        </div>
      </div>

      {pologSum > 0 && (
        <div className="rounded-lg bg-info-bg border border-info/20 px-3 py-2.5 text-[12.5px] text-text-secondary flex flex-wrap items-center gap-2">
          <span>
            Polog pazara na izvodu za taj dan:{" "}
            <span className="font-semibold text-text-primary tabular-nums">
              {formatBAM(pologSum)}
            </span>
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
        <strong>Ne ide u KIF ni PDV prijavu</strong>, samo razdužuje TKM za
        taj dan. Pazar za PDV se knjiži odvojeno na stranici PDV evidencije
        (tamo checkbox po želji upiše i TKM red, pa nemoj oboje za isti
        period). Pogrešan unos se briše direktno u TKM tabeli.
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
          disabled={addM.isPending}
          onClick={spremi}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {addM.isPending && <IconLoader2 size={15} className="animate-spin" />}
          Upiši u TKM
        </button>
      </div>
    </div>
  );
}
