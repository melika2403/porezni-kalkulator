import type { City } from "src/api/profile";

/**
 * Spaja adresu, poštanski broj i grad u format:
 *   "Marka Marulića 5, 71000 Sarajevo"
 *
 * Ako fali poštanski broj — vraća "Marka Marulića 5, Sarajevo".
 * Ako fali grad — vraća samo "Marka Marulića 5".
 * Sve trim-uje i preskače prazne dijelove.
 */
export function formatAddress(
  address: string | null | undefined,
  city: string | null | undefined,
  postalCode?: string | null | undefined,
): string {
  const a = (address ?? "").trim();
  const c = (city ?? "").trim();
  const p = (postalCode ?? "").trim();

  const cityPart = [p, c].filter(Boolean).join(" ");
  return [a, cityPart].filter(Boolean).join(", ");
}

/**
 * Spaja adresu + grad koristeći cities lookup za poštanski broj.
 * Ako grad nije u tabeli — koristi samo string.
 */
export function formatAddressWithCities(
  address: string | null | undefined,
  city: string | null | undefined,
  cities: City[],
): string {
  if (!city) return formatAddress(address, city);
  const lookup = cities.find((c) => c.name.toLowerCase() === city.trim().toLowerCase());
  return formatAddress(address, city, lookup?.postalCode ?? null);
}
