# Angular route tables (unauth-reachable bundles)

## app.blockpit.io (Angular 17+ esbuild, `bp-app`, v2.69.24, Netlify Edge)

Angular SPA. Route table extracted from `main-C3DOLOTM.js` only — all lazy routes are statically
preloaded via `<link rel="modulepreload">` on the index page (chunks are prefetched, not
dynamically loaded with import()), so the bundle set we grabbed covers the entire frontend
without needing authentication.

| path | guard(s) | kind |
|---|---|---|
| `` (root) | — | shell |
| `generate-planned` | — | child |
| `generate-existing` | — | child |
| `integration/add` | — | loadChildren |
| `integration/migration` | — | loadComponent |
| `browser-not-supported` | — | loadComponent |
| `login` | canActivate | loadComponent |
| `sso` | canActivate | loadComponent |
| `start-agent` | — | — |
| `register` | canActivate | loadComponent |
| `404` | — | loadComponent |
| `forgot-password` | canActivate | loadComponent |
| `delete-account-confirmation` | — | loadComponent (unguarded) |
| `reset-password/:token` | canActivate | loadComponent |
| `source-of-funds` | — | loadChildren |
| `reports` | canMatch | loadComponent |
| `unrealized` | canMatch | loadComponent |
| `dashboard` | — | loadComponent (unguarded) |
| `assets` | — | child |
| `depots` | — | child |
| `integrations` | — | child |
| `integrations/:id` | — | child  (predictable-id candidate) |
| `transactions` | canMatch | loadComponent |
| `holding-period` | — | loadComponent |
| `account-health` | — | loadComponent |
| `maintenance` | — | loadComponent |
| `user/settings` | — | loadComponent |
| `user/notifications` | — | loadComponent |
| `user/organizations` | — | loadComponent |
| `user/tax-settings` | — | loadComponent |
| `user/receipts` | — | loadComponent |
| `shop` | — | loadComponent |
| `expert-service` | — | loadComponent |
| `licenses` | canActivate | guard-only |
| `setup` | — | loadComponent |
| `tax-residency` | canMatch | loadComponent |
| `select-path` | canMatch | loadComponent |
| `success` | — | loadComponent |
| `currencies/:id` | — | child (predictable-id candidate) |
| `**` | canMatch | catch-all |

Note on guards: Angular routes that LOAD without a guard still get rejected by the
HTTP-layer auth interceptor (`co` function, in `main-C3DOLOTM.js` — sets
`Authorization: Bearer ${accessToken}` on every outgoing request whose URL does not
match an allowlist: `/auth/refresh`, `/v1/maintenance`, or
`whitelistedDomainsCors` entries). So an unguarded route still produces no useful
unauth data — but it also surfaces client-side logic that can be read without a
session. The `delete-account-confirmation`, `dashboard`, user/* and shop routes
are notably not canActivate-guarded. **`reset-password/:token` is canActivate-guarded
by a signed-out guard, suggesting the token acceptance happens entirely client-side
before the API confirmation call** — the token is in the URL path, so may leak via
Referer / history / server logs.

Lazy module names (loadChildren targets): `integration/add` (child module),
`source-of-funds` (child module). The rest are loadComponent-based (standalone
components), i.e. there is no separate "feature module" artefact.

## gov.blockpit.io (Angular 17+ esbuild, `bp-gov-app`, v2.69.24, Netlify Edge)

| path | notes |
|---|---|
| `clients`, `members` | top-level menu items for gov advisors |
| `clients/:id` | per-client CRUD (predictable-id candidate) |
| `members/:id` | per-member CRUD (predictable-id candidate, isAdmin field) |
| same auth / password / 2fa paths as `bp-app` | — |

## powerhouse.blockpit.io, staging.blockpit.io, gov-staging.blockpit.io, blog-staging.blockpit.io (not probed)

All 200 OK but body is Netlify **Password Protection** gate (3551 B HTML form).
No downloadable bundle until the password is known. Not an unauth attack surface
on its own. The gate is not scope-expanding; move on.

## cn/cn1/exchange/hub/helios/helios-test.blockpit.io

Return Cloudflare "Attention Required" 403 interstitial (5771 B) to automated
requests. No bundle served. These hosts are API backends (not SPAs) sitting
behind Cloudflare WAF / Managed Challenge, except `exchange` and `hub`, which
also appear to be API endpoints with CF in front.

## Dead on probe

Second-attempt NXDOMAIN-style 502 from the agent proxy (confirming Claude.md's
"502 may be NXDOMAIN" note, re-tried once each):
`beta.blockpit.io`, `legacy.blockpit.io`, `agent.blockpit.io`,
`blockpit-new.blockpit.io`, `blockpit-test.blockpit.io`, `cn2.blockpit.io`,
`tokensale.blockpit.io`.

## 3rd-party keys in bundles (filtered against Claude.md known-non-findings)

| key / id | value | is-finding? |
|---|---|---|
| Stripe publishable | `pk_live_LJqkanby4gXAb5JfGbBbs2sB` | **No** (public by design) |
| Google Analytics / GTM | `GTM-M52JVRC` | **No** (public tag id) |
| Intercom appId | `qd5t49rj` | **No** (public app id) |
| Cloudflare Turnstile sitekey | `0x4AAAAAABjDn7lbXPdrO7So` | **No** (public site key by design) |
| Sentry DSN | `https://d447ed34281db2c7c5709bdd9cf969b1@sentry.blockpit.io/11` | **No** (public DSN by design) |
| OAuth2 clientId | `7` | **No alone** (public per Claude.md); but **the clientSecret is also shipped** — see next row |
| OAuth2 clientSecret | `yne8cq00xogLg4LcIosYMcBkCWMPcF8cZaZfx15B` | **Yes, candidate** — a public SPA with a static clientSecret is not a secret. If the backend validates it as proof-of-client-identity for the `apiRoot=https://api.blockpit.io/` token endpoint, impact depends on what else the server trusts to that client identity. Chase next session on `api.blockpit.io` once reachable. |
| Internal whitelistedUsers | `guineapig@blockpit.io, daniil.rabizo@blockpit.io, blockpitdemo@gmail.com, mail@florianwimmer.at` | **Yes, informational** — shipping an internal account allowlist in the production SPA tells attackers which accounts (incl. CEO `mail@florianwimmer.at`) unlock gated features. These are the first accounts to targeted-phish. |
| whitelistedDomainsCors | `cdn.blockpit.io, ct-unified-generated-reports, ct-wiso-generated-reports, fsn1.your-objectstorage.com` | **Yes, informational** — "ct-unified-generated-reports" and "ct-wiso-generated-reports" look like Hetzner object-storage bucket names on `fsn1.your-objectstorage.com`. Enumerating these buckets for public ACL misconfiguration is an unauth tax-report-leak candidate. |
| GitHub Firstpromoter JS | script-src `https://cdn.firstpromoter.com/fpr.js` | **No** (public widget) |

## Feature flags

- No LaunchDarkly / GrowthBook / Unleash / Optimizely / PostHog / Statsig SDK string present.
- The only runtime toggle is `botProtection.isEnabled` (Turnstile on/off) and
  `hiddenMenuItems: []` / `comingSoonExchanges:[140]`. Feature-flag coverage is
  effectively zero — all gating is server-side at the `/v2/*` endpoints.

## Bot-protection coverage (Turnstile)

Cloudflare Turnstile is required (`protectedEndpoints` in env config) on exactly:
- `POST /v2/auth/password/reset/request`
- `POST /v2/auth/password/reset`
- `POST /v2/auth/register`
- `POST /v2/auth/login`
- `POST /v1/integrations`
- `POST /v2/integrations`

Plus on gov.blockpit.io: `POST /v1/members`, `POST /v1/clients`, `POST /v1/clients/invite`.

Everything else (incl. all GETs, `POST /v2/auth/logout`, `POST /v2/auth/handoff`,
`POST /v2/auth/handoff/redeem`, `POST /v2/auth/magicLink/redeem`,
`POST /v2/auth/sso/redeem`, `POST /v2/auth/2fa/verify`, `PATCH /v1/users`, etc.)
is NOT behind Turnstile. Interesting candidates for abuse:
- `POST /v2/auth/handoff` and `/handoff/redeem` — no Turnstile, no visible rate-limit; token-swap vector worth chasing.
- `POST /v2/auth/magicLink/redeem` — no Turnstile, token in body, token lifecycle question.
- `POST /v2/auth/sso/redeem` + `GET /v2/auth/sso` — SSO flow worth validating for state/replay.

## Auth storage / lifecycle

- Access token is a JWT held **in memory only** (Angular `signal(null)`, not localStorage).
- Refresh token is held via a `TokenStorage` service (`_J`) in **localStorage** on web (`platform:'web'`).
- `isLoggedIn` boolean flag held in **localStorage**.
- `userId` persisted in localStorage via `user` object.
- Login response fields include: `accessToken`, `expiresAt`, `userId`, `refreshToken`, and the role / impersonation fields `advisorRole`, `agentId`, `advisorId`. The `isGovAdvisor` computed signal checks `advisorRole==='gov'`.
  - **Mass-assignment candidate**: `PATCH /v1/users` with `advisorRole:"gov"` / `advisorId:1` / `agentId:1` — see ENDPOINTS.md.
- Interceptor `co` sets `Authorization: Bearer ${accessToken}` on every outgoing request whose URL is not in `whitelistedDomainsCors` and not `/auth/refresh` and not `/v1/maintenance`.
- Interceptor refreshes via `POST /v2/auth/refresh` (name derived from `/auth/refresh` substring in interceptor) — token lifecycle probing on logout/password-reset invalidation is a next-session item.
