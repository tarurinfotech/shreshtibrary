import React, { ReactNode } from "react";

export function EntityCard({
  avatar,
  title,
  subtitle,
  metadata,
  badge,
  extra,
  actions,
  accentColor,
  className = "",
}: {
  avatar?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  metadata?: ReactNode;
  badge?: ReactNode;
  extra?: ReactNode;
  actions?: ReactNode;
  accentColor?: string;
  className?: string;
}) {
  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-[24px] border border-border bg-panel p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 hover:border-primary/40 hover:shadow-lg sm:flex-row ${className}`}
    >
      {accentColor && (
        <div
          aria-hidden="true"
          className="absolute bottom-4 left-0 top-4 w-1 rounded-r-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: accentColor }}
        />
      )}

      {/* Avatar / Image on the left */}
      {avatar && (
        <div className="shrink-0 flex items-stretch">
          <div className="flex h-28 w-28 sm:h-auto sm:w-32 items-center justify-center overflow-hidden rounded-2xl bg-panel-strong [&>div]:!h-full [&>div]:!w-full [&>div]:!rounded-2xl [&>div]:!min-h-[120px]">
            {avatar}
          </div>
        </div>
      )}

      {/* Content on the right */}
      <div className="flex flex-1 flex-col justify-between py-1">
        <div>
          {/* Top Row: Metadata & Badge */}
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted/80">
              {metadata || " "}
            </div>
            {badge && <div>{badge}</div>}
          </div>

          {/* Title */}
          <div className="text-lg font-extrabold leading-tight tracking-tight text-foreground line-clamp-2">
            {title}
          </div>

          {/* Subtitle / Description */}
          {subtitle && (
            <div className="mt-2 text-xs font-medium text-muted line-clamp-2">
              <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-widest text-muted/60">
                Description
              </span>
              {subtitle}
            </div>
          )}

          {/* Extra / Options */}
          {extra && (
            <div className="mt-3 text-xs">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-muted/60">
                Options
              </span>
              {extra}
            </div>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="mt-4 flex flex-wrap items-center gap-2 [&>button]:rounded-full [&>button]:px-5 [&>button]:font-bold">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
