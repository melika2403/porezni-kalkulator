"use client";

// Nova faktura u PK Office-u: prodavac je UVIJEK aktivna organizacija iz
// sidebara (kartica Prodavac se ne prikazuje, podaci idu iz postavki obrta).
// ?vrsta=avansna otvara pojednostavljenu formu za avansnu fakturu.
import { useSearchParams } from "next/navigation";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import InvoiceForm from "./InvoiceForm";

export function PkInvoiceForm() {
  const { data: me, isLoading } = usePkOfficeMe();
  const searchParams = useSearchParams();
  const isAvans = searchParams.get("vrsta") === "avansna";
  const orgId =
    me?.activeOrganization?.id ?? me?.organizations?.[0]?.id ?? null;

  if (isLoading) {
    return (
      <div className="rounded-xl bg-cream-100 border border-cream-300 px-4 py-12 text-center text-text-tertiary text-[13px]">
        Učitavanje...
      </div>
    );
  }
  return (
    <InvoiceForm
      returnTo="/app/fakture"
      showBack={false}
      lockedSellerOrgId={orgId}
      docType={isAvans ? "AVANSNA" : "STANDARD"}
    />
  );
}
