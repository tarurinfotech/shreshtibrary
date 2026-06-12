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

  document.documentElement.dataset.theme = theme;
  document.cookie = `shresht-admin-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => {
        syncTheme(theme);
        set({ theme });
      },
      toggleTheme: () =>
        set((state) => {
          const theme = state.theme === "dark" ? "light" : "dark";
          syncTheme(theme);
          return { theme };
        }),
    }),
    {
      name: "shresht-admin-theme",
    },
  ),
);
