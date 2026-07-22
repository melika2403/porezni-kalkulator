import { Suspense } from "react";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { PkInvoiceForm } from "src/sections/fakture/PkInvoiceForm";

export const metadata = { title: "Nova faktura" };

// Ista forma kao na marketing /fakture/nova (jedan izvor istine): faktura
// se snima u istu bazu pa je odmah vidljiva na obje strane. Nakon snimanja
// vraća na /app/fakture; interni "Nazad" forme je sakriven (imamo svoj).
// Prodavac je aktivna organizacija iz sidebara (bez kartice Prodavac).
export default function PkNovaFakturaPage() {
  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      <Link
        href="/app/fakture"
        className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-info-bg text-info text-[13px] font-medium mb-4 transition-colors hover:brightness-95"
      >
        <IconArrowLeft
          size={16}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Sve fakture
      </Link>
      <Suspense>
        <PkInvoiceForm />
      </Suspense>
    </div>
  );
}
