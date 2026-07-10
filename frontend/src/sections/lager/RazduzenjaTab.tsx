"use client";

// Povrat dobavljaču i otpis: razduženje lagera mimo popisa. Povrat
// automatski formira knjižnu obavijest u KUF-u (umanjuje nabavke i ulazni
// PDV), otpis (kalo, rastur, kvar, lom) samo skida robu i ulazi u TKM kao
// storno zaduženja. Oba dokumenta imaju PDF.
import { useMemo, useRef, useState } from "react";
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
import { PkSelect } from "src/components/app-shell/PkSelect";
import {
  useCreateRazduzenje,
  useDeleteRazduzenje,
  useLager,
  useRazduzenja,
} from "src/hooks/useLager";
import { usePartners } from "src/hooks/usePartners";
import type { Razduzenje, RazduzenjeTip } from "src/api/lager";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { parseKm } from "src/lib/amountInput";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";
import { datumHr, downloadTablePdf } from "./robaPdf";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;
const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";

const kol = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 3 });
const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const RAZLOZI_OTPISA = [
  "kalo",
  "rastur",
  "kvar",
  "lom",
  "istek roka trajanja",
  "ostalo",
];

type NovaStavka = {
  uid: number;
  artikalId: number;
  sifra: string;
  naziv: string;
  jm: string;
  mpc: number;
  stanje: number;
  kolicina: number;
};

export function RazduzenjaTab({ orgId }: { orgId: number | null }) {
  const { data: razduzenja, isLoading } = useRazduzenja(orgId);
  const deleteM = useDeleteRazduzenje(orgId);
  const [novoTip, setNovoTip] = useState<RazduzenjeTip | null>(null);
  const [brisi, setBrisi] = useState<Razduzenje | null>(null);
  const [pdfId, setPdfId] = useState<number | null>(null);

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  async function pdfDokument(rz: Razduzenje) {
    if (!fullOrg || pdfId != null) return;
    setPdfId(rz.id);
    try {
      const povrat = rz.tip === "POVRAT";
      const info: string[] = [];
      if (povrat && rz.partner) info.push(`Dobavljač: ${rz.partner.name}`);
      if (rz.razlog) {
        info.push(`${povrat ? "Napomena" : "Razlog otpisa"}: ${rz.razlog}`);
      }
      if (povrat) {
        info.push(
          `Knjižna obavijest: nabavna vrijednost ${km(rz.nabavnaVrijednost)}${rz.pdvIznos > 0 ? `, PDV ${km(rz.pdvIznos)}` : ""}`,
        );
      }
      await downloadTablePdf({
        fileName: `${povrat ? "Povrat" : "Otpis"}-${rz.broj}-${String(rz.godina).slice(-2)}.pdf`,
        org: fullOrg,
        title: povrat
          ? "POVRAT ROBE DOBAVLJAČU"
          : "ZAPISNIK O OTPISU ROBE",
        subtitle: `broj ${rz.oznaka}, od ${datumHr(rz.datum)} godine`,
        info,
        sections: [
          {
            cols: [
              { label: "R.B.", w: 26 },
              { label: "ŠIFRA", w: 44 },
              { label: "NAZIV ARTIKLA", w: 190 },
              { label: "JED. MJERE", w: 44 },
              { label: "KOLIČINA", w: 52, right: true },
              { label: "MPC", w: 50, right: true },
              { label: "MALOPRODAJNA VRIJEDNOST", w: 70, right: true },
              { label: "NABAVNA CIJENA", w: 56, right: true },
              { label: "NABAVNA VRIJEDNOST", w: 66, right: true },
            ],
            rows: rz.stavke.map((s, i) => [
              `${i + 1}.`,
              s.sifra,
              s.naziv,
              s.jm,
              kol(s.kolicina),
              km(s.mpc),
              km(s.maloprodajniIznos),
              km(s.nabavnaCijena),
              km(s.nabavniIznos),
            ]),
            totals: [
              "",
              "",
              `Ukupno (${rz.stavke.length} stavki)`,
              "",
              "",
              "",
              km(rz.maloprodajnaVrijednost),
              "",
              km(rz.nabavnaVrijednost),
            ],
          },
        ],
      });
    } finally {
      setPdfId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-[13px] text-text-tertiary max-w-lg">
          Povrat robe dobavljaču automatski knjiži knjižnu obavijest u KUF;
          otpis (kalo, rastur, kvar, lom) samo razdužuje lager i TKM.
        </p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setNovoTip("POVRAT")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconPlus size={15} />
            Povrat dobavljaču
          </button>
          <button
            type="button"
            onClick={() => setNovoTip("OTPIS")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={15} />
            Otpis robe
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={thCls}>Vrsta</th>
              <th className={thCls}>Broj</th>
              <th className={thCls}>Datum</th>
              <th className={thCls}>Dobavljač / razlog</th>
              <th className={`${thCls} text-right`}>Stavki</th>
              <th className={`${thCls} text-right`}>Malopr. vrijednost</th>
              <th className={`${thCls} text-right`}>Nabavna vrijednost</th>
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
            {!isLoading && (razduzenja ?? []).length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={8}
                >
                  Još nema povrata ni otpisa.
                </td>
              </tr>
            )}
            {(razduzenja ?? []).map((rz) => (
              <tr
                key={rz.id}
                className="border-b border-cream-300 last:border-b-0"
              >
                <td className={tdCls}>
                  {rz.tip === "POVRAT" ? (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-info-bg text-info text-[11px] font-medium">
                      povrat
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-warning-bg text-warning text-[11px] font-medium">
                      otpis
                    </span>
                  )}
                </td>
                <td className={`${tdCls} font-medium tabular-nums`}>
                  {rz.oznaka}
                </td>
                <td className={tdCls}>{formatDate(rz.datum)}</td>
                <td className={`${tdCls} max-w-[240px] truncate`}>
                  {rz.tip === "POVRAT"
                    ? (rz.partner?.name ?? "–")
                    : rz.razlog || "–"}
                </td>
                <td className={tdNum}>{rz.stavke.length}</td>
                <td className={tdNum}>
                  {formatBAM(rz.maloprodajnaVrijednost)}
                </td>
                <td className={tdNum}>{formatBAM(rz.nabavnaVrijednost)}</td>
                <td className={tdCls}>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => pdfDokument(rz)}
                      disabled={pdfId != null}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
                      title="Dokument (PDF)"
                    >
                      {pdfId === rz.id ? (
                        <IconLoader2 size={16} className="animate-spin" />
                      ) : (
                        <IconDownload size={16} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrisi(rz)}
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

      {novoTip != null && orgId != null && (
        <NovoRazduzenjeModal
          orgId={orgId}
          tip={novoTip}
          onClose={() => setNovoTip(null)}
        />
      )}

      <Modal
        open={brisi != null}
        onClose={() => setBrisi(null)}
        title={brisi?.tip === "POVRAT" ? "Brisanje povrata" : "Brisanje otpisa"}
      >
        {brisi && (
          <div className="space-y-3">
            <p className="text-[13px] text-text-primary">
              Obrisati {brisi.tip === "POVRAT" ? "povrat" : "otpis"}{" "}
              <strong>{brisi.oznaka}</strong> od {formatDate(brisi.datum)}?
              Roba se vraća na lager
              {brisi.tip === "POVRAT" &&
                ", a knjižna obavijest se briše iz KUF-a"}
              .
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

// ─── novi povrat / otpis ─────────────────────────────────────────────────────

function NovoRazduzenjeModal({
  orgId,
  tip,
  onClose,
}: {
  orgId: number;
  tip: RazduzenjeTip;
  onClose: () => void;
}) {
  const povrat = tip === "POVRAT";
  const createM = useCreateRazduzenje(orgId);
  const partnersQ = usePartners(orgId);

  const [datumS, setDatumS] = useState(todayFormatted());
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [razlog, setRazlog] = useState(povrat ? "" : "kalo");
  const [brojKO, setBrojKO] = useState("");
  const datumIso = parseDateInput(datumS) ?? undefined;
  const { data: lager } = useLager(orgId, datumIso);

  // monotoni uid (pravi useRef), da brisanje reda ne pogodi drugi red
  const uidRef = useRef(1);
  const [stavke, setStavke] = useState<NovaStavka[]>([]);
  const [izborKey, setIzborKey] = useState("");
  const [kolicinaS, setKolicinaS] = useState("");
  const [error, setError] = useState<string | null>(null);

  const lagerRows = useMemo(
    () => (lager?.rows ?? []).filter((r) => r.kolicina > 0),
    [lager],
  );
  const izabrani = lagerRows.find(
    (r) => `${r.artikalId}|${r.mpc}` === izborKey,
  );

  function dodaj() {
    setError(null);
    const kolicina = parseKm(kolicinaS, 3);
    if (!izabrani) return setError("Izaberite artikal sa lagera.");
    if (kolicina == null || kolicina <= 0 || kolicina > izabrani.kolicina) {
      return setError(
        `Količina mora biti između 0 i ${kol(izabrani.kolicina)}.`,
      );
    }
    setStavke((prev) => [
      ...prev,
      {
        uid: uidRef.current++,
        artikalId: izabrani.artikalId,
        sifra: izabrani.sifra,
        naziv: izabrani.naziv,
        jm: izabrani.jm,
        mpc: izabrani.mpc,
        stanje: izabrani.kolicina,
        kolicina,
      },
    ]);
    setIzborKey("");
    setKolicinaS("");
  }

  async function spremi() {
    setError(null);
    const datum = parseDateInput(datumS);
    if (!datum) return setError("Unesite ispravan datum.");
    if (povrat && partnerId == null) {
      return setError("Izaberite dobavljača.");
    }
    if (stavke.length === 0) return setError("Dodajte bar jednu stavku.");
    try {
      await createM.mutateAsync({
        tip,
        datum,
        partnerId: partnerId ?? undefined,
        razlog: razlog.trim() || undefined,
        brojKO: brojKO.trim() || undefined,
        stavke: stavke.map((s) => ({
          artikalId: s.artikalId,
          mpc: s.mpc,
          kolicina: s.kolicina,
        })),
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("NEMA_STANJA")
          ? "Za neku stavku nema dovoljno stanja na lageru na taj datum."
          : "Greška pri spremanju, pokušajte ponovo.",
      );
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={povrat ? "Povrat robe dobavljaču" : "Otpis robe"}
      maxWidthClass="max-w-[860px]"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Datum</label>
            <PkDateInput
              value={datumS}
              onChange={setDatumS}
              ariaLabel="Datum razduženja"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          {povrat ? (
            <>
              <div className="col-span-2 lg:col-span-2">
                <label className={labelCls}>Dobavljač</label>
                <PkSelect
                  ariaLabel="Dobavljač"
                  value={partnerId != null ? String(partnerId) : ""}
                  onChange={(v) => setPartnerId(v ? Number(v) : null)}
                  searchable
                  placeholder="Izaberi dobavljača"
                  options={[
                    { value: "", label: "Izaberi dobavljača" },
                    ...(partnersQ.data ?? []).map((p) => ({
                      value: String(p.id),
                      label: p.name,
                    })),
                  ]}
                  wrapStyle={{ width: "100%" }}
                />
              </div>
              <div>
                <label className={labelCls}>Broj knjižne obavijesti</label>
                <input
                  value={brojKO}
                  onChange={(e) => setBrojKO(e.target.value)}
                  placeholder="automatski"
                  className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
                />
              </div>
            </>
          ) : (
            <div className="col-span-2">
              <label className={labelCls}>Razlog otpisa</label>
              <PkSelect
                ariaLabel="Razlog otpisa"
                value={RAZLOZI_OTPISA.includes(razlog) ? razlog : "ostalo"}
                onChange={(v) => setRazlog(v ? String(v) : "kalo")}
                options={RAZLOZI_OTPISA.map((r) => ({ value: r, label: r }))}
                wrapStyle={{ width: "100%" }}
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-cream-300 bg-cream-50 p-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="col-span-2 lg:col-span-3">
              <label className={labelCls}>Artikal na lageru</label>
              <PkSelect
                ariaLabel="Artikal na lageru"
                value={izborKey}
                onChange={(v) => {
                  const k = v ? String(v) : "";
                  setIzborKey(k);
                  const red = lagerRows.find(
                    (r) => `${r.artikalId}|${r.mpc}` === k,
                  );
                  if (red) setKolicinaS(kol(red.kolicina));
                }}
                searchable
                placeholder="Šifra ili naziv"
                options={[
                  { value: "", label: "Izaberi artikal" },
                  ...lagerRows.map((r) => ({
                    value: `${r.artikalId}|${r.mpc}`,
                    label: `${r.sifra} · ${r.naziv} · MPC ${km(r.mpc)} (${kol(r.kolicina)} ${r.jm})`,
                  })),
                ]}
                wrapStyle={{ width: "100%" }}
              />
            </div>
            <div>
              <label className={labelCls}>Količina</label>
              <PkAmountInput
                value={kolicinaS}
                onChange={setKolicinaS}
                decimals={3}
                placeholder="0"
                ariaLabel="Količina razduženja"
                className="bg-cream-100"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    dodaj();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={dodaj}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity"
            >
              <IconPlus size={14} />
              Dodaj stavku
            </button>
          </div>
        </div>

        {stavke.length > 0 && (
          <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-300">
                  <th className={thCls}>Šifra</th>
                  <th className={thCls}>Naziv</th>
                  <th className={`${thCls} text-right`}>Količina</th>
                  <th className={`${thCls} text-right`}>MPC</th>
                  <th className={`${thCls} text-right`}>Malopr. vrijednost</th>
                  <th className={`${thCls} text-right`} />
                </tr>
              </thead>
              <tbody>
                {stavke.map((s) => (
                  <tr
                    key={s.uid}
                    className="border-b border-cream-300 last:border-b-0"
                  >
                    <td className={`${tdCls} tabular-nums`}>{s.sifra}</td>
                    <td className={tdCls}>{s.naziv}</td>
                    <td className={tdNum}>{kol(s.kolicina)}</td>
                    <td className={tdNum}>{km(s.mpc)}</td>
                    <td className={tdNum}>
                      {formatBAM(
                        Math.round(s.kolicina * s.mpc * 100) / 100,
                      )}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button
                        type="button"
                        onClick={() =>
                          setStavke((prev) =>
                            prev.filter((x) => x.uid !== s.uid),
                          )
                        }
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
                        title="Ukloni"
                      >
                        <IconTrash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {povrat && (
          <p className="text-[11.5px] text-text-tertiary">
            Spremanjem se u KUF knjiži knjižna obavijest (umanjuje nabavke i
            ulazni PDV po nabavnoj vrijednosti robe). Ako imaš broj KO
            dobavljača, upiši ga; inače se dodjeljuje automatski.
          </p>
        )}
        {error && <p className="text-[12.5px] text-accent-500">{error}</p>}

        <div className="flex justify-end gap-2">
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
            {povrat ? "Proknjiži povrat" : "Proknjiži otpis"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
