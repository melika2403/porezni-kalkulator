"use client";

import { useEffect } from "react";
import { IconX } from "@tabler/icons-react";

// Dijeljeni PK Office modal: overlay + kartica, zatvaranje na Escape,
// klik van panela i X dugme. Sadržaj je slobodan (children).
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-[rgba(15,26,18,0.4)]"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[520px] max-h-[85vh] flex flex-col rounded-xl bg-cream-100 border border-cream-300 shadow-[0_18px_50px_-12px_rgba(15,26,18,0.35)]">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-cream-300">
          <h3 className="font-serif-display text-[19px] leading-tight text-text-primary">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori"
            className="p-1.5 -mr-1.5 -mt-0.5 rounded-lg text-text-tertiary hover:bg-cream-200 hover:text-text-primary transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-cream-300 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
