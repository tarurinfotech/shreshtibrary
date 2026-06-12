import clsx from "clsx";
import type { FormHTMLAttributes, ReactNode } from "react";

export function FormShell({
  children,
  actions,
  className,
  surface = false,
  ...props
}: FormHTMLAttributes<HTMLFormElement> & {
  children: ReactNode;
  actions?: ReactNode;
  surface?: boolean;
}) {
  return (
    <form className={clsx("grid gap-4", surface && "surface rounded-lg p-5", className)} {...props}>
      {children}
      {actions ? <FormActions>{actions}</FormActions> : null}
    </form>
  );
}

export function FormGrid({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const classes = {
    1: "grid gap-4",
    2: "grid gap-4 md:grid-cols-2",
    3: "grid gap-4 md:grid-cols-3",
  }[columns];

  return <div className={clsx(classes, className)}>{children}</div>;
}

export function FormActions({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "between" | "end" | "start";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-wrap gap-2",
        align === "end" && "justify-end",
        align === "between" && "items-center justify-between",
        align === "start" && "justify-start",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("grid gap-3 md:grid-flow-col md:auto-cols-fr", className)}>{children}</div>;
}
