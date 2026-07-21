"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "src/sections/ugovor-o-djelu/uod.module.css";
import uorStyles from "./uor.module.css";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import UgovorFillSelect from "src/components/PersonFillSelect/UgovorFillSelect";
import WorkersSidebar from "src/components/WorkersSidebar/WorkersSidebar";
import { useRole } from "src/hooks/useRole";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import { useCityLookup } from "src/hooks/useCities";
import { formatAddress } from "src/utils/formatAddress";
import {
  computeContractEndIso,
  maxTrajanjeBroj,
} from "src/utils/contractDuration";
import FaqSection from "src/components/FaqSection/FaqSection";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import {
  createWorker,
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
import { trackEvent } from "src/api/activity";
import { isJmbgValid, parseJmbg, spolFromJmbg } from "src/utils/jmbg";
import {
  clan1Tekst,
  clanPlate,
  formatDdMmYyyy,
  nacinPrestanka,
  naslov2Otkaza,
  RAZLOZI_OTKAZA,
  razlogById,
  type RazlogOtkazaId,
  tipUgovoraRijec,
  type TipPrestanka,
  type TipUgovora,
  type TrajanjeJedinica,
} from "./compose";
import { fillUorDocx, type UorTemplateData } from "./fillUorDocx";
import { fillUorPdf } from "./fillUorPdf";
import { fillOtkazDocx, type OtkazTemplateData } from "./fillOtkazDocx";
import { fillOtkazPdf } from "./fillOtkazPdf";
import { type Js3100Vrsta } from "src/sections/prijave-radnika/fillJs3100";

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

// computeEndIso/maxTrajanjeBroj žive u src/utils/contractDuration.ts (dijeli ih
// i edit radnika). Lokalni alias zadržan radi minimalne izmjene call-sajtova.
const computeEndIso = computeContractEndIso;

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
  return <UgovorORaduApp />;
}

function UgovorORaduApp() {
  // BUSINESS feature: dostupno ako vlastiti plan ili bilo koja moja org ima
  // BUSINESS-tier vlasnika.
  const { hasAccessToTier } = useMaxAccessibleTier();
  const { role } = useRole();
  const isLoggedIn = !!role;
  const canGenerate = hasAccessToTier("BUSINESS");
  const { findByName: findCity } = useCityLookup();
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);

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
    enabled: isLoggedIn && !!sidebarOrgId,
  });
  const autoBrojPreview = autoBrojQuery.data?.number ?? `?/${autoBrojYear}`;

  // ── Otkaz (tab) ──
  const [brojUgovora, setBrojUgovora] = useState("");
  const [datumUgovoraOrigIso, setDatumUgovoraOrigIso] = useState("");
  const [datumOdlukeIso, setDatumOdlukeIso] = useState(todayIso());
  const [datumPrestankaIso, setDatumPrestankaIso] = useState("");
  // Razlog otkaza: dropdown sa predefinisanim razlozima + član ZoR FBiH.
  // Default "Drugo" da se zadrži postojeće ponašanje slobodnog unosa.
  const [razlogOtkazaId, setRazlogOtkazaId] = useState<RazlogOtkazaId>("drugo");
  const [razlogOtkazaCustom, setRazlogOtkazaCustom] = useState("");
  const razlogDef = razlogById(razlogOtkazaId);
  const razlogOtkaza =
    razlogOtkazaId === "drugo"
      ? razlogOtkazaCustom.trim()
      : razlogDef?.text ?? "";
  // tipPrestanka se izvodi iz odabranog razloga (određuje naslov2 i nacin
  // prestanka u dokumentu). Dropdown za zaseban tip više nije potreban.
  const tipPrestanka: TipPrestanka = razlogDef?.tipPrestanka ?? "od_poslodavca";

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
    enabled: isLoggedIn && !!sidebarOrgId,
  });

  // Deep-link: kad URL ima ?worker=N, dovuci radnike za odabranu organizaciju
  // i poziva handleWorkerPick(worker) automatski (samo jednom pri inicijalnom mount-u).
  const workersQuery = useQuery({
    queryKey: ["workers", sidebarOrgId],
    queryFn: () => unwrap(getWorkers(sidebarOrgId!)),
    enabled: isLoggedIn && !!sidebarOrgId && !!initialWorkerId,
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
    // Potpisnik poslodavca: vlasnik (opcije 1/3) ili radnik-direktor (2/4).
    // org.signer ga razrješava na backendu; fallback na vlasnika.
    const signerName =
      org.signer?.name ||
      (org.owner
        ? `${org.owner.firstName ?? ""} ${org.owner.lastName ?? ""}`.trim() ||
          org.owner.name ||
          ""
        : "");
    if (signerName) setImePoslodavca(signerName);
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
    setRegisterMsg(null);
    setPostDownloadPrompt(null);
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
    setRazlogOtkazaId("drugo");
    setRazlogOtkazaCustom("");
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
    // Pravna osnova ide u preambulu "Na osnovu __ Zakona o radu FBiH..."
    // Za "Drugo" nemamo specifičan član — koristimo "Zakona o radu" kao default.
    pravna_osnova: razlogDef?.pravnaOsnova || "Zakona o radu",
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
    if (!brutoPlata && !netoPlata)
      return "Unesite bruto ili neto platu.";
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

  // Osigurava da radnik postoji kao entitet i vraća njegov id. Ako je radnik
  // odabran u sidebar-u → vrati njegov id. Inače, ako imamo organizaciju + ime +
  // JMBG, AUTO-KREIRAJ radnika iz podataka forme (rješava: "ako prvo napravim
  // ugovor/JS3100, radnik se ne doda u aktivne radnike"). Vraća null ako nema
  // dovoljno podataka za kreiranje.
  const ensureWorkerId = async (): Promise<number | null> => {
    if (selectedWorker) return selectedWorker.id;
    if (!sidebarOrgId) {
      showError("Odaberite organizaciju (sidebar) prije snimanja radnika.");
      return null;
    }
    const ime = imeRadnika.trim();
    if (!ime) {
      showError("Unesite ime i prezime radnika.");
      return null;
    }
    if (!jmbgRadnika || jmbgRadnika.length !== 13) {
      showError("JMBG radnika mora imati 13 cifara da bi se radnik kreirao.");
      return null;
    }
    const parts = ime.split(/\s+/);
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ") || firstName;
    const startDate = datumPocetkaIso || todayIso();
    try {
      // startDate zadovoljava backend zahtjev (RADNIK treba startDate ILI
      // prijavaDate). NE šaljemo prijavaDate → radnik se kreira kao DRAFT;
      // PRIJAVLJEN postaje tek kad se uradi JS3100 prijava.
      const created = await unwrap(
        createWorker(sidebarOrgId, {
          role: "RADNIK",
          firstName,
          lastName,
          jmbg: jmbgRadnika,
          startDate,
          // Spol se izvodi iz JMBG-a (kao kod dodavanja radnika) — datum
          // rođenja se uvijek derivira iz JMBG-a pa se ne čuva zasebno.
          spol: spolFromJmbg(jmbgRadnika),
          address: adresaRadnika.trim() || undefined,
          bankAccount: ziroRadnika.trim() || undefined,
          ...buildEmploymentPayload(),
        }),
      );
      setSelectedWorker(created);
      setSidebarWorkerId(created.id);
      queryClient.invalidateQueries({ queryKey: ["workers", sidebarOrgId] });
      queryClient.invalidateQueries({ queryKey: ["allMyWorkers"] });
      return created.id;
    } catch (e) {
      showError("Greška pri kreiranju radnika: " + (e as Error).message);
      return null;
    }
  };

  // Snima employment podatke na radnika; auto-kreira radnika ako ne postoji.
  // Vraća workerId (ili null ako nije moglo). Async da bi se moglo čekati prije
  // navigacije na JS3100 stranicu.
  const persistWorker = async (
    extra: Partial<WorkerPayload> = {},
  ): Promise<number | null> => {
    const workerId = await ensureWorkerId();
    if (!workerId || !sidebarOrgId) return null;
    await syncWorkerMutation.mutateAsync({
      orgId: sidebarOrgId,
      workerId,
      payload: { ...buildEmploymentPayload(), ...extra },
    });
    return workerId;
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

  // Umjesto inline generisanja JS3100 (gdje fali pola polja koja nisu u ugovoru),
  // snimi radnika (auto-kreiraj ako treba) pa preusmjeri na punu JS3100 stranicu
  // sa deep-linkom (?worker=&vrsta=). Tamo se sve auto-popuni iz radnika, a user
  // dopuni JS3100-specifična polja (osnov osiguranja, zanimanje, sati...).
  const handleGoToJs3100 = async (vrsta: Js3100Vrsta) => {
    if (!canGenerate) return;
    if (!imeRadnika) {
      showError("Unesite radnika prije nastavka na JS3100.");
      return;
    }
    if (!jmbgRadnika || jmbgRadnika.length !== 13) {
      showError("JMBG radnika mora imati 13 cifara za JS3100 obrazac.");
      return;
    }
    setError(null);
    setGen("pdf");
    try {
      // Snimi ugovorne podatke + osiguraj da radnik postoji (auto-create).
      const workerId = await persistWorker();
      if (!workerId) return; // persistWorker je već prikazao grešku
      setPostDownloadPrompt(null);
      const params = new URLSearchParams({
        worker: String(workerId),
        vrsta,
      });
      if (sidebarOrgId) params.set("org", String(sidebarOrgId));
      router.push(`/prijave-radnika?${params.toString()}`);
    } catch (e) {
      showError("Greška: " + (e as Error).message);
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
      trackEvent("UGOVOR_RADU_GENERATE", "Ugovor o radu", sidebarOrgId);
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
      trackEvent("OTKAZ_GENERATE", "Otkaz ugovora o radu", sidebarOrgId);
      archiveDocument(blob, filename, "OTKAZ", kind === "docx" ? "DOCX" : "PDF", brojUgovora);
      persistWorker();
      setPostDownloadPrompt("odjava");
    } catch (e) {
      showError("Greška pri generisanju: " + (e as Error).message);
    } finally {
      setGen(null);
    }
  };

  // "Samo dodaj kao aktivnog / Samo odjavi" — postavi status u aplikaciji bez
  // JS3100 dokumenta. Auto-kreira radnika ako treba (DRAFT → PRIJAVLJEN).
  // NAPOMENA: ovo NE predaje JS3100 Poreznoj — to korisnik radi zasebno.
  const handleRegisterWithoutJs3100 = async (vrsta: Js3100Vrsta) => {
    if (!canGenerate) return;
    if (!imeRadnika) {
      showError("Unesite radnika prije dodavanja.");
      return;
    }
    if (!jmbgRadnika || jmbgRadnika.length !== 13) {
      showError("JMBG radnika mora imati 13 cifara.");
      return;
    }
    setError(null);
    setGen("pdf");
    try {
      const today = todayIso();
      const statusExtra: Partial<WorkerPayload> =
        vrsta === "PRIJAVA"
          ? {
              employmentStatus: "PRIJAVLJEN",
              prijavaDate: today,
              odjavaDate: null,
              endDate: null,
            }
          : {
              employmentStatus: "ODJAVLJEN",
              odjavaDate: datumPrestankaIso || today,
              endDate: datumPrestankaIso || today,
            };
      const workerId = await persistWorker(statusExtra);
      if (!workerId) return;
      setPostDownloadPrompt(null);
      setRegisterMsg(
        vrsta === "PRIJAVA"
          ? "Radnik je dodan kao aktivan (Prijavljen) u aplikaciji. JS3100 predajte Poreznoj upravi zasebno (osim ako ste već)."
          : "Radnik je označen kao Odjavljen u aplikaciji. JS3100 odjavu predajte Poreznoj upravi zasebno (osim ako ste već).",
      );
    } catch (e) {
      showError("Greška: " + (e as Error).message);
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
              Ugovor o radu i <em>otkaz</em> (FBiH), predložak
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
          onClick={() => {
            setTab("ugovor");
            setRegisterMsg(null);
            setPostDownloadPrompt(null);
          }}
        >
          Ugovor o radu
        </button>
        <button
          type="button"
          className={`${uorStyles.tab} ${tab === "otkaz" ? uorStyles.tabActive : ""}`}
          onClick={() => {
            setTab("otkaz");
            setRegisterMsg(null);
            setPostDownloadPrompt(null);
          }}
        >
          Otkaz ugovora
        </button>
      </div>

      {/* Ugovorne strane, uvijek vidljivo */}
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
                placeholder="Npr. Firma d.o.o. / Obrt"
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
                placeholder="Npr. Ime i prezime"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Adresa</span>
              <input
                className={styles.input}
                value={adresaRadnika}
                onChange={(e) => setAdresaRadnika(e.target.value)}
                placeholder="Npr. Ulica i broj"
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
              {jmbgRadnika.length === 13 &&
                isJmbgValid(jmbgRadnika) &&
                (() => {
                  // JMBG validan → prikaži izvedeni spol + datum rođenja (isto
                  // kao kod dodavanja radnika). Vrijednosti se zapisuju na
                  // radnika pri kreiranju (vidi ensureWorkerId).
                  const info = parseJmbg(jmbgRadnika);
                  const dob = info.birthDateIso
                    ? info.birthDateIso.split("-").reverse().join(".") + "."
                    : "";
                  const spolLabel = info.spol === "Z" ? "Žensko" : "Muško";
                  return (
                    <p style={{ fontSize: 12, color: "var(--mid)", margin: "0.3rem 0 0" }}>
                      Spol: <strong>{spolLabel}</strong> · Datum rođenja:{" "}
                      <strong>{dob}</strong>
                    </p>
                  );
                })()}
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
                <StyledSelect
                  value={tipUgovora}
                  onChange={(v) => {
                    const t = String(v ?? "") as TipUgovora;
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
                  groups={[
                    {
                      options: [
                        { value: "neodredjeno", label: "Neodređeno vrijeme" },
                        { value: "odredjeno", label: "Određeno vrijeme" },
                      ],
                    },
                  ]}
                  ariaLabel="Tip ugovora"
                  wrapStyle={{ width: "100%" }}
                />
              </label>
              {tipUgovora === "odredjeno" && (
                <>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Trajanje ugovora</span>
                    <div className={uorStyles.inlineFields}>
                      <StyledSelect
                        value={trajanjeBroj}
                        onChange={(val) => {
                          const v = Number(val);
                          setTrajanjeBroj(v);
                          const end = computeEndIso(datumPocetkaIso, v, trajanjeJedinica);
                          if (end) setDatumIstekaIso(end);
                        }}
                        groups={[
                          {
                            options: Array.from(
                              { length: maxTrajanjeBroj(trajanjeJedinica) },
                              (_, i) => i + 1,
                            ).map((n) => ({ value: n, label: String(n) })),
                          },
                        ]}
                        ariaLabel="Broj (trajanje ugovora)"
                        wrapStyle={{ flex: "0 0 90px" }}
                      />
                      <StyledSelect
                        value={trajanjeJedinica}
                        onChange={(v) => {
                          const j = String(v ?? "") as TrajanjeJedinica;
                          setTrajanjeJedinica(j);
                          const capped = Math.min(trajanjeBroj, maxTrajanjeBroj(j));
                          if (capped !== trajanjeBroj) setTrajanjeBroj(capped);
                          const end = computeEndIso(datumPocetkaIso, capped, j);
                          if (end) setDatumIstekaIso(end);
                        }}
                        groups={[
                          {
                            options: [
                              { value: "mjeseci", label: "mjeseci" },
                              { value: "godine", label: "godine" },
                            ],
                          },
                        ]}
                        ariaLabel="Jedinica (trajanje ugovora)"
                        wrapStyle={{ flex: "1 1 auto" }}
                      />
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
                      <StyledSelect
                        value={probniRadMjeseci}
                        onChange={(v) => setProbniRadMjeseci(Number(v))}
                        groups={[
                          {
                            options: [1, 2, 3, 4, 5, 6].map((m) => ({
                              value: m,
                              label: String(m),
                            })),
                          },
                        ]}
                        ariaLabel="Trajanje probnog rada (mjeseci)"
                        wrapStyle={{ width: "100%" }}
                      />
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
                  Možete unijeti bruto, neto, ili oba iznosa, obrazac će se ispisati
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
              onClick={() => handleGoToJs3100("PRIJAVA")}
              disabled={gen !== null || !canGenerate}
              title={canGenerate ? "Snima radnika i otvara JS3100 prijavu sa svim podacima, tamo dopuniš osnov osiguranja, zanimanje itd." : "Dostupno uz Business pretplatu"}
            >
              {IconForm} Nastavi na JS3100 prijavu
            </button>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => handleRegisterWithoutJs3100("PRIJAVA")}
              disabled={gen !== null || !canGenerate}
              title={canGenerate ? "Označava radnika kao aktivnog u aplikaciji bez generisanja JS3100 (JS3100 predajete Poreznoj zasebno)" : "Dostupno uz Business pretplatu"}
            >
              Dodaj kao aktivnog radnika
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--mid)", textAlign: "center", margin: "0.75rem auto 0", maxWidth: 620, lineHeight: 1.5 }}>
            „Dodaj kao aktivnog radnika" označava radnika kao prijavljenog samo u
            aplikaciji. JS3100 morate zasebno predati Poreznoj upravi (osim ako
            ste već).
          </p>

          {postDownloadPrompt === "prijava" && (
            <div className={uorStyles.promptBanner}>
              <span>✓ Ugovor preuzet. Kako želiš prijaviti radnika?</span>
              <div className={uorStyles.promptActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => handleGoToJs3100("PRIJAVA")}
                  disabled={gen !== null}
                >
                  Nastavi na JS3100 prijavu
                </button>
                <button
                  type="button"
                  className={styles.btnOutline}
                  onClick={() => handleRegisterWithoutJs3100("PRIJAVA")}
                  disabled={gen !== null}
                  title="Označava radnika kao aktivnog u aplikaciji bez generisanja JS3100 obrasca"
                >
                  Samo dodaj kao aktivnog radnika
                </button>
                <button
                  type="button"
                  className={uorStyles.promptDismiss}
                  onClick={() => setPostDownloadPrompt(null)}
                >
                  Preskoči
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--mid)", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
                „Samo dodaj kao aktivnog" označava radnika kao prijavljenog samo
                u aplikaciji. JS3100 morate zasebno predati Poreznoj upravi
                (osim ako ste već).
              </p>
            </div>
          )}
          {registerMsg && (
            <p style={{ fontSize: 13, fontWeight: 500, color: "#2d6e54", textAlign: "center", margin: "0.8rem auto 0", maxWidth: 560, lineHeight: 1.5 }}>
              {registerMsg}
            </p>
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
                <StyledSelect
                  value={razlogOtkazaId}
                  onChange={(v) =>
                    setRazlogOtkazaId(String(v ?? "") as RazlogOtkazaId)
                  }
                  groups={[
                    {
                      options: RAZLOZI_OTKAZA.map((r) => ({
                        value: r.id,
                        label: `${r.label}${r.clan ? `, ${r.clan}` : ""}`,
                      })),
                    },
                  ]}
                  ariaLabel="Razlog otkaza"
                  wrapStyle={{ width: "100%" }}
                />
                {razlogOtkazaId !== "drugo" && razlogDef && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.6rem 0.85rem",
                      borderRadius: 8,
                      background: "rgba(58, 92, 66, 0.08)",
                      border: "1px solid rgba(58, 92, 66, 0.25)",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: "var(--ink)",
                    }}
                  >
                    <strong style={{ color: "var(--sage)" }}>
                      Zakonska osnova: {razlogDef.clan} ZoR FBiH
                    </strong>
                    <p style={{ margin: "0.3rem 0 0", color: "var(--mid)" }}>
                      Ova rečenica će biti uključena u odluku o otkazu kao
                      obrazloženje sa referencom na član zakona.
                    </p>
                  </div>
                )}
                {razlogOtkazaId === "drugo" && (
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={razlogOtkazaCustom}
                    onChange={(e) => setRazlogOtkazaCustom(e.target.value)}
                    placeholder="Upiši razlog otkaza i član zakona ako je primjenjivo..."
                    style={{ marginTop: "0.5rem" }}
                  />
                )}
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
              onClick={() => handleGoToJs3100("ODJAVA")}
              disabled={gen !== null || !canGenerate}
              title={canGenerate ? "Snima radnika i otvara JS3100 odjavu sa svim podacima" : "Dostupno uz Business pretplatu"}
            >
              {IconForm} Nastavi na JS3100 odjavu
            </button>
            <button
              type="button"
              className={styles.btnOutline}
              onClick={() => handleRegisterWithoutJs3100("ODJAVA")}
              disabled={gen !== null || !canGenerate}
              title={canGenerate ? "Označava radnika kao odjavljenog u aplikaciji bez generisanja JS3100 (JS3100 predajete Poreznoj zasebno)" : "Dostupno uz Business pretplatu"}
            >
              Odjavi radnika
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--mid)", textAlign: "center", margin: "0.75rem auto 0", maxWidth: 620, lineHeight: 1.5 }}>
            „Odjavi radnika" mijenja status samo u aplikaciji. JS3100 odjavu
            morate zasebno predati Poreznoj upravi (osim ako ste već).
          </p>

          {postDownloadPrompt === "odjava" && (
            <div className={uorStyles.promptBanner}>
              <span>✓ Otkaz preuzet. Kako želiš odjaviti radnika?</span>
              <div className={uorStyles.promptActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => handleGoToJs3100("ODJAVA")}
                  disabled={gen !== null}
                >
                  Nastavi na JS3100 odjavu
                </button>
                <button
                  type="button"
                  className={styles.btnOutline}
                  onClick={() => handleRegisterWithoutJs3100("ODJAVA")}
                  disabled={gen !== null}
                  title="Označava radnika kao odjavljenog u aplikaciji bez generisanja JS3100 obrasca"
                >
                  Samo odjavi radnika
                </button>
                <button
                  type="button"
                  className={uorStyles.promptDismiss}
                  onClick={() => setPostDownloadPrompt(null)}
                >
                  Preskoči
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--mid)", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
                „Samo odjavi radnika" mijenja status samo u aplikaciji. JS3100
                odjavu morate zasebno predati Poreznoj upravi (osim ako ste već).
              </p>
            </div>
          )}
          {registerMsg && (
            <p style={{ fontSize: 13, fontWeight: 500, color: "#2d6e54", textAlign: "center", margin: "0.8rem auto 0", maxWidth: 560, lineHeight: 1.5 }}>
              {registerMsg}
            </p>
          )}
        </>
      )}

      <p className={styles.disclaimer}>
        Predložak je informativan, usklađen sa Zakonom o radu FBiH („Službene
        novine FBiH“, br. 26/16, 89/18, 44/22 i 39/24). Provjerite tačnost
        prije potpisivanja.
      </p>

      {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta je <em>ugovor o radu</em>?
        </h2>
        <p>
          <strong>Ugovor o radu</strong> je pisani dokument kojim poslodavac i
          radnik zasnivaju radni odnos u Federaciji BiH. Regulisan je{" "}
          <em>Zakonom o radu FBiH</em> („Službene novine FBiH“, br. 26/16,
          89/18, 44/22 i 39/24) i mora biti zaključen prije početka rada
          radnika.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Usmeni dogovor o radu se po zakonu smatra ugovorom na neodređeno
          vrijeme, pisana forma štiti i radnika (jasna prava) i poslodavca
          (definisani uslovi i mogućnost otkaza). Ugovor se obavezno prijavljuje
          PIO/MIO i Zavodu zdravstvenog osiguranja kroz JS3100 obrazac.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Obavezni <em>elementi</em> ugovora o radu
        </h2>
        <p>Prema članu 21. Zakona o radu FBiH, ugovor o radu obavezno sadrži:</p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li><strong>Ugovorne strane</strong>, naziv poslodavca i ime radnika sa identifikacionim podacima.</li>
          <li><strong>Datum početka rada</strong> i mjesto rada.</li>
          <li><strong>Naziv radnog mjesta</strong> i opis poslova koje radnik obavlja.</li>
          <li><strong>Trajanje ugovora</strong>, neodređeno ili određeno (sa rokom).</li>
          <li><strong>Trajanje radnog vremena</strong>, puno (40h sedmično) ili nepuno.</li>
          <li><strong>Iznos osnovne plate</strong>, bruto i/ili neto, te uslovi povećanja.</li>
          <li><strong>Trajanje godišnjeg odmora</strong>, minimum 20 radnih dana godišnje.</li>
          <li><strong>Otkazni rok</strong>, minimum 7 dana, tipično 30 dana.</li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          Nedostatak obaveznih elemenata ne čini ugovor ništavnim, ali se nedostajući
          elementi popunjavaju po zakonskim minimumima.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Vrste ugovora o radu, <em>neodređeno, određeno, probni rad</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Na neodređeno vrijeme</strong>, standardni oblik zaposlenja
            bez unaprijed određenog roka prestanka. Pruža maksimalnu zaštitu
            radniku.
          </li>
          <li>
            <strong>Na određeno vrijeme</strong>, zaključuje se uz konkretan
            razlog (sezonski rad, zamjena odsutnog radnika, projekat).{" "}
            <strong>Maksimalno 3 godine uzastopno</strong>; nakon toga se ugovor
            automatski transformiše u ugovor na neodređeno.
          </li>
          <li>
            <strong>Probni rad</strong>, može trajati <strong>najduže 6
            mjeseci</strong>, tipično 3 mjeseca. Ako nije izričito ugovoren,
            smatra se da je radnik primljen bez probnog rada. Tokom probnog rada
            otkazni rok je 7 dana.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Otkaz i prestanak <em>radnog odnosa</em>
        </h2>
        <p>Ugovor o radu prestaje:</p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Sporazumno</strong>, pisanim sporazumom obje strane (bez
            otkaznog roka).
          </li>
          <li>
            <strong>Istekom roka</strong>, kod ugovora na određeno, automatski
            kad istekne rok.
          </li>
          <li>
            <strong>Otkazom radnika</strong>, radnik podnosi pisanu obavijest
            o otkazu uz poštivanje otkaznog roka.
          </li>
          <li>
            <strong>Otkazom poslodavca</strong>, sa zakonom propisanim razlogom
            (poslovni razlozi, povreda radne discipline, nesposobnost).
            Poslodavac je dužan da obrazloži otkaz i poštuje otkazni rok.
          </li>
          <li>
            <strong>Smrću radnika</strong>, gubitkom radne sposobnosti ili
            ispunjenjem uslova za penziju.
          </li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          Pri prestanku radnog odnosa poslodavac je dužan da u roku od{" "}
          <strong>7 dana</strong> podnese odjavu JS3100 PIO/MIO i Zavodu
          zdravstvenog osiguranja.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Kako popuniti ugovor o radu u <em>4 koraka</em>
        </h2>
        <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Odaberite radnika i poslodavca</strong> iz sidebar-a, podaci
            poslodavca, radnika i plate auto-popunjavaju se iz profila. Ako
            radnik nije u sistemu, dodajte ga preko "+ Novi radnik".
          </li>
          <li>
            <strong>Vrsta ugovora</strong>, neodređeno, određeno (sa rokom)
            ili probni rad. Naslov i tekst Člana 1 automatski se prilagođavaju.
          </li>
          <li>
            <strong>Plata i otkazni rok</strong>, upišite osnovnu bruto/neto
            platu, otkazni rok (default 30 dana) i ostale obavezne elemente.
          </li>
          <li>
            <strong>Preuzmite ugovor</strong> u Word (DOCX) ili PDF formatu,
            popunjen i spreman za potpis. Po želji preuzmite i JS3100 obrazac
            za prijavu radnika u sistem PIO/ZZO.
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Povezani <em>alati</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          <li>
            <a href="/prijave-radnika" style={{ color: "var(--sage)", fontWeight: 600 }}>
              JS3100, prijava/odjava radnika
            </a>,{" "}
            obavezna prijava u PIO/MIO i Zavod zdravstvenog dan prije početka
            rada.
          </li>
          <li>
            <a href="/aktivni-radnici" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Aktivni radnici
            </a>,{" "}
            centralni pregled radnika sa ugovorima i statusom.
          </li>
          <li>
            <a href="/prijave-radnika?tab=obracun" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Obračun plata
            </a>,{" "}
            mjesečni obračun plata, doprinosa i poreza za radnike.
          </li>
          <li>
            <a href="/ugovor-o-djelu" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Ugovor o djelu
            </a>,{" "}
            alternativa ugovoru o radu za jednokratne ili projektne angažmane.
          </li>
          <li>
            <a href="/preracun-neto-bruto" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Preračun neto/bruto plate
            </a>,{" "}
            provjera obračuna prije ugovaranja iznosa plate.
          </li>
        </ul>
        <h2 className={styles.sectionTitle} style={{ marginTop: "2rem" }}>
          Pročitaj <em>na blogu</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          <li>
            <a href="/blog/otkaz-radnika-fbih" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Otkaz radnika u FBiH
            </a>,{" "}
            razlozi, otkazni rokovi i postupak po Zakonu o radu.
          </li>
          <li>
            <a href="/blog/ugovor-o-djelu-vs-ugovor-o-radu" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Ugovor o djelu vs ugovor o radu
            </a>,{" "}
            koja vrsta angažmana odgovara kojoj situaciji.
          </li>
        </ul>
      </section>

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
            a: "Ugovor na određeno se zaključuje kada postoji konkretan razlog (sezonski rad, zamjena odsutnog radnika, projekat). Maksimalno trajanje uzastopnih ugovora na određeno je 3 godine, nakon toga se ugovor automatski transformiše u ugovor na neodređeno.",
          },
          {
            q: "Šta moram navesti u odluci o prestanku radnog odnosa?",
            a: "Odluka o prestanku mora sadržavati: identifikaciju poslodavca i radnika, broj i datum originalnog ugovora, datum prestanka radnog odnosa, te pravni osnov i razlog prestanka. Odluka se dostavlja radniku, nadležnoj službi za zapošljavanje i arhivi.",
          },
          {
            q: "Koliki je otkazni rok u FBiH?",
            a: "Otkazni rok zavisi od dužine staža kod poslodavca, minimalno 14 dana, a maksimalno 3 mjeseca (kod staža preko 20 godina). Ako se otkaz daje sporazumno ili iz krivice radnika, otkazni rok se može skratiti ili u potpunosti izostaviti.",
          },
        ]}
      />
        </main>
      </div>
    </div>
  );
}
