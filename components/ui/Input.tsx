"use client";

import clsx from "clsx";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { DatePicker } from "./DatePicker";

type FieldProps = {
  label: string;
  error?: string;
  helper?: string;
  hideLabel?: boolean;
};

export function Input({
  label,
  error,
  helper,
  hideLabel = false,
  className,
  id,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid gap-2 text-sm text-foreground" htmlFor={inputId}>
      <span className={hideLabel ? "sr-only" : clsx("text-xs font-semibold uppercase tracking-normal", error ? "text-danger" : "text-muted")}>{label}</span>
      <input
        id={inputId}
        className={clsx(
          "focus-ring h-11 rounded-lg border border-border bg-field px-3.5 text-sm text-foreground shadow-sm transition placeholder:text-muted hover:border-primary/45 hover:bg-hover",
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

export function DateInput({
  label,
  error,
  helper,
  hideLabel = false,
  className,
  id,
  value,
  onChange,
  name,
  required,
  disabled,
  min,
  max,
  placeholder,
  showTime,
  ...props
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { showTime?: boolean }) {
  return (
    <DatePicker
      id={id}
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      min={min}
      max={max}
      placeholder={placeholder}
      error={error}
      helper={helper}
      hideLabel={hideLabel}
      className={className}
      showTime={showTime}
      {...props}
    />
  );
}

export function TimeInput({
  label,
  error,
  helper,
  hideLabel = false,
  className,
  id,
  value,
  onChange,
  name,
  required,
  disabled,
  placeholder = "Select time",
  ...props
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <DatePicker
      id={id}
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      error={error}
      helper={helper}
      hideLabel={hideLabel}
      className={className}
      timeOnly={true}
      {...props}
    />
  );
}

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

export function Switch({
  label,
  checked,
  onChange,
  disabled,
}: {
  label?: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm">
      <span className="relative inline-flex">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <span className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-disabled:opacity-50" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
      {label ? <span className="text-foreground">{label}</span> : null}
    </label>
  );
}
