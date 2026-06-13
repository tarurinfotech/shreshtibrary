"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "icon";

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return clsx(
    "focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
    size === "sm" && "h-11 md:h-9 px-3 text-sm",
    size === "md" && "h-12 md:h-10 px-4 text-sm",
    size === "icon" && "h-11 w-11 md:h-10 md:w-10",
    variant === "primary" &&
      "border-primary bg-primary text-[color:var(--primary-contrast)] hover:brightness-110",
    variant === "secondary" &&
      "border-border bg-panel text-foreground hover:border-primary/35 hover:bg-[color:var(--hover)]",
    variant === "ghost" &&
      "border-transparent bg-transparent text-muted shadow-none hover:bg-[color:var(--hover)] hover:text-foreground",
    variant === "danger" &&
      "border-danger bg-danger text-white hover:brightness-110",
    variant === "success" &&
      "border-success bg-success text-white hover:brightness-110",
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  tooltip?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  tooltip,
  className,
  children,
  disabled,
  title,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={buttonClasses({ variant, size, className })}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      title={tooltip ?? title}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {size !== "icon" ? children : <span className="sr-only">{children}</span>}
    </button>
  );
}
