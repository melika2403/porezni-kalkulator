"use client";
import { useState } from "react";
import styles from "./kontakt.module.css";
import { useMutation } from "@tanstack/react-query";
import { sendContactForm } from "src/api/backend/contactForm/contactForm";

type Status = "idle" | "sending" | "sent" | "error";

export default function Kontakt() {
  const [ime, setIme] = useState("");
  const [email, setEmail] = useState("");
  const [poruka, setPoruka] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const mutation = useMutation({
    mutationFn: sendContactForm,
    onSuccess: () => setStatus("sent"),
    onError: () => setStatus("error"),
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Kontakt</div>
        <h1 className={styles.h1}>
          Javite nam <em>se</em>
        </h1>
        <p className={styles.lead}>
          Imate pitanje, prijedlog ili ste pronašli grešku? Pišite nam —
          odgovaramo u roku od 24 sata.
        </p>
      </div>

      <div className={styles.grid}>
        <div className={styles.info}>
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <div className={styles.infoTitle}>Email</div>
              <a
                href="mailto:info@poreznikalkulator.ba"
                className={styles.infoValue}
              >
                info@poreznikalkulator.ba
              </a>
            </div>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div className={styles.infoTitle}>Radno vrijeme podrške</div>
              <div className={styles.infoValue}>Pon–Pet, 9:00–17:00</div>
            </div>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <div className={styles.infoTitle}>Lokacija</div>
              <div className={styles.infoValue}>Bosna i Hercegovina</div>
            </div>
          </div>
        </div>

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            setStatus("sending");
            mutation.mutate({ ime, email, poruka });
          }}
        >
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="ime">
              Ime i prezime
            </label>
            <input
              id="ime"
              className={styles.input}
              type="text"
              placeholder="Vaše ime"
              value={ime}
              onChange={(e) => setIme(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="email">
              Email adresa
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              placeholder="vas@email.ba"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="poruka">
              Poruka
            </label>
            <textarea
              id="poruka"
              className={styles.textarea}
              placeholder="Opišite vaše pitanje ili prijedlog..."
              value={poruka}
              onChange={(e) => setPoruka(e.target.value)}
              rows={6}
              required
            />
          </div>

          {status === "sent" && (
            <div className={styles.successMsg}>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 10l4 4 8-8" />
              </svg>
              Poruka je uspješno poslana. Javit ćemo se uskoro!
            </div>
          )}
          {status === "error" && (
            <div className={styles.errorMsg}>
              Došlo je do greške. Pokušajte ponovo ili nas kontaktirajte
              direktno na email.
            </div>
          )}

          <button
            type="submit"
            className={styles.submit}
            disabled={status === "sending"}
          >
            {status === "sending" ? "Slanje..." : "Pošalji poruku"}
          </button>
        </form>
      </div>
    </div>
  );
}
