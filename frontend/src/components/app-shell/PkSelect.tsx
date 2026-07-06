"use client";

import type { CSSProperties } from "react";
import StyledSelect, {
  type SelectGroup,
  type SelectOption,
} from "src/components/StyledSelect/StyledSelect";

// PK Office dropdown: isti StyledSelect kao na marketing dijelu (panel kroz
// portal, tastatura, opcioni search), samo sa PK Office dimenzijama inputa
// (13px, py-2, radius 8). Svaki dropdown u /app koristi ovu komponentu,
// ne native <select>.
export function PkSelect({
  value,
  onChange,
  options,
  groups,
  placeholder,
  searchable,
  searchPlaceholder,
  disabled,
  ariaLabel,
  fitPanel = true,
  wrapStyle,
}: {
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  /** Ravna lista opcija; za grupisane opcije koristiti `groups`. */
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  fitPanel?: boolean;
  /** Layout wrappera (width, maxWidth, flex...). Default širina po sadržaju. */
  wrapStyle?: CSSProperties;
}) {
  return (
    <StyledSelect
      value={value}
      onChange={onChange}
      groups={groups ?? [{ options: options ?? [] }]}
      placeholder={placeholder}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      ariaLabel={ariaLabel}
      fitPanel={fitPanel}
      style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8 }}
      wrapStyle={{ width: "auto", ...wrapStyle }}
    />
  );
}

export type { SelectGroup, SelectOption };
