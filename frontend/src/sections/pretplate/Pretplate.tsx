"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconInbox,
  IconArrowsExchange,
  IconCoins,
  IconReceiptTax,
  IconFileText,
  IconFileInvoice,
  IconPackage,
  IconBuildingBank,
  IconTransfer,
  IconBriefcase,
} from "@tabler/icons-react";
import { me, unwrap, type AuthUser } from "src/api/auth";
import {
  useOfficeTrial,
  OFFICE_TRIAL_REGISTER_URL,
} from "src/components/OfficeTrialCta/OfficeTrialCta";
import { objaviTrialAktiviran } from "src/components/TrialToast/TrialToast";
import styles from "./pretplate.module.css";
import {
  createPredracun,
  type Plan,
  type BuyerInput,
} from "src/api/backend/predracun/predracun";
import {
  PLAN_PRICING,
  OFFICE_PLANS,
  officePlanForCount,
  annualSavings,
  iznosiZaPlan,
  SAMO_GODISNJE,
  obrtaTekst,
  formatKm as fmt,
  type BillingCycle,
} from "src/data/pricing";
import { sendContactForm } from "src/api/backend/contactForm/contactForm";
import { PK_OFFICE_DASHBOARD_URL } from "src/lib/pkOfficeUrl";
import { getPkOfficePristup, startPkOfficeTrial } from "src/api/pkOffice";
import { OfficeTrialLink } from "src/components/OfficeTrialLink/OfficeTrialLink";
import CitySelect from "src/components/CitySelect/CitySelect";
import { useCityLookup } from "src/hooks/useCities";
import BuyerFillSelect, {
  type BuyerFillData,
} from "src/components/BuyerFillSelect/BuyerFillSelect";

// ── Paketi ───────────────────────────────────────────────────────────────────
// Cijene dolaze iz src/data/pricing.ts (PLAN_PRICING) po ciklusu naplate.
const PLANS: {
  id: Plan;
  tier: string;
  features: string[];
  variant: "pro" | "business" | "freelancer";
  tag: string;
}[] = [
  {
    // PK Freelancer: fizička lica, cijena BRUTO (sa PDV-om), samo godišnje
    id: "FREELANCER",
    tier: "PK Freelancer",
    variant: "freelancer",
    tag: "Za freelancere",
    features: [
      "Evidencija uplata iz inostranstva bez ograničenja",
      "AMS-1035 i tri uplatnice iz evidencije, ponovno preuzimanje",
      "Podsjetnici na rok od 5 dana i na GPD u martu",
      "Kurs CBBiH po datumu primitka (USD, GBP...)",
      "GPD-1051 popunjen iz evidencije jednim klikom",
      "Pregled prihoda (PDF) za banku, ambasadu ili stan",
      "Arhiva ovjerenih obrazaca i dokaza uplate",
      "Isplatioci bez ograničenja",
    ],
  },
  {
    id: "PRO",
    tier: "Pro",
    variant: "pro",
    tag: "Za obrtnike",
    features: [
      "Sve iz besplatnog plana",
      "Šihterica: evidencija radnog vremena",
      "Više vlastitih djelatnosti",
      "Do 20 klijenata i fizičkih lica",
      "Prijave i odjave radnika, JS3100 obrazac",
      "Obračun plata za vlasnika i zaposlene",
      "Fakture, računi i predračuni",
    ],
  },
  {
    id: "BUSINESS",
    tier: "Business",
    variant: "business",
    tag: "Za knjigovođe",
    features: [
      "Sve iz Pro plana",
      "Neograničeno klijenata i fizičkih lica",
      "Radnici po klijentu, obrasci se popunjavaju sami",
      "Tim: više korisnika na istom nalogu",
      "Ugovor o radu i odluka o otkazu, sa numeracijom",
      "Ugovori o djelu sa obračunom poreza i doprinosa",
      "Rješenja, odluke i potvrde (godišnji, regres, otpremnina...)",
      "Prioritetna podrška",
    ],
  },
];

type Status = "idle" | "sending" | "done" | "error";

// "1 radni dan" / "2-4 radna dana" / "5+ radnih dana"
function radniDani(n: number): string {
  if (n === 1) return "1 radni dan";
  if (n >= 2 && n <= 4) return `${n} radna dana`;
  return `${n} radnih dana`;
}

// naziv plana za summary/dugme (Office planovi nose i limit obrta)
const PLAN_LABELS: Record<Plan, string> = {
  PRO: "Pro",
  BUSINESS: "Business",
  FREELANCER: "PK Freelancer",
  OFFICE_1: "Office Solo (1 obrt)",
  OFFICE_2: "Office Start (do 2 obrta)",
  OFFICE_10: "Office Tim (do 10 obrta)",
  OFFICE_25: "Office Agencija (do 25 obrta)",
  OFFICE_50: "Office Agencija+ (do 50 obrta)",
};

// PK Office funkcije: dvije udarne + ostatak (sve su u SVAKOM paketu);
// ikonice su iste koje koristi i sam PK Office
type OfficeFeature = {
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number }>;
};

const OFFICE_HERO_FEATURES: OfficeFeature[] = [
  {
    icon: IconInbox,
    title: "Grupni uvoz izvoda za sve obrte",
    desc: "Ubaci PDF izvode svih obrta odjednom: svaki izvod se sam prepozna po žiro računu, rasporedi na svoj obrt i preskoči ako je već uvezen. Najveća ušteda vremena za knjigovođe.",
  },
  {
    icon: IconArrowsExchange,
    title: "Automatsko knjiženje",
    desc: "Transakcije sa izvoda se same kategorišu, vežu za partnere i zatvaraju fakture i ulazne račune. KPR, KUF i KIF se pune sami, ti samo potvrdiš.",
  },
];

const OFFICE_FEATURES: OfficeFeature[] = [
  { icon: IconCoins, title: "Obračun plata", desc: "Plate, listići na email, uplatnice, MIP-1023, 2001/2002, nalog za knjiženje i doprinosi vlasnika" },
  { icon: IconReceiptTax, title: "PDV evidencije", desc: "KUF/KIF, PDV prijava, e-KUF/e-KIF, D-PDV" },
  { icon: IconFileText, title: "KPR i obrasci", desc: "Knjiga prihoda i rashoda; SPR, GPD, ČOK i ONŠ iz knjiga" },
  { icon: IconFileInvoice, title: "Fakture i partneri", desc: "Fakture, kartice kupaca i dobavljača, kompenzacije" },
  { icon: IconPackage, title: "Roba", desc: "Kalkulacije (KCM), lager lista, popis i TKM" },
  { icon: IconBuildingBank, title: "Blagajna i putni nalozi", desc: "Nalozi, dnevnik i dnevnice po pravilima" },
  { icon: IconTransfer, title: "Migracija iz starog programa", desc: "Besplatan uvoz artikala, partnera i izvoda" },
  { icon: IconBriefcase, title: "Business funkcije uključene", desc: "Ugovori, rješenja, radnici i tim; od paketa Tim neograničeno" },
];

export default function Pretplate() {
  // ── Pristup ──────────────────────────────────────────────────────────────
  // Stranica je javna: i neregistrovani korisnici vide pakete i trial karticu.
  // Ako neregistrovan klikne probu, vodimo ga na registraciju sa
  // ?next=/pretplate?officeTrial=auto, pa se proba sama aktivira nakon
  // verifikacije maila.
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const trialParam = params.get("trial");
  const [trialStatus, setTrialStatus] = useState<
    "idle" | "starting" | "done" | "error"
  >("idle");
  const [trialError, setTrialError] = useState("");

  const {
    data: user,
    isLoading: userLoading,
  } = useQuery<AuthUser>({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });

  const isAnonymous = !userLoading && !user;
  // Postoji samo JEDNA proba: PK Office (30 dana, nivo Office Tim), a uz nju
  // idu i sve Business funkcije na marketing dijelu. Stari PRO trial linkovi
  // (?trial=1, ?trial=auto) vode na istu aktivaciju.
  const { available: officeTrialMoguc } = useOfficeTrial();
  const trialEligible = isAnonymous || officeTrialMoguc;

  const handleStartTrial = async () => {
    // Neregistrovan: vodi na registraciju, proba se aktivira nakon verifikacije.
    if (isAnonymous) {
      router.push(OFFICE_TRIAL_REGISTER_URL);
      return;
    }
    setTrialError("");
    setTrialStatus("starting");
    const res = await startPkOfficeTrial();
    if (!res.ok) {
      setTrialStatus("error");
      setTrialError(
        res.error === "TRIAL_ALREADY_USED"
          ? "Već ste iskoristili besplatan probni period."
          : res.error === "ALREADY_SUBSCRIBED"
            ? "Već imate aktivnu pretplatu."
            : res.error || "Greška pri aktiviranju.",
      );
      return;
    }
    setTrialStatus("done");
    // potvrda i kad je korisnik doskrolao do PK Office sekcije
    objaviTrialAktiviran(res.data?.trialEndsAt ?? null);
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  // ── PK Office trial (?officeTrial=auto) ───────────────────────────────────
  // Dolazak iz registracije preko PK Office trial CTA. Backend je trial u
  // pravilu već aktivirao pri verifikaciji maila (wantsOfficeTrial); fallback
  // (npr. Google registracija) ga aktivira ovdje. Skrolamo direktno na PK
  // Office sekciju da se preskoči PRO/BUSINESS dio.
  // Auto-aktivacija ide samo na linkove koji dolaze iz registracije/verifikacije
  // (?officeTrial=auto i legacy ?trial=auto). Stari ?trial=1 iz već poslanih
  // mailova i bookmarka SAMO prikazuje ponudu: proba je jednokratna, pa je puko
  // otvaranje linka ne smije potrošiti bez klika.
  const officeTrialAuto =
    params.get("officeTrial") === "auto" || trialParam === "auto";
  const [officeTrialStatus, setOfficeTrialStatus] = useState<
    "idle" | "done" | "subscribed" | "used" | "error"
  >("idle");
  const officeTrialRef = useRef(false);

  useEffect(() => {
    // #pk-office hash: stranica se renderuje klijentski pa browserov native
    // skok na anchor promaši (sekcija još ne postoji u momentu učitavanja).
    const hashOffice =
      typeof window !== "undefined" && window.location.hash === "#pk-office";
    if (!officeTrialAuto && !hashOffice) return;
    // mali delay da se sekcija izrenderuje prije skrola
    const t = setTimeout(() => {
      document
        .getElementById("pk-office")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [officeTrialAuto]);

  useEffect(() => {
    if (!officeTrialAuto || officeTrialRef.current) return;
    if (userLoading || !user) return;
    officeTrialRef.current = true;
    void (async () => {
      // ?trialPlan=solo (blok Solo na /freelancer): proba na nivou Sola
      const res = await startPkOfficeTrial(
        params.get("trialPlan") === "solo" ? "office_1" : null,
      );
      if (res.ok) {
        setOfficeTrialStatus("done");
        return;
      }
      if (res.error === "ALREADY_SUBSCRIBED") {
        setOfficeTrialStatus("subscribed");
        return;
      }
      if (res.error === "TRIAL_ALREADY_USED") {
        // najčešći slučaj: backend ga je već aktivirao pri verifikaciji maila,
        // pa provjerimo da li proba stvarno teče ili je odavno potrošena
        const p = await getPkOfficePristup();
        const ends =
          p.ok && p.data?.trialEndsAt ? new Date(p.data.trialEndsAt) : null;
        setOfficeTrialStatus(ends && ends > new Date() ? "done" : "used");
        return;
      }
      setOfficeTrialStatus("error");
    })();
  }, [officeTrialAuto, userLoading, user]);

  const initialPlan = (params.get("plan") || "").toUpperCase();
  const [selected, setSelected] = useState<Plan>(
    initialPlan in PLAN_PRICING ? (initialPlan as Plan) : "BUSINESS",
  );
  // PK Office kalkulator: broj obrta → predloženi paket
  const [brojObrta, setBrojObrta] = useState(5);
  const predlozeni = officePlanForCount(brojObrta);

  // posebna ponuda za 50+ obrta: kontakt forma u modalu (bez mailto)
  const [ponudaOpen, setPonudaOpen] = useState(false);
  const [ponudaIme, setPonudaIme] = useState("");
  const [ponudaEmail, setPonudaEmail] = useState("");
  const [ponudaPoruka, setPonudaPoruka] = useState("");
  const [ponudaStatus, setPonudaStatus] = useState<Status>("idle");

  function otvoriPonudu() {
    setPonudaStatus("idle");
    setPonudaEmail((prev) => prev || buyer.email || user?.email || "");
    setPonudaPoruka(
      (prev) =>
        prev ||
        "Pozdrav,\n\nvodim više od 50 obrta i zanima me posebna PK Office ponuda.\n\nBroj obrta: \nTrenutni program: ",
    );
    setPonudaOpen(true);
  }

  async function posaljiPonudu(e: React.FormEvent) {
    e.preventDefault();
    setPonudaStatus("sending");
    const res = await sendContactForm({
      ime: ponudaIme,
      email: ponudaEmail,
      poruka: `[PK Office ponuda 50+ obrta]\n\n${ponudaPoruka}`,
    });
    setPonudaStatus(res.ok ? "done" : "error");
  }
  // Ciklus naplate — godišnje je default (bolja ponuda: 2 mjeseca gratis).
  const initialCycle = (params.get("cycle") || "").toLowerCase();
  const [cycle, setCycle] = useState<BillingCycle>(
    initialCycle === "monthly" ? "monthly" : "yearly",
  );
  const priceFor = (plan: Plan) => PLAN_PRICING[plan][cycle];
  // PK Freelancer: kupac je fizičko lice, samo godišnja naplata, cijena bruto
  const jeFizicko = selected === "FREELANCER";
  useEffect(() => {
    if (SAMO_GODISNJE.includes(selected) && cycle !== "yearly") setCycle("yearly");
  }, [selected, cycle]);

  // forma kupca
  const [buyer, setBuyer] = useState<BuyerInput>({
    name: "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
    email: "",
    idNumber: "",
    vatNumber: "",
  });

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultNumber, setResultNumber] = useState("");
  const [isPdvObveznik, setIsPdvObveznik] = useState(false);

  // ── Cities lookup (auto-popuni poštanski broj iz baze) ───────────────────
  const { findByName } = useCityLookup();
  const handleCityChange = (cityName: string) => {
    const match = findByName(cityName);
    setBuyer((prev) => ({
      ...prev,
      city: cityName,
      // ako se grad poklopi sa bazom — auto-popuni poštanski broj
      postalCode: match?.postalCode ?? prev.postalCode,
    }));
  };

  // ── Popuni iz profila / organizacije ──────────────────────────────────────
  const handleFillFromProfile = (data: BuyerFillData) => {
    const cityMatch = data.city ? findByName(data.city) : null;
    setBuyer((prev) => ({
      ...prev,
      name: data.name ?? prev.name,
      address: data.address ?? prev.address,
      city: data.city ?? prev.city,
      // poštanski broj: prvo iz profila, pa lookup po gradu, pa zadržaj postojeći
      postalCode: data.postalCode ?? cityMatch?.postalCode ?? prev.postalCode,
      phone: data.phone ?? prev.phone,
      email: data.email ?? prev.email,
      idNumber: data.idNumber ?? prev.idNumber,
      vatNumber: data.vatNumber ?? prev.vatNumber,
    }));
    if (data.vatNumber) setIsPdvObveznik(true);
  };

  // počisti object URL prilikom unmount-a (curi memorija inače)
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  useEffect(() => {
    return () => {
      if (lastUrl) URL.revokeObjectURL(lastUrl);
    };
  }, [lastUrl]);

  useEffect(() => {
    if (initialPlan in PLAN_PRICING) {
      setSelected(initialPlan as Plan);
    }
  }, [initialPlan]);

  // promjena broja obrta u kalkulatoru odmah selektuje predloženi paket
  function handleBrojObrta(n: number) {
    const v = Math.max(1, Math.min(50, Math.round(n) || 1));
    setBrojObrta(v);
    const p = officePlanForCount(v);
    if (p) setSelected(p.id);
  }

  // Auto-popuni e-mail iz profila kada se korisnik učita (samo ako polje prazno).
  useEffect(() => {
    if (user?.email && !buyer.email) {
      setBuyer((prev) => ({ ...prev, email: user.email ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setStatus("sending");
    const res = await createPredracun(selected, cycle, {
      ...buyer,
      fizickoLice: jeFizicko,
    });
    if (!res.ok) {
      setStatus("error");
      setErrorMsg(res.error || "Došlo je do greške.");
      return;
    }
    setLastUrl(res.pdfUrl);
    setResultNumber(res.fullNumber);
    setStatus("done");
    // otvori PDF u novom tabu odmah
    window.open(res.pdfUrl, "_blank", "noopener");
  };

  const handleField =
    (k: keyof BuyerInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setBuyer({ ...buyer, [k]: e.target.value });

  // ── Loading screen (kratko, dok se ne zna ko je korisnik) ────────────────
  if (userLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.authLoading}>Učitavam…</div>
      </div>
    );
  }

  // Trial karticu uvijek prikazujemo kad je korisnik kvalifikovan (i anonimni),
  // plus nakon uspješne aktivacije da se vidi potvrda.
  // Kad proba ide automatski (?officeTrial=auto / legacy ?trial=*), potvrdu
  // prikazuje traka u PK Office sekciji, pa se kartica gore ne duplira.
  const showTrialCard =
    (trialEligible && !officeTrialAuto) || trialStatus === "done";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Pretplata</div>
        <h1 className={styles.h1}>
          Izaberi <em>plan</em>
        </h1>
        <p className={styles.lead}>
          Predračun stiže na e-mail i automatski se otvara u PDF-u. Nakon uplate
          aktiviramo vaš nalog.
        </p>
      </div>

      {showTrialCard && (
        <div className={styles.trialCard}>
          <span className={styles.trialIcon} aria-hidden="true">
            {trialStatus === "done" ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* briefcase, isti znak kao PK Office */}
                <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
                <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
                <path d="M3 13a20 20 0 0 0 18 0" />
              </svg>
            )}
          </span>
          <div className={styles.trialBody}>
            {trialStatus === "done" ? (
              <>
                <h2 className={styles.trialTitle}>Probni period aktiviran</h2>
                <p className={styles.trialText}>
                  Imate <strong>30 dana</strong> kompletnog PK Office-a (nivo
                  Office Tim, do 10 obrta) i sve Business funkcije na Poreznom
                  Kalkulatoru.
                </p>
              </>
            ) : (
              <>
                <h2 className={styles.trialTitle}>Probaj 30 dana besplatno</h2>
                <p className={styles.trialText}>
                  Proba otključava <strong>PK Office</strong> (knjige, PDV,
                  plate, bankovni izvodi) i{" "}
                  <strong>sve Business funkcije</strong>: plate bez limita,
                  prijave radnika, šihtericu, ugovore, fakture i klijente. Bez
                  kartice, nakon 30 dana se vraćate na besplatan plan.
                </p>
                {trialStatus === "error" && (
                  <p className={styles.trialError}>{trialError}</p>
                )}
              </>
            )}
          </div>
          {trialStatus === "done" ? (
            <a href={PK_OFFICE_DASHBOARD_URL} className={styles.trialBtn}>
              Otvori PK Office →
            </a>
          ) : (
            <button
              type="button"
              className={styles.trialBtn}
              onClick={handleStartTrial}
              disabled={trialStatus === "starting"}
            >
              {isAnonymous
                ? "Registruj se i probaj →"
                : trialStatus === "starting"
                  ? "Aktiviram..."
                  : "Aktiviraj 30 dana besplatno →"}
            </button>
          )}
        </div>
      )}

      {/* ── Billing cycle toggle ────────────────────────────────────────── */}
      <div className={styles.cycleToggle} role="tablist" aria-label="Ciklus naplate">
        <button
          type="button"
          role="tab"
          aria-selected={cycle === "monthly"}
          className={`${styles.cycleBtn} ${cycle === "monthly" ? styles.cycleBtnActive : ""}`}
          onClick={() => setCycle("monthly")}
          disabled={jeFizicko}
          title={jeFizicko ? "PK Freelancer se plaća samo godišnje" : undefined}
        >
          Mjesečno
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={cycle === "yearly"}
          className={`${styles.cycleBtn} ${cycle === "yearly" ? styles.cycleBtnActive : ""}`}
          onClick={() => setCycle("yearly")}
        >
          Godišnje
          <span className={styles.cycleBadge}>2 mjeseca besplatno</span>
        </button>
      </div>

      {/* ── Plan picker ─────────────────────────────────────────────────── */}
      <div className={styles.plansGrid}>
        {PLANS.map((p) => {
          const isActive = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`${styles.card} ${
                p.variant === "pro"
                  ? styles.featuredPro
                  : p.variant === "business"
                    ? styles.featuredBusiness
                    : styles.featuredFreelancer
              } ${isActive ? styles.cardActive : styles.cardInactive}`}
              aria-pressed={isActive}
            >
              <div className={styles.popularTag}>{p.tag}</div>

              <div className={styles.tier}>{p.tier}</div>
              {p.variant === "freelancer" ? (
                <>
                  <div className={styles.price}>
                    {fmt(iznosiZaPlan(p.id, "yearly").gross)} KM
                    <span className={styles.vatSuffix}>sa PDV-om</span>
                  </div>
                  <div className={styles.period}>godišnje, samo godišnja naplata</div>
                  <div className={styles.saveNote}>
                    prvih 30 dana besplatno · AMS generator ostaje besplatan
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.price}>
                    {fmt(priceFor(p.id))} KM
                    <span className={styles.vatSuffix}>+ PDV</span>
                  </div>
                  <div className={styles.period}>
                    {cycle === "monthly" ? "mjesečno" : "godišnje"}
                    {cycle === "yearly" && (
                      <span className={styles.monthlyEq}>
                        oko {Math.floor(PLAN_PRICING[p.id].yearly / 12)} KM mjesečno
                      </span>
                    )}
                  </div>
                  {cycle === "yearly" && (
                    <div className={styles.saveNote}>
                      2 mjeseca besplatno · ušteda {fmt(annualSavings(p.id))} KM
                    </div>
                  )}
                </>
              )}

              <div className={styles.divider} />

              <ul className={styles.features}>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <div className={styles.selectIndicator}>
                {isActive ? (
                  <>
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="10" cy="10" r="8" />
                      <path d="M6 10l3 3 5-6" />
                    </svg>
                    Izabrano
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="10" cy="10" r="8" />
                    </svg>
                    Izaberi
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── PK Office paketi (naplata po broju obrta) ───────────────────── */}
      <section className={styles.officeSection} id="pk-office">
        <div className={styles.officeHeader}>
          <span className={styles.officeBadge}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#fff",
              }}
            />
            PK Office
          </span>
          <h2 className={styles.officeTitle}>
            Kompletno knjigovodstvo obrta. Cijena po broju obrta.
          </h2>
          <p className={styles.officeLead}>
            <strong>Office Solo</strong> je za obrtnika koji vodi knjige sam
            sebi (jedan obrt, jednostavan meni i mjesečna lista obaveza),{" "}
            <strong>Office Start</strong> daje sve funkcije za do 2 obrta, a
            paketi <strong>Tim i veći</strong> uz PK Office knjigovodstvo
            uključuju i <strong>kompletan Business bez ograničenja</strong>{" "}
            (neograničeni klijenti na obrascima, ugovorima i platama). 30 dana
            besplatne probe i besplatna migracija podataka iz starog programa.
          </p>
        </div>

        {/* potvrda nakon dolaska iz registracije (?officeTrial=auto) */}
        {officeTrialStatus !== "idle" && (
          <div
            className={`${styles.officeTrialBanner} ${
              officeTrialStatus === "error" || officeTrialStatus === "used"
                ? styles.officeTrialBannerWarn
                : ""
            }`}
          >
            {officeTrialStatus === "done" && (
              <>
                <strong>Probni period je aktiviran!</strong> Imaš 30 dana
                kompletnog PK Office-a (nivo Office Tim, do 10 obrta), bez
                kartice i bez obaveze.
              </>
            )}
            {officeTrialStatus === "subscribed" && (
              <>
                <strong>Već imaš PK Office pristup.</strong> Slobodno nastavi u
                aplikaciju.
              </>
            )}
            {officeTrialStatus === "used" && (
              <>
                <strong>Probni period je već iskorišten.</strong> Izaberi paket
                ispod i pošalji zahtjev za predračun.
              </>
            )}
            {officeTrialStatus === "error" && (
              <>
                <strong>Greška pri aktivaciji probe.</strong> Pokušaj ponovo iz
                aplikacije ili nam se javi.
              </>
            )}
            {(officeTrialStatus === "done" ||
              officeTrialStatus === "subscribed") && (
              <a
                href={PK_OFFICE_DASHBOARD_URL}
                className={styles.officeTrialBannerBtn}
              >
                Otvori PK Office →
              </a>
            )}
          </div>
        )}

        {/* ciklus naplate i ovdje, da se ne promaši da postoji i mjesečno */}
        <div
          className={styles.cycleToggle}
          role="tablist"
          aria-label="Ciklus naplate PK Office"
        >
          <button
            type="button"
            role="tab"
            aria-selected={cycle === "monthly"}
            className={`${styles.cycleBtn} ${cycle === "monthly" ? styles.cycleBtnActive : ""}`}
            onClick={() => setCycle("monthly")}
          >
            Mjesečno
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={cycle === "yearly"}
            className={`${styles.cycleBtn} ${cycle === "yearly" ? styles.cycleBtnActive : ""}`}
            onClick={() => setCycle("yearly")}
          >
            Godišnje
            <span className={styles.cycleBadge}>2 mjeseca besplatno</span>
          </button>
        </div>

        {/* kalkulator broja obrta */}
        <div className={styles.officeCalc}>
          <span className={styles.officeCalcLabel}>Koliko obrta vodiš?</span>
          <input
            type="number"
            min={1}
            max={50}
            value={brojObrta}
            onChange={(e) => handleBrojObrta(Number(e.target.value))}
            className={styles.officeCalcInput}
            aria-label="Broj obrta"
          />
          <input
            type="range"
            min={1}
            max={50}
            value={brojObrta}
            onChange={(e) => handleBrojObrta(Number(e.target.value))}
            className={styles.officeRange}
            aria-label="Broj obrta (klizač)"
          />
          {predlozeni && (
            <span className={styles.officeSuggest}>
              Preporučeno: <strong>{predlozeni.naziv}</strong> ·{" "}
              {fmt(PLAN_PRICING[predlozeni.id][cycle])} KM{" "}
              {cycle === "monthly" ? "mjesečno" : "godišnje"} + PDV
            </span>
          )}
          {/* procjena uštede: ~3 sata po obrtu mjesečno (uvoz izvoda,
              knjiženje, KPR/KUF/KIF i obrasci koji se pune sami) */}
          <div className={styles.officeRoi}>
            Automatski izvodi, knjiženje i evidencije za {brojObrta}{" "}
            {brojObrta === 1 ? "obrt" : "obrta"} štede otprilike{" "}
            <strong>
              {brojObrta * 3} {brojObrta === 1 ? "sata" : "sati"} mjesečno
            </strong>
            {brojObrta * 3 >= 8 && (
              <> (oko {radniDani(Math.round((brojObrta * 3) / 8))})</>
            )}
            , računajući skromna 3 sata ručnog prekucavanja i knjiženja po
            obrtu.
          </div>
        </div>

        <div className={styles.officeGrid}>
          {OFFICE_PLANS.map((p) => {
            const isActive = selected === p.id;
            const cijena = PLAN_PRICING[p.id][cycle];
            // efektivna mjesečna cijena po obrtu, zaokružena na cijeli KM:
            // kod godišnjeg paketa (2 mjeseca gratis) godišnja cijena se
            // dijeli na 12 mjeseci, pa ispadne niža nego kod mjesečnog
            // (npr. 5 umjesto 6 KM po obrtu)
            const poObrtu = Math.round(
              cycle === "yearly"
                ? PLAN_PRICING[p.id].yearly / 12 / p.maxObrta
                : PLAN_PRICING[p.id].monthly / p.maxObrta,
            );
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={`${styles.card} ${styles.featuredOffice} ${
                  isActive ? styles.cardActive : styles.cardInactive
                }`}
                aria-pressed={isActive}
              >
                {predlozeni?.id === p.id && (
                  <div className={styles.popularTag}>Preporučeno za tebe</div>
                )}
                <div className={styles.tier}>{p.naziv}</div>
                <div className={styles.officeObrta}>{obrtaTekst(p.maxObrta)}</div>
                <div className={styles.price}>
                  {fmt(cijena)} KM
                  <span className={styles.vatSuffix}>+ PDV</span>
                </div>
                <div className={styles.period}>
                  {cycle === "monthly" ? "mjesečno" : "godišnje"}
                </div>
                {cycle === "yearly" && (
                  <div className={styles.saveNote}>
                    2 mjeseca besplatno · ušteda {fmt(annualSavings(p.id))} KM
                  </div>
                )}
                <div className={styles.officePerObrt}>
                  {p.maxObrta === 1
                    ? "za jedan obrt, vodiš sam sebi"
                    : `već od ${poObrtu} KM po obrtu mjesečno`}
                </div>
                <div className={styles.divider} />
                <ul className={styles.features}>
                  <li>Sve PK Office funkcije</li>
                  {p.id === "OFFICE_1" ? (
                    <>
                      <li>Režim "vodim sam sebi": jednostavan meni i lista obaveza</li>
                      <li>Business funkcije za taj 1 obrt</li>
                      <li>Uključen PK Freelancer</li>
                    </>
                  ) : p.id === "OFFICE_2" ? (
                    <li>Business funkcije za ta 2 obrta</li>
                  ) : (
                    <li>Kompletan Business: neograničeni klijenti</li>
                  )}
                  {(p.id === "OFFICE_25" || p.id === "OFFICE_50") && (
                    <li>Prioritetna podrška na live chatu</li>
                  )}
                  {/* Trial je fiksno Office Tim nivo (10 obrta), pa se 30 dana
                      probe nudi samo na tom paketu, ne na svima */}
                  {p.id === "OFFICE_10" && <li>30 dana besplatne probe</li>}
                </ul>
                <div className={styles.selectIndicator}>
                  {isActive ? (
                    <>
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="10" cy="10" r="8" />
                        <path d="M6 10l3 3 5-6" />
                      </svg>
                      Izabrano
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <circle cx="10" cy="10" r="8" />
                      </svg>
                      Izaberi
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* probni period: prijavljen ide u app (proba se tamo eksplicitno
            pokreće), neprijavljen na registraciju pa auto-aktivacija */}
        <div className={styles.officeTrialRow}>
          {/* Ista proba kao kartica na vrhu: prijavljen je aktivira odmah
              ovdje (bez skoka u app), neprijavljen ide na registraciju, a ko
              je već ima ide pravo u PK Office. */}
          {trialEligible && !isAnonymous ? (
            <button
              type="button"
              className={styles.officeTrialBtn}
              onClick={handleStartTrial}
              disabled={trialStatus === "starting"}
            >
              {trialStatus === "starting"
                ? "Aktiviram..."
                : "Aktiviraj 30 dana besplatno →"}
            </button>
          ) : (
            <OfficeTrialLink className={styles.officeTrialBtn}>
              {trialEligible ? "Isprobaj 30 dana besplatno →" : "Otvori PK Office →"}
            </OfficeTrialLink>
          )}
          <span className={styles.officeTrialNote}>
            Bez kartice i bez obaveze. Proba je na nivou paketa Office Tim (do
            10 obrta).
          </span>
        </div>

        {/* funkcije: dvije udarne + ostatak, PK Office stil sa ikonicama */}
        <div className={styles.officeHeroGrid}>
          {OFFICE_HERO_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className={styles.officeHero}>
                <span className={styles.officeHeroIcon}>
                  <Icon size={22} />
                </span>
                <div>
                  <div className={styles.officeHeroTitle}>{f.title}</div>
                  <p className={styles.officeHeroDesc}>{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.officeFeatGrid}>
          {OFFICE_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className={styles.officeFeat}>
                <span className={styles.officeFeatIcon}>
                  <Icon size={18} />
                </span>
                <strong>{f.title}</strong>
                {f.desc}
              </div>
            );
          })}
        </div>
        {/* Sitna napomena o fiskalizaciji, da očekivanja budu jasna prije kupovine */}
        <p className={styles.officeNapomena}>
          Napomena: PK Office nema integraciju sa fiskalnim kasama i ne
          povezuje se sa fiskalnim uređajem na računaru. Fiskalni računi se
          izdaju na kasi kao i do sada, a dnevni promet (pazar) se u program
          unosi ili povlači sa izvoda.
        </p>
        <div className={styles.officeContact}>
          <span className={styles.officeContactIcon}>
            <IconBuildingBank size={22} />
          </span>
          <div className={styles.officeContactBody}>
            <div className={styles.officeContactTitle}>
              Vodiš više od 50 obrta?
            </div>
            <p className={styles.officeContactDesc}>
              Za veće agencije pravimo posebnu ponudu.
            </p>
          </div>
          <button
            type="button"
            onClick={otvoriPonudu}
            className={styles.officeContactBtn}
          >
            Javi nam se →
          </button>
        </div>

        {/* modal: upit za posebnu ponudu ide kroz kontakt formu, ne mailto.
            Klik van modala NAMJERNO ne zatvara (da se upit ne izgubi);
            zatvaranje samo kroz Odustani/Zatvori. */}
        {ponudaOpen && (
          <div className={styles.officeModalOverlay}>
            <div
              className={styles.officeModal}
              role="dialog"
              aria-modal="true"
            >
              <h3 className={styles.officeModalTitle}>
                Posebna ponuda za 50+ obrta
              </h3>
              <p className={styles.officeModalSub}>
                Ostavi podatke i par detalja, javljamo se u roku od 24 sata sa
                ponudom po mjeri.
              </p>
              {ponudaStatus === "done" ? (
                <>
                  <div className={styles.successMsg}>
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M4 10l4 4 8-8" />
                    </svg>
                    Poruka je poslana. Javljamo se uskoro na{" "}
                    <strong>{ponudaEmail}</strong>
                  </div>
                  <div className={styles.officeModalActions}>
                    <button
                      type="button"
                      className={styles.officeModalSend}
                      onClick={() => setPonudaOpen(false)}
                    >
                      Zatvori
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={posaljiPonudu}>
                  <div className={styles.officeModalFields}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>
                        Ime i prezime *
                      </label>
                      <input
                        className={styles.input}
                        type="text"
                        value={ponudaIme}
                        onChange={(e) => setPonudaIme(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>E-mail *</label>
                      <input
                        className={styles.input}
                        type="email"
                        value={ponudaEmail}
                        onChange={(e) => setPonudaEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Poruka *</label>
                      <textarea
                        className={styles.officeModalTextarea}
                        rows={6}
                        value={ponudaPoruka}
                        onChange={(e) => setPonudaPoruka(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  {ponudaStatus === "error" && (
                    <div className={styles.errorMsg}>
                      Došlo je do greške pri slanju. Pokušaj ponovo ili piši
                      direktno na info@poreznikalkulator.ba.
                    </div>
                  )}
                  <div className={styles.officeModalActions}>
                    <button
                      type="button"
                      className={styles.officeModalCancel}
                      onClick={() => setPonudaOpen(false)}
                    >
                      Odustani
                    </button>
                    <button
                      type="submit"
                      className={styles.officeModalSend}
                      disabled={ponudaStatus === "sending"}
                    >
                      {ponudaStatus === "sending"
                        ? "Šaljem..."
                        : "Pošalji upit"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Forma podataka kupca ────────────────────────────────────────── */}
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.formHeader}>
          <div className={styles.formHeaderText}>
            <h2 className={styles.formTitle}>Podaci za predračun</h2>
            <p className={styles.formSub}>
              Unesite podatke kupca onako kako trebaju biti na predračunu.
            </p>
          </div>
          {!isAnonymous && <BuyerFillSelect onFill={handleFillFromProfile} />}
        </div>

        {isAnonymous && (
          <div className={styles.anonNote}>
            <svg
              className={styles.anonNoteIcon}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="8" />
              <path d="M10 9v4" />
              <path d="M10 6.5h.01" />
            </svg>
            <div>
              <strong>
                Predračun možete generisati i bez registracije.
              </strong>{" "}
              Ako se registrujete, podaci se popunjavaju automatski iz vašeg
              profila, a uz to možete aktivirati 30 dana besplatno (PK Office i sve
              Business funkcije).{" "}
              <a
                href={OFFICE_TRIAL_REGISTER_URL}
                className={styles.anonNoteLink}
              >
                Registruj se besplatno →
              </a>
            </div>
          </div>
        )}

        <div className={styles.fieldsGrid}>
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label className={styles.fieldLabel}>
              {jeFizicko ? "Ime i prezime *" : "Naziv firme *"}
            </label>
            <input
              className={styles.input}
              type="text"
              placeholder={jeFizicko ? "Ime i prezime" : "Naziv firme"}
              value={buyer.name}
              onChange={handleField("name")}
              required
            />
          </div>

          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label className={styles.fieldLabel}>Adresa</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Ulica i broj"
              value={buyer.address}
              onChange={handleField("address")}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Grad</label>
            <CitySelect
              value={buyer.city ?? ""}
              onChange={handleCityChange}
              className={styles.input}
              placeholder="Počnite kucati ime grada..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Poštanski broj</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Popuni se automatski"
              value={buyer.postalCode}
              onChange={handleField("postalCode")}
              readOnly
            />
          </div>

          {/* fizičko lice (PK Freelancer) nema ID ni PDV broj */}
          {!jeFizicko && (
          <>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>ID broj kupca</label>
            <input
              className={styles.input}
              type="text"
              placeholder="XXXXXXXXXXXXX"
              value={buyer.idNumber}
              onChange={handleField("idNumber")}
              maxLength={13}
              inputMode="numeric"
            />

            <label
              className={styles.fieldLabel}
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <input
                type="checkbox"
                checked={isPdvObveznik}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsPdvObveznik(checked);
                  if (!checked)
                    setBuyer((prev) => ({ ...prev, vatNumber: "" }));
                }}
              />
              PDV obveznik
            </label>
          </div>

          {isPdvObveznik ? (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>PDV broj kupca</label>
              <input
                className={styles.input}
                type="text"
                placeholder="XXXXXXXXXXXX"
                value={buyer.vatNumber}
                onChange={handleField("vatNumber")}
                maxLength={12}
                inputMode="numeric"
                required
              />
            </div>
          ) : (
            <div className={styles.field} aria-hidden="true" />
          )}
          </>
          )}

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Telefon</label>
            <input
              className={styles.input}
              type="tel"
              placeholder="+387 ..."
              value={buyer.phone}
              onChange={handleField("phone")}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>E-mail *</label>
            <input
              className={styles.input}
              type="email"
              placeholder="kupac@firma.ba"
              value={buyer.email}
              onChange={handleField("email")}
              required
            />
          </div>
        </div>

        {status === "done" && (
          <div className={styles.successMsg}>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 10l4 4 8-8" />
            </svg>
            Predračun <strong>{resultNumber}</strong> je generisan i poslan na{" "}
            <strong>{buyer.email}</strong>. PDF je otvoren u novom tabu.
            {lastUrl && (
              <>
                {" "}
                <a
                  href={lastUrl}
                  target="_blank"
                  rel="noopener"
                  className={styles.pdfLink}
                >
                  Otvori ponovo
                </a>
              </>
            )}
          </div>
        )}
        {status === "error" && (
          <div className={styles.errorMsg}>
            {errorMsg || "Došlo je do greške. Pokušajte ponovo."}
          </div>
        )}

        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Plan</span>
            <strong>
              {PLAN_LABELS[selected]} ·{" "}
              {cycle === "monthly" ? "mjesečno" : "godišnje"}
            </strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Iznos bez PDV-a</span>
            <strong>{fmt(iznosiZaPlan(selected, cycle).net)} KM</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>PDV (17%)</span>
            <strong>{fmt(iznosiZaPlan(selected, cycle).vat)} KM</strong>
          </div>
          <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
            <span>Za naplatu</span>
            <strong>{fmt(iznosiZaPlan(selected, cycle).gross)} KM</strong>
          </div>
        </div>

        <button
          type="submit"
          className={styles.submit}
          disabled={status === "sending"}
        >
          {status === "sending"
            ? "Generišem predračun..."
            : `Generiši predračun za ${PLAN_LABELS[selected]}`}
        </button>
        <p className={styles.fineprint}>
          Klikom na dugme generišemo predračun i šaljemo ga na navedeni e-mail.
          Predračun se otvara u novom tabu.
        </p>
      </form>

      <div className={styles.bankBox}>
        <div className={styles.bankBoxHeader}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={styles.bankIcon}>
            <rect x="2" y="7" width="16" height="11" rx="1.5" />
            <path d="M5 7V5a5 5 0 0110 0v2" />
            <circle cx="10" cy="13" r="1.5" />
          </svg>
          <span>Podaci za uplatu</span>
        </div>
        <div className={styles.bankFields}>
          <div className={styles.bankField}>
            <span className={styles.bankLabel}>Banka</span>
            <span className={styles.bankValue}>KIB BANKA</span>
          </div>
          <div className={styles.bankField}>
            <span className={styles.bankLabel}>Žiro račun</span>
            <span className={styles.bankValue}>198-201-20200826-04</span>
          </div>
          <div className={styles.bankField}>
            <span className={styles.bankLabel}>Svrha uplate</span>
            <span className={styles.bankValue}>Pretplata: Porezni kalkulator</span>
          </div>
        </div>
        <p className={styles.bankNote}>
          Pretplata će biti aktivirana čim primijetimo uplatu. Ukoliko imate pitanja, kontaktirajte nas na{" "}
          <a href="mailto:info@poreznikalkulator.ba" className={styles.bankEmail}>
            info@poreznikalkulator.ba
          </a>
          .
        </p>
      </div>
    </div>
  );
}
