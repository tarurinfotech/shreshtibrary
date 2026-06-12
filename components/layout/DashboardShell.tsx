"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { useAuthStore } from "@/store/authStore";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { access, hydrated, user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!access || !user) {
      router.replace("/login");
      return;
    }
    if (pathname.startsWith("/dashboard/admins") && user.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [access, hydrated, pathname, router, user]);

  if (!hydrated || !access || !user) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <LoadingBlock label="Checking session" />
      </main>
    );
  }

  const sidebarW = desktopSidebarOpen ? 256 : 96;

  return (
    <div className="min-h-screen bg-transparent">
      {/* Desktop sidebar – width driven by inline style so transition interpolates px values */}
      <div
        className="fixed inset-y-0 left-0 z-30 hidden md:block"
        style={{
          width: sidebarW,
          transition: "width 300ms ease-in-out",
        }}
      >
        <Sidebar user={user} expanded={desktopSidebarOpen} />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/65" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0">
            <Sidebar user={user} expanded onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="absolute right-4 top-4">
            <Button variant="secondary" size="icon" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
              Close navigation
            </Button>
          </div>
        </div>
      ) : null}

      {/* Main content – padding-left matches sidebar width and transitions together */}
      <div
        className="hidden md:block"
        style={{
          paddingLeft: sidebarW,
          transition: "padding-left 300ms ease-in-out",
        }}
      >
        <Topbar onMenu={() => setMobileOpen(true)} onDesktopMenu={() => setDesktopSidebarOpen((open) => !open)} />
        <main className="mx-auto grid w-full max-w-[1760px] gap-7 px-4 py-6 md:px-8">{children}</main>
      </div>

      {/* Mobile: no sidebar offset */}
      <div className="md:hidden">
        <Topbar onMenu={() => setMobileOpen(true)} onDesktopMenu={() => setDesktopSidebarOpen((open) => !open)} />
        <main className="mx-auto grid w-full max-w-[1760px] gap-7 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
