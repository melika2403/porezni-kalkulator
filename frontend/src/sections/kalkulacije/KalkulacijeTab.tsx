"use client";

// Pregled maloprodajnih kalkulacija: numerisana lista po godini sa sumama,
// PDF ispisom (KCM obrazac) i brisanjem. Unos/uređivanje je posebna stranica
// (/app/kalkulacije/nova odnosno /[id]).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCopy,
  IconDownload,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconSignature,
  IconTrash,
} from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { useDeleteKalkulacija, useKalkulacije } from "src/hooks/useKalkulacije";
import { usePartners } from "src/hooks/usePartners";
import {
  getKalkulacija,
  setKalkulacijePotpisnik,
  type Kalkulacija,
} from "src/api/kalkulacije";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate, todayIso } from "src/lib/format";
import { parseDateInput } from "src/lib/dateInput";
import { downloadKcmPdf } from "./kcmPdf";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;

/** Status plaćanja ulaznog računa kalkulacije: plaćen / otvoren / kasni. */
function RacunStatusBadge({ k }: { k: Kalkulacija }) {
  if (!k.racunStatus) return <span className="text-text-tertiary/50">–</span>;
  if (k.racunStatus === "PLACEN") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-success-bg text-success">
        plaćen
      </span>
    );
  }
  const danas = todayIso();
  const kasni = !!k.racunRok && String(k.racunRok).slice(0, 10) < danas;
  if (k.racunStatus === "DJELIMICNO") {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${kasni ? "bg-accent-bg text-accent-500" : "bg-info-bg text-info"}`}
      >
        {kasni ? "djelimično, kasni" : "djelimično"}
      </span>
    );
  }
  if (kasni) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-bg text-accent-500">
        kasni
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning-bg text-warning">
      otvoren
    </span>
  );
}

export function KalkulacijeTab({ orgId }: { orgId: number | null }) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  // filteri: godina, period od-do, dobavljač, tekst pretraga
  const [godina, setGodina] = useState<string>(String(currentYear));
  const [odS, setOdS] = useState("");
  const [doS, setDoS] = useState("");
  const [dobavljacId, setDobavljacId] = useState("");
  const [search, setSearch] = useState("");

  // učitaju se sve kalkulacije organizacije, filtrira se na klijentu
  // (period može preći granicu godine)
  const { data: kalkulacije, isLoading } = useKalkulacije(orgId);
  const { data: partneri } = usePartners(orgId);
  const deleteM = useDeleteKalkulacija(orgId);

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const [brisi, setBrisi] = useState<Kalkulacija | null>(null);
  const [brisiError, setBrisiError] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<number | null>(null);

  // potpisnik na ispisu ("Kalkulaciju uradio"); vrijedi za ovaj obrt
  const queryClient = useQueryClient();
  const [potpisnikOpen, setPotpisnikOpen] = useState(false);
  const [potpisnikS, setPotpisnikS] = useState("");
  const [potpisnikSaving, setPotpisnikSaving] = useState(false);
  const [potpisnikError, setPotpisnikError] = useState<string | null>(null);

  function otvoriPotpisnika() {
    setPotpisnikS(fullOrg?.kalkulacijePotpisnik ?? "");
    setPotpisnikError(null);
    setPotpisnikOpen(true);
  }

  async function sacuvajPotpisnika() {
    if (orgId == null) return;
    setPotpisnikSaving(true);
    setPotpisnikError(null);
    try {
      await unwrap(setKalkulacijePotpisnik(orgId, potpisnikS));
      await queryClient.invalidateQueries({ queryKey: ["pk-org", orgId] });
      setPotpisnikOpen(false);
    } catch {
      setPotpisnikError("Snimanje nije uspjelo, pokušajte ponovo.");
    } finally {
      setPotpisnikSaving(false);
    }
  }

  const rows = useMemo(() => {
    const all = kalkulacije ?? [];
    const odIso = parseDateInput(odS);
    const doIso = parseDateInput(doS);
    const q = search.trim().toLowerCase();
    const pid = dobavljacId ? Number(dobavljacId) : null;
    // kad je zadano od/do, filter godine se ignoriše (period smije preći
    // granicu godine); inače bi default godina tiho odsjekla redove
    const rangeSet = odIso != null || doIso != null;
    return all.filter((k) => {
      if (!rangeSet && godina !== "sve" && k.godina !== Number(godina)) {
        return false;
      }
      if (odIso && k.datum < odIso) return false;
      if (doIso && k.datum > doIso) return false;
      if (pid != null && k.partnerId !== pid) return false;
      if (q) {
        const hay =
          `${k.oznaka} ${k.brojRacuna} ${k.partner?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [kalkulacije, godina, odS, doS, dobavljacId, search]);

  // godine za filter: iz podataka + tekuća
  const godine = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const k of kalkulacije ?? []) set.add(k.godina);
    return [...set].sort((a, b) => b - a);
  }, [kalkulacije, currentYear]);

  const sume = useMemo(
    () => ({
      racun: rows.reduce((a, k) => a + k.iznosRacuna, 0),
      maloprodajna: rows.reduce((a, k) => a + k.maloprodajnaVrijednost, 0),
    }),
    [rows],
  );

  async function preuzmiPdf(k: Kalkulacija) {
    if (orgId == null || !fullOrg || pdfId != null) return;
    setPdfId(k.id);
    try {
      const detail = await unwrap(getKalkulacija(orgId, k.id));
      await downloadKcmPdf(detail, fullOrg);
    } finally {
      setPdfId(null);
    }
  }

  async function potvrdiBrisanje() {
    if (!brisi) return;
    setBrisiError(null);
    try {
      await deleteM.mutateAsync(brisi.id);
      setBrisi(null);
    } catch (e) {
      setBrisiError(
        e instanceof Error && e.message === "RACUN_PLACEN"
          ? "Ulazni račun ove kalkulacije je već plaćen (vezan za izvod ili zatvoren vezom na kartici dobavljača). Prvo otvorite vezu na kartici dobavljača (Partneri), pa pokušajte ponovo."
          : "Greška pri brisanju, pokušajte ponovo.",
      );
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Godina
          </div>
          <PkSelect
            ariaLabel="Godina"
            value={godina}
            onChange={(v) => setGodina(v ? String(v) : "sve")}
            options={[
              { value: "sve", label: "Sve godine" },
              ...godine.map((g) => ({ value: String(g), label: String(g) })),
            ]}
          />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Od datuma
          </div>
          <PkDateInput
            value={odS}
            onChange={setOdS}
            ariaLabel="Period od"
            className="w-[160px]"
          />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Do datuma
          </div>
          <PkDateInput
            value={doS}
            onChange={setDoS}
            ariaLabel="Period do"
            className="w-[160px]"
          />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Dobavljač
          </div>
          <PkSelect
            ariaLabel="Dobavljač"
            value={dobavljacId}
            onChange={(v) => setDobavljacId(v ? String(v) : "")}
            searchable
            options={[
              { value: "", label: "Svi dobavljači" },
              ...(partneri ?? []).map((p) => ({
                value: String(p.id),
                label: p.name,
              })),
            ]}
            wrapStyle={{ minWidth: 200 }}
          />
        </div>
        <div className="flex-1 min-w-[180px] max-w-[280px]">
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Pretraga
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Broj, broj računa, dobavljač"
            className="w-full rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
          />
        </div>
        <button
          type="button"
          onClick={otvoriPotpisnika}
          title={
            fullOrg?.kalkulacijePotpisnik
              ? `Potpisnik na ispisu: ${fullOrg.kalkulacijePotpisnik}`
              : "Upišite ko radi kalkulacije: ime ide na PDF (Kalkulaciju uradio)"
          }
          className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
        >
          <IconSignature size={15} />
          Potpisnik
        </button>
        <Link
          href="/app/kalkulacije/nova"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <IconPlus size={15} />
          Nova kalkulacija
        </Link>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={thCls}>Broj</th>
              <th className={thCls}>Datum</th>
              <th className={thCls}>Dobavljač</th>
              <th className={thCls}>Broj računa</th>
              <th className={thCls}>Plaćanje</th>
              <th className={`${thCls} text-right`}>Stavki</th>
              <th className={`${thCls} text-right`}>Iznos računa</th>
              <th className={`${thCls} text-right`}>Maloprodajni iznos</th>
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
            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={9}
                >
                  Nema kalkulacija za izabrane filtere. Kliknite &quot;Nova
                  kalkulacija&quot; za novo zaduženje maloprodaje.
                </td>
              </tr>
            )}
            {rows.map((k) => (
              <tr
                key={k.id}
                onClick={() => router.push(`/app/kalkulacije/${k.id}`)}
                title="Otvori kalkulaciju"
                className="border-b border-cream-300 last:border-b-0 cursor-pointer hover:bg-cream-50 transition-colors"
              >
                <td className={`${tdCls} font-medium tabular-nums`}>
                  {k.oznaka}
                </td>
                <td className={tdCls}>{formatDate(k.datum)}</td>
                <td className={tdCls}>
                  {k.partner ? (
                    <Link
                      href={`/app/partneri/${k.partner.id}`}
                      title="Otvori karticu partnera"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline hover:text-brand-700 transition-colors"
                    >
                      {k.partner.name}
                    </Link>
                  ) : (
                    "–"
                  )}
                </td>
                <td className={`${tdCls} tabular-nums`}>{k.brojRacuna}</td>
                <td className={tdCls}>
                  <RacunStatusBadge k={k} />
                </td>
                <td className={tdNum}>{k.stavkeCount}</td>
                <td className={tdNum}>{formatBAM(k.iznosRacuna)}</td>
                <td className={`${tdNum} font-medium`}>
                  {formatBAM(k.maloprodajnaVrijednost)}
                </td>
                <td className={tdCls}>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        preuzmiPdf(k);
                      }}
                      disabled={pdfId != null}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
                      title="Preuzmi PDF (KCM obrazac)"
                    >
                      {pdfId === k.id ? (
                        <IconLoader2 size={16} className="animate-spin" />
                      ) : (
                        <IconDownload size={16} />
                      )}
                    </button>
                    <Link
                      href={`/app/kalkulacije/${k.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                      title="Uredi"
                    >
                      <IconPencil size={16} />
                    </Link>
                    <Link
                      href={`/app/kalkulacije/nova?kopiraj=${k.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                      title="Kopiraj u novu kalkulaciju"
                    >
                      <IconCopy size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBrisiError(null);
                        setBrisi(k);
                      }}
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
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-cream-300 bg-cream-50">
                <td className={`${tdCls} font-medium`} colSpan={6}>
                  Ukupno ({rows.length})
                </td>
                <td className={`${tdNum} font-medium`}>
                  {formatBAM(sume.racun)}
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(sume.maloprodajna)}
                </td>
                <td className={tdCls} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Modal
        open={brisi != null}
        onClose={() => setBrisi(null)}
        title="Brisanje kalkulacije"
      >
        {brisi && (
          <div className="space-y-3">
            <p className="text-[13px] text-text-primary">
              Obrisati kalkulaciju <strong>{brisi.oznaka}</strong> (
              {brisi.partner?.name ?? "bez dobavljača"},{" "}
              {formatBAM(brisi.maloprodajnaVrijednost)})? Briše se i njen
              ulazni račun iz obaveza i KUF-a.
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
                onClick={potvrdiBrisanje}
                className="px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Obriši
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={potpisnikOpen}
        onClose={() => setPotpisnikOpen(false)}
        title="Potpisnik kalkulacija"
      >
        <div className="space-y-3">
          <p className="text-[13px] leading-5 text-text-secondary">
            Ime osobe koja radi kalkulacije u ovom obrtu. Ispisuje se na PDF-u
            u donjem lijevom uglu (&quot;Kalkulaciju uradio&quot;), a u desnom
            stoji naziv obrta (&quot;Kalkulaciju primio&quot;). Prazno polje
            ostavlja liniju za ručni potpis.
          </p>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
              Ime i prezime potpisnika
            </div>
            <input
              value={potpisnikS}
              onChange={(e) => setPotpisnikS(e.target.value)}
              maxLength={120}
              placeholder="npr. Ime Prezime"
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
            />
          </div>
          {potpisnikError && (
            <p className="text-[12.5px] text-accent-500">{potpisnikError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPotpisnikOpen(false)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={potpisnikSaving}
              onClick={() => void sacuvajPotpisnika()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {potpisnikSaving && (
                <IconLoader2 size={15} className="animate-spin" />
              )}
              Sačuvaj
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
