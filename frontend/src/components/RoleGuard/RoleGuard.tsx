"use client";

import styles from "./RoleGuard.module.css";
import { useRole, type AppRole } from "src/hooks/useRole";

type Props = {
  roles: AppRole[];
  children: React.ReactNode;
  /** "disable" = prikaži ali onemogući (default), "hide" = sakrij */
  mode?: "disable" | "hide";
  label?: string;
  /** Ako je proslijeđen, renderuje se umjesto disable/hide ponašanja kad korisnik nema ulogu. */
  fallback?: React.ReactNode;
};

export default function RoleGuard({
  roles,
  children,
  mode = "disable",
  label = "Pretplati se",
  fallback,
}: Props) {
  const { hasRole } = useRole();

  if (hasRole(...roles)) return <>{children}</>;

  if (fallback !== undefined) return <>{fallback}</>;

  if (mode === "hide") return null;

  return (
    <div
      className={`${styles.wrapper} ${styles.disabled}`}
      title={`Pristup ograničen: ${label}`}
    >
      {children}
      <span className={styles.badge}>{label}</span>
    </div>
  );
}
