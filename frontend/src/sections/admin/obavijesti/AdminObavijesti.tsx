"use client";

// Admin: kreiranje i upravljanje obavijestima koje se prikazuju korisnicima u
// tabu Poruke i obavijesti (/app/inbox?tab=poruke).
import { useCallback, useEffect, useState } from "react";
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

export default function AdminObavijesti() {
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("ALL");
  const [type, setType] = useState<AnnouncementType>("INFO");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminListAnnouncements().then((res) => {
      if (res.ok) setItems(res.data.items);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      setTitle("");
      setBody("");
      setAudience("ALL");
      setType("INFO");
      setExpiresAt("");
      load();
    }
  }, [title, body, audience, type, expiresAt, load]);

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
      <h1 className={styles.title}>Obavijesti</h1>
      <div className={styles.subtitle}>
        Objavite obavijest korisnicima. Prikazuje se u tabu Poruke i obavijesti.
      </div>

      <div className={styles.grid}>
        {/* Forma */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Nova obavijest</div>

          <div className={styles.field}>
            <label className={styles.label}>Naslov</label>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="npr. Novi izvještaj dostupan"
              maxLength={200}
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
                onChange={(e) => setType(e.target.value as AnnouncementType)}
              >
                {(Object.keys(TYPE_LABELS) as AnnouncementType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
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

          <button
            type="button"
            className={styles.submit}
            onClick={submit}
            disabled={saving || !title.trim() || !body.trim()}
          >
            {saving ? "Objavljivanje..." : "Objavi obavijest"}
          </button>
        </div>

        {/* Lista */}
        <div className={styles.list}>
          {items.length === 0 ? (
            <div className={styles.empty}>Još nema objavljenih obavijesti.</div>
          ) : (
            items.map((a) => (
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
                  <span className={styles.tag}>{AUDIENCE_LABELS[a.audience]}</span>
                  <span className={styles.tag}>{TYPE_LABELS[a.type]}</span>
                  {!a.active && <span className={styles.tag}>Neaktivna</span>}
                  {a.expiresAt && (
                    <span className={styles.tag}>
                      Ističe {new Date(a.expiresAt).toLocaleDateString("bs-BA")}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
