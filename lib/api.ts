/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import { useNetworkStore } from "@/store/networkStore";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

import { API_BASE_URL } from "./baseApi";
export { API_BASE_URL };

import { ClientCacheManager } from "./cacheManager";
import { VersionedCacheManager } from "./versionedCacheManager";
export { VersionedCacheManager };

export async function swrGet<T>(url: string, category: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url, { params });
  const serverVersionHeader = response.headers["x-cache-version"];
  const serverVersion = serverVersionHeader ? parseInt(serverVersionHeader, 10) : 1;

  if (serverVersionHeader && !isNaN(serverVersion)) {
    const cached = VersionedCacheManager.get<T>(category, serverVersion);
    if (cached) return cached;
  }

  const data = unwrap<T>(response);
  if (serverVersionHeader && !isNaN(serverVersion)) {
    VersionedCacheManager.set<T>(category, data, serverVersion);
  }
  return data;
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Track consecutive network failures to avoid false positives on cold starts
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 3;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: false,
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
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Server responded — reset failure counter and clear offline state
    consecutiveFailures = 0;
    if (useNetworkStore.getState().isOffline && typeof window !== "undefined") {
      window.location.reload();
    }
    // Auto-cache successful GET responses
    if (response.config.method?.toLowerCase() === "get" && response.config.url) {
      ClientCacheManager.set(response.config.url, response.data);
    }
    return response;
  },
  async (error: AxiosError<ApiResponse<any>>) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const config = error.config;
    // Offline stale cache fallback for GET requests
    if (config?.method?.toLowerCase() === "get" && config.url) {
      const staleData = ClientCacheManager.getStale(config.url);
      if (staleData) {
        return {
          ...error.response,
          data: staleData,
          status: 200,
          statusText: "OK (Offline Cache)",
          headers: {},
          config,
        } as any;
      }
    }

    const status = error.response?.status;

    // Only count genuine server-down / network errors, NOT client-side errors (4xx)
    const isServerDown =
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNABORTED" ||
      status === 502 ||
      status === 503 ||
      status === 504;

    if (isServerDown) {
      consecutiveFailures++;
      // Only show the overlay after multiple consecutive failures
      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        useNetworkStore.getState().setOffline(true);
      }
    } else {
      // Any non-server-down response means the server IS reachable
      consecutiveFailures = 0;
    }

    const original = error.config as RetryConfig | undefined;
    const isRefreshRequest = original?.url?.includes("/api/auth/refresh");
    
    const payload = error.response?.data as any;
    if (error.response?.status === 403 && payload?.code === "LIBRARY_SUBSCRIPTION_EXPIRED") {
        if (typeof window !== "undefined" && window.location.pathname !== "/subscription-expired") {
            window.location.href = "/subscription-expired";
        }
        return Promise.reject(error);
    }

    if (error.response?.status === 401 && original && !original._retry && !isRefreshRequest) {
      original._retry = true;
      try {
        const nextAccess = await refreshAccessToken();
        if (nextAccess) {
          original.headers.Authorization = `Bearer ${nextAccess}`;
          return api(original);
        }
      } catch (err) {
        // Fallthrough to logout
      }

      useAuthStore.getState().clearSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ data: { access: string } }>("/api/auth/refresh")
      .then((response) => {
        const access = response.data.data.access;
        useAuthStore.getState().setAccess(access);
        return access;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export function unwrap<T>(response: { data: ApiResponse<T> }, schema?: z.ZodType<T>) {
  const data = (response.data && "data" in (response.data as object)) ? response.data.data as T : response.data as unknown as T;
  if (schema) {
    try {
      return schema.parse(data);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[API] Zod validation failed for response data:', error);
      }
    }
  }
  return data;
}

export function unwrapPage<T>(response: { data: any }, itemSchema?: z.ZodType<T>) {
  const page = (response.data && "success" in response.data && "data" in response.data)
    ? (response.data.data as PaginatedResponse<T>)
    : (response.data as PaginatedResponse<T>);
    
  if (itemSchema && page.data) {
    try {
      // Validate array of items
      z.array(itemSchema).parse(page.data);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[API] Zod validation failed for paginated data:', error);
      }
    }
  }
  return page;
}

export async function downloadFile(url: string, filename: string, params?: Record<string, unknown>) {
  try {
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
  } catch (error) {
    console.error("Download failed:", error);
    const { useToastStore } = await import("@/store/toastStore");
    useToastStore.getState().pushToast({ 
      kind: "error", 
      title: "Download Failed", 
      message: getErrorMessage(error) 
    });
  }
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiResponse<any>>(error)) {
    if (error.code === 'ECONNABORTED') return "Request timed out.";
    if (axios.isCancel(error)) return "Request cancelled.";
    
    if (error.response?.status === 501) {
      return "Feature Coming Soon";
    }

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

export function getFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (axios.isAxiosError<ApiResponse<any>>(error)) {
    const payload = error.response?.data;
    const errors = payload?.errors;
    if (errors && typeof errors === "object" && !Array.isArray(errors)) {
      Object.entries(errors).forEach(([key, val]) => {
        if (Array.isArray(val) && val.length > 0) {
          result[key] = String(val[0]);
        } else if (typeof val === "string") {
          result[key] = val;
        }
      });
    }
  }
  return result;
}

