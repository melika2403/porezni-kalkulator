"use client";

// PDV evidencije: KUF (knjiga ulaznih faktura) i KIF (knjiga izlaznih
// faktura) po mjesecima. Knjige se DERIVIRAJU: KUF iz proknjiženih ulaznih
// računa (Partneri/Fakture), KIF iz izlaznih faktura; nema duplog unosa.
// Kasnije faze: PDV prijava (auto-popuna iz KUF/KIF), e-KUF/e-KIF CSV
// export za UINO portal, D-PDV.
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconDownload,
  IconInbox,
  IconLoader2,
  IconPencil,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBAM, formatDate, todayIso } from "src/lib/format";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { useOrgInvoices } from "src/hooks/useBankStatements";
import { useDeleteUlazniRacun, useUlazniRacuni } from "src/hooks/usePartners";
import {
  TIPOVI_DOKUMENTA_KUF,
  VRSTE_DOKUMENTA,
  type UlazniRacun,
} from "src/api/partners";
import {
  KIF_VRSTE_DOKUMENTA,
  TIPOVI_DOKUMENTA_KIF,
  deleteInvoice,
  type Invoice,
} from "src/api/invoices";
import { Modal } from "src/components/app-shell/Modal";
import { KifKnjizenjeModal } from "src/sections/pdv/KifKnjizenjeModal";
import { PazarModal } from "src/sections/pdv/PazarModal";
import { KifPdvModal } from "src/sections/pdv/KifPdvModal";
import { InvoicePreviewModal } from "src/sections/fakture/InvoicePreviewModal";
import { UlazniRacunModal } from "src/sections/partneri/UlazniRacunModal";
import { downloadKifPdf, downloadKufPdf } from "src/sections/pdv/knjigaPdf";
import {
  buildEkifCsv,
  buildEkufCsv,
  downloadCsv,
} from "src/sections/pdv/ekufEkif";
import { computePdvPrijava, kifSign } from "src/sections/pdv/pdvObracun";
import { PrijavaPregled } from "src/sections/pdv/PrijavaPregled";
import { DPdvForm } from "src/sections/pdv/DPdvForm";
import {
  StanjePdvTab,
  usePdvStanje,
} from "src/sections/pdv/StanjePdvTab";
import { createPdvKnjizenje } from "src/api/pdv";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";

const MJESECI = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

// genitiv za "do ..." u izboru raspona
const MJESECI_DO = [
  "januara", "februara", "marta", "aprila", "maja", "juna",
  "jula", "augusta", "septembra", "oktobra", "novembra", "decembra",
];

const VRSTA_NABAVKE_LABEL: Record<string, string> = {
  DOMACA: "domaća",
  UVOZ: "uvoz",
  OD_NEOBVEZNIKA: "poljoprivrednik",
};

const VRSTA_ISPORUKE_LABEL: Record<string, string> = {
  OPOREZIVA: "oporeziva",
  IZVOZ: "izvoz",
  OSLOBODJENA: "oslobođena",
};

type TabId = "kuf" | "kif" | "prijava" | "dpdv" | "stanje" | "godina";

// Rok predaje prijave i e-evidencija za mjesec M: 10. u NAREDNOM mjesecu;
// ako 10. pada u subotu ili nedjelju, rok se pomjera na prvi radni dan.
function rokPredaje(year: number, month: number): string {
  const d = new Date(year, month, 10); // month je 1-based → 10. narednog mjeseca
  if (d.getDay() === 6) d.setDate(d.getDate() + 2); // subota → ponedjeljak
  else if (d.getDay() === 0) d.setDate(d.getDate() + 1); // nedjelja → ponedjeljak
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;

export default function PdvEvidencijePage() {
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const now = new Date();
  const [tab, setTab] = useState<TabId>("kuf");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  // pregled raspona (samo KUF/KIF tabele i PDF izvještaj): 0 = jedan mjesec.
  // PDV prijava, D-PDV i e-KUF/e-KIF UVIJEK idu po jednom mjesecu.
  const [monthTo, setMonthTo] = useState(0);
  const rangeTo = monthTo > month ? monthTo : null;
  // faktura kojoj se uređuje knjiženje u KIF (null = modal zatvoren)
  const [kifEdit, setKifEdit] = useState<Invoice | null>(null);
  // pregled izlazne fakture / izmjena knjiženja ulaznog računa
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [kufEdit, setKufEdit] = useState<UlazniRacun | null>(null);
  const [exportingKnjiga, setExportingKnjiga] = useState(false);
  const [pazarOpen, setPazarOpen] = useState(false);
  // direktno "samo PDV" knjiženje u KIF (posebna šema u građevinarstvu...)
  const [kifPdvOpen, setKifPdvOpen] = useState(false);
  // brisanje stavki iz knjiga (uz potvrdu)
  const [brisiKuf, setBrisiKuf] = useState<UlazniRacun | null>(null);
  const [brisiKif, setBrisiKif] = useState<Invoice | null>(null);
  const deleteRacun = useDeleteUlazniRacun(orgId);
  const qc = useQueryClient();
  const deleteKif = useMutation({
    mutationFn: (inv: Invoice) => unwrap(deleteInvoice(inv.id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setBrisiKif(null);
    },
  });
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const periodTo = rangeTo
    ? `${year}-${String(rangeTo).padStart(2, "0")}`
    : period;

  const { data: fullOrg, isLoading: orgLoading } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const { data: racuni, isLoading: racuniLoading } = useUlazniRacuni(orgId);
  const { data: invoices, isLoading: invoicesLoading } = useOrgInvoices(
    orgId,
    {},
  );

  // KUF ide po periodu PRIJEMA fakture (odbitak pripada mjesecu prijema);
  // pregled može obuhvatiti raspon mjeseci (period..periodTo, uključivo)
  const kufRows = useMemo(
    () =>
      (racuni ?? [])
        .filter((r) => {
          const p = (r.datumPrijema ?? r.datumRacuna ?? "").slice(0, 7);
          return p >= period && p <= periodTo;
        })
        .sort((a, b) => {
          const da = a.datumPrijema ?? a.datumRacuna;
          const db = b.datumPrijema ?? b.datumRacuna;
          return da.localeCompare(db) || a.id - b.id;
        }),
    [racuni, period, periodTo],
  );

  // KIF: izdane/naplaćene fakture u periodu (nacrti i stornirane ne ulaze)
  const kifRows = useMemo(
    () =>
      (invoices ?? [])
        .filter((i) => {
          const p = (i.issueDate ?? "").slice(0, 7);
          return (
            (i.status === "ISSUED" || i.status === "PAID") &&
            p >= period &&
            p <= periodTo
          );
        })
        .sort(
          (a, b) => a.issueDate.localeCompare(b.issueDate) || a.id - b.id,
        ),
    [invoices, period, periodTo],
  );

  // prijava i e-KUF/e-KIF su UVIJEK mjesečni, bez obzira na raspon pregleda
  const kufMonthRows = useMemo(
    () =>
      rangeTo
        ? kufRows.filter((r) =>
            (r.datumPrijema ?? r.datumRacuna ?? "").startsWith(period),
          )
        : kufRows,
    [kufRows, period, rangeTo],
  );
  const kifMonthRows = useMemo(
    () =>
      rangeTo
        ? kifRows.filter((i) => (i.issueDate ?? "").startsWith(period))
        : kifRows,
    [kifRows, period, rangeTo],
  );

  // Filteri izvještaja (kao u starim programima: po tipu dokumenta, vrsti
  // fakture i vrsti dokumenta). Važe za tabelu i PDF izvještaj; PDV prijava
  // i e-KUF/e-KIF UVIJEK idu iz kompletne knjige.
  const [fTip, setFTip] = useState("SVI");
  const [fVrsta, setFVrsta] = useState("SVE");
  const [fDok, setFDok] = useState("SVE");
  // pretraga: broj fakture, dobavljač/kupac ili iznos
  const [q, setQ] = useState("");
  const filterActive =
    fTip !== "SVI" || fVrsta !== "SVE" || fDok !== "SVE" || q.trim() !== "";
  function resetFilters() {
    setFTip("SVI");
    setFVrsta("SVE");
    setFDok("SVE");
    setQ("");
  }

  const kufView = useMemo(() => {
    const nq = q.trim().toLowerCase();
    const nqNum = nq.replace(",", ".");
    return kufRows.filter(
      (r) =>
        (fTip === "SVI" || (r.tipDokumenta ?? "01") === fTip) &&
        (fVrsta === "SVE" || (r.vrstaNabavke ?? "DOMACA") === fVrsta) &&
        (fDok === "SVE" || (r.vrstaDokumenta ?? "REDOVNA") === fDok) &&
        (!nq ||
          r.brojRacuna.toLowerCase().includes(nq) ||
          (r.partner?.name ?? "").toLowerCase().includes(nq) ||
          (Number(r.iznos) || 0).toFixed(2).includes(nqNum)),
    );
  }, [kufRows, fTip, fVrsta, fDok, q]);
  const kifView = useMemo(() => {
    const nq = q.trim().toLowerCase();
    const nqNum = nq.replace(",", ".");
    return kifRows.filter((i) => {
      const tip =
        i.kifTipDokumenta ??
        (i.docType === "AVANSNA" || i.docType === "STORNO_AVANSNE"
          ? "03"
          : i.vrstaIsporuke === "IZVOZ"
            ? "04"
            : "01");
      const dok =
        i.kifVrstaDokumenta ??
        (i.docType === "AVANSNA"
          ? "AVANSNA"
          : i.docType === "STORNO_AVANSNE"
            ? "STORNO_AVANSNE"
            : i.docType === "KNJIZNA_OBAVIJEST"
              ? "KNJIZNA_OBAVIJEST"
              : "REDOVNA");
      return (
        (fTip === "SVI" || tip === fTip) &&
        (fVrsta === "SVE" || (i.vrstaIsporuke ?? "OPOREZIVA") === fVrsta) &&
        (fDok === "SVE" || dok === fDok) &&
        (!nq ||
          (i.fullNumber ?? "").toLowerCase().includes(nq) ||
          (i.buyerName ?? "").toLowerCase().includes(nq) ||
          (Number(i.grossTotal) || 0).toFixed(2).includes(nqNum))
      );
    });
  }, [kifRows, fTip, fVrsta, fDok, q]);

  // totali tabele prate filter (izvještaj); sažetak za prijavu ide iz prijave
  const kufTotals = useMemo(() => {
    let ukupno = 0;
    let osnovica = 0;
    let pdv = 0;
    let pdvNeodbitni = 0;
    for (const r of kufView) {
      const rUkupno = Number(r.iznos) || 0;
      const rPdv = Number(r.pdvIznos) || 0;
      ukupno += rUkupno;
      // samo-PDV knjiženja (uvozni PDV po JCI) imaju ukupno 0: osnovica 0
      osnovica += Math.max(rUkupno - rPdv, 0);
      pdv += rPdv;
      // iznos je mjerodavan; boolean pokriva knjiženja prije migracije
      pdvNeodbitni += Number(r.pdvNeodbitniIznos) || (r.pdvNeodbitan ? rPdv : 0);
    }
    return {
      ukupno,
      osnovica,
      pdv,
      pdvOdbitni: pdv - pdvNeodbitni,
      pdvNeodbitni,
    };
  }, [kufView]);

  const kifTotals = useMemo(() => {
    let ukupno = 0;
    let osnovica = 0;
    let pdv = 0;
    for (const i of kifView) {
      // storno avansne i knjižne obavijesti umanjuju knjigu
      const sign = kifSign(i);
      ukupno += sign * (Number(i.grossTotal) || 0);
      osnovica += sign * (Number(i.netTotal) || 0);
      pdv += sign * (Number(i.vatTotal) || 0);
    }
    return { ukupno, osnovica, pdv };
  }, [kifView]);

  const loading = racuniLoading || invoicesLoading;

  // e-KUF/e-KIF: redni brojevi stavki teku kroz cijelu godinu, pa prva
  // stavka perioda dobija broj = (broj stavki u ranijim mjesecima) + 1
  const kufStartBroj = useMemo(() => {
    let n = 0;
    for (const r of racuni ?? []) {
      const d = (r.datumPrijema ?? r.datumRacuna ?? "").slice(0, 7);
      if (d.startsWith(`${year}-`) && d < period) n++;
    }
    return n + 1;
  }, [racuni, year, period]);
  const kifStartBroj = useMemo(() => {
    let n = 0;
    for (const i of invoices ?? []) {
      if (i.status !== "ISSUED" && i.status !== "PAID") continue;
      const d = (i.issueDate ?? "").slice(0, 7);
      if (d.startsWith(`${year}-`) && d < period) n++;
    }
    return n + 1;
  }, [invoices, year, period]);

  // greške koje blokiraju e-export (JIB/PDV brojevi, JCI...)
  const [eErrors, setEErrors] = useState<string[] | null>(null);
  function exportEknjiga() {
    if (!fullOrg) return;
    const org = {
      pdvBroj: fullOrg.pdvNumber ?? "",
      jurisdiction: fullOrg.jurisdiction,
    };
    // e-evidencije se predaju mjesečno: uvijek samo izabrani mjesec
    const res =
      tab === "kuf"
        ? buildEkufCsv({ rows: kufMonthRows, org, month, year, startBroj: kufStartBroj })
        : buildEkifCsv({ rows: kifMonthRows, org, month, year, startBroj: kifStartBroj });
    if (res.errors.length > 0) {
      setEErrors(res.errors);
      return;
    }
    setEErrors(null);
    downloadCsv(res.csv, res.filename);
  }

  // PDV prijava: automatska popuna iz KUF/KIF za izabrani period
  const prijava = useMemo(
    () =>
      fullOrg
        ? computePdvPrijava(
            kifMonthRows,
            kufMonthRows,
            {
              naziv: fullOrg.name,
              adresa: fullOrg.address ?? "",
              mjesto: fullOrg.city ?? "",
              pdvBroj: fullOrg.pdvNumber ?? "",
              jurisdiction: fullOrg.jurisdiction,
            },
            month,
            year,
          )
        : null,
    [fullOrg, kifMonthRows, kufMonthRows, month, year],
  );
  // kontrole knjiga za prijavu: stavke koje bi promakle (nacrti ne ulaze u
  // KIF, zaboravljen PDV split kod obveznika, izvoz bez JCI). Zamjena za
  // "konta vs KUF/KIF" provjeru iz klasičnih programa (kod nas je izvor isti).
  const kontrole = useMemo(() => {
    const drafts = (invoices ?? []).filter(
      (i) => i.status === "DRAFT" && (i.issueDate ?? "").startsWith(period),
    ).length;
    const bezPdvSplita = kufMonthRows.filter(
      (r) =>
        (r.partner?.pdvBroj ?? "").trim() !== "" &&
        (r.pdvIznos == null || Number(r.pdvIznos) === 0) &&
        r.vrstaNabavke !== "OD_NEOBVEZNIKA",
    ).length;
    const izvozBezJci = kifMonthRows.filter((i) => {
      const tip =
        i.kifTipDokumenta ??
        (i.docType === "AVANSNA" || i.docType === "STORNO_AVANSNE"
          ? "03"
          : i.vrstaIsporuke === "IZVOZ"
            ? "04"
            : "01");
      return tip === "04" && !i.kifJciBroj;
    }).length;
    return { drafts, bezPdvSplita, izvozBezJci };
  }, [invoices, period, kufMonthRows, kifMonthRows]);

  const [povrat, setPovrat] = useState(false);
  const [exporting, setExporting] = useState(false);

  // stanje PDV-a (za baner na vrhu i knjiženje obaveze iz prijave)
  const { data: stanje } = usePdvStanje(orgId);
  // knjiženje po prijavi za izabrani period (ako postoji, ne nudi se ponovo)
  const periodKnjizen = useMemo(
    () =>
      (stanje?.knjizenja ?? []).find(
        (k) =>
          k.period === period &&
          (k.vrsta === "OBAVEZA" || k.vrsta === "PRETPLATA"),
      ) ?? null,
    [stanje, period],
  );
  const [knjizenjeError, setKnjizenjeError] = useState<string | null>(null);
  const knjiziPrijavu = useMutation({
    mutationFn: () => {
      const p71 = prijava?.p71 ?? 0;
      return unwrap(
        createPdvKnjizenje(orgId as number, {
          datum: new Date().toISOString().slice(0, 10),
          vrsta: p71 >= 0 ? "OBAVEZA" : "PRETPLATA",
          iznos: Math.abs(p71),
          period,
          opis: `PDV prijava ${String(month).padStart(2, "0")}/${year}`,
        }),
      );
    },
    onSuccess: () => {
      setKnjizenjeError(null);
      qc.invalidateQueries({ queryKey: ["pdv-stanje", orgId] });
    },
    onError: (e) => {
      setKnjizenjeError(
        e instanceof Error && e.message === "PERIOD_PROKNJIZEN"
          ? "Ovaj period je već proknjižen u stanje PDV-a."
          : "Greška pri knjiženju, pokušajte ponovo.",
      );
    },
  });
  async function exportPrijava() {
    if (!prijava || exporting) return;
    setExporting(true);
    try {
      // pdf-lib se učitava tek na klik (ne ulazi u bundle stranice)
      const { downloadPdvPrijava } = await import(
        "src/sections/pdv/pdvPrijava"
      );
      await downloadPdvPrijava(prijava, {
        povrat: povrat && prijava.p71 < 0,
      });
    } finally {
      setExporting(false);
    }
  }

  // rok predaje za izabrani mjesec (10. narednog, vikend pomjera na radni dan)
  const rok = rokPredaje(year, month);
  const danasIso = todayIso();
  const rokProsao = danasIso > rok && !periodKnjizen;

  // kontrola: prethodni mjesec ima stavke u knjigama, a prijava mu nije
  // proknjižena u Stanje PDV-a (zaboravljena prijava)
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  const prosliNeproknjizen = useMemo(() => {
    const imaKnjiga =
      (racuni ?? []).some((r) =>
        (r.datumPrijema ?? r.datumRacuna ?? "").startsWith(prevPeriod),
      ) ||
      (invoices ?? []).some(
        (i) =>
          (i.status === "ISSUED" || i.status === "PAID") &&
          (i.issueDate ?? "").startsWith(prevPeriod),
      );
    if (!imaKnjiga) return false;
    return !(stanje?.knjizenja ?? []).some(
      (k) =>
        k.period === prevPeriod &&
        (k.vrsta === "OBAVEZA" || k.vrsta === "PRETPLATA"),
    );
  }, [racuni, invoices, stanje, prevPeriod]);

  // godišnja rekapitulacija: prijava za svaki mjesec izabrane godine
  const godina = useMemo(() => {
    if (!fullOrg) return null;
    const orgInfo = {
      naziv: fullOrg.name,
      adresa: fullOrg.address ?? "",
      mjesto: fullOrg.city ?? "",
      pdvBroj: fullOrg.pdvNumber ?? "",
      jurisdiction: fullOrg.jurisdiction,
    };
    return Array.from({ length: 12 }, (_, idx) => {
      const m = idx + 1;
      const p = `${year}-${String(m).padStart(2, "0")}`;
      const kufM = (racuni ?? []).filter((r) =>
        (r.datumPrijema ?? r.datumRacuna ?? "").startsWith(p),
      );
      const kifM = (invoices ?? []).filter(
        (i) =>
          (i.status === "ISSUED" || i.status === "PAID") &&
          (i.issueDate ?? "").startsWith(p),
      );
      const pr = computePdvPrijava(kifM, kufM, orgInfo, m, year);
      const knjizen =
        (stanje?.knjizenja ?? []).find(
          (k) =>
            k.period === p && (k.vrsta === "OBAVEZA" || k.vrsta === "PRETPLATA"),
        ) ?? null;
      return {
        m,
        stavki: kufM.length + kifM.length,
        izlazni: pr.p51,
        ulazni: pr.p61,
        p71: pr.p71,
        rok: rokPredaje(year, m),
        knjizen,
      };
    });
  }, [fullOrg, racuni, invoices, stanje, year]);

  // D-PDV predpopuna: stavke koje se daju izvesti iz KUF/KIF za mjesec
  const dpdvPrijedlog = useMemo(() => {
    const p: Record<string, number> = {};
    const add = (k: string, v: number) => {
      if (v > 0.004) p[k] = Math.round(v * 100) / 100 + (p[k] ?? 0);
    };
    for (const i of kifMonthRows) {
      const dok =
        i.kifVrstaDokumenta ??
        (i.docType === "KNJIZNA_OBAVIJEST" ? "KNJIZNA_OBAVIJEST" : "REDOVNA");
      if (dok === "KNJIZNA_OBAVIJEST") {
        add("iz9_bez", Number(i.netTotal) || 0);
        add("iz9_pdv", Number(i.vatTotal) || 0);
      }
    }
    for (const r of kufMonthRows) {
      const pdv = Number(r.pdvIznos) || 0;
      const osnovica = Math.max((Number(r.iznos) || 0) - pdv, 0);
      if ((r.vrstaDokumenta ?? "REDOVNA") === "KNJIZNA_OBAVIJEST") {
        add("ul8_bez", osnovica);
        add("ul8_pdv", pdv);
      }
      if ((r.tipDokumenta ?? "01") === "05") {
        add("ul6_bez", osnovica);
        add("ul6_pdv", pdv);
      }
      if ((r.tipDokumenta ?? "01") === "08") {
        add("ul7_pdv", pdv);
      }
    }
    return p;
  }, [kifMonthRows, kufMonthRows]);

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="relative flex flex-wrap items-end justify-between gap-3 mb-6">
        <HelpButton slug="pdv" className="absolute top-0 right-0" />
        <div>
          <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
            <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
            Knjige i evidencije
          </div>
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
            PDV evidencije.
          </h1>
          <p className="text-[13px] leading-6 text-text-tertiary max-w-[560px]">
            KUF i KIF se pune automatski: KUF iz proknjiženih ulaznih računa,
            KIF iz izdanih faktura. PDV prijava se obračunava iz knjiga za
            izabrani mjesec, a e-KUF/e-KIF se preuzimaju kao CSV za UINO
            e-portal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PkSelect
            ariaLabel="Mjesec"
            value={month}
            onChange={(v) => {
              const m = Number(v);
              setMonth(m);
              // raspon važi samo unaprijed; inače nazad na jedan mjesec
              setMonthTo((prev) => (prev > m ? prev : 0));
              setEErrors(null);
            }}
            options={MJESECI.map((m, i) => ({ value: i + 1, label: m }))}
          />
          <PkSelect
            ariaLabel="Godina"
            value={year}
            onChange={(v) => {
              setYear(Number(v));
              setEErrors(null);
            }}
            options={years.map((y) => ({ value: y, label: `${y}.` }))}
          />
        </div>
      </div>

      {/* Gate: PDV evidencije imaju smisla samo za PDV obveznike */}
      {!orgLoading && fullOrg && !fullOrg.isPdvObveznik && (
        <div className="rounded-xl bg-info-bg border border-info/20 px-5 py-4 mb-5 text-[13px] leading-6 text-text-secondary">
          <span className="font-medium text-text-primary">
            Ova organizacija nije u sistemu PDV-a.
          </span>{" "}
          KUF i KIF su obavezni samo za PDV obveznike. Ako ste ušli u sistem
          PDV-a, uključite opciju u{" "}
          <Link
            href="/app/postavke"
            className="font-medium text-brand-700 hover:text-brand-600"
          >
            postavkama obrta
          </Link>
          .
        </div>
      )}

      {/* Stanje PDV-a: uvijek vidljivo na vrhu dok postoje knjiženja
          (crveno = dug prema UINO, zeleno = izmireno ili pretplata) */}
      {fullOrg?.isPdvObveznik &&
        stanje &&
        (stanje.knjizenja.length > 0 || stanje.prijedlozi.length > 0) && (
          <div
            className={[
              "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 mb-4 text-[13px]",
              stanje.saldo > 0
                ? "bg-accent-500/10 border-accent-500/30"
                : "bg-success-bg border-success/25",
            ].join(" ")}
          >
            <span className="text-text-primary">
              Stanje PDV-a:{" "}
              <span
                className={`font-semibold ${stanje.saldo > 0 ? "text-accent-500" : "text-success"}`}
              >
                {stanje.saldo === 0
                  ? "izmireno (0,00 KM)"
                  : stanje.saldo > 0
                    ? `dug ${formatBAM(stanje.saldo)}`
                    : `pretplata ${formatBAM(-stanje.saldo)}`}
              </span>
              {stanje.prijedlozi.length > 0 && (
                <span className="text-text-secondary">
                  {" "}
                  ·{" "}
                  {stanje.prijedlozi.length === 1
                    ? "1 stavka sa izvoda čeka knjiženje"
                    : `${stanje.prijedlozi.length} ${stanje.prijedlozi.length < 5 ? "stavke" : "stavki"} sa izvoda čeka knjiženje`}
                </span>
              )}
            </span>
            {/* na tabu Stanje dugme je invisible (ne uklanja se), da baner
                zadrži istu visinu i tabovi ne poskoče gore-dole */}
            <button
              type="button"
              onClick={() => setTab("stanje")}
              className={[
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-brand-600 bg-cream-100/60 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors",
                tab === "stanje" ? "invisible" : "",
              ].join(" ")}
            >
              Otvori stanje
              <IconArrowRight size={14} />
            </button>
          </div>
        )}

      {/* Rok predaje za izabrani mjesec (10. narednog; vikend → radni dan) */}
      {fullOrg?.isPdvObveznik && (
        <div
          className={[
            "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2.5 mb-4 text-[13px]",
            rokProsao
              ? "bg-warning-bg border-warning/30"
              : "bg-cream-100 border-cream-300",
          ].join(" ")}
        >
          <span className="text-text-secondary">
            Rok za prijavu i uplatu PDV-a za{" "}
            {MJESECI[month - 1].toLowerCase()} {year}.:{" "}
            <span className="font-semibold text-text-primary">
              {formatDate(rok)}
            </span>
          </span>
          {periodKnjizen ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-success-bg text-success">
              prijava proknjižena
            </span>
          ) : rokProsao ? (
            <span className="text-[12.5px] font-medium text-warning">
              Rok je prošao, a prijava za ovaj period nije proknjižena u
              Stanje PDV-a.
            </span>
          ) : null}
        </div>
      )}

      {/* Tabovi (segmented pilula kao na ostatku PK Office-a) */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100 flex-wrap">
          {(
            [
              { id: "kuf" as TabId, label: "KUF · ulazne", count: kufRows.length },
              { id: "kif" as TabId, label: "KIF · izlazne", count: kifRows.length },
              { id: "prijava" as TabId, label: "PDV prijava", count: null },
              { id: "dpdv" as TabId, label: "D-PDV", count: null },
              { id: "stanje" as TabId, label: "Stanje PDV-a", count: null },
              { id: "godina" as TabId, label: "Godina", count: null },
            ] as { id: TabId; label: string; count: number | null }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setEErrors(null);
                resetFilters();
              }}
              className={[
                "inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors whitespace-nowrap",
                tab === t.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
              ].join(" ")}
            >
              {t.label}
              {t.count != null && (
                <span
                  className={[
                    "inline-flex items-center justify-center min-w-[20px] px-1.5 py-px rounded-full text-[11px] tabular-nums",
                    tab === t.id
                      ? "bg-white/20 text-white"
                      : "bg-cream-200 text-text-tertiary",
                  ].join(" ")}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="text-[12.5px] text-text-tertiary">
          period {String(month).padStart(2, "0")}
          {rangeTo && (tab === "kuf" || tab === "kif")
            ? `-${String(rangeTo).padStart(2, "0")}`
            : ""}
          /{year}.
        </span>
      </div>

      {/* Greške koje blokiraju e-KUF/e-KIF export */}
      {(tab === "kuf" || tab === "kif") && eErrors && eErrors.length > 0 && (
        <div className="rounded-xl bg-warning-bg border border-warning/30 px-5 py-4 mb-4 text-[13px] leading-6 text-text-secondary">
          <p className="font-medium text-text-primary mb-1">
            Fajl nije generisan, prvo ispravite sljedeće:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {eErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Kontrole knjiga: da u prijavu ne promakne nešto neproknjiženo */}
      {tab === "prijava" && prijava && (
        <div
          className={[
            "rounded-xl border px-5 py-4 mb-4 text-[13px] leading-6",
            kontrole.drafts +
              kontrole.bezPdvSplita +
              kontrole.izvozBezJci +
              (prosliNeproknjizen ? 1 : 0) >
            0
              ? "bg-warning-bg border-warning/30 text-text-secondary"
              : "bg-cream-100 border-cream-300 text-text-tertiary",
          ].join(" ")}
        >
          <span className="font-medium text-text-primary mr-3">
            Kontrola knjiga:
          </span>
          izlazni PDV iz KIF-a{" "}
          <span className="font-semibold text-text-primary tabular-nums">
            {formatBAM(prijava.p51)}
          </span>{" "}
          (polje 51) · odbitni ulazni iz KUF-a{" "}
          <span className="font-semibold text-text-primary tabular-nums">
            {formatBAM(prijava.p61)}
          </span>{" "}
          (polje 61)
          {kontrole.drafts +
            kontrole.bezPdvSplita +
            kontrole.izvozBezJci +
            (prosliNeproknjizen ? 1 : 0) >
          0 ? (
            <ul className="list-disc pl-5 mt-1">
              {kontrole.drafts > 0 && (
                <li>
                  {kontrole.drafts}{" "}
                  {kontrole.drafts === 1
                    ? "faktura je u nacrtu"
                    : "fakture su u nacrtu"}{" "}
                  za ovaj period i NE ulazi u KIF ni prijavu.
                </li>
              )}
              {kontrole.bezPdvSplita > 0 && (
                <li>
                  {kontrole.bezPdvSplita}{" "}
                  {kontrole.bezPdvSplita === 1
                    ? "ulazni račun dobavljača PDV obveznika nema"
                    : "ulazna računa dobavljača PDV obveznika nemaju"}{" "}
                  unesen PDV iznos (možda zaboravljen PDV split, gubi se
                  odbitak).
                </li>
              )}
              {kontrole.izvozBezJci > 0 && (
                <li>
                  {kontrole.izvozBezJci}{" "}
                  {kontrole.izvozBezJci === 1
                    ? "izvozna faktura nema"
                    : "izvozne fakture nemaju"}{" "}
                  broj JCI (e-KIF će tražiti; upisuje se kroz knjiženje u
                  KIF).
                </li>
              )}
              {prosliNeproknjizen && (
                <li>
                  Prethodni mjesec ({MJESECI[prevMonth - 1].toLowerCase()}{" "}
                  {prevYear}.) ima stavke u knjigama, a prijava mu NIJE
                  proknjižena u Stanje PDV-a (moguće zaboravljena prijava).
                </li>
              )}
            </ul>
          ) : (
            <span className="ml-1">· nema upozorenja za ovaj period.</span>
          )}
        </div>
      )}

      {/* Pregled PDV prijave (obračun iz KUF/KIF) */}
      {tab === "prijava" &&
        (prijava ? (
          <>
            {/* knjiženje obaveze/pretplate iz prijave u stanje PDV-a */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-100 border border-cream-300 px-4 py-2.5 mb-4 text-[13px]">
              <span className="text-text-secondary">
                {periodKnjizen ? (
                  <>
                    Period je proknjižen u stanje PDV-a:{" "}
                    <span className="font-medium text-text-primary">
                      {periodKnjizen.vrsta === "OBAVEZA"
                        ? "obaveza"
                        : "pretplata"}{" "}
                      {formatBAM(periodKnjizen.iznos)}
                    </span>
                    . Izmjena: obrišite knjiženje na tabu Stanje PDV-a pa
                    proknjižite ponovo.
                  </>
                ) : prijava.p71 === 0 ? (
                  "Polje 71 je 0,00: nema obaveze ni pretplate za knjiženje."
                ) : (
                  <>
                    Po ovoj prijavi:{" "}
                    <span
                      className={`font-medium ${prijava.p71 > 0 ? "text-accent-500" : "text-success"}`}
                    >
                      {prijava.p71 > 0
                        ? `za uplatu ${formatBAM(prijava.p71)}`
                        : `pretplata ${formatBAM(-prijava.p71)}`}
                    </span>
                    . Proknjižite u stanje PDV-a da se prati dok se ne izmiri.
                  </>
                )}
                {knjizenjeError && (
                  <span className="block text-accent-500">{knjizenjeError}</span>
                )}
              </span>
              {!periodKnjizen && prijava.p71 !== 0 && (
                <button
                  type="button"
                  disabled={knjiziPrijavu.isPending}
                  onClick={() => knjiziPrijavu.mutate()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
                >
                  {knjiziPrijavu.isPending && (
                    <IconLoader2 size={14} className="animate-spin" />
                  )}
                  Proknjiži u stanje PDV-a
                </button>
              )}
            </div>
            <PrijavaPregled
              prijava={prijava}
              povrat={povrat && prijava.p71 < 0}
              onPovratChange={setPovrat}
              onDownload={exportPrijava}
              exporting={exporting}
            />
          </>
        ) : (
          <div className="rounded-xl bg-cream-100 border border-cream-300 px-4 py-12 text-center text-text-tertiary text-[13px]">
            Učitavanje...
          </div>
        ))}

      {/* Godišnja rekapitulacija: prijava po mjesecima, klik otvara mjesec */}
      {tab === "godina" && (
        <div className="rounded-xl bg-cream-100 border border-cream-300 overflow-x-auto">
          {!godina || loading ? (
            <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
              Učitavanje...
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cream-300">
                  <th className={thCls}>Mjesec</th>
                  <th className={`${thCls} text-right`}>Stavki</th>
                  <th className={`${thCls} text-right`}>Izlazni PDV (51)</th>
                  <th className={`${thCls} text-right`}>Ulazni odbitni (61)</th>
                  <th className={`${thCls} text-right`}>Polje 71</th>
                  <th className={thCls}>Rok</th>
                  <th className={thCls}>Status</th>
                </tr>
              </thead>
              <tbody>
                {godina.map((g) => {
                  const kasni =
                    !g.knjizen && g.stavki > 0 && danasIso > g.rok;
                  return (
                    <tr
                      key={g.m}
                      onClick={() => {
                        setMonth(g.m);
                        setMonthTo(0);
                        setTab("prijava");
                      }}
                      title="Otvori PDV prijavu za ovaj mjesec"
                      className="cursor-pointer hover:bg-cream-50/80 transition-colors border-b border-cream-300/60 last:border-b-0"
                    >
                      <td className={`${tdCls} font-medium`}>
                        {MJESECI[g.m - 1]}
                      </td>
                      <td className={`${tdNum} text-text-tertiary`}>
                        {g.stavki > 0 ? g.stavki : "–"}
                      </td>
                      <td className={tdNum}>
                        {g.stavki > 0 ? formatBAM(g.izlazni) : "–"}
                      </td>
                      <td className={tdNum}>
                        {g.stavki > 0 ? formatBAM(g.ulazni) : "–"}
                      </td>
                      <td
                        className={`${tdNum} font-semibold ${
                          g.stavki === 0
                            ? "text-text-tertiary"
                            : g.p71 > 0
                              ? "text-accent-500"
                              : g.p71 < 0
                                ? "text-success"
                                : ""
                        }`}
                      >
                        {g.stavki > 0 ? formatBAM(g.p71) : "–"}
                      </td>
                      <td className={`${tdCls} text-text-tertiary`}>
                        {formatDate(g.rok)}
                      </td>
                      <td className={tdCls}>
                        {g.knjizen ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-success-bg text-success">
                            proknjiženo (
                            {g.knjizen.vrsta === "OBAVEZA"
                              ? "obaveza"
                              : "pretplata"}{" "}
                            {formatBAM(g.knjizen.iznos)})
                          </span>
                        ) : kasni ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning-bg text-warning">
                            nije proknjiženo
                          </span>
                        ) : g.stavki > 0 ? (
                          <span className="text-[11.5px] text-text-tertiary">
                            u toku
                          </span>
                        ) : (
                          <span className="text-text-tertiary/50">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-cream-300 bg-cream-50/60">
                  <td className={`${tdCls} font-semibold`}>
                    Ukupno {year}.
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {godina.reduce((s, g) => s + g.stavki, 0)}
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(godina.reduce((s, g) => s + g.izlazni, 0))}
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(godina.reduce((s, g) => s + g.ulazni, 0))}
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(godina.reduce((s, g) => s + g.p71, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Stanje PDV-a (knjiga knjiženja prema UINO) */}
      {tab === "stanje" && (
        <StanjePdvTab orgId={orgId} orgName={fullOrg?.name ?? ""} />
      )}

      {/* D-PDV: ručni unos dodatka uz prijavu */}
      {tab === "dpdv" && (
        <DPdvForm
          orgId={orgId}
          month={month}
          year={year}
          prijedlog={dpdvPrijedlog}
          defaultDjelatnost={fullOrg?.activityCode ?? ""}
          djelatnostNaziv={fullOrg?.activityName ?? ""}
          org={
            fullOrg
              ? {
                  naziv: fullOrg.name,
                  pdvBroj: fullOrg.pdvNumber ?? "",
                  adresa: fullOrg.address ?? "",
                  telefon: fullOrg.phone ?? "",
                  mjesto: fullOrg.city ?? "",
                  odgovornoLice: [me?.firstName, me?.lastName]
                    .filter(Boolean)
                    .join(" "),
                }
              : null
          }
        />
      )}

      {(tab === "kuf" || tab === "kif") && (
        <>
      {/* Toolbar: pretraga + filteri lijevo, akcije knjige desno.
          Filteri važe za tabelu i PDF; prijava i e-CSV idu iz cijele knjige. */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <IconSearch
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              tab === "kuf" ? "Broj, dobavljač, iznos..." : "Broj, kupac, iznos..."
            }
            className="w-[190px] rounded-lg border border-cream-300 bg-cream-100 pl-8 pr-7 py-1.5 text-[12.5px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
          />
          {q && (
            <button
              type="button"
              aria-label="Očisti pretragu"
              onClick={() => setQ("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-tertiary hover:text-text-primary"
            >
              <IconX size={13} />
            </button>
          )}
        </div>
        <PkSelect
          ariaLabel="Pregled do mjeseca"
          value={monthTo > month ? monthTo : 0}
          onChange={(v) => {
            setMonthTo(Number(v));
            setEErrors(null);
          }}
          options={[
            { value: 0, label: "Jedan mjesec" },
            ...MJESECI_DO.map((m, i) => ({
              value: i + 1,
              label: `do ${m}`,
            })).filter((o) => o.value > month),
          ]}
        />
        <PkSelect
          ariaLabel="Filter: tip dokumenta"
          value={fTip}
          onChange={(v) => setFTip(String(v ?? "SVI"))}
          options={[
            { value: "SVI", label: "Svi tipovi" },
            ...(tab === "kuf" ? TIPOVI_DOKUMENTA_KUF : TIPOVI_DOKUMENTA_KIF),
          ]}
        />
        <PkSelect
          ariaLabel="Filter: vrsta fakture"
          value={fVrsta}
          onChange={(v) => setFVrsta(String(v ?? "SVE"))}
          options={
            tab === "kuf"
              ? [
                  { value: "SVE", label: "Sve vrste" },
                  { value: "DOMACA", label: "Domaći dobavljač" },
                  { value: "UVOZ", label: "Uvoz" },
                  { value: "OD_NEOBVEZNIKA", label: "Poljoprivrednik (paušal)" },
                ]
              : [
                  { value: "SVE", label: "Sve vrste" },
                  { value: "OPOREZIVA", label: "Oporeziva isporuka" },
                  { value: "IZVOZ", label: "Izvoz" },
                  { value: "OSLOBODJENA", label: "Oslobođena" },
                ]
          }
        />
        <PkSelect
          ariaLabel="Filter: vrsta dokumenta"
          value={fDok}
          onChange={(v) => setFDok(String(v ?? "SVE"))}
          options={[
            { value: "SVE", label: "Svi dokumenti" },
            ...(tab === "kuf" ? VRSTE_DOKUMENTA : KIF_VRSTE_DOKUMENTA),
          ]}
        />
        {filterActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-1.5 rounded-lg border border-cream-300 bg-cream-100 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Poništi filtere
          </button>
        )}
        <span className="ml-auto inline-flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const org = fullOrg?.name ?? activeOrg?.name ?? "";
              setExportingKnjiga(true);
              try {
                // izvještaj prati aktivne filtere i raspon perioda
                if (tab === "kuf")
                  await downloadKufPdf(kufView, org, month, year, rangeTo ?? undefined);
                else
                  await downloadKifPdf(kifView, org, month, year, rangeTo ?? undefined);
              } finally {
                setExportingKnjiga(false);
              }
            }}
            disabled={
              exportingKnjiga ||
              (tab === "kuf" ? kufView.length === 0 : kifView.length === 0)
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 bg-cream-100 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            {exportingKnjiga ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconDownload size={14} />
            )}
            Izvještaj (PDF)
          </button>
          {tab === "kif" && (
            <button
              type="button"
              onClick={() => setPazarOpen(true)}
              disabled={!fullOrg?.isPdvObveznik}
              title="Zbirno knjiženje gotovinskog prometa za mjesec (PDV 17/117)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 bg-cream-100 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
            >
              Proknjiži pazar
            </button>
          )}
          {tab === "kif" && (
            <button
              type="button"
              onClick={() => setKifPdvOpen(true)}
              disabled={!fullOrg?.isPdvObveznik}
              title="Red sa osnovicom 0 i samo izlaznim PDV-om (npr. posebna šema u građevinarstvu)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 bg-cream-100 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
            >
              Knjiži samo PDV
            </button>
          )}
          <button
            type="button"
            onClick={exportEknjiga}
            disabled={
              !fullOrg ||
              rangeTo != null ||
              (tab === "kuf"
                ? kufMonthRows.length === 0
                : kifMonthRows.length === 0)
            }
            title={
              rangeTo != null
                ? "e-evidencije se predaju mjesečno: izaberite jedan mjesec"
                : "CSV za predaju elektronskih evidencija na UINO e-portalu"
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 bg-cream-100 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            <IconDownload size={14} />
            {tab === "kuf" ? "e-KUF (CSV)" : "e-KIF (CSV)"}
          </button>
        </span>
      </div>
      {filterActive && (
        <p className="text-[12px] text-text-tertiary mb-3 -mt-1">
          prikazano {tab === "kuf" ? kufView.length : kifView.length} od{" "}
          {tab === "kuf" ? kufRows.length : kifRows.length} stavki · PDF
          izvještaj prati filter, e-{tab === "kuf" ? "KUF" : "KIF"} uvijek
          sadrži cijelu knjigu
        </p>
      )}

      {/* Knjiga */}
      <div className="rounded-xl bg-cream-100 border border-cream-300 overflow-hidden">
        {loading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            Učitavanje...
          </div>
        ) : tab === "kuf" && kufRows.length === 0 ? (
          <Empty
            title={
              rangeTo
                ? `KUF za period ${MJESECI[month - 1].toLowerCase()} - ${MJESECI[rangeTo - 1].toLowerCase()} ${year}. je prazan`
                : `KUF za ${MJESECI[month - 1].toLowerCase()} ${year}. je prazan`
            }
            sub="Proknjižite ulazne račune dobavljača (Fakture → Proknjiži ulazni račun, ili sa kartice partnera) i pojaviće se ovdje."
          />
        ) : tab === "kif" && kifRows.length === 0 ? (
          <Empty
            title={
              rangeTo
                ? `KIF za period ${MJESECI[month - 1].toLowerCase()} - ${MJESECI[rangeTo - 1].toLowerCase()} ${year}. je prazan`
                : `KIF za ${MJESECI[month - 1].toLowerCase()} ${year}. je prazan`
            }
            sub="Izdajte fakture za ovaj period i pojaviće se ovdje (nacrti i stornirane ne ulaze u knjigu)."
          />
        ) : (tab === "kuf" ? kufView : kifView).length === 0 ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            Nijedna stavka ne odgovara izabranim filterima.
          </div>
        ) : tab === "kuf" ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cream-300">
                  <th className={thCls}>R.br.</th>
                  <th className={thCls}>Tip</th>
                  <th className={thCls}>Broj fakture</th>
                  <th className={thCls}>Datum</th>
                  <th className={thCls}>Prijem</th>
                  <th className={thCls}>Šifra</th>
                  <th className={thCls}>Dobavljač</th>
                  <th className={thCls}>JIB / PDV broj</th>
                  <th className={thCls}>Vrsta</th>
                  <th className={`${thCls} text-right`}>Ukupno</th>
                  <th className={`${thCls} text-right`}>Osnovica</th>
                  <th className={`${thCls} text-right`}>PDV</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {kufView.map((r, i) => {
                  const pdv = Number(r.pdvIznos) || 0;
                  const ukupno = Number(r.iznos) || 0;
                  const neodbitni =
                    Number(r.pdvNeodbitniIznos) || (r.pdvNeodbitan ? pdv : 0);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setKufEdit(r)}
                      className={[
                        "cursor-pointer hover:bg-cream-50/80 transition-colors",
                        i < kufView.length - 1
                          ? "border-b border-cream-300/60"
                          : "",
                      ].join(" ")}
                      title="Otvori knjiženje"
                    >
                      <td className={`${tdCls} text-text-tertiary`}>{i + 1}</td>
                      <td
                        className={`${tdCls} text-text-tertiary`}
                        title={
                          TIPOVI_DOKUMENTA_KUF.find(
                            (t) => t.value === r.tipDokumenta,
                          )?.label
                        }
                      >
                        {r.tipDokumenta ?? "01"}
                      </td>
                      <td className={tdCls}>{r.brojRacuna}</td>
                      <td className={tdCls}>{formatDate(r.datumRacuna)}</td>
                      <td className={tdCls}>
                        {formatDate(r.datumPrijema ?? r.datumRacuna)}
                      </td>
                      <td className={`${tdCls} text-text-tertiary tabular-nums`}>
                        {r.partner?.code != null
                          ? String(r.partner.code).padStart(4, "0")
                          : "–"}
                      </td>
                      <td className={`${tdCls} max-w-[220px] truncate`}>
                        {r.partner ? (
                          <Link
                            href={`/app/partneri/${r.partner.id}`}
                            onClick={(e) => e.stopPropagation()}
                            title="Otvori karticu partnera"
                            className="hover:underline hover:text-brand-700 transition-colors"
                          >
                            {r.partner.name}
                          </Link>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className={`${tdCls} text-text-tertiary`}>
                        {r.partner?.pdvBroj || r.partner?.jib || "–"}
                      </td>
                      <td className={`${tdCls} text-text-tertiary`}>
                        {VRSTA_NABAVKE_LABEL[r.vrstaNabavke] ?? "domaća"}
                      </td>
                      <td className={tdNum}>{formatBAM(ukupno)}</td>
                      <td className={tdNum}>
                        {formatBAM(Math.max(ukupno - pdv, 0))}
                      </td>
                      <td className={tdNum}>
                        {pdv > 0 ? formatBAM(pdv) : "–"}
                        {neodbitni > 0 && pdv > 0 && (
                          <span
                            className="ml-1 text-[10.5px] text-warning"
                            title={`Ne može se odbiti: ${formatBAM(neodbitni)}`}
                          >
                            ({formatBAM(neodbitni)} neodb.)
                          </span>
                        )}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBrisiKuf(r);
                          }}
                          title="Obriši stavku iz KUF-a"
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
                        >
                          <IconTrash size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-cream-300 bg-cream-50/60">
                  <td className={`${tdCls} font-semibold`} colSpan={9}>
                    Ukupno ({kufView.length})
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(kufTotals.ukupno)}
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(kufTotals.osnovica)}
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(kufTotals.pdv)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cream-300">
                  <th className={thCls}>R.br.</th>
                  <th className={thCls}>Tip</th>
                  <th className={thCls}>Broj fakture</th>
                  <th className={thCls}>Datum</th>
                  <th className={thCls}>Kupac</th>
                  <th className={thCls}>JIB / PDV broj</th>
                  <th className={thCls}>Vrsta</th>
                  <th className={`${thCls} text-right`}>Ukupno</th>
                  <th className={`${thCls} text-right`}>Osnovica</th>
                  <th className={`${thCls} text-right`}>PDV</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {kifView.map((inv, i) => {
                  const tip =
                    inv.kifTipDokumenta ??
                    (inv.docType === "AVANSNA" || inv.docType === "STORNO_AVANSNE"
                      ? "03"
                      : inv.vrstaIsporuke === "IZVOZ"
                        ? "04"
                        : "01");
                  const sign = kifSign(inv);
                  return (
                  <tr
                    key={inv.id}
                    onClick={() => setPreviewId(inv.id)}
                    className={[
                      "cursor-pointer hover:bg-cream-50/80 transition-colors",
                      i < kifView.length - 1
                        ? "border-b border-cream-300/60"
                        : "",
                    ].join(" ")}
                    title="Otvori fakturu"
                  >
                    <td className={`${tdCls} text-text-tertiary`}>{i + 1}</td>
                    <td
                      className={`${tdCls} text-text-tertiary`}
                      title={
                        TIPOVI_DOKUMENTA_KIF.find((t) => t.value === tip)
                          ?.label
                      }
                    >
                      {tip}
                    </td>
                    <td className={tdCls}>{inv.fullNumber}</td>
                    <td className={tdCls}>{formatDate(inv.issueDate)}</td>
                    <td className={`${tdCls} max-w-[220px] truncate`}>
                      {inv.buyerName}
                    </td>
                    <td className={`${tdCls} text-text-tertiary`}>
                      {inv.buyerVatNumber || inv.buyerIdNumber || "–"}
                    </td>
                    <td className={`${tdCls} text-text-tertiary`}>
                      {VRSTA_ISPORUKE_LABEL[inv.vrstaIsporuke] ?? "oporeziva"}
                      {inv.docType !== "STANDARD" && (
                        <span className="ml-1.5 inline-block text-[10.5px] px-1.5 py-0.5 rounded-full bg-cream-200 text-text-secondary">
                          {inv.docType === "AVANSNA"
                            ? "avans"
                            : inv.docType === "STORNO_AVANSNE"
                              ? "storno avans"
                              : inv.docType === "PAZAR"
                                ? "pazar"
                                : inv.docType === "PDV_EVIDENCIJA"
                                  ? "samo PDV"
                                  : "knjižna obavijest"}
                        </span>
                      )}
                    </td>
                    <td className={tdNum}>
                      {formatBAM(sign * Number(inv.grossTotal))}
                    </td>
                    <td className={tdNum}>
                      {formatBAM(sign * Number(inv.netTotal))}
                    </td>
                    <td className={tdNum}>
                      {Number(inv.vatTotal) > 0
                        ? formatBAM(sign * Number(inv.vatTotal))
                        : "–"}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setKifEdit(inv);
                        }}
                        title="Uredi knjiženje u KIF"
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                      >
                        <IconPencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBrisiKif(inv);
                        }}
                        title="Obriši dokument iz KIF-a"
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
                      >
                        <IconTrash size={15} />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-cream-300 bg-cream-50/60">
                  <td className={`${tdCls} font-semibold`} colSpan={7}>
                    Ukupno ({kifView.length})
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(kifTotals.ukupno)}
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(kifTotals.osnovica)}
                  </td>
                  <td className={`${tdNum} font-semibold`}>
                    {formatBAM(kifTotals.pdv)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Sume za PDV prijavu u jednoj traci (mjesečne, iz cijele knjige;
          kod pregleda raspona se skrivaju da se ne pomiješaju sa totalima) */}
      {prijava && !rangeTo && (kufRows.length > 0 || kifRows.length > 0) && (
        <div className="rounded-xl border border-cream-300 bg-cream-100 px-5 py-3.5 mt-4 flex flex-wrap items-center gap-x-10 gap-y-2">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
              Izlazni PDV · KIF (51)
            </div>
            <div className="font-serif-display text-[19px] leading-tight tabular-nums text-text-primary">
              {formatBAM(prijava.p51)}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
              Ulazni odbitni PDV · KUF (61)
            </div>
            <div className="font-serif-display text-[19px] leading-tight tabular-nums text-text-primary">
              {formatBAM(prijava.p61)}
              {prijava.pdvNeodbitni > 0 && (
                <span className="font-sans text-[11.5px] text-text-tertiary ml-2">
                  + {formatBAM(prijava.pdvNeodbitni)} neodbitni
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
              Polje 71
            </div>
            <div
              className={[
                "font-serif-display text-[19px] leading-tight tabular-nums",
                prijava.p71 > 0
                  ? "text-accent-500"
                  : prijava.p71 < 0
                    ? "text-success"
                    : "text-text-primary",
              ].join(" ")}
            >
              {formatBAM(prijava.p71)}
              <span className="font-sans text-[11.5px] text-text-tertiary ml-2">
                {prijava.p71 > 0
                  ? "obaveza za uplatu"
                  : prijava.p71 < 0
                    ? "pretplata (kredit)"
                    : "izmireno"}
              </span>
            </div>
          </div>
        </div>
      )}

      <p className="text-[12px] text-text-tertiary mt-3 max-w-[720px]">
        Napomena: da knjige budu kompletne, proknjižite SVE ulazne račune
        (uključujući režije i gotovinske račune) i izdajte sve fakture kroz
        aplikaciju. Tab PDV prijava se popunjava automatski iz ovih knjiga za
        izabrani mjesec.
      </p>
        </>
      )}

      <KifKnjizenjeModal
        invoice={kifEdit}
        orgJurisdiction={fullOrg?.jurisdiction ?? null}
        onClose={() => setKifEdit(null)}
      />
      <PazarModal
        open={pazarOpen}
        orgId={orgId}
        month={month}
        year={year}
        onClose={() => setPazarOpen(false)}
      />
      <KifPdvModal
        open={kifPdvOpen}
        orgId={orgId}
        onClose={() => setKifPdvOpen(false)}
      />

      {/* Potvrda brisanja stavke iz KUF-a (briše ulazni račun) */}
      <Modal
        open={brisiKuf != null}
        onClose={() => setBrisiKuf(null)}
        title="Obrisati stavku iz KUF-a?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setBrisiKuf(null)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={deleteRacun.isPending}
              onClick={() => {
                if (!brisiKuf) return;
                deleteRacun.mutate(brisiKuf.id, {
                  onSuccess: () => setBrisiKuf(null),
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {deleteRacun.isPending && (
                <IconLoader2 size={15} className="animate-spin" />
              )}
              Obriši
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary">
          Briše se ulazni račun{" "}
          <span className="font-semibold text-text-primary">
            {brisiKuf?.brojRacuna}
          </span>{" "}
          dobavljača{" "}
          <span className="font-semibold text-text-primary">
            {brisiKuf?.partner?.name ?? ""}
          </span>{" "}
          ({formatBAM(Number(brisiKuf?.iznos ?? 0))}). Nestaje iz KUF-a,
          e-KUF-a, prijave i sa liste ulaznih računa; transakcije sa izvoda
          ostaju netaknute. Trajno je.
        </p>
      </Modal>

      {/* Potvrda brisanja dokumenta iz KIF-a (briše izlazni dokument) */}
      <Modal
        open={brisiKif != null}
        onClose={() => setBrisiKif(null)}
        title="Obrisati dokument iz KIF-a?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setBrisiKif(null)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={deleteKif.isPending}
              onClick={() => brisiKif && deleteKif.mutate(brisiKif)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {deleteKif.isPending && (
                <IconLoader2 size={15} className="animate-spin" />
              )}
              Obriši
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary">
          Briše se dokument{" "}
          <span className="font-semibold text-text-primary">
            {brisiKif?.fullNumber}
          </span>{" "}
          ({formatBAM(Number(brisiKif?.grossTotal ?? 0))}). Nestaje iz
          KIF-a, e-KIF-a, prijave i sa liste faktura. Trajno je; ako uz njega
          postoji vezani storno ili knjižna obavijest, njih obrišite posebno.
        </p>
      </Modal>
      <InvoicePreviewModal
        invoiceId={previewId}
        onClose={() => setPreviewId(null)}
        isPdvObveznik={Boolean(fullOrg?.isPdvObveznik)}
        orgJurisdiction={fullOrg?.jurisdiction ?? null}
        orgId={orgId}
      />
      <UlazniRacunModal
        orgId={orgId}
        open={kufEdit != null}
        onClose={() => setKufEdit(null)}
        editRacun={kufEdit}
        isPdvObveznik={Boolean(fullOrg?.isPdvObveznik)}
        orgJurisdiction={fullOrg?.jurisdiction ?? null}
      />
    </div>
  );
}

function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <span className="w-12 h-12 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-3">
        <IconInbox size={22} />
      </span>
      <p className="text-[14px] font-medium text-text-primary">{title}</p>
      <p className="text-[12.5px] text-text-tertiary mt-1 max-w-[460px] mx-auto">
        {sub}
      </p>
    </div>
  );
}
