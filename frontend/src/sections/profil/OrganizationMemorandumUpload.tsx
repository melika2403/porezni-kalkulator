"use client";

// Memorandum klijenta (slika zaglavlja) za platne liste: kad je postavljen,
// štampa se preko cijele širine vrha platne liste UMJESTO standardnog
// zaglavlja (naziv, adresa, ID broj). Postavka po organizaciji; isti mehanizam
// kao logo za fakture (OrganizationLogoUpload), zaseban fajl i kolona.
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  uploadOrganizationMemorandum,
  removeOrganizationMemorandum,
  backendUrl,
} from "src/api/invoices";

type Props = {
  orgId: number;
  memorandumUrl: string | null;
};

export default function OrganizationMemorandumUpload({
  orgId,
  memorandumUrl,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const qc = useQueryClient();

  async function handleFile(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const res = await uploadOrganizationMemorandum(orgId, file);
      if (!res.ok) {
        // Sirovi kodovi se prevode: korisnik treba znati šta da uradi.
        const poruke: Record<string, string> = {
          INVALID_IMAGE_TYPE: "Dozvoljeni formati su PNG i JPG.",
          IMAGE_TOO_LARGE:
            "Slika je prevelika (maks. 4000 x 2000 piksela). Smanjite je pa pokušajte ponovo.",
          UPLOAD_ERROR:
            "Fajl nije otpremljen. Provjerite da nije veći od 3 MB i da je PNG ili JPG.",
          NETWORK_ERROR: "Nema veze sa serverom, pokušajte ponovo.",
          FORBIDDEN: "Nemate pravo da mijenjate ovu organizaciju.",
        };
        setErr(poruke[res.error ?? ""] ?? "Greška pri otpremanju, pokušajte ponovo.");
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
      const res = await removeOrganizationMemorandum(orgId);
      if (!res.ok) {
        setErr(res.error || "Greška pri brisanju.");
        return;
      }
      qc.invalidateQueries({ queryKey: ["organizations"] });
    } finally {
      setBusy(false);
    }
  }

  const fullUrl = memorandumUrl ? `${backendUrl()}${memorandumUrl}` : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.75rem 0",
        borderTop: "1px solid var(--border, #e5e1d8)",
        marginTop: ".5rem",
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--mid)", minWidth: 60 }}>
        Memorandum
      </div>
      {fullUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fullUrl}
          alt="Memorandum"
          style={{
            height: 48,
            maxWidth: 260,
            width: "auto",
            objectFit: "contain",
            borderRadius: 6,
            border: "1px solid var(--border, #e5e1d8)",
            background: "#fff",
          }}
        />
      ) : (
        <span style={{ fontSize: 12, color: "var(--mid)", fontStyle: "italic" }}>
          nije postavljen
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
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
        {busy ? "Snimam…" : fullUrl ? "Promijeni" : "Otpremi memorandum"}
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
        Slika zaglavlja memoranduma (PNG/JPG, maks. 3 MB, preporuka bar 1500 px
        širine). Štampa se na vrhu platne liste umjesto standardnog zaglavlja;
        bez memoranduma platna lista izgleda kao do sada.
      </div>
    </div>
  );
}
