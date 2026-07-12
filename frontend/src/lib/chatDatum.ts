// Datumski separatori u chat nitima (PK Office Podrška + admin Podrška):
// poruke se grupišu po LOKALNOM danu, label je "Danas" / "Juče" / DD.MM.GGGG.

/** lokalni dan poruke kao ključ za poređenje (YYYY-MM-DD u lokalnoj zoni) */
export function danKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** true kad poruka počinje novi dan u odnosu na prethodnu */
export function noviDan(
  prevIso: string | null | undefined,
  iso: string,
): boolean {
  if (!prevIso) return true;
  return danKey(new Date(prevIso)) !== danKey(new Date(iso));
}

/** "Danas", "Juče" ili DD.MM.GGGG. za separator */
export function danLabel(iso: string): string {
  const d = new Date(iso);
  const key = danKey(d);
  const sada = new Date();
  if (key === danKey(sada)) return "Danas";
  if (key === danKey(new Date(sada.getTime() - 86400000))) return "Juče";
  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}.${d.getFullYear()}.`;
}
