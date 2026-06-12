import clsx from "clsx";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

const variants: Record<BadgeVariant, string> = {
  neutral: "border-border bg-panel-strong text-foreground",
  success: "border-green-500/40 bg-green-500/12 text-green-600",
  warning: "border-amber-500/40 bg-amber-500/12 text-amber-600",
  danger: "border-red-500/40 bg-red-500/12 text-red-600",
  info: "border-blue-500/40 bg-blue-500/12 text-blue-600",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-lg border px-2 py-1 text-xs font-medium capitalize",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusVariant(status?: string): BadgeVariant {
  const value = status?.toLowerCase();
  if (value === "available" || value === "verified" || value === "active" || value === "approved" || value === "live") {
    return "success";
  }
  if (value === "pending" || value === "reserved" || value === "expired") {
    return "warning";
  }
  if (value === "failed" || value === "refunded" || value === "inactive" || value === "suspended") {
    return "danger";
  }
  if (value === "occupied" || value === "manual") {
    return "info";
  }
  return "neutral";
}
