"use client";
import clsx from "clsx";
import type { TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  error?: string;
  helper?: string;
  hideLabel?: boolean;
};

export function Textarea({
  label,
  error,
  helper,
  hideLabel = false,
  className,
  id,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid gap-2 text-sm text-foreground" htmlFor={inputId}>
      <span className={hideLabel ? "sr-only" : clsx("text-xs font-semibold uppercase tracking-normal", error ? "text-danger" : "text-muted")}>{label}</span>
      <textarea
        id={inputId}
        className={clsx(
          "focus-ring min-h-24 rounded-lg border border-border bg-field px-3.5 py-2.5 text-sm text-foreground shadow-sm transition placeholder:text-muted hover:border-primary/45 hover:bg-hover",
          error && "border-danger",
          className,
        )}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined
        }
        {...props}
      />
      {error ? <span id={`${inputId}-error`} className="text-xs text-danger">{error}</span> : null}
      {!error && helper ? <span id={`${inputId}-helper`} className="text-xs text-muted">{helper}</span> : null}
    </label>
  );
}
