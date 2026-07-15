import clsx from "clsx";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type SurfacePadding = "none" | "sm" | "md" | "lg";
type SurfaceVariant = "default" | "soft" | "plain";

type SurfaceOwnProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: SurfacePadding;
  variant?: SurfaceVariant;
};

type SurfaceProps<T extends ElementType> = SurfaceOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof SurfaceOwnProps<T>>;

const paddingClasses: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-3 sm:p-4",
  lg: "p-4 sm:p-5",
};

const variantClasses: Record<SurfaceVariant, string> = {
  default: "surface",
  soft: "surface-soft",
  plain: "border border-border bg-panel",
};

export function Surface<T extends ElementType = "div">({
  as,
  children,
  className,
  interactive = false,
  padding = "md",
  variant = "default",
  ...props
}: SurfaceProps<T>) {
  const Component = as ?? "div";

  return (
    <Component
      className={clsx(
        "rounded-lg",
        variantClasses[variant],
        paddingClasses[padding],
        interactive && "theme-hover transition hover:-translate-y-0.5",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
