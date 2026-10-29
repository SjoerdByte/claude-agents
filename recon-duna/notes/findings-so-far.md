# Duna engagement - confirmed findings and signals (interim)

Authorized private engagement. Scope: duna.com + subdomains, plus (operator-confirmed)
Duna-owned aliases withduna.com (staging), duna.io (prod alias), viaduna.com (CDN alias).
This file is durability-only; the final report is produced in the report phase.

## Confirmed findings

### F-API-001 (Low) - Session cookie connect.sid missing Secure and SameSite
- Host: dashboard.duna.com (GET /login issues connect.sid, same cookie carries the
  authenticated session after WorkOS login).
- Evidence: Set-Cookie: connect.sid=...; Path=/; Expires=...; HttpOnly  (Secure MISSING,
  SameSite MISSING -> browser-default Lax). HSTS includeSubDomains present on the host.
- Impact: on a first visit before HSTS is cached, an active network attacker could coerce
  the cookie over cleartext HTTP. SameSite absent. HSTS mitigates for returning visitors.
- Fix: session({ cookie: { secure: true, sameSite: 'lax', httpOnly: true } }).
- CVSS ~3.1, OWASP A05:2021.

## Observations / hardening notes (not standalone findings; verify or mention in report)

- perform_check reachable sessionless: POST /public/contributions/{id}/idv/{attemptId}/perform_check
  (contribute) is a state-changing IDV action protected only by CSRF + unguessable random
  TypeIDs, with no demonstrable session-ownership binding (not testable without a real session).
  Recommend binding it to the authenticated contributor session. Not exploitable unauth
  (IDs are 128-bit random, no existence oracle).
- WorkOS OIDC discovery public on auth.duna.com with device_code grant enabled and public
  clients allowed -> device-code-phishing primitive. redirect_uri enumeration oracle on the
  WorkOS authorize endpoint (invalid -> /redirect-uri-invalid, valid -> login).
- idNow TEST env (go.test.idnow.de) referenced in the PRODUCTION contribute app CSP alongside
  prod idNow -> POSSIBLE indication IDV runs partly against a sandbox in prod (KYC integrity).
  NEEDS VERIFICATION (session-gated; being tested on staging).
- Sentry DSNs (public ingest keys) exposed via CSP report-uri on dashboard/connect/contribute
  (org o4508687879372800, EU). Semi-public by design -> Low/Info; event-injection/quota risk.
- Google Maps browser key exposed in connect/contribute runtime config (by design) - verify
  referrer restriction in Duna's GCP console (quota/billing theft if unrestricted). Low/Info.
- events.duna.com discloses nginx/1.28.2 version. Info.

## Ruled out (with evidence)

- Onboarding/contribution cross-tenant IDOR via guess/tamper: NOT possible unauth - server-side
  session validation on every /internal route, identifiers are random 128-bit TypeIDs, no
  existence oracle (401 for well-formed non-existent IDs).
- api.duna.com CORS: ACAO:* WITHOUT allow-credentials -> not exploitable.
- auth-api.duna.com: permissive preflight reflects Origin+credentials, but actual responses
  carry no CORS headers -> not exploitable; bearer-token auth, no ambient cookie.
- WorkOS open redirect: redirect_uri is allowlist-validated.
- Error verbosity: clean (json_invalid / endpoint_does_not_exist), no stack traces.
- Host-header routing to admin/settings: not configured on the public LB (bare 404).
- Exposed OIDC/metrics/swagger/graphql on api: none (only /health public).
- Security headers / CSP on dashboard + auth: strong (nonce+strict-dynamic, frame-ancestors,
  COOP/CORP, HSTS).
- webhooks.duna.com: no guessable routes (opaque per-provider secret paths).
- events.duna.com: requires valid write_key/api_key; no key leaked -> no unauth injection.
- cdn.duna.com S3: no listing, not writable, bucket name not guessable, SSE on, no source maps.
- SPA bundles: no hardcoded secrets, no source maps exposed.
- Self-service authenticated access: not obtainable from this environment (no self-serve signup,
  Cloudflare interactive challenge on WorkOS /sign-up, email OTP, invite-driven org creation).

## In progress

- Active testing of withduna.com staging (session acquisition, hardening delta vs prod,
  cross-tenant IDOR, dummy_idv/test-IDV KYC-bypass) and staging peripherals
  (dashboard-proto/demo on Vercel, github-app host, cdn aliases, duna.io).
