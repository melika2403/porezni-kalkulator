"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./clanske-kartice.module.css";
import { useRole } from "src/hooks/useRole";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import {
  getOrganizations,
  getClientOrganizations,
  type Organization,
} from "src/api/profile";
import { me, unwrap } from "src/api/auth";
import {
  listKarticaMembers,
  createKarticaMember,
  updateKarticaMember,
  deleteKarticaMember,
  bulkUpsertKarticaMembers,
  type KarticaMember,
} from "src/api/karticaMembers";
import DateInput from "src/components/DateInput/DateInput";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import { useNotice } from "src/components/Notice/Notice";
import { generateKartica } from "./generateKartica";
import QRCode from "qrcode";

function fmtDatePreview(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}.`;
}

type BulkRow = { name: string; code: string; validUntil?: string };

/** Parse a date string or Date into ISO yyyy-mm-dd. Returns "" if unparseable. */
function parseDateCell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return "";
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  if (!s) return "";
  // ISO yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }
  // dd.mm.yyyy or d.m.yyyy (with optional trailing dot)
  const eu = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (eu) {
    return `${eu[3]}-${eu[2].padStart(2, "0")}-${eu[1].padStart(2, "0")}`;
  }
  // dd/mm/yyyy
  const sl = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (sl) {
    return `${sl[3]}-${sl[2].padStart(2, "0")}-${sl[1].padStart(2, "0")}`;
  }
  // Excel serial number (days since 1899-12-30)
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 0 && n < 200000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      if (!isNaN(d.getTime())) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
      }
    }
  }
  return "";
}

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (c === delim && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  // Auto-detect delimiter on first line: prefer ; if present and , is rare
  const first = lines[0];
  const semi = (first.match(/;/g) ?? []).length;
  const comma = (first.match(/,/g) ?? []).length;
  const delim = semi > comma ? ";" : ",";
  return lines.map((l) => splitCsvLine(l, delim));
}

function aoaToRows(aoa: unknown[][]): BulkRow[] {
  if (aoa.length === 0) return [];
  const headerCells = aoa[0].map((c) =>
    String(c ?? "")
      .toLowerCase()
      .trim(),
  );
  const nameIdx = headerCells.findIndex((c) =>
    /^(ime|naziv|name|prezime|član|clan)/.test(c),
  );
  const codeIdx = headerCells.findIndex((c) =>
    /^(kod|broj|jmbg|šifra|sifra|code|id)/.test(c),
  );
  const dateIdx = headerCells.findIndex((c) =>
    /(vrijedi|važi|vazi|valid|datum|expiry|expires|do)/.test(c),
  );
  let nIdx = 0;
  let cIdx = 1;
  let dIdx = -1;
  let dataRows: unknown[][];
  if (nameIdx !== -1 && codeIdx !== -1) {
    nIdx = nameIdx;
    cIdx = codeIdx;
    dIdx = dateIdx;
    dataRows = aoa.slice(1);
  } else {
    dataRows = aoa;
    // No header detected — if every row has a 3rd column that parses as a
    // date, treat column 2 as date.
    if (aoa.every((r) => r.length >= 3 && parseDateCell(r[2]) !== "")) {
      dIdx = 2;
    }
  }
  const out: BulkRow[] = [];
  for (const row of dataRows) {
    const name = String(row[nIdx] ?? "").trim();
    const code = String(row[cIdx] ?? "").trim();
    const validUntil = dIdx !== -1 ? parseDateCell(row[dIdx]) : "";
    if (name || code) {
      out.push(validUntil ? { name, code, validUntil } : { name, code });
    }
  }
  return out;
}

/**
 * Mirror of generateKartica's auto-shrink logic, expressed in PDF points
 * (242pt card width, 131pt right-column width). Returns font size in pt.
 */
function fitFontSize(
  text: string,
  maxPt: number,
  minPt: number,
  widthPt: number,
): number {
  if (typeof document === "undefined" || !text) return maxPt;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return maxPt;
  let s = maxPt;
  while (s > minPt) {
    ctx.font = `bold ${s}px Arial, sans-serif`;
    if (ctx.measureText(text).width <= widthPt) break;
    s -= 0.5;
  }
  return s;
}

function safeFileName(s: string, fallback: string): string {
  const cleaned = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

export default function ClanskeKartice() {
  return <ClanskeKarticeApp />;
}

function ClanskeKarticeApp() {
  const { role } = useRole();
  const isLoggedIn = !!role;
  const { hasAccessToTier } = useMaxAccessibleTier();
  // BUSINESS feature: prikaz klijent-org-a + bulk upload. Pristup imamo ako bilo
  // koja moja org ima BUSINESS-tier vlasnika, ili sami imamo BUSINESS.
  const isBusiness = hasAccessToTier("BUSINESS");
  const canGenerate = hasAccessToTier("PRO");
  const { notify, confirm: confirmDialog } = useNotice();

  const ownOrgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
    enabled: isLoggedIn,
  });

  const clientOrgsQuery = useQuery({
    queryKey: ["clientOrganizations"],
    queryFn: () => unwrap(getClientOrganizations()),
    enabled: isLoggedIn && isBusiness,
  });

  // Form state
  const [orgId, setOrgId] = useState<number | null>(null);
  const [memberName, setMemberName] = useState("");
  const [code, setCode] = useState("");
  const [clubName, setClubName] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [accentColor, setAccentColor] = useState("#e88a1a");
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  // ── Persisted form prefs (org, club, accent, logo) ────────────────────────
  // Keys are namespaced per user so prefs don't leak across accounts
  // sharing the same browser.
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });
  const userId = meQuery.data?.id ?? null;
  const ORG_KEY = userId ? `kartice.${userId}.lastOrgId` : null;
  const CLUB_KEY = userId ? `kartice.${userId}.clubName` : null;
  const ACCENT_KEY = userId ? `kartice.${userId}.accentColor` : null;
  const LOGO_KEY = userId ? `kartice.${userId}.logoDataUrl` : null;

  // One-time cleanup of legacy global keys (pre-namespacing) so previous
  // user's data on shared browsers can't leak into new accounts.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const legacyKeys = [
      "kartice.lastOrgId",
      "kartice.clubName",
      "kartice.accentColor",
      "kartice.logoDataUrl",
    ];
    legacyKeys.forEach((k) => window.localStorage.removeItem(k));
  }, []);

  // Restore prefs once we know which user we are
  const restoredForUser = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userId || restoredForUser.current === userId) return;
    restoredForUser.current = userId;
    const cn = window.localStorage.getItem(`kartice.${userId}.clubName`);
    setClubName(cn || "");
    const ac = window.localStorage.getItem(`kartice.${userId}.accentColor`);
    setAccentColor(ac || "#e88a1a");
    const lg = window.localStorage.getItem(`kartice.${userId}.logoDataUrl`);
    setLogoDataUrl(lg || "");
  }, [userId]);

  // Persist on change (only after user is loaded)
  useEffect(() => {
    if (typeof window === "undefined" || !CLUB_KEY) return;
    if (clubName) window.localStorage.setItem(CLUB_KEY, clubName);
    else window.localStorage.removeItem(CLUB_KEY);
  }, [clubName, CLUB_KEY]);
  useEffect(() => {
    if (typeof window === "undefined" || !ACCENT_KEY) return;
    window.localStorage.setItem(ACCENT_KEY, accentColor);
  }, [accentColor, ACCENT_KEY]);
  useEffect(() => {
    if (typeof window === "undefined" || !LOGO_KEY) return;
    try {
      if (logoDataUrl) window.localStorage.setItem(LOGO_KEY, logoDataUrl);
      else window.localStorage.removeItem(LOGO_KEY);
    } catch {
      // QuotaExceeded — logo too big, skip silently
    }
  }, [logoDataUrl, LOGO_KEY]);

  // ── Trajanje članstva (preset) — persisted across cards ───────────────────
  const TRAJANJE_KEY = "kartice.trajanjeMonths";
  const REMEMBER_KEY = "kartice.rememberTrajanje";
  const [trajanjeMonths, setTrajanjeMonths] = useState<number | "">("");
  const [rememberTrajanje, setRememberTrajanje] = useState(true);

  const computeValidUntil = (months: number): string => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Restore preset from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const remember = window.localStorage.getItem(REMEMBER_KEY);
    if (remember === "0") {
      setRememberTrajanje(false);
      return;
    }
    const stored = window.localStorage.getItem(TRAJANJE_KEY);
    if (stored) {
      const m = Number(stored);
      if (Number.isFinite(m) && m > 0) {
        setTrajanjeMonths(m);
        setValidUntil(computeValidUntil(m));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrajanjeChange = (val: string) => {
    if (val === "") {
      setTrajanjeMonths("");
      if (rememberTrajanje && typeof window !== "undefined") {
        window.localStorage.removeItem(TRAJANJE_KEY);
      }
      return;
    }
    const m = Number(val);
    setTrajanjeMonths(m);
    setValidUntil(computeValidUntil(m));
    if (rememberTrajanje && typeof window !== "undefined") {
      window.localStorage.setItem(TRAJANJE_KEY, String(m));
    }
  };

  const handleRememberToggle = (checked: boolean) => {
    setRememberTrajanje(checked);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(REMEMBER_KEY, checked ? "1" : "0");
    if (checked && trajanjeMonths !== "") {
      window.localStorage.setItem(TRAJANJE_KEY, String(trajanjeMonths));
    } else if (!checked) {
      window.localStorage.removeItem(TRAJANJE_KEY);
    }
  };

  const allOrgs: Organization[] = useMemo(() => {
    const own = ownOrgsQuery.data ?? [];
    const client = isBusiness ? (clientOrgsQuery.data ?? []) : [];
    return [...own, ...client];
  }, [ownOrgsQuery.data, clientOrgsQuery.data, isBusiness]);

  const selectedOrg = allOrgs.find((o) => o.id === orgId) ?? null;

  // Restore last-selected org from localStorage; fallback to auto-select
  // if only one org exists.
  const [orgRestored, setOrgRestored] = useState(false);
  useEffect(() => {
    if (orgRestored || allOrgs.length === 0 || !ORG_KEY) return;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(ORG_KEY);
      const storedId = stored ? Number(stored) : NaN;
      if (Number.isFinite(storedId) && allOrgs.some((o) => o.id === storedId)) {
        setOrgId(storedId);
        setOrgRestored(true);
        return;
      }
    }
    if (orgId === null && allOrgs.length === 1) {
      setOrgId(allOrgs[0].id);
    }
    setOrgRestored(true);
  }, [allOrgs, orgRestored, orgId, ORG_KEY]);

  // Persist orgId on change
  useEffect(() => {
    if (typeof window === "undefined" || !orgRestored || !ORG_KEY) return;
    if (orgId !== null) window.localStorage.setItem(ORG_KEY, String(orgId));
    else window.localStorage.removeItem(ORG_KEY);
  }, [orgId, orgRestored, ORG_KEY]);

  // ── Members sidebar ────────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const membersQuery = useQuery({
    queryKey: ["karticaMembers", orgId],
    queryFn: async () => {
      const res = await listKarticaMembers(orgId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: isLoggedIn,
  });

  const rawMembers: KarticaMember[] = membersQuery.data ?? [];

  const isExpired = (validUntil: string | null): boolean => {
    if (!validUntil) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(validUntil.slice(0, 10));
    return exp.getTime() < today.getTime();
  };

  type SortKey =
    | "default"
    | "name-asc"
    | "name-desc"
    | "valid-asc"
    | "valid-desc"
    | "created-desc"
    | "created-asc";
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [search, setSearch] = useState("");

  const members: KarticaMember[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? rawMembers.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.code.toLowerCase().includes(q),
        )
      : [...rawMembers];

    const cmpDate = (a: string | null, b: string | null) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    };

    switch (sortKey) {
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name, "hr"));
        break;
      case "name-desc":
        list.sort((a, b) => b.name.localeCompare(a.name, "hr"));
        break;
      case "valid-asc":
        list.sort((a, b) => cmpDate(a.validUntil, b.validUntil));
        break;
      case "valid-desc":
        list.sort((a, b) => cmpDate(b.validUntil, a.validUntil));
        break;
      case "created-desc":
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "created-asc":
        list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "default":
      default:
        // Backend returns createdAt ASC; push expired to bottom
        const active = list.filter((m) => !isExpired(m.validUntil));
        const expired = list.filter((m) => isExpired(m.validUntil));
        list = [...active, ...expired];
        break;
    }
    return list;
  }, [rawMembers, sortKey, search]);

  // Reset selected member when organization changes
  useEffect(() => {
    setSelectedMemberId(null);
    setConfirmDeleteId(null);
  }, [orgId]);

  const handleSelectMember = (m: KarticaMember) => {
    setSelectedMemberId(m.id);
    setMemberName(m.name);
    setCode(m.code);
    if (m.clubName) setClubName(m.clubName);
    if (m.validUntil) {
      setValidUntil(m.validUntil.slice(0, 10));
      setTrajanjeMonths("");
    }
  };

  const handleNewMember = () => {
    setSelectedMemberId(null);
    setMemberName("");
    setCode("");
    setConfirmDeleteId(null);
  };

  const handleRenewMember = async (m: KarticaMember) => {
    const months =
      typeof trajanjeMonths === "number" && trajanjeMonths > 0
        ? trajanjeMonths
        : 12;
    const newValidUntil = computeValidUntil(months);
    const res = await updateKarticaMember(m.id, { validUntil: newValidUntil });
    if (!res.ok) {
      notify(`Greška pri produženju: ${res.error}`, "error");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["karticaMembers", orgId] });
    // Regenerate and auto-download new PDF
    try {
      const bytes = await generateKartica({
        memberName: m.name,
        code: m.code,
        clubName: m.clubName ?? clubName,
        validUntil: newValidUntil,
        orgPhone: selectedOrg?.phone ?? "",
        orgEmail: selectedOrg?.email ?? "",
        logoDataUrl,
        accentColor,
      });
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Kartica_${safeFileName(m.name, `clan_${m.id}`)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Renew PDF failed:", e);
    }
  };

  const handleDeleteMember = async (id: number) => {
    const res = await deleteKarticaMember(id);
    if (!res.ok) {
      notify(`Greška pri brisanju: ${res.error}`, "error");
      return;
    }
    if (selectedMemberId === id) handleNewMember();
    setConfirmDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ["karticaMembers", orgId] });
  };

  /** Save (create or update) the currently-edited member; returns saved row or null. */
  const saveCurrentMember = async (): Promise<KarticaMember | null> => {
    if (!memberName.trim() || !code.trim()) return null;
    const payload = {
      name: memberName.trim(),
      code: code.trim(),
      clubName: clubName.trim() || null,
      validUntil: validUntil || null,
      organizationId: orgId,
    };
    const res = selectedMemberId
      ? await updateKarticaMember(selectedMemberId, payload)
      : await createKarticaMember(payload);
    if (!res.ok) {
      console.error("Save member failed:", res.error);
      return null;
    }
    setSelectedMemberId(res.data.id);
    queryClient.invalidateQueries({ queryKey: ["karticaMembers", orgId] });
    return res.data;
  };

  // ── Logo upload ────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      notify("Odaberite sliku (PNG ili JPG).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  // ── Auto-shrink font sizes for preview (mirrors PDF logic) ───────────────
  // Card is 242pt wide; right column for name/club is 131pt.
  const memberFontPt = useMemo(
    () => fitFontSize(memberName || "—", 16, 10, 131),
    [memberName],
  );
  const clubFontPt = useMemo(
    () => fitFontSize(clubName || "Klub", 18, 12, 131),
    [clubName],
  );
  // Convert pt → cqw (% of 242pt card width)
  const memberFontCqw = `${(memberFontPt / 242) * 100}cqw`;
  const clubFontCqw = `${(clubFontPt / 242) * 100}cqw`;

  // ── Live QR for preview ───────────────────────────────────────────────────
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await QRCode.toDataURL(code || "PREVIEW", {
          margin: 0,
          width: 256,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // ── Bulk import ────────────────────────────────────────────────────────────
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkError, setBulkError] = useState<string>("");
  const [bulkFileName, setBulkFileName] = useState<string>("");
  const [bulkProgress, setBulkProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const handleBulkFile = async (file: File) => {
    setBulkError("");
    setBulkRows([]);
    setBulkFileName(file.name);
    try {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      let aoa: unknown[][] = [];
      if (ext === "csv" || ext === "txt") {
        const text = await file.text();
        aoa = parseCsv(text);
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          blankrows: false,
          raw: true,
        }) as unknown[][];
      } else {
        setBulkError("Format nije podržan. Koristi .xlsx, .xls ili .csv.");
        return;
      }
      const rows = aoaToRows(aoa);
      if (rows.length === 0) {
        setBulkError(
          "Fajl je prazan ili nema validnih redova. Treba bar dvije kolone: ime i kod.",
        );
        return;
      }
      setBulkRows(rows);
    } catch (e) {
      setBulkError(`Greška pri čitanju fajla: ${(e as Error).message}`);
    }
  };

  const handleBulkClear = () => {
    setBulkRows([]);
    setBulkError("");
    setBulkFileName("");
    if (bulkFileRef.current) bulkFileRef.current.value = "";
  };

  const handleBulkGenerate = async () => {
    if (!canGenerate) return;
    if (bulkRows.length === 0) return;
    const missing = bulkRows.filter((r) => !r.name || !r.code).length;
    if (missing > 0) {
      const ok = await confirmDialog(
        `${missing} redova nema popunjeno ime ili kod — biti će preskočeni. Nastaviti?`,
      );
      if (!ok) return;
    }
    setGenerating(true);
    setBulkProgress({ done: 0, total: bulkRows.length });
    try {
      // Auto-save all rows to members list (upsert by org+code)
      const validRows = bulkRows.filter((r) => r.name && r.code);
      if (validRows.length > 0) {
        const saveRes = await bulkUpsertKarticaMembers({
          organizationId: orgId,
          clubName: clubName.trim() || null,
          items: validRows.map((r) => ({
            name: r.name,
            code: r.code,
            validUntil: r.validUntil || validUntil || null,
          })),
        });
        if (saveRes.ok) {
          queryClient.invalidateQueries({
            queryKey: ["karticaMembers", orgId],
          });
        } else {
          console.error("Bulk save failed:", saveRes.error);
        }
      }
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const usedNames = new Set<string>();
      for (let i = 0; i < bulkRows.length; i++) {
        const row = bulkRows[i];
        if (!row.name || !row.code) {
          setBulkProgress({ done: i + 1, total: bulkRows.length });
          continue;
        }
        const bytes = await generateKartica({
          memberName: row.name,
          code: row.code,
          clubName,
          validUntil: row.validUntil || validUntil,
          orgPhone: selectedOrg?.phone ?? "",
          orgEmail: selectedOrg?.email ?? "",
          logoDataUrl,
          accentColor,
        });
        let fname = `Kartica_${safeFileName(row.name, `clan_${i + 1}`)}.pdf`;
        if (usedNames.has(fname)) {
          fname = fname.replace(/\.pdf$/, `_${i + 1}.pdf`);
        }
        usedNames.add(fname);
        zip.file(fname, bytes);
        setBulkProgress({ done: i + 1, total: bulkRows.length });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const orgSafe = safeFileName(
        selectedOrg?.name || clubName || "Kartice",
        "Kartice",
      );
      a.download = `Kartice_${orgSafe}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
      setBulkProgress(null);
    }
  };

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!canGenerate) return;
    if (!memberName) {
      notify("Unesite ime člana.", "error");
      return;
    }
    if (!code) {
      notify("Unesite kod (broj članstva ili identifikator).", "error");
      return;
    }
    setGenerating(true);
    try {
      // Auto-save member to sidebar list
      await saveCurrentMember();
      const bytes = await generateKartica({
        memberName,
        code,
        clubName,
        validUntil,
        orgPhone: selectedOrg?.phone ?? "",
        orgEmail: selectedOrg?.email ?? "",
        logoDataUrl,
        accentColor,
      });
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = memberName.replace(/\s+/g, "_");
      a.download = `Kartica_${safeName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Alati</p>
        <h1 className={styles.h1}>
          Generator <em>članskih kartica</em>
        </h1>
        <p className={styles.subtitle}>
          Kreirajte profesionalne članske kartice sa QR kodom za svoju
          organizaciju ili klijente. Kartica je veličine kreditne kartice —
          spremna za štampanje ili pokazivanje na mobitelu.
        </p>
      </div>

      <div className={styles.pageLayout}>
        {/* ── Sidebar: Lista članova ────────────────────────────────── */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>Članovi</div>
          <div className={styles.sidebarControls}>
            <input
              type="text"
              className={styles.sidebarSearch}
              placeholder="🔍 Pretraži…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={styles.sidebarSort}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              title="Sortiraj"
            >
              <option value="default">Redoslijed dodavanja (zadano)</option>
              <option value="name-asc">Ime A–Ž</option>
              <option value="name-desc">Ime Ž–A</option>
              <option value="valid-asc">Vrijedi do — najbliže</option>
              <option value="valid-desc">Vrijedi do — najdalje</option>
              <option value="created-desc">Učlanjeni — najnoviji</option>
              <option value="created-asc">Učlanjeni — najstariji</option>
            </select>
          </div>
          <div className={styles.sidebarList}>
            {membersQuery.isLoading ? (
              <div className={styles.sidebarEmpty}>Učitavam…</div>
            ) : members.length === 0 ? (
              <div className={styles.sidebarEmpty}>
                {orgId
                  ? "Nema spremljenih članova za ovu organizaciju."
                  : "Odaberi organizaciju ili dodaj prvog člana."}
              </div>
            ) : (
              members.map((m) => {
                const isActive = selectedMemberId === m.id;
                const isConfirming = confirmDeleteId === m.id;
                const expired = isExpired(m.validUntil);
                return (
                  <div
                    key={m.id}
                    className={`${styles.sidebarItemWrap}${expired ? ` ${styles.sidebarItemExpired}` : ""}`}
                  >
                    <button
                      type="button"
                      className={`${styles.sidebarItem}${isActive ? ` ${styles.sidebarItemActive}` : ""}`}
                      onClick={() => handleSelectMember(m)}
                    >
                      <span
                        className={`${styles.sidebarDot}${expired ? ` ${styles.sidebarDotExpired}` : ""}`}
                      />
                      <span className={styles.sidebarName}>{m.name}</span>
                      {expired && (
                        <span className={styles.sidebarBadgeExpired}>
                          Isteklo
                        </span>
                      )}
                      <span className={styles.sidebarCode}>{m.code}</span>
                    </button>
                    {isConfirming ? (
                      <div className={styles.sidebarConfirm}>
                        <button
                          type="button"
                          className={styles.sidebarConfirmYes}
                          onClick={() => handleDeleteMember(m.id)}
                          title="Potvrdi brisanje"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          className={styles.sidebarConfirmNo}
                          onClick={() => setConfirmDeleteId(null)}
                          title="Odustani"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        {expired && (
                          <button
                            type="button"
                            className={styles.sidebarRenew}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenewMember(m);
                            }}
                            title="Produži članstvo i preuzmi novu karticu"
                          >
                            ↻
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.sidebarDelete}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(m.id);
                          }}
                          title="Obriši člana"
                        >
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className={styles.sidebarAddRow}>
            <button
              type="button"
              className={styles.sidebarAddBtn}
              onClick={async () => {
                if (!memberName.trim() || !code.trim()) {
                  notify("Popuni ime i kod prije dodavanja u listu.", "error");
                  return;
                }
                const saved = await saveCurrentMember();
                if (saved) handleNewMember();
              }}
              title="Spremi trenutno popunjenog člana u listu"
            >
              + Dodaj u listu
            </button>
            <button
              type="button"
              className={styles.sidebarNewBtn}
              onClick={handleNewMember}
              title="Isprazni formu za novog člana"
            >
              Novi
            </button>
          </div>
        </aside>

        <div className={styles.pageContent}>
          <div className={styles.layout}>
            {/* ── Form ─────────────────────────────────────────────────── */}
            <section className={styles.formSection}>
              <h2 className={styles.sectionTitle}>
                Podaci <em>kartice</em>
              </h2>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Organizacija</span>
                <select
                  className={styles.input}
                  value={orgId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    setOrgId(id);
                  }}
                >
                  <option value="">— Odaberite organizaciju —</option>
                  {(ownOrgsQuery.data?.length ?? 0) > 0 && (
                    <optgroup label="Moje organizacije">
                      {ownOrgsQuery.data!.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {isBusiness && (clientOrgsQuery.data?.length ?? 0) > 0 && (
                    <optgroup label="Klijentske organizacije">
                      {clientOrgsQuery.data!.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ime člana</span>
                <input
                  className={styles.input}
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="npr. Ime Prezime"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Kod / broj članstva</span>
                <input
                  className={styles.input}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="npr. 12345 ili JMBG"
                />
                <p className={styles.hint}>
                  QR kod se generiše iz ovog koda. Skener ga čita pri
                  ulazu/provjeri članstva.
                </p>
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Naziv kluba / programa
                </span>
                <input
                  className={styles.input}
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="npr. Naziv kluba"
                />
                <p className={styles.hint}>
                  Ovaj naziv se ispisuje na kartici (umjesto naziva
                  organizacije).
                </p>
              </label>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Vrijedi do</span>
                <div className={styles.trajanjeRow}>
                  <select
                    className={styles.input}
                    value={trajanjeMonths === "" ? "" : String(trajanjeMonths)}
                    onChange={(e) => handleTrajanjeChange(e.target.value)}
                    style={{ flex: "0 0 160px" }}
                  >
                    <option value="">Ručni unos →</option>
                    <option value="6">6 mjeseci</option>
                    <option value="12">1 godina</option>
                    <option value="24">2 godine</option>
                    <option value="36">3 godine</option>
                    <option value="48">4 godine</option>
                    <option value="60">5 godina</option>
                    <option value="72">6 godina</option>
                    <option value="84">7 godina</option>
                    <option value="96">8 godina</option>
                    <option value="108">9 godina</option>
                    <option value="120">10 godina</option>
                  </select>
                  <DateInput
                    className={styles.input}
                    value={validUntil}
                    onValueChange={(v) => {
                      setValidUntil(v);
                      setTrajanjeMonths("");
                    }}
                  />
                </div>
                <label className={styles.rememberRow}>
                  <input
                    type="checkbox"
                    checked={rememberTrajanje}
                    onChange={(e) => handleRememberToggle(e.target.checked)}
                  />
                  <span>Zapamti trajanje za sljedeće kartice</span>
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Boja kluba (akcent)</span>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                />
              </label>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Logo (opciono)</span>
                <div className={styles.logoUpload}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(f);
                    }}
                  />
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoDataUrl ? "Promijeni logo" : "Upload logo (PNG/JPG)"}
                  </button>
                  {logoDataUrl && (
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => setLogoDataUrl("")}
                    >
                      Ukloni
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={async () => {
                    if (!memberName.trim() || !code.trim()) {
                      notify("Popuni ime i kod prije spremanja.", "error");
                      return;
                    }
                    const saved = await saveCurrentMember();
                    if (!saved) notify("Greška pri spremanju člana.", "error");
                  }}
                  disabled={generating}
                  title="Spremi člana u listu bez preuzimanja PDF-a"
                >
                  💾 Spremi
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleDownload}
                  disabled={generating || !canGenerate}
                  title={
                    canGenerate
                      ? undefined
                      : "Dostupno uz Pro ili Business pretplatu"
                  }
                >
                  {generating ? "Generišem…" : "📄 Preuzmi karticu (PDF)"}
                </button>
              </div>
              {!canGenerate && (
                <GeneratePaywall
                  tier="PRO"
                  what="Preuzimanje članske kartice"
                />
              )}
            </section>

            {/* ── Preview ──────────────────────────────────────────────── */}
            <aside className={styles.previewSection}>
              <h2 className={styles.sectionTitle}>
                Pregled <em>kartice</em>
              </h2>
              <div className={styles.previewWrap}>
                <div className={styles.cardPreview}>
                  <div className={styles.cardLeft}>
                    {logoDataUrl ? (
                      <img
                        src={logoDataUrl}
                        alt="logo"
                        className={styles.cardLogo}
                      />
                    ) : (
                      <div className={styles.cardLogoPlaceholder} />
                    )}
                    <div className={styles.cardContact}>
                      {selectedOrg?.phone && (
                        <div>tel: {selectedOrg.phone}</div>
                      )}
                      {selectedOrg?.email && <div>{selectedOrg.email}</div>}
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    {qrDataUrl && (
                      <img src={qrDataUrl} alt="QR" className={styles.cardQr} />
                    )}
                    <div
                      className={styles.cardMember}
                      style={{ fontSize: memberFontCqw }}
                    >
                      {memberName || "—"}
                    </div>
                    <div
                      className={styles.cardClub}
                      style={{ color: accentColor, fontSize: clubFontCqw }}
                    >
                      {clubName || "Klub"}
                    </div>
                  </div>
                  <div className={styles.cardValid}>
                    Vrijedi do: {fmtDatePreview(validUntil)}
                  </div>
                </div>
              </div>
              <p className={styles.previewNote}>
                PDF je veličine kreditne kartice (85×55 mm). Pogledaj direktno
                na mobitelu — popunjava cijeli ekran bez bijelog prostora okolo.
              </p>
            </aside>
          </div>

          {/* ── Bulk import ──────────────────────────────────────────────── */}
          <section className={styles.bulkSection}>
            <h2 className={styles.sectionTitle}>
              Bulk uvoz <em>iz Excel/CSV-a</em>
            </h2>
            <div className={styles.bulkHint}>
              <p>
                Uvezi listu članova iz <strong>.xlsx</strong>,{" "}
                <strong>.xls</strong> ili <strong>.csv</strong> fajla. Klub,
                logo i boja se uzimaju iz forme iznad — sve kartice se pakuju u
                jedan ZIP.
              </p>
              <p>
                <strong>Kolone</strong> (prvi red = naslovi, ne razlikuje
                velika/mala slova):
              </p>
              <ul className={styles.bulkList}>
                <li>
                  <strong>Ime</strong> (obavezno) — naslov počinje sa:{" "}
                  <code>ime</code>, <code>naziv</code>, <code>prezime</code>,{" "}
                  <code>član</code>/<code>clan</code>, <code>name</code>
                </li>
                <li>
                  <strong>Kod</strong> (obavezno) — naslov počinje sa:{" "}
                  <code>kod</code>, <code>broj</code>, <code>jmbg</code>,{" "}
                  <code>šifra</code>/<code>sifra</code>, <code>id</code>,{" "}
                  <code>code</code>
                </li>
                <li>
                  <strong>Vrijedi do</strong> (opciono) — naslov sadrži:{" "}
                  <code>vrijedi</code>, <code>važi</code>/<code>vazi</code>,{" "}
                  <code>datum</code>, <code>do</code>, <code>valid</code>,{" "}
                  <code>expiry</code>. Formati: <code>31.12.2027</code>,{" "}
                  <code>2027-12-31</code> ili Excel datum. Ako član ima vlastiti
                  datum, on se koristi; inače "Vrijedi do" iz forme.
                </li>
              </ul>
              <p>
                <strong>Bez naslova?</strong> Aplikacija uzima 1. kolonu kao
                ime, 2. kao kod, 3. kao datum (samo ako svi redovi imaju validan
                datum).
              </p>
            </div>

            <div className={styles.bulkActions}>
              <input
                ref={bulkFileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleBulkFile(f);
                }}
              />
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => bulkFileRef.current?.click()}
                disabled={generating}
              >
                {bulkFileName ? `📎 ${bulkFileName}` : "📂 Odaberi fajl"}
              </button>
              {bulkRows.length > 0 && (
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={handleBulkClear}
                  disabled={generating}
                >
                  Ukloni
                </button>
              )}
              <span className={styles.bulkCount}>
                {bulkRows.length > 0 && `${bulkRows.length} članova učitano`}
              </span>
            </div>

            {bulkError && <p className={styles.bulkError}>{bulkError}</p>}

            {bulkRows.length > 0 && (
              <>
                <div className={styles.bulkTableWrap}>
                  <table className={styles.bulkTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Ime</th>
                        <th>Kod</th>
                        <th>Vrijedi do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.slice(0, 50).map((r, i) => (
                        <tr
                          key={i}
                          className={
                            !r.name || !r.code
                              ? styles.bulkRowInvalid
                              : undefined
                          }
                        >
                          <td>{i + 1}</td>
                          <td>{r.name || <em>—</em>}</td>
                          <td>{r.code || <em>—</em>}</td>
                          <td>
                            {r.validUntil ? (
                              fmtDatePreview(r.validUntil)
                            ) : (
                              <span className={styles.bulkFallback}>
                                {validUntil ? fmtDatePreview(validUntil) : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bulkRows.length > 50 && (
                    <p className={styles.bulkMore}>
                      …i još {bulkRows.length - 50} članova (svi će biti
                      generisani).
                    </p>
                  )}
                </div>

                {!canGenerate && (
                  <GeneratePaywall tier="PRO" what="Bulk generisanje kartica" />
                )}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleBulkGenerate}
                    disabled={generating || !canGenerate}
                    title={
                      canGenerate
                        ? undefined
                        : "Dostupno uz Pro ili Business pretplatu"
                    }
                  >
                    {bulkProgress
                      ? `Generišem… ${bulkProgress.done}/${bulkProgress.total}`
                      : `📦 Generiši i preuzmi ZIP (${bulkRows.length} kartica)`}
                  </button>
                </div>
              </>
            )}
          </section>

          {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
          <section
            className={styles.formSection}
            style={{ marginTop: "1.5rem" }}
          >
            <h2 className={styles.sectionTitle}>
              Šta su <em>članske kartice</em> sa QR kodom?
            </h2>
            <p style={{ fontSize: "14.5px", lineHeight: 1.65 }}>
              <strong>Članska kartica sa QR kodom</strong> je digitalna ili
              štampana kartica veličine kreditne kartice (85,6 × 54 mm) koja
              sadrži ime člana, kod, datum važenja i QR kod za brzu
              identifikaciju. Skeniranjem QR koda kasir ili kontrolor odmah
              dobija podatke o članu — bez ručnog traženja u sistemu.
            </p>
            <p
              style={{
                fontSize: "14.5px",
                lineHeight: 1.65,
                marginTop: "0.85rem",
              }}
            >
              Pogodno je za:
            </p>
            <ul
              style={{
                marginTop: "0.5rem",
                paddingLeft: "1.25rem",
                lineHeight: 1.7,
                fontSize: "14.5px",
              }}
            >
              <li>fitness centre i teretane,</li>
              <li>sportske klubove i udruženja,</li>
              <li>biblioteke i obrazovne ustanove,</li>
              <li>profesionalne komore i nevladine organizacije,</li>
              <li>klubove, kafiće i lojalty programe.</li>
            </ul>
          </section>

          <section
            className={styles.formSection}
            style={{ marginTop: "1.5rem" }}
          >
            <h2 className={styles.sectionTitle}>
              Kako <em>generisati</em> kartice u 3 koraka
            </h2>
            <ol
              style={{
                marginTop: "0.5rem",
                paddingLeft: "1.25rem",
                lineHeight: 1.7,
                fontSize: "14.5px",
              }}
            >
              <li>
                <strong>Unesite podatke o organizaciji</strong> — naziv
                kluba/firme, logo, boja naslova, kontakt podaci. Ti podaci
                pojavljuju se na svim karticama.
              </li>
              <li>
                <strong>
                  Dodajte članove pojedinačno ili putem bulk uvoza
                </strong>{" "}
                — iz Excel-a ili CSV fajla. Svaki član ima ime, jedinstveni kod
                i datum važenja članstva.
              </li>
              <li>
                <strong>Preuzmite PDF kartica ili ZIP arhivu</strong> —
                pojedinačno ili sve odjednom za štampanje. Štampajte na PVC
                kartice ili obični papir.
              </li>
            </ol>
          </section>

          <section
            className={styles.formSection}
            style={{ marginTop: "1.5rem" }}
          >
            <h2 className={styles.sectionTitle}>
              QR kod i <em>verifikacija članstva</em>
            </h2>
            <p style={{ fontSize: "14.5px", lineHeight: 1.65 }}>
              QR kod na kartici sadrži jedinstveni identifikator člana — kod ili
              URL koji vodi na profil člana. Mobilni telefon ili poseban skener
              očita podatke u sekundi.
            </p>
            <p
              style={{
                fontSize: "14.5px",
                lineHeight: 1.65,
                marginTop: "0.85rem",
              }}
            >
              QR kod možete koristiti i za:
            </p>
            <ul
              style={{
                marginTop: "0.5rem",
                paddingLeft: "1.25rem",
                lineHeight: 1.7,
                fontSize: "14.5px",
              }}
            >
              <li>kontrolu pristupa (npr. ulazak u teretanu),</li>
              <li>evidenciju dolazaka i prisustva,</li>
              <li>verifikaciju statusa članstva i datuma važenja,</li>
              <li>lojalty bodove i popuste.</li>
            </ul>
          </section>

          <section
            className={styles.formSection}
            style={{ marginTop: "1.5rem" }}
          >
            <h2 className={styles.sectionTitle}>
              Povezani <em>alati</em>
            </h2>
            <ul
              style={{
                marginTop: "0.5rem",
                paddingLeft: "1.25rem",
                lineHeight: 1.9,
                fontSize: "14.5px",
              }}
            >
              <li>
                <a
                  href="/fakture"
                  style={{
                    color: "var(--sage)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Fakture i računi
                </a>{" "}
                — fakturišite članarine i ostale usluge organizacije.
              </li>
              <li>
                <a
                  href="/prijave-radnika?tab=obracun"
                  style={{
                    color: "var(--sage)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Obračun plata
                </a>{" "}
                — ako vaša organizacija ima radnike.
              </li>
              <li>
                <a
                  href="/pretplate"
                  style={{
                    color: "var(--sage)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Pretplata
                </a>{" "}
                — generator članskih kartica dostupan je uz Pro pretplatu.
              </li>
            </ul>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────────────── */}
          <section className={styles.faqSection}>
            <h2 className={styles.sectionTitle}>
              Često postavljana <em>pitanja</em>
            </h2>

            <details className={styles.faqItem}>
              <summary>U kojem formatu treba biti fajl za uvoz?</summary>
              <p>
                Excel (<code>.xlsx</code>, <code>.xls</code>) ili CSV (
                <code>.csv</code>). CSV može koristiti zarez <code>,</code> ili
                tačku-zarez <code>;</code> kao razdvojnik — auto-detektuje se.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary>Koliko kartica mogu generisati odjednom?</summary>
              <p>
                Praktično nema limita — testirano sa 200+ članova. Što je veća
                lista, generisanje traje duže (orijentaciono ~50 kartica/sec,
                ovisi o uređaju). Tokom generisanja vidiš progres (npr.{" "}
                <em>Generišem… 47/200</em>).
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary>Šta ako neki član ima drugačiji datum isteka?</summary>
              <p>
                Dodaj kolonu <em>vrijedi do</em> u Excel/CSV. Za članove kojima
                je ćelija prazna, koristi se "Vrijedi do" iz forme iznad. Za one
                kojima je popunjeno — koristi se njihov vlastiti datum.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary>
                Mogu li koristiti ćirilicu ili dijakritičke znakove?
              </summary>
              <p>
                U podacima na kartici (ime, klub) — da, podržano je. U nazivima
                fajlova u ZIP-u — dijakritika se transliterira (Š → S, ć → c)
                zbog kompatibilnosti sa svim sistemima.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary>QR kod ne radi pri skeniranju — šta provjeriti?</summary>
              <p>
                Provjeri da je kod (broj članstva) unesen — prazan kod znači
                placeholder. Pri štampi koristi minimum 300 DPI; pri prikazu na
                mobitelu osvjetli ekran. Za jako duge kodove (preko 100 znakova)
                QR postaje gust — koristi kraći identifikator.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary>
                Kako da kartica ima isti izgled kao u preview-u?
              </summary>
              <p>
                Već ima — pregled je tačno isti raspored kao i finalni PDF (ista
                veličina kreditne kartice 85×55 mm, iste pozicije logoa, QR-a,
                imena i datuma).
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary>Mogu li promijeniti boju klub naslova?</summary>
              <p>
                Da — u formi izaberi "Boja kluba (akcent)". Ta boja se
                primjenjuje i na pojedinačnu i na bulk generaciju (svi članovi
                dobiju isti akcent).
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary>Šta ako mi ne prepoznaje kolone u Excel-u?</summary>
              <p>
                Provjeri da je prvi red naslov i da koristi neku od prepoznatih
                riječi (vidi listu iznad). Alternativa: skini header i stavi ime
                u 1. kolonu, kod u 2., datum u 3. — automatski će se uzeti tim
                redoslijedom.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary>Da li se podaci o članovima čuvaju negdje?</summary>
              <p>
                Lista članova (ime, kod, datum istjeka) se sprema na tvoj nalog
                — automatski pri svakom generisanju kartice ili ZIP-a. Možeš ih
                kasnije pristupiti sa bilo kojeg uređaja iz iste sekcije. Sama
                obrada PDF-a (parsiranje fajla, generisanje, ZIP-anje) dešava se
                u browseru — fajl ne napušta tvoj uređaj.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary>Kako da uklonim člana sa liste?</summary>
              <p>
                U lijevoj bočnoj traci klikni ikonicu kante (<em>🗑</em>) pored
                imena, pa potvrdi (✓). Brisanjem člana ne briše se PDF kartice
                koju si već preuzeo — samo unos sa liste.
              </p>
            </details>

            <details className={styles.faqItem}>
              <summary>Šta ako uvezem isti CSV/Excel dva puta?</summary>
              <p>
                Ne dolazi do duplikata. Bulk uvoz radi <em>upsert</em> po paru
                organizacija + kod — članovi sa istim kodom se ažuriraju (novo
                ime, novi datum), a novi se dodaju.
              </p>
            </details>
          </section>
        </div>
      </div>
    </main>
  );
}
