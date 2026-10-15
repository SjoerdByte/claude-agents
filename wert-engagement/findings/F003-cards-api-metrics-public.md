# F003 - cards-api.wert.io and cards-api-2.wert.io expose Prometheus /metrics unauthenticated

- Endpoint: https://cards-api.wert.io/metrics, https://cards-api-2.wert.io/metrics
- Method: GET
- Severity: Medium
- CVSS v3.1: AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N (3.1)
- CWE: CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor), CWE-497 (Exposure of Sensitive System Information)
- OWASP: A05:2021 Security Misconfiguration

## Impact
The Prometheus scrape endpoint `/metrics` on the two production card-registrator pods (`cards-api.wert.io` and `cards-api-2.wert.io`) is served to any anonymous Internet caller. The dump reveals:

- Internal kubernetes pod IP + listener port: `10.20.129.110:8080` (cards-api) and `10.20.129.223:8080` (cards-api-2). That exposes the private pod CIDR (`10.20.129.0/24`) and the backend plaintext port, which is useful if any other finding ever yields SSRF or a bastion foothold.
- Backend service name `cards_registrator` (metric prefix) and Go runtime version `go1.27.1` (`go_info{version="go1.27.1"}`).
- Request/response timing, size and count histograms per `{host, method, url, code}`, which lets an attacker build a traffic baseline and run passive side-channel inference (e.g., spike in `cards_registrator_requests_total{code="200",url="/api/v1/register"}` tells an attacker when card-registration volume rises).
- Scrape handler meta (`promhttp_metric_handler_requests_total`) and process resident-memory, FDs, start-time timestamps - usable for uptime fingerprinting and restart detection.

No credentials, user PII, DB URLs, or secret material are present in the current payload, so this is a hardening gap rather than a direct PII leak. The sister host `cards.wert.io` correctly returns `HTTP 403` on `/metrics`, which demonstrates the fix is already applied in one place and simply missing on the API hosts.

## Proof

Request:
```
GET /metrics HTTP/2
Host: cards-api.wert.io
```
Response (truncated to the structurally interesting lines; full dump at the evidence path):
```
HTTP/2 200
content-type: text/plain; charset=utf-8

# HELP cards_registrator_request_duration_seconds The HTTP request latencies in seconds.
# TYPE cards_registrator_request_duration_seconds histogram
cards_registrator_request_duration_seconds_bucket{code="200",host="10.20.129.110:8080",method="GET",url="/health",le="0.005"} 1586
...
cards_registrator_requests_total{code="200",host="10.20.129.110:8080",method="GET",url="/health"} 1586
cards_registrator_requests_total{code="200",host="cards-api.wert.io",method="GET",url="/health"} 3
cards_registrator_requests_total{code="200",host="cards-api.wert.io",method="GET",url="/metrics"} 1585
# HELP go_info Information about the Go environment.
go_info{version="go1.27.1"} 1
# HELP process_start_time_seconds Start time of the process since unix epoch in seconds.
process_start_time_seconds 1.79198960563e+09
```

Request:
```
GET /metrics HTTP/2
Host: cards-api-2.wert.io
```
Response (truncated):
```
HTTP/2 200
content-type: text/plain; charset=utf-8

cards_registrator_request_duration_seconds_bucket{code="200",host="10.20.129.223:8080",method="GET",url="/health",le="0.005"} 1568
...
go_info{version="go1.27.1"} 1
process_start_time_seconds 1.79198986101e+09
```

Negative baseline on the sister host, same endpoint, same vendor stack:
```
GET /metrics HTTP/2
Host: cards.wert.io
---
HTTP/2 403
```

No bypass needed; the public endpoint already serves to any Internet caller. Adding `X-Forwarded-For: 127.0.0.1` and `X-Real-IP: 10.0.0.1` is a no-op (same 200). `/health` on all three hosts returns `{"status":"ok"}` with no leaked dependency strings. No `/debug/pprof`, `/debug/vars`, `/actuator/*`, `/env`, `/config`, `/loggers`, `/heapdump`, `/threaddump` or `/trace` surface was reachable (all 404).

## Recommended fix
Serve `/metrics` only to the Prometheus scraper. The canonical pattern is to bind the metrics handler on a separate port that is not published through the ingress (e.g., `--metrics-addr=:9090` on an in-cluster-only service), or - if it must stay on the same listener - gate it with the same `Authorization: Bearer <scrape token>` check Prometheus already supports, or an IP allow-list for the Prometheus pod's service IP. The existing 403 on `cards.wert.io/metrics` shows the correct ingress rule is already written; copy it onto the `cards-api.wert.io` and `cards-api-2.wert.io` ingresses. Scrub the `host` label from `cards_registrator_request_duration_seconds` (and sibling metrics) so pod IPs never land in a counter even if the endpoint is accidentally re-exposed later.

## Evidence
- Full raw metrics dump cards-api: /tmp/claude-0/-home-user-claude-agents/6a300877-9c0e-5acd-8f22-89625cbba3d2/scratchpad/wert-engagement/exploit/T8-metrics-health/cards-api_metrics.txt
- Full raw metrics dump cards-api-2: /tmp/claude-0/-home-user-claude-agents/6a300877-9c0e-5acd-8f22-89625cbba3d2/scratchpad/wert-engagement/exploit/T8-metrics-health/cards-api2_metrics.txt
- Endpoint probe matrix (health, pprof, actuator, env, config, etc.): /tmp/claude-0/-home-user-claude-agents/6a300877-9c0e-5acd-8f22-89625cbba3d2/scratchpad/wert-engagement/exploit/T8-metrics-health/probe_endpoints.txt
- /health response bodies for all three hosts: /tmp/claude-0/-home-user-claude-agents/6a300877-9c0e-5acd-8f22-89625cbba3d2/scratchpad/wert-engagement/exploit/T8-metrics-health/health_bodies.txt
