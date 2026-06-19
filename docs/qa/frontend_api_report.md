# Next.js Admin Frontend API Verification Report

## Executive Summary
- Total API call sites discovered: 151
- Unique endpoints/call expressions discovered: 114
- Schema comparison failures: 8
- Environment/config failures: 2
- Live probe failures: 5 | blocked: 66
- Overall frontend API health: Critical
- Backend API base URL used: https://shreshtlibrary.onrender.com/api/v1
- Node/package manager: nextjs with npm

## Scope Run
- Static inventory: completed against `app`, `components`, `store`, and `lib`.
- Backend schema comparison: completed against `schema.yml`.
- Live protected endpoint verification: partial; requires a valid admin access token.
- Destructive mutations: skipped by guardrail.
- Playwright UI verification: not run; project has no Playwright dependency/config in `package.json`.

## Generated Artifacts
- `docs/qa/api_call_inventory.csv`
- `docs/qa/env_config_check.md`
- `docs/qa/frontend_api_live_results.csv`
- `docs/qa/frontend_api_report.md`

## Environment & Config Check
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

## Schema Failures
| Endpoint | Method | File | Evidence |
|---|---|---|---|
| /study/leaderboard/ | GET | app/dashboard/leaderboard/page.tsx:17 | /api/v1/study/leaderboard/ not found in schema.yml. |
| /admin/seats/release-all/ | POST | app/dashboard/seats/page.tsx:143 | /api/v1/admin/seats/release-all/ not found in schema.yml. |
| /admin/seats/${id}/ | DELETE | app/dashboard/seats/page.tsx:178 | /api/v1/admin/seats/{id}/ exists, but schema methods are GET, PUT. |
| /admin/seats/reserve-bulk/ | POST | app/dashboard/seats/page.tsx:188 | /api/v1/admin/seats/reserve-bulk/ not found in schema.yml. |
| /admin/students/${id}/timeline/ | GET | app/dashboard/students/[id]/StudentDetailClient.tsx:48 | /api/v1/admin/students/{id}/timeline/ not found in schema.yml. |
| /admin/students/${id}/payments/ | GET | app/dashboard/students/[id]/StudentDetailClient.tsx:49 | /api/v1/admin/students/{id}/payments/ not found in schema.yml. |
| /admin/students/${id}/attendance/ | GET | app/dashboard/students/[id]/StudentDetailClient.tsx:50 | /api/v1/admin/students/{id}/attendance/ not found in schema.yml. |
| /admin/search/ | GET | components/layout/GlobalSearch.tsx:27 | /api/v1/admin/search/ not found in schema.yml. |

## Live Probe Results
| Endpoint | Method | Status | Elapsed ms | Grade | Verdict | Shape |
|---|---|---|---|---|---|---|
| /auth/login/admin/ | POST | SKIPPED | — | — | BLOCKED | — |
| /auth/me/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/profile/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/settings/ | GET | SKIPPED | — | — | BLOCKED | — |
| /dashboard/stats/ | GET | SKIPPED | — | — | BLOCKED | — |
| /dashboard/stats/overview/ | GET | SKIPPED | — | — | BLOCKED | — |
| /dashboard/charts/students/overview/ | GET | SKIPPED | — | — | BLOCKED | — |
| /dashboard/activity/recent/ | GET | SKIPPED | — | — | BLOCKED | — |
| /dashboard/activity/log/ | GET | SKIPPED | — | — | BLOCKED | — |
| /dashboard/alerts/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/search/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/students/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/students/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/students/1/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/students/1/timeline/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/students/1/payments/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/students/1/attendance/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/students/1/analytics/?period=monthly | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/students/counts/ | GET | SKIPPED | — | — | BLOCKED | — |
| /plans/ | GET | 200 | 2152.1 | Very Slow | FAIL | PASS |
| /admin/plans/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/plans/stats/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/plans/1/students/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/memberships/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/memberships/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/memberships/1/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/memberships/expiring/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/memberships/expired-today/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/qr/current/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/qr/history/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/qr/1/scans/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/attendance/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/attendance/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/attendance/daily-summary/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/attendance/absentees/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/attendance/streak/ | GET | SKIPPED | — | — | BLOCKED | — |
| /holidays/?is_active=true | GET | 401 | 478.3 | Good | PASS | 401 unauthorized |
| /admin/payments/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/payments/1/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/payments/summary/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/payments/pending/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/payments/overdue/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/seats/layout/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/seats/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/seats/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/seats/available/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/seats/1/history/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/seats/stats/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/notifications/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/notifications/1/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/notifications/1/recipients/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/notifications/scheduled/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/notifications/templates/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/inbox/ | GET | SKIPPED | — | — | BLOCKED | — |
| /library/info/ | GET | 200 | 2237.3 | Very Slow | FAIL | PASS |
| /admin/library/facilities/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/library/achievers/ | GET | SKIPPED | — | — | BLOCKED | — |
| /library/achievers/ | GET | 200 | 1722.7 | Slow | FAIL | PASS |
| /library/reviews/ | GET | 200 | 1794.6 | Slow | FAIL | PASS |
| /library/reviews/summary/ | GET | 200 | 2876.2 | Very Slow | FAIL | PASS |
| /admin/reviews/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/reviews/pending/ | GET | SKIPPED | — | — | BLOCKED | — |
| /reports/attendance/?page_size=5 | GET | SKIPPED | — | — | BLOCKED | — |
| /reports/daily-summary/ | GET | SKIPPED | — | — | BLOCKED | — |
| /reports/seats/ | GET | SKIPPED | — | — | BLOCKED | — |
| /superadmin/admins/ | GET | SKIPPED | — | — | BLOCKED | — |
| /superadmin/permissions/ | GET | SKIPPED | — | — | BLOCKED | — |
| /superadmin/backup/list/ | GET | SKIPPED | — | — | BLOCKED | — |
| /superadmin/activity-log/ | GET | SKIPPED | — | — | BLOCKED | — |
| /superadmin/health/ | GET | SKIPPED | — | — | BLOCKED | — |
| /admin/sliders/ | GET | SKIPPED | — | — | BLOCKED | — |
| /study/leaderboard/ | GET | SKIPPED | — | — | BLOCKED | — |

## Speed Rankings
| Rank | Endpoint | Status | Elapsed ms | Grade | Verdict |
|---|---|---|---|---|---|
| 1 | /library/reviews/summary/ | 200 | 2876.2 | Very Slow | FAIL |
| 2 | /library/info/ | 200 | 2237.3 | Very Slow | FAIL |
| 3 | /plans/ | 200 | 2152.1 | Very Slow | FAIL |
| 4 | /library/reviews/ | 200 | 1794.6 | Slow | FAIL |
| 5 | /library/achievers/ | 200 | 1722.7 | Slow | FAIL |
| 6 | /holidays/?is_active=true | 401 | 478.3 | Good | PASS |

## API Efficiency Findings
| Endpoint | Call Sites | Finding | Recommendation |
|---|---|---|---|
| /admin/students/ | 9 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /admin/settings/ | 6 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /admin/memberships/ | 4 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /admin/attendance/ | 3 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /holidays/ | 3 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /admin/payments/ | 3 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /admin/students/${id}/ | 3 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /superadmin/admins/ | 2 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /admin/inbox/ | 2 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /admin/library/facilities/ | 2 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /admin/library/achievers/ | 2 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /library/reviews/summary/ | 2 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /admin/library/facilities/${id}/ | 2 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /admin/library/achievers/${id}/ | 2 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |
| /dashboard/alerts/ | 2 | Endpoint is used from multiple page/component call sites. | Confirm React Query keys dedupe shared data and set staleTime for stable reference data. |

## Authentication & Authorization Findings
- High: `store/authStore.ts` persists the admin access token in localStorage via Zustand persist.
- Medium: refresh token cookie is HttpOnly and SameSite=lax; Secure is enabled only in production.
- Blocked: full 401/403 UI behavior requires valid admin/non-admin credentials and Playwright.

## Prioritized Fix List
### Critical
1. Remove secret-looking values and merge-conflict markers from `README.md`; rotate any credentials that were real.

### High
2. Stop persisting admin access tokens in localStorage; keep access tokens in memory and rely on the HttpOnly refresh cookie.
3. Reconcile frontend endpoints that are not present in `schema.yml` or use the wrong HTTP method.

### Medium
4. Add Playwright API integration tests for loading, success, empty, 401/403, and error states.
5. Add React Query `staleTime` for stable reference data such as settings, plans, students, holidays, and templates.

## Sign-off
- Verified by: Next.js Admin Frontend API Verification Agent
- Date: 2026-06-19
- Frontend version: package `0.1.0`
- Backend version: `schema.yml` local snapshot
