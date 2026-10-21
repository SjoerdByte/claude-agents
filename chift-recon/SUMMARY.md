# Chift recon summary — 2026-10-21

Primary scope: *.chift.eu, *.chift.app. Scope is "everything" per CLAUDE.md.

## Live hosts and fingerprints

| Host | Status | Tech |
|---|---|---|
| api.chift.eu | 200 | FastAPI + uvicorn — Chift Unified API, bearer JWT, full /openapi.json (780 KB, 157 paths, 186 ops) and Swagger UI /docs exposed. Server:`uvicorn`. CloudFlare in front (set-cookie _cfuvid). |
| api2.chift.eu | 200 | IDENTICAL /openapi.json to api.chift.eu (byte-identical, md5 8fdef2019e53a1d11db033e5d075a68c). Serves the same production FastAPI build. |
| backend.chift.app | 200 "This is the Chift Backend - 1.87.0" | Node/Express + SuperTokens (`/auth/*`), version string leaked at root. OIDC discovery live at `/.well-known/openid-configuration`. Public JWKS at `/auth/jwt/jwks.json`. SuperTokens admin dashboard served at `/auth/dashboard` (requires API key client-side). CSP mentions `cdn.jsdelivr.net/gh/supertokens/`. SuperTokens dashboard version `v0.15` is pinned in the HTML. SuperTokens core URL leaked: `https://prod-8d408ad197dc11edb887b72d66b729a0-eu-west-1.aws.supertokens.io:3567` (managed cloud). |
| chift.app, www.chift.app, marketplaces.chift.app | 200 | Next.js, same build (buildId `nMwTjMMdo8LCO1Et1Nc0W`), 43 chunk JS files, SSR renders identical HTML (150 KB). `/__ENV.js` exposes runtime env (NEXT_PUBLIC_*). |
| chift.eu, www.chift.eu | 301→301 / 200 | Webflow site behind Cloudflare → openresty origin. `data-wf-domain="www.chift.eu"`. |
| partners.chift.app | 200 | Vite+React SPA served by nginx/1.30.5. `/config.js` exposes `window.__CHIFT_CONFIG__` with backendUrl and `sessionTokenFrontendDomain: ".chift.app"` (cookie shared across *.chift.app). Sentry release id `1.3.0`. |
| mcp.chift.eu | 404 at `/`, 401 at POST /mcp | Node/Express MCP server behind Envoy (`x-envoy-upstream-service-time`). RFC 9728 Protected Resource Metadata at `/.well-known/oauth-protected-resource/mcp` (resource=`/mcp`, authorization_server=`https://backend.chift.app/auth`). RFC 8414 server metadata at `/.well-known/oauth-authorization-server`. |
| docs.chift.eu | 308→200 | Mintlify-hosted docs, Cloudflare in front. `/sitemap.xml`, `/robots.txt`, `/llms.txt` exposed. |
| seriesa.chift.eu | 307 /chat → /auth | Vercel Next.js app, title "Chift — Investor Dataroom". `/api/*` all redirect to /auth. Protected. |
| status.chift.eu | 200 | Atlassian Statuspage. `/api/v2/components.json` (public): Unified API, Syncs, Platform, Documentation, Support, MCP (all `operational`). Recent incident 2026-10-07 "Sync execution delays". |
| trust.chift.eu | 200 | Laika/Thoropass trust center (SPA from `laika-app-prod.s3.amazonaws.com`). Compliance posture page. |
| trail.chift.eu | 200 | lemlist custom-domain tracker ("Hey lemlisters! your custom domain is working!") — used for cold-email link redirection. |
| help.chift.app | 301→docs.chift.eu/help/overview | CloudFront redirector. |
| old-help.chift.app | 404 | Intercom-hosted help center shell (CSP packed with *.intercom.io, *.fin.ai, static.intercomassets.com). Returns "Not found" at /. |
| support.chift.app | 200 | Pylon help/support portal (`x-pylon-request-id`). CSP references *.usepylon.com, api.liveblocks.io, api.stripe.com. |
| internal.chift.app | 503 awselb/2.0 | AWS ELB with no backend attached. Resolves to 13.38.2.19 + 15.224.91.6 (same ELB IPs as backend.chift.app). |
| preprodapi.chift.eu | 502 proxy failure | Resolves (DNS Status 0, no A record returned) but no HTTPS reachable from this vantage. Likely VPN-gated / internal-only. |
| calendar.chift.eu, drive.chift.eu, mail.chift.eu | TLS failure | Google Workspace CNAME aliases (74.125.26.121). Not independent apps. |
| help.chift.eu | TLS handshake failure | SNI mismatch. |

## Internal / dead / interesting-DNS

- `bridge.chift.app` — A 10.0.197.35, 10.0.185.57 (RFC1918 published via public DNS — information disclosure of internal LB IPs; not a vuln by itself).
- `internal-api.chift.eu` — CNAME `internal-chipinternalbackboneapilb02-1548322500.eu-west-3.elb.amazonaws.com` → A 10.0.185.57, 10.0.197.35. The `internal-` prefix means this is an internal AWS ELB in eu-west-3; same IPs as bridge.chift.app. The LB name reveals internal naming convention `chip` + `internal-backbone-api-lb-02` (so there's at least an `lb-02`, presumably `lb-01`). Not internet-reachable from this vantage.
- `backend.chift.app` — CNAME `chipbackendlb01-365319361.eu-west-3.elb.amazonaws.com` → 15.224.91.6, 13.38.2.19 (public ELB).
- NXDOMAIN (dead): backend-test.chift.app, booksupport.chift.app, booksupport.chift.eu, booksupportc.chift.eu, fr.chift.eu, marketplace-test.chift.app, marketplaces-test.chift.app, oldtest.chift.app, preprod.chift.app, test.chift.app. All resolve to NODATA / SOA-only from the chift NS. These are listed in the briefing but currently have no DNS record.

## Subdomains beyond the briefing list

Discovery was limited by crt.sh being 502-flooded + certspotter chift.eu quota exhausted today. Sources used: certspotter (chift.app only), hackertarget, rapiddns, urlscan (empty), subdomain.center, wayback (empty), subdomain guessing via Google DoH.

Only one new name over the briefing's 36 was surfaced by subdomain.center:
- `booksupportc.chift.eu` — currently NXDOMAIN per public DoH.

No wildcard DNS detected. 60+ guessed names (dev, staging, admin, dashboard, auth, grafana, sentry, metrics, prod, portal, ci, vpn, git, api3, graphql, billing, etc.) all NXDOMAIN. crt.sh re-pull should be the first task next session.

## Chift Unified API (api.chift.eu / api2.chift.eu)

- Title "Chift API" v1.0.0, FastAPI, 157 unique paths, 186 operations across tags: Accounting (57), Invoicing (20), Point of Sale (18), eCommerce (14), Invoices (14), Consumers (12), Syncs (12), Property Management System (11), Payment (7), Journal entries (7), Webhooks (7), Analytic accounts (8), Orders (8), Banking (6), Products (5), Taxes (5), Insights (3), Datalayer (3), Integrations (3), Issues (2), ...
- Security: global `bearerAuth` (JWT). Only one path is explicit-noauth: `POST /token` (AuthItem = `{clientId, clientSecret, accountId:uuid, marketplaceId?:uuid}` → JWT). `POST /mcp-token` and `POST /insights/query-db` and `POST /insights/query-groups-join` and `GET /insights/catalog` have `security:null` in their spec entries but still return 401 on unauth probe (they inherit the global default).
- One op references an UNDEFINED security scheme: `GET /consumers` requires `mcp_auth: [consumers, consumers.read]` which is NOT declared in `components.securitySchemes` (only `bearerAuth` is). Spec inconsistency — treat the actual server behaviour as 401 Not authenticated.
- IDOR surface (per Claude.md high-value pattern): 122 distinct path templates under `/consumers/{consumer_id}/...`. consumer_id is a UUID (not sequential), which cuts guessability — but the full set includes `/consumers/{id}/accounting/invoices/{invoice_id}`, `/consumers/{id}/accounting/clients/{client_id}`, `/consumers/{id}/accounting/analytic-accounts/{analytic_account_id}` — all have deeper IDs that may be more predictable, and the test calls for cross-tenant checks against a victim consumer id.
- Public-token endpoints are rate-limit candidates: `/token` and `/mcp-token` take clientId+clientSecret so credential-stuffing / enumeration tests are the obvious abuse path.
- CORS on api.chift.eu is a **reflect-any-origin** policy with `access-control-allow-credentials: true`. Tested with evil.com, null, localhost:1337 — all reflected. The API uses bearer JWT in the Authorization header (not cookies) so standard cross-origin exploitation requires the attacker's JS to supply the token; however this is a non-trivial laxity and should be noted. If any endpoint ever sets a cookie (OAuth2 flow endpoints under /mcp-token are candidates), it becomes directly abusable.

Raw spec: `/tmp/claude-0/-home-user-claude-agents/409bf187-cfd4-56bb-8dc4-9f4147084ced/scratchpad/recon/openapi/api-chift-eu-openapi.json`

## MCP server (mcp.chift.eu)

- Express.js (`x-powered-by: Express`) behind Envoy (`x-envoy-upstream-service-time`).
- Routes:
  - `GET /` → 404 "Cannot GET /"
  - `GET /mcp` → `{"error":"invalid_token","error_description":"Missing Authorization header"}`
  - `POST /mcp` → 401 with `WWW-Authenticate: Bearer error="invalid_token", resource_metadata="https://mcp.chift.eu/.well-known/oauth-protected-resource/mcp"`
  - `GET /.well-known/oauth-protected-resource/mcp` → `{"resource":"https://mcp.chift.eu/mcp","authorization_servers":["https://backend.chift.app/auth"]}`
  - `GET /.well-known/oauth-authorization-server` → `{"authorization_endpoint":"https://backend.chift.app/auth/oauth/auth","token_endpoint":"https://backend.chift.app/auth/oauth/token","registration_endpoint":"https://backend.chift.app/auth/oauth/register","issuer":"https://backend.chift.app/auth","response_types_supported":["code"],"code_challenge_methods_supported":["S256"],"token_endpoint_auth_methods_supported":["client_secret_post"]}`
- Auth model: OAuth2 authorization code + PKCE, tokens issued by SuperTokens on backend.chift.app. Dynamic client registration endpoint published — `backend.chift.app/auth/oauth/register`. The CLI `docs.chift.eu/ai/mcp/remote` describes the user-facing flow.

## SuperTokens auth (backend.chift.app/auth)

- OIDC-ish `/.well-known/openid-configuration` returns full issuer + authorization/token/userinfo/revoke/introspect/end_session/register endpoints.
- `/auth/jwt/jwks.json` publicly returns the RSA JWKS used to verify tokens (`kid=d-1792509721942`).
- `/auth/dashboard` returns 200 with the SuperTokens dashboard shell (version v0.15, loaded from `cdn.jsdelivr.net/gh/supertokens/dashboard@v0.15/build/static`). HTML embeds the SuperTokens core URL `https://prod-8d408ad197dc11edb887b72d66b729a0-eu-west-1.aws.supertokens.io:3567` and `authMode="api-key"`. All dashboard-API calls under `/auth/dashboard/api/*` return `{"message":"Unauthorised access"}` (401) without an API key, as expected.
- `/auth/oauth/end_session` leaks a Java/Postgres stack trace: `SuperTokens core threw an error for a GET request to path: '/recipe/oauth/sessions/logout' with status code: 500 and message: io.supertokens.pluginInterface.exceptions.StorageQueryException: org.postgresql.util.PSQLException: ERROR: null value in column "client_id" of relation "oauth_logout_challenges" violates not-null constraint\n  Detail: Failing row contains (public, fb885d7e-ac69-4ae9-a860-0f1bb56744a9, null, null, null, null, 1792568147907).` — reveals Postgres backend, `public` schema, table `oauth_logout_challenges` structure, and a running challenge UUID. Low severity info disclosure, but it is a server stack trace reaching the client.
- `/auth/oauth/auth` (missing client_id) returns `{"error":"invalid_request","error_description":"client_id is required and must be a string"}` 400 — expected.
- `/auth/oauth/userinfo` returns `{"message":"Missing or invalid Authorization header"}` 401 — expected.
- CORS on backend.chift.app for non-auth routes uses an **allowlist** on OPTIONS preflight: only chift.app, partners.chift.app, marketplaces.chift.app (and presumably www.chift.app) are mirrored into ACAO. Non-allowed origins get 500 (middleware explodes rather than clean 403, minor hygiene issue). Preflight to `.chift.eu` subdomains, `test.chift.app`, `support.chift.app`, `null`, `attacker.evil.com` all 500. The GET surface at `/auth/jwt/jwks.json` and the dashboard pages return `access-control-allow-origin: *` with `access-control-allow-credentials: true` — browser-spec forbids this combo so it is not directly exploitable, but it is a spec violation.

## backend.chift.app /v2 API (Node/Express, SuperTokens session middleware)

Base URL for the frontends' `APIv2` axios instance is `${API_URL}/v2` where API_URL = `https://backend.chift.app`. Observed from Next.js chunks + direct probes:

Routed + auth-guarded (returns `{"message":"unauthorised"}` without session cookie):
- `GET /v2/consumers` and `GET /v2/consumers/search` and `GET /v2/consumers/csv` (bulk consumer read)
- `GET /v2/accounts`, `/v2/accounts/env`, `/v2/accounts/settings`, `/v2/accounts/users`
- `GET /v2/marketplaces`
- `GET /v2/partnership-requests/pending-count`
- `GET /v2/webhooks`, `GET /v2/session-data`
- `GET /v2/integrations`, `GET /v2/integrations/oneapis`
- `GET /v2/sync-to-consumers`
- `POST /v2/users/update`
- `POST /v2/users/changeaccount`
- `POST /v2/users/{userId}/impersonate` body `{accountId}` — IMPERSONATE_USER permission (per permissions enum in chunk 1kynw1sk1o2to.js)
- `PATCH /v2/users/{userId}/role` — role mutation
- `POST /v2/accounts/{accountId}/sessions` body `{accountId}` — "createInternalUserSession" (per the same chunk). Internal session mint path next to impersonation; worth separate IDOR / privilege testing.
- `POST /v2/marketplaces/{slug}/user` (invite user to marketplace)
- `PATCH /v2/marketplaces/{slug}/users/{userId}/role` (tenant-level role mutation)
- `DELETE /v2/marketplaces/{slug}/users/{userId}`
- CRUD on `/v2/marketplaces/{slug}/consumers`, `/v2/marketplaces/{slug}/consumers/{id}/connections/{id}`
- `GET /v2/marketplaces/{slug}/consumers/{consumerId}/syncs/{syncId}/issues` and `/issues/{issueId}` (per-tenant sync issue IDOR surface)
- `/v2/consumers/{id}/connections/{id}/revoke`, `/v2/consumers/{id}/connections/{id}/setup-email`, `/v2/consumers/{id}/connections/{id}/upload`, `/v2/consumers/{id}/connections/{id}/postconnections`, `/v2/consumers/{id}/connection-url`, `/v2/consumers/{id}/oauth2`, `/v2/consumers/{id}/oauth2/app`, `/v2/consumers/{id}/oauth2/config`, `/v2/consumers/{id}/transactions`, `/v2/consumers/{id}/transactions/count`, `/v2/consumers/{id}/transactions/latest`, `/v2/consumers/{id}/transaction-stats`, `/v2/consumers/{id}/public-transactions/latest`, `/v2/consumers/{id}/email`, `/v2/consumers/{id}/help/{t}`, `/v2/consumers/{id}/builder-account`
- `/v2/consumers/views/syncs`, `/v2/consumers/views/syncs/health`, `/v2/consumers/views/syncs/stats`, `/v2/consumers/views/unified-api`, `/v2/consumers/views/unified-api/health`, `/v2/consumers/views/unified-api/stats`

Routed + PUBLIC (no auth, returns plain `Not Found` body or data):
- `GET /v2/marketplaces/{slug}` — returns FULL marketplace catalog JSON. Confirmed: `GET /v2/marketplaces/chift` returned 34 KB JSON with marketplaceId `e871e4b8-ab75-4e45-991a-9680c5034abd`, builderAccountName **"Alexis - Test"** (internal test account used for the live `chift` marketplace), builderAccountId `d4ae6daa-e7af-41e1-be20-efab8eb1c917`, builderAccountConfig (demo:false, type:oneApi, allowSyncs, enterprise, premiumFeatures, allowMultiEnvironments, …), accountTheme, logo pointing at `accountslogos.s3.eu-west-3.amazonaws.com/logo_chift.png`. Information disclosure of internal account naming + marketplace builder association.
- `GET /v2/marketplaces/{slug}/apps/{integrationCode}` and `.../apps/{integrationCode}/flows` — slug-scoped public listing (returned `[]` for chift/1).
- `POST /v2/integrations/oauth2/verify` — returns `{"status":"error"}` with empty body, no auth required. OAuth2 verify endpoint reachable unauthed — worth testing for SSRF / state-reuse / open-redirect.

Not routed (Express "Cannot {METHOD} /path"):
- `GET /v2/users`, `/v2/users/me`, `/v2/me` — all 404. The `me` route probably sits at a different mount or needs a specific method.
- `GET/POST /v2/datalayer`, `/v2/mcp`, `/v2/api-keys`, `/v2/api-route-values`, `/v2/partnerships`, `/v2/session/refresh`, `/v2/oauth/login`, `/v2/oauth/login/info`, `/v2/oauth/logout` — 404 on both verbs. Those endpoint names appear in the frontend code; likely they are at a different prefix (SuperTokens may mount `/auth/session/refresh` and `/auth/oauth2/*` under /auth, which indeed exist). `/v2/mcp` is probably a reverse proxy that only accepts a specific method+body.
- `/v2/marketplaces/public-list` returns "Not Found" (routed, no payload).

## Frontend runtime env (chift.app / www.chift.app / marketplaces.chift.app)

`https://chift.app/__ENV.js`:
```
NEXT_PUBLIC_FRONTEND_URL=https://www.chift.app
NEXT_PUBLIC_OAUTH2_REDIRECT_URL=https://chift.app/oauth2/redirect
NEXT_PUBLIC_API_URL=https://backend.chift.app
NEXT_PUBLIC_BACKBONE_API_URL=https://api.chift.eu
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_MARKETPLACE_URL=https://marketplaces.chift.app
NEXT_PUBLIC_PARTNERS_URL=https://partners.chift.app
NEXT_PUBLIC_WILDCARD_URL=.chift.app
NEXT_PUBLIC_POSTHOG_KEY=phc_uRZ6PsAUyjTyKiSHhFSt2NEa5rY5miTme84WDbHHPhe
NEXT_PUBLIC_PYLON_APP_ID=965bf0be-9e3f-41a4-9f52-9dd5fcd1b32d
NEXT_PUBLIC_SENTRY_DSN=https://973b92f7cd446931b0e8b8cdb3e18579@o4507844083974144.ingest.de.sentry.io/4507844243750993
NEXT_PUBLIC_ST_LOGIN_METHODS=google,passwordless
NEXT_PUBLIC_S3_CONNECTOR_ICON_BUCKET_NAME=chift-connector-icon
NEXT_PUBLIC_S3_CONNECTOR_LOGO_BUCKET_NAME=chift-connector-logo
NEXT_PUBLIC_MINTLIFY_TOKEN=mint_dsc_EdpB4LQoj9nfWmCfiL4ioH
REACT_ENV_PREFIX=NEXT_PUBLIC
```
All these are NEXT_PUBLIC_*, i.e. intended to ship to the browser. The PostHog/Sentry/Pylon/Mintlify IDs are public by design per CLAUDE.md known-non-findings.

`https://partners.chift.app/config.js`:
```
window.__CHIFT_CONFIG__ = {backendUrl:"https://backend.chift.app", sessionTokenFrontendDomain:".chift.app", environment:"production"};
```

Session cookies share `.chift.app` across chift.app, www.chift.app, marketplaces.chift.app, partners.chift.app, backend.chift.app, help.chift.app, old-help.chift.app, support.chift.app, test.chift.app. **Any XSS or subdomain takeover under *.chift.app can hijack the SuperTokens session cookie**. This is why old-help.chift.app (Intercom-hosted) and support.chift.app (Pylon-hosted) are worth looking at — third-party content on a cookie-sharing subdomain is a classic lateral attack.

## S3 buckets (first-party)

- `chift-connector-icon.s3.eu-west-3.amazonaws.com` — **ListBucket is PUBLIC**. 166 PNG icons listed (all connector-ID-named). Only PNGs served; no sensitive content. Still, enabling `s3:ListBucket` on an unauthenticated principal is a minor misconfig: it lets anyone enumerate the full connector-id-to-icon mapping (useful for connector enumeration cross-check).
- `chift-connector-logo.s3.eu-west-3.amazonaws.com` — 403 AccessDenied on ListBucket. Good.
- `accountslogos.s3.eu-west-3.amazonaws.com` — 403 AccessDenied on ListBucket. Good. Individual object `logo_chift.png` is publicly readable (expected).

## Known failure modes and gaps

- crt.sh was down (502/429) for both chift.eu and chift.app queries. Needs re-pull next session to be sure no additional subdomains are being missed.
- SSLMate CertSpotter chift.eu quota exceeded for the day. chift.app returned 11 names (all in briefing).
- preprodapi.chift.eu returns proxy 502 and may be VPN-gated.
- internal.chift.app returns 503 awselb/2.0 (no target group attached). Address stays alive; same IPs as backend.chift.app ELB, so Host-header pivot to a backend route is theoretically interesting but 503 says the target group is empty.
- 60+ guessed subdomains (dev, staging, admin, dashboard, auth, grafana, sentry, metrics, prod, portal, ci, vpn, git, graphql, billing, …) all NXDOMAIN.

## Immediate low-hanging exposure (mapping only; no exploitation attempted)

1. `backend.chift.app` version string leaked at `/`: `This is the Chift Backend - 1.87.0`. Pinpoints the backend build for CVE lookup.
2. SuperTokens core connection URL leaked in `/auth/dashboard` HTML: `https://prod-8d408ad197dc11edb887b72d66b729a0-eu-west-1.aws.supertokens.io:3567`. SuperTokens dashboard pinned at `v0.15`.
3. `/auth/oauth/end_session` leaks a Postgres `null violates not-null constraint` stack trace with table name `oauth_logout_challenges` and a live challenge UUID.
4. Public `/v2/marketplaces/{slug}` catalog exposes builder account name `Alexis - Test`, builderAccountId UUID, and builderAccountConfig flags for the production `chift` marketplace. Low-severity info disclosure.
5. `chift-connector-icon` S3 bucket has public ListBucket.
6. api.chift.eu CORS reflects arbitrary Origin with `access-control-allow-credentials: true`. Not directly exploitable today (bearer-only API) but is a spec violation to flag.
7. Public DNS resolves `bridge.chift.app` and `internal-api.chift.eu` to RFC1918 (10.0.185.57 / 10.0.197.35), leaking the internal VPC CIDR and ELB naming convention `chip` + `chipinternalbackboneapilb02`.

## Candidates for exploit phase (ranked)

### P0 — predictable-ID + role / impersonate (highest Claude.md HV-pattern match)
- `POST /v2/users/{userId}/impersonate` body `{accountId}` — impersonation across accounts, gated by SuperTokens session + an IMPERSONATE_USER permission check client-side. Must verify the permission check is enforced server-side with cross-tenant userIds.
- `POST /v2/accounts/{accountId}/sessions` body `{accountId}` — mints an internal session for an account. Second impersonation vector; both are the single highest-impact move if the authz check is weak.
- `PATCH /v2/users/{userId}/role` and `PATCH /v2/marketplaces/{slug}/users/{userId}/role` — classic role-mutation IDOR targets. Test with a self-registered account against a neighbor userId.
- `POST /v2/users/update` — mass-assignment candidate per Claude.md HV pattern; test role / accountId / builderAccountId fields.

### P1 — consumer / marketplace IDOR surface
- Everything under `/v2/consumers/{consumer_id}/...` AND `/v2/marketplaces/{slug}/consumers/{id}/...` on backend.chift.app, and the same under `/consumers/{consumer_id}/...` on api.chift.eu (122 distinct path templates). consumer_id is a UUID (not sequential), so the realistic test is cross-tenant with a known neighbor UUID (e.g. a UUID from the same marketplace builder, which the public `/v2/marketplaces/{slug}` catalog already surfaces).
- `/v2/consumers/search`, `/v2/consumers/csv` — bulk reads; test if marketplace-scoping is enforced vs. account-scoping (frontend sends an account-id filter, server may not enforce it).

### P2 — public endpoints that touch state / auth
- `POST /v2/integrations/oauth2/verify` — unauthed OAuth2 verify endpoint. Classic open-redirect / SSRF / state-reuse surface. Returns `{"status":"error"}` empty; needs payload probe.
- `POST /token` and `POST /mcp-token` on api.chift.eu — no auth and no rate-limit header seen. Credential-stuffing / enumeration surface for Chift partner clientId/clientSecret pairs. accountId is a UUID (hard to guess), but if any error-message delta between "unknown accountId" and "wrong secret for valid accountId" exists, it enables accountId enumeration via timing or body differences.
- `backend.chift.app/auth/oauth/register` — SuperTokens Dynamic Client Registration (publicly advertised in the AS metadata). If DCR is open, anyone can register an OAuth client and go through the MCP OAuth flow unaided.

### P3 — session-cookie boundary
- `sessionTokenFrontendDomain: .chift.app` means a SuperTokens session cookie is attached on every subdomain under chift.app. If old-help.chift.app (Intercom), support.chift.app (Pylon), test.chift.app (if it ever comes back online with content), or any dangling CNAME under *.chift.app can be made to render attacker-controlled JS/HTML (XSS, subdomain-takeover, support-portal customisation), the session cookie moves to the attacker. Scan for dangling CNAMEs on *.chift.app each session.

### P4 — info-disclosure (write-up only)
- Backend version 1.87.0 at `/`, SuperTokens core URL and dashboard version in `/auth/dashboard`, Postgres stack trace on `/auth/oauth/end_session`, builderAccount leak in `/v2/marketplaces/{slug}`, chift-connector-icon ListBucket.

## Top 3 threads (priority)

1. `POST /v2/users/{userId}/impersonate` + `POST /v2/accounts/{accountId}/sessions` — direct impersonation primitives wired into the Chift frontend, named exactly after the IMPERSONATE_USER / CREATE_INTERNAL_SESSION permissions. If the server-side permission check misses a tenant or role gate (or if the body `{accountId}` is trusted without a membership check), a self-registered partner account walks straight into any other account. This is the single highest-blast-radius move in the current surface.
2. `/v2/marketplaces/{slug}/consumers/{consumerId}/...` IDOR cluster — predictable, slug-plus-id addressing of consumers and their connections, syncs, issues, and transactions. Combined with the public `/v2/marketplaces/{slug}` endpoint that leaks a working marketplaceId and a sample consumer naming layout, it is the most likely P1 confirmed IDOR without needing elevated privileges.
3. `POST /v2/integrations/oauth2/verify` unauth OAuth2 verify endpoint — accepts `{accountId, connectionType, envId, params, existingConnection, redirectUrl}` per the Next.js chunk. The `redirectUrl` field on a public verify endpoint is a textbook open-redirect / SSRF primitive (server likely fetches to validate state), and the body shape allows mass-passing of state parameters. Low effort to confirm the shape and status variation, high upside if the redirect is honoured or the fetch is server-side.

