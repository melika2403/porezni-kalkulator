"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import VrijemeInput from "src/components/VrijemeInput/VrijemeInput";
import {
  getMojeReklame,
  getReklama,
  getStatistikaReklame,
  izmijeniReklamu,
  kreirajReklamu,
  promijeniStatusReklame,
  reklamaSlikaUrl,
  uploadSlikeReklame,
  type JavnaReklama,
  type PromoterReklama,
  type ReklamaFormat,
  type ReklamaPayload,
} from "src/api/partner";
import {
  POZICIJE,
  STRANICE,
  nazivPozicije,
  nazivStranice,
  type ReklamaPozicija,
  type ReklamaStranica,
} from "src/data/partner";
import {
  ReklamaBanerKartica,
  ReklamaInlineKartica,
  ReklamaStubKartica,
  bojeBrenda,
} from "src/components/PartnerSlot/Kartica";
import {
  DUGME_KLASA,
  DugmeSaBrendom,
  ModalPoruka,
} from "src/components/PartnerSlot/Slot";
import {
  STANJE,
  datumVrijemeUIso,
  fmtBroj,
  fmtCtr,
  fmtTermin,
  isoUDatumVrijeme,
  porukaGreske,
} from "./format";
import { REKLAME_KEY } from "./kljucevi";
import s from "./editor.module.css";

type Forma = {
  naziv: string;
  format: ReklamaFormat;
  brend: string;
  oznaka: string;
  naslov: string;
  tekst: string;
  ctaTekst: string;
  ctaUrl: string;
  sekundarniTekst: string;
  sekundarniUrl: string;
  slikaUrl: string | null;
  slikaUskaUrl: string | null;
  logoUrl: string | null;
  logo2Url: string | null;
  boja: string;
  pozicije: ReklamaPozicija[];
  sveStranice: boolean;
  stranice: ReklamaStranica[];
  odDatum: string;
  odVrijeme: string;
  doDatum: string;
  doVrijeme: string;
  tezina: number;
};

function praznaForma(prethodna?: PromoterReklama): Forma {
  const sada = new Date();
  const zaMjesec = new Date(sada.getTime() + 30 * 86400000);
  const od = isoUDatumVrijeme(sada.toISOString());
  const doD = isoUDatumVrijeme(zaMjesec.toISOString());
  return {
    naziv: "",
    format: "SABLON",
    // brend, logo i boja se preuzimaju iz zadnje reklame (ista banka)
    brend: prethodna?.brend ?? "",
    oznaka: "",
    naslov: "",
    tekst: "",
    ctaTekst: "Saznaj više",
    ctaUrl: "",
    sekundarniTekst: "",
    sekundarniUrl: "",
    slikaUrl: null,
    slikaUskaUrl: null,
    logoUrl: prethodna?.logoUrl ?? null,
    logo2Url: null,
    boja: prethodna?.boja ?? "#d9232d",
    pozicije: ["SIDEBAR_LIJEVO", "SIDEBAR_DESNO"],
    sveStranice: true,
    stranice: [],
    odDatum: od.datum,
    odVrijeme: od.vrijeme,
    doDatum: doD.datum,
    doVrijeme: "23:59",
    tezina: 1,
  };
}

function izReklame(r: PromoterReklama): Forma {
  const od = isoUDatumVrijeme(r.pocetak);
  const doD = isoUDatumVrijeme(r.kraj);
  const sve = r.stranice.includes("*");
  return {
    naziv: r.naziv,
    format: r.format,
    brend: r.brend,
    oznaka: r.oznaka ?? "",
    naslov: r.naslov ?? "",
    tekst: r.tekst ?? "",
    ctaTekst: r.ctaTekst ?? "",
    ctaUrl: r.ctaUrl,
    sekundarniTekst: r.sekundarniTekst ?? "",
    sekundarniUrl: r.sekundarniUrl ?? "",
    slikaUrl: r.slikaUrl,
    slikaUskaUrl: r.slikaUskaUrl,
    logoUrl: r.logoUrl,
    logo2Url: r.logo2Url,
    boja: r.boja,
    pozicije: r.pozicije,
    sveStranice: sve,
    stranice: sve ? [] : (r.stranice as ReklamaStranica[]),
    odDatum: od.datum,
    odVrijeme: od.vrijeme,
    doDatum: doD.datum,
    doVrijeme: doD.vrijeme,
    tezina: r.tezina,
  };
}

// "procredit.ba" -> "https://procredit.ba"; prazno ostaje prazno, a
// nevaljan link vraća null (poruka umjesto tihog odbijanja forme)
function normalizujLink(v: string): string | null {
  const t = v.trim();
  if (!t) return "";
  const saShemom = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(saShemom);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

function uPayload(f: Forma): ReklamaPayload | string {
  if (!f.naziv.trim()) return "Upišite naziv kampanje.";
  if (!f.brend.trim()) return "Upišite naziv brenda.";
  if (f.format === "SABLON" && !f.naslov.trim()) return "Upišite naslov reklame.";
  if (f.format === "SLIKA" && !f.slikaUrl) return "Učitajte sliku banera.";
  const ctaUrl = normalizujLink(f.ctaUrl);
  if (!ctaUrl) return "Upišite ispravan link, npr. procredit.ba ili https://www.procredit.ba/racun.";
  const sekundarniUrl = normalizujLink(f.sekundarniUrl);
  if (sekundarniUrl === null) return "Drugi link nije ispravan.";
  const pocetak = datumVrijemeUIso(f.odDatum, f.odVrijeme);
  const kraj = datumVrijemeUIso(f.doDatum, f.doVrijeme || "23:59");
  if (!pocetak || !kraj) return "Unesite datum početka i kraja prikazivanja.";
  if (new Date(kraj) <= new Date(pocetak)) return "Kraj mora biti poslije početka.";
  if (f.pozicije.length === 0) return "Izaberite bar jednu poziciju.";
  if (!f.sveStranice && f.stranice.length === 0) return "Izaberite bar jednu stranicu.";
  const t = (v: string) => (v.trim() ? v.trim() : null);
  return {
    naziv: f.naziv.trim(),
    format: f.format,
    brend: f.brend.trim(),
    oznaka: t(f.oznaka),
    naslov: t(f.naslov),
    tekst: t(f.tekst),
    ctaTekst: t(f.ctaTekst),
    ctaUrl,
    sekundarniTekst: t(f.sekundarniTekst),
    sekundarniUrl: sekundarniUrl || null,
    slikaUrl: f.slikaUrl,
    slikaUskaUrl: f.slikaUskaUrl,
    logoUrl: f.logoUrl,
    logo2Url: f.logo2Url,
    boja: f.boja,
    pozicije: f.pozicije,
    stranice: f.sveStranice ? ["*"] : f.stranice,
    pocetak,
    kraj,
    tezina: f.tezina,
  };
}

export default function ReklamaEditor({ id }: { id?: string }) {
  const reklamaId = id ? Number(id) : null;
  const nova = reklamaId === null;

  const postojeca = useQuery({
    queryKey: ["promoter-reklama", reklamaId],
    queryFn: () => unwrap(getReklama(reklamaId!)),
    enabled: !nova,
  });
  const sve = useQuery({
    queryKey: REKLAME_KEY,
    queryFn: () => unwrap(getMojeReklame()),
    enabled: nova,
  });

  if (!nova && postojeca.error) {
    return (
      <div className={s.stranica}>
        <p className={s.greska}>{porukaGreske(postojeca.error)}</p>
        <Link href="/partner/kreative" className={s.sekundarno}>
          Nazad na kreative
        </Link>
      </div>
    );
  }

  // forma se puni jednom: iz postojeće reklame, ili prazna (sa brendom iz zadnje)
  const pocetna = nova
    ? sve.isLoading
      ? null
      : praznaForma(sve.data?.[0])
    : postojeca.data
      ? izReklame(postojeca.data)
      : null;

  if (!pocetna) {
    return (
      <div className={s.stranica}>
        <p className={s.prazno}>Učitavanje...</p>
      </div>
    );
  }

  return (
    <EditorForma
      key={reklamaId ?? "nova"}
      reklamaId={reklamaId}
      pocetna={pocetna}
      r={postojeca.data}
    />
  );
}

function EditorForma({
  reklamaId,
  pocetna,
  r,
}: {
  reklamaId: number | null;
  pocetna: Forma;
  r: PromoterReklama | undefined;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const nova = reklamaId === null;

  const [forma, setForma] = useState<Forma>(pocetna);
  const [greska, setGreska] = useState<string | null>(null);
  const [sacuvano, setSacuvano] = useState(false);
  const [pregledPozicija, setPregledPozicija] = useState<ReklamaPozicija>("SIDEBAR_LIJEVO");

  const postavi = <K extends keyof Forma>(k: K, v: Forma[K]) => {
    setSacuvano(false);
    setForma((f) => ({ ...f, [k]: v }));
  };

  const snimi = useMutation({
    mutationFn: async () => {
      const p = uPayload(forma);
      if (typeof p === "string") throw new Error(p);
      return unwrap(nova ? kreirajReklamu(p) : izmijeniReklamu(reklamaId!, p));
    },
    onSuccess: (r) => {
      setGreska(null);
      setSacuvano(true);
      qc.invalidateQueries({ queryKey: REKLAME_KEY });
      qc.setQueryData(["promoter-reklama", r.id], r);
      // javni slotovi u istoj sesiji odmah vide izmjenu
      qc.invalidateQueries({ queryKey: ["reklame-aktivne"] });
      qc.invalidateQueries({ queryKey: ["promoter-pregled"] });
      if (nova) router.replace(`/partner/kreative/${r.id}`);
    },
    onError: (e) => setGreska(porukaGreske(e)),
  });

  const status = useMutation({
    mutationFn: (novi: "AKTIVNA" | "PAUZIRANA") =>
      unwrap(promijeniStatusReklame(reklamaId!, novi)),
    onSuccess: (r) => {
      qc.setQueryData(["promoter-reklama", r.id], r);
      qc.invalidateQueries({ queryKey: REKLAME_KEY });
      qc.invalidateQueries({ queryKey: ["reklame-aktivne"] });
      qc.invalidateQueries({ queryKey: ["promoter-pregled"] });
    },
    onError: (e) => setGreska(porukaGreske(e)),
  });

  const pregled: JavnaReklama = useMemo(() => {
    return {
      id: 0,
      format: forma.format,
      brend: forma.brend || "Naziv banke",
      oznaka: forma.oznaka || null,
      naslov: forma.naslov || (forma.format === "SABLON" ? "Naslov reklame" : null),
      tekst: forma.tekst || null,
      ctaTekst: forma.ctaTekst || null,
      sekundarniTekst: forma.sekundarniUrl ? forma.sekundarniTekst || null : null,
      slikaUrl: forma.slikaUrl,
      slikaUskaUrl: forma.slikaUskaUrl,
      logoUrl: forma.logoUrl,
      logo2Url: forma.logo2Url,
      boja: forma.boja,
    };
  }, [forma]);

  const st = r ? STANJE[r.stanje] : null;

  return (
    <div className={s.stranica}>
      <div className={s.zaglavlje}>
        <div>
          <Link href="/partner/kreative" className={s.nazad}>
            ← Kreative
          </Link>
          <h1 className={s.naslov}>{nova ? "Nova kreativa" : forma.naziv || "Reklama"}</h1>
          {r && st && (
            <p className={s.podnaslov}>
              <span className={`${s.badge} ${s[st.cls]}`}>{st.label}</span>{" "}
              {fmtTermin(r.pocetak)} – {fmtTermin(r.kraj)}
            </p>
          )}
        </div>
        {r && r.stanje !== "ISTEKLA" && (
          <button
            type="button"
            className={s.sekundarno}
            disabled={status.isPending}
            onClick={() => status.mutate(r.status === "AKTIVNA" ? "PAUZIRANA" : "AKTIVNA")}
          >
            {r.status === "AKTIVNA" ? "Pauziraj prikazivanje" : "Pokreni prikazivanje"}
          </button>
        )}
      </div>

      {/* noValidate: native validacija je tiho odbijala formu i skrolovala na
          vrh (npr. link bez https://); provjere radi uPayload, sa porukom */}
      <form
        className={s.editor}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          snimi.mutate();
        }}
      >
        <div className={s.editorForma}>
          {/* ── Osnovno ── */}
          <section className={s.kartica}>
            <h2 className={s.sekcijaNaslov}>Osnovno</h2>
            <Polje label="Naziv kampanje" napomena="Vidite ga samo vi, npr. ProStart jesen 2026.">
              <input
                className={s.input}
                value={forma.naziv}
                onChange={(e) => postavi("naziv", e.target.value)}
                maxLength={120}
                required
              />
            </Polje>
            <div className={s.dvaStupca}>
              <Polje label="Brend">
                <input
                  className={s.input}
                  value={forma.brend}
                  onChange={(e) => postavi("brend", e.target.value)}
                  maxLength={60}
                  placeholder="npr. ProCredit Bank"
                  required
                />
              </Polje>
              <Polje label="Boja brenda">
                <div className={s.bojaRed}>
                  <input
                    type="color"
                    className={s.boja}
                    value={forma.boja}
                    onChange={(e) => postavi("boja", e.target.value)}
                    aria-label="Boja brenda"
                  />
                  <code>{forma.boja}</code>
                </div>
              </Polje>
            </div>
            <UploadSlike
              label="Logo (opcionalno)"
              napomena="Bez loga se ispisuje naziv brenda. Najbolje PNG sa providnom pozadinom."
              url={forma.logoUrl}
              onChange={(u) => postavi("logoUrl", u)}
            />
            <UploadSlike
              label="Logo partnera u ponudi (opcionalno)"
              napomena="Za zajedničku ponudu, npr. banka + MojObrt. Prikazuje se pored vašeg loga na širokom baneru."
              url={forma.logo2Url}
              onChange={(u) => postavi("logo2Url", u)}
            />
          </section>

          {/* ── Sadržaj ── */}
          <section className={s.kartica}>
            <h2 className={s.sekcijaNaslov}>Sadržaj</h2>
            <div className={s.segment} role="radiogroup" aria-label="Vrsta reklame">
              {(
                [
                  ["SABLON", "Šablon", "Vi unosite tekst, mi iscrtavamo u boji brenda"],
                  ["SLIKA", "Gotov baner", "Učitavate sliku, klik vodi na link"],
                ] as const
              ).map(([v, l, o]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={forma.format === v}
                  className={`${s.segmentDugme} ${forma.format === v ? s.segmentAktivno : ""}`}
                  onClick={() => postavi("format", v)}
                >
                  <strong>{l}</strong>
                  <span>{o}</span>
                </button>
              ))}
            </div>

            {forma.format === "SABLON" ? (
              <>
                <Polje
                  label="Oznaka iznad naslova (opcionalno)"
                  napomena="Široki baner na početnoj, npr. Ponuda za nove obrtnike."
                >
                  <input
                    className={s.input}
                    value={forma.oznaka}
                    onChange={(e) => postavi("oznaka", e.target.value)}
                    maxLength={60}
                  />
                </Polje>
                <Polje
                  label="Naslov"
                  napomena="Dio između zvjezdica se ističe, npr. Pokrenite obrt *bez početnih troškova*."
                >
                  <input
                    className={s.input}
                    value={forma.naslov}
                    onChange={(e) => postavi("naslov", e.target.value)}
                    maxLength={120}
                    placeholder="npr. 6 mjeseci bez troškova"
                    required
                  />
                </Polje>
                <Polje
                  label="Tekst"
                  napomena={`*Ovako* je podebljano. ${forma.tekst.length}/400`}
                >
                  <textarea
                    className={s.textarea}
                    value={forma.tekst}
                    onChange={(e) => postavi("tekst", e.target.value)}
                    maxLength={400}
                    rows={3}
                    placeholder="npr. Jednostavno. Transparentno. Bez naknada."
                  />
                </Polje>
                <UploadSlike
                  label="Ilustracija (opcionalno)"
                  napomena="Crta se u sredini bočnog stuba."
                  url={forma.slikaUrl}
                  onChange={(u) => postavi("slikaUrl", u)}
                />
              </>
            ) : (
              <>
                <UploadSlike
                  label="Baner za bočne stubove"
                  napomena="Uspravan, preporuka 300 x 600 px (PNG, JPG ili WEBP, do 2 MB)."
                  url={forma.slikaUrl}
                  onChange={(u) => postavi("slikaUrl", u)}
                />
                <UploadSlike
                  label="Vodoravni baner (kartica u obrascu)"
                  napomena="Preporuka 640 x 120 px. Bez njega se koristi uspravni."
                  url={forma.slikaUskaUrl}
                  onChange={(u) => postavi("slikaUskaUrl", u)}
                />
                <Polje label="Naslov (alt tekst i poruka poslije preuzimanja)">
                  <input
                    className={s.input}
                    value={forma.naslov}
                    onChange={(e) => postavi("naslov", e.target.value)}
                    maxLength={120}
                  />
                </Polje>
                <Polje label="Tekst poruke poslije preuzimanja (opcionalno)">
                  <textarea
                    className={s.textarea}
                    value={forma.tekst}
                    onChange={(e) => postavi("tekst", e.target.value)}
                    maxLength={400}
                    rows={2}
                  />
                </Polje>
              </>
            )}

            <div className={s.dvaStupca}>
              <Polje label="Tekst dugmeta">
                <input
                  className={s.input}
                  value={forma.ctaTekst}
                  onChange={(e) => postavi("ctaTekst", e.target.value)}
                  maxLength={40}
                  placeholder="Otvori račun"
                />
              </Polje>
              <Polje label="Link">
                <input
                  className={s.input}
                  inputMode="url"
                  value={forma.ctaUrl}
                  onChange={(e) => postavi("ctaUrl", e.target.value)}
                  placeholder="npr. procredit.ba"
                  required
                />
              </Polje>
            </div>
            <div className={s.dvaStupca}>
              <Polje label="Drugi link, tekst (opcionalno)" napomena="Samo u poruci poslije preuzimanja.">
                <input
                  className={s.input}
                  value={forma.sekundarniTekst}
                  onChange={(e) => postavi("sekundarniTekst", e.target.value)}
                  maxLength={60}
                  placeholder="Saznaj više o paketu"
                />
              </Polje>
              <Polje label="Drugi link, adresa">
                <input
                  className={s.input}
                  inputMode="url"
                  value={forma.sekundarniUrl}
                  onChange={(e) => postavi("sekundarniUrl", e.target.value)}
                  placeholder="npr. procredit.ba"
                />
              </Polje>
            </div>
          </section>

          {/* ── Gdje ── */}
          <section className={s.kartica}>
            <h2 className={s.sekcijaNaslov}>Gdje se prikazuje</h2>
            <p className={s.labela}>Stranice</p>
            <label className={s.cek}>
              <input
                type="checkbox"
                checked={forma.sveStranice}
                onChange={(e) => postavi("sveStranice", e.target.checked)}
              />
              <span>Sve stranice sa oglasnim mjestima (i buduće)</span>
            </label>
            {!forma.sveStranice && (
              <div className={s.cekMreza}>
                {STRANICE.map((st) => (
                  <label key={st.id} className={s.cek}>
                    <input
                      type="checkbox"
                      checked={forma.stranice.includes(st.id)}
                      onChange={(e) =>
                        postavi(
                          "stranice",
                          e.target.checked
                            ? [...forma.stranice, st.id]
                            : forma.stranice.filter((x) => x !== st.id),
                        )
                      }
                    />
                    <span>{st.naziv}</span>
                  </label>
                ))}
              </div>
            )}

            <p className={`${s.labela} ${s.labelaRazmak}`}>
              Pozicije
            </p>
            <div className={s.pozicije}>
              {POZICIJE.map((p) => (
                <label key={p.id} className={s.pozicija}>
                  <input
                    type="checkbox"
                    checked={forma.pozicije.includes(p.id)}
                    onChange={(e) =>
                      postavi(
                        "pozicije",
                        e.target.checked
                          ? [...forma.pozicije, p.id]
                          : forma.pozicije.filter((x) => x !== p.id),
                      )
                    }
                  />
                  <span>
                    <strong>{p.naziv}</strong>
                    <small>{p.opis}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* ── Kada ── */}
          <section className={s.kartica}>
            <h2 className={s.sekcijaNaslov}>Termin prikazivanja</h2>
            <div className={s.terminRed}>
              <Polje label="Od">
                <div className={s.datumRed}>
                  <DateInput
                    className={s.input}
                    value={forma.odDatum}
                    onValueChange={(v) => postavi("odDatum", v)}
                    required
                  />
                  <VrijemeInput
                    className={s.input}
                    value={forma.odVrijeme}
                    onValueChange={(v) => postavi("odVrijeme", v)}
                    aria-label="Vrijeme početka"
                  />
                </div>
              </Polje>
              <Polje label="Do">
                <div className={s.datumRed}>
                  <DateInput
                    className={s.input}
                    value={forma.doDatum}
                    onValueChange={(v) => postavi("doDatum", v)}
                    required
                  />
                  <VrijemeInput
                    className={s.input}
                    value={forma.doVrijeme}
                    onValueChange={(v) => postavi("doVrijeme", v)}
                    aria-label="Vrijeme kraja"
                  />
                </div>
              </Polje>
            </div>
            <Polje
              label="Učestalost u rotaciji"
              napomena="Kad je više vaših reklama na istoj poziciji, veći broj se prikazuje češće."
            >
              <StyledSelect
                value={forma.tezina}
                onChange={(v) => postavi("tezina", Number(v))}
                ariaLabel="Učestalost u rotaciji"
                groups={[
                  {
                    options: Array.from({ length: 10 }, (_, i) => i + 1).map((n) => ({
                      value: n,
                      label: n === 1 ? "1 (uobičajeno)" : String(n),
                    })),
                  },
                ]}
              />
            </Polje>
          </section>

          {greska && <p className={s.greska}>{greska}</p>}
          {sacuvano && !greska && (
            <p className={s.uspjeh}>
              Sačuvano. Reklama se prikazuje u zadatom terminu.
            </p>
          )}
          <div className={s.dnoForme}>
            <Link href="/partner/kreative" className={s.sekundarno}>
              Odustani
            </Link>
            <button type="submit" className={s.primarno} disabled={snimi.isPending}>
              {snimi.isPending ? "Čuvanje..." : nova ? "Objavi kreativu" : "Sačuvaj izmjene"}
            </button>
          </div>
        </div>

        {/* ── Pregled ── */}
        <aside className={s.pregled}>
          <div className={s.pregledZaglavlje}>
            <span className={s.labela}>Pregled</span>
            <StyledSelect
              value={pregledPozicija}
              onChange={(v) => setPregledPozicija(v as ReklamaPozicija)}
              ariaLabel="Pozicija za pregled"
              fitPanel
              groups={[{ options: POZICIJE.map((p) => ({ value: p.id, label: p.naziv })) }]}
            />
          </div>
          {!forma.pozicije.includes(pregledPozicija) && (
            <p className={s.napomenaPregled}>
              Ova pozicija nije izabrana, reklama se ovdje neće prikazivati.
            </p>
          )}
          <Pregled r={pregled} pozicija={pregledPozicija} />
        </aside>
      </form>

      {r && <Statistika id={r.id} ukupnoPrikazi={r.prikazi} ukupnoKlikovi={r.klikovi} />}
    </div>
  );
}

function Pregled({ r, pozicija }: { r: JavnaReklama; pozicija: ReklamaPozicija }) {
  const ctx = { stranica: "ams" as const, pozicija, pregled: true };
  if (pozicija === "SIDEBAR_LIJEVO" || pozicija === "SIDEBAR_DESNO") {
    return (
      <div className={s.pregledStub}>
        <ReklamaStubKartica r={r} ctx={ctx} />
      </div>
    );
  }
  if (pozicija === "INLINE") return <ReklamaInlineKartica r={r} ctx={ctx} />;
  if (pozicija === "BANER") {
    // široka kartica je pravljena za punu širinu: u uskoj koloni se smanji
    return (
      <div className={s.pregledSiroki}>
        <div className={s.pregledSirokiUnutra}>
          <ReklamaBanerKartica r={r} ctx={ctx} />
        </div>
      </div>
    );
  }
  if (pozicija === "DUGME") {
    return (
      <div className={s.pregledCentar}>
        <PregledDugme r={r} />
      </div>
    );
  }
  return <ModalPoruka r={r} ctx={ctx} />;
}

function PregledDugme({ r }: { r: JavnaReklama }) {
  // isti izgled kao DugmePreuzimanja sa sponzorom, bez preuzimanja
  return (
    <button type="button" className={DUGME_KLASA} style={bojeBrenda(r.boja)}>
      <DugmeSaBrendom
        r={r}
        label="Preuzmi PDF"
        ikona={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 3v12M7 10l5 5 5-5M5 20h14" />
          </svg>
        }
      />
    </button>
  );
}

function Polje({
  label,
  napomena,
  children,
}: {
  label: string;
  napomena?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={s.polje}>
      <label className={s.labela}>{label}</label>
      {children}
      {napomena && <small className={s.napomena}>{napomena}</small>}
    </div>
  );
}

function UploadSlike({
  label,
  napomena,
  url,
  onChange,
}: {
  label: string;
  napomena?: string;
  url: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [greska, setGreska] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: (f: File) => unwrap(uploadSlikeReklame(f)),
    onSuccess: (d) => {
      setGreska(null);
      onChange(d.url);
    },
    onError: (e) => setGreska(porukaGreske(e)),
  });
  const prikaz = reklamaSlikaUrl(url);

  return (
    <div className={s.polje}>
      <span className={s.labela}>{label}</span>
      <div className={s.upload}>
        {prikaz ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={prikaz} alt="" className={s.uploadSlika} />
        ) : (
          <span className={s.uploadPrazno}>Nema slike</span>
        )}
        <div className={s.uploadAkcije}>
          <button
            type="button"
            className={s.sekundarnoMalo}
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? "Učitavanje..." : prikaz ? "Zamijeni" : "Učitaj sliku"}
          </button>
          {prikaz && (
            <button type="button" className={s.opasnoMalo} onClick={() => onChange(null)}>
              Ukloni
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
            e.target.value = "";
          }}
        />
      </div>
      {napomena && <small className={s.napomena}>{napomena}</small>}
      {greska && <small className={s.greskaMala}>{greska}</small>}
    </div>
  );
}

function Statistika({
  id,
  ukupnoPrikazi,
  ukupnoKlikovi,
}: {
  id: number;
  ukupnoPrikazi: number;
  ukupnoKlikovi: number;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["promoter-reklama-stat", id],
    queryFn: () => unwrap(getStatistikaReklame(id, 30)),
  });

  return (
    <section className={`${s.kartica} ${s.statistikaKartica}`}>
      <h2 className={s.sekcijaNaslov}>Statistika</h2>
      <p className={s.podnaslov}>
        Ukupno {fmtBroj(ukupnoPrikazi)} prikaza i {fmtBroj(ukupnoKlikovi)} klikova (CTR{" "}
        {fmtCtr(ukupnoPrikazi, ukupnoKlikovi)}). Prikaz se broji kad je reklama bar napola
        vidljiva na ekranu.
      </p>
      {isLoading ? (
        <p className={s.prazno}>Učitavanje...</p>
      ) : !data || data.poDanu.length === 0 ? (
        <p className={s.prazno}>U zadnjih 30 dana još nema prikaza.</p>
      ) : (
        <div className={s.statMreza}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Stranica i pozicija</th>
                <th className={s.broj}>Prikazi</th>
                <th className={s.broj}>Klikovi</th>
                <th className={s.broj}>CTR</th>
              </tr>
            </thead>
            <tbody>
              {data.poPoziciji.map((p) => (
                <tr key={`${p.stranica}-${p.pozicija}`}>
                  <td data-label="Mjesto">
                    {nazivStranice(p.stranica)} · {nazivPozicije(p.pozicija)}
                  </td>
                  <td data-label="Prikazi" className={s.broj}>{fmtBroj(p.prikazi)}</td>
                  <td data-label="Klikovi" className={s.broj}>{fmtBroj(p.klikovi)}</td>
                  <td data-label="CTR" className={s.broj}>{fmtCtr(p.prikazi, p.klikovi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Dan</th>
                <th className={s.broj}>Prikazi</th>
                <th className={s.broj}>Klikovi</th>
                <th className={s.broj}>CTR</th>
              </tr>
            </thead>
            <tbody>
              {[...data.poDanu].reverse().map((d) => (
                <tr key={d.datum}>
                  <td data-label="Dan">{d.datum.split("-").reverse().join(".")}.</td>
                  <td data-label="Prikazi" className={s.broj}>{fmtBroj(d.prikazi)}</td>
                  <td data-label="Klikovi" className={s.broj}>{fmtBroj(d.klikovi)}</td>
                  <td data-label="CTR" className={s.broj}>{fmtCtr(d.prikazi, d.klikovi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
