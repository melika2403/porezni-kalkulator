"use client";

// Tanki omotač: sadržaj je u dijeljenoj komponenti IzvodDetalj (koristi je i
// Inbox pop-up za grupni uvoz). Stranica dodaje URL parametre, back link i
// navigaciju nakon "Potvrdi sve" / brisanja.
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { IzvodDetalj } from "src/sections/bankovni-izvodi/IzvodDetalj";

export default function IzvodDetaljPage() {
  const params = useParams<{ statementId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statementId = Number(params.statementId) || null;
  // ?bezKategorije=1 (klik na žuti badge sa liste): prikaži samo stavke
  // bez KPR kategorije, sa napomenom i dugmetom za povratak na sve
  const samoBezKategorije = searchParams.get("bezKategorije") === "1";

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      <Link
        href="/app/bankovni-izvodi"
        className="group inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-info-bg text-info text-[14px] font-medium hover:bg-[#c9ddee] transition-colors mb-4"
      >
        <IconArrowLeft
          size={18}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Svi izvodi
      </Link>

      <IzvodDetalj
        orgId={orgId}
        statementId={statementId}
        samoBezKategorije={samoBezKategorije}
        onPrikaziSve={() => router.replace(pathname)}
        onSveGotovo={() => router.push("/app/bankovni-izvodi")}
        onDeleted={() => router.push("/app/bankovni-izvodi")}
      />
    </div>
  );
}
