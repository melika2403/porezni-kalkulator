"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

type Variant = "default" | "danger";

type BaseProps = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  onClose: () => void;
};

type AlertProps = BaseProps & {
  kind: "alert";
  onConfirm?: () => void;
};

type ConfirmProps = BaseProps & {
  kind: "confirm";
  onConfirm: () => void;
};

type PromptProps = BaseProps & {
  kind: "prompt";
  inputLabel?: string;
  inputType?: "text" | "email";
  inputPlaceholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  validate?: (value: string) => string | null;
};

type Props = AlertProps | ConfirmProps | PromptProps;

export default function Modal(props: Props) {
  const { open, title, message, onClose } = props;
  const variant: Variant = props.variant ?? "default";
  const isPrompt = props.kind === "prompt";
  const isAlert = props.kind === "alert";

  const [value, setValue] = useState(isPrompt ? props.defaultValue ?? "" : "");
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (isPrompt) setValue(props.defaultValue ?? "");
    const t = setTimeout(() => {
      if (isPrompt) inputRef.current?.focus();
      else confirmRef.current?.focus();
    }, 50);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  function handleConfirm() {
    if (isPrompt) {
      const v = value.trim();
      const validationErr = props.validate?.(v) ?? null;
      if (validationErr) {
        setErr(validationErr);
        return;
      }
      (props as PromptProps).onConfirm(v);
    } else if (props.kind === "confirm") {
      props.onConfirm();
    } else if (props.kind === "alert") {
      props.onConfirm?.();
    }
    onClose();
  }

  const confirmClass =
    variant === "danger" ? styles.btnDanger : styles.btnPrimary;

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={styles.dialog}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 id="modal-title" className={styles.title}>{title}</h3>
        {message && <p className={styles.message}>{message}</p>}
        {isPrompt && (
          <>
            <input
              ref={inputRef}
              className={styles.input}
              type={props.inputType ?? "text"}
              placeholder={props.inputPlaceholder}
              value={value}
              onChange={(e) => { setValue(e.target.value); if (err) setErr(null); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
            {err && (
              <div style={{ color: "#c44", fontSize: 12, marginTop: -10, marginBottom: 12 }}>
                {err}
              </div>
            )}
          </>
        )}
        <div className={styles.actions}>
          {!isAlert && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={onClose}
            >
              {props.cancelLabel ?? "Otkaži"}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={`${styles.btn} ${confirmClass}`}
            onClick={handleConfirm}
          >
            {props.confirmLabel ?? (isAlert ? "U redu" : "Potvrdi")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
