# Netlify pivot - .netlify.app slug / branch-deploy enumeration

Session scope: 8 Netlify-locked pre-prod Blockpit hosts (401 "Password Protection"
page from Netlify), plus 3 production Netlify hosts (200) kept as baseline for
build-metadata comparison.

## 1. Lock-bypass summary (headline)

**Password lock is NOT bypassed on any of the 8 pre-prod custom-domain hosts.**
Netlify enforces site-password at the SLUG level, not just the custom-domain
layer, so hitting the underlying `<slug>.netlify.app` returns the same 401 as
the custom-domain. The classic Netlify misconfig (slug served open while custom
domain is password-protected) does not apply to this account.

Verified by direct GET on all 8 slugs + GET on 13 common SPA asset paths
(`/robots.txt`, `/favicon.ico`, `/manifest.webmanifest`, `/ngsw.json`,
`/assets/env.json`, `/version.json`, `/.well-known/security.txt`, `/404.html`,
`/200.html`, …) - all 401 at 8296 bytes (the Netlify password-prompt page).

**However** two branch deploys on PRODUCTION slugs serve full Angular bundles
UNAUTHED - see §3.

## 2. Slug mapping (DNS CNAME chain via Google DoH)

All 11 blockpit.io Netlify hosts resolve to a `bp-*` slug deterministically.
No slug-guessing was needed. CNAMEs captured in `raw/cname-doh.txt`.

| Custom domain                      | HTTP (edge) | .netlify.app slug             | HTTP (slug)             | Lock bypassed? |
|------------------------------------|-------------|-------------------------------|-------------------------|----------------|
| powerhouse.blockpit.io             | 401         | bp-powerhouse                 | 401 (same password lock)| no             |
| staging.blockpit.io                | 401         | bp-frontend-staging           | 401                     | no             |
| cta-staging.blockpit.io            | 401         | bp-cta-frontend-staging       | 401                     | no             |
| gov-test.blockpit.io               | 401         | bp-gov-frontend-test          | 401                     | no             |
| test.blockpit.io                   | 401         | bp-frontend-test              | 401                     | no             |
| cta-test.blockpit.io               | 401         | bp-cta-frontend-test          | 401                     | no             |
| powerhouse-test.blockpit.io        | 401         | bp-powerhouse-test            | 401                     | no             |
| gov-staging.blockpit.io            | 401         | bp-gov-frontend-staging       | 401                     | no             |
| app.blockpit.io (baseline)         | 200         | bp-frontend-prod              | 200                     | n/a (already open) |
| gov.blockpit.io (baseline)         | 200         | bp-gov-frontend-prod          | 200                     | n/a            |
| cta.blockpit.io (baseline)         | 200         | bp-cta-frontend-prod          | 200                     | n/a            |

Note: the task briefing listed "blockpit-staging.blockpit.io" and
"blockpit-test.blockpit.io" - neither is in the HTTP-probe TSV. The actual
corresponding hosts are `staging.blockpit.io` and `test.blockpit.io`.

## 3. Branch-deploy pivot (THE REAL FINDING)

For every slug, probed `<branch>--<slug>.netlify.app` with branches
`main master develop dev staging test prod production release qa uat`
(matrix: 11 slugs x 11 branches = 121 probes, in `branch-matrix.tsv`).

Non-404 results:

| Branch URL                                            | Status | Size   | Served                                       |
|-------------------------------------------------------|--------|--------|----------------------------------------------|
| master--bp-powerhouse.netlify.app                     | 401    | 8296   | password lock (same as root)                 |
| staging--bp-frontend-staging.netlify.app              | 401    | 8296   | password lock                                |
| staging--bp-cta-frontend-staging.netlify.app          | 401    | 8296   | password lock                                |
| staging--bp-gov-frontend-test.netlify.app             | 401    | 8296   | password lock                                |
| staging--bp-frontend-test.netlify.app                 | 401    | 8296   | password lock                                |
| staging--bp-cta-frontend-test.netlify.app             | 401    | 8296   | password lock                                |
| staging--bp-powerhouse-test.netlify.app               | 401    | 8296   | password lock                                |
| staging--bp-gov-frontend-staging.netlify.app          | 401    | 8296   | password lock                                |
| master--bp-frontend-prod.netlify.app                  | 200    | 29638  | current prod (identical to bp-frontend-prod) |
| **staging--bp-frontend-prod.netlify.app**             | **200**| 11345  | **old Angular 2.17.1 unauthed**              |
| master--bp-gov-frontend-prod.netlify.app              | 200    | 29404  | current prod gov                             |
| **staging--bp-gov-frontend-prod.netlify.app**         | **200**| 12238  | **older Angular 2.60.5 unauthed**            |
| master--bp-cta-frontend-prod.netlify.app              | 200    | 29353  | current prod cta                             |
| staging--bp-cta-frontend-prod.netlify.app             | 404    | -      | branch does not exist                        |

Deploy-preview sparse enum (`deploy-preview-{1,10,50,100,200}--<slug>.netlify.app`)
across all 11 slugs: all 404. See `deploy-preview-matrix.tsv`.

**Only two interesting branch deploys found.** Both live on PRODUCTION slugs,
which have no password protection, so the branch deploys ride on the same open
posture. Both serve a snapshot of an older build that is NOT what the current
custom domain serves.

### 3a. `staging--bp-frontend-prod.netlify.app` (Angular v2.17.1)

- Monolithic Angular build (not NX / Vite - older). `main.cc7a55659636b2b9.js`
  is 2.0 MB. No source map served (SPA fallback to index.html on .map requests).
- No `sourceMappingURL=` comment in the bundle tail - source maps were stripped.
- Env object leaked at bundle offset ~ (see `intel/env-blobs.txt`):
  - `version: 2.17.1`
  - `backendUrl: https://api.blockpit.io`
  - `backendUrlV2: https://cn.blockpit.io/api`
  - `apiUrl: https://api.blockpit.io/v1`
  - `authConfig.clientId: 7, authConfig.clientSecret: yne8cq00xogLg4LcIosYMcBkCWMPcF8cZaZfx15B`
  - `stripeKey: pk_live_LJqkanby4gXAb5JfGbBbs2sB`
  - `whitelistedUsers: [guineapig@blockpit.io, blockpitdemo@gmail.com, mail@florianwimmer.at]`
  - `sentryDsn: https://64805c8298ce41f19c767652c91c6c6a@sentry.blockpit.io/18`
  - `ctaUrl: https://agent.blockpit.io`
  - `googleAnalyticsKey: GTM-M52JVRC`
  - `celloProductId: app.blockpit.io`
- **All of these values are IDENTICAL to the Angular agent's extract from
  app.blockpit.io prod bundle** (verified by grep in `raw/angular/main-C3DOLOTM.js`).
  So this older staging snapshot does not leak anything the Angular agent did
  not already have. No net-new secret.
- Endpoint-pathstring diff vs prod: minimal; the only non-prod-visible paths
  are legacy `/v1/users/login`, `/v1/users/register`, `/v1/users/resetPassword`,
  `/v2/latest/cello` - all of which may or may not still be live on cn.blockpit.io.

### 3b. `staging--bp-gov-frontend-prod.netlify.app` (Angular v2.60.5 of bp-gov-app)

- Same build shape, `main.0b52bc33f170eacf.js` is 2.3 MB. No source map served.
- Env object leaked:
  - `version: 2.60.5` (prod gov is 2.69.24)
  - `backendUrl: https://cn.blockpit.io/api` (prod gov uses `https://gov-api.blockpit.io/api`)
  - `app: bp-gov-app`
  - `sentryDsn: https://d447ed34281db2c7c5709bdd9cf969b1@sentry.blockpit.io/11`
  - `netlifyBuildId: 69dc94ede439882efd207ed2`
  - `botProtection.siteKey: 0x4AAAAAABjDn7lbXPdrO7So` (Turnstile - public)
  - `whitelistedDomainsCors: [cdn.blockpit.io, ct-unified-generated-reports, ct-wiso-generated-reports, fsn1.your-objectstorage.com]`
  - `protectedEndpoints`: lists `/v1/users/resetPassword` + `/v1/users/register` +
    `/v1/users/login` + `/v1/integrations` + `/v2/integrations` +
    `/cta/v1/members` + `/cta/v1/clients` + `/cta/v1/clients/invite`.
    Prod gov's list has the same endpoints under the NEW `/v2/auth/*` naming.
- **Endpoint-pathstring diff vs angular/ENDPOINTS.md (bp-gov-app prod):**
  the staging snapshot ships a /cta/v1/* surface routed through `cn.blockpit.io/api`
  rather than the `/v1/*` cta-api.blockpit.io shape the current prod uses.
  See `netlify/new-endpoints.txt` for the full list.

## 4. New endpoints added to recon surface

New (NOT already in angular/ENDPOINTS.md) - full list in `new-endpoints.txt`:

- `cn.blockpit.io/api/cta/v1/members`      POST (Turnstile-protected in staging config)
- `cn.blockpit.io/api/cta/v1/clients`      POST (Turnstile-protected)
- `cn.blockpit.io/api/cta/v1/clients/invite` POST (Turnstile-protected)
- `cn.blockpit.io/api/cta/v1/data`         method unknown
- `cn.blockpit.io/api/cta/v1/organizations` method unknown
- `cn.blockpit.io/api/v1/magicLink/{token}` legacy v1 magic-link
- `cn.blockpit.io/api/v0/api`              (unexplained /v0 appears in bundle)
- `cn.blockpit.io/api/v2/sso`              SSO root
- `cn.blockpit.io/api/v3/recalculation` + `/v3/recalculation/status`
- `cn.blockpit.io/api/v1/sourceOfFunds/fromTxId` + `/sourceOfFunds/refreshStatus` +
  `/sourceOfFunds/blockers/fromTxId` + `/sourceOfFunds/blockers/fromPlannedTx` +
  `/sourceOfFunds/fromPlannedTx`
- Legacy auth paths potentially still live (prod migrated to /v2/auth/*):
  `/v1/users/login`, `/v1/users/register`, `/v1/users/resetPassword`,
  `/v1/users/accointingHistory` (Accointing-import carryover - interesting),
  `/v1/users/intercom/auth`, `/v1/users/licenses`, `/v1/users/subscriptions`,
  `/v1/users/taxSettings`, `/v1/users/taxSettings/reset`, `/v1/users/delete`,
  `/v1/users/changeEmail`, `/v1/users/changePassword`, `/v1/users/2fa`,
  `/v1/users/reset`

Live-probe status (unauth GET from recon host) on cn.blockpit.io:
all return 403 Cloudflare managed challenge, identical body/size. Cannot
distinguish 404 (gone) from 403-challenge (alive) at the edge. Needs origin
IP OR authenticated session.

## 5. New hostnames added to recon surface

None net-new. 11 `bp-*.netlify.app` slugs added as the vendor-infra hostnames
behind the custom domains (full list in `new-hostnames.txt`).

## 6. Pre-prod secrets / 3rd-party keys discovered

- **`authConfig.clientSecret: yne8cq00xogLg4LcIosYMcBkCWMPcF8cZaZfx15B`** -
  already known from the Angular agent's prod extract (`raw/angular/main-C3DOLOTM.js`).
  Not net-new. Still worth noting the same OAuth2 client secret is shipped in
  BOTH prod and the old 2.17.1 staging snapshot.
- **`stripeKey: pk_live_LJqkanby4gXAb5JfGbBbs2sB`** - already known. Stripe
  publishable key by design.
- **`sentryDsn ...@sentry.blockpit.io/18`** (bp-app) and `.../11` (bp-gov-app) -
  already known. Sentry DSNs are publishable by design.
- **`whitelistedUsers: [guineapig@blockpit.io, blockpitdemo@gmail.com, mail@florianwimmer.at]`** -
  already known from Angular prod extract. Internal account emails; targeted-phish
  list value only.
- **`botProtection.siteKey: 0x4AAAAAABjDn7lbXPdrO7So`** - Turnstile site key,
  public by design.
- No net-new API keys, Firebase/Supabase config, LaunchDarkly/GrowthBook/Unleash
  SDKs. The two staging-branch bundles do not add any secret the Angular agent
  did not already have from app.blockpit.io prod.

## 7. Source maps

**None found.**

- All 8 locked-slug password-pages are 8296-byte Netlify prompt pages - no
  bundle served to find a `sourceMappingURL=` in.
- The 2 open staging-branch bundles (`staging--bp-frontend-prod`,
  `staging--bp-gov-frontend-prod`) and the 3 open prod bundles
  (`bp-frontend-prod`, `bp-gov-frontend-prod`, `bp-cta-frontend-prod`) all have
  the `//# sourceMappingURL=` comment stripped. Fetching `*.js.map` returns
  the SPA fallback index.html (sizes 11345, 12238, 29638, 29404, 29353 -
  identical to each slug's root HTML).
- `/assets/env.json`, `/environment.json`, `/config.json`, `/version.json`,
  `/ngsw.json`, `/assets/i18n/en.json` all fall through to SPA index on all 5
  open deploys. No static JSON config leak.

## 8. Next-session threads (netlify-specific, not duplicating OpenAPI/Angular threads)

### N1. Live-probe the legacy `/v1/users/*` auth surface on cn.blockpit.io

Current prod gov/cta use `/v2/auth/*`. The 2.60.5 staging snapshot still ships
`/v1/users/login`, `/v1/users/register`, `/v1/users/resetPassword`,
`/v1/users/intercom/auth`, `/v1/users/accointingHistory`. If the server still
accepts the legacy paths, they may have WEAKER protections (no Turnstile - the
prod `protectedEndpoints` list only names the `/v2/auth/*` form). Needs the
cn.blockpit.io origin IP OR an auth session (both are gated right now by the
cn.blockpit.io CF 403 wall - same open-thread as elsewhere in index.json).

Repro once origin reachable:
```
curl -i -X POST https://<cn-origin-ip>/api/v1/users/login \
  -H "Host: cn.blockpit.io" -H "Content-Type: application/json" \
  -d '{"email":"x@x","password":"x"}'
```
Expected informative outcomes: 400/422 (route alive, body-shape wrong) vs 404
(route gone). If alive, re-probe without Turnstile headers and compare rate-limit
behavior to the /v2/auth/login path.

### N2. Live-probe the `/cta/v1/*` tenant-admin endpoints on cn.blockpit.io

`/cta/v1/members` POST, `/cta/v1/clients` POST, `/cta/v1/clients/invite` POST,
`/cta/v1/data`, `/cta/v1/organizations` - CTA tax-advisor backoffice surface.
Mass-assignment-candidates (role/isAdmin pattern already proven in
angular/ENDPOINTS.md for `/v1/members`). Needs auth session; test whether
POST body accepts `isAdmin`, `advisorRole`, `tenantId`, `organizationId`
fields a client should not control.

Repro skeleton (needs valid cta/advisor token):
```
curl -i -X POST https://cn.blockpit.io/api/cta/v1/clients \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"email":"neighbor@test","isAdmin":true,"organizationId":"<neighbor-org>"}'
```

### N3. Re-check for a published `-prod` or `-dev` branch deploy

Powerhouse slugs (`bp-powerhouse`, `bp-powerhouse-test`) ARE password-locked on
the `master` branch too (confirmed - `master--bp-powerhouse.netlify.app` → 401
same 8296-byte page). That means Netlify "Protect same scope as the production
URL for Branch deploys" is enabled on powerhouse. But the two bp-*-prod slugs
have the `staging` branch EXCLUDED from the password scope - that is the
misconfig we got lucky with here. Worth revisiting these 11 slugs in ~2 weeks
with a wider branch wordlist (feature/*, release/*, hotfix/*, demo, uat2,
sandbox, poc, next, beta) in case developers push a feature-branch to a
*-prod slug and it ships unauthed.

Repro:
```
for s in bp-frontend-prod bp-gov-frontend-prod bp-cta-frontend-prod \
         bp-frontend-staging bp-frontend-test bp-gov-frontend-staging \
         bp-gov-frontend-test bp-cta-frontend-staging bp-cta-frontend-test \
         bp-powerhouse bp-powerhouse-test; do
  for b in feature-$(date +%Y%m) release-$(date +%Y%m) hotfix demo uat2 sandbox poc next beta; do
    curl -sS -o /dev/null -w "%{http_code} ${b}--${s}\n" "https://${b}--${s}.netlify.app/"
  done
done
```

## 9. Deliverables (files written this session)

```
netlify/
  NETLIFY-PIVOT.md                             (this file)
  slug-guesses.txt                             (slug-discovery record)
  slug-probe.txt                               (per-slug GET status + headers)
  branch-matrix.tsv                            (slug x branch -> status)
  deploy-preview-matrix.tsv                    (slug x preview-N -> status)
  asset-env-probe.tsv                          (per-slug env-path probe results)
  asset-probe.tsv                              (per-slug common-SPA-asset probes)
  new-endpoints.txt                            (new endpoints vs angular/ENDPOINTS.md)
  new-hostnames.txt                            (netlify.app slug list + branch-deploy hosts)
  netlify-api-sites.txt                        (Netlify public API lookups - 401 Access Denied)
  raw/
    cname-doh.txt                              (Google DoH CNAME chain for all 11 hosts)
    <slug>/root-headers.txt                    (per slug + per branch-deploy)
    <slug>/root-body.html                      (per slug + per branch-deploy)
  bundles/
    staging--bp-frontend-prod/*.js, *.css      (2.17.1 Angular build + assets)
    staging--bp-gov-frontend-prod/*.js, *.css  (2.60.5 Angular build + assets)
    bp-gov-frontend-prod/main-6I5V2PU2.js      (2.69.24 current prod gov, for diff)
    bp-cta-frontend-prod/main-MACCBA7K.js      (2.69.24 current prod cta, for diff)
    bp-frontend-prod/main-C3DOLOTM.js          (2.69.24 current prod frontend - duplicate of raw/angular/)
  intel/
    env-blobs.txt                              (balanced-brace env object extract per bundle)
    hosts-staging-frontend.txt
    hosts-staging-gov.txt
    endpoints-stage-fe.txt
    endpoints-stage-gov.txt
    endpoints-prod-fe.txt
    endpoints-prod-gov.txt
```
