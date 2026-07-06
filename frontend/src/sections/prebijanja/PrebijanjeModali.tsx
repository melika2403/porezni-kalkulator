"use client";

// Knjiženje kompenzacija i cesija u PK Office: zatvaranje kupaca/dobavljača
// bez novca. Kompenzacija: isti partner sa otvorenim stavkama na OBJE strane.
// Cesija (v1, mi smo cedent): kupac (cesus) duguje nama, mi dugujemo
// dobavljaču (cesionaru). Kompenzuje se manji zbir izabranih stavki; stavka
// na strani viška ostaje djelimično otvorena. Prihod ide u KPR k12, rashod
// k16/k19 (PDV split za obveznike automatski).
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "src/components/app-shell/Modal";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { usePartners, usePartnerKartica } from "src/hooks/usePartners";
import type { Partner } from "src/api/partners";
import {
  createPrebijanje,
  type PrebijanjeResult,
  type RashodKategorija,
} from "src/api/prebijanja";
import { formatKm } from "src/lib/amountInput";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";

const labelCls =
  "block text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600";

const RASHOD_OPTIONS = [
  { value: "OSTALI_RASHODI", label: "Ostali rashodi (KPR kolona 19)" },
  { value: "ROBA_MATERIJAL", label: "Roba i materijal (KPR kolona 16)" },
];

type Stavka = { id: number; oznaka: string; datum: string | null; iznos: number };

function fmtDate(iso: string | null) {
  if (!iso) return "–";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}.` : "–";
}

function StavkaPicker({
  title,
  items,
  selected,
  onToggle,
  emptyText,
}: {
  title: string;
  items: Stavka[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  emptyText: string;
}) {
  return (
    <div className="rounded-lg border border-cream-300 overflow-hidden">
      <div className="px-3 py-2 bg-cream-200/60 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-3 text-[12.5px] text-text-tertiary">{emptyText}</p>
      ) : (
        items.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-2.5 px-3 py-2 border-t border-cream-300/60 cursor-pointer hover:bg-cream-50 transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.has(s.id)}
              onChange={() => onToggle(s.id)}
              className="accent-[#3a5c42]"
            />
            <span className="flex-1 text-[13px] text-text-primary">
              {s.oznaka}
            </span>
            <span className="text-[12px] text-text-tertiary tabular-nums">
              {fmtDate(s.datum)}
            </span>
            <span className="text-[13px] tabular-nums text-text-primary min-w-[90px] text-right">
              {formatKm(s.iznos)} KM
            </span>
          </label>
        ))
      )}
    </div>
  );
}

// Zbirni pregled: kompenzuje se manji zbir, razlika ostaje otvorena.
function Rezime({
  sumIn,
  sumOut,
  inLabel,
  outLabel,
}: {
  sumIn: number;
  sumOut: number;
  inLabel: string;
  outLabel: string;
}) {
  const iznos = Math.min(sumIn, sumOut);
  const razlika = Math.abs(sumIn - sumOut);
  return (
    <div className="rounded-lg bg-brand-100/60 px-4 py-3 space-y-0.5">
      <div className="text-[12.5px] text-text-secondary">
        {inLabel}: <strong className="tabular-nums">{formatKm(sumIn)} KM</strong>
        {" · "}
        {outLabel}:{" "}
        <strong className="tabular-nums">{formatKm(sumOut)} KM</strong>
      </div>
      <div className="text-[13.5px] text-text-primary">
        Prebija se:{" "}
        <strong className="text-brand-700 tabular-nums">
          {formatKm(iznos)} KM
        </strong>
        {razlika > 0.004 && (
          <span className="text-[12.5px] text-text-tertiary">
            {" "}
            · razlika od {formatKm(razlika)} KM ostaje otvorena
            {sumIn > sumOut ? " na fakturama" : " na ulaznim računima"}
          </span>
        )}
      </div>
    </div>
  );
}

function usePickState() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { selected, toggle, reset: () => setSelected(new Set()) };
}

// Zajednički footer + knjiženje + opcioni PDF (razlika je samo u payload-u i
// dokumentu, pa oba modala dijele ovaj hook).
function useKnjizenje(orgId: number, onSaved?: (r: PrebijanjeResult) => void) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<PrebijanjeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async (args: {
      payload: Parameters<typeof createPrebijanje>[1];
      pdf?: (r: PrebijanjeResult) => Promise<void>;
    }) => {
      setError(null);
      const res = await createPrebijanje(orgId, args.payload);
      if (!res.ok) throw new Error(res.error);
      if (args.pdf) await args.pdf(res.data);
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      // knjiženje dira fakture, račune, izvode, partnere i KPR
      queryClient.invalidateQueries();
      onSaved?.(data);
    },
    onError: (e: Error) => {
      const MSGS: Record<string, string> = {
        INVOICE_NOT_OPEN: "Neka od izabranih faktura više nije otvorena.",
        RACUN_NOT_OPEN: "Neki od izabranih računa više nije otvoren.",
        RACUN_SAMO_EVIDENCIJA:
          "Račun koji je samo PDV evidencija ne stvara obavezu i ne može se prebijati.",
        NO_ITEMS: "Izaberite bar jednu stavku na obje strane.",
      };
      setError(MSGS[e.message] ?? `Greška pri knjiženju (${e.message}).`);
    },
  });

  return { mut, result, error };
}

/* ── Kompenzacija ── */

export function KompenzacijaModal({
  orgId,
  orgName,
  initialPartnerId,
  onClose,
}: {
  orgId: number;
  orgName: string;
  initialPartnerId?: number;
  onClose: () => void;
}) {
  const partnersQ = usePartners(orgId);
  // nude se samo partneri sa otvorenim stavkama na OBJE strane
  const candidates = useMemo(
    () =>
      (partnersQ.data ?? []).filter(
        (p: Partner) =>
          p.stats.openInvoicesCount > 0 && p.stats.openPayablesCount > 0,
      ),
    [partnersQ.data],
  );
  const [partnerId, setPartnerId] = useState<number | null>(
    initialPartnerId ?? null,
  );
  const karticaQ = usePartnerKartica(orgId, partnerId);

  const invoices: Stavka[] = useMemo(
    () =>
      (karticaQ.data?.invoices ?? [])
        // samo obične fakture: knjižne obavijesti i storna imaju pozitivan
        // iznos a negativan predznak, ne smiju se knjižiti kao potraživanje
        .filter((i) => i.status === "ISSUED" && (i.docType ?? "STANDARD") === "STANDARD")
        .map((i) => ({
          id: i.id,
          oznaka: `Faktura ${i.fullNumber}`,
          datum: i.issueDate,
          iznos: parseFloat(i.grossTotal) || 0,
        })),
    [karticaQ.data],
  );
  const racuni: Stavka[] = useMemo(
    () =>
      (karticaQ.data?.ulazniRacuni ?? [])
        .filter((r) => r.status === "OTVOREN" && !r.samoEvidencija)
        .map((r) => ({
          id: r.id,
          oznaka: `Račun ${r.brojRacuna}`,
          datum: r.datumRacuna,
          iznos: parseFloat(r.iznos) || 0,
        })),
    [karticaQ.data],
  );

  const inv = usePickState();
  const rac = usePickState();
  const [datum, setDatum] = useState(todayFormatted());
  const [rashodKat, setRashodKat] = useState<RashodKategorija>("OSTALI_RASHODI");
  const [napomena, setNapomena] = useState("");
  const { mut, result, error } = useKnjizenje(orgId);

  const sumIn = invoices
    .filter((s) => inv.selected.has(s.id))
    .reduce((a, s) => a + s.iznos, 0);
  const sumOut = racuni
    .filter((s) => rac.selected.has(s.id))
    .reduce((a, s) => a + s.iznos, 0);
  const canBook =
    partnerId != null &&
    inv.selected.size > 0 &&
    rac.selected.size > 0 &&
    Math.min(sumIn, sumOut) > 0 &&
    parseDateInput(datum) != null &&
    !mut.isPending &&
    !result;

  async function pdfPrijedlog(r: PrebijanjeResult) {
    const partner = karticaQ.data?.partner;
    if (!partner) return;
    const [{ generateKompenzacijaPdf }, { collapseStavke }] = await Promise.all([
      import("src/sections/cesije-i-kompenzacije/kompenzacijaPdf"),
      import("src/sections/cesije-i-kompenzacije/money"),
    ]);
    const blob = await generateKompenzacijaPdf({
      broj: r.broj,
      datum: fmtDate(r.datum),
      duznikNaziv: orgName,
      duznikAdresa: "",
      duznikId: "",
      duznikPdv: "",
      duznikSifra: "",
      povjeriocNaziv: partner.name,
      povjeriocAdresa: [partner.address, partner.city]
        .filter(Boolean)
        .join(", "),
      povjeriocId: partner.jib ?? "",
      povjeriocPdv: partner.pdvBroj ?? "",
      povjeriocSifra: partner.code != null ? String(partner.code) : "",
      duznikStavke: collapseStavke(
        racuni
          .filter((s) => rac.selected.has(s.id))
          .map((s) => ({ opis: s.oznaka, iznos: s.iznos })),
      ),
      povjeriocStavke: collapseStavke(
        invoices
          .filter((s) => inv.selected.has(s.id))
          .map((s) => ({ opis: s.oznaka, iznos: s.iznos })),
      ),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Kompenzacija_${r.broj.replace("/", "-")}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function book(withPdf: boolean) {
    if (!canBook || partnerId == null) return;
    mut.mutate({
      payload: {
        type: "KOMPENZACIJA",
        datum: parseDateInput(datum) as string,
        rashodKategorija: rashodKat,
        invoiceIds: [...inv.selected],
        racunIds: [...rac.selected],
        napomena: napomena.trim() || undefined,
        partnerId,
      },
      pdf: withPdf ? pdfPrijedlog : undefined,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Kompenzacija"
      maxWidthClass="max-w-[760px]"
      footer={
        <>
          {result && (
            <span className="mr-auto self-center text-[12.5px] text-success font-medium">
              Proknjižena {result.broj}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Zatvori
          </button>
          <button
            type="button"
            onClick={() => book(false)}
            disabled={!canBook}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            Proknjiži
          </button>
          <button
            type="button"
            onClick={() => book(true)}
            disabled={!canBook}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {mut.isPending ? "Knjižim…" : "Proknjiži i preuzmi PDF"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[12.5px] text-text-tertiary -mt-1">
          Zatvaranje kupca i dobavljača bez novca: prebija se manji zbir
          izabranih stavki. Prihod ulazi u KPR kao naplata preko računa,
          rashod po izabranoj koloni.
        </p>

        {error && (
          <p className="rounded-lg bg-danger-bg px-4 py-2.5 text-[12.5px] text-danger">
            {error}
          </p>
        )}
        {result && result.partial.length > 0 && (
          <ul className="rounded-lg bg-warning-bg px-4 py-2.5 space-y-1">
            {result.partial.map((p) => (
              <li key={p.oznaka} className="text-[12.5px] text-warning">
                {p.vrsta === "FAKTURA" ? "Faktura" : "Ulazni račun"} {p.oznaka}{" "}
                ostaje otvoren za preostalih {formatKm(p.ostatak)} KM.
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <label className={labelCls}>Partner (dug na obje strane)</label>
            <PkSelect
              ariaLabel="Partner"
              value={partnerId != null ? String(partnerId) : ""}
              onChange={(v) => {
                setPartnerId(v ? Number(v) : null);
                inv.reset();
                rac.reset();
              }}
              searchable
              placeholder="Izaberi partnera"
              options={[
                { value: "", label: "Izaberi partnera" },
                ...candidates.map((p) => ({
                  value: String(p.id),
                  label: `${p.name} (${formatKm(p.stats.openInvoicesTotal)} / ${formatKm(p.stats.openPayablesTotal)} KM)`,
                })),
              ]}
              wrapStyle={{ width: "100%" }}
            />
            {candidates.length === 0 && !partnersQ.isLoading && (
              <p className="text-[11.5px] text-text-tertiary mt-1">
                Nijedan partner nema otvorene stavke na obje strane.
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Datum kompenzacije</label>
            <PkDateInput
              value={datum}
              onChange={setDatum}
              ariaLabel="Datum kompenzacije"
              className="w-full"
            />
          </div>
        </div>

        {partnerId != null && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StavkaPicker
                title="Njihov dug: otvorene fakture"
                items={invoices}
                selected={inv.selected}
                onToggle={inv.toggle}
                emptyText="Nema otvorenih faktura."
              />
              <StavkaPicker
                title="Naš dug: otvoreni ulazni računi"
                items={racuni}
                selected={rac.selected}
                onToggle={rac.toggle}
                emptyText="Nema otvorenih ulaznih računa."
              />
            </div>

            <Rezime
              sumIn={sumIn}
              sumOut={sumOut}
              inLabel="Fakture"
              outLabel="Računi"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className={labelCls}>Vrsta rashoda (KPR)</label>
                <PkSelect
                  ariaLabel="Vrsta rashoda"
                  value={rashodKat}
                  onChange={(v) => setRashodKat(v as RashodKategorija)}
                  options={RASHOD_OPTIONS}
                  wrapStyle={{ width: "100%" }}
                />
              </div>
              <div>
                <label className={labelCls}>Napomena (opciono)</label>
                <input
                  className={inputCls}
                  type="text"
                  value={napomena}
                  onChange={(e) => setNapomena(e.target.value)}
                  placeholder="npr. osnov kompenzacije"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── Cesija (v1: naša organizacija je cedent) ── */

export function CesijaModal({
  orgId,
  orgName,
  orgJib,
  orgOwnerName,
  orgCity,
  onClose,
}: {
  orgId: number;
  orgName: string;
  orgJib: string;
  orgOwnerName: string;
  orgCity: string;
  onClose: () => void;
}) {
  const partnersQ = usePartners(orgId);
  const kupci = useMemo(
    () =>
      (partnersQ.data ?? []).filter((p: Partner) => p.stats.openInvoicesCount > 0),
    [partnersQ.data],
  );
  const dobavljaci = useMemo(
    () =>
      (partnersQ.data ?? []).filter((p: Partner) => p.stats.openPayablesCount > 0),
    [partnersQ.data],
  );
  const [cesusId, setCesusId] = useState<number | null>(null);
  const [cesionarId, setCesionarId] = useState<number | null>(null);
  const cesusKartica = usePartnerKartica(orgId, cesusId);
  const cesionarKartica = usePartnerKartica(orgId, cesionarId);

  const invoices: Stavka[] = useMemo(
    () =>
      (cesusKartica.data?.invoices ?? [])
        .filter((i) => i.status === "ISSUED" && (i.docType ?? "STANDARD") === "STANDARD")
        .map((i) => ({
          id: i.id,
          oznaka: `Faktura ${i.fullNumber}`,
          datum: i.issueDate,
          iznos: parseFloat(i.grossTotal) || 0,
        })),
    [cesusKartica.data],
  );
  const racuni: Stavka[] = useMemo(
    () =>
      (cesionarKartica.data?.ulazniRacuni ?? [])
        .filter((r) => r.status === "OTVOREN" && !r.samoEvidencija)
        .map((r) => ({
          id: r.id,
          oznaka: `Račun ${r.brojRacuna}`,
          datum: r.datumRacuna,
          iznos: parseFloat(r.iznos) || 0,
        })),
    [cesionarKartica.data],
  );

  const inv = usePickState();
  const rac = usePickState();
  const [datum, setDatum] = useState(todayFormatted());
  const [rashodKat, setRashodKat] = useState<RashodKategorija>("OSTALI_RASHODI");
  const [napomena, setNapomena] = useState("");
  const { mut, result, error } = useKnjizenje(orgId);

  const sumIn = invoices
    .filter((s) => inv.selected.has(s.id))
    .reduce((a, s) => a + s.iznos, 0);
  const sumOut = racuni
    .filter((s) => rac.selected.has(s.id))
    .reduce((a, s) => a + s.iznos, 0);
  const canBook =
    cesusId != null &&
    cesionarId != null &&
    cesusId !== cesionarId &&
    inv.selected.size > 0 &&
    rac.selected.size > 0 &&
    Math.min(sumIn, sumOut) > 0 &&
    parseDateInput(datum) != null &&
    !mut.isPending &&
    !result;

  async function pdfUgovor(r: PrebijanjeResult) {
    const cesus = cesusKartica.data?.partner;
    const cesionar = cesionarKartica.data?.partner;
    if (!cesus || !cesionar) return;
    const [{ generateCesijaPdf }, { formatBroj, iznosUSlova }] =
      await Promise.all([
        import("src/sections/cesije-i-kompenzacije/cesijaPdf"),
        import("src/sections/cesije-i-kompenzacije/money"),
      ]);
    const blob = await generateCesijaPdf({
      mjesto: orgCity,
      datum: fmtDate(r.datum),
      cedentNaziv: orgName,
      cedentId: orgJib,
      cedentZastupnik: orgOwnerName,
      cesionarNaziv: cesionar.name,
      cesionarId: cesionar.jib ?? "",
      cesionarZastupnik: "",
      cesusNaziv: cesus.name,
      cesusId: cesus.jib ?? "",
      cesusZastupnik: "",
      iznosBroj: `${formatBroj(r.iznos)} KM`,
      iznosSlovima: iznosUSlova(r.iznos),
      sud: orgCity,
      brojPrimjeraka: "3 (tri)",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ugovor_o_cesiji_${r.broj.replace("/", "-")}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function book(withPdf: boolean) {
    if (!canBook || cesusId == null || cesionarId == null) return;
    mut.mutate({
      payload: {
        type: "CESIJA",
        datum: parseDateInput(datum) as string,
        rashodKategorija: rashodKat,
        invoiceIds: [...inv.selected],
        racunIds: [...rac.selected],
        napomena: napomena.trim() || undefined,
        cesusPartnerId: cesusId,
        cesionarPartnerId: cesionarId,
      },
      pdf: withPdf ? pdfUgovor : undefined,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Cesija (ustupanje potraživanja)"
      maxWidthClass="max-w-[760px]"
      footer={
        <>
          {result && (
            <span className="mr-auto self-center text-[12.5px] text-success font-medium">
              Proknjižena {result.broj}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Zatvori
          </button>
          <button
            type="button"
            onClick={() => book(false)}
            disabled={!canBook}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            Proknjiži
          </button>
          <button
            type="button"
            onClick={() => book(true)}
            disabled={!canBook}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {mut.isPending ? "Knjižim…" : "Proknjiži i preuzmi ugovor"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[12.5px] text-text-tertiary -mt-1">
          Ustupamo svoje potraživanje od kupca (cesus) dobavljaču (cesionar)
          i time izmirujemo svoj dug prema njemu. Prebija se manji zbir
          izabranih stavki.
        </p>

        {error && (
          <p className="rounded-lg bg-danger-bg px-4 py-2.5 text-[12.5px] text-danger">
            {error}
          </p>
        )}
        {result && result.partial.length > 0 && (
          <ul className="rounded-lg bg-warning-bg px-4 py-2.5 space-y-1">
            {result.partial.map((p) => (
              <li key={p.oznaka} className="text-[12.5px] text-warning">
                {p.vrsta === "FAKTURA" ? "Faktura" : "Ulazni račun"} {p.oznaka}{" "}
                ostaje otvoren za preostalih {formatKm(p.ostatak)} KM.
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
          <div>
            <label className={labelCls}>Kupac / dužnik (cesus)</label>
            <PkSelect
              ariaLabel="Kupac (cesus)"
              value={cesusId != null ? String(cesusId) : ""}
              onChange={(v) => {
                setCesusId(v ? Number(v) : null);
                inv.reset();
              }}
              searchable
              placeholder="Izaberi kupca"
              options={[
                { value: "", label: "Izaberi kupca" },
                ...kupci.map((p) => ({
                  value: String(p.id),
                  label: `${p.name} (${formatKm(p.stats.openInvoicesTotal)} KM)`,
                })),
              ]}
              wrapStyle={{ width: "100%" }}
            />
          </div>
          <div>
            <label className={labelCls}>Dobavljač (cesionar)</label>
            <PkSelect
              ariaLabel="Dobavljač (cesionar)"
              value={cesionarId != null ? String(cesionarId) : ""}
              onChange={(v) => {
                setCesionarId(v ? Number(v) : null);
                rac.reset();
              }}
              searchable
              placeholder="Izaberi dobavljača"
              options={[
                { value: "", label: "Izaberi dobavljača" },
                ...dobavljaci.map((p) => ({
                  value: String(p.id),
                  label: `${p.name} (${formatKm(p.stats.openPayablesTotal)} KM)`,
                })),
              ]}
              wrapStyle={{ width: "100%" }}
            />
          </div>
          <div>
            <label className={labelCls}>Datum cesije</label>
            <PkDateInput
              value={datum}
              onChange={setDatum}
              ariaLabel="Datum cesije"
              className="w-full"
            />
          </div>
        </div>

        {(cesusId != null || cesionarId != null) && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StavkaPicker
                title="Potraživanje od kupca (ustupamo)"
                items={invoices}
                selected={inv.selected}
                onToggle={inv.toggle}
                emptyText={
                  cesusId == null
                    ? "Prvo izaberite kupca."
                    : "Nema otvorenih faktura."
                }
              />
              <StavkaPicker
                title="Naš dug prema dobavljaču (izmirujemo)"
                items={racuni}
                selected={rac.selected}
                onToggle={rac.toggle}
                emptyText={
                  cesionarId == null
                    ? "Prvo izaberite dobavljača."
                    : "Nema otvorenih ulaznih računa."
                }
              />
            </div>

            <Rezime
              sumIn={sumIn}
              sumOut={sumOut}
              inLabel="Potraživanje"
              outLabel="Dug"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className={labelCls}>Vrsta rashoda (KPR)</label>
                <PkSelect
                  ariaLabel="Vrsta rashoda"
                  value={rashodKat}
                  onChange={(v) => setRashodKat(v as RashodKategorija)}
                  options={RASHOD_OPTIONS}
                  wrapStyle={{ width: "100%" }}
                />
              </div>
              <div>
                <label className={labelCls}>Napomena (opciono)</label>
                <input
                  className={inputCls}
                  type="text"
                  value={napomena}
                  onChange={(e) => setNapomena(e.target.value)}
                  placeholder="npr. osnov cesije"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
