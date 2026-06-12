"use client";

import clsx from "clsx";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { type ChangeEvent, type ChangeEventHandler, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function todayKey() {
  return toDateKey(new Date());
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value?: string | number | readonly string[]) {
  const text = Array.isArray(value) ? value[0] : String(value ?? "");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);
  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) {
    return null;
  }
  return date;
}

function formatDateLabel(value?: string | number | readonly string[]) {
  const parsed = parseDate(value);
  if (!parsed) {
    return "";
  }
  return `${String(parsed.getDate()).padStart(2, "0")} ${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

function monthTitle(year: number, monthIndex: number) {
  return `${monthNames[monthIndex]} ${year}`;
}

function monthDays(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const total = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<{ key: string; label: string; value?: string; inMonth: boolean }> = [];

  for (let index = 0; index < first.getDay(); index += 1) {
    cells.push({ key: `pad-start-${index}`, label: "", inMonth: false });
  }

  for (let day = 1; day <= total; day += 1) {
    const date = new Date(year, monthIndex, day);
    cells.push({ key: toDateKey(date), label: String(day), value: toDateKey(date), inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `pad-end-${cells.length}`, label: "", inMonth: false });
  }

  return cells;
}

function emitChange(
  onChange: ChangeEventHandler<HTMLInputElement> | undefined,
  name: string | undefined,
  value: string,
) {
  onChange?.({
    target: { name, value },
    currentTarget: { name, value },
  } as unknown as ChangeEvent<HTMLInputElement>);
}

function isDisabledDate(value: string, min?: string | number, max?: string | number) {
  const minText = String(min ?? "");
  const maxText = String(max ?? "");
  return Boolean((minText && value < minText) || (maxText && value > maxText));
}

export function DatePicker({
  label,
  value,
  onChange,
  className,
  id,
  name,
  error,
  helper,
  hideLabel = false,
  required,
  disabled,
  min,
  max,
  placeholder = "Select date",
}: {
  label: string;
  value?: string | number | readonly string[];
  onChange?: ChangeEventHandler<HTMLInputElement>;
  className?: string;
  id?: string;
  name?: string;
  error?: string;
  helper?: string;
  hideLabel?: boolean;
  required?: boolean;
  disabled?: boolean;
  min?: string | number;
  max?: string | number;
  placeholder?: string;
}) {
  const generatedId = useId();
  const labelId = id ?? generatedId;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => parseDate(value), [value]);
  const initialView = selected ?? new Date();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const dateValue = Array.isArray(value) ? value[0] : String(value ?? "");
  const displayValue = formatDateLabel(value);
  const cells = monthDays(viewYear, viewMonth);
  const currentDate = todayKey();

  const updatePosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      // Position the popup exactly below the input field, with a small 8px gap.
      // Make sure the portal fits on the screen vertically if needed (advanced logic can be added later)
      setCoords({ top: rect.bottom + 8, left: rect.left });
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    updatePosition();

    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !popupRef.current?.contains(target)) {
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
    window.addEventListener("scroll", updatePosition, true); // true to catch capture phase scroll
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const moveMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const openPicker = () => {
    const view = selected ?? new Date();
    setViewYear(view.getFullYear());
    setViewMonth(view.getMonth());
    updatePosition();
    setOpen((current) => !current);
  };

  return (
    <div 
      ref={wrapperRef} 
      className={clsx("relative grid gap-2 text-sm text-foreground", className)}
    >
      <span id={`${labelId}-label`} className={hideLabel ? "sr-only" : "text-xs font-semibold uppercase tracking-normal text-muted"}>
        {label}{required ? <span className="text-danger"> *</span> : null}
      </span>
      <button
        id={labelId}
        type="button"
        className={clsx(
          "focus-ring flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3.5 text-left text-sm font-semibold shadow-sm transition",
          open
            ? "border-primary bg-[color:var(--field)] text-foreground ring-2 ring-primary/20"
            : "border-border bg-[color:var(--field)] text-foreground hover:border-primary/45 hover:bg-[color:var(--hover)]",
          !displayValue && "text-muted",
          error && "border-danger",
          disabled && "cursor-not-allowed opacity-60",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-labelledby={`${labelId}-label`}
        disabled={disabled}
        onClick={openPicker}
      >
        <span className="truncate">{displayValue || placeholder}</span>
        <span className="flex shrink-0 items-center gap-1 text-muted">
          <CalendarDays className="h-4 w-4" />
          <ChevronDown className={clsx("h-4 w-4 transition", open && "rotate-180")} />
        </span>
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={popupRef}
          className="fixed z-[9999] w-[320px] rounded-lg border border-border bg-panel p-3 shadow-[var(--shadow-soft)]"
          style={{ top: coords.top, left: coords.left }}
          role="dialog"
          aria-label={`${label} picker`}
        >
          <div className="flex items-center justify-between gap-3 rounded-lg bg-[color:var(--field-strong)] p-2">
            <button
              type="button"
              className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[color:var(--hover)] hover:text-foreground"
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase text-muted">Month</p>
              <p className="text-sm font-black text-foreground">{monthTitle(viewYear, viewMonth)}</p>
            </div>
            <button
              type="button"
              className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[color:var(--hover)] hover:text-foreground"
              onClick={() => moveMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
            {weekdayNames.map((day) => (
              <span key={day} className="py-1 text-[11px] font-bold text-muted">
                {day}
              </span>
            ))}
            {cells.map((cell) => {
              const active = cell.value === dateValue;
              const today = cell.value === currentDate;
              const blocked = cell.value ? isDisabledDate(cell.value, min, max) : true;
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={clsx(
                    "focus-ring h-9 rounded-lg border text-xs font-bold transition",
                    !cell.inMonth && "pointer-events-none border-transparent bg-transparent",
                    active
                      ? "border-primary bg-primary text-[color:var(--primary-contrast)] shadow-[var(--shadow-soft)]"
                      : today
                        ? "border-primary/45 bg-[color:var(--primary-soft)] text-primary hover:bg-[color:var(--hover)]"
                        : "border-border bg-[color:var(--field)] text-foreground hover:border-primary/35 hover:bg-[color:var(--hover)]",
                    blocked && cell.inMonth && "cursor-not-allowed opacity-35",
                  )}
                  disabled={blocked}
                  onClick={() => {
                    if (!cell.value) {
                      return;
                    }
                    emitChange(onChange, name, cell.value);
                    setOpen(false);
                  }}
                >
                  {cell.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              className="focus-ring rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-[color:var(--hover)] hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              disabled={required || !dateValue}
              onClick={() => {
                emitChange(onChange, name, "");
                setOpen(false);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="focus-ring rounded-lg bg-[color:var(--primary-soft)] px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-[color:var(--hover)] disabled:pointer-events-none disabled:opacity-40"
              disabled={isDisabledDate(currentDate, min, max)}
              onClick={() => {
                emitChange(onChange, name, currentDate);
                setOpen(false);
              }}
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      ) : null}

      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {!error && helper ? <span className="text-xs text-muted">{helper}</span> : null}
    </div>
  );
}
