"use client";

// Admin: kreiranje i upravljanje obavijestima koje se prikazuju korisnicima u
// tabu Poruke i obavijesti (/app/inbox?tab=poruke).
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconInfoCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconSpeakerphone,
  IconPlus,
  IconPower,
  IconTrash,
} from "@tabler/icons-react";
import {
  adminListAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type AdminAnnouncement,
  type Audience,
  type AnnouncementType,
} from "src/api/announcements";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import { formatDate } from "src/lib/format";
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
// ikona u obojenoj pločici uz naslov (isti jezik kao KPI kartice na dashboardu)
function typeIcon(t: AnnouncementType) {
  return t === "WARNING" ? (
    <IconAlertTriangle size={19} />
  ) : t === "SUCCESS" ? (
    <IconCircleCheck size={19} />
  ) : (
    <IconInfoCircle size={19} />
  );
}
function iconTileClass(t: AnnouncementType): string {
  return t === "WARNING"
    ? styles.iconWarning
    : t === "SUCCESS"
      ? styles.iconSuccess
      : styles.iconInfo;
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
          <IconPlus size={16} />
          Nova obavijest
        </button>
      </div>

      {/* ── Lista ────────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <IconSpeakerphone size={24} />
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
            <IconPlus size={16} />
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
              <div className={styles.itemRow}>
                <span
                  className={`${styles.itemIcon} ${iconTileClass(a.type)}`}
                  aria-hidden="true"
                >
                  {typeIcon(a.type)}
                </span>
                <div className={styles.itemMain}>
                  <div className={styles.itemHead}>
                    <span className={styles.itemTitle}>{a.title}</span>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        onClick={() => toggleActive(a)}
                      >
                        <IconPower size={13} />
                        {a.active ? "Deaktiviraj" : "Aktiviraj"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.ghostBtn} ${styles.dangerBtn}`}
                        onClick={() => remove(a.id)}
                      >
                        <IconTrash size={13} />
                        Obriši
                      </button>
                    </div>
                  </div>
                  <div className={styles.itemBody}>{a.body}</div>
                  <div className={styles.tags}>
                    <span className={`${styles.badge} ${badgeClass(a.type)}`}>
                      {TYPE_LABELS[a.type]}
                    </span>
                    <span className={styles.tag}>
                      {AUDIENCE_LABELS[a.audience]}
                    </span>
                    {!a.active && (
                      <span className={`${styles.tag} ${styles.tagInactive}`}>
                        Neaktivna
                      </span>
                    )}
                    {a.expiresAt && (
                      <span className={styles.tag}>
                        Ističe {formatDate(a.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>
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
                    <StyledSelect
                      ariaLabel="Publika"
                      value={audience}
                      onChange={(v) => setAudience(String(v) as Audience)}
                      groups={[
                        {
                          options: (
                            Object.keys(AUDIENCE_LABELS) as Audience[]
                          ).map((a) => ({
                            value: a,
                            label: AUDIENCE_LABELS[a],
                          })),
                        },
                      ]}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Tip</label>
                    <StyledSelect
                      ariaLabel="Tip obavijesti"
                      value={type}
                      onChange={(v) => setType(String(v) as AnnouncementType)}
                      groups={[
                        {
                          options: (
                            Object.keys(TYPE_LABELS) as AnnouncementType[]
                          ).map((t) => ({
                            value: t,
                            label: TYPE_LABELS[t],
                          })),
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Ističe (opciono)</label>
                  <DateInput
                    value={expiresAt}
                    onValueChange={setExpiresAt}
                    className={styles.input}
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
