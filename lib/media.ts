import { API_BASE_URL } from "./api";

export function mediaUrl(value?: string | null) {
  if (!value) {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  let backendBase = API_BASE_URL.replace(/\/api\/v\d+\/?$/i, "");
  
  // Force HTTPS in production to prevent mixed content warnings
  if (backendBase.includes("onrender.com") && backendBase.startsWith("http://")) {
    backendBase = backendBase.replace("http://", "https://");
  }
  
  return `${backendBase}${value.startsWith("/") ? value : `/${value}`}`;
}
