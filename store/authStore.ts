"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types/api";

type AuthState = {
  access: string | null;
  refresh: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (access: string, refresh: string, user: AuthUser) => void;
  setAccess: (access: string) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      access: null,
      refresh: null,
      user: null,
      hydrated: false,
      setSession: (access, refresh, user) => set({ access, refresh, user }),
      setAccess: (access) => set({ access }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ access: null, refresh: null, user: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "shresht-admin-auth",
      partialize: (state) => ({
        access: state.access,
        refresh: state.refresh,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
