"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./Notice.module.css";

export type NoticeType = "info" | "success" | "warning" | "error";

interface NoticeItem {
  id: number;
  type: NoticeType;
  message: string;
}

interface NoticeCtx {
  notify: (message: string, type?: NoticeType) => void;
  confirm: (message: string) => Promise<boolean>;
}

const Ctx = createContext<NoticeCtx | null>(null);

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    message: string;
    resolve: (ok: boolean) => void;
  } | null>(null);
  const idRef = useRef(0);

  const notify = useCallback((message: string, type: NoticeType = "info") => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, type, message }]);
    const ttl = type === "error" ? 5000 : 3500;
    setTimeout(() => {
      setItems((prev) => prev.filter((n) => n.id !== id));
    }, ttl);
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const closeConfirm = (ok: boolean) => {
    if (!confirmState) return;
    confirmState.resolve(ok);
    setConfirmState(null);
  };

  return (
    <Ctx.Provider value={{ notify, confirm }}>
      {children}
      <div className={styles.container} aria-live="polite" role="status">
        {items.map((n) => (
          <div key={n.id} className={`${styles.toast} ${styles[n.type]}`}>
            <span className={styles.icon}>
              {n.type === "success" && "✓"}
              {n.type === "error" && "!"}
              {n.type === "warning" && "⚠"}
              {n.type === "info" && "ⓘ"}
            </span>
            <span className={styles.msg}>{n.message}</span>
          </div>
        ))}
      </div>
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onResolve={closeConfirm}
        />
      )}
    </Ctx.Provider>
  );
}

function ConfirmDialog({
  message,
  onResolve,
}: {
  message: string;
  onResolve: (ok: boolean) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResolve(false);
      else if (e.key === "Enter") onResolve(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onResolve]);

  return (
    <div className={styles.confirmOverlay} onClick={() => onResolve(false)}>
      <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
        <p className={styles.confirmMsg}>{message}</p>
        <div className={styles.confirmActions}>
          <button
            type="button"
            className={styles.confirmCancel}
            onClick={() => onResolve(false)}
          >
            Otkaži
          </button>
          <button
            type="button"
            className={styles.confirmOk}
            onClick={() => onResolve(true)}
            autoFocus
          >
            Potvrdi
          </button>
        </div>
      </div>
    </div>
  );
}

export function useNotice(): NoticeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useNotice mora biti unutar <NoticeProvider>");
  }
  return ctx;
}
