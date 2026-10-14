# finmid.com - Phase 1 recon surface map

Target: finmid.com (B2B payments / capital / financing for food-delivery and merchant platforms)
Authorization: written permission from CEO Max Schertel
Scope: everything on *.finmid.com + vendor-hosted services holding finmid data (per Claude.md scope note)
Session date: 2026-10-14
Working dir: /home/user/claude-agents/recon-finmid
Raw captures: /home/user/claude-agents/recon-finmid/raw/
Hours spent: ~1.5

Legend: status = HTTP code; L = live, S = sandbox, SPA = React single-page app, EV = Envoy edge, S3-CF = S3 behind CloudFront.

## Host inventory

| Host | IP | Status | Server / tech | Role / notes |
| --- | --- | --- | --- | --- |
| finmid.com | 99.84.118.81 | 200 | AmazonS3 + CloudFront, Astro v4.16.18 | marketing site, static. Strong CSP. Loads lambda https://72poeb7km6ohdftfmhb6an5vla0gdbgd.lambda-url.eu-central-1.on.aws for a form. |
| www.finmid.com | 99.84.118.104 | 200 | same | redirect-equivalent |
| platform.finmid.com | 18.160.143.99 | 200 | S3-CF, Vite+React | **distributor dashboard SPA**. Public source map leaks 821 TS sources incl. full RTK Query service definitions. env.js: KEYCLOAK_URL=https://auth.finmid.com/auth realm=platform client=platform-ui GATEWAY_URL=https://platform.gateway.finmid.com |
| apply.finmid.com | 99.84.118.111 | 200 | S3-CF | "Service unavailable" placeholder (564B, deprecated apply SPA). etag `85e08a8fcdaafe22c5295908538b99ca` |
| lieferando.apply.finmid.com | 99.84.118.111 | 200 | S3-CF | same deprecated apply placeholder |
| lieferando.finmid.com | 99.84.118.75 | 200 | S3-CF, React SPA | tenant merchant portal (947B etag `00723200d9c63d54c5745d0514eeed48`). env.js PLATFORM_ID=0dab06a2-bd35-42af-b7cc-a11d1ac991de GATEWAY_URL=https://gateway.finmid.com MERCHANT_APP_ORIGIN=https://capital.finmid.com |
| capital.finmid.com | 18.238.136.11 | 200 | S3-CF, React | tenant merchant portal (same bundle, 947B). POSTHOG_KEY=phc_UDbiw0ATbRYSMsSPkbrIUPDsU3KPqIffgdZaPIUX51t |
| teya.finmid.com | 18.154.101.95 | 200 | S3-CF, React | tenant merchant portal (947B), CSP frame-ancestors `https://business.teya.com` |
| allo.finmid.com | 18.238.136.62 | 200 | S3-CF, React | tenant merchant portal (947B) |
| glovo.finmid.com | 18.238.136.11 | 200 | S3-CF, React | tenant merchant portal (947B) |
| bolt.finmid.com | 18.238.136.62 | 200 | S3-CF, React | tenant merchant portal (947B) |
| mypos.finmid.com | 18.160.143.68 | 200 | S3-CF, React | tenant merchant portal (947B). CSP frame-ancestors `vivid://* *` (wildcard, note!) |
| foody.finmid.com | 13.226.251.44 | 200 | S3-CF, React | tenant merchant portal (947B) |
| foodora-partner.finmid.com | 13.226.251.47 | 200 | S3-CF, React | tenant merchant portal (947B) |
| freenow.finmid.com | 18.238.136.62 | 200 | S3-CF, React | tenant merchant portal (947B) |
| efood.finmid.com | 18.238.176.72 | 200 | S3-CF, React | tenant merchant portal (947B) |
| sliq.finmid.com | 18.154.101.90 | 200 | S3-CF, React | tenant merchant portal (947B) |
| ready2order.finmid.com | 18.238.136.106 | 200 | S3-CF, React | tenant merchant portal (947B) |
| guesty.finmid.com | 18.238.136.62 | 200 | S3-CF, React | tenant merchant portal (947B) |
| everypay.finmid.com | 99.84.118.122 | 200 | S3-CF, React | tenant merchant portal (947B) |
| wamo.finmid.com | 13.226.251.45 | 200 | S3-CF, React (financing offer) | different bundle (financing offer SPA). **Public source map, leaks ~1.7MB tiger-webapp sources**. env.js: INTERNAL_API_BASE_URL=https://gateway.finmid.com |
| zeos.finmid.com | 13.226.251.6 | 200 | S3-CF, React | distinct Zeos-branded SPA. env.js ZEOS_DISTRIBUTOR_ID=7e0597e8-0f95-47f3-bbda-ef18ab4fd4bd |
| bolt-vehicle-solutions.finmid.com | 99.84.118.2 | 200 | S3-CF, React | distinct Bolt VS SPA (878B). env.js GATEWAY=gateway.finmid.com POSTHOG=phc_40X9jiYPDD7i4Dp7SS9OYrVwsVfHActeoRUH5akP1Fc |
| b2b-payments.finmid.com | 18.238.176.63 | 200 | S3-CF, React | distinct B2B payments SPA (877B). env.js GATEWAY=https://platform.gateway.finmid.com. References **api.eng.live.finmid.io** via CSP script-src |
| maintenance.finmid.com | 99.84.105.97 | 200 | S3-CF | static maintenance page (unchanged since 2025-08-29) |
| api.finmid.com | 63.182.204.17 | 403 at /, 401 on /api/v1/* | Envoy + Java | **live public API** (Bearer-auth). CSP connect-src `https://auth.ops.live.finmid.io` -> real backend DNS. Documented at docs.finmid.com (Capital + B2B Payments). |
| sandbox.finmid.com | 3.122.43.160 | 403 at /, 401 on /api/v1/* | Envoy + Java | **sandbox public API**. CSP connect-src `https://auth.ops.staging.finmid.io`. Same shape as api. |
| gateway.finmid.com | 63.182.204.17 | 404 at /, varies by path | Envoy + Java | **merchant-SPA internal gateway**. /payables-financing/public/v3/businesses/offers/active -> 404 with CSP of api live (route reachable). /signup/* -> 404 (not routed here). |
| platform.gateway.finmid.com | n/a (via CF Envoy) | 403 at /, 403 on /api/distributor | Envoy + Java | **platform admin internal gateway** (JWT auth required). Hosts all `/api/*` endpoints used by platform.finmid.com SPA. |
| webhooks.finmid.com | 63.182.204.17 | 404 at /, /healthz, /api/v1/capital/incoming-webhooks | Envoy | **inbound webhook ingress** for Capital. Routing is tight, needs discovery. |
| auth.finmid.com | 63.182.204.17 | 403 at /, 200 on /auth/realms/platform/.well-known/openid-configuration | Envoy + **Keycloak** | OIDC/OAuth2. Only the `platform` realm reachable; master/merchants/apply/capital realms all 403 at Envoy. Grants supported: authorization_code, implicit, **password (ROPC)**, client_credentials, refresh_token, device_code, jwt-bearer, token-exchange, uma-ticket, CIBA. Admin UI, account console, dynamic client registration all 403 at Envoy. |
| vpn.finmid.com | 18.159.201.184 | 404 at /, 302 then 200 at /login | **Pritunl** | SSL VPN login portal. Fingerprint only (no brute-force per rules). |
| analytics.finmid.com | 63.189.103.122 | 403 at /, **200 on /api/session/properties** | Envoy fronting **Metabase v0.54.14** | BI tool. Envoy allows only /api/session/properties and refuses everything else (/api/user, /api/dashboard/*, /api/geojson, /api/setup/validate, /api/public/* -> 403). session/properties leaks: setup-token `a5701f14-69da-44b2-a1c8-8eb61f200a2b` (**still exposed after has-user-setup=true**), site-url `http://metabase-external.ops.live.finmid.io` (plain http!), analytics-uuid, instance-creation 2022-07-25, Google OAuth client ID, password-complexity {total:6, digit:1}, enable-password-login=true. OSS version (no premium features). |
| short.bolt.finmid.com | 35.157.25.180 | 404 at /, /health, /rest/v3/short-urls | Envoy fronting **Shlink** URL shortener | /rest/v3/health returns Envoy RBAC-403 body "RBAC: access denied". Envoy only forwards redirect lookups. |
| docs.finmid.com | 104.16.242.118 | 302 to /docs | **ReadMe.com** hosted | Full public developer portal. Lists all API endpoints via llms.txt + .well-known/api-catalog. **Capital OpenAPI spec publicly available** at /openapi/capital-api.json (42 operations). B2B Payments OpenAPI JSON returns 404 (documented via ReadMe UI only). |
| docs-v2.finmid.com | 13.226.251.4 | 401 Basic realm="Auth required" | CloudFront Function | HTTP Basic Auth-gated Mintlify-style docs. Not reachable without creds (per rules, no brute). |
| plain-bounces.finmid.com | 3.21.252.48 | TLS RST | SES/Plain | mailing-list bounce handler (SMTP only on 443) |
| prox.finmid.com | 76.76.21.142 | TLS error on 443 | ? | Vercel edge (IP range) - connection reset |
| o1.ptr9561.finmid.com | 159.183.134.173 | TLS reset | PostmarkApp PTR | outbound mail rotator |
| o2.ptr7079.finmid.com | 159.183.100.21 | TCP timeout | Postmark | outbound mail rotator |
| o3.ptr6384.finmid.com | 159.183.210.164 | TCP timeout | Postmark | outbound mail rotator |
| link.finmid.com | 3.17.195.251 | 404 nginx (TLS cert belongs to *.finmid.com-signed by Anthropic proxy, real cert couldn't be inspected) | nginx | likely URL redirector; unresponsive to common probes |
| demo-distributor.finmid.com | NXDOMAIN | - | - | **dead** (also crt.sh wildcard *.demo-distributor existed) |
| justeat.apply.finmid.com | NXDOMAIN | - | - | dead |
| jet.apply.finmid.com | NXDOMAIN | - | - | dead |
| external-ops.finmid.com | NXDOMAIN | - | - | dead |
| platform-s3.finmid.com | NXDOMAIN | - | - | dead (cert exists but no DNS) |
| app.finmid.com | NXDOMAIN | - | - | dead (wildcard *.app.finmid.com cert exists) |
| status.finmid.com | NXDOMAIN | - | - | dead |
| xentral.finmid.com | NXDOMAIN | - | - | dead (wildcard *.xentral existed) |
| auth.xentral.finmid.com | NXDOMAIN | - | - | dead |
| blog.finmid.com | NXDOMAIN | - | - | dead |
| merchant-info-webapp-resources.finmid.com | NXDOMAIN | - | - | dead |
| demo.finmid.com | NXDOMAIN | - | - | dead |
| onboarding.finmid.com | NXDOMAIN | - | - | dead |
| webapp-resources.finmid.com | 13.226.251.29 | 403 at / and /robots.txt | S3-CF | public resource bucket. ListObjectsV2 denied (standard). Only pre-known paths served via CF. |

Extra subdomains discovered via crt.sh (not in user list):
- astro.finmid.com - NXDOMAIN
- ui.app.finmid.com - NXDOMAIN
- onboarding-resources.finmid.com - NXDOMAIN
- *.gateway.finmid.com (confirmed platform.gateway + sandbox.gateway)
- *.api.finmid.com and *.app.finmid.com wildcards exist, probe surface limited

## Source map leak - platform.finmid.com

Full map at /assets/index-C1IItZL0.js.map (1.97 MB). 821 TypeScript sources with `sourcesContent` present. Reveals internal library layout `libs/tbl-webapps/*`, `libs/keycloak/*`, `libs/distributor-types/*`, `libs/sentry/*`, `libs/environment/*`, and the full RTK Query service bodies. Same thing on wamo.finmid.com (/assets/index-C02z4SAG.js.map, 2.2 MB).

Platform (platform.gateway.finmid.com) RTK endpoint inventory extracted and saved:
- raw/bodies/src-publicSignup.txt - **public (no Keycloak)** signup flow
- raw/bodies/src-buyersService.txt - 15 buyer endpoints incl `/api/buyers/{externalId}/exists`, `/api/buyers/{externalId}/limit-increase`, `/api/buyers/documents/upload`
- raw/bodies/src-sellersService.txt - 10 seller endpoints incl `/api/sellers/{externalId}/exists`
- raw/bodies/src-prService.txt - 25 payment-request endpoints incl `/api/payment-requests/invoiceNumber/exists`, `/api/payment-requests/{id}/payouts`, `/api/payment-requests/documents/upload`, `/api/payment-requests/calculator/fee-override`
- raw/bodies/src-membersService.txt - `/api/members`, `/api/members/{userId}`, `/api/members/{userId}/second-factor-method`
- raw/bodies/src-webhooks.txt - `/api/webhooks[/${id}]` with Webhook object fields **{url, authUsername, authPassword, signatureSecret}**
- raw/bodies/src-apiKeys.txt - `/api/api-keys` CRUD (prefix-indexed delete)
- raw/bodies/src-distributor.txt - `/api/distributor[/{featureFlag}|/currencies|/attributes|/balance|/lock]`
- raw/bodies/src-capitalService.txt - 15 /api/capital/* ops incl `/api/capital/merchants/csv` (bulk CSV), `/api/capital/merchants/{internalBusinessId}/get-link` (**generates deep link that authenticates as that merchant**), `/api/capital/merchants/get-links` (bulk variant), `/api/capital/merchants/generate-offer`, `/api/capital/offer-groups/{offerGroupId}/offers`
- raw/bodies/src-analytics.txt - `/api/analytics-dashboard` (Metabase iframe URL fetcher)

Signup flow (no Keycloak token, bound to a `?token=` query param on publicLiveGatewayService -> `GATEWAY_URL`):
- GET /signup/status?token=
- POST /signup/profile?token= (body = member profile)
- POST /signup/create-phone-challenge?token= (body = phone)
- POST /signup/verify-phone-challenge?token= (body = {verificationCode})
- POST /signup/password?token= (body = {password})

Merchant SPA (wamo map) endpoints at gateway.finmid.com:
- /payables-financing/public/v1/businesses/non-pii, bank-accounts/mandates, aisp/connections/{connectionId}/status
- /payables-financing/public/v1/capital-max, capital-plus/request, consents, contracts
- /payables-financing/public/v1/credits, /credits/{creditId}/docs/{document}, /credits/{creditId}/repayment-history
- /payables-financing/public/v1/documents/csp[/{id}|/submit|/uploads]
- /payables-financing/public/v1/fundings/applications, offers/{offerId}/feedback
- /payables-financing/public/v1/onboardings/latest[/submit]
- /payables-financing/public/v2/available-offers, businesses/documents/{documentType}[/{offerGroupId}][/submit]
- /payables-financing/public/v3/businesses/offers/active

Also api.finmid.com (external) is fully documented at docs.finmid.com:
- Capital OpenAPI (42 ops) at `/openapi/capital-api.json` lists live base `https://api.finmid.com` + sandbox base `https://sandbox.finmid.com`.
- Key auth-model: static Bearer API key per distributor; sandbox/live separation at hostname level.

## Keycloak (auth.finmid.com)

- Issuer: https://auth.finmid.com/auth/realms/platform
- Only `platform` realm reachable (others 403 at Envoy)
- Grants: authorization_code, implicit, **password**, client_credentials, refresh_token, device_code, jwt-bearer, token-exchange, uma-ticket, CIBA
- Signing algs: HS256/384/512 accepted (alg-confusion risk if backends validate without strict alg allowlist)
- Admin/account/dynamic client registration: 403 at Envoy
- JWKs: https://auth.finmid.com/auth/realms/platform/protocol/openid-connect/certs (200)

Platform SPA baseQuery (`libs/tbl-webapps/gateway-api/src/helpers/createBaseQuery.ts`) logs out on 401 or 403. So probing a protected endpoint with a user session shouldn't be a trap -- 403 just redirects to the keycloak logout page.

## CORS/CSP observations

- All SPA hosts send `x-frame-options: DENY` + per-tenant `frame-ancestors` whitelists (merchant.wolt.com, business.vivid.money, vivid://*, business.teya.com, dashboard.everypay.gr, account.ready2order.com, business.sliq.eu, partner.foodora.com, partner-app.e-food.gr, partner-app.foody.com.cy).
- mypos.finmid.com CSP has `frame-ancestors ... vivid://* *` with a trailing `*` -> **wildcard CSP** permits framing from anywhere; worth checking for click-jacking / UI redress.
- All APIs: `x-content-type-options: nosniff`, `strict-transport-security: max-age=31536000; includeSubDomains`.
- SPA cookies: not set on landing pages (SPA uses localStorage via Keycloak JS).
- Metabase sets `metabase.DEVICE` cookie HttpOnly, SameSite=None, Secure.
- Docs Cloudflare __cf_bm cookie HttpOnly, SameSite=None.

## Known non-findings excluded per CLAUDE.md

- Google OAuth client ID in Metabase config (public OIDC client ID).
- Sentry DSN / PostHog project keys (public frontend keys).
- CloudFront + S3 origin bucket name 'webapp-resources' is implied by hostname and standard S3 bucket config isn't a finding.

## Open threads for exploit phase (ranked)

1. (P1) **publicSignupService token-chain abuse (signup/*)** - 5-step flow bound to a single `?token=`. Open questions: (a) token entropy & reuse, (b) rate-limit on verify-phone-challenge (SMS code brute), (c) can updateMemberProfile change role/tenant/partner_id (mass assignment), (d) does set-password create a usable session reaching cross-tenant APIs. Signup-without-verification is listed in CLAUDE.md as the highest-value pattern.
2. (P1) **Capital IDOR via `/api/capital/merchants/{internalBusinessId}/get-link`** - documented purpose is to produce a deep link that authenticates as the merchant. If scoping by distributor is server-missing, calling with another distributor's internalBusinessId = full account takeover of any merchant on finmid. Also `/api/capital/merchants/get-links` (bulk) and `/api/capital/merchants/csv`.
3. (P1) **External Capital API `/api/v1/capital/businesses/{business_id}`** (via api.finmid.com + Bearer) - sequential/UUID business_id in URL, kyb-data POST, documents POST, csp uploads, repayment-history. Classic REST IDOR per CLAUDE.md pattern #1. Bulk endpoints (/documents/csp, /credits/{credit_id}/documents, /documents/{document_id}/url) are juicy; cross-tenant document read = PII breach.
4. (P1) **Webhooks service `/api/webhooks`** - response body contains plaintext `authUsername`, `authPassword`, `signatureSecret`. If GET or GET /{id} leaks another tenant's webhook, you own their outbound HMAC + basic-auth creds -> can forge events into their systems and MITM finmid->partner traffic.
5. (P2) **Metabase `setup-token` still exposed after setup, Metabase v0.54.14, instance since 2022** - Envoy currently blocks `/api/setup/validate`; look for any path alias / case-sensitivity / trailing-slash / verb-override that reaches it. If RCE route reachable, direct RCE on Metabase host and pivot into `ops.live.finmid.io`. Also check for public dashboards via Envoy whitelist (`/public/dashboard/{uuid}` or `/public/question/{uuid}`).
6. (P2) **Buyer/seller `/exists` and `/stats` enumeration** - distributor-controlled `externalId`s are typically merchant IDs (sequential). GET `/api/buyers/{externalId}/exists` is enumerative; combined with search param on `/stats`, build the distributor's full buyer list. Tier-up to P1 if cross-distributor leakage.
7. (P2) **Platform members management `/api/members/{userId}`** - mass assignment on invite + PUT `/api/members/{userId}/second-factor-method` (if accepts another user's id, you disable MFA on an admin and then password-reset via phone/email).
8. (P2) **Keycloak ROPC on platform realm** - password grant enabled. Use the `platform-ui` client (likely a public client) to try (a) credential stuffing (polite, low volume) and (b) alg-confusion / token mint abuse (HS* algs allowed alongside RS/ES).
9. (P2) **publicLiveGatewayService + payables-financing public v1/v2/v3 endpoints** - whole /payables-financing/public/* namespace needs auth model verified. "public" naming historically means weak auth. {creditId}, {offerId}, {offerGroupId}, {connectionId}, {documentType}, {id} are IDOR candidates. `/credits/{creditId}/docs/{document}` could leak contracts / loan statements across businesses.
10. (P3) **Sandbox and live share same code (sandbox.finmid.com vs api.finmid.com)** - watch for sandbox endpoints that forgot the env check (test-buyer/test-seller creation present in Platform API; CSP references `auth.ops.staging.finmid.io` from the sandbox host and `auth.ops.live.finmid.io` from live - likely two distinct deployments but check `/api/v1/capital/simulation/*` endpoints documented in Capital OpenAPI for whether live rejects or executes.

## Supporting files

- subdomains.txt - initial scope list
- raw/dns.txt, raw/dns-missing.txt - resolution results
- raw/http-head.txt - 726-line HEAD-probe log for every live host
- raw/crtsh-finmid.json, raw/crtsh-names.txt - cert transparency SAN discovery
- raw/bodies/*.html - landing page bodies for each SPA
- raw/bodies/*-env.js - runtime config leaked by each SPA
- raw/bodies/platform-index.js (1.5 MB), platform-index.js.map (1.97 MB)
- raw/bodies/wamo-index.js (1.7 MB), wamo-index.js.map (2.2 MB)
- raw/bodies/b2bpay-index.js (1.4 MB), zeos-index.js (0.8 MB)
- raw/bodies/openapi-capital.json - public Capital API spec (42 ops)
- raw/bodies/llms.txt - full docs index
- raw/bodies/docs-catalog.json, docs-skills.json - well-known endpoints
- raw/bodies/oidc-platform.json - Keycloak platform realm config
- raw/bodies/metabase-session-props.json - Metabase instance config leak
- raw/bodies/platform-endpoints.txt, wamo-endpoints.txt - extracted path lists
- raw/bodies/src-*.txt - dumped service source files
