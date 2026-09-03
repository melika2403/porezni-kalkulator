"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  FREELANCER_CIJENA_KM,
  OSNOVNI_ODBITAK_MJESECNO,
  getPostavke,
  putPostavke,
  type FreelancerPostavke as Postavke,
} from "src/api/freelancer";
import { updateProfile, type ProfileUpdatePayload } from "src/api/profile";
import CitySelect from "src/components/CitySelect/CitySelect";
import FreelancerTrialCta, {
  FREELANCER_PRETPLATA_URL,
  useFreelancerPristup,
} from "src/components/FreelancerTrialCta/FreelancerTrialCta";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import { kantonForOpcina } from "src/data/uplatni-racuni";
import { KANTONI, type KantonKey } from "src/sections/ams/fillUplatnica";
import { fmtDatum, fmtKm } from "./format";
import styles from "./freelancer.module.css";

export default function FreelancerPostavke() {
  const qc = useQueryClient();
  const { pristup, hasAccess } = useFreelancerPristup();
  const { data: ucitano } = useQuery({
    queryKey: ["freelancer-postavke"],
    queryFn: () => unwrap(getPostavke()),
  });
  // Lokalno stanje prekidača: pomjeri se odmah na klik (sinhrono u React
  // eventu), server potvrdi ili vrati na učitano. Bez ovoga kontrolisani
  // checkbox na tren skoči nazad dok keš upita ne stigne.
  const [postavke, setPostavke] = useState<Postavke | null>(null);
  useEffect(() => {
    if (ucitano) setPostavke(ucitano);
  }, [ucitano]);
  const snimi = useMutation({
    mutationFn: (patch: Partial<Postavke>) => unwrap(putPostavke(patch)),
    onSuccess: (d) => {
      setPostavke(d);
      qc.setQueryData(["freelancer-postavke"], d);
    },
    onError: () => {
      if (ucitano) setPostavke(ucitano);
    },
  });
  const promijeni = (patch: Partial<Postavke>) => {
    setPostavke((p) => (p ? { ...p, ...patch } : p));
    snimi.mutate(patch);
  };

  return (
    <div className={styles.grid2}>
      <PodaciKartica postavke={postavke} onPrebivaliste={promijeni} />
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          <span>
            Podsjetnici na <em>email</em>
          </span>
          <span>{hasAccess ? "uključeno u paket" : "aktivni uz paket ili probu"}</span>
        </h2>
        {!postavke ? (
          <div className={styles.muted}>Učitavanje postavki...</div>
        ) : (
          <>
            <label className={styles.switchRow}>
              <input
                type="checkbox"
                checked={postavke.freelancerRok}
                onChange={(e) => promijeni({ freelancerRok: e.target.checked })}
              />
              <span className={styles.switchText}>
                <strong>Rok za predaju AMS-1035</strong>
                <span>Dan prije i na dan roka (5 dana od primitka), samo za uplate koje nisu označene kao predane.</span>
              </span>
            </label>
            <label className={styles.switchRow}>
              <input
                type="checkbox"
                checked={postavke.freelancerGpd}
                onChange={(e) => promijeni({ freelancerGpd: e.target.checked })}
              />
              <span className={styles.switchText}>
                <strong>GPD-1051 u martu</strong>
                <span>1. i 20. marta, ako u evidenciji imate uplate iz prethodne godine.</span>
              </span>
            </label>
          </>
        )}
        <p className={styles.hint} style={{ marginTop: "0.8rem" }}>
          Podsjetnici stižu i u sanduče na sajtu. Email ide na adresu sa profila.
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          <span>
            Paket i <em>pristup</em>
          </span>
        </h2>
        {pristup && (
          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "13.5px", lineHeight: 1.8 }}>
            <li>
              Status:{" "}
              <strong>
                {pristup.izvor === "freelancer"
                  ? `PK Freelancer paket${pristup.endDate ? ` do ${fmtDatum(pristup.endDate)}` : ""}`
                  : pristup.izvor === "proba"
                    ? `probni period do ${fmtDatum(pristup.proba.endsAt)}`
                    : pristup.izvor === "paket"
                      ? "uključeno u vaš paket"
                      : pristup.izvor === "admin"
                        ? "administrator"
                        : "besplatni nivo"}
              </strong>
            </li>
            <li>
              Sačuvane uplate ove godine: <strong>{pristup.brojUplataOveGodine}</strong>
              {!hasAccess && ` od ${pristup.besplatno.maxUplataGodisnje} besplatno`}
            </li>
            <li>
              Isplatioci: <strong>{pristup.brojIsplatilaca}</strong>
              {!hasAccess && ` od ${pristup.besplatno.maxIsplatilaca} besplatno`}
            </li>
            {pristup.proba.iskoristena && pristup.izvor !== "proba" && <li>Probni period je iskorišten.</li>}
          </ul>
        )}
        {!hasAccess && <FreelancerTrialCta variant="inline" what={`PK Freelancer: ${FREELANCER_CIJENA_KM} KM godišnje sa PDV-om, plaćanje po predračunu.`} />}
        {hasAccess && pristup?.izvor === "proba" && (
          <p className={styles.hint} style={{ marginTop: "0.8rem" }}>
            Da nastavite bez prekida poslije probe:{" "}
            <Link href={FREELANCER_PRETPLATA_URL}>zatražite predračun</Link> ({FREELANCER_CIJENA_KM} KM godišnje sa PDV-om).
          </p>
        )}
      </div>

      <OdbitakKartica postavke={postavke} onSnimi={promijeni} greska={snimi.error} />
      <PrebivalisteKartica postavke={postavke} onSnimi={promijeni} greska={snimi.error} />
    </div>
  );
}

/**
 * Podaci o primaocu (Dio 1 obrasca): ime, prezime, JMBG, adresa i grad. To su
 * ista polja kao na profilu, samo uređena tu gdje trebaju: promjena ovdje
 * mijenja profil, promjena na profilu vidi se ovdje, drugog zapisa nema.
 * Pretplatniku AMS generator ove podatke popuni sam, ručni unos ih koristi
 * oduvijek. Grad sa liste usput upiše i prebivalište za uplatnice ako još
 * nije izabrano.
 */
function PodaciKartica({
  postavke,
  onPrebivaliste,
}: {
  postavke: Postavke | null;
  onPrebivaliste: (patch: Partial<Postavke>) => void;
}) {
  const qc = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
  const [ime, setIme] = useState("");
  const [prezime, setPrezime] = useState("");
  const [jmbg, setJmbg] = useState("");
  const [adresa, setAdresa] = useState("");
  const [grad, setGrad] = useState("");
  const [gradOk, setGradOk] = useState(true);
  const [dirnuto, setDirnuto] = useState(false);
  const [spremljeno, setSpremljeno] = useState(false);
  useEffect(() => {
    if (!user || dirnuto) return;
    setIme(user.firstName ?? "");
    setPrezime(user.lastName ?? "");
    setJmbg(user.jmbg ?? "");
    setAdresa(user.address ?? "");
    setGrad(user.city ?? "");
  }, [user, dirnuto]);

  const snimi = useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => unwrap(updateProfile(user!.id, payload)),
    onSuccess: async () => {
      // prvo svjež profil u kešu (Navbar, AMS, ručni unos), pa tek onda
      // lokalna polja ponovo prate keš, inače bi na tren skočila na staro
      await qc.invalidateQueries({ queryKey: ["me"] });
      setDirnuto(false);
      setSpremljeno(true);
      setTimeout(() => setSpremljeno(false), 3000);
    },
  });

  const jmbgOk = jmbg.trim() === "" || /^\d{13}$/.test(jmbg.trim());
  const popunjeno = ime.trim() !== "" && prezime.trim() !== "";
  const izmijenjeno =
    !!user &&
    (ime.trim() !== (user.firstName ?? "") ||
      prezime.trim() !== (user.lastName ?? "") ||
      jmbg.trim() !== (user.jmbg ?? "") ||
      adresa.trim() !== (user.address ?? "") ||
      grad.trim() !== (user.city ?? ""));
  const kompletno = !!user?.firstName && !!user?.lastName && !!user?.jmbg && !!user?.address && !!user?.city;

  const sacuvaj = () => {
    if (!user) return;
    snimi.mutate({
      firstName: ime.trim(),
      lastName: prezime.trim(),
      // prazno ide kao null da se polje na profilu zaista obriše
      jmbg: jmbg.trim() || null,
      address: adresa.trim() || null,
      city: grad.trim() || null,
    });
    if (postavke && !postavke.kanton && grad.trim()) {
      const k = kantonForOpcina(grad.trim());
      if (k) onPrebivaliste({ kanton: k.kantonKey, opcina: k.opcinaKod });
    }
  };

  return (
    <div className={`${styles.card} ${styles.cardFull}`}>
      <h2 className={styles.cardTitle}>
        <span>
          Vaši podaci na <em>obrascu</em>
        </span>
        <span>{kompletno ? "Dio 1 se popunjava sam" : "dopunite za automatsku popunu Dijela 1"}</span>
      </h2>
      {!user ? (
        <div className={styles.muted}>Učitavanje profila...</div>
      ) : (
        <>
          <div className={styles.podaciGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Ime</span>
              <input
                className={styles.input}
                value={ime}
                onChange={(e) => {
                  setDirnuto(true);
                  setIme(e.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Prezime</span>
              <input
                className={styles.input}
                value={prezime}
                onChange={(e) => {
                  setDirnuto(true);
                  setPrezime(e.target.value);
                }}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>JMBG</span>
              <input
                className={styles.input}
                inputMode="numeric"
                maxLength={13}
                placeholder="13 cifara"
                value={jmbg}
                onChange={(e) => {
                  setDirnuto(true);
                  setJmbg(e.target.value.replace(/\D/g, "").slice(0, 13));
                }}
              />
            </label>
            <label className={`${styles.field} ${styles.podaciSpan2}`}>
              <span className={styles.fieldLabel}>Adresa</span>
              <input
                className={styles.input}
                placeholder="Ulica i broj"
                value={adresa}
                onChange={(e) => {
                  setDirnuto(true);
                  setAdresa(e.target.value);
                }}
              />
            </label>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Grad</span>
              <CitySelect
                value={grad}
                onChange={(v) => {
                  setDirnuto(true);
                  setGrad(v);
                }}
                className={styles.input}
                strict
                onValidityChange={setGradOk}
              />
            </div>
          </div>
          <div className={styles.formActions} style={{ marginTop: "0.9rem" }}>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!izmijenjeno || !popunjeno || !jmbgOk || !gradOk || snimi.isPending}
              onClick={sacuvaj}
            >
              {snimi.isPending ? "Snimanje..." : "Sačuvaj podatke"}
            </button>
            {spremljeno && <span className={styles.hint}>Sačuvano, profil je ažuriran.</span>}
          </div>
          {!jmbgOk && <p className={`${styles.hint} ${styles.hintErr}`}>JMBG ima tačno 13 cifara.</p>}
          {!gradOk && grad.trim() !== "" && (
            <p className={`${styles.hint} ${styles.hintErr}`}>Grad odaberite sa liste, po njemu se biraju uplatnice.</p>
          )}
          {snimi.error != null && (
            <p className={`${styles.hint} ${styles.hintErr}`}>Podaci nisu sačuvani. Pokušajte ponovo.</p>
          )}
          <p className={styles.hint} style={{ marginTop: "0.8rem" }}>
            Ovo su isti podaci kao na vašem <Link href="/profil?tab=profil">profilu</Link>: gdje god ih
            promijenite, vrijede svuda. JMBG se čuva kriptovan. Uz paket ili probu AMS generator
            ovim podacima sam popuni Dio 1 obrasca, a ručni unos ih koristi za svaku uplatu.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Kanton i općina prebivališta: određuju račune na uplatnicama (kantonalni
 * zavod, budžet kantona). Jednom upisani, AMS generator i ručni unos ih
 * predpopune, pa se ne biraju kod svake uplate.
 */
function PrebivalisteKartica({
  postavke,
  onSnimi,
  greska,
}: {
  postavke: Postavke | null;
  onSnimi: (patch: Partial<Postavke>) => void;
  greska: unknown;
}) {
  const [kanton, setKanton] = useState("");
  const [opcina, setOpcina] = useState("");
  const [dirnuto, setDirnuto] = useState(false);
  useEffect(() => {
    if (!postavke || dirnuto) return;
    setKanton(postavke.kanton ?? "");
    setOpcina(postavke.opcina ?? "");
  }, [postavke, dirnuto]);

  const kantonData = kanton && kanton in KANTONI ? KANTONI[kanton as KantonKey] : null;
  const snimljeno = !!postavke?.kanton && !!postavke?.opcina;
  const izmijenjeno = (postavke?.kanton ?? "") !== kanton || (postavke?.opcina ?? "") !== opcina;

  return (
    <div className={`${styles.card} ${styles.cardFull}`}>
      <h2 className={styles.cardTitle}>
        <span>
          Prebivalište za <em>uplatnice</em>
        </span>
        <span>{snimljeno ? "AMS i ručni unos ga predpopune" : "bira se kod svake uplate dok nije upisano"}</span>
      </h2>
      {!postavke ? (
        <div className={styles.muted}>Učitavanje postavki...</div>
      ) : (
        <>
          <div className={styles.odbitakRed}>
            <div className={styles.field} style={{ flexBasis: 240 }}>
              <span className={styles.fieldLabel}>Kanton</span>
              <StyledSelect
                value={kanton || null}
                onChange={(v) => {
                  setDirnuto(true);
                  setKanton(String(v ?? ""));
                  setOpcina("");
                }}
                ariaLabel="Kanton prebivališta"
                placeholder="Izaberi kanton"
                groups={[
                  {
                    options: (Object.keys(KANTONI) as KantonKey[]).map((k) => ({
                      value: k,
                      label: KANTONI[k].ime,
                    })),
                  },
                ]}
              />
            </div>
            <div className={styles.field} style={{ flexBasis: 240 }}>
              <span className={styles.fieldLabel}>Općina</span>
              <StyledSelect
                value={opcina || null}
                onChange={(v) => {
                  setDirnuto(true);
                  setOpcina(String(v ?? ""));
                }}
                ariaLabel="Općina prebivališta"
                placeholder={kanton ? "Izaberi općinu" : "Prvo kanton"}
                disabled={!kanton}
                groups={[
                  {
                    options: (kantonData?.opcine ?? []).map((o) => ({ value: o.kod, label: o.ime })),
                  },
                ]}
              />
            </div>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!izmijenjeno || (!!kanton && !opcina)}
              onClick={() => {
                setDirnuto(false);
                onSnimi({ kanton: kanton || null, opcina: kanton ? opcina || null : null });
              }}
            >
              Sačuvaj prebivalište
            </button>
            {snimljeno && (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => {
                  setDirnuto(false);
                  setKanton("");
                  setOpcina("");
                  onSnimi({ kanton: null, opcina: null });
                }}
              >
                Ukloni
              </button>
            )}
          </div>
          {greska != null && (
            <p className={`${styles.hint} ${styles.hintErr}`}>Prebivalište nije sačuvano. Pokušajte ponovo.</p>
          )}
          <p className={styles.hint} style={{ marginTop: "0.8rem" }}>
            Po kantonu i općini se biraju računi na uplatnicama: kantonalni zavod
            zdravstvenog osiguranja i budžet kantona. Ako se preselite, promijenite ovdje,
            a na samoj uplati uvijek možete izabrati drugu općinu.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Lični odbitak sa porezne kartice (PK-1001). Koeficijent puta 300 KM puta broj
 * mjeseci u kojima je kartica važila daje godišnji odbitak, koji GPD-1051
 * predpopuni u red 18. Bez kartice odbitka nema, pa je polje prazno.
 */
function OdbitakKartica({
  postavke,
  onSnimi,
  greska,
}: {
  postavke: Postavke | null;
  onSnimi: (patch: Partial<Postavke>) => void;
  greska: unknown;
}) {
  const [koef, setKoef] = useState("");
  const [mjeseci, setMjeseci] = useState("");
  const [dirnuto, setDirnuto] = useState(false);
  useEffect(() => {
    if (!postavke || dirnuto) return;
    setKoef(
      postavke.koeficijent == null
        ? ""
        : Number(postavke.koeficijent).toFixed(2).replace(".", ","),
    );
    setMjeseci(postavke.odbitakMjeseci == null ? "" : String(postavke.odbitakMjeseci));
  }, [postavke, dirnuto]);

  const koefBroj = koef.trim() === "" ? null : Number(koef.replace(",", "."));
  const mjeseciBroj = mjeseci.trim() === "" ? 12 : Number(mjeseci);
  const koefOk = koefBroj === null || (Number.isFinite(koefBroj) && koefBroj >= 0 && koefBroj <= 9.99);
  const mjeseciOk =
    mjeseci.trim() === "" || (Number.isInteger(mjeseciBroj) && mjeseciBroj >= 0 && mjeseciBroj <= 12);
  const iznos =
    koefBroj && koefOk && mjeseciOk ? koefBroj * OSNOVNI_ODBITAK_MJESECNO * mjeseciBroj : 0;

  return (
    <div className={`${styles.card} ${styles.cardFull}`}>
      <h2 className={styles.cardTitle}>
        <span>
          Lični odbitak sa <em>porezne kartice</em>
        </span>
        <span>ulazi u GPD-1051, red 18</span>
      </h2>
      {!postavke ? (
        <div className={styles.muted}>Učitavanje postavki...</div>
      ) : (
        <>
          <div className={styles.odbitakRed}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Koeficijent sa kartice</span>
              <input
                className={styles.input}
                inputMode="decimal"
                placeholder="npr. 1,00"
                value={koef}
                onChange={(e) => {
                  setDirnuto(true);
                  setKoef(e.target.value.replace(/[^\d,.]/g, "").slice(0, 5));
                }}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Mjeseci važenja</span>
              <input
                className={styles.input}
                inputMode="numeric"
                placeholder="12"
                value={mjeseci}
                onChange={(e) => {
                  setDirnuto(true);
                  setMjeseci(e.target.value.replace(/\D/g, "").slice(0, 2));
                }}
              />
            </label>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Godišnji odbitak</span>
              <div className={styles.odbitakIznos}>{fmtKm(iznos)} KM</div>
            </div>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!koefOk || !mjeseciOk}
              onClick={() => {
                setDirnuto(false);
                onSnimi({
                  koeficijent: koefBroj,
                  odbitakMjeseci: mjeseci.trim() === "" ? null : mjeseciBroj,
                });
              }}
            >
              Sačuvaj odbitak
            </button>
          </div>
          {(!koefOk || !mjeseciOk) && (
            <p className={`${styles.hint} ${styles.hintErr}`}>
              Koeficijent je broj od 0 do 9,99 (npr. 1,00 ili 1,50), a mjeseci cijeli broj od 0 do 12.
            </p>
          )}
          {greska != null && (
            <p className={`${styles.hint} ${styles.hintErr}`}>
              Odbitak nije sačuvan. Pokušajte ponovo.
            </p>
          )}
          <p className={styles.hint} style={{ marginTop: "0.8rem" }}>
            Koeficijent piše na poreznoj kartici PK-1001 koju izdaje Porezna uprava. Osnovni odbitak
            je 300 KM mjesečno (koeficijent 1,00), a izdržavani članovi ga uvećavaju. Ako niste
            sigurni koliki je vaš, izračunajte ga u{" "}
            <Link href="/porezna-kartica">obrascu porezne kartice</Link>. Mjesece smanjite samo ako
            kartica nije važila cijelu godinu.
          </p>
        </>
      )}
    </div>
  );
}
