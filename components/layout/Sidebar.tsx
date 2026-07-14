"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { BookMarked, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { navItems } from "./nav";
import type { AuthUser } from "@/types/api";
import { useAuthStore } from "@/store/authStore";
import { endpoints } from "@/lib/endpoints";
import { mediaUrl } from "@/lib/media";

export function Sidebar({ user, expanded, onNavigate }: { user: AuthUser; expanded?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);

  const info = useQuery({ queryKey: ["library-info"], queryFn: () => endpoints.libraryInfo() });
  const logoUrl = info.data?.logo ? mediaUrl(info.data.logo) : null;
  const bannerUrl = info.data?.banner_image ? mediaUrl(info.data.banner_image) : null;

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  return (
    <aside className={clsx(
      "flex h-full w-full flex-col border-r border-border bg-[color:var(--sidebar)] py-5 shadow-[var(--shadow-soft)] overflow-hidden whitespace-nowrap",
      expanded ? "px-4" : "pl-[26px]"
    )}>
      <div className={clsx("mb-8 flex items-center overflow-hidden transition-all duration-300 ease-in-out", expanded ? "w-full" : "w-[48px] -ml-[2px]")}>
        {expanded && bannerUrl ? (
          <div className="w-full flex items-center justify-center bg-white rounded-lg p-2 shadow-sm border border-border/50">
            <img src={bannerUrl} alt="Library Banner" className="w-full h-auto max-h-14 object-contain" />
          </div>
        ) : (
          <>
            <div className={clsx("grid shrink-0 h-12 w-12 place-items-center rounded-full shadow-[var(--shadow-soft)] overflow-hidden", !logoUrl && "bg-primary text-[color:var(--primary-contrast)]")}>
              {logoUrl ? (
                <img src={logoUrl} alt="Library Logo" className="h-full w-full object-cover" />
              ) : (
                <BookMarked className="h-6 w-6" />
              )}
            </div>
            <div className={clsx("flex flex-col ml-3 transition-opacity duration-300 ease-in-out", expanded ? "opacity-100" : "opacity-0")}>
              <p className="text-sm font-bold tracking-normal text-foreground truncate">{info.data?.library_name || "Shresht"}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted">Library</p>
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar">
        <div className="grid gap-3 pb-4">
          {navItems
          .filter((item) => {
            if (item.superOnly && user.role !== "super_admin") return false;
            if (item.permissionKey && user.role !== "super_admin" && user.role !== "sub_super_admin") {
              if (Array.isArray(user.permissions)) {
                return user.permissions.includes(item.permissionKey);
              }
              // Fallback for old object format
              return Boolean(user.permissions?.[item.permissionKey as keyof typeof user.permissions]);
            }
            return true;
          })
          .map((item, index) => {
            if (item.divider) {
              return <div key={`divider-${index}`} className="my-1 h-px w-full bg-border" />;
            }

            const href = item.href as string;
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            const Icon = item.icon;

            if (!Icon) return null;

            return (
              <Link
                key={href}
                href={href}
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
        </div>
      </nav>

      <div className="mt-auto grid shrink-0 gap-2 pt-4">
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
