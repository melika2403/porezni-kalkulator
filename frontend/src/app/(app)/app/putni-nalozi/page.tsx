"use client";

// Putni nalozi: izdavanje naloga za službeno putovanje, obračun troškova
// (dnevnice po Pravilniku: neoporezivo 25 KM; svaka puna 24h = 1 dnevnica,
// preko 12h = 1, 8-12h = 0,5; naknada za vlastito vozilo km x stopa) i PDF
// (nalog + obračun + izvještaj). Evidencija isplate ide ručno ili direktno
// iz blagajne (kreira blagajnički nalog isplate).
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCash,
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
import { PkSelect } from "src/components/app-shell/PkSelect";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  createPutniNalog,
  deletePutniNalog,
  listPutniNalozi,
  oznaciIsplatu,
  predlozeneDnevnice,
  updatePutniNalog,
  type PutniNalog,
  type PutniNalogPayload,
} from "src/api/putniNalozi";
import { createBlagajnaNalog } from "src/api/blagajna";
import { getOrganization, getWorkers } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import { isoToDisplay, parseDateInput, todayFormatted } from "src/lib/dateInput";
import { downloadPutniNalogPdf } from "src/sections/putni-nalozi/putniNalogPdf";
import { datumHr, downloadTablePdf } from "src/sections/lager/robaPdf";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;
const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// maska za vrijeme kao PkDateInput za datume: "0830" -> "08:30"
function maskVrijeme(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

type FormState =
  | null
  | { mode: "novi" }
  | { mode: "uredi"; nalog: PutniNalog }
  | { mode: "kopija"; nalog: PutniNalog };

export default function PutniNaloziPage() {
  const currentYear = new Date().getFullYear();
  const [godina, setGodina] = useState(currentYear);
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;
  const qc = useQueryClient();

  const { data: nalozi, isLoading } = useQuery({
    queryKey: ["putni-nalozi", orgId, godina],
    queryFn: () => unwrap(listPutniNalozi(orgId as number, godina)),
    enabled: orgId != null,
  });
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const [form, setForm] = useState<FormState>(null);
  const [brisi, setBrisi] = useState<PutniNalog | null>(null);
  const [isplata, setIsplata] = useState<PutniNalog | null>(null);
  const [pdfId, setPdfId] = useState<number | null>(null);
  const [radnikFilter, setRadnikFilter] = useState("");
  const [search, setSearch] = useState("");

  const deleteM = useMutation({
    mutationFn: (id: number) =>
      unwrap(deletePutniNalog(orgId as number, id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["putni-nalozi", orgId] });
      setBrisi(null);
    },
  });

  // filter po radniku (distinct imena iz naloga; pokriva i ručni unos)
  const radnici = useMemo(
    () => [...new Set((nalozi ?? []).map((n) => n.radnikIme))].sort((a, b) =>
      a.localeCompare(b, "bs"),
    ),
    [nalozi],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (nalozi ?? []).filter((n) => {
      if (radnikFilter && n.radnikIme !== radnikFilter) return false;
      if (!q) return true;
      return (
        n.radnikIme.toLowerCase().includes(q) ||
        n.relacija.toLowerCase().includes(q) ||
        n.svrha.toLowerCase().includes(q) ||
        n.oznaka.includes(q)
      );
    });
  }, [nalozi, radnikFilter, search]);

  const sume = useMemo(
    () => ({
      dnevnice: filtered.reduce((a, n) => a + n.brojDnevnica, 0),
      ukupno: r2(filtered.reduce((a, n) => a + n.ukupno, 0)),
      zaIsplatu: r2(filtered.reduce((a, n) => a + n.zaIsplatu, 0)),
    }),
    [filtered],
  );

  async function pdf(n: PutniNalog) {
    if (!fullOrg || pdfId != null) return;
    setPdfId(n.id);
    try {
      await downloadPutniNalogPdf(n, fullOrg);
    } finally {
      setPdfId(null);
    }
  }

  // knjiga putnih naloga: evidencija za godinu, prati filtere
  async function knjigaPdf() {
    if (!fullOrg || filtered.length === 0 || pdfId != null) return;
    setPdfId(-1);
    try {
      const info: string[] = [];
      if (radnikFilter) info.push(`Radnik: ${radnikFilter}`);
      if (search.trim()) info.push(`Pretraga: "${search.trim()}"`);
      await downloadTablePdf({
        fileName: `Knjiga-putnih-naloga-${godina}.pdf`,
        org: fullOrg,
        title: "KNJIGA PUTNIH NALOGA",
        subtitle: `za ${godina}. godinu (na dan ${datumHr(new Date().toISOString().slice(0, 10))})`,
        info,
        sections: [
          {
            cols: [
              { label: "BROJ", w: 30 },
              { label: "DATUM", w: 46 },
              { label: "RADNIK", w: 85 },
              { label: "RELACIJA", w: 115 },
              { label: "PERIOD PUTA", w: 82 },
              { label: "DNEVNICE", w: 40, right: true },
              { label: "UKUPNO", w: 52, right: true },
              { label: "ZA ISPLATU", w: 52, right: true },
              { label: "ISPLAĆEN", w: 48 },
            ],
            rows: filtered.map((n) => [
              n.oznaka,
              datumHr(n.datum),
              n.radnikIme,
              n.relacija,
              `${datumHr(n.polazakDatum)} - ${datumHr(n.povratakDatum)}`,
              n.brojDnevnica.toLocaleString("de-DE"),
              n.ukupno.toLocaleString("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
              n.zaIsplatu.toLocaleString("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
              n.isplacenoDatum ? datumHr(n.isplacenoDatum) : "",
            ]),
            totals: [
              "",
              "",
              `Ukupno (${filtered.length} naloga)`,
              "",
              "",
              sume.dnevnice.toLocaleString("de-DE"),
              sume.ukupno.toLocaleString("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
              sume.zaIsplatu.toLocaleString("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
              "",
            ],
          },
        ],
      });
    } finally {
      setPdfId(null);
    }
  }

  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <h1 className="font-serif-display text-[clamp(2rem,3.5vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
            Putni nalozi
            <span className="text-brand-600" style={{ fontStyle: "italic" }}>
              .
            </span>
          </h1>
          <HelpButton slug="putni-nalozi" />
        </div>
        <p className="text-[14px] leading-6 text-text-tertiary mt-2 max-w-xl">
          Nalozi za službena putovanja sa obračunom dnevnica (neoporezivo 25
          KM) i stvarnih troškova; uz obračun se prilažu računi.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <div className={labelCls}>Godina</div>
          <PkSelect
            ariaLabel="Godina"
            value={String(godina)}
            onChange={(v) => setGodina(Number(v) || currentYear)}
            options={[0, 1, 2].map((d) => ({
              value: String(currentYear - d),
              label: String(currentYear - d),
            }))}
          />
        </div>
        <div>
          <div className={labelCls}>Radnik</div>
          <PkSelect
            ariaLabel="Radnik"
            value={radnikFilter}
            onChange={(v) => setRadnikFilter(String(v ?? ""))}
            options={[
              { value: "", label: "Svi radnici" },
              ...radnici.map((r) => ({ value: r, label: r })),
            ]}
          />
        </div>
        <div className="flex-1 min-w-[180px] max-w-[260px]">
          <div className={labelCls}>Pretraga</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Relacija, svrha, broj..."
            className="w-full rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={knjigaPdf}
            disabled={pdfId != null || filtered.length === 0}
            title="Evidencija putnih naloga za godinu (prati filtere)"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {pdfId === -1 ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Knjiga naloga (PDF)
          </button>
          <button
            type="button"
            onClick={() => setForm({ mode: "novi" })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={15} />
            Novi putni nalog
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={thCls}>Broj</th>
              <th className={thCls}>Datum</th>
              <th className={thCls}>Ime i prezime</th>
              <th className={thCls}>Relacija</th>
              <th className={thCls}>Period puta</th>
              <th className={`${thCls} text-right`}>Dnevnice</th>
              <th className={`${thCls} text-right`}>Ukupno</th>
              <th className={`${thCls} text-right`}>Za isplatu</th>
              <th className={thCls}>Isplata</th>
              <th className={`${thCls} text-right`}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={10}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={10}
                >
                  {(nalozi ?? []).length === 0
                    ? `Nema putnih naloga u ${godina}. godini.`
                    : "Nema naloga za izabrane filtere."}
                </td>
              </tr>
            )}
            {filtered.map((n) => (
              <tr
                key={n.id}
                className="border-b border-cream-300 last:border-b-0"
              >
                <td className={`${tdCls} font-medium tabular-nums`}>
                  {n.oznaka}
                </td>
                <td className={tdCls}>{formatDate(n.datum)}</td>
                <td className={tdCls}>{n.radnikIme}</td>
                <td className={`${tdCls} max-w-[200px] truncate`}>
                  {n.relacija}
                </td>
                <td className={tdCls}>
                  {formatDate(n.polazakDatum)} - {formatDate(n.povratakDatum)}
                </td>
                <td className={tdNum}>
                  {n.brojDnevnica.toLocaleString("de-DE")}
                </td>
                <td className={tdNum}>{formatBAM(n.ukupno)}</td>
                <td className={`${tdNum} font-medium`}>
                  {formatBAM(n.zaIsplatu)}
                </td>
                <td className={tdCls}>
                  {n.isplacenoDatum ? (
                    <span
                      className="inline-block px-2 py-0.5 rounded-[20px] bg-success-bg text-success text-[11px] font-medium"
                      title={`Isplaćen ${formatDate(n.isplacenoDatum)}${n.blagajnaNalogId ? " iz blagajne" : ""}`}
                    >
                      isplaćen
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-warning-bg text-warning text-[11px] font-medium">
                      otvoren
                    </span>
                  )}
                </td>
                <td className={tdCls}>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => setIsplata(n)}
                      className={`p-1.5 rounded-lg transition-colors hover:bg-cream-200 ${n.isplacenoDatum ? "text-success" : "text-text-tertiary hover:text-brand-600"}`}
                      title={
                        n.isplacenoDatum
                          ? "Isplata evidentirana (klik za pregled/poništavanje)"
                          : "Evidentiraj isplatu (blagajna ili račun)"
                      }
                    >
                      <IconCash size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => pdf(n)}
                      disabled={pdfId != null}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
                      title="Putni nalog sa obračunom (PDF)"
                    >
                      {pdfId === n.id ? (
                        <IconLoader2 size={16} className="animate-spin" />
                      ) : (
                        <IconDownload size={16} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ mode: "kopija", nalog: n })}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                      title="Kopiraj (isti radnik i relacija, novi datumi)"
                    >
                      <IconCopy size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ mode: "uredi", nalog: n })}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                      title="Uredi / dopuni obračun"
                    >
                      <IconPencil size={16} />
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
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-cream-300 bg-cream-50">
                <td className={`${tdCls} font-medium`} colSpan={5}>
                  Ukupno ({filtered.length} naloga)
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {sume.dnevnice.toLocaleString("de-DE")}
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(sume.ukupno)}
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(sume.zaIsplatu)}
                </td>
                <td className={tdCls} />
                <td className={tdCls} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {form != null && orgId != null && (
        <PutniNalogModal
          orgId={orgId}
          nalog={form.mode === "uredi" ? form.nalog : null}
          predlozak={form.mode === "kopija" ? form.nalog : null}
          nalozi={nalozi ?? []}
          onClose={() => setForm(null)}
        />
      )}

      {isplata != null && orgId != null && (
        <IsplataModal
          orgId={orgId}
          nalog={isplata}
          onClose={() => setIsplata(null)}
        />
      )}

      <Modal
        open={brisi != null}
        onClose={() => setBrisi(null)}
        title="Brisanje putnog naloga"
      >
        {brisi && (
          <div className="space-y-3">
            <p className="text-[13px] text-text-primary">
              Obrisati putni nalog <strong>{brisi.oznaka}</strong> (
              {brisi.radnikIme}, {brisi.relacija})?
              {brisi.blagajnaNalogId
                ? " Blagajnički nalog isplate se NE briše automatski, uklonite ga na Blagajni ako treba."
                : ""}
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
                onClick={() => deleteM.mutate(brisi.id)}
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

// ─── evidencija isplate ──────────────────────────────────────────────────────

function IsplataModal({
  orgId,
  nalog,
  onClose,
}: {
  orgId: number;
  nalog: PutniNalog;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [datumS, setDatumS] = useState(todayFormatted());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"blagajna" | "oznaci" | "ponisti" | null>(
    null,
  );

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["putni-nalozi", orgId] });
    qc.invalidateQueries({ queryKey: ["blagajna", orgId] });
  }

  // isplata iz blagajne: prvo blagajnički nalog (čuva guard minimalnog
  // salda), pa oznaka na putnom nalogu sa vezom
  async function izBlagajne() {
    setError(null);
    const datum = parseDateInput(datumS);
    if (!datum) return setError("Unesite ispravan datum isplate.");
    setBusy("blagajna");
    try {
      const bl = await createBlagajnaNalog(orgId, {
        tip: "ISPLATA",
        datum,
        iznos: nalog.zaIsplatu,
        lice: nalog.radnikIme,
        osnov: `Putni nalog ${nalog.oznaka}, ${nalog.relacija}`,
      });
      if (!bl.ok) {
        setError(
          bl.error === "NEDOVOLJAN_SALDO"
            ? "U blagajni nema dovoljno gotovine na taj datum (saldo bi otišao u minus). Prvo položite pazar ili dotaciju."
            : `Greška blagajne: ${bl.error}`,
        );
        return;
      }
      const r = await oznaciIsplatu(orgId, nalog.id, {
        datum,
        blagajnaNalogId: bl.data.id,
      });
      if (!r.ok) {
        setError(`Blagajnički nalog je kreiran, ali oznaka nije upisana: ${r.error}`);
        return;
      }
      invalidate();
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function samoOznaci() {
    setError(null);
    const datum = parseDateInput(datumS);
    if (!datum) return setError("Unesite ispravan datum isplate.");
    setBusy("oznaci");
    try {
      const r = await oznaciIsplatu(orgId, nalog.id, { datum });
      if (!r.ok) {
        setError(`Greška: ${r.error}`);
        return;
      }
      invalidate();
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function ponisti() {
    setError(null);
    setBusy("ponisti");
    try {
      const r = await oznaciIsplatu(orgId, nalog.id, { datum: null });
      if (!r.ok) {
        setError(`Greška: ${r.error}`);
        return;
      }
      invalidate();
      onClose();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Isplata putnog naloga ${nalog.oznaka}`}
    >
      <div className="space-y-4">
        <p className="text-[13px] text-text-primary">
          {nalog.radnikIme}, {nalog.relacija}: za isplatu{" "}
          <strong>{formatBAM(nalog.zaIsplatu)}</strong>
          {nalog.zaIsplatu < 0 && " (povrat u korist obrta)"}.
        </p>

        {nalog.isplacenoDatum ? (
          <>
            <p className="text-[13px] text-text-primary">
              Nalog je označen isplaćenim{" "}
              <strong>{formatDate(nalog.isplacenoDatum)}</strong>
              {nalog.blagajnaNalogId
                ? " (iz blagajne, blagajnički nalog postoji)"
                : ""}
              .
            </p>
            {nalog.blagajnaNalogId != null && (
              <p className="text-[12px] text-text-tertiary">
                Poništavanje skida samo oznaku sa putnog naloga; blagajnički
                nalog uklonite na Blagajni ako je pogrešan.
              </p>
            )}
            {error && (
              <p className="text-[12.5px] text-accent-500">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
              >
                Zatvori
              </button>
              <button
                type="button"
                disabled={busy != null}
                onClick={ponisti}
                className="px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {busy === "ponisti" ? "Sačekajte..." : "Poništi oznaku isplate"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-[160px]">
              <label className={labelCls}>Datum isplate</label>
              <PkDateInput
                value={datumS}
                onChange={setDatumS}
                ariaLabel="Datum isplate"
                className="w-full"
                inputClassName="bg-cream-50"
              />
            </div>
            {error && (
              <p className="text-[12.5px] text-accent-500">{error}</p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
              >
                Odustani
              </button>
              <button
                type="button"
                disabled={busy != null}
                onClick={samoOznaci}
                title="Za isplate preko računa: samo upiše datum isplate"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
              >
                {busy === "oznaci" && (
                  <IconLoader2 size={15} className="animate-spin" />
                )}
                Samo označi isplaćenim
              </button>
              <button
                type="button"
                disabled={busy != null || nalog.zaIsplatu <= 0}
                onClick={izBlagajne}
                title={
                  nalog.zaIsplatu > 0
                    ? "Kreira blagajnički nalog isplate i označi putni nalog"
                    : "Nema iznosa za isplatu iz blagajne"
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {busy === "blagajna" ? (
                  <IconLoader2 size={15} className="animate-spin" />
                ) : (
                  <IconCash size={15} />
                )}
                Isplati iz blagajne
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── forma naloga ────────────────────────────────────────────────────────────

function PutniNalogModal({
  orgId,
  nalog,
  predlozak,
  nalozi,
  onClose,
}: {
  orgId: number;
  /** postojeći nalog za uređivanje; null = novi */
  nalog: PutniNalog | null;
  /** kopija: predložak čiji se radnik/relacija/svrha/prevoz prenose */
  predlozak: PutniNalog | null;
  /** lista naloga godine (predpopuna iz zadnjeg naloga radnika) */
  nalozi: PutniNalog[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: workers } = useQuery({
    queryKey: ["pk-workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId)),
  });

  const baza = nalog ?? predlozak;
  const [datumS, setDatumS] = useState(
    nalog ? isoToDisplay(nalog.datum) : todayFormatted(),
  );
  const [workerId, setWorkerId] = useState<number | null>(
    baza?.workerId ?? null,
  );
  const [radnikIme, setRadnikIme] = useState(baza?.radnikIme ?? "");
  const [relacija, setRelacija] = useState(baza?.relacija ?? "");
  const [svrha, setSvrha] = useState(baza?.svrha ?? "");
  const [prevoz, setPrevoz] = useState(baza?.prevoznoSredstvo ?? "");
  const [polazakS, setPolazakS] = useState(
    nalog ? isoToDisplay(nalog.polazakDatum) : todayFormatted(),
  );
  const [polazakV, setPolazakV] = useState(nalog?.polazakVrijeme ?? "");
  const [povratakS, setPovratakS] = useState(
    nalog ? isoToDisplay(nalog.povratakDatum) : todayFormatted(),
  );
  const [povratakV, setPovratakV] = useState(nalog?.povratakVrijeme ?? "");
  const [dnevnicaS, setDnevnicaS] = useState(
    formatKm(baza?.dnevnicaIznos ?? 25),
  );
  const [brojDnevnicaS, setBrojDnevnicaS] = useState(
    nalog ? String(nalog.brojDnevnica).replace(".", ",") : "",
  );
  const [akontacijaS, setAkontacijaS] = useState(
    nalog?.akontacija ? formatKm(nalog.akontacija) : "",
  );
  const [prevozS, setPrevozS] = useState(
    nalog?.troskoviPrevoza ? formatKm(nalog.troskoviPrevoza) : "",
  );
  const [smjestajS, setSmjestajS] = useState(
    nalog?.troskoviSmjestaja ? formatKm(nalog.troskoviSmjestaja) : "",
  );
  const [ostaloS, setOstaloS] = useState(
    nalog?.ostaliTroskovi ? formatKm(nalog.ostaliTroskovi) : "",
  );
  const [ostaloOpis, setOstaloOpis] = useState(nalog?.ostaloOpis ?? "");
  const [izvjestaj, setIzvjestaj] = useState(nalog?.izvjestaj ?? "");
  // vlastito vozilo: km se unosi po putu, stopa se prenosi iz predloška
  const [kmS, setKmS] = useState(
    nalog?.predjeniKm ? formatKm(nalog.predjeniKm) : "",
  );
  const [kmStopaS, setKmStopaS] = useState(
    baza?.kmStopa ? formatKm(baza.kmStopa) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const polazakIso = parseDateInput(polazakS);
  const povratakIso = parseDateInput(povratakS);
  const prijedlog =
    polazakIso && povratakIso
      ? predlozeneDnevnice(
          polazakIso,
          polazakV || null,
          povratakIso,
          povratakV || null,
        )
      : 0;

  // auto-primjena prijedloga dnevnica dok korisnik ne ukuca svoj broj
  // (novi nalog i kopija; postojeći ima svoj broj)
  const [dnevniceRucno, setDnevniceRucno] = useState(nalog != null);
  const [autoPrimijenjen, setAutoPrimijenjen] = useState(0);
  if (!dnevniceRucno && prijedlog > 0 && prijedlog !== autoPrimijenjen) {
    setAutoPrimijenjen(prijedlog);
    setBrojDnevnicaS(String(prijedlog).replace(".", ","));
  }

  const brojDnevnica = parseKm(brojDnevnicaS) ?? 0;
  const dnevnica = parseKm(dnevnicaS) ?? 0;
  const kmNaknada = r2((parseKm(kmS) ?? 0) * (parseKm(kmStopaS) ?? 0));
  const ukupno = r2(
    brojDnevnica * dnevnica +
      kmNaknada +
      (parseKm(prevozS) ?? 0) +
      (parseKm(smjestajS) ?? 0) +
      (parseKm(ostaloS) ?? 0),
  );
  const zaIsplatu = r2(ukupno - (parseKm(akontacijaS) ?? 0));

  const saveM = useMutation({
    mutationFn: (payload: PutniNalogPayload) =>
      nalog
        ? unwrap(updatePutniNalog(orgId, nalog.id, payload))
        : unwrap(createPutniNalog(orgId, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["putni-nalozi", orgId] });
      onClose();
    },
    onError: () => setError("Greška pri spremanju, pokušajte ponovo."),
  });

  function spremi() {
    setError(null);
    const datum = parseDateInput(datumS);
    if (!datum) return setError("Unesite datum izdavanja.");
    if (!radnikIme.trim()) return setError("Unesite ime i prezime.");
    if (!relacija.trim()) return setError("Unesite relaciju (odredište).");
    if (!svrha.trim()) return setError("Unesite svrhu putovanja.");
    if (!polazakIso || !povratakIso || povratakIso < polazakIso) {
      return setError("Provjerite datume polaska i povratka.");
    }
    saveM.mutate({
      datum,
      workerId,
      radnikIme: radnikIme.trim(),
      relacija: relacija.trim(),
      svrha: svrha.trim(),
      prevoznoSredstvo: prevoz.trim() || undefined,
      polazakDatum: polazakIso,
      polazakVrijeme: polazakV.trim() || undefined,
      povratakDatum: povratakIso,
      povratakVrijeme: povratakV.trim() || undefined,
      dnevnicaIznos: dnevnica,
      brojDnevnica,
      akontacija: parseKm(akontacijaS) ?? 0,
      troskoviPrevoza: parseKm(prevozS) ?? 0,
      troskoviSmjestaja: parseKm(smjestajS) ?? 0,
      ostaliTroskovi: parseKm(ostaloS) ?? 0,
      ostaloOpis: ostaloOpis.trim() || undefined,
      izvjestaj: izvjestaj.trim() || undefined,
      predjeniKm: parseKm(kmS),
      kmStopa: parseKm(kmStopaS),
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        nalog
          ? `Putni nalog ${nalog.oznaka}`
          : predlozak
            ? `Novi putni nalog (kopija ${predlozak.oznaka})`
            : "Novi putni nalog"
      }
      maxWidthClass="max-w-[860px]"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Datum izdavanja</label>
            <PkDateInput
              value={datumS}
              onChange={setDatumS}
              ariaLabel="Datum izdavanja"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div className="col-span-2 lg:col-span-2">
            <label className={labelCls}>Radnik / vlasnik</label>
            <PkSelect
              ariaLabel="Radnik"
              value={workerId != null ? String(workerId) : ""}
              onChange={(v) => {
                const id = v ? Number(v) : null;
                setWorkerId(id);
                const w = (workers ?? []).find((x) => x.id === id);
                if (w) setRadnikIme(`${w.firstName} ${w.lastName}`.trim());
                // predpopuna iz zadnjeg naloga radnika (lista je već
                // sortirana od najnovijeg); samo prazna polja
                if (id != null && !nalog) {
                  const zadnji = nalozi.find((x) => x.workerId === id);
                  if (zadnji) {
                    if (!prevoz.trim() && zadnji.prevoznoSredstvo) {
                      setPrevoz(zadnji.prevoznoSredstvo);
                    }
                    if (!relacija.trim()) setRelacija(zadnji.relacija);
                    if (!svrha.trim()) setSvrha(zadnji.svrha);
                    if (!kmStopaS.trim() && zadnji.kmStopa != null) {
                      setKmStopaS(formatKm(zadnji.kmStopa));
                    }
                  }
                }
              }}
              searchable
              options={[
                { value: "", label: "Ručni unos imena" },
                ...(workers ?? []).map((w) => ({
                  value: String(w.id),
                  label: `${w.firstName} ${w.lastName}${w.role === "VLASNIK" ? " (vlasnik)" : ""}`,
                })),
              ]}
              wrapStyle={{ width: "100%" }}
            />
          </div>
          <div>
            <label className={labelCls}>Ime i prezime</label>
            <input
              value={radnikIme}
              onChange={(e) => setRadnikIme(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Relacija (odredište)</label>
            <input
              value={relacija}
              onChange={(e) => setRelacija(e.target.value)}
              placeholder="npr. Sarajevo - Mostar - Sarajevo"
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Svrha putovanja</label>
            <input
              value={svrha}
              onChange={(e) => setSvrha(e.target.value)}
              placeholder="npr. nabavka robe, sajam, sastanak sa kupcem"
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Prevozno sredstvo</label>
            <input
              value={prevoz}
              onChange={(e) => setPrevoz(e.target.value)}
              placeholder="npr. putničko vozilo reg. A12-B-345"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Polazak</label>
            <PkDateInput
              value={polazakS}
              onChange={setPolazakS}
              ariaLabel="Datum polaska"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Vrijeme polaska</label>
            <input
              value={polazakV}
              onChange={(e) => setPolazakV(maskVrijeme(e.target.value))}
              placeholder="HH:MM"
              inputMode="numeric"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Povratak</label>
            <PkDateInput
              value={povratakS}
              onChange={setPovratakS}
              ariaLabel="Datum povratka"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Vrijeme povratka</label>
            <input
              value={povratakV}
              onChange={(e) => setPovratakV(maskVrijeme(e.target.value))}
              placeholder="HH:MM"
              inputMode="numeric"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Isplaćena akontacija (KM)</label>
            <PkAmountInput
              value={akontacijaS}
              onChange={setAkontacijaS}
              placeholder="0,00"
              ariaLabel="Akontacija"
              className="bg-cream-50"
            />
          </div>
        </div>

        <div className="rounded-xl border border-cream-300 bg-cream-50 p-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Broj dnevnica</label>
              <PkAmountInput
                value={brojDnevnicaS}
                onChange={(v) => {
                  setBrojDnevnicaS(v);
                  setDnevniceRucno(true);
                }}
                placeholder="0"
                ariaLabel="Broj dnevnica"
                className="bg-cream-100"
              />
              {prijedlog > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBrojDnevnicaS(String(prijedlog).replace(".", ","));
                    setDnevniceRucno(true);
                  }}
                  className="text-[11px] text-info hover:underline mt-1"
                >
                  Prijedlog iz trajanja: {prijedlog.toLocaleString("de-DE")}
                </button>
              )}
            </div>
            <div>
              <label className={labelCls}>Dnevnica (KM)</label>
              <PkAmountInput
                value={dnevnicaS}
                onChange={setDnevnicaS}
                ariaLabel="Iznos dnevnice"
                className="bg-cream-100"
              />
            </div>
            <div>
              <label
                className={labelCls}
                title="Naknada za upotrebu vlastitog vozila u službene svrhe: pređeni kilometri x KM po km"
              >
                Vlastito vozilo: km
              </label>
              <PkAmountInput
                value={kmS}
                onChange={setKmS}
                placeholder="0"
                ariaLabel="Pređeni kilometri"
                className="bg-cream-100"
              />
            </div>
            <div>
              <label className={labelCls}>KM po km</label>
              <PkAmountInput
                value={kmStopaS}
                onChange={setKmStopaS}
                placeholder="npr. 0,50"
                ariaLabel="Naknada po kilometru"
                className="bg-cream-100"
              />
              {kmNaknada > 0 && (
                <p className="text-[11px] text-text-tertiary mt-1 tabular-nums">
                  Naknada: {formatBAM(kmNaknada)}
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Troškovi prevoza</label>
              <PkAmountInput
                value={prevozS}
                onChange={setPrevozS}
                placeholder="0,00"
                ariaLabel="Troškovi prevoza"
                className="bg-cream-100"
              />
            </div>
            <div>
              <label className={labelCls}>Troškovi smještaja</label>
              <PkAmountInput
                value={smjestajS}
                onChange={setSmjestajS}
                placeholder="0,00"
                ariaLabel="Troškovi smještaja"
                className="bg-cream-100"
              />
            </div>
            <div>
              <label className={labelCls}>Ostali troškovi</label>
              <PkAmountInput
                value={ostaloS}
                onChange={setOstaloS}
                placeholder="0,00"
                ariaLabel="Ostali troškovi"
                className="bg-cream-100"
              />
            </div>
            <div>
              <label className={labelCls}>Opis ostalih troškova</label>
              <input
                value={ostaloOpis}
                onChange={(e) => setOstaloOpis(e.target.value)}
                placeholder="npr. parking, cestarina"
                className={inputCls.replace("bg-cream-50", "bg-cream-100")}
              />
            </div>
            <div className="col-span-2 lg:col-span-4 flex items-end">
              <p className="text-[12.5px] text-text-primary">
                Ukupno <strong>{formatBAM(ukupno)}</strong> · za isplatu{" "}
                <strong
                  className={zaIsplatu < 0 ? "text-accent-500" : "text-brand-700"}
                >
                  {formatBAM(zaIsplatu)}
                </strong>
              </p>
            </div>
          </div>
          {dnevnica > 25 && (
            <p className="rounded-lg bg-warning-bg text-warning text-[12px] leading-5 px-3 py-2 mt-3">
              Neoporezivo je do 25,00 KM po dnevnici: razlika od{" "}
              {formatBAM(r2(dnevnica - 25))} po dnevnici se oporezuje kao
              plata radnika.
            </p>
          )}
        </div>

        <div>
          <label className={labelCls}>Izvještaj sa puta (opciono)</label>
          <textarea
            value={izvjestaj}
            onChange={(e) => setIzvjestaj(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </div>

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
            disabled={saveM.isPending}
            onClick={spremi}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saveM.isPending && (
              <IconLoader2 size={15} className="animate-spin" />
            )}
            Spremi nalog
          </button>
        </div>
      </div>
    </Modal>
  );
}
