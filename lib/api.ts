"use client";

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import { useNetworkStore } from "@/store/networkStore";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://shreshtlibrary.onrender.com/api/v1";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
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
    if (useNetworkStore.getState().isOffline && typeof window !== "undefined") {
      window.location.reload();
    }
    return response;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if (error.code === "ERR_NETWORK" || error.response?.status === 502 || error.response?.status === 503) {
      useNetworkStore.getState().setOffline(true);
    }

    const original = error.config as RetryConfig | undefined;
    const isRefreshRequest = original?.url?.includes("/api/auth/refresh");

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
      console.warn("Zod validation failed for response data:", error);
    }
  }
  return data;
}

export function unwrapPage<T>(response: { data: PaginatedResponse<T> }, itemSchema?: z.ZodType<T>) {
  const page = response.data;
  if (itemSchema && page.data) {
    try {
      // Validate array of items
      z.array(itemSchema).parse(page.data);
    } catch (error) {
      console.warn("Zod validation failed for paginated data:", error);
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
    console.error("Failed to download file:", error);
  }
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    if (error.code === 'ECONNABORTED') return "Request timed out.";
    if (axios.isCancel(error)) return "Request cancelled.";
    
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
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
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
