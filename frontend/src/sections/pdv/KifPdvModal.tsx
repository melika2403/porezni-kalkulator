"use client";

// Direktno "samo PDV" knjiženje u KIF: red sa osnovicom i ukupnim iznosom 0,
// samo izlazni PDV (ogledalo KUF opcije "samo PDV evidencija"). Glavni
// slučaj: posebna šema u građevinarstvu (čl. 40), kad mi uplatimo PDV za
// dobavljača; njegov račun ide u KUF normalno pa je neto efekat 0. Datum je
// slobodan (kad je PDV stvarno uplaćen), broj dokumenta slobodan tekst.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { usePartners } from "src/hooks/usePartners";
import { proknjiziKifPdv } from "src/api/invoices";
import { formatBAM } from "src/lib/format";
import { parseKm } from "src/lib/amountInput";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";

export function KifPdvModal({
  open,
  orgId,
  onClose,
}: {
  open: boolean;
  orgId: number | null;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Knjiži samo PDV u KIF">
      {open && orgId != null && (
        <KifPdvForm key={orgId} orgId={orgId} onClose={onClose} />
      )}
    </Modal>
  );
}

function KifPdvForm({
  orgId,
  onClose,
}: {
  orgId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const partnersQ = usePartners(orgId);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [datum, setDatum] = useState(todayFormatted());
  const [broj, setBroj] = useState("");
  const [iznos, setIznos] = useState("");
  const [error, setError] = useState<string | null>(null);

  const iznosNum = parseKm(iznos) ?? 0;

  const save = useMutation({
    mutationFn: async () => {
      const res = await proknjiziKifPdv({
        organizationId: orgId,
        partnerId: partnerId as number,
        datum: parseDateInput(datum) as string,
        pdvIznos: iznosNum,
        brojDokumenta: broj.trim(),
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
          <label className={labelCls}>Partner (primalac/isporučilac)</label>
          <PkSelect
            ariaLabel="Partner"
            value={partnerId != null ? String(partnerId) : ""}
            onChange={(v) => setPartnerId(v ? Number(v) : null)}
            searchable
            placeholder="Izaberi partnera"
            options={[
              { value: "", label: "Izaberi partnera" },
              ...(partnersQ.data ?? []).map((p) => ({
                value: String(p.id),
                label: p.name,
              })),
            ]}
            wrapStyle={{ width: "100%" }}
          />
        </div>
        <div>
          <label className={labelCls}>Datum knjiženja</label>
          <PkDateInput
            value={datum}
            onChange={setDatum}
            ariaLabel="Datum knjiženja"
            className="w-full"
            inputClassName="bg-cream-50"
          />
        </div>
        <div>
          <label className={labelCls}>Broj dokumenta</label>
          <input
            value={broj}
            onChange={(e) => setBroj(e.target.value)}
            className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
          />
        </div>
        <div>
          <label className={labelCls}>Iznos PDV-a (KM)</label>
          <PkAmountInput
            value={iznos}
            onChange={setIznos}
            ariaLabel="Iznos PDV-a"
            className="bg-cream-50"
          />
        </div>
      </div>

      <p className="text-[11.5px] text-text-tertiary">
        U KIF (i e-KIF, PDV prijavu) ide red sa osnovicom i ukupnim iznosom 0,
        samo izlazni PDV {iznosNum > 0 ? `(${formatBAM(iznosNum)})` : ""}. Za
        posebnu šemu u građevinarstvu: ovo knjižiš kad uplatiš PDV za
        dobavljača, a njegov račun proknjižiš u KUF normalno, pa je neto
        efekat 0. Ne stvara potraživanje i ne dira KPR.
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
            if (partnerId == null) {
              setError("Izaberite partnera.");
              return;
            }
            if (!parseDateInput(datum)) {
              setError("Unesite ispravan datum.");
              return;
            }
            if (!broj.trim()) {
              setError("Unesite broj dokumenta.");
              return;
            }
            if (!(iznosNum > 0)) {
              setError("Unesite iznos PDV-a.");
              return;
            }
            save.mutate();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {save.isPending && <IconLoader2 size={15} className="animate-spin" />}
          Proknjiži
        </button>
      </div>
    </div>
  );
}
