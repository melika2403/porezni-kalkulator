"use client";

// Stalna sredstva (PK Office): nativni unos i pregled registra za
// amortizaciju. Podaci su ISTI PLDI zapis (Form po obrtu i godini) koji
// koristi i marketing /amortizacija, pa je sinhronizacija automatska u oba
// smjera: šta se unese ovdje vidi se tamo i obrnuto. Obračun po redu je
// dijeljena funkcija calcRow (jedan izvor istine sa PLDI obrascem).
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconArrowRight,
  IconBuildingWarehouse,
  IconCircleCheck,
  IconDownload,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { unwrap } from "src/api/auth";
import { getOrganization, getWorkers } from "src/api/profile";
import {
  getAmortizacija,
  getAmortKnjizenje,
  knjiziAmortizaciju,
  saveAmortizacija,
  markAmortizacijaGenerated,
  type PldiSaveData,
} from "src/api/amortizacija";
import {
  calcRow,
  parseDec,
  VIJEK_STOPA,
  type AssetRow,
  type ObveznikData,
} from "src/sections/amortizacija/Amortizacija";
import { fillPldiTemplate, type PldiData } from "src/sections/amortizacija/fillPldi";
import { formatAddress } from "src/utils/formatAddress";
import { Modal } from "src/components/app-shell/Modal";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { formatBAM } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import { isoToDisplay, parseDateInput } from "src/lib/dateInput";

const thCls =
  "px-3 py-2 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;

function nid(): string {
  return `pk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// prazan draft za modal (KV početak se za novo sredstvo veže na nabavnu)
type Draft = {
  id: string | null;
  naziv: string;
  datumNabavke: string; // display DD.MM.GGGG.
  brojDokumenta: string;
  nabavna: string;
  kvPocetak: string;
  vijek: string;
  stopaOverride: string;
  mjeseciOverride: string;
  napomena: string;
  prodano: boolean;
  datumProdaje: string; // display
};

function praznaDraft(): Draft {
  return {
    id: null,
    naziv: "",
    datumNabavke: "",
    brojDokumenta: "",
    nabavna: "",
    kvPocetak: "",
    vijek: "5",
    stopaOverride: "",
    mjeseciOverride: "",
    napomena: "",
    prodano: false,
    datumProdaje: "",
  };
}

function draftIzReda(r: AssetRow): Draft {
  return {
    id: r.id,
    naziv: r.naziv,
    datumNabavke: r.datumNabavke ? isoToDisplay(r.datumNabavke) : "",
    brojDokumenta: r.brojDokumenta,
    nabavna: parseDec(r.nabavnaVrijednost) != null ? formatKm(parseDec(r.nabavnaVrijednost)!) : "",
    kvPocetak: parseDec(r.kvPocetak) != null ? formatKm(parseDec(r.kvPocetak)!) : "",
    vijek: r.vijekTrajanja || "5",
    stopaOverride: r.stopaOverride,
    mjeseciOverride: r.mjeseciOverride,
    napomena: r.napomena,
    prodano: r.prodano,
    datumProdaje: r.datumProdaje ? isoToDisplay(r.datumProdaje) : "",
  };
}

const VIJEK_OPTIONS = Array.from({ length: 40 }, (_, i) => {
  const g = i + 1;
  return {
    value: String(g),
    label: `${g} ${g === 1 ? "godina" : g < 5 ? "godine" : "godina"} (${VIJEK_STOPA[String(g)]}%)`,
  };
});

export default function StalnaSredstvaPage() {
  const qc = useQueryClient();
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear);
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + 1 - i);

  // isti query key kao Zaključak godine, pa se statusi tamo sami osvježe
  const pldiQ = useQuery({
    queryKey: ["amortizacija", orgId, year],
    queryFn: () => unwrap(getAmortizacija(String(year), orgId)),
    enabled: orgId != null,
  });
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const rows: AssetRow[] = useMemo(
    () => (Array.isArray(pldiQ.data?.rows) ? pldiQ.data!.rows : []),
    [pldiQ.data],
  );
  const obveznik: ObveznikData = useMemo(() => {
    if (pldiQ.data?.obveznik) {
      return { ...pldiQ.data.obveznik, godina: String(year) };
    }
    // svjež registar: isti prefill kao backend appendAsset
    return {
      jmb: "",
      imeIPrezime: "",
      adresa: "",
      grad: "",
      jib: fullOrg?.taxNumber || "",
      naziv: fullOrg?.name || "",
      adresaDjelatnosti: fullOrg?.address || "",
      gradDjelatnosti: fullOrg?.city || "",
      vrstaSifra: fullOrg?.activityCode || "",
      vrstaNaziv: "",
      godina: String(year),
      manualPeriod: false,
      periodOd: "",
      periodDo: "",
    };
  }, [pldiQ.data, fullOrg, year]);

  // period obračuna (ručni period se poštuje ako je postavljen na obrascu)
  const odISO =
    obveznik.manualPeriod && obveznik.periodOd
      ? obveznik.periodOd
      : `${year}-01-01`;
  const doISO =
    obveznik.manualPeriod && obveznik.periodDo
      ? obveznik.periodDo
      : `${year}-12-31`;


  const obracuni = useMemo(
    () => rows.map((r) => ({ row: r, o: calcRow(r, odISO, doISO) })),
    [rows, odISO, doISO],
  );
  const sume = useMemo(() => {
    let nabavna = 0;
    let kv = 0;
    let iznos = 0;
    let kvKraj = 0;
    for (const { row, o } of obracuni) {
      nabavna += parseDec(row.nabavnaVrijednost) ?? 0;
      kv += parseDec(row.kvPocetak) ?? 0;
      iznos += o.iznos ?? 0;
      kvKraj += o.kvKraj ?? 0;
    }
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return { nabavna: r2(nabavna), kv: r2(kv), iznos: r2(iznos), kvKraj: r2(kvKraj) };
  }, [obracuni]);

  // spremanje cijelog registra (isti API kao marketing strana)
  const [obavijest, setObavijest] = useState<string | null>(null);
  const spremiM = useMutation({
    mutationFn: (data: PldiSaveData) =>
      unwrap(saveAmortizacija(String(year), data, orgId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["amortizacija", orgId, year] });
    },
    onError: () => setObavijest("Spremanje nije uspjelo, pokušajte ponovo."),
  });
  function spremiRedove(noviRedovi: AssetRow[]) {
    // bez aktivnog obrta ne šalji (organizationId:null bi napravio org-less
    // PLDI zapis); stranica se ionako učita tek kad je obrt poznat
    if (orgId == null) return;
    spremiM.mutate({ obveznik, rows: noviRedovi });
  }

  // ── Ručni period obračuna (obrt otvoren/zatvoren u toku godine) ──
  // Lokalni draft se sinhronizuje sa učitanim obveznikom (render-adjust),
  // sprema se dugmetom da PkDateInput kucanje ne okida spremanje po slovu.
  const [periodDraft, setPeriodDraft] = useState({
    manual: false,
    od: "",
    doo: "",
  });
  const [periodSyncKey, setPeriodSyncKey] = useState("");
  const periodKey = `${orgId}-${year}-${obveznik.manualPeriod}-${obveznik.periodOd}-${obveznik.periodDo}`;
  if (periodSyncKey !== periodKey) {
    setPeriodSyncKey(periodKey);
    setPeriodDraft({
      manual: Boolean(obveznik.manualPeriod),
      od: obveznik.periodOd ? isoToDisplay(obveznik.periodOd) : "",
      doo: obveznik.periodDo ? isoToDisplay(obveznik.periodDo) : "",
    });
  }
  const [periodError, setPeriodError] = useState<string | null>(null);
  function spremiPeriod(manual: boolean) {
    if (orgId == null) return;
    setPeriodError(null);
    if (!manual) {
      spremiM.mutate({
        obveznik: {
          ...obveznik,
          manualPeriod: false,
          periodOd: "",
          periodDo: "",
        },
        rows,
      });
      return;
    }
    const od = periodDraft.od.trim() ? parseDateInput(periodDraft.od) : null;
    const doo = periodDraft.doo.trim() ? parseDateInput(periodDraft.doo) : null;
    if (!od || !doo) {
      return setPeriodError("Unesite oba datuma perioda (DD.MM.GGGG.).");
    }
    if (!od.startsWith(String(year)) || !doo.startsWith(String(year))) {
      return setPeriodError(`Period mora biti unutar ${year}. godine.`);
    }
    if (od > doo) {
      return setPeriodError("Početak perioda je poslije kraja.");
    }
    spremiM.mutate({
      obveznik: {
        ...obveznik,
        manualPeriod: true,
        periodOd: od,
        periodDo: doo,
      },
      rows,
    });
  }

  // ── Prenos u sljedeću godinu (ista logika kao marketing strana):
  // neprodana sredstva, početna vrijednost = vrijednost na kraju ove godine,
  // ručne stope/mjeseci se resetuju. Zamjenjuje podatke sljedeće godine.
  const [prenosConfirm, setPrenosConfirm] = useState<null | {
    imaPodataka: boolean;
  }>(null);
  const [prenosBusy, setPrenosBusy] = useState(false);
  async function pokreniPrenos() {
    if (orgId == null) return;
    setPrenosBusy(true);
    try {
      const res = await getAmortizacija(String(year + 1), orgId);
      const ima =
        res.ok &&
        res.data != null &&
        Array.isArray(res.data.rows) &&
        res.data.rows.length > 0;
      setPrenosConfirm({ imaPodataka: Boolean(ima) });
    } finally {
      setPrenosBusy(false);
    }
  }
  async function izvrsiPrenos() {
    if (orgId == null) return;
    setPrenosConfirm(null);
    setPrenosBusy(true);
    try {
      const nextYear = year + 1;
      const carryObveznik: ObveznikData = {
        ...obveznik,
        godina: String(nextYear),
        manualPeriod: false,
        periodOd: `${nextYear}-01-01`,
        periodDo: `${nextYear}-12-31`,
      };
      const carryRows: AssetRow[] = obracuni
        .filter(({ row }) => !row.prodano)
        .map(({ row, o }) => ({
          id: nid(),
          naziv: row.naziv,
          datumNabavke: row.datumNabavke,
          brojDokumenta: row.brojDokumenta,
          nabavnaVrijednost: row.nabavnaVrijednost,
          kvPocetak:
            o.kvKraj != null ? o.kvKraj.toFixed(2).replace(".", ",") : "",
          vijekTrajanja: row.vijekTrajanja,
          stopaOverride: "",
          mjeseciOverride: "",
          napomena: row.napomena,
          prodano: false,
          datumProdaje: "",
        }));
      const res = await saveAmortizacija(
        String(nextYear),
        { obveznik: carryObveznik, rows: carryRows },
        orgId,
      );
      if (!res.ok) {
        setObavijest("Prenos nije uspio, pokušajte ponovo.");
        return;
      }
      qc.invalidateQueries({ queryKey: ["amortizacija", orgId, nextYear] });
      setYear(nextYear);
      setObavijest(
        `Preneseno ${carryRows.length} sredstava u ${nextYear}. godinu (početna vrijednost = vrijednost na kraju ${year}.).`,
      );
    } finally {
      setPrenosBusy(false);
    }
  }

  // modal unosa/izmjene
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [brisi, setBrisi] = useState<AssetRow | null>(null);

  function sacuvajDraft() {
    if (!draft) return;
    setDraftError(null);
    if (!draft.naziv.trim()) return setDraftError("Upišite naziv sredstva.");
    const datumIso = draft.datumNabavke.trim()
      ? parseDateInput(draft.datumNabavke)
      : null;
    if (draft.datumNabavke.trim() && !datumIso) {
      return setDraftError("Datum nabavke nije validan (DD.MM.GGGG.).");
    }
    const nabavna = parseKm(draft.nabavna);
    if (nabavna == null || nabavna <= 0) {
      return setDraftError("Unesite nabavnu vrijednost.");
    }
    const kvPocetak = draft.kvPocetak.trim() ? parseKm(draft.kvPocetak) : nabavna;
    if (kvPocetak == null || kvPocetak < 0) {
      return setDraftError("Vrijednost na početku godine nije validna.");
    }
    const prodajaIso = draft.datumProdaje.trim()
      ? parseDateInput(draft.datumProdaje)
      : null;
    if (draft.prodano && draft.datumProdaje.trim() && !prodajaIso) {
      return setDraftError("Datum prodaje nije validan (DD.MM.GGGG.).");
    }
    // ručni override-i: ako su uneseni, moraju biti u dozvoljenom rasponu,
    // da spremljena vrijednost ne odudara od one koja se prikaže/obračuna
    if (draft.mjeseciOverride.trim()) {
      const mj = parseInt(draft.mjeseciOverride, 10);
      if (isNaN(mj) || mj < 1 || mj > 12) {
        return setDraftError("Mjeseci moraju biti između 1 i 12.");
      }
    }
    if (draft.stopaOverride.trim()) {
      const st = parseKm(draft.stopaOverride);
      if (st == null || st < 0 || st > 100) {
        return setDraftError("Stopa mora biti između 0 i 100%.");
      }
    }
    const red: AssetRow = {
      id: draft.id ?? nid(),
      naziv: draft.naziv.trim(),
      datumNabavke: datumIso ?? "",
      brojDokumenta: draft.brojDokumenta.trim(),
      nabavnaVrijednost: nabavna.toFixed(2).replace(".", ","),
      kvPocetak: kvPocetak.toFixed(2).replace(".", ","),
      vijekTrajanja: draft.vijek,
      stopaOverride: draft.stopaOverride.trim(),
      mjeseciOverride: draft.mjeseciOverride.trim(),
      napomena: draft.napomena.trim(),
      prodano: draft.prodano,
      datumProdaje: draft.prodano ? (prodajaIso ?? "") : "",
    };
    const novi = draft.id
      ? rows.map((r) => (r.id === draft.id ? red : r))
      : [...rows, red];
    spremiRedove(novi);
    setDraft(null);
  }

  // knjiženje godišnje amortizacije u KPR (isto kao na Zaključku godine)
  const knjizenjeQ = useQuery({
    queryKey: ["amort-knjizenje", orgId, year],
    queryFn: () => unwrap(getAmortKnjizenje(orgId as number, year)),
    enabled: orgId != null,
  });
  const knjizeno = knjizenjeQ.data?.knjizeno === true;
  const knjiziM = useMutation({
    mutationFn: () =>
      unwrap(
        knjiziAmortizaciju({
          organizationId: orgId as number,
          godina: year,
          iznos: sume.iznos,
          // knjiži se na kraj perioda obračuna (obrt zatvoren u toku
          // godine ne smije dobiti stavku na 31.12.)
          datum: doISO,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["amort-knjizenje", orgId, year] });
      qc.invalidateQueries({ queryKey: ["kpr", orgId] });
      qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "VEC_KNJIZENO") {
        qc.invalidateQueries({ queryKey: ["amort-knjizenje", orgId, year] });
        return;
      }
      setObavijest("Knjiženje nije uspjelo, pokušajte ponovo.");
    },
  });

  // PLDI-1043 PDF (isti šablon kao marketing strana). Prazna polja obveznika
  // se za PDF dopune iz podataka obrta i vlasnika (Worker VLASNIK), da
  // zaglavlje obrasca ne izlazi prazno; spremljeni zapis se ne dira.
  const { data: radnici } = useQuery({
    queryKey: ["pk-workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId as number)),
    enabled: orgId != null,
  });
  const obveznikZaPdf = (): ObveznikData => {
    const vlasnik = (radnici ?? []).find((w) => w.role === "VLASNIK");
    return {
      ...obveznik,
      jmb: obveznik.jmb || vlasnik?.jmbg || "",
      imeIPrezime:
        obveznik.imeIPrezime ||
        (vlasnik
          ? `${vlasnik.firstName} ${vlasnik.lastName}`.trim()
          : ""),
      adresa: obveznik.adresa || vlasnik?.address || "",
      grad: obveznik.grad || vlasnik?.city || "",
      jib: obveznik.jib || fullOrg?.taxNumber || "",
      naziv: obveznik.naziv || fullOrg?.name || "",
      adresaDjelatnosti: obveznik.adresaDjelatnosti || fullOrg?.address || "",
      gradDjelatnosti: obveznik.gradDjelatnosti || fullOrg?.city || "",
      vrstaSifra: obveznik.vrstaSifra || fullOrg?.activityCode || "",
    };
  };

  const [pdfBusy, setPdfBusy] = useState(false);
  async function preuzmiPldi() {
    setPdfBusy(true);
    try {
      const pldiRows = obracuni.map(({ row, o }) => {
        const prodajaNapomena = row.prodano
          ? row.datumProdaje
            ? `Prodano: ${isoToDisplay(row.datumProdaje)}`
            : "Prodano/otpisano"
          : "";
        return {
          naziv: row.naziv,
          datumNabavke: row.datumNabavke ? isoToDisplay(row.datumNabavke) : "",
          brojDokumenta: row.brojDokumenta,
          nabavnaVrijednost: parseDec(row.nabavnaVrijednost),
          kvPocetak: parseDec(row.kvPocetak),
          vijekTrajanja: row.vijekTrajanja,
          stopa: o.stopa,
          iznos: o.iznos,
          kvKraj: o.kvKraj,
          napomena: [prodajaNapomena, row.napomena].filter(Boolean).join(" | "),
          prodanoText: row.prodano
            ? `PR.${row.datumProdaje ? ` ${isoToDisplay(row.datumProdaje)}` : ""}`
            : undefined,
        };
      });
      const o9 = obveznikZaPdf();
      const data: PldiData = {
        jmb: o9.jmb,
        imeIPrezime: o9.imeIPrezime,
        adresa: formatAddress(o9.adresa, o9.grad),
        jib: o9.jib,
        naziv: o9.naziv,
        adresaDjelatnosti: formatAddress(
          o9.adresaDjelatnosti,
          o9.gradDjelatnosti,
        ),
        vrstaSifra: o9.vrstaSifra,
        vrstaNaziv: o9.vrstaNaziv,
        godina: String(year),
        periodOd: isoToDisplay(odISO),
        periodDo: isoToDisplay(doISO),
        rows: pldiRows,
        totalNabavna: sume.nabavna,
        totalKv: sume.kv,
        totalIznos: sume.iznos,
        totalKvKraj: sume.kvKraj,
      };
      const bytes = await fillPldiTemplate(data);
      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PLDI-1043-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      void markAmortizacijaGenerated(String(year), orgId).catch(() => {});
    } finally {
      setPdfBusy(false);
    }
  }

  const busy = spremiM.isPending;

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="relative flex flex-wrap items-end justify-between gap-3 mb-6">
        <HelpButton slug="stalna-sredstva" className="absolute top-0 right-0" />
        <div>
          <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
            <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
            Knjige i evidencije
          </div>
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
            Stalna sredstva.
          </h1>
          <p className="text-[13px] leading-6 text-text-tertiary max-w-[560px]">
            Registar za amortizaciju (PLDI-1043). Podaci su isti kao na
            stranici Amortizacija na glavnom dijelu: šta se unese ovdje vidi
            se i tamo, i obrnuto.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PkSelect
            ariaLabel="Godina"
            value={String(year)}
            onChange={(v) => setYear(Number(v) || currentYear)}
            options={yearOptions.map((y) => ({
              value: String(y),
              label: String(y),
            }))}
            wrapStyle={{ width: 96 }}
          />
          <button
            type="button"
            onClick={() => void preuzmiPldi()}
            disabled={pdfBusy || rows.length === 0}
            title="Popunjen obrazac PLDI-1043 (popis dugotrajne imovine) za štampu"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {pdfBusy ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconDownload size={16} />
            )}
            PLDI-1043 (PDF)
          </button>
          <button
            type="button"
            onClick={() => void pokreniPrenos()}
            disabled={prenosBusy || rows.length === 0}
            title={`Prenesi neprodana sredstva u ${year + 1}. (početna vrijednost = vrijednost na kraju ${year}.)`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            {prenosBusy ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconArrowRight size={16} />
            )}
            Prenesi u {year + 1}.
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftError(null);
              setDraft(praznaDraft());
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={16} />
            Novo sredstvo
          </button>
        </div>
      </div>

      {/* Ručni period obračuna: obrt otvoren/zatvoren u toku godine */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] text-text-primary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={periodDraft.manual}
              onChange={(e) => {
                const manual = e.target.checked;
                setPeriodDraft((p) => ({ ...p, manual }));
                if (!manual) spremiPeriod(false);
              }}
              className="w-4 h-4 accent-[#3a5c42]"
            />
            Ručni period obračuna
          </label>
          {periodDraft.manual ? (
            <>
              <PkDateInput
                value={periodDraft.od}
                onChange={(v) => setPeriodDraft((p) => ({ ...p, od: v }))}
                ariaLabel="Period od"
                placeholder={`01.01.${year}.`}
              />
              <span className="text-[12px] text-text-tertiary">do</span>
              <PkDateInput
                value={periodDraft.doo}
                onChange={(v) => setPeriodDraft((p) => ({ ...p, doo: v }))}
                ariaLabel="Period do"
                placeholder={`31.12.${year}.`}
              />
              <button
                type="button"
                onClick={() => spremiPeriod(true)}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Sačuvaj period
              </button>
            </>
          ) : (
            <span className="text-[12.5px] text-text-tertiary">
              Obračun ide za cijelu godinu (01.01. do 31.12.). Uključite za
              obrt otvoren ili zatvoren u toku godine: amortizacija i
              knjiženje prate uneseni period.
            </span>
          )}
          {obveznik.manualPeriod && (
            <span className="text-[12px] text-brand-700 font-medium">
              Aktivan period: {isoToDisplay(odISO)} do {isoToDisplay(doISO)}
            </span>
          )}
        </div>
        {periodError && (
          <p className="text-[12.5px] text-accent-500 mt-1.5">{periodError}</p>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Sredstava u registru", value: String(rows.length) },
          { label: "Nabavna vrijednost", value: formatBAM(sume.nabavna) },
          { label: `Amortizacija ${year}.`, value: formatBAM(sume.iznos) },
          { label: "Vrijednost na kraju godine", value: formatBAM(sume.kvKraj) },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl bg-cream-100 border border-cream-300 px-4 py-3"
          >
            <div className="text-[10.5px] uppercase tracking-[0.07em] text-text-tertiary mb-1">
              {k.label}
            </div>
            <div className="font-serif-display text-[22px] text-text-primary tabular-nums">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Knjiženje amortizacije u KPR */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
          {knjizeno ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-success font-medium">
              <IconCircleCheck size={16} />
              Amortizacija za {year}. je proknjižena u KPR
              {knjizenjeQ.data?.iznos != null
                ? ` (${formatBAM(knjizenjeQ.data.iznos)}, interni izvod AM-${year})`
                : ""}
              .
            </span>
          ) : (
            <>
              <span className="text-[13px] text-text-secondary">
                Amortizacija za period <strong>{formatBAM(sume.iznos)}</strong>{" "}
                se knjiži u KPR (ostali rashodi) na {isoToDisplay(doISO)}
              </span>
              <button
                type="button"
                onClick={() => knjiziM.mutate()}
                disabled={knjiziM.isPending || sume.iznos <= 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {knjiziM.isPending && (
                  <IconLoader2 size={14} className="animate-spin" />
                )}
                Proknjiži u KPR
              </button>
            </>
          )}
        </div>
      )}

      {/* Tabela */}
      {pldiQ.isLoading ? (
        <div className="rounded-xl border border-cream-300 bg-cream-100 px-6 py-10 text-center text-[13.5px] text-text-tertiary">
          Učitavanje...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-cream-300 bg-cream-100 px-10 py-14 text-center">
          <span className="inline-flex w-14 h-14 rounded-full bg-brand-100 text-brand-700 items-center justify-center mb-4">
            <IconBuildingWarehouse size={26} />
          </span>
          <div className="font-serif-display text-[22px] leading-tight text-text-primary">
            Registar je prazan
          </div>
          <p className="text-[13.5px] leading-6 text-text-tertiary mt-2 max-w-md mx-auto">
            Dodajte opremu, vozila i mašine za {year}. godinu, ili ih ubacite
            direktno sa knjiženja ulaznog računa (opcija &quot;Stalno
            sredstvo&quot;).
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-cream-300">
                <th className={thCls}>#</th>
                <th className={thCls}>Naziv</th>
                <th className={thCls}>Datum nabavke</th>
                <th className={thCls}>Br. dok.</th>
                <th className={`${thCls} text-right`}>Nabavna</th>
                <th className={`${thCls} text-right`}>Poč. vrijednost</th>
                <th className={`${thCls} text-right`}>Vijek</th>
                <th className={`${thCls} text-right`}>Stopa</th>
                <th className={`${thCls} text-right`}>Mjeseci</th>
                <th className={`${thCls} text-right`}>Amortizacija</th>
                <th className={`${thCls} text-right`}>Kraj godine</th>
                <th className={thCls}>Prodaja/otpis</th>
                <th className={thCls} />
              </tr>
            </thead>
            <tbody>
              {obracuni.map(({ row, o }, i) => (
                <tr
                  key={row.id}
                  className="border-b border-cream-200 last:border-0 hover:bg-cream-50 cursor-pointer"
                  onClick={() => {
                    setDraftError(null);
                    setDraft(draftIzReda(row));
                  }}
                >
                  <td className={tdCls}>{i + 1}.</td>
                  <td className={`${tdCls} max-w-[240px]`}>
                    <div className="truncate font-medium">{row.naziv}</div>
                    {row.napomena && (
                      <div className="text-[11.5px] text-text-tertiary truncate">
                        {row.napomena}
                      </div>
                    )}
                  </td>
                  <td className={tdCls}>
                    {row.datumNabavke ? isoToDisplay(row.datumNabavke) : "–"}
                  </td>
                  <td className={`${tdCls} max-w-[110px] truncate`}>
                    {row.brojDokumenta || "–"}
                  </td>
                  <td className={tdNum}>
                    {formatKm(parseDec(row.nabavnaVrijednost) ?? 0)}
                  </td>
                  <td className={tdNum}>
                    {formatKm(parseDec(row.kvPocetak) ?? 0)}
                  </td>
                  <td className={tdNum}>
                    {row.vijekTrajanja ? `${row.vijekTrajanja} g.` : "–"}
                  </td>
                  <td className={tdNum}>{o.stopa ? `${o.stopa}%` : "–"}</td>
                  <td className={tdNum}>{o.mjeseci}</td>
                  <td className={`${tdNum} font-medium`}>
                    {o.iznos != null ? formatKm(o.iznos) : "–"}
                  </td>
                  <td className={tdNum}>
                    {o.kvKraj != null ? formatKm(o.kvKraj) : "–"}
                  </td>
                  <td className={tdCls}>
                    {row.prodano ? (
                      <span className="inline-block px-2 py-0.5 rounded-[20px] bg-warning-bg text-warning text-[10.5px] font-medium">
                        {row.datumProdaje
                          ? isoToDisplay(row.datumProdaje)
                          : "otpisano"}
                      </span>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className={`${tdCls} text-right`}>
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        title="Uredi"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraftError(null);
                          setDraft(draftIzReda(row));
                        }}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                      >
                        <IconPencil size={15} />
                      </button>
                      <button
                        type="button"
                        title="Obriši"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBrisi(row);
                        }}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-danger hover:bg-cream-200 transition-colors"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="bg-cream-50">
                <td className={tdCls} />
                <td className={`${tdCls} font-semibold`}>
                  Ukupno ({rows.length})
                </td>
                <td className={tdCls} />
                <td className={tdCls} />
                <td className={`${tdNum} font-semibold`}>
                  {formatKm(sume.nabavna)}
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {formatKm(sume.kv)}
                </td>
                <td className={tdNum} />
                <td className={tdNum} />
                <td className={tdNum} />
                <td className={`${tdNum} font-semibold`}>
                  {formatKm(sume.iznos)}
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {formatKm(sume.kvKraj)}
                </td>
                <td className={tdCls} />
                <td className={tdCls} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: novo/uredi sredstvo */}
      {draft && (
        <Modal
          open
          onClose={() => setDraft(null)}
          title={draft.id ? "Uredi sredstvo" : "Novo stalno sredstvo"}
          footer={
            <>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
              >
                Odustani
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={sacuvajDraft}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {busy && <IconLoader2 size={15} className="animate-spin" />}
                Sačuvaj
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Naziv sredstva *
              </label>
              <input
                className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
                value={draft.naziv}
                onChange={(e) => setDraft({ ...draft, naziv: e.target.value })}
                placeholder="npr. Laptop Lenovo T14"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Datum nabavke
                </label>
                <PkDateInput
                  value={draft.datumNabavke}
                  onChange={(v) => setDraft({ ...draft, datumNabavke: v })}
                  ariaLabel="Datum nabavke"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Broj dokumenta (račun)
                </label>
                <input
                  className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
                  value={draft.brojDokumenta}
                  onChange={(e) =>
                    setDraft({ ...draft, brojDokumenta: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Nabavna vrijednost (KM) *
                </label>
                <PkAmountInput
                  value={draft.nabavna}
                  onChange={(v) => setDraft({ ...draft, nabavna: v })}
                  ariaLabel="Nabavna vrijednost"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Vrijednost na početku {year}.
                </label>
                <PkAmountInput
                  value={draft.kvPocetak}
                  onChange={(v) => setDraft({ ...draft, kvPocetak: v })}
                  ariaLabel="Vrijednost na početku godine"
                  placeholder="prazno = nabavna"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Vijek trajanja
                </label>
                <PkSelect
                  ariaLabel="Vijek trajanja"
                  value={draft.vijek}
                  onChange={(v) => setDraft({ ...draft, vijek: String(v || "5") })}
                  options={VIJEK_OPTIONS}
                  searchable
                  wrapStyle={{ width: "100%" }}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Stopa ručno (%)
                </label>
                <PkAmountInput
                  value={draft.stopaOverride}
                  onChange={(v) => setDraft({ ...draft, stopaOverride: v })}
                  ariaLabel="Stopa amortizacije ručno"
                  placeholder="prazno = po vijeku"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Mjeseci ručno (1-12)
                </label>
                <input
                  className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
                  value={draft.mjeseciOverride}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      mjeseciOverride: e.target.value.replace(/[^\d]/g, ""),
                    })
                  }
                  placeholder="prazno = automatski"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Napomena
              </label>
              <input
                className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
                value={draft.napomena}
                onChange={(e) =>
                  setDraft({ ...draft, napomena: e.target.value })
                }
              />
            </div>
            <div className="rounded-lg border border-cream-300 bg-cream-50 px-3 py-2.5 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-[13px] text-text-primary">
                <input
                  type="checkbox"
                  checked={draft.prodano}
                  onChange={(e) =>
                    setDraft({ ...draft, prodano: e.target.checked })
                  }
                  className="accent-[#3a5c42]"
                />
                Prodano / otpisano u {year}.
              </label>
              {draft.prodano && (
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                    Datum prodaje
                  </label>
                  <PkDateInput
                    value={draft.datumProdaje}
                    onChange={(v) => setDraft({ ...draft, datumProdaje: v })}
                    ariaLabel="Datum prodaje"
                  />
                </div>
              )}
            </div>
            {draftError && (
              <p className="text-[12.5px] text-accent-500">{draftError}</p>
            )}
          </div>
        </Modal>
      )}

      {/* potvrda brisanja */}
      <ConfirmModal
        open={brisi != null}
        onClose={() => setBrisi(null)}
        onConfirm={() => {
          if (brisi) spremiRedove(rows.filter((r) => r.id !== brisi.id));
          setBrisi(null);
        }}
        title="Brisanje sredstva"
        confirmLabel="Obriši"
        message={`Obrisati "${brisi?.naziv ?? ""}" iz registra za ${year}.? Briše se i na stranici Amortizacija (isti podaci).`}
      />

      {/* potvrda prenosa u sljedeću godinu */}
      <ConfirmModal
        open={prenosConfirm != null}
        onClose={() => setPrenosConfirm(null)}
        onConfirm={() => void izvrsiPrenos()}
        title={`Prenos u ${year + 1}.`}
        confirmLabel="Prenesi"
        danger={prenosConfirm?.imaPodataka ?? false}
        message={
          prenosConfirm?.imaPodataka
            ? `Godina ${year + 1}. već ima sačuvana sredstva: prenos će ih ZAMIJENITI novim stanjem iz ${year}. Prenose se neprodana sredstva sa početnom vrijednošću = vrijednost na kraju ${year}.`
            : `Prenijeti neprodana sredstva u ${year + 1}.? Nabavna vrijednost ostaje ista, početna vrijednost ${year + 1}. je vrijednost na kraju ${year}., ručne stope i mjeseci se resetuju.`
        }
      />

      {/* obavijest/greška */}
      <ConfirmModal
        open={obavijest != null}
        onClose={() => setObavijest(null)}
        title="Obavijest"
        message={obavijest}
      />
    </div>
  );
}
