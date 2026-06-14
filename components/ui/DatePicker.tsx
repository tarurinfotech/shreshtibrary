"use client";

import clsx from "clsx";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  type ChangeEvent,
  type ChangeEventHandler,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

/* ─── Constants ─────────────────────────────────────────────────────────── */

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ─── Utility helpers ────────────────────────────────────────────────────── */

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayKey() {
  return toDateKey(new Date());
}

function parseDate(value?: string | number | readonly string[]) {
  const text = Array.isArray(value) ? value[0] : String(value ?? "");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  )
    return null;
  return date;
}

function to24Hour(h12: number, ampm: string) {
  let h = h12;
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h;
}

function toDateTimeString(
  date: Date,
  hours12: number,
  minutes: number,
  ampm: string,
) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(to24Hour(hours12, ampm)).padStart(2, "0");
  const min = String(minutes).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function parseDateTime(value?: string | number | readonly string[]) {
  const text = Array.isArray(value) ? value[0] : String(value ?? "");
  const now = new Date();
  const fallback = () => {
    const h24 = now.getHours();
    const ampm = h24 >= 12 ? "PM" : "AM";
    const hours12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { date: null as Date | null, hours: hours12, minutes: now.getMinutes(), ampm };
  };

  if (!text) return fallback();

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!dateMatch) {
    const d = new Date(text);
    if (isNaN(d.getTime())) return fallback();
    const h24 = d.getHours();
    const ampm = h24 >= 12 ? "PM" : "AM";
    const hours12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { date: d, hours: hours12, minutes: d.getMinutes(), ampm };
  }

  const year = Number(dateMatch[1]);
  const monthIndex = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const date = new Date(year, monthIndex, day);

  const timeMatch = /[T\s](\d{2}):(\d{2})/.exec(text);
  let h24 = now.getHours();
  let minutes = now.getMinutes();
  if (timeMatch) {
    h24 = Number(timeMatch[1]);
    minutes = Number(timeMatch[2]);
  }

  const ampm = h24 >= 12 ? "PM" : "AM";
  const hours12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { date, hours: hours12, minutes, ampm };
}

function formatDateTimeLabel(
  value?: string | number | readonly string[],
  showTime?: boolean,
) {
  const { date, hours, minutes, ampm } = parseDateTime(value);
  if (!date) return "";
  const datePart = `${String(date.getDate()).padStart(2, "0")} ${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getFullYear()}`;
  if (showTime) {
    return `${datePart}, ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
  }
  return datePart;
}

function monthDays(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const total = new Date(year, monthIndex + 1, 0).getDate();
  const prevMonthLast = new Date(year, monthIndex, 0).getDate();
  const cells: Array<{ key: string; label: string; value: string; inMonth: boolean }> = [];

  const startDay = first.getDay();
  for (let i = startDay - 1; i >= 0; i--) {
    const dayNum = prevMonthLast - i;
    cells.push({
      key: `prev-${dayNum}`,
      label: String(dayNum),
      value: toDateKey(new Date(year, monthIndex - 1, dayNum)),
      inMonth: false,
    });
  }
  for (let day = 1; day <= total; day++) {
    const date = new Date(year, monthIndex, day);
    cells.push({ key: toDateKey(date), label: String(day), value: toDateKey(date), inMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      key: `next-${nextDay}`,
      label: String(nextDay),
      value: toDateKey(new Date(year, monthIndex + 1, nextDay)),
      inMonth: false,
    });
    nextDay++;
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

/* ─── Sub-components ─────────────────────────────────────────────────────── */

/** Scrollable column for hour / minute / AM-PM picker */
function TimeColumn({
  containerRef,
  items,
  selectedValue,
  onSelect,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  items: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-y-auto hide-scrollbar h-[200px] w-12 scroll-smooth"
    >
      <div className="h-[80px] shrink-0" />
      {items.map((item) => {
        const isSel = item === selectedValue;
        return (
          <button
            key={item}
            type="button"
            data-selected={isSel}
            className={clsx(
              "h-8 w-10 flex items-center justify-center text-xs rounded-md transition-all duration-150 font-bold shrink-0 my-0.5 cursor-pointer",
              isSel
                ? "bg-primary text-[color:var(--primary-contrast)] shadow-sm scale-105"
                : "text-foreground hover:bg-[color:var(--hover)]",
            )}
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        );
      })}
      <div className="h-[80px] shrink-0" />
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export interface DatePickerProps {
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
  /** When true, shows a side-by-side time-scroll picker (hour / minute / AM-PM) */
  showTime?: boolean;
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
  showTime = false,
}: DatePickerProps) {
  const generatedId = useId();
  const labelId = id ?? generatedId;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const popupRef   = useRef<HTMLDivElement>(null);
  const hourRef    = useRef<HTMLDivElement>(null);
  const minuteRef  = useRef<HTMLDivElement>(null);
  const ampmRef    = useRef<HTMLDivElement>(null);

  const {
    date: selectedDate,
    hours: selectedHours,
    minutes: selectedMinutes,
    ampm: selectedAmPm,
  } = useMemo(() => parseDateTime(value), [value]);

  const initialView = selectedDate ?? new Date();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, flipUp: false });
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const [showMonthOverlay, setShowMonthOverlay] = useState(false);

  const displayValue = useMemo(() => formatDateTimeLabel(value, showTime), [value, showTime]);
  const cells = useMemo(() => monthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const currentDate = todayKey();

  const hoursList   = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")), []);
  const minutesList = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);

  /* ── Position popup ── */
  const updatePosition = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const popupHeight = showTime ? 340 : 380;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < popupHeight + 16 && rect.top > popupHeight + 16;
    setCoords({
      top: flipUp ? rect.top - popupHeight - 8 : rect.bottom + 8,
      left: Math.min(rect.left, window.innerWidth - (showTime ? 480 : 320) - 8),
      flipUp,
    });
  };

  /* ── Outside click / escape / scroll listeners ── */
  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapperRef.current?.contains(t) && !popupRef.current?.contains(t)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };

    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ── Scroll time columns to selected ── */
  useEffect(() => {
    if (!open || !showTime) return;
    const timer = setTimeout(() => {
      for (const ref of [hourRef, minuteRef, ampmRef]) {
        const container = ref.current;
        if (!container) continue;
        const activeEl = container.querySelector('[data-selected="true"]') as HTMLElement | null;
        if (activeEl) {
          container.scrollTop = activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [open, showTime, selectedHours, selectedMinutes, selectedAmPm]);

  const moveMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const openPicker = () => {
    const view = selectedDate ?? new Date();
    setViewYear(view.getFullYear());
    setViewMonth(view.getMonth());
    setShowMonthOverlay(false);
    updatePosition();
    setOpen((v) => !v);
  };

  const handleDayClick = (cell: { value: string; inMonth: boolean }) => {
    const newDate = parseDate(cell.value) || new Date();
    if (!cell.inMonth) {
      setViewYear(newDate.getFullYear());
      setViewMonth(newDate.getMonth());
    }
    if (showTime) {
      emitChange(onChange, name, toDateTimeString(newDate, selectedHours, selectedMinutes, selectedAmPm));
    } else {
      emitChange(onChange, name, toDateKey(newDate));
      setOpen(false);
    }
  };

  const handleTimeChange = (type: "hour" | "minute" | "ampm", raw: string) => {
    const targetDate = selectedDate ?? new Date();
    const h = type === "hour" ? Number(raw) : selectedHours;
    const m = type === "minute" ? Number(raw) : selectedMinutes;
    const ap = type === "ampm" ? raw : selectedAmPm;
    emitChange(onChange, name, toDateTimeString(targetDate, h, m, ap));
  };

  /* ── Popup JSX ── */
  const popup = (
    <div
      ref={popupRef}
      role="dialog"
      aria-label={`${label} date picker`}
      style={{ top: coords.top, left: coords.left }}
      className={clsx(
        // layout
        "fixed z-[9999] select-none",
        showTime ? "flex gap-0" : "",
        // sizing
        showTime ? "w-[480px]" : "w-[308px]",
        // theming — use CSS design tokens so it works in both light & dark
        "rounded-2xl border border-[color:var(--border)]",
        "bg-[color:var(--panel)] text-[color:var(--foreground)]",
        "shadow-[0_24px_60px_rgba(0,0,0,0.18)]",
        // animation
        "animate-datepicker-drop",
      )}
    >
      {/* ── Calendar pane ── */}
      <div className={clsx("p-4", showTime ? "w-[280px] shrink-0" : "w-full")}>

        {showMonthOverlay ? (
          /* Month / Year overlay */
          <div className="flex flex-col min-h-[270px] justify-between">
            {/* Year nav */}
            <div className="flex items-center justify-between bg-[color:var(--field)] rounded-xl px-2 py-1.5 border border-[color:var(--border)]">
              <button
                type="button"
                onClick={() => setViewYear((y) => y - 1)}
                className="p-1 rounded-lg hover:bg-[color:var(--hover)] transition text-[color:var(--muted)] hover:text-[color:var(--foreground)] cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-black text-[color:var(--foreground)]">{viewYear}</span>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                className="p-1 rounded-lg hover:bg-[color:var(--hover)] transition text-[color:var(--muted)] hover:text-[color:var(--foreground)] cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-2 my-4">
              {MONTH_NAMES_SHORT.map((mon, idx) => {
                const isCurrent = viewMonth === idx;
                return (
                  <button
                    key={mon}
                    type="button"
                    onClick={() => { setViewMonth(idx); setShowMonthOverlay(false); }}
                    className={clsx(
                      "h-10 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer border",
                      isCurrent
                        ? "bg-primary text-[color:var(--primary-contrast)] border-transparent shadow-sm"
                        : "border-[color:var(--border)] bg-[color:var(--field)] text-[color:var(--foreground)] hover:bg-[color:var(--hover)]",
                    )}
                  >
                    {mon}
                  </button>
                );
              })}
            </div>

            {/* Back button */}
            <button
              type="button"
              onClick={() => setShowMonthOverlay(false)}
              className="w-full py-2 text-xs font-semibold border border-dashed border-[color:var(--border)] rounded-xl text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--hover)] transition cursor-pointer"
            >
              ← Back to Calendar
            </button>
          </div>
        ) : (
          <>
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setShowMonthOverlay(true)}
                className="flex items-center gap-1.5 text-sm font-black hover:opacity-75 transition cursor-pointer"
              >
                <span>{MONTH_NAMES_FULL[viewMonth]}, {viewYear}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[color:var(--muted)]" />
              </button>

              <div className="flex items-center gap-0.5 bg-[color:var(--field)] border border-[color:var(--border)] p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  aria-label="Previous month"
                  className="p-1.5 rounded-lg text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--hover)] transition cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  aria-label="Next month"
                  className="p-1.5 rounded-lg text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--hover)] transition cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
              {WEEKDAY_NAMES.map((d) => (
                <span key={d} className="py-1 text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-wide">
                  {d}
                </span>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {cells.map((cell) => {
                const isSelected = selectedDate ? toDateKey(selectedDate) === cell.value : false;
                const isToday    = cell.value === currentDate;
                const blocked    = cell.value ? isDisabledDate(cell.value, min, max) : true;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={blocked}
                    onClick={() => { if (!blocked) handleDayClick(cell); }}
                    className={clsx(
                      "focus-ring h-8 w-8 mx-auto rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center cursor-pointer",
                      isSelected
                        ? "bg-primary text-[color:var(--primary-contrast)] shadow-md scale-105"
                        : isToday
                          ? "border border-primary/40 bg-[color:var(--primary-soft)] text-primary"
                          : "text-[color:var(--foreground)] hover:bg-[color:var(--hover)]",
                      !cell.inMonth && !isSelected && "opacity-35",
                      blocked && "cursor-not-allowed opacity-20",
                    )}
                  >
                    {cell.label}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-[color:var(--border)] pt-3">
              <button
                type="button"
                disabled={required || !value}
                onClick={() => { emitChange(onChange, name, ""); setOpen(false); }}
                className="focus-ring rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-[color:var(--hover)] transition disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={isDisabledDate(currentDate, min, max)}
                onClick={() => {
                  const today = new Date();
                  if (showTime) {
                    emitChange(onChange, name, toDateTimeString(today, selectedHours, selectedMinutes, selectedAmPm));
                  } else {
                    emitChange(onChange, name, currentDate);
                    setOpen(false);
                  }
                }}
                className="focus-ring rounded-xl bg-[color:var(--primary-soft)] px-3 py-1.5 text-xs font-bold text-primary hover:bg-[color:var(--hover)] transition disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
              >
                Today
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Vertical divider ── */}
      {showTime && <div className="w-px bg-[color:var(--border)] self-stretch my-3 shrink-0" />}

      {/* ── Time picker pane ── */}
      {showTime && (
        <div className="flex gap-0 p-2 bg-[color:var(--field)] rounded-r-2xl flex-1 justify-around items-start">
          {/* Hour */}
          <TimeColumn
            containerRef={hourRef}
            items={hoursList}
            selectedValue={String(selectedHours).padStart(2, "0")}
            onSelect={(v) => handleTimeChange("hour", v)}
          />

          <div className="w-px bg-[color:var(--border)] self-stretch mx-0.5 my-4 shrink-0" />

          {/* Minute */}
          <TimeColumn
            containerRef={minuteRef}
            items={minutesList}
            selectedValue={String(selectedMinutes).padStart(2, "0")}
            onSelect={(v) => handleTimeChange("minute", v)}
          />

          <div className="w-px bg-[color:var(--border)] self-stretch mx-0.5 my-4 shrink-0" />

          {/* AM / PM */}
          <TimeColumn
            containerRef={ampmRef}
            items={["AM", "PM"]}
            selectedValue={selectedAmPm}
            onSelect={(v) => handleTimeChange("ampm", v)}
          />
        </div>
      )}
    </div>
  );

  return (
    <div ref={wrapperRef} className={clsx("relative grid gap-1.5 text-sm text-[color:var(--foreground)]", className)}>
      {/* Label */}
      <span
        id={`${labelId}-label`}
        className={
          hideLabel
            ? "sr-only"
            : "text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)]"
        }
      >
        {label}
        {required ? <span className="text-[color:var(--danger)] ml-0.5">*</span> : null}
      </span>

      {/* Trigger button */}
      <button
        id={labelId}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-labelledby={`${labelId}-label`}
        disabled={disabled}
        onClick={openPicker}
        className={clsx(
          "focus-ring flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-sm font-semibold shadow-sm transition-all duration-200",
          open
            ? "border-primary bg-[color:var(--field)] text-[color:var(--foreground)] ring-2 ring-[color:var(--primary)]/20"
            : "border-[color:var(--border)] bg-[color:var(--field)] text-[color:var(--foreground)] hover:border-primary/50 hover:bg-[color:var(--hover)]",
          !displayValue && "text-[color:var(--muted)]",
          error && "border-[color:var(--danger)] ring-1 ring-[color:var(--danger)]/20",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="truncate">{displayValue || placeholder}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-[color:var(--muted)]">
          <CalendarDays className="h-4 w-4" />
          <ChevronDown
            className={clsx("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
          />
        </span>
      </button>

      {/* Portal popup */}
      {open && typeof document !== "undefined"
        ? createPortal(popup, document.body)
        : null}

      {/* Error / helper */}
      {error ? (
        <span className="text-xs text-[color:var(--danger)]">{error}</span>
      ) : null}
      {!error && helper ? (
        <span className="text-xs text-[color:var(--muted)]">{helper}</span>
      ) : null}
    </div>
  );
}
