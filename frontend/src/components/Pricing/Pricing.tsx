"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Pricing.module.css";
import ComingSoonModal from "../ComingSoonModal/ComingSoonModal";
import {
  PLAN_PRICING,
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
      "SPR-1053 i GPD-1051 obrazac",
      "izrada i automatska popuna ZO3 obrazca",
      "AMS-1035 generator zajedno sa uplatnicama",
      "Stalna sredstva i amortizacija kroz godine",
      "Historija svih dokumenata po godinama ili obrascima",
      "Pohrana podataka obrta u svim dokumentima",
      "Izvoz u Docx / PDF",
    ],
    cta: "Počni besplatno",
    ctaStyle: "outline",
    action: "scroll",
  },
  {
    tier: "Pro",
    price: "199,00 KM",
    period: "godišnje / po korisniku",
    trial: "30 dana besplatno, bez kartice",
    features: [
      "Sve iz besplatnog plana",
      "Šihterica: evidencija radnog vremena",
      "Višestruke vlastite djelatnosti",
      "Mogućnost dodavanja do 20 klijenata i fizičkih lica",
      "Prijave/odjave radnika, izrada JS3100 obrasca",
      "Obračun plata i doprinosa za vlasnika obrta i zaposlene",
      "Fakture/računi i predračuni/ponude",
    ],
    cta: "Aktiviraj besplatnu pretplatu",
    ctaStyle: "white",
    variant: "pro",
    tag: "Najpopularnije",
    action: "subscribe",
    planId: "PRO",
  },
  {
    tier: "Business",
    price: "499,00 KM",
    period: "godišnje / po korisniku",
    features: [
      "Sve iz Pro plana",
      "Upravljanje neograničenim brojem klijenata i fizičkih lica",
      "Dodavanje radnika na klijente i automatsko popunjavanje obrazaca s njihovim podacima",
      "Višekorisnički pristup (tim) za knjigovođe i agencije",
      "Ugovor o radu i odluka o prestanku radnog odnosa, sa automatskom numeracijom",
      "Ugovori o djelu i automatski obračun poreza i doprinosa",
      "Prioritetna podrška",
    ],
    cta: "Pretplati se na Business",
    ctaStyle: "blue-white",
    variant: "business",
    tag: "Najbolja vrijednost",
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
      const trial = plan.planId === "PRO" ? "&trial=1" : "";
      router.push(
        `/pretplate?plan=${plan.planId.toLowerCase()}&cycle=${cycle}${trial}`,
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
        ? "mjesečno / po korisniku"
        : "godišnje / po korisniku"
      : plan.period;

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
                <div className={styles.price}>{displayPrice(plan)}</div>
                <div className={styles.period}>{displayPeriod(plan)}</div>
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
        </div>
      </section>

      {showModal && <ComingSoonModal onClose={() => setShowModal(false)} />}
    </>
  );
}
