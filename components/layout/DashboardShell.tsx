"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, Loader } from "lucide-react";
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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  const toggleDesktopSidebar = () => {
    setDesktopSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("shresht-sidebar-expanded", String(next));
      }
      return next;
    });
  };

  const isRefreshingSession = hydrated && user && !access;

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Focus trap for mobile menu
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mobileOpen && mobileMenuRef.current) {
      mobileMenuRef.current.focus();
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!hydrated || isRefreshingSession) {
      return;
    }
    if (!access || !user) {
      router.replace("/login");
      return;
    }
    if (pathname.startsWith("/dashboard/admins") && user.role !== "super_admin" && user.role !== "sub_super_admin") {
      const hasPerm = Array.isArray(user.permissions) ? (user.permissions.includes("AdminManagement.View") || user.permissions.includes("all")) : Boolean((user.permissions as Record<string, unknown>)?.[("AdminManagement.View")]);
      if (!hasPerm) {
        router.replace("/dashboard");
      }
    }
  }, [access, hydrated, isRefreshingSession, pathname, router, user]);

  if (!hydrated || isRefreshingSession || !access || !user) {
    return (
      <main className="grid min-h-screen place-items-center p-6 bg-transparent">
        <Loader className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-transparent flex flex-col">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-primary"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar – width driven by Tailwind transition classes */}
      <div
        className={`fixed inset-y-0 left-0 z-40 hidden md:block transition-[width] duration-300 ease-in-out ${desktopSidebarOpen ? "w-[256px]" : "w-[96px]"}`}
      >
        <Sidebar user={user} expanded={desktopSidebarOpen} />
      </div>

      {mobileOpen ? (
        <div 
          className="fixed inset-0 z-[60] md:hidden" 
          role="dialog" 
          aria-modal="true" 
          aria-label="Mobile navigation"
          ref={mobileMenuRef}
          tabIndex={-1}
        >
          <div className="absolute inset-0 bg-black/65 transition-opacity" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-background shadow-xl">
            <Sidebar user={user} expanded onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="absolute right-4 top-4">
            <Button variant="secondary" size="icon" onClick={() => setMobileOpen(false)} title="Close navigation">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close navigation</span>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Main content – margin-left matches sidebar width and transitions together */}
      <div
        className={`hidden md:flex md:flex-col md:flex-1 w-full min-w-0 transition-[padding-left] duration-300 ease-in-out ${desktopSidebarOpen ? "pl-[256px]" : "pl-[96px]"}`}
      >
        <Topbar onMenu={() => setMobileOpen(true)} onDesktopMenu={toggleDesktopSidebar} />
        <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-[1760px] flex-col min-w-0 gap-4 px-4 py-4 md:gap-7 md:px-8 md:py-6 focus:outline-none">{children}</main>
      </div>

      {/* Mobile: no sidebar offset */}
      <div className="flex flex-col flex-1 min-w-0 md:hidden">
        <Topbar onMenu={() => setMobileOpen(true)} onDesktopMenu={toggleDesktopSidebar} />
        <main id="main-content-mobile" tabIndex={-1} className="mx-auto flex w-full max-w-[1760px] flex-col min-w-0 gap-4 px-4 py-4 md:gap-7 md:px-8 md:py-6 focus:outline-none">{children}</main>
      </div>
    </div>
  );
}
