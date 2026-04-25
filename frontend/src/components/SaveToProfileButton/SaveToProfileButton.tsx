"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { saveDocument, type DocumentType } from "src/api/documents";
import styles from "./saveToProfileButton.module.css";

type Props = {
  type: DocumentType;
  year: number | null;
  month?: number | null;
  title?: string;
  buildData: () => unknown;
  disabled?: boolean;
  className?: string;
  defaultOrganizationId?: number | null;
  defaultClientId?: number | null;
  onSuccess?: () => void;
};

type Recipient =
  | { kind: "none" }
  | { kind: "org"; id: number }
  | { kind: "client"; id: number };

export default function SaveToProfileButton({
  type,
  year,
  month,
  title,
  buildData,
  disabled,
  className,
  defaultOrganizationId,
  defaultClientId,
  onSuccess,
}: Props) {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  if (!user) return null;

  const recipient: Recipient =
    defaultOrganizationId != null
      ? { kind: "org", id: defaultOrganizationId }
      : defaultClientId != null
        ? { kind: "client", id: defaultClientId }
        : { kind: "none" };

  const handleSave = async () => {
    if (year === null) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }
    setStatus("saving");
    const res = await saveDocument({
      type,
      year,
      month: month ?? null,
      title,
      data: buildData(),
      organizationId: recipient.kind === "org" ? recipient.id : null,
      clientId: recipient.kind === "client" ? recipient.id : null,
    });
    if (res.ok) {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
      onSuccess?.();
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const cls = [
    styles.btn,
    status === "saved" ? styles.btnSaved : "",
    status === "error" ? styles.btnError : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={cls}
        onClick={handleSave}
        disabled={disabled || status === "saving"}
        title="Sačuvaj dokument na svoj profil"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="16"
          height="16"
        >
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        {status === "saving"
          ? "Čuvam…"
          : status === "saved"
            ? "Sačuvano na profil"
            : status === "error"
              ? "Greška"
              : "Sačuvaj na profil"}
      </button>
    </div>
  );
}
