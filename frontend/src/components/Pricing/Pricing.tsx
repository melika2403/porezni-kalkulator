"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Pricing.module.css";
import ComingSoonModal from "../ComingSoonModal/ComingSoonModal";
import { OfficeTrialLink } from "src/components/OfficeTrialLink/OfficeTrialLink";
import {
  PLAN_PRICING,
  OFFICE_PLANS,
  annualSavings,
  formatKm,
  type BillingCycle,
} from "src/data/pricing";

interface Plan {
  tier: string;
  price: string;
  period: string;
  trial?: string;
  features: string[];
  cta: string;
  ctaStyle: "outline" | "white" | "blue-white";
  variant?: "pro" | "business";
  tag?: string;
  action: "scroll" | "soon" | "subscribe";
  planId?: "PRO" | "BUSINESS";
}

const PLANS: Plan[] = [
  {
    tier: "Besplatno",
    price: "0 KM",
    period: "zauvijek besplatno",
    features: [
      "Osnovni obrasci: SPR-1053, GPD-1051, ZO3, AMS-1035",
      "Stalna sredstva i amortizacija kroz godine",
      "Historija svih dokumenata po godinama",
      "Podaci obrta se pamte i popunjavaju sami",
      "Izvoz u Docx i PDF",
    ],
    cta: "Počni besplatno",
    ctaStyle: "outline",
    action: "scroll",
  },
  {
    tier: "Pro",
    price: "199,00 KM",
    period: "godišnje",
    features: [
      "Sve iz besplatnog plana",
      "Šihterica: evidencija radnog vremena",
      "Više vlastitih djelatnosti",
      "Do 20 klijenata i fizičkih lica",
      "Prijave i odjave radnika, JS3100 obrazac",
      "Obračun plata za vlasnika i zaposlene",
      "Fakture, računi i predračuni",
    ],
    cta: "Pretplati se na Pro",
    ctaStyle: "white",
    variant: "pro",
    tag: "Za obrtnike",
    action: "subscribe",
    planId: "PRO",
  },
  {
    tier: "Business",
    price: "499,00 KM",
    period: "godišnje",
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
    cta: "Pretplati se na Business",
    ctaStyle: "blue-white",
    variant: "business",
    tag: "Za knjigovođe",
    action: "subscribe",
    planId: "BUSINESS",
  },
];

export default function Pricing() {
  const [showModal, setShowModal] = useState(false);
  const [cycle, setCycle] = useState<BillingCycle>("yearly");
  const router = useRouter();

  const handleCta = (plan: Plan) => {
    if (plan.action === "scroll") {
      document
        .getElementById("funkcije")
        ?.scrollIntoView({ behavior: "smooth" });
    } else if (plan.action === "subscribe" && plan.planId) {
      router.push(
        `/pretplate?plan=${plan.planId.toLowerCase()}&cycle=${cycle}`,
      );
    } else {
      setShowModal(true);
    }
  };

  // Cijena/period za prikaz na kartici — paid planovi iz PLAN_PRICING po ciklusu.
  const displayPrice = (plan: Plan) =>
    plan.planId ? `${formatKm(PLAN_PRICING[plan.planId][cycle])} KM` : plan.price;
  const displayPeriod = (plan: Plan) =>
    plan.planId
      ? cycle === "monthly"
        ? "mjesečno"
        : "godišnje"
      : plan.period;
  // Godišnja cifra izgleda veće nego što jeste, pa uz nju ide i mjesečni
  // ekvivalent. Zaokružujemo NANIŽE na cijeli KM (stvarni iznos je nešto veći,
  // pa "oko" nikad ne obećava manje nego što paket košta na mjesečnom planu).
  const monthlyEquivalent = (plan: Plan) =>
    plan.planId && cycle === "yearly"
      ? `oko ${Math.floor(PLAN_PRICING[plan.planId].yearly / 12)} KM mjesečno`
      : null;

  return (
    <>
      <section id="cijene" className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.label}>Pretplatnički paketi</div>
          <h2 className={styles.h2}>
            Transparentne cijene,
            <br />
            <em>bez iznenađenja</em>
          </h2>
          <p className={styles.intro}>
            Počnite besplatno. Nadogradite kada vam zatreba više.
          </p>

          <div className={styles.cycleToggle} role="tablist" aria-label="Ciklus naplate">
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

          <div className={styles.grid}>
            {PLANS.map((plan) => (
              <div
                key={plan.tier}
                className={`${styles.card} ${plan.variant === "pro" ? styles.featuredPro : ""} ${plan.variant === "business" ? styles.featuredBusiness : ""}`}
              >
                {plan.tag && (
                  <div className={styles.popularTag}>{plan.tag}</div>
                )}
                <div className={styles.tier}>{plan.tier}</div>
                <div className={styles.price}>
                  {displayPrice(plan)}
                  {plan.planId && <span className={styles.vatSuffix}>+ PDV</span>}
                </div>
                <div className={styles.period}>
                  {displayPeriod(plan)}
                  {monthlyEquivalent(plan) && (
                    <span className={styles.monthlyEq}>
                      {monthlyEquivalent(plan)}
                    </span>
                  )}
                </div>
                <div
                  className={styles.trialBadge}
                  aria-hidden={
                    plan.trial || (plan.planId && cycle === "yearly")
                      ? undefined
                      : true
                  }
                >
                  {plan.planId && cycle === "yearly"
                    ? `✓ 2 mjeseca besplatno · ušteda ${formatKm(annualSavings(plan.planId))} KM`
                    : plan.trial
                      ? `✓ ${plan.trial}`
                      : " "}
                </div>
                <div className={styles.divider} />
                <ul className={styles.features}>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button
                  className={`${styles.cta} ${plan.ctaStyle === "outline" ? styles.outline : plan.ctaStyle === "white" ? styles.white : styles.blueWhite}`}
                  onClick={() => handleCta(plan)}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* PK Office: kompletno knjigovodstvo obrta, cijena po broju obrta */}
          <div className={styles.officeBanner}>
            <div>
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
              <h3 className={styles.officeTitle}>
                Kompletno knjigovodstvo obrta. Cijena po broju obrta.
              </h3>
              <p className={styles.officeText}>
                <strong>Office Solo</strong> je za obrtnika koji vodi knjige
                sam sebi, <strong>Office Start</strong> daje sve funkcije za
                do 2 obrta, a paketi <strong>Tim i veći</strong> uz PK Office
                uključuju i <strong>kompletan Business bez ograničenja</strong>.
                Biraš samo koliko obrta vodiš.
              </p>
              <ul className={styles.officeList}>
                <li>Grupni uvoz izvoda: svi obrti odjednom</li>
                <li>Automatsko knjiženje: KPR, KUF i KIF se pune sami</li>
                <li>Plate i MIP, PDV prijava i e-evidencije, roba, blagajna</li>
                <li>30 dana besplatne probe i besplatna migracija podataka</li>
              </ul>
              <div className={styles.officeCtaRow}>
                <OfficeTrialLink className={styles.officeCta}>
                  <span className={styles.officeCtaInner}>
                    <span>Isprobaj 30 dana besplatno →</span>
                    <span className={styles.officeCtaSub}>
                      Odmah otvara PK Office
                    </span>
                  </span>
                </OfficeTrialLink>
                <button
                  type="button"
                  className={styles.officeGhost}
                  onClick={() => router.push("/pretplate#pk-office")}
                >
                  <span className={styles.officeCtaInner}>
                    <span>Izračunaj svoju cijenu</span>
                    <span className={styles.officeCtaSub}>
                      Cjenovnik pretplata po broju obrta
                    </span>
                  </span>
                </button>
              </div>
            </div>
            <div className={styles.officeTiers}>
              {OFFICE_PLANS.map((p) => (
                <div key={p.id} className={styles.officeTier}>
                  <div className={styles.officeTierName}>{p.naziv}</div>
                  <div className={styles.officeTierObrta}>
                    {p.maxObrta === 1 ? "1 obrt" : `do ${p.maxObrta} obrta`}
                  </div>
                  <div className={styles.officeTierPrice}>
                    {formatKm(PLAN_PRICING[p.id][cycle])} KM
                    <span>
                      {cycle === "monthly" ? "mjesečno" : "godišnje"} + PDV
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {showModal && <ComingSoonModal onClose={() => setShowModal(false)} />}
    </>
  );
}
