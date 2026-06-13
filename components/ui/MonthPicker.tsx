"use client";

import clsx from "clsx";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const today = new Date();
  if (!match) {
    return { year: today.getFullYear(), monthIndex: today.getMonth() };
  }
  return {
    year: Number(match[1]),
    monthIndex: Math.min(Math.max(Number(match[2]) - 1, 0), 11),
  };
}

function formatMonth(value: string) {
  const { year, monthIndex } = parseMonth(value);
  return `${months[monthIndex]} ${year}`;
}

export function MonthPicker({
  label,
  value,
  onChange,
  className,
  hideLabel = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  hideLabel?: boolean;
}) {
  const labelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => parseMonth(value), [value]);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected.year);
  const today = new Date();
  const currentMonth = toMonthKey(today.getFullYear(), today.getMonth());

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={clsx("relative grid gap-2 text-sm text-foreground", className)}>
      <span id={labelId} className={hideLabel ? "sr-only" : "text-xs font-semibold uppercase tracking-normal text-muted"}>
        {label}
      </span>
      <button
        type="button"
        className={clsx(
          "focus-ring flex h-10 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-xs font-semibold shadow-sm transition",
          open
            ? "border-primary bg-[color:var(--field)] text-foreground ring-2 ring-primary/20"
            : "border-border bg-[color:var(--field)] text-foreground hover:border-primary/45 hover:bg-[color:var(--hover)]",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-labelledby={labelId}
        onClick={() => {
          if (!open) {
            setViewYear(selected.year);
          }
          setOpen((current) => !current);
        }}
      >
        <span className="truncate">{formatMonth(value)}</span>
        <span className="flex shrink-0 items-center gap-1 text-muted">
          <CalendarDays className="h-4 w-4" />
          <ChevronDown className={clsx("h-4 w-4 transition", open && "rotate-180")} />
        </span>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-[90] mt-2 w-[284px] rounded-lg border border-border bg-panel p-3 shadow-[var(--shadow-soft)]"
          role="dialog"
          aria-label={`${label} picker`}
        >
          <div className="flex items-center justify-between gap-3 rounded-lg bg-[color:var(--field-strong)] p-2">
            <button
              type="button"
              className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[color:var(--hover)] hover:text-foreground"
              onClick={() => setViewYear((year) => year - 1)}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase text-muted">Year</p>
              <p className="text-sm font-black text-foreground">{viewYear}</p>
            </div>
            <button
              type="button"
              className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[color:var(--hover)] hover:text-foreground"
              onClick={() => setViewYear((year) => year + 1)}
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {months.map((month, index) => {
              const optionValue = toMonthKey(viewYear, index);
              const active = optionValue === value;
              const isCurrent = optionValue === currentMonth;
              return (
                <button
                  key={month}
                  type="button"
                  className={clsx(
                    "focus-ring h-10 rounded-lg border text-xs font-bold transition",
                    active
                      ? "border-primary bg-primary text-[color:var(--primary-contrast)] shadow-[var(--shadow-soft)]"
                      : isCurrent
                        ? "border-primary/45 bg-[color:var(--primary-soft)] text-primary hover:bg-[color:var(--hover)]"
                        : "border-border bg-[color:var(--field)] text-foreground hover:border-primary/35 hover:bg-[color:var(--hover)]",
                  )}
                  onClick={() => {
                    onChange(optionValue);
                    setOpen(false);
                  }}
                >
                  {month}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              className="focus-ring rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-[color:var(--hover)] hover:text-foreground"
              onClick={() => setViewYear(today.getFullYear())}
            >
              Current year
            </button>
            <button
              type="button"
              className="focus-ring rounded-lg bg-[color:var(--primary-soft)] px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-[color:var(--hover)]"
              onClick={() => {
                onChange(currentMonth);
                setOpen(false);
              }}
            >
              This month
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
