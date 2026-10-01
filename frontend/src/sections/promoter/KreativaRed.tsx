"use client";

import Link from "next/link";
import { reklamaSlikaUrl, type PromoterReklama } from "src/api/reklame";
import { nazivPozicije } from "src/data/reklame";
import { fmtTermin } from "./format";
import p from "./portal.module.css";

const KRATKO: Record<string, string> = {
  SIDEBAR_LIJEVO: "bočni",
  SIDEBAR_DESNO: "bočni",
  INLINE: "nativna",
  MODAL: "poruka",
  DUGME: "dugme",
};

function kratakLink(url: string): string {
  try {
    const u = new URL(url);
    const put = u.pathname.length > 1 ? `${u.pathname.slice(0, 12)}...` : "";
    return `${u.hostname.replace(/^www\./, "")}${put}`;
  } catch {
    return url;
  }
}

export function opisKreative(r: PromoterReklama): string {
  const vrsta =
    r.format === "SLIKA"
      ? "baner"
      : [...new Set(r.pozicije.map((x) => KRATKO[x] ?? nazivPozicije(x)))].join(" + ");
  return `${vrsta} · link: ${kratakLink(r.ctaUrl)}`;
}

export function StatusKreative({ r }: { r: PromoterReklama }) {
  const map = {
    UTOKU: { cls: p.statusAktivna, tekst: "Aktivna" },
    ZAKAZANA: { cls: p.statusZakazana, tekst: `Zakazana ${fmtTermin(r.pocetak, false).slice(0, 6)}` },
    PAUZIRANA: { cls: p.statusPauzirana, tekst: "Pauzirana" },
    ISTEKLA: { cls: p.statusIstekla, tekst: "Istekla" },
  } as const;
  const s = map[r.stanje];
  return (
    <span className={`${p.status} ${s.cls}`}>
      <span className={p.statusTacka} aria-hidden="true" />
      {s.tekst}
    </span>
  );
}

export function KreativaSlicica({ r }: { r: PromoterReklama }) {
  const slika = reklamaSlikaUrl(r.format === "SLIKA" ? r.slikaUrl : null);
  return (
    <span className={p.kreativaSlicica} style={{ borderColor: r.boja }} aria-hidden="true">
      {slika && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={slika} alt="" />
      )}
    </span>
  );
}

export default function KreativaRed({ r }: { r: PromoterReklama }) {
  return (
    <Link href={`/promoter/kreative/${r.id}`} className={p.kreativa}>
      <KreativaSlicica r={r} />
      <span className={p.kreativaTekst}>
        <span className={p.kreativaNaziv}>{r.naslov || r.naziv}</span>
        <span className={p.kreativaMeta}>{opisKreative(r)}</span>
      </span>
      <StatusKreative r={r} />
    </Link>
  );
}
