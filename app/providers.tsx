"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ToastHost } from "@/components/ui/ToastHost";
import { ServerOfflineOverlay } from "@/components/ui/ServerOfflineOverlay";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { refreshAccessToken } from "@/lib/api";

export function AppProviders({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: ThemeMode;
}) {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const { user, access, hydrated } = useAuthStore();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false, // Disabled to prevent excessive API calls on tab switch
            staleTime: 30 * 1000, // 30 seconds for freshness (mutations invalidate cache immediately)
            gcTime: 15 * 60 * 1000, // 15 minutes
          },
        },
      }),
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.add("theme-transition");
    document.cookie = `shresht-admin-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [theme]);

  useEffect(() => {
    let nextTheme = initialTheme;
    try {
      const raw = window.localStorage.getItem("shresht-admin-theme");
      const saved = raw ? JSON.parse(raw).state?.theme : null;
      nextTheme = saved === "light" ? "light" : saved === "dark" ? "dark" : initialTheme;
    } catch {
      nextTheme = initialTheme;
    }

    setTheme(nextTheme);
  }, [initialTheme, setTheme]);

  // Restore access token on load if user is logged in
  useEffect(() => {
    if (hydrated && user && !access) {
      refreshAccessToken().catch(() => {
        useAuthStore.getState().clearSession();
      });
    }
  }, [hydrated, user, access]);

  // Proactive silent token refresh
  useEffect(() => {
    if (!hydrated || !user || !access) return;

    const checkAndRefresh = () => {
      const currentAccess = useAuthStore.getState().access;
      if (!currentAccess) return;

      try {
        const payloadStr = atob(currentAccess.split(".")[1]);
        const payload = JSON.parse(payloadStr);
        if (payload.exp) {
          const expiryTime = payload.exp * 1000;
          const timeUntilExpiry = expiryTime - Date.now();
          
          // If token expires in less than 10 minutes, refresh it proactively
          if (timeUntilExpiry > 0 && timeUntilExpiry < 10 * 60 * 1000) {
            refreshAccessToken().catch(console.error);
          }
        }
      } catch (e) {
        console.error("Failed to check token expiry", e);
      }
    };

    // Check every minute
    const intervalId = setInterval(checkAndRefresh, 60 * 1000);

    // Check on tab focus / wake up from sleep
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkAndRefresh();
      }
    };
    
    window.addEventListener("focus", checkAndRefresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", checkAndRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hydrated, user, access]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastHost />
      <ServerOfflineOverlay />
    </QueryClientProvider>
  );
}
