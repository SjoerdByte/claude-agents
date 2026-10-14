# F003 — Unleash internal Prometheus metrics and OpenAPI schema served without authentication

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| GET https://unleash.payflows.io/internal-backstage/prometheus and GET https://unleash.payflows.io/docs/openapi.json (same via https://ff.payflows.io/, which is the same Unleash instance behind a second CloudFront name) | GET | Medium | 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) | A05:2021 Security Misconfiguration (CWE-200 Information Exposure, CWE-284 Improper Access Control on administrative endpoint) | Any anonymous attacker gets a 3929-line Prometheus dump plus the full 158-path, 225-schema OpenAPI spec of the private Unleash feature-flag server. Reveals Unleash version, PostgreSQL version, user and feature-toggle totals, every internal admin API path, project and environment names, the appNames of every connected service (including one not in the subdomain list), and a persisted stored-input artefact confirming an unauth input lands in Prometheus labels unsanitised. Direct recon aid for the rest of the engagement; also a candidate stored-XSS vector against any admin whose Grafana/Prometheus UI renders label values unescaped. |

## Summary of what the two endpoints leak

Pull once, from either `unleash.payflows.io` or `ff.payflows.io` (same instance, identical totals verified by diff):

```
GET /internal-backstage/prometheus HTTP/2
Host: unleash.payflows.io

HTTP/2 200
content-type: text/plain; version=0.0.4; charset=utf-8
```
3929 lines of Prometheus metrics, no auth required. See `raw/unleash/prometheus.txt`.

```
GET /docs/openapi.json HTTP/2
Host: unleash.payflows.io

HTTP/2 200
```
~700 KB OpenAPI 3.0.3 spec, `info.title: "Unleash API", info.version: "7.0.3"`. See `raw/unleash/openapi.json`.

## Concrete items disclosed, with evidence

Software and infrastructure:
- Unleash version: 7.0.3 (from `openapi.json`).
- PostgreSQL version: `postgres_version{version="15.13 (Debian 15.13-1.pgdg120+1)"} 1`.
- Node.js process internals: `nodejs_eventloop_lag_max_seconds`, `nodejs_active_handles_total 20`, `process_cpu_user_seconds_total 2974318.347409` (indicates uptime roughly 11.5 months of CPU, so a long-lived instance).

Organisation sizing:
- `licensed_users 17`
- `feature_toggles_total` (62 live + 5 pre-live + 1 initial + 74 archived = 142)
- `environments_total 2`
- `context_total 12`
- `api_tokens_total{type="frontend"} 2`
- `api_tokens_total{type="client"} 2`
- `groups_total 0` (no SSO group mapping)
- `custom_strategies_total 0`

Project and environment labels:
- `project="default"` (only one project; so every flag at Payflows is in that project).
- `environment="production"`, `environment="development"`, `environment="n/a"`.

Internal service names (`appName` label on request-timing metrics — the SDKs that register themselves against this Unleash instance):
- `payflows-frontend`
- `payflows`, `Payflows`
- `balance-bot` — **not present in `subdomains.txt`**; new internal recon lead (balance / finance automation).
- `Menu`
- `Help.Applications.Contributors`
- Plus an empty `""` and the string `undefined`.

Persisted untrusted input, confirming an unauth XSS sink into Prometheus labels:
```
http_request_duration_milliseconds{quantile="0.1",path="/*",method="GET",status="200",
  appName="<script>alert('qualysxss')</script>"} 0
```
This payload is a prior Qualys scanner artefact. The important observation is not that Qualys scanned the host, but that:
1. An unauthenticated client (whichever Unleash SDK endpoint accepted it) was able to write that string into Unleash's metric label store.
2. The appName is HTML-escaped nowhere on the way to the Prometheus endpoint.
3. Any downstream dashboard (Grafana, Prometheus web UI) that renders this label value in HTML without escaping executes the script in the viewing admin's browser.
This is the second-order stored-XSS vector; it is in the Unleash code path on this instance, not in Payflows' own code. I did not attempt to add my own payload — the pre-existing one is enough to prove the sink.

Full admin API surface (158 OpenAPI paths), including sensitive routes an attacker now knows exist on this instance:
- `/api/admin/invite-link/tokens` (POST creates a public-signup URL)
- `/api/admin/instance-admin/statistics` (full instance census)
- `/api/admin/user-admin/reset-password`
- `/api/admin/api-tokens` (manage client and admin API tokens)
- `/invite/{token}/validate` and `/invite/{token}/signup` (public signup — anyone with a token registers as a user)

And one actionable timeline signal from the request-count metrics:
- `/invite/:token/validate` GET 200: 75 anonymous validations recorded.
- `/invite/:token/signup` POST 201: 10 successful public signups.
Payflows has used public invite links in the past; 10 users were created that way. The current token value is not exposed in the metrics (I did not and will not attempt to guess it), but the fact that this flow was enabled is itself a hardening gap worth flagging.

## Why this is Medium and not Low

The Prometheus endpoint on its own would be Low (process metrics and totals). What pushes it to Medium:

1. Combined with the OpenAPI dump it hands an attacker the entire admin surface mapped, versioned, and ready for CVE lookup. Unleash 7.0.3 is a specific version; any future CVE against 7.x is immediately applicable without the attacker first having to probe for it.
2. The persisted untrusted input in Prometheus labels is a confirmed sink for stored content from any anonymous SDK client. That is a precondition for stored-XSS against admins and is sitting unaddressed in the DB today.
3. The appName labels expose the names of other internal services (`balance-bot`, `Help.Applications.Contributors`) that were not previously known. For a multi-tenant SaaS engagement that is directly actionable new recon.
4. The leak is scope-changed by its combination with the already-known Luigi/Cognito info-disclosures (F001, F002); the three together give an attacker a very complete model of the backend without any credential at all.

## Why this is not higher

- No PII, no tokens, no credentials, no customer data in the dump.
- The invite tokens are not disclosed; just the fact that invites have been used.
- The stored-XSS sink is theoretical — I did not confirm a downstream admin dashboard renders it unescaped (that would require authenticated access to Payflows' Grafana or similar).

## Recommended fix

Unleash exposes `/internal-backstage/prometheus` without a built-in auth layer. The documented fix is to put it behind an infrastructure-level auth (an API Gateway / ALB / CloudFront policy, or an `UNLEASH_BASIC_AUTH` or network-level restriction). Specifically:
1. Restrict `/internal-backstage/*` and `/docs/*` to an internal CIDR / VPN / IAM-authed path at the CloudFront or ALB layer. Neither is public-facing; both are operator / developer surface.
2. Sanitise `appName` on write (reject any value containing HTML control characters) in the Unleash SDK ingest paths; or at minimum, strip or escape it before exporting into Prometheus labels.
3. Rotate the two frontend and two client API tokens if the dump has been reachable for a long time (`process_cpu_user_seconds_total` suggests ~11 months uptime; assume disclosure as of now).
4. Audit whether a public-signup invite token is still active (`GET /api/admin/invite-link/tokens` as admin); if yes, revoke unless intentionally kept.

## Also observed on the same thread (not promoted to separate findings)

- `luigi-prod-docker-lambda.payflows.io`: CloudFront + Flask/FastAPI 404s on every probed path. OPTIONS requests get back `Access-Control-Allow-Origin: <echoed Origin>`, `Access-Control-Allow-Methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT`, no `Access-Control-Allow-Credentials`. CORS Origin-reflection with no credentials and no reachable data route; informational only.
- `scim.payflows.io`: tight. Every path/method/variant returns a well-formed SCIM 401; no auth bypass, no authorizer leak. See `raw/scim/NOTES.md`.
- CT history (`crt.sh?q=%25.payflows.io`) adds one new subdomain `aggregator.payflows.io` that currently NXDOMAINs (confirmed 502-then-NXDOMAIN per Claude.md retry rule), and reveals the existence of `*.review.payflows.io` (PR review environments) that are expected to be short-lived.

## Evidence files

- `recon-payflows/raw/unleash/prometheus.txt` — full 3929-line Prometheus dump
- `recon-payflows/raw/unleash/ff-prometheus.txt` — same dump via ff.payflows.io, byte-identical totals
- `recon-payflows/raw/unleash/openapi.json` — ~700 KB Unleash 7.0.3 OpenAPI spec
- `recon-payflows/raw/unleash/root.html` — login UI HTML
- `recon-payflows/raw/scim/NOTES.md` — SCIM unauth ruling-out log
- `recon-payflows/raw/docker-lambda/sweep.txt` — docker-lambda host path sweep
