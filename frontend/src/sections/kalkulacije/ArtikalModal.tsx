"use client";

// Dodavanje/uređivanje artikla u šifarniku. Koristi se na tabu Artikli i za
// brzi unos novog artikla direktno iz unosa kalkulacije (onSaved odmah vrati
// kreirani artikal da ga forma selektuje).
import { useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import {
  useCreateArtikal,
  useUpdateArtikal,
} from "src/hooks/useKalkulacije";
import type { Artikal, ArtikalTip } from "src/api/kalkulacije";

const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";
const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";

export function ArtikalModal({
  open,
  orgId,
  artikal,
  defaultNaziv,
  defaultTip,
  onClose,
  onSaved,
}: {
  open: boolean;
  orgId: number | null;
  /** null = novi artikal */
  artikal: Artikal | null;
  /** predpopunjen naziv za novi artikal (npr. tekst ukucan na fakturi) */
  defaultNaziv?: string;
  defaultTip?: ArtikalTip;
  onClose: () => void;
  onSaved?: (artikal: Artikal) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={artikal ? "Uredi artikal" : "Novi artikal"}
    >
      {open && orgId != null && (
        <ArtikalForm
          key={artikal?.id ?? "new"}
          orgId={orgId}
          artikal={artikal}
          defaultNaziv={defaultNaziv}
          defaultTip={defaultTip}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

function ArtikalForm({
  orgId,
  artikal,
  defaultNaziv,
  defaultTip,
  onClose,
  onSaved,
}: {
  orgId: number;
  artikal: Artikal | null;
  defaultNaziv?: string;
  defaultTip?: ArtikalTip;
  onClose: () => void;
  onSaved?: (artikal: Artikal) => void;
}) {
  const [naziv, setNaziv] = useState(artikal?.naziv ?? defaultNaziv ?? "");
  const [sifra, setSifra] = useState(artikal?.sifra ?? "");
  const [tip, setTip] = useState<ArtikalTip>(
    artikal?.tip ?? defaultTip ?? "ROBA",
  );
  const [jm, setJm] = useState(artikal?.jm ?? "KOM");
  const [barkod, setBarkod] = useState(artikal?.barkod ?? "");
  const [oslobodjenPdv, setOslobodjenPdv] = useState(
    artikal?.oslobodjenPdv ?? false,
  );
  const [error, setError] = useState<string | null>(null);

  const createM = useCreateArtikal(orgId);
  const updateM = useUpdateArtikal(orgId);
  const pending = createM.isPending || updateM.isPending;

  async function save() {
    setError(null);
    if (!naziv.trim()) {
      setError("Unesite naziv artikla.");
      return;
    }
    try {
      const payload = {
        naziv: naziv.trim(),
        tip,
        jm: jm.trim() || "KOM",
        barkod: barkod.trim(),
        oslobodjenPdv,
        ...(sifra.trim() ? { sifra: sifra.trim() } : {}),
      };
      const saved = artikal
        ? await updateM.mutateAsync({ id: artikal.id, payload })
        : await createM.mutateAsync(payload);
      onSaved?.(saved);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "SIFRA_EXISTS"
          ? "Šifra je već zauzeta u ovom obrtu."
          : "Greška pri spremanju, pokušajte ponovo.",
      );
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Naziv artikla</label>
        <input
          value={naziv}
          onChange={(e) => setNaziv(e.target.value)}
          className={inputCls}
          autoFocus
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Šifra</label>
          <input
            value={sifra}
            onChange={(e) => setSifra(e.target.value)}
            placeholder="automatski"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Vrsta</label>
          <PkSelect
            ariaLabel="Vrsta artikla"
            value={tip}
            onChange={(v) => setTip(v === "USLUGA" ? "USLUGA" : "ROBA")}
            options={[
              { value: "ROBA", label: "Roba" },
              { value: "USLUGA", label: "Usluga" },
            ]}
          />
        </div>
        <div>
          <label className={labelCls}>Jed. mjere</label>
          <input
            value={jm}
            onChange={(e) => setJm(e.target.value.toUpperCase())}
            className={inputCls}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Bar kod</label>
          <input
            value={barkod}
            onChange={(e) => setBarkod(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      {tip === "USLUGA" && (
        <p className="text-[12px] text-text-tertiary">
          Usluge se nude na fakturama, ali ne ulaze u kalkulacije ni lager
          (nemaju zalihe).
        </p>
      )}
      <label className="flex items-center gap-2 text-[13px] text-text-primary cursor-pointer">
        <input
          type="checkbox"
          checked={oslobodjenPdv}
          onChange={(e) => setOslobodjenPdv(e.target.checked)}
          className="accent-brand-600"
        />
        Oslobođen PDV-a (bez ulaznog odbitka i bez PDV-a u MPC)
      </label>
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
          disabled={pending}
          onClick={save}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending && <IconLoader2 size={15} className="animate-spin" />}
          Spremi
        </button>
      </div>
    </div>
  );
}
