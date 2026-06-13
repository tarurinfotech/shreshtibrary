import React, { ReactNode } from "react";

export function EntityCard({
  avatar,
  title,
  subtitle,
  metadata,
  badge,
  actions,
  accentColor,
  className = "",
}: {
  avatar?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  metadata?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  accentColor?: string;
  className?: string;
}) {
  return (
    <div
      className={`group relative flex flex-col gap-2 rounded-xl border border-border bg-panel p-2.5 px-3 shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-primary/30 hover:shadow-sm sm:flex-row sm:flex-wrap xl:flex-nowrap sm:items-center ${className}`}
    >
      {/* Left accent bar */}
      {accentColor && (
        <div
          aria-hidden="true"
          className="absolute bottom-2.5 left-0 top-2.5 w-0.5 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: accentColor }}
        />
      )}

      {/* Avatar + Info */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {avatar && <div className="shrink-0">{avatar}</div>}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-xs text-muted">{subtitle}</div>}
        </div>
      </div>

      {/* Metadata */}
      {metadata && <div className="flex min-w-[160px] flex-col gap-1">{metadata}</div>}

      {/* Badge */}
      {badge && <div className="min-w-[90px]">{badge}</div>}

      {/* Actions */}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
