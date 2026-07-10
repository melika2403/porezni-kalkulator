"use client";

// Admin: kreiranje i upravljanje obavijestima koje se prikazuju korisnicima u
// tabu Poruke i obavijesti (/app/inbox?tab=poruke).
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  adminListAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type AdminAnnouncement,
  type Audience,
  type AnnouncementType,
} from "src/api/announcements";
import styles from "./AdminObavijesti.module.css";

const AUDIENCE_LABELS: Record<Audience, string> = {
  ALL: "Svi korisnici",
  USER: "Besplatni (USER)",
  PRO: "PRO",
  BUSINESS: "BUSINESS",
  TRIAL: "Probni period",
};
const TYPE_LABELS: Record<AnnouncementType, string> = {
  INFO: "Informacija",
  WARNING: "Upozorenje",
  SUCCESS: "Uspjeh",
};

function typeClass(t: AnnouncementType): string {
  return t === "WARNING"
    ? styles.itemWarning
    : t === "SUCCESS"
      ? styles.itemSuccess
      : styles.itemInfo;
}
function badgeClass(t: AnnouncementType): string {
  return t === "WARNING"
    ? styles.badgeWarning
    : t === "SUCCESS"
      ? styles.badgeSuccess
      : styles.badgeInfo;
}

export default function AdminObavijesti() {
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("ALL");
  const [type, setType] = useState<AnnouncementType>("INFO");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = useCallback(() => {
    adminListAnnouncements().then((res) => {
      if (res.ok) setItems(res.data.items);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = useCallback(() => {
    setTitle("");
    setBody("");
    setAudience("ALL");
    setType("INFO");
    setExpiresAt("");
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    resetForm();
  }, [resetForm]);

  // Escape zatvara modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeModal]);

  const submit = useCallback(async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const res = await createAnnouncement({
      title: title.trim(),
      body: body.trim(),
      audience,
      type,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    setSaving(false);
    if (res.ok) {
      closeModal();
      load();
    }
  }, [title, body, audience, type, expiresAt, load, closeModal]);

  const toggleActive = useCallback(
    async (a: AdminAnnouncement) => {
      await updateAnnouncement(a.id, { active: !a.active });
      load();
    },
    [load],
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteAnnouncement(id);
      load();
    },
    [load],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Obavijesti</h1>
          <div className={styles.subtitle}>
            Objavite obavijest korisnicima. Prikazuje se u tabu Poruke i
            obavijesti.
          </div>
        </div>
        <button
          type="button"
          className={styles.newBtn}
          onClick={() => setOpen(true)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Nova obavijest
        </button>
      </div>

      {/* ── Lista ────────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 11l18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
          </div>
          <div className={styles.emptyTitle}>Još nema objavljenih obavijesti</div>
          <div className={styles.emptyText}>
            Kreirajte prvu obavijest koja će se prikazati korisnicima.
          </div>
          <button
            type="button"
            className={styles.newBtn}
            onClick={() => setOpen(true)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
            Nova obavijest
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((a) => (
            <div
              key={a.id}
              className={`${styles.item} ${typeClass(a.type)} ${a.active ? "" : styles.itemInactive}`}
            >
              <div className={styles.itemHead}>
                <span className={styles.itemTitle}>{a.title}</span>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => toggleActive(a)}
                  >
                    {a.active ? "Deaktiviraj" : "Aktiviraj"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.linkBtn} ${styles.dangerBtn}`}
                    onClick={() => remove(a.id)}
                  >
                    Obriši
                  </button>
                </div>
              </div>
              <div className={styles.itemBody}>{a.body}</div>
              <div className={styles.tags}>
                <span className={`${styles.badge} ${badgeClass(a.type)}`}>
                  {TYPE_LABELS[a.type]}
                </span>
                <span className={styles.tag}>{AUDIENCE_LABELS[a.audience]}</span>
                {!a.active && (
                  <span className={`${styles.tag} ${styles.tagInactive}`}>
                    Neaktivna
                  </span>
                )}
                {a.expiresAt && (
                  <span className={styles.tag}>
                    Ističe {new Date(a.expiresAt).toLocaleDateString("bs-BA")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: nova obavijest (portal u body) ─────────────────────── */}
      {open &&
        mounted &&
        createPortal(
          <div
            className={styles.modalOverlay}
            onClick={closeModal}
            role="presentation"
          >
            <div
              className={styles.modal}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className={styles.modalHead}>
                <div className={styles.modalTitle}>Nova obavijest</div>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={closeModal}
                  aria-label="Zatvori"
                >
                  ×
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.field}>
                  <label className={styles.label}>Naslov</label>
                  <input
                    className={styles.input}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="npr. Novi izvještaj dostupan"
                    maxLength={200}
                    autoFocus
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Tekst</label>
                  <textarea
                    className={styles.textarea}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Sadržaj obavijesti..."
                  />
                </div>

                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Publika</label>
                    <select
                      className={styles.select}
                      value={audience}
                      onChange={(e) => setAudience(e.target.value as Audience)}
                    >
                      {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((a) => (
                        <option key={a} value={a}>
                          {AUDIENCE_LABELS[a]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Tip</label>
                    <select
                      className={styles.select}
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value as AnnouncementType)
                      }
                    >
                      {(Object.keys(TYPE_LABELS) as AnnouncementType[]).map(
                        (t) => (
                          <option key={t} value={t}>
                            {TYPE_LABELS[t]}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Ističe (opciono)</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.modalFoot}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={closeModal}
                >
                  Odustani
                </button>
                <button
                  type="button"
                  className={styles.submit}
                  onClick={submit}
                  disabled={saving || !title.trim() || !body.trim()}
                >
                  {saving ? "Objavljivanje..." : "Objavi obavijest"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
