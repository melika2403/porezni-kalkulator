"use client";

import { Modal } from "./Modal";

// PK Office zamjena za window.confirm / window.alert (browserski dijalozi
// ne prate temu). Sa onConfirm je potvrda akcije (Odustani + akcija),
// bez onConfirm je obavijest (samo "U redu").
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Da, obriši",
  cancelLabel = "Odustani",
  danger = true,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** crveno dugme za destruktivne akcije (default), zeleno za ostale */
  danger?: boolean;
  busy?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        onConfirm ? (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-text-secondary hover:bg-cream-200 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={[
                "px-4 py-2 rounded-lg text-[13px] font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50",
                // isti destruktivni stil kao DeleteWorkerModal (accent)
                danger ? "bg-accent-500" : "bg-brand-600",
              ].join(" ")}
            >
              {busy ? "Sačekajte..." : confirmLabel}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium bg-brand-600 text-white hover:opacity-90 transition-opacity"
          >
            U redu
          </button>
        )
      }
    >
      <div className="text-[13.5px] leading-6 text-text-secondary">
        {message}
      </div>
    </Modal>
  );
}
