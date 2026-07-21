"use client";

import { useEffect, useRef, useState } from "react";
import { IconLoader2, IconPlus, IconUserEdit } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import {
  useCreateUlazniRacun,
  usePartners,
  useUpdateUlazniRacun,
} from "src/hooks/usePartners";
import {
  PartnerFormModal,
  formFromPartner,
  type PartnerFormState,
} from "./PartnerFormModal";
import {
  KP_ENTITETI,
  TIPOVI_DOKUMENTA_KUF,
  VRSTE_DOKUMENTA,
  type KpEntitet,
  type TipDokumentaKuf,
  type UlazniRacun,
  type VrstaDokumenta,
  type VrstaNabavke,
} from "src/api/partners";
import { formatBAM } from "src/lib/format";
import { isoToDisplay, parseDateInput, todayFormatted } from "src/lib/dateInput";
import { formatKm, parseKm } from "src/lib/amountInput";
import { appendAsset } from "src/api/amortizacija";

type PartnerOption = { id: number; name: string; code?: number | null };

export function UlazniRacunModal({
  orgId,
  open,
  onClose,
  fixedPartner,
  partners,
  preselectPartnerId,
  isPdvObveznik,
  onRequestNewPartner,
  editRacun,
  orgJurisdiction,
}: {
  orgId: number | null;
  open: boolean;
  onClose: () => void;
  /** kad se knjiži sa kartice partnera: partner je fiksiran */
  fixedPartner?: PartnerOption | null;
  /** kad se knjiži globalno: lista za izbor dobavljača */
  partners?: PartnerOption[];
  preselectPartnerId?: number | null;
  /** PDV obveznik (obrt): nudi checkbox "Faktura sadrži PDV" + auto split */
  isPdvObveznik: boolean;
  /** "+ Novi partner" u izboru dobavljača */
  onRequestNewPartner?: () => void;
  /** postojeće knjiženje: modal postaje pregled/izmjena (sva polja) */
  editRacun?: UlazniRacun | null;
  /** entitet sjedišta obrta (FBIH/RS/BD): default za krajnju potrošnju */
  orgJurisdiction?: string | null;
}) {
  const createRacun = useCreateUlazniRacun(orgId);
  const updateRacun = useUpdateUlazniRacun(orgId);
  const isEdit = editRacun != null;
  const saving = createRacun.isPending || updateRacun.isPending;

  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [brojRacuna, setBrojRacuna] = useState("");
  const [datumRacuna, setDatumRacuna] = useState("");
  const [rokPlacanja, setRokPlacanja] = useState("");
  const [iznos, setIznos] = useState("");
  const [hasPdv, setHasPdv] = useState(false);
  const [pdvIznos, setPdvIznos] = useState("");
  // KUF polja (samo za PDV obveznike)
  const [vrstaNabavke, setVrstaNabavke] = useState<VrstaNabavke>("DOMACA");
  const [datumPrijema, setDatumPrijema] = useState("");
  const [tipDokumenta, setTipDokumenta] = useState<TipDokumentaKuf>("01");
  const [vrstaDokumenta, setVrstaDokumenta] = useState<VrstaDokumenta>("REDOVNA");
  const [jciBroj, setJciBroj] = useState("");
  const [jciDatum, setJciDatum] = useState("");
  const [pdvNeodbitniIznos, setPdvNeodbitniIznos] = useState("");
  const [pausalnaNaknada, setPausalnaNaknada] = useState("");
  const [kpEntitet, setKpEntitet] = useState<KpEntitet | "">("");
  const [kpIznos, setKpIznos] = useState("");
  const [samoEvidencija, setSamoEvidencija] = useState(false);
  const [note, setNote] = useState("");
  // stalno sredstvo: uz knjiženje se dodaje i u PLDI registar amortizacije
  const [stalnoSredstvo, setStalnoSredstvo] = useState(false);
  const [ssNaziv, setSsNaziv] = useState("");
  const [ssVijek, setSsVijek] = useState("5");
  const [error, setError] = useState<string | null>(null);
  // matični podaci dobavljača (ikonica pored naziva otvara uređivanje)
  const { data: allPartners } = usePartners(open ? orgId : null);
  const [editPartner, setEditPartner] = useState<PartnerFormState | null>(null);
  function openPartnerEdit() {
    const id = editRacun?.partnerId ?? fixedPartner?.id ?? partnerId;
    const p = (allPartners ?? []).find((x) => x.id === id);
    if (p) setEditPartner(formFromPartner(p));
  }

  // isPdvObveznik stiže iz async upita; čitamo ga preko ref-a da njegova
  // promjena NE retriggeruje reset (inače bi kasni flip obrisao formu koju
  // korisnik već popunjava). Ref se osvježava u effectu, ne tokom rendera.
  const isPdvRef = useRef(isPdvObveznik);
  useEffect(() => {
    isPdvRef.current = isPdvObveznik;
  }, [isPdvObveznik]);

  // reset samo pri otvaranju / promjeni partnera; edit mod seeduje iz knjiženja
  const editRef = useRef(editRacun);
  useEffect(() => {
    editRef.current = editRacun;
  }, [editRacun]);
  useEffect(() => {
    if (!open) return;
    const r = editRef.current;
    if (r) {
      const pdv = r.pdvIznos != null ? Number(r.pdvIznos) : null;
      const neodbitni =
        Number(r.pdvNeodbitniIznos) || (r.pdvNeodbitan ? (pdv ?? 0) : 0);
      setPartnerId(r.partnerId);
      setBrojRacuna(r.brojRacuna);
      setDatumRacuna(isoToDisplay(r.datumRacuna));
      setRokPlacanja(r.rokPlacanja ? isoToDisplay(r.rokPlacanja) : "");
      // samo-PDV knjiženja (uvozni PDV po JCI) imaju iznos 0: polje ostaje prazno
      setIznos(Number(r.iznos) > 0 ? formatKm(Number(r.iznos)) : "");
      setHasPdv(pdv != null && pdv > 0);
      setPdvIznos(pdv != null && pdv > 0 ? formatKm(pdv) : "");
      setVrstaNabavke(r.vrstaNabavke ?? "DOMACA");
      setDatumPrijema(r.datumPrijema ? isoToDisplay(r.datumPrijema) : "");
      setTipDokumenta(r.tipDokumenta ?? "01");
      setVrstaDokumenta(r.vrstaDokumenta ?? "REDOVNA");
      setJciBroj(r.jciBroj ?? "");
      setJciDatum(r.jciDatum ? isoToDisplay(r.jciDatum) : "");
      setPdvNeodbitniIznos(neodbitni > 0 ? formatKm(neodbitni) : "");
      setPausalnaNaknada(
        Number(r.pausalnaNaknada) > 0 ? formatKm(Number(r.pausalnaNaknada)) : "",
      );
      setKpEntitet(r.kpEntitet ?? "");
      setKpIznos(Number(r.kpIznos) > 0 ? formatKm(Number(r.kpIznos)) : "");
      setSamoEvidencija(Boolean(r.samoEvidencija));
      setNote(r.note ?? "");
      setError(null);
      return;
    }
    setPartnerId(fixedPartner?.id ?? preselectPartnerId ?? null);
    setBrojRacuna("");
    setDatumRacuna(todayFormatted());
    setRokPlacanja("");
    setIznos("");
    // PDV obveznik: split default uključen (podaci za budući KUF od prvog dana)
    setHasPdv(isPdvRef.current);
    setPdvIznos("");
    setVrstaNabavke("DOMACA");
    setDatumPrijema("");
    setTipDokumenta("01");
    setVrstaDokumenta("REDOVNA");
    setJciBroj("");
    setJciDatum("");
    setPdvNeodbitniIznos("");
    setPausalnaNaknada("");
    setKpEntitet("");
    setKpIznos("");
    setSamoEvidencija(false);
    setNote("");
    setStalnoSredstvo(false);
    setSsNaziv("");
    setSsVijek("5");
    setError(null);
  }, [open, fixedPartner?.id, preselectPartnerId, editRacun?.id]);

  // PDV obveznik + faktura sa PDV-om: 17/117 iz ukupnog iznosa. Računa se u
  // handlerima (ne u effectu) da pri otvaranju izmjene ne pregazi upisani PDV.
  function autoPdv(totalStr: string): string {
    const total = parseKm(totalStr);
    if (total == null || total <= 0) return "";
    return formatKm(Math.round(((total * 17) / 117) * 100) / 100);
  }
  function handleIznosChange(v: string) {
    setIznos(v);
    if (hasPdv) setPdvIznos(autoPdv(v));
  }
  function handleHasPdvChange(checked: boolean) {
    setHasPdv(checked);
    setPdvIznos(checked ? autoPdv(iznos) : "");
  }

  // Neodbitni ulazni PDV je krajnja potrošnja obveznika: KP se sama popuni
  // (entitet sjedišta + iznos), a korisnik može promijeniti oboje (npr.
  // potrošnja u drugom entitetu).
  const defaultKp: KpEntitet =
    orgJurisdiction === "RS" || orgJurisdiction === "BD"
      ? orgJurisdiction
      : "FBIH";
  function handleNeodbitniChange(v: string) {
    setPdvNeodbitniIznos(v);
    const n = parseKm(v);
    if (n != null && n > 0) {
      setKpEntitet((prev) => prev || defaultKp);
      setKpIznos(v);
    } else {
      setKpIznos("");
    }
  }

  const totalNum = parseKm(iznos);
  const pdvNum = hasPdv ? parseKm(pdvIznos) : null;
  const osnovica =
    hasPdv && totalNum != null && pdvNum != null ? totalNum - pdvNum : null;

  function save() {
    setError(null);
    if (!partnerId) {
      setError("Izaberite dobavljača.");
      return;
    }
    if (!brojRacuna.trim()) {
      setError("Broj računa je obavezan.");
      return;
    }
    const datum = parseDateInput(datumRacuna);
    if (!datum) {
      setError("Datum računa nije validan (format DD.MM.GGGG.).");
      return;
    }
    const rok = rokPlacanja.trim() ? parseDateInput(rokPlacanja) : null;
    if (rokPlacanja.trim() && !rok) {
      setError("Rok plaćanja nije validan (format DD.MM.GGGG.).");
      return;
    }
    // samo PDV evidencija dozvoljava unos SAMO PDV-a (obračun uvoznog PDV-a
    // po JCI): iznos računa ostaje 0, u KUF ide isključivo PDV
    const samoPdv =
      samoEvidencija &&
      hasPdv &&
      (pdvNum ?? 0) > 0 &&
      (totalNum == null || totalNum <= 0);
    const iznosFinal = samoPdv ? 0 : totalNum;
    if (!samoPdv && (iznosFinal == null || iznosFinal <= 0)) {
      setError("Iznos nije validan.");
      return;
    }
    if (
      hasPdv &&
      !samoPdv &&
      (pdvNum == null || pdvNum < 0 || pdvNum > (iznosFinal ?? 0))
    ) {
      setError("PDV iznos nije validan.");
      return;
    }
    const prijem = datumPrijema.trim() ? parseDateInput(datumPrijema) : datum;
    if (!prijem) {
      setError("Datum prijema nije validan (format DD.MM.GGGG.).");
      return;
    }
    const neodbitni = pdvNeodbitniIznos.trim() ? parseKm(pdvNeodbitniIznos) : 0;
    if (
      hasPdv &&
      (neodbitni == null || neodbitni < 0 || neodbitni > (pdvNum ?? 0))
    ) {
      setError("Neodbitni PDV ne može biti veći od ukupnog PDV-a.");
      return;
    }
    const jciDat = jciDatum.trim() ? parseDateInput(jciDatum) : null;
    if (jciDatum.trim() && !jciDat) {
      setError("Datum JCI nije validan (format DD.MM.GGGG.).");
      return;
    }
    const payload = {
      brojRacuna: brojRacuna.trim(),
      datumRacuna: datum,
      rokPlacanja: rok,
      iznos: iznosFinal ?? 0,
      pdvIznos: hasPdv ? pdvNum : null,
      vrstaNabavke,
      pdvNeodbitniIznos: hasPdv ? (neodbitni ?? 0) : 0,
      datumPrijema: prijem,
      tipDokumenta,
      vrstaDokumenta,
      jciBroj:
        vrstaNabavke === "UVOZ" || tipDokumenta === "04"
          ? jciBroj.trim() || null
          : null,
      jciDatum:
        vrstaNabavke === "UVOZ" || tipDokumenta === "04" ? jciDat : null,
      pausalnaNaknada:
        vrstaNabavke === "OD_NEOBVEZNIKA"
          ? (parseKm(pausalnaNaknada) ?? 0)
          : 0,
      kpEntitet: kpEntitet || null,
      kpIznos: kpEntitet ? (parseKm(kpIznos) ?? 0) : 0,
      samoEvidencija,
      // uvijek poslati (i prazno), da se u izmjeni napomena može obrisati
      note: note.trim(),
    };
    // stalno sredstvo traži naziv (za PLDI registar amortizacije)
    if (!isEdit && stalnoSredstvo && !samoEvidencija && !ssNaziv.trim()) {
      setError("Upišite naziv stalnog sredstva.");
      return;
    }
    const opts = {
      onSuccess: async () => {
        // uz knjiženje dodaj sredstvo u PLDI registar (best-effort: račun je
        // već proknjižen, pa se modal zatvara i ako dodavanje ne uspije;
        // sredstvo se tada doda ručno na /amortizacija)
        if (!isEdit && stalnoSredstvo && !samoEvidencija && orgId) {
          // nabavna vrijednost sredstva = iznos bez odbitnog PDV-a
          const nabavna =
            Math.round(
              ((iznosFinal ?? 0) - (hasPdv && pdvNum ? pdvNum : 0)) * 100,
            ) / 100;
          if (nabavna > 0) {
            await appendAsset({
              organizationId: orgId,
              godina: Number(datum.slice(0, 4)),
              naziv: ssNaziv.trim(),
              brojDokumenta: brojRacuna.trim(),
              datumNabavke: datum,
              nabavnaVrijednost: nabavna,
              vijekTrajanja: Number(ssVijek) || 5,
            });
          }
        }
        onClose();
      },
      onError: () => setError("Greška pri snimanju, pokušajte ponovo."),
    };
    if (isEdit && editRacun) {
      updateRacun.mutate({ racunId: editRacun.id, patch: payload }, opts);
    } else {
      createRacun.mutate({ partnerId, ...payload }, opts);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";
  const labelCls =
    "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? `Knjiženje u KUF · ${editRacun?.brojRacuna ?? ""}`
          : "Proknjiži ulazni račun"
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Odustani
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving && <IconLoader2 size={15} className="animate-spin" />}
            {isEdit ? "Sačuvaj izmjene" : "Proknjiži"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Dobavljač */}
        <div>
          <label className={labelCls}>Dobavljač *</label>
          {isEdit || fixedPartner ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cream-200/60 text-[13px] text-text-primary">
              <span className="flex-1 truncate">
                {(isEdit ? editRacun?.partner?.name : fixedPartner?.name) ??
                  "–"}
              </span>
              <button
                type="button"
                onClick={openPartnerEdit}
                title="Matični podaci partnera (JIB, PDV broj, adresa...)"
                className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors shrink-0"
              >
                <IconUserEdit size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <PkSelect
                ariaLabel="Dobavljač"
                value={partnerId}
                onChange={(v) => setPartnerId(v ? Number(v) : null)}
                searchable
                searchPlaceholder="Pretraži dobavljača..."
                placeholder="Izaberite dobavljača..."
                options={(partners ?? []).map((p) => ({
                  value: p.id,
                  label:
                    p.code != null
                      ? `${String(p.code).padStart(4, "0")} · ${p.name}`
                      : p.name,
                }))}
                wrapStyle={{ flex: 1 }}
              />
              {partnerId != null && (
                <button
                  type="button"
                  onClick={openPartnerEdit}
                  title="Matični podaci partnera (JIB, PDV broj, adresa...)"
                  className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors shrink-0"
                >
                  <IconUserEdit size={16} />
                </button>
              )}
              {onRequestNewPartner && (
                <button
                  type="button"
                  onClick={onRequestNewPartner}
                  title="Dodaj novog partnera"
                  className="p-2 rounded-lg bg-info-bg text-info hover:brightness-95 transition-[filter] shrink-0"
                >
                  <IconPlus size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Broj računa dobavljača *</label>
          <input
            className={inputCls}
            value={brojRacuna}
            onChange={(e) => setBrojRacuna(e.target.value)}
            placeholder="npr. 123/26"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Datum računa *</label>
            <PkDateInput
              value={datumRacuna}
              onChange={setDatumRacuna}
              ariaLabel="Datum računa"
              inputClassName="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Rok plaćanja</label>
            <PkDateInput
              value={rokPlacanja}
              onChange={setRokPlacanja}
              placeholder="prazno = 30 dana"
              ariaLabel="Rok plaćanja"
              inputClassName="bg-cream-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Iznos računa (KM) *</label>
            <PkAmountInput
              value={iznos}
              onChange={handleIznosChange}
              ariaLabel="Iznos računa"
              className="bg-cream-50"
            />
          </div>
          {isPdvObveznik && hasPdv && (
            <div>
              <label className={labelCls}>PDV iznos (KM)</label>
              <PkAmountInput
                value={pdvIznos}
                onChange={setPdvIznos}
                ariaLabel="PDV iznos"
                className="bg-cream-50"
              />
            </div>
          )}
        </div>

        {/* PDV / KUF polja samo za PDV obveznike */}
        {isPdvObveznik && (
          <div className="flex flex-col gap-3 rounded-xl border border-cream-300 bg-cream-50/60 p-3">
            <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary font-semibold">
              Knjiženje u KUF
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Datum prijema</label>
                <PkDateInput
                  value={datumPrijema}
                  onChange={setDatumPrijema}
                  placeholder="prazno = datum računa"
                  ariaLabel="Datum prijema"
                  inputClassName="bg-cream-50"
                />
              </div>
              <div>
                <label className={labelCls}>Vrsta fakture</label>
                <PkSelect
                  ariaLabel="Vrsta fakture"
                  value={vrstaNabavke}
                  onChange={(v) => {
                    const vrsta = String(v ?? "DOMACA") as VrstaNabavke;
                    setVrstaNabavke(vrsta);
                    // poljoprivrednik paušalac ne zaračunava PDV
                    if (vrsta === "OD_NEOBVEZNIKA") handleHasPdvChange(false);
                    // uvoz po pravilu ide sa tipom 04 (uvozna faktura-JCI)
                    if (vrsta === "UVOZ" && tipDokumenta === "01") {
                      setTipDokumenta("04");
                    }
                    if (vrsta === "DOMACA" && tipDokumenta === "04") {
                      setTipDokumenta("01");
                    }
                  }}
                  options={[
                    { value: "DOMACA", label: "Domaći dobavljač" },
                    { value: "UVOZ", label: "Uvoz" },
                    {
                      value: "OD_NEOBVEZNIKA",
                      label: "Poljoprivrednik (paušal)",
                    },
                  ]}
                  wrapStyle={{ width: "100%" }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tip dokumenta</label>
                <PkSelect
                  ariaLabel="Tip dokumenta"
                  value={tipDokumenta}
                  onChange={(v) => {
                    const tip = String(v ?? "01") as TipDokumentaKuf;
                    setTipDokumenta(tip);
                    // tip 04 (uvozna faktura) podrazumijeva vrstu Uvoz
                    if (tip === "04") setVrstaNabavke("UVOZ");
                  }}
                  options={TIPOVI_DOKUMENTA_KUF}
                  wrapStyle={{ width: "100%" }}
                />
              </div>
              <div>
                <label className={labelCls}>Vrsta dokumenta</label>
                <PkSelect
                  ariaLabel="Vrsta dokumenta"
                  value={vrstaDokumenta}
                  onChange={(v) =>
                    setVrstaDokumenta(
                      String(v ?? "REDOVNA") as VrstaDokumenta,
                    )
                  }
                  options={VRSTE_DOKUMENTA}
                  wrapStyle={{ width: "100%" }}
                />
              </div>
            </div>
            {(vrstaNabavke === "UVOZ" || tipDokumenta === "04") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Broj JCI</label>
                  <input
                    className={inputCls}
                    value={jciBroj}
                    onChange={(e) => setJciBroj(e.target.value.toUpperCase())}
                    maxLength={18}
                    placeholder="npr. 26BA010802012345H3"
                  />
                  <p className="text-[11px] text-text-tertiary mt-1">
                    Referentni broj JCI ima 18 znakova (godina + BA + šifra
                    ispostave + broj).
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Datum JCI</label>
                  <PkDateInput
                    value={jciDatum}
                    onChange={setJciDatum}
                    ariaLabel="Datum JCI"
                    inputClassName="bg-cream-50"
                  />
                </div>
              </div>
            )}
            {vrstaNabavke === "OD_NEOBVEZNIKA" && (
              <div>
                <label className={labelCls}>Paušalna naknada (KM)</label>
                <PkAmountInput
                  value={pausalnaNaknada}
                  onChange={setPausalnaNaknada}
                  ariaLabel="Paušalna naknada"
                  className="bg-cream-50"
                />
                <p className="text-[11.5px] text-text-tertiary mt-1">
                  Paušalna naknada poljoprivredniku (polja 23 i 43 PDV
                  prijave).
                </p>
              </div>
            )}
            <div>
              <label className="inline-flex items-center gap-2 text-[13px] text-text-primary">
                <input
                  type="checkbox"
                  checked={hasPdv}
                  disabled={vrstaNabavke === "OD_NEOBVEZNIKA"}
                  onChange={(e) => handleHasPdvChange(e.target.checked)}
                  className="accent-brand-600 w-4 h-4"
                />
                Faktura sadrži PDV (17%)
              </label>
              {hasPdv && osnovica != null && pdvNum != null && totalNum != null && (
                <p className="text-[12px] text-text-tertiary mt-1">
                  Osnovica {formatBAM(osnovica)} + PDV {formatBAM(pdvNum)} ={" "}
                  {formatBAM(totalNum)} (PDV se vodi odvojeno za KUF)
                </p>
              )}
            </div>
            {hasPdv && (
              <div>
                <label className={labelCls}>
                  PDV koji se ne može odbiti (KM)
                </label>
                <PkAmountInput
                  value={pdvNeodbitniIznos}
                  onChange={handleNeodbitniChange}
                  ariaLabel="PDV koji se ne može odbiti"
                  className="bg-cream-50"
                />
                <p className="text-[11.5px] text-text-tertiary mt-1">
                  Npr. gorivo za putnički automobil ili reprezentacija; ulazi
                  u KUF ali ne i u odbitak (polja 41/61 prijave).
                  {(() => {
                    const n = parseKm(pdvNeodbitniIznos);
                    if (n != null && n > 0 && pdvNum != null) {
                      return ` Može se odbiti: ${formatBAM(Math.max(pdvNum - n, 0))}.`;
                    }
                    return "";
                  })()}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Krajnja potrošnja</label>
                <PkSelect
                  ariaLabel="Krajnja potrošnja"
                  value={kpEntitet || "NISTA"}
                  onChange={(v) =>
                    setKpEntitet(
                      v && v !== "NISTA" ? (String(v) as KpEntitet) : "",
                    )
                  }
                  options={[{ value: "NISTA", label: "Ništa" }, ...KP_ENTITETI]}
                  wrapStyle={{ width: "100%" }}
                />
              </div>
              {kpEntitet && (
                <div>
                  <label className={labelCls}>Iznos krajnje potrošnje</label>
                  <PkAmountInput
                    value={kpIznos}
                    onChange={setKpIznos}
                    ariaLabel="Iznos krajnje potrošnje"
                    className="bg-cream-50"
                  />
                </div>
              )}
            </div>
            <p className="text-[11.5px] text-text-tertiary -mt-1">
              Neodbitni PDV je krajnja potrošnja obrta pa se KP popuni sama
              (entitet sjedišta); promijenite entitet ako se troši drugdje.
            </p>
            <div>
              <label className="inline-flex items-start gap-2 text-[13px] text-text-primary">
                <input
                  type="checkbox"
                  checked={samoEvidencija}
                  onChange={(e) => setSamoEvidencija(e.target.checked)}
                  className="accent-brand-600 w-4 h-4 mt-0.5"
                />
                <span>
                  Samo PDV evidencija (bez obaveze prema dobavljaču)
                  <span className="block text-[11.5px] text-text-tertiary">
                    Ulazi u KUF, e-KUF i prijavu, ali ne u naš dug ni karticu
                    partnera. Tipično za uvoz: PDV sa JCI plaćen UINO-u ili
                    špediteru. Ako knjižite samo obračunati PDV, iznos računa
                    može ostati prazan.
                  </span>
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Stalno sredstvo: uz knjiženje ide i u PLDI registar amortizacije */}
        {!isEdit && !samoEvidencija && (
          <div className="rounded-lg border border-cream-300 bg-cream-50 px-3 py-2.5 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stalnoSredstvo}
                onChange={(e) => setStalnoSredstvo(e.target.checked)}
                className="mt-0.5 accent-[#3a5c42]"
              />
              <span className="text-[13px] text-text-primary">
                Stalno sredstvo (oprema, vozilo, mašina...)
                <span className="block text-[11.5px] text-text-tertiary">
                  Dodaje se u registar stalnih sredstava (amortizacija);
                  godišnja amortizacija se knjiži u KPR na zaključku godine.
                </span>
              </span>
            </label>
            {stalnoSredstvo && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-2">
                <div>
                  <label className={labelCls}>Naziv sredstva *</label>
                  <input
                    className={inputCls}
                    value={ssNaziv}
                    onChange={(e) => setSsNaziv(e.target.value)}
                    placeholder="npr. Laptop Lenovo T14"
                  />
                </div>
                <div>
                  <label className={labelCls}>Vijek trajanja</label>
                  <PkSelect
                    ariaLabel="Vijek trajanja"
                    value={ssVijek}
                    onChange={(v) => setSsVijek(String(v || "5"))}
                    options={[1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 33, 40].map(
                      (g) => ({
                        value: String(g),
                        label: `${g} ${g === 1 ? "godina" : g < 5 ? "godine" : "godina"} (${Math.round((100 / g) * 100) / 100}%)`,
                      }),
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className={labelCls}>Napomena</label>
          <textarea
            className={`${inputCls} min-h-[48px]`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <p className="text-[11.5px] text-text-tertiary">
          Ako na izvodu već postoji potvrđena isplata ovom partneru sa istim
          iznosom (ili brojem računa u opisu), račun se odmah označava
          plaćenim.
        </p>
        {error && <p className="text-[12.5px] text-accent-500">{error}</p>}
      </div>
    </Modal>
    <PartnerFormModal
      orgId={orgId}
      initial={editPartner}
      onClose={() => setEditPartner(null)}
    />
    </>
  );
}
