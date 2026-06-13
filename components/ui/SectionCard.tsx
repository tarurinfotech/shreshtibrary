import clsx from "clsx";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Surface } from "./Surface";

export function SectionCard({
  title,
  eyebrow,
  actions,
  children,
  className,
  contentClassName,
  animated = false,
  delay = 0,
  menu = false,
  padding = "lg",
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  animated?: boolean;
  delay?: number;
  menu?: boolean;
  padding?: "sm" | "md" | "lg";
}) {
  const hasHeader = title || eyebrow || actions || menu;

  return (
    <Surface
      as="section"
      padding={padding}
      className={clsx(animated && "report-card", className)}
      style={animated ? { animationDelay: `${delay * 36}ms` } : undefined}
    >
      {hasHeader ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow ? <p className="text-[11px] font-semibold uppercase text-muted truncate">{eyebrow}</p> : null}
            {title ? <h2 className="mt-0.5 font-semibold truncate">{title}</h2> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {menu ? (
              <button
                className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[color:var(--hover)] hover:text-foreground"
                type="button"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </Surface>
  );
}
