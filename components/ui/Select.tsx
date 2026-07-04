"use client";

import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/Avatar";

// ─── Types ──────────────────────────────────────────────────────────────────

type OptionItem = {
  value: string | number;
  label: string;
  disabled?: boolean;
  avatarSrc?: string | null;
  avatarFallback?: string | null;
  badge?: string;
  badgeTone?: "green" | "amber" | "red" | "blue" | "slate" | "pink";
  extraBadges?: Array<{ text: string; tone: "green" | "amber" | "red" | "blue" | "slate" | "pink" }>;
};

type SelectProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: OptionItem[];
  placeholder?: string;
  error?: string;
  helper?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  id?: string;
  className?: string;
};

// ─── CustomSelect ─────────────────────────────────────────────────────────────

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  error,
  helper,
  hideLabel = false,
  disabled = false,
  required = false,
  searchable = false,
  id,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [dropUp, setDropUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const inputId = id ?? labelId;

  const selected = options.find((opt) => String(opt.value) === String(value));
  
  const filteredOptions = searchable && search.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearch("");
      return;
    }

    const updateRect = () => {
      if (wrapperRef.current) {
        const currentRect = wrapperRef.current.getBoundingClientRect();
        setRect(currentRect);
        
        // Calculate if we should drop up
        const spaceBelow = window.innerHeight - currentRect.bottom;
        const spaceAbove = currentRect.top;
        const dropdownHeight = 300; // approximate max height of dropdown
        
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setDropUp(true);
        } else {
          setDropUp(false);
        }
      }
    };
    updateRect();
    // Re-calculate if window scrolls or resizes
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={clsx("relative grid gap-1.5 text-sm text-foreground", className)}>
      {/* Label */}
      <label
        id={inputId}
        className={hideLabel ? "sr-only" : "text-xs font-semibold uppercase tracking-normal text-muted"}
      >
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>

      {/* Trigger button */}
      <button
        id={inputId + "-btn"}
        type="button"
        disabled={disabled}
        aria-labelledby={inputId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((s) => !s)}
        className={clsx(
          "focus-ring relative flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3.5 text-left text-sm font-medium shadow-sm transition-all duration-150",
          open
            ? "border-primary bg-[color:var(--field)] text-foreground ring-2 ring-primary/20"
            : "border-border bg-[color:var(--field)] text-foreground hover:border-primary/50 hover:bg-[color:var(--hover)]",
          error && "border-danger ring-2 ring-danger/15",
          disabled && "cursor-not-allowed opacity-55",
        )}
      >
        <span className={clsx("flex items-center gap-2 truncate", !selected && "text-muted")}>
          {selected ? (
            <>
              {selected.avatarFallback != null && (
                <Avatar src={selected.avatarSrc} name={selected.avatarFallback} size="xs" />
              )}
              <span className="truncate">{selected.label}</span>
              {selected.badge && (
                <span className={clsx(
                  "ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  selected.badgeTone === "green" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                  selected.badgeTone === "amber" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                  selected.badgeTone === "red" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" :
                  selected.badgeTone === "blue" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" :
                  selected.badgeTone === "pink" ? "bg-pink-500/15 text-pink-600 dark:text-pink-400" :
                  "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                )}>
                  {selected.badge}
                </span>
              )}
              {selected.extraBadges?.map((eb, i) => (
                <span key={i} className={clsx(
                  "ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  eb.tone === "green" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                  eb.tone === "amber" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                  eb.tone === "red" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" :
                  eb.tone === "blue" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" :
                  eb.tone === "pink" ? "bg-pink-500/15 text-pink-600 dark:text-pink-400" :
                  "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                )}>
                  {eb.text}
                </span>
              ))}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={clsx(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown panel - Portaled */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          aria-labelledby={inputId}
          className="fixed z-[120] mt-1.5 overflow-hidden rounded-xl border border-border bg-panel shadow-[0_12px_40px_rgba(0,0,0,0.13)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          style={{
            top: rect ? (dropUp ? "auto" : rect.bottom) : 0,
            bottom: rect ? (dropUp ? window.innerHeight - rect.top + 4 : "auto") : "auto",
            left: rect ? rect.left : 0,
            width: rect ? rect.width : "auto",
            animation: dropUp ? "selectDropUp 140ms cubic-bezier(0.22, 1, 0.36, 1) both" : "selectDropIn 140ms cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          {searchable && (
            <div className="border-b border-border p-2">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-9 w-full rounded-lg bg-[color:var(--field)] px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted/60"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto overscroll-contain p-1.5">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted">No options</p>
            ) : (
              filteredOptions.map((opt) => {
                const active = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={opt.disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(String(opt.value));
                      setOpen(false);
                    }}
                    className={clsx(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-100",
                      active
                        ? "bg-[color:var(--primary-soft)] font-semibold text-primary"
                        : "text-foreground hover:bg-[color:var(--hover)] hover:text-foreground",
                      opt.disabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    {opt.avatarFallback != null && (
                      <Avatar src={opt.avatarSrc} name={opt.avatarFallback} size="xs" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    {opt.badge && (
                      <span className={clsx(
                        "ml-1.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                        opt.badgeTone === "green" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                        opt.badgeTone === "amber" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                        opt.badgeTone === "red" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" :
                        opt.badgeTone === "blue" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" :
                        opt.badgeTone === "pink" ? "bg-pink-500/15 text-pink-600 dark:text-pink-400" :
                        "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                      )}>
                        {opt.badge}
                      </span>
                    )}
                    {opt.extraBadges?.map((eb, i) => (
                      <span key={i} className={clsx(
                        "ml-1.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                        eb.tone === "green" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                        eb.tone === "amber" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                        eb.tone === "red" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" :
                        eb.tone === "blue" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" :
                        eb.tone === "pink" ? "bg-pink-500/15 text-pink-600 dark:text-pink-400" :
                        "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                      )}>
                        {eb.text}
                      </span>
                    ))}
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Helper / Error */}
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : helper ? (
        <span className="text-xs text-muted">{helper}</span>
      ) : null}
    </div>
  );
}

// ─── FilterSelect (compact, icon-prefixed variant for filter bars) ─────────────

type FilterSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: OptionItem[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

export function FilterSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "All",
  icon,
  className,
  disabled = false,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [dropUp, setDropUp] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      if (wrapperRef.current) {
        const currentRect = wrapperRef.current.getBoundingClientRect();
        setRect(currentRect);
        
        // Calculate if we should drop up
        const spaceBelow = window.innerHeight - currentRect.bottom;
        const spaceAbove = currentRect.top;
        const dropdownHeight = 250; // max-h-56 + padding
        
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setDropUp(true);
        } else {
          setDropUp(false);
        }
      }
    };
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={clsx("relative", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((s) => !s)}
        className={clsx(
          "focus-ring flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium shadow-sm transition-all duration-150",
          open
            ? "border-primary bg-[color:var(--field)] text-foreground ring-2 ring-primary/20"
            : "border-border bg-[color:var(--field-strong)] text-foreground hover:border-primary/50 hover:bg-[color:var(--hover)]",
          disabled && "cursor-not-allowed opacity-55",
        )}
      >
        {icon && <span className="shrink-0 text-muted">{icon}</span>}
        <span className={clsx("truncate text-sm", !selected && "text-muted")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          className="fixed z-[120] mt-1.5 overflow-hidden rounded-xl border border-border bg-panel shadow-[0_12px_40px_rgba(0,0,0,0.13)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          style={{
            top: rect ? (dropUp ? "auto" : rect.bottom) : 0,
            bottom: rect ? (dropUp ? window.innerHeight - rect.top + 4 : "auto") : "auto",
            left: rect ? rect.left : 0,
            minWidth: rect ? rect.width : "100%",
            animation: dropUp ? "selectDropUp 140ms cubic-bezier(0.22, 1, 0.36, 1) both" : "selectDropIn 140ms cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <div className="max-h-56 overflow-y-auto overscroll-contain p-1.5">
            {options.map((opt) => {
              const active = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(String(opt.value));
                    setOpen(false);
                  }}
                  className={clsx(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors duration-100",
                    active
                      ? "bg-[color:var(--primary-soft)] font-semibold text-primary"
                      : "text-foreground hover:bg-[color:var(--hover)]",
                  )}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
