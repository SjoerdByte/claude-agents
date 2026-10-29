# Duna engagement - server-level direct-IP checks

Status: clean negative. No new attack surface uncovered at the network/TLS layer.

## TCP port state on the four LB IPs

Curated port set (22, 25, 80, 443, 465, 587, 993, 995, 2375, 3306, 5432, 6379, 8080,
8443, 9000, 9090, 9200, 15672, 27017), one TCP connect per IP+port, 2s timeout.

Prod LB: 3.76.148.43 and 18.194.122.18 - only 80 and 443 open.
Staging LB: 3.125.250.148 and 3.126.170.142 - only 80 and 443 open.

No SSH, SMTP/submission, IMAPS/POP3S, Docker daemon, MySQL/Postgres/Redis/MongoDB,
alt-HTTP, Prometheus/Grafana, Elasticsearch, RabbitMQ management. Clean.

## TLS cert SAN enumeration

Fetched via egress proxy (direct openssl returns the MITM cert; -proxy flag yields the
real backend cert).

Prod LB cert (CN=admin.duna.com, Let's Encrypt YR1, valid Sep 5 - Dec 4 2026):
SANs: admin.duna.com, api.duna.com, connect.duna.com, contribute.duna.com,
dashboard.duna.com, webhooks.duna.com.

Staging LB cert (CN=admin.withduna.com, Let's Encrypt YR1, same validity window):
SANs: admin.withduna.com, api.withduna.com, connect.withduna.com,
contribute.withduna.com, dashboard.withduna.com, webhooks.withduna.com.

Separate single-SAN certs for events.duna.com, events.withduna.com,
github-app.withduna.com.

No new hostnames surfaced. admin.* is TLS-bound at the edge but the HTTP vhost returns
bare 404 (not a regression; prior ruled_out holds).

## Host-header sweep (13 names not previously probed)

ops/prometheus/api-admin .duna.com, ops/grafana/metrics/logs/prometheus/jenkins/argocd/
auth-admin/admin-api/api-admin .withduna.com, each against both IPs in its env. All
26 observations identical to the known-404 fingerprint (HTTP/2 404, no Server header,
zero body bytes). All 13 names also NXDOMAIN publicly. Dead end.

## Verdict

- Open TCP ports: 80 and 443 only on all four LB IPs. No management plane exposed.
- New hostnames from SANs: none.
- New vhosts via Host-header override: none.
- Net impact: zero new attack surface.

Confirms the broader picture: Duna's public edges are tightly configured.
