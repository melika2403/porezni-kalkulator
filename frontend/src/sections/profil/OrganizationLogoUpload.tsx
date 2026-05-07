"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  uploadOrganizationLogo,
  removeOrganizationLogo,
  backendUrl,
} from "src/api/invoices";

type Props = {
  orgId: number;
  logoUrl: string | null;
};

export default function OrganizationLogoUpload({ orgId, logoUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const qc = useQueryClient();

  async function handleFile(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const res = await uploadOrganizationLogo(orgId, file);
      if (!res.ok) {
        if (res.error === "INVALID_IMAGE_TYPE") setErr("Dozvoljeni formati: PNG, JPG, WEBP.");
        else setErr(res.error || "Greška pri uploadu.");
        return;
      }
      qc.invalidateQueries({ queryKey: ["organizations"] });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setErr(null);
    setBusy(true);
    try {
      const res = await removeOrganizationLogo(orgId);
      if (!res.ok) {
        setErr(res.error || "Greška pri brisanju.");
        return;
      }
      qc.invalidateQueries({ queryKey: ["organizations"] });
    } finally {
      setBusy(false);
    }
  }

  const fullUrl = logoUrl ? `${backendUrl()}${logoUrl}` : null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      padding: "0.75rem 0",
      borderTop: "1px solid var(--border, #e5e1d8)",
      marginTop: ".5rem",
      flexWrap: "wrap",
    }}>
      <div style={{ fontSize: 12, color: "var(--mid)", minWidth: 60 }}>Logo</div>
      {fullUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fullUrl}
          alt="Logo"
          style={{ height: 48, width: "auto", borderRadius: 6, border: "1px solid var(--border, #e5e1d8)", background: "#fff" }}
        />
      ) : (
        <span style={{ fontSize: 12, color: "var(--mid)", fontStyle: "italic" }}>nije postavljen</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{
          fontSize: 12,
          padding: "0.4rem 0.8rem",
          borderRadius: 6,
          border: "1px solid var(--border, #e5e1d8)",
          background: "#fff",
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Snimam…" : fullUrl ? "Promijeni" : "Otpremi logo"}
      </button>
      {fullUrl && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={busy}
          style={{
            fontSize: 12,
            padding: "0.4rem 0.8rem",
            borderRadius: 6,
            border: "1px solid #e0c2c2",
            background: "transparent",
            color: "#c44",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          Ukloni
        </button>
      )}
      {err && <div style={{ fontSize: 12, color: "#c44" }}>{err}</div>}
      <div style={{ flexBasis: "100%", fontSize: 11, color: "var(--mid)" }}>
        Maks. 2 MB. PNG / JPG / WEBP. Logo se prikazuje na fakturama i predračunima.
      </div>
    </div>
  );
}
