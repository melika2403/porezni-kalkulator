"use client";

import { useQuery } from "@tanstack/react-query";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import { unwrap } from "src/api/auth";
import { getGodine } from "src/api/freelancer";
import styles from "./freelancer.module.css";

export default function GodinaSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (g: number) => void;
}) {
  const { data: godine } = useQuery({
    queryKey: ["freelancer-godine"],
    queryFn: () => unwrap(getGodine()),
  });
  const lista = Array.from(new Set([...(godine ?? []), value])).sort((a, b) => b - a);
  return (
    <StyledSelect
      value={value}
      onChange={(v) => onChange(Number(v))}
      ariaLabel="Godina"
      wrapStyle={{ width: 170, flex: "0 0 auto" }}
      className={styles.godinaWrap}
      groups={[{ options: lista.map((g) => ({ value: g, label: `${g}. godina` })) }]}
    />
  );
}
