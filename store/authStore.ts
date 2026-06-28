"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser } from "@/types/api";

type AuthState = {
  access: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (access: string, user: AuthUser) => void;
  setAccess: (access: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  clearSession: () => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      access: null,
      user: null,
      hydrated: false,
      setSession: (access, user) => set({ access, user }),
      setAccess: (access) => set({ access }),
      setUser: (user) => set({ user }),
      clearSession: () => {
        fetch("/api/auth/logout", { method: "POST" }).catch(console.error);
        set({ access: null, user: null });
      },
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "shresht-admin-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        access: state.access,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
