"use client";

// Podešavanje matričnog pisača za štampu naloga: kalibracioni pomaci + naša
// slova + test nalog, pa uputstvo za prvo podešavanje računara.
// Koristi ga korisnički modal štampe naloga na obračunu.
// Spec: docs/faza2-stampa-naloga-na-obracunu.md (DIO B i DIO C).

import { useState } from "react";
import { buildPrn, testNalogValues } from "src/lib/nalozi/escpNalog";
import {
  MAX_POMAK_KOLONA,
  MAX_POMAK_LINIJA,
  MIN_POMAK_KOLONA,
  MIN_POMAK_LINIJA,
  PORUKA_STAMPA,
  preuzmiPrn,
  type EscpPostavke,
} from "src/lib/nalozi/postavke";

// Dvije linije koje se lijepe u Command Prompt, svaka u svom koraku.
export const KOMANDA_1 = "assoc .prn=PKNalog";
export const KOMANDA_2 =
  'ftype PKNalog=cmd /c (type nul ^> "%1:Zone.Identifier") 2^>nul ^& copy /b "%1" "\\\\IME-RACUNARA\\PISAC"';

const mid = "var(--mid, #7a8a7d)";
const ink = "var(--ink, #0f1a12)";

function KopirajLinija({ komanda }: { komanda: string }) {
  const [kopirano, setKopirano] = useState(false);
  const kopiraj = async () => {
    try {
      await navigator.clipboard.writeText(komanda);
      setKopirano(true);
      setTimeout(() => setKopirano(false), 1800);
    } catch {
      // clipboard blokiran: korisnik označi i kopira ručno
    }
  };
  return (
    <div
      style={{
        position: "relative",
        margin: "0.45rem 0 0.7rem",
        padding: "0.7rem 5.5rem 0.7rem 0.85rem",
        background: "#1e241f",
        color: "#d6e8d9",
        borderRadius: 8,
        fontFamily: '"Courier New", monospace',
        fontSize: 13,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {komanda}
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
  );
}

function Korak({ broj, naslov }: { broj: number; naslov: string }) {
  return (
    <div
      style={{
        margin: "1rem 0 0.3rem",
        fontSize: 13.5,
        fontWeight: 700,
        color: ink,
      }}
    >
      Korak {broj}. {naslov}
    </div>
  );
}

// ── Uputstvo za prvo podešavanje računara ────────────────────────────────────
export function UputstvoStanica() {
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: mid, maxWidth: 820 }}>
      <p style={{ margin: 0 }}>
        Radi se jednom po računaru i traje par minuta. Poslije toga klik na
        Štampaj naloge odmah pokreće pisač.
      </p>

      <Korak broj={1} naslov="Podijelite pisač samom sebi" />
      <div>
        Postavke → Bluetooth i uređaji → Štampači i skeneri → izaberite{" "}
        <strong>naziv vašeg pisača</strong> → Printer properties → kartica{" "}
        <strong>Sharing</strong> → uključite &quot;Share this printer&quot; →
        za ime upišite kratku riječ bez razmaka, na primjer{" "}
        <strong style={{ color: ink }}>PISAC</strong> → Sačuvaj. To ime
        zapamtite, treba vam u koraku 4.
      </div>

      <Korak broj={2} naslov="Otvorite Command Prompt kao administrator" />
      <div>
        Start → ukucajte <strong>cmd</strong> → desni klik na Command Prompt →{" "}
        <strong>Run as administrator</strong>.
      </div>

      <Korak broj={3} naslov="Zalijepite prvu liniju i pritisnite Enter" />
      <KopirajLinija komanda={KOMANDA_1} />
      <div>
        U ovoj liniji se <strong style={{ color: ink }}>ništa ne mijenja</strong>
        , lijepi se tačno ovakva kakva jeste.
      </div>

      <Korak broj={4} naslov="Zalijepite drugu liniju i pritisnite Enter" />
      <KopirajLinija komanda={KOMANDA_2} />
      <div>
        U ovoj liniji mijenjate <strong style={{ color: ink }}>samo dvije
        stvari</strong>, obje na samom kraju:
      </div>
      <ul style={{ margin: "0.35rem 0 0.5rem", paddingLeft: "1.2rem" }}>
        <li>
          <strong style={{ color: ink }}>IME-RACUNARA</strong> zamijenite imenom
          ovog računara. Saznajete ga tako što u istom prozoru ukucate{" "}
          <strong>hostname</strong> i pritisnete Enter.
        </li>
        <li>
          <strong style={{ color: ink }}>PISAC</strong> zamijenite imenom koje
          ste dali pisaču u koraku 1.
        </li>
      </ul>
      <div>
        Sve ostalo ostavite tačno kako piše, posebno:{" "}
        <strong style={{ color: ink }}>&quot;%1&quot;</strong> na oba mjesta (to
        je oznaka za fajl koji se štampa, ne mijenja se) i znakove{" "}
        <strong style={{ color: ink }}>^</strong> (bez njih Command Prompt odmah
        izvrši dio linije umjesto da je zapamti). Imena se pišu obično, bez
        znakova <strong>%</strong> oko njih.
      </div>
      <div style={{ marginTop: "0.4rem" }}>
        Provjera odmah: ukucajte <strong>ftype PKNalog</strong>. Mora ispisati
        liniju, ali bez znakova ^. To je ispravno, oni služe samo pri upisu.
      </div>

      <Korak broj={5} naslov="Probajte štampu" />
      <div>
        Gore kliknite &quot;Preuzmi test nalog&quot; i u Downloads folderu
        dvoklik na preuzeti fajl. Pisač mora krenuti odmah. Ako polja ne padaju
        u kućice obrasca, koristite pomake gore.
      </div>

      <Korak broj={6} naslov="Uključite automatsko otvaranje" />
      <div>
        Poslije prvog preuzimanja, u traci preuzimanja desni klik na fajl →
        &quot;Uvijek otvaraj datoteke ove vrste&quot; (&quot;Always open files
        of this type&quot;). Od tada klik na Štampaj naloge znači da pisač kreće
        sam.
      </div>

      <p style={{ margin: "1rem 0 0" }}>
        Ako negdje zapne ili niste sigurni šta da radite, javite nam se na{" "}
        <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>{" "}
        pa ćemo vam pomoći oko podešavanja.
      </p>
    </div>
  );
}

// ── Zašto kroz Command Prompt ────────────────────────────────────────────────
export function ZastoCmd() {
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: mid, maxWidth: 820 }}>
      <p style={{ margin: "0 0 0.6rem" }}>
        Preglednik iz sigurnosnih razloga ne smije slati podatke direktno na
        pisač. Da smije, bilo koja stranica na internetu mogla bi vam štampati
        šta hoće. Zato Porezni Kalkulator ne štampa sam, nego vam preuzme mali
        fajl sa komandama za pisač, tačno onakav kakav pisač očekuje. Windows
        sam ne zna šta bi sa takvim fajlom, pa mu se to kaže jednom, i tome
        služe one dvije linije.
      </p>
      <p style={{ margin: "0 0 0.6rem" }}>
        <strong style={{ color: ink }}>Šta one tačno rade:</strong> upisuju dva
        zapisa u Windows registar. Prvi kaže da .prn fajlovi imaju svoju vrstu
        (nazvali smo je PKNalog). Drugi kaže šta znači otvoriti takav fajl:
        kopirati ga na vaš pisač. To je isto pravilo po kojem Windows zna da
        .pdf otvara u čitaču PDF-a, samo za našu vrstu fajla.
      </p>
      <p style={{ margin: "0 0 0.6rem" }}>
        <strong style={{ color: ink }}>Zašto baš Command Prompt:</strong> veza
        između vrste fajla i komande ne postoji nigdje u Postavkama Windowsa,
        jedini način da se upiše su te dvije naredbe. Naredbe assoc i ftype su
        dio samog Windowsa oduvijek, nisu program koji se skida ni instalira.
      </p>
      <p style={{ margin: "0 0 0.6rem" }}>
        <strong style={{ color: ink }}>Zašto kao administrator:</strong> zapis
        ide u dio registra koji vrijedi za sve korisnike računara, a njega
        Windows ne da mijenjati bez administratorskih prava.
      </p>
      <p style={{ margin: "0 0 0.6rem" }}>
        <strong style={{ color: ink }}>Šta ovo ne radi:</strong> ne šalje ništa
        na internet, ne dira red za štampu koji koristi vaš stari program, ne
        mijenja drivere i ne instalira nijedan program.
      </p>
      <p style={{ margin: 0 }}>
        <strong style={{ color: ink }}>Ako se predomislite:</strong> briše se
        jednako lako, u istom prozoru ukucate <strong>assoc .prn=</strong> i{" "}
        <strong>ftype PKNalog=</strong> (prazno iza znaka jednakosti) i sve je
        kao prije.
      </p>
    </div>
  );
}

// ── Ako zapne ────────────────────────────────────────────────────────────────
export function AkoZapne() {
  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: "1.2rem",
        fontSize: 13.5,
        lineHeight: 1.6,
        color: mid,
      }}
    >
      <li>
        Ne mora biti određeni model pisača: radi svaki matrični sa Epson ESC/P
        emulacijom (Epson LX, FX i LQ serije, a i OKI, Panasonic, Star ili
        Citizen kad su u Epson modu).
      </li>
      <li>
        Pisač štampa nerazumljive znakove: pisač je vjerovatno u IBM ProPrinter
        modu, u njegovim postavkama izaberite Epson ESC/P emulaciju.
      </li>
      <li>
        Kvačice izlaze pogrešno: u postavkama pisača postavite tabelu znakova na
        PC852, ili gore isključite opciju &quot;Naša slova&quot;.
      </li>
      <li>
        Fajl se otvara, a štampa ne kreće: provjerite da ime iz koraka 1 postoji
        i da pisač nije pauziran u redu za štampu.
      </li>
      <li>
        Piše &quot;Access is denied&quot;: u Windows firewallu uključite
        &quot;File and printer sharing&quot; za privatnu mrežu, i provjerite da
        &quot;Password protected sharing&quot; (Advanced sharing settings) ne
        blokira pristup.
      </li>
      <li>
        Pisač je na drugom računaru u mreži: kao IME-RACUNARA upišite ime tog
        računara, a dijeljenje iz koraka 1 uradite na njemu.
      </li>
      <li>
        Na papiru izađe &quot;[ZoneTransfer]&quot; prije naloga: računar ima
        stariju verziju linije iz koraka 4, ponovite korak 4.
      </li>
      <li>
        Novi računar, reinstalacija Windowsa ili promjena imena računara:
        ponovite korake 1, 3, 4 i 6.
      </li>
      <li>
        Preuzete .prn datoteke ostaju u Downloads folderu i sadrže podatke
        naloga (imena, računi, iznosi), pa ih povremeno očistite ako računar
        dijeli više ljudi.
      </li>
    </ul>
  );
}

// ── Postavke (pomaci + naša slova + test nalog) ──────────────────────────────
export default function PodesavanjePisaca({
  postavke,
  onChange,
}: {
  postavke: EscpPostavke;
  onChange: (p: EscpPostavke) => void;
}) {
  const [poruka, setPoruka] = useState<string | null>(null);
  // Pomaci se drže i kao tekst: sa <input type="number"> se minus ne može
  // otkucati (međukorak "-" preglednik javi kao prazno, pa Number() vrati 0),
  // a negativan pomak je jedini način da se tekst pomjeri ulijevo.
  const [kolonaTekst, setKolonaTekst] = useState(String(postavke.pomakKolona));
  const [linijaTekst, setLinijaTekst] = useState(String(postavke.pomakLinija));

  const ogranici = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(n)));

  const promijeniKolonu = (t: string) => {
    const ocisceno = t.replace(/[^\d-]/g, "").replace(/(?!^)-/g, "");
    setKolonaTekst(ocisceno);
    if (ocisceno === "" || ocisceno === "-") return; // međukorak, čekaj cifru
    const n = Number(ocisceno);
    if (Number.isFinite(n)) {
      onChange({
        ...postavke,
        pomakKolona: ogranici(n, MIN_POMAK_KOLONA, MAX_POMAK_KOLONA),
      });
    }
  };

  const promijeniLiniju = (t: string) => {
    const ocisceno = t.replace(/\D/g, "");
    setLinijaTekst(ocisceno);
    if (ocisceno === "") return;
    const n = Number(ocisceno);
    if (Number.isFinite(n)) {
      onChange({
        ...postavke,
        pomakLinija: ogranici(n, MIN_POMAK_LINIJA, MAX_POMAK_LINIJA),
      });
    }
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: mid,
    marginBottom: 4,
  };
  const inputStyle: React.CSSProperties = {
    width: 90,
    padding: "0.5rem 0.6rem",
    border: "1px solid var(--border, #d4cfc4)",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    background: "var(--white, #fff)",
    color: ink,
  };
  const opisStyle: React.CSSProperties = {
    fontSize: 12.5,
    lineHeight: 1.5,
    color: mid,
    marginTop: 4,
    maxWidth: 320,
  };

  const testNalog = () => {
    // jedan nalog: dovoljan za provjeru da polja padaju u kućice
    const bytes = buildPrn([testNalogValues()], {
      kodnaStranica: postavke.nasaSlova ? "pc852" : "ascii",
      pomakKolona: postavke.pomakKolona,
      pomakLinija: postavke.pomakLinija,
    });
    preuzmiPrn(bytes, "test-nalog.prn");
    setPoruka(`Test nalog preuzet. ${PORUKA_STAMPA}`);
  };

  return (
    <div>
      <div
        style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}
      >
        <div>
          <label style={labelStyle}>Pomak lijevo / desno</label>
          <input
            style={inputStyle}
            type="text"
            inputMode="numeric"
            value={kolonaTekst}
            onChange={(e) => promijeniKolonu(e.target.value)}
            onBlur={() => setKolonaTekst(String(postavke.pomakKolona))}
          />
          <div style={opisStyle}>
            Pomjera <strong>sav tekst vodoravno</strong>. Pozitivan broj gura
            udesno, negativan ulijevo (npr. -2). Jedan korak je oko 2 mm (jedan
            znak). Primjer: ako tekst pada 4 mm previše lijevo, upišite 2.
            Dozvoljeno {MIN_POMAK_KOLONA} do {MAX_POMAK_KOLONA}.
          </div>
        </div>
        <div>
          <label style={labelStyle}>Pomak nadolje</label>
          <input
            style={inputStyle}
            type="text"
            inputMode="numeric"
            value={linijaTekst}
            onChange={(e) => promijeniLiniju(e.target.value)}
            onBlur={() => setLinijaTekst(String(postavke.pomakLinija))}
          />
          <div style={opisStyle}>
            Spušta <strong>sav tekst nadolje</strong> za cijele redove, jedan
            korak je oko 4 mm. Dozvoljeno {MIN_POMAK_LINIJA} do{" "}
            {MAX_POMAK_LINIJA}, jer nalog zauzima 21 od 24 reda obrasca.{" "}
            <strong>Nagore se ne može ovdje</strong>: štampa počinje od vrha
            obrasca, pa ako tekst pada prenisko, papir pomjerite na samom pisaču
            (dugme za uvlačenje papira, top of form).
          </div>
        </div>
        <div>
          <label style={labelStyle}>Naša slova</label>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: 14,
              color: ink,
              cursor: "pointer",
              padding: "0.5rem 0",
            }}
          >
            <input
              type="checkbox"
              checked={postavke.nasaSlova}
              onChange={(e) =>
                onChange({ ...postavke, nasaSlova: e.target.checked })
              }
            />
            Štampaj kvačice
          </label>
          <div style={opisStyle}>
            Uključeno štampa č, ć, ž, š i đ. Ako pisač umjesto njih izbaci
            čudne znakove, isključite pa se pišu kao c, z, s i dj.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "0.8rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={testNalog}
          style={{
            padding: "0.5rem 1rem",
            background: "var(--white, #fff)",
            color: "var(--sage, #3a5c42)",
            border: "1px solid var(--sage, #3a5c42)",
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Preuzmi test nalog
        </button>
        <span style={{ fontSize: 12.5, color: mid }}>
          Jedan probni nalog sa iksevima i devetkama, za namještanje papira bez
          trošenja pravih naloga.
        </span>
      </div>
      {poruka && (
        <div style={{ marginTop: "0.6rem", fontSize: 13, color: "#1f5e44" }}>
          {poruka}
        </div>
      )}
      <div style={{ marginTop: "0.6rem", fontSize: 12.5, color: mid }}>
        Postavke se pamte na ovom računaru, jer zavise od pisača i od toga kako
        je papir uvučen.
      </div>
    </div>
  );
}
