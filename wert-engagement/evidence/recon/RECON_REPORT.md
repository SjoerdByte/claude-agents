# wert.io recon report
Date: 2026-10-14
Scope: domains listed by the engagement; read-only mapping, no exploitation.
Raw artefacts in: `/tmp/claude-0/-home-user-claude-agents/6a300877-9c0e-5acd-8f22-89625cbba3d2/scratchpad/wert-engagement/recon/` (http/, js/, dns/, paths/).

## 1. DNS and live hosts

| Host | Resolves | A / CNAME | Fronted by | HTTP status | Notes |
|---|---|---|---|---|---|
| wert.io | yes | 104.26.4.81, 104.26.5.81, 172.67.72.11 | Cloudflare | 200 | main marketing site, static |
| www.wert.io | yes | 104.x | Cloudflare | 200 → redirects to wert.io | |
| docs.wert.io | yes | 104.x | Cloudflare → Render (`x-render-origin-server: Render`) | 302 → /docs | ReadMe docs; exposes `/.well-known/api-catalog`, `/.well-known/agent-skills/index.json`, `/llms.txt`, `/llms-full.txt` |
| documentation.prod.wert.io | yes | 3.127.19.169, AWS ELB eu-central-1 | ingress on shared ELB | TLS reset | behind the shared *.prod ingress; likely mTLS/VPN |
| upmeter.prod.wert.io | yes | 3.73.167.142 | AWS ELB eu-central-1 | TLS reset | same ELB |
| prometheus.prod.wert.io | yes | 3.73.167.142 | AWS ELB eu-central-1 | TLS reset | same ELB |
| grafana.prod.wert.io | yes | 3.73.167.142 | AWS ELB eu-central-1 | TLS reset | same ELB |
| status.prod.wert.io | yes | 3.73.167.142 | AWS ELB eu-central-1 | TLS reset | same ELB |
| dex.prod.wert.io | yes | 3.73.167.142 | AWS ELB eu-central-1 | TLS reset | OIDC provider (Dex); same ELB |
| api.prod.wert.io | yes | 3.127.19.169 | AWS ELB eu-central-1 | TLS reset | same ELB |
| dashboard.prod.wert.io | yes | 3.73.167.142 | AWS ELB eu-central-1 | TLS reset | same ELB |
| kubeconfig.prod.wert.io | yes | 3.73.167.142 | AWS ELB eu-central-1 | TLS reset | same ELB; sensitive if open |
| javascript.wert.io | yes | 104.x | Cloudflare → GitHub Pages (`x-github-request-id`, Fastly) | 404 (GH Pages default) | CNAME file reports `javascript.wert.io`; Pages site claimed, repo exists under `wert-io/*` GitHub org |
| logotypes.wert.io | yes | 172.x | Cloudflare → CloudFront → S3 eu-central-1 | 403 (AccessDenied) | S3-backed, listing denied |
| emails-static.wert.io | yes | 104.x | Cloudflare → CloudFront → S3 us-east-2 | 403 (AccessDenied) | S3-backed, listing denied |
| cards.wert.io | yes | 18.160.143.5 | CloudFront (`d141m2bp1fsmxb.cloudfront.net`) → Go backend | 200 (`cards-registrator-front` SPA) | source maps exposed |
| cards-green.wert.io | yes | 13.x | CloudFront (`d10h88jq1qsp77.cloudfront.net`) | 200 same SPA | |
| cards-beta.wert.io | yes | 104.x | Cloudflare | 200 empty body | possibly deprecated |
| cards-2.wert.io | yes | 13.x | CloudFront (`d3a1nc0qror54.cloudfront.net`) | 200 same SPA | |
| cards-api.wert.io | yes | 35.158.198.9 | AWS ELB eu-central-1 (direct, no CF) | 404 Go default | `/health` 200, `/metrics` 200 (public Prometheus) |
| cards-api-2.wert.io | yes | 35.158.198.9 | AWS ELB (same as cards-api) | 404 | same behaviour as cards-api |
| cards-reg-iframe-sandbox.wert.io | yes | 104.x | Cloudflare | 200 same SPA | `.js.map` exposed |
| cards-reg-iframe-green.wert.io | yes | 104.x | Cloudflare | 200 same SPA | `.js.map` exposed |
| widget.wert.io | yes | 104.x | Cloudflare | 200 (`Wert` SPA at `/v1/`) | redirects `/` → `/v1/`; API at `/v1/api/v3` (session cookie `ssid`) |
| widget-green.wert.io | yes | 104.x | Cloudflare | 200 SPA | |
| widget-green-new.wert.io | yes | 104.x | Cloudflare | 526 (origin cert error) | dormant/broken |
| widget-test.wert.io | yes | 172.x | Cloudflare | 526 (origin cert error) | dormant/broken |
| issuing.wert.io | yes | 104.x | Cloudflare | 200 (`Wert Issuing` SPA) | `/api`, `/api/v1`, `/api/v1/cards`, `/users`, `/auth` all 401 `{"code":"unauthenticated"}` |
| onboarding.wert.io | yes | 35.205.106.218 | Tally.so (`cname.tally.so`) | 404 (Tally generic "Page Not Found") | unclaimed custom-domain or deleted form |
| partner.wert.io | yes | 104.x | Cloudflare | 200 (`Partner Dashboard` Vue+Quasar) | `/api/external/orders`, `/users`, `/users/create` live; `X-Api-Key` auth |
| partner-green.wert.io | yes | 172.x | Cloudflare | 200 same dashboard | widgetOrigin: widget-green.wert.io |
| partner-sandbox.wert.io | yes | 172.x | Cloudflare | 200 same dashboard | widgetOrigin: sandbox.wert.io; matching sandbox API |
| otc.wert.io | NO | SERVFAIL | delegated NS to AWS Route53 (dead zone) | - | **lame NS delegation, takeover candidate** |
| demo.otc.wert.io | NO | SERVFAIL | child of otc.wert.io | - | affected by same lame delegation |
| demo.wert.io | NO | NOERROR, no record | parent zone (Cloudflare) answers but no record | - | not dangling |
| dev.wert.io | NO | NOERROR, no record | parent zone | - | not dangling |
| green.wert.io | yes | 104.x | Cloudflare | 200 (NextJS marketing site variant) | mirror of marketing site |
| sandbox.wert.io | yes | 104.x | Cloudflare | 200 widget SPA | API at `/api/v3/*`, same `ssid` scheme |
| sandbox-new.wert.io | NO | NOERROR, no record | parent zone | - | |
| sandbox-old.wert.io | yes | 104.x | Cloudflare | 526 (origin cert error) | dormant |
| support.wert.io | yes | 172.x | Cloudflare → Intercom (`x-intercom-version`, `x-ami-version`) | 302 → /en/ | Intercom help centre |

## 2. Tech fingerprint summary

- **Cloudflare edge** on 25 of the live hostnames; all share CF-REF `cf-ray` and NEL reporting.
- **AWS ELB eu-central-1** on `*.prod.wert.io` (shared), `cards-api.*`.
- **CloudFront + S3** on `cards.wert.io`, `cards-green.wert.io`, `cards-2.wert.io`, `logotypes.wert.io`, `emails-static.wert.io`.
- **Backends**: Go (`net/http` 404 string) on `cards-api.*`, `cards.*` origin; OpenAPI-validated service on `partner.*` (errors like `"no matching operation was found"`, `"Header parameter X-Api-Key is required, but not found"`); Vue 2 + Quasar on `partner*`, Vue 3 + Vite on `widget*`, `sandbox*`, `issuing.*`, Vue 2 webpack on `cards*` registrator iframe.
- **Third-party integrations in widget JS**: Cardinal Commerce (3DS, `centinelapi.cardinalcommerce.com`), Sardine.ai (`api.sardine.ai`, `api.dev.sardine.ai` – note sandbox host, make sure prod doesn't call dev), Amplitude (`api.amplitude.com`, `api.eu.amplitude.com`), Sentry DSN `https://75bb5099ea23469b88d2dcc74098b651@o818648.ingest.sentry.io/6094869` (public).
- **No GraphQL** found anywhere (every `/graphql` returned the SPA fallback or 404).
- **No GitLab/Jenkins/CI** exposed on reachable hosts.
- **GitHub org** inferred: `github.com/wert-io/` (seen as `wert-io/widget-initializer.git` in partner-vendor.js).

## 3. Promising endpoints with evidence

### 3.1 cards-api.wert.io — public Prometheus metrics (unauth)
```
GET https://cards-api.wert.io/metrics
HTTP/2 200
# HELP cards_registrator_request_duration_seconds ...
cards_registrator_request_duration_seconds_bucket{code="200",host="10.20.129.110:8080",method="GET",url="/health",le="0.005"} 1356
...
```
Leaks internal pod IP `10.20.129.110:8080`, service name `cards_registrator`, Go runtime stats, request counts per route. Same labels available on `cards-api-2.wert.io`.

### 3.2 cards.wert.io — JavaScript source maps exposed
```
GET https://cards.wert.io/js/app.156b04f2.js.map      → 200, 44 840 B
GET https://cards.wert.io/js/chunk-vendors.4f562fcd.js.map → 200, 1 003 430 B
GET https://cards-reg-iframe-sandbox.wert.io/js/app.156b04f2.js.map → 200
GET https://cards-reg-iframe-green.wert.io/js/app.119d4e03.js.map   → 200
```
Source map contains `./src/App.vue`, `./src/router/index.js`, `./src/store/index.js`, `./src/plugins/axios.js`, `./src/views/CVV.vue`, `./src/views/Number.vue`, `./src/helpers/routes.js`, `./src/helpers/names.js`, `./src/plugins/meta.js`, `./src/main.js`. Confirms endpoints `/api/v1/register` and `/api/v1/order`, iframe paths `/v1/number-frame.html` and `/v1/cvv-frame.html`, and `axios.create({ withCredentials: true })`.

### 3.3 otc.wert.io — lame NS delegation to Route53 (takeover candidate)
```
dig NS otc.wert.io → REFUSED from ns-{846,1370,1621,468}.awsdns-*
EDE(22): No Reachable Authority at delegation otc.wert.io.
CT: *.otc.wert.io and *.demo.otc.wert.io certificates issued historically → the subdomain was in production use.
```
The parent zone (Cloudflare) still holds the NS records pointing at four AWS Route53 nameservers that no longer answer for the zone. Re-creating a Route53 hosted zone for `otc.wert.io` and getting assigned the same 4-NS set lets an attacker take over the subdomain. Classic Route53 hosted-zone-reclaim pattern.

### 3.4 cards.wert.io — card register endpoint validates body before auth check
```
POST https://cards.wert.io/api/v1/partner/register
Content-Type: application/json
{}
HTTP/2 400
{"status":"error","error_description":[
  {"field":"card_number","message":"Invalid card number"},
  {"field":"exp_month","message":"Invalid exp month"},
  {"field":"exp_year","message":"Invalid year"}]}

POST https://cards.wert.io/api/v1/partner/register
{"card_number":"4111111111111111","exp_month":"12","exp_year":"2029","cvv":"123","card_holder":"TEST","partner_id":"test"}
HTTP/2 401
{"status":"error","error_description":"unauthorized"}
```
Same behaviour on cards.wert.io, cards-2.wert.io, cards-api.wert.io, cards-api-2.wert.io, cards-reg-iframe-sandbox.wert.io, cards-reg-iframe-green.wert.io. Field-name/format enumeration without any credential and reveals the API surface pre-auth. Worth probing whether crafted bodies (missing fields, type confusion, unknown `partner_id` values) can slip past the auth guard.

### 3.5 partner.wert.io / partner-sandbox.wert.io — Data API (X-Api-Key)
```
GET  https://partner.wert.io/api/external/orders            → 400 {"msg":"Header parameter X-Api-Key is required, but not found"}
GET  https://partner.wert.io/api/external/users             → 400 same
POST https://partner.wert.io/api/external/users/create      → 400 {"error":"method not allowed"} on GET
GET  https://partner.wert.io/api/foo                        → 404 {"error":"no matching operation was found"}
GET  https://partner.wert.io/api/external/orders  with X-Api-Key: aaaa… → 401 {"error":"ERR_UNAUTHORIZED","success":false}
```
Strict OpenAPI-driven validator; no unlisted operations surface. Same hosts also serve `/api/external/users`, `/api/external/users/create` POST. Sandbox host (`partner-sandbox.wert.io`) behaves identically. Worth brute-forcing other `/api/external/<verb>` names and watching for any that return 400 vs 404 (`no matching operation` 404 means the OpenAPI router can be used to enumerate the exact method/path matrix without auth).

### 3.6 widget.wert.io / sandbox.wert.io — session-cookie APIs
```
GET https://widget.wert.io/v1/api/v3                        → 401 {"status":"error","error_description":"ssid not found","request_id":...}
GET https://widget.wert.io/v1/api/v3/session                → 401 ssid not found
GET https://widget.wert.io/v1/api/v3/order                  → 401 ssid not found
GET https://widget.wert.io/v1/api/v3/widget-config?partner_id=foo → 401 ssid not found
GET https://sandbox.wert.io/api/v3                          → 401 ssid not found
```
Session cookie-based. Docs confirm sandbox accepts any 4-digit OTP for any phone. Exploit should walk through: session mint → OTP in sandbox → inspect what partner-scoping is enforced on `widget-config`, `order`, and the per-route calls (`account/add-card`, `banks/add`, `orders/:orderId/send`, `email`, `limits`, `onboarding`) seen in the Vue router of `widget-v1-index.js`.

### 3.7 issuing.wert.io — Wert Issuing API (API-key or JWT)
```
GET https://issuing.wert.io/api/         → 401 {"code":"unauthenticated","message":"authentication required"}
GET https://issuing.wert.io/api/v1       → 401 same
GET https://issuing.wert.io/api/v1/cards → 401 same
GET https://issuing.wert.io/api/v1/users → 401 same
GET https://issuing.wert.io/api/v1/auth  → 401 same
```
Separate product (Wert Issuing: `/cards`, `/billing`, `/balances`, `/admin`, `/request-code`, `/auth/logout` routes in SPA). Worth probing `/request-code` POST, `/auth/login`, `/admin/*` from the exploit side.

### 3.8 CORS headers on nearly every host
```
access-control-allow-origin: *
access-control-allow-credentials: true
access-control-allow-methods: GET, PUT, POST, DELETE, PATCH, OPTIONS
access-control-allow-headers: x-partner-id, Content-Type
```
Appears on partner.wert.io, partner-sandbox.wert.io, partner-green.wert.io, widget.wert.io, sandbox.wert.io, cards-api.wert.io, cards-reg-iframe-sandbox.wert.io, cards-reg-iframe-green.wert.io. Browser-side the combo is ignored (wildcard + credentials is invalid). Keep an eye on any endpoint that instead reflects `Origin` dynamically — none seen on the sampled set, but worth running against the full endpoint list once exploit enumerates them.

### 3.9 onboarding.wert.io — Tally with no matching form
```
GET https://onboarding.wert.io/     → 404 Tally "Page Not Found"
X-DNS-Prefetch-Control: off; X-Download-Options: noopen; X-Permitted-Cross-Domain-Policies: none
```
If Tally allows a new workspace to claim an unregistered custom domain, this is a subdomain takeover (phishing-grade). Confirm via Tally's domain-verification docs before raising.

### 3.10 widget-test.wert.io / widget-green-new.wert.io / sandbox-old.wert.io
All return `error code: 526` (Cloudflare origin SSL verification failure). Confirms the origin servers are still routed but the certs are broken. Low-value, but a lingering sandbox-old may serve an older widget build if the cert is fixed by accident.

## 4. Discovered but not detailed yet
- `cards-api-green.wert.io` — in CT, NXDOMAIN now, not live.
- `wert-io/widget-initializer` GitHub repo — inferred, worth cloning once by exploit for the SDK side.
- `/.well-known/agent-skills/index.json` on `docs.wert.io` — points at `llms.txt`/`llms-full.txt`, which are already pulled into `recon/http/docs-llms*.txt`.

## 5. Ruled out
- Firebase/Supabase/Google Cloud: no references in any JS bundle (0 hits for `firebase`, `supabase`, `firestore`, `firebaseio.com`, `.firebaseapp.com`).
- SPA 200s on `/.env`, `/.git/config`, `/package.json`, etc. on partner.wert.io / sandbox / issuing: these are the SPA fallback serving `index.html` (confirmed via `content-type: text/html` and matching body hash); not a real disclosure.
- javascript.wert.io subdomain takeover: `/CNAME` returns `javascript.wert.io`, Pages site is claimed.
- GraphQL: no live `/graphql` on any host; `partner.wert.io/graphql` is the SPA fallback.

## 6. Out of scope noticed and left alone
- `wert.io` has links to `wert-io.notion.site` (Careers page). Notion is a third-party CMS; the Notion page is not Wert's own code and does not store Wert customer data, so it's out of scope.
- `files.readme.io` serves images embedded in docs — third-party.
- Social links to LinkedIn, Twitter/X, Discord, Telegram — third-party.

## 7. Top 15 exploit candidates (ranked)

| # | Target URL | Suspected vuln class | Why | Expected impact |
|---|---|---|---|---|
| 1 | `otc.wert.io` NS delegation to `ns-{846,1370,1621,468}.awsdns-*.*` | Subdomain takeover (Route53 hosted-zone reclaim) | Lame NS delegation to dead Route53 nameservers; CT confirms `*.otc.wert.io` and `*.demo.otc.wert.io` were in prod use | P1 if full HTTPS cookie-scope recovered; at minimum phishing-grade; CVSS likely ≥7.0 |
| 2 | `POST https://partner.wert.io/api/external/users/create` and `/users`, `/orders` with manipulated `X-Api-Key` / partner-ID headers | IDOR / mass assignment via Data API | Documented Data API with simple header auth; exact field validation errors leak schema; worth testing cross-partner access and mass assignment of role/partner_id/tenant fields | P1 if cross-tenant data exposure; CVSS 8+ unauth, 6.5–7.5 auth |
| 3 | `widget.wert.io/v1/api/v3/*` and `sandbox.wert.io/api/v3/*` session flow | IDOR / missing tenant scoping on `widget-config`, `order`, `orders/:id`, `account/add-card`, `banks/add` | Session cookie `ssid` present; sandbox lets any OTP in; routes include per-order lookups by ID (highest-value-pattern in CLAUDE.md) | P1 if order IDs are guessable or if partner_id scoping is missing; CVSS 8+ |
| 4 | `cards.wert.io/api/v1/partner/register` and `/api/v1/order` | Auth bypass / order-of-check bug | Pre-auth validator leaks field names; worth trying `partner_id=0`, missing partner_id, encoded whitespace, unknown JSON types to slip past auth check | P1 if any payload lands in the real handler without a valid key |
| 5 | `issuing.wert.io/api/v1/*` login flow + `/admin` | Auth bypass / IDOR on issuing | Separate product, less eyes; `/admin` route exists; `/request-code` is a passwordless flow candidate | P1 if admin or cross-user access |
| 6 | `*.prod.wert.io` (grafana, prometheus, dex, dashboard, kubeconfig, upmeter, status, documentation, api) | Unauth exposure of admin / monitoring / K8s | Shared ELB; TLS reset through the egress proxy may be mTLS or IP allowlist. If any one of them is actually open from the real internet, each has P1 potential (dex = SSO take-over, kubeconfig = full K8s control, grafana = creds via datasources, prom = internal exfiltration) | P1 each; CVSS 9+ for kubeconfig/dex |
| 7 | `cards-api.wert.io/metrics` | Info disclosure (Prometheus) | Confirmed unauth; leaks `10.20.129.110:8080`, service names, route counts; combine with any auth bypass to pivot | Low on its own; multiplier for other finds |
| 8 | Source maps on `cards.wert.io`, `cards-reg-iframe-{sandbox,green}` | Info disclosure (source code) | Full webpack sources with 19 files; gives free pre-auth insight into tokeniser, iframe-postMessage flow, CVV handling (PCI-sensitive) | Low direct; feeds all iframe-related exploit work |
| 9 | `partner.wert.io/api/external/*` endpoint enumeration | Enumeration via OpenAPI 404 message | `{"error":"no matching operation was found"}` on wrong path, `{"error":"method not allowed"}` on wrong method, `{"msg":"Header parameter X-Api-Key is required, but not found"}` on real path missing header → three-state oracle for brute-force path discovery | Supports #2 |
| 10 | `onboarding.wert.io` | Subdomain takeover via Tally | Generic Tally 404; subject to Tally's domain-verification policy | Medium (phishing); High if cookie scope `*.wert.io` is reusable |
| 11 | `cards-api.wert.io/health`, `cards-api-2.wert.io/health` | Minor info-disclosure | Public health; backend availability tracking only | Low |
| 12 | widget `vary: Origin` with ACAO=* and `allow-credentials: true` on `widget.wert.io/v1/api/v3/*` | Possible origin-reflection CORS bypass | `vary: Origin` suggests server inspects Origin for something; try specific Origin values (`null`, `https://widget.wert.io.evil.com`, `data:`) in case any path reflects instead of wildcarding | Medium; High if credentialed state (`ssid`) can be stolen cross-origin |
| 13 | Wert webhook delivery (lack of HMAC signing) | Unsigned webhooks | Docs do not describe any signature, timestamp, or secret header | Partner-side risk; worth raising as hardening recommendation and testing whether partner is expected to use a shared secret elsewhere |
| 14 | `widget-test.wert.io`, `widget-green-new.wert.io`, `sandbox-old.wert.io` | Stale deploy via broken origin cert (526) | Dormant hostnames; if DNS/origin is ever revived without updating the deploy, an older widget could serve stale JS | Low direct; monitor only |
| 15 | `logotypes.wert.io` and `emails-static.wert.io` S3 buckets | Enumerable prefixes via CloudFront | S3 denies listing but a known-prefix fetch (e.g. `/<partner-slug>/logo.png`) succeeds — worth brute-forcing partner slugs for brand enumeration or stale asset exposure | Low; informational |

Nothing was exploited. All raw curls, HTML bodies, JS bundles, source maps, CT output, and DNS traces are retained under:
- `recon/http/` — all GET/HEAD/OPTIONS/POST responses
- `recon/js/` — JS bundles and source maps
- `recon/paths/` — path-brute output per host
- `recon/dns/` — DNS resolution, CT dump, dead-host analysis
