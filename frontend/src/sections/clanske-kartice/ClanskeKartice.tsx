"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./clanske-kartice.module.css";
import { useRole } from "src/hooks/useRole";
import {
  getOrganizations,
  getClientOrganizations,
  type Organization,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import DateInput from "src/components/DateInput/DateInput";
import { generateKartica } from "./generateKartica";

export default function ClanskeKartice() {
  const { role } = useRole();
  if (role !== "PRO" && role !== "BUSINESS" && role !== "ADMIN") {
    return <Gate role={role} />;
  }
  return <ClanskeKarticeApp />;
}

function Gate({ role }: { role: string | null }) {
  const isLoggedIn = role !== null;
  const title = "Generator članskih kartica je dostupan uz pretplatu";
  const text = isLoggedIn
    ? "Kreirajte članske kartice sa QR kodom za svoju organizaciju. Funkcija je dostupna uz Pro pretplatu (vlastite organizacije) ili Business (i klijentske)."
    : "Kreirajte članske kartice sa QR kodom za svoju organizaciju ili klijente. Registrujte se i pretplatite na Pro ili Business plan.";
  const cta = isLoggedIn ? "Pogledaj pretplate →" : "Registrirajte se besplatno →";
  const href = isLoggedIn ? "/profil#pretplata" : "/registracija";

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Alati</p>
        <h1 className={styles.h1}>
          Generator <em>članskih kartica</em>
        </h1>
        <p className={styles.subtitle}>
          Kreirajte profesionalne članske kartice sa QR kodom — savršene za
          klubove, fitness centre, biblioteke i sve organizacije sa članstvom.
        </p>
      </div>
      <div className={styles.gateCard}>
        <div className={styles.gateIcon}>🔒</div>
        <h2 className={styles.gateTitle}>{title}</h2>
        <p className={styles.gateText}>{text}</p>
        <a href={href} className={styles.btnPrimary}>{cta}</a>
      </div>
    </main>
  );
}

function ClanskeKarticeApp() {
  const { role } = useRole();
  const isBusiness = role === "BUSINESS" || role === "ADMIN";

  const ownOrgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
  });

  const clientOrgsQuery = useQuery({
    queryKey: ["clientOrganizations"],
    queryFn: () => unwrap(getClientOrganizations()),
    enabled: isBusiness,
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

  const allOrgs: Organization[] = useMemo(() => {
    const own = ownOrgsQuery.data ?? [];
    const client = isBusiness ? (clientOrgsQuery.data ?? []) : [];
    return [...own, ...client];
  }, [ownOrgsQuery.data, clientOrgsQuery.data, isBusiness]);

  const selectedOrg = allOrgs.find((o) => o.id === orgId) ?? null;

  // Auto-select first org if only one exists
  useEffect(() => {
    if (orgId === null && allOrgs.length === 1) {
      setOrgId(allOrgs[0].id);
    }
  }, [orgId, allOrgs]);

  // ── Logo upload ────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Odaberite sliku (PNG ili JPG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  // ── Live preview as data URL ──────────────────────────────────────────────
  const [previewUrl, setPreviewUrl] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      const bytes = await generateKartica({
        memberName,
        code: code || "PREVIEW",
        clubName,
        validUntil,
        orgPhone: selectedOrg?.phone ?? "",
        orgEmail: selectedOrg?.email ?? "",
        logoDataUrl,
        accentColor,
      });
      if (cancelled) return;
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [memberName, code, clubName, validUntil, selectedOrg, logoDataUrl, accentColor]);

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!memberName) {
      alert("Unesite ime člana.");
      return;
    }
    if (!code) {
      alert("Unesite kod (broj članstva ili identifikator).");
      return;
    }
    setGenerating(true);
    try {
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
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
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
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </optgroup>
              )}
              {isBusiness && (clientOrgsQuery.data?.length ?? 0) > 0 && (
                <optgroup label="Klijentske organizacije">
                  {clientOrgsQuery.data!.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
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
              placeholder="npr. Pjanić Muhamed"
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
            <p className={styles.hint}>QR kod se generiše iz ovog koda. Skener ga čita pri ulazu/provjeri članstva.</p>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Naziv kluba / programa</span>
            <input
              className={styles.input}
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="npr. Baki klub"
            />
            <p className={styles.hint}>
              Ovaj naziv se ispisuje na kartici (umjesto naziva organizacije).
            </p>
          </label>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Vrijedi do</span>
            <DateInput
              className={styles.input}
              value={validUntil}
              onValueChange={setValidUntil}
            />
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
              className={styles.btnPrimary}
              onClick={handleDownload}
              disabled={generating}
            >
              {generating ? "Generišem…" : "📄 Preuzmi karticu (PDF)"}
            </button>
          </div>
        </section>

        {/* ── Preview ──────────────────────────────────────────────── */}
        <aside className={styles.previewSection}>
          <h2 className={styles.sectionTitle}>
            Pregled <em>kartice</em>
          </h2>
          <div className={styles.previewWrap}>
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className={styles.previewFrame}
                title="Preview kartice"
              />
            ) : (
              <div className={styles.previewPlaceholder}>Učitavam pregled…</div>
            )}
          </div>
          <p className={styles.previewNote}>
            PDF je veličine kreditne kartice (85×55 mm). Pogledaj direktno na
            mobitelu — popunjava cijeli ekran bez bijelog prostora okolo.
          </p>
        </aside>
      </div>
    </main>
  );
}
