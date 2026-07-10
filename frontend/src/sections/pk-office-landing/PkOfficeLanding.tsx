import Link from "next/link";
import {
  IconBuildingBank,
  IconReceiptTax,
  IconCoins,
  IconFileText,
  IconArrowsExchange,
  IconWallet,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconFileInvoice,
  IconAlertCircle,
  IconCloudUpload,
  IconCircleCheck,
  IconInbox,
  IconPackage,
  IconTransfer,
  IconArrowRight,
} from "@tabler/icons-react";
import { LandingCta } from "./LandingCta";
import { OfficeTrialLink } from "src/components/OfficeTrialLink/OfficeTrialLink";
import styles from "./pkOffice.module.css";

const FEATURES = [
  {
    icon: IconInbox,
    name: "Grupni uvoz izvoda",
    desc: "Za knjigovođe: ubaci PDF izvode SVIH obrta odjednom, svaki se sam prepozna po žiro računu i rasporedi na svoj obrt.",
  },
  {
    icon: IconArrowsExchange,
    name: "Automatsko knjiženje",
    desc: "Transakcije se same kategorišu, vežu za partnere i zatvaraju fakture; KPR, KUF i KIF se pune sami, ti samo potvrdiš.",
  },
  {
    icon: IconCoins,
    name: "Obračun plata",
    desc: "Mjesečni obračun, platni listići, uplatnice i MIP-1023 XML i 2001/2002 obrasci na par klikova.",
  },
  {
    icon: IconReceiptTax,
    name: "PDV evidencije",
    desc: "KUF i KIF iz knjiženja, PDV prijava, e-KUF/e-KIF CSV za UINO portal i D-PDV obrazac.",
  },
  {
    icon: IconFileText,
    name: "KPR i porezni obrasci",
    desc: "Knjiga prihoda i rashoda se vodi sama, SPR i GPD se pripreme iz knjiga na kraju godine.",
  },
  {
    icon: IconFileInvoice,
    name: "Fakture i partneri",
    desc: "Izdavanje faktura, kartice kupaca i dobavljača, kompenzacije i cesije, dospjele obaveze.",
  },
  {
    icon: IconPackage,
    name: "Roba i maloprodaja",
    desc: "Kalkulacije (KCM), lager lista, popis, nivelacije i trgovačka knjiga na malo (TKM).",
  },
  {
    icon: IconBuildingBank,
    name: "Blagajna i putni nalozi",
    desc: "Blagajnički nalozi i dnevnik po uredbi, putni nalozi sa dnevnicama.",
  },
  {
    icon: IconTransfer,
    name: "Migracija iz starog programa",
    desc: "Besplatan uvoz artikala, partnera i izvoda: pređi bez ponovnog kucanja šifarnika.",
  },
];

// PK Office paketi (cijene iz src/data/pricing.ts, neto bez PDV-a)
const PLAN_TIERS = [
  { naziv: "Office Start", obrta: "do 2 obrta", cijena: "20 KM" },
  { naziv: "Office Tim", obrta: "do 10 obrta", cijena: "80 KM" },
  { naziv: "Office Agencija", obrta: "do 25 obrta", cijena: "175 KM" },
  { naziv: "Office Agencija+", obrta: "do 50 obrta", cijena: "300 KM" },
];

export default function PkOfficeLanding() {
  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          PK Office
        </span>
        <h1 className={styles.h1}>
          Knjigovodstvo tvog obrta, <em>na jednom mjestu</em>.
        </h1>
        <p className={styles.sub}>
          PK Office spaja bankovne izvode, automatsko knjiženje, obračun plata i
          sve porezne obrasce u jedan jednostavan alat. Isprobaj ga 30 dana
          besplatno, bez kartice i bez obaveze.
        </p>
        <div className={styles.ctaRow}>
          <LandingCta withSecondary />
        </div>
        <p className={styles.heroNote}>
          Besplatna registracija, bez kartice. Prikazani podaci u pregledu su
          primjer.
        </p>
      </section>

      {/* Preview prozor */}
      <section className={styles.previewWrap}>
        <div className={styles.window}>
          <div className={styles.windowBar}>
            <span className={styles.dot} style={{ background: "#e06c5a" }} />
            <span className={styles.dot} style={{ background: "#e3b341" }} />
            <span className={styles.dot} style={{ background: "#5aa86f" }} />
            <span className={styles.windowUrl}>app.poreznikalkulator.ba</span>
          </div>
          <div className={styles.windowBody}>
            <p className={styles.greet}>Dobar dan.</p>
            <p className={styles.greetSub}>
              subota, 21. juni 2026. · Demo obrt
            </p>

            <div className={styles.kpiGrid}>
              <div className={styles.kpi}>
                <span
                  className={styles.kpiIcon}
                  style={{ background: "#d6e8d9", color: "#3a5c42" }}
                >
                  <IconWallet size={17} />
                </span>
                <p className={styles.kpiLabel}>Stanje računa</p>
                <p className={styles.kpiValue}>14.280,50</p>
              </div>
              <div className={styles.kpi}>
                <span
                  className={styles.kpiIcon}
                  style={{ background: "#d6e8d9", color: "#3a5c42" }}
                >
                  <IconArrowDownLeft size={17} />
                </span>
                <p className={styles.kpiLabel}>Potražuje</p>
                <p className={styles.kpiValue}>8.450,00</p>
              </div>
              <div className={styles.kpi}>
                <span
                  className={styles.kpiIcon}
                  style={{ background: "#ede8db", color: "#7a8a7d" }}
                >
                  <IconArrowUpRight size={17} />
                </span>
                <p className={styles.kpiLabel}>Duguje</p>
                <p className={styles.kpiValue}>3.120,40</p>
              </div>
              <div className={styles.kpi}>
                <span
                  className={styles.kpiIcon}
                  style={{ background: "#f7e9df", color: "#c8622a" }}
                >
                  <IconAlertCircle size={17} />
                </span>
                <p className={styles.kpiLabel}>Za pregled</p>
                <p className={styles.kpiValue}>2</p>
              </div>
            </div>

            <div className={styles.rows}>
              <div className={styles.rowsHead}>Posljednje transakcije</div>
              {[
                { t: "Uplata po fakturi 2026-014", d: "12.06.2026.", a: "+1.450,00 KM", inn: true },
                { t: "JP Elektroprivreda, struja", d: "10.06.2026.", a: "−168,40 KM", inn: false },
                { t: "Uplata po fakturi 2026-013", d: "07.06.2026.", a: "+2.100,00 KM", inn: true },
              ].map((r) => (
                <div key={r.t} className={styles.row}>
                  <span
                    className={styles.rowIcon}
                    style={{
                      background: r.inn ? "#d6e8d9" : "#ede8db",
                      color: r.inn ? "#3a5c42" : "#7a8a7d",
                    }}
                  >
                    {r.inn ? (
                      <IconArrowDownLeft size={16} />
                    ) : (
                      <IconArrowUpRight size={16} />
                    )}
                  </span>
                  <div className={styles.rowMain}>
                    <p className={styles.rowTitle}>{r.t}</p>
                    <p className={styles.rowMeta}>{r.d}</p>
                  </div>
                  <span
                    className={`${styles.rowAmt} ${r.inn ? styles.amtIn : ""}`}
                  >
                    {r.a}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Preview: bankovni izvodi */}
      <section className={styles.previewWrap}>
        <div className={styles.window}>
          <div className={styles.windowBar}>
            <span className={styles.dot} style={{ background: "#e06c5a" }} />
            <span className={styles.dot} style={{ background: "#e3b341" }} />
            <span className={styles.dot} style={{ background: "#5aa86f" }} />
            <span className={styles.windowUrl}>
              app.poreznikalkulator.ba/bankovni-izvodi
            </span>
          </div>
          <div className={styles.windowBody}>
            <p className={styles.greet}>Bankovni izvodi.</p>
            <p className={styles.greetSub}>
              Učitaj PDF izvod iz e-bankinga, knjiženje ide samo.
            </p>

            <div className={styles.uploadZone}>
              <span className={styles.uploadIcon}>
                <IconCloudUpload size={24} />
              </span>
              <p className={styles.uploadTitle}>Učitaj bankovni izvod</p>
              <p className={styles.uploadSub}>Prevuci PDF ili klikni za odabir</p>
              <p className={styles.uploadBanks}>
                UniCredit · Raiffeisen · Sparkasse · KIB · BBI · MF · Ziraat
              </p>
            </div>

            <div className={styles.rows}>
              <div className={styles.rowsHead}>Automatsko knjiženje</div>
              {[
                { t: "UPLATA PO RAČUNU 2026-014", a: "+1.450,00 KM", inn: true, cat: "Prihod od prodaje", bg: "#d6e8d9", fg: "#2d4633" },
                { t: "JP ELEKTROPRIVREDA, struja", a: "−168,40 KM", inn: false, cat: "Režije", bg: "#ede8db", fg: "#5b6a5e" },
                { t: "DOPRINOSI PIO/MIO", a: "−612,30 KM", inn: false, cat: "Doprinosi", bg: "#f7e9df", fg: "#c8622a" },
              ].map((r) => (
                <div key={r.t} className={styles.row}>
                  <span
                    className={styles.rowIcon}
                    style={{
                      background: r.inn ? "#d6e8d9" : "#ede8db",
                      color: r.inn ? "#3a5c42" : "#7a8a7d",
                    }}
                  >
                    {r.inn ? (
                      <IconArrowDownLeft size={16} />
                    ) : (
                      <IconArrowUpRight size={16} />
                    )}
                  </span>
                  <div className={styles.rowMain}>
                    <p className={styles.rowTitle}>{r.t}</p>
                    <span
                      className={styles.catChip}
                      style={{ background: r.bg, color: r.fg }}
                    >
                      {r.cat}
                    </span>
                  </div>
                  <span
                    className={`${styles.rowAmt} ${r.inn ? styles.amtIn : ""}`}
                  >
                    {r.a}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Funkcionalnosti */}
      <section className={styles.features}>
        <h2 className={styles.featuresTitle}>Šta PK Office radi</h2>
        <p className={styles.featuresSub}>
          Sve što obrtu treba za knjige i obaveze, povezano i automatizovano.
        </p>
        <div className={styles.featGrid}>
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.name} className={styles.feat}>
                <span className={styles.featIcon}>
                  <Icon size={20} />
                </span>
                <p className={styles.featName}>{f.name}</p>
                <p className={styles.featDesc}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pretplata: sve funkcije u svakom paketu, cijena po broju obrta */}
      <section className={styles.plan}>
        <div className={styles.planCard}>
          <span className={styles.planBadge}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#fff",
              }}
            />
            Paketi
          </span>
          <h2>Sve funkcije. Cijena po broju obrta.</h2>
          <p className={styles.planLead}>
            Office Start pokriva sve za do 2 obrta, a paketi Tim i veći uz PK
            Office uključuju i kompletan Business bez ograničenja. Biraš samo
            koliko obrta vodiš.
          </p>
          <div className={styles.planTiers}>
            {PLAN_TIERS.map((t) => (
              <div key={t.naziv} className={styles.planTier}>
                <div className={styles.planTierName}>{t.naziv}</div>
                <div className={styles.planTierObrta}>{t.obrta}</div>
                <div className={styles.planTierPrice}>{t.cijena}</div>
                <div className={styles.planTierPer}>mjesečno + PDV</div>
              </div>
            ))}
          </div>
          <div className={styles.planFeatures}>
            {[
              ["Grupni uvoz izvoda", "svi obrti odjednom, sami se rasporede"],
              ["Automatsko knjiženje", "KPR, KUF i KIF se pune sami"],
              ["30 dana besplatne probe", "bez kartice i bez obaveze"],
              ["Besplatna migracija", "uvoz artikala, partnera i izvoda"],
            ].map(([title, desc]) => (
              <div key={title} className={styles.planFeat}>
                <IconCircleCheck size={19} className={styles.planFeatIcon} />
                <span className={styles.planFeatText}>
                  <strong>{title}</strong>, {desc}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.planCtaRow}>
            <OfficeTrialLink className={styles.planCtaBtn}>
              Isprobaj 30 dana besplatno
              <IconArrowRight size={16} />
            </OfficeTrialLink>
            <Link href="/pretplate#pk-office" className={styles.planCtaGhost}>
              Pogledaj cjenovnik i izračunaj svoju cijenu
            </Link>
          </div>
          <p className={styles.planFine}>
            Godišnja pretplata: 2 mjeseca besplatno. Preko 50 obrta? Javi se za
            posebnu ponudu.
          </p>
        </div>
      </section>

      {/* Zavrsni CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <h2>Spreman za početak?</h2>
          <p>
            Registruj se, aktiviraj 30 dana besplatne probe i prebaci knjige
            svojih obrta još danas. Migracija podataka iz starog programa je
            besplatna, a tu su i svi naši besplatni porezni alati.
          </p>
          <LandingCta />
        </div>
      </section>
    </main>
  );
}
