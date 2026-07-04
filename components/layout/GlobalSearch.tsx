"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight } from "lucide-react";
import { navItems } from "./nav";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "@/lib/endpoints";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const searchResults = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: () => endpoints.globalSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Handle open state changes safely
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setQuery("");
    }
  };

  // Keyboard shortcut to open (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) setQuery("");
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    handleOpenChange(false);
  };

  const handleSearchStudents = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) {
      router.push(`/dashboard/students?search=${encodeURIComponent(query)}`);
      handleOpenChange(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="focus-within:ring-primary/30 flex h-11 w-full max-w-sm items-center gap-3 rounded-lg border border-border bg-panel px-4 text-sm text-muted shadow-[var(--shadow-soft)] transition hover:ring-4 hover:ring-primary/30"
      >
        <span className="min-w-0 flex-1 text-left">Search anything... (Ctrl+K)</span>
        <Search className="h-4 w-4 shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 p-4 pt-[10vh] sm:pt-[20vh]" onClick={() => handleOpenChange(false)}>
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
              <button type="button" onClick={() => handleOpenChange(false)} className="rounded-lg p-1 text-muted hover:bg-muted/20 hover:text-foreground">
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
                    Search students for &quot;{query}&quot;
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>
              )}
              
              {searchResults.isLoading && (
                <div className="py-6 text-center text-sm text-muted">Searching...</div>
              )}
              
              {searchResults.data && searchResults.data.students?.length > 0 && (
                <>
                  <div className="mb-2 mt-4 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                    Students
                  </div>
                  <div className="grid gap-1">
                    {searchResults.data.students.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelect(`/dashboard/students/${student.id}`)}
                        className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[color:var(--hover)] hover:text-primary"
                      >
                        <div className="flex items-center gap-3">
                          <ProfileAvatar src={student.profile_image} name={student.first_name || student.username} size="sm" shape="circle" />
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground group-hover:text-primary">{student.first_name} {student.last_name}</span>
                            <span className="text-xs text-muted">{student.mobile} • {student.student_id}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100 group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                </>
              )}
              
              {searchResults.data && searchResults.data.seats?.length > 0 && (
                <>
                  <div className="mb-2 mt-4 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                    Seats
                  </div>
                  <div className="grid gap-1">
                    {searchResults.data.seats.map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => handleSelect(`/dashboard/seats?search=${seat.seat_number}`)}
                        className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[color:var(--hover)] hover:text-primary"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary`}>
                            <Search className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground group-hover:text-primary">Seat {seat.seat_number}</span>
                            <span className="text-xs text-muted">Floor: {seat.floor} • Row: {seat.row}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100 group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                </>
              )}
              
              {searchResults.data && searchResults.data.payments?.length > 0 && (
                <>
                  <div className="mb-2 mt-4 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                    Payments
                  </div>
                  <div className="grid gap-1">
                    {searchResults.data.payments.map((payment) => (
                      <button
                        key={payment.id}
                        type="button"
                        onClick={() => handleSelect(`/dashboard/payments/${payment.id}`)}
                        className="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[color:var(--hover)] hover:text-primary"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`grid h-8 w-8 place-items-center rounded-lg bg-green-500/10 text-green-500`}>
                            <Search className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground group-hover:text-primary">{payment.transaction_id || `Payment #${payment.id}`}</span>
                            <span className="text-xs text-muted">{payment.student_name} • ₹{payment.amount}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-50 transition group-hover:opacity-100 group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                </>
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
                  !searchResults.data && (
                    <div className="py-6 text-center text-sm text-muted">
                      No matching pages found.
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
