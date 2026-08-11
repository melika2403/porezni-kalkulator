"use client";

import { useState } from "react";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import { buildPrn, testNalogValues } from "./escpNalog";
import NaloziStampa from "./NaloziStampa";

// Postavke ESC/P štampe (per-uređaj, kao postavke štampe u starom programu):
// kalibracioni pomaci u kolonama/linijama + naša slova (PC852) ili ASCII.
const LS_KEY = "pk_nalog_escp";

export type EscpPostavke = {
  pomakKolona: number;
  pomakLinija: number;
  nasaSlova: boolean;
};

const DEFAULT_POSTAVKE: EscpPostavke = {
  pomakKolona: 0,
  pomakLinija: 0,
  nasaSlova: true,
};

function loadPostavke(): EscpPostavke {
  if (typeof window === "undefined") return DEFAULT_POSTAVKE;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return {
        pomakKolona: Number.isFinite(o.pomakKolona) ? o.pomakKolona : 0,
        pomakLinija: Number.isFinite(o.pomakLinija) ? o.pomakLinija : 0,
        nasaSlova: typeof o.nasaSlova === "boolean" ? o.nasaSlova : true,
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_POSTAVKE;
}

export function preuzmiPrn(bytes: Uint8Array, ime: string) {
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ime;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const PORUKA_STAMPA =
  "Fajl je poslan na štampu. Ako se štampa ne pokrene sama, kliknite na preuzeti fajl u traci preuzimanja.";

export default function AdminTestNalog() {
  // Stranica je iza RoleGuard-a (renderuje se tek klijentski poslije provjere
  // uloge), pa je localStorage siguran direktno u inicijalizatorima.
  const [pomakKolona, setPomakKolona] = useState(() =>
    String(loadPostavke().pomakKolona),
  );
  const [pomakLinija, setPomakLinija] = useState(() =>
    String(loadPostavke().pomakLinija),
  );
  const [nasaSlova, setNasaSlova] = useState(() => loadPostavke().nasaSlova);
  const [count, setCount] = useState("3");
  const [msg, setMsg] = useState<string | null>(null);

  const parseInt0 = (s: string) => {
    const n = parseInt(String(s).trim(), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const postavke: EscpPostavke = {
    pomakKolona: parseInt0(pomakKolona),
    pomakLinija: parseInt0(pomakLinija),
    nasaSlova,
  };

  const savePostavke = (p: EscpPostavke) => {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(p));
    } catch {
      // ignore
    }
  };

  const generateTest = () => {
    setMsg(null);
    const n = Math.max(1, Math.min(parseInt0(count) || 1, 50));
    savePostavke(postavke);
    const nalozi = Array.from({ length: n }, () => testNalogValues());
    const bytes = buildPrn(nalozi, {
      kodnaStranica: postavke.nasaSlova ? "pc852" : "ascii",
      pomakKolona: postavke.pomakKolona,
      pomakLinija: postavke.pomakLinija,
    });
    preuzmiPrn(bytes, `test-nalozi_${n}x.prn`);
    setMsg(`Generisano ${n} test naloga. ${PORUKA_STAMPA}`);
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--mid, #7a8a7d)",
    marginBottom: 4,
  };
  const inputStyle: React.CSSProperties = {
    width: 110,
    padding: "0.5rem 0.6rem",
    border: "1px solid var(--border, #d4cfc4)",
    borderRadius: 8,
    fontSize: 14,
  };
  const cardStyle: React.CSSProperties = {
    background: "var(--white, #fff)",
    border: "1px solid var(--border, #d4cfc4)",
    borderRadius: 12,
    padding: "1.1rem 1.25rem",
    maxWidth: 980,
  };

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <h1
          style={{
            fontFamily: "DM Serif Display, serif",
            fontSize: "1.7rem",
            margin: "0 0 0.3rem",
            color: "var(--ink, #0f1a12)",
          }}
        >
          Štampa naloga (matrični)
        </h1>
        <p
          style={{
            color: "var(--mid, #7a8a7d)",
            margin: "0 0 1.25rem",
            fontSize: "0.95rem",
            maxWidth: 980,
          }}
        >
          Direktna ESC/P štampa na matrični pisač: EPSON LX-350 ili BILO KOJI
          drugi sa Epson ESC/P emulacijom (Epson LX/FX/LQ serije, OKI,
          Panasonic, Star... u Epson modu). Pred-štampani Grafis obrazac,
          traktorska traka. Preuzeti .prn fajl se na podešenoj radnoj stanici
          otvara dvoklikom ili automatski i sirovo kopira na pisač, bez drivera
          (podešavanje stanice: docs/faza1-escp-stampa-naloga.md, DIO B).
        </p>

        {/* ── Test sekcija: kalibracija + test .prn ── */}
        <div style={cardStyle}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--mid, #7a8a7d)",
              marginBottom: "0.8rem",
            }}
          >
            Test štampa (X-evi i 9-ke)
          </div>
          <div
            style={{
              display: "flex",
              gap: "1.25rem",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label style={labelStyle}>Pomak, kolona</label>
              <input
                style={inputStyle}
                type="text"
                inputMode="numeric"
                value={pomakKolona}
                onChange={(e) => setPomakKolona(e.target.value)}
                title="Kalibracija: pomak svih polja udesno u kolonama (12 cpi), može i negativan"
              />
            </div>
            <div>
              <label style={labelStyle}>Pomak, linija (0-3)</label>
              <input
                style={inputStyle}
                type="text"
                inputMode="numeric"
                value={pomakLinija}
                onChange={(e) => setPomakLinija(e.target.value)}
                title="Kalibracija: prazne linije prije prve linije naloga"
              />
            </div>
            <div>
              <label style={labelStyle}>Broj naloga</label>
              <input
                style={inputStyle}
                type="text"
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                fontSize: 14,
                paddingBottom: "0.55rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={nasaSlova}
                onChange={(e) => setNasaSlova(e.target.checked)}
              />
              Naša slova (PC852)
            </label>
            <button
              type="button"
              onClick={generateTest}
              style={{
                padding: "0.6rem 1.1rem",
                background: "var(--sage, #3a5c42)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Generiši test .prn
            </button>
          </div>
          {msg && (
            <div style={{ marginTop: "0.9rem", fontSize: 13, color: "#1f5e44" }}>
              {msg}
            </div>
          )}
          <div
            style={{
              marginTop: "0.9rem",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--mid, #7a8a7d)",
            }}
          >
            Ako polja ne padaju u kućice: pomjeri Pomak kolona/linija (pamti
            se). Ako naša slova izlaze pogrešno, isključi opciju Naša slova
            (ASCII, č→c) ili u postavkama pisača postavi tabelu znakova na
            PC852.
          </div>
        </div>

        {/* ── Podešavanje radne stanice (DIO B iz spec dokumenta) ── */}
        <div style={{ ...cardStyle, marginTop: "1.25rem" }}>
          <PodesavanjeStanice />
        </div>

        {/* ── Pregled i štampa stvarnog obračuna ── */}
        <div style={{ ...cardStyle, marginTop: "1.25rem" }}>
          <NaloziStampa postavke={postavke} />
        </div>
      </div>
    </RoleGuard>
  );
}

// Uputstvo za podešavanje klijentskog računara (jednom po stanici, ~5 min):
// klik na Štampaj u PK → pisač krene sam, bez ikakve instalacije. Sažetak
// DIO B iz docs/faza1-escp-stampa-naloga.md, tu je i puna verzija sa svim
// rubnim slučajevima.
// ftype prvo obriše browserovu "oznaku preuzimanja" (Mark of the Web,
// NTFS Zone.Identifier stream): na nekim mašinama se nađe na putu do pisača
// i odštampa kao "[ZoneTransfer] ZoneId=3" prije naloga, što pomjeri papir
// 2 reda i pokvari top-of-form. Brisanje je bezopasno (2>nul guta grešku ako
// oznake nema), pa tek onda sirovo kopiranje na pisač.
// IME-RACUNARA i LX350 su placeholderi koje support upiše ručno (bez %
// znakova); "%1" se ostavlja TAČNO kako piše.
// KAPICE (^) su OBAVEZNE: bez njih cmd pri lijepljenju odmah IZVRŠI > i &
// (copy krene istog trena, u registar sjedne skraćena komanda). ^> ^& u
// registar upišu literalne > i & (empirijski provjereno kroz cmd stdin).
const FTYPE_KOMANDE = `assoc .prn=PKNalog
ftype PKNalog=cmd /c (type nul ^> "%1:Zone.Identifier") 2^>nul ^& copy /b "%1" "\\\\IME-RACUNARA\\LX350"`;

function PodesavanjeStanice() {
  const [otvoreno, setOtvoreno] = useState(false);
  const [kopirano, setKopirano] = useState(false);

  const kopiraj = async () => {
    try {
      await navigator.clipboard.writeText(FTYPE_KOMANDE);
      setKopirano(true);
      setTimeout(() => setKopirano(false), 2500);
    } catch {
      // clipboard nedostupan: admin može ručno selektovati tekst
    }
  };

  const h = (t: string) => (
    <div style={{ fontWeight: 600, fontSize: 14, margin: "0.9rem 0 0.25rem" }}>
      {t}
    </div>
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--mid, #7a8a7d)",
          }}
        >
          Podešavanje radne stanice (jednom po računaru, ~5 min)
        </div>
        <button
          type="button"
          onClick={() => setOtvoreno((v) => !v)}
          style={{
            padding: "0.4rem 0.9rem",
            background: "var(--white, #fff)",
            color: "var(--sage, #3a5c42)",
            border: "1px solid var(--sage, #3a5c42)",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {otvoreno ? "Sakrij uputstvo" : "Prikaži uputstvo"}
        </button>
      </div>

      {otvoreno && (
        <div style={{ fontSize: 13.5, lineHeight: 1.55, maxWidth: 860 }}>
          <p style={{ margin: "0.7rem 0 0", color: "var(--mid, #7a8a7d)" }}>
            Cilj: klik na Štampaj u PK pokrene matrični pisač bez instaliranja.
            NE mora biti LX-350: radi svaki matrični sa Epson ESC/P emulacijom
            (Epson LX/FX/LQ, a i OKI/Panasonic/Star/Citizen kad su u Epson
            modu), LX-350 je samo model iz primjera. Browser ne smije slati
            podatke direktno na pisač, pa se Windows jednom nauči da otvaranje
            .prn fajla znači: kopiraj ga sirovo na pisač. Preduslov: pisač radi
            na tom računaru. Red štampe koji koristi stari program NE dirati,
            share je samo dodatno ime.
          </p>

          {h("1. Podijeli pisač samom sebi (share)")}
          <div>
            Postavke → Bluetooth i uređaji → Štampači i skeneri → tvoj matrični
            pisač → Printer properties → kartica <strong>Sharing</strong> →
            uključi &quot;Share this printer&quot;, ime share-a npr.{" "}
            <strong>LX350</strong> (proizvoljno, bez razmaka; isto ime ide u
            komandu u koraku 2) → Sačuvaj.
          </div>

          {h("2. Nauči Windows šta sa .prn fajlovima")}
          <div>
            Start → ukucaj <strong>cmd</strong> → desni klik na Command Prompt
            → <strong>Run as administrator</strong>. U drugoj komandi PRIJE
            lijepljenja zamijeni: <strong>IME-RACUNARA</strong> imenom ovog
            računara (vidiš ga kad u cmd ukucaš <strong>hostname</strong>) i{" "}
            <strong>LX350</strong> imenom share-a iz koraka 1. Imena se pišu
            obično, BEZ znakova %. Jedino <strong>&quot;%1&quot;</strong>{" "}
            ostavi tačno kako piše (to je oznaka za fajl koji se štampa).
            Zalijepi obje linije (Enter poslije svake):
          </div>
          <div
            style={{
              position: "relative",
              margin: "0.5rem 0",
              padding: "0.7rem 0.85rem",
              background: "#1e241f",
              color: "#d6e8d9",
              borderRadius: 8,
              fontFamily: '"Courier New", monospace',
              fontSize: 13,
              whiteSpace: "pre",
              overflowX: "auto",
            }}
          >
            {FTYPE_KOMANDE}
            <button
              type="button"
              onClick={kopiraj}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                padding: "0.25rem 0.7rem",
                background: kopirano ? "#3a5c42" : "#fff",
                color: kopirano ? "#fff" : "#1e241f",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {kopirano ? "Kopirano ✓" : "Kopiraj"}
            </button>
          </div>
          <div style={{ color: "var(--mid, #7a8a7d)" }}>
            Znakovi <strong>^</strong> u komandi su obavezni (bez njih cmd
            odmah izvrši dio komande umjesto da je zapamti). Provjera odmah:
            ukucaj <strong>ftype PKNalog</strong> i mora ispisati komandu, ali
            BEZ ^ znakova (to je ispravno: ^ služi samo pri upisu). Ovo su
            samo dva zapisa u registru, ništa se ne instalira. Prvi dio
            komande briše browserovu oznaku preuzimanja sa fajla (inače na
            nekim mašinama na papiru izađe &quot;[ZoneTransfer]&quot; prije
            naloga), drugi sirovo kopira na pisač.
          </div>

          {h("3. Test štampe")}
          <div>
            Gore generiši test .prn i u Downloads folderu dvoklik na fajl.
            Pisač mora krenuti odmah; ako je papir dobro uvučen, polja padaju u
            kućice (inače koriguj pomake gore).
          </div>

          {h("4. Automatsko otvaranje (jedan klik u browseru)")}
          <div>
            Poslije prvog preuzimanja, u traci preuzimanja desni klik na fajl →
            &quot;Always open files of this type&quot; / &quot;Uvijek otvaraj
            datoteke ove vrste&quot;. Od tada: klik na Štampaj → pisač kreće
            sam.
          </div>

          {h("Ako zapne")}
          <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.2rem", color: "var(--mid, #7a8a7d)" }}>
            <li>
              &quot;Access is denied&quot;: u firewallu uključi &quot;File and
              printer sharing&quot;; provjeri da &quot;Password protected
              sharing&quot; ne blokira.
            </li>
            <li>
              Pisač na drugom računaru u mreži: kao IME-RACUNARA upiši ime
              računara na kojem je pisač (share se pravi tamo).
            </li>
            <li>
              Fajl se otvara a štampa ne kreće: provjeri da share LX350
              postoji i da pisač nije pauziran u redu za štampu.
            </li>
            <li>
              Kvačice izlaze pogrešno: u Default Settings pisača postavi
              Character Table na PC852, ili gore isključi opciju Naša slova.
            </li>
            <li>
              Na papiru izađe &quot;[ZoneTransfer]&quot; / &quot;ZoneId=3&quot;
              prije naloga: stanica ima staru verziju komande iz koraka 2,
              ponovi korak 2 (nova komanda briše oznaku preuzimanja prije
              kopiranja).
            </li>
            <li>
              Drugi model pisača štampa gluposti umjesto naloga: pisač je
              najvjerovatnije u IBM ProPrinter modu, u njegovim postavkama
              izabrati Epson ESC/P emulaciju.
            </li>
            <li>
              Novi računar, reinstalacija ili promjena imena računara: ponovi
              korake 1, 2 i 4.
            </li>
          </ul>
          <p style={{ margin: "0.7rem 0 0", color: "var(--mid, #7a8a7d)" }}>
            Puna verzija sa detaljima: docs/faza1-escp-stampa-naloga.md, DIO B.
            Napomena za klijente: .prn fajlovi u Downloads folderu sadrže
            podatke naloga, povremeno očistiti ako računar dijeli više ljudi.
          </p>
        </div>
      )}
    </div>
  );
}
