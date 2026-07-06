"use client";

// Uređivanje KIF klasifikacija fakture (tip dokumenta, vrsta fakture/
// dokumenta, krajnja potrošnja). Ne dira samu fakturu, samo PDV atribute
// knjiženja; defaulti se izvode iz vrste isporuke i kupca.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import {
  KIF_VRSTE_DOKUMENTA,
  KIF_VRSTE_FAKTURE,
  TIPOVI_DOKUMENTA_KIF,
  patchInvoice,
  type Invoice,
  type KifKpEntitet,
  type KifVrstaDokumenta,
  type KifVrstaFakture,
  type TipDokumentaKif,
} from "src/api/invoices";
import { deriveKifDefaults } from "./pdvObracun";
import { formatKm, parseKm } from "src/lib/amountInput";
import { isoToDisplay, parseDateInput } from "src/lib/dateInput";

const KP_OPTIONS: { value: KifKpEntitet; label: string }[] = [
  { value: "NISTA", label: "Ništa" },
  { value: "FBIH", label: "Federacija BiH" },
  { value: "RS", label: "Republika Srpska" },
  { value: "BD", label: "Distrikt Brčko" },
];

export function KifKnjizenjeModal({
  invoice,
  orgJurisdiction,
  onClose,
}: {
  /** null = zatvoreno */
  invoice: Invoice | null;
  orgJurisdiction: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={invoice != null}
      onClose={onClose}
      title={`Knjiženje u KIF · ${invoice?.fullNumber ?? ""}`}
    >
      {invoice && (
        <KifKnjizenjeForm
          key={invoice.id}
          invoice={invoice}
          orgJurisdiction={orgJurisdiction}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function KifKnjizenjeForm({
  invoice,
  orgJurisdiction,
  onClose,
}: {
  invoice: Invoice;
  orgJurisdiction: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const derived = deriveKifDefaults(invoice, orgJurisdiction);
  const [tip, setTip] = useState<TipDokumentaKif>(derived.tipDokumenta);
  const [vrstaFakture, setVrstaFakture] = useState<KifVrstaFakture>(
    derived.vrstaFakture,
  );
  const [vrstaDokumenta, setVrstaDokumenta] = useState<KifVrstaDokumenta>(
    derived.vrstaDokumenta,
  );
  const [kpEntitet, setKpEntitet] = useState<KifKpEntitet>(
    derived.kpEntitet ?? "NISTA",
  );
  const [kpIznos, setKpIznos] = useState(
    derived.kpIznos > 0 ? formatKm(derived.kpIznos) : "",
  );
  const [jciBroj, setJciBroj] = useState(invoice.kifJciBroj ?? "");
  const [jciDatum, setJciDatum] = useState(
    invoice.kifJciDatum ? isoToDisplay(invoice.kifJciDatum) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const res = await patchInvoice(invoice.id, {
        kifTipDokumenta: tip,
        kifVrstaFakture: vrstaFakture,
        kifVrstaDokumenta: vrstaDokumenta,
        kifKpEntitet: kpEntitet,
        kifKpIznos:
          kpEntitet === "NISTA" ? 0 : (parseKm(kpIznos) ?? 0),
        kifJciBroj: tip === "04" ? jciBroj.trim() || null : null,
        kifJciDatum:
          tip === "04" && jciDatum.trim()
            ? parseDateInput(jciDatum)
            : null,
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
      <div>
        <label className={labelCls}>Tip dokumenta</label>
        <PkSelect
          ariaLabel="Tip dokumenta"
          value={tip}
          onChange={(v) => setTip(String(v ?? "01") as TipDokumentaKif)}
          options={TIPOVI_DOKUMENTA_KIF}
          wrapStyle={{ width: "100%" }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Vrsta fakture</label>
          <PkSelect
            ariaLabel="Vrsta fakture"
            value={vrstaFakture}
            onChange={(v) =>
              setVrstaFakture(
                String(v ?? "DOMACI_KUPAC") as KifVrstaFakture,
              )
            }
            options={KIF_VRSTE_FAKTURE}
            wrapStyle={{ width: "100%" }}
          />
        </div>
        <div>
          <label className={labelCls}>Vrsta dokumenta</label>
          <PkSelect
            ariaLabel="Vrsta dokumenta"
            value={vrstaDokumenta}
            onChange={(v) =>
              setVrstaDokumenta(
                String(v ?? "REDOVNA") as KifVrstaDokumenta,
              )
            }
            options={KIF_VRSTE_DOKUMENTA}
            wrapStyle={{ width: "100%" }}
          />
        </div>
      </div>
      {tip === "04" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Broj JCI</label>
            <input
              value={jciBroj}
              onChange={(e) => setJciBroj(e.target.value.toUpperCase())}
              maxLength={18}
              placeholder="npr. 26BA010802012345H3"
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
            />
            <p className="text-[11.5px] text-text-tertiary mt-1">
              Referentni broj JCI ima 18 znakova; za izvoz se u e-KIF šalje
              umjesto broja fakture.
            </p>
          </div>
          <div>
            <label className={labelCls}>Datum JCI</label>
            <PkDateInput
              value={jciDatum}
              onChange={setJciDatum}
              ariaLabel="Datum JCI"
              inputClassName="bg-cream-50"
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Krajnja potrošnja</label>
          <PkSelect
            ariaLabel="Krajnja potrošnja"
            value={kpEntitet}
            onChange={(v) =>
              setKpEntitet(String(v ?? "NISTA") as KifKpEntitet)
            }
            options={KP_OPTIONS}
            wrapStyle={{ width: "100%" }}
          />
        </div>
        {kpEntitet !== "NISTA" && (
          <div>
            <label className={labelCls}>Iznos krajnje potrošnje</label>
            <PkAmountInput
              value={kpIznos}
              onChange={setKpIznos}
              ariaLabel="Iznos krajnje potrošnje"
              className="bg-cream-50"
            />
          </div>
        )}
      </div>
      <p className="text-[11.5px] text-text-tertiary">
        Knjižna obavijest i storno avansne fakture umanjuju isporuke i
        izlazni PDV u prijavi. Krajnja potrošnja puni polja 32/33/34.
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
          onClick={() => save.mutate()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {save.isPending && <IconLoader2 size={15} className="animate-spin" />}
          Sačuvaj knjiženje
        </button>
      </div>
    </div>
  );
}
