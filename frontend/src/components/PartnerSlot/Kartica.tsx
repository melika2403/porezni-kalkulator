"use client";

import { useRef, type CSSProperties } from "react";
import {
  klikUrl,
  reklamaSlikaUrl,
  type JavnaReklama,
} from "src/api/partner";
import type { ReklamaPozicija, ReklamaStranica } from "src/data/partner";
import { usePrikaz } from "./useSlot";
import styles from "./partnerSlot.module.css";

// Crtanje reklame promotera. Šablon (SABLON) iscrtavamo mi iz polja reklame u
// boji brenda; SLIKA je gotov baner. Isti kod crta i pregled u promoter
// dashboardu (pregled=true: bez brojanja i bez odlaska na link).

export type ReklamaCtx = {
  stranica: ReklamaStranica;
  pozicija: ReklamaPozicija;
  /** pregled u dashboardu: ne broji prikaze i klikove */
  pregled?: boolean;
};

export function bojeBrenda(boja: string): CSSProperties {
  return { ["--rk-boja" as string]: boja };
}

/**
 * Jednostavno označavanje u tekstu kreative: *ovako* je naglašeno. U naslovu
 * širokog banera to je podvučeni dio ("bez početnih troškova"), u tekstu
 * podebljano. Bez HTML-a iz baze: React escapuje sve, nema XSS-a.
 */
export function Oznaceno({
  t,
  naglasak = "jako",
}: {
  t: string | null | undefined;
  naglasak?: "jako" | "podvuceno";
}) {
  if (!t) return null;
  const dijelovi = t.split(/\*([^*]+)\*/g);
  return (
    <>
      {dijelovi.map((d, i) =>
        i % 2 === 1 ? (
          naglasak === "podvuceno" ? (
            <span key={i} className={styles.podvuceno}>
              {d}
            </span>
          ) : (
            <strong key={i}>{d}</strong>
          )
        ) : (
          d
        ),
      )}
    </>
  );
}

/** Tekst bez oznaka, za alt i aria opise. */
export function bezOznaka(t: string | null | undefined): string {
  return (t ?? "").replace(/\*([^*]+)\*/g, "$1");
}

/**
 * Široka kartica na početnoj (ispod Pretplata). Cijela kartica je link, na
 * prelaz mišem se blago uveća. SLIKA: gotov vodoravni baner preko cijele
 * kartice.
 */
export function ReklamaBanerKartica({
  r,
  ctx,
  kompaktno = false,
}: {
  r: JavnaReklama;
  ctx: ReklamaCtx;
  /** manja varijanta za alate, vodiče i rasprave (ispod sadržaja) */
  kompaktno?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  usePrikaz(ref, r, ctx.stranica, ctx.pozicija, !ctx.pregled);
  const logo = reklamaSlikaUrl(r.logoUrl);
  const logo2 = reklamaSlikaUrl(r.logo2Url);
  const siroka = reklamaSlikaUrl(r.slikaUskaUrl) ?? reklamaSlikaUrl(r.slikaUrl);
  const opis = bezOznaka(r.naslov) || r.brend;

  if (r.format === "SLIKA" && siroka) {
    return (
      <a
        ref={ref}
        {...linkProps(r, ctx)}
        className={styles.sirokaSlika}
        style={bojeBrenda(r.boja)}
        data-slot={`${ctx.stranica}-siroka`}
        aria-label={opis}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={siroka} alt={opis} width={1350} height={380} loading="lazy" decoding="async" />
        <span className={styles.sirokaSlikaOznaka}>Oglas</span>
      </a>
    );
  }

  return (
    <a
      ref={ref}
      {...linkProps(r, ctx)}
      className={`${styles.siroka} ${kompaktno ? styles.sirokaKompaktna : ""}`}
      style={bojeBrenda(r.boja)}
      data-slot={`${ctx.stranica}-siroka`}
    >
      <span className={styles.sirokaKrug} aria-hidden="true" />
      <span className={styles.sirokaTijelo}>
        {r.oznaka && (
          <span className={styles.sirokaOznaka}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="8" width="18" height="4" rx="1" />
              <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
            </svg>
            {r.oznaka}
          </span>
        )}
        <span className={styles.sirokaLogotipi}>
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logo} alt={r.brend} loading="lazy" decoding="async" />
          ) : (
            <span className={styles.sirokaBrend}>{r.brend}</span>
          )}
          {logo2 && (
            <>
              <span className={styles.sirokaCrta} aria-hidden="true" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo2} alt="" loading="lazy" decoding="async" />
            </>
          )}
        </span>
        {r.naslov && (
          <span className={styles.sirokaNaslov}>
            <Oznaceno t={r.naslov} naglasak="podvuceno" />
          </span>
        )}
        {r.tekst && (
          <span className={styles.sirokaTekst}>
            <Oznaceno t={r.tekst} />
          </span>
        )}
      </span>
      <span className={styles.sirokaCta}>
        {r.ctaTekst || "Saznaj više"}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </span>
      <span className={styles.sirokaMalaOznaka}>Oglas</span>
    </a>
  );
}

export function linkProps(
  r: JavnaReklama,
  ctx: ReklamaCtx,
  sekundarni = false,
) {
  if (ctx.pregled) {
    return {
      href: "#",
      onClick: (e: React.MouseEvent) => e.preventDefault(),
    };
  }
  return {
    href: klikUrl(r.id, ctx.stranica, ctx.pozicija, sekundarni),
    target: "_blank",
    // plaćeni link: Google traži rel="sponsored", nofollow za starije crawlere
    rel: "sponsored nofollow noopener",
  };
}

/** Bijela pločica sa logom ili imenom brenda (kao na mockupima). */
export function BrendZnak({
  r,
  velicina = "srednji",
}: {
  r: Pick<JavnaReklama, "brend" | "logoUrl">;
  velicina?: "mali" | "srednji";
}) {
  const logo = reklamaSlikaUrl(r.logoUrl);
  return (
    <span className={`${styles.brend} ${velicina === "mali" ? styles.brendMali : ""}`}>
      {logo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logo} alt={r.brend} className={styles.brendLogo} loading="lazy" decoding="async" />
      ) : (
        r.brend
      )}
    </span>
  );
}

/** Visoka kartica za bočne stubove (i desnu kolonu Vijesti). */
export function ReklamaStubKartica({
  r,
  ctx,
}: {
  r: JavnaReklama;
  ctx: ReklamaCtx;
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePrikaz(ref, r, ctx.stranica, ctx.pozicija, !ctx.pregled);
  const slika = reklamaSlikaUrl(r.slikaUrl);

  if (r.format === "SLIKA" && slika) {
    return (
      <div
        ref={ref}
        className={styles.stubSlika}
        style={bojeBrenda(r.boja)}
        data-slot={`${ctx.stranica}-${ctx.pozicija.toLowerCase()}`}
      >
        <a {...linkProps(r, ctx)} aria-label={bezOznaka(r.naslov) || r.brend}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slika} alt={bezOznaka(r.naslov) || r.brend} loading="lazy" decoding="async" />
        </a>
        <span className={styles.oznaka}>Oglas</span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={styles.stub}
      style={bojeBrenda(r.boja)}
      data-slot={`${ctx.stranica}-${ctx.pozicija.toLowerCase()}`}
    >
      <BrendZnak r={r} />
      {r.naslov && <p className={styles.stubNaslov}><Oznaceno t={r.naslov} /></p>}
      {r.tekst && <p className={styles.stubTekst}><Oznaceno t={r.tekst} /></p>}
      <div className={styles.stubIlustracija}>
        {slika && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={slika} alt="" loading="lazy" decoding="async" />
        )}
      </div>
      <a {...linkProps(r, ctx)} className={styles.cta}>
        {r.ctaTekst || "Saznaj više"}
      </a>
      <span className={styles.oznaka}>Oglas</span>
    </div>
  );
}

/** Mala vodoravna kartica "Sponzorisano" unutar obrasca. */
export function ReklamaInlineKartica({
  r,
  ctx,
}: {
  r: JavnaReklama;
  ctx: ReklamaCtx;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  usePrikaz(ref, r, ctx.stranica, ctx.pozicija, !ctx.pregled);
  const uska = reklamaSlikaUrl(r.slikaUskaUrl) ?? reklamaSlikaUrl(r.slikaUrl);

  if (r.format === "SLIKA" && uska) {
    return (
      <a
        ref={ref}
        {...linkProps(r, ctx)}
        className={styles.inlineSlika}
        data-slot={`${ctx.stranica}-inline`}
        style={bojeBrenda(r.boja)}
        aria-label={bezOznaka(r.naslov) || r.brend}
      >
        {/* širina i visina = preporučeni format 640x120: prostor je rezervisan
            prije učitavanja slike, stranica ne skače (CLS) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={uska}
          alt={bezOznaka(r.naslov) || r.brend}
          width={640}
          height={120}
          loading="lazy"
          decoding="async"
        />
        <span className={styles.inlineOznaka}>Sponzorisano</span>
      </a>
    );
  }

  return (
    <a
      ref={ref}
      {...linkProps(r, ctx)}
      className={styles.inline}
      data-slot={`${ctx.stranica}-inline`}
      style={bojeBrenda(r.boja)}
    >
      <span className={styles.inlineOznaka}>Sponzorisano</span>
      <BrendZnak r={r} velicina="mali" />
      <span className={styles.inlineTijelo}>
        {r.naslov && <span className={styles.inlineNaslov}><Oznaceno t={r.naslov} /></span>}
        {r.tekst && <span className={styles.inlineTekst}><Oznaceno t={r.tekst} /></span>}
      </span>
    </a>
  );
}
