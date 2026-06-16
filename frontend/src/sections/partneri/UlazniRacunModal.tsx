"use client";

import { useEffect, useState } from "react";
import { IconLoader2, IconPlus } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { useCreateUlazniRacun } from "src/hooks/usePartners";
import { formatBAM } from "src/lib/format";

// "11.06.2026." ili "11.6.2026" → "2026-06-11" (null ako nije validan)
export function parseDateInput(value: string): string | null {
  const m = String(value || "")
    .trim()
    .match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function todayFormatted(): string {
  const n = new Date();
  return `${String(n.getDate()).padStart(2, "0")}.${String(
    n.getMonth() + 1,
  ).padStart(2, "0")}.${n.getFullYear()}.`;
}

// Maska za kucanje datuma: tačke se same upisuju (12 → "12.", 1206 → "12.06.")
export function maskDateInput(value: string): string {
  const digits = String(value || "").replace(/\D+/g, "").slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length >= 2) out += ".";
  if (digits.length > 2) out += digits.slice(2, 4);
  if (digits.length >= 4) out += ".";
  if (digits.length > 4) out += digits.slice(4, 8);
  if (digits.length === 8) out += ".";
  return out;
}

// "1.234,56" ili "1234.56" → broj (NaN ako nije validan)
export function parseKm(value: string): number {
  const s = String(value || "").trim();
  if (!s) return NaN;
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(norm);
}

type PartnerOption = { id: number; name: string; code?: number | null };

export function UlazniRacunModal({
  orgId,
  open,
  onClose,
  fixedPartner,
  partners,
  preselectPartnerId,
  isPdvObveznik,
  onRequestNewPartner,
}: {
  orgId: number | null;
  open: boolean;
  onClose: () => void;
  /** kad se knjiži sa kartice partnera: partner je fiksiran */
  fixedPartner?: PartnerOption | null;
  /** kad se knjiži globalno: lista za izbor dobavljača */
  partners?: PartnerOption[];
  preselectPartnerId?: number | null;
  /** PDV obveznik (obrt): nudi checkbox "Faktura sadrži PDV" + auto split */
  isPdvObveznik: boolean;
  /** "+ Novi partner" u izboru dobavljača */
  onRequestNewPartner?: () => void;
}) {
  const createRacun = useCreateUlazniRacun(orgId);

  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [brojRacuna, setBrojRacuna] = useState("");
  const [datumRacuna, setDatumRacuna] = useState("");
  const [rokPlacanja, setRokPlacanja] = useState("");
  const [iznos, setIznos] = useState("");
  const [hasPdv, setHasPdv] = useState(false);
  const [pdvIznos, setPdvIznos] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // reset pri otvaranju
  useEffect(() => {
    if (!open) return;
    setPartnerId(fixedPartner?.id ?? preselectPartnerId ?? null);
    setBrojRacuna("");
    setDatumRacuna(todayFormatted());
    setRokPlacanja("");
    setIznos("");
    setHasPdv(false);
    setPdvIznos("");
    setNote("");
    setError(null);
  }, [open, fixedPartner?.id, preselectPartnerId]);

  // PDV obveznik + faktura sa PDV-om: izbij 17/117 iz ukupnog iznosa
  useEffect(() => {
    if (!hasPdv) {
      setPdvIznos("");
      return;
    }
    const total = parseKm(iznos);
    if (Number.isFinite(total) && total > 0) {
      const pdv = Math.round(((total * 17) / 117) * 100) / 100;
      setPdvIznos(pdv.toFixed(2).replace(".", ","));
    }
  }, [hasPdv, iznos]);

  const totalNum = parseKm(iznos);
  const pdvNum = hasPdv ? parseKm(pdvIznos) : NaN;
  const osnovica =
    hasPdv && Number.isFinite(totalNum) && Number.isFinite(pdvNum)
      ? totalNum - pdvNum
      : null;

  function save() {
    setError(null);
    if (!partnerId) {
      setError("Izaberite dobavljača.");
      return;
    }
    if (!brojRacuna.trim()) {
      setError("Broj računa je obavezan.");
      return;
    }
    const datum = parseDateInput(datumRacuna);
    if (!datum) {
      setError("Datum računa nije validan (format DD.MM.GGGG.).");
      return;
    }
    const rok = rokPlacanja.trim() ? parseDateInput(rokPlacanja) : null;
    if (rokPlacanja.trim() && !rok) {
      setError("Rok plaćanja nije validan (format DD.MM.GGGG.).");
      return;
    }
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      setError("Iznos nije validan.");
      return;
    }
    if (hasPdv && (!Number.isFinite(pdvNum) || pdvNum < 0 || pdvNum > totalNum)) {
      setError("PDV iznos nije validan.");
      return;
    }
    createRacun.mutate(
      {
        partnerId,
        brojRacuna: brojRacuna.trim(),
        datumRacuna: datum,
        rokPlacanja: rok,
        iznos: totalNum,
        pdvIznos: hasPdv ? pdvNum : null,
        note: note.trim() || undefined,
      },
      {
        onSuccess: onClose,
        onError: () => setError("Greška pri snimanju, pokušajte ponovo."),
      },
    );
  }

  const inputCls =
    "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";
  const labelCls =
    "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Proknjiži ulazni račun"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Odustani
          </button>
          <button
            type="button"
            disabled={createRacun.isPending}
            onClick={save}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createRacun.isPending && (
              <IconLoader2 size={15} className="animate-spin" />
            )}
            Proknjiži
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Dobavljač */}
        <div>
          <label className={labelCls}>Dobavljač *</label>
          {fixedPartner ? (
            <div className="px-3 py-2 rounded-lg bg-cream-200/60 text-[13px] text-text-primary">
              {fixedPartner.name}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                className={inputCls}
                value={partnerId ?? ""}
                onChange={(e) =>
                  setPartnerId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Izaberite dobavljača...</option>
                {(partners ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code != null
                      ? `${String(p.code).padStart(4, "0")} · ${p.name}`
                      : p.name}
                  </option>
                ))}
              </select>
              {onRequestNewPartner && (
                <button
                  type="button"
                  onClick={onRequestNewPartner}
                  title="Dodaj novog partnera"
                  className="p-2 rounded-lg bg-info-bg text-info hover:brightness-95 transition-[filter] shrink-0"
                >
                  <IconPlus size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Broj računa dobavljača *</label>
          <input
            className={inputCls}
            value={brojRacuna}
            onChange={(e) => setBrojRacuna(e.target.value)}
            placeholder="npr. 123/26"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Datum računa *</label>
            <input
              className={inputCls}
              value={datumRacuna}
              onChange={(e) => setDatumRacuna(maskDateInput(e.target.value))}
              placeholder="DD.MM.GGGG."
              inputMode="numeric"
            />
          </div>
          <div>
            <label className={labelCls}>Rok plaćanja</label>
            <input
              className={inputCls}
              value={rokPlacanja}
              onChange={(e) => setRokPlacanja(maskDateInput(e.target.value))}
              placeholder="prazno = 30 dana"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Iznos računa (KM) *</label>
            <input
              className={inputCls}
              value={iznos}
              onChange={(e) => setIznos(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          {isPdvObveznik && hasPdv && (
            <div>
              <label className={labelCls}>PDV iznos (KM)</label>
              <input
                className={inputCls}
                value={pdvIznos}
                onChange={(e) => setPdvIznos(e.target.value)}
                inputMode="decimal"
              />
            </div>
          )}
        </div>

        {/* PDV split samo za PDV obveznike */}
        {isPdvObveznik && (
          <div>
            <label className="inline-flex items-center gap-2 text-[13px] text-text-primary">
              <input
                type="checkbox"
                checked={hasPdv}
                onChange={(e) => setHasPdv(e.target.checked)}
                className="accent-brand-600 w-4 h-4"
              />
              Faktura sadrži PDV (17%)
            </label>
            {hasPdv && osnovica != null && Number.isFinite(osnovica) && (
              <p className="text-[12px] text-text-tertiary mt-1">
                Osnovica {formatBAM(osnovica)} + PDV{" "}
                {formatBAM(Number.isFinite(pdvNum) ? pdvNum : 0)} ={" "}
                {formatBAM(totalNum)} (PDV se vodi odvojeno za KUF)
              </p>
            )}
          </div>
        )}

        <div>
          <label className={labelCls}>Napomena</label>
          <textarea
            className={`${inputCls} min-h-[48px]`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <p className="text-[11.5px] text-text-tertiary">
          Ako na izvodu već postoji potvrđena isplata ovom partneru sa istim
          iznosom (ili brojem računa u opisu), račun se odmah označava
          plaćenim.
        </p>
        {error && <p className="text-[12.5px] text-accent-500">{error}</p>}
      </div>
    </Modal>
  );
}
