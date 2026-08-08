"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LuFileText, LuFileDown } from "react-icons/lu";
import {
  getOrganization,
  getWorkers,
  uploadWorkerDocument,
  type Worker,
  type WorkerDocumentType,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import { listPayrolls } from "src/api/payroll";
import { trackEvent } from "src/api/activity";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import WorkersSidebar from "src/components/WorkersSidebar/WorkersSidebar";
import FaqSection from "src/components/FaqSection/FaqSection";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import DateInput from "src/components/DateInput/DateInput";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import uorStyles from "src/sections/ugovor-o-radu/uor.module.css";
import styles from "./rjesenja.module.css";
import {
  dodajRadneDane,
  racunajRadneDane,
  racunajKalendarskeDane,
} from "./shared/format";
import { formatMoneyLive, formatMoneyBlur } from "src/lib/format";
import type { RjesenjeComposed } from "./shared/composed";
import { fillRjesenjePdf } from "./shared/fillRjesenjePdf";
import { fillRjesenjeDocx } from "./shared/fillRjesenjeDocx";
import { composeGo } from "./godisnji-odmor/compose";
import { composeRegres } from "./regres/compose";
import { composePrigodnaNagrada } from "./prigodna-nagrada/compose";
import { composePlacenoOdsustvo } from "./placeno-odsustvo/compose";
import { composeNeplacenoOdsustvo } from "./neplaceno-odsustvo/compose";
import {
  composePotvrdaZaposlenje,
  composePotvrdaPlata,
  composePotvrdaStaz,
} from "./potvrde/compose";
import {
  composeOdlukaVozilo,
  composeOdlukaPromjenaPlate,
  composeUpozorenjeOtkaz,
  composeAneks,
} from "./radni-odnos/compose";
import { composeRjesenjePorodiljsko } from "./porodiljsko/compose";
import { composeOdlukaOtpremnina } from "./otpremnina/compose";
import { composeOdlukaTopliObrok } from "./topli-obrok/compose";
import { composeOdlukaBlagajnickiMaksimum } from "./blagajnicki-maksimum/compose";

const todayIso = () => new Date().toISOString().slice(0, 10);
const thisYear = () => new Date().getFullYear();

const MJESECI = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "juni",
  "juli",
  "august",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
];

// Bosanska množina: 1 -> one, 2..4 -> few, ostalo -> many (uz izuzetak 11..14).
function bsPlural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}

// Period zadnja 3 zatvorena mjeseca prije tekućeg, npr. "mart, april i maj 2026."
// (grupisano po godini ako raspon prelazi godinu: "decembar 2025. te januar 2026.").
function zadnja3MjesecaText(ref = new Date()): string {
  const grupe: { y: number; mj: number[] }[] = [];
  for (let i = 3; i >= 1; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const y = d.getFullYear();
    const last = grupe[grupe.length - 1];
    if (last && last.y === y) last.mj.push(d.getMonth());
    else grupe.push({ y, mj: [d.getMonth()] });
  }
  return grupe
    .map((g) => {
      const imena = g.mj.map((m) => MJESECI[m]);
      const spoj =
        imena.length === 1
          ? imena[0]
          : imena.slice(0, -1).join(", ") + " i " + imena[imena.length - 1];
      return `${spoj} ${g.y}.`;
    })
    .join(" te ");
}

// Trajanje staža između dva datuma, npr. "3 godine i 5 mjeseci".
function trajanjeStaza(odIso: string, doIso: string): string {
  if (!odIso || !doIso) return "";
  // Parsiraj komponente direktno (bez new Date(iso) koji je UTC ponoć pa bi se
  // u nekim vremenskim zonama pomjerio dan), kao i ostali helperi u format.ts.
  const [oy, om, od] = odIso.split("-").map(Number);
  const [dy, dm, dd] = doIso.split("-").map(Number);
  if (!oy || !om || !od || !dy || !dm || !dd) return "";
  if (dy * 372 + dm * 31 + dd < oy * 372 + om * 31 + od) return "";
  let godine = dy - oy;
  let mjeseci = dm - om;
  if (dd < od) mjeseci -= 1;
  if (mjeseci < 0) {
    godine -= 1;
    mjeseci += 12;
  }
  const dijelovi: string[] = [];
  if (godine > 0)
    dijelovi.push(`${godine} ${bsPlural(godine, "godina", "godine", "godina")}`);
  if (mjeseci > 0)
    dijelovi.push(
      `${mjeseci} ${bsPlural(mjeseci, "mjesec", "mjeseca", "mjeseci")}`,
    );
  if (dijelovi.length === 0) return "manje od mjesec dana";
  return dijelovi.join(" i ");
}

// Broj (1234.56) -> formatirani novčani string ("1.234,56").
const brojUNovac = (n: number) =>
  formatMoneyBlur(n.toFixed(2).replace(".", ","));

type DocKey =
  | "godisnji-odmor"
  | "regres"
  | "prigodna-nagrada"
  | "placeno-odsustvo"
  | "neplaceno-odsustvo"
  | "potvrda-zaposlenje"
  | "potvrda-plata"
  | "potvrda-staz"
  | "odluka-vozilo"
  | "aneks-ugovora"
  | "odluka-promjena-plate"
  | "upozorenje-otkaz"
  | "porodiljsko"
  | "otpremnina"
  | "topli-obrok"
  | "blagajnicki-maksimum";

// Akti FIRME (bez radnika): forma krije sekciju radnika, dokument se ne
// arhivira u dosje radnika, a naziv fajla ne nosi prezime.
const IS_AKT_FIRME = (k: DocKey) => k === "blagajnicki-maksimum";

// Dokumenti grupisani po kategoriji (top-nivo tabovi + dokumenti unutra).
type DocCategory = "potvrde" | "odsustva" | "nagrade" | "radni-odnos";
const CATEGORIES: {
  key: DocCategory;
  label: string;
  docs: { value: DocKey; label: string }[];
}[] = [
  {
    key: "potvrde",
    label: "Potvrde",
    docs: [
      { value: "potvrda-zaposlenje", label: "Potvrda o zaposlenju" },
      { value: "potvrda-plata", label: "Potvrda o visini primanja" },
      { value: "potvrda-staz", label: "Potvrda o radnom stažu" },
      {
        value: "blagajnicki-maksimum",
        label: "Odluka o blagajničkom maksimumu",
      },
    ],
  },
  {
    key: "odsustva",
    label: "Rješenja",
    docs: [
      { value: "godisnji-odmor", label: "Rješenje o godišnjem odmoru" },
      { value: "placeno-odsustvo", label: "Rješenje o plaćenom odsustvu" },
      { value: "neplaceno-odsustvo", label: "Rješenje o neplaćenom odsustvu" },
      { value: "porodiljsko", label: "Rješenje o porodiljskom odsustvu" },
    ],
  },
  {
    key: "nagrade",
    label: "Nagrade i isplate",
    docs: [
      { value: "regres", label: "Odluka o isplati regresa" },
      { value: "prigodna-nagrada", label: "Odluka o prigodnoj nagradi" },
      { value: "otpremnina", label: "Odluka o isplati otpremnine" },
      { value: "topli-obrok", label: "Odluka o pravu na topli obrok" },
    ],
  },
  {
    key: "radni-odnos",
    label: "Radni odnos",
    docs: [
      { value: "odluka-promjena-plate", label: "Odluka o promjeni plate" },
      { value: "aneks-ugovora", label: "Aneks ugovora o radu" },
      { value: "odluka-vozilo", label: "Odluka o korištenju vozila" },
      { value: "upozorenje-otkaz", label: "Upozorenje pred otkaz" },
    ],
  },
];

const CATEGORY_OF: Record<DocKey, DocCategory> = CATEGORIES.reduce(
  (acc, c) => {
    for (const d of c.docs) acc[d.value] = c.key;
    return acc;
  },
  {} as Record<DocKey, DocCategory>,
);

// Blagajnički maksimum stoji u kategoriji "Potvrde" radi preglednosti, ali
// NIJE potvrda (akt firme sa svojom formom), pa se ovdje izuzima.
const IS_POTVRDA = (k: DocKey) =>
  CATEGORY_OF[k] === "potvrde" && !IS_AKT_FIRME(k);

// type: null = akt firme, ne arhivira se u dosje radnika.
const DOC_CFG: Record<
  DocKey,
  { type: WorkerDocumentType | null; file: string; track: string }
> = {
  "godisnji-odmor": {
    type: "RJESENJE_GO",
    file: "Rjesenje-godisnji-odmor",
    track: "Rješenje o godišnjem odmoru",
  },
  regres: {
    type: "ODLUKA_REGRES",
    file: "Odluka-regres",
    track: "Odluka o regresu",
  },
  "prigodna-nagrada": {
    type: "ODLUKA_PRIGODNA_NAGRADA",
    file: "Odluka-prigodna-nagrada",
    track: "Odluka o prigodnoj nagradi",
  },
  "placeno-odsustvo": {
    type: "RJESENJE_PLACENO_ODSUSTVO",
    file: "Rjesenje-placeno-odsustvo",
    track: "Rješenje o plaćenom odsustvu",
  },
  "neplaceno-odsustvo": {
    type: "RJESENJE_NEPLACENO_ODSUSTVO",
    file: "Rjesenje-neplaceno-odsustvo",
    track: "Rješenje o neplaćenom odsustvu",
  },
  "potvrda-zaposlenje": {
    type: "POTVRDA_ZAPOSLENJE",
    file: "Potvrda-o-zaposlenju",
    track: "Potvrda o zaposlenju",
  },
  "potvrda-plata": {
    type: "POTVRDA_PLATA",
    file: "Potvrda-o-visini-primanja",
    track: "Potvrda o visini primanja",
  },
  "potvrda-staz": {
    type: "POTVRDA_STAZ",
    file: "Potvrda-o-radnom-stazu",
    track: "Potvrda o radnom stažu",
  },
  "odluka-vozilo": {
    type: "ODLUKA_VOZILO",
    file: "Odluka-o-koristenju-vozila",
    track: "Odluka o korištenju vozila",
  },
  "aneks-ugovora": {
    type: "ANEKS_UGOVORA",
    file: "Aneks-ugovora-o-radu",
    track: "Aneks ugovora o radu",
  },
  "odluka-promjena-plate": {
    type: "ODLUKA_PROMJENA_PLATE",
    file: "Odluka-o-promjeni-plate",
    track: "Odluka o promjeni plate",
  },
  "upozorenje-otkaz": {
    type: "UPOZORENJE_OTKAZ",
    file: "Upozorenje-pred-otkaz",
    track: "Upozorenje pred otkaz",
  },
  porodiljsko: {
    type: "RJESENJE_PORODILJSKO",
    file: "Rjesenje-porodiljsko-odsustvo",
    track: "Rješenje o porodiljskom odsustvu",
  },
  otpremnina: {
    type: "ODLUKA_OTPREMNINA",
    file: "Odluka-o-otpremnini",
    track: "Odluka o isplati otpremnine",
  },
  "topli-obrok": {
    type: "ODLUKA_TOPLI_OBROK",
    file: "Odluka-o-toplom-obroku",
    track: "Odluka o pravu na topli obrok",
  },
  "blagajnicki-maksimum": {
    type: null,
    file: "Odluka-o-blagajnickom-maksimumu",
    track: "Odluka o blagajničkom maksimumu",
  },
};

const PLACENO_RAZLOZI: { value: string; label: string; phrase: string }[] = [
  { value: "brak", label: "Stupanje u brak", phrase: "stupanja u brak" },
  { value: "porod", label: "Porođaj supruge", phrase: "porođaja supruge" },
  {
    value: "bolest",
    label: "Teža bolest člana uže porodice",
    phrase: "teže bolesti člana uže porodice",
  },
  {
    value: "smrt",
    label: "Smrt člana uže porodice",
    phrase: "smrti člana uže porodice",
  },
  {
    value: "krv",
    label: "Dobrovoljno davanje krvi",
    phrase: "dobrovoljnog davanja krvi",
  },
  { value: "drugo", label: "Drugo (upiši)", phrase: "" },
];

export default function RjesenjaOdluke() {
  const search = useSearchParams();
  const initialOrgId = search.get("org") ? Number(search.get("org")) : null;
  const initialWorkerId = search.get("worker")
    ? Number(search.get("worker"))
    : null;

  const queryClient = useQueryClient();
  const { hasAccessToTier } = useMaxAccessibleTier();
  const canGenerate = hasAccessToTier("BUSINESS");

  const [docKey, setDocKey] = useState<DocKey>("godisnji-odmor");

  // Sidebar org/worker
  const [sidebarOrgId, setSidebarOrgId] = useState<number | null>(initialOrgId);
  const [sidebarWorkerId, setSidebarWorkerId] = useState<number | null>(
    initialWorkerId,
  );
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  // Poslodavac (auto iz org-e)
  const [nazivFirme, setNazivFirme] = useState("");
  const [adresaFirme, setAdresaFirme] = useState("");
  const [gradFirme, setGradFirme] = useState("");
  const [potpisnik, setPotpisnik] = useState("");

  // Radnik
  const [imeRadnikaDativ, setImeRadnikaDativ] = useState("");
  const [radnoMjesto, setRadnoMjesto] = useState("");
  const [zenski, setZenski] = useState(false);

  // Zajednička meta
  const [brojAkta, setBrojAkta] = useState("");
  const [mjesto, setMjesto] = useState("");
  const [datumDonosenjaIso, setDatumDonosenjaIso] = useState(todayIso());
  const [godina, setGodina] = useState(String(thisYear()));
  const [ukljuciObrazlozenje, setUkljuciObrazlozenje] = useState(true);
  const [ukljuciPouku, setUkljuciPouku] = useState(true);
  const [rokPrigovora, setRokPrigovora] = useState(30);

  // Godišnji odmor
  const [ukupnoDana, setUkupnoDana] = useState(20);
  const [zakonskiOsnovDana, setZakonskiOsnovDana] = useState(20);
  const [nacin, setNacin] = useState<"cjelosti" | "dva_dijela" | "period">(
    "dva_dijela",
  );
  const [cjelostiOdIso, setCjelostiOdIso] = useState("");
  const [cjelostiDoIso, setCjelostiDoIso] = useState("");
  const [prviDioDana, setPrviDioDana] = useState(12);
  const [prviDioOdIso, setPrviDioOdIso] = useState("");
  const [prviDioDoIso, setPrviDioDoIso] = useState("");
  const [drugiDioRokIso, setDrugiDioRokIso] = useState(
    `${thisYear() + 1}-06-30`,
  );

  // Isplate (regres + prigodna nagrada dijele)
  const [iznos, setIznos] = useState("");
  const [interniAkt, setInterniAkt] = useState("Pravilnika o radu");
  const [isplataNacin, setIsplataNacin] = useState(
    "uz platu za tekući mjesec",
  );
  const [racun, setRacun] = useState("");
  const [napomenaPorez, setNapomenaPorez] = useState(true);
  const [povod, setPovod] = useState("");

  // Odsustva (plaćeno + neplaćeno dijele)
  const [odsRazlogKey, setOdsRazlogKey] = useState("brak");
  const [odsRazlogCustom, setOdsRazlogCustom] = useState("");
  const [odsOdIso, setOdsOdIso] = useState("");
  const [odsDoIso, setOdsDoIso] = useState("");
  const [odsBrojDana, setOdsBrojDana] = useState(1);

  // Potvrde (ime radnika u nominativu = imeRadnikaDativ, iznos = postojeće polje)
  const [jmbg, setJmbg] = useState("");
  const [potvrdaSvrha, setPotvrdaSvrha] = useState("");
  const [datumZaposlenjaIso, setDatumZaposlenjaIso] = useState("");
  const [potvrdaNeodredjeno, setPotvrdaNeodredjeno] = useState(true);
  const [potvrdaPeriod, setPotvrdaPeriod] = useState("");
  const [potvrdaBezZabrane, setPotvrdaBezZabrane] = useState(true);
  const [potvrdaStaz, setPotvrdaStaz] = useState("");
  const [stazOdIso, setStazOdIso] = useState("");
  const [stazDoIso, setStazDoIso] = useState("");

  // Radni odnos , Odluka o korištenju vozila
  const [opisVozila, setOpisVozila] = useState("");
  const [voziloMetoda, setVoziloMetoda] = useState<
    "nabavna_1posto" | "lizing_20posto" | "stvarni_km"
  >("nabavna_1posto");
  const [voziloDatumPrimjeneIso, setVoziloDatumPrimjeneIso] = useState("");

  // Odluka o promjeni plaće (stara plata auto iz radnika)
  const [staraPlata, setStaraPlata] = useState("");
  const [novaPlata, setNovaPlata] = useState("");
  const [plataNeto, setPlataNeto] = useState(true);
  const [plataDatumIso, setPlataDatumIso] = useState("");
  const [plataRazlog, setPlataRazlog] = useState("");

  // Upozorenje pred otkaz
  const [povredaOpis, setPovredaOpis] = useState("");
  const [datumPovredeIso, setDatumPovredeIso] = useState("");
  const [rokIspravka, setRokIspravka] = useState(8);

  // Aneks ugovora (broj/datum ugovora auto iz radnika)
  const [brojUgovora, setBrojUgovora] = useState("");
  const [datumUgovoraIso, setDatumUgovoraIso] = useState("");
  const [aneksStaMijenja, setAneksStaMijenja] = useState("");
  const [aneksNovaSadrzina, setAneksNovaSadrzina] = useState("");
  const [aneksDatumIso, setAneksDatumIso] = useState("");

  // Porodiljsko odsustvo
  const [porodOdIso, setPorodOdIso] = useState("");
  const [porodDoIso, setPorodDoIso] = useState("");
  const [datumPorodaIso, setDatumPorodaIso] = useState("");

  // Otpremnina (iznos = polje `iznos`, napomena = `napomenaPorez`; staž auto)
  const [otpremninaOsnov, setOtpremninaOsnov] = useState("");
  const [otpremninaStaz, setOtpremninaStaz] = useState("");
  const [otpremninaNacin, setOtpremninaNacin] = useState("");

  // Topli obrok
  const [dnevniIznos, setDnevniIznos] = useState("");
  const [topliDatumIso, setTopliDatumIso] = useState("");

  // Blagajnički maksimum (akt firme, bez radnika)
  const [blagIznos, setBlagIznos] = useState("");
  const [blagZaduzeni, setBlagZaduzeni] = useState("");
  const [blagDatumIso, setBlagDatumIso] = useState("");
  const [blagUkljOsnov, setBlagUkljOsnov] = useState(true);
  const [blagUkljPazar, setBlagUkljPazar] = useState(true);

  const [gen, setGen] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const y = Number(godina);
    if (Number.isFinite(y)) setDrugiDioRokIso(`${y + 1}-06-30`);
  }, [godina]);

  // Org auto-popuna
  const orgQuery = useQuery({
    queryKey: ["organization", sidebarOrgId],
    queryFn: () => unwrap(getOrganization(sidebarOrgId!)),
    enabled: !!sidebarOrgId,
  });
  useEffect(() => {
    const org = orgQuery.data;
    if (!org) return;
    setNazivFirme(org.name ?? "");
    setAdresaFirme(org.address ?? "");
    setGradFirme(org.city ?? "");
    setMjesto((p) => p || org.city || "");
    const signer =
      org.signer?.name ||
      [org.owner?.firstName, org.owner?.lastName].filter(Boolean).join(" ");
    if (signer) setPotpisnik(signer);
  }, [orgQuery.data]);

  // Deep-link radnika
  const deepLinkRef = useRef(false);
  const workersQuery = useQuery({
    queryKey: ["workers", sidebarOrgId],
    queryFn: () => unwrap(getWorkers(sidebarOrgId!)),
    enabled: !!sidebarOrgId && !!initialWorkerId,
  });
  useEffect(() => {
    if (deepLinkRef.current || !initialWorkerId) return;
    const w = workersQuery.data?.find((x) => x.id === initialWorkerId);
    if (!w) return;
    deepLinkRef.current = true;
    handleWorkerPick(w.id, w);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workersQuery.data, initialWorkerId]);

  // Auto-popuna polja potvrda iz podataka radnika: datum zaposlenja, staž
  // (od = prijava/početak rada, do = danas, + izračunato trajanje) i period
  // (zadnja 3 mjeseca). Iznos neto plate se vuče iz obračuna (vidi platnaQuery).
  const popuniIzRadnika = (w: Worker | null) => {
    if (!w) return;
    const zaposlenIso = w.prijavaDate ?? w.startDate ?? "";
    const danas = todayIso();
    const stazTekst = trajanjeStaza(zaposlenIso, danas);
    setDatumZaposlenjaIso(zaposlenIso);
    setStazOdIso(zaposlenIso);
    setStazDoIso(danas);
    setPotvrdaStaz(stazTekst);
    setPotvrdaPeriod(zadnja3MjesecaText());
    // Radni odnos / nagrade
    setStaraPlata(w.salaryNeto != null && w.salaryNeto > 0 ? brojUNovac(w.salaryNeto) : "");
    setBrojUgovora(w.contractNumber ?? "");
    setDatumUgovoraIso(w.startDate ?? "");
    setOtpremninaStaz(stazTekst);
  };

  const handleWorkerPick = (workerId: number | null, w: Worker | null) => {
    setSidebarWorkerId(workerId);
    setSelectedWorker(w);
    if (!w) return;
    setImeRadnikaDativ(`${w.firstName} ${w.lastName}`.trim());
    setRadnoMjesto(w.position ?? "");
    setZenski(w.spol === "Z");
    setJmbg(w.jmbg ?? "");
    popuniIzRadnika(w);
  };

  // Prosječna neto plaća iz obračuna za zadnja 3 mjeseca (Potvrda o visini
  // primanja). Vraća prosjek dostupnih mjeseci ili null ako nema obračuna.
  const platnaQuery = useQuery({
    queryKey: ["potvrda-plata-net", sidebarOrgId, selectedWorker?.id],
    enabled: !!sidebarOrgId && !!selectedWorker && docKey === "potvrda-plata",
    queryFn: async () => {
      const ref = new Date();
      const mjeseci = [1, 2, 3].map((i) => {
        const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
        return { y: d.getFullYear(), m: d.getMonth() + 1 };
      });
      const liste = await Promise.all(
        mjeseci.map(({ y, m }) => unwrap(listPayrolls(sidebarOrgId!, y, m))),
      );
      const neta: number[] = [];
      for (const lista of liste) {
        const red = lista.find((p) => p.workerId === selectedWorker!.id);
        if (red && typeof red.net === "number" && red.net > 0) neta.push(red.net);
      }
      if (neta.length === 0) return null;
      return neta.reduce((a, b) => a + b, 0) / neta.length;
    },
  });

  // Popuni iznos na Potvrdi o visini primanja: prosjek iz obračuna, a ako ga
  // nema, ugovorni neto iz kartona radnika. Pokreće se pri ulasku u taj
  // dokument / promjeni radnika; kasnije ručne izmjene se ne pregaze.
  useEffect(() => {
    if (docKey !== "potvrda-plata" || !selectedWorker) return;
    if (platnaQuery.isLoading) return;
    // Ne pregazi ručni unos: popuni samo ako je polje prazno (npr. kad obračun
    // stigne tek nakon što je korisnik već nešto upisao tokom učitavanja).
    if (iznos.trim()) return;
    const neto =
      platnaQuery.data != null ? platnaQuery.data : selectedWorker.salaryNeto;
    if (neto != null && neto > 0) setIznos(brojUNovac(neto));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, selectedWorker, platnaQuery.data, platnaQuery.isLoading, iznos]);

  // Reset polja specifičnih za dokument pri promjeni vrste, da se vrijednosti
  // jednog dokumenta ne prenesu u drugi (npr. razlog/datumi odsustva, iznos).
  // Zajednička polja (poslodavac, radnik, broj, datum, potpisnik) ostaju.
  const resetDocFields = () => {
    // Godišnji odmor
    setUkupnoDana(20);
    setZakonskiOsnovDana(20);
    setNacin("dva_dijela");
    setCjelostiOdIso("");
    setCjelostiDoIso("");
    setPrviDioDana(12);
    setPrviDioOdIso("");
    setPrviDioDoIso("");
    setDrugiDioRokIso(`${thisYear() + 1}-06-30`);
    // Isplate (regres / prigodna nagrada)
    setIznos("");
    setInterniAkt("Pravilnika o radu");
    setIsplataNacin("uz platu za tekući mjesec");
    setRacun("");
    setNapomenaPorez(true);
    setPovod("");
    // Odsustva
    setOdsRazlogKey("brak");
    setOdsRazlogCustom("");
    setOdsOdIso("");
    setOdsDoIso("");
    setOdsBrojDana(1);
    // Potvrde: svrha/ugovor/zabrana na default; datum, staž i period se
    // ponovo popunjavaju iz radnika (popuniIzRadnika), iznos kroz platnaQuery.
    setPotvrdaSvrha("");
    setPotvrdaNeodredjeno(true);
    setPotvrdaPeriod("");
    setPotvrdaBezZabrane(true);
    setPotvrdaStaz("");
    setStazOdIso("");
    setStazDoIso("");
    // Radni odnos , vozilo
    setOpisVozila("");
    setVoziloMetoda("nabavna_1posto");
    setVoziloDatumPrimjeneIso("");
    // Promjena plaće / upozorenje / aneks
    setStaraPlata("");
    setNovaPlata("");
    setPlataNeto(true);
    setPlataDatumIso("");
    setPlataRazlog("");
    setPovredaOpis("");
    setDatumPovredeIso("");
    setRokIspravka(8);
    setBrojUgovora("");
    setDatumUgovoraIso("");
    setAneksStaMijenja("");
    setAneksNovaSadrzina("");
    setAneksDatumIso("");
    // Porodiljsko
    setPorodOdIso("");
    setPorodDoIso("");
    setDatumPorodaIso("");
    // Otpremnina / topli obrok
    setOtpremninaOsnov("");
    setOtpremninaStaz("");
    setOtpremninaNacin("");
    setDnevniIznos("");
    setTopliDatumIso("");
    // Blagajnički maksimum
    setBlagIznos("");
    setBlagZaduzeni("");
    setBlagDatumIso("");
    setBlagUkljOsnov(true);
    setBlagUkljPazar(true);
    // Na kraju: auto-popuna polja izvedenih iz radnika (datum, staž, period,
    // stara plata, broj/datum ugovora) , da pregazi gornje resetove.
    popuniIzRadnika(selectedWorker);
  };

  const odsRazlog = () => {
    const o = PLACENO_RAZLOZI.find((r) => r.value === odsRazlogKey);
    if (odsRazlogKey === "drugo") return odsRazlogCustom;
    return o?.phrase ?? odsRazlogCustom;
  };

  const composeFor = (): RjesenjeComposed => {
    if (docKey === "blagajnicki-maksimum") {
      return composeOdlukaBlagajnickiMaksimum({
        nazivFirme,
        adresaFirme,
        gradFirme,
        brojAkta,
        mjesto,
        datumDonosenjaIso,
        potpisnik,
        iznos: blagIznos,
        zaduzeni: blagZaduzeni,
        datumPrimjeneIso: blagDatumIso,
        ukljuciOsnov: blagUkljOsnov,
        ukljuciPazar: blagUkljPazar,
      });
    }
    const common = {
      nazivFirme,
      adresaFirme,
      gradFirme,
      brojAkta,
      mjesto,
      datumDonosenjaIso,
      imeRadnikaDativ,
      radnoMjesto,
      zenski,
      potpisnik,
    };
    if (IS_POTVRDA(docKey)) {
      const commonP = {
        nazivFirme,
        adresaFirme,
        gradFirme,
        brojAkta,
        mjesto,
        datumDonosenjaIso,
        imeRadnika: imeRadnikaDativ, // nominativ (iz worker pick)
        jmbg,
        radnoMjesto,
        svrha: potvrdaSvrha,
        potpisnik,
      };
      if (docKey === "potvrda-zaposlenje") {
        return composePotvrdaZaposlenje({
          ...commonP,
          datumZaposlenjaIso,
          neodredjeno: potvrdaNeodredjeno,
        });
      }
      if (docKey === "potvrda-plata") {
        return composePotvrdaPlata({
          ...commonP,
          period: potvrdaPeriod,
          iznos,
          bezZabrane: potvrdaBezZabrane,
        });
      }
      return composePotvrdaStaz({
        ...commonP,
        odIso: stazOdIso,
        doIso: stazDoIso,
        staz: potvrdaStaz,
      });
    }
    if (docKey === "odluka-vozilo") {
      return composeOdlukaVozilo({
        ...common,
        opisVozila,
        metoda: voziloMetoda,
        datumPrimjeneIso: voziloDatumPrimjeneIso,
      });
    }
    if (docKey === "odluka-promjena-plate") {
      return composeOdlukaPromjenaPlate({
        ...common,
        staraPlata,
        novaPlata,
        neto: plataNeto,
        datumPrimjeneIso: plataDatumIso,
        razlog: plataRazlog,
      });
    }
    if (docKey === "upozorenje-otkaz") {
      return composeUpozorenjeOtkaz({
        ...common,
        povredaOpis,
        datumPovredeIso,
        rokIspravka: Number(rokIspravka) || 0,
      });
    }
    if (docKey === "aneks-ugovora") {
      return composeAneks({
        nazivFirme,
        adresaFirme,
        gradFirme,
        brojAkta,
        mjesto,
        datumDonosenjaIso,
        imeRadnika: imeRadnikaDativ,
        radnoMjesto,
        potpisnik,
        brojUgovora,
        datumUgovoraIso,
        staMijenja: aneksStaMijenja,
        novaSadrzina: aneksNovaSadrzina,
        datumPrimjeneIso: aneksDatumIso,
      });
    }
    if (docKey === "porodiljsko") {
      return composeRjesenjePorodiljsko({
        ...common,
        odIso: porodOdIso,
        doIso: porodDoIso,
        datumPorodaIso,
        ukljuciObrazlozenje,
        ukljuciPouku,
        rokPrigovora: Number(rokPrigovora) || 0,
      });
    }
    if (docKey === "otpremnina") {
      return composeOdlukaOtpremnina({
        ...common,
        iznos,
        osnov: otpremninaOsnov,
        godineStaza: otpremninaStaz,
        isplataNacin: otpremninaNacin,
        napomenaPorez,
      });
    }
    if (docKey === "topli-obrok") {
      return composeOdlukaTopliObrok({
        ...common,
        dnevniIznos,
        datumPrimjeneIso: topliDatumIso,
        napomenaPorez,
      });
    }
    if (docKey === "godisnji-odmor") {
      return composeGo({
        ...common,
        godina,
        ukupnoDana: Number(ukupnoDana) || 0,
        zakonskiOsnovDana: Number(zakonskiOsnovDana) || 0,
        nacin,
        cjelostiOdIso,
        cjelostiDoIso,
        prviDioDana: Number(prviDioDana) || 0,
        prviDioOdIso,
        prviDioDoIso,
        drugiDioRokIso,
        ukljuciObrazlozenje,
        ukljuciPouku,
        rokPrigovora: Number(rokPrigovora) || 0,
      });
    }
    if (docKey === "regres") {
      return composeRegres({
        ...common,
        godina,
        iznos,
        interniAkt,
        isplataNacin,
        racun,
        ukljuciNapomenuPorez: napomenaPorez,
      });
    }
    if (docKey === "prigodna-nagrada") {
      return composePrigodnaNagrada({
        ...common,
        povod,
        iznos,
        interniAkt,
        isplataNacin,
        ukljuciNapomenuPorez: napomenaPorez,
      });
    }
    if (docKey === "placeno-odsustvo") {
      return composePlacenoOdsustvo({
        ...common,
        razlog: odsRazlog(),
        brojDana: Number(odsBrojDana) || 0,
        odIso: odsOdIso,
        doIso: odsDoIso,
        ukljuciObrazlozenje,
        ukljuciPouku,
        rokPrigovora: Number(rokPrigovora) || 0,
      });
    }
    return composeNeplacenoOdsustvo({
      ...common,
      razlog: odsRazlogCustom,
      brojDana: Number(odsBrojDana) || 0,
      odIso: odsOdIso,
      doIso: odsDoIso,
      ukljuciPouku,
      rokPrigovora: Number(rokPrigovora) || 0,
    });
  };

  const validate = (): string | null => {
    if (!nazivFirme.trim())
      return "Unesite naziv poslodavca (ili odaberite organizaciju).";
    // Akt firme: nema radnika, traži se samo iznos.
    if (docKey === "blagajnicki-maksimum") {
      if (!blagIznos.trim()) return "Unesite iznos blagajničkog maksimuma.";
      return null;
    }
    if (!imeRadnikaDativ.trim()) return "Unesite ime radnika.";
    if (!radnoMjesto.trim()) return "Unesite radno mjesto radnika.";

    if (IS_POTVRDA(docKey)) {
      if (docKey === "potvrda-plata" && !iznos.trim())
        return "Unesite prosječnu neto plaću.";
      return null;
    }
    if (docKey === "odluka-vozilo") return null;
    if (docKey === "odluka-promjena-plate") {
      if (!novaPlata.trim()) return "Unesite novu plaću.";
      return null;
    }
    if (docKey === "upozorenje-otkaz") {
      if (!povredaOpis.trim()) return "Opišite povredu radne obaveze.";
      return null;
    }
    if (docKey === "aneks-ugovora") {
      if (!aneksStaMijenja.trim())
        return "Navedite koja se odredba ugovora mijenja.";
      if (!aneksNovaSadrzina.trim()) return "Unesite novu sadržinu odredbe.";
      return null;
    }
    if (docKey === "porodiljsko") {
      if (!porodOdIso) return "Unesite datum početka porodiljskog odsustva.";
      return null;
    }
    if (docKey === "otpremnina") {
      if (!iznos.trim()) return "Unesite iznos otpremnine.";
      return null;
    }
    if (docKey === "topli-obrok") {
      if (!dnevniIznos.trim()) return "Unesite dnevni iznos toplog obroka.";
      return null;
    }
    if (docKey === "godisnji-odmor") {
      if (!(Number(ukupnoDana) > 0))
        return "Broj radnih dana mora biti veći od 0.";
      if (nacin === "dva_dijela") {
        if (!prviDioOdIso || !prviDioDoIso)
          return "Unesite datum početka i kraja prvog dijela odmora.";
      } else if (!cjelostiOdIso || !cjelostiDoIso) {
        return "Unesite datum početka i kraja godišnjeg odmora.";
      }
    } else if (docKey === "regres" || docKey === "prigodna-nagrada") {
      if (!iznos.trim()) return "Unesite iznos.";
      if (docKey === "prigodna-nagrada" && !povod.trim())
        return "Unesite povod (npr. Kurban-bajram, Nova godina).";
    } else {
      // odsustva
      if (!odsOdIso || !odsDoIso)
        return "Unesite datum početka i kraja odsustva.";
      if (!(Number(odsBrojDana) > 0)) return "Broj dana mora biti veći od 0.";
      if (docKey === "placeno-odsustvo" && odsRazlogKey === "drugo" && !odsRazlogCustom.trim())
        return "Unesite razlog odsustva.";
      if (docKey === "neplaceno-odsustvo" && !odsRazlogCustom.trim())
        return "Unesite razlog odsustva.";
    }
    return null;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const archiveDocument = (
    blob: Blob,
    filename: string,
    type: WorkerDocumentType,
    format: "DOCX" | "PDF",
  ) => {
    if (!selectedWorker) return;
    uploadWorkerDocument(selectedWorker.id, blob, {
      type,
      format,
      originalName: filename,
    })
      .then((r) => {
        if (r.ok && selectedWorker) {
          queryClient.invalidateQueries({
            queryKey: ["workerDocuments", selectedWorker.id],
          });
        } else if (!r.ok) {
          console.warn("Arhiviranje dokumenta nije uspjelo:", r.error);
        }
      })
      .catch((e) => console.warn("Greška pri arhiviranju:", e));
  };

  const handleDownload = async (kind: "pdf" | "docx") => {
    if (!canGenerate) return;
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setGen(kind);
    try {
      const composed = composeFor();
      const cfg = DOC_CFG[docKey];
      // Akt firme u nazivu fajla nosi firmu, ostali prezime radnika.
      const sufiksIzvor = IS_AKT_FIRME(docKey)
        ? nazivFirme || "firma"
        : imeRadnikaDativ.split(" ").pop() || "radnik";
      const last = sufiksIzvor.replace(/[^\p{L}\p{N}_-]/gu, "");
      const filename = `${cfg.file}_${last}.${kind}`;
      let blob: Blob;
      if (kind === "docx") {
        blob = await fillRjesenjeDocx(composed);
      } else {
        const bytes = await fillRjesenjePdf(composed);
        blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      }
      downloadBlob(blob, filename);
      trackEvent("RJESENJE_GENERATE", cfg.track, sidebarOrgId);
      // Akt firme (type null) se ne arhivira u dosje radnika.
      if (cfg.type) {
        archiveDocument(blob, filename, cfg.type, kind === "docx" ? "DOCX" : "PDF");
      }
    } catch (e) {
      setError("Greška pri generisanju: " + (e as Error).message);
    } finally {
      setGen(null);
    }
  };

  // Auto broj dana odsustva iz raspona (radni za plaćeno, kalendarski za neplaćeno)
  const recomputeOdsDana = (od: string, doISO: string) => {
    if (!od || !doISO) return;
    const n =
      docKey === "neplaceno-odsustvo"
        ? racunajKalendarskeDane(od, doISO)
        : racunajRadneDane(od, doISO);
    if (n > 0) setOdsBrojDana(n);
  };

  // Labela polja "Broj ..." prema vrsti dokumenta.
  const brojAktaLabel = () => {
    if (IS_AKT_FIRME(docKey)) return "Broj odluke";
    const cat = CATEGORY_OF[docKey];
    if (cat === "potvrde") return "Broj potvrde";
    if (cat === "odsustva") return "Broj rješenja";
    if (docKey === "aneks-ugovora") return "Broj aneksa";
    if (docKey === "upozorenje-otkaz") return "Broj akta";
    return "Broj odluke";
  };

  // Porodiljsko: kad se unese početak, predloži kraj = + 1 godina , 1 dan.
  const porodDoFromOd = (odIso: string): string => {
    if (!odIso) return "";
    const [y, m, d] = odIso.split("-").map(Number);
    if (!y || !m || !d) return "";
    const kraj = new Date(Date.UTC(y + 1, m - 1, d));
    kraj.setUTCDate(kraj.getUTCDate() - 1);
    return kraj.toISOString().slice(0, 10);
  };

  return (
    <div className={uorStyles.pageOuter}>
      <div className={uorStyles.pageLayout}>
        <WorkersSidebar
          selectedOrgId={sidebarOrgId}
          onOrgChange={(id) => {
            setSidebarOrgId(id);
            setSidebarWorkerId(null);
            setSelectedWorker(null);
          }}
          selectedWorkerId={sidebarWorkerId}
          onWorkerSelect={handleWorkerPick}
          bottomHint="Klik na radnika auto-popunjava ime, radno mjesto i rod."
        />
        <main className={uorStyles.pageContent}>
          <div className={styles.header}>
            <p className={styles.label}>Kadrovski akti</p>
            <h1 className={styles.h1}>
              Rješenja i <em>odluke</em> (FBiH)
            </h1>
            <p className={styles.subtitle}>
              Generator kadrovskih rješenja i odluka prema Zakonu o radu FBiH.
              Odaberite vrstu dokumenta i radnika, popunite podatke i preuzmite u
              PDF ili Word formatu.
            </p>
          </div>

          <div className={styles.docPicker}>
            <label>Vrsta dokumenta</label>
            {/* Po jedan dropdown za svaku kategoriju, s lijeva na desno. Button
                uvijek pokazuje naziv kategorije; aktivna (ona iz koje je izabran
                dokument) je istaknuta. Konkretan dokument se vidi u formi ispod. */}
            <div className={styles.catRow}>
              {CATEGORIES.map((c) => {
                const active = CATEGORY_OF[docKey] === c.key;
                return (
                  <StyledSelect
                    key={c.key}
                    ariaLabel={c.label}
                    placeholder={c.label}
                    wrapStyle={{ flex: "1 1 0", minWidth: 150 }}
                    fitPanel
                    centerText
                    style={
                      active
                        ? {
                            borderColor: "var(--sage, #3a5c42)",
                            background: "var(--sage-soft, #d6e8d9)",
                          }
                        : undefined
                    }
                    value={null}
                    onChange={(v) => {
                      // Bez resetiranja ako je već izabran isti dokument (klik na
                      // istu stavku ne smije obrisati već unesena polja).
                      if (!v || v === docKey) return;
                      setDocKey(v as DocKey);
                      setError(null);
                      resetDocFields();
                    }}
                    groups={[{ options: c.docs }]}
                  />
                );
              })}
            </div>
            <p className={styles.selectedDoc}>
              Izabrano:{" "}
              <strong>
                {CATEGORIES.find((c) => c.key === CATEGORY_OF[docKey])?.docs.find(
                  (d) => d.value === docKey,
                )?.label ?? ""}
              </strong>
            </p>
          </div>

          {/* Poslodavac */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Poslodavac</h2>
            <div className={styles.grid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Naziv poslodavca</span>
                <input
                  className={styles.input}
                  value={nazivFirme}
                  onChange={(e) => setNazivFirme(e.target.value)}
                  placeholder="Naziv d.o.o. / obrt"
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Adresa</span>
                <input
                  className={styles.input}
                  value={adresaFirme}
                  onChange={(e) => setAdresaFirme(e.target.value)}
                  placeholder="npr. Ulica i broj"
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Grad</span>
                <input
                  className={styles.input}
                  value={gradFirme}
                  onChange={(e) => setGradFirme(e.target.value)}
                  placeholder="npr. 71000 Sarajevo"
                />
              </div>
            </div>
          </section>

          {/* Radnik (akti firme, npr. blagajnički maksimum, nemaju radnika) */}
          {!IS_AKT_FIRME(docKey) && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Radnik</h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Ime i prezime</span>
                <input
                  className={styles.input}
                  value={imeRadnikaDativ}
                  onChange={(e) => setImeRadnikaDativ(e.target.value)}
                  placeholder="npr. Ime Prezime"
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Radno mjesto</span>
                <input
                  className={styles.input}
                  value={radnoMjesto}
                  onChange={(e) => setRadnoMjesto(e.target.value)}
                  placeholder="npr. komercijalista"
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Rod</span>
                <StyledSelect
                  ariaLabel="Rod"
                  value={zenski ? "z" : "m"}
                  onChange={(v) => setZenski(v === "z")}
                  groups={[
                    {
                      options: [
                        { value: "m", label: "Muški (radniku)" },
                        { value: "z", label: "Ženski (radnici)" },
                      ],
                    },
                  ]}
                />
              </div>
            </div>
          </section>
          )}

          {/* Osnovni podaci akta */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Osnovni <em>podaci</em>
            </h2>
            <div className={styles.grid3}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{brojAktaLabel()}</span>
                <input
                  className={styles.input}
                  value={brojAkta}
                  onChange={(e) => setBrojAkta(e.target.value)}
                  placeholder="npr. 03-06/25"
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Mjesto donošenja</span>
                <input
                  className={styles.input}
                  value={mjesto}
                  onChange={(e) => setMjesto(e.target.value)}
                  placeholder="npr. Sarajevo"
                />
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Datum donošenja</span>
                <DateInput
                  className={styles.input}
                  value={datumDonosenjaIso}
                  onValueChange={setDatumDonosenjaIso}
                />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Potpisnik</span>
                <input
                  className={styles.input}
                  value={potpisnik}
                  onChange={(e) => setPotpisnik(e.target.value)}
                  placeholder="ime direktora / ovlaštenog lica"
                />
              </div>
            </div>
          </section>

          {/* ── POTVRDE ── */}
          {IS_POTVRDA(docKey) && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Detalji <em>potvrde</em>
              </h2>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>JMBG (opciono)</span>
                  <input
                    className={styles.input}
                    value={jmbg}
                    onChange={(e) => setJmbg(e.target.value)}
                    placeholder="13 cifara"
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={styles.fieldLabel}>Za potrebe (svrha)</span>
                  <input
                    className={styles.input}
                    value={potvrdaSvrha}
                    onChange={(e) => setPotvrdaSvrha(e.target.value)}
                    placeholder="npr. kreditnog zaduženja kod banke"
                  />
                  <span className={styles.hint}>
                    Ostaviti prazno za opštu formulaciju.
                  </span>
                </div>

                {docKey === "potvrda-zaposlenje" && (
                  <>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Datum zaposlenja</span>
                      <DateInput
                        className={styles.input}
                        value={datumZaposlenjaIso}
                        onValueChange={setDatumZaposlenjaIso}
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Vrsta ugovora</span>
                      <StyledSelect
                        ariaLabel="Vrsta ugovora"
                        value={potvrdaNeodredjeno ? "neodredjeno" : "odredjeno"}
                        onChange={(v) =>
                          setPotvrdaNeodredjeno(v === "neodredjeno")
                        }
                        groups={[
                          {
                            options: [
                              { value: "neodredjeno", label: "Neodređeno vrijeme" },
                              { value: "odredjeno", label: "Određeno vrijeme" },
                            ],
                          },
                        ]}
                      />
                    </div>
                  </>
                )}

                {docKey === "potvrda-plata" && (
                  <>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>
                        Prosječna neto plaća (KM)
                      </span>
                      <input
                        className={styles.input}
                        value={iznos}
                        inputMode="decimal"
                        onChange={(e) => setIznos(formatMoneyLive(e.target.value))}
                        onBlur={() => setIznos(formatMoneyBlur(iznos))}
                        placeholder="npr. 1.200,00"
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Period (3 mjeseca)</span>
                      <input
                        className={styles.input}
                        value={potvrdaPeriod}
                        onChange={(e) => setPotvrdaPeriod(e.target.value)}
                        placeholder="npr. mart, april i maj 2026."
                      />
                    </div>
                    <label
                      className={`${styles.field} ${styles.fieldFull}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={potvrdaBezZabrane}
                        onChange={(e) => setPotvrdaBezZabrane(e.target.checked)}
                      />
                      <span style={{ fontSize: 13 }}>
                        Dodaj napomenu: nema administrativnih zabrana/obustava
                      </span>
                    </label>
                  </>
                )}

                {docKey === "potvrda-staz" && (
                  <>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Staž od</span>
                      <DateInput
                        className={styles.input}
                        value={stazOdIso}
                        onValueChange={setStazOdIso}
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Staž do</span>
                      <DateInput
                        className={styles.input}
                        value={stazDoIso}
                        onValueChange={setStazDoIso}
                      />
                    </div>
                    <div className={`${styles.field} ${styles.fieldFull}`}>
                      <span className={styles.fieldLabel}>
                        Trajanje staža (opciono)
                      </span>
                      <input
                        className={styles.input}
                        value={potvrdaStaz}
                        onChange={(e) => setPotvrdaStaz(e.target.value)}
                        placeholder="npr. 3 godine i 5 mjeseci"
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* ── ODLUKA O KORIŠTENJU VOZILA ── */}
          {docKey === "odluka-vozilo" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Detalji <em>vozila</em>
              </h2>
              <div className={styles.grid}>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={styles.fieldLabel}>
                    Opis vozila (model i tablice)
                  </span>
                  <input
                    className={styles.input}
                    value={opisVozila}
                    onChange={(e) => setOpisVozila(e.target.value)}
                    placeholder="npr. VW Passat, A12-B-345"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Metoda utvrđivanja koristi</span>
                  <StyledSelect
                    ariaLabel="Metoda utvrđivanja koristi"
                    value={voziloMetoda}
                    onChange={(v) =>
                      setVoziloMetoda(
                        v as
                          | "nabavna_1posto"
                          | "lizing_20posto"
                          | "stvarni_km",
                      )
                    }
                    groups={[
                      {
                        options: [
                          {
                            value: "nabavna_1posto",
                            label: "1% nabavne vrijednosti (mjesečno)",
                          },
                          {
                            value: "lizing_20posto",
                            label: "20% rate lizinga / najma",
                          },
                          {
                            value: "stvarni_km",
                            label: "Stvarni pređeni km",
                          },
                        ],
                      },
                    ]}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Stupa na snagu (opciono)
                  </span>
                  <DateInput
                    className={styles.input}
                    value={voziloDatumPrimjeneIso}
                    onValueChange={setVoziloDatumPrimjeneIso}
                  />
                  <span className={styles.hint}>
                    Prazno = danom donošenja odluke.
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* ── ODLUKA O PROMJENI PLAĆE ── */}
          {docKey === "odluka-promjena-plate" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Detalji <em>plaće</em>
              </h2>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Nova plaća (KM)</span>
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    value={novaPlata}
                    onChange={(e) => setNovaPlata(formatMoneyLive(e.target.value))}
                    onBlur={(e) => setNovaPlata(formatMoneyBlur(e.target.value))}
                    placeholder="npr. 1.500,00"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Dosadašnja plaća (KM)</span>
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    value={staraPlata}
                    onChange={(e) => setStaraPlata(formatMoneyLive(e.target.value))}
                    onBlur={(e) => setStaraPlata(formatMoneyBlur(e.target.value))}
                    placeholder="auto iz kartona radnika"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Tip plaće</span>
                  <StyledSelect
                    ariaLabel="Tip plaće"
                    value={plataNeto ? "neto" : "bruto"}
                    onChange={(v) => setPlataNeto(v === "neto")}
                    groups={[
                      {
                        options: [
                          { value: "neto", label: "Neto plaća" },
                          { value: "bruto", label: "Bruto plaća" },
                        ],
                      },
                    ]}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Primjenjuje se od (opciono)
                  </span>
                  <DateInput
                    className={styles.input}
                    value={plataDatumIso}
                    onValueChange={setPlataDatumIso}
                  />
                  <span className={styles.hint}>
                    Prazno = od narednog obračuna.
                  </span>
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={styles.fieldLabel}>Razlog (opciono)</span>
                  <input
                    className={styles.input}
                    value={plataRazlog}
                    onChange={(e) => setPlataRazlog(e.target.value)}
                    placeholder="npr. napredovanje, usklađivanje s minimalnom plaćom"
                  />
                </div>
              </div>
            </section>
          )}

          {/* ── ANEKS UGOVORA O RADU ── */}
          {docKey === "aneks-ugovora" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Detalji <em>aneksa</em>
              </h2>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Broj ugovora</span>
                  <input
                    className={styles.input}
                    value={brojUgovora}
                    onChange={(e) => setBrojUgovora(e.target.value)}
                    placeholder="broj osnovnog ugovora"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Datum ugovora</span>
                  <DateInput
                    className={styles.input}
                    value={datumUgovoraIso}
                    onValueChange={setDatumUgovoraIso}
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={styles.fieldLabel}>
                    Koja se odredba mijenja
                  </span>
                  <input
                    className={styles.input}
                    value={aneksStaMijenja}
                    onChange={(e) => setAneksStaMijenja(e.target.value)}
                    placeholder="npr. član 5. (plaća)"
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={styles.fieldLabel}>Nova sadržina odredbe</span>
                  <textarea
                    className={styles.input}
                    style={{ minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
                    value={aneksNovaSadrzina}
                    onChange={(e) => setAneksNovaSadrzina(e.target.value)}
                    placeholder="upišite novi tekst odredbe"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Stupa na snagu (opciono)
                  </span>
                  <DateInput
                    className={styles.input}
                    value={aneksDatumIso}
                    onValueChange={setAneksDatumIso}
                  />
                  <span className={styles.hint}>
                    Prazno = danom potpisivanja. Aneks potpisuju obje strane.
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* ── UPOZORENJE PRED OTKAZ ── */}
          {docKey === "upozorenje-otkaz" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Detalji <em>upozorenja</em>
              </h2>
              <div className={styles.grid}>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <span className={styles.fieldLabel}>
                    Opis povrede radne obaveze
                  </span>
                  <textarea
                    className={styles.input}
                    style={{ minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
                    value={povredaOpis}
                    onChange={(e) => setPovredaOpis(e.target.value)}
                    placeholder="npr. neopravdani izostanak s posla, nepoštivanje radnih naloga..."
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Datum povrede (opciono)</span>
                  <DateInput
                    className={styles.input}
                    value={datumPovredeIso}
                    onValueChange={setDatumPovredeIso}
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Rok za ispravak (dana)</span>
                  <input
                    type="number"
                    min={0}
                    className={styles.input}
                    value={rokIspravka}
                    onChange={(e) => setRokIspravka(Number(e.target.value))}
                  />
                  <span className={styles.hint}>0 = bez ostavljanja roka.</span>
                </div>
              </div>
            </section>
          )}

          {/* ── PORODILJSKO ODSUSTVO ── */}
          {docKey === "porodiljsko" && (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  Detalji <em>odsustva</em>
                </h2>
                <div className={styles.grid}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Od</span>
                    <DateInput
                      className={styles.input}
                      value={porodOdIso}
                      onValueChange={(v) => {
                        setPorodOdIso(v);
                        if (v) setPorodDoIso(porodDoFromOd(v));
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Do</span>
                    <DateInput
                      className={styles.input}
                      value={porodDoIso}
                      onValueChange={setPorodDoIso}
                    />
                    <span className={styles.hint}>
                      Prijedlog: godinu dana od početka (čl. 62.), možete
                      promijeniti.
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>
                      Datum porođaja (opciono)
                    </span>
                    <DateInput
                      className={styles.input}
                      value={datumPorodaIso}
                      onValueChange={setDatumPorodaIso}
                    />
                  </div>
                </div>
              </section>
              {renderObrazlozenjePouka(true)}
            </>
          )}

          {/* ── ODLUKA O OTPREMNINI ── */}
          {docKey === "otpremnina" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Detalji <em>otpremnine</em>
              </h2>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Iznos otpremnine (KM)</span>
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    value={iznos}
                    onChange={(e) => setIznos(formatMoneyLive(e.target.value))}
                    onBlur={(e) => setIznos(formatMoneyBlur(e.target.value))}
                    placeholder="npr. 3.000,00"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Osnov / razlog</span>
                  <input
                    className={styles.input}
                    value={otpremninaOsnov}
                    onChange={(e) => setOtpremninaOsnov(e.target.value)}
                    placeholder="npr. odlaska u penziju"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Radni staž (opciono)</span>
                  <input
                    className={styles.input}
                    value={otpremninaStaz}
                    onChange={(e) => setOtpremninaStaz(e.target.value)}
                    placeholder="auto iz radnika"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Način isplate (opciono)
                  </span>
                  <input
                    className={styles.input}
                    value={otpremninaNacin}
                    onChange={(e) => setOtpremninaNacin(e.target.value)}
                    placeholder="npr. jednokratno na račun radnika"
                  />
                </div>
              </div>
              <label className={styles.checkRow} style={{ marginTop: "1rem" }}>
                <input
                  type="checkbox"
                  checked={napomenaPorez}
                  onChange={(e) => setNapomenaPorez(e.target.checked)}
                />
                Dodaj napomenu o neoporezivom iznosu (po poreznim propisima FBiH)
              </label>
            </section>
          )}

          {/* ── ODLUKA O PRAVU NA TOPLI OBROK ── */}
          {docKey === "topli-obrok" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Detalji <em>toplog obroka</em>
              </h2>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Dnevni iznos (KM)</span>
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    value={dnevniIznos}
                    onChange={(e) => setDnevniIznos(formatMoneyLive(e.target.value))}
                    onBlur={(e) => setDnevniIznos(formatMoneyBlur(e.target.value))}
                    placeholder="npr. 15,00"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Stupa na snagu (opciono)
                  </span>
                  <DateInput
                    className={styles.input}
                    value={topliDatumIso}
                    onValueChange={setTopliDatumIso}
                  />
                  <span className={styles.hint}>Prazno = danom donošenja.</span>
                </div>
              </div>
              <label className={styles.checkRow} style={{ marginTop: "1rem" }}>
                <input
                  type="checkbox"
                  checked={napomenaPorez}
                  onChange={(e) => setNapomenaPorez(e.target.checked)}
                />
                Dodaj napomenu o neoporezivom iznosu (po poreznim propisima FBiH)
              </label>
            </section>
          )}

          {/* ── BLAGAJNIČKI MAKSIMUM (akt firme) ── */}
          {docKey === "blagajnicki-maksimum" && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Detalji <em>blagajničkog maksimuma</em>
              </h2>
              <div className={styles.grid3}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Iznos maksimuma (KM)</span>
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    value={blagIznos}
                    onChange={(e) => setBlagIznos(formatMoneyLive(e.target.value))}
                    onBlur={(e) => setBlagIznos(formatMoneyBlur(e.target.value))}
                    placeholder="npr. 500,00"
                  />
                  <span className={styles.hint}>
                    Po Uredbi se utvrđuje prema prosječnim dnevnim isplatama iz
                    blagajne u prethodnom mjesecu.
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Zadužen za blagajnu (opciono)
                  </span>
                  <input
                    className={styles.input}
                    value={blagZaduzeni}
                    onChange={(e) => setBlagZaduzeni(e.target.value)}
                    placeholder="npr. Ime Prezime, blagajnik"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Primjenjuje se od (opciono)
                  </span>
                  <DateInput
                    className={styles.input}
                    value={blagDatumIso}
                    onValueChange={setBlagDatumIso}
                  />
                  <span className={styles.hint}>Prazno = danom donošenja.</span>
                </div>
              </div>
              <label className={styles.checkRow} style={{ marginTop: "1rem" }}>
                <input
                  type="checkbox"
                  checked={blagUkljOsnov}
                  onChange={(e) => setBlagUkljOsnov(e.target.checked)}
                />
                Uključi rečenicu o načinu utvrđivanja visine (prosječne dnevne
                isplate iz blagajne u prethodnom mjesecu)
              </label>
              <label className={styles.checkRow} style={{ marginTop: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={blagUkljPazar}
                  onChange={(e) => setBlagUkljPazar(e.target.checked)}
                />
                Uključi odredbu o uplati gotovine na račun (istog, najkasnije
                narednog radnog dana)
              </label>
            </section>
          )}

          {/* ── GODIŠNJI ODMOR ── */}
          {docKey === "godisnji-odmor" && (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  Detalji <em>odmora</em>
                </h2>
                <div className={styles.grid3}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Godina odmora</span>
                    <input
                      className={styles.input}
                      value={godina}
                      onChange={(e) => setGodina(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Ukupno radnih dana</span>
                    <input
                      type="number"
                      min={1}
                      className={styles.input}
                      value={ukupnoDana}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setUkupnoDana(n);
                        // Uskladi "Do" u cjelosti modu kad se promijeni broj dana.
                        if (nacin === "cjelosti" && cjelostiOdIso && n > 0)
                          setCjelostiDoIso(dodajRadneDane(cjelostiOdIso, n));
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Zakonski osnov (dana)</span>
                    <input
                      type="number"
                      min={1}
                      className={styles.input}
                      value={zakonskiOsnovDana}
                      onChange={(e) =>
                        setZakonskiOsnovDana(Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  Način <em>korištenja</em>
                </h2>
                <div
                  className={styles.field}
                  style={{ maxWidth: 320, marginBottom: "1rem" }}
                >
                  <span className={styles.fieldLabel}>Korištenje</span>
                  <StyledSelect
                    ariaLabel="Način korištenja"
                    value={nacin}
                    onChange={(v) =>
                      setNacin(v as "cjelosti" | "dva_dijela" | "period")
                    }
                    groups={[
                      {
                        options: [
                          { value: "dva_dijela", label: "U dva dijela" },
                          { value: "cjelosti", label: "U cjelosti" },
                          { value: "period", label: "U periodu (od-do)" },
                        ],
                      },
                    ]}
                  />
                </div>

                {nacin !== "dva_dijela" ? (
                  <div className={styles.grid}>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Od</span>
                      <DateInput
                        className={styles.input}
                        value={cjelostiOdIso}
                        onValueChange={(v) => {
                          setCjelostiOdIso(v);
                          if (nacin === "cjelosti" && v && Number(ukupnoDana) > 0)
                            setCjelostiDoIso(
                              dodajRadneDane(v, Number(ukupnoDana)),
                            );
                        }}
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Do</span>
                      <DateInput
                        className={styles.input}
                        value={cjelostiDoIso}
                        onValueChange={setCjelostiDoIso}
                      />
                      <span className={styles.hint}>
                        {nacin === "period"
                          ? "Broj radnih dana se računa iz odabranog raspona."
                          : "Auto-računato od datuma početka (radni dani), možete promijeniti."}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.grid3}>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Prvi dio (dana)</span>
                      <input
                        type="number"
                        min={1}
                        className={styles.input}
                        value={prviDioDana}
                        onChange={(e) => setPrviDioDana(Number(e.target.value))}
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Prvi dio: od</span>
                      <DateInput
                        className={styles.input}
                        value={prviDioOdIso}
                        onValueChange={(v) => {
                          setPrviDioOdIso(v);
                          if (v && Number(prviDioDana) > 0)
                            setPrviDioDoIso(
                              dodajRadneDane(v, Number(prviDioDana)),
                            );
                        }}
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Prvi dio: do</span>
                      <DateInput
                        className={styles.input}
                        value={prviDioDoIso}
                        onValueChange={setPrviDioDoIso}
                      />
                    </div>
                    <div className={`${styles.field} ${styles.fieldFull}`}>
                      <span className={styles.fieldLabel}>
                        Drugi dio iskoristiti do
                      </span>
                      <DateInput
                        className={styles.input}
                        value={drugiDioRokIso}
                        onValueChange={setDrugiDioRokIso}
                      />
                      <span className={styles.hint}>
                        Po zakonu najkasnije do 30.06. naredne godine (čl. 50.).
                      </span>
                    </div>
                  </div>
                )}
              </section>

              {renderObrazlozenjePouka(true)}
            </>
          )}

          {/* ── REGRES / PRIGODNA NAGRADA ── */}
          {(docKey === "regres" || docKey === "prigodna-nagrada") && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {docKey === "regres" ? (
                  <>
                    Detalji <em>regresa</em>
                  </>
                ) : (
                  <>
                    Detalji <em>nagrade</em>
                  </>
                )}
              </h2>
              <div className={styles.grid}>
                {docKey === "regres" ? (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Godina</span>
                    <input
                      className={styles.input}
                      value={godina}
                      onChange={(e) => setGodina(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Povod</span>
                    <input
                      className={styles.input}
                      value={povod}
                      onChange={(e) => setPovod(e.target.value)}
                      placeholder="npr. Kurban-bajrama, Nove godine"
                    />
                  </div>
                )}
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Iznos (KM)</span>
                  <input
                    className={styles.input}
                    inputMode="decimal"
                    value={iznos}
                    onChange={(e) => setIznos(formatMoneyLive(e.target.value))}
                    onBlur={(e) => setIznos(formatMoneyBlur(e.target.value))}
                    placeholder="npr. 400,00"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Interni akt (osnov)</span>
                  <input
                    className={styles.input}
                    value={interniAkt}
                    onChange={(e) => setInterniAkt(e.target.value)}
                    placeholder="npr. Pravilnika o radu"
                  />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Način isplate</span>
                  <input
                    className={styles.input}
                    value={isplataNacin}
                    onChange={(e) => setIsplataNacin(e.target.value)}
                    placeholder="npr. uz platu za tekući mjesec"
                  />
                </div>
                {docKey === "regres" && (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>
                      Račun radnika (opciono)
                    </span>
                    <input
                      className={styles.input}
                      value={racun}
                      onChange={(e) => setRacun(e.target.value)}
                      placeholder="transakcijski račun"
                    />
                  </div>
                )}
              </div>
              <label
                className={styles.checkRow}
                style={{ marginTop: "1rem" }}
              >
                <input
                  type="checkbox"
                  checked={napomenaPorez}
                  onChange={(e) => setNapomenaPorez(e.target.checked)}
                />
                Dodaj napomenu o neoporezivom iznosu (
                {docKey === "regres" ? "do 50%" : "do 30%"} prosj. neto FBiH)
              </label>
            </section>
          )}

          {/* ── PLAĆENO / NEPLAĆENO ODSUSTVO ── */}
          {(docKey === "placeno-odsustvo" ||
            docKey === "neplaceno-odsustvo") && (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  Detalji <em>odsustva</em>
                </h2>
                <div className={styles.grid}>
                  {docKey === "placeno-odsustvo" ? (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Razlog</span>
                      <StyledSelect
                        ariaLabel="Razlog"
                        value={odsRazlogKey}
                        onChange={(v) => setOdsRazlogKey(String(v))}
                        groups={[
                          {
                            options: PLACENO_RAZLOZI.map((r) => ({
                              value: r.value,
                              label: r.label,
                            })),
                          },
                        ]}
                      />
                      <span className={styles.hint}>
                        Plaćeno odsustvo: do 7 radnih dana godišnje (čl. 53.).
                      </span>
                    </div>
                  ) : (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Razlog</span>
                      <input
                        className={styles.input}
                        value={odsRazlogCustom}
                        onChange={(e) => setOdsRazlogCustom(e.target.value)}
                        placeholder="npr. porodične potrebe"
                      />
                    </div>
                  )}
                  {docKey === "placeno-odsustvo" &&
                    odsRazlogKey === "drugo" && (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>Upiši razlog</span>
                        <input
                          className={styles.input}
                          value={odsRazlogCustom}
                          onChange={(e) => setOdsRazlogCustom(e.target.value)}
                          placeholder="razlog odsustva"
                        />
                      </div>
                    )}
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Od</span>
                    <DateInput
                      className={styles.input}
                      value={odsOdIso}
                      onValueChange={(v) => {
                        setOdsOdIso(v);
                        recomputeOdsDana(v, odsDoIso);
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Do</span>
                    <DateInput
                      className={styles.input}
                      value={odsDoIso}
                      onValueChange={(v) => {
                        setOdsDoIso(v);
                        recomputeOdsDana(odsOdIso, v);
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>
                      {docKey === "neplaceno-odsustvo"
                        ? "Broj dana"
                        : "Broj radnih dana"}
                    </span>
                    <input
                      type="number"
                      min={1}
                      className={styles.input}
                      value={odsBrojDana}
                      onChange={(e) => setOdsBrojDana(Number(e.target.value))}
                    />
                    <span className={styles.hint}>
                      Auto-računato iz raspona, možete promijeniti.
                    </span>
                  </div>
                </div>
              </section>

              {renderObrazlozenjePouka(docKey === "placeno-odsustvo")}
            </>
          )}

          {/* Preuzimanje (bez kartice, kao kod UoD) */}
          {!canGenerate && (
            <GeneratePaywall tier="BUSINESS" what="Preuzimanje dokumenta" />
          )}
          {canGenerate && (
            <div className={styles.downloadRow}>
              <button
                type="button"
                className={styles.btnDownload}
                disabled={gen !== null}
                onClick={() => handleDownload("pdf")}
              >
                <LuFileText aria-hidden />
                {gen === "pdf" ? "Generisanje..." : "Preuzmi PDF"}
              </button>
              <button
                type="button"
                className={`${styles.btnDownload} ${styles.btnDownloadAlt}`}
                disabled={gen !== null}
                onClick={() => handleDownload("docx")}
              >
                <LuFileDown aria-hidden />
                {gen === "docx" ? "Generisanje..." : "Preuzmi Word (DOCX)"}
              </button>
            </div>
          )}
          {canGenerate && selectedWorker && (
            <p className={styles.downloadHint}>
              Dokument se sprema i u dosije radnika (Aktivni radnici).
            </p>
          )}
          {error && <div className={styles.error}>{error}</div>}

          <p
            style={{
              fontSize: 12,
              color: "var(--mid)",
              margin: "1.5rem 0 0",
              lineHeight: 1.5,
            }}
          >
            Predlošci su informativni, usklađeni sa Zakonom o radu FBiH
            („Službene novine FBiH“, br. 26/16, 89/18, 44/22 i 39/24).
            Provjerite tačnost prije potpisivanja i pečaćenja.
          </p>

          {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
          <section className={styles.section} style={{ marginTop: "1.2rem" }}>
            <h2 className={styles.sectionTitle}>
              Šta su <em>rješenja i odluke</em>?
            </h2>
            <p>
              <strong>Rješenja i odluke</strong> su kadrovski (pravni) akti
              kojima poslodavac uređuje pojedinačna prava i obaveze radnika
              tokom radnog odnosa. Donose se u pisanoj formi, na osnovu{" "}
              <em>Zakona o radu FBiH</em> („Službene novine FBiH“, br. 26/16,
              89/18, 44/22 i 39/24), kolektivnog ugovora i pravilnika o radu.
            </p>
            <p style={{ marginTop: "0.85rem" }}>
              Za razliku od ugovora o radu, koji potpisuju obje strane, rješenja
              i odluke su najčešće jednostrani akti poslodavca. Punovažni su
              potpisom i pečatom poslodavca, ali se obavezno dostavljaju radniku,
              koji na njih ima pravo prigovora.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Koje dokumente <em>možeš napraviti</em>?
            </h2>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
              <li>
                <strong>Potvrde</strong>, o zaposlenju, o visini primanja i o
                radnom stažu, te odluka o blagajničkom maksimumu.
              </li>
              <li>
                <strong>Rješenja</strong>, o godišnjem odmoru, plaćenom i
                neplaćenom odsustvu te porodiljskom odsustvu.
              </li>
              <li>
                <strong>Nagrade i isplate</strong>, odluke o regresu, prigodnoj
                nagradi, otpremnini i pravu na topli obrok.
              </li>
              <li>
                <strong>Radni odnos</strong>, odluke o promjeni plate, aneks
                ugovora, korištenje službenog vozila i upozorenje pred otkaz.
              </li>
            </ul>
            <p style={{ marginTop: "0.85rem" }}>
              Svaki dokument se preuzima u PDF ili Word (DOCX) formatu, popunjen
              podacima radnika i firme, spreman za potpis.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Najvažnije <em>zakonske odredbe</em>
            </h2>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
              <li>
                <strong>Godišnji odmor</strong>, najmanje 20 radnih dana godišnje
                (član 52), prema planu korištenja kod poslodavca.
              </li>
              <li>
                <strong>Plaćeno odsustvo</strong>, do 7 radnih dana u toku godine
                (član 53), za stupanje u brak, porođaj supruge, težu bolest ili
                smrt člana uže porodice i dobrovoljno davanje krvi.
              </li>
              <li>
                <strong>Neplaćeno odsustvo</strong>, odobrava se na zahtjev
                radnika, a za to vrijeme miruju prava i obaveze iz radnog odnosa
                (član 55).
              </li>
              <li>
                <strong>Porodiljsko odsustvo</strong>, traje do 12 mjeseci
                neprekidno, odnosno do 18 mjeseci za blizance, treće i svako
                naredno dijete (član 62).
              </li>
              <li>
                <strong>Otpremnina</strong>, kod otkaza iz poslovnih razloga,
                najmanje trećina prosječne mjesečne plate za svaku navršenu
                godinu staža kod poslodavca (član 111).
              </li>
              <li>
                <strong>Topli obrok i regres</strong>, uređuju se kolektivnim
                ugovorom ili pravilnikom o radu; topli obrok je neoporeziv do oko
                17 KM po danu (2026).
              </li>
              <li>
                <strong>Upozorenje pred otkaz</strong>, pisano upozorenje radniku
                prije otkaza zbog povrede radne obaveze ili nezadovoljavajućeg
                rada (član 96).
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Kako napraviti rješenje u <em>3 koraka</em>
            </h2>
            <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
              <li>
                <strong>Odaberite radnika</strong> iz sidebar-a, podaci firme,
                radnika, radnog mjesta i perioda auto-popunjavaju se iz profila.
                Ako radnik nije u sistemu, dodajte ga preko „+ Novi radnik“.
              </li>
              <li>
                <strong>Odaberite vrstu dokumenta</strong> (rješenje, odluka ili
                potvrda) i dopunite specifična polja, datume, iznose ili period.
              </li>
              <li>
                <strong>Preuzmite dokument</strong> u PDF ili Word (DOCX)
                formatu, spreman za potpis i pečat. Dokument se sprema i u dosije
                radnika (Aktivni radnici).
              </li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Povezani <em>alati</em>
            </h2>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
              <li>
                <a href="/ugovor-o-radu" style={{ color: "var(--sage)", fontWeight: 600 }}>
                  Ugovor o radu i otkaz
                </a>
                , zasnivanje i prestanak radnog odnosa sa auto-numeracijom.
              </li>
              <li>
                <a href="/prijave-radnika" style={{ color: "var(--sage)", fontWeight: 600 }}>
                  JS3100, prijava/odjava radnika
                </a>
                , prijava u PIO/MIO i Zavod zdravstvenog osiguranja.
              </li>
              <li>
                <a href="/prijave-radnika?tab=obracun" style={{ color: "var(--sage)", fontWeight: 600 }}>
                  Obračun plata
                </a>
                , mjesečni obračun plata, doprinosa i poreza.
              </li>
              <li>
                <a href="/aktivni-radnici" style={{ color: "var(--sage)", fontWeight: 600 }}>
                  Aktivni radnici
                </a>
                , centralni pregled radnika i dosije dokumenata.
              </li>
            </ul>
            <h2 className={styles.sectionTitle} style={{ marginTop: "2rem" }}>
              Pročitaj <em>na blogu</em>
            </h2>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
              <li>
                <a href="/vodici/topli-obrok-regres-fbih-2026" style={{ color: "var(--sage)", fontWeight: 600 }}>
                  Topli obrok i regres u FBiH
                </a>
                , neoporezivi iznosi i kako se isplaćuju.
              </li>
              <li>
                <a href="/vodici/otkaz-radnika-fbih" style={{ color: "var(--sage)", fontWeight: 600 }}>
                  Otkaz radnika u FBiH
                </a>
                , razlozi, otkazni rokovi i postupak.
              </li>
            </ul>
          </section>

          <FaqSection
            items={[
              {
                q: "Šta je rješenje o godišnjem odmoru?",
                a: "Rješenje o godišnjem odmoru je pisani akt kojim poslodavac radniku utvrđuje pravo na godišnji odmor za određenu godinu, broj radnih dana i period korištenja. Po Zakonu o radu FBiH godišnji odmor iznosi najmanje 20 radnih dana i koristi se prema planu korištenja kod poslodavca.",
              },
              {
                q: "Koliko traje plaćeno odsustvo u FBiH?",
                a: "Radnik ima pravo na plaćeno odsustvo do 7 radnih dana u toku kalendarske godine (član 53 Zakona o radu FBiH), za stupanje u brak, porođaj supruge, težu bolest ili smrt člana uže porodice i dobrovoljno davanje krvi. Kolektivnim ugovorom ili pravilnikom mogu se utvrditi i povoljniji uslovi.",
              },
              {
                q: "Kada radnik ima pravo na otpremninu?",
                a: "Pravo na otpremninu radnik ostvaruje kod otkaza iz poslovnih razloga, ako ima najmanje 2 godine neprekidnog rada kod poslodavca. Otpremnina iznosi najmanje trećinu prosječne mjesečne plate za svaku navršenu godinu staža kod tog poslodavca (član 111 Zakona o radu FBiH).",
              },
              {
                q: "Da li su rješenja i odluke punovažni bez potpisa radnika?",
                a: "Da. Rješenja i odluke su jednostrani akti poslodavca i punovažni su potpisom i pečatom poslodavca. Obavezno se dostavljaju radniku, a radnik ima pravo na pisani prigovor poslodavcu u zakonskom roku.",
              },
              {
                q: "Koja je razlika između rješenja, odluke i potvrde?",
                a: "Rješenjem se uređuje konkretno pravo radnika (npr. godišnji odmor, plaćeno ili porodiljsko odsustvo). Odlukom se utvrđuje isplata ili promjena (regres, otpremnina, prigodna nagrada, promjena plate). Potvrda je dokaz o činjenici (zaposlenje, visina primanja, radni staž).",
              },
              {
                q: "Moraju li kadrovski akti biti u pisanoj formi?",
                a: "Da. Rješenja, odluke i potvrde donose se u pisanoj formi i dostavljaju radniku. Pisani akt štiti i radnika i poslodavca i predstavlja dokaz u slučaju spora ili inspekcijskog nadzora.",
              },
            ]}
          />
        </main>
      </div>
    </div>
  );

  // Obrazloženje + pouka blok (dijele GO i odsustva).
  function renderObrazlozenjePouka(withObrazlozenje: boolean) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dodatno</h2>
        {withObrazlozenje && (
          <label
            className={styles.checkRow}
            style={{ marginBottom: "0.7rem" }}
          >
            <input
              type="checkbox"
              checked={ukljuciObrazlozenje}
              onChange={(e) => setUkljuciObrazlozenje(e.target.checked)}
            />
            Uključi obrazloženje
          </label>
        )}
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={ukljuciPouku}
            onChange={(e) => setUkljuciPouku(e.target.checked)}
          />
          Uključi pouku o pravnom lijeku (prigovor {rokPrigovora} dana)
        </label>
      </section>
    );
  }
}
