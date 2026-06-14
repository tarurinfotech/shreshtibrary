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
            refetchOnWindowFocus: true, // Keep sync but less aggressive
            staleTime: 60 * 1000, // 60 seconds for freshness (faster response)
            gcTime: 10 * 60 * 1000, // 10 minutes
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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastHost />
      <ServerOfflineOverlay />
    </QueryClientProvider>
  );
}
