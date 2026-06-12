"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight } from "lucide-react";
import { navItems } from "./nav";
import { useAuthStore } from "@/store/authStore";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to open (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery("");
    }
  }, [open]);

  // Filter navigation items
  const filteredNav = navItems.filter((item) => {
    if (item.superOnly && user?.role !== "super_admin") return false;
    if (item.permissionKey && user?.role !== "super_admin") {
      return Boolean(user?.permissions?.[item.permissionKey]);
    }
    return item.label.toLowerCase().includes(query.toLowerCase());
  });

  const handleSelect = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const handleSearchStudents = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) {
      router.push(`/dashboard/students?search=${encodeURIComponent(query)}`);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-within:ring-primary/30 flex h-11 w-full max-w-sm items-center gap-3 rounded-lg border border-border bg-panel px-4 text-sm text-muted shadow-[var(--shadow-soft)] transition hover:ring-4 hover:ring-primary/30"
      >
        <span className="min-w-0 flex-1 text-left">Search anything... (Ctrl+K)</span>
        <Search className="h-4 w-4 shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 p-4 pt-[10vh] sm:pt-[20vh]" onClick={() => setOpen(false)}>
          <div
            className="surface w-full max-w-xl overflow-hidden rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <form onSubmit={handleSearchStudents} className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-5 w-5 text-muted" />
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted"
                placeholder="Search students, pages, or actions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-muted hover:bg-muted/20 hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </form>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {query && (
                <div className="mb-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  Quick Actions
                </div>
              )}
              {query && (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[color:var(--hover)] hover:text-primary"
                  onClick={() => handleSelect(`/dashboard/students?search=${encodeURIComponent(query)}`)}
                >
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search students for "{query}"
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>
              )}

              <div className="mb-2 mt-4 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                Navigation
              </div>
              <div className="grid gap-1">
                {filteredNav.length > 0 ? (
                  filteredNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => handleSelect(item.href)}
                        className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[color:var(--hover)] hover:text-primary"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`grid h-8 w-8 place-items-center rounded-lg ${item.tone}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-foreground group-hover:text-primary">{item.label}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100 group-hover:translate-x-1" />
                      </button>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-sm text-muted">
                    No matching pages found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
