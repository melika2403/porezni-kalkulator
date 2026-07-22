import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";

// Trenutni korisnik ili null (gost). Isti queryKey kao u Navbar-u pa se
// rezultat dijeli iz react-query keša, nema dodatnog API poziva.
export function useMe() {
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });
  return data ?? null;
}
