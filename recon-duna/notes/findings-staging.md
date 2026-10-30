# Duna engagement - staging foothold findings

Attempted session acquisition on withduna.com using an operator-authorized disposable
mailbox (mail.tm, address zzzsectest603a6171@maxxspace.com, token discarded post-test).

## F-STG-003 (Info) - Zod validator leaks schema shape on /auth/callback

Hosts: dashboard.withduna.com AND dashboard.duna.com (same code).
CVSS 3.1 AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N. OWASP A05:2021.

Repro:

    GET /auth/callback HTTP/2
    Host: dashboard.withduna.com
    -> HTTP 400 application/json
       {"error":{"code":"invalid_request_error","message":"API request was invalid:
         {code invalid; Invalid input: expected string, received undefined,
          state invalid; Invalid input: expected string, received undefined}"}}

With ?code=bogus the message trims to only the `state` branch. Raw Zod formatter is
surfaced to the client; discloses parameter names (`code`, `state`) and expected types.

Fix: return a generic 400 without the Zod serializer output; log the Zod detail
server-side only.

## Session acquisition - BLOCKED (same as prod)

Both environments run the same WorkOS AuthKit deployment:

- Staging: glorious-sunrise-45-staging.authkit.app, client_id client_01JNR7089KCKBBWK8M46EPJ3SJ.
- Prod: auth.duna.com, client_id client_01JNR708GP08A6X4D265YCSEPD.
- Same chunk hashes, same page-0b65d2b724b50f13.js bundle.

The only exported React Server Action on the sign-in page is `joinWaitlist`:

    createServerReference("401b4def1dfb52aaa4100491cd17e7da92558a5cbb",
                          callServer, void 0, findSourceMapURL, "joinWaitlist")

Successful submit returns `{"status":"created"}` - "You're on the waitlist". No account
is created; no OTP is sent. `GET /sign-up` 404s (the sign-up page bundle is not
deployed). `screen_hint=sign-up` is silently dropped on `/authorize`.

Disposable mailbox did NOT unblock, because the mechanism never issues a verification
email. The two remaining paths to unblock the authenticated-tier tests:

1. Duna provisions two marked test tenants in staging ("ZZZ-SECTEST-DELETE",
   note "authorized security test").
2. Duna's admin generates one `/internal/sign-up/{configurationId}/{hostedSignUpId}`
   invite link and emails it to the operator.

Either unblocks: cross-tenant IDOR tests, dummy_idv KYC-bypass primitive, auth-token
lifecycle checks.

## Hardening delta withduna.com staging vs duna.com prod

Byte-identical posture on every core app host:

| Host (per env) | Delta |
|---|---|
| dashboard | identical: Helmet full set, HSTS, strict CSP nonce+strict-dynamic, COOP/CORP, same connect-src with .withduna.com |
| api | identical: CORS * without credentials, x-powered-by: Express leak on /health |
| connect | identical CSP (Onfido, Maps, CF Turnstile, settings.*) |
| contribute | identical (Onfido, idnow, go.test.idnow.de referenced on BOTH envs; not staging-specific) |
| webhooks | identical: default-src 'none' CSP, only /health reachable, opaque per-provider secret paths |
| events | identical: nginx/1.28.2, CORS * without credentials, auth-gated |
| admin | identical: bare 404 no Server header; not vhost-routed on LB |
| cdn | identical: S3+CloudFront, no .js.map, no .env/BUILD_ID/config, SSE-AES256 |

No weaker surface on staging. No source maps, no feature-flag debug endpoints,
rate-limit 30/window on all app hosts.

Regressions unique to withduna.com are already captured as F-PERI-001 (public Vercel
prototypes), F-PERI-002 (Supabase anon key + RLS), F-PERI-003 (github-app bare Express).

## dummy_idv route code deployed on PROD too (not exploitable without session)

The shared SPA bundle cdn.duna.com/assets/chunks/Router.XjZHkiPv.js is byte-identical
to cdn.withduna.com/assets/chunks/Router.XjZHkiPv.js. The feature-flag constant
`DUMMY_IDV_PROVIDER:'dummy_idv_provider'` is baked into client.MyGDHoDS.js on both
environments. All synthetic-TypeID POSTs to:

    POST /internal/onboardings/{id}/dummy_idv/send_webhook
    POST /internal/contributions/{id}/dummy_idv/{attemptId}/send_webhook
    POST /public/contributions/{id}/idv/{attemptId}/perform_check

hit the CSRF middleware FIRST and return `{"error":{"code":"invalid_csrf_token"}}`
identically on prod, staging, and nonexistent routes. Route existence cannot even be
confirmed from unauth. Per-organization enablement of DUMMY_IDV_PROVIDER is a
server-side flag we cannot see without a session.

Risk statement for the report: the IDV-bypass primitive is CODE-PRESENT in production;
if any organization has DUMMY_IDV_PROVIDER enabled, a session for a contributor to
that organization could mark an IDV check as PASSED without a real identity
verification. Verification requires Duna-provisioned access.
