"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconCircleCheck,
  IconRotate,
  IconInbox,
  IconFileInvoice,
  IconReceipt,
  IconArrowsExchange,
  IconDownload,
  IconMail,
  IconLoader2,
  IconPencil,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { bankNameFromAccount, formatBankAccount } from "src/lib/bankCodes";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  usePartnerKartica,
  useUpdateUlazniRacun,
  useDeleteUlazniRacun,
} from "src/hooks/usePartners";
import {
  downloadIosPdf,
  downloadKarticaPdf,
  downloadOpomenaPdf,
  emailIos,
  emailKartica,
  emailOpomena,
  setOpeningBalance,
  type KarticaType,
  type UlazniRacun,
} from "src/api/partners";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { UlazniRacunModal } from "src/sections/partneri/UlazniRacunModal";
import { KompenzacijaModal } from "src/sections/prebijanja/PrebijanjeModali";
import { parseDateInput, isoToDisplay } from "src/lib/dateInput";
import { parseKm, formatKm } from "src/lib/amountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { Modal } from "src/components/app-shell/Modal";
import {
  PartnerFormModal,
  formFromPartner,
  type PartnerFormState,
} from "src/sections/partneri/PartnerFormModal";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";

// izvedeni FIFO status ima prednost nad zapamćenim
function racunEff(r: UlazniRacun): string {
  return r.paymentStatus ?? r.status;
}
function RacunBadge({ r }: { r: UlazniRacun }) {
  const st = racunEff(r);
  if (st === "PLACEN") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-success-bg text-success shrink-0">
        <IconCircleCheck size={11} /> plaćen
      </span>
    );
  }
  if (st === "DJELIMICNO") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-info-bg text-info shrink-0"
        title={
          r.preostalo != null
            ? `Preostalo za platiti: ${formatBAM(r.preostalo)}`
            : undefined
        }
      >
        djelimično
        {r.preostalo != null ? ` · ostalo ${formatBAM(r.preostalo)}` : ""}
      </span>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  if (r.rokPlacanja && r.rokPlacanja < today) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-accent-bg text-accent-500 shrink-0">
        kasni
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-warning-bg text-warning shrink-0">
      otvoren
    </span>
  );
}

function Kpi({
  label,
  value,
  tone,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "muted";
  /** dodatni red ispod vrijednosti, npr. dospjeli dio duga */
  sub?: string | null;
  subTone?: "accent";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "muted"
          ? "text-text-tertiary"
          : "text-text-primary";
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
      <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
        {label}
      </div>
      <div
        className={`font-serif-display text-[22px] leading-none tabular-nums ${color}`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`text-[11.5px] mt-1.5 tabular-nums ${
            subTone === "accent" ? "text-accent-500 font-medium" : "text-text-tertiary"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function PartnerKarticaPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId: partnerIdRaw } = use(params);
  const partnerId = Number(partnerIdRaw) || null;
  const router = useRouter();

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  // godišnji pregled: default tekuća godina, "sve" = cijeli period
  const currentYear = new Date().getFullYear();
  const [godina, setGodina] = useState<number | "sve">(currentYear);
  const period =
    godina === "sve"
      ? {}
      : { from: `${godina}-01-01`, to: `${godina}-12-31` };

  const { data: kartica, isLoading } = usePartnerKartica(
    orgId,
    partnerId,
    period,
  );
  const updateRacun = useUpdateUlazniRacun(orgId);
  const deleteRacun = useDeleteUlazniRacun(orgId);
  // ulazni račun koji čeka potvrdu brisanja (PK modal umjesto window.confirm)
  const [racunZaBrisanje, setRacunZaBrisanje] = useState<UlazniRacun | null>(
    null,
  );

  // PDV status obrta zbog PDV split-a kod knjiženja
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const [racunModalOpen, setRacunModalOpen] = useState(false);
  // kompenzacija (partner sa dugom na obje strane)
  const [kompOpen, setKompOpen] = useState(false);
  const [editInitial, setEditInitial] = useState<PartnerFormState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mailInfo, setMailInfo] = useState<string | null>(null);
  // period štampe kartice (prazno = cijeli period prometa)
  const [periodOd, setPeriodOd] = useState("");
  const [periodDo, setPeriodDo] = useState("");
  const [periodError, setPeriodError] = useState<string | null>(null);
  // IOS: stanje na dan (prazno = danas)
  const [iosNaDan, setIosNaDan] = useState("");
  const [iosInfo, setIosInfo] = useState<string | null>(null);
  // opomena kupcu za dospjeli dug (nivo 1 = opomena, 2 = pred utuženje)
  const [opomenaNivo, setOpomenaNivo] = useState<"1" | "2">("1");
  const [opomenaInfo, setOpomenaInfo] = useState<string | null>(null);

  // početno stanje partnera (migracija iz starog programa)
  const queryClient = useQueryClient();
  const [psOpen, setPsOpen] = useState(false);
  const [psDatum, setPsDatum] = useState("");
  const [psKupac, setPsKupac] = useState("");
  const [psDob, setPsDob] = useState("");
  const [psNapomena, setPsNapomena] = useState("");
  const [psError, setPsError] = useState<string | null>(null);
  const [psBusy, setPsBusy] = useState(false);

  function otvoriPocetnoStanje() {
    const op = kartica?.opening ?? null;
    setPsError(null);
    setPsDatum(
      op?.datum ? isoToDisplay(op.datum) : `31.12.${currentYear - 1}.`,
    );
    setPsKupac(op && op.kupacIznos !== 0 ? formatKm(op.kupacIznos) : "");
    setPsDob(
      op && op.dobavljacIznos !== 0 ? formatKm(op.dobavljacIznos) : "",
    );
    setPsNapomena(op?.napomena ?? "");
    setPsOpen(true);
  }

  async function sacuvajPocetnoStanje() {
    if (!orgId || !partnerId || psBusy) return;
    const datum = parseDateInput(psDatum);
    if (!datum) {
      setPsError("Upišite ispravan datum stanja (npr. 31.12.2025.).");
      return;
    }
    const kupacIznos = psKupac.trim() ? parseKm(psKupac) : 0;
    const dobavljacIznos = psDob.trim() ? parseKm(psDob) : 0;
    if (kupacIznos == null || dobavljacIznos == null) {
      setPsError("Iznosi moraju biti brojevi u KM (prazno = 0).");
      return;
    }
    setPsError(null);
    setPsBusy(true);
    const r = await setOpeningBalance(orgId, partnerId, {
      datum,
      kupacIznos,
      dobavljacIznos,
      napomena: psNapomena.trim() || null,
    });
    setPsBusy(false);
    if (r.ok) {
      setPsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["partners", orgId] });
    } else {
      setPsError("Snimanje nije uspjelo. Pokušajte ponovo.");
    }
  }

  const p = kartica?.partner ?? null;
  const totals = kartica?.totals ?? null;

  const jeKupac =
    (totals?.totalIn ?? 0) > 0 ||
    (kartica?.invoices ?? []).length > 0 ||
    Math.abs(kartica?.donos?.kupac ?? 0) > 0.005 ||
    Math.abs(kartica?.opening?.kupacIznos ?? 0) > 0.005;
  const jeDobavljac =
    (totals?.totalOut ?? 0) > 0 ||
    (kartica?.ulazniRacuni ?? []).length > 0 ||
    Math.abs(kartica?.donos?.dobavljac ?? 0) > 0.005 ||
    Math.abs(kartica?.opening?.dobavljacIznos ?? 0) > 0.005;
  // ima li dospjelog duga preko roka (uslov za opomenu)
  const imaDospjelo = (totals?.openInvoicesLate ?? 0) > 0;

  // koju karticu prikazujemo na ekranu (toggle ako je partner oboje);
  // ?tip iz liste (tab Kupci/Dobavljači) određuje početnu stranu, pa partner
  // koji je oboje otvori onu karticu iz koje si došao
  const searchParams = useSearchParams();
  const tipParam = searchParams.get("tip");
  const [ledgerType, setLedgerType] = useState<KarticaType | null>(
    tipParam === "kupac" || tipParam === "dobavljac" ? tipParam : null,
  );
  const activeLedger: KarticaType =
    ledgerType ?? (jeDobavljac || !jeKupac ? "dobavljac" : "kupac");

  // redovi kartice prometa, isti raspored kao na PDF-u; href = izvor
  // knjiženja (izvod ili faktura), klik na red ga otvara
  const ledgerRows = useMemo(() => {
    if (!kartica) return [];
    const danas = new Date().toISOString().slice(0, 10);
    const rows: {
      date: string;
      dospijece: string | null;
      istekao: boolean;
      label: string;
      duguje: number;
      potrazuje: number;
      href: string | null;
    }[] = [];
    if (activeLedger === "dobavljac") {
      for (const r of kartica.ulazniRacuni) {
        rows.push({
          date: r.datumRacuna,
          label: r.kalkulacijaOznaka
            ? `KLC ${r.kalkulacijaOznaka} · Račun ${r.brojRacuna}`
            : `Račun ${r.brojRacuna}`,
          duguje: 0,
          potrazuje: Number(r.iznos) || 0,
          dospijece: r.rokPlacanja,
          istekao:
            (r.preostalo != null ? r.preostalo > 0.005 : racunEff(r) !== "PLACEN") &&
            !!r.rokPlacanja &&
            String(r.rokPlacanja).slice(0, 10) < danas,
          // klik otvara račun na Fakture → Ulazne (pretraga po broju računa)
          href: `/app/fakture?tab=ulazne&q=${encodeURIComponent(r.brojRacuna)}`,
        });
      }
      for (const t of kartica.transactions) {
        if (t.status !== "CONFIRMED" || t.direction !== "OUT" || !t.date) continue;
        rows.push({
          date: t.date,
          label: `Plaćanje${t.statement?.statementNumber ? `, izvod br. ${t.statement.statementNumber}` : ""}`,
          duguje: Number(t.amount) || 0,
          potrazuje: 0,
          dospijece: null,
          istekao: false,
          href: t.statement?.id ? `/app/bankovni-izvodi/${t.statement.id}` : null,
        });
      }
    } else {
      for (const inv of kartica.invoices) {
        if (inv.status !== "ISSUED" && inv.status !== "PAID") continue;
        rows.push({
          date: inv.issueDate,
          label: `Faktura ${inv.fullNumber}`,
          duguje: Number(inv.grossTotal) || 0,
          potrazuje: 0,
          dospijece: inv.dueDate,
          istekao:
            (inv.preostalo != null
              ? inv.preostalo > 0.005
              : inv.status !== "PAID") &&
            !!inv.dueDate &&
            String(inv.dueDate).slice(0, 10) < danas,
          href: `/app/fakture?q=${encodeURIComponent(inv.fullNumber)}`,
        });
      }
      for (const t of kartica.transactions) {
        if (t.status !== "CONFIRMED" || t.direction !== "IN" || !t.date) continue;
        rows.push({
          date: t.date,
          label: `Uplata${t.statement?.statementNumber ? `, izvod br. ${t.statement.statementNumber}` : ""}`,
          duguje: 0,
          potrazuje: Number(t.amount) || 0,
          dospijece: null,
          istekao: false,
          href: t.statement?.id ? `/app/bankovni-izvodi/${t.statement.id}` : null,
        });
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));

    // donos iz ranijih godina (početno stanje + raniji promet) na vrh;
    // kartica strane: kupac duguje nama (duguje), dobavljaču mi (potražuje)
    const donosSaldo =
      activeLedger === "kupac"
        ? (kartica.donos?.kupac ?? 0)
        : (kartica.donos?.dobavljac ?? 0);
    if (kartica.period?.from && Math.abs(donosSaldo) > 0.005) {
      rows.unshift({
        date: kartica.period.from,
        dospijece: null,
        istekao: false,
        label: "Donos iz ranijeg perioda",
        duguje:
          activeLedger === "kupac"
            ? Math.max(donosSaldo, 0)
            : Math.max(-donosSaldo, 0),
        potrazuje:
          activeLedger === "kupac"
            ? Math.max(-donosSaldo, 0)
            : Math.max(donosSaldo, 0),
        href: null,
      });
    }
    // početno stanje unutar prikaza (pregled "sve" ili datum u periodu)
    const op = kartica.opening;
    if (op) {
      const iznos =
        activeLedger === "kupac" ? op.kupacIznos : op.dobavljacIznos;
      const uPrikazu =
        (!kartica.period?.from || op.datum >= kartica.period.from) &&
        (!kartica.period?.to || op.datum <= kartica.period.to);
      if (uPrikazu && Math.abs(iznos) > 0.005) {
        rows.push({
          date: op.datum,
          dospijece: null,
          istekao: false,
          label: `Početno stanje na ${formatDate(op.datum)}`,
          duguje:
            activeLedger === "kupac"
              ? Math.max(iznos, 0)
              : Math.max(-iznos, 0),
          potrazuje:
            activeLedger === "kupac"
              ? Math.max(-iznos, 0)
              : Math.max(iznos, 0),
          href: null,
        });
        rows.sort((a, b) => a.date.localeCompare(b.date));
      }
    }
    return rows;
  }, [kartica, activeLedger]);

  const ledgerTotals = useMemo(() => {
    let duguje = 0;
    let potrazuje = 0;
    for (const r of ledgerRows) {
      duguje += r.duguje;
      potrazuje += r.potrazuje;
    }
    return { duguje, potrazuje, saldo: duguje - potrazuje };
  }, [ledgerRows]);

  function resolvePeriod(): { from?: string; to?: string } | null {
    setPeriodError(null);
    const from = periodOd.trim() ? parseDateInput(periodOd) : undefined;
    const to = periodDo.trim() ? parseDateInput(periodDo) : undefined;
    if (periodOd.trim() && !from) {
      setPeriodError("Datum 'od' nije validan (DD.MM.GGGG.).");
      return null;
    }
    if (periodDo.trim() && !to) {
      setPeriodError("Datum 'do' nije validan (DD.MM.GGGG.).");
      return null;
    }
    return { from: from ?? undefined, to: to ?? undefined };
  }

  // prazna polja perioda štampe: podrazumijeva se izabrana godina pregleda
  function periodStampe(): { from?: string; to?: string } | null {
    const res = resolvePeriod();
    if (!res) return null;
    if (!res.from && !res.to && godina !== "sve") {
      return { from: `${godina}-01-01`, to: `${godina}-12-31` };
    }
    return res;
  }

  async function downloadKartica(type: KarticaType) {
    if (!orgId || !partnerId) return;
    const period = periodStampe();
    if (!period) return;
    setBusy(`pdf-${type}`);
    try {
      const r = await downloadKarticaPdf(orgId, partnerId, type, period);
      if (r.ok) triggerBlobDownload(r.blob, r.filename);
    } finally {
      setBusy(null);
    }
  }

  // IOS: datum stanja iz polja (prazno = danas), validacija formata
  function resolveIosNaDan(): string | null | undefined {
    setIosInfo(null);
    if (!iosNaDan.trim()) return undefined;
    const d = parseDateInput(iosNaDan);
    if (!d) {
      setIosInfo("Datum 'na dan' nije validan (DD.MM.GGGG.).");
      return null;
    }
    return d;
  }

  async function downloadIos(type: KarticaType) {
    if (!orgId || !partnerId) return;
    const naDan = resolveIosNaDan();
    if (naDan === null) return;
    setBusy(`ios-${type}`);
    try {
      const r = await downloadIosPdf(orgId, partnerId, type, naDan);
      if (r.ok) triggerBlobDownload(r.blob, r.filename);
      else setIosInfo("Preuzimanje nije uspjelo, pokušajte ponovo.");
    } finally {
      setBusy(null);
    }
  }

  async function sendIos() {
    if (!orgId || !partnerId) return;
    const naDan = resolveIosNaDan();
    if (naDan === null) return;
    setBusy("ios-email");
    try {
      // IOS se šalje za stranu na kojoj partner ima otvorene stavke;
      // ako je oboje, šalju se oba dokumenta
      const types: KarticaType[] = [];
      if (jeKupac) types.push("kupac");
      if (jeDobavljac) types.push("dobavljac");
      if (types.length === 0) types.push("kupac");
      for (const t of types) {
        const r = await emailIos(orgId, partnerId, t, naDan);
        if (!r.ok) {
          setIosInfo(
            r.error === "NO_EMAIL"
              ? "Partner nema upisan email."
              : "Slanje nije uspjelo, pokušajte ponovo.",
          );
          return;
        }
      }
      setIosInfo(`IOS poslan na ${p?.email}.`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadOpomena() {
    if (!orgId || !partnerId) return;
    setOpomenaInfo(null);
    setBusy("opomena-pdf");
    try {
      const r = await downloadOpomenaPdf(
        orgId,
        partnerId,
        opomenaNivo === "2" ? 2 : 1,
      );
      if (r.ok) triggerBlobDownload(r.blob, r.filename);
      else {
        setOpomenaInfo(
          r.error === "NEMA_DOSPJELOG_DUGA"
            ? "Partner nema dospjelog duga."
            : "Preuzimanje nije uspjelo, pokušajte ponovo.",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function sendOpomena() {
    if (!orgId || !partnerId) return;
    setOpomenaInfo(null);
    setBusy("opomena-email");
    try {
      const r = await emailOpomena(
        orgId,
        partnerId,
        opomenaNivo === "2" ? 2 : 1,
      );
      if (r.ok) setOpomenaInfo(`Opomena poslana na ${p?.email}.`);
      else {
        setOpomenaInfo(
          r.error === "NO_EMAIL"
            ? "Partner nema upisan email."
            : r.error === "NEMA_DOSPJELOG_DUGA"
              ? "Partner nema dospjelog duga."
              : "Slanje nije uspjelo, pokušajte ponovo.",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function sendKartica() {
    if (!orgId || !partnerId) return;
    const period = periodStampe();
    if (!period) return;
    setBusy("email");
    setMailInfo(null);
    try {
      const types: KarticaType[] = [];
      if (jeKupac) types.push("kupac");
      if (jeDobavljac) types.push("dobavljac");
      if (types.length === 0) types.push("dobavljac");
      for (const t of types) {
        const r = await emailKartica(orgId, partnerId, t, period);
        if (!r.ok) {
          setMailInfo(
            r.error === "NO_EMAIL"
              ? "Partner nema upisan email."
              : "Slanje nije uspjelo, pokušajte ponovo.",
          );
          return;
        }
      }
      setMailInfo(`Kartica poslana na ${p?.email}.`);
    } finally {
      setBusy(null);
    }
  }

  const sectionTitleCls = "font-serif-display text-[18px] text-text-primary";
  const pdfBtnCls =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 text-text-secondary text-[12px] font-medium hover:border-brand-600/50 hover:text-brand-600 transition-colors disabled:opacity-50";
  // labela grupe u panelu dokumenata (poravnata kolona lijevo)
  const groupLabelCls =
    "w-[92px] shrink-0 text-[11px] uppercase tracking-[0.06em] text-text-tertiary font-semibold";

  if (isLoading || !p) {
    return (
      <div className="px-6 py-10 text-center text-text-tertiary text-[13px]">
        {isLoading ? "Učitavanje kartice..." : "Partner nije pronađen."}
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Nazad + zaglavlje */}
      <Link
        href="/app/partneri"
        className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-info-bg text-info text-[13px] font-medium mb-4 transition-colors hover:brightness-95"
      >
        <IconArrowLeft
          size={16}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Svi partneri
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="font-serif-display text-[26px] leading-tight text-text-primary mb-1">
            {p.name}
          </h1>
          <p className="text-[12.5px] text-text-tertiary">
            {[
              p.code != null ? `šifra ${String(p.code).padStart(4, "0")}` : null,
              p.jib ? `JIB ${p.jib}` : null,
              p.pdvBroj ? `PDV ${p.pdvBroj} (PDV obveznik)` : null,
              [p.address, p.city].filter(Boolean).join(", ") || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {p.accounts.length > 0 && (
            <p className="text-[12px] text-text-tertiary mt-1">
              {p.accounts
                .map(
                  (a) =>
                    `${formatBankAccount(a)}${
                      bankNameFromAccount(a)
                        ? ` (${bankNameFromAccount(a)})`
                        : ""
                    }`,
                )
                .join(" · ")}
            </p>
          )}
          {(p.phone || p.email) && (
            <p className="text-[12px] text-text-tertiary mt-1">
              {[
                p.phone ? `tel. ${p.phone}` : null,
                p.email ?? null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {p.note && (
            <p
              className="text-[12px] text-text-tertiary italic mt-1 max-w-[560px]"
              title="Interna napomena, ne ide na dokumente"
            >
              {p.note}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PkSelect
            ariaLabel="Godina pregleda"
            value={godina === "sve" ? "sve" : String(godina)}
            onChange={(v) =>
              setGodina(v === "sve" ? "sve" : Number(v) || currentYear)
            }
            options={[
              ...Array.from(
                {
                  length:
                    currentYear -
                    Math.min(kartica?.minYear ?? currentYear, currentYear) +
                    1,
                },
                (_, i) => ({
                  value: String(currentYear - i),
                  label: `Godina ${currentYear - i}`,
                }),
              ),
              { value: "sve", label: "Sve godine" },
            ]}
            wrapStyle={{ width: 150 }}
          />
          {(totals?.openInvoicesTotal ?? 0) > 0 &&
            (totals?.openPayablesTotal ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setKompOpen(true)}
                title="Partner ima dug na obje strane: zatvorite ga kompenzacijom"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
              >
                <IconArrowsExchange size={15} />
                Kompenzacija
              </button>
            )}
          <button
            type="button"
            onClick={() => setEditInitial(formFromPartner(p))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconPencil size={15} />
            Uredi podatke
          </button>
          <Link
            href={`/app/fakture/nova?partner=${p.id}`}
            title="Nova faktura sa ovim partnerom kao kupcem"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconFileInvoice size={15} />
            Nova faktura
          </Link>
          <button
            type="button"
            onClick={() => setRacunModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={16} />
            Proknjiži ulazni račun
          </button>
        </div>
      </div>

      {/* Dokumenti (kartica, IOS, opomena) grupisani u jedan panel */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 mb-5 divide-y divide-cream-300/70">
        <div className="flex flex-wrap items-center gap-2 py-3">
          <span className={groupLabelCls}>Kartica</span>
        <PkDateInput
          value={periodOd}
          onChange={setPeriodOd}
          placeholder="DD.MM.GGGG."
          ariaLabel="Period od"
          title="Period štampe kartice (prazno = izabrana godina pregleda)"
          className="w-[150px]"
        />
        <PkDateInput
          value={periodDo}
          onChange={setPeriodDo}
          placeholder="DD.MM.GGGG."
          ariaLabel="Period do"
          title="Period štampe kartice (prazno = izabrana godina pregleda)"
          className="w-[150px]"
        />
        {jeKupac && (
          <button
            type="button"
            disabled={busy != null}
            onClick={() => downloadKartica("kupac")}
            className={pdfBtnCls}
          >
            {busy === "pdf-kupac" ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconDownload size={14} />
            )}
            Kartica kupca (PDF)
          </button>
        )}
        {jeDobavljac && (
          <button
            type="button"
            disabled={busy != null}
            onClick={() => downloadKartica("dobavljac")}
            className={pdfBtnCls}
          >
            {busy === "pdf-dobavljac" ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconDownload size={14} />
            )}
            Kartica dobavljača (PDF)
          </button>
        )}
        {(jeKupac || jeDobavljac) && (
          <button
            type="button"
            disabled={busy != null || !p.email}
            onClick={sendKartica}
            title={
              p.email
                ? `Pošalji karticu na ${p.email}`
                : "Partner nema upisan email"
            }
            className={pdfBtnCls}
          >
            {busy === "email" ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconMail size={14} />
            )}
            Pošalji na email
          </button>
        )}
        {mailInfo && (
          <span className="text-[12px] text-text-tertiary">{mailInfo}</span>
        )}
        {periodError && (
          <span className="text-[12px] text-accent-500">{periodError}</span>
        )}
      </div>

      {/* IOS: izvod otvorenih stavki na dan (usaglašavanje salda) */}
      {(jeKupac || jeDobavljac) && (
        <div className="flex flex-wrap items-center gap-2 py-3">
          <span
            className={groupLabelCls}
            title="Izvod otvorenih stavki: dokument za usaglašavanje potraživanja i obaveza sa partnerom, sa potvrdom salda i potpisima obje strane"
          >
            IOS na dan
          </span>
          <PkDateInput
            value={iosNaDan}
            onChange={setIosNaDan}
            placeholder="DD.MM.GGGG."
            ariaLabel="IOS na dan"
            title="Stanje otvorenih stavki na ovaj dan (prazno = danas)"
            className="w-[150px]"
          />
          {jeKupac && (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => downloadIos("kupac")}
              title="Naša potraživanja: otvorene fakture prema partneru"
              className={pdfBtnCls}
            >
              {busy === "ios-kupac" ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconDownload size={14} />
              )}
              IOS kupca (PDF)
            </button>
          )}
          {jeDobavljac && (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => downloadIos("dobavljac")}
              title="Naše obaveze: otvoreni ulazni računi dobavljača"
              className={pdfBtnCls}
            >
              {busy === "ios-dobavljac" ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconDownload size={14} />
              )}
              IOS dobavljača (PDF)
            </button>
          )}
          <button
            type="button"
            disabled={busy != null || !p.email}
            onClick={sendIos}
            title={
              p.email
                ? `Pošalji IOS na ${p.email} (rok za ovjeru 8 dana)`
                : "Partner nema upisan email"
            }
            className={pdfBtnCls}
          >
            {busy === "ios-email" ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconMail size={14} />
            )}
            Pošalji IOS
          </button>
          {iosInfo && (
            <span className="text-[12px] text-text-tertiary">{iosInfo}</span>
          )}
        </div>
      )}

      {/* Opomena kupcu: dugme uvijek vidljivo za kupca, aktivno tek kad ima
          dospjelih računa preko roka; inače onemogućeno uz objašnjenje */}
      {jeKupac && (
        <div className="flex flex-wrap items-center gap-2 py-3">
          <span className={groupLabelCls}>Opomena</span>
          {imaDospjelo ? (
            <span
              className="text-[12px] text-warning font-medium"
              title="Dospjele nenaplaćene fakture preko roka plaćanja"
            >
              Dospjeli dug {formatBAM(totals!.openInvoicesLate)}
            </span>
          ) : (
            <span className="text-[12px] text-text-tertiary">
              nema dospjelih računa
            </span>
          )}
          <PkSelect
            ariaLabel="Vrsta opomene"
            value={opomenaNivo}
            onChange={(v) => setOpomenaNivo(v === "2" ? "2" : "1")}
            disabled={!imaDospjelo}
            options={[
              { value: "1", label: "Opomena" },
              { value: "2", label: "Opomena pred utuženje" },
            ]}
            wrapStyle={{ width: 210 }}
          />
          <button
            type="button"
            disabled={busy != null || !imaDospjelo}
            onClick={downloadOpomena}
            title={
              imaDospjelo
                ? "PDF opomene sa spiskom dospjelih računa, rokom 8 dana i računom za uplatu"
                : "Opomena se pravi samo za dospjele račune (prošao rok plaćanja). Trenutno nema dospjelih računa."
            }
            className={pdfBtnCls}
          >
            {busy === "opomena-pdf" ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconDownload size={14} />
            )}
            Opomena (PDF)
          </button>
          <button
            type="button"
            disabled={busy != null || !imaDospjelo || !p.email}
            onClick={sendOpomena}
            title={
              !imaDospjelo
                ? "Nema dospjelih računa preko roka za opomenu"
                : p.email
                  ? `Pošalji opomenu na ${p.email}`
                  : "Partner nema upisan email"
            }
            className={pdfBtnCls}
          >
            {busy === "opomena-email" ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconMail size={14} />
            )}
            Pošalji opomenu
          </button>
          {opomenaInfo && (
            <span className="text-[12px] text-text-tertiary">
              {opomenaInfo}
            </span>
          )}
        </div>
      )}

      {/* Početno stanje (migracija iz starog programa) */}
      <div className="flex flex-wrap items-center gap-2 py-3">
        <span
          className={groupLabelCls}
          title="Stanje duga pri ulasku obrta u program: ulazi u karticu kao donos i u žive dugove, a uplate ga po FIFO-u zatvaraju prije novih dokumenata"
        >
          Poč. stanje
        </span>
        {kartica?.opening ? (
          <span className="text-[12px] text-text-secondary tabular-nums">
            na {formatDate(kartica.opening.datum)}:{" "}
            {kartica.opening.kupacIznos !== 0 &&
              `kupac ${formatBAM(kartica.opening.kupacIznos)}`}
            {kartica.opening.kupacIznos !== 0 &&
              kartica.opening.dobavljacIznos !== 0 &&
              " · "}
            {kartica.opening.dobavljacIznos !== 0 &&
              `dobavljač ${formatBAM(kartica.opening.dobavljacIznos)}`}
          </span>
        ) : (
          <span className="text-[12px] text-text-tertiary">
            nije uneseno (treba samo ako je dug postojao prije ulaska u
            program)
          </span>
        )}
        <button
          type="button"
          onClick={otvoriPocetnoStanje}
          className={pdfBtnCls}
        >
          <IconPencil size={14} />
          {kartica?.opening ? "Izmijeni" : "Unesi početno stanje"}
        </button>
      </div>
      </div>

      {/* KPI */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Naplaćeno od partnera" value={formatBAM(totals.totalIn)} />
          <Kpi label="Plaćeno partneru" value={formatBAM(totals.totalOut)} />
          <Kpi
            label="Njihov dug (fakture)"
            value={
              totals.openInvoicesTotal > 0
                ? formatBAM(totals.openInvoicesTotal)
                : "–"
            }
            tone={totals.openInvoicesTotal > 0 ? "success" : "muted"}
            sub={
              totals.openInvoicesLate > 0
                ? `od toga kasni ${formatBAM(totals.openInvoicesLate)}`
                : totals.openInvoicesTotal > 0
                  ? "ništa nije prošlo rok"
                  : null
            }
            subTone={totals.openInvoicesLate > 0 ? "accent" : undefined}
          />
          <Kpi
            label="Naš dug (ulazni računi)"
            value={
              totals.openPayablesTotal > 0
                ? formatBAM(totals.openPayablesTotal)
                : "–"
            }
            tone={totals.openPayablesTotal > 0 ? "warning" : "muted"}
            sub={
              totals.openPayablesLate > 0
                ? `od toga kasni ${formatBAM(totals.openPayablesLate)}`
                : totals.openPayablesTotal > 0
                  ? "ništa nije prošlo rok"
                  : null
            }
            subTone={totals.openPayablesLate > 0 ? "accent" : undefined}
          />
        </div>
      )}

      {/* Ulazni računi */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <IconReceipt size={17} className="text-text-tertiary" />
          <h2 className={sectionTitleCls}>Ulazni računi</h2>
        </div>
        <div className="rounded-xl bg-cream-100 border border-cream-300">
          {(kartica?.ulazniRacuni ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center">
              <span className="w-10 h-10 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-2">
                <IconInbox size={18} />
              </span>
              <p className="text-[13px] text-text-primary font-medium">
                Nema proknjiženih ulaznih računa
              </p>
              <p className="text-[12px] text-text-tertiary mt-1">
                Proknjižite račun dobavljača; plaćanje na izvodu ga automatski
                zatvara.
              </p>
            </div>
          ) : (
            <ul>
              {(kartica?.ulazniRacuni ?? []).map((r, i, arr) => (
                <li
                  key={r.id}
                  className={[
                    "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3",
                    i < arr.length - 1 ? "border-b border-cream-300/70" : "",
                  ].join(" ")}
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-text-primary">
                        {r.kalkulacijaOznaka
                          ? `KLC ${r.kalkulacijaOznaka} · Račun ${r.brojRacuna}`
                          : `Račun ${r.brojRacuna}`}
                      </span>
                      <RacunBadge r={r} />
                    </div>
                    <div className="text-[11.5px] text-text-tertiary mt-0.5">
                      {[
                        formatDate(r.datumRacuna),
                        r.rokPlacanja
                          ? `rok ${formatDate(r.rokPlacanja)}`
                          : null,
                        r.paidAt ? `plaćen ${formatDate(r.paidAt)}` : null,
                        r.pdvIznos != null
                          ? `PDV ${formatBAM(Number(r.pdvIznos))}`
                          : null,
                        r.note,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <span className="text-[13.5px] font-semibold tabular-nums text-text-primary whitespace-nowrap">
                    {formatBAM(Number(r.iznos))}
                  </span>
                  {r.status === "PLACEN" ? (
                    <button
                      type="button"
                      title="Vrati u otvoreno"
                      disabled={updateRacun.isPending}
                      onClick={() =>
                        updateRacun.mutate({
                          racunId: r.id,
                          patch: { status: "OTVOREN" },
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 text-text-tertiary text-[12px] font-medium hover:bg-cream-200 transition-colors disabled:opacity-50"
                    >
                      <IconRotate size={14} />
                      Vrati
                    </button>
                  ) : racunEff(r) === "PLACEN" ? null : (
                    <button
                      type="button"
                      title="Označi plaćenim (npr. gotovina)"
                      disabled={updateRacun.isPending}
                      onClick={() =>
                        updateRacun.mutate({
                          racunId: r.id,
                          patch: { status: "PLACEN" },
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
                    >
                      <IconCircleCheck size={14} />
                      Plaćen
                    </button>
                  )}
                  <button
                    type="button"
                    title="Obriši račun"
                    onClick={() => setRacunZaBrisanje(r)}
                    className="p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-accent-500 hover:border-accent-500/50 transition-colors"
                  >
                    <IconTrash size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Kartica prometa: ista forma kao PDF (Duguje/Potražuje/Saldo) */}
      <section>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <IconArrowsExchange size={17} className="text-text-tertiary" />
            <h2 className={sectionTitleCls}>
              {activeLedger === "kupac"
                ? "Kartica kupca"
                : "Kartica dobavljača"}
            </h2>
          </div>
          {jeKupac && jeDobavljac && (
            <div className="flex gap-1 rounded-lg border border-cream-300 p-0.5 bg-cream-100">
              {(["dobavljac", "kupac"] as KarticaType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLedgerType(t)}
                  className={[
                    "px-3 py-1 rounded-md text-[12px] font-medium transition-colors",
                    activeLedger === t
                      ? "bg-brand-600 text-white"
                      : "text-text-tertiary hover:text-text-primary",
                  ].join(" ")}
                >
                  {t === "dobavljac" ? "Dobavljač" : "Kupac"}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl bg-cream-100 border border-cream-300 overflow-x-auto">
          {ledgerRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-text-tertiary">
              Još nema prometa za ovu karticu.
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-cream-200/60 text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
                  <th className="text-right font-medium px-3 py-2 w-[44px]">Rb</th>
                  <th className="text-left font-medium px-3 py-2 w-[100px]">Datum</th>
                  <th className="text-left font-medium px-3 py-2 w-[100px]">Dospijeće</th>
                  <th className="text-left font-medium px-3 py-2">Opis knjiženja</th>
                  <th className="text-right font-medium px-3 py-2 w-[110px]">Duguje</th>
                  <th className="text-right font-medium px-3 py-2 w-[110px]">Potražuje</th>
                  <th className="text-right font-medium px-3 py-2 w-[120px]">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let saldo = 0;
                  return ledgerRows.map((r, i) => {
                    saldo += r.duguje - r.potrazuje;
                    return (
                      <tr
                        key={`${r.date}-${i}`}
                        onClick={
                          r.href ? () => router.push(r.href as string) : undefined
                        }
                        title={
                          r.istekao
                            ? `Rok plaćanja je prošao${r.href ? " · klik otvara izvor" : ""}`
                            : r.href
                              ? "Otvori izvor knjiženja"
                              : undefined
                        }
                        className={[
                          "border-t border-cream-300/60",
                          r.istekao ? "bg-danger/5" : "",
                          r.href
                            ? r.istekao
                              ? "cursor-pointer hover:bg-danger/10 transition-colors"
                              : "cursor-pointer hover:bg-cream-50/70 transition-colors"
                            : "",
                        ].join(" ")}
                      >
                        <td className="text-right px-3 py-2 text-text-tertiary tabular-nums">
                          {i + 1}.
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap tabular-nums text-text-tertiary">
                          {r.dospijece ? formatDate(r.dospijece) : "–"}
                        </td>
                        <td className="px-3 py-2">{r.label}</td>
                        <td className="text-right px-3 py-2 tabular-nums">
                          {r.duguje ? formatBAM(r.duguje) : ""}
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums">
                          {r.potrazuje ? formatBAM(r.potrazuje) : ""}
                        </td>
                        <td
                          className={[
                            "text-right px-3 py-2 tabular-nums font-medium",
                            saldo < 0 ? "text-accent-500" : "text-text-primary",
                          ].join(" ")}
                        >
                          {formatBAM(saldo)}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-cream-300 font-semibold">
                  <td className="px-3 py-2" colSpan={4}>
                    <span className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary">
                      Ukupno
                    </span>
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">
                    {formatBAM(ledgerTotals.duguje)}
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">
                    {formatBAM(ledgerTotals.potrazuje)}
                  </td>
                  <td
                    className={[
                      "text-right px-3 py-2 tabular-nums",
                      ledgerTotals.saldo < 0
                        ? "text-accent-500"
                        : "text-text-primary",
                    ].join(" ")}
                  >
                    {formatBAM(ledgerTotals.saldo)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <p className="text-[11.5px] text-text-tertiary mt-2">
          {activeLedger === "dobavljac"
            ? "Računi dobavljača potražuju, naša plaćanja duguju; negativan saldo = naš dug."
            : "Naše fakture duguju, uplate kupca potražuju; pozitivan saldo = njihov dug."}
        </p>
      </section>

      <UlazniRacunModal
        orgId={orgId}
        open={racunModalOpen}
        onClose={() => setRacunModalOpen(false)}
        fixedPartner={p ? { id: p.id, name: p.name, code: p.code } : null}
        isPdvObveznik={Boolean(fullOrg?.isPdvObveznik)}
        orgJurisdiction={fullOrg?.jurisdiction ?? null}
      />

      {/* Kompenzacija sa ovim partnerom (dug na obje strane) */}
      {kompOpen && orgId != null && (
        <KompenzacijaModal
          key={`komp-${orgId}-${partnerId}`}
          orgId={orgId}
          orgName={fullOrg?.name ?? activeOrg?.name ?? ""}
          initialPartnerId={partnerId ?? undefined}
          onClose={() => setKompOpen(false)}
        />
      )}

      {/* Uređivanje podataka partnera direktno sa kartice */}
      <PartnerFormModal
        orgId={orgId}
        initial={editInitial}
        onClose={() => setEditInitial(null)}
      />

      {/* potvrda brisanja ulaznog računa (PK modal umjesto window.confirm) */}
      <ConfirmModal
        open={racunZaBrisanje != null}
        onClose={() => setRacunZaBrisanje(null)}
        title="Obriši ulazni račun"
        message={
          racunZaBrisanje && (
            <>
              Obrisati ulazni račun{" "}
              <strong className="text-text-primary">
                {racunZaBrisanje.brojRacuna}
              </strong>{" "}
              ({formatBAM(Number(racunZaBrisanje.iznos))})? Ovo se ne može
              poništiti.
            </>
          )
        }
        confirmLabel="Da, obriši račun"
        busy={deleteRacun.isPending}
        onConfirm={() => {
          if (!racunZaBrisanje) return;
          deleteRacun.mutate(racunZaBrisanje.id, {
            onSuccess: () => setRacunZaBrisanje(null),
          });
        }}
      />

      {/* Unos/izmjena početnog stanja partnera */}
      <Modal
        open={psOpen}
        onClose={() => setPsOpen(false)}
        title="Početno stanje partnera"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPsOpen(false)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] font-medium text-text-secondary hover:bg-cream-200 transition-colors"
            >
              Otkaži
            </button>
            <button
              type="button"
              onClick={() => void sacuvajPocetnoStanje()}
              disabled={psBusy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {psBusy ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : null}
              Sačuvaj
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary mb-4">
          Stanje duga na dan prije nego što ste obrt počeli voditi u programu
          (najčešće 31.12. prethodne godine). Ulazi u karticu kao donos i u
          otvorene dugove, a uplate ga zatvaraju prije novijih dokumenata.
          Upišite 0 u oba polja da uklonite početno stanje.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1">
              Stanje na dan
            </label>
            <PkDateInput
              value={psDatum}
              onChange={setPsDatum}
              ariaLabel="Datum početnog stanja"
              inputClassName="bg-cream-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1">
                Partner duguje nama (KM)
              </label>
              <PkAmountInput
                value={psKupac}
                onChange={setPsKupac}
                ariaLabel="Dug kupca"
                title="Otvorena potraživanja od partnera kao kupca na taj dan"
                className="bg-cream-50"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1">
                Mi dugujemo partneru (KM)
              </label>
              <PkAmountInput
                value={psDob}
                onChange={setPsDob}
                ariaLabel="Dug prema dobavljaču"
                title="Otvorene obaveze prema partneru kao dobavljaču na taj dan"
                className="bg-cream-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-text-secondary mb-1">
              Napomena (opciono)
            </label>
            <input
              type="text"
              value={psNapomena}
              onChange={(e) => setPsNapomena(e.target.value)}
              placeholder="npr. preneseno iz starog programa"
              className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13.5px] text-text-primary outline-none focus:border-brand-600 transition-colors"
            />
          </div>
          {psError && <p className="text-[12.5px] text-danger">{psError}</p>}
        </div>
      </Modal>
    </div>
  );
}
