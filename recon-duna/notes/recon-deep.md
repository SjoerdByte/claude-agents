# Duna deep recon (phase 2) - 2026-10-29

Continuation of recon.md. Goal: deeper subdomain discovery, vhost probing, and
withduna.com ownership/scope verdict. Recon only, no exploitation.

## 1. CT-log sweep (beyond crt.sh)

certspotter (api.certspotter.com) for duna.com returned only the known live set PLUS one
net-new name: **cdn.duna.io** (different registrable domain). Pivoting CT on the related
domains surfaced a large Duna-owned alias/staging footprint:

certspotter withduna.com: admin, api, cdn, connect, contribute, dashboard-proto, dashboard,
demo, events, github-app, webhooks .withduna.com ; cdn.viaduna.com
crt.sh withduna.com (adds history): *.preview.withduna.com, admin.internal.withduna.com,
config.withduna.com, n8n.withduna.com, *.withduna.com
certspotter duna.io: admin, api, cdn, connect, contribute, dashboard, know, www .duna.io ;
cdn.duna.com (cross-SAN)

## 2. Curated duna.com candidate DNS resolution (66 names) - ALL NXDOMAIN

staging, stage, dev, test, qa, uat, sandbox, preview, app, portal, backoffice, admin-api,
internal, int, api-staging, api-dev, dashboard-staging, dashboard-dev, beta, next, legacy,
v1, v2, gateway, grafana, kibana, prometheus, jenkins, ci, gitlab, vault, argocd, vpn,
bastion, jump, monitoring, metrics, logs, db, storage, files, assets, media, blog, careers,
help, kb, partners, developers, sdk, mobile, m, old, new, auth-staging, api-internal,
internal-api, sentry, runner, settings, config, demo, dashboard-proto, graphql, n8n,
github-app -> every one STATUS=3 (NXDOMAIN) on *.duna.com.

Conclusion: the production duna.com namespace has NO forgotten/staging/internal host beyond
the 27 already mapped. All non-prod naming lives under withduna.com instead.

## 3. vhost probing on the app LB (Host-header override)

Egress proxy resolves CONNECT targets itself, so --resolve to an NXDOMAIN host fails at the
proxy (502). Working technique: CONNECT to a resolvable app host (api.duna.com -> LB) and
override the Host header. Results:

| Host header | code | note |
|---|---|---|
| api.duna.com | 404 | JSON endpoint_does_not_exist (routes to api app) |
| dashboard.duna.com | 302 -> /login | routes to dashboard app |
| connect.duna.com | 302 -> /onboard | routes to connect app |
| settings / staging / internal / admin-api / api-internal / graphql / dashboard-proto / grafana / admin / auth-admin / config / preview .duna.com | 404 | bare empty body, NO Server header = no vhost configured on public LB |

No unlisted vhost is reachable on the public LB. Confirms prior dead-end. The admin/settings
apps are not host-routed at the public edge.

## 4. NEW related domains (all Duna-owned)

### withduna.com = Duna STAGING/DEV environment  (SEPARATE LB)
Live A records (DoH):
- admin / api / connect / contribute / dashboard / events / webhooks / github-app .withduna.com
  -> **3.125.250.148, 3.126.170.142** (AWS eu-central-1, DIFFERENT LB from prod 3.76.148.43/18.194.122.18)
- dashboard-proto.withduna.com, demo.withduna.com -> Vercel (96907dd800260c79.vercel-dns-017.com / 216.150.x)
- cdn.withduna.com -> 13.227.65.x (CloudFront)
- NXDOMAIN now (CT history only): www, n8n, config, admin.internal, app.preview .withduna.com
Characterizing GET: dashboard.withduna.com/ -> 302 /login, identical to prod dashboard = runs the Duna app.
withduna.com apex: no web A record (proxy 502 on GET).

### duna.io = production ALIAS
- api.duna.io / dashboard.duna.io / connect.duna.io -> **3.76.148.43, 18.194.122.18** (the PROD LB)
- duna.io / www.duna.io -> 3.171.x (CloudFront/S3), cdn.duna.io -> 108.156.107.x (CloudFront)
- know.duna.io -> 143304238.sites.hscoscdn-eu1.net (same HubSpot CMS as know.duna.com)

### viaduna.com = CDN alias
- cdn.viaduna.com -> 13.227.65.x (same CloudFront IPs as cdn.withduna.com), apex no A record.

### Ownership (RDAP)
| domain | registrar | created | NS |
|---|---|---|---|
| duna.com | NameCheap | 1999-02-04 | AWS Route53 |
| withduna.com | Key-Systems GmbH | 2023-07-10T14:13:29Z | AWS Route53 |
| viaduna.com | Key-Systems GmbH | 2023-07-10T14:13:25Z | AWS Route53 |
| duna.io | Key-Systems GmbH | 2019-12-04 | AWS Route53 |

withduna.com + viaduna.com batch-registered same second, same registrar, AWS Route53 NS.
duna.io same registrar + AWS NS and its app hosts point at the prod LB. All three serve/route
Duna's code and data => Duna-owned. VERDICT: in scope per CLAUDE.md scope clarification
(runs target code / stores target data). withduna.com is the highest-value new surface.

## Raw files
certspotter.json, duna_resolve.txt, candidates.txt, vhost2.txt, related_resolve.txt (this dir).
