function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }
  return "https://shreshtlibrary.onrender.com/api/v1";
}

export const API_BASE_URL = getApiBaseUrl();

