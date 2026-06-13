"use client";

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";
import { useNetworkStore } from "@/store/networkStore";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://shreshtlibrary.onrender.com/api/v1";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.request.use((config) => {
  const access = useAuthStore.getState().access;
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (useNetworkStore.getState().isOffline) {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
    return response;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.code === "ERR_NETWORK" || error.response?.status === 502 || error.response?.status === 503) {
      useNetworkStore.getState().setOffline(true);
    }

    const original = error.config as RetryConfig | undefined;
    const isRefreshRequest = original?.url?.includes("/auth/token/refresh/");

    if (error.response?.status === 401 && original && !original._retry && !isRefreshRequest) {
      original._retry = true;
      const nextAccess = await refreshAccessToken();

      if (nextAccess) {
        original.headers.Authorization = `Bearer ${nextAccess}`;
        return api(original);
      }

      useAuthStore.getState().clearSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

async function refreshAccessToken() {
  const { refresh, setAccess } = useAuthStore.getState();
  if (!refresh) {
    return null;
  }

  refreshPromise ??= axios
    .post<{ access: string }>(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
    .then((response) => {
      setAccess(response.data.access);
      return response.data.access;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function unwrap<T>(response: { data: ApiResponse<T> }) {
  if (response.data && "data" in response.data) {
    return response.data.data as T;
  }
  return response.data.data as T;
}

export function unwrapPage<T>(response: { data: PaginatedResponse<T> }) {
  return response.data;
}

export async function downloadFile(url: string, filename: string, params?: Record<string, unknown>) {
  const response = await api.get<Blob>(url, { params, responseType: "blob" });
  if (typeof window === "undefined") {
    return;
  }

  const blobUrl = window.URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(blobUrl);
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    const payload = error.response?.data;
    if (payload?.message) {
      return payload.message;
    }

    const errors = payload?.errors;
    if (typeof errors === "string") {
      return errors;
    }
    if (Array.isArray(errors)) {
      return errors.join(", ");
    }
    if (errors && typeof errors === "object") {
      const first = Object.values(errors)[0];
      return Array.isArray(first) ? first.join(", ") : String(first);
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
