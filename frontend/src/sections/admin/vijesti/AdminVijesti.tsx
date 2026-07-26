"use client";

/* Admin lista tekstova (vijesti i vodiči): filteri, status i upozorenje za
   vodiče kojima je prošao datum sljedeće provjere. */

import { useEffect, useState } from "react";
import Link from "next/link";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import { adminGetClanci, type AdminClanak } from "src/api/vijesti";
import {
  STATUS_LABELE,
  nazivRubrike,
  putanjaClanka,
  type VijestStatus,
} from "src/data/vijesti";
import { formatDate } from "src/lib/format";
import { getBackendUrl } from "src/utils/backendUrl";
import styles from "./adminVijesti.module.css";

function statusBadge(status: VijestStatus): string {
  if (status === "OBJAVLJEN") return styles.badgeObjavljen;
  if (status === "ZAKAZAN") return styles.badgeZakazan;
  return styles.badgeNacrt;
}

export default function AdminVijesti() {
  const [clanci, setClanci] = useState<AdminClanak[]>([]);
  const [ucitavam, setUcitavam] = useState(true);
  const [status, setStatus] = useState("");
  const [tip, setTip] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let ziv = true;
    // setUcitavam ide unutar tajmera, ne u tijelu efekta (pravilo
    // react-hooks/set-state-in-effect, izbjegava lančane rendere)
    const t = setTimeout(() => {
      if (ziv) setUcitavam(true);
      void adminGetClanci({
        status: status || undefined,
        tip: tip || undefined,
        q: q.trim() || undefined,
      }).then((res) => {
        if (!ziv) return;
        setClanci(res.ok && res.data ? res.data : []);
        setUcitavam(false);
      });
    }, 250);
    return () => {
      ziv = false;
      clearTimeout(t);
    };
  }, [status, tip, q]);

  // slike servira backend; prazan NEXT_PUBLIC_BACKEND_URL bi dao relativan
  // put na frontend, gdje /uploads ne postoji
  const backendUrl = getBackendUrl();
  const zaProvjeru = clanci.filter((c) => c.trebaProvjeru).length;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Vijesti i vodiči</h1>
          <p className={styles.subtitle}>
            Vijest živi od datuma i ide u rijeku na /vijesti. Vodič živi od teme
            i stoji trajno na /vodici, a ažurira se umjesto da se piše iznova.
            {zaProvjeru > 0
              ? ` Vodiča kojima je prošao datum provjere: ${zaProvjeru}.`
              : ""}
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/admin/vijesti/komentari" className={styles.btnGhost}>
            Moderacija komentara
          </Link>
          <Link href="/admin/vijesti/novi" className={styles.btnPrimary}>
            Novi tekst
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Pretraga po naslovu"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <StyledSelect
          ariaLabel="Status"
          wrapStyle={{ width: 170 }}
          value={status}
          onChange={(v) => setStatus(String(v ?? ""))}
          groups={[
            {
              options: [
                { value: "", label: "Svi statusi" },
                { value: "NACRT", label: "Nacrt" },
                { value: "ZAKAZAN", label: "Zakazan" },
                { value: "OBJAVLJEN", label: "Objavljen" },
                { value: "ARHIVIRAN", label: "Arhiviran" },
              ],
            },
          ]}
        />
        <StyledSelect
          ariaLabel="Vrsta"
          wrapStyle={{ width: 150 }}
          value={tip}
          onChange={(v) => setTip(String(v ?? ""))}
          groups={[
            {
              options: [
                { value: "", label: "Sve vrste" },
                { value: "VIJEST", label: "Vijesti" },
                { value: "VODIC", label: "Vodiči" },
              ],
            },
          ]}
        />
      </div>

      {ucitavam ? (
        <div className={styles.empty}>Učitavanje...</div>
      ) : clanci.length === 0 ? (
        <div className={styles.empty}>
          Nema tekstova po ovim filterima. Prvi tekst se dodaje dugmetom
          &quot;Novi tekst&quot;.
        </div>
      ) : (
        <div className={styles.list}>
          {clanci.map((c) => (
            <Link
              key={c.id}
              href={`/admin/vijesti/${c.id}`}
              className={styles.item}
            >
              {c.naslovnaSlika ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  className={styles.itemThumb}
                  src={`${backendUrl}${c.naslovnaSlika}`}
                  alt=""
                />
              ) : (
                <div className={styles.itemThumbPrazna} />
              )}
              <div className={styles.itemMain}>
                <p className={styles.itemTitle}>{c.naslov || "Bez naslova"}</p>
                <div className={styles.itemMeta}>
                  <span className={`${styles.badge} ${statusBadge(c.status)}`}>
                    {STATUS_LABELE[c.status]}
                  </span>
                  {c.tip === "VODIC" && (
                    <span className={`${styles.badge} ${styles.badgeVodic}`}>
                      Vodič
                    </span>
                  )}
                  {c.trebaProvjeru && (
                    <span className={`${styles.badge} ${styles.badgeProvjera}`}>
                      Treba provjeru
                    </span>
                  )}
                  <span>{nazivRubrike(c.rubrika)}</span>
                  {c.datumObjave && <span>{formatDate(c.datumObjave)}</span>}
                  <span>{c.brojPregleda} pregleda</span>
                  {c.status === "OBJAVLJEN" && (
                    <span>{putanjaClanka(c.tip, c.slug)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
