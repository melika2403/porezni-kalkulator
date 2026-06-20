"use client";

import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import { getCities, type City } from "src/api/profile";

export function useCities() {
  return useQuery<City[]>({
    queryKey: ["cities"],
    queryFn: () => unwrap(getCities()),
    staleTime: 1000 * 60 * 60, // 1h, reference data, rarely changes
    retry: false,
  });
}

export function useCityLookup() {
  const { data: cities = [] } = useCities();

  function findByName(name: string | null | undefined): City | null {
    if (!name) return null;
    const trimmed = name.trim().toLowerCase();
    return cities.find((c) => c.name.toLowerCase() === trimmed) ?? null;
  }

  return { cities, findByName };
}
