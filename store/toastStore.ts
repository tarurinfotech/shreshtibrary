"use client";

import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  isLeaving?: boolean;
};

type ToastState = {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id" | "isLeaving">) => void;
  dismissToast: (id: string) => void;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    window.setTimeout(() => {
      get().dismissToast(id);
    }, 4200);
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.map((item) => item.id === id ? { ...item, isLeaving: true } : item)
    }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }));
    }, 400); // Wait 400ms for exit animation
  },
}));
