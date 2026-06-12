import clsx from "clsx";
import type { ReactNode } from "react";

export function EntityListItem({
  leading,
  title,
  meta,
  trailing,
  actions,
  density = "md",
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  actions?: ReactNode;
  density?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong",
        density === "sm" ? "p-2.5" : "p-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          <p className={clsx("truncate font-medium", density === "sm" && "text-sm")}>{title}</p>
          {meta ? <p className="mt-0.5 truncate text-xs text-muted">{meta}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        {actions}
      </div>
    </div>
  );
}
