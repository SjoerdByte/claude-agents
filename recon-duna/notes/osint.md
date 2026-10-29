# Duna (duna.com) — Passive OSINT findings (2026-10-29)

Scope: PASSIVE/OSINT only. No authentication, no use of secrets, no PII exfil.
All items below gathered via public web, unauthenticated HTTP GET (headers/CSP),
and public third-party endpoints (WorkOS JWKS/OIDC discovery).

## COVERAGE GAP (important)
- GitHub code/commit/gist search via API is BLOCKED for this session
  ("sessions are bound to their configured repositories" -> api.github.com/search 403).
  `gh` token is invalid. GitHub MCP tools disconnected.
- grep.app public code search is behind a Vercel JS "Security Checkpoint" -> cannot script.
- searchcode.com API returns 404 (endpoint moved).
- WebSearch did NOT surface any of the unique selectors (client_id, Sentry ids,
  subdomains) in public indexes -> no obviously-indexed public leak, BUT GitHub
  committed-secret surface is effectively UNSEARCHED. Treat as open, not cleared.

## CONFIRMED (verified passively by me)

### 1. WorkOS AuthKit — auth.duna.com (net-new subdomain)
- client_id client_01JNR708GP08A6X4D265YCSEPD CONFIRMED live:
  public JWKS at https://api.workos.com/sso/jwks/<client_id> returns a key
  (kid sso_oidc_key_pair_01JNR708F77ZTQKPP6X3Z7BVMK, RS256, cert CN=auth.workos.com,
  issued 2025-03-07).
- WorkOS authorize with a bad redirect_uri 302s to:
  https://auth.duna.com/redirect-uri-invalid?... -> reveals AuthKit CUSTOM DOMAIN
  = auth.duna.com, and gives a redirect_uri ENUMERATION ORACLE
  (invalid -> /redirect-uri-invalid; valid -> login). Server: cloudflare. Rate limit 60/min.
- auth.duna.com OIDC discovery (public):
  issuer https://auth.duna.com
  authorization_endpoint /oauth2/authorize ; token /oauth2/token ; userinfo /oauth2/userinfo
  introspection /oauth2/introspection ; device_authorization /oauth2/device_authorization
  jwks /oauth2/jwks
  grant_types: authorization_code, client_credentials, refresh_token, device_code
  token_endpoint_auth_methods: none, client_secret_basic, client_secret_post  (public clients allowed)
  scopes: email, offline_access, openid, profile
  -> device_code grant enabled = device-code-phishing primitive (NOT exercised).

### 2. Sentry DSNs (public keys) leaked in public CSP report-uri headers
Org o4508687879372800, EU region (ingest.de.sentry.io). All 3 project ids match brief.
- dashboard.duna.com : 4e044b96...1c86 (full: 4e044b96a3084d5b83be544c2d5def82) / project 4508687905587280
- connect.duna.com   : e92f...1e27 (full: e92fbaa34ea491ecff1dc129c31c1e27) / project 4508687895822416
- contribute.duna.com: d9b3...db92 (full: d9b3bbae9c61f901de99c87f4a39db92) / project 4508687901589584
Risk: event injection / log spoofing / quota exhaustion into Duna's Sentry.
(Sentry DSNs are semi-public by design -> LOW-MED.) NOT exercised (would be an active write).

### 3. Full vendor/architecture map (from public CSP of connect + contribute)
- KYC/IDV vendors: Onfido (api.ca/eu/us/onfido.com, sdk.onfido.com, wss://*.onfido.com)
  AND idNow (frame-src go.idnow.de AND go.test.idnow.de <- a TEST/sandbox idNow env
  referenced from the PRODUCTION contribute app).
- Auth: WorkOS AuthKit (auth.duna.com).
- Observability: Dash0 OpenTelemetry at ingress.eu-west-1.aws.dash0.com (AWS eu-west-1) + Sentry EU.
- Bot mgmt: Cloudflare Turnstile (challenges.cloudflare.com).
- Maps: maps.googleapis.com / places.googleapis.com (matches known public Maps key).
- CDN: cdn.duna.com = AmazonS3 + CloudFront (x-amz-cf-pop IAD89-P4). No open bucket listing at /.
- events.duna.com: nginx/1.28.2 (version disclosed), event-ingest endpoint (GET / -> "missing_event", 400).

### 4. Subdomain / host map (passive GET)
- dashboard.duna.com 302 -> /login   (helmet-style sec headers, ULID request-id req_01...)
- connect.duna.com   302 -> /onboard
- contribute.duna.com 200
- api.duna.com        404 on / (live custom backend, ULID request-id)
- webhooks.duna.com   404 on / (CSP default-src none)
- events.duna.com     400 (nginx 1.28.2)
- cdn.duna.com        200 (S3/CloudFront; served object references https://duna.io/)
- settings.duna.com   proxy 502 = POLICY-DENIED to this session (internal config svc,
                      referenced in every app's connect-src) — reported, not retried.
- docs.duna.com       302 -> /password?redirect=/ (Cloudflare) = password-gated docs (shared pw). Not brute-forced.
- duna.io             301 -> duna.com (alt domain, S3). NET-NEW alt domain.
- withduna.com        proxy 502 (denied/down)
- know.duna.com       reachable (HubSpot per brief)
- ask.duna.com        404 (Tally per brief)
- Also seen in egress relay-failure log (other tooling probed, all policy-denied 502):
  staging.duna.com, internal.duna.com, admin-api.duna.com, api-internal.duna.com, settings.duna.com

### 5. Non-technical / org context
- status.duna.com: incident.io status page; components Onboarding, Dashboard, API; no incidents; Next.js + GCS assets.
- docs.duna.com password-protected (confirmed). API Evangelist profile confirms no public API ref/OpenAPI.
- Possible employee lead (UNVERIFIED): Andrey Romantsev, linkedin.com/in/romancev (surfaced on a Duna-related query). Org-context only.

## UNBLOCK-AUTH ASSESSMENT
- NOTHING found that directly unblocks the invite-only / Cloudflare-gated signup.
- No invite link (dashboard.duna.com/internal/sign-up/{configurationId}/{hostedSignUpId}),
  credential, token, or .env was found leaked in indexed public sources.
- Candidate follow-up leads (separate decision, out of passive scope):
  (a) device_code grant on auth.duna.com (device-code phishing).
  (b) redirect_uri enumeration oracle on WorkOS authorize.
  (c) settings.duna.com config service if reachable without auth (currently policy-denied here).
  (d) GitHub committed-secret search — NOT yet performed (blocked); real gap to close with a working GH search.

## NET-NEW ATTACK SURFACE (added to brief)
auth.duna.com (AuthKit/OIDC), settings.duna.com, cdn.duna.com (S3/CF), duna.io (alt domain),
Dash0 (ingress.eu-west-1.aws.dash0.com), idNow test env ref (go.test.idnow.de), nginx 1.28.2 on events.
