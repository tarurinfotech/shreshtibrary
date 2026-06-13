"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { BookMarked, LogOut } from "lucide-react";
import { navItems } from "./nav";
import type { AuthUser } from "@/types/api";
import { useAuthStore } from "@/store/authStore";

export function Sidebar({ user, expanded, onNavigate }: { user: AuthUser; expanded?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  return (
    <aside className={clsx(
      "flex h-full w-full flex-col border-r border-border bg-[color:var(--sidebar)] py-5 shadow-[var(--shadow-soft)] overflow-hidden whitespace-nowrap",
      expanded ? "px-4" : "pl-[26px]"
    )}>
      <div className={clsx("mb-8 flex items-center overflow-hidden transition-all duration-300 ease-in-out", expanded ? "w-[224px]" : "w-[48px] -ml-[2px]")}>
        <div className="grid shrink-0 h-12 w-12 place-items-center rounded-full bg-primary text-[color:var(--primary-contrast)] shadow-[var(--shadow-soft)]">
          <BookMarked className="h-6 w-6" />
        </div>
        <div className={clsx("flex flex-col ml-3 transition-opacity duration-300 ease-in-out", expanded ? "opacity-100" : "opacity-0")}>
          <p className="text-sm font-bold tracking-normal text-foreground">Shresht</p>
          <p className="text-[10px] uppercase tracking-wider text-muted">Library</p>
        </div>
      </div>

      <nav className="grid gap-3">
        {navItems
          .filter((item) => {
            if (item.superOnly && user.role !== "super_admin") return false;
            if (item.permissionKey && user.role !== "super_admin") {
              return Boolean(user.permissions?.[item.permissionKey]);
            }
            return true;
          })
          .map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={clsx(
                  "focus-ring group relative flex h-11 items-center rounded-lg transition-all duration-300 ease-in-out overflow-hidden",
                  expanded ? "w-[224px] px-3" : "w-[44px] px-3",
                  active
                    ? "bg-primary text-[color:var(--primary-contrast)] shadow-[var(--shadow-soft)]"
                    : "text-muted hover:bg-[color:var(--primary-soft)] hover:text-primary",
                )}
                aria-label={item.label}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={clsx("font-medium ml-3 transition-opacity duration-300 ease-in-out", expanded ? "opacity-100" : "opacity-0")}>
                  {item.label}
                </span>
                {!expanded && (
                  <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-panel px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-[var(--shadow-soft)] transition group-hover:opacity-100">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      <div className="mt-auto grid gap-2">
        <div className={clsx("flex h-11 items-center rounded-lg transition-all duration-300 ease-in-out overflow-hidden", expanded ? "w-[224px] px-2 hover:bg-[color:var(--hover)]" : "w-[44px] pl-[4px]")} title={expanded ? undefined : user.username}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[color:var(--primary-soft)] text-primary">
            <span className="text-sm font-bold uppercase">{user.username.slice(0, 1)}</span>
          </div>
          <div className={clsx("flex flex-col ml-3 transition-opacity duration-300 ease-in-out", expanded ? "opacity-100" : "opacity-0")}>
            <p className="truncate text-sm font-semibold">{user.username}</p>
            <p className="truncate text-[10px] uppercase text-muted">{user.role.replace("_", " ")}</p>
          </div>
        </div>
        <div className={clsx("flex h-11 items-center text-muted transition-all duration-300 ease-in-out hover:text-danger cursor-pointer rounded-lg overflow-hidden", expanded ? "w-[224px] px-3" : "w-[44px] px-3")} title={expanded ? undefined : "Logout"} onClick={logout}>
          <LogOut className="h-5 w-5 shrink-0" />
          <span className={clsx("font-medium ml-3 transition-opacity duration-300 ease-in-out", expanded ? "opacity-100" : "opacity-0")}>
            Logout
          </span>
        </div>
      </div>
    </aside>
  );
}
