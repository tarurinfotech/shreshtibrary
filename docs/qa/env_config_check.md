# Environment & Configuration Check

| Item | Verdict | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| NEXT_PUBLIC_API_BASE_URL | PASS | — | Configured as https://shreshtlibrary.onrender.com/api/v1. | No action. |
| Base URL slash consistency | PASS | Low | Base URL is normalized without a trailing slash. | Keep base URL slashless because endpoint paths begin with '/'. |
| next.config rewrites/proxy | PASS | — | No custom rewrites found; auth proxy uses app/api route handlers. | No action unless a new API proxy is introduced. |
| Authorization header | PASS | High | Axios request interceptor adds Authorization: Bearer <token>. | Keep token construction centralized in lib/api.ts. |
| HTTP client timeout | PASS | Medium | Axios timeout is configured. | Maintain an explicit timeout for admin API calls. |
| Admin access token storage | FAIL | High | Access token is persisted in Zustand localStorage under shresht-admin-auth. | Prefer memory-only access tokens plus HttpOnly refresh cookie for admin sessions. |
| Refresh token cookie flags | PASS | Medium | Refresh token is set HttpOnly; Secure is production-only and SameSite is lax. | For staging/prod, enforce Secure and review SameSite against deployment topology. |
| Committed-looking secrets | FAIL | Critical | README.md contains merge-conflict markers and secret-looking values. | Remove secrets from tracked docs, rotate exposed credentials, and resolve merge conflict markers. |
