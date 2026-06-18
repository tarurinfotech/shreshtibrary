from __future__ import annotations

import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = REPO_ROOT / "docs" / "qa"
API_BASE_FALLBACK = "https://shreshtlibrary.onrender.com/api/v1"


@dataclass
class EndpointDefinition:
    name: str
    definition_file: str
    definition_line: int
    method: str
    endpoint: str
    auth: str
    request_body: str
    query_params: str
    state_management: str
    fetching_library: str
    criticality: str
    schema_status: str
    schema_evidence: str


@dataclass
class InventoryRow:
    number: int
    page_component_hook: str
    file_path: str
    line: int
    method: str
    endpoint: str
    auth_required: str
    request_body: str
    query_params: str
    state_management: str
    fetching_library: str
    trigger_type: str
    criticality: str
    schema_status: str
    schema_evidence: str


@dataclass
class EnvFinding:
    item: str
    verdict: str
    evidence: str
    severity: str
    recommendation: str


@dataclass
class LiveResult:
    endpoint: str
    method: str
    status: str
    elapsed_ms: str
    grade: str
    verdict: str
    response_shape: str
    evidence: str


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def load_env_files() -> dict[str, str]:
    values: dict[str, str] = {}
    for env_path in sorted(REPO_ROOT.glob(".env*")):
        if not env_path.is_file():
            continue
        for raw_line in read_text(env_path).splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def api_base_url(env_values: dict[str, str]) -> str:
    if os.environ.get("API_BASE_URL"):
        return os.environ["API_BASE_URL"].rstrip("/")
    return env_values.get("NEXT_PUBLIC_API_BASE_URL", API_BASE_FALLBACK).rstrip("/")


def package_manager() -> str:
    if (REPO_ROOT / "package-lock.json").exists():
        return "npm"
    if (REPO_ROOT / "pnpm-lock.yaml").exists():
        return "pnpm"
    if (REPO_ROOT / "yarn.lock").exists():
        return "yarn"
    return "unknown"


def parse_schema() -> dict[str, set[str]]:
    schema_path = REPO_ROOT / "schema.yml"
    if not schema_path.exists():
        return {}

    paths: dict[str, set[str]] = {}
    in_paths = False
    current_path: str | None = None
    for line in read_text(schema_path).splitlines():
        if line.strip() == "paths:":
            in_paths = True
            continue
        if not in_paths:
            continue
        if re.match(r"^[A-Za-z_][^:]*:", line):
            break
        path_match = re.match(r"^  (/[^:]+):\s*$", line)
        if path_match:
            current_path = path_match.group(1)
            paths[current_path] = set()
            continue
        method_match = re.match(r"^    (get|post|put|patch|delete|head|options):\s*$", line)
        if current_path and method_match:
            paths[current_path].add(method_match.group(1).upper())
    return paths


def normalize_schema_path(endpoint: str) -> str | None:
    if not endpoint or endpoint == "UNRESOLVED" or endpoint.startswith("See source"):
        return None
    if endpoint.startswith("/api/auth/"):
        return None
    if not endpoint.startswith("/"):
        return None
    normalized = endpoint
    normalized = re.sub(r"\$\{([^}]+)\}", r"{\1}", normalized)
    normalized = normalized.replace("{id}", "{id}")
    if normalized.startswith("/api/v1/"):
        return normalized
    return f"/api/v1{normalized}"


def schema_match(method: str, endpoint: str, schema_paths: dict[str, set[str]]) -> tuple[str, str]:
    if endpoint.startswith("/api/auth/"):
        return "LOCAL_ROUTE", "Next route handler; backend target is checked as a direct fetch call."
    schema_path = normalize_schema_path(endpoint)
    if schema_path is None:
        return "UNKNOWN", "Endpoint could not be mapped to OpenAPI schema."
    methods = schema_paths.get(schema_path)
    if not methods:
        return "FAIL", f"{schema_path} not found in schema.yml."
    if method in methods:
        return "PASS", f"{method} {schema_path} found in schema.yml."
    return "FAIL", f"{schema_path} exists, but schema methods are {', '.join(sorted(methods))}."


def endpoint_blocks() -> list[tuple[str, int, str]]:
    endpoint_file = REPO_ROOT / "lib" / "endpoints.ts"
    lines = read_text(endpoint_file).splitlines()
    start_index = next(
        index for index, line in enumerate(lines) if re.match(r"export const endpoints = \{", line)
    )
    property_starts: list[tuple[int, str]] = []
    end_index = len(lines)
    for index in range(start_index + 1, len(lines)):
        line = lines[index]
        if re.match(r"^\};\s*$", line):
            end_index = index
            break
        match = re.match(r"^  ([A-Za-z_][A-Za-z0-9_]*):\s*(.*)", line)
        if match:
            property_starts.append((index, match.group(1)))

    blocks: list[tuple[str, int, str]] = []
    for index, (line_index, name) in enumerate(property_starts):
        next_index = property_starts[index + 1][0] if index + 1 < len(property_starts) else end_index
        blocks.append((name, line_index + 1, "\n".join(lines[line_index:next_index])))
    return blocks


def first_string_after(block: str, position: int) -> str | None:
    string_match = re.search(r"(`[^`]+`|\"[^\"]+\")", block[position:])
    if not string_match:
        return None
    return string_match.group(1).strip("`\"")


def first_api_call(block: str) -> tuple[str, str, str]:
    helper_methods = {
        "getData": ("GET", "axios api client"),
        "getPage": ("GET", "axios api client (paginated)"),
        "getAllPages": ("GET", "axios api client (paginated)"),
        "downloadFile": ("GET", "axios api client (blob download)"),
        "postData": ("POST", "axios api client"),
        "postMultipart": ("POST", "axios api client (multipart)"),
        "putData": ("PUT", "axios api client"),
        "putMultipart": ("PUT", "axios api client (multipart)"),
        "patchData": ("PATCH", "axios api client"),
        "deleteData": ("DELETE", "axios api client"),
        "axios.get": ("GET", "axios (local Next route)"),
        "axios.post": ("POST", "axios (local Next route)"),
        "axios.put": ("PUT", "axios (local Next route)"),
        "axios.patch": ("PATCH", "axios (local Next route)"),
        "axios.delete": ("DELETE", "axios (local Next route)"),
        "api.get": ("GET", "axios api client"),
        "api.post": ("POST", "axios api client"),
        "api.put": ("PUT", "axios api client"),
        "api.patch": ("PATCH", "axios api client"),
        "api.delete": ("DELETE", "axios api client"),
    }
    candidates: list[tuple[int, str, str, str]] = []
    for token, (method, library) in helper_methods.items():
        for match in re.finditer(re.escape(token), block):
            endpoint = first_string_after(block, match.end())
            if endpoint:
                effective_library = library
                if "multipart/form-data" in block or "FormData" in block:
                    effective_library = "axios api client (multipart)"
                candidates.append((match.start(), method, endpoint, effective_library))
    if not candidates:
        return "UNRESOLVED", "UNRESOLVED", "unknown"
    _, method, endpoint, library = sorted(candidates, key=lambda item: item[0])[0]
    return method, endpoint, library


def infer_auth(endpoint: str, library: str) -> str:
    if endpoint.startswith("/api/auth/"):
        return "Cookie/local Next route"
    if endpoint.startswith(("/library/", "/plans/", "/holidays/")):
        return "No/route-dependent"
    if endpoint == "UNRESOLVED":
        return "unknown"
    if "local Next route" in library:
        return "Cookie/local Next route"
    return "Yes (Bearer via interceptor)"


def infer_body(method: str, block: str) -> str:
    if method not in {"POST", "PUT", "PATCH"}:
        return "—"
    if "multipart/form-data" in block or "FormData" in block or "toFormData" in block:
        return "FormData/multipart"
    if re.search(r"\{\s*admin_id,\s*permissions\s*\}", block):
        return "{ admin_id, permissions }"
    if re.search(r"\{\s*student_id\s*\}", block):
        return "{ student_id }"
    if re.search(r"\{\s*is_active\s*\}", block):
        return "{ is_active }"
    if re.search(r"\{\s*reason\s*\}", block):
        return "{ reason }"
    if "payload" in block:
        return "payload argument"
    if re.search(r"\{[^}]+:[^}]+\}", block):
        return "inline object"
    return "{}"


def infer_query_params(block: str) -> str:
    if re.search(r"\bparams\b", block):
        return "params argument"
    keys = []
    for key in [
        "days",
        "format",
        "from_date",
        "is_active",
        "page",
        "page_size",
        "period",
        "student_id",
        "to_date",
    ]:
        if re.search(rf"\b{re.escape(key)}\b", block):
            keys.append(key)
    return ", ".join(sorted(set(keys))) if keys else "—"


def infer_criticality(method: str, endpoint_name: str) -> str:
    if method in {"POST", "PUT", "PATCH", "DELETE"}:
        return "High"
    critical_names = {
        "adminProfile",
        "attendance",
        "dashboardStats",
        "memberships",
        "payments",
        "seatLayout",
        "settings",
        "student",
        "students",
    }
    return "Critical" if endpoint_name in critical_names else "Medium"


def parse_endpoint_definitions(schema_paths: dict[str, set[str]]) -> dict[str, EndpointDefinition]:
    definitions: dict[str, EndpointDefinition] = {}
    for name, line_number, block in endpoint_blocks():
        method, endpoint, library = first_api_call(block)
        schema_status, schema_evidence = schema_match(method, endpoint, schema_paths)
        definitions[name] = EndpointDefinition(
            name=name,
            definition_file="lib/endpoints.ts",
            definition_line=line_number,
            method=method,
            endpoint=endpoint,
            auth=infer_auth(endpoint, library),
            request_body=infer_body(method, block),
            query_params=infer_query_params(block),
            state_management="React Query wrapper/call site",
            fetching_library=library,
            criticality=infer_criticality(method, name),
            schema_status=schema_status,
            schema_evidence=schema_evidence,
        )
    return definitions


def source_files() -> list[Path]:
    files: list[Path] = []
    for folder in ["app", "components", "store", "lib"]:
        base = REPO_ROOT / folder
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.suffix in {".ts", ".tsx", ".js", ".jsx"} and path.name != "endpoints.ts":
                if "node_modules" not in path.parts and ".next" not in path.parts:
                    files.append(path)
    return sorted(files)


def classify_trigger(content: str, line_number: int, line_text: str) -> str:
    lines = content.splitlines()
    window_start = max(0, line_number - 8)
    window_end = min(len(lines), line_number + 8)
    window = "\n".join(lines[window_start:window_end])
    if "useQuery" in window or "queryFn" in window:
        return "on-mount/query"
    if "useMutation" in window or "mutationFn" in window:
        return "mutation/user-action"
    if "onClick" in line_text:
        return "on-click"
    if "fetch(" in line_text:
        return "direct fetch"
    return "see component"


def component_name(path: Path) -> str:
    relative = path.relative_to(REPO_ROOT).as_posix()
    if relative.endswith("/page.tsx"):
        route = relative.removeprefix("app/").removesuffix("/page.tsx")
        return f"Page: /{route}" if route else "Page: /"
    return relative


def extract_direct_endpoint(line_text: str) -> str:
    string_match = re.search(r"(`[^`]+`|\"[^\"]+\")", line_text)
    if string_match:
        return string_match.group(1).strip("`\"")
    return line_text.strip()


def inventory_rows(definitions: dict[str, EndpointDefinition]) -> list[InventoryRow]:
    rows: list[InventoryRow] = []
    for path in source_files():
        content = read_text(path)
        relative = path.relative_to(REPO_ROOT).as_posix()
        for line_number, line_text in enumerate(content.splitlines(), start=1):
            for match in re.finditer(r"endpoints\.([A-Za-z_][A-Za-z0-9_]*)", line_text):
                endpoint_name = match.group(1)
                definition = definitions.get(endpoint_name)
                if not definition:
                    continue
                rows.append(
                    InventoryRow(
                        number=0,
                        page_component_hook=component_name(path),
                        file_path=f"{relative}:{line_number}",
                        line=line_number,
                        method=definition.method,
                        endpoint=definition.endpoint,
                        auth_required=definition.auth,
                        request_body=definition.request_body,
                        query_params=definition.query_params,
                        state_management=definition.state_management,
                        fetching_library=definition.fetching_library,
                        trigger_type=classify_trigger(content, line_number, line_text),
                        criticality=definition.criticality,
                        schema_status=definition.schema_status,
                        schema_evidence=definition.schema_evidence,
                    )
                )
            direct_call = re.search(r"\bfetch\s*\(", line_text) or re.search(
                r"\baxios\.(get|post|put|patch|delete)\b", line_text
            )
            if direct_call:
                rows.append(
                    InventoryRow(
                        number=0,
                        page_component_hook=component_name(path),
                        file_path=f"{relative}:{line_number}",
                        line=line_number,
                        method="SEE_SOURCE",
                        endpoint=extract_direct_endpoint(line_text),
                        auth_required="route-dependent",
                        request_body="See source",
                        query_params="—",
                        state_management="direct",
                        fetching_library="fetch/axios direct",
                        trigger_type=classify_trigger(content, line_number, line_text),
                        criticality="High" if "/api/auth/" in relative or "authStore" in relative else "Medium",
                        schema_status="DIRECT",
                        schema_evidence="Inspect direct call source.",
                    )
                )
    for index, row in enumerate(rows, start=1):
        row.number = index
    return rows


def env_findings(env_values: dict[str, str]) -> list[EnvFinding]:
    api_file = read_text(REPO_ROOT / "lib" / "api.ts")
    next_config = read_text(REPO_ROOT / "next.config.ts") if (REPO_ROOT / "next.config.ts").exists() else ""
    auth_store = read_text(REPO_ROOT / "store" / "authStore.ts")
    readme = read_text(REPO_ROOT / "README.md") if (REPO_ROOT / "README.md").exists() else ""
    base = api_base_url(env_values)
    findings = [
        EnvFinding(
            "NEXT_PUBLIC_API_BASE_URL",
            "PASS" if env_values.get("NEXT_PUBLIC_API_BASE_URL") else "WARN",
            f"Configured as {base}.",
            "Medium" if not env_values.get("NEXT_PUBLIC_API_BASE_URL") else "—",
            "Set NEXT_PUBLIC_API_BASE_URL in .env.local for local/dev runs."
            if not env_values.get("NEXT_PUBLIC_API_BASE_URL")
            else "No action.",
        ),
        EnvFinding(
            "Base URL slash consistency",
            "PASS" if not base.endswith("/") else "WARN",
            "Base URL is normalized without a trailing slash." if not base.endswith("/") else "Base URL has trailing slash.",
            "Low",
            "Keep base URL slashless because endpoint paths begin with '/'.",
        ),
        EnvFinding(
            "next.config rewrites/proxy",
            "PASS" if "rewrites" not in next_config else "WARN",
            "No custom rewrites found; auth proxy uses app/api route handlers.",
            "—",
            "No action unless a new API proxy is introduced.",
        ),
        EnvFinding(
            "Authorization header",
            "PASS" if "Bearer ${access}" in api_file else "FAIL",
            "Axios request interceptor adds Authorization: Bearer <token>." if "Bearer ${access}" in api_file else "Bearer interceptor not found.",
            "High",
            "Keep token construction centralized in lib/api.ts.",
        ),
        EnvFinding(
            "HTTP client timeout",
            "PASS" if re.search(r"timeout:\s*\d+", api_file) else "FAIL",
            "Axios timeout is configured." if re.search(r"timeout:\s*\d+", api_file) else "No timeout found.",
            "Medium",
            "Maintain an explicit timeout for admin API calls.",
        ),
        EnvFinding(
            "Admin access token storage",
            "FAIL" if "persist(" in auth_store and "access" in auth_store else "PASS",
            "Access token is persisted in Zustand localStorage under shresht-admin-auth.",
            "High",
            "Prefer memory-only access tokens plus HttpOnly refresh cookie for admin sessions.",
        ),
        EnvFinding(
            "Refresh token cookie flags",
            "PASS" if "httpOnly: true" in read_text(REPO_ROOT / "app" / "api" / "auth" / "login" / "route.ts") else "FAIL",
            "Refresh token is set HttpOnly; Secure is production-only and SameSite is lax.",
            "Medium",
            "For staging/prod, enforce Secure and review SameSite against deployment topology.",
        ),
        EnvFinding(
            "Committed-looking secrets",
            "FAIL" if any(marker in readme for marker in ["SECRET_KEY=", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL=", "<<<<<<< HEAD"]) else "PASS",
            "README.md contains merge-conflict markers and secret-looking values." if any(marker in readme for marker in ["SECRET_KEY=", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL=", "<<<<<<< HEAD"]) else "No obvious committed secrets found in README.md.",
            "Critical",
            "Remove secrets from tracked docs, rotate exposed credentials, and resolve merge conflict markers.",
        ),
    ]
    return findings


def request_json(url: str, method: str = "GET", token: str | None = None, body: Any | None = None) -> tuple[int, dict[str, Any] | list[Any] | str, float]:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            raw = response.read()
            elapsed_ms = (time.perf_counter() - started) * 1000
            text = raw.decode("utf-8", errors="replace")
            try:
                payload: dict[str, Any] | list[Any] | str = json.loads(text)
            except json.JSONDecodeError:
                payload = text[:500]
            return response.status, payload, elapsed_ms
    except urllib.error.HTTPError as error:
        raw = error.read()
        elapsed_ms = (time.perf_counter() - started) * 1000
        text = raw.decode("utf-8", errors="replace")
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            payload = text[:500]
        return error.code, payload, elapsed_ms


def extract_access_token(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None
    candidates = [
        payload.get("access"),
        payload.get("token"),
        payload.get("data", {}).get("access") if isinstance(payload.get("data"), dict) else None,
        payload.get("data", {}).get("tokens", {}).get("access") if isinstance(payload.get("data"), dict) else None,
        payload.get("tokens", {}).get("access") if isinstance(payload.get("tokens"), dict) else None,
    ]
    for candidate in candidates:
        if isinstance(candidate, str) and candidate:
            return candidate
    return None


def live_grade(elapsed_ms: float) -> tuple[str, str]:
    if elapsed_ms < 200:
        return "Excellent", "PASS"
    if elapsed_ms < 500:
        return "Good", "PASS"
    if elapsed_ms < 1000:
        return "Acceptable", "WARN"
    if elapsed_ms < 2000:
        return "Slow", "FAIL"
    if elapsed_ms < 5000:
        return "Very Slow", "FAIL"
    return "Timeout risk", "FAIL"


def concrete_path(endpoint: str) -> str:
    replacements = {
        "${id}": "1",
        "${section}": "overview",
        "${domain}": "students",
        "${chart}": "overview",
        "${kind}": "attendance",
        "${action}": "read",
    }
    result = endpoint
    for key, value in replacements.items():
        result = result.replace(key, value)
    return result


def with_probe_params(endpoint: str, library: str) -> str:
    params: dict[str, str] = {}
    if "paginated" in library:
        params["page_size"] = "5"
    if "analytics" in endpoint:
        params["period"] = "monthly"
    if endpoint == "/holidays/":
        params["is_active"] = "true"
    if not params:
        return endpoint
    separator = "&" if "?" in endpoint else "?"
    return f"{endpoint}{separator}{urllib.parse.urlencode(params)}"


def shape_result(payload: Any, library: str, status: int) -> tuple[str, str]:
    if status == 401:
        return "401 unauthorized", "Expected for protected calls without a valid access token."
    if not (200 <= status < 300):
        return "non-2xx", "Backend did not return a success response."
    if "paginated" in library:
        if isinstance(payload, dict) and isinstance(payload.get("data"), list):
            missing = [key for key in ["count", "total_pages", "current_page"] if key not in payload]
            if missing:
                return "WARN", f"Paginated data array exists, but missing {', '.join(missing)}."
            return "PASS", "Paginated shape matches frontend PaginatedResponse<T>."
        return "FAIL", "Frontend unwrapPage expects { data: [], count, total_pages, current_page }."
    if isinstance(payload, dict) and "data" in payload:
        return "PASS", "Standard ApiResponse shape includes data."
    if isinstance(payload, list):
        return "PASS", "Array body accepted by unwrap fallback."
    return "WARN", "Response shape is not the standard ApiResponse envelope."


def run_live_probes(definitions: dict[str, EndpointDefinition], env_values: dict[str, str]) -> list[LiveResult]:
    base = api_base_url(env_values)
    username = os.environ.get("ADMIN_USERNAME")
    password = os.environ.get("ADMIN_PASSWORD")
    token: str | None = None
    results: list[LiveResult] = []

    if username and password:
        status, payload, elapsed_ms = request_json(
            f"{base}/auth/login/admin/",
            method="POST",
            body={"username": username, "password": password},
        )
        grade, verdict = live_grade(elapsed_ms)
        token = extract_access_token(payload)
        shape, evidence = shape_result(payload, "axios api client", status)
        if not token:
            verdict = "FAIL"
            evidence = f"Login did not return an access token; status {status}. {evidence}"
        results.append(
            LiveResult(
                endpoint="/auth/login/admin/",
                method="POST",
                status=str(status),
                elapsed_ms=f"{elapsed_ms:.1f}",
                grade=grade,
                verdict=verdict,
                response_shape=shape,
                evidence=evidence,
            )
        )
    else:
        results.append(
            LiveResult(
                endpoint="/auth/login/admin/",
                method="POST",
                status="SKIPPED",
                elapsed_ms="—",
                grade="—",
                verdict="BLOCKED",
                response_shape="—",
                evidence="ADMIN_USERNAME and ADMIN_PASSWORD were not provided.",
            )
        )

    seen: set[str] = set()
    safe_definitions = [
        definition
        for definition in definitions.values()
        if definition.method == "GET"
        and definition.endpoint.startswith("/")
        and not definition.endpoint.startswith("/api/")
        and "blob download" not in definition.fetching_library
        and "export" not in definition.endpoint
        and "receipt" not in definition.endpoint
    ]
    for definition in safe_definitions:
        endpoint = with_probe_params(concrete_path(definition.endpoint), definition.fetching_library)
        if endpoint in seen:
            continue
        seen.add(endpoint)
        url = f"{base}{endpoint}"
        status, payload, elapsed_ms = request_json(url, token=token)
        grade, verdict = live_grade(elapsed_ms)
        shape, evidence = shape_result(payload, definition.fetching_library, status)
        if shape == "FAIL":
            verdict = "FAIL"
        elif shape == "WARN" and verdict == "PASS":
            verdict = "WARN"
        if status == 401 and definition.auth.startswith("Yes"):
            verdict = "BLOCKED" if not token else "FAIL"
        results.append(
            LiveResult(
                endpoint=endpoint,
                method="GET",
                status=str(status),
                elapsed_ms=f"{elapsed_ms:.1f}",
                grade=grade,
                verdict=verdict,
                response_shape=shape,
                evidence=evidence,
            )
        )
    return results


def write_inventory(rows: list[InventoryRow]) -> None:
    fieldnames = [
        "#",
        "Page / Component / Hook",
        "File Path",
        "Line #",
        "Method",
        "Endpoint",
        "Auth Required",
        "Request Body",
        "Query Params",
        "State Management",
        "Fetching Library",
        "Trigger Type",
        "Criticality",
        "Schema Status",
        "Schema Evidence",
    ]
    with (OUTPUT_DIR / "api_call_inventory.csv").open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "#": row.number,
                    "Page / Component / Hook": row.page_component_hook,
                    "File Path": row.file_path,
                    "Line #": row.line,
                    "Method": row.method,
                    "Endpoint": row.endpoint,
                    "Auth Required": row.auth_required,
                    "Request Body": row.request_body,
                    "Query Params": row.query_params,
                    "State Management": row.state_management,
                    "Fetching Library": row.fetching_library,
                    "Trigger Type": row.trigger_type,
                    "Criticality": row.criticality,
                    "Schema Status": row.schema_status,
                    "Schema Evidence": row.schema_evidence,
                }
            )


def write_env_report(findings: list[EnvFinding]) -> None:
    lines = [
        "# Environment & Configuration Check",
        "",
        "| Item | Verdict | Severity | Evidence | Recommendation |",
        "|---|---|---|---|---|",
    ]
    for finding in findings:
        lines.append(
            f"| {finding.item} | {finding.verdict} | {finding.severity} | {finding.evidence} | {finding.recommendation} |"
        )
    (OUTPUT_DIR / "env_config_check.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_live_results(results: list[LiveResult]) -> None:
    with (OUTPUT_DIR / "frontend_api_live_results.csv").open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "Endpoint",
                "Method",
                "Status",
                "Elapsed ms",
                "Grade",
                "Verdict",
                "Response Shape",
                "Evidence",
            ],
        )
        writer.writeheader()
        for result in results:
            writer.writerow(
                {
                    "Endpoint": result.endpoint,
                    "Method": result.method,
                    "Status": result.status,
                    "Elapsed ms": result.elapsed_ms,
                    "Grade": result.grade,
                    "Verdict": result.verdict,
                    "Response Shape": result.response_shape,
                    "Evidence": result.evidence,
                }
            )


def summarize_counts(rows: list[InventoryRow], env_findings_list: list[EnvFinding], live_results: list[LiveResult]) -> dict[str, int]:
    unique_endpoints = {row.endpoint for row in rows}
    schema_failures = sum(1 for row in rows if row.schema_status == "FAIL")
    env_failures = sum(1 for finding in env_findings_list if finding.verdict == "FAIL")
    critical = sum(1 for finding in env_findings_list if finding.verdict == "FAIL" and finding.severity == "Critical")
    live_failures = sum(1 for result in live_results if result.verdict == "FAIL")
    live_blocked = sum(1 for result in live_results if result.verdict == "BLOCKED")
    return {
        "call_sites": len(rows),
        "unique_endpoints": len(unique_endpoints),
        "schema_failures": schema_failures,
        "env_failures": env_failures,
        "critical": critical,
        "live_failures": live_failures,
        "live_blocked": live_blocked,
    }


def markdown_table(headers: list[str], rows: list[list[str]]) -> list[str]:
    output = ["| " + " | ".join(headers) + " |", "|" + "|".join(["---"] * len(headers)) + "|"]
    output.extend("| " + " | ".join(row) + " |" for row in rows)
    return output


def write_final_report(
    rows: list[InventoryRow],
    definitions: dict[str, EndpointDefinition],
    env_findings_list: list[EnvFinding],
    live_results: list[LiveResult],
) -> None:
    counts = summarize_counts(rows, env_findings_list, live_results)
    schema_fail_rows = [row for row in rows if row.schema_status == "FAIL"]
    live_rankings = sorted(
        [result for result in live_results if result.elapsed_ms not in {"—"}],
        key=lambda result: float(result.elapsed_ms),
        reverse=True,
    )
    duplicate_endpoints: dict[str, int] = {}
    for row in rows:
        duplicate_endpoints[row.endpoint] = duplicate_endpoints.get(row.endpoint, 0) + 1
    duplicate_rows = sorted(
        [(endpoint, count) for endpoint, count in duplicate_endpoints.items() if count > 1],
        key=lambda item: item[1],
        reverse=True,
    )[:15]

    package_path = REPO_ROOT / "package.json"
    package = json.loads(read_text(package_path)) if package_path.exists() else {}
    base = api_base_url(load_env_files())
    health = "Critical" if counts["critical"] else ("Needs Attention" if counts["schema_failures"] or counts["env_failures"] else "Static Healthy / Live Partial")

    report: list[str] = [
        "# Next.js Admin Frontend API Verification Report",
        "",
        "## Executive Summary",
        f"- Total API call sites discovered: {counts['call_sites']}",
        f"- Unique endpoints/call expressions discovered: {counts['unique_endpoints']}",
        f"- Schema comparison failures: {counts['schema_failures']}",
        f"- Environment/config failures: {counts['env_failures']}",
        f"- Live probe failures: {counts['live_failures']} | blocked: {counts['live_blocked']}",
        f"- Overall frontend API health: {health}",
        f"- Backend API base URL used: {base}",
        f"- Node/package manager: {package.get('name', 'unknown')} with {package_manager()}",
        "",
        "## Scope Run",
        "- Static inventory: completed against `app`, `components`, `store`, and `lib`.",
        "- Backend schema comparison: completed against `schema.yml`.",
        "- Live protected endpoint verification: partial; requires a valid admin access token.",
        "- Destructive mutations: skipped by guardrail.",
        "- Playwright UI verification: not run; project has no Playwright dependency/config in `package.json`.",
        "",
        "## Generated Artifacts",
        "- `docs/qa/api_call_inventory.csv`",
        "- `docs/qa/env_config_check.md`",
        "- `docs/qa/frontend_api_live_results.csv`",
        "- `docs/qa/frontend_api_report.md`",
        "",
        "## Environment & Config Check",
    ]
    report.extend(
        markdown_table(
            ["Item", "Verdict", "Severity", "Evidence", "Recommendation"],
            [
                [
                    finding.item,
                    finding.verdict,
                    finding.severity,
                    finding.evidence,
                    finding.recommendation,
                ]
                for finding in env_findings_list
            ],
        )
    )

    report.extend(["", "## Schema Failures"])
    if schema_fail_rows:
        report.extend(
            markdown_table(
                ["Endpoint", "Method", "File", "Evidence"],
                [[row.endpoint, row.method, row.file_path, row.schema_evidence] for row in schema_fail_rows[:50]],
            )
        )
    else:
        report.append("- No schema mismatches found for mapped endpoint call sites.")

    report.extend(["", "## Live Probe Results"])
    report.extend(
        markdown_table(
            ["Endpoint", "Method", "Status", "Elapsed ms", "Grade", "Verdict", "Shape"],
            [
                [
                    result.endpoint,
                    result.method,
                    result.status,
                    result.elapsed_ms,
                    result.grade,
                    result.verdict,
                    result.response_shape,
                ]
                for result in live_results[:80]
            ],
        )
    )

    report.extend(["", "## Speed Rankings"])
    if live_rankings:
        report.extend(
            markdown_table(
                ["Rank", "Endpoint", "Status", "Elapsed ms", "Grade", "Verdict"],
                [
                    [
                        str(index),
                        result.endpoint,
                        result.status,
                        result.elapsed_ms,
                        result.grade,
                        result.verdict,
                    ]
                    for index, result in enumerate(live_rankings[:20], start=1)
                ],
            )
        )
    else:
        report.append("- No live timing data collected.")

    report.extend(["", "## API Efficiency Findings"])
    if duplicate_rows:
        report.extend(
            markdown_table(
                ["Endpoint", "Call Sites", "Finding", "Recommendation"],
                [
                    [
                        endpoint,
                        str(count),
                        "Endpoint is used from multiple page/component call sites.",
                        "Confirm React Query keys dedupe shared data and set staleTime for stable reference data.",
                    ]
                    for endpoint, count in duplicate_rows
                ],
            )
        )
    else:
        report.append("- No duplicate endpoint usage detected.")

    report.extend(
        [
            "",
            "## Authentication & Authorization Findings",
            "- High: `store/authStore.ts` persists the admin access token in localStorage via Zustand persist.",
            "- Medium: refresh token cookie is HttpOnly and SameSite=lax; Secure is enabled only in production.",
            "- Blocked: full 401/403 UI behavior requires valid admin/non-admin credentials and Playwright.",
            "",
            "## Prioritized Fix List",
            "### Critical",
            "1. Remove secret-looking values and merge-conflict markers from `README.md`; rotate any credentials that were real.",
            "",
            "### High",
            "2. Stop persisting admin access tokens in localStorage; keep access tokens in memory and rely on the HttpOnly refresh cookie.",
        ]
    )
    if schema_fail_rows:
        report.append("3. Reconcile frontend endpoints that are not present in `schema.yml` or use the wrong HTTP method.")
    else:
        report.append("3. Provide valid admin credentials to complete protected live response-shape and speed verification.")

    report.extend(
        [
            "",
            "### Medium",
            "4. Add Playwright API integration tests for loading, success, empty, 401/403, and error states.",
            "5. Add React Query `staleTime` for stable reference data such as settings, plans, students, holidays, and templates.",
            "",
            "## Sign-off",
            "- Verified by: Next.js Admin Frontend API Verification Agent",
            f"- Date: {time.strftime('%Y-%m-%d')}",
            f"- Frontend version: package `{package.get('version', 'unknown')}`",
            "- Backend version: `schema.yml` local snapshot",
        ]
    )
    (OUTPUT_DIR / "frontend_api_report.md").write_text("\n".join(report) + "\n", encoding="utf-8")


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    env_values = load_env_files()
    schema_paths = parse_schema()
    definitions = parse_endpoint_definitions(schema_paths)
    rows = inventory_rows(definitions)
    env_findings_list = env_findings(env_values)
    live_results = run_live_probes(definitions, env_values)

    write_inventory(rows)
    write_env_report(env_findings_list)
    write_live_results(live_results)
    write_final_report(rows, definitions, env_findings_list, live_results)

    counts = summarize_counts(rows, env_findings_list, live_results)
    print("Frontend API agent completed.")
    print(f"Inventory call sites: {counts['call_sites']}")
    print(f"Unique endpoints: {counts['unique_endpoints']}")
    print(f"Schema failures: {counts['schema_failures']}")
    print(f"Env/config failures: {counts['env_failures']}")
    print(f"Live failures: {counts['live_failures']} | blocked: {counts['live_blocked']}")
    print("Reports written to docs/qa/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
