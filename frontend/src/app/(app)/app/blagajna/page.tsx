"use client";

// Blagajna: nalozi za naplatu i isplatu gotovine + blagajnički dnevnik za
// dan (donos, promet, saldo) sa PDF ispisima. Uredba o uslovima i načinu
// plaćanja gotovim novcem (Sl. novine FBiH 48/15 i 82/15): pazar se polaže
// na račun isti ili naredni radni dan, gotovinska plaćanja robe/usluga do
// 200 KM, blagajnički maksimum internom odlukom.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconDownload,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useBlagajna,
  useCreateBlagajnaNalog,
  useDeleteBlagajnaNalog,
} from "src/hooks/useBlagajna";
import type { BlagajnaNalog, BlagajnaTip } from "src/api/blagajna";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { parseKm } from "src/lib/amountInput";
import { isoToDisplay, parseDateInput, todayFormatted } from "src/lib/dateInput";
import {
  downloadDnevnikPdf,
  downloadNalogPdf,
} from "src/sections/blagajna/blagajnaPdf";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;
const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";

export default function BlagajnaPage() {
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const [odS, setOdS] = useState(todayFormatted());
  const [doS, setDoS] = useState(todayFormatted());
  const from = parseDateInput(odS) ?? new Date().toISOString().slice(0, 10);
  const to = parseDateInput(doS) ?? from;
  const jedanDan = from === to;

  const { data, isLoading } = useBlagajna(orgId, from, to);
  const deleteM = useDeleteBlagajnaNalog(orgId);
  const [noviTip, setNoviTip] = useState<BlagajnaTip | null>(null);
  const [brisi, setBrisi] = useState<BlagajnaNalog | null>(null);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  async function pdfNalog(n: BlagajnaNalog) {
    if (!fullOrg || pdfBusy) return;
    setPdfBusy(`nalog-${n.id}`);
    try {
      await downloadNalogPdf(n, fullOrg);
    } finally {
      setPdfBusy(null);
    }
  }

  async function pdfDnevnik() {
    if (!fullOrg || !data || pdfBusy || !jedanDan) return;
    setPdfBusy("dnevnik");
    try {
      await downloadDnevnikPdf(data, fullOrg);
    } finally {
      setPdfBusy(null);
    }
  }

  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="font-serif-display text-[clamp(2rem,3.5vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
          Blagajna
          <span className="text-brand-600" style={{ fontStyle: "italic" }}>
            .
          </span>
        </h1>
        <p className="text-[14px] leading-6 text-text-tertiary mt-2 max-w-xl">
          Nalozi za naplatu i isplatu gotovine i blagajnički dnevnik sa
          saldom. Pazar se polaže na račun isti ili naredni radni dan, a
          gotovinska plaćanja robe i usluga idu do 200 KM po računu.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <div className={labelCls}>Od datuma</div>
          <PkDateInput
            value={odS}
            onChange={setOdS}
            ariaLabel="Od datuma"
            className="w-[160px]"
          />
        </div>
        <div>
          <div className={labelCls}>Do datuma</div>
          <PkDateInput
            value={doS}
            onChange={setDoS}
            ariaLabel="Do datuma"
            className="w-[160px]"
          />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pdfDnevnik}
            disabled={!jedanDan || pdfBusy != null || !data}
            title={
              jedanDan
                ? "Blagajnički dnevnik za izabrani dan"
                : "Dnevnik se štampa za jedan dan (izjednači Od i Do)"
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            {pdfBusy === "dnevnik" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Dnevnik (PDF)
          </button>
          <button
            type="button"
            onClick={() => setNoviTip("NAPLATA")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconPlus size={15} />
            Nalog za naplatu
          </button>
          <button
            type="button"
            onClick={() => setNoviTip("ISPLATA")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={15} />
            Nalog za isplatu
          </button>
        </div>
      </div>

      {/* dnevnik sume */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 mb-4 flex flex-wrap gap-x-8 gap-y-2">
        {jedanDan && (
          <SumaItem label={`Dnevnik br. (${new Date(from).getFullYear()}.)`}>
            <span className="font-serif-display text-[18px]">
              {data?.dnevnikBroj ?? "–"}
            </span>
          </SumaItem>
        )}
        <SumaItem label="Donos (prethodni saldo)">
          {formatBAM(data?.donos ?? 0)}
        </SumaItem>
        <SumaItem label="Naplate">{formatBAM(data?.naplate ?? 0)}</SumaItem>
        <SumaItem label="Isplate">{formatBAM(data?.isplate ?? 0)}</SumaItem>
        <SumaItem label="Saldo blagajne" highlight>
          {formatBAM(data?.saldo ?? 0)}
        </SumaItem>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={thCls}>Broj</th>
              <th className={thCls}>Datum</th>
              <th className={thCls}>Vrsta</th>
              <th className={thCls}>Uplatilac / primalac</th>
              <th className={thCls}>Osnov</th>
              <th className={`${thCls} text-right`}>Naplata</th>
              <th className={`${thCls} text-right`}>Isplata</th>
              <th className={`${thCls} text-right`}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={8}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && (data?.nalozi ?? []).length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={8}
                >
                  Nema naloga za izabrani period.
                </td>
              </tr>
            )}
            {(data?.nalozi ?? []).map((n) => (
              <tr
                key={n.id}
                className="border-b border-cream-300 last:border-b-0"
              >
                <td className={`${tdCls} font-medium tabular-nums`}>
                  {n.tip === "NAPLATA" ? "N" : "I"}-{n.oznaka}
                </td>
                <td className={tdCls}>{formatDate(n.datum)}</td>
                <td className={tdCls}>
                  {n.tip === "NAPLATA" ? (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-success-bg text-success text-[11px] font-medium">
                      naplata
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-cream-200 text-text-secondary text-[11px] font-medium">
                      isplata
                    </span>
                  )}
                </td>
                <td className={`${tdCls} max-w-[200px] truncate`}>{n.lice}</td>
                <td className={`${tdCls} max-w-[240px] truncate`}>
                  {n.osnov}
                </td>
                <td className={tdNum}>
                  {n.tip === "NAPLATA" ? formatBAM(n.iznos) : ""}
                </td>
                <td className={tdNum}>
                  {n.tip === "ISPLATA" ? formatBAM(n.iznos) : ""}
                </td>
                <td className={tdCls}>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => pdfNalog(n)}
                      disabled={pdfBusy != null}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
                      title="Nalog (PDF)"
                    >
                      {pdfBusy === `nalog-${n.id}` ? (
                        <IconLoader2 size={16} className="animate-spin" />
                      ) : (
                        <IconDownload size={16} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrisi(n)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
                      title="Obriši"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {noviTip != null && orgId != null && (
        <NoviNalogModal
          orgId={orgId}
          tip={noviTip}
          defaultDatum={jedanDan ? isoToDisplay(from) : todayFormatted()}
          onClose={() => setNoviTip(null)}
        />
      )}

      <Modal
        open={brisi != null}
        onClose={() => setBrisi(null)}
        title="Brisanje naloga"
      >
        {brisi && (
          <div className="space-y-3">
            <p className="text-[13px] text-text-primary">
              Obrisati nalog{" "}
              <strong>
                {brisi.tip === "NAPLATA" ? "za naplatu" : "za isplatu"}{" "}
                {brisi.oznaka}
              </strong>{" "}
              ({brisi.lice}, {formatBAM(brisi.iznos)})?
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

function SumaItem({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </div>
      <div
        className={`text-[14px] tabular-nums ${highlight ? "text-brand-700 font-semibold" : "text-text-primary"}`}
      >
        {children}
      </div>
    </div>
  );
}

function NoviNalogModal({
  orgId,
  tip,
  defaultDatum,
  onClose,
}: {
  orgId: number;
  tip: BlagajnaTip;
  defaultDatum: string;
  onClose: () => void;
}) {
  const naplata = tip === "NAPLATA";
  const createM = useCreateBlagajnaNalog(orgId);
  const [datumS, setDatumS] = useState(defaultDatum);
  const [iznos, setIznos] = useState("");
  const [lice, setLice] = useState("");
  const [osnov, setOsnov] = useState("");
  const [napomena, setNapomena] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function spremi() {
    setError(null);
    const datum = parseDateInput(datumS);
    const iznosNum = parseKm(iznos) ?? 0;
    if (!datum) return setError("Unesite ispravan datum.");
    if (!(iznosNum > 0)) return setError("Unesite iznos.");
    if (!lice.trim()) {
      return setError(naplata ? "Unesite uplatioca." : "Unesite primaoca.");
    }
    if (!osnov.trim()) return setError("Unesite osnov (svrhu).");
    try {
      await createM.mutateAsync({
        tip,
        datum,
        iznos: iznosNum,
        lice: lice.trim(),
        osnov: osnov.trim(),
        napomena: napomena.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "NEDOVOLJAN_SALDO"
          ? "U blagajni nema dovoljno gotovine za ovu isplatu na taj dan."
          : "Greška pri snimanju, pokušajte ponovo.",
      );
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={naplata ? "Nalog za naplatu (uplata u blagajnu)" : "Nalog za isplatu (iz blagajne)"}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Datum</label>
            <PkDateInput
              value={datumS}
              onChange={setDatumS}
              ariaLabel="Datum naloga"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Iznos (KM)</label>
            <PkAmountInput
              value={iznos}
              onChange={setIznos}
              ariaLabel="Iznos naloga"
              className="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>
              {naplata ? "Naplaćeno od" : "Isplaćeno kome"}
            </label>
            <input
              value={lice}
              onChange={(e) => setLice(e.target.value)}
              placeholder={naplata ? "npr. pazar radnje / kupac" : "npr. dobavljač / radnik"}
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
            />
          </div>
          <div>
            <label className={labelCls}>Osnov (svrha)</label>
            <input
              value={osnov}
              onChange={(e) => setOsnov(e.target.value)}
              placeholder={
                naplata ? "npr. dnevni pazar" : "npr. plaćanje računa"
              }
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Napomena (opciono)</label>
            <input
              value={napomena}
              onChange={(e) => setNapomena(e.target.value)}
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
            />
          </div>
        </div>
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
            disabled={createM.isPending}
            onClick={spremi}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createM.isPending && (
              <IconLoader2 size={15} className="animate-spin" />
            )}
            Spremi nalog
          </button>
        </div>
      </div>
    </Modal>
  );
}
