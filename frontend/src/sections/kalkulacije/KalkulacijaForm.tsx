"use client";

// Unos maloprodajne kalkulacije po uzoru na desktop knjigovodstvene programe:
// zaglavlje (dobavljač + račun), panel za unos JEDNOG artikla sa živim
// obračunom, Enter/Dodaj ubaci stavku i vrati fokus na artikal pa se roba
// kuca red za redom. Marža i MPC su dvosmjerni: upiši jedno, drugo se
// izračuna. Tab "Obračun kalkulacije" prikazuje sve kolone KCM obrasca.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconCheck,
  IconHistory,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import {
  EMPTY_PARTNER_FORM,
  PartnerFormModal,
  type PartnerFormState,
} from "src/sections/partneri/PartnerFormModal";
import { ArtikalModal } from "./ArtikalModal";
import { ArtikalCombobox } from "./ArtikalCombobox";
import { usePartners } from "src/hooks/usePartners";
import {
  useArtikli,
  useCreateKalkulacija,
  useUpdateKalkulacija,
} from "src/hooks/useKalkulacije";
import {
  getKalkulacija,
  getZadnjaStavka,
  type Artikal,
  type KalkulacijaDetail,
} from "src/api/kalkulacije";
import { getLager } from "src/api/lager";
import { ArtikalKarticaModal } from "src/sections/lager/ArtikalKarticaModal";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import {
  isoToDisplay,
  parseDateInput,
  todayFormatted,
} from "src/lib/dateInput";
import {
  computeStavka,
  marzaIzMpc,
  mpcIzMarze,
  PDV_STOPA,
} from "./obracun";
import { downloadKcmPdf } from "./kcmPdf";

const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";
// oznaka tipke u napomeni o prečicama
const kbdCls =
  "px-1.5 py-0.5 rounded border border-cream-300 bg-cream-50 text-[11px] font-medium text-text-secondary";
const thCls =
  "px-2.5 py-2 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-2.5 py-2 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;
const thNum = `${thCls} text-right`;

const kol = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 3 });
const pct = (n: number) =>
  `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const cij = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });

type Row = {
  uid: number;
  artikalId: number;
  sifra: string;
  naziv: string;
  jm: string;
  oslobodjenPdv: boolean;
  kolicina: number;
  cijena: number;
  rabatPct: number;
  zavisniTrosakPct: number;
  mpc: number;
};

export function KalkulacijaForm({
  orgId,
  initial,
  kopija = false,
}: {
  orgId: number;
  /** null = nova kalkulacija */
  initial: KalkulacijaDetail | null;
  /** initial služi samo kao predložak: sprema se NOVA kalkulacija
   *  (dobavljač i stavke se prenesu, broj računa se unosi iznova) */
  kopija?: boolean;
}) {
  const router = useRouter();
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId)),
  });
  const orgObveznik = Boolean(fullOrg?.isPdvObveznik);

  const partnersQ = usePartners(orgId);
  const artikliQ = useArtikli(orgId);
  const createM = useCreateKalkulacija(orgId);
  const updateM = useUpdateKalkulacija(orgId);

  // ── zaglavlje ──
  const [partnerId, setPartnerId] = useState<number | null>(
    initial?.partnerId ?? null,
  );
  // kopija: novi račun dobavljača, pa se broj i datumi ne prenose
  const [brojRacuna, setBrojRacuna] = useState(
    kopija ? "" : (initial?.brojRacuna ?? ""),
  );
  const [datumRacuna, setDatumRacuna] = useState(
    initial && !kopija ? isoToDisplay(initial.datumRacuna) : todayFormatted(),
  );
  const [datum, setDatum] = useState(
    initial && !kopija ? isoToDisplay(initial.datum) : todayFormatted(),
  );
  // dok datum kalkulacije nije ručno mijenjan, prati datum računa
  const [datumTouched, setDatumTouched] = useState(Boolean(initial && !kopija));
  const [bezPdv, setBezPdv] = useState(initial?.bezPdv ?? false);
  const [napomena, setNapomena] = useState(
    kopija ? "" : (initial?.napomena ?? ""),
  );
  // Redni broj: prazno znači sljedeći slobodan. Pri uređivanju se prikazuje
  // postojeći, kod kopije se ne prenosi (kopija dobija svoj broj).
  const [brojS, setBrojS] = useState(
    initial && !kopija ? String(initial.broj) : "",
  );
  const [noviPartner, setNoviPartner] = useState<PartnerFormState | null>(
    null,
  );

  // ── stavke ──
  const uidRef = useRef(1);
  const [rows, setRows] = useState<Row[]>(() =>
    (initial?.stavke ?? []).map((s) => ({
      uid: uidRef.current++,
      artikalId: s.artikalId,
      sifra: s.sifra,
      naziv: s.naziv,
      jm: s.jm,
      oslobodjenPdv: s.pdvStopa === 0,
      kolicina: s.kolicina,
      cijena: s.cijena,
      rabatPct: s.rabatPct,
      zavisniTrosakPct: s.zavisniTrosakPct,
      mpc: s.mpc,
    })),
  );

  // ── panel za unos jednog artikla ──
  const [artikalId, setArtikalId] = useState<number | null>(null);
  const [kolicinaS, setKolicinaS] = useState("");
  const [cijenaS, setCijenaS] = useState("");
  const [rabatS, setRabatS] = useState("");
  const [zavisniS, setZavisniS] = useState("");
  const [marzaS, setMarzaS] = useState("");
  const [mpcS, setMpcS] = useState("");
  // zadnje ručno uneseno od para marža/MPC: to je sidro pri preračunu
  const anchorRef = useRef<"marza" | "mpc">("mpc");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [noviArtikal, setNoviArtikal] = useState(false);
  const artikalInputRef = useRef<HTMLInputElement>(null);
  const kolicinaWrapRef = useRef<HTMLDivElement>(null);
  // Enter tok kroz polja: artikal → količina → cijena → rabat → zavisni →
  // marža → MPC → Enter doda stavku i vrati na artikal
  const cijenaWrapRef = useRef<HTMLDivElement>(null);
  const rabatWrapRef = useRef<HTMLDivElement>(null);
  const zavisniWrapRef = useRef<HTMLDivElement>(null);
  const marzaWrapRef = useRef<HTMLDivElement>(null);
  const mpcWrapRef = useRef<HTMLDivElement>(null);

  // kontrola: ukupan iznos sa fakture dobavljača (opciono polje)
  const [kontrolaS, setKontrolaS] = useState("");
  // ulazni PDV kako piše na računu (opciono, samo obveznik): pregazi
  // obračunatih 17% po stavkama; pri uređivanju se prepozna po razlici
  // između snimljenog totala i zbira stavki
  const [ulazniPdvS, setUlazniPdvS] = useState(() => {
    if (!initial || kopija) return "";
    const izracunati =
      Math.round(
        (initial.stavke ?? []).reduce((a, s) => a + s.ulazniPdvIznos, 0) * 100,
      ) / 100;
    return Math.abs(initial.ulazniPdv - izracunati) >= 0.005
      ? formatKm(initial.ulazniPdv)
      : "";
  });
  // neobveznik: unesene cijene su veleprodajne (bez PDV-a), pa se odmah
  // uvećaju za 17% jer PDV nije odbitan nego ulazi u nabavnu cijenu
  const [dodajPdvNaCijenu, setDodajPdvNaCijenu] = useState(false);
  const [pdvNaCijenuInfo, setPdvNaCijenuInfo] = useState<string | null>(null);
  // konvertuje se samo ručno ukucana cijena (ne predpopunjena/uređivana,
  // one su već sa PDV-om) i samo jednom po unosu
  const cijenaKucanaRef = useRef(false);
  const pdvNaCijenuKljuc = `pk-kalk-pdv-na-cijenu-${orgId}`;
  useEffect(() => {
    if (fullOrg && !fullOrg.isPdvObveznik) {
      setDodajPdvNaCijenu(localStorage.getItem(pdvNaCijenuKljuc) === "1");
    }
  }, [fullOrg, pdvNaCijenuKljuc]);
  function promijeniDodajPdv(v: boolean) {
    setDodajPdvNaCijenu(v);
    localStorage.setItem(pdvNaCijenuKljuc, v ? "1" : "0");
  }
  // zavisni troškovi na nivou kalkulacije (KM), raspodjela na sve stavke
  const [zavisniKmS, setZavisniKmS] = useState("");
  const [zavisniInfo, setZavisniInfo] = useState<string | null>(null);
  // kartica prometa / uređivanje izabranog artikla
  const [karticaArtikalId, setKarticaArtikalId] = useState<number | null>(null);
  const [editArtikalOpen, setEditArtikalOpen] = useState(false);
  // info o predpopuni iz zadnje stavke artikla
  const [predpopunaInfo, setPredpopunaInfo] = useState<string | null>(null);
  const predpopunaZaRef = useRef<number | null>(null);

  // inline uređivanje stavke direktno u tabeli (ne vraća se u panel)
  type RowDraft = {
    uid: number;
    kolicinaS: string;
    cijenaS: string;
    rabatS: string;
    zavisniS: string;
    marzaS: string;
    mpcS: string;
  };
  const [rowEdit, setRowEdit] = useState<RowDraft | null>(null);
  const rowAnchorRef = useRef<"marza" | "mpc">("mpc");
  const [rowError, setRowError] = useState<string | null>(null);

  const [view, setView] = useState<"unos" | "obracun">("unos");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"spremi" | "pdf" | null>(null);
  // PDF snimljenog stanja, bez spremanja: jedini izlaz za štampu kad je
  // kalkulacija zaključana (ulazni račun plaćen pa se izmjene odbijaju)
  const [samoPdf, setSamoPdf] = useState(false);

  async function preuzmiSnimljeniPdf() {
    if (!initial || kopija || !fullOrg || samoPdf) return;
    setSamoPdf(true);
    try {
      const detail = await unwrap(getKalkulacija(orgId, initial.id));
      await downloadKcmPdf(detail, fullOrg);
    } catch {
      setSaveError("Preuzimanje PDF-a nije uspjelo, pokušajte ponovo.");
    } finally {
      setSamoPdf(false);
    }
  }

  const artikli = artikliQ.data ?? [];
  const artikal = artikli.find((a) => a.id === artikalId) ?? null;
  // usluge ne ulaze u kalkulacije/lager (nemaju zalihe), nude se na fakturama
  const artikliZaIzbor = artikli.filter(
    (a) => (a.aktivan && a.tip !== "USLUGA") || a.id === artikalId,
  );

  const bezPdvRacun = !orgObveznik || bezPdv;
  const panelStopa =
    orgObveznik && !(artikal?.oslobodjenPdv ?? false) ? PDV_STOPA : 0;

  // jedinična nabavna cijena iz trenutnog unosa (za dvosmjerni marža/MPC)
  function nabavnaCijenaIz(cijenaStr: string, rabatStr: string, zavStr: string) {
    const c = parseKm(cijenaStr, 5) ?? 0;
    const r = parseKm(rabatStr) ?? 0;
    const z = parseKm(zavStr) ?? 0;
    return c * (1 - r / 100) * (1 + z / 100);
  }

  // preračun para marža/MPC kad se promijeni bilo koji ulaz
  function syncPar(next: { cijena?: string; rabat?: string; zavisni?: string }) {
    const nab = nabavnaCijenaIz(
      next.cijena ?? cijenaS,
      next.rabat ?? rabatS,
      next.zavisni ?? zavisniS,
    );
    if (anchorRef.current === "marza") {
      const m = parseKm(marzaS);
      if (m != null && nab > 0) setMpcS(formatKm(mpcIzMarze(nab, m, panelStopa)));
    } else {
      const mpc = parseKm(mpcS);
      if (mpc != null && nab > 0) {
        setMarzaS(formatKm(marzaIzMpc(nab, mpc, panelStopa)));
      }
    }
  }

  function onMarza(v: string) {
    setMarzaS(v);
    anchorRef.current = "marza";
    const m = parseKm(v);
    const nab = nabavnaCijenaIz(cijenaS, rabatS, zavisniS);
    if (m != null && nab > 0) setMpcS(formatKm(mpcIzMarze(nab, m, panelStopa)));
  }

  function onMpc(v: string) {
    setMpcS(v);
    anchorRef.current = "mpc";
    const mpc = parseKm(v);
    const nab = nabavnaCijenaIz(cijenaS, rabatS, zavisniS);
    if (mpc != null && nab > 0) {
      setMarzaS(formatKm(marzaIzMpc(nab, mpc, panelStopa)));
    }
  }

  // živi obračun panela (prikaz sa strane, kao u desktop programu)
  const panelObracun = useMemo(() => {
    const kolicina = parseKm(kolicinaS, 3) ?? 0;
    const cijena = parseKm(cijenaS, 5) ?? 0;
    const mpc = parseKm(mpcS) ?? 0;
    if (kolicina <= 0 || mpc <= 0) return null;
    return computeStavka(
      {
        kolicina,
        cijena,
        rabatPct: parseKm(rabatS) ?? 0,
        zavisniTrosakPct: parseKm(zavisniS) ?? 0,
        mpc,
      },
      {
        orgObveznik,
        bezPdvRacun,
        oslobodjenPdv: artikal?.oslobodjenPdv ?? false,
      },
    );
  }, [kolicinaS, cijenaS, rabatS, zavisniS, mpcS, orgObveznik, bezPdvRacun, artikal]);

  // obračun svih stavki + sume (isti kod kao backend snapshot)
  const obracuni = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        o: computeStavka(r, {
          orgObveznik,
          bezPdvRacun,
          oslobodjenPdv: r.oslobodjenPdv,
        }),
      })),
    [rows, orgObveznik, bezPdvRacun],
  );
  // stavke sa maržom u minusu: MPC ne pokriva nabavnu cijenu (upozorenje)
  const minusStavke = obracuni.filter((x) => x.o.marzaIznos < 0);
  const sume = useMemo(() => {
    const s = (f: (o: ReturnType<typeof computeStavka>) => number) =>
      obracuni.reduce((a, x) => a + f(x.o), 0);
    return {
      iznos: s((o) => o.iznos),
      rabat: s((o) => o.rabatIznos),
      fakturna: s((o) => o.fakturnaVrijednost),
      zavisni: s((o) => o.zavisniTrosak),
      nabavna: s((o) => o.nabavniIznos),
      ulazniPdv: s((o) => o.ulazniPdvIznos),
      bezPdvIznos: s((o) => o.vrijednostBezPdv),
      marza: s((o) => o.marzaIznos),
      pdv: s((o) => o.pdvIznos),
      maloprodajna: s((o) => o.maloprodajniIznos),
    };
  }, [obracuni]);

  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const r5 = (n: number) => Math.round((n + Number.EPSILON) * 1e5) / 1e5;

  // efektivni ulazni PDV: iznos sa računa ako je unesen, inače obračunatih
  // 17% po stavkama (razlika nastaje zaokruživanjem kod dobavljača)
  const ulazniPdvRucni =
    orgObveznik && !bezPdv && ulazniPdvS.trim() !== ""
      ? parseKm(ulazniPdvS)
      : null;
  const pdvSaRacuna = ulazniPdvRucni != null && ulazniPdvRucni >= 0;
  const efektivniUlazniPdv = pdvSaRacuna
    ? r2(ulazniPdvRucni)
    : sume.ulazniPdv;

  // kontrola: razlika između fakture dobavljača i unesenih stavki
  const kontrolaIznos = parseKm(kontrolaS);
  const kontrolaRazlika =
    kontrolaIznos != null && kontrolaIznos > 0
      ? r2(sume.fakturna + efektivniUlazniPdv - kontrolaIznos)
      : null;

  // trenutno stanje lagera po artiklu (za upozorenje o drugoj MPC)
  const lagerQ = useQuery({
    queryKey: ["lager", orgId],
    queryFn: () => unwrap(getLager(orgId)),
  });
  const lagerByArtikal = useMemo(() => {
    const m = new Map<number, { mpc: number; kolicina: number }[]>();
    for (const r of lagerQ.data?.rows ?? []) {
      if (r.kolicina <= 0) continue;
      const arr = m.get(r.artikalId) ?? [];
      arr.push({ mpc: r.mpc, kolicina: r.kolicina });
      m.set(r.artikalId, arr);
    }
    return m;
  }, [lagerQ.data]);

  // upozorenje: unesena MPC se razlikuje od MPC postojeće robe na lageru
  // (nova MPC pravi ODVOJENU lager stavku; promjena cijene ide nivelacijom)
  const lagerNapomena = useMemo(() => {
    if (!artikal) return null;
    const postoji = lagerByArtikal.get(artikal.id) ?? [];
    if (postoji.length === 0) return null;
    const mpc = parseKm(mpcS);
    if (mpc == null || mpc <= 0) return null;
    if (postoji.some((p) => Math.abs(p.mpc - mpc) < 0.005)) return null;
    const lista = postoji
      .map((p) => `${kol(p.kolicina)} ${artikal.jm} po ${formatKm(p.mpc)} KM`)
      .join(", ");
    return `Na lageru već ima: ${lista}. Nova MPC pravi odvojenu lager stavku; za promjenu cijene postojeće robe koristite nivelaciju (Lager → Nivelacije).`;
  }, [artikal, lagerByArtikal, mpcS]);

  // predpopuna panela iz zadnje stavke istog artikla (količina, cijena,
  // rabat, zavisni, MPC kao na zadnjem prometu); samo u prazan panel
  async function predpopuniIzZadnje(a: Artikal) {
    if (kolicinaS || cijenaS || mpcS) return;
    predpopunaZaRef.current = a.id;
    const r = await getZadnjaStavka(orgId, a.id);
    // korisnik je u međuvremenu promijenio izbor ili počeo kucati
    if (!r.ok || !r.data || predpopunaZaRef.current !== a.id) return;
    const s = r.data;
    setKolicinaS(formatKm(s.kolicina, 3));
    setCijenaS(formatKm(s.cijena, 5));
    cijenaKucanaRef.current = false;
    setRabatS(s.rabatPct ? formatKm(s.rabatPct) : "");
    setZavisniS(s.zavisniTrosakPct ? formatKm(s.zavisniTrosakPct) : "");
    setMpcS(formatKm(s.mpc));
    anchorRef.current = "mpc";
    const stopa = orgObveznik && !a.oslobodjenPdv ? PDV_STOPA : 0;
    const nab =
      s.cijena * (1 - s.rabatPct / 100) * (1 + s.zavisniTrosakPct / 100);
    if (nab > 0) setMarzaS(formatKm(marzaIzMpc(nab, s.mpc, stopa)));
    setPredpopunaInfo(
      `Predpopunjeno iz kalkulacije ${s.oznaka} (${isoToDisplay(String(s.datum).slice(0, 10))}); izmijenite po potrebi.`,
    );
    // Neobveznik sa opcijom "dodaj PDV na cijenu": predpopunjena cijena VEĆ
    // sadrži PDV, a ulazna faktura iskazuje cijene bez PDV-a. Ispiši rastav
    // (kao kod ručnog unosa) da se cijena može provjeriti prema fakturi.
    if (!orgObveznik && dodajPdvNaCijenu && !a.oslobodjenPdv && s.cijena > 0) {
      const bezPdv = r5(s.cijena / 1.17);
      setPdvNaCijenuInfo(
        `Cijena ${formatKm(bezPdv, 5)} + PDV 17% = ${formatKm(s.cijena, 5)} (predpopunjena cijena već sadrži PDV; iznos bez PDV-a uporedite sa fakturom).`,
      );
    }
    // predpopuna stiže NAKON što je fokus već na količini, pa upis nove
    // vrijednosti poništi označavanje. Direktan select() ovdje gubi trku sa
    // React commitom novih vrijednosti, zato tick okida useEffect koji se
    // izvršava POSLIJE commita i tada označi količinu.
    setPredpopunaTick((t) => t + 1);
  }

  // zavisni troškovi kalkulacije (KM) → jednak % na svaku stavku
  // (raspodjela proporcionalna fakturnoj vrijednosti)
  function rasporediZavisne() {
    setZavisniInfo(null);
    const km = parseKm(zavisniKmS);
    if (km == null || km <= 0) {
      return setZavisniInfo("Unesite iznos zavisnih troškova.");
    }
    if (rows.length === 0 || sume.fakturna <= 0) {
      return setZavisniInfo("Prvo dodajte stavke.");
    }
    const pct4 = Math.round((km / sume.fakturna) * 100 * 10000) / 10000;
    setRows((prev) => prev.map((r) => ({ ...r, zavisniTrosakPct: pct4 })));
    setZavisniInfo(
      `Raspoređeno ${formatBAM(km)} kao ${formatKm(pct4, 4)}% na svaku stavku (postojeći zavisni % je zamijenjen).`,
    );
  }

  function fokusNaArtikal() {
    setTimeout(() => artikalInputRef.current?.focus(), 0);
  }

  // fokus + označi postojeću vrijednost: Enter je preskače, kucanje je
  // odmah piše preko (bez ručnog označavanja)
  function fokusiraj(wrap: React.RefObject<HTMLDivElement | null>) {
    setTimeout(() => {
      const el = wrap.current?.querySelector("input");
      el?.focus();
      el?.select();
    }, 0);
  }

  function fokusNaKolicinu() {
    fokusiraj(kolicinaWrapRef);
  }

  // Re-fokus + označavanje količine POSLIJE što React commituje predpopunjene
  // vrijednosti (vidi predpopuniIzZadnje): tek tada select() hvata novi tekst.
  const [predpopunaTick, setPredpopunaTick] = useState(0);
  useEffect(() => {
    if (predpopunaTick === 0) return;
    fokusNaKolicinu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predpopunaTick]);

  // F3 skače pravo na maloprodajnu cijenu (kao u desktop programima): kad je
  // ostalo popunjeno iz predpopune, ne mora se prolaziti kroz sva polja.
  useEffect(() => {
    function naTipku(e: KeyboardEvent) {
      if (e.key !== "F3") return;
      e.preventDefault();
      fokusiraj(mpcWrapRef);
    }
    window.addEventListener("keydown", naTipku);
    return () => window.removeEventListener("keydown", naTipku);
  }, []);

  // PageDown ODMAH doda stavku, bez prolaska kroz preostala polja: za artikle
  // sa predpopunom (količina, cijena i MPC već stoje) je to jedan pritisak
  // umjesto niza Entera. Radi samo kad su sve tri vrijednosti popunjene i
  // artikal izabran; ref drži svježi closure (listener se veže jednom).
  const pageDownRef = useRef<() => boolean>(() => false);
  pageDownRef.current = () => {
    // Globalna tipka: smije raditi SAMO na tabu unosa i dok ništa drugo nije
    // otvoreno (modali artikla, kartica, inline izmjena reda), inače bi
    // pritisak tokom drugog posla ubacio neželjeni red iz napunjenog panela.
    if (
      view !== "unos" ||
      noviArtikal ||
      editArtikalOpen ||
      karticaArtikalId != null ||
      rowEdit != null
    ) {
      return false;
    }
    const k = parseKm(kolicinaS, 3);
    const c = parseKm(cijenaS, 5);
    const m = parseKm(mpcS);
    if (
      artikal &&
      k != null && k > 0 &&
      c != null && c > 0 &&
      m != null && m > 0
    ) {
      dodajStavku();
      return true;
    }
    return false;
  };
  useEffect(() => {
    function naPageDown(e: KeyboardEvent) {
      if (e.key !== "PageDown") return;
      // modifikatori su tuđe prečice (Ctrl+PageDown mijenja browser tab)
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      // preventDefault samo kad je stavka stvarno dodana: inače tipka
      // zadržava normalno ponašanje (skrolanje)
      if (pageDownRef.current()) e.preventDefault();
    }
    window.addEventListener("keydown", naPageDown);
    return () => window.removeEventListener("keydown", naPageDown);
  }, []);

  // Enter u polju: fokus na sljedeće; na MPC-u dodaje stavku
  function enterNa(
    next: React.RefObject<HTMLDivElement | null> | "dodaj",
  ): React.KeyboardEventHandler<HTMLInputElement> {
    return (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (next === "dodaj") dodajStavku();
      else fokusiraj(next);
    };
  }

  // Enter u gornjem zaglavlju: prebaci na sljedeće polje (a na kraju na unos
  // artikla). Preskače dobavljač-select (data-enterskip) i checkbox.
  function topEnter(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName !== "INPUT") return;
    if (target.closest("[data-enterskip]")) return;
    e.preventDefault();
    const inputs = Array.from(
      e.currentTarget.querySelectorAll<HTMLInputElement>(
        'input:not([type="hidden"]):not([type="checkbox"])',
      ),
    ).filter(
      (el) => !el.disabled && el.tabIndex !== -1 && !el.closest("[data-enterskip]"),
    );
    const next = inputs[inputs.indexOf(target as HTMLInputElement) + 1];
    if (next) {
      next.focus();
      next.select();
    } else {
      artikalInputRef.current?.focus();
      artikalInputRef.current?.select();
    }
  }

  function ocistiPanel() {
    setArtikalId(null);
    setKolicinaS("");
    setCijenaS("");
    setRabatS("");
    setZavisniS("");
    setMarzaS("");
    setMpcS("");
    setPanelError(null);
    setPredpopunaInfo(null);
    setPdvNaCijenuInfo(null);
    predpopunaZaRef.current = null;
    cijenaKucanaRef.current = false;
  }

  // neobveznik sa uključenom opcijom: ručno ukucana cijena je bez PDV-a,
  // vidljivo se uveća za 17% u samom polju (PDV nije odbitan pa ulazi u
  // nabavnu cijenu); vraća novi display string jer setState ne stigne
  // prije parsiranja u dodajStavku
  function primijeniPdvNaCijenu(): string | null {
    // oslobođen artikal: na njega se PDV ne plaća pa nema šta dodavati
    // (isti guard kao kod predpopuna napomene)
    if (
      orgObveznik ||
      !dodajPdvNaCijenu ||
      !cijenaKucanaRef.current ||
      artikal?.oslobodjenPdv
    ) {
      return null;
    }
    const c = parseKm(cijenaS, 5);
    if (c == null || c <= 0) return null;
    const novaS = formatKm(r5(c * 1.17), 5);
    cijenaKucanaRef.current = false;
    setCijenaS(novaS);
    syncPar({ cijena: novaS });
    setPdvNaCijenuInfo(
      `Cijena ${formatKm(c, 5)} + PDV 17% = ${novaS} (PDV za neobveznika nije odbitan pa ulazi u nabavnu cijenu).`,
    );
    return novaS;
  }

  function dodajStavku() {
    setPanelError(null);
    // ako je Enter na cijeni preskočen (klik mišem dalje), konvertuj sad
    const konvertovana = primijeniPdvNaCijenu();
    const kolicina = parseKm(kolicinaS, 3);
    const cijena = parseKm(konvertovana ?? cijenaS, 5);
    // MPC iz svježe (konvertovane) nabavne, ne iz mpcS koji je setMpcS tek
    // zakazao: kod sidra "marža" + "dodaj PDV na cijenu" mpcS je stara vrijednost
    // (stale closure) pa bi se snimila kriva marža. Za sidro "mpc" ostaje uneseni.
    const nabFinal = nabavnaCijenaIz(konvertovana ?? cijenaS, rabatS, zavisniS);
    let mpc: number | null;
    if (anchorRef.current === "marza") {
      const m = parseKm(marzaS);
      mpc = m != null && nabFinal > 0 ? mpcIzMarze(nabFinal, m, panelStopa) : parseKm(mpcS);
    } else {
      mpc = parseKm(mpcS);
    }
    if (!artikal) return setPanelError("Izaberite artikal.");
    if (kolicina == null || kolicina <= 0) {
      return setPanelError("Unesite količinu.");
    }
    if (cijena == null || cijena < 0) {
      return setPanelError("Unesite fakturnu cijenu.");
    }
    if (mpc == null || mpc <= 0) {
      return setPanelError("Unesite MPC ili maržu.");
    }
    const row: Row = {
      uid: uidRef.current++,
      artikalId: artikal.id,
      sifra: artikal.sifra,
      naziv: artikal.naziv,
      jm: artikal.jm,
      oslobodjenPdv: artikal.oslobodjenPdv,
      kolicina,
      cijena,
      rabatPct: parseKm(rabatS) ?? 0,
      zavisniTrosakPct: parseKm(zavisniS) ?? 0,
      mpc,
    };
    setRows((prev) => [...prev, row]);
    ocistiPanel();
    fokusNaArtikal();
  }

  // ── inline uređivanje reda direktno u tabeli ──
  function stopaZaRow(r: Row) {
    return orgObveznik && !r.oslobodjenPdv ? PDV_STOPA : 0;
  }

  function startRowEdit(r: Row) {
    const nab =
      r.cijena * (1 - r.rabatPct / 100) * (1 + r.zavisniTrosakPct / 100);
    setRowError(null);
    rowAnchorRef.current = "mpc";
    setRowEdit({
      uid: r.uid,
      kolicinaS: kol(r.kolicina),
      cijenaS: formatKm(r.cijena, 5),
      rabatS: r.rabatPct ? formatKm(r.rabatPct) : "",
      zavisniS: r.zavisniTrosakPct ? formatKm(r.zavisniTrosakPct) : "",
      marzaS: nab > 0 ? formatKm(marzaIzMpc(nab, r.mpc, stopaZaRow(r))) : "",
      mpcS: formatKm(r.mpc),
    });
  }

  // izmjena polja u redu: marža i MPC ostaju dvosmjerni i pri inline editu
  function rowEditChange(patch: Partial<RowDraft>, source?: "marza" | "mpc") {
    if (source) rowAnchorRef.current = source;
    setRowEdit((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const row = rows.find((r) => r.uid === prev.uid);
      if (!row) return next;
      const stopa = stopaZaRow(row);
      const nab =
        (parseKm(next.cijenaS, 5) ?? 0) *
        (1 - (parseKm(next.rabatS) ?? 0) / 100) *
        (1 + (parseKm(next.zavisniS) ?? 0) / 100);
      if (rowAnchorRef.current === "marza") {
        const m = parseKm(next.marzaS);
        if (m != null && nab > 0) {
          next.mpcS = formatKm(mpcIzMarze(nab, m, stopa));
        }
      } else {
        const mpc = parseKm(next.mpcS);
        if (mpc != null && nab > 0) {
          next.marzaS = formatKm(marzaIzMpc(nab, mpc, stopa));
        }
      }
      return next;
    });
  }

  function saveRowEdit() {
    if (!rowEdit) return;
    setRowError(null);
    const kolicina = parseKm(rowEdit.kolicinaS, 3);
    const cijena = parseKm(rowEdit.cijenaS, 5);
    const mpc = parseKm(rowEdit.mpcS);
    if (kolicina == null || kolicina <= 0) {
      return setRowError("Unesite ispravnu količinu.");
    }
    if (cijena == null || cijena < 0) {
      return setRowError("Unesite ispravnu cijenu.");
    }
    if (mpc == null || mpc <= 0) return setRowError("Unesite ispravan MPC.");
    setRows((prev) =>
      prev.map((r) =>
        r.uid === rowEdit.uid
          ? {
              ...r,
              kolicina,
              cijena,
              rabatPct: parseKm(rowEdit.rabatS) ?? 0,
              zavisniTrosakPct: parseKm(rowEdit.zavisniS) ?? 0,
              mpc,
            }
          : r,
      ),
    );
    setRowEdit(null);
  }

  async function spremi(preuzmiPdf: boolean) {
    setSaveError(null);
    const datumIso = parseDateInput(datum);
    const datumRacunaIso = parseDateInput(datumRacuna);
    if (partnerId == null) return setSaveError("Izaberite dobavljača.");
    if (!brojRacuna.trim()) {
      return setSaveError("Unesite broj računa dobavljača.");
    }
    if (!datumRacunaIso) return setSaveError("Unesite ispravan datum računa.");
    if (!datumIso) return setSaveError("Unesite ispravan datum kalkulacije.");
    if (rows.length === 0) {
      return setSaveError("Dodajte bar jednu stavku.");
    }
    if (orgObveznik && !bezPdv && ulazniPdvS.trim() !== "") {
      const v = parseKm(ulazniPdvS);
      if (v == null || v < 0) {
        return setSaveError("Unesite ispravan ulazni PDV sa računa.");
      }
      // PDV je 17% neto; dozvoli blagi rastez (do 25%) za zaokruživanje, ali
      // uhvati greške reda veličine (upisan neto ili bruto umjesto PDV-a)
      if (v > sume.fakturna * 0.25 + 0.005) {
        return setSaveError(
          "Ulazni PDV sa računa djeluje previsoko (PDV je 17% fakturne vrijednosti); provjerite iznos.",
        );
      }
    }
    setSaving(preuzmiPdf ? "pdf" : "spremi");
    try {
      const payload = {
        datum: datumIso,
        partnerId,
        brojRacuna: brojRacuna.trim(),
        datumRacuna: datumRacunaIso,
        bezPdv,
        napomena: napomena.trim(),
        broj: brojS.trim() ? Number(brojS.trim()) : undefined,
        ulazniPdv: pdvSaRacuna ? efektivniUlazniPdv : undefined,
        stavke: rows.map((r) => ({
          artikalId: r.artikalId,
          kolicina: r.kolicina,
          cijena: r.cijena,
          rabatPct: r.rabatPct,
          zavisniTrosakPct: r.zavisniTrosakPct,
          mpc: r.mpc,
        })),
      };
      const saved =
        initial && !kopija
          ? await updateM.mutateAsync({ id: initial.id, payload })
          : await createM.mutateAsync(payload);
      if (preuzmiPdf && fullOrg) {
        const detail = await unwrap(getKalkulacija(orgId, saved.id));
        await downloadKcmPdf(detail, fullOrg);
      }
      router.push("/app/kalkulacije");
    } catch (e) {
      const kod = e instanceof Error ? e.message : "";
      setSaveError(
        kod === "RACUN_PLACEN"
          ? "Ulazni račun ove kalkulacije je već plaćen (vezan za izvod ili zatvoren vezom na kartici dobavljača), pa se kalkulacija ne može mijenjati. Prvo otvorite vezu na kartici dobavljača (Partneri)."
          : kod === "BROJ_ZAUZET"
            ? `Broj ${brojS.trim()} već koristi druga kalkulacija u ${datumIso.slice(0, 4)}. godini. Upišite drugi broj, ili prvo promijenite broj (odnosno obrišite) tu kalkulaciju.`
            : kod === "BROJ_INVALID"
              ? "Redni broj mora biti cijeli broj od 1 do 999999."
              : "Greška pri spremanju, pokušajte ponovo.",
      );
    } finally {
      setSaving(null);
    }
  }

  const partnerOptions = [
    { value: "", label: "Izaberi dobavljača" },
    ...(partnersQ.data ?? []).map((p) => ({
      value: String(p.id),
      label: p.name,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* ── zaglavlje ── */}
      <div
        className="rounded-xl border border-cream-300 bg-cream-100 p-4"
        onKeyDown={topEnter}
      >
        {/* items-end: labele različite visine (neke se lome u dva reda) ne
            smiju razbiti poravnanje polja */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="col-span-2" data-enterskip>
            <label className={labelCls}>Dobavljač</label>
            <div className="flex items-center gap-2">
              <PkSelect
                ariaLabel="Dobavljač"
                value={partnerId != null ? String(partnerId) : ""}
                onChange={(v) => setPartnerId(v ? Number(v) : null)}
                searchable
                placeholder="Izaberi dobavljača"
                options={partnerOptions}
                wrapStyle={{ flex: 1, minWidth: 0 }}
              />
              <button
                type="button"
                onClick={() => setNoviPartner({ ...EMPTY_PARTNER_FORM })}
                className="shrink-0 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors whitespace-nowrap"
              >
                + Novi
              </button>
            </div>
          </div>
          {/* broj kalkulacije je najviše 4 cifre, pa dijeli kolonu sa brojem
              računa dobavljača umjesto da zauzima cijelu */}
          <div className="col-span-2 grid grid-cols-[92px_minmax(0,1fr)] gap-3">
            <div>
              <label
                className={labelCls}
                title="Redni broj kalkulacije u godini. Ostavite prazno za sljedeći slobodan, ili upišite svoj broj (npr. nastavak numeracije iz starog programa)."
              >
                Broj
              </label>
              <input
                value={brojS}
                onChange={(e) => setBrojS(e.target.value.replace(/\D+/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="auto"
                title="Redni broj kalkulacije u godini; prazno = sljedeći slobodan"
                className={`${inputCls} text-center tabular-nums`}
              />
            </div>
            <div>
              <label className={labelCls}>Broj računa dobavljača</label>
              <input
                value={brojRacuna}
                onChange={(e) => setBrojRacuna(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Datum računa</label>
            <PkDateInput
              value={datumRacuna}
              onChange={(v) => {
                setDatumRacuna(v);
                if (!datumTouched) setDatum(v);
              }}
              selectOnFocus
              ariaLabel="Datum računa"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Datum kalkulacije</label>
            <PkDateInput
              value={datum}
              onChange={(v) => {
                setDatum(v);
                setDatumTouched(true);
              }}
              selectOnFocus
              ariaLabel="Datum kalkulacije"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div>
            <label
              className={labelCls}
              title="Opciono: ukupan iznos sa fakture dobavljača. Dok kucate stavke, forma javlja razliku prema unesenom, pa se odmah vidi da li je faktura prekucana tačno."
            >
              Iznos računa (kontrola)
            </label>
            <PkAmountInput
              value={kontrolaS}
              onChange={setKontrolaS}
              ariaLabel="Kontrolni iznos računa"
              className="bg-cream-50"
              placeholder="opciono"
            />
          </div>
          <div className="col-span-2 lg:col-span-3">
            <label className={labelCls}>Napomena (opciono)</label>
            <input
              value={napomena}
              onChange={(e) => setNapomena(e.target.value)}
              className={inputCls}
            />
          </div>
          {orgObveznik && (
            <div>
              <label
                className={labelCls}
                title="Opciono: odbitni PDV kako piše na računu dobavljača. Ako se zbog zaokruživanja razlikuje od obračunatih 17%, u KUF i iznos računa ide ovaj iznos. Prazno: obračunatih 17%."
              >
                Ulazni PDV sa računa
              </label>
              <PkAmountInput
                value={ulazniPdvS}
                onChange={setUlazniPdvS}
                ariaLabel="Ulazni PDV sa računa"
                className="bg-cream-50"
                placeholder="Ulazni PDV"
                disabled={bezPdv}
              />
            </div>
          )}
          {orgObveznik && (
            <div className="col-span-2 lg:col-span-2 flex items-end pb-2">
              <label className="flex items-center gap-2 text-[12.5px] text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={bezPdv}
                  onChange={(e) => setBezPdv(e.target.checked)}
                  className="accent-brand-600"
                />
                Račun bez PDV-a (dobavljač nije u PDV-u)
              </label>
            </div>
          )}
          {!orgObveznik && (
            <div className="col-span-2 lg:col-span-3 flex items-end">
              <label
                className="flex items-start gap-2 text-[12.5px] text-text-primary cursor-pointer"
                title="Obrt nije u PDV sistemu, pa ulazni PDV nije odbitan nego je dio nabavne cijene. Uz ovu opciju kucate veleprodajne cijene direktno sa računa, bez ručnog množenja sa 1,17."
              >
                <input
                  type="checkbox"
                  checked={dodajPdvNaCijenu}
                  onChange={(e) => promijeniDodajPdv(e.target.checked)}
                  className="accent-brand-600 mt-0.5"
                />
                <span>
                  Automatski dodaj PDV na cijenu (x 1,17)
                  <span className="block text-[11px] leading-4 text-text-tertiary font-normal">
                    Za račune sa veleprodajnim cijenama (bez PDV-a): unesena
                    cijena se odmah uveća za 17%, jer PDV za neobveznika nije
                    odbitan nego ulazi u nabavnu cijenu.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ── kontrolne sume: iznos računa se poredi sa računom dobavljača ── */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 flex flex-wrap items-end gap-x-8 gap-y-2">
        <SumaItem label="Fakturna vrijednost" value={sume.fakturna} />
        {orgObveznik && !bezPdv && (
          <SumaItem
            label={pdvSaRacuna ? "Ulazni PDV (sa računa)" : "Ulazni PDV"}
            value={efektivniUlazniPdv}
          />
        )}
        <SumaItem
          label="Ukupan iznos računa"
          value={sume.fakturna + efektivniUlazniPdv}
          highlight
        />
        {kontrolaRazlika != null && (
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
              Kontrola računa
            </div>
            <div
              className={[
                "text-[14px] tabular-nums font-semibold",
                Math.abs(kontrolaRazlika) < 0.005
                  ? "text-success"
                  : "text-accent-500",
              ].join(" ")}
            >
              {Math.abs(kontrolaRazlika) < 0.005
                ? "slaže se (0,00)"
                : `razlika ${formatBAM(kontrolaRazlika)}`}
            </div>
          </div>
        )}
        <SumaItem label="Nabavna vrijednost" value={sume.nabavna} />
        {orgObveznik && (
          <SumaItem label="Ukalkulisani PDV" value={sume.pdv} />
        )}
        <SumaItem label="Maloprodajna vrijednost" value={sume.maloprodajna} bold />
        {/* zavisni troškovi sa posebne fakture: raspodjela na sve stavke */}
        <div className="ml-auto flex items-end gap-2">
          <div className="w-[130px]">
            <label
              className={labelCls}
              title="Prevoz, špedicija i sl. (npr. sa posebne fakture): iznos se rasporedi na SVE stavke proporcionalno fakturnoj vrijednosti, kao jednak zavisni %"
            >
              Zavisni troškovi (KM)
            </label>
            <PkAmountInput
              value={zavisniKmS}
              onChange={setZavisniKmS}
              ariaLabel="Zavisni troškovi kalkulacije"
              className="bg-cream-50"
              placeholder="0,00"
            />
          </div>
          <button
            type="button"
            onClick={rasporediZavisne}
            className="px-3 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors whitespace-nowrap"
          >
            Rasporedi
          </button>
        </div>
        {zavisniInfo && (
          <p className="w-full text-[12px] text-text-tertiary">{zavisniInfo}</p>
        )}
      </div>

      {/* ── pod-tabovi: unos / obračun ── */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100">
        {(
          [
            ["unos", "Unos stavki"],
            ["obracun", "Obračun kalkulacije"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={[
              "px-4 py-1.5 text-[12.5px] font-medium rounded-full transition-colors",
              view === id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "unos" && (
        <>
          {/* ── panel za unos artikla ── */}
          <div className="rounded-xl border border-cream-300 bg-cream-100 p-4">
            <p className="text-[12px] text-text-tertiary mb-3">
              <strong className="text-text-secondary">Tipkovnica:</strong>{" "}
              <kbd className={kbdCls}>Enter</kbd> prebacuje na sljedeće polje
              (artikal, količina, cijena, rabat, zavisni, marža, MPC), a na
              polju MPC dodaje stavku i vraća vas na artikal.{" "}
              <kbd className={kbdCls}>F3</kbd> skače pravo na maloprodajnu
              cijenu. <kbd className={kbdCls}>PageDown</kbd> odmah dodaje
              stavku kad su količina, cijena i MPC popunjeni (predpopunjeni
              artikli: jedan pritisak umjesto niza Entera).
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-9 gap-3 items-end">
              <div className="col-span-2 lg:col-span-3">
                <label className={labelCls}>Artikal</label>
                <div className="flex items-center gap-2">
                  <ArtikalCombobox
                    artikli={artikliZaIzbor}
                    value={artikal}
                    onSelect={(a) => {
                      setArtikalId(a?.id ?? null);
                      setPredpopunaInfo(null);
                      setPdvNaCijenuInfo(null);
                      predpopunaZaRef.current = null;
                      if (a) void predpopuniIzZadnje(a);
                    }}
                    onPicked={fokusNaKolicinu}
                    inputRef={artikalInputRef}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setKarticaArtikalId(artikal?.id ?? null)}
                    disabled={!artikal}
                    title="Kartica artikla: promet (ulazi, popisi) i stanje"
                    className="shrink-0 p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-brand-600 hover:border-brand-600/50 transition-colors disabled:opacity-40"
                  >
                    <IconHistory size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditArtikalOpen(true)}
                    disabled={!artikal}
                    title="Uredi artikal (naziv, J/M, barkod...)"
                    className="shrink-0 p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-brand-600 hover:border-brand-600/50 transition-colors disabled:opacity-40"
                  >
                    <IconPencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoviArtikal(true)}
                    className="shrink-0 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors whitespace-nowrap"
                  >
                    + Novi
                  </button>
                </div>
              </div>
              <div
                ref={kolicinaWrapRef}
                onFocusCapture={(e) => {
                  // označi sve pri svakom ulasku u polje (kao kod cijene):
                  // setTimeout da select prođe POSLIJE internih focus handlera
                  // i predpopune koja zna stići poslije fokusa
                  const t = e.target as HTMLInputElement;
                  if (t && typeof t.select === "function") {
                    setTimeout(() => t.select(), 0);
                  }
                }}
              >
                <label className={labelCls}>Količina</label>
                <PkAmountInput
                  value={kolicinaS}
                  onChange={setKolicinaS}
                  decimals={3}
                  placeholder="0"
                  ariaLabel="Količina"
                  className="bg-cream-50"
                  onKeyDown={enterNa(cijenaWrapRef)}
                />
              </div>
              <div
                ref={cijenaWrapRef}
                onFocusCapture={(e) => {
                  // isto kao količina: ulazak u polje označi vrijednost
                  const t = e.target as HTMLInputElement;
                  if (t && typeof t.select === "function") {
                    setTimeout(() => t.select(), 0);
                  }
                }}
              >
                <label className={labelCls}>Cijena</label>
                <PkAmountInput
                  value={cijenaS}
                  onChange={(v) => {
                    cijenaKucanaRef.current = true;
                    setCijenaS(v);
                    syncPar({ cijena: v });
                  }}
                  decimals={5}
                  ariaLabel="Fakturna cijena"
                  className="bg-cream-50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") primijeniPdvNaCijenu();
                    enterNa(rabatWrapRef)(e);
                  }}
                  title={
                    orgObveznik
                      ? "Fakturna cijena bez PDV-a"
                      : dodajPdvNaCijenu
                        ? "Unesite cijenu bez PDV-a: automatski se uveća za 17%"
                        : "Fakturna cijena (sa PDV-om ako ga račun ima)"
                  }
                />
              </div>
              <div ref={rabatWrapRef}>
                <label className={labelCls}>Rabat %</label>
                <PkAmountInput
                  value={rabatS}
                  onChange={(v) => {
                    setRabatS(v);
                    syncPar({ rabat: v });
                  }}
                  placeholder="0"
                  ariaLabel="Rabat"
                  className="bg-cream-50"
                  onKeyDown={enterNa(zavisniWrapRef)}
                />
              </div>
              <div ref={zavisniWrapRef}>
                <label className={labelCls}>Zav. trošak %</label>
                <PkAmountInput
                  value={zavisniS}
                  onChange={(v) => {
                    setZavisniS(v);
                    syncPar({ zavisni: v });
                  }}
                  placeholder="0"
                  ariaLabel="Zavisni trošak"
                  className="bg-cream-50"
                  onKeyDown={enterNa(marzaWrapRef)}
                  title="Prevoz, carina i sl., % na fakturnu vrijednost stavke"
                />
              </div>
              <div ref={marzaWrapRef}>
                <label className={labelCls}>Marža %</label>
                <PkAmountInput
                  value={marzaS}
                  onChange={onMarza}
                  placeholder="0"
                  ariaLabel="Marža"
                  className="bg-cream-50"
                  onKeyDown={enterNa(mpcWrapRef)}
                />
              </div>
              <div ref={mpcWrapRef}>
                <label className={labelCls}>MPC</label>
                <PkAmountInput
                  value={mpcS}
                  onChange={onMpc}
                  ariaLabel="Maloprodajna cijena"
                  className="bg-cream-50 font-medium"
                  onKeyDown={enterNa("dodaj")}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3">
              <p className="text-[11.5px] text-text-tertiary">
                {panelObracun ? (
                  <>
                    Nabavna cijena {cij(panelObracun.nabavnaCijena)} · nabavni
                    iznos {formatBAM(panelObracun.nabavniIznos)}
                    {panelStopa > 0 &&
                      ` · PDV u MPC ${formatBAM(panelObracun.pdvIznos)}`}{" "}
                    · maloprodajni iznos{" "}
                    <strong className="text-text-primary">
                      {formatBAM(panelObracun.maloprodajniIznos)}
                    </strong>
                  </>
                ) : (
                  "Unesite količinu, cijenu i MPC ili maržu; obračun se prikazuje odmah."
                )}
              </p>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={dodajStavku}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity"
                >
                  <IconPlus size={14} />
                  Dodaj stavku
                </button>
              </div>
            </div>
            {panelError && (
              <p className="text-[12.5px] text-accent-500 mt-2">{panelError}</p>
            )}
            {predpopunaInfo && (
              <p className="text-[12px] text-brand-700 mt-2">
                {predpopunaInfo}
              </p>
            )}
            {pdvNaCijenuInfo && (
              <p className="text-[12px] text-brand-700 mt-2">
                {pdvNaCijenuInfo}
              </p>
            )}
            {lagerNapomena && (
              <p className="rounded-lg bg-warning-bg text-warning text-[12px] leading-5 px-3 py-2 mt-2">
                {lagerNapomena}
              </p>
            )}
            {panelObracun && panelObracun.marzaIznos < 0 && (
              <p className="rounded-lg bg-warning-bg text-warning text-[12px] leading-5 px-3 py-2 mt-2 flex items-start gap-2">
                <IconAlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Marža je u minusu ({pct(panelObracun.marzaPct)})</strong>
                  : MPC ne pokriva nabavnu cijenu ({cij(panelObracun.nabavnaCijena)}
                  {panelStopa > 0 ? " bez PDV-a" : ""}), prodaja bi bila ispod
                  nabavke. Provjerite cijenu, rabat ili MPC.
                </span>
              </p>
            )}
          </div>

          {/* ── unesene stavke (kompaktno) ── */}
          <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-300">
                  <th className={thCls}>R.br</th>
                  <th className={thCls}>Šifra</th>
                  <th className={thCls}>Artikal</th>
                  <th className={thNum}>Količina</th>
                  <th className={thNum}>Cijena</th>
                  <th className={thNum}>Rabat %</th>
                  <th className={thNum}>Zav. trošak %</th>
                  <th className={thNum}>Marža %</th>
                  <th className={thNum}>MPC</th>
                  <th className={thNum}>Malopr. iznos</th>
                  <th className={`${thCls} text-right`}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {obracuni.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-[13px] text-text-tertiary"
                      colSpan={11}
                    >
                      Još nema stavki. Unesite prvi artikal iznad; Enter ili
                      &quot;Dodaj stavku&quot; ga knjiži i vraća vas na sljedeći
                      unos.
                    </td>
                  </tr>
                )}
                {obracuni.map(({ row, o }, i) => {
                  const editing = rowEdit?.uid === row.uid;
                  if (editing && rowEdit) {
                    // živi obračun iz drafta (marža % i maloprodajni iznos)
                    const draft = {
                      ...row,
                      kolicina: parseKm(rowEdit.kolicinaS, 3) ?? 0,
                      cijena: parseKm(rowEdit.cijenaS, 5) ?? 0,
                      rabatPct: parseKm(rowEdit.rabatS) ?? 0,
                      zavisniTrosakPct: parseKm(rowEdit.zavisniS) ?? 0,
                      mpc: parseKm(rowEdit.mpcS) ?? 0,
                    };
                    const od = computeStavka(draft, {
                      orgObveznik,
                      bezPdvRacun,
                      oslobodjenPdv: row.oslobodjenPdv,
                    });
                    const cell = "px-2.5 py-1.5";
                    return (
                      <tr
                        key={row.uid}
                        className="border-b border-cream-300 last:border-b-0 bg-brand-100/40"
                      >
                        <td className={tdNum}>{i + 1}.</td>
                        <td className={`${tdCls} tabular-nums`}>{row.sifra}</td>
                        <td className={tdCls}>{row.naziv}</td>
                        <td className={cell}>
                          <div className="w-24 ml-auto">
                            <PkAmountInput
                              value={rowEdit.kolicinaS}
                              onChange={(v) => rowEditChange({ kolicinaS: v })}
                              decimals={3}
                              ariaLabel="Količina stavke"
                              className="text-right"
                            />
                          </div>
                        </td>
                        <td className={cell}>
                          <div className="w-24 ml-auto">
                            <PkAmountInput
                              value={rowEdit.cijenaS}
                              onChange={(v) => rowEditChange({ cijenaS: v })}
                              decimals={5}
                              ariaLabel="Cijena stavke"
                              className="text-right"
                            />
                          </div>
                        </td>
                        <td className={cell}>
                          <div className="w-20 ml-auto">
                            <PkAmountInput
                              value={rowEdit.rabatS}
                              onChange={(v) => rowEditChange({ rabatS: v })}
                              placeholder="0"
                              ariaLabel="Rabat stavke"
                              className="text-right"
                            />
                          </div>
                        </td>
                        <td className={cell}>
                          <div className="w-20 ml-auto">
                            <PkAmountInput
                              value={rowEdit.zavisniS}
                              onChange={(v) => rowEditChange({ zavisniS: v })}
                              placeholder="0"
                              ariaLabel="Zavisni trošak stavke"
                              className="text-right"
                            />
                          </div>
                        </td>
                        <td className={cell}>
                          <div className="w-20 ml-auto">
                            <PkAmountInput
                              value={rowEdit.marzaS}
                              onChange={(v) =>
                                rowEditChange({ marzaS: v }, "marza")
                              }
                              placeholder="0"
                              ariaLabel="Marža stavke"
                              className="text-right"
                            />
                          </div>
                        </td>
                        <td className={cell}>
                          <div className="w-24 ml-auto">
                            <PkAmountInput
                              value={rowEdit.mpcS}
                              onChange={(v) =>
                                rowEditChange({ mpcS: v }, "mpc")
                              }
                              ariaLabel="MPC stavke"
                              className="text-right font-medium"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  saveRowEdit();
                                }
                              }}
                            />
                          </div>
                        </td>
                        <td className={tdNum}>
                          {formatBAM(od.maloprodajniIznos)}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <button
                            type="button"
                            onClick={saveRowEdit}
                            className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors"
                            title="Sačuvaj izmjenu"
                          >
                            <IconCheck size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRowEdit(null);
                              setRowError(null);
                            }}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                            title="Otkaži"
                          >
                            <IconX size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={row.uid}
                      className="border-b border-cream-300 last:border-b-0"
                    >
                      <td className={tdNum}>{i + 1}.</td>
                      <td className={`${tdCls} tabular-nums`}>{row.sifra}</td>
                      <td className={tdCls}>{row.naziv}</td>
                      <td className={tdNum}>{kol(row.kolicina)}</td>
                      <td className={tdNum}>{cij(row.cijena)}</td>
                      <td className={tdNum}>{pct(row.rabatPct)}</td>
                      <td className={tdNum}>{pct(row.zavisniTrosakPct)}</td>
                      <td
                        className={`${tdNum} ${o.marzaIznos < 0 ? "text-accent-500 font-semibold" : ""}`}
                        title={
                          o.marzaIznos < 0
                            ? "Marža u minusu: MPC ne pokriva nabavnu cijenu"
                            : undefined
                        }
                      >
                        {o.marzaIznos < 0 && (
                          <IconAlertTriangle
                            size={13}
                            className="inline -mt-0.5 mr-1"
                            aria-hidden
                          />
                        )}
                        {pct(o.marzaPct)}
                      </td>
                      <td className={`${tdNum} font-medium`}>
                        {formatKm(row.mpc)}
                      </td>
                      <td className={tdNum}>
                        {formatBAM(o.maloprodajniIznos)}
                      </td>
                      <td className={`${tdCls} text-right`}>
                        <button
                          type="button"
                          onClick={() => startRowEdit(row)}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                          title="Uredi u redu"
                        >
                          <IconPencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRows((prev) =>
                              prev.filter((r) => r.uid !== row.uid),
                            );
                            if (rowEdit?.uid === row.uid) setRowEdit(null);
                          }}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
                          title="Obriši"
                        >
                          <IconTrash size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {minusStavke.length > 0 && (
              <div className="m-3 rounded-lg bg-warning-bg text-warning text-[12.5px] leading-5 px-3 py-2.5 flex items-start gap-2">
                <IconAlertTriangle size={17} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Marža u minusu</strong> (prodaja ispod nabavne
                  cijene) kod:{" "}
                  {minusStavke
                    .map(
                      ({ row, o }) =>
                        `${row.sifra} ${row.naziv} (${pct(o.marzaPct)})`,
                    )
                    .join(", ")}
                  . Provjerite cijenu, rabat ili MPC prije spremanja.
                </span>
              </div>
            )}
            {rowError && (
              <p className="text-[12.5px] text-accent-500 px-3 py-2">
                {rowError}
              </p>
            )}
          </div>
        </>
      )}

      {view === "obracun" && (
        <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-300">
                <th className={thCls}>R.br</th>
                <th className={thCls}>Šifra</th>
                <th className={thCls}>Artikal</th>
                <th className={thCls}>J/M</th>
                <th className={thNum}>Količina</th>
                <th className={thNum}>Cijena</th>
                <th className={thNum}>Iznos</th>
                <th className={thNum}>Rabat</th>
                <th className={thNum}>Fakt. vrijednost</th>
                <th className={thNum}>Zavisni trošak</th>
                <th className={thNum}>Nabavni iznos</th>
                <th className={thNum}>Nab. cijena</th>
                <th className={thNum}>Marža %</th>
                <th className={thNum}>Marža</th>
                <th className={thNum}>Bez PDV-a</th>
                <th className={thNum}>PDV</th>
                <th className={thNum}>MPC</th>
                <th className={thNum}>Malopr. iznos</th>
              </tr>
            </thead>
            <tbody>
              {obracuni.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-[13px] text-text-tertiary"
                    colSpan={18}
                  >
                    Još nema stavki za obračun.
                  </td>
                </tr>
              )}
              {obracuni.map(({ row, o }, i) => (
                <tr
                  key={row.uid}
                  className="border-b border-cream-300 last:border-b-0"
                >
                  <td className={tdNum}>{i + 1}.</td>
                  <td className={`${tdCls} tabular-nums`}>{row.sifra}</td>
                  <td className={tdCls}>{row.naziv}</td>
                  <td className={tdCls}>{row.jm}</td>
                  <td className={tdNum}>{kol(row.kolicina)}</td>
                  <td className={tdNum}>{cij(row.cijena)}</td>
                  <td className={tdNum}>{formatKm(o.iznos)}</td>
                  <td className={tdNum}>{formatKm(o.rabatIznos)}</td>
                  <td className={tdNum}>{formatKm(o.fakturnaVrijednost)}</td>
                  <td className={tdNum}>{formatKm(o.zavisniTrosak)}</td>
                  <td className={tdNum}>{formatKm(o.nabavniIznos)}</td>
                  <td className={tdNum}>{cij(o.nabavnaCijena)}</td>
                  <td
                    className={`${tdNum} ${o.marzaIznos < 0 ? "text-accent-500 font-semibold" : ""}`}
                    title={
                      o.marzaIznos < 0
                        ? "Marža u minusu: MPC ne pokriva nabavnu cijenu"
                        : undefined
                    }
                  >
                    {o.marzaIznos < 0 && (
                      <IconAlertTriangle
                        size={13}
                        className="inline -mt-0.5 mr-1"
                        aria-hidden
                      />
                    )}
                    {pct(o.marzaPct)}
                  </td>
                  <td
                    className={`${tdNum} ${o.marzaIznos < 0 ? "text-accent-500 font-semibold" : ""}`}
                  >
                    {formatKm(o.marzaIznos)}
                  </td>
                  <td className={tdNum}>{formatKm(o.vrijednostBezPdv)}</td>
                  <td className={tdNum}>{formatKm(o.pdvIznos)}</td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(row.mpc)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(o.maloprodajniIznos)}
                  </td>
                </tr>
              ))}
            </tbody>
            {obracuni.length > 0 && (
              <tfoot>
                <tr className="border-t border-cream-300 bg-cream-50">
                  <td className={`${tdCls} font-medium`} colSpan={6}>
                    Ukupno
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.iznos)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.rabat)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.fakturna)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.zavisni)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.nabavna)}
                  </td>
                  <td className={tdNum} />
                  <td className={tdNum} />
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.marza)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.bezPdvIznos)}
                  </td>
                  <td className={`${tdNum} font-medium`}>
                    {formatKm(sume.pdv)}
                  </td>
                  <td className={tdNum} />
                  <td className={`${tdNum} font-semibold`}>
                    {formatKm(sume.maloprodajna)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {saveError && (
        <p className="text-[12.5px] text-accent-500">{saveError}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <Link
          href="/app/kalkulacije"
          className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
        >
          Odustani
        </Link>
        {initial && !kopija && (
          <button
            type="button"
            disabled={samoPdf}
            onClick={() => void preuzmiSnimljeniPdf()}
            title="PDF snimljenog stanja, bez spremanja izmjena (radi i kad je kalkulacija zaključana jer je račun plaćen)"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            {samoPdf && <IconLoader2 size={15} className="animate-spin" />}
            Preuzmi PDF
          </button>
        )}
        <button
          type="button"
          disabled={saving != null}
          onClick={() => spremi(false)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
        >
          {saving === "spremi" && (
            <IconLoader2 size={15} className="animate-spin" />
          )}
          Spremi
        </button>
        <button
          type="button"
          disabled={saving != null}
          onClick={() => spremi(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving === "pdf" && (
            <IconLoader2 size={15} className="animate-spin" />
          )}
          Spremi i preuzmi PDF
        </button>
      </div>

      <PartnerFormModal
        orgId={orgId}
        initial={noviPartner}
        onClose={() => setNoviPartner(null)}
        onSaved={(p) => setPartnerId(p.id)}
      />
      <ArtikalModal
        open={noviArtikal}
        orgId={orgId}
        artikal={null}
        onClose={() => setNoviArtikal(false)}
        onSaved={(a) => {
          setArtikalId(a.id);
          fokusNaKolicinu();
        }}
      />
      {/* uređivanje izabranog artikla direktno iz unosa */}
      <ArtikalModal
        open={editArtikalOpen && artikal != null}
        orgId={orgId}
        artikal={artikal}
        onClose={() => setEditArtikalOpen(false)}
        onSaved={() => setEditArtikalOpen(false)}
      />
      {/* kartica prometa artikla (ista kao na lageru) */}
      <ArtikalKarticaModal
        orgId={orgId}
        artikalId={karticaArtikalId}
        onClose={() => setKarticaArtikalId(null)}
      />
    </div>
  );
}

function SumaItem({
  label,
  value,
  highlight,
  bold,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </div>
      <div
        className={[
          "text-[14px] tabular-nums",
          highlight ? "text-brand-700 font-semibold" : "text-text-primary",
          bold ? "font-semibold" : "",
        ].join(" ")}
      >
        {formatBAM(value)}
      </div>
    </div>
  );
}
