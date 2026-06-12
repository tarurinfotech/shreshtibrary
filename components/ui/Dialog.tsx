"use client";

import { useState } from "react";
import { Button, type ButtonVariant } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={message}
      className="max-w-[95vw] sm:max-w-fit sm:min-w-[32rem]"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{cancelLabel}</Button>
          <Button type="button" variant={variant} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      }
    >
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  );
}

export function PromptDialog({
  open,
  title,
  message,
  label,
  placeholder,
  confirmLabel = "Submit",
  cancelLabel = "Cancel",
  initialValue = "",
  required = true,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: string;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  initialValue?: string;
  required?: boolean;
  loading?: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const close = () => {
    setValue(initialValue);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={title}
      description={message}
      className="max-w-[95vw] sm:max-w-fit sm:min-w-[32rem]"
      onClose={close}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>{cancelLabel}</Button>
          <Button
            type="button"
            loading={loading}
            disabled={required && !value.trim()}
            onClick={() => onConfirm(value.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        {message ? <p className="text-sm text-muted">{message}</p> : null}
        <Input
          autoFocus
          label={label}
          placeholder={placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required={required}
        />
      </div>
    </Modal>
  );
}
