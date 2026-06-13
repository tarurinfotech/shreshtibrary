import clsx from "clsx";
import type { ReactNode } from "react";
import { Surface } from "./Surface";

type MetricTone = "neutral" | "blue" | "green" | "amber" | "red" | "violet" | "rose" | "sky" | "emerald";
type MetricSize = "sm" | "md" | "lg";

const toneClasses: Record<MetricTone, { icon: string; surface?: string }> = {
  neutral: { icon: "bg-[color:var(--primary-soft)] text-primary" },
  blue: { icon: "bg-blue-500/15 text-blue-600" },
  green: { icon: "bg-green-500/15 text-green-600" },
  amber: { icon: "bg-amber-500/15 text-amber-600" },
  red: { icon: "bg-red-500/15 text-red-600" },
  violet: { icon: "bg-violet-500/15 text-violet-600" },
  rose: { icon: "bg-rose-500/15 text-rose-600" },
  sky: { icon: "bg-sky-500/15 text-sky-600" },
  emerald: { icon: "bg-emerald-500/15 text-emerald-600" },
};

const valueClasses: Record<MetricSize, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

export function MetricTile({
  label,
  value,
  helper,
  icon,
  tone = "neutral",
  size = "md",
  loading = false,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  tone?: MetricTone;
  size?: MetricSize;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Surface className={className} padding={size === "sm" ? "sm" : "md"}>
      <div className="flex min-h-16 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className={clsx("mt-2 truncate font-semibold tracking-normal", valueClasses[size], loading && "h-8 w-24 animate-pulse rounded bg-muted/15 text-transparent")}>
            {value}
          </p>
          {helper ? <p className="mt-1 truncate text-xs text-muted">{helper}</p> : null}
        </div>
        {icon ? (
          <span className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-full", toneClasses[tone].icon)}>
            {icon}
          </span>
        ) : null}
      </div>
    </Surface>
  );
}
