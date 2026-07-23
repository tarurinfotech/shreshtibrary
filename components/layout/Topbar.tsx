"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, Moon, Sun, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { endpoints } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { GlobalSearch } from "./GlobalSearch";

export function Topbar({ onMenu, onDesktopMenu }: { onMenu: () => void; onDesktopMenu: () => void }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const inbox = useQuery({ queryKey: ["admin-inbox-topbar"], queryFn: endpoints.adminInbox, refetchInterval: 30000 });

  const unreadInboxCount = useMemo(
    () => {
      try {
        return (inbox.data ?? []).filter((n: { is_read: boolean }) => !n.is_read).length;
      } catch (e) {
        return 0;
      }
    },
    [inbox.data],
  );

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 w-full z-50 flex h-16 md:h-24 items-center justify-between gap-1 md:gap-4 bg-[color:var(--sidebar)] border-b border-border px-2 md:px-8 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu}>
          <Menu className="h-5 w-5" />
          Open navigation
        </Button>
        <button
          type="button"
          className="focus-ring hidden h-11 w-11 place-items-center rounded-lg text-muted transition hover:bg-hover hover:text-foreground md:grid"
          onClick={onDesktopMenu}
        >
          <Menu className="h-6 w-6" />
        </button>
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          icon={<RefreshCw className="h-5 w-5" />}
          onClick={() => window.location.reload()}
          title="Refresh page"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          icon={theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          onClick={toggleTheme}
          title={theme === "dark" ? "Light theme" : "Dark theme"}
        />
        <Link href="/dashboard/inbox" className="focus-ring relative grid h-11 w-11 place-items-center rounded-lg text-muted transition hover:bg-hover hover:text-foreground" title="Notifications Inbox">
          <Bell className="h-5 w-5" />
          {unreadInboxCount > 0 ? (
            <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
              {unreadInboxCount > 9 ? "9+" : unreadInboxCount}
            </span>
          ) : null}
        </Link>
        {user ? (
          <Link
            href="/dashboard/profile"
            className="focus-ring hidden items-center gap-2.5 rounded-full border border-border/60 bg-panel p-1 pr-4 shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-panel-strong hover:shadow-md sm:flex"
          >
            <Avatar
              src={user?.profile_image}
              name={user ? (user.first_name || user.username) : null}
              size="sm"
              shape="circle"
              ring
            />
            <div className="flex min-w-0 flex-col">
              <span className="max-w-36 truncate text-sm font-semibold leading-tight text-foreground">
                {user.first_name || user.username}
              </span>
              <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-primary/70">
                {user.role.replace("_", " ")}
              </span>
            </div>
          </Link>
        ) : null}
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" icon={<LogOut className="h-5 w-5" />} onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
