"use client";

// Blagajna: nalozi za naplatu i isplatu gotovine + blagajnički dnevnik za
// dan/period (donos, promet, saldo) sa PDF ispisima, blagajnički maksimum
// (interna odluka + upozorenje + PDF odluke), brza akcija polaganja pazara
// i početno stanje pri prelasku sa postojeće blagajne. Uredba o uslovima i
// načinu plaćanja gotovim novcem (Sl. novine FBiH 48/15 i 82/15): pazar se
// polaže na račun isti ili naredni radni dan, gotovinska plaćanja
// robe/usluga do 200 KM, blagajnički maksimum internom odlukom.
import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconCopy,
  IconDownload,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useBlagajna,
  useCreateBlagajnaNalog,
  useDeleteBlagajnaNalog,
  useSetBlagajnaMaksimum,
  useUpdateBlagajnaNalog,
} from "src/hooks/useBlagajna";
import type { BlagajnaNalog, BlagajnaTip } from "src/api/blagajna";
import { getOrganization, type Organization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import { isoToDisplay, parseDateInput, todayFormatted } from "src/lib/dateInput";
import {
  downloadDnevnikPdf,
  downloadDnevnikPeriodPdf,
  downloadNalogPdf,
  downloadOdlukaMaksimumPdf,
  type DnevnikDan,
} from "src/sections/blagajna/blagajnaPdf";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;
const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const isoLokalni = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/** Jedan dan sa prometom unutar perioda (za grupisanje i dnevnik PDF). */
type Dan = DnevnikDan & { nalozi: BlagajnaNalog[] };

type ModalState = {
  tip: BlagajnaTip;
  /** postojeći nalog = uređivanje (broj i tip ostaju) */
  nalog?: BlagajnaNalog;
  /** predpopuna za novi nalog (kopija, polog pazara, početno stanje) */
  initial?: {
    datum?: string;
    iznos?: string;
    lice?: string;
    osnov?: string;
    napomena?: string;
  };
};

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
  const [modal, setModal] = useState<ModalState | null>(null);
  const [maksOpen, setMaksOpen] = useState(false);
  const [brisi, setBrisi] = useState<BlagajnaNalog | null>(null);
  const [brisiError, setBrisiError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  // brzi periodi
  const sad = new Date();
  const jucer = new Date(sad.getFullYear(), sad.getMonth(), sad.getDate() - 1);
  const periodi: { label: string; f: string; t: string }[] = [
    { label: "Danas", f: isoLokalni(sad), t: isoLokalni(sad) },
    { label: "Jučer", f: isoLokalni(jucer), t: isoLokalni(jucer) },
    {
      label: "Ovaj mjesec",
      f: isoLokalni(new Date(sad.getFullYear(), sad.getMonth(), 1)),
      t: isoLokalni(sad),
    },
    {
      label: "Prošli mjesec",
      f: isoLokalni(new Date(sad.getFullYear(), sad.getMonth() - 1, 1)),
      t: isoLokalni(new Date(sad.getFullYear(), sad.getMonth(), 0)),
    },
    {
      label: "Cijela godina",
      f: `${sad.getFullYear()}-01-01`,
      t: `${sad.getFullYear()}-12-31`,
    },
  ];

  // dani sa prometom: donos/saldo kumulativno od donosa perioda, broj
  // dnevnika = broj dana sa prometom u godini prije perioda + redni broj
  // dana unutar perioda (numeracija se resetuje promjenom godine)
  const dani = useMemo<Dan[]>(() => {
    if (!data) return [];
    const poDanu = new Map<string, BlagajnaNalog[]>();
    for (const n of data.nalozi) {
      const k = String(n.datum).slice(0, 10);
      const lista = poDanu.get(k);
      if (lista) lista.push(n);
      else poDanu.set(k, [n]);
    }
    let running = data.donos;
    let broj = data.dnevnikBrojPrije;
    let godina = data.from.slice(0, 4);
    const out: Dan[] = [];
    for (const [datum, nalozi] of [...poDanu.entries()].sort((a, b) =>
      a[0] < b[0] ? -1 : 1,
    )) {
      if (datum.slice(0, 4) !== godina) {
        godina = datum.slice(0, 4);
        broj = 0;
      }
      broj += 1;
      const naplate = r2(
        nalozi
          .filter((n) => n.tip === "NAPLATA")
          .reduce((a, n) => a + n.iznos, 0),
      );
      const isplate = r2(
        nalozi
          .filter((n) => n.tip === "ISPLATA")
          .reduce((a, n) => a + n.iznos, 0),
      );
      const donos = running;
      running = r2(running + naplate - isplate);
      out.push({
        from: datum,
        donos,
        naplate,
        isplate,
        saldo: running,
        dnevnikBroj: broj,
        nalozi,
      });
    }
    return out;
  }, [data]);

  const saldo = data?.saldo ?? 0;
  const maksimum = data?.maksimum ?? null;
  const iznadMaksimuma = maksimum != null && saldo > maksimum;
  // početno stanje ima smisla dok prije perioda nema nikakvog prometa
  const pokaziPocetno =
    data != null && data.donos === 0 && data.dnevnikBrojPrije === 0;

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
    if (!fullOrg || !data || pdfBusy) return;
    setPdfBusy("dnevnik");
    try {
      if (jedanDan) await downloadDnevnikPdf(data, fullOrg);
      else await downloadDnevnikPeriodPdf(dani, fullOrg);
    } finally {
      setPdfBusy(null);
    }
  }

  async function pdfDnevnikDana(dan: Dan) {
    if (!fullOrg || pdfBusy) return;
    setPdfBusy(`dan-${dan.from}`);
    try {
      await downloadDnevnikPdf(dan, fullOrg);
    } finally {
      setPdfBusy(null);
    }
  }

  function kopirajNalog(n: BlagajnaNalog) {
    setModal({
      tip: n.tip,
      initial: {
        datum: todayFormatted(),
        iznos: formatKm(n.iznos),
        lice: n.lice,
        osnov: n.osnov,
        napomena: n.napomena ?? "",
      },
    });
  }

  function poloziPazar() {
    // po uredbi se polaže gotovina iznad maksimuma; bez maksimuma cijeli saldo
    const prijedlog =
      maksimum != null && saldo > maksimum ? r2(saldo - maksimum) : saldo;
    setModal({
      tip: "ISPLATA",
      initial: {
        iznos: prijedlog > 0 ? formatKm(prijedlog) : "",
        lice: "Transakcijski račun",
        osnov: "Polaganje pazara na transakcijski račun",
      },
    });
  }

  function pocetnoStanje() {
    setModal({
      tip: "NAPLATA",
      initial: {
        datum: jedanDan ? isoToDisplay(from) : todayFormatted(),
        lice: "Prenos iz ranije evidencije",
        osnov: "Početno stanje blagajne",
      },
    });
  }

  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <h1 className="font-serif-display text-[clamp(2rem,3.5vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
            Blagajna
            <span className="text-brand-600" style={{ fontStyle: "italic" }}>
              .
            </span>
          </h1>
          <HelpButton slug="blagajna" />
        </div>
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
        <div className="flex gap-1.5 pb-[3px]">
          {periodi.map((p) => {
            const aktivan = from === p.f && to === p.t;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setOdS(isoToDisplay(p.f));
                  setDoS(isoToDisplay(p.t));
                }}
                className={[
                  "px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                  aktivan
                    ? "bg-brand-100 text-brand-700"
                    : "border border-cream-300 text-text-secondary hover:border-brand-600 hover:text-brand-600",
                ].join(" ")}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pdfDnevnik}
            disabled={
              pdfBusy != null || !data || (!jedanDan && dani.length === 0)
            }
            title={
              jedanDan
                ? "Blagajnički dnevnik za izabrani dan"
                : "Dnevnici za period: jedan PDF, stranica po danu sa prometom"
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            {pdfBusy === "dnevnik" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            {jedanDan ? "Dnevnik (PDF)" : "Dnevnici za period (PDF)"}
          </button>
          {saldo > 0 && (
            <button
              type="button"
              onClick={poloziPazar}
              title="Nalog za isplatu: polaganje gotovine na transakcijski račun"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Položi pazar
            </button>
          )}
          <button
            type="button"
            onClick={() => setModal({ tip: "NAPLATA" })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconPlus size={15} />
            Nalog za naplatu
          </button>
          <button
            type="button"
            onClick={() => setModal({ tip: "ISPLATA" })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={15} />
            Nalog za isplatu
          </button>
        </div>
      </div>

      {/* dnevnik sume */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 mb-4 flex flex-wrap gap-x-8 gap-y-2 items-center">
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
          {formatBAM(saldo)}
        </SumaItem>
        <SumaItem label="Blagajnički maksimum">
          <span className="inline-flex items-center gap-1.5">
            {maksimum != null ? formatBAM(maksimum) : "–"}
            <button
              type="button"
              onClick={() => setMaksOpen(true)}
              title="Blagajnički maksimum: interna odluka obrta"
              className="p-0.5 rounded text-text-tertiary hover:text-brand-600 transition-colors"
            >
              <IconPencil size={13} />
            </button>
          </span>
        </SumaItem>
        {pokaziPocetno && (
          <button
            type="button"
            onClick={pocetnoStanje}
            title="Prelazite sa postojećom blagajnom? Unesite zatečeni saldo kao početno stanje."
            className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconPlus size={15} />
            Unesi početno stanje
          </button>
        )}
      </div>

      {iznadMaksimuma && (
        <div className="rounded-xl bg-warning-bg text-warning text-[13px] leading-5 px-4 py-3 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>
            Saldo blagajne ({formatBAM(saldo)}) prelazi blagajnički maksimum (
            {formatBAM(maksimum ?? 0)}). Višak gotovine se polaže na račun
            isti ili naredni radni dan.
          </span>
          <button
            type="button"
            onClick={poloziPazar}
            className="px-3 py-1 rounded-lg border border-current text-[12px] font-medium hover:opacity-80 transition-opacity"
          >
            Položi pazar
          </button>
        </div>
      )}

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
                  {pokaziPocetno && (
                    <div className="mt-3">
                      <div className="mb-3">
                        Prelazite sa postojećom blagajnom? Unesite zatečeni
                        saldo kao početno stanje.
                      </div>
                      <button
                        type="button"
                        onClick={pocetnoStanje}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
                      >
                        <IconPlus size={15} />
                        Unesi početno stanje
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
            {jedanDan
              ? (data?.nalozi ?? []).map((n) => (
                  <NalogRed
                    key={n.id}
                    n={n}
                    pdfBusy={pdfBusy}
                    onPdf={pdfNalog}
                    onKopiraj={kopirajNalog}
                    onUredi={(x) => setModal({ tip: x.tip, nalog: x })}
                    onBrisi={(x) => {
                      setBrisiError(null);
                      setBrisi(x);
                    }}
                  />
                ))
              : dani.map((dan) => (
                  <Fragment key={dan.from}>
                    <tr className="border-b border-cream-300 bg-cream-50/60">
                      <td colSpan={8} className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-[12px] font-semibold text-text-primary">
                            {formatDate(dan.from)}
                          </span>
                          <span className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
                            Dnevnik br. {dan.dnevnikBroj}
                          </span>
                          <span className="ml-auto text-[11.5px] text-text-tertiary tabular-nums">
                            Naplate {formatBAM(dan.naplate)} · Isplate{" "}
                            {formatBAM(dan.isplate)} · Saldo dana{" "}
                            <strong className="text-text-primary">
                              {formatBAM(dan.saldo)}
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => pdfDnevnikDana(dan)}
                            disabled={pdfBusy != null}
                            title={`Blagajnički dnevnik za ${formatDate(dan.from)}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-cream-300 text-[11.5px] text-text-secondary hover:border-brand-600 hover:text-brand-600 transition-colors disabled:opacity-50"
                          >
                            {pdfBusy === `dan-${dan.from}` ? (
                              <IconLoader2 size={13} className="animate-spin" />
                            ) : (
                              <IconDownload size={13} />
                            )}
                            Dnevnik
                          </button>
                        </div>
                      </td>
                    </tr>
                    {dan.nalozi.map((n) => (
                      <NalogRed
                        key={n.id}
                        n={n}
                        pdfBusy={pdfBusy}
                        onPdf={pdfNalog}
                        onKopiraj={kopirajNalog}
                        onUredi={(x) => setModal({ tip: x.tip, nalog: x })}
                        onBrisi={(x) => {
                          setBrisiError(null);
                          setBrisi(x);
                        }}
                      />
                    ))}
                  </Fragment>
                ))}
          </tbody>
        </table>
      </div>

      {modal != null && orgId != null && (
        <NalogModal
          orgId={orgId}
          tip={modal.tip}
          nalog={modal.nalog}
          initial={modal.initial}
          defaultDatum={jedanDan ? isoToDisplay(from) : todayFormatted()}
          prijedloziLice={data?.prijedloziLice ?? []}
          prijedloziOsnov={data?.prijedloziOsnov ?? []}
          onClose={() => setModal(null)}
        />
      )}

      {maksOpen && orgId != null && (
        <MaksimumModal
          orgId={orgId}
          trenutni={maksimum}
          org={fullOrg ?? null}
          onClose={() => setMaksOpen(false)}
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
            {brisiError && (
              <p className="text-[12.5px] text-accent-500">{brisiError}</p>
            )}
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
                  setBrisiError(null);
                  try {
                    await deleteM.mutateAsync(brisi.id);
                    setBrisi(null);
                  } catch (e) {
                    setBrisiError(
                      e instanceof Error && e.message === "NEDOVOLJAN_SALDO"
                        ? "Brisanje nije moguće: saldo blagajne bi na nekom kasnijem danu otišao u minus. Prvo ispravite kasnije isplate."
                        : "Greška pri brisanju, pokušajte ponovo.",
                    );
                  }
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

function NalogRed({
  n,
  pdfBusy,
  onPdf,
  onKopiraj,
  onUredi,
  onBrisi,
}: {
  n: BlagajnaNalog;
  pdfBusy: string | null;
  onPdf: (n: BlagajnaNalog) => void;
  onKopiraj: (n: BlagajnaNalog) => void;
  onUredi: (n: BlagajnaNalog) => void;
  onBrisi: (n: BlagajnaNalog) => void;
}) {
  return (
    <tr className="border-b border-cream-300 last:border-b-0">
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
      <td className={`${tdCls} max-w-[240px] truncate`}>{n.osnov}</td>
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
            onClick={() => onPdf(n)}
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
            onClick={() => onKopiraj(n)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
            title="Kopiraj u novi nalog (današnji datum)"
          >
            <IconCopy size={16} />
          </button>
          <button
            type="button"
            onClick={() => onUredi(n)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-brand-600 hover:bg-cream-200 transition-colors"
            title="Uredi nalog"
          >
            <IconPencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onBrisi(n)}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
            title="Obriši"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Tekst input sa prijedlozima iz ranijih naloga (klik popuni polje). */
function SuggestInput({
  value,
  onChange,
  suggestions,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const upit = value.trim().toLowerCase();
  const filtrirani = suggestions
    .filter((s) => s.toLowerCase().includes(upit) && s !== value)
    .slice(0, 6);
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={inputCls}
      />
      {open && filtrirani.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-lg border border-cream-300 bg-cream-100 shadow-lg overflow-hidden">
          {filtrirani.map((s) => (
            <button
              key={s}
              type="button"
              // onMouseDown prije blur-a, da klik ne propadne
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-1.5 text-[12.5px] text-text-primary hover:bg-cream-200 truncate"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NalogModal({
  orgId,
  tip,
  nalog,
  initial,
  defaultDatum,
  prijedloziLice,
  prijedloziOsnov,
  onClose,
}: {
  orgId: number;
  tip: BlagajnaTip;
  nalog?: BlagajnaNalog;
  initial?: ModalState["initial"];
  defaultDatum: string;
  prijedloziLice: string[];
  prijedloziOsnov: string[];
  onClose: () => void;
}) {
  const naplata = tip === "NAPLATA";
  const uredi = nalog != null;
  const createM = useCreateBlagajnaNalog(orgId);
  const updateM = useUpdateBlagajnaNalog(orgId);
  const [datumS, setDatumS] = useState(
    nalog ? isoToDisplay(String(nalog.datum).slice(0, 10)) : initial?.datum ?? defaultDatum,
  );
  const [iznos, setIznos] = useState(
    nalog ? formatKm(nalog.iznos) : initial?.iznos ?? "",
  );
  const [lice, setLice] = useState(nalog?.lice ?? initial?.lice ?? "");
  const [osnov, setOsnov] = useState(nalog?.osnov ?? initial?.osnov ?? "");
  const [napomena, setNapomena] = useState(
    nalog?.napomena ?? initial?.napomena ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const busy = createM.isPending || updateM.isPending;

  const iznosNumZaNapomenu = parseKm(iznos) ?? 0;

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
      if (uredi && nalog) {
        await updateM.mutateAsync({
          id: nalog.id,
          datum,
          iznos: iznosNum,
          lice: lice.trim(),
          osnov: osnov.trim(),
          napomena: napomena.trim() || undefined,
        });
      } else {
        await createM.mutateAsync({
          tip,
          datum,
          iznos: iznosNum,
          lice: lice.trim(),
          osnov: osnov.trim(),
          napomena: napomena.trim() || undefined,
        });
      }
      onClose();
    } catch (e) {
      const kod = e instanceof Error ? e.message : "";
      setError(
        kod === "NEDOVOLJAN_SALDO"
          ? "U blagajni nema dovoljno gotovine: saldo bi na nekom danu otišao u minus."
          : kod === "DATUM_GODINA"
            ? "Datum mora ostati u istoj godini, numeracija naloga je godišnja."
            : "Greška pri snimanju, pokušajte ponovo.",
      );
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        uredi && nalog
          ? `Uredi nalog ${naplata ? "za naplatu" : "za isplatu"} ${nalog.oznaka}`
          : naplata
            ? "Nalog za naplatu (uplata u blagajnu)"
            : "Nalog za isplatu (iz blagajne)"
      }
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
            <SuggestInput
              value={lice}
              onChange={setLice}
              suggestions={prijedloziLice}
              placeholder={naplata ? "npr. pazar radnje / kupac" : "npr. dobavljač / radnik"}
              ariaLabel={naplata ? "Naplaćeno od" : "Isplaćeno kome"}
            />
          </div>
          <div>
            <label className={labelCls}>Osnov (svrha)</label>
            <SuggestInput
              value={osnov}
              onChange={setOsnov}
              suggestions={prijedloziOsnov}
              placeholder={naplata ? "npr. dnevni pazar" : "npr. plaćanje računa"}
              ariaLabel="Osnov (svrha)"
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Napomena (opciono)</label>
            <input
              value={napomena}
              onChange={(e) => setNapomena(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        {!naplata && iznosNumZaNapomenu > 200 && (
          <p className="rounded-lg bg-warning-bg text-warning text-[12px] leading-5 px-3 py-2">
            Napomena: gotovinska plaćanja robe i usluga ograničena su na 200
            KM po računu. Ograničenje se ne odnosi na polaganje pazara,
            isplate plata i druge izuzetke iz Uredbe.
          </p>
        )}
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
            disabled={busy}
            onClick={spremi}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy && <IconLoader2 size={15} className="animate-spin" />}
            {uredi ? "Spremi izmjene" : "Spremi nalog"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function MaksimumModal({
  orgId,
  trenutni,
  org,
  onClose,
}: {
  orgId: number;
  trenutni: number | null;
  org: Organization | null;
  onClose: () => void;
}) {
  const setM = useSetBlagajnaMaksimum(orgId);
  const [iznos, setIznos] = useState(
    trenutni != null ? formatKm(trenutni) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const parsed = parseKm(iznos);

  async function spremi() {
    setError(null);
    const prazno = iznos.trim() === "";
    if (!prazno && !(parsed != null && parsed > 0)) {
      return setError("Unesite iznos veći od nule ili ostavite prazno.");
    }
    try {
      await setM.mutateAsync(prazno ? null : (parsed as number));
      onClose();
    } catch {
      setError("Greška pri snimanju, pokušajte ponovo.");
    }
  }

  async function odlukaPdf() {
    if (!org || !(parsed != null && parsed > 0) || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadOdlukaMaksimumPdf(org, parsed, isoLokalni(new Date()));
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Blagajnički maksimum">
      <div className="space-y-3">
        <p className="text-[12.5px] leading-5 text-text-tertiary">
          Blagajnički maksimum je najviši iznos gotovine koji smije ostati u
          blagajni na kraju dana, a utvrđuje se internom odlukom obrta.
          Gotovina iznad maksimuma polaže se na račun isti ili naredni radni
          dan. Ostavite prazno ako ne želite praćenje.
        </p>
        <div>
          <label className={labelCls}>Iznos (KM)</label>
          <PkAmountInput
            value={iznos}
            onChange={setIznos}
            ariaLabel="Blagajnički maksimum"
            className="bg-cream-50"
          />
        </div>
        {error && <p className="text-[12.5px] text-accent-500">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={odlukaPdf}
            disabled={!org || !(parsed != null && parsed > 0) || pdfBusy}
            title="Odluka o visini blagajničkog maksimuma za potpis i arhivu"
            className="inline-flex items-center gap-1.5 mr-auto px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            {pdfBusy ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Odluka (PDF)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Odustani
          </button>
          <button
            type="button"
            disabled={setM.isPending}
            onClick={spremi}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {setM.isPending && <IconLoader2 size={15} className="animate-spin" />}
            Spremi
          </button>
        </div>
      </div>
    </Modal>
  );
}
