# Duna engagement - auth layer deep-dive notes

Clinical deep-dive on OIDC, session/cookie attacks, rate-limit shaping, WorkOS
consent/logout, and JWT/token layer. No real OAuth session completed.

## O-AUTHDEEP-001 (hazard; not confirmed Critical without live-login test)

Host: dashboard.duna.com. The Express session middleware does NOT regenerate
connect.sid between visits to /login, /, or /internal/me.

Evidence (three sequential GETs sharing one cookie):

    Visit 1 GET /login
      Set-Cookie: connect.sid=s%3AKwxzYBqZ6EGqgG7nbu9SLlZW37s64A-E.g0HLTzt4w98jhIyIAb5qEAYYHID%2F2s%2F5gNRSdbU5n9k

    Visit 2 GET /login (same cookie replayed)
      Set-Cookie: identical SID re-emitted

    Visit 3 GET /internal/me (same cookie)
      302 /login?originalUrl=%2Finternal%2Fme, same SID re-emitted

Only an unsigned (bad-HMAC) planted cookie is rejected; any valid-HMAC pre-login SID
survives. Combined with F-API-001 (connect.sid missing Secure + SameSite, plantable
on first HTTP visit by an on-path attacker), this is the classic session-fixation
pre-condition.

The verdict (Critical vs informational) depends on whether /auth/callback calls
`req.session.regenerate()` on authentication success. If it does, the attacker's
planted SID is discarded post-login and the hazard is theoretical. If it does not,
an attacker who plants a SID can read the victim's post-login dashboard session.

The code is not reachable via curl without completing a real OAuth code exchange.
Resolution path: one-line source review of /auth/callback by Duna, OR an
operator-assisted single-login test.

Fix regardless: call `req.session.regenerate()` as the first act of the auth
callback handler and apply the F-API-001 Secure+SameSite cookie fix.

## O-OIDC-001 RETRACTED - device_code grant is NOT live for this tenant

The earlier awareness item (findings-residual.md) overstated the risk. Retested with
the real public client_id client_01JNR708GP08A6X4D265YCSEPD:

    POST https://auth.duna.com/oauth2/device_authorization
    client_id=client_01JNR708GP08A6X4D265YCSEPD&scope=openid+email+profile
    -> HTTP 401 WWW-Authenticate: Basic realm="AuthKit"
       {"error":"invalid_client","error_description":"Application not found."}

Identical response to the fake client_id test, and identical shape at /oauth2/token
(all grant types) and /oauth2/introspection. This WorkOS client is an AuthKit
Application (uses /user_management/*), NOT an OAuth 2.0 Application (which the
/oauth2/* endpoints require). The /.well-known/openid-configuration advertises
device_code because the AuthServer supports it in principle, but no OAuth 2.0
Application is enrolled for this tenant.

Also retracted: "redirect_uri enumeration oracle". The /redirect-uri-invalid vs
/bootstrap divergence is just the normal WorkOS error path; the valid redirect_uri is
already disclosed by the public login flow in its Location header. No oracle.

## Attack classes closed with evidence

- OIDC redirect_uri tampering: 16 variants (userinfo@, path-only, path-traversal,
  fragment, double-URL-encode, subdomain, typo-domain, backslash, HTTP downgrade,
  data:, 169.254, localhost, port tricks, other paths) all 302 to
  /redirect-uri-invalid. Strict exact-string match after URL decode.
- response_type confusion: token / id_token / code+id_token+token / none / empty all
  302 to error.workos.com/sso. Only `code` accepted.
- Scope escalation: admin / internal / superuser silently dropped. No error at
  authorize; impossible to prove token mint without completing flow.
- PKCE: AuthKit uses server-side PKCE (hosted callback brokers the code exchange).
  Not a bug.
- Logout open-redirect: dashboard /logout 302 to `/` regardless of parameter name
  (post_logout_redirect_uri, return_to, returnTo, redirect_to, next, url,
  redirectUri all ignored). auth.duna.com has no end_session endpoint (404).
  WorkOS /user_management/sessions/logout ignores return_to.
- CSRF relay on contribute: double-submit works. Cross-session TOKEN+COOKIE pairs
  correctly rejected with invalid_csrf_token. Cookie SameSite=Strict, HttpOnly,
  Secure. Minor naming quirk: cookie is x-csrf-token-contribute, server reads
  header x-csrf-token (not a vulnerability).
- Account enumeration on sign-in: Cloudflare Turnstile gates the sign-in action;
  POST /sign-in with next-action id 401b4def1dfb52aaa4100491cd17e7da92558a5cbb
  returns identical error digest 2539618445 for info@duna.com,
  nobody9999@example.com, and duco@duna.com. Zero byte diff. Direct unauth lookups
  on auth-api.duna.com (user_management/users, authentication_methods,
  passkey/options, magic_auth/send, password_reset/send) are also indistinguishable
  for plausible vs random emails.
- Token endpoint error oracle: 8 variants (authorization_code, refresh_token,
  client_credentials, device_code, password/ROPC, no grant_type, bogus client,
  empty client) all return identical `{"error":"invalid_client","error_description":"Application not found."}`
  with HTTP 401. No divergence to leak public-vs-confidential-client posture, user
  existence, or secret presence.
- /oauth2/userinfo unauth -> 401. /oauth2/introspection -> 401 Missing client_secret.
  Standard.
- JWKS hygiene clean: single current RS256 key kid
  sso_oidc_key_pair_01JNR708F77ZTQKPP6X3Z7BVMK, cert CN=auth.workos.com valid to
  2030-03-07, no orphan test keys. Prod and staging advertise different kids
  (clean separation).
- Rate-limit bypass shaping: inconclusive, not a finding. On api.duna.com /health
  the x-ratelimit-remaining header never visibly decrements in 5-request bursts
  regardless of X-Forwarded-For / X-Real-IP / True-Client-IP / CF-Connecting-IP /
  User-Agent / path-case rotation. Likely per-container bucket (AWS ECS behind LB)
  or sub-second window. The header is informational, not a reliable rate signal.
  On auth-api /user_management/sessions/logout the per-second bucket DOES decrement
  36 -> 0; X-Forwarded-For does not reset it. No bypass proven, no amplification.

## Takeaway

Auth layer is tighter than the first pass suggested. The one new observation
(O-AUTHDEEP-001) is a hazard that becomes Critical only if combined with a missing
session.regenerate() in /auth/callback - which needs source review or an
operator-assisted live test. The earlier device_code awareness item should be
retracted in the report.
