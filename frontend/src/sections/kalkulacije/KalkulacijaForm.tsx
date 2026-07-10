"use client";

// Unos maloprodajne kalkulacije po uzoru na desktop knjigovodstvene programe:
// zaglavlje (dobavljač + račun), panel za unos JEDNOG artikla sa živim
// obračunom, Enter/Dodaj ubaci stavku i vrati fokus na artikal pa se roba
// kuca red za redom. Marža i MPC su dvosmjerni: upiši jedno, drugo se
// izračuna. Tab "Obračun kalkulacije" prikazuje sve kolone KCM obrasca.
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  IconCheck,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import {
  EMPTY_PARTNER_FORM,
  PartnerFormModal,
  type PartnerFormState,
} from "src/sections/partneri/PartnerFormModal";
import { ArtikalModal } from "./ArtikalModal";
import { ArtikalCombobox } from "./ArtikalCombobox";
import { usePartners } from "src/hooks/usePartners";
import {
  useArtikli,
  useCreateKalkulacija,
  useUpdateKalkulacija,
} from "src/hooks/useKalkulacije";
import { getKalkulacija, type KalkulacijaDetail } from "src/api/kalkulacije";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import {
  isoToDisplay,
  parseDateInput,
  todayFormatted,
} from "src/lib/dateInput";
import {
  computeStavka,
  marzaIzMpc,
  mpcIzMarze,
  PDV_STOPA,
} from "./obracun";
import { downloadKcmPdf } from "./kcmPdf";

const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";
const thCls =
  "px-2.5 py-2 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-2.5 py-2 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;
const thNum = `${thCls} text-right`;

const kol = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 3 });
const pct = (n: number) =>
  `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const cij = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });

type Row = {
  uid: number;
  artikalId: number;
  sifra: string;
  naziv: string;
  jm: string;
  oslobodjenPdv: boolean;
  kolicina: number;
  cijena: number;
  rabatPct: number;
  zavisniTrosakPct: number;
  mpc: number;
};

export function KalkulacijaForm({
  orgId,
  initial,
  kopija = false,
}: {
  orgId: number;
  /** null = nova kalkulacija */
  initial: KalkulacijaDetail | null;
  /** initial služi samo kao predložak: sprema se NOVA kalkulacija
   *  (dobavljač i stavke se prenesu, broj računa se unosi iznova) */
  kopija?: boolean;
}) {
  const router = useRouter();
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId)),
  });
  const orgObveznik = Boolean(fullOrg?.isPdvObveznik);

  const partnersQ = usePartners(orgId);
  const artikliQ = useArtikli(orgId);
  const createM = useCreateKalkulacija(orgId);
  const updateM = useUpdateKalkulacija(orgId);

  // ── zaglavlje ──
  const [partnerId, setPartnerId] = useState<number | null>(
    initial?.partnerId ?? null,
  );
  // kopija: novi račun dobavljača, pa se broj i datumi ne prenose
  const [brojRacuna, setBrojRacuna] = useState(
    kopija ? "" : (initial?.brojRacuna ?? ""),
  );
  const [datumRacuna, setDatumRacuna] = useState(
    initial && !kopija ? isoToDisplay(initial.datumRacuna) : todayFormatted(),
  );
  const [datum, setDatum] = useState(
    initial && !kopija ? isoToDisplay(initial.datum) : todayFormatted(),
  );
  const [bezPdv, setBezPdv] = useState(initial?.bezPdv ?? false);
  const [napomena, setNapomena] = useState(
    kopija ? "" : (initial?.napomena ?? ""),
  );
  const [noviPartner, setNoviPartner] = useState<PartnerFormState | null>(
    null,
  );

  // ── stavke ──
  const uidRef = useRef(1);
  const [rows, setRows] = useState<Row[]>(() =>
    (initial?.stavke ?? []).map((s) => ({
      uid: uidRef.current++,
      artikalId: s.artikalId,
      sifra: s.sifra,
      naziv: s.naziv,
      jm: s.jm,
      oslobodjenPdv: s.pdvStopa === 0,
      kolicina: s.kolicina,
      cijena: s.cijena,
      rabatPct: s.rabatPct,
      zavisniTrosakPct: s.zavisniTrosakPct,
      mpc: s.mpc,
    })),
  );

  // ── panel za unos jednog artikla ──
  const [artikalId, setArtikalId] = useState<number | null>(null);
  const [kolicinaS, setKolicinaS] = useState("");
  const [cijenaS, setCijenaS] = useState("");
  const [rabatS, setRabatS] = useState("");
  const [zavisniS, setZavisniS] = useState("");
  const [marzaS, setMarzaS] = useState("");
  const [mpcS, setMpcS] = useState("");
  // zadnje ručno uneseno od para marža/MPC: to je sidro pri preračunu
  const anchorRef = useRef<"marza" | "mpc">("mpc");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [noviArtikal, setNoviArtikal] = useState(false);
  const artikalInputRef = useRef<HTMLInputElement>(null);
  const kolicinaWrapRef = useRef<HTMLDivElement>(null);

  // inline uređivanje stavke direktno u tabeli (ne vraća se u panel)
  type RowDraft = {
    uid: number;
    kolicinaS: string;
    cijenaS: string;
    rabatS: string;
    zavisniS: string;
    marzaS: string;
    mpcS: string;
  };
  const [rowEdit, setRowEdit] = useState<RowDraft | null>(null);
  const rowAnchorRef = useRef<"marza" | "mpc">("mpc");
  const [rowError, setRowError] = useState<string | null>(null);

  const [view, setView] = useState<"unos" | "obracun">("unos");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"spremi" | "pdf" | null>(null);

  const artikli = artikliQ.data ?? [];
  const artikal = artikli.find((a) => a.id === artikalId) ?? null;
  // usluge ne ulaze u kalkulacije/lager (nemaju zalihe), nude se na fakturama
  const artikliZaIzbor = artikli.filter(
    (a) => (a.aktivan && a.tip !== "USLUGA") || a.id === artikalId,
  );

  const bezPdvRacun = !orgObveznik || bezPdv;
  const panelStopa =
    orgObveznik && !(artikal?.oslobodjenPdv ?? false) ? PDV_STOPA : 0;

  // jedinična nabavna cijena iz trenutnog unosa (za dvosmjerni marža/MPC)
  function nabavnaCijenaIz(cijenaStr: string, rabatStr: string, zavStr: string) {
    const c = parseKm(cijenaStr, 5) ?? 0;
    const r = parseKm(rabatStr) ?? 0;
    const z = parseKm(zavStr) ?? 0;
    return c * (1 - r / 100) * (1 + z / 100);
  }

  // preračun para marža/MPC kad se promijeni bilo koji ulaz
  function syncPar(next: { cijena?: string; rabat?: string; zavisni?: string }) {
    const nab = nabavnaCijenaIz(
      next.cijena ?? cijenaS,
      next.rabat ?? rabatS,
      next.zavisni ?? zavisniS,
    );
    if (anchorRef.current === "marza") {
      const m = parseKm(marzaS);
      if (m != null && nab > 0) setMpcS(formatKm(mpcIzMarze(nab, m, panelStopa)));
    } else {
      const mpc = parseKm(mpcS);
      if (mpc != null && nab > 0) {
        setMarzaS(formatKm(marzaIzMpc(nab, mpc, panelStopa)));
      }
    }
  }

  function onMarza(v: string) {
    setMarzaS(v);
    anchorRef.current = "marza";
    const m = parseKm(v);
    const nab = nabavnaCijenaIz(cijenaS, rabatS, zavisniS);
    if (m != null && nab > 0) setMpcS(formatKm(mpcIzMarze(nab, m, panelStopa)));
  }

  function onMpc(v: string) {
    setMpcS(v);
    anchorRef.current = "mpc";
    const mpc = parseKm(v);
    const nab = nabavnaCijenaIz(cijenaS, rabatS, zavisniS);
    if (mpc != null && nab > 0) {
      setMarzaS(formatKm(marzaIzMpc(nab, mpc, panelStopa)));
    }
  }

  // živi obračun panela (prikaz sa strane, kao u desktop programu)
  const panelObracun = useMemo(() => {
    const kolicina = parseKm(kolicinaS, 3) ?? 0;
    const cijena = parseKm(cijenaS, 5) ?? 0;
    const mpc = parseKm(mpcS) ?? 0;
    if (kolicina <= 0 || mpc <= 0) return null;
    return computeStavka(
      {
        kolicina,
        cijena,
        rabatPct: parseKm(rabatS) ?? 0,
        zavisniTrosakPct: parseKm(zavisniS) ?? 0,
        mpc,
      },
      {
        orgObveznik,
        bezPdvRacun,
        oslobodjenPdv: artikal?.oslobodjenPdv ?? false,
      },
    );
  }, [kolicinaS, cijenaS, rabatS, zavisniS, mpcS, orgObveznik, bezPdvRacun, artikal]);

  // obračun svih stavki + sume (isti kod kao backend snapshot)
  const obracuni = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        o: computeStavka(r, {
          orgObveznik,
          bezPdvRacun,
          oslobodjenPdv: r.oslobodjenPdv,
        }),
      })),
    [rows, orgObveznik, bezPdvRacun],
  );
  const sume = useMemo(() => {
    const s = (f: (o: ReturnType<typeof computeStavka>) => number) =>
      obracuni.reduce((a, x) => a + f(x.o), 0);
    return {
      iznos: s((o) => o.iznos),
      rabat: s((o) => o.rabatIznos),
      fakturna: s((o) => o.fakturnaVrijednost),
      zavisni: s((o) => o.zavisniTrosak),
      nabavna: s((o) => o.nabavniIznos),
      ulazniPdv: s((o) => o.ulazniPdvIznos),
      bezPdvIznos: s((o) => o.vrijednostBezPdv),
      marza: s((o) => o.marzaIznos),
      pdv: s((o) => o.pdvIznos),
      maloprodajna: s((o) => o.maloprodajniIznos),
    };
  }, [obracuni]);

  function fokusNaArtikal() {
    setTimeout(() => artikalInputRef.current?.focus(), 0);
  }

  function fokusNaKolicinu() {
    setTimeout(() => {
      kolicinaWrapRef.current?.querySelector("input")?.focus();
    }, 0);
  }

  function ocistiPanel() {
    setArtikalId(null);
    setKolicinaS("");
    setCijenaS("");
    setRabatS("");
    setZavisniS("");
    setMarzaS("");
    setMpcS("");
    setPanelError(null);
  }

  function dodajStavku() {
    setPanelError(null);
    const kolicina = parseKm(kolicinaS, 3);
    const cijena = parseKm(cijenaS, 5);
    const mpc = parseKm(mpcS);
    if (!artikal) return setPanelError("Izaberite artikal.");
    if (kolicina == null || kolicina <= 0) {
      return setPanelError("Unesite količinu.");
    }
    if (cijena == null || cijena < 0) {
      return setPanelError("Unesite fakturnu cijenu.");
    }
    if (mpc == null || mpc <= 0) {
      return setPanelError("Unesite MPC ili maržu.");
    }
    const row: Row = {
      uid: uidRef.current++,
      artikalId: artikal.id,
      sifra: artikal.sifra,
      naziv: artikal.naziv,
      jm: artikal.jm,
      oslobodjenPdv: artikal.oslobodjenPdv,
      kolicina,
      cijena,
      rabatPct: parseKm(rabatS) ?? 0,
      zavisniTrosakPct: parseKm(zavisniS) ?? 0,
      mpc,
    };
    setRows((prev) => [...prev, row]);
    ocistiPanel();
    fokusNaArtikal();
  }

  // ── inline uređivanje reda direktno u tabeli ──
  function stopaZaRow(r: Row) {
    return orgObveznik && !r.oslobodjenPdv ? PDV_STOPA : 0;
  }

  function startRowEdit(r: Row) {
    const nab =
      r.cijena * (1 - r.rabatPct / 100) * (1 + r.zavisniTrosakPct / 100);
    setRowError(null);
    rowAnchorRef.current = "mpc";
    setRowEdit({
      uid: r.uid,
      kolicinaS: kol(r.kolicina),
      cijenaS: formatKm(r.cijena, 5),
      rabatS: r.rabatPct ? formatKm(r.rabatPct) : "",
      zavisniS: r.zavisniTrosakPct ? formatKm(r.zavisniTrosakPct) : "",
      marzaS: nab > 0 ? formatKm(marzaIzMpc(nab, r.mpc, stopaZaRow(r))) : "",
      mpcS: formatKm(r.mpc),
    });
  }

  // izmjena polja u redu: marža i MPC ostaju dvosmjerni i pri inline editu
  function rowEditChange(patch: Partial<RowDraft>, source?: "marza" | "mpc") {
    if (source) rowAnchorRef.current = source;
    setRowEdit((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const row = rows.find((r) => r.uid === prev.uid);
      if (!row) return next;
      const stopa = stopaZaRow(row);
      const nab =
        (parseKm(next.cijenaS, 5) ?? 0) *
        (1 - (parseKm(next.rabatS) ?? 0) / 100) *
        (1 + (parseKm(next.zavisniS) ?? 0) / 100);
      if (rowAnchorRef.current === "marza") {
        const m = parseKm(next.marzaS);
        if (m != null && nab > 0) {
          next.mpcS = formatKm(mpcIzMarze(nab, m, stopa));
        }
      } else {
        const mpc = parseKm(next.mpcS);
        if (mpc != null && nab > 0) {
          next.marzaS = formatKm(marzaIzMpc(nab, mpc, stopa));
        }
      }
      return next;
    });
  }

  function saveRowEdit() {
    if (!rowEdit) return;
    setRowError(null);
    const kolicina = parseKm(rowEdit.kolicinaS, 3);
    const cijena = parseKm(rowEdit.cijenaS, 5);
    const mpc = parseKm(rowEdit.mpcS);
    if (kolicina == null || kolicina <= 0) {
      return setRowError("Unesite ispravnu količinu.");
    }
    if (cijena == null || cijena < 0) {
      return setRowError("Unesite ispravnu cijenu.");
    }
    if (mpc == null || mpc <= 0) return setRowError("Unesite ispravan MPC.");
    setRows((prev) =>
      prev.map((r) =>
        r.uid === rowEdit.uid
          ? {
              ...r,
              kolicina,
              cijena,
              rabatPct: parseKm(rowEdit.rabatS) ?? 0,
              zavisniTrosakPct: parseKm(rowEdit.zavisniS) ?? 0,
              mpc,
            }
          : r,
      ),
    );
    setRowEdit(null);
  }

  const enterDodaje: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dodajStavku();
    }
  };

  async function spremi(preuzmiPdf: boolean) {
    setSaveError(null);
    const datumIso = parseDateInput(datum);
    const datumRacunaIso = parseDateInput(datumRacuna);
    if (partnerId == null) return setSaveError("Izaberite dobavljača.");
    if (!brojRacuna.trim()) {
      return setSaveError("Unesite broj računa dobavljača.");
    }
    if (!datumRacunaIso) return setSaveError("Unesite ispravan datum računa.");
    if (!datumIso) return setSaveError("Unesite ispravan datum kalkulacije.");
    if (rows.length === 0) {
      return setSaveError("Dodajte bar jednu stavku.");
    }
    setSaving(preuzmiPdf ? "pdf" : "spremi");
    try {
      const payload = {
        datum: datumIso,
        partnerId,
        brojRacuna: brojRacuna.trim(),
        datumRacuna: datumRacunaIso,
        bezPdv,
        napomena: napomena.trim(),
        stavke: rows.map((r) => ({
          artikalId: r.artikalId,
          kolicina: r.kolicina,
          cijena: r.cijena,
          rabatPct: r.rabatPct,
          zavisniTrosakPct: r.zavisniTrosakPct,
          mpc: r.mpc,
        })),
      };
      const saved =
        initial && !kopija
          ? await updateM.mutateAsync({ id: initial.id, payload })
          : await createM.mutateAsync(payload);
      if (preuzmiPdf && fullOrg) {
        const detail = await unwrap(getKalkulacija(orgId, saved.id));
        await downloadKcmPdf(detail, fullOrg);
      }
      router.push("/app/kalkulacije");
    } catch (e) {
      setSaveError(
        e instanceof Error && e.message === "RACUN_PLACEN"
          ? "Ulazni račun ove kalkulacije je već plaćen (vezan za izvod), pa se kalkulacija ne može mijenjati. Prvo razvežite uplatu na stranici Partneri."
          : "Greška pri spremanju, pokušajte ponovo.",
      );
    } finally {
      setSaving(null);
    }
  }

  const partnerOptions = [
    { value: "", label: "Izaberi dobavljača" },
    ...(partnersQ.data ?? []).map((p) => ({
      value: String(p.id),
      label: p.name,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* ── zaglavlje ── */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 p-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Dobavljač</label>
            <div className="flex items-center gap-2">
              <PkSelect
                ariaLabel="Dobavljač"
                value={partnerId != null ? String(partnerId) : ""}
                onChange={(v) => setPartnerId(v ? Number(v) : null)}
                searchable
                placeholder="Izaberi dobavljača"
                options={partnerOptions}
                wrapStyle={{ flex: 1, minWidth: 0 }}
              />
              <button
                type="button"
                onClick={() => setNoviPartner({ ...EMPTY_PARTNER_FORM })}
                className="shrink-0 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors whitespace-nowrap"
              >
                + Novi
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Broj računa dobavljača</label>
            <input
              value={brojRacuna}
              onChange={(e) => setBrojRacuna(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Datum računa</label>
            <PkDateInput
              value={datumRacuna}
              onChange={setDatumRacuna}
              ariaLabel="Datum računa"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Datum kalkulacije</label>
            <PkDateInput
              value={datum}
              onChange={setDatum}
              ariaLabel="Datum kalkulacije"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div className="col-span-2 lg:col-span-3">
            <label className={labelCls}>Napomena (opciono)</label>
            <input
              value={napomena}
              onChange={(e) => setNapomena(e.target.value)}
              className={inputCls}
            />
          </div>
          {orgObveznik && (
            <div className="col-span-2 lg:col-span-1 flex items-end pb-2">
              <label className="flex items-center gap-2 text-[12.5px] text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={bezPdv}
                  onChange={(e) => setBezPdv(e.target.checked)}
                  className="accent-brand-600"
                />
                Račun bez PDV-a (dobavljač nije u PDV-u)
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ── kontrolne sume: iznos računa se poredi sa računom dobavljača ── */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 flex flex-wrap gap-x-8 gap-y-2">
        <SumaItem label="Fakturna vrijednost" value={sume.fakturna} />
        {orgObveznik && !bezPdv && (
          <SumaItem label="Ulazni PDV" value={sume.ulazniPdv} />
        )}
        <SumaItem
          label="Ukupan iznos računa"
          value={sume.fakturna + sume.ulazniPdv}
          highlight
        />
        <SumaItem label="Nabavna vrijednost" value={sume.nabavna} />
        {orgObveznik && (
          <SumaItem label="Ukalkulisani PDV" value={sume.pdv} />
        )}
        <SumaItem label="Maloprodajna vrijednost" value={sume.maloprodajna} bold />
      </div>

      {/* ── pod-tabovi: unos / obračun ── */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100">
        {(
          [
            ["unos", "Unos stavki"],
            ["obracun", "Obračun kalkulacije"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={[
              "px-4 py-1.5 text-[12.5px] font-medium rounded-full transition-colors",
              view === id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "unos" && (
        <>
          {/* ── panel za unos artikla ── */}
          <div className="rounded-xl border border-cream-300 bg-cream-100 p-4">
            <div className="grid grid-cols-2 lg:grid-cols-9 gap-3 items-end">
              <div className="col-span-2 lg:col-span-3">
                <label className={labelCls}>Artikal</label>
                <div className="flex items-center gap-2">
                  <ArtikalCombobox
                    artikli={artikliZaIzbor}
                    value={artikal}
                    onSelect={(a) => setArtikalId(a?.id ?? null)}
                    onPicked={fokusNaKolicinu}
                    inputRef={artikalInputRef}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setNoviArtikal(true)}
                    className="shrink-0 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors whitespace-nowrap"
                  >
                    + Novi
                  </button>
                </div>
              </div>
              <div ref={kolicinaWrapRef}>
                <label className={labelCls}>Količina</label>
                <PkAmountInput
                  value={kolicinaS}
                  onChange={setKolicinaS}
                  decimals={3}
                  placeholder="0"
                  ariaLabel="Količina"
                  className="bg-cream-50"
                  onKeyDown={enterDodaje}
                />
              </div>
              <div>
                <label className={labelCls}>Cijena</label>
                <PkAmountInput
                  value={cijenaS}
                  onChange={(v) => {
                    setCijenaS(v);
                    syncPar({ cijena: v });
                  }}
                  decimals={5}
                  ariaLabel="Fakturna cijena"
                  className="bg-cream-50"
                  onKeyDown={enterDodaje}
                  title={
                    orgObveznik
                      ? "Fakturna cijena bez PDV-a"
                      : "Fakturna cijena (sa PDV-om ako ga račun ima)"
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Rabat %</label>
                <PkAmountInput
                  value={rabatS}
                  onChange={(v) => {
                    setRabatS(v);
                    syncPar({ rabat: v });
                  }}
                  placeholder="0"
                  ariaLabel="Rabat"
                  className="bg-cream-50"
                  onKeyDown={enterDodaje}
                />
              </div>
              <div>
                <label className={labelCls}>Zav. trošak %</label>
                <PkAmountInput
                  value={zavisniS}
                  onChange={(v) => {
                    setZavisniS(v);
                    syncPar({ zavisni: v });
                  }}
                  placeholder="0"
                  ariaLabel="Zavisni trošak"
                  className="bg-cream-50"
                  onKeyDown={enterDodaje}
                  title="Prevoz, carina i sl., % na fakturnu vrijednost stavke"
                />
              </div>
              <div>
                <label className={labelCls}>Marža %</label>
                <PkAmountInput
                  value={marzaS}
                  onChange={onMarza}
                  placeholder="0"
                  ariaLabel="Marža"
                  className="bg-cream-50"
                  onKeyDown={enterDodaje}
                />
              </div>
              <div>
                <label className={labelCls}>MPC</label>
                <PkAmountInput
                  value={mpcS}
                  onChange={onMpc}
                  ariaLabel="Maloprodajna cijena"
                  className="bg-cream-50 font-medium"
                  onKeyDown={enterDodaje}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3">
              <p className="text-[11.5px] text-text-tertiary">
                {panelObracun ? (
                  <>
                    Nabavna cijena {cij(panelObracun.nabavnaCijena)} · nabavni
                    iznos {formatBAM(panelObracun.nabavniIznos)}
                    {panelStopa > 0 &&
                      ` · PDV u MPC ${formatBAM(panelObracun.pdvIznos)}`}{" "}
                    · maloprodajni iznos{" "}
                    <strong className="text-text-primary">
                      {formatBAM(panelObracun.maloprodajniIznos)}
                    </strong>
                  </>
                ) : (
                  "Unesite količinu, cijenu i MPC ili maržu; obračun se prikazuje odmah."
                )}
              </p>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={dodajStavku}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity"
                >
                  <IconPlus size={14} />
                  Dodaj stavku
                </button>
              </div>
            </div>
            {panelError && (
              <p className="text-[12.5px] text-accent-500 mt-2">{panelError}</p>
            )}
          </div>

          {/* ── unesene stavke (kompaktno) ── */}
          <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-300">
                  <th className={thCls}>R.br</th>
                  <th className={thCls}>Šifra</th>
                  <th className={thCls}>Artikal</th>
                  <th className={thNum}>Količina</th>
                  <th className={thNum}>Cijena</th>
                  <th className={thNum}>Rabat %</th>
                  <th className={thNum}>Zav. trošak %</th>
                  <th className={thNum}>Marža %</th>
                  <th className={thNum}>MPC</th>
                  <th className={thNum}>Malopr. iznos</th>
                  <th className={`${thCls} text-right`}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {obracuni.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-[13px] text-text-tertiary"
                      colSpan={11}
                    >
                      Još nema stavki. Unesite prvi artikal iznad; Enter ili
                      &quot;Dodaj stavku&quot; ga knjiži i vraća vas na sljedeći
                      unos.
                    </td>
                  </tr>
                )}
                {obracuni.map(({ row, o }, i) => {
                  const editing = rowEdit?.uid === row.uid;
                  if (editing && rowEdit) {
                    // živi obračun iz drafta (marža % i maloprodajni iznos)
                    const draft = {
                      ...row,
                      kolicina: parseKm(rowEdit.kolicinaS, 3) ?? 0,
                      cijena: parseKm(rowEdit.cijenaS, 5) ?? 0,
                      rabatPct: parseKm(rowEdit.rabatS) ?? 0,
                      zavisniTrosakPct: parseKm(rowEdit.zavisniS) ?? 0,
                      mpc: parseKm(rowEdit.mpcS) ?? 0,
                    };
                    const od = computeStavka(draft, {
                      orgObveznik,
                      bezPdvRacun,
                      oslobodjenPdv: row.oslobodjenPdv,
                    });
                    const cell = "px-2.5 py-1.5";
                    return (
                      <tr
                        key={row.uid}
                        className="border-b border-cream-300 last:border-b-0 bg-brand-100/40"
                      >
                        <td className={tdNum}>{i + 1}.</td>
                        <td className={`${tdCls} tabular-nums`}>{row.sifra}</td>
                        <td className={tdCls}>{row.naziv}</td>
                        <td className={cell}>
                          <div className="w-24 ml-auto">
                            <PkAmountInput
                              value={rowEdit.kolicinaS}
                              onChange={(v) => rowEditChange({ kolicinaS: v })}
                              decimals={3}
                              ariaLabel="Količina stavke"
                              className="text-right"
                            />
                          </div>
                        </td>
                        <td className={cell}>
                          <div className="w-24 ml-auto">
                            <PkAmountInput
                              value={rowEdit.cijenaS}
                              onChange={(v) => rowEditChange({ cijenaS: v })}
                              decimals={5}
                              ariaLabel="Cijena stavke"
                              className="text-right"
                            />
                          </div>
                        </td>
                        <td className={cell}>
                          <div className="w-20 ml-auto">
                            <PkAmountInput
                              value={rowEdit.rabatS}
                              onChange={(v) => rowEditChange({ rabatS: v })}
                              placeholder="0"
                              ariaLabel="Rabat stavke"
                              className="text-right"
                            />
                          </div>
                        </td>
                        <td className={cell}>
                          <div className="w-20 ml-auto">
                            <PkAmountInput
                              value={rowEdit.zavisniS}
                              onChange={(v) => rowEditChange({ zavisniS: v })}
                              placeholder="0"
                              ariaLabel="Zavisni trošak stavke"
                              className="text-right"
                            />
                          </div>
                        </td>
                        <td className={cell}>
                          <div className="w-20 ml-auto">
                            <PkAmountInput
                              value={rowEdit.marzaS}
                              onChange={(v) =>
                                rowEditChange({ marzaS: v }, "marza")
                              }
                              placeholder="0"
                              ariaLabel="Marža stavke"
                              className="text-right"
                            />
                          </div>
                        </td>
                        <td className={cell}>
                          <div className="w-24 ml-auto">
                            <PkAmountInput
                              value={rowEdit.mpcS}
                              onChange={(v) =>
                                rowEditChange({ mpcS: v }, "mpc")
                              }
                              ariaLabel="MPC stavke"
                              className="text-right font-medium"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  saveRowEdit();
                                }
                              }}
                            />
                          </div>
                        </td>
                        <td className={tdNum}>
                          {formatBAM(od.maloprodajniIznos)}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <button
                            type="button"
                            onClick={saveRowEdit}
                            className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors"
                            title="Sačuvaj izmjenu"
                          >
                            <IconCheck size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRowEdit(null);
                              setRowError(null);
                            }}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                            title="Otkaži"
                          >
                            <IconX size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={row.uid}
                      className="border-b border-cream-300 last:border-b-0"
                    >
                      <td className={tdNum}>{i + 1}.</td>
                      <td className={`${tdCls} tabular-nums`}>{row.sifra}</td>
                      <td className={tdCls}>{row.naziv}</td>
                      <td className={tdNum}>{kol(row.kolicina)}</td>
                      <td className={tdNum}>{cij(row.cijena)}</td>
                      <td className={tdNum}>{pct(row.rabatPct)}</td>
                      <td className={tdNum}>{pct(row.zavisniTrosakPct)}</td>
                      <td className={tdNum}>{pct(o.marzaPct)}</td>
                      <td className={`${tdNum} font-medium`}>
                        {formatKm(row.mpc)}
                      </td>
                      <td className={tdNum}>
                        {formatBAM(o.maloprodajniIznos)}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <button
                          type="button"
                          onClick={() => startRowEdit(row)}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                          title="Uredi u redu"
                        >
                          <IconPencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRows((prev) =>
                              prev.filter((r) => r.uid !== row.uid),
                            );
                            if (rowEdit?.uid === row.uid) setRowEdit(null);
                          }}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
                          title="Obriši"
                        >
                          <IconTrash size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rowError && (
              <p className="text-[12.5px] text-accent-500 px-3 py-2">
                {rowError}
              </p>
            )}
          </div>
        </>
      )}

      {view === "obracun" && (
        <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-300">
                <th className={thCls}>R.br</th>
                <th className={thCls}>Šifra</th>
                <th className={thCls}>Artikal</th>
                <th className={thCls}>J/M</th>
                <th className={thNum}>Količina</th>
                <th className={thNum}>Cijena</th>
                <th className={thNum}>Iznos</th>
                <th className={thNum}>Rabat</th>
                <th className={thNum}>Fakt. vrijednost</th>
                <th className={thNum}>Zavisni trošak</th>
                <th className={thNum}>Nabavni iznos</th>
                <th className={thNum}>Nab. cijena</th>
                <th className={thNum}>Marža %</th>
                <th className={thNum}>Marža</th>
                <th className={thNum}>Bez PDV-a</th>
                <th className={thNum}>PDV</th>
                <th className={thNum}>MPC</th>
                <th className={thNum}>Malopr. iznos</th>
              </tr>
            </thead>
            <tbody>
              {obracuni.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-[13px] text-text-tertiary"
                    colSpan={18}
                  >
                    Još nema stavki za obračun.
                  </td>
                </tr>
              )}
              {obracuni.map(({ row, o }, i) => (
                <tr
                  key={row.uid}
                  className="border-b border-cream-300 last:border-b-0"
                >
                  <td className={tdNum}>{i + 1}.</td>
                  <td className={`${tdCls} tabular-nums`}>{row.sifra}</td>
                  <td className={tdCls}>{row.naziv}</td>
                  <td className={tdCls}>{row.jm}</td>
                  <td className={tdNum}>{kol(row.kolicina)}</td>
                  <td className={tdNum}>{cij(row.cijena)}</td>
                  <td className={tdNum}>{formatKm(o.iznos)}</td>
                  <td className={tdNum}>{formatKm(o.rabatIznos)}</td>
                  <td className={tdNum}>{formatKm(o.fakturnaVrijednost)}</td>
                  <td className={tdNum}>{formatKm(o.zavisniTrosak)}</td>
                  <td className={tdNum}>{formatKm(o.nabavniIznos)}</td>
                  <td className={tdNum}>{cij(o.nabavnaCijena)}</td>
                  <td className={tdNum}>{pct(o.marzaPct)}</td>
                  <td className={tdNum}>{formatKm(o.marzaIznos)}</td>
                  <td className={tdNum}>{formatKm(o.vrijednostBezPdv)}</td>
                  <td className={tdNum}>{formatKm(o.pdvIznos)}</td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(row.mpc)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(o.maloprodajniIznos)}
                  </td>
                </tr>
              ))}
            </tbody>
            {obracuni.length > 0 && (
              <tfoot>
                <tr className="border-t border-cream-300 bg-cream-50">
                  <td className={`${tdCls} font-medium`} colSpan={6}>
                    Ukupno
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.iznos)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.rabat)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.fakturna)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.zavisni)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.nabavna)}
                  </td>
                  <td className={tdNum} />
                  <td className={tdNum} />
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.marza)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.bezPdvIznos)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.pdv)}
                  </td>
                  <td className={tdNum} />
                  <td className={`${tdNum} font-semibold`}>
                    {formatKm(sume.maloprodajna)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {saveError && (
        <p className="text-[12.5px] text-accent-500">{saveError}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <Link
          href="/app/kalkulacije"
          className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
        >
          Odustani
        </Link>
        <button
          type="button"
          disabled={saving != null}
          onClick={() => spremi(false)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
        >
          {saving === "spremi" && (
            <IconLoader2 size={15} className="animate-spin" />
          )}
          Spremi
        </button>
        <button
          type="button"
          disabled={saving != null}
          onClick={() => spremi(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving === "pdf" && (
            <IconLoader2 size={15} className="animate-spin" />
          )}
          Spremi i preuzmi PDF
        </button>
      </div>

      <PartnerFormModal
        orgId={orgId}
        initial={noviPartner}
        onClose={() => setNoviPartner(null)}
        onSaved={(p) => setPartnerId(p.id)}
      />
      <ArtikalModal
        open={noviArtikal}
        orgId={orgId}
        artikal={null}
        onClose={() => setNoviArtikal(false)}
        onSaved={(a) => {
          setArtikalId(a.id);
          fokusNaKolicinu();
        }}
      />
    </div>
  );
}

function SumaItem({
  label,
  value,
  highlight,
  bold,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </div>
      <div
        className={[
          "text-[14px] tabular-nums",
          highlight ? "text-brand-700 font-semibold" : "text-text-primary",
          bold ? "font-semibold" : "",
        ].join(" ")}
      >
        {formatBAM(value)}
      </div>
    </div>
  );
}
