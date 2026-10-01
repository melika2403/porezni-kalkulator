"use client";
import { useState } from "react";

// Unos vremena u 24-satnom formatu SS:MM, par komponenti DateInput.
// Native <input type="time"> prikazuje format preglednika (npr. 08:00 AM),
// pa se ovdje kuca kao tekst: dvotačka se dopiše sama, a "8", "8:3" ili
// "830" se na blur dopune u "08:00" / "08:03" / "08:30".

interface Props {
  value: string; // "SS:MM" ili ""
  onValueChange: (vrijeme: string) => void;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

const dvije = (n: number) => String(n).padStart(2, "0");

/** cifre -> prikaz dok se kuca: "8" | "08" | "08:3" | "08:30" */
const ciframaUPrikaz = (cifre: string) =>
  cifre.length <= 2 ? cifre : `${cifre.slice(0, 2)}:${cifre.slice(2, 4)}`;

/** potpun prikaz -> "SS:MM", ili "" ako nije ispravno vrijeme */
const prikazUVrijeme = (prikaz: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(prikaz);
  if (!m) return "";
  const s = Number(m[1]);
  const min = Number(m[2]);
  return s <= 23 && min <= 59 ? `${dvije(s)}:${dvije(min)}` : "";
};

export default function VrijemeInput({
  value,
  onValueChange,
  className,
  id,
  required,
  disabled,
  "aria-label": ariaLabel,
}: Props) {
  const [prikaz, setPrikaz] = useState(value || "");
  const [zadnjaVrijednost, setZadnjaVrijednost] = useState(value);

  // vrijednost izvana (učitavanje, reset forme); djelimičan unos se ne gazi
  if (value !== zadnjaVrijednost) {
    setZadnjaVrijednost(value);
    if (prikazUVrijeme(prikaz) !== (value || "")) setPrikaz(value || "");
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let sirovo = e.target.value;
    // "8:" znači 08 sati
    if (/^\d:/.test(sirovo)) sirovo = `0${sirovo}`;
    const novi = ciframaUPrikaz(sirovo.replace(/\D/g, "").slice(0, 4));
    setPrikaz(novi);
    onValueChange(prikazUVrijeme(novi));
  };

  const handleBlur = () => {
    const cifre = prikaz.replace(/\D/g, "");
    if (!cifre) return;
    let dopunjeno = prikaz;
    if (cifre.length <= 2) dopunjeno = `${dvije(Number(cifre))}:00`;
    else if (cifre.length === 3)
      // "830" -> 08:30 (nema 83 sata), "123" -> 12:03
      dopunjeno =
        Number(cifre.slice(0, 2)) > 23
          ? `0${cifre[0]}:${cifre.slice(1)}`
          : `${cifre.slice(0, 2)}:0${cifre[2]}`;
    const vrijeme = prikazUVrijeme(dopunjeno);
    // neispravno vrijeme (npr. 25:00) se briše, ne ostaje kao prividno uneseno
    setPrikaz(vrijeme);
    onValueChange(vrijeme);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      className={className}
      value={prikaz}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="SS:MM"
      maxLength={5}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
    />
  );
}
