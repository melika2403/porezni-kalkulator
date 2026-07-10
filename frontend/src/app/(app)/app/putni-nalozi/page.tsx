"use client";

// Putni nalozi: izdavanje naloga za službeno putovanje, obračun troškova
// (dnevnice po Pravilniku: neoporezivo 25 KM; svaka puna 24h = 1 dnevnica,
// preko 12h = 1, 8-12h = 0,5) i PDF (nalog + obračun + izvještaj).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconDownload,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  createPutniNalog,
  deletePutniNalog,
  listPutniNalozi,
  predlozeneDnevnice,
  updatePutniNalog,
  type PutniNalog,
  type PutniNalogPayload,
} from "src/api/putniNalozi";
import { getOrganization, getWorkers } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import { isoToDisplay, parseDateInput, todayFormatted } from "src/lib/dateInput";
import { downloadPutniNalogPdf } from "src/sections/putni-nalozi/putniNalogPdf";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;
const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";

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

  const [formNalog, setFormNalog] = useState<PutniNalog | null | "novi">(null);
  const [brisi, setBrisi] = useState<PutniNalog | null>(null);
  const [pdfId, setPdfId] = useState<number | null>(null);

  const deleteM = useMutation({
    mutationFn: (id: number) =>
      unwrap(deletePutniNalog(orgId as number, id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["putni-nalozi", orgId] });
      setBrisi(null);
    },
  });

  async function pdf(n: PutniNalog) {
    if (!fullOrg || pdfId != null) return;
    setPdfId(n.id);
    try {
      await downloadPutniNalogPdf(n, fullOrg);
    } finally {
      setPdfId(null);
    }
  }

  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="font-serif-display text-[clamp(2rem,3.5vw,2.8rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
          Putni nalozi
          <span className="text-brand-600" style={{ fontStyle: "italic" }}>
            .
          </span>
        </h1>
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
        <button
          type="button"
          onClick={() => setFormNalog("novi")}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <IconPlus size={15} />
          Novi putni nalog
        </button>
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
              <th className={`${thCls} text-right`}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={9}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && (nalozi ?? []).length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={9}
                >
                  Nema putnih naloga u {godina}. godini.
                </td>
              </tr>
            )}
            {(nalozi ?? []).map((n) => (
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
                  <div className="flex items-center justify-end gap-0.5">
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
                      onClick={() => setFormNalog(n)}
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
        </table>
      </div>

      {formNalog != null && orgId != null && (
        <PutniNalogModal
          orgId={orgId}
          nalog={formNalog === "novi" ? null : formNalog}
          onClose={() => setFormNalog(null)}
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

// ─── forma naloga ────────────────────────────────────────────────────────────

function PutniNalogModal({
  orgId,
  nalog,
  onClose,
}: {
  orgId: number;
  /** null = novi */
  nalog: PutniNalog | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: workers } = useQuery({
    queryKey: ["pk-workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId)),
  });

  const [datumS, setDatumS] = useState(
    nalog ? isoToDisplay(nalog.datum) : todayFormatted(),
  );
  const [workerId, setWorkerId] = useState<number | null>(
    nalog?.workerId ?? null,
  );
  const [radnikIme, setRadnikIme] = useState(nalog?.radnikIme ?? "");
  const [relacija, setRelacija] = useState(nalog?.relacija ?? "");
  const [svrha, setSvrha] = useState(nalog?.svrha ?? "");
  const [prevoz, setPrevoz] = useState(nalog?.prevoznoSredstvo ?? "");
  const [polazakS, setPolazakS] = useState(
    nalog ? isoToDisplay(nalog.polazakDatum) : todayFormatted(),
  );
  const [polazakV, setPolazakV] = useState(nalog?.polazakVrijeme ?? "");
  const [povratakS, setPovratakS] = useState(
    nalog ? isoToDisplay(nalog.povratakDatum) : todayFormatted(),
  );
  const [povratakV, setPovratakV] = useState(nalog?.povratakVrijeme ?? "");
  const [dnevnicaS, setDnevnicaS] = useState(
    formatKm(nalog?.dnevnicaIznos ?? 25),
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

  const brojDnevnica = parseKm(brojDnevnicaS) ?? 0;
  const dnevnica = parseKm(dnevnicaS) ?? 0;
  const ukupno =
    Math.round(
      (brojDnevnica * dnevnica +
        (parseKm(prevozS) ?? 0) +
        (parseKm(smjestajS) ?? 0) +
        (parseKm(ostaloS) ?? 0)) *
        100,
    ) / 100;
  const zaIsplatu = Math.round((ukupno - (parseKm(akontacijaS) ?? 0)) * 100) / 100;

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
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={nalog ? `Putni nalog ${nalog.oznaka}` : "Novi putni nalog"}
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
              onChange={(e) => setPolazakV(e.target.value)}
              placeholder="HH:MM"
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
              onChange={(e) => setPovratakV(e.target.value)}
              placeholder="HH:MM"
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
                onChange={setBrojDnevnicaS}
                placeholder="0"
                ariaLabel="Broj dnevnica"
                className="bg-cream-100"
              />
              {prijedlog > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setBrojDnevnicaS(String(prijedlog).replace(".", ","))
                  }
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
            <div className="flex items-end pb-1">
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
