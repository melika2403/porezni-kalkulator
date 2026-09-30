"use client";

import { useRef, type CSSProperties } from "react";
import {
  klikUrl,
  reklamaSlikaUrl,
  type JavnaReklama,
} from "src/api/reklame";
import type { ReklamaPozicija, ReklamaStranica } from "src/data/reklame";
import { usePrikaz } from "./useReklame";
import styles from "./reklame.module.css";

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
    rel: "sponsored noopener",
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
        <img src={logo} alt={r.brend} className={styles.brendLogo} />
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
      <div ref={ref} className={styles.stubSlika} style={bojeBrenda(r.boja)}>
        <a {...linkProps(r, ctx)} aria-label={r.naslov || r.brend}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slika} alt={r.naslov || r.brend} />
        </a>
        <span className={styles.oznaka}>Oglas</span>
      </div>
    );
  }

  return (
    <div ref={ref} className={styles.stub} style={bojeBrenda(r.boja)}>
      <BrendZnak r={r} />
      {r.naslov && <p className={styles.stubNaslov}>{r.naslov}</p>}
      {r.tekst && <p className={styles.stubTekst}>{r.tekst}</p>}
      <div className={styles.stubIlustracija}>
        {slika && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={slika} alt="" />
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
        style={bojeBrenda(r.boja)}
        aria-label={r.naslov || r.brend}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={uska} alt={r.naslov || r.brend} />
        <span className={styles.inlineOznaka}>Sponzorisano</span>
      </a>
    );
  }

  return (
    <a
      ref={ref}
      {...linkProps(r, ctx)}
      className={styles.inline}
      style={bojeBrenda(r.boja)}
    >
      <span className={styles.inlineOznaka}>Sponzorisano</span>
      <BrendZnak r={r} velicina="mali" />
      <span className={styles.inlineTijelo}>
        {r.naslov && <span className={styles.inlineNaslov}>{r.naslov}</span>}
        {r.tekst && <span className={styles.inlineTekst}>{r.tekst}</span>}
      </span>
    </a>
  );
}
