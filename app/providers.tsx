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
            refetchOnReconnect: false,
            staleTime: 60 * 1000, // 60 seconds stale time for fast instant navigation
            gcTime: 15 * 60 * 1000, // 15 minutes cache retention
            placeholderData: (prev: any) => prev,
          },
        },
      }),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("shresht-admin-theme");
      const saved = raw ? JSON.parse(raw).state?.theme : null;
      if (saved && (saved === "light" || saved === "dark") && saved !== initialTheme) {
        setTheme(saved);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

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
