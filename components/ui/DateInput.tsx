"use client";
import type { InputHTMLAttributes } from "react";
import { DatePicker } from "./DatePicker";

type FieldProps = {
  label: string;
  error?: string;
  helper?: string;
  hideLabel?: boolean;
};

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
