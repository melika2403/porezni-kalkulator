"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "src/sections/ugovor-o-djelu/uod.module.css";
import uorStyles from "./uor.module.css";
import DateInput from "src/components/DateInput/DateInput";
import UgovorFillSelect from "src/components/PersonFillSelect/UgovorFillSelect";
import WorkersSidebar from "src/components/WorkersSidebar/WorkersSidebar";
import { useRole } from "src/hooks/useRole";
import { useCityLookup } from "src/hooks/useCities";
import { formatAddress } from "src/utils/formatAddress";
import FaqSection from "src/components/FaqSection/FaqSection";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import {
  getOrganization,
  getWorkers,
  peekContractNumber,
  takeContractNumber,
  updateWorker,
  uploadWorkerDocument,
  type Worker,
  type WorkerDocumentType,
  type WorkerPayload,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import { isJmbgValid, parseJmbg } from "src/utils/jmbg";
import {
  clan1Tekst,
  clanPlate,
  formatDdMmYyyy,
  nacinPrestanka,
  naslov2Otkaza,
  tipUgovoraRijec,
  type TipPrestanka,
  type TipUgovora,
  type TrajanjeJedinica,
} from "./compose";
import { fillUorDocx, type UorTemplateData } from "./fillUorDocx";
import { fillUorPdf } from "./fillUorPdf";
import { fillOtkazDocx, type OtkazTemplateData } from "./fillOtkazDocx";
import { fillOtkazPdf } from "./fillOtkazPdf";
import { fillJs3100Template, type Js3100Data, type Js3100Vrsta } from "src/sections/prijave-radnika/fillJs3100";

type ActiveTab = "ugovor" | "otkaz";

// XXX-XXX-XXXXXXXX-XX (16 cifara s crticama)
const formatZiroRacun = (raw: string): string => {
  const d = raw.replace(/\D/g, "").slice(0, 16);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 14), d.slice(14, 16)].filter(Boolean);
  return parts.join("-");
};

const formatJib = (raw: string): string => raw.replace(/\D/g, "").slice(0, 13);

// "1.000,00"
const formatAmountForInput = (s: string): string => {
  if (!s) return "";
  const parts = s.replace(/\./g, "").split(",");
  const intPart = parts[0].replace(/\D/g, "");
  const intFmt = intPart ? Number(intPart).toLocaleString("de-DE") : "";
  if (parts.length === 1) return intFmt;
  const decPart = parts[1].replace(/\D/g, "").slice(0, 2);
  return `${intFmt},${decPart}`;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

// Računa zadnji dan ugovora na osnovu početka + trajanja.
// Dodaje N mjeseci/godina pa oduzme 1 dan (npr. 14.05 + 6 mjeseci → 13.11).
const computeEndIso = (
  startIso: string,
  broj: number,
  jedinica: "mjeseci" | "godine",
): string => {
  if (!startIso || !broj) return "";
  const [y, m, d] = startIso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (jedinica === "mjeseci") {
    dt.setUTCMonth(dt.getUTCMonth() + broj);
  } else {
    dt.setUTCFullYear(dt.getUTCFullYear() + broj);
  }
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
};

const maxTrajanjeBroj = (jedinica: "mjeseci" | "godine") =>
  jedinica === "godine" ? 3 : 36;

const IconDownload = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
  </svg>
);

const IconForm = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="6" y="3" width="12" height="18" rx="2" />
    <path d="M9 7h6M9 11h6M9 15h4" />
  </svg>
);

export default function UgovorORadu() {
  const { role, isLoading } = useRole();
  if (isLoading) {
    return <main className={styles.page} />;
  }
  if (role === null) {
    return <UgovorORaduGate />;
  }
  return <UgovorORaduApp />;
}

function UgovorORaduGate() {
  const title = "Ugovor o radu je dostupan uz pretplatu";
  const text =
    "Da biste koristili generator ugovora o radu i otkaza, registrujte se besplatno i probajte preview obrasca, ili odmah aktivirajte Business pretplatu.";
  const cta = "Registrirajte se besplatno →";
  const href = "/registracija";

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Ugovori</p>
        <h1 className={styles.h1}>
          Ugovor o radu i <em>otkaz</em> — predložak (FBiH)
        </h1>
        <p className={styles.subtitle}>
          Generator ugovora o radu i odluke o prestanku radnog odnosa, popunjen
          podacima iz profila, u Word i PDF formatu.
        </p>
      </div>
      <div className={styles.gateCard}>
        <div className={styles.gateIcon}>🔒</div>
        <h2 className={styles.gateTitle}>{title}</h2>
        <p className={styles.gateText}>{text}</p>
        <a href={href} className={styles.btnPrimary}>{cta}</a>
      </div>
    </main>
  );
}

function UgovorORaduApp() {
  const { hasRole } = useRole();
  const canGenerate = hasRole("BUSINESS", "ADMIN");
  const { findByName: findCity } = useCityLookup();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ActiveTab>(() => {
    const t = searchParams.get("tab");
    return t === "otkaz" ? "otkaz" : "ugovor";
  });
  const initialOrgId = (() => {
    const v = searchParams.get("org");
    return v ? Number(v) || null : null;
  })();
  const initialWorkerId = (() => {
    const v = searchParams.get("worker");
    return v ? Number(v) || null : null;
  })();

  // ── Sidebar state ──
  const [sidebarOrgId, setSidebarOrgId] = useState<number | null>(initialOrgId);
  const [sidebarWorkerId, setSidebarWorkerId] = useState<number | null>(initialWorkerId);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [postDownloadPrompt, setPostDownloadPrompt] = useState<"prijava" | "odjava" | null>(null);

  // ── Shared: Poslodavac ──
  const [nazivFirme, setNazivFirme] = useState("");
  const [adresaPoslodavca, setAdresaPoslodavca] = useState("");
  const [grad, setGrad] = useState("");
  const [jibPoslodavca, setJibPoslodavca] = useState("");
  const [imePoslodavca, setImePoslodavca] = useState("");

  // ── Shared: Radnik ──
  const [imeRadnika, setImeRadnika] = useState("");
  const [adresaRadnika, setAdresaRadnika] = useState("");
  const [jmbgRadnika, setJmbgRadnika] = useState("");
  const [ziroRadnika, setZiroRadnika] = useState("");

  // ── Ugovor o radu (tab) ──
  const [tipUgovora, setTipUgovora] = useState<TipUgovora>("neodredjeno");
  const [datumIstekaIso, setDatumIstekaIso] = useState("");
  const [trajanjeBroj, setTrajanjeBroj] = useState(1);
  const [trajanjeJedinica, setTrajanjeJedinica] = useState<TrajanjeJedinica>("godine");
  const [datumPocetkaIso, setDatumPocetkaIso] = useState(todayIso());
  const [probniRadEnabled, setProbniRadEnabled] = useState(false);
  const [probniRadMjeseci, setProbniRadMjeseci] = useState(3);
  const [radnoMjesto, setRadnoMjesto] = useState("");
  const [mjestoRada, setMjestoRada] = useState("");
  const [brutoPlata, setBrutoPlata] = useState("");
  const [netoPlata, setNetoPlata] = useState("");
  const [datumUgovoraIso, setDatumUgovoraIso] = useState(todayIso());
  const [brojUgovoraUor, setBrojUgovoraUor] = useState("");
  const [otkazniRok, setOtkazniRok] = useState("30 dana");

  // Backend peek za auto-broj ugovora (per organization + year)
  const autoBrojYear =
    parseInt(datumUgovoraIso.slice(0, 4), 10) || new Date().getFullYear();
  const autoBrojQuery = useQuery({
    queryKey: ["contractCounter", sidebarOrgId, autoBrojYear],
    queryFn: () => unwrap(peekContractNumber(sidebarOrgId!, autoBrojYear)),
    enabled: !!sidebarOrgId,
  });
  const autoBrojPreview = autoBrojQuery.data?.number ?? `?/${autoBrojYear}`;

  // ── Otkaz (tab) ──
  const [brojUgovora, setBrojUgovora] = useState("");
  const [datumUgovoraOrigIso, setDatumUgovoraOrigIso] = useState("");
  const [datumOdlukeIso, setDatumOdlukeIso] = useState(todayIso());
  const [datumPrestankaIso, setDatumPrestankaIso] = useState("");
  const [razlogOtkaza, setRazlogOtkaza] = useState("");
  const [tipPrestanka, setTipPrestanka] = useState<TipPrestanka>("od_poslodavca");

  const [gen, setGen] = useState<"docx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  // Centralizovana mutacija za sync employment podataka iz UoR forme u worker.
  // Poziva se pri svakom download-u (ugovor / otkaz / JS3100) ako je radnik
  // odabran u sidebar-u, tako da forma i baza ostanu u sinhronizaciji.
  const syncWorkerMutation = useMutation({
    mutationFn: ({
      orgId,
      workerId,
      payload,
    }: {
      orgId: number;
      workerId: number;
      payload: Partial<WorkerPayload>;
    }) => unwrap(updateWorker(orgId, workerId, payload)),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["workers", vars.orgId] });
      // Update selected worker odmah da sidebar badge i ostala polja reflektuju promjenu
      setSelectedWorker((prev) =>
        prev && prev.id === vars.workerId ? { ...prev, ...data } : prev,
      );
    },
  });

  // ── Auto-popuna: organizacija u sidebar → poslodavac polja ──
  const orgQuery = useQuery({
    queryKey: ["organization", sidebarOrgId],
    queryFn: () => unwrap(getOrganization(sidebarOrgId!)),
    enabled: !!sidebarOrgId,
  });

  // Deep-link: kad URL ima ?worker=N, dovuci radnike za odabranu organizaciju
  // i poziva handleWorkerPick(worker) automatski (samo jednom pri inicijalnom mount-u).
  const workersQuery = useQuery({
    queryKey: ["workers", sidebarOrgId],
    queryFn: () => unwrap(getWorkers(sidebarOrgId!)),
    enabled: !!sidebarOrgId && !!initialWorkerId,
  });
  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    if (!initialWorkerId) return;
    const w = workersQuery.data?.find((x) => x.id === initialWorkerId);
    if (!w) return;
    deepLinkAppliedRef.current = true;
    handleWorkerPick(w.id, w);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workersQuery.data, initialWorkerId]);

  useEffect(() => {
    const org = orgQuery.data;
    if (!org) return;
    setNazivFirme(org.name ?? "");
    setAdresaPoslodavca(org.address ?? "");
    setGrad(org.city ?? "");
    setJibPoslodavca(org.taxNumber ?? "");
    if (org.owner) {
      setImePoslodavca(`${org.owner.firstName} ${org.owner.lastName}`.trim());
    }
  }, [orgQuery.data]);

  // ── Auto-popuna: radnik u sidebar → radnik polja + employment podaci ──
  const fmtKm = (n: number) =>
    n.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleWorkerPick = (workerId: number | null, w: Worker | null) => {
    setSidebarWorkerId(workerId);
    setSelectedWorker(w);
    if (!w) return;

    // Osnovni podaci radnika
    const cityInfo = w.city ? findCity(w.city) : null;
    setImeRadnika(`${w.firstName} ${w.lastName}`.trim());
    setAdresaRadnika(formatAddress(w.address, w.city, cityInfo?.postalCode));
    setJmbgRadnika(w.jmbg ?? "");
    setZiroRadnika(w.bankAccount ?? "");

    // Employment podaci → UoR tab. UVIJEK postavi (i kad fali — reset na default),
    // inače ostane vrijednost od prethodnog radnika.
    setRadnoMjesto(w.position ?? "");
    setBrutoPlata(w.salaryBruto != null ? fmtKm(w.salaryBruto) : "");
    setNetoPlata(w.salaryNeto != null ? fmtKm(w.salaryNeto) : "");
    setTipUgovora(w.contractType === "ODREDJENO" ? "odredjeno" : "neodredjeno");
    setDatumIstekaIso(w.contractEndDate ?? "");
    setDatumPocetkaIso(w.startDate ?? "");
    if (w.probationMonths != null && w.probationMonths > 0) {
      setProbniRadEnabled(true);
      setProbniRadMjeseci(w.probationMonths);
    } else {
      setProbniRadEnabled(false);
      setProbniRadMjeseci(3);
    }
    setOtkazniRok(w.noticePeriod ?? "30 dana");
    setBrojUgovoraUor(w.contractNumber ?? "");

    // Otkaz tab
    setBrojUgovora(w.contractNumber ?? "");
    setDatumUgovoraOrigIso(w.startDate ?? "");
    setDatumPrestankaIso(w.endDate ?? w.odjavaDate ?? "");
    // Razlog otkaza ne čuvamo na workeru — uvijek reset
    setRazlogOtkaza("");
  };

  const showError = (msg: string) => {
    setError(msg);
    // Scroll banner u vidno polje da korisnik vidi šta nije popunjeno
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  // Auto-dismiss nakon 6 sekundi
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  const buildUorData = (brojOverride?: string): UorTemplateData => {
    const broj = brojUgovoraUor.trim() || brojOverride || autoBrojPreview;
    return {
      tip_ugovora: tipUgovoraRijec(tipUgovora),
      probni_rad_block: probniRadEnabled,
      clan_1_tekst: clan1Tekst(
        tipUgovora,
        datumIstekaIso,
        probniRadEnabled,
        probniRadMjeseci,
        tipUgovora === "odredjeno" ? trajanjeBroj : undefined,
        tipUgovora === "odredjeno" ? trajanjeJedinica : undefined,
      ),
      broj_ugovora: broj,
      naziv_firme: nazivFirme,
      grad,
      adresa_poslodavca: adresaPoslodavca,
      jib_poslodavca: jibPoslodavca,
      ime_poslodavca: imePoslodavca,
      ime_radnika: imeRadnika,
      jmbg_radnika: jmbgRadnika,
      adresa_radnika: adresaRadnika,
      datum_pocetka_rada: formatDdMmYyyy(datumPocetkaIso),
      radno_mjesto: radnoMjesto,
      mjesto_rada: mjestoRada || grad,
      clan_plate: clanPlate(brutoPlata, netoPlata, ziroRadnika),
      otkazni_rok: otkazniRok.trim() || "30 dana",
      datum_ugovora: formatDdMmYyyy(datumUgovoraIso),
    };
  };

  const buildOtkazData = (): OtkazTemplateData => ({
    naslov2: naslov2Otkaza(tipPrestanka),
    naziv_firme: nazivFirme,
    adresa_poslodavca: adresaPoslodavca,
    jib_poslodavca: jibPoslodavca,
    ime_poslodavca: imePoslodavca,
    datum_odluke: formatDdMmYyyy(datumOdlukeIso),
    broj_ugovora: brojUgovora,
    datum_ugovora: formatDdMmYyyy(datumUgovoraOrigIso),
    ime_radnika: imeRadnika,
    jmbg_radnika: jmbgRadnika,
    adresa_radnika: adresaRadnika,
    nacin_prestanka: nacinPrestanka(tipPrestanka),
    datum_prestanka: formatDdMmYyyy(datumPrestankaIso),
    razlog_otkaza: razlogOtkaza,
  });

  const validateUgovor = (): string | null => {
    if (!nazivFirme) return "Unesite naziv poslodavca.";
    if (!imeRadnika) return "Unesite ime radnika.";
    if (!radnoMjesto) return "Unesite radno mjesto.";
    if (!brutoPlata) return "Unesite bruto platu.";
    if (tipUgovora === "odredjeno" && !datumIstekaIso)
      return "Za ugovor na određeno, unesite datum isteka.";
    return null;
  };

  const validateOtkaz = (): string | null => {
    if (!nazivFirme) return "Unesite naziv poslodavca.";
    if (!imeRadnika) return "Unesite ime radnika.";
    if (!brojUgovora) return "Unesite broj originalnog ugovora.";
    if (!datumPrestankaIso) return "Unesite datum prestanka radnog odnosa.";
    if (!razlogOtkaza) return "Unesite razlog otkaza.";
    return null;
  };

  // Sve employment podatke iz UoR forme spakuje u WorkerPayload (sinhronizacija).
  const buildEmploymentPayload = (): Partial<WorkerPayload> => {
    const parseKm = (s: string): number | null => {
      const t = s.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(t);
      return Number.isFinite(n) ? n : null;
    };
    return {
      position: radnoMjesto.trim() || null,
      salaryBruto: parseKm(brutoPlata),
      salaryNeto: parseKm(netoPlata),
      contractType: tipUgovora === "odredjeno" ? "ODREDJENO" : "NEODREDJENO",
      contractEndDate: datumIstekaIso || null,
      startDate: datumPocetkaIso || null,
      probationMonths: probniRadEnabled ? probniRadMjeseci : 0,
      noticePeriod: otkazniRok.trim() || null,
      contractNumber: brojUgovoraUor.trim() || null,
      bankAccount: ziroRadnika.trim() || undefined,
    };
  };

  const persistWorker = (extra: Partial<WorkerPayload> = {}) => {
    if (!selectedWorker || !sidebarOrgId) return;
    syncWorkerMutation.mutate({
      orgId: sidebarOrgId,
      workerId: selectedWorker.id,
      payload: { ...buildEmploymentPayload(), ...extra },
    });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Upload generisanog dokumenta u backend arhivu (ako je worker odabran).
  // Fire-and-forget: ako fail-uje, ne prekida download flow.
  const archiveDocument = (
    blob: Blob,
    filename: string,
    type: WorkerDocumentType,
    format: "DOCX" | "PDF",
    number?: string,
  ) => {
    if (!selectedWorker) return;
    uploadWorkerDocument(selectedWorker.id, blob, {
      type,
      format,
      number,
      originalName: filename,
    })
      .then((r) => {
        if (r.ok && selectedWorker) {
          queryClient.invalidateQueries({
            queryKey: ["workerDocuments", selectedWorker.id],
          });
        } else if (!r.ok) {
          console.warn("Document archive failed:", r.error);
        }
      })
      .catch((e) => console.warn("Document archive error:", e));
  };

  // Sastavlja Js3100Data iz trenutne forme + odabranog radnika.
  const buildJs3100Data = (vrsta: Js3100Vrsta): Js3100Data => {
    const w = selectedWorker;
    const employerCityInfo = grad ? findCity(grad) : null;
    // Grad radnika — prvo iz Worker.city, inače pokušaj iz adresaRadnika izvući "...,grad"
    const workerCityName =
      w?.city ??
      (adresaRadnika.includes(",")
        ? adresaRadnika
            .split(",")
            .pop()!
            .trim()
            .replace(/^\d+\s*/, "") // ukloni poštanski broj ako ga ima na početku
        : "");
    const workerCityInfo = workerCityName ? findCity(workerCityName) : null;

    // Split radnik ime "Ime Prezime" → firstName/lastName ako nemamo worker
    const nameParts = imeRadnika.trim().split(/\s+/);
    const firstName = w?.firstName ?? nameParts[0] ?? "";
    const lastName = w?.lastName ?? nameParts.slice(1).join(" ") ?? "";

    // Datum rođenja iz JMBG-a: DDMMGGG (XXX), gdje GGG < 800 → 2000+GGG, else 1000+GGG
    let rodDan = "";
    let rodMjesec = "";
    let rodGodina = "";
    if (jmbgRadnika.length === 13) {
      rodDan = jmbgRadnika.slice(0, 2);
      rodMjesec = jmbgRadnika.slice(2, 4);
      const ggg = parseInt(jmbgRadnika.slice(4, 7), 10);
      if (Number.isFinite(ggg)) {
        rodGodina = String(ggg < 800 ? 2000 + ggg : 1000 + ggg);
      }
    }

    // Datum promjene: za PRIJAVU = datum početka rada, za ODJAVU = datum prestanka
    const datumPromjeneIso =
      vrsta === "ODJAVA" ? datumPrestankaIso : datumPocetkaIso;
    const [dpY, dpM, dpD] = (datumPromjeneIso || "").split("-");

    return {
      vrsta,
      datumPrijave: formatDdMmYyyy(new Date().toISOString().slice(0, 10)),
      jib: jibPoslodavca,
      sifraOpcine: employerCityInfo?.municipalityCode ?? "",
      naziv: nazivFirme,
      adresa: adresaPoslodavca,
      gradPoste: employerCityInfo?.postalCode
        ? `${employerCityInfo.postalCode} ${grad}`
        : grad,
      telefon: "",
      email: "",
      jmbg: jmbgRadnika,
      prezimeIme: `${lastName} ${firstName}`.trim(),
      djevojackoPrezime: "",
      datumRodjenjaDan: rodDan,
      datumRodjenjaMjesec: rodMjesec,
      datumRodjenjaGodina: rodGodina,
      spol: w?.spol ?? "",
      adresaPrebivalista: adresaRadnika,
      sifraOpcineOsiguranika: workerCityInfo?.municipalityCode ?? "",
      postanskiBroj: workerCityInfo?.postalCode ?? "",
      mjestoPrebivalista: workerCityName,
      // "MjestoEmail adresa" PDF field je u redu 10 (email), ne pored Poštanskog
      // broja — pa ovo ostavljamo prazno; mjesto se crta na koordinatama reda 9.
      postanskiMjestoCombined: "",
      kontaktAdresa: "",
      emailOsiguranika: w?.email ?? "",
      strucnaSpremaIdx: w?.strucnaSpremaIdx ?? null,
      popunioImeIPrezime: imePoslodavca,
      popunioTelefon: "",
      datumPopunjavanja: formatDdMmYyyy(new Date().toISOString().slice(0, 10)),
      sati: "08",
      minuta: "00",
      osnovOsiguranjaOpis: "Zaposleni — puno radno vrijeme",
      osnovOsiguranjaSifra: "01",
      zanimanjeOpis: radnoMjesto,
      zanimanjeSifra: "",
      // Stručna sprema koja se traži na radnom mjestu = ista kao radnikova
      strucnaSpremaTraziSeIdx: w?.strucnaSpremaIdx ?? null,
      datumPromjeneDan: dpD ?? "",
      datumPromjeneMjesec: dpM ?? "",
      datumPromjeneGodina: dpY ?? "",
      napomenaPromjene: "",
      // Osnov za uplatu doprinosa = bruto plata (bez šifre)
      osnovUplateOpis: brutoPlata ? `${brutoPlata} KM` : "",
      osnovUplateSifra: "",
      sifraRadnogMjesta: "",
      stepenUvecanja: "",
    };
  };

  const handleDownloadJs3100 = async (vrsta: Js3100Vrsta) => {
    if (!canGenerate) return;
    if (!imeRadnika) {
      showError("Unesite radnika prije generisanja JS3100.");
      return;
    }
    if (!jmbgRadnika || jmbgRadnika.length !== 13) {
      showError("JMBG radnika mora imati 13 cifara za JS3100 obrazac.");
      return;
    }
    setError(null);
    setGen("pdf");
    try {
      const bytes = await fillJs3100Template(buildJs3100Data(vrsta));
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const suffix = imeRadnika.replace(/\s+/g, "_");
      const filename = `JS3100_${vrsta}_${suffix}.pdf`;
      downloadBlob(blob, filename);
      archiveDocument(
        blob,
        filename,
        vrsta === "PRIJAVA" ? "JS3100_PRIJAVA" : "JS3100_ODJAVA",
        "PDF",
      );
      setPostDownloadPrompt(null);

      // Sync employment + status. Pri prijavi: PRIJAVLJEN + prijavaDate.
      // Pri odjavi: ODJAVLJEN + odjavaDate + endDate (kraj radnog odnosa).
      const today = new Date().toISOString().slice(0, 10);
      const statusExtra: Partial<WorkerPayload> =
        vrsta === "PRIJAVA"
          ? { employmentStatus: "PRIJAVLJEN", prijavaDate: today }
          : { employmentStatus: "ODJAVLJEN", odjavaDate: today, endDate: today };
      persistWorker(statusExtra);
    } catch (e) {
      showError("Greška pri generisanju JS3100: " + (e as Error).message);
    } finally {
      setGen(null);
    }
  };

  const handleDownloadUgovor = async (kind: "docx" | "pdf") => {
    if (!canGenerate) return;
    const err = validateUgovor();
    if (err) {
      showError(err);
      return;
    }
    setError(null);
    setGen(kind);
    try {
      // Ako nema ručno upisanog broja i imamo organizaciju, uzmi sljedeći iz backend-a
      let brojOverride: string | undefined;
      if (!brojUgovoraUor.trim() && sidebarOrgId) {
        const r = await unwrap(takeContractNumber(sidebarOrgId, autoBrojYear));
        brojOverride = r.number;
        queryClient.invalidateQueries({
          queryKey: ["contractCounter", sidebarOrgId, autoBrojYear],
        });
      }
      const data = buildUorData(brojOverride);
      const finalNumber = brojUgovoraUor.trim() || brojOverride || data.broj_ugovora;
      const safeNumber = finalNumber.replace(/\//g, "-");
      const filename = `Ugovor-o-radu_${safeNumber}.${kind}`;
      let blob: Blob;
      if (kind === "docx") {
        blob = await fillUorDocx(data);
      } else {
        const bytes = await fillUorPdf(data);
        blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      }
      downloadBlob(blob, filename);
      archiveDocument(
        blob,
        filename,
        "UGOVOR",
        kind === "docx" ? "DOCX" : "PDF",
        finalNumber,
      );
      // Sync sve unijete podatke u worker (uključujući novi broj ugovora)
      persistWorker(brojOverride ? { contractNumber: brojOverride } : {});
      setPostDownloadPrompt("prijava");
    } catch (e) {
      showError("Greška pri generisanju: " + (e as Error).message);
    } finally {
      setGen(null);
    }
  };

  const handleDownloadOtkaz = async (kind: "docx" | "pdf") => {
    if (!canGenerate) return;
    const err = validateOtkaz();
    if (err) {
      showError(err);
      return;
    }
    setError(null);
    setGen(kind);
    try {
      const suffix = brojUgovora ? "_" + brojUgovora.replace(/\//g, "-") : "";
      const filename = `Otkaz-ugovora${suffix}.${kind}`;
      let blob: Blob;
      if (kind === "docx") {
        blob = await fillOtkazDocx(buildOtkazData());
      } else {
        const bytes = await fillOtkazPdf(buildOtkazData());
        blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      }
      downloadBlob(blob, filename);
      archiveDocument(blob, filename, "OTKAZ", kind === "docx" ? "DOCX" : "PDF", brojUgovora);
      persistWorker();
      setPostDownloadPrompt("odjava");
    } catch (e) {
      showError("Greška pri generisanju: " + (e as Error).message);
    } finally {
      setGen(null);
    }
  };

  return (
    <div className={uorStyles.pageOuter}>
      <div className={uorStyles.pageLayout}>
        <WorkersSidebar
          selectedOrgId={sidebarOrgId}
          onOrgChange={setSidebarOrgId}
          selectedWorkerId={sidebarWorkerId}
          onWorkerSelect={handleWorkerPick}
          bottomHint="Klik na radnika auto-popunjava formu (radnik + poslodavac + plata)."
          enableQuickAdd
        />
        <main className={`${styles.page} ${uorStyles.pageContent}`}>
          <div className={styles.header}>
            <p className={styles.label}>Ugovori</p>
            <h1 className={styles.h1}>
              Ugovor o radu i <em>otkaz</em> (FBiH) — predložak
            </h1>
            <p className={styles.subtitle}>
              Generator ugovora o radu i odluke o prestanku radnog odnosa prema
              Zakonu o radu FBiH. Odaberite radnika iz sidebar-a (auto-popuna
              svih polja) ili popunite ručno.
            </p>
          </div>

          {/* Tab bar */}
      <div className={uorStyles.tabBar}>
        <button
          type="button"
          className={`${uorStyles.tab} ${tab === "ugovor" ? uorStyles.tabActive : ""}`}
          onClick={() => setTab("ugovor")}
        >
          Ugovor o radu
        </button>
        <button
          type="button"
          className={`${uorStyles.tab} ${tab === "otkaz" ? uorStyles.tabActive : ""}`}
          onClick={() => setTab("otkaz")}
        >
          Otkaz ugovora
        </button>
      </div>

      {/* Ugovorne strane — uvijek vidljivo */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Ugovorne <em>strane</em>
        </h2>

        <div className={styles.partyGrid}>
          <div className={styles.party}>
            <h3 className={styles.partyTitle}>Poslodavac</h3>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Popuni poslodavca</span>
              <UgovorFillSelect
                onFill={({ name, address, city, id, ownerName }) => {
                  setNazivFirme(name);
                  setAdresaPoslodavca(address);
                  setGrad(city);
                  setJibPoslodavca(id);
                  if (ownerName) setImePoslodavca(ownerName);
                }}
              />
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Naziv firme / obrta</span>
              <input
                className={styles.input}
                value={nazivFirme}
                onChange={(e) => setNazivFirme(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Adresa (ulica i broj)</span>
              <input
                className={styles.input}
                value={adresaPoslodavca}
                onChange={(e) => setAdresaPoslodavca(e.target.value)}
                placeholder="Npr. Ferhadija 1"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Grad (sjedište)</span>
              <input
                className={styles.input}
                value={grad}
                onChange={(e) => setGrad(e.target.value)}
                placeholder="Npr. Sarajevo"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>JIB</span>
              <input
                className={styles.input}
                value={jibPoslodavca}
                onChange={(e) => setJibPoslodavca(formatJib(e.target.value))}
                inputMode="numeric"
                maxLength={13}
                placeholder="XXXXXXXXXXXXX"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Direktor / zastupnik</span>
              <input
                className={styles.input}
                value={imePoslodavca}
                onChange={(e) => setImePoslodavca(e.target.value)}
                placeholder="Ime i prezime"
              />
              <p className={styles.hint}>
                Automatski se popunjava iz vlasnika organizacije. U dokumentu se ispisuje „kojeg zastupa direktor …&ldquo;.
              </p>
            </label>
          </div>

          <div className={styles.party}>
            <h3 className={styles.partyTitle}>Radnik</h3>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Popuni radnika</span>
              <UgovorFillSelect
                onFill={({ name, address, city, id, bankAccount }) => {
                  setImeRadnika(name);
                  setAdresaRadnika(formatAddress(address, city, findCity(city)?.postalCode));
                  setJmbgRadnika(id);
                  if (bankAccount) setZiroRadnika(bankAccount);
                }}
              />
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Ime i prezime</span>
              <input
                className={styles.input}
                value={imeRadnika}
                onChange={(e) => setImeRadnika(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Adresa</span>
              <input
                className={styles.input}
                value={adresaRadnika}
                onChange={(e) => setAdresaRadnika(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>JMBG</span>
              <input
                className={styles.input}
                value={jmbgRadnika}
                onChange={(e) => setJmbgRadnika(formatJib(e.target.value))}
                inputMode="numeric"
                maxLength={13}
                placeholder="XXXXXXXXXXXXX"
                style={
                  jmbgRadnika.length === 13 && !isJmbgValid(jmbgRadnika)
                    ? { borderColor: "#dc2626" }
                    : undefined
                }
              />
              {jmbgRadnika.length === 13 && !isJmbgValid(jmbgRadnika) && (
                <p style={{ fontSize: 12, color: "#dc2626", margin: "0.3rem 0 0" }}>
                  {parseJmbg(jmbgRadnika).error}
                </p>
              )}
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Žiro račun (opcionalno)</span>
              <input
                className={styles.input}
                value={ziroRadnika}
                onChange={(e) => setZiroRadnika(formatZiroRacun(e.target.value))}
                inputMode="numeric"
                placeholder="XXX-XXX-XXXXXXXX-XX"
              />
              <p className={styles.hint}>
                Ako se ne unese, rečenica o isplati na transakcijski račun se izostavlja iz ugovora.
              </p>
            </label>
          </div>
        </div>
      </section>

      {tab === "ugovor" ? (
        <>
          {/* Detalji ugovora (broj + datum) */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Detalji <em>ugovora</em>
            </h2>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Broj ugovora (opcionalno)</span>
                <input
                  className={styles.input}
                  value={brojUgovoraUor}
                  onChange={(e) => setBrojUgovoraUor(e.target.value)}
                  placeholder={`Auto: ${autoBrojPreview}`}
                />
                <p className={styles.hint}>
                  Ako ostavite prazno, broj će biti automatski dodijeljen ({autoBrojPreview}).
                </p>
              </label>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Datum zaključenja ugovora</span>
                <DateInput
                  className={styles.input}
                  value={datumUgovoraIso}
                  onValueChange={setDatumUgovoraIso}
                />
              </div>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Otkazni rok</span>
                <input
                  className={styles.input}
                  value={otkazniRok}
                  onChange={(e) => setOtkazniRok(e.target.value)}
                  placeholder="30 dana"
                />
                <p className={styles.hint}>
                  Možete upisati npr. „30 dana&ldquo;, „2 sedmice&ldquo;, „mjesec dana&ldquo;. Zakon o radu FBiH dopušta otkazni rok od 14 dana do 3 mjeseca, zavisno od staža.
                </p>
              </label>
            </div>
          </section>

          {/* Trajanje i probni rad */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Trajanje i <em>probni rad</em>
            </h2>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Tip ugovora</span>
                <select
                  className={styles.input}
                  value={tipUgovora}
                  onChange={(e) => {
                    const t = e.target.value as TipUgovora;
                    setTipUgovora(t);
                    if (t === "odredjeno" && !datumIstekaIso) {
                      const end = computeEndIso(
                        datumPocetkaIso,
                        trajanjeBroj,
                        trajanjeJedinica,
                      );
                      if (end) setDatumIstekaIso(end);
                    }
                  }}
                >
                  <option value="neodredjeno">Neodređeno vrijeme</option>
                  <option value="odredjeno">Određeno vrijeme</option>
                </select>
              </label>
              {tipUgovora === "odredjeno" && (
                <>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Trajanje ugovora</span>
                    <div className={uorStyles.inlineFields}>
                      <select
                        className={styles.input}
                        style={{ flex: "0 0 90px" }}
                        value={trajanjeBroj}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTrajanjeBroj(v);
                          const end = computeEndIso(datumPocetkaIso, v, trajanjeJedinica);
                          if (end) setDatumIstekaIso(end);
                        }}
                      >
                        {Array.from(
                          { length: maxTrajanjeBroj(trajanjeJedinica) },
                          (_, i) => i + 1,
                        ).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <select
                        className={styles.input}
                        style={{ flex: "1 1 auto" }}
                        value={trajanjeJedinica}
                        onChange={(e) => {
                          const j = e.target.value as TrajanjeJedinica;
                          setTrajanjeJedinica(j);
                          const capped = Math.min(trajanjeBroj, maxTrajanjeBroj(j));
                          if (capped !== trajanjeBroj) setTrajanjeBroj(capped);
                          const end = computeEndIso(datumPocetkaIso, capped, j);
                          if (end) setDatumIstekaIso(end);
                        }}
                      >
                        <option value="mjeseci">mjeseci</option>
                        <option value="godine">godine</option>
                      </select>
                    </div>
                    <p className={styles.hint}>
                      Zakon o radu FBiH dopušta ugovor na određeno do 3 godine
                      (kumulativno).
                    </p>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Datum isteka ugovora</span>
                    <DateInput
                      className={styles.input}
                      value={datumIstekaIso}
                      onValueChange={setDatumIstekaIso}
                    />
                    <p className={styles.hint}>
                      Automatski se računa iz početka + trajanja, ali ga možete ručno
                      izmijeniti.
                    </p>
                  </div>
                </>
              )}
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Datum početka rada</span>
                <DateInput
                  className={styles.input}
                  value={datumPocetkaIso}
                  onValueChange={(iso) => {
                    setDatumPocetkaIso(iso);
                    if (tipUgovora === "odredjeno") {
                      const end = computeEndIso(iso, trajanjeBroj, trajanjeJedinica);
                      if (end) setDatumIstekaIso(end);
                    }
                  }}
                />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Probni rad</span>
                <div className={uorStyles.inlineFields}>
                  <label className={uorStyles.checkRow}>
                    <input
                      type="checkbox"
                      checked={probniRadEnabled}
                      onChange={(e) => setProbniRadEnabled(e.target.checked)}
                    />
                    Ugovara se probni rad
                  </label>
                  {probniRadEnabled && (
                    <label className={styles.field} style={{ flex: "0 0 200px" }}>
                      <span className={styles.fieldLabel}>Trajanje (mjeseci)</span>
                      <select
                        className={styles.input}
                        value={probniRadMjeseci}
                        onChange={(e) => setProbniRadMjeseci(Number(e.target.value))}
                      >
                        {[1, 2, 3, 4, 5, 6].map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <p className={styles.hint}>
                  Zakon o radu FBiH dopušta probni rad do 6 mjeseci.
                </p>
              </div>
            </div>
          </section>

          {/* Radno mjesto i plata */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Radno mjesto i <em>plata</em>
            </h2>
            <div className={styles.fieldGrid}>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Radno mjesto (pozicija)</span>
                <input
                  className={styles.input}
                  value={radnoMjesto}
                  onChange={(e) => setRadnoMjesto(e.target.value)}
                  placeholder="Npr. Programer, konobar, knjigovođa..."
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Mjesto rada</span>
                <input
                  className={styles.input}
                  value={mjestoRada}
                  onChange={(e) => setMjestoRada(e.target.value)}
                  placeholder={grad || "Npr. Sarajevo"}
                />
                <p className={styles.hint}>
                  Ako je prazno, koristi se sjedište poslodavca.
                </p>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Bruto plata (KM)</span>
                <input
                  className={styles.input}
                  value={brutoPlata}
                  onChange={(e) => setBrutoPlata(formatAmountForInput(e.target.value))}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Neto plata (KM)</span>
                <input
                  className={styles.input}
                  value={netoPlata}
                  onChange={(e) => setNetoPlata(formatAmountForInput(e.target.value))}
                  inputMode="decimal"
                  placeholder="0,00"
                />
                <p className={styles.hint}>
                  Možete unijeti bruto, neto, ili oba iznosa — obrazac će se ispisati
                  tačno prema onome što upišete.
                </p>
              </label>
            </div>
          </section>

          {error && (
            <div ref={errorRef} className={uorStyles.errorBanner} role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className={uorStyles.errorMsg}>{error}</span>
              <button
                type="button"
                className={uorStyles.errorClose}
                onClick={() => setError(null)}
                aria-label="Zatvori"
              >
                ×
              </button>
            </div>
          )}
          {!canGenerate && (
            <GeneratePaywall tier="BUSINESS" what="Generisanje ugovora o radu" />
          )}
          <div className={`${styles.actions} ${styles.actionsCenter}`}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => handleDownloadUgovor("docx")}
              disabled={gen !== null || !canGenerate}
              title={canGenerate ? undefined : "Dostupno uz Business pretplatu"}
            >
              {IconDownload} {gen === "docx" ? "Generišem…" : "Preuzmi ugovor (DOCX)"}
            </button>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => handleDownloadUgovor("pdf")}
              disabled={gen !== null || !canGenerate}
              title={canGenerate ? undefined : "Dostupno uz Business pretplatu"}
            >
              {IconDownload} {gen === "pdf" ? "Generišem…" : "Preuzmi ugovor (PDF)"}
            </button>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => handleDownloadJs3100("PRIJAVA")}
              disabled={gen !== null || !canGenerate}
              title={canGenerate ? "Generiše JS3100 obrazac za prijavu radnika kod PIO/ZZO sa istim podacima" : "Dostupno uz Business pretplatu"}
            >
              {IconForm} Preuzmi JS3100 prijavu (PDF)
            </button>
          </div>

          {postDownloadPrompt === "prijava" && (
            <div className={uorStyles.promptBanner}>
              <span>✓ Ugovor preuzet. Sada možeš preuzeti i JS3100 prijavu za PIO/ZZO?</span>
              <div className={uorStyles.promptActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => handleDownloadJs3100("PRIJAVA")}
                  disabled={gen !== null}
                >
                  Da, preuzmi JS3100
                </button>
                <button
                  type="button"
                  className={uorStyles.promptDismiss}
                  onClick={() => setPostDownloadPrompt(null)}
                >
                  Preskoči
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Otkaz polja */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Podaci o <em>otkazu</em>
            </h2>
            <div className={styles.fieldGrid}>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Tip prestanka</span>
                <select
                  className={styles.input}
                  value={tipPrestanka}
                  onChange={(e) => setTipPrestanka(e.target.value as TipPrestanka)}
                >
                  <option value="od_poslodavca">Otkaz od strane Poslodavca</option>
                  <option value="od_radnika">Otkaz od strane Radnika</option>
                  <option value="sporazumni">Sporazumni raskid ugovora</option>
                </select>
                <p className={styles.hint}>
                  Naslov dokumenta i formulacija u Članu 1 prilagođavaju se odabranom tipu prestanka.
                </p>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Broj originalnog ugovora</span>
                <input
                  className={styles.input}
                  value={brojUgovora}
                  onChange={(e) => setBrojUgovora(e.target.value)}
                  placeholder="Npr. 15/2026"
                />
              </label>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Datum sklapanja ugovora</span>
                <DateInput
                  className={styles.input}
                  value={datumUgovoraOrigIso}
                  onValueChange={setDatumUgovoraOrigIso}
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Datum donošenja odluke</span>
                <DateInput
                  className={styles.input}
                  value={datumOdlukeIso}
                  onValueChange={setDatumOdlukeIso}
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Datum prestanka radnog odnosa</span>
                <DateInput
                  className={styles.input}
                  value={datumPrestankaIso}
                  onValueChange={setDatumPrestankaIso}
                />
              </div>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Razlog otkaza</span>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={razlogOtkaza}
                  onChange={(e) => setRazlogOtkaza(e.target.value)}
                  placeholder="Npr. sporazumni prestanak radnog odnosa, prestanak djelatnosti poslodavca, neispunjavanje obaveza iz ugovora..."
                />
              </label>
            </div>
          </section>

          {error && (
            <div ref={errorRef} className={uorStyles.errorBanner} role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className={uorStyles.errorMsg}>{error}</span>
              <button
                type="button"
                className={uorStyles.errorClose}
                onClick={() => setError(null)}
                aria-label="Zatvori"
              >
                ×
              </button>
            </div>
          )}
          {!canGenerate && (
            <GeneratePaywall tier="BUSINESS" what="Generisanje odluke o otkazu" />
          )}
          <div className={`${styles.actions} ${styles.actionsCenter}`}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => handleDownloadOtkaz("docx")}
              disabled={gen !== null || !canGenerate}
              title={canGenerate ? undefined : "Dostupno uz Business pretplatu"}
            >
              {IconDownload} {gen === "docx" ? "Generišem…" : "Preuzmi otkaz (DOCX)"}
            </button>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => handleDownloadOtkaz("pdf")}
              disabled={gen !== null || !canGenerate}
              title={canGenerate ? undefined : "Dostupno uz Business pretplatu"}
            >
              {IconDownload} {gen === "pdf" ? "Generišem…" : "Preuzmi otkaz (PDF)"}
            </button>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => handleDownloadJs3100("ODJAVA")}
              disabled={gen !== null || !canGenerate}
              title={canGenerate ? "Generiše JS3100 obrazac za odjavu radnika kod PIO/ZZO" : "Dostupno uz Business pretplatu"}
            >
              {IconForm} Preuzmi JS3100 odjavu (PDF)
            </button>
          </div>

          {postDownloadPrompt === "odjava" && (
            <div className={uorStyles.promptBanner}>
              <span>✓ Otkaz preuzet. Sada možeš preuzeti i JS3100 odjavu za PIO/ZZO?</span>
              <div className={uorStyles.promptActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => handleDownloadJs3100("ODJAVA")}
                  disabled={gen !== null}
                >
                  Da, preuzmi JS3100
                </button>
                <button
                  type="button"
                  className={uorStyles.promptDismiss}
                  onClick={() => setPostDownloadPrompt(null)}
                >
                  Preskoči
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <p className={styles.disclaimer}>
        Predložak je informativan, usklađen sa Zakonom o radu FBiH („Službene
        novine FBiH“, br. 26/16, 89/18, 44/22 i 39/24). Provjerite tačnost
        prije potpisivanja.
      </p>

      <FaqSection
        items={[
          {
            q: "Koji su obavezni elementi ugovora o radu u FBiH?",
            a: "Prema Zakonu o radu FBiH, ugovor o radu mora sadržavati: ugovorne strane, datum početka rada, mjesto rada, naziv radnog mjesta i opis poslova, trajanje (neodređeno ili određeno + rok), trajanje punog/nepunog radnog vremena, iznos osnovne plate, te trajanje godišnjeg odmora.",
          },
          {
            q: "Mora li ugovor o radu biti u pisanoj formi?",
            a: "Da. Zakon o radu FBiH zahtijeva da se ugovor o radu zaključi u pisanoj formi prije početka rada radnika. Usmeni dogovor o radu se smatra ugovorom na neodređeno vrijeme po samom zakonu.",
          },
          {
            q: "Koliko može trajati probni rad?",
            a: "Probni rad može trajati najduže 6 mjeseci. Tipično se ugovara 3 mjeseca. Ako probni rad nije izričito ugovoren, smatra se da je radnik primljen bez probnog rada.",
          },
          {
            q: "Kada se ugovor zaključuje na određeno vrijeme?",
            a: "Ugovor na određeno se zaključuje kada postoji konkretan razlog (sezonski rad, zamjena odsutnog radnika, projekat). Maksimalno trajanje uzastopnih ugovora na određeno je 3 godine — nakon toga se ugovor automatski transformiše u ugovor na neodređeno.",
          },
          {
            q: "Šta moram navesti u odluci o prestanku radnog odnosa?",
            a: "Odluka o prestanku mora sadržavati: identifikaciju poslodavca i radnika, broj i datum originalnog ugovora, datum prestanka radnog odnosa, te pravni osnov i razlog prestanka. Odluka se dostavlja radniku, nadležnoj službi za zapošljavanje i arhivi.",
          },
          {
            q: "Koliki je otkazni rok u FBiH?",
            a: "Otkazni rok zavisi od dužine staža kod poslodavca — minimalno 14 dana, a maksimalno 3 mjeseca (kod staža preko 20 godina). Ako se otkaz daje sporazumno ili iz krivice radnika, otkazni rok se može skratiti ili u potpunosti izostaviti.",
          },
        ]}
      />
        </main>
      </div>
    </div>
  );
}
