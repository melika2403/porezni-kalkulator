"use client";

// Knjižna obavijest (umanjenje) uz postojeću izlaznu fakturu: iznos sa
// PDV-om (PDV dio se računa 17/117 ako je faktura sa PDV-om) + razlog.
// Dokument dobija svoj KO- broj i u KIF/prijavu ulazi negativno.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { izdajKnjiznuObavijest, type Invoice } from "src/api/invoices";
import { formatKm, parseKm } from "src/lib/amountInput";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";
import { formatBAM } from "src/lib/format";

export function KnjiznaObavijestModal({
  invoice,
  onClose,
}: {
  /** null = zatvoreno; izvorna (standardna) faktura */
  invoice: Invoice | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={invoice != null}
      onClose={onClose}
      title={`Knjižna obavijest · uz ${invoice?.fullNumber ?? ""}`}
    >
      {invoice && <KoForm key={invoice.id} invoice={invoice} onClose={onClose} />}
    </Modal>
  );
}

function KoForm({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const gross = Number(invoice.grossTotal) || 0;
  const saPdv = invoice.applyVat && Number(invoice.vatTotal) > 0;
  const [iznos, setIznos] = useState(formatKm(gross));
  const [razlog, setRazlog] = useState("");
  const [datum, setDatum] = useState(todayFormatted());
  const [error, setError] = useState<string | null>(null);

  const iznosNum = parseKm(iznos) ?? 0;
  const pdvDio = saPdv ? Math.round(((iznosNum * 17) / 117) * 100) / 100 : 0;

  const save = useMutation({
    mutationFn: async () => {
      const res = await izdajKnjiznuObavijest(invoice.id, {
        iznos: iznosNum,
        razlog: razlog.trim() || undefined,
        issueDate: datum.trim() ? (parseDateInput(datum) ?? undefined) : undefined,
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

  function submit() {
    setError(null);
    if (!(iznosNum > 0)) {
      setError("Unesite iznos umanjenja.");
      return;
    }
    if (iznosNum > gross) {
      setError(
        `Umanjenje ne može biti veće od iznosa fakture (${formatBAM(gross)}).`,
      );
      return;
    }
    if (datum.trim() && !parseDateInput(datum)) {
      setError("Datum nije validan (format DD.MM.GGGG.).");
      return;
    }
    save.mutate();
  }

  const labelCls =
    "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Iznos umanjenja (sa PDV-om)</label>
          <PkAmountInput
            value={iznos}
            onChange={setIznos}
            ariaLabel="Iznos umanjenja"
            className="bg-cream-50"
          />
          {saPdv && iznosNum > 0 && (
            <p className="text-[11.5px] text-text-tertiary mt-1">
              PDV dio (17/117): {formatBAM(pdvDio)}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Datum izdavanja</label>
          <PkDateInput
            value={datum}
            onChange={setDatum}
            ariaLabel="Datum knjižne obavijesti"
            inputClassName="bg-cream-50"
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Razlog umanjenja</label>
        <input
          value={razlog}
          onChange={(e) => setRazlog(e.target.value)}
          placeholder="npr. naknadni rabat, povrat robe, reklamacija"
          className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
        />
      </div>
      <p className="text-[11.5px] text-text-tertiary">
        Knjižna obavijest umanjuje isporuke i izlazni PDV u KIF-u i prijavi
        (negativna stavka). Kupac PDV obveznik po njoj ispravlja svoj odbitak
        ulaznog PDV-a. Faktura {invoice.fullNumber} glasi na{" "}
        {formatBAM(gross)}; dozvoljena su i djelimična umanjenja.
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
          onClick={submit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {save.isPending && <IconLoader2 size={15} className="animate-spin" />}
          Izdaj knjižnu obavijest
        </button>
      </div>
    </div>
  );
}
