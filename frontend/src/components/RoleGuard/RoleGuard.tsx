"use client";

import styles from "./RoleGuard.module.css";
import { useRole, type AppRole } from "src/hooks/useRole";

type Props = {
  roles: AppRole[];
  children: React.ReactNode;
  /** "disable" = prikaži ali onemogući (default), "hide" = sakrij */
  mode?: "disable" | "hide";
  label?: string;
};

export default function RoleGuard({
  roles,
  children,
  mode = "disable",
  label = "Samo računovođa",
}: Props) {
  const { hasRole } = useRole();

  if (hasRole(...roles)) return <>{children}</>;

  if (mode === "hide") return null;

  return (
    <div className={`${styles.wrapper} ${styles.disabled}`} title={`Pristup ograničen: ${label}`}>
      {children}
      <span className={styles.badge}>
        <span className={styles.lockIcon}>🔒</span>
        {label}
      </span>
    </div>
  );
}
