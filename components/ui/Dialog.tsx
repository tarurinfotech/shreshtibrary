"use client";

import { useState } from "react";
import { Button, type ButtonVariant } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import clsx from "clsx";

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
  const isDanger = variant === "danger";
  const Icon = isDanger ? undefined : variant === "success" ? CheckCircle2 : Info;
  const iconColor = isDanger ? "" : variant === "success" ? "text-success border-success/30" : "text-primary border-primary/30";

  return (
    <Modal
      open={open}
      title={title}
      description={message}
      layout="centered"
      icon={
        isDanger ? (
          <img src="/trash-illustration.svg" alt="Warning" className="h-28 w-28 drop-shadow-md" />
        ) : (
          <div className={clsx("flex h-16 w-16 items-center justify-center rounded-full bg-background border shadow-sm", iconColor)}>
            {Icon && <Icon className="h-8 w-8" />}
          </div>
        )
      }
      className="max-w-[95vw] sm:max-w-fit sm:min-w-[24rem]"
      onClose={onClose}
      footer={
        <div className="flex w-full justify-center gap-4 px-2">
          <Button 
            type="button" 
            variant="ghost" 
            className={clsx(
              "flex-1 py-5 text-base font-bold shadow-sm border",
              isDanger 
                ? "!border-danger !text-danger hover:!bg-danger/10" 
                : variant === "success" 
                  ? "!border-success !text-success hover:!bg-success/10"
                  : "!border-primary !text-primary hover:!bg-primary/10"
            )} 
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button 
            type="button" 
            variant={variant} 
            className="flex-1 py-5 text-base font-bold drop-shadow-md" 
            loading={loading} 
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    />
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
      className="max-w-[95vw] sm:max-w-fit sm:min-w-[28rem]"
      onClose={close}
      footer={
        <div className="flex justify-end gap-3">
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
      <div className="grid gap-4 py-2">
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
