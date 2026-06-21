import {
  IconBuildingBank,
  IconReceiptTax,
  IconCoins,
  IconFileText,
  IconAddressBook,
  IconArrowsExchange,
  IconWallet,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconFileInvoice,
  IconAlertCircle,
  IconCloudUpload,
  IconCircleCheck,
} from "@tabler/icons-react";
import { LandingCta } from "./LandingCta";
import styles from "./pkOffice.module.css";

const FEATURES = [
  {
    icon: IconBuildingBank,
    name: "Bankovni izvodi",
    desc: "Učitaj PDF izvod iz e-bankinga, promet se provjerava prema saldu prije uvoza.",
  },
  {
    icon: IconArrowsExchange,
    name: "Automatsko knjiženje",
    desc: "Transakcije se same razvrstavaju po kategorijama iz opisa, ti samo potvrdiš.",
  },
  {
    icon: IconCoins,
    name: "Obračun plata",
    desc: "Mjesečni obračun, platni listići, uplatnice i MIP/2001 obrasci na par klikova.",
  },
  {
    icon: IconReceiptTax,
    name: "KPR i PDV evidencije",
    desc: "Knjiga prihoda i rashoda i PDV evidencije se vode automatski iz tvojih dokumenata.",
  },
  {
    icon: IconFileInvoice,
    name: "Fakture i partneri",
    desc: "Izdavanje faktura, kartice kupaca i dobavljača, saldo i dospjele obaveze.",
  },
  {
    icon: IconFileText,
    name: "Obrasci",
    desc: "Svi porezni obrasci za obrt na jednom mjestu, popunjeni iz tvojih podataka.",
  },
];

export default function PkOfficeLanding() {
  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          PK Office, uskoro
        </span>
        <h1 className={styles.h1}>
          Knjigovodstvo tvog obrta, <em>na jednom mjestu</em>.
        </h1>
        <p className={styles.sub}>
          PK Office spaja bankovne izvode, automatsko knjiženje, obračun plata i
          sve porezne obrasce u jedan jednostavan alat. Radimo na njemu, a ti se
          možeš registrovati i biti među prvima koji ga isprobaju.
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

      {/* Najava pretplate (teaser, bez cijene) */}
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
            Uskoro
          </span>
          <h2>Jedna pretplata. Neograničen broj obrta.</h2>
          <p className={styles.planLead}>
            Plaćaš jednom, vodiš koliko god obrta želiš. Bez naplate po obrtu i
            bez skrivenih doplata.
          </p>
          <div className={styles.planFeatures}>
            {[
              ["Neograničen broj obrta", "svi na jednom nalogu, bez limita"],
              ["Sve funkcije uključene", "izvodi, plate, obrasci, fakture"],
              ["Idealno za knjigovođe", "vodi i obrte svojih klijenata"],
              ["Bez naplate po obrtu", "jedna fiksna pretplata"],
            ].map(([title, desc]) => (
              <div key={title} className={styles.planFeat}>
                <IconCircleCheck size={19} className={styles.planFeatIcon} />
                <span className={styles.planFeatText}>
                  <strong>{title}</strong>, {desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Zavrsni CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <h2>Budi među prvima.</h2>
          <p>
            Registruj se sada, obavijestićemo te čim PK Office bude spreman, a
            dotad možeš koristiti sve naše besplatne porezne alate.
          </p>
          <LandingCta />
        </div>
      </section>
    </main>
  );
}
