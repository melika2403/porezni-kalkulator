"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  deletePrilog,
  listPrilozi,
  prilogUrl,
  uploadPrilog,
  type FreelancerPrilog,
} from "src/api/freelancer";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import Modal from "src/components/Modal/Modal";
import FreelancerTrialCta, {
  useFreelancerPristup,
} from "src/components/FreelancerTrialCta/FreelancerTrialCta";
import { fmtDatum } from "./format";
import { useOsvjeziEvidenciju } from "./hooks";
import styles from "./freelancer.module.css";

const VRSTE: { value: FreelancerPrilog["vrsta"]; label: string }[] = [
  { value: "OVJEREN_AMS", label: "Ovjeren AMS-1035 (sa šaltera)" },
  { value: "DOKAZ_UPLATE", label: "Dokaz o uplati (banka)" },
  { value: "OSTALO", label: "Ostalo" },
];

const velicina = (b: number) =>
  b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

/**
 * Panel priloga ispod reda uplate: lijevo lista sačuvanih dokumenata, desno
 * kutija za dodavanje (vrsta + izbor fajla). Zatvara se dugmetom u zaglavlju
 * ili ponovnim klikom na "Prilozi" u redu.
 */
export default function PriloziPanel({
  uplataId,
  onZatvori,
}: {
  uplataId: number;
  onZatvori?: () => void;
}) {
  const qc = useQueryClient();
  const osvjezi = useOsvjeziEvidenciju();
  const { hasAccess } = useFreelancerPristup();
  const key = ["freelancer-prilozi", uplataId];
  const { data: prilozi = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => unwrap(listPrilozi(uplataId)),
  });
  const [vrsta, setVrsta] = useState<FreelancerPrilog["vrsta"]>("OVJEREN_AMS");
  const [greska, setGreska] = useState<string | null>(null);
  const [zaBrisanje, setZaBrisanje] = useState<FreelancerPrilog | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const res = await uploadPrilog(uplataId, file, vrsta);
      if (!res.ok) throw new Error(res.error || "GRESKA");
      return res.data;
    },
    onSuccess: () => {
      setGreska(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: key });
      osvjezi();
    },
    onError: (e) => {
      // i poslije greške isprazni polje: inače isti fajl ne okine novi pokušaj
      // (browser ne javlja promjenu kad je vrijednost ista)
      if (fileRef.current) fileRef.current.value = "";
      const m = e instanceof Error ? e.message : "";
      setGreska(
        m === "INVALID_DOC_TYPE"
          ? "Dozvoljeni su PDF, JPG, PNG i WEBP."
          : m === "LIMIT_FILE_SIZE"
            ? "Fajl je veći od 10 MB."
            : m === "LIMIT_PRILOGA"
              ? "Uz jednu uplatu može najviše 10 priloga."
              : m === "NEMA_PRISTUPA"
                ? "Arhiva priloga je dio PK Freelancer paketa."
                : "Upload nije uspio. Pokušajte ponovo.",
      );
    },
  });
  const obrisi = useMutation({
    mutationFn: (id: number) => unwrap(deletePrilog(id)),
    onSuccess: () => {
      setZaBrisanje(null);
      setGreska(null);
      qc.invalidateQueries({ queryKey: key });
      osvjezi();
    },
    // modal se zatvara na potvrdu, pa greška mora ostati vidljiva u panelu
    onError: () => {
      setZaBrisanje(null);
      setGreska("Prilog nije obrisan. Pokušajte ponovo.");
    },
  });

  const inputId = `prilog-fajl-${uplataId}`;

  return (
    <div className={styles.prilogPanel}>
      <div className={styles.prilogPanelHead}>
        <span className={styles.prilogPanelNaslov}>
          Prilozi uz uplatu
          {prilozi.length > 0 && <span className={styles.muted}> ({prilozi.length})</span>}
        </span>
        {onZatvori && (
          <button
            type="button"
            className={`${styles.btnGhost} ${styles.btnSmall}`}
            onClick={onZatvori}
          >
            Zatvori
          </button>
        )}
      </div>

      <div className={styles.prilogPanelTijelo}>
        <div className={styles.prilogLista}>
          {isLoading ? (
            <div className={styles.muted}>Učitavanje priloga...</div>
          ) : prilozi.length === 0 ? (
            <p className={styles.hint}>
              Još nema priloga. Ovdje čuvate sliku ovjerenog AMS-a sa šaltera i dokaz uplate
              iz banke, da su uz uplatu i kad porezna zatraži.
            </p>
          ) : (
            <ul className={styles.prilogList}>
              {prilozi.map((p) => (
                <li key={p.id} className={styles.prilogItem}>
                  <span className={`${styles.badge} ${styles.badgeObracunato}`}>
                    {VRSTE.find((v) => v.value === p.vrsta)?.label ?? p.vrsta}
                  </span>
                  <a href={prilogUrl(p.id)} target="_blank" rel="noopener noreferrer">
                    {p.originalName}
                  </a>
                  <span className={styles.muted}>
                    {velicina(p.sizeBytes)} · {fmtDatum(p.createdAt.slice(0, 10))}
                  </span>
                  <button
                    type="button"
                    className={`${styles.btnDanger} ${styles.btnSmall}`}
                    onClick={() => setZaBrisanje(p)}
                  >
                    Obriši
                  </button>
                </li>
              ))}
            </ul>
          )}
          {greska && (
            <p className={`${styles.hint} ${styles.hintErr}`} style={{ marginTop: "0.5rem" }}>
              {greska}
            </p>
          )}
        </div>

        <div className={styles.prilogDodaj}>
          {hasAccess ? (
            <>
              <span className={styles.fieldLabel}>Dodaj prilog</span>
              <StyledSelect
                value={vrsta}
                onChange={(v) => setVrsta(String(v) as FreelancerPrilog["vrsta"])}
                groups={[{ options: VRSTE }]}
                ariaLabel="Vrsta priloga"
              />
              {/* native input je sakriven, dugme je stilizovana labela */}
              <input
                ref={fileRef}
                id={inputId}
                className={styles.fileSkriven}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                aria-label="Fajl priloga"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                }}
                disabled={upload.isPending}
              />
              <label
                htmlFor={inputId}
                className={`${styles.btnSecondary} ${styles.fileDugme} ${
                  upload.isPending ? styles.fileDugmeZauzeto : ""
                }`}
              >
                {upload.isPending ? "Šaljem..." : "Izaberi fajl i dodaj"}
              </label>
              {/* na telefonu: kamera odmah, ovjeren obrazac se slika na šalteru;
                  capture otvara zadnju kameru, dugme se vidi samo na dodirnim ekranima */}
              <input
                id={`${inputId}-kamera`}
                className={styles.fileSkriven}
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Slikaj prilog telefonom"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                  e.target.value = "";
                }}
                disabled={upload.isPending}
              />
              <label
                htmlFor={`${inputId}-kamera`}
                className={`${styles.btnGhost} ${styles.fileDugme} ${styles.fileKamera} ${
                  upload.isPending ? styles.fileDugmeZauzeto : ""
                }`}
              >
                Slikaj telefonom
              </label>
              <span className={styles.hint}>PDF, JPG, PNG ili WEBP, do 10 MB. Najviše 10 priloga po uplati.</span>
            </>
          ) : (
            <FreelancerTrialCta
              variant="inline"
              what="Arhiva ovjerenih obrazaca i dokaza uplate uz svaku uplatu"
            />
          )}
        </div>
      </div>

      <Modal
        kind="confirm"
        variant="danger"
        open={!!zaBrisanje}
        title="Obrisati prilog?"
        message={zaBrisanje ? `"${zaBrisanje.originalName}" se briše trajno.` : ""}
        confirmLabel="Obriši"
        cancelLabel="Odustani"
        onConfirm={() => zaBrisanje && !obrisi.isPending && obrisi.mutate(zaBrisanje.id)}
        onClose={() => setZaBrisanje(null)}
      />
    </div>
  );
}
