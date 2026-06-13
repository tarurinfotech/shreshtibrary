"use client";

import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> & {
  label: string;
  fileName?: string | null;
  helper?: string;
  error?: string;
  hideLabel?: boolean;
};

export function FileInput({
  label,
  fileName,
  helper,
  error,
  hideLabel = false,
  className,
  id,
  ...props
}: FileInputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid gap-2 text-sm text-foreground" htmlFor={inputId}>
      <span className={hideLabel ? "sr-only" : "text-xs font-semibold uppercase tracking-normal text-muted"}>{label}</span>
      <input
        id={inputId}
        className={clsx(
          "focus-ring w-full overflow-hidden text-ellipsis rounded-lg border border-border bg-[color:var(--field)] px-3 py-2 text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[color:var(--primary-contrast)]",
          error && "border-danger",
          className,
        )}
        type="file"
        {...props}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {!error && (fileName || helper) ? <span className="text-xs text-muted">{fileName ?? helper}</span> : null}
    </label>
  );
}
