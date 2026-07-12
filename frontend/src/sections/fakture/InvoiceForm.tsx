"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./fakture.module.css";
import Modal from "src/components/Modal/Modal";
import { useRole } from "src/hooks/useRole";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import DateInput from "src/components/DateInput/DateInput";
import CitySelect from "src/components/CitySelect/CitySelect";
import BuyerFillSelect, {
  type BuyerFillData,
} from "src/components/BuyerFillSelect/BuyerFillSelect";
import { useCityLookup } from "src/hooks/useCities";
import { me, unwrap } from "src/api/auth";
import { trackEvent } from "src/api/activity";
import {
  getOrganization,
  getOrganizations,
  type Organization,
} from "src/api/profile";
import {
  createInvoice,
  deleteInvoice,
  updateInvoiceContent,
  downloadInvoicePdf,
  emailInvoice,
  getInvoice,
  type CreateInvoicePayload,
  type InvoiceType,
} from "src/api/invoices";
import {
  listItemTemplates,
  createItemTemplate,
  deleteItemTemplate,
  type InvoiceItemTemplate,
} from "src/api/invoiceItemTemplates";
import { usePartners } from "src/hooks/usePartners";
import { useArtikli } from "src/hooks/useKalkulacije";
import { ArtikalModal } from "src/sections/kalkulacije/ArtikalModal";
import type { Artikal } from "src/api/kalkulacije";
import { PkSelect } from "src/components/app-shell/PkSelect";
import type { Partner } from "src/api/partners";
import {
  PartnerFormModal,
  EMPTY_PARTNER_FORM,
  type PartnerFormState,
} from "src/sections/partneri/PartnerFormModal";

type ItemRow = {
  name: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  vatPct: string;
};

const emptyItem = (): ItemRow => ({
  name: "",
  unit: "kom",
  quantity: "1",
  unitPrice: "0",
  discountPct: "0",
  vatPct: "17",
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function n(v: string): number {
  const x = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}
function fmt(v: number): string {
  const [int, dec] = v.toFixed(2).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + dec;
}
// Brojčana polja drže "0" kao default: na fokus se sve selektuje pa kucanje
// odmah piše preko (bez ručnog brisanja nule), kao u desktop programima.
function selectAllOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.select();
}

// Žiro račun format: XXX-XXX-XXXXXXXX-XX (3-3-8-2)
function formatBankAccount(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 16);
  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 3));
  if (d.length > 3) parts.push(d.slice(3, 6));
  if (d.length > 6) parts.push(d.slice(6, 14));
  if (d.length > 14) parts.push(d.slice(14, 16));
  return parts.join("-");
}

export default function InvoiceForm({
  returnTo = "/fakture",
  showBack = true,
  lockedSellerOrgId = null,
  docType = "STANDARD",
}: {
  /** Ruta nakon snimanja i za "Nazad"; PK Office prosljeđuje "/app/fakture". */
  returnTo?: string;
  /** PK Office ima svoj nazad link iznad forme pa interni sakriva. */
  showBack?: boolean;
  /**
   * PK Office: prodavac je aktivna organizacija iz sidebara. Kartica
   * Prodavac se sakrije, podaci (i logo) se uvijek povlače iz postavki
   * obrta, i kod dupliranja.
   */
  lockedSellerOrgId?: number | null;
  /**
   * AVANSNA: pojednostavljena forma za primljeni avans (opis + iznos sa
   * PDV-om, PDV se računa 17/117); uvijek faktura, odmah naplaćena.
   */
  docType?: "STANDARD" | "AVANSNA";
} = {}) {
  const isAvans = docType === "AVANSNA";
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFromId = searchParams.get("duplicateFrom");
  // ?uredi=<id>: puni edit postojeće fakture (isti broj, ponovni obračun)
  const editId = searchParams.get("uredi");
  // Faza 3B: pristup imamo ako vlastiti plan ili bilo koja moja org-a ima PRO+.
  // `role` zadržan jer ga koristi neka inline logika nizvodno (npr. limiti).
  const { role } = useRole();
  const { hasAccessToTier } = useMaxAccessibleTier();
  const isAllowed = hasAccessToTier("PRO");
  const { findByName: findCity } = useCityLookup();
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  // id fakture koja se uređuje (null = kreiranje nove)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [type, setType] = useState<InvoiceType>("INVOICE");
  const [applyVat, setApplyVat] = useState(true);
  // vrsta isporuke za KIF/PDV prijavu; izvoz i oslobođena idu bez PDV-a
  const [vrstaIsporuke, setVrstaIsporuke] = useState<
    "OPOREZIVA" | "IZVOZ" | "OSLOBODJENA"
  >("OPOREZIVA");
  const [currency, setCurrency] = useState<"BAM" | "EUR">("BAM");
  const currencyLabel = currency === "EUR" ? "EUR" : "KM";
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(plusDaysIso(30));
  const [notes, setNotes] = useState("");

  const [seller, setSeller] = useState({
    organizationId: null as number | null,
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    taxNumber: "",
    vatNumber: "",
    bankAccount: "",
    logoUrl: null as string | null,
  });

  const [buyer, setBuyer] = useState({
    clientId: null as number | null,
    name: "",
    address: "",
    city: "",
    postalCode: "",
    phone: "",
    email: "",
    idNumber: "",
    vatNumber: "",
  });
  const [saveBuyer, setSaveBuyer] = useState(false);
  const [buyerKind, setBuyerKind] = useState<"PERSON" | "COMPANY">("PERSON");

  // PK Office: kupac se bira iz liste partnera organizacije (ili se doda
  // novi partner); marketing forma zadržava "Popuni iz profila".
  const isPkOffice = lockedSellerOrgId != null;
  const partnersQ = usePartners(lockedSellerOrgId);
  const [buyerPartnerId, setBuyerPartnerId] = useState<number | null>(null);
  const [newPartnerInitial, setNewPartnerInitial] =
    useState<PartnerFormState | null>(null);

  function fillBuyerFromPartner(p: Partner) {
    setBuyerPartnerId(p.id);
    setBuyerKind("COMPANY");
    setBuyer({
      clientId: null,
      name: p.name,
      address: p.address ?? "",
      city: p.city ?? "",
      postalCode: findCity(p.city ?? "")?.postalCode ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      idNumber: p.jib ?? "",
      vatNumber: p.pdvBroj ?? "",
    });
  }

  // ?partner=<id> (dugme "Nova faktura" sa kartice partnera): predpopuni
  // kupca čim se lista partnera učita, samo jednom
  const partnerParam = searchParams.get("partner");
  const [partnerParamApplied, setPartnerParamApplied] = useState(false);
  useEffect(() => {
    if (partnerParamApplied || !isPkOffice) return;
    const id = Number(partnerParam);
    if (!id || !partnersQ.data) return;
    const preselect = partnersQ.data.find((x) => x.id === id);
    if (preselect) fillBuyerFromPartner(preselect);
    setPartnerParamApplied(true);
    // fillBuyerFromPartner se re-kreira svaki render; guard je partnerParamApplied
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerParam, partnerParamApplied, isPkOffice, partnersQ.data]);

  const [sendEmail, setSendEmail] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);

  // sinhronizuj email kupca u email-to polje dok korisnik ručno ne dirne
  const [emailEdited, setEmailEdited] = useState(false);
  useEffect(() => {
    if (!emailEdited) setEmailTo(buyer.email || "");
  }, [buyer.email, emailEdited]);

  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);

  // avansna faktura: opis + primljeni iznos SA PDV-om (17/117)
  const [avansOpis, setAvansOpis] = useState("");
  const [avansIznos, setAvansIznos] = useState("");
  const avansAmount = n(avansIznos);
  const avansVat =
    isAvans && applyVat ? Math.round(((avansAmount * 17) / 117) * 100) / 100 : 0;
  const avansNet = Math.round((avansAmount - avansVat) * 100) / 100;

  const [submitErr, setSubmitErr] = useState<string | null>(null);

  // ── Šabloni stavki (per-user biblioteka) ───────────────────────────────
  const queryClient = useQueryClient();
  const [tplPickerForRow, setTplPickerForRow] = useState<number | null>(null);
  const [tplPickerCoords, setTplPickerCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [tplFilter, setTplFilter] = useState("");
  const [tplSavedNotice, setTplSavedNotice] = useState<string | null>(null);
  const [tplDeleteConfirm, setTplDeleteConfirm] =
    useState<InvoiceItemTemplate | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["invoiceItemTemplates"],
    queryFn: () => unwrap(listItemTemplates()),
    enabled: isAllowed,
  });
  const templatesData = templatesQuery.data;
  const templates: InvoiceItemTemplate[] = useMemo(
    () => templatesData ?? [],
    [templatesData],
  );

  const saveTemplate = useMutation({
    mutationFn: (it: ItemRow) =>
      unwrap(
        createItemTemplate({
          name: it.name.trim(),
          unit: it.unit || "kom",
          quantity: n(it.quantity) || 1,
          unitPrice: n(it.unitPrice),
          discountPct: n(it.discountPct),
          vatPct: n(it.vatPct),
        }),
      ),
    onSuccess: (tpl) => {
      queryClient.invalidateQueries({ queryKey: ["invoiceItemTemplates"] });
      const shortName =
        tpl.name.length > 40 ? tpl.name.slice(0, 40) + "…" : tpl.name;
      setTplSavedNotice(`Snimljeno u biblioteku: ${shortName}`);
      setTimeout(() => setTplSavedNotice(null), 3000);
    },
  });

  const removeTemplate = useMutation({
    mutationFn: (id: number) => unwrap(deleteItemTemplate(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoiceItemTemplates"] });
    },
  });

  function applyTemplate(rowIdx: number, tpl: InvoiceItemTemplate) {
    setItem(rowIdx, {
      name: tpl.name,
      unit: tpl.unit || "kom",
      quantity: String(tpl.quantity ?? "1"),
      unitPrice: String(tpl.unitPrice ?? "0"),
      discountPct: String(tpl.discountPct ?? "0"),
      vatPct: String(tpl.vatPct ?? "17"),
    });
    setTplPickerForRow(null);
    setTplFilter("");
  }

  const filteredTemplates = useMemo(() => {
    const q = tplFilter.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, tplFilter]);

  // PK Office: naziv stavke je živa pretraga šifarnika artikala (kao izbor
  // artikla na kalkulacijama): kucanjem se filtriraju artikli (roba i usluge,
  // zajednička baza) i snimljeni šabloni stavki, a "+ Dodaj u šifarnik" snima
  // ukucani naziv kao novi artikal. Stara dugmad (📋/💾) su samo na marketing
  // strani forme.
  const artikliQ = useArtikli(isPkOffice ? lockedSellerOrgId : null);

  const [nameDropRow, setNameDropRow] = useState<number | null>(null);
  const [nameDropCoords, setNameDropCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [nameDropHi, setNameDropHi] = useState(0);
  // "+ Dodaj u šifarnik": red za koji se otvara ArtikalModal
  const [newArtikalForRow, setNewArtikalForRow] = useState<number | null>(null);

  const nameQuery =
    nameDropRow != null ? (items[nameDropRow]?.name ?? "").trim() : "";
  const nameMatches = useMemo(() => {
    if (!isPkOffice || !nameQuery) {
      return { artikli: [] as Artikal[], sabloni: [] as InvoiceItemTemplate[] };
    }
    const q = nameQuery.toLowerCase();
    const artikli = (artikliQ.data ?? [])
      .filter(
        (a) =>
          a.aktivan &&
          (a.naziv.toLowerCase().includes(q) ||
            a.sifra.toLowerCase().startsWith(q)),
      )
      .slice(0, 8);
    const sabloni = templates
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 5);
    return { artikli, sabloni };
  }, [isPkOffice, nameQuery, artikliQ.data, templates]);
  // opcije za strelice/Enter: artikli, šabloni, pa "+ Dodaj u šifarnik"
  const nameDropCount =
    nameMatches.artikli.length + nameMatches.sabloni.length + 1;

  function closeNameDrop() {
    setNameDropRow(null);
    setNameDropCoords(null);
    setNameDropHi(0);
  }

  function applyArtikal(rowIdx: number, a: Artikal) {
    setItem(rowIdx, {
      name: a.naziv,
      unit: a.jm.toLowerCase(),
      vatPct: a.oslobodjenPdv ? "0" : "17",
    });
    setTplPickerForRow(null);
    setTplFilter("");
    closeNameDrop();
  }

  function pickNameOption(idx: number) {
    if (nameDropRow == null) return;
    const { artikli, sabloni } = nameMatches;
    if (idx < artikli.length) {
      applyArtikal(nameDropRow, artikli[idx]);
      return;
    }
    if (idx < artikli.length + sabloni.length) {
      applyTemplate(nameDropRow, sabloni[idx - artikli.length]);
      closeNameDrop();
      return;
    }
    setNewArtikalForRow(nameDropRow);
    closeNameDrop();
  }

  // zatvaranje pretrage naziva: klik van, Escape, scroll, resize
  useEffect(() => {
    if (nameDropRow === null) return;
    const close = () => closeNameDrop();
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-name-picker]`)) close();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [nameDropRow]);

  // close picker on outside click / esc / scroll (fixed-position drift)
  useEffect(() => {
    if (tplPickerForRow === null) return;
    const close = () => {
      setTplPickerForRow(null);
      setTplFilter("");
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-tpl-picker]`)) close();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [tplPickerForRow]);

  // ── Učitaj user/orgs/clients za pickere ──────────────────────────────
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });
  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
    enabled: !!user && isAllowed,
  });
  // PK Office: prodavac se povlači direktno po ID-u aktivnog obrta (isti
  // endpoint/cache kao ostatak app-a). Lista /api/organizations ne mora
  // sadržavati obrte kojima se pristupa kao član, a i gate-ovana je tier
  // provjerom, pa bi find po njoj znao ostaviti prodavca praznim.
  const { data: lockedOrg } = useQuery({
    queryKey: ["pk-org", lockedSellerOrgId],
    queryFn: () => unwrap(getOrganization(lockedSellerOrgId as number)),
    enabled: lockedSellerOrgId != null,
  });
  useEffect(() => {
    if (lockedOrg) pickSellerOrg(lockedOrg);
  }, [lockedOrg]);

  // Marketing dio: pre-popuni prodavca kad korisnik ima tačno jednu org-u
  useEffect(() => {
    if (lockedSellerOrgId) return; // PK Office ide kroz lockedOrg efekat
    if (orgs.length === 1 && !seller.name) {
      pickSellerOrg(orgs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgs.length, lockedSellerOrgId]);

  // Duplikat: ako je u URL-u ?duplicateFrom=ID, povuci tu fakturu i pre-popuni
  // formu (kupac, stavke, napomena, podaci prodavca). Datum se postavlja na
  // danas; broj se generiše prilikom snimanja.
  const duplicateLoadedRef = useRef(false);
  const editLoadedRef = useRef(false);
  useEffect(() => {
    if (!duplicateFromId) return;
    if (duplicateLoadedRef.current) return;
    if (!isAllowed) return;
    const id = Number(duplicateFromId);
    if (!Number.isInteger(id) || id <= 0) return;
    duplicateLoadedRef.current = true;
    (async () => {
      const res = await getInvoice(id);
      if (!res.ok) {
        setDuplicateNotice(`Greška pri učitavanju izvora: ${res.error}`);
        return;
      }
      const inv = res.data;
      setType(inv.type);
      setApplyVat(inv.applyVat);
      setVrstaIsporuke(inv.vrstaIsporuke ?? "OPOREZIVA");
      setCurrency(inv.currency);
      setIssueDate(todayIso());
      setDueDate(plusDaysIso(30));
      setNotes(inv.notes || "");
      // PK Office: prodavac ostaje aktivna organizacija (svježi podaci iz
      // postavki), ne kopija sa stare fakture
      if (!lockedSellerOrgId) {
        setSeller({
          organizationId: inv.organizationId ?? null,
          name: inv.sellerName || "",
          address: inv.sellerAddress || "",
          city: inv.sellerCity || "",
          phone: inv.sellerPhone || "",
          email: inv.sellerEmail || "",
          taxNumber: inv.sellerTaxNumber || "",
          vatNumber: inv.sellerVatNumber || "",
          bankAccount: inv.sellerBankAccount || "",
          logoUrl: inv.sellerLogoUrl || null,
        });
      }
      setBuyer({
        clientId: inv.clientId ?? null,
        name: inv.buyerName || "",
        address: inv.buyerAddress || "",
        city: inv.buyerCity || "",
        postalCode: inv.buyerPostalCode || "",
        phone: inv.buyerPhone || "",
        email: inv.buyerEmail || "",
        idNumber: inv.buyerIdNumber || "",
        vatNumber: inv.buyerVatNumber || "",
      });
      if (inv.items && inv.items.length > 0) {
        setItems(
          inv.items.map((it) => ({
            name: it.name || "",
            unit: it.unit || "kom",
            quantity: String(it.quantity ?? "1"),
            unitPrice: String(it.unitPrice ?? "0"),
            discountPct: String(it.discountPct ?? "0"),
            vatPct: String(it.vatPct ?? "17"),
          })),
        );
      }
      const docLabel = inv.type === "INVOICE" ? "fakture" : "predračuna";
      setDuplicateNotice(
        `Podaci su pre-popunjeni iz ${docLabel} br. ${inv.fullNumber}. Datum izdavanja je postavljen na danas, novi broj se generiše prilikom snimanja.`,
      );
    })();
  }, [duplicateFromId, isAllowed, lockedSellerOrgId]);

  // Puni edit postojeće fakture: isti kao duplikat, ali zadržava broj i datume
  // i uključuje edit mod (submit ide na update umjesto create).
  useEffect(() => {
    if (!editId) return;
    if (editLoadedRef.current) return;
    if (!isAllowed) return;
    const id = Number(editId);
    if (!Number.isInteger(id) || id <= 0) return;
    editLoadedRef.current = true;
    (async () => {
      const res = await getInvoice(id);
      if (!res.ok) {
        setDuplicateNotice(`Greška pri učitavanju fakture: ${res.error}`);
        return;
      }
      const inv = res.data;
      setType(inv.type);
      setApplyVat(inv.applyVat);
      setVrstaIsporuke(inv.vrstaIsporuke ?? "OPOREZIVA");
      setCurrency(inv.currency);
      setIssueDate((inv.issueDate || "").slice(0, 10) || todayIso());
      setDueDate((inv.dueDate || "").slice(0, 10) || plusDaysIso(30));
      setNotes(inv.notes || "");
      if (!lockedSellerOrgId) {
        setSeller({
          organizationId: inv.organizationId ?? null,
          name: inv.sellerName || "",
          address: inv.sellerAddress || "",
          city: inv.sellerCity || "",
          phone: inv.sellerPhone || "",
          email: inv.sellerEmail || "",
          taxNumber: inv.sellerTaxNumber || "",
          vatNumber: inv.sellerVatNumber || "",
          bankAccount: inv.sellerBankAccount || "",
          logoUrl: inv.sellerLogoUrl || null,
        });
      }
      setBuyer({
        clientId: inv.clientId ?? null,
        name: inv.buyerName || "",
        address: inv.buyerAddress || "",
        city: inv.buyerCity || "",
        postalCode: inv.buyerPostalCode || "",
        phone: inv.buyerPhone || "",
        email: inv.buyerEmail || "",
        idNumber: inv.buyerIdNumber || "",
        vatNumber: inv.buyerVatNumber || "",
      });
      if (inv.items && inv.items.length > 0) {
        setItems(
          inv.items.map((it) => ({
            name: it.name || "",
            unit: it.unit || "kom",
            quantity: String(it.quantity ?? "1"),
            unitPrice: String(it.unitPrice ?? "0"),
            discountPct: String(it.discountPct ?? "0"),
            vatPct: String(it.vatPct ?? "17"),
          })),
        );
      }
      setEditingId(id);
      setDuplicateNotice(
        `Uređujete fakturu ${inv.fullNumber}. Broj ostaje isti, a izmjene mijenjaju iznose u KIF-u, PDV prijavi i na kartici kupca.`,
      );
    })();
  }, [editId, isAllowed, lockedSellerOrgId]);

  function pickSellerOrg(org: Organization) {
    setSeller({
      organizationId: org.id,
      name: org.name || "",
      address: org.address || "",
      city: org.city || "",
      phone: org.phone || "",
      email: org.email || "",
      taxNumber: org.taxNumber || "",
      vatNumber: org.pdvNumber || "",
      bankAccount: org.bankAccount || "",
      logoUrl: org.logoUrl || null,
    });
  }

  function applySellerFill(d: BuyerFillData) {
    setSeller({
      organizationId: d.organizationId ?? null,
      name: d.name ?? "",
      address: d.address ?? "",
      city: d.city ?? "",
      phone: d.phone ?? "",
      email: d.email ?? "",
      taxNumber: d.idNumber ?? "",
      vatNumber: d.vatNumber ?? "",
      bankAccount: d.bankAccount ?? "",
      logoUrl: d.logoUrl ?? null,
    });
  }

  function applyBuyerFill(d: BuyerFillData) {
    const city = d.city ?? "";
    const postalCode = d.postalCode ?? findCity(city)?.postalCode ?? "";
    setBuyer({
      clientId: null,
      name: d.name ?? "",
      address: d.address ?? "",
      city,
      postalCode,
      phone: d.phone ?? "",
      email: d.email ?? "",
      idNumber: d.idNumber ?? "",
      vatNumber: d.vatNumber ?? "",
    });
    setSaveBuyer(false);
  }

  // ── Computed totali ──────────────────────────────────────────────────
  const totals = useMemo(() => {
    let netTotal = 0;
    let discountTotal = 0;
    let vatTotal = 0;
    let grossTotal = 0;
    for (const it of items) {
      const q = n(it.quantity);
      const up = n(it.unitPrice);
      const dPct = n(it.discountPct);
      const vPct = applyVat ? n(it.vatPct) : 0;
      const gross = q * up;
      const discount = (gross * dPct) / 100;
      const net = gross - discount;
      const vat = (net * vPct) / 100;
      const total = net + vat;
      netTotal += net;
      discountTotal += discount;
      vatTotal += vat;
      grossTotal += total;
    }
    return {
      netTotal: +netTotal.toFixed(2),
      discountTotal: +discountTotal.toFixed(2),
      vatTotal: +vatTotal.toFixed(2),
      grossTotal: +grossTotal.toFixed(2),
    };
  }, [items, applyVat]);

  function lineNet(it: ItemRow): number {
    const q = n(it.quantity);
    const up = n(it.unitPrice);
    const dPct = n(it.discountPct);
    const gross = q * up;
    const discount = (gross * dPct) / 100;
    return +(gross - discount).toFixed(2);
  }

  function setItem(i: number, patch: Partial<ItemRow>) {
    setItems((arr) =>
      arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );
  }
  function addItem() {
    setItems((arr) => [...arr, emptyItem()]);
  }
  function removeItem(i: number) {
    setItems((arr) =>
      arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i),
    );
  }

  // ── Submit ───────────────────────────────────────────────────────────
  const submit = useMutation({
    mutationFn: async (vars: { downloadPdf: boolean }) => {
      void vars;
      const payload: CreateInvoicePayload = {
        type: isAvans ? "INVOICE" : type,
        ...(isAvans ? { docType: "AVANSNA" as const } : {}),
        applyVat,
        vrstaIsporuke: isAvans ? "OPOREZIVA" : vrstaIsporuke,
        currency,
        issueDate,
        dueDate: isAvans ? null : dueDate || null,
        notes: notes.trim() || null,
        saveBuyerAsClient: saveBuyer && !buyer.clientId,
        buyerKind,
        seller: {
          organizationId: seller.organizationId,
          name: seller.name.trim(),
          address: seller.address.trim() || null,
          city: seller.city.trim() || null,
          phone: seller.phone.trim() || null,
          email: seller.email.trim() || null,
          taxNumber: seller.taxNumber.trim() || null,
          vatNumber: seller.vatNumber.trim() || null,
          bankAccount: seller.bankAccount.trim() || null,
          logoUrl: seller.logoUrl,
        },
        buyer: {
          clientId: buyer.clientId,
          name: buyer.name.trim(),
          address: buyer.address.trim() || null,
          city: buyer.city.trim() || null,
          postalCode: buyer.postalCode.trim() || null,
          phone: buyer.phone.trim() || null,
          email: buyer.email.trim() || null,
          idNumber: buyer.idNumber.trim() || null,
          vatNumber: buyer.vatNumber.trim() || null,
        },
        items: isAvans
          ? [
              {
                name: avansOpis.trim() || "Primljeni avans",
                unit: null,
                quantity: 1,
                unitPrice: avansNet,
                discountPct: 0,
                vatPct: applyVat ? 17 : 0,
              },
            ]
          : items.map((it) => ({
              name: it.name.trim(),
              unit: it.unit.trim() || null,
              quantity: n(it.quantity),
              unitPrice: n(it.unitPrice),
              discountPct: n(it.discountPct),
              vatPct: applyVat ? n(it.vatPct) : 0,
            })),
      };
      return unwrap(
        editingId != null
          ? updateInvoiceContent(editingId, payload)
          : createInvoice(payload),
      );
    },
    onSuccess: async (inv, vars) => {
      trackEvent(
        inv.type === "INVOICE" ? "FAKTURA_GENERATE" : "PREDRACUN_GENERATE",
        inv.type === "INVOICE" ? "Faktura" : "Predračun",
      );
      if (vars.downloadPdf) {
        try {
          const base =
            inv.type === "PROFORMA"
              ? "Predracun"
              : inv.docType === "AVANSNA"
                ? "Avansna-faktura"
                : "Faktura";
          await downloadInvoicePdf(inv.id, `${base}-${inv.fullNumber}.pdf`);
        } catch (e) {
          console.warn("PDF download failed:", e);
        }
      }
      if (sendEmail && emailTo.trim()) {
        try {
          await unwrap(emailInvoice(inv.id, { to: emailTo.trim() }));
        } catch (e) {
          console.warn("email send failed:", e);
          setSubmitErr(
            `Faktura je sačuvana, ali email nije poslan: ${(e as Error)?.message || String(e)}`,
          );
          return;
        }
      }
      router.push(returnTo);
    },
    onError: (e: Error) => {
      const msg = e?.message || String(e);
      if (msg === "PRO_LIMIT_REACHED") {
        setSubmitErr(
          "Dosegli ste limit od 20 sačuvanih klijenata na PRO planu. Nadogradite na BUSINESS ili ne čuvajte ovog kupca u listu klijenata.",
        );
      } else {
        setSubmitErr(msg);
      }
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => unwrap(deleteInvoice(editingId as number)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pk-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      router.push(returnTo);
    },
  });

  function onSubmit(e: React.FormEvent | null, downloadPdf = true) {
    e?.preventDefault();
    setSubmitErr(null);
    if (!seller.name.trim()) {
      setSubmitErr("Unesite naziv prodavca.");
      return;
    }
    if (!buyer.name.trim()) {
      setSubmitErr("Unesite naziv kupca.");
      return;
    }
    if (isAvans) {
      if (!(avansAmount > 0)) {
        setSubmitErr("Unesite primljeni iznos avansa.");
        return;
      }
    } else {
      const validItems = items.filter(
        (it) => it.name.trim() && n(it.quantity) > 0,
      );
      if (validItems.length === 0) {
        setSubmitErr("Dodajte barem jednu stavku sa imenom i količinom.");
        return;
      }
    }
    if (sendEmail) {
      const v = emailTo.trim();
      if (!v) {
        setEmailErr("Unesite email kupca");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        setEmailErr("Neispravan format email adrese");
        return;
      }
      setEmailErr(null);
    }
    submit.mutate({ downloadPdf });
  }

  return (
    <div className={styles.page}>
      {!isAllowed && (
        <GeneratePaywall
          tier="PRO"
          what="Snimanje i preuzimanje fakture/predračuna"
        />
      )}
      {duplicateNotice && (
        <div className={styles.duplicateNotice}>
          <span className={styles.duplicateNoticeIcon}>⧉</span>
          <span>{duplicateNotice}</span>
          <button
            type="button"
            className={styles.duplicateNoticeClose}
            onClick={() => setDuplicateNotice(null)}
            aria-label="Sakrij"
          >
            ×
          </button>
        </div>
      )}
      <div className={styles.header}>
        <div>
          <div className={styles.label}>Novi dokument</div>
          <h1 className={styles.h1}>
            {isAvans
              ? "Nova avansna faktura"
              : type === "INVOICE"
                ? "Nova faktura"
                : "Novi predračun"}
          </h1>
          <p className={styles.subtitle}>
            {isAvans
              ? "Unesite kupca i primljeni avans; PDV se računa preračunatom stopom 17/117. Numeracija (A-) je automatska."
              : "Popunite podatke prodavca, kupca i stavke. Numeracija je automatska."}
          </p>
        </div>
        {showBack && (
          <Link
            href={returnTo}
            className={`${styles.btn} ${styles.btnGhost}`}
          >
            ← Nazad
          </Link>
        )}
      </div>

      <form onSubmit={onSubmit} className={styles.formWrap}>
        {/* ── Tip + PDV toggle ───────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.toggleRow}>
            {!isAvans && (
            <div className={styles.segmented}>
              <button
                type="button"
                className={type === "INVOICE" ? styles.active : ""}
                onClick={() => setType("INVOICE")}
              >
                Faktura
              </button>
              <button
                type="button"
                className={type === "PROFORMA" ? styles.active : ""}
                onClick={() => setType("PROFORMA")}
              >
                Predračun
              </button>
            </div>
            )}
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={applyVat}
                onChange={(e) => {
                  setApplyVat(e.target.checked);
                  // PDV se obračunava samo na oporezivu isporuku
                  if (e.target.checked) setVrstaIsporuke("OPOREZIVA");
                }}
              />
              {isAvans ? "Avans sadrži PDV (17/117)" : "Obračunavam PDV"}
            </label>
            {/* vrsta isporuke: puni KIF i PDV prijavu (izvoz/oslobođeno bez PDV) */}
            {!isAvans && (
            <div
              className={styles.segmented}
              role="radiogroup"
              aria-label="Vrsta isporuke"
            >
              <button
                type="button"
                className={vrstaIsporuke === "OPOREZIVA" ? styles.active : ""}
                onClick={() => setVrstaIsporuke("OPOREZIVA")}
                title="Domaća oporeziva isporuka"
              >
                Oporeziva
              </button>
              <button
                type="button"
                className={vrstaIsporuke === "IZVOZ" ? styles.active : ""}
                onClick={() => {
                  setVrstaIsporuke("IZVOZ");
                  setApplyVat(false);
                }}
                title="Izvozna isporuka (bez PDV-a)"
              >
                Izvoz
              </button>
              <button
                type="button"
                className={vrstaIsporuke === "OSLOBODJENA" ? styles.active : ""}
                onClick={() => {
                  setVrstaIsporuke("OSLOBODJENA");
                  setApplyVat(false);
                }}
                title="Oslobođena isporuka (bez PDV-a)"
              >
                Oslobođena
              </button>
            </div>
            )}
            <div
              className={styles.segmented}
              role="radiogroup"
              aria-label="Valuta"
            >
              <button
                type="button"
                className={currency === "BAM" ? styles.active : ""}
                onClick={() => setCurrency("BAM")}
              >
                KM
              </button>
              <button
                type="button"
                className={currency === "EUR" ? styles.active : ""}
                onClick={() => setCurrency("EUR")}
              >
                EUR
              </button>
            </div>
            <div className={styles.field} style={{ flex: 1, minWidth: 160 }}>
              <label>Datum izdavanja</label>
              <DateInput
                value={issueDate}
                onValueChange={setIssueDate}
                className={styles.input}
              />
            </div>
            {!isAvans && (
            <div className={styles.field} style={{ flex: 1, minWidth: 160 }}>
              <label>Datum dospijeća</label>
              <DateInput
                value={dueDate}
                onValueChange={setDueDate}
                className={styles.input}
              />
            </div>
            )}
          </div>
        </div>

        {/* ── PRODAVAC ─────────────────────────────────── */}
        {lockedSellerOrgId ? (
          // PK Office: prodavac je aktivna organizacija, bez unosa
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Prodavac</div>
            </div>
            <p style={{ fontSize: 13, color: "var(--mid)", margin: 0 }}>
              <strong style={{ color: "var(--ink, inherit)" }}>
                {seller.name || "..."}
              </strong>
              {[seller.address, seller.city].filter(Boolean).length > 0 && (
                <> · {[seller.address, seller.city].filter(Boolean).join(", ")}</>
              )}
              {seller.logoUrl ? " · sa logom" : ""}
              <br />
              Podaci prodavca (kontakt, žiro račun, logo) se vode u{" "}
              <Link href="/app/postavke">postavkama obrta</Link> i automatski
              ulaze u zaglavlje računa.
            </p>
          </div>
        ) : (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>Prodavac</div>
            <BuyerFillSelect onFill={applySellerFill} />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Naziv *</label>
              <input
                className={styles.input}
                value={seller.name}
                onChange={(e) => setSeller({ ...seller, name: e.target.value })}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Adresa</label>
              <input
                className={styles.input}
                value={seller.address}
                onChange={(e) =>
                  setSeller({ ...seller, address: e.target.value })
                }
              />
            </div>
            <div className={styles.field}>
              <label>Grad</label>
              <CitySelect
                className={styles.input}
                value={seller.city}
                onChange={(v) => setSeller({ ...seller, city: v })}
              />
            </div>
            <div className={styles.field}>
              <label>Telefon</label>
              <input
                className={styles.input}
                value={seller.phone}
                onChange={(e) =>
                  setSeller({ ...seller, phone: e.target.value })
                }
              />
            </div>
            <div className={styles.field}>
              <label>E-mail</label>
              <input
                className={styles.input}
                type="email"
                value={seller.email}
                onChange={(e) =>
                  setSeller({ ...seller, email: e.target.value })
                }
              />
            </div>
            <div className={styles.field}>
              <label>ID broj</label>
              <input
                className={styles.input}
                value={seller.taxNumber}
                onChange={(e) =>
                  setSeller({
                    ...seller,
                    taxNumber: e.target.value.replace(/\D/g, "").slice(0, 13),
                  })
                }
                maxLength={13}
                inputMode="numeric"
                placeholder="XXXXXXXXXXXXX"
              />
            </div>
            <div className={styles.field}>
              <label>PDV broj</label>
              <input
                className={styles.input}
                value={seller.vatNumber}
                onChange={(e) =>
                  setSeller({
                    ...seller,
                    vatNumber: e.target.value.replace(/\D/g, "").slice(0, 12),
                  })
                }
                maxLength={12}
                inputMode="numeric"
                placeholder="XXXXXXXXXXXX"
              />
            </div>
            <div className={styles.field}>
              <label>Žiro račun</label>
              <input
                className={styles.input}
                value={seller.bankAccount}
                onChange={(e) =>
                  setSeller({
                    ...seller,
                    bankAccount: formatBankAccount(e.target.value),
                  })
                }
                placeholder="XXX-XXX-XXXXXXXX-XX"
                maxLength={19}
                inputMode="numeric"
              />
            </div>
          </div>
          {seller.logoUrl ? (
            <p
              style={{ fontSize: 12, color: "var(--mid)", marginTop: ".5rem" }}
            >
              Logo iz organizacije će biti korišten. Promijenite ga u{" "}
              <Link href="/profil">Profilu</Link>.
            </p>
          ) : (
            <p
              style={{ fontSize: 12, color: "var(--mid)", marginTop: ".5rem" }}
            >
              Bez loga (default). Logo se postavlja na organizaciji u{" "}
              <Link href="/profil">Profilu</Link>.
            </p>
          )}
        </div>
        )}

        {/* ── KUPAC ───────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>Kupac</div>
            {isPkOffice ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <PkSelect
                  ariaLabel="Kupac iz liste partnera"
                  value={buyerPartnerId != null ? String(buyerPartnerId) : ""}
                  onChange={(v) => {
                    const p = (partnersQ.data ?? []).find(
                      (x) => x.id === Number(v),
                    );
                    if (p) fillBuyerFromPartner(p);
                    else setBuyerPartnerId(null);
                  }}
                  searchable
                  searchPlaceholder="Traži partnera..."
                  placeholder="Izaberi partnera"
                  options={[
                    { value: "", label: "Izaberi partnera" },
                    ...(partnersQ.data ?? []).map((p) => ({
                      value: String(p.id),
                      label:
                        p.code != null
                          ? `${String(p.code).padStart(4, "0")} · ${p.name}`
                          : p.name,
                    })),
                  ]}
                  wrapStyle={{ width: 250 }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setNewPartnerInitial({ ...EMPTY_PARTNER_FORM })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
                >
                  + Novi partner
                </button>
              </div>
            ) : (
              <BuyerFillSelect onFill={applyBuyerFill} />
            )}
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Naziv / Ime i prezime *</label>
              <input
                className={styles.input}
                value={buyer.name}
                onChange={(e) => {
                  setBuyer({ ...buyer, name: e.target.value, clientId: null });
                  // ručna izmjena naziva raskida vezu sa izabranim partnerom
                  setBuyerPartnerId(null);
                }}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Adresa</label>
              <input
                className={styles.input}
                value={buyer.address}
                onChange={(e) =>
                  setBuyer({ ...buyer, address: e.target.value })
                }
              />
            </div>
            <div className={styles.field}>
              <label>Grad</label>
              <CitySelect
                className={styles.input}
                value={buyer.city}
                onChange={(v) => {
                  const pc = findCity(v)?.postalCode ?? "";
                  setBuyer((b) => ({
                    ...b,
                    city: v,
                    postalCode: pc || b.postalCode,
                  }));
                }}
              />
            </div>
            <div className={styles.field}>
              <label>Poštanski broj</label>
              <input
                className={styles.input}
                value={buyer.postalCode}
                onChange={(e) =>
                  setBuyer({ ...buyer, postalCode: e.target.value })
                }
                placeholder="auto"
              />
            </div>
            <div className={styles.field}>
              <label>Telefon</label>
              <input
                className={styles.input}
                value={buyer.phone}
                onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>E-mail</label>
              <input
                className={styles.input}
                type="email"
                value={buyer.email}
                onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>ID / JMBG broj</label>
              <input
                className={styles.input}
                value={buyer.idNumber}
                onChange={(e) =>
                  setBuyer({
                    ...buyer,
                    idNumber: e.target.value.replace(/\D/g, "").slice(0, 13),
                  })
                }
                maxLength={13}
                inputMode="numeric"
                placeholder="XXXXXXXXXXXXX"
              />
            </div>
            <div className={styles.field}>
              <label>PDV broj</label>
              <input
                className={styles.input}
                value={buyer.vatNumber}
                onChange={(e) =>
                  setBuyer({
                    ...buyer,
                    vatNumber: e.target.value.replace(/\D/g, "").slice(0, 12),
                  })
                }
                maxLength={12}
                inputMode="numeric"
                placeholder="XXXXXXXXXXXX"
              />
            </div>
          </div>
          {!buyer.clientId && (
            <div
              style={{
                marginTop: ".75rem",
                display: "flex",
                gap: "1.25rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={saveBuyer}
                  onChange={(e) => setSaveBuyer(e.target.checked)}
                />
                Sačuvaj kupca u listu klijenata
              </label>
              {saveBuyer && (
                <div
                  className={styles.segmented}
                  role="radiogroup"
                  aria-label="Tip klijenta"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={buyerKind === "PERSON"}
                    className={buyerKind === "PERSON" ? styles.active : ""}
                    onClick={() => setBuyerKind("PERSON")}
                  >
                    Fizičko lice
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={buyerKind === "COMPANY"}
                    className={buyerKind === "COMPANY" ? styles.active : ""}
                    onClick={() => setBuyerKind("COMPANY")}
                  >
                    Pravno lice
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── STAVKE / PRIMLJENI AVANS ─────────────────── */}
        {isAvans ? (
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Primljeni avans</div>
            </div>
            <div className={styles.row}>
              <div className={styles.field} style={{ flex: 2, minWidth: 260 }}>
                <label>Opis avansa</label>
                <input
                  className={styles.input}
                  value={avansOpis}
                  onChange={(e) => setAvansOpis(e.target.value)}
                  placeholder="npr. Avans po ponudi br. 12/2026"
                />
              </div>
              <div className={styles.field} style={{ flex: 1, minWidth: 180 }}>
                <label>
                  Primljeni iznos ({currencyLabel}
                  {applyVat ? ", sa PDV-om" : ""})
                </label>
                <input
                  className={styles.input}
                  value={avansIznos}
                  onChange={(e) => setAvansIznos(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className={styles.totals}>
              {applyVat && (
                <>
                  <div className={styles.lbl}>Osnovica (bez PDV-a):</div>
                  <div className={styles.val}>
                    {fmt(avansNet)} {currencyLabel}
                  </div>
                  <div className={styles.lbl}>PDV (17/117):</div>
                  <div className={styles.val}>
                    {fmt(avansVat)} {currencyLabel}
                  </div>
                </>
              )}
              <div className={`${styles.lbl} ${styles.totalGrand}`}>
                PRIMLJENI AVANS:
              </div>
              <div className={`${styles.val} ${styles.totalGrand}`}>
                {fmt(avansAmount)} {currencyLabel}
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--mid)", marginTop: ".5rem" }}>
              Avansna faktura se odmah vodi kao naplaćena (avans je primljen).
              Kad izdate konačnu fakturu, avansnu stornirajte akcijom
              &quot;Storniraj avans&quot; sa liste faktura.
            </p>
          </div>
        ) : (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>Stavke</div>
            {templates.length > 0 && (
              <span className={styles.sectionHint}>
                {templates.length}{" "}
                {templates.length === 1
                  ? "snimljen šablon"
                  : "snimljenih šablona"},{" "}
                klikni 📋 na stavci
              </span>
            )}
          </div>
          {tplSavedNotice && (
            <div className={styles.tplToast}>✓ {tplSavedNotice}</div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th style={{ width: 30 }}>R/B</th>
                  <th>Naziv robe / usluge</th>
                  <th style={{ width: 70 }}>JM</th>
                  <th style={{ width: 90 }}>Količina</th>
                  <th style={{ width: 110 }}>Cijena (bez PDV)</th>
                  <th style={{ width: 80 }}>Rabat %</th>
                  {applyVat && <th style={{ width: 80 }}>PDV %</th>}
                  <th style={{ width: 110 }}>Iznos</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className={styles.itemRow}>
                    <td className={styles.itemRb} data-label="">
                      <span className={styles.itemRbText}>{i + 1}.</span>
                      <span className={styles.itemRbMobile}>
                        Stavka {i + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className={styles.itemRemoveMobile}
                          onClick={() => removeItem(i)}
                          aria-label="Obriši stavku"
                        >
                          × Obriši
                        </button>
                      )}
                    </td>
                    <td
                      data-label="Naziv robe / usluge"
                      className={styles.itemNameCell}
                    >
                      <div className={styles.itemNameWrap} data-name-picker>
                        <textarea
                          className={`${styles.input} ${styles.itemNameArea}`}
                          value={it.name}
                          onChange={(e) => {
                            setItem(i, { name: e.target.value });
                            // PK Office: kucanje otvara pretragu šifarnika
                            if (isPkOffice) {
                              if (e.target.value.trim()) {
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setNameDropCoords({
                                  top: rect.bottom,
                                  left: rect.left,
                                  width: rect.width,
                                });
                                setNameDropRow(i);
                                setNameDropHi(0);
                              } else {
                                closeNameDrop();
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (!isPkOffice || nameDropRow !== i) return;
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setNameDropHi((h) =>
                                Math.min(h + 1, nameDropCount - 1),
                              );
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setNameDropHi((h) => Math.max(h - 1, 0));
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              pickNameOption(nameDropHi);
                            }
                          }}
                          placeholder={
                            isPkOffice
                              ? "Upiši naziv, šifru ili novi tekst"
                              : "npr. Konsultacije"
                          }
                          rows={Math.max(
                            1,
                            (it.name.match(/\n/g)?.length || 0) + 1,
                          )}
                        />
                        {!isPkOffice && (
                          <div
                            className={styles.itemNameActions}
                            data-tpl-picker
                          >
                            <button
                              type="button"
                              className={styles.tplBtn}
                              onClick={(e) => {
                                if (tplPickerForRow === i) {
                                  setTplPickerForRow(null);
                                  return;
                                }
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setTplPickerCoords({
                                  top: rect.bottom,
                                  left: rect.right,
                                  width: rect.width,
                                });
                                setTplPickerForRow(i);
                                setTplFilter("");
                              }}
                              title="Iz biblioteke šablona"
                            >
                              📋
                            </button>
                            <button
                              type="button"
                              className={styles.tplBtn}
                              disabled={
                                !it.name.trim() || saveTemplate.isPending
                              }
                              onClick={() => saveTemplate.mutate(it)}
                              title="Snimi ovu stavku u biblioteku za buduće korištenje"
                            >
                              💾
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td data-label="JM">
                      <input
                        className={styles.input}
                        value={it.unit}
                        onChange={(e) => setItem(i, { unit: e.target.value })}
                      />
                    </td>
                    <td data-label="Količina">
                      <input
                        className={`${styles.input} ${styles.numeric}`}
                        value={it.quantity}
                        onChange={(e) =>
                          setItem(i, { quantity: e.target.value })
                        }
                        onFocus={selectAllOnFocus}
                        inputMode="decimal"
                      />
                    </td>
                    <td data-label="Cijena (bez PDV)">
                      <input
                        className={`${styles.input} ${styles.numeric}`}
                        value={it.unitPrice}
                        onChange={(e) =>
                          setItem(i, { unitPrice: e.target.value })
                        }
                        onFocus={selectAllOnFocus}
                        inputMode="decimal"
                      />
                    </td>
                    <td data-label="Rabat %">
                      <input
                        className={`${styles.input} ${styles.numeric}`}
                        value={it.discountPct}
                        onChange={(e) =>
                          setItem(i, { discountPct: e.target.value })
                        }
                        onFocus={selectAllOnFocus}
                        inputMode="decimal"
                      />
                    </td>
                    {applyVat && (
                      <td data-label="PDV %">
                        <input
                          className={`${styles.input} ${styles.numeric}`}
                          value={it.vatPct}
                          onChange={(e) =>
                            setItem(i, { vatPct: e.target.value })
                          }
                          onFocus={selectAllOnFocus}
                          inputMode="decimal"
                        />
                      </td>
                    )}
                    <td
                      data-label="Iznos"
                      className={`${styles.numeric} ${styles.itemTotalCell}`}
                    >
                      <span className={styles.lineTotal}>
                        {fmt(lineNet(it))}
                        <small>{currencyLabel}</small>
                      </span>
                    </td>
                    <td className={styles.itemRemoveCell}>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => removeItem(i)}
                          title="Obriši stavku"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className={styles.addItemBtn} onClick={addItem}>
            + Dodaj stavku
          </button>

          <div className={styles.totals}>
            <div className={styles.lbl}>Bruto:</div>
            <div className={styles.val}>
              {fmt(totals.netTotal + totals.discountTotal)} {currencyLabel}
            </div>
            {totals.discountTotal > 0 && (
              <>
                <div className={styles.lbl}>Rabat:</div>
                <div className={styles.val}>
                  −{fmt(totals.discountTotal)} {currencyLabel}
                </div>
              </>
            )}
            {applyVat && (
              <>
                <div className={styles.lbl}>Osnovica (bez PDV-a):</div>
                <div className={styles.val}>
                  {fmt(totals.netTotal)} {currencyLabel}
                </div>
                <div className={styles.lbl}>PDV:</div>
                <div className={styles.val}>
                  {fmt(totals.vatTotal)} {currencyLabel}
                </div>
              </>
            )}
            <div className={`${styles.lbl} ${styles.totalGrand}`}>
              ZA NAPLATU:
            </div>
            <div className={`${styles.val} ${styles.totalGrand}`}>
              {fmt(totals.grossTotal)} {currencyLabel}
            </div>
          </div>
        </div>
        )}

        {/* ── Notes ─────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.field}>
            <label>Napomena (opcionalno)</label>
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatne informacije za kupca…"
            />
          </div>
        </div>

        {submitErr && <div className={styles.errorMsg}>{submitErr}</div>}

        {isAllowed && (
          <div className={styles.emailRow}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
              />
              Pošalji emailom kupcu
            </label>
            {sendEmail && (
              <>
                <input
                  type="email"
                  className={styles.input}
                  style={{ flex: 1, minWidth: 220 }}
                  value={emailTo}
                  onChange={(e) => {
                    setEmailTo(e.target.value);
                    setEmailEdited(true);
                    if (emailErr) setEmailErr(null);
                  }}
                  placeholder="kupac@email.com"
                />
                <span className={styles.emailHint}>
                  Email se šalje automatski klikom na{" "}
                  <strong>Spremi i preuzmi PDF</strong>.
                </span>
                {emailErr && (
                  <div
                    className={styles.errorMsg}
                    style={{ flexBasis: "100%" }}
                  >
                    {emailErr}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className={styles.actions}>
          {editingId != null && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={submit.isPending || deleteMut.isPending}
              className="mr-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-accent-500 text-accent-500 text-[13px] font-medium hover:bg-accent-500/10 transition-colors disabled:opacity-50"
            >
              Obriši fakturu
            </button>
          )}
          <Link href={returnTo} className={`${styles.btn} ${styles.btnGhost}`}>
            Otkaži
          </Link>
          {isAllowed && editingId != null && (
            <button
              type="button"
              onClick={() => onSubmit(null, false)}
              className={`${styles.btn} ${styles.btnGhost}`}
              disabled={submit.isPending}
            >
              {submit.isPending ? "Snimam…" : "Sačuvaj izmjene"}
            </button>
          )}
          {isAllowed ? (
            <button
              type="submit"
              className={styles.exportBtn}
              disabled={submit.isPending}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
              </svg>
              {submit.isPending
                ? sendEmail
                  ? "Šaljem…"
                  : "Snimam…"
                : editingId != null
                  ? "Sačuvaj izmjene i preuzmi PDF"
                  : "Spremi i preuzmi PDF"}
            </button>
          ) : (
            <Link
              href={
                role
                  ? "/pretplate?trial=1"
                  : `/registracija?next=${encodeURIComponent("/pretplate?trial=auto")}`
              }
              className={styles.exportBtn}
            >
              {role ? "Nadogradi na PRO za PDF →" : "Registruj se za PDF →"}
            </Link>
          )}
        </div>
      </form>

      {/* Portal-ovan template picker, izbjegava clipping unutar tabele */}
      {tplPickerForRow !== null &&
        tplPickerCoords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={styles.tplDropdownPortal}
            data-tpl-picker
            style={{
              position: "fixed",
              top: tplPickerCoords.top + 6,
              left: Math.max(
                8,
                Math.min(tplPickerCoords.left - 320, window.innerWidth - 328),
              ),
            }}
          >
            <input
              type="text"
              className={styles.tplFilter}
              placeholder="Pretraži šablone…"
              value={tplFilter}
              onChange={(e) => setTplFilter(e.target.value)}
              autoFocus
            />
            {templates.length === 0 ? (
              <div className={styles.tplEmpty}>
                Biblioteka je prazna. Snimi prvu stavku klikom na 💾.
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className={styles.tplEmpty}>Nema rezultata.</div>
            ) : (
              <ul className={styles.tplList}>
                {filteredTemplates.map((tpl) => (
                  <li key={tpl.id} className={styles.tplItem}>
                    <button
                      type="button"
                      className={styles.tplItemPick}
                      onClick={() => applyTemplate(tplPickerForRow, tpl)}
                      title="Primijeni ovaj šablon"
                    >
                      <span className={styles.tplItemName}>{tpl.name}</span>
                      <span className={styles.tplItemMeta}>
                        {Number(tpl.unitPrice).toFixed(2)} {currencyLabel} ·{" "}
                        {tpl.unit || "kom"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.tplItemDelete}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTplDeleteConfirm(tpl);
                      }}
                      title="Obriši šablon"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}

      <Modal
        kind="confirm"
        variant="danger"
        open={!!tplDeleteConfirm}
        title="Obriši šablon?"
        message={
          tplDeleteConfirm
            ? `Šablon "${tplDeleteConfirm.name}" će biti trajno obrisan iz biblioteke.`
            : ""
        }
        confirmLabel="Da, obriši"
        onConfirm={() => {
          if (tplDeleteConfirm) {
            removeTemplate.mutate(tplDeleteConfirm.id);
          }
        }}
        onClose={() => setTplDeleteConfirm(null)}
      />

      <Modal
        kind="confirm"
        variant="danger"
        open={confirmDelete}
        title="Brisanje fakture"
        message="Obrisati ovu fakturu? Brisanje ostavlja prazninu u numeraciji i uklanja je iz KIF-a, PDV prijave i sa kartice kupca. Ovo se ne može poništiti."
        confirmLabel="Da, obriši fakturu"
        onConfirm={() => deleteMut.mutate()}
        onClose={() => setConfirmDelete(false)}
      />

      {/* PK Office: živa pretraga šifarnika ispod polja naziva stavke */}
      {isPkOffice &&
        nameDropRow !== null &&
        nameDropCoords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={styles.tplDropdownPortal}
            data-name-picker
            style={{
              position: "fixed",
              top: nameDropCoords.top + 4,
              left: Math.max(
                8,
                Math.min(
                  nameDropCoords.left,
                  window.innerWidth - Math.max(320, nameDropCoords.width) - 8,
                ),
              ),
              width: Math.max(320, nameDropCoords.width),
            }}
          >
            {nameMatches.artikli.length > 0 && (
              <>
                <div className={styles.tplGroupLabel}>Šifarnik artikala</div>
                <ul className={styles.tplList}>
                  {nameMatches.artikli.map((a, idx) => (
                    <li
                      key={`art-${a.id}`}
                      className={styles.tplItem}
                      style={
                        nameDropHi === idx
                          ? { background: "var(--sage-pale)" }
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className={styles.tplItemPick}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickNameOption(idx);
                        }}
                        title="Ubaci artikal iz šifarnika"
                      >
                        <span className={styles.tplItemName}>{a.naziv}</span>
                        <span className={styles.tplItemMeta}>
                          {a.sifra} · {a.jm.toLowerCase()}
                          {a.tip === "USLUGA" ? " · usluga" : ""}
                          {a.oslobodjenPdv ? " · bez PDV-a" : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {nameMatches.sabloni.length > 0 && (
              <>
                <div className={styles.tplGroupLabel}>Šabloni stavki</div>
                <ul className={styles.tplList}>
                  {nameMatches.sabloni.map((tpl, si) => {
                    const idx = nameMatches.artikli.length + si;
                    return (
                      <li
                        key={`tpl-${tpl.id}`}
                        className={styles.tplItem}
                        style={
                          nameDropHi === idx
                            ? { background: "var(--sage-pale)" }
                            : undefined
                        }
                      >
                        <button
                          type="button"
                          className={styles.tplItemPick}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            pickNameOption(idx);
                          }}
                          title="Primijeni šablon (sa cijenom)"
                        >
                          <span className={styles.tplItemName}>{tpl.name}</span>
                          <span className={styles.tplItemMeta}>
                            {Number(tpl.unitPrice).toFixed(2)} {currencyLabel}{" "}
                            · {tpl.unit || "kom"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <ul className={styles.tplList}>
              <li
                className={styles.tplItem}
                style={
                  nameDropHi === nameDropCount - 1
                    ? { background: "var(--sage-pale)" }
                    : undefined
                }
              >
                <button
                  type="button"
                  className={styles.tplItemPick}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickNameOption(nameDropCount - 1);
                  }}
                  title="Snimi ukucani naziv kao novi artikal u šifarnik"
                >
                  <span className={styles.tplItemName}>
                    + Dodaj &quot;
                    {nameQuery.length > 34
                      ? `${nameQuery.slice(0, 34)}…`
                      : nameQuery}
                    &quot; u šifarnik
                  </span>
                  <span className={styles.tplItemMeta}>
                    novi artikal ili usluga, nudi se i ubuduće
                  </span>
                </button>
              </li>
            </ul>
          </div>,
          document.body,
        )}

      {/* PK Office: novi artikal u šifarnik direktno sa stavke fakture */}
      {isPkOffice && (
        <ArtikalModal
          open={newArtikalForRow !== null}
          orgId={lockedSellerOrgId}
          artikal={null}
          defaultNaziv={
            newArtikalForRow !== null
              ? (items[newArtikalForRow]?.name ?? "")
              : ""
          }
          defaultTip="USLUGA"
          onClose={() => setNewArtikalForRow(null)}
          onSaved={(a) => {
            if (newArtikalForRow !== null) applyArtikal(newArtikalForRow, a);
            setNewArtikalForRow(null);
          }}
        />
      )}

      {/* PK Office: novi partner direktno iz forme fakture */}
      {isPkOffice && (
        <PartnerFormModal
          orgId={lockedSellerOrgId}
          initial={newPartnerInitial}
          onClose={() => setNewPartnerInitial(null)}
          onSaved={(p) => {
            setNewPartnerInitial(null);
            fillBuyerFromPartner(p);
          }}
        />
      )}
    </div>
  );
}
