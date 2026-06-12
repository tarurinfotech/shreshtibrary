import { API_BASE_URL } from "./api";

export function mediaUrl(value?: string | null) {
  if (!value) {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const backendBase = API_BASE_URL.replace(/\/api\/v\d+\/?$/i, "");
  return `${backendBase}${value.startsWith("/") ? value : `/${value}`}`;
}
