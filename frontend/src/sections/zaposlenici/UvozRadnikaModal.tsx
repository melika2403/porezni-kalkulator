"use client";

// Uvoz radnika iz CSV fajla (dijeljeno: PK Office /app/zaposlenici i marketing
// /aktivni-radnici). Tok: preuzmi šablon → popuni u Excelu → ubaci fajl →
// OBAVEZAN PREGLED (novi / preskočen / greška po redu) → "Uvezi N radnika".
// Uvoz SAMO DODAJE nove radnike; postojeći (isti JMBG ili ime i prezime) se
// preskaču. Upis ide kroz postojeći endpoint kreiranja radnika, red po red,
// pa važe sve validacije i limit radnika po paketu.
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IconDownload, IconLoader2, IconUpload } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { mnozina } from "src/lib/format";
// PK stilovi i za marketing stranice (modal se portaluje sa .pk-scope klasom)
import "src/styles/pk-embed.css";
import { unwrap } from "src/api/auth";
import {
  createWorker,
  type Worker,
  type WorkerPayload,
} from "src/api/profile";
import {
  parsirajRadnikeCsv,
  sablonCsv,
  type UvozRed,
} from "./radniciCsv";

type RedStatus = "novi" | "preskocen" | "greska" | "uvezen" | "neuspio";

type PregledRed = UvozRed & {
  status: RedStatus;
  /** razlog preskakanja ili greške pri upisu */
  razlog: string | null;
};

function preuzmiTekstFajl(sadrzaj: string, ime: string) {
  const blob = new Blob([sadrzaj], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ime;
  a.click();
  URL.revokeObjectURL(url);
}

// UTF-8 sa fallbackom na windows-1250 (Excel često tako snimi CSV, pa bi č/ć
// bili polomljeni; polomljeni bajtovi se vide kao U+FFFD).
async function procitajFajl(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("�")) return utf8;
  try {
    return new TextDecoder("windows-1250").decode(buf);
  } catch {
    return utf8;
  }
}

function payloadIzReda(r: UvozRed): WorkerPayload {
  const p = r.podaci;
  return {
    role: "RADNIK",
    firstName: p.ime,
    lastName: p.prezime,
    jmbg: p.jmbg || null,
    city: p.grad || null,
    address: p.adresa || null,
    email: p.email || null,
    phone: p.telefon || null,
    bankAccount: p.ziroRacun || null,
    position: p.radnoMjesto || null,
    employmentStatus: "PRIJAVLJEN",
    prijavaDate: p.datumPrijave,
    // Tip plate iz popunjenih kolona; bez plate se naslijedi default org-e.
    ...(p.netoPlata != null
      ? { salaryType: "NETO_ISPLATA" as const, salaryNeto: p.netoPlata }
      : p.brutoPlata != null
        ? { salaryType: "BRUTO" as const }
        : {}),
    ...(p.brutoPlata != null ? { salaryBruto: p.brutoPlata } : {}),
    ...(p.koeficijent != null ? { taxCoefficient: p.koeficijent } : {}),
    ...(p.satiDnevno != null ? { contractedHours: p.satiDnevno } : {}),
    ...(p.stazGodina != null ? { priorWorkYears: p.stazGodina } : {}),
  };
}

export function UvozRadnikaModal({
  orgId,
  postojeci,
  onClose,
  onImported,
}: {
  orgId: number;
  /** Postojeći radnici organizacije, za preskakanje duplikata. */
  postojeci: Worker[];
  onClose: () => void;
  onImported?: () => void;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [redovi, setRedovi] = useState<PregledRed[] | null>(null);
  const [fajlIme, setFajlIme] = useState<string | null>(null);
  const [greskaFajla, setGreskaFajla] = useState<string | null>(null);
  const [uvozim, setUvozim] = useState(false);
  const [gotovo, setGotovo] = useState(false);
  const [limitPoruka, setLimitPoruka] = useState<string | null>(null);

  async function ucitajFajl(f: File) {
    setGreskaFajla(null);
    setGotovo(false);
    setLimitPoruka(null);
    const tekst = await procitajFajl(f);
    const rezultat = parsirajRadnikeCsv(tekst);
    if (rezultat.greskaFajla) {
      setRedovi(null);
      setFajlIme(null);
      setGreskaFajla(rezultat.greskaFajla);
      return;
    }
    // Duplikati prema postojećim radnicima: isti JMBG, ili (bez JMBG-a)
    // isto ime i prezime. Uvoz nikad ne mijenja postojeće radnike.
    const jmbgSet = new Set(
      postojeci.map((w) => (w.jmbg || "").replace(/\D/g, "")).filter(Boolean),
    );
    const imeSet = new Set(
      postojeci.map((w) =>
        `${w.firstName} ${w.lastName}`.trim().toLowerCase(),
      ),
    );
    const videniJmbg = new Set<string>();
    const videnaImena = new Set<string>();
    const pregled: PregledRed[] = rezultat.redovi.map((r) => {
      if (r.greske.length > 0) {
        return { ...r, status: "greska", razlog: r.greske.join("; ") };
      }
      const jmbg = r.podaci.jmbg;
      const ime = `${r.podaci.ime} ${r.podaci.prezime}`.trim().toLowerCase();
      if (jmbg && (jmbgSet.has(jmbg) || videniJmbg.has(jmbg))) {
        return {
          ...r,
          status: "preskocen",
          razlog: jmbgSet.has(jmbg)
            ? "radnik sa ovim JMBG-om već postoji"
            : "dupli JMBG u fajlu",
        };
      }
      // Ime se provjerava UVIJEK, ne samo kad red nema JMBG: postojeći radnik
      // često je unesen bez JMBG-a, pa bi se red sa JMBG-om upisao kao novi i
      // radnik bi se duplirao (duplikat u MIP-u i dvostruki obračun).
      if (imeSet.has(ime) || videnaImena.has(ime)) {
        return {
          ...r,
          status: "preskocen",
          razlog: imeSet.has(ime)
            ? "radnik sa istim imenom i prezimenom već postoji"
            : "isto ime i prezime već u fajlu",
        };
      }
      if (jmbg) videniJmbg.add(jmbg);
      videnaImena.add(ime);
      return { ...r, status: "novi", razlog: null };
    });
    setRedovi(pregled);
    setFajlIme(f.name);
  }

  async function uvezi() {
    if (!redovi || uvozim) return;
    setUvozim(true);
    setLimitPoruka(null);
    const novi = [...redovi];
    try {
      for (let i = 0; i < novi.length; i++) {
        if (novi[i].status !== "novi") continue;
        try {
          await unwrap(createWorker(orgId, payloadIzReda(novi[i])));
          novi[i] = { ...novi[i], status: "uvezen", razlog: null };
        } catch (e) {
          const poruka = e instanceof Error ? e.message : String(e);
          if (poruka === "WORKERS_LIMIT_REACHED") {
            setLimitPoruka(
              "Dostignut je limit broja radnika za vaš paket; ostatak fajla nije uvezen.",
            );
            // Preostali redovi više nisu "novi": označi ih kao neupisane da
            // rekapitulacija na dnu odgovara stvarnom stanju.
            for (let j = i; j < novi.length; j++) {
              if (novi[j].status === "novi") {
                novi[j] = {
                  ...novi[j],
                  status: "neuspio",
                  razlog: "nije upisan, dostignut limit paketa",
                };
              }
            }
            break;
          }
          novi[i] = { ...novi[i], status: "neuspio", razlog: poruka };
        }
        setRedovi([...novi]);
      }
    } finally {
      setRedovi([...novi]);
      setUvozim(false);
      setGotovo(true);
      qc.invalidateQueries({ queryKey: ["pk-workers", orgId] });
      qc.invalidateQueries({ queryKey: ["workers", orgId] });
      onImported?.();
    }
  }

  const brojNovih = redovi?.filter((r) => r.status === "novi").length ?? 0;
  const brojUvezenih = redovi?.filter((r) => r.status === "uvezen").length ?? 0;

  const statusBadge = (r: PregledRed) => {
    const base =
      "inline-block px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap";
    if (r.status === "novi")
      return <span className={`${base} bg-brand-100 text-brand-700`}>novi</span>;
    if (r.status === "uvezen")
      return <span className={`${base} bg-brand-100 text-brand-700`}>uvezen</span>;
    if (r.status === "preskocen")
      return (
        <span className={`${base} bg-cream-200 text-text-tertiary`}>
          preskočen
        </span>
      );
    return (
      <span className={`${base} bg-accent-500/10 text-accent-500`}>
        {r.status === "neuspio" ? "nije upisan" : "greška"}
      </span>
    );
  };

  return (
    <Modal
      open
      // Escape i klik na pozadinu se ignorišu dok traje upis, iz istog razloga
      // kao zaključano dugme Odustani.
      onClose={() => {
        if (!uvozim) onClose();
      }}
      title="Uvoz radnika iz CSV fajla"
      maxWidthClass="max-w-[860px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            // Tokom upisa se ne zatvara: petlja bi nastavila da kreira radnike
            // u pozadini, a korisnik ne bi znao šta je upisano.
            disabled={uvozim}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            {gotovo ? "Zatvori" : "Odustani"}
          </button>
          {redovi && !gotovo && (
            <button
              type="button"
              disabled={uvozim || brojNovih === 0}
              onClick={uvezi}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {uvozim && <IconLoader2 size={15} className="animate-spin" />}
              {/* "radnika" je isto za 1, 2 i 5 u akuzativu, bez množine. */}
              {uvozim ? "Uvozim…" : `Uvezi ${brojNovih} radnika`}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {/* Brojevi ručno umjesto list-decimal: markeri liste se ne poravnaju
            uvijek isto, ovako su svi redovi u istoj liniji. */}
        <div className="space-y-1 text-[12.5px] leading-5 text-text-primary">
          <div>1. Preuzmite šablon i popunite ga u Excelu, jedan red po radniku.</div>
          <div>2. Ubacite popunjeni fajl; prije upisa se prikaže pregled svih redova.</div>
          <div>3. Kliknite &quot;Uvezi&quot;: upišu se samo redovi označeni kao novi.</div>
        </div>

        <div className="rounded-lg border border-cream-300 bg-cream-50 px-3.5 py-3 space-y-1.5 text-[12.5px] leading-5 text-text-primary">
          <div>
            <span className="font-semibold text-brand-700">Obavezno: </span>
            ime, prezime i datum prijave. Red bez njih se ne uvozi; u pregledu
            dobije oznaku greške sa razlogom.
          </div>
          <div>
            <span className="font-semibold">Neobavezno: </span>
            sve ostale kolone (JMBG, grad, adresa, email, telefon, žiro račun,
            radno mjesto, plata, koeficijent, sati, staž) mogu ostati prazne.
            Radnik se uveze, a pregled prikaže žuto upozorenje šta nedostaje;
            dopunite kasnije u kartonu radnika.
          </div>
          <div>
            <span className="font-semibold">Postojeći radnici: </span>
            uvoz samo dodaje nove. Red sa istim JMBG-om (ili istim imenom i
            prezimenom) kao postojeći radnik se preskače i ništa mu se ne
            mijenja.
          </div>
          <p className="m-0 pt-1 text-[11.5px] text-text-tertiary border-t border-cream-300">
            Savjet: kolone JMBG i žiro račun držite formatirane kao Tekst da ih
            Excel ne pretvori u broj (u šablonu su već tako podešene).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              preuzmiTekstFajl(sablonCsv(), "Sablon-uvoz-radnika.csv")
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 bg-cream-100 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            <IconDownload size={14} />
            Preuzmi šablon (CSV)
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                ucitajFajl(f).catch(() =>
                  setGreskaFajla("Fajl se ne može pročitati."),
                );
              }
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uvozim}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            <IconUpload size={14} />
            {fajlIme ? "Izaberi drugi fajl" : "Izaberi CSV fajl"}
          </button>
          {fajlIme && (
            <span className="text-[12px] text-text-tertiary">{fajlIme}</span>
          )}
        </div>

        {greskaFajla && (
          <p className="text-[12.5px] text-accent-500 m-0">{greskaFajla}</p>
        )}
        {limitPoruka && (
          <p className="text-[12.5px] text-accent-500 m-0">{limitPoruka}</p>
        )}

        {redovi && (
          <>
            <div className="text-[12.5px] text-text-primary">
              {gotovo ? (
                <>
                  Uvezeno <strong>{brojUvezenih}</strong>, preskočeno{" "}
                  <strong>
                    {redovi.filter((r) => r.status === "preskocen").length}
                  </strong>
                  , grešaka{" "}
                  <strong>
                    {
                      redovi.filter(
                        (r) => r.status === "greska" || r.status === "neuspio",
                      ).length
                    }
                  </strong>
                  .
                </>
              ) : (
                <>
                  U fajlu je <strong>{redovi.length}</strong>{" "}
                  {mnozina(redovi.length, "red", "reda", "redova")}: za uvoz{" "}
                  <strong>{brojNovih}</strong>, preskočenih{" "}
                  <strong>
                    {redovi.filter((r) => r.status === "preskocen").length}
                  </strong>
                  , sa greškom{" "}
                  <strong>
                    {redovi.filter((r) => r.status === "greska").length}
                  </strong>
                  . Redovi sa greškom se ne uvoze; popravite ih u fajlu pa ga
                  ubacite ponovo.
                </>
              )}
            </div>
            <div className="max-h-[340px] overflow-y-auto overflow-x-auto rounded-lg border border-cream-300">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-cream-200 text-left">
                    <th className="px-2 py-1.5 font-medium text-text-tertiary">Red</th>
                    <th className="px-2 py-1.5 font-medium text-text-tertiary">Ime i prezime</th>
                    <th className="px-2 py-1.5 font-medium text-text-tertiary">JMBG</th>
                    <th className="px-2 py-1.5 font-medium text-text-tertiary">Prijava</th>
                    <th className="px-2 py-1.5 font-medium text-text-tertiary">Plata</th>
                    <th className="px-2 py-1.5 font-medium text-text-tertiary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {redovi.map((r) => (
                    <tr
                      key={r.brojReda}
                      className="border-t border-cream-300 align-top"
                    >
                      <td className="px-2 py-1.5 text-text-tertiary">
                        {r.brojReda}.
                      </td>
                      <td className="px-2 py-1.5 text-text-primary">
                        {r.podaci.ime} {r.podaci.prezime}
                      </td>
                      <td className="px-2 py-1.5">{r.podaci.jmbg || "–"}</td>
                      <td className="px-2 py-1.5">
                        {r.podaci.datumPrijave
                          ? r.podaci.datumPrijave
                              .split("-")
                              .reverse()
                              .join(".")
                          : "–"}
                      </td>
                      <td className="px-2 py-1.5">
                        {r.podaci.netoPlata != null
                          ? `${r.podaci.netoPlata.toLocaleString("de-DE", { minimumFractionDigits: 2 })} neto`
                          : r.podaci.brutoPlata != null
                            ? `${r.podaci.brutoPlata.toLocaleString("de-DE", { minimumFractionDigits: 2 })} bruto`
                            : "–"}
                      </td>
                      <td className="px-2 py-1.5">
                        {statusBadge(r)}
                        {r.razlog && (
                          <div className="text-[11px] text-text-tertiary mt-0.5">
                            {r.razlog}
                          </div>
                        )}
                        {r.status !== "greska" &&
                          r.upozorenja.length > 0 && (
                            <div className="text-[11px] text-warning mt-0.5">
                              {r.upozorenja.join("; ")}
                            </div>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
