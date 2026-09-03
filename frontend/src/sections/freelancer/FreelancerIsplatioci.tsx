"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  createIsplatilac,
  deleteIsplatilac,
  listIsplatioci,
  updateIsplatilac,
  MAX_ISPLATILACA,
  type AmsIsplatilac,
} from "src/api/amsIsplatioci";
import Modal from "src/components/Modal/Modal";
import FreelancerTrialCta, {
  useFreelancerPristup,
} from "src/components/FreelancerTrialCta/FreelancerTrialCta";
import { useOsvjeziEvidenciju } from "./hooks";
import Paginacija, { useStranice } from "./Paginacija";
import styles from "./freelancer.module.css";

const PRAZNO = { naziv: "", adresa: "", grad: "", drzava: "" };
const KEY = ["ams-isplatioci"];

export default function FreelancerIsplatioci() {
  const qc = useQueryClient();
  const osvjezi = useOsvjeziEvidenciju();
  const { hasAccess } = useFreelancerPristup();
  const { data: lista = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => unwrap(listIsplatioci()),
  });
  const [forma, setForma] = useState<{ id: number | null; polja: typeof PRAZNO } | null>(null);
  const [zaBrisanje, setZaBrisanje] = useState<AmsIsplatilac | null>(null);
  const [greska, setGreska] = useState<string | null>(null);
  const [poruka, setPoruka] = useState<string | null>(null);

  const popunjeno = !hasAccess && lista.length >= MAX_ISPLATILACA;
  const stranice = useStranice(lista);

  const spremi = useMutation({
    mutationFn: async () => {
      if (!forma) return null;
      const payload = {
        naziv: forma.polja.naziv.trim(),
        adresa: forma.polja.adresa.trim() || null,
        grad: forma.polja.grad.trim() || null,
        drzava: forma.polja.drzava.trim() || null,
      };
      const res = forma.id ? await updateIsplatilac(forma.id, payload) : await createIsplatilac(payload);
      if (!res.ok) throw new Error(res.error || "GRESKA");
      return res.data;
    },
    onSuccess: () => {
      setForma(null);
      setGreska(null);
      qc.invalidateQueries({ queryKey: KEY });
      osvjezi();
    },
    onError: (e) => {
      const m = e instanceof Error ? e.message : "";
      setGreska(
        m === "LIMIT_REACHED"
          ? `Besplatno se čuva do ${MAX_ISPLATILACA} isplatilaca. PK Freelancer skida ograničenje.`
          : m || "Čuvanje nije uspjelo.",
      );
    },
  });
  const obrisi = useMutation({
    mutationFn: (id: number) => unwrap(deleteIsplatilac(id)),
    onSuccess: () => {
      setZaBrisanje(null);
      setPoruka(null);
      qc.invalidateQueries({ queryKey: KEY });
      osvjezi();
    },
    // modal se zatvara na potvrdu, pa greška mora biti vidljiva na stranici
    onError: () => {
      setZaBrisanje(null);
      setPoruka("Isplatilac nije obrisan. Pokušajte ponovo.");
    },
  });

  const polje = (k: keyof typeof PRAZNO) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForma((f) => (f ? { ...f, polja: { ...f.polja, [k]: e.target.value } } : f));

  return (
    <>
      <div className={styles.toolbar}>
        <span className={styles.muted}>
          {lista.length} {lista.length === 1 ? "isplatilac" : "isplatilaca"}
          {hasAccess ? ", bez ograničenja" : ` od ${MAX_ISPLATILACA} besplatno`}
        </span>
        <span className={styles.toolbarSpacer} />
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => setForma({ id: null, polja: PRAZNO })}
          disabled={popunjeno}
          title={popunjeno ? "Besplatni limit je popunjen" : undefined}
        >
          Dodaj isplatioca
        </button>
      </div>

      {poruka && (
        <div className={`${styles.alert} ${styles.alertWarn}`} role="status">
          {poruka}{" "}
          <button
            type="button"
            className={`${styles.btnGhost} ${styles.btnSmall}`}
            onClick={() => setPoruka(null)}
          >
            U redu
          </button>
        </div>
      )}

      {popunjeno && (
        <FreelancerTrialCta what={`Sačuvano je ${MAX_ISPLATILACA} od ${MAX_ISPLATILACA} besplatnih isplatilaca. Paket skida ograničenje.`} />
      )}

      {forma && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span>{forma.id ? "Izmjena isplatioca" : "Novi isplatilac"}</span>
            <span>podaci za Dio 2 AMS obrasca</span>
          </h2>
          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>Naziv *</label>
              <input className={styles.input} value={forma.polja.naziv} onChange={polje("naziv")} placeholder="npr. Upwork Global Inc." />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Adresa</label>
              <input className={styles.input} value={forma.polja.adresa} onChange={polje("adresa")} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Grad</label>
              <input className={styles.input} value={forma.polja.grad} onChange={polje("grad")} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Država</label>
              <input className={styles.input} value={forma.polja.drzava} onChange={polje("drzava")} />
            </div>
          </div>
          {greska && <div className={`${styles.alert} ${styles.alertErr}`} style={{ marginTop: "1rem" }}>{greska}</div>}
          <div className={styles.formActions}>
            <button type="button" className={styles.btnPrimary} onClick={() => spremi.mutate()} disabled={!forma.polja.naziv.trim() || spremi.isPending}>
              {spremi.isPending ? "Čuvam..." : "Sačuvaj"}
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => setForma(null)}>
              Odustani
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableWrap}>
        {isLoading ? (
          <div className={styles.empty}>Učitavanje...</div>
        ) : lista.length === 0 ? (
          <div className={styles.empty}>
            Još nema isplatilaca. Sačuvane isplatioce birate jednim klikom na AMS generatoru i u
            ručnom unosu uplate.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Naziv</th>
                <th>Adresa</th>
                <th>Grad</th>
                <th>Država</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stranice.isjecak.map((i) => (
                <tr key={i.id}>
                  <td data-label="Naziv" className={styles.strong}>{i.naziv}</td>
                  <td data-label="Adresa">{i.adresa || "–"}</td>
                  <td data-label="Grad">{i.grad || "–"}</td>
                  <td data-label="Država">{i.drzava || "–"}</td>
                  <td data-label="">
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={`${styles.btnGhost} ${styles.btnSmall}`}
                        onClick={() =>
                          setForma({
                            id: i.id,
                            polja: { naziv: i.naziv, adresa: i.adresa ?? "", grad: i.grad ?? "", drzava: i.drzava ?? "" },
                          })
                        }
                      >
                        Uredi
                      </button>
                      <button type="button" className={`${styles.btnDanger} ${styles.btnSmall}`} onClick={() => setZaBrisanje(i)}>
                        Obriši
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {lista.length > 0 && (
          <Paginacija {...stranice} onPromjena={stranice.setStranica} sta="isplatilaca" />
        )}
      </div>

      <Modal
        kind="confirm"
        variant="danger"
        open={!!zaBrisanje}
        title="Obrisati isplatioca?"
        message={zaBrisanje ? `"${zaBrisanje.naziv}" se briše iz adresara. Već sačuvane uplate zadržavaju njegove podatke.` : ""}
        confirmLabel="Obriši"
        cancelLabel="Odustani"
        onConfirm={() => zaBrisanje && !obrisi.isPending && obrisi.mutate(zaBrisanje.id)}
        onClose={() => setZaBrisanje(null)}
      />
    </>
  );
}
