"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export function Modal({
  open,
  title,
  icon,
  children,
  onClose,
  footer,
  className,
  description,
  closeLabel = "Close",
  iconOnlyClose = false,
  layout = "default",
  size = "default",
}: {
  open: boolean;
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  className?: string;
  description?: string;
  closeLabel?: string;
  iconOnlyClose?: boolean;
  layout?: "default" | "centered";
  size?: "default" | "lg" | "xl" | "2xl" | "full";
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    window.setTimeout(() => {
      const dialog = dialogRef.current;
      const firstFocusable = dialog?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable], details > summary',
      );
      (firstFocusable ?? dialog)?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable], details > summary',
      ),
    ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);

    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const sizeClasses = {
    default: "sm:min-w-[32rem] md:min-w-[36rem]",
    lg: "sm:min-w-[40rem] md:min-w-[48rem]",
    xl: "sm:min-w-[48rem] md:min-w-[56rem]",
    "2xl": "sm:min-w-[56rem] md:min-w-[72rem]",
    full: "w-[95vw] h-[95vh]",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 transition-all duration-300 animate-in fade-in"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className={`surface max-h-[95vh] flex flex-col w-full sm:w-auto ${sizeClasses[size ?? "default"]} overflow-hidden rounded-2xl shadow-2xl animate-modal-in relative ${className ?? "max-w-[95vw] md:max-w-fit"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-hover hover:text-foreground transition-colors outline-none focus-ring"
          aria-label={closeLabel}
        >
          <X className="h-5 w-5" />
        </button>

        {layout === "centered" ? (
          <div className="px-6 pt-10 pb-2 flex flex-col items-center text-center">
            {icon ? <div className="mb-6">{icon}</div> : null}
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
            {description ? <p id={descriptionId} className="mt-3 text-sm text-muted leading-relaxed max-w-xs">{description}</p> : null}
          </div>
        ) : (
          <div className="px-6 pt-6 pb-4 flex gap-4">
            {icon ? (
              <div className="shrink-0 flex items-center justify-center mt-0.5">
                {icon}
              </div>
            ) : null}
            <div className="flex-1">
              <h2 id={titleId} className="text-xl font-bold tracking-tight text-foreground pr-8">{title}</h2>
              {description ? <p id={descriptionId} className="mt-2 text-sm text-muted leading-relaxed">{description}</p> : null}
            </div>
          </div>
        )}
        
        {children ? <div className={layout === "centered" ? "flex-1 overflow-y-auto px-6 py-2 flex flex-col items-center text-center" : "flex-1 overflow-y-auto px-6 py-2"}>{children}</div> : null}
        
        {footer ? <div className={layout === "centered" ? "px-6 py-6 pb-8 bg-transparent" : "px-6 py-5 mt-2 bg-panel-strong/30"}>{footer}</div> : null}
      </div>
    </div>
  );
}
