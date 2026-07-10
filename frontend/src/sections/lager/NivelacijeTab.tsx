"use client";

// Nivelacija cijena (zapisnik o promjeni cijena): prebacuje količinu artikla
// sa stare MPC na novu na lageru; razlika vrijednosti automatski ulazi u TKM
// (povećanje = zaduženje, smanjenje = storno). Zapisnik se štampa kao PDF.
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
  useCreateNivelacija,
  useDeleteNivelacija,
  useLager,
  useNivelacije,
} from "src/hooks/useLager";
import type { Nivelacija } from "src/api/lager";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
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
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type NovaStavka = {
  uid: number;
  artikalId: number;
  sifra: string;
  naziv: string;
  jm: string;
  staraMpc: number;
  stanje: number;
  kolicina: number;
  novaMpc: number;
};

export function NivelacijeTab({ orgId }: { orgId: number | null }) {
  const { data: nivelacije, isLoading } = useNivelacije(orgId);
  const deleteM = useDeleteNivelacija(orgId);
  const [novaOpen, setNovaOpen] = useState(false);
  const [brisi, setBrisi] = useState<Nivelacija | null>(null);
  const [pdfId, setPdfId] = useState<number | null>(null);

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  async function pdfZapisnik(n: Nivelacija) {
    if (!fullOrg || pdfId != null) return;
    setPdfId(n.id);
    try {
      await downloadTablePdf({
        fileName: `Nivelacija-${n.broj}-${String(n.godina).slice(-2)}.pdf`,
        org: fullOrg,
        title: "ZAPISNIK O PROMJENI CIJENA (NIVELACIJA)",
        subtitle: `broj ${n.oznaka}, od ${datumHr(n.datum)} godine`,
        info: n.napomena ? [`Napomena: ${n.napomena}`] : [],
        sections: [
          {
            cols: [
              { label: "R.B.", w: 26 },
              { label: "ŠIFRA", w: 44 },
              { label: "NAZIV ARTIKLA", w: 180 },
              { label: "JED. MJERE", w: 44 },
              { label: "KOLIČINA", w: 52, right: true },
              { label: "STARA CIJENA", w: 56, right: true },
              { label: "NOVA CIJENA", w: 56, right: true },
              { label: "VRIJEDNOST PO STAROJ", w: 66, right: true },
              { label: "VRIJEDNOST PO NOVOJ", w: 66, right: true },
              { label: "RAZLIKA", w: 60, right: true },
            ],
            rows: n.stavke.map((s, i) => [
              `${i + 1}.`,
              s.sifra,
              s.naziv,
              s.jm,
              kol(s.kolicina),
              km(s.staraMpc),
              km(s.novaMpc),
              km(s.vrijednostStara),
              km(s.vrijednostNova),
              km(s.razlika),
            ]),
            totals: [
              "",
              "",
              `Ukupno (${n.stavke.length} stavki)`,
              "",
              "",
              "",
              "",
              km(n.vrijednostStara),
              km(n.vrijednostNova),
              km(n.razlika),
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
        <p className="text-[13px] text-text-tertiary max-w-xl">
          Nivelacija prebacuje količinu sa stare maloprodajne cijene na novu;
          razlika vrijednosti automatski ulazi u TKM.
        </p>
        <button
          type="button"
          onClick={() => setNovaOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <IconPlus size={15} />
          Nova nivelacija
        </button>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={thCls}>Broj</th>
              <th className={thCls}>Datum</th>
              <th className={`${thCls} text-right`}>Stavki</th>
              <th className={`${thCls} text-right`}>Vrijednost po staroj</th>
              <th className={`${thCls} text-right`}>Vrijednost po novoj</th>
              <th className={`${thCls} text-right`}>Razlika</th>
              <th className={`${thCls} text-right`}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={7}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && (nivelacije ?? []).length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={7}
                >
                  Još nema nivelacija. Kliknite &quot;Nova nivelacija&quot; kad
                  mijenjate maloprodajnu cijenu robe na lageru.
                </td>
              </tr>
            )}
            {(nivelacije ?? []).map((n) => (
              <tr
                key={n.id}
                className="border-b border-cream-300 last:border-b-0"
              >
                <td className={`${tdCls} font-medium tabular-nums`}>
                  {n.oznaka}
                </td>
                <td className={tdCls}>{formatDate(n.datum)}</td>
                <td className={tdNum}>{n.stavke.length}</td>
                <td className={tdNum}>{formatBAM(n.vrijednostStara)}</td>
                <td className={tdNum}>{formatBAM(n.vrijednostNova)}</td>
                <td
                  className={`${tdNum} font-medium ${n.razlika < 0 ? "text-accent-500" : "text-success"}`}
                >
                  {formatBAM(n.razlika)}
                </td>
                <td className={tdCls}>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => pdfZapisnik(n)}
                      disabled={pdfId != null}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
                      title="Zapisnik o promjeni cijena (PDF)"
                    >
                      {pdfId === n.id ? (
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

      {novaOpen && orgId != null && (
        <NovaNivelacijaModal orgId={orgId} onClose={() => setNovaOpen(false)} />
      )}

      <Modal
        open={brisi != null}
        onClose={() => setBrisi(null)}
        title="Brisanje nivelacije"
      >
        {brisi && (
          <div className="space-y-3">
            <p className="text-[13px] text-text-primary">
              Obrisati nivelaciju <strong>{brisi.oznaka}</strong> od{" "}
              {formatDate(brisi.datum)}? Količine se vraćaju na stare cijene, a
              razlika nestaje iz TKM-a.
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

// ─── nova nivelacija ─────────────────────────────────────────────────────────

function NovaNivelacijaModal({
  orgId,
  onClose,
}: {
  orgId: number;
  onClose: () => void;
}) {
  const createM = useCreateNivelacija(orgId);
  const [datumS, setDatumS] = useState(todayFormatted());
  const [napomena, setNapomena] = useState("");
  const datumIso = parseDateInput(datumS) ?? undefined;
  // lager na datum nivelacije: šta se i sa koje cijene može nivelisati
  const { data: lager } = useLager(orgId, datumIso);

  // monotoni uid (pravi useRef): nikad se ne recikliraju id-jevi, pa
  // brisanje reda ne pogađa drugi red sa slučajno istim uid-om
  const uidRef = useRef(1);
  const [stavke, setStavke] = useState<NovaStavka[]>([]);
  const [izborKey, setIzborKey] = useState("");
  const [kolicinaS, setKolicinaS] = useState("");
  const [novaMpcS, setNovaMpcS] = useState("");
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
    const novaMpc = parseKm(novaMpcS);
    if (!izabrani) return setError("Izaberite artikal sa lagera.");
    if (kolicina == null || kolicina <= 0 || kolicina > izabrani.kolicina) {
      return setError(
        `Količina mora biti između 0 i ${kol(izabrani.kolicina)}.`,
      );
    }
    if (novaMpc == null || novaMpc <= 0 || novaMpc === izabrani.mpc) {
      return setError("Unesite novu cijenu različitu od stare.");
    }
    setStavke((prev) => [
      ...prev,
      {
        uid: uidRef.current++,
        artikalId: izabrani.artikalId,
        sifra: izabrani.sifra,
        naziv: izabrani.naziv,
        jm: izabrani.jm,
        staraMpc: izabrani.mpc,
        stanje: izabrani.kolicina,
        kolicina,
        novaMpc,
      },
    ]);
    setIzborKey("");
    setKolicinaS("");
    setNovaMpcS("");
  }

  const razlika = r2(
    stavke.reduce((a, s) => a + s.kolicina * (s.novaMpc - s.staraMpc), 0),
  );

  async function spremi() {
    setError(null);
    const datum = parseDateInput(datumS);
    if (!datum) return setError("Unesite ispravan datum.");
    if (stavke.length === 0) return setError("Dodajte bar jednu stavku.");
    try {
      await createM.mutateAsync({
        datum,
        napomena: napomena.trim(),
        stavke: stavke.map((s) => ({
          artikalId: s.artikalId,
          staraMpc: s.staraMpc,
          novaMpc: s.novaMpc,
          kolicina: s.kolicina,
        })),
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("NEMA_STANJA")
          ? "Za neku stavku nema dovoljno stanja na staroj cijeni na taj datum."
          : "Greška pri spremanju, pokušajte ponovo.",
      );
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova nivelacija (promjena cijena)"
      maxWidthClass="max-w-[860px]"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Datum nivelacije</label>
            <PkDateInput
              value={datumS}
              onChange={setDatumS}
              ariaLabel="Datum nivelacije"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Napomena (opciono)</label>
            <input
              value={napomena}
              onChange={(e) => setNapomena(e.target.value)}
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
            />
          </div>
        </div>

        <div className="rounded-xl border border-cream-300 bg-cream-50 p-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="col-span-2">
              <label className={labelCls}>Artikal na lageru (stara MPC)</label>
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
                ariaLabel="Količina za nivelaciju"
                className="bg-cream-100"
              />
            </div>
            <div>
              <label className={labelCls}>Nova MPC</label>
              <PkAmountInput
                value={novaMpcS}
                onChange={setNovaMpcS}
                ariaLabel="Nova cijena"
                className="bg-cream-100 font-medium"
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
                  <th className={`${thCls} text-right`}>Stara MPC</th>
                  <th className={`${thCls} text-right`}>Nova MPC</th>
                  <th className={`${thCls} text-right`}>Razlika</th>
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
                    <td className={tdNum}>{km(s.staraMpc)}</td>
                    <td className={`${tdNum} font-medium`}>{km(s.novaMpc)}</td>
                    <td
                      className={`${tdNum} ${s.novaMpc < s.staraMpc ? "text-accent-500" : "text-success"}`}
                    >
                      {formatKm(r2(s.kolicina * (s.novaMpc - s.staraMpc)))}
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

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[12.5px] text-text-primary">
            Ukupna razlika vrijednosti:{" "}
            <strong className={razlika < 0 ? "text-accent-500" : "text-success"}>
              {formatBAM(razlika)}
            </strong>
          </p>
          {error && (
            <p className="text-[12.5px] text-accent-500">{error}</p>
          )}
          <div className="ml-auto flex gap-2">
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
              Proknjiži nivelaciju
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
