"use client";
import { useState } from "react";
import styles from "../ugovor-o-pozajmici/ugovor.module.css";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import FaqSection from "src/components/FaqSection/FaqSection";
import CesijaForm from "./CesijaForm";
import KompenzacijaForm from "./KompenzacijaForm";

type Tab = "cesija" | "kompenzacija";

const TAB_BTN = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "0.7rem 1rem",
  borderRadius: 10,
  border: active ? "1px solid var(--sage, #3a5c42)" : "1px solid var(--line, #d4cfc4)",
  background: active ? "var(--sage, #3a5c42)" : "#fff",
  color: active ? "#fff" : "var(--ink, #0f1a12)",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
});

export default function CesijeKompenzacije() {
  const { hasAccessToTier } = useMaxAccessibleTier();
  const canGenerate = hasAccessToTier("BUSINESS");
  const [tab, setTab] = useState<Tab>("cesija");

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Ugovori</p>
        <h1 className={styles.h1}>
          Cesije i <em>kompenzacije</em>
        </h1>
        <p className={styles.subtitle}>
          Napravite ugovor o cesiji (ustupanje potraživanja, tri strane) ili
          prijedlog za međusobnu kompenzaciju (prijeboj potraživanja, dvije
          strane). Popunite podatke iz svojih ili klijentskih organizacija, pa
          preuzmite gotov dokument u PDF ili Word formatu.
        </p>
      </div>

      {!canGenerate && (
        <GeneratePaywall
          tier="BUSINESS"
          what="Generisanje ugovora o cesiji i kompenzacije"
        />
      )}

      {/* Pod-tabovi */}
      <div style={{ display: "flex", gap: 10, margin: "0 0 1.5rem" }}>
        <button type="button" style={TAB_BTN(tab === "cesija")} onClick={() => setTab("cesija")}>
          Ugovor o cesiji
        </button>
        <button
          type="button"
          style={TAB_BTN(tab === "kompenzacija")}
          onClick={() => setTab("kompenzacija")}
        >
          Kompenzacija
        </button>
      </div>

      {tab === "cesija" ? (
        <CesijaForm canGenerate={canGenerate} />
      ) : (
        <KompenzacijaForm canGenerate={canGenerate} />
      )}

      {/* Edukativni sadržaj (uvijek vidljiv, oba dokumenta) */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta je ugovor o <em>cesiji</em>?
        </h2>
        <p>
          <strong>Cesija</strong> (ustupanje potraživanja) je ugovor kojim
          povjerilac (<strong>cedent</strong>) prenosi svoje potraživanje na
          novog povjerioca (<strong>cesionar</strong>), dok dužnik
          (<strong>cesus</strong>) ostaje isti. Regulisana je članovima 436 do
          445 Zakona o obligacionim odnosima i u pravilu je neformalan ugovor,
          za njegovu valjanost dovoljna je saglasnost cedenta i cesionara.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Najčešća poslovna situacija je trostrani odnos: cedent duguje
          cesionaru, a istovremeno potražuje isti ili veći iznos od cesusa.
          Umjesto da se novac vrti u krug, cedent svoje potraživanje prema
          cesusu ustupa cesionaru i time izmiruje vlastiti dug. Cesus nakon
          ustupanja svoju obavezu plaća direktno cesionaru.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta mora sadržavati <em>ugovor o cesiji</em>?
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Podatke o sve tri strane</strong>, naziv, JIB ili ID broj i
            zastupnika cedenta, cesionara i cesusa.
          </li>
          <li>
            <strong>Iznos potraživanja koje se ustupa</strong>, brojkom i
            slovima.
          </li>
          <li>
            <strong>Pravni osnov</strong> potraživanja i izjavu da se ustupanjem
            izmiruje obaveza cedenta prema cesionaru.
          </li>
          <li>
            <strong>Mjesto i datum</strong> zaključenja, te nadležni sud za
            eventualne sporove.
          </li>
          <li>
            <strong>Potpise i pečate</strong> svih strana i broj primjeraka.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Pristanak dužnika i <em>obavještavanje</em>
        </h2>
        <p>
          Za samu valjanost cesije pristanak dužnika (cesusa) nije potreban, ali
          dužnika treba obavijestiti o ustupanju. Dok ne sazna za cesiju, dužnik
          može valjano platiti starom povjeriocu (cedentu). Zato se u praksi
          cesus najčešće potpisuje na ugovor ili dobija pisano obavještenje,
          čime se izbjegava da plati pogrešnoj strani.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta je <em>kompenzacija</em> (prijeboj)?
        </h2>
        <p>
          <strong>Kompenzacija</strong> ili prijeboj je gašenje obaveza
          međusobnim prebijanjem potraživanja dvije strane koje istovremeno
          duguju jedna drugoj. Prebija se do iznosa manjeg potraživanja, a
          nekompenzirana razlika se uplaćuje na žiro račun. Regulisana je
          članovima 336 do 343 Zakona o obligacionim odnosima i nastaje izjavom
          o kompenzaciji koju potpisuju obje strane.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Uslovi za <em>prijeboj</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Uzajamnost</strong>, obje strane su istovremeno i dužnik i
            povjerilac jedna drugoj.
          </li>
          <li>
            <strong>Istovrsnost</strong>, potraživanja glase na novac ili druge
            zamjenljive stvari istog roda.
          </li>
          <li>
            <strong>Dospjelost</strong>, oba potraživanja su dospjela za naplatu.
          </li>
          <li>
            <strong>Utuživost</strong>, potraživanja se mogu ostvariti i pred
            sudom.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Kako se <em>obračunava</em> kompenzacija?
        </h2>
        <p>
          Saberu se sve obaveze dužnika i sve obaveze povjerioca. Iznos
          kompenzacije jednak je manjem od ta dva zbira, a razlika do većeg
          iznosa je nekompenzirani dio koji strana sa većom obavezom uplaćuje
          drugoj na žiro račun. Primjer: ako dužnik duguje 6.803,10 KM, a
          povjerilac 4.801,64 KM, kompenzuje se 4.801,64 KM, a preostalih
          2.001,46 KM se uplaćuje.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Kada prijeboj <em>nije dozvoljen</em>?
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>Potraživanja koja se ne mogu zaplijeniti, npr. zakonsko izdržavanje.</li>
          <li>
            Potraživanja po osnovu naknade štete nastale namjernim oštećenjem
            stvari.
          </li>
          <li>
            Slučajevi gdje zakon izričito zabranjuje prijeboj ili se druga strana
            tome opravdano protivi.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Povezani <em>alati</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          <li>
            <a href="/fakture" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Fakture i predračuni
            </a>
            , izdavanje računa iz kojih najčešće proizlaze potraživanja za cesiju
            i kompenzaciju.
          </li>
          <li>
            <a href="/ugovor-o-pozajmici" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Ugovor o pozajmici
            </a>
            , za pozajmice novca između firmi ili fizičkih lica.
          </li>
          <li>
            <a href="/ugovor-o-djelu" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Ugovor o djelu
            </a>
            , za jednokratne usluge sa obračunom poreza i doprinosa.
          </li>
        </ul>
      </section>

      <FaqSection
        items={[
          {
            q: "Treba li dužnik (cesus) potpisati ugovor o cesiji?",
            a: "Pravno, pristanak dužnika nije uslov valjanosti cesije, dovoljan je sporazum cedenta i cesionara. U praksi se dužnik ipak potpisuje ili se obavještava o ustupanju kako bi znao da ubuduće plaća novom povjeriocu.",
          },
          {
            q: "Kako se računa nekompenzirani iznos?",
            a: "Kompenzuje se manji od dva ukupna iznosa obaveza. Razlika između većeg i manjeg iznosa je nekompenzirani iznos koji strana sa većom obavezom uplaćuje drugoj strani na žiro račun.",
          },
          {
            q: "U koliko primjeraka se sačinjavaju ovi dokumenti?",
            a: "Ugovor o cesiji se obično sačinjava u tri primjerka, po jedan za svaku stranu. Prijedlog za kompenzaciju u dva ovjerena i potpisana primjerka, s tim da se jedan vrati pošiljaocu radi knjiženja.",
          },
          {
            q: "Koja je razlika između cesije i asignacije (upućivanja)?",
            a: "Kod cesije cedent prenosi svoje postojeće potraživanje na cesionara, mijenja se povjerilac. Kod asignacije (upućivanja) uputilac ovlašćuje upućenika da izvrši plaćanje primaocu uputa, čime nastaje nov odnos plaćanja. Cesija mijenja stranu u postojećem potraživanju, asignacija stvara novi.",
          },
          {
            q: "Da li je za cesiju ili kompenzaciju potrebna notarska ovjera?",
            a: "Zakon ne propisuje obaveznu notarsku ovjeru za ugovor o cesiji ni za izjavu o kompenzaciji, dovoljni su potpisi i pečati strana. Ovjera se može uraditi radi veće pravne sigurnosti, posebno kod većih iznosa.",
          },
          {
            q: "Mogu li se prebiti potraživanja u različitim valutama?",
            a: "Prijeboj traži istovrsnost potraživanja, pa se potraživanja u različitim valutama u pravilu ne mogu direktno kompenzirati, osim ako se strane ne dogovore o preračunu u istu valutu po kursu na dan kompenzacije.",
          },
          {
            q: "Odgovara li cedent za naplativost ustupljenog potraživanja?",
            a: "Ako nije drugačije ugovoreno, cedent kod naplatne cesije odgovara za postojanje potraživanja, ali ne i za njegovu naplativost. Odgovornost za naplativost se može posebno ugovoriti.",
          },
        ]}
      />
    </main>
  );
}
