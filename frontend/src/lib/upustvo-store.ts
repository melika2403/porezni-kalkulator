// Sitni globalni store za PK Office upustva. HelpButton (uz naslov svake
// stranice) poziva openUpustvo("<slug>"), a UpustvoDrawer (montiran jednom u
// AppShell-u) sluša promjene i klizi zdesna. Bez konteksta i providera: dvije
// nezavisne tačke koje dijele stanje kroz useSyncExternalStore.

let trenutni: string | null = null;
const slusaoci = new Set<() => void>();

function emit() {
  slusaoci.forEach((l) => l());
}

export function openUpustvo(slug: string) {
  trenutni = slug;
  emit();
}

export function closeUpustvo() {
  trenutni = null;
  emit();
}

export function subscribeUpustvo(l: () => void) {
  slusaoci.add(l);
  return () => {
    slusaoci.delete(l);
  };
}

export function getUpustvoSlug() {
  return trenutni;
}
