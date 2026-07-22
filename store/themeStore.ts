"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light";

type ThemeState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

function syncTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  // Instant 0ms synchronous DOM update
  document.documentElement.dataset.theme = theme;

  // Non-blocking cookie write
  try {
    document.cookie = `shresht-admin-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (e) {
    // Ignore cookie write errors
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => {
        syncTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const current = useThemeStore.getState().theme;
        const nextTheme = current === "dark" ? "light" : "dark";
        syncTheme(nextTheme);
        set({ theme: nextTheme });
      },
    }),
    {
      name: "shresht-admin-theme",
    },
  ),
);
