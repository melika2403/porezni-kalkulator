"use client";

import { useEffect, useState } from "react";
import styles from "./SaveToast.module.css";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function SaveToast({ status }: { status: SaveStatus }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "saving" || status === "saved" || status === "error") {
      setVisible(true);
      if (status === "saved") {
        const t = setTimeout(() => setVisible(false), 2200);
        return () => clearTimeout(t);
      }
      if (status === "error") {
        const t = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(t);
      }
    } else {
      setVisible(false);
    }
  }, [status]);

  if (!visible) return null;

  return (
    <div
      className={`${styles.toast} ${
        status === "saved"
          ? styles.toastSaved
          : status === "error"
            ? styles.toastError
            : styles.toastSaving
      }`}
      role="status"
      aria-live="polite"
    >
      {status === "saving" && (
        <>
          <span className={styles.spinner} />
          <span>Čuvam…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <span className={styles.check}>✓</span>
          <span>Sačuvano</span>
        </>
      )}
      {status === "error" && (
        <>
          <span className={styles.check}>!</span>
          <span>Greška pri čuvanju</span>
        </>
      )}
    </div>
  );
}
