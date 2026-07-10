"use client";

// Popis (inventura) maloprodaje: stavke su snapshot knjigovodstvenog stanja
// na datum popisa, knjigovođa unosi izbrojane količine, obračun pokazuje
// višak/manjak (maloprodajna vrijednost, PDV, razlika u cijeni, nabavna).
// Proknjižen popis svodi lager na popisano stanje. Dva PDF-a: popisna lista
// za brojanje (prazna kolona) i obračun popisa.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconDownload,
  IconLoader2,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import {
  useCreatePopis,
  useDeletePopis,
  useOtknjiziPopis,
  usePopis,
  usePopisi,
  useProknjiziPopis,
  useRefreshPopis,
  useUpdatePopis,
} from "src/hooks/useLager";
import type { Popis, PopisStavka } from "src/api/lager";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { parseKm } from "src/lib/amountInput";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";
import { datumHr, downloadTablePdf, type PdfSection } from "./robaPdf";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;

const kol = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 3 });
const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// vrijednosti jedne količine po stavci (maloprodajna, PDV, nabavna, RUC)
function vrijednosti(s: PopisStavka, kolicina: number) {
  const malopr = r2(kolicina * s.mpc);
  const bezPdv = s.pdvStopa > 0 ? r2(malopr / (1 + s.pdvStopa / 100)) : malopr;
  const pdv = r2(malopr - bezPdv);
  const nabavna = r2(kolicina * s.nabavnaCijena);
  const ruc = r2(bezPdv - nabavna);
  return { malopr, pdv, nabavna, ruc };
}

type Summary = {
  malopr: number;
  pdv: number;
  ruc: number;
  nabavna: number;
  count: number;
};

const emptySummary = (): Summary => ({
  malopr: 0,
  pdv: 0,
  ruc: 0,
  nabavna: 0,
  count: 0,
});

function addTo(sum: Summary, v: ReturnType<typeof vrijednosti>) {
  sum.malopr = r2(sum.malopr + v.malopr);
  sum.pdv = r2(sum.pdv + v.pdv);
  sum.ruc = r2(sum.ruc + v.ruc);
  sum.nabavna = r2(sum.nabavna + v.nabavna);
  sum.count += 1;
}

export function PopisTab({ orgId }: { orgId: number | null }) {
  const [openId, setOpenId] = useState<number | null>(null);
  return openId == null ? (
    <PopisiLista orgId={orgId} onOpen={setOpenId} />
  ) : (
    <PopisDetail orgId={orgId} popisId={openId} onBack={() => setOpenId(null)} />
  );
}

// ─── lista popisa ────────────────────────────────────────────────────────────

function PopisiLista({
  orgId,
  onOpen,
}: {
  orgId: number | null;
  onOpen: (id: number) => void;
}) {
  const { data: popisi, isLoading } = usePopisi(orgId);
  const createM = useCreatePopis(orgId);
  const deleteM = useDeletePopis(orgId);

  const [noviOpen, setNoviOpen] = useState(false);
  const [datumS, setDatumS] = useState(todayFormatted());
  const [napomena, setNapomena] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [brisi, setBrisi] = useState<Popis | null>(null);
  // poruka greške u PK modalu umjesto window.alert
  const [obavijest, setObavijest] = useState<string | null>(null);

  async function kreiraj() {
    setCreateError(null);
    const datum = parseDateInput(datumS);
    if (!datum) {
      setCreateError("Unesite ispravan datum popisa.");
      return;
    }
    try {
      const created = await createM.mutateAsync({
        datum,
        napomena: napomena.trim(),
      });
      setNoviOpen(false);
      setNapomena("");
      onOpen(created.id);
    } catch {
      setCreateError("Greška pri kreiranju popisa, pokušajte ponovo.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-[13px] text-text-tertiary max-w-xl">
          Popis snima knjigovodstveno stanje na izabrani datum; nakon unosa
          izbrojanih količina i proknjižavanja, lager se svodi na popisano.
        </p>
        <button
          type="button"
          onClick={() => {
            setDatumS(todayFormatted());
            setCreateError(null);
            setNoviOpen(true);
          }}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <IconPlus size={15} />
          Novi popis
        </button>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={thCls}>Broj</th>
              <th className={thCls}>Datum popisa</th>
              <th className={thCls}>Status</th>
              <th className={`${thCls} text-right`}>Stavki</th>
              <th className={thCls}>Napomena</th>
              <th className={`${thCls} text-right`}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={6}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && (popisi ?? []).length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={6}
                >
                  Još nema popisa. Kliknite &quot;Novi popis&quot; kad klijent
                  izbroji robu.
                </td>
              </tr>
            )}
            {(popisi ?? []).map((p) => (
              <tr
                key={p.id}
                onClick={() => onOpen(p.id)}
                className="border-b border-cream-300 last:border-b-0 hover:bg-cream-50 transition-colors cursor-pointer"
              >
                <td className={`${tdCls} font-medium tabular-nums`}>
                  {p.oznaka}
                </td>
                <td className={tdCls}>{formatDate(p.datum)}</td>
                <td className={tdCls}>
                  {p.status === "PROKNJIZEN" ? (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-success-bg text-success text-[11px] font-medium">
                      proknjižen
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-warning-bg text-warning text-[11px] font-medium">
                      u izradi
                    </span>
                  )}
                </td>
                <td className={tdNum}>{p.stavkeCount}</td>
                <td className={`${tdCls} max-w-[280px] truncate`}>
                  {p.napomena || "–"}
                </td>
                <td className={`${tdCls} text-right`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBrisi(p);
                    }}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
                    title="Obriši"
                  >
                    <IconTrash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={noviOpen}
        onClose={() => setNoviOpen(false)}
        title="Novi popis"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Datum popisa
              </label>
              <PkDateInput
                value={datumS}
                onChange={setDatumS}
                ariaLabel="Datum popisa"
                className="w-full"
                inputClassName="bg-cream-50"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Napomena (opciono)
              </label>
              <input
                value={napomena}
                onChange={(e) => setNapomena(e.target.value)}
                className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
          <p className="text-[11.5px] text-text-tertiary">
            Popis će učitati knjigovodstveno stanje (sve artikle sa prometom)
            na izabrani datum. Izbrojane količine se unose nakon toga.
          </p>
          {createError && (
            <p className="text-[12.5px] text-accent-500">{createError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setNoviOpen(false)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={createM.isPending}
              onClick={kreiraj}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {createM.isPending && (
                <IconLoader2 size={15} className="animate-spin" />
              )}
              Kreiraj popis
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={brisi != null}
        onClose={() => setBrisi(null)}
        title="Brisanje popisa"
      >
        {brisi && (
          <div className="space-y-3">
            <p className="text-[13px] text-text-primary">
              Obrisati popis <strong>{brisi.oznaka}</strong> od{" "}
              {formatDate(brisi.datum)}?
              {brisi.status === "PROKNJIZEN" &&
                " Popis je PROKNJIŽEN: brisanjem se njegova korekcija uklanja iz lagera."}
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
                  try {
                    await deleteM.mutateAsync(brisi.id);
                    setBrisi(null);
                  } catch (e) {
                    setObavijest(
                      e instanceof Error && e.message === "POSTOJI_NOVIJI_POPIS"
                        ? "Postoji noviji proknjižen popis koji zavisi od ovog. Prvo otknjižite ili obrišite noviji popis."
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

      <ConfirmModal
        open={obavijest != null}
        onClose={() => setObavijest(null)}
        title="Obavijest"
        message={obavijest}
      />
    </div>
  );
}

// ─── detalj popisa ───────────────────────────────────────────────────────────

function PopisDetail({
  orgId,
  popisId,
  onBack,
}: {
  orgId: number | null;
  popisId: number;
  onBack: () => void;
}) {
  const { data: popis, isLoading } = usePopis(orgId, popisId);
  const updateM = useUpdatePopis(orgId);
  const refreshM = useRefreshPopis(orgId);
  const proknjiziM = useProknjiziPopis(orgId);
  const otknjiziM = useOtknjiziPopis(orgId);

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  // lokalno uneseno (display stringovi po stavci), preko snimljenih
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [confirmKnjizi, setConfirmKnjizi] = useState(false);
  // poruka greške u PK modalu umjesto window.alert
  const [obavijest, setObavijest] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState<
    "brojanje" | "lista" | "obracun" | null
  >(null);

  const draft = popis?.status === "DRAFT";

  function kolicinaZa(s: PopisStavka): number {
    const edited = edits[s.id];
    if (edited !== undefined) return parseKm(edited, 3) ?? 0;
    return s.popisKolicina;
  }

  const stavke = useMemo(() => popis?.stavke ?? [], [popis]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stavke;
    return stavke.filter(
      (s) =>
        s.naziv.toLowerCase().includes(q) || s.sifra.toLowerCase().includes(q),
    );
  }, [stavke, search]);

  // obračun popisa (kao Com_Soft): knjigovodstveno / po popisu / višak / manjak
  const obracun = useMemo(() => {
    const knjig = emptySummary();
    const popisano = emptySummary();
    const visak = emptySummary();
    const manjak = emptySummary();
    for (const s of stavke) {
      const pk = kolicinaZa(s);
      addTo(knjig, vrijednosti(s, s.knjigKolicina));
      if (pk !== 0) addTo(popisano, vrijednosti(s, pk));
      const razlika = r2(pk - s.knjigKolicina);
      if (razlika > 0) addTo(visak, vrijednosti(s, razlika));
      else if (razlika < 0) addTo(manjak, vrijednosti(s, razlika));
    }
    knjig.count = stavke.length;
    return { knjig, popisano, visak, manjak };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stavke, edits]);

  async function spremi() {
    if (!popis) return;
    const changed = Object.entries(edits)
      .map(([id, v]) => ({ id: Number(id), popisKolicina: parseKm(v, 3) ?? 0 }))
      .filter((x) => Number.isFinite(x.popisKolicina) && x.popisKolicina >= 0);
    if (changed.length === 0) return;
    await updateM.mutateAsync({ id: popis.id, payload: { stavke: changed } });
    setEdits({});
  }

  async function proknjizi() {
    if (!popis) return;
    await spremi();
    await proknjiziM.mutateAsync(popis.id);
    setConfirmKnjizi(false);
  }

  // prazna lista za brojanje robe u radnji (namjerno bez količina)
  async function pdfListaZaBrojanje() {
    if (!popis || !fullOrg || pdfBusy) return;
    setPdfBusy("brojanje");
    try {
      await downloadTablePdf({
        fileName: `Lista-za-brojanje-${popis.datum}.pdf`,
        org: fullOrg,
        title: "POPISNA LISTA ZA BROJANJE",
        subtitle: `popis broj ${popis.oznaka}, na dan ${datumHr(popis.datum)} godine`,
        sections: [
          {
            cols: [
              { label: "R.B.", w: 26 },
              { label: "ŠIFRA", w: 44 },
              { label: "NAZIV ARTIKLA", w: 220 },
              { label: "JED. MJERE", w: 44 },
              { label: "MPC", w: 50, right: true },
              { label: "IZBROJANA KOLIČINA", w: 90, right: true },
            ],
            rows: stavke.map((s, i) => [
              `${i + 1}.`,
              s.sifra,
              s.naziv,
              s.jm,
              km(s.mpc),
              "",
            ]),
          },
        ],
      });
    } finally {
      setPdfBusy(null);
    }
  }

  // popisna lista SA unesenim količinama (zvanični dokument popisa)
  async function pdfPopisnaLista() {
    if (!popis || !fullOrg || pdfBusy) return;
    setPdfBusy("lista");
    try {
      let ukupnaKolicina = 0;
      let ukupnaVrijednost = 0;
      const rows = stavke.map((s, i) => {
        const pk = kolicinaZa(s);
        const vrijednost = r2(pk * s.mpc);
        ukupnaKolicina = r2(ukupnaKolicina + pk);
        ukupnaVrijednost = r2(ukupnaVrijednost + vrijednost);
        return [
          `${i + 1}.`,
          s.sifra,
          s.naziv,
          s.jm,
          km(s.mpc),
          kol(pk),
          km(vrijednost),
        ];
      });
      await downloadTablePdf({
        fileName: `Popisna-lista-${popis.datum}.pdf`,
        org: fullOrg,
        title: "POPISNA LISTA",
        subtitle: `popis broj ${popis.oznaka}, na dan ${datumHr(popis.datum)} godine`,
        info: popis.napomena ? [`Napomena: ${popis.napomena}`] : [],
        sections: [
          {
            cols: [
              { label: "R.B.", w: 26 },
              { label: "ŠIFRA", w: 44 },
              { label: "NAZIV ARTIKLA", w: 200 },
              { label: "JED. MJERE", w: 44 },
              { label: "MPC", w: 50, right: true },
              { label: "KOLIČINA PO POPISU", w: 80, right: true },
              { label: "MALOPRODAJNA VRIJEDNOST", w: 84, right: true },
            ],
            rows,
            totals: [
              "",
              "",
              `Ukupno (${stavke.length} stavki)`,
              "",
              "",
              kol(ukupnaKolicina),
              km(ukupnaVrijednost),
            ],
          },
        ],
      });
    } finally {
      setPdfBusy(null);
    }
  }

  async function pdfObracun() {
    if (!popis || !fullOrg || pdfBusy) return;
    setPdfBusy("obracun");
    try {
      const rows = stavke.map((s, i) => {
        const pk = kolicinaZa(s);
        const razlika = r2(pk - s.knjigKolicina);
        return [
          `${i + 1}.`,
          s.sifra,
          s.naziv,
          s.jm,
          km(s.mpc),
          kol(s.knjigKolicina),
          kol(pk),
          kol(razlika),
          km(r2(razlika * s.mpc)),
        ];
      });
      const o = obracun;
      const summary: PdfSection = {
        heading: "Obračun popisa",
        cols: [
          { label: "OPIS VRIJEDNOSTI", w: 150 },
          { label: "KNJIGOVODSTVENO STANJE", w: 90, right: true },
          { label: "STANJE PO POPISU", w: 90, right: true },
          { label: "VIŠAK PO POPISU", w: 90, right: true },
          { label: "MANJAK PO POPISU", w: 90, right: true },
        ],
        rows: [
          [
            "Maloprodajna vrijednost",
            km(o.knjig.malopr),
            km(o.popisano.malopr),
            km(o.visak.malopr),
            km(o.manjak.malopr),
          ],
          [
            "Iznos PDV-a",
            km(o.knjig.pdv),
            km(o.popisano.pdv),
            km(o.visak.pdv),
            km(o.manjak.pdv),
          ],
          [
            "Razlika u cijeni",
            km(o.knjig.ruc),
            km(o.popisano.ruc),
            km(o.visak.ruc),
            km(o.manjak.ruc),
          ],
          [
            "Nabavna vrijednost",
            km(o.knjig.nabavna),
            km(o.popisano.nabavna),
            km(o.visak.nabavna),
            km(o.manjak.nabavna),
          ],
          [
            "Broj stavki",
            String(o.knjig.count),
            String(o.popisano.count),
            String(o.visak.count),
            String(o.manjak.count),
          ],
        ],
      };
      await downloadTablePdf({
        fileName: `Obracun-popisa-${popis.datum}.pdf`,
        landscape: true,
        org: fullOrg,
        title: "OBRAČUN POPISA",
        subtitle: `popis broj ${popis.oznaka}, na dan ${datumHr(popis.datum)} godine`,
        info: popis.napomena ? [`Napomena: ${popis.napomena}`] : [],
        sections: [
          {
            cols: [
              { label: "R.B.", w: 24 },
              { label: "ŠIFRA", w: 40 },
              { label: "NAZIV ARTIKLA", w: 200 },
              { label: "JED. MJERE", w: 40 },
              { label: "MPC", w: 46, right: true },
              { label: "KNJIGOVODSTVENA KOLIČINA", w: 80, right: true },
              { label: "KOLIČINA PO POPISU", w: 80, right: true },
              { label: "RAZLIKA", w: 60, right: true },
              { label: "VRIJEDNOST RAZLIKE", w: 76, right: true },
            ],
            rows,
          },
          summary,
        ],
      });
    } finally {
      setPdfBusy(null);
    }
  }

  if (isLoading || !popis) {
    return (
      <p className="inline-flex items-center gap-2 text-[13px] text-text-tertiary">
        <IconLoader2 size={16} className="animate-spin" />
        Učitavanje popisa...
      </p>
    );
  }

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] text-text-tertiary hover:text-text-primary transition-colors"
        >
          <IconArrowLeft size={15} />
          Svi popisi
        </button>
        <h2 className="font-serif-display text-[20px] text-text-primary ml-2">
          Popis {popis.oznaka} · {formatDate(popis.datum)}
        </h2>
        {popis.status === "PROKNJIZEN" ? (
          <span className="inline-block px-2 py-0.5 rounded-[20px] bg-success-bg text-success text-[11px] font-medium">
            proknjižen
          </span>
        ) : (
          <span className="inline-block px-2 py-0.5 rounded-[20px] bg-warning-bg text-warning text-[11px] font-medium">
            u izradi
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={pdfListaZaBrojanje}
            disabled={pdfBusy != null}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
            title="Prazna lista za brojanje robe u radnji"
          >
            {pdfBusy === "brojanje" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Lista za brojanje
          </button>
          <button
            type="button"
            onClick={pdfPopisnaLista}
            disabled={pdfBusy != null}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
            title="Popisna lista sa unesenim količinama"
          >
            {pdfBusy === "lista" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Popisna lista
          </button>
          <button
            type="button"
            onClick={pdfObracun}
            disabled={pdfBusy != null}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            {pdfBusy === "obracun" ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Obračun popisa
          </button>
          {draft && (
            <>
              <button
                type="button"
                onClick={() => refreshM.mutate(popis.id)}
                disabled={refreshM.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
                title="Ponovo učitaj knjigovodstvene količine (nove kalkulacije)"
              >
                <IconRefresh
                  size={15}
                  className={refreshM.isPending ? "animate-spin" : ""}
                />
                Osvježi stanje
              </button>
              <button
                type="button"
                onClick={spremi}
                disabled={!hasEdits || updateM.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
              >
                {updateM.isPending && (
                  <IconLoader2 size={15} className="animate-spin" />
                )}
                Spremi unos
              </button>
              <button
                type="button"
                onClick={() => setConfirmKnjizi(true)}
                disabled={proknjiziM.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <IconLock size={15} />
                Proknjiži popis
              </button>
            </>
          )}
          {popis.status === "PROKNJIZEN" && (
            <button
              type="button"
              onClick={() =>
                otknjiziM.mutate(popis.id, {
                  onError: (e) =>
                    setObavijest(
                      e instanceof Error &&
                        e.message === "POSTOJI_NOVIJI_POPIS"
                        ? "Postoji noviji proknjižen popis koji zavisi od ovog. Prvo otknjižite noviji popis."
                        : "Greška, pokušajte ponovo.",
                    ),
                })
              }
              disabled={otknjiziM.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
              title="Vrati u izradu radi ispravke"
            >
              <IconLockOpen size={15} />
              Otknjiži
            </button>
          )}
        </div>
      </div>

      {/* obračun popisa (živi pregled) */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={thCls}>Opis vrijednosti</th>
              <th className={`${thCls} text-right`}>Knjigovodstveno</th>
              <th className={`${thCls} text-right`}>Po popisu</th>
              <th className={`${thCls} text-right`}>Višak</th>
              <th className={`${thCls} text-right`}>Manjak</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Maloprodajna vrijednost", "malopr"],
                ["Iznos PDV-a", "pdv"],
                ["Razlika u cijeni", "ruc"],
                ["Nabavna vrijednost", "nabavna"],
              ] as const
            ).map(([label, k]) => (
              <tr
                key={k}
                className="border-b border-cream-300 last:border-b-0"
              >
                <td className={tdCls}>{label}</td>
                <td className={tdNum}>{formatBAM(obracun.knjig[k])}</td>
                <td className={tdNum}>{formatBAM(obracun.popisano[k])}</td>
                <td className={`${tdNum} ${obracun.visak[k] !== 0 ? "text-warning font-medium" : ""}`}>
                  {formatBAM(obracun.visak[k])}
                </td>
                <td className={`${tdNum} ${obracun.manjak[k] !== 0 ? "text-accent-500 font-medium" : ""}`}>
                  {formatBAM(obracun.manjak[k])}
                </td>
              </tr>
            ))}
            <tr>
              <td className={tdCls}>Broj stavki</td>
              <td className={tdNum}>{obracun.knjig.count}</td>
              <td className={tdNum}>{obracun.popisano.count}</td>
              <td className={tdNum}>{obracun.visak.count}</td>
              <td className={tdNum}>{obracun.manjak.count}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži po šifri ili nazivu"
          className="w-full max-w-[320px] rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
        />
        {hasEdits && (
          <span className="text-[12px] text-warning font-medium">
            Imate nespremljene unose ({Object.keys(edits).length})
          </span>
        )}
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={thCls}>Šifra</th>
              <th className={thCls}>Naziv artikla</th>
              <th className={thCls}>J/M</th>
              <th className={`${thCls} text-right`}>MPC</th>
              <th className={`${thCls} text-right`}>Knjigovodstvena kol.</th>
              <th className={`${thCls} text-right`}>Količina po popisu</th>
              <th className={`${thCls} text-right`}>Razlika</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const pk = kolicinaZa(s);
              const razlika = r2(pk - s.knjigKolicina);
              return (
                <tr
                  key={s.id}
                  className="border-b border-cream-300 last:border-b-0"
                >
                  <td className={`${tdCls} tabular-nums`}>{s.sifra}</td>
                  <td className={tdCls}>{s.naziv}</td>
                  <td className={tdCls}>{s.jm}</td>
                  <td className={tdNum}>{km(s.mpc)}</td>
                  <td className={tdNum}>{kol(s.knjigKolicina)}</td>
                  <td className={`${tdCls} text-right`}>
                    {draft ? (
                      <div className="w-28 ml-auto">
                        <PkAmountInput
                          value={
                            edits[s.id] ??
                            (s.popisKolicina !== 0 ? kol(s.popisKolicina) : "")
                          }
                          onChange={(v) =>
                            setEdits((prev) => ({ ...prev, [s.id]: v }))
                          }
                          decimals={3}
                          placeholder="0"
                          ariaLabel={`Popisana količina: ${s.naziv}`}
                          className="text-right"
                        />
                      </div>
                    ) : (
                      <span className="tabular-nums">
                        {kol(s.popisKolicina)}
                      </span>
                    )}
                  </td>
                  <td
                    className={`${tdNum} font-medium ${
                      razlika < 0
                        ? "text-accent-500"
                        : razlika > 0
                          ? "text-warning"
                          : "text-success"
                    }`}
                  >
                    {kol(razlika)}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={7}
                >
                  Nema stavki za pretragu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={confirmKnjizi}
        onClose={() => setConfirmKnjizi(false)}
        title="Proknjižavanje popisa"
      >
        <div className="space-y-3">
          <p className="text-[13px] text-text-primary">
            Proknjižiti popis <strong>{popis.oznaka}</strong>? Lager se od{" "}
            {formatDate(popis.datum)} svodi na popisane količine (manjak{" "}
            {formatBAM(obracun.manjak.malopr)}, višak{" "}
            {formatBAM(obracun.visak.malopr)} po maloprodajnoj vrijednosti).
            Popis se zaključava; po potrebi se može otknjižiti.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setConfirmKnjizi(false)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={proknjiziM.isPending || updateM.isPending}
              onClick={proknjizi}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {(proknjiziM.isPending || updateM.isPending) && (
                <IconLoader2 size={15} className="animate-spin" />
              )}
              Proknjiži
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={obavijest != null}
        onClose={() => setObavijest(null)}
        title="Obavijest"
        message={obavijest}
      />
    </div>
  );
}
