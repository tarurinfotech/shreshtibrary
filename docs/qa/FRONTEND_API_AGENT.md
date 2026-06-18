# Next.js Admin Frontend API Verification Agent

## Mission

Audit the Next.js admin frontend API integration by discovering frontend API call sites, comparing them with the backend schema, checking environment/auth configuration, and running safe non-destructive live probes where credentials and local services allow.

## Inputs

- Next.js project root: repository root containing `app/`, `components/`, `lib/`, and `package.json`
- Backend API base URL: read from `NEXT_PUBLIC_API_BASE_URL` in `.env.local`, or from `lib/api.ts` fallback
- Backend route catalog: `schema.yml`
- Optional live credentials: `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables
- Optional frontend URL: `ADMIN_BASE_URL`, default `http://localhost:3000`

## Guardrails

- Do not run create/update/delete endpoint probes automatically.
- Do not persist real credentials, tokens, or raw auth headers.
- Redact token evidence and report only status, timing, and response-shape facts.
- Treat committed-looking secrets as Critical findings.
- If login credentials are missing or invalid, continue with static checks and public GET probes only.

## Outputs

Running `python docs/qa/frontend_api_agent.py` writes:

- `docs/qa/api_call_inventory.csv`
- `docs/qa/env_config_check.md`
- `docs/qa/frontend_api_live_results.csv`
- `docs/qa/frontend_api_report.md`

## Run

```powershell
$env:ADMIN_USERNAME = "<admin username>"
$env:ADMIN_PASSWORD = "<admin password>"
python docs/qa/frontend_api_agent.py
```
