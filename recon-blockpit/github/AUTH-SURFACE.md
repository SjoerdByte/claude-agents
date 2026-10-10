# app.blockpit.io - Authentication surface map

Session: 2026-10-09. All inputs below come from the production Angular bundle
served at https://app.blockpit.io/ (Netlify-Edge, HTTP/2, server:Netlify) plus
live probes to the backend hosts. Kept in `github/` for parity with the other
`*-SURFACE.md` map files (not creating a `map/` dir to avoid dir churn).

## 1. Hosts in auth surface

| Host | Role | Edge | Reachable from this vantage |
|------|------|------|-----------------------------|
| `app.blockpit.io` | Angular SPA shell (routes /login, /signup, /register, /sign-up, /auth, /forgot-password, /reset-password, /verify-email, /verify-account all SPA-fallback to the shell with HTTP 200 + `server: Netlify`, `x-nf-request-id`). No separate HTML per route, no manifest.json / ngsw.json / robots.txt / sitemap.xml / .well-known shipped - every one of those paths SPA-fallbacks to the shell. | Netlify Edge | yes |
| `cn.blockpit.io/api` | Primary REST auth + user API (`backendUrl` in prod env). Every `/v2/auth/*`, `/v1/users/*`, `/v1/*` call targets this host. | Cloudflare | reachable only via `xvfb-run + Playwright headful` per prior session; curl is 403 Managed-Challenge-HTML at the edge before the app sees the request. |
| `api.blockpit.io` | OAuth2 token root for the SPA's `authConfig.apiRoot` (clientId=7, public clientSecret `yne8cq00xogLg4LcIosYMcBkCWMPcF8cZaZfx15B`). The SPA uses the ROPG grant for its own refresh pipeline. | n/a | 502 Bad Gateway via the egress proxy today - permanently dark from this vantage. |
| `auth.blockpit.io` | Not referenced by the SPA env; checked anyway because of the name. 502 permanently from this vantage (egress-proxy connect_rejected). | n/a | dark |
| `bit-api.blockpit.io` | Partner / internal API host; not touched by the SPA auth code at all. 502 permanently from this vantage. | n/a | dark |
| `cta.blockpit.io/register` | B2B / CTA (CryptoTax Advisor) registration landing. Linked from the SPA env as `ctaRegistrationUrl`. Separate B2B/tenant signup flow. | Cloudflare | not probed in this session |
| `gate.blockpit.io/h` + `/t` | Report generation / helios / tax calculator services; no auth endpoint. | n/a | n/a |
| `cdn.blockpit.io` | Static assets only (images). On the bearer-strip whitelist. | Cloudflare | n/a |

### 1a. OIDC discovery results

| URL | Status | Notes |
|-----|--------|-------|
| `https://app.blockpit.io/.well-known/openid-configuration` | 200 | SPA fallback (returns 29.6 KB index.html, `server: Netlify`) - NOT an OIDC document. |
| `https://cn.blockpit.io/.well-known/openid-configuration` | 403 | Cloudflare managed challenge HTML, not an OIDC document. |
| `https://api.blockpit.io/.well-known/openid-configuration` | 000 / 502 | Egress-proxy `connect_rejected` (host dark from this vantage). |
| `https://auth.blockpit.io/.well-known/openid-configuration` | 000 / 502 | Same, host dark. |
| `https://bit-api.blockpit.io/.well-known/openid-configuration` | 000 / 502 | Same, host dark. |

No standard OpenID-Connect discovery is published. Blockpit runs its own
OAuth2-password-grant on top of `api.blockpit.io/oauth/token` plus a custom
`/v2/auth/*` REST surface on `cn.blockpit.io`. There is no `jwks_uri`,
`authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, or
`registration_endpoint` published via discovery.

## 2. Endpoints table

All endpoints below target the backend host `https://cn.blockpit.io/api`
except where noted. HTTP method, body shape, Turnstile-protection status and
unauth response come from the production bundle (`main-C3DOLOTM.js`,
`chunk-DJtjt4yW.js`); live confirmation on the backend requires the
`xvfb-run + Playwright-headful` harness (CF edge is 403 for curl here).

| URL | Method | Content-Type | Body fields | Turnstile? | Behaviour (unauth) |
|-----|--------|--------------|-------------|------------|---------------------|
| `/v2/auth/register` | POST | application/json | `email, password, hasAcceptedTerms:true, language, [referralPartner, registerUrl, organizationName, memberName, firstPromoterReferral, country, uuid, celloReferral]` | **yes** (server-enforced; missing-token returns `{"error":"reCAPTCHA token is missing..."}` 403) | account created unactivated (needs `/v2/auth/activate`). |
| `/v2/auth/login` | POST | application/json | `email, password, [loginAsEmail]` | **yes** (server-enforced) | returns access+refresh tokens in HTTP-Only cookie + body `{data:{...advisorRole, agentId, advisorId,...}}`. |
| `/v2/auth/activate` | POST | application/json | `{code}` (+ `withCredentials:true`) | no | consumes an email-sent activation code and flips the account to active. Not Turnstile-gated. |
| `/v2/auth/password/reset/request` | POST | application/json | `{email}` | **yes** (server-enforced) | triggers a password-reset email. |
| `/v2/auth/password/reset/validate` | GET | - | `?token=<reset-token>` | no | returns 200 if reset token valid. |
| `/v2/auth/password/reset` | POST | application/json | `{resetToken, password}` | **yes** (server-enforced) | sets a new password. |
| `/v2/auth/password/change` | POST | application/json | `{currentPassword, newPassword, totpToken}` | no (auth required) | changes password for the logged-in user. |
| `/v2/auth/email/change` | POST | application/json | (new email + password per Angular form, exact shape not inlined) | no (auth required) | triggers an email-change confirmation flow. |
| `/v2/auth/email/confirm` | POST | application/json | `{code}` | no | confirms an email change code. |
| `/v2/auth/logout` | POST | application/json | `{}` + `withCredentials:true` | no | revokes refresh cookie. |
| `/v2/auth/refresh` | POST | application/json | `{refreshToken}` + `withCredentials:true` | no | rotates access token. Not Turnstile-gated. |
| `/v2/auth/2fa` | POST | application/json | TOTP setup payload | no (auth required) | sets up TOTP. |
| `/v2/auth/2fa/verify` | POST | application/json | `{token}` + `withCredentials:true` | no | second factor during login. |
| `/v2/auth/handoff` | POST | application/json | server-returns one-time handoff code | **no** | mints a cross-service handoff code. |
| `/v2/auth/handoff/redeem` | POST | application/json | `{code}` + `withCredentials:true` | **no** | redeems a handoff code into a session. |
| `/v2/auth/magicLink/redeem` | POST | application/json | `{code}` + `withCredentials:true` | **no** | redeems a magic-link code into a session (passwordless login). |
| `/v2/auth/sso` | GET | - | `?provider=...&registerUrl=...` (+ `withCredentials:true`) | no | returns OAuth URL for Google / Apple / Coinbase / Bitpanda with a server-issued nonce in `state`. |
| `/v2/auth/sso/redeem` | POST | application/json | `{code}` + `withCredentials:true` | **no** | redeems SSO auth code into a session. |
| `/v1/maintenance` | GET | - | - | no | `{"enabled":false,"databaseDown":false}` unauth. ACAC=true, Vary:Origin. |
| `/v1/users/intercom/auth` | GET | - | - | no (auth required) | returns Intercom HMAC for the current user. |
| `/v1/users` | GET / PATCH / PUT | application/json | mass-assignment candidate - full field list has `advisorRole, agentId, advisorId` | no | see open thread in index.json for mass-assignment test. |

Legacy mirror endpoints also exist on the same host and inherit the same
Turnstile check (verified 2026-10-09): `/api/v1/users/register`,
`/api/v1/users/login`, `/api/v1/users/resetPassword`. No bypass via the
legacy prefix.

## 3. JS-shipped config values of interest

Extracted verbatim from `raw/angular/main-C3DOLOTM.js` (production bundle
v2.69.24, netlifyBuildId `6ac8af6291b4a6000860e3ec`):

```
production:         true
version:            2.69.24
heliosUrl:          https://gate.blockpit.io/h
taxUrl:             https://gate.blockpit.io/t
backendUrl:         https://cn.blockpit.io/api
bpAppUrl:           https://app.blockpit.io
cdnUrl:             https://cdn.blockpit.io/
imageUrl:           https://cdn.blockpit.io/images/
authConfig.clientId:     7
authConfig.clientSecret: yne8cq00xogLg4LcIosYMcBkCWMPcF8cZaZfx15B
authConfig.apiRoot:      https://api.blockpit.io/
googleAnalyticsKey: GTM-M52JVRC
intercomAppId:      qd5t49rj
sentryEnvironment:  production
sentryDsn:          https://d447ed34281db2c7c5709bdd9cf969b1@sentry.blockpit.io/11  (project 11, self-hosted)
sentryTracesSampleRate:        0.1
sentryReplaysOnErrorSampleRate: 0
stripeKey:          pk_live_LJqkanby4gXAb5JfGbBbs2sB
whitelistedUsers:   guineapig@blockpit.io, daniil.rabizo@blockpit.io, blockpitdemo@gmail.com, mail@florianwimmer.at
whitelistedDomainsCors (bearer-strip substrings): cdn.blockpit.io, ct-unified-generated-reports, ct-wiso-generated-reports, fsn1.your-objectstorage.com
platform:           web
app:                bp-app
hasSso:             true
hasConsultationCall:true
ctaRegistrationUrl: https://cta.blockpit.io/register
botProtection:      see section 4.
firstPromoter:      https://cdn.firstpromoter.com/fpr.js  (loaded unconditionally in index.html)
```

Not present in the bundle: Firebase, Supabase, Auth0, Cognito, Okta,
Keycloak, Clerk, SuperTokens, Authentik, Logto, Arkose, Funcaptcha, Geetest.
Confirmed by `grep -c` on the full bundle set in `raw/js-greps/`.

## 4. CAPTCHA presence

Provider: **Cloudflare Turnstile**. Sitekey `0x4AAAAAABjDn7lbXPdrO7So`.
Script `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback`.

Enforced on these endpoints (`protectedEndpoints` list in the prod bundle;
confirmed server-side by prior session - missing-token returns 403
`{"error":"reCAPTCHA token is missing..."}` regardless of host or path):

- `POST /v2/auth/register`
- `POST /v2/auth/login`
- `POST /v2/auth/password/reset/request`
- `POST /v2/auth/password/reset`
- `POST /v1/integrations`
- `POST /v2/integrations`

**Not** Turnstile-gated (per the same prod `protectedEndpoints` list;
important for later testing):

- `POST /v2/auth/activate`
- `POST /v2/auth/magicLink/redeem`
- `POST /v2/auth/handoff` + `POST /v2/auth/handoff/redeem`
- `POST /v2/auth/sso/redeem`
- `POST /v2/auth/password/change`
- `POST /v2/auth/email/change` + `POST /v2/auth/email/confirm`
- `POST /v2/auth/2fa` + `POST /v2/auth/2fa/verify`
- `POST /v2/auth/refresh`
- `POST /v2/auth/logout`

The HTTP interceptor adds the Turnstile token as the request header
`cf-turnstile-response` only for the protected URLs - all other POSTs ship
unmodified. The token is server-side-validated: prior sessions confirmed
that a missing `cf-turnstile-response` on `/v2/auth/*` returns 403 before
the handler runs. The Angular interceptor also treats a mis-named
`recaptcha` branch (legacy code path, `g-recaptcha-response` header) that
is unreachable in the current prod env (botProtection.type is `turnstile`).

Separately, Cloudflare runs a **Managed Challenge** at the CDN edge for
every curl / headless hit against `cn.blockpit.io/*` - this is a
pre-application 403 (`server: cloudflare`, `cf-ray` header, CF
challenge-platform HTML body); it is independent of the per-endpoint
Turnstile check above. Passable only via `xvfb-run -a chromium` headful
per prior session (see index.json ruled_out note + exploit/probe3.js).

## 5. Email-verification requirement (observed)

Register maps to `POST /v2/auth/register {email, password, hasAcceptedTerms, language, ...}`.
Immediately following the register call, the SPA presents the "check your
inbox" view and only accepts a session cookie after the user hits
`POST /v2/auth/activate {code}` (code arrives by email). The Angular
dataService calls `activate(code)` with `withCredentials:true` - this is
where the refresh cookie is minted; **before activation there is no session
cookie**.

Confirmed from the Angular code (`raw/angular/chunk-DJtjt4yW.js`):

```
register(t){return this.authResource.register($v(t))}
activateAccount(t){return this.authResource.activate({code:t},this.refreshTokenStorage.withCredentials)}
```

The register response therefore does NOT return a usable access/refresh
token - the account is unactivated and the session needs the activation
code. Email verification IS enforced on this path from the client
perspective. Whether the server actually enforces that the account be
activated before `/v1/users` etc. accept a bearer token is **UNKNOWN** -
only the authenticated session can test that, and that is deferred to the
pending-decision in index.json (user to self-register + hand over tokens).

Open avenues to still bypass email verification:

- `POST /v2/auth/magicLink/redeem {code}` - mints a session from a code
  without any register-flow precondition. If magic-link codes are
  predictable or short enough to brute-force (no Turnstile), this is a
  signup bypass. Lifetime + entropy unknown.
- `POST /v2/auth/handoff` + `/redeem {code}` - mints a cross-service
  session. Not Turnstile-gated. If a handoff code once minted can be
  redeemed by anyone (no principal binding) then one authenticated user
  can mint tokens for another. Unknown without authed test.
- `POST /v2/auth/sso/redeem {code}` + `GET /v2/auth/sso?provider=...&registerUrl=...` -
  the SSO code round-trip bypasses the custom register + activate path.
  SSO completion creates the account AND the session in one shot, so
  Google / Apple / Coinbase / Bitpanda SSO sign-ups do NOT go through
  email verification. This is normal for SSO; nothing broken yet, but it
  is the shortest path to a usable session without an inbox round-trip.
- `POST /v2/auth/activate {code}` is NOT Turnstile-gated. If activation
  codes are short (6-digit numeric) and no server-side rate-limit exists,
  an attacker who knows a victim's just-registered email could race to
  guess the activation code before the real user hits the link. Unknown
  entropy; worth probing once an authed test harness exists.

## 6. User-enumeration signals

Not probed live from curl this session: every POST to `cn.blockpit.io/api/*`
is bounced at the Cloudflare edge with a 403 Managed-Challenge HTML page
BEFORE the application handler runs. CF never routes the request to the
app, so there is nothing to measure for enumeration from curl alone.

What we CAN say from the code / prior probes:

- The register payload maps `email` with no uniqueness pre-check endpoint
  shipped (no `/v2/auth/email/available` or similar) - so a duplicate email
  surfaces as whatever error `/v2/auth/register` returns. That error-body
  delta is the enumeration vector; needs the Playwright+xvfb harness.
- The `whitelistedUsers` env array leaks four real internal emails
  (CEO's personal `mail@florianwimmer.at` plus `guineapig@blockpit.io`,
  `daniil.rabizo@blockpit.io`, `blockpitdemo@gmail.com`); these can be
  used as the "known-exists" side of any later enumeration delta probe.
- `/v1/integrations/checkIfExists {email, exchangeId}` is a dedicated
  "does this email already have integration X?" endpoint - itself an
  enumeration oracle if accessible unauth; needs test.
- `POST /v2/auth/password/reset/request {email}` is the classic
  enumeration channel - delta of body / status / timing between an
  existing and non-existing email - but it is Turnstile-gated, so timing
  attacks are gated by whatever rate-limit CF enforces.

All three enumeration probes above are DEFERRED to the authed Playwright
harness. Not possible via curl today because of the CF edge challenge.

## 7. Minimum requirements for a real signup

Per the Angular code + env, a successful account-creation call from a
browser is:

```
POST https://cn.blockpit.io/api/v2/auth/register
Host: cn.blockpit.io
Origin: https://app.blockpit.io
Referer: https://app.blockpit.io/register
Content-Type: application/json
cf-turnstile-response: <valid-Turnstile-token-for-sitekey-0x4AAAAAABjDn7lbXPdrO7So>
(plus whatever cookies the CF Managed-Challenge round-trip set)

{"email":"<new>", "password":"<pw>", "hasAcceptedTerms":true, "language":"en",
 "country":"XX", "referralPartner":null, "firstPromoterReferral":"xxxx"}
```

The server response does not yield a usable session - account stays
unactivated until the user hits `POST /v2/auth/activate {code}` with the
code emailed to the registered address.

Therefore the ONLY ways to reach a usable session WITHOUT an email inbox
round-trip, per the code read, are:
1. Complete a Google / Apple / Coinbase / Bitpanda SSO round-trip and let
   `/v2/auth/sso/redeem` mint the session.
2. Possess a valid magic-link `{code}` and hit `/v2/auth/magicLink/redeem`.
3. Possess a valid handoff `{code}` and hit `/v2/auth/handoff/redeem`.
4. Guess a 6-digit `/v2/auth/activate {code}` for a just-registered email
   (no Turnstile; depends on entropy + rate-limit).

Nothing in the code shows a non-SSO path that mints a session on the
register response itself. CAPTCHA is server-side-enforced on signup;
Email verification is client-side-enforced and almost certainly
server-side-enforced too (the refresh cookie is minted ONLY by activate /
login / SSO-redeem / magic-link-redeem / handoff-redeem).

## 8. Live probes performed this session

Probes run (all logged in `raw/signup-probes/`):

- `GET https://app.blockpit.io/{login,signup,register,sign-up,auth,forgot-password,reset-password,verify-email,verify-account,index.html,manifest.json,ngsw.json,ngsw-worker.js,robots.txt,sitemap.xml}` - all 200 SPA fallback (`server: Netlify`, `x-nf-request-id`), content identical to the shell. No PWA / robots / sitemap published.
- `GET https://{app,cn,api,auth,bit-api}.blockpit.io/.well-known/openid-configuration` - app 200 SPA fallback; cn 403 CF-challenge; api/auth/bit-api 502 from the egress proxy.
- `POST https://cn.blockpit.io/api/v2/auth/login` with `{}` and with `{"email":"x","password":"y"}` - both 403 CF-challenge HTML; the application never saw the request.
- `OPTIONS https://cn.blockpit.io/api/v2/auth/register` with normal CORS preflight headers - 403 CF-challenge HTML (so CORS headers from the app are not visible from this vantage).
- `GET https://cn.blockpit.io/api/v1/maintenance` - 403 CF-challenge HTML today (was 200 JSON from the Playwright-headful harness in the prior session; the edge policy excludes automated clients unconditionally).
- `GET https://{api,auth,bit-api}.blockpit.io/` - 502 Bad Gateway from the egress proxy; hosts dark from this vantage.
- `POST https://api.blockpit.io/oauth/token grant_type=password&client_id=7&client_secret=yne8cq00xogLg4LcIosYMcBkCWMPcF8cZaZfx15B&username=recon@example.invalid&password=Placeholder` - egress-proxy `connect_rejected`, no response from Blockpit.
- `GET https://staging--bp-frontend-prod.netlify.app/` - 200, Angular v2 (older build), scripts `runtime.3ee875beb5163c3d.js`, `polyfills.baff2a189316cc08.js`, `main.cc7a55659636b2b9.js`. Shares the same `backendUrl: cn.blockpit.io/api`, so no separate auth surface - staging slug only serves old frontend code against the same CF-gated backend.

## 9. Attack surface summary

- Server-side CAPTCHA (Turnstile) on all four core auth entry points
  (register, login, both password-reset legs). Legacy /v1/users/* mirrors
  inherit the same check (prior session). No in-prod bypass known.
- Email verification required on classical signup path (register ->
  activate(code)). SSO sign-up bypasses the email step but is only
  valuable to the attacker if the attacker owns the SSO identity.
- Non-Turnstile-gated session-minting endpoints to inspect for
  entropy / lifetime issues: `activate`, `magicLink/redeem`,
  `handoff` + `handoff/redeem`, `sso/redeem`. All take `{code}` as the
  entire principal-binding - any weakness in code generation or
  single-use enforcement there would be a real signup bypass.
- OAuth2 ROPG grant with hard-coded `clientSecret:yne8cq00xogLg4LcIosYMcBkCWMPcF8cZaZfx15B`
  (clientId:7) sits behind `api.blockpit.io/oauth/token`. Public client
  secret in a Resource-Owner-Password-Credentials grant is per se not a
  vuln (the client is a SPA and the grant still requires user credentials)
  but it does mean no additional client-side identification is in play on
  that route - if the token endpoint ever accepts a short / predictable
  grant other than `password` (e.g. a `grant_type=refresh_token` with a
  stolen refresh), the SPA's clientSecret adds zero defence. Needs probe
  once `api.blockpit.io` is reachable.
