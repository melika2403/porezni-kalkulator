"use client";

// Uvoz partnera od drugog obrta istog korisnika: mnogi obrti dijele iste
// dobavljače (knjigovodstvo, BH Telecom, elektrodistribucija, vodovod...),
// pa se šifarnik ne prekucava nego preuzme. Kopiraju se samo matični podaci
// partnera, bez prometa i početnih stanja; duplikati se preskaču na backendu.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { unwrap } from "src/api/auth";
import {
  listPartners,
  uvozPartneraIzObrta,
  type UvozIzObrtaResult,
} from "src/api/partners";

const GRESKE: Record<string, string> = {
  NO_ACCESS_SOURCE: "Nemate pristup izabranom obrtu.",
  ISTI_OBRT: "Izvorni obrt je isti kao trenutni.",
  EMPTY: "Nije odabran nijedan partner.",
};

export function UvozIzObrtaModal({
  open,
  onClose,
  orgId,
  orgOptions,
}: {
  open: boolean;
  onClose: () => void;
  /** ciljni (trenutno aktivni) obrt */
  orgId: number | null;
  /** ostali obrti korisnika (bez aktivnog) */
  orgOptions: { id: number; name: string }[];
}) {
  const qc = useQueryClient();
  const [sourceOrgId, setSourceOrgId] = useState<number | null>(null);
  // null = "svi označeni" (default dok korisnik ne dira checkboxove)
  const [checked, setChecked] = useState<Set<number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rezultat, setRezultat] = useState<UvozIzObrtaResult | null>(null);

  const { data: izvorni, isLoading } = useQuery({
    queryKey: ["partners", sourceOrgId, "uvoz-izvor"],
    queryFn: () => unwrap(listPartners(sourceOrgId as number)),
    enabled: open && sourceOrgId != null,
  });

  const effective = useMemo(
    () => checked ?? new Set((izvorni ?? []).map((p) => p.id)),
    [checked, izvorni],
  );

  const toggle = (id: number) => {
    const next = new Set(effective);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  };

  const zatvori = () => {
    setSourceOrgId(null);
    setChecked(null);
    setError(null);
    setRezultat(null);
    onClose();
  };

  const uvezi = async () => {
    if (!orgId || !sourceOrgId || effective.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    const r = await uvozPartneraIzObrta(orgId, sourceOrgId, [...effective]);
    setBusy(false);
    if (!r.ok) {
      setError(GRESKE[r.error ?? ""] ?? r.error ?? "Greška pri uvozu.");
      return;
    }
    setRezultat(r.data);
    qc.invalidateQueries({ queryKey: ["partners", orgId] });
    qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
  };

  return (
    <Modal
      open={open}
      onClose={zatvori}
      title="Uvezi partnere od drugog obrta"
      maxWidthClass="max-w-[560px]"
      footer={
        rezultat ? (
          <button
            type="button"
            onClick={zatvori}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            Zatvori
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={zatvori}
              className="inline-flex items-center px-4 py-2 rounded-lg border border-cream-300 text-text-primary text-[13px] font-medium hover:bg-cream-200 transition-colors"
            >
              Otkaži
            </button>
            <button
              type="button"
              onClick={() => void uvezi()}
              disabled={!sourceOrgId || effective.size === 0 || busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy && <IconLoader2 size={15} className="animate-spin" />}
              Uvezi odabrane ({effective.size})
            </button>
          </>
        )
      }
    >
      {rezultat ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13.5px] text-text-primary">
            Uvezeno <strong>{rezultat.dodano}</strong> od {rezultat.ukupno}{" "}
            odabranih partnera.
            {rezultat.vezanoTransakcija > 0 && (
              <>
                {" "}
                Automatski vezano {rezultat.vezanoTransakcija} postojećih
                transakcija sa izvoda.
              </>
            )}
          </p>
          {rezultat.preskoceno.length > 0 && (
            <div className="rounded-lg border border-cream-300 bg-cream-50 p-3">
              <div className="text-[12px] font-medium text-text-secondary mb-1.5">
                Preskočeno ({rezultat.preskoceno.length}), već postoje:
              </div>
              <ul className="max-h-40 overflow-y-auto text-[12.5px] text-text-tertiary flex flex-col gap-0.5">
                {rezultat.preskoceno.map((p, i) => (
                  <li key={i}>
                    <span className="text-text-secondary">{p.naziv}</span>:{" "}
                    {p.razlog}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] leading-5 text-text-tertiary">
            Preuzmite šifarnik partnera iz drugog obrta kojem imate pristup.
            Kopiraju se samo podaci partnera (naziv, ID broj, žiro računi...),
            bez prometa i dugovanja. Partneri koji već postoje u ovom obrtu se
            automatski preskaču.
          </p>
          <div>
            <div className="text-[12px] font-medium text-text-secondary mb-1">
              Izvorni obrt
            </div>
            <PkSelect
              ariaLabel="Izvorni obrt"
              value={sourceOrgId != null ? String(sourceOrgId) : ""}
              onChange={(v) => {
                setSourceOrgId(Number(v) || null);
                setChecked(null);
                setError(null);
              }}
              placeholder="Izaberite obrt..."
              searchable
              options={orgOptions.map((o) => ({
                value: String(o.id),
                label: o.name,
              }))}
              wrapStyle={{ width: "100%" }}
            />
          </div>

          {sourceOrgId != null && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[12px] font-medium text-text-secondary">
                  Partneri ({izvorni?.length ?? 0})
                </div>
                {(izvorni?.length ?? 0) > 0 && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setChecked(null)}
                      className="px-2.5 py-1 rounded-full border border-cream-300 text-[11.5px] font-medium text-text-secondary hover:bg-cream-200 transition-colors"
                    >
                      Označi sve
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecked(new Set())}
                      className="px-2.5 py-1 rounded-full border border-cream-300 text-[11.5px] font-medium text-text-secondary hover:bg-cream-200 transition-colors"
                    >
                      Poništi sve
                    </button>
                  </div>
                )}
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-[13px] text-text-tertiary py-4">
                  <IconLoader2 size={16} className="animate-spin" />
                  Učitavam partnere...
                </div>
              ) : (izvorni?.length ?? 0) === 0 ? (
                <div className="text-[13px] text-text-tertiary py-3">
                  Izabrani obrt nema unesenih partnera.
                </div>
              ) : (
                <div className="rounded-lg border border-cream-300 max-h-72 overflow-y-auto divide-y divide-cream-300/70">
                  {(izvorni ?? []).map((p) => (
                    <label
                      key={p.id}
                      className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-cream-200/60 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={effective.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="mt-0.5 w-4 h-4 accent-brand-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-text-primary truncate">
                          {p.name}
                        </span>
                        <span className="block text-[11.5px] text-text-tertiary truncate">
                          {[
                            p.jib ? `ID: ${p.jib}` : null,
                            p.city || null,
                            (p.accounts?.length ?? 0) > 0
                              ? `${p.accounts.length} žiro rn.`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "bez dodatnih podataka"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-danger-bg text-danger text-[12.5px] px-3 py-2">
              {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
