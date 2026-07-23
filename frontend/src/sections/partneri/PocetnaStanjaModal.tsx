"use client";

// Grupni unos početnih stanja partnera (migracija iz starog programa):
// tabela svih partnera sa dvije kolone iznosa (kupac duguje nama / mi
// dugujemo dobavljaču) na zajednički datum, tipično 31.12. prethodne
// godine. Postojeća stanja se predpopune; 0 u oba polja briše stanje.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2, IconSearch } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import {
  bulkSetOpeningBalances,
  listOpeningBalances,
  type OpeningBalanceRow,
  type Partner,
} from "src/api/partners";
import { unwrap } from "src/api/auth";
import { parseDateInput, isoToDisplay } from "src/lib/dateInput";
import { parseKm, formatKm } from "src/lib/amountInput";

export function PocetnaStanjaModal({
  orgId,
  partners,
  open,
  onClose,
}: {
  orgId: number | null;
  partners: Partner[];
  open: boolean;
  onClose: () => void;
}) {
  const openingsQ = useQuery({
    queryKey: ["partners", orgId, "opening-balances"],
    queryFn: () => unwrap(listOpeningBalances(orgId as number)),
    enabled: open && orgId != null,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Početna stanja partnera"
      maxWidthClass="max-w-[820px]"
    >
      {!openingsQ.data || orgId == null ? (
        <div className="py-10 text-center text-text-tertiary text-[13px]">
          <IconLoader2 size={20} className="animate-spin inline-block" />
        </div>
      ) : (
        <Inner
          orgId={orgId}
          partners={partners}
          openings={openingsQ.data}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function Inner({
  orgId,
  partners,
  openings,
  onClose,
}: {
  orgId: number;
  partners: Partner[];
  openings: OpeningBalanceRow[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const postojeca = useMemo(
    () => new Map(openings.map((o) => [o.partnerId, o])),
    [openings],
  );
  const [datum, setDatum] = useState(() =>
    openings.length > 0
      ? isoToDisplay(openings[0].datum)
      : `31.12.${new Date().getFullYear() - 1}.`,
  );
  // izmjene preko predpopunjenih vrijednosti (partnerId -> polje)
  const [edits, setEdits] = useState<
    Map<number, { kupac?: string; dob?: string }>
  >(new Map());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...partners].sort((a, b) => a.name.localeCompare(b.name, "bs")),
    [partners],
  );
  const nq = q.trim().toLowerCase();
  const visible = nq
    ? sorted.filter((p) => p.name.toLowerCase().includes(nq))
    : sorted;

  function vrijednost(p: Partner, polje: "kupac" | "dob"): string {
    const edit = edits.get(p.id)?.[polje];
    if (edit !== undefined) return edit;
    const o = postojeca.get(p.id);
    if (!o) return "";
    const n = polje === "kupac" ? o.kupacIznos : o.dobavljacIznos;
    return n !== 0 ? formatKm(n) : "";
  }

  function upisi(partnerId: number, polje: "kupac" | "dob", v: string) {
    setEdits((prev) => {
      const next = new Map(prev);
      next.set(partnerId, { ...next.get(partnerId), [polje]: v });
      return next;
    });
  }

  async function sacuvaj() {
    if (busy) return;
    const iso = parseDateInput(datum);
    if (!iso) {
      setError("Upišite ispravan datum stanja (npr. 31.12.2025.).");
      return;
    }
    const items: {
      partnerId: number;
      datum: string;
      kupacIznos: number;
      dobavljacIznos: number;
    }[] = [];
    for (const p of sorted) {
      const kupacStr = vrijednost(p, "kupac").trim();
      const dobStr = vrijednost(p, "dob").trim();
      const kupacIznos = kupacStr ? parseKm(kupacStr) : 0;
      const dobavljacIznos = dobStr ? parseKm(dobStr) : 0;
      if (kupacIznos == null || dobavljacIznos == null) {
        setError(`Neispravan iznos kod partnera "${p.name}".`);
        return;
      }
      const imaVrijednost = kupacIznos !== 0 || dobavljacIznos !== 0;
      // šalju se partneri sa iznosom i oni kojima se postojeće stanje briše
      if (imaVrijednost || postojeca.has(p.id)) {
        items.push({ partnerId: p.id, datum: iso, kupacIznos, dobavljacIznos });
      }
    }
    if (items.length === 0) {
      setError("Nema unesenih iznosa.");
      return;
    }
    setError(null);
    setBusy(true);
    const r = await bulkSetOpeningBalances(orgId, items);
    setBusy(false);
    if (!r.ok) {
      setError("Snimanje nije uspjelo. Pokušajte ponovo.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["partners", orgId] });
    onClose();
  }

  return (
    <div>
      <p className="text-[13px] leading-6 text-text-secondary mb-3">
        Otvorena stanja partnera na dan prije ulaska obrta u program (sa
        zaključnih kartica iz starog programa). Ulaze u kartice kao donos i u
        otvorene dugove; uplate ih zatvaraju prije novijih dokumenata. Prazno
        polje znači bez duga.
      </p>
      <div className="flex flex-wrap items-center gap-2.5 mb-3">
        <label className="text-[12px] font-medium text-text-secondary">
          Stanje na dan
        </label>
        <PkDateInput
          value={datum}
          onChange={setDatum}
          ariaLabel="Datum početnih stanja"
          inputClassName="bg-cream-50"
          className="w-[150px]"
        />
        <div className="relative ml-auto">
          <IconSearch
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraži partnere..."
            aria-label="Pretraži partnere"
            className="rounded-lg border border-cream-300 bg-cream-50 pl-8 pr-3 py-1.5 text-[12.5px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-600 transition-colors w-[220px]"
          />
        </div>
      </div>
      <div className="rounded-lg border border-cream-300 overflow-hidden mb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_150px_150px] gap-2 px-3 py-2 bg-cream-200/60 text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-medium">
          <span>Partner</span>
          <span className="text-right">Duguje nama (KM)</span>
          <span className="text-right">Dugujemo mi (KM)</span>
        </div>
        <div className="max-h-[46vh] overflow-y-auto">
          {visible.length === 0 && (
            <div className="px-3 py-6 text-center text-[12.5px] text-text-tertiary">
              Nema partnera za ovu pretragu.
            </div>
          )}
          {visible.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[minmax(0,1fr)_150px_150px] gap-2 items-center px-3 py-1.5 border-t border-cream-300/60"
            >
              <span
                className="text-[13px] text-text-primary truncate"
                title={p.name}
              >
                {p.code != null && (
                  <span className="text-text-tertiary tabular-nums">
                    {String(p.code).padStart(4, "0")}{" "}
                  </span>
                )}
                {p.name}
              </span>
              <PkAmountInput
                value={vrijednost(p, "kupac")}
                onChange={(v) => upisi(p.id, "kupac", v)}
                ariaLabel={`Dug kupca ${p.name}`}
                className="bg-cream-50 text-right"
              />
              <PkAmountInput
                value={vrijednost(p, "dob")}
                onChange={(v) => upisi(p.id, "dob", v)}
                ariaLabel={`Naš dug prema ${p.name}`}
                className="bg-cream-50 text-right"
              />
            </div>
          ))}
        </div>
      </div>
      {error && <p className="text-[12.5px] text-danger mb-2">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] font-medium text-text-secondary hover:bg-cream-200 transition-colors"
        >
          Otkaži
        </button>
        <button
          type="button"
          onClick={() => void sacuvaj()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {busy ? <IconLoader2 size={15} className="animate-spin" /> : null}
          Sačuvaj početna stanja
        </button>
      </div>
    </div>
  );
}
