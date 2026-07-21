"use client";

// Stanje PDV-a: knjiga knjiženja prema UINO, pandan "Mojoj glavnoj knjizi"
// na e-portalu. Zaduženja (obaveza po prijavi, primljen povrat, kamate/kazne)
// i odobrenja (uplata, pretplata po prijavi) daju saldo: crveno = dug,
// zeleno = izmireno ili pretplata. Uplate i povrati se predlažu automatski
// sa izvoda (kategorije "Uplata PDV-a (UIO)" i "Povrat PDV-a").
import { useMemo, useState } from "react";
import {
  IconArrowRight,
  IconDownload,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "src/components/app-shell/Modal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import {
  createPdvKnjizenje,
  deletePdvKnjizenje,
  getPdvStanje,
  type PdvKnjizenje,
  type PdvKnjizenjeVrsta,
  type PdvPrijedlog,
} from "src/api/pdv";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import { isoToDisplay, parseDateInput, todayFormatted } from "src/lib/dateInput";

const MJESECI = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const VRSTA_LABEL: Record<PdvKnjizenjeVrsta, string> = {
  OBAVEZA: "Obaveza po PDV prijavi",
  PRETPLATA: "Pretplata po PDV prijavi",
  UPLATA: "Uplata PDV-a",
  POVRAT: "Primljen povrat PDV-a",
  KOREKCIJA: "Korekcija",
};

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;

/** "2026-05" → "maj 2026." */
export function periodLabel(period: string | null): string {
  if (!period) return "–";
  const [y, m] = period.split("-");
  const naziv = MJESECI[Number(m) - 1] ?? m;
  return `${naziv.toLowerCase()} ${y}.`;
}

export function usePdvStanje(orgId: number | null) {
  return useQuery({
    queryKey: ["pdv-stanje", orgId],
    queryFn: () => unwrap(getPdvStanje(orgId as number)),
    enabled: orgId != null,
  });
}

type ModalState = {
  vrsta: PdvKnjizenjeVrsta;
  datum: string;
  mjesec: number; // 0 = bez perioda
  godina: number;
  iznos: string;
  opis: string;
  /** samo KOREKCIJA */
  zaduzenje: boolean;
  transactionId: number | null;
};

export function StanjePdvTab({
  orgId,
  orgName = "",
}: {
  orgId: number | null;
  /** naziv obrta za zaglavlje PDF izvještaja */
  orgName?: string;
}) {
  const { data, isLoading } = usePdvStanje(orgId);
  const [pdfBusy, setPdfBusy] = useState(false);
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["pdv-stanje", orgId] });

  const createM = useMutation({
    mutationFn: (payload: Parameters<typeof createPdvKnjizenje>[1]) =>
      unwrap(createPdvKnjizenje(orgId as number, payload)),
    onSuccess: invalidate,
  });
  const deleteM = useMutation({
    mutationFn: (id: number) =>
      unwrap(deletePdvKnjizenje(orgId as number, id)),
    onSuccess: invalidate,
  });

  const now = new Date();
  // default period: prethodni mjesec (prijava se predaje za prethodni)
  const prethodni = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [brisi, setBrisi] = useState<PdvKnjizenje | null>(null);

  function otvoriNovo() {
    setModalError(null);
    setModal({
      vrsta: "UPLATA",
      datum: todayFormatted(),
      mjesec: prethodni.getMonth() + 1,
      godina: prethodni.getFullYear(),
      iznos: "",
      opis: "",
      zaduzenje: true,
      transactionId: null,
    });
  }

  function otvoriIzPrijedloga(p: PdvPrijedlog) {
    setModalError(null);
    // period pogodi iz datuma stavke: uplata u junu je za majsku prijavu
    const d = p.datum ? new Date(p.datum) : now;
    const per = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    setModal({
      vrsta: p.vrsta,
      datum: p.datum ? isoToDisplay(p.datum) : todayFormatted(),
      mjesec: per.getMonth() + 1,
      godina: per.getFullYear(),
      iznos: formatKm(p.iznos),
      opis: p.opis.slice(0, 120),
      zaduzenje: true,
      transactionId: p.transactionId,
    });
  }

  async function spremi() {
    if (!modal || orgId == null) return;
    const datumIso = parseDateInput(modal.datum);
    if (!datumIso) return setModalError("Unesite ispravan datum.");
    const iznos = parseKm(modal.iznos);
    if (iznos == null || iznos <= 0) {
      return setModalError("Unesite iznos veći od nule.");
    }
    const period =
      modal.mjesec > 0
        ? `${modal.godina}-${String(modal.mjesec).padStart(2, "0")}`
        : null;
    if ((modal.vrsta === "OBAVEZA" || modal.vrsta === "PRETPLATA") && !period) {
      return setModalError("Knjiženje po prijavi mora imati porezni period.");
    }
    setModalError(null);
    try {
      await createM.mutateAsync({
        datum: datumIso,
        vrsta: modal.vrsta,
        iznos,
        period,
        opis: modal.opis.trim() || undefined,
        zaduzenje: modal.vrsta === "KOREKCIJA" ? modal.zaduzenje : undefined,
        transactionId: modal.transactionId ?? undefined,
      });
      setModal(null);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setModalError(
        code === "PERIOD_PROKNJIZEN"
          ? "Za taj period već postoji knjiženje po prijavi. Obrišite postojeće pa proknjižite ponovo."
          : code === "TX_PROKNJIZENA"
            ? "Ova stavka izvoda je već proknjižena."
            : "Greška pri knjiženju, pokušajte ponovo.",
      );
    }
  }

  // knjiženja sa tekućim saldom (kao UINO glavna knjiga)
  const redovi = useMemo(() => {
    let saldo = 0;
    return (data?.knjizenja ?? []).map((k) => {
      saldo = Math.round((saldo + (k.zaduzenje ? k.iznos : -k.iznos)) * 100) / 100;
      return { ...k, saldo };
    });
  }, [data]);

  // neto po periodu: koji mjeseci nose dug odnosno pretplatu
  const poPeriodu = useMemo(() => {
    const map = new Map<string, number>();
    for (const k of data?.knjizenja ?? []) {
      const key = k.period ?? "";
      map.set(
        key,
        Math.round(((map.get(key) ?? 0) + (k.zaduzenje ? k.iznos : -k.iznos)) * 100) / 100,
      );
    }
    return [...map.entries()]
      .filter(([, net]) => net !== 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const saldo = data?.saldo ?? 0;
  const dug = saldo > 0;

  const godine = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  if (orgId == null || isLoading) {
    return (
      <p className="inline-flex items-center gap-2 text-[13px] text-text-tertiary">
        <IconLoader2 size={16} className="animate-spin" />
        Učitavanje stanja PDV-a...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* status kartica */}
      <div
        className={[
          "rounded-xl border px-5 py-4 flex flex-wrap items-center justify-between gap-3",
          dug
            ? "bg-accent-500/10 border-accent-500/30"
            : "bg-success-bg border-success/25",
        ].join(" ")}
      >
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-0.5">
            Trenutno stanje prema UINO
          </div>
          <div
            className={`font-serif-display text-[26px] leading-tight ${dug ? "text-accent-500" : "text-success"}`}
          >
            {saldo === 0
              ? "0,00 KM · izmireno"
              : dug
                ? `Dug ${formatBAM(saldo)}`
                : `Pretplata ${formatBAM(-saldo)}`}
          </div>
          {poPeriodu.length > 0 && (
            <div className="text-[12.5px] text-text-secondary mt-1.5 space-x-3">
              {poPeriodu.map(([per, net]) => (
                <span key={per || "bez"} className="inline-block">
                  {per ? periodLabel(per) : "bez perioda"}:{" "}
                  <span
                    className={
                      net > 0
                        ? "text-accent-500 font-medium"
                        : "text-success font-medium"
                    }
                  >
                    {net > 0
                      ? `dug ${formatBAM(net)}`
                      : `pretplata ${formatBAM(-net)}`}
                  </span>
                </span>
              ))}
            </div>
          )}
          <p className="text-[12px] text-text-tertiary mt-1.5">
            Uporedivo sa &quot;Moja glavna knjiga&quot; na UINO e-portalu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pdfBusy || redovi.length === 0}
            onClick={async () => {
              if (pdfBusy || redovi.length === 0) return;
              setPdfBusy(true);
              try {
                // pdf-lib se učitava tek na klik
                const { downloadStanjePdvPdf } = await import("./stanjePdf");
                await downloadStanjePdvPdf(redovi, orgName);
              } finally {
                setPdfBusy(false);
              }
            }}
            title="Lista knjiženja sa saldom, za arhivu i usaglašavanje sa UINO karticom"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {pdfBusy ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Izvještaj (PDF)
          </button>
          <button
            type="button"
            onClick={otvoriNovo}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={15} />
            Novo knjiženje
          </button>
        </div>
      </div>

      {/* prijedlozi sa izvoda */}
      {(data?.prijedlozi ?? []).length > 0 && (
        <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-hidden">
          <div className="px-4 pt-3 pb-2 text-[12px] font-medium text-brand-700">
            Prepoznato sa izvoda: uplate i povrati PDV-a koji još nisu
            proknjiženi u stanje
          </div>
          <ul className="divide-y divide-cream-300">
            {(data?.prijedlozi ?? []).map((p) => (
              <li
                key={p.transactionId}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5"
              >
                <span className="text-[12.5px] text-text-tertiary tabular-nums w-[76px] shrink-0">
                  {p.datum ? formatDate(p.datum) : "–"}
                </span>
                <span
                  className={[
                    "inline-block px-2 py-0.5 rounded-[20px] text-[11px] font-medium shrink-0",
                    p.vrsta === "UPLATA"
                      ? "bg-success-bg text-success"
                      : "bg-info-bg text-info",
                  ].join(" ")}
                >
                  {p.vrsta === "UPLATA" ? "uplata PDV-a" : "povrat PDV-a"}
                </span>
                <span className="text-[12.5px] text-text-primary flex-1 min-w-[160px] truncate">
                  {p.opis || "(bez opisa)"}
                </span>
                <span className="text-[13px] font-medium tabular-nums">
                  {formatBAM(p.iznos)}
                </span>
                <button
                  type="button"
                  onClick={() => otvoriIzPrijedloga(p)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors shrink-0"
                >
                  Proknjiži
                  <IconArrowRight size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* knjiga knjiženja */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={thCls}>Datum</th>
              <th className={thCls}>Period</th>
              <th className={thCls}>Vrsta / opis</th>
              <th className={`${thCls} text-right`}>Duguje</th>
              <th className={`${thCls} text-right`}>Potražuje</th>
              <th className={`${thCls} text-right`}>Saldo</th>
              <th className={`${thCls} text-right`}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {redovi.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={7}
                >
                  Još nema knjiženja. Proknjižite obavezu iz PDV prijave
                  (dugme na tabu &quot;PDV prijava&quot;), uplatu sa izvoda ili
                  ručno knjiženje.
                </td>
              </tr>
            )}
            {redovi.map((k) => (
              <tr
                key={k.id}
                className="border-b border-cream-300 last:border-b-0"
              >
                <td className={`${tdCls} tabular-nums`}>
                  {formatDate(k.datum)}
                </td>
                <td className={tdCls}>{periodLabel(k.period)}</td>
                <td className={tdCls}>
                  {VRSTA_LABEL[k.vrsta]}
                  {k.transactionId != null && (
                    <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded-[20px] bg-cream-200 text-text-tertiary text-[10.5px]">
                      sa izvoda
                    </span>
                  )}
                  {k.opis && (
                    <span className="block text-[11.5px] text-text-tertiary max-w-[320px] truncate">
                      {k.opis}
                    </span>
                  )}
                </td>
                <td className={tdNum}>
                  {k.zaduzenje ? formatBAM(k.iznos) : ""}
                </td>
                <td className={tdNum}>
                  {!k.zaduzenje ? formatBAM(k.iznos) : ""}
                </td>
                <td
                  className={`${tdNum} font-medium ${k.saldo > 0 ? "text-accent-500" : "text-success"}`}
                >
                  {formatBAM(k.saldo)}
                </td>
                <td className={`${tdCls} text-right`}>
                  <button
                    type="button"
                    onClick={() => setBrisi(k)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
                    title="Obriši knjiženje"
                  >
                    <IconTrash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* modal: novo knjiženje */}
      <Modal
        open={modal != null}
        onClose={() => setModal(null)}
        title="Knjiženje u stanje PDV-a"
      >
        {modal && (
          <div className="space-y-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Vrsta knjiženja
              </div>
              <PkSelect
                ariaLabel="Vrsta knjiženja"
                value={modal.vrsta}
                onChange={(v) =>
                  setModal({ ...modal, vrsta: String(v) as PdvKnjizenjeVrsta })
                }
                options={[
                  { value: "OBAVEZA", label: "Obaveza po PDV prijavi (dug)" },
                  { value: "PRETPLATA", label: "Pretplata po PDV prijavi" },
                  { value: "UPLATA", label: "Uplata PDV-a (naša uplata UINO-u)" },
                  { value: "POVRAT", label: "Primljen povrat PDV-a od UINO" },
                  { value: "KOREKCIJA", label: "Korekcija (kamata, kazna, ispravka)" },
                ]}
                wrapStyle={{ minWidth: 300 }}
              />
            </div>
            {modal.vrsta === "KOREKCIJA" && (
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Smjer korekcije
                </div>
                <PkSelect
                  ariaLabel="Smjer korekcije"
                  value={modal.zaduzenje ? "duguje" : "potrazuje"}
                  onChange={(v) =>
                    setModal({ ...modal, zaduzenje: v === "duguje" })
                  }
                  options={[
                    { value: "duguje", label: "Zaduženje (povećava dug)" },
                    { value: "potrazuje", label: "Odobrenje (smanjuje dug)" },
                  ]}
                  wrapStyle={{ minWidth: 240 }}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Datum knjiženja
                </div>
                <PkDateInput
                  value={modal.datum}
                  onChange={(v) => setModal({ ...modal, datum: v })}
                  ariaLabel="Datum knjiženja"
                  className="w-[150px]"
                />
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Iznos (KM)
                </div>
                <PkAmountInput
                  value={modal.iznos}
                  onChange={(v) => setModal({ ...modal, iznos: v })}
                  ariaLabel="Iznos"
                  className="w-[140px]"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Porezni period (prijava za)
                </div>
                <div className="flex gap-2">
                  <PkSelect
                    ariaLabel="Mjesec perioda"
                    value={modal.mjesec}
                    onChange={(v) => setModal({ ...modal, mjesec: Number(v) })}
                    options={[
                      ...(modal.vrsta === "KOREKCIJA" ||
                      modal.vrsta === "UPLATA" ||
                      modal.vrsta === "POVRAT"
                        ? [{ value: 0, label: "Bez perioda" }]
                        : []),
                      ...MJESECI.map((m, i) => ({ value: i + 1, label: m })),
                    ]}
                  />
                  {modal.mjesec > 0 && (
                    <PkSelect
                      ariaLabel="Godina perioda"
                      value={modal.godina}
                      onChange={(v) => setModal({ ...modal, godina: Number(v) })}
                      options={godine.map((g) => ({ value: g, label: `${g}.` }))}
                    />
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Opis (opciono)
              </div>
              <input
                value={modal.opis}
                onChange={(e) => setModal({ ...modal, opis: e.target.value })}
                placeholder="npr. kamata po rješenju, uplata izvod br. 112"
                className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
              />
            </div>
            {modal.transactionId != null && (
              <p className="text-[12px] text-text-tertiary">
                Knjiženje će biti vezano za stavku izvoda, pa se ista uplata
                neće ponovo nuditi.
              </p>
            )}
            {modalError && (
              <p className="text-[12.5px] text-accent-500">{modalError}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
              >
                Odustani
              </button>
              <button
                type="button"
                disabled={createM.isPending}
                onClick={spremi}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {createM.isPending && (
                  <IconLoader2 size={15} className="animate-spin" />
                )}
                Proknjiži
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* potvrda brisanja */}
      <Modal
        open={brisi != null}
        onClose={() => setBrisi(null)}
        title="Brisanje knjiženja"
      >
        {brisi && (
          <div className="space-y-3">
            <p className="text-[13px] text-text-primary">
              Obrisati knjiženje <strong>{VRSTA_LABEL[brisi.vrsta]}</strong> od{" "}
              {formatDate(brisi.datum)} na iznos{" "}
              <strong>{formatBAM(brisi.iznos)}</strong>?
              {brisi.transactionId != null &&
                " Stavka izvoda će se ponovo nuditi za knjiženje."}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setBrisi(null)}
                className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
              >
                Odustani
              </button>
              <button
                type="button"
                disabled={deleteM.isPending}
                onClick={async () => {
                  await deleteM.mutateAsync(brisi.id);
                  setBrisi(null);
                }}
                className="px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Obriši
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
