# Vector: q-github-actions results

Session is sandboxed: `get_file_contents`, `add_repo`, repo-scoped API, and unauthenticated raw.githubusercontent.com are all blocked for external repos. Only `mcp__github__search_code` (global search) returns usable snippets.

## Primary query: `"anyday" path:.github/workflows`
8 hits — ALL FALSE POSITIVES for anyday.io target:
- Dennis7456/anyday-backend (anyday-essay.com - essay-writing service, unrelated)
- culas/pickanyday (unrelated personal project)
- Liturgical-Calendar/LiturgicalCalendarFrontend ("liturgyOfAnyDay.php" filename match)

## Query: `"anyday.io" path:.github/workflows`
0 hits.

## Query: `org:anyday-payments path:.github/workflows`
0 hits.

## Query: `org:anyday-io path:.github/workflows`
0 hits.

## Conclusion for q-github-actions vector
The public anyday-related GitHub orgs (`anyday-payments`, `anyday-io`) do NOT publish any GitHub Actions workflow files on public branches. CI/CD config, secret names, deploy targets, and container registries are not reachable via this vector from public GitHub code search.

## Public anyday org repo inventory (from repository search)
### anyday-payments (3 public repos)
- ANYDAY-Magento2 (PHP, master, created 2021-02-22, updated 2022-01-08, 1 open issue)
- ANYDAY-WooCommerce (PHP, master, created 2020-11-18, updated 2021-12-23, 1 open issue)
- ANYDAY-Magento1 (PHP, main, created 2020-12-03, updated 2021-10-25)

### anyday-io (1 public repo)
- website-js-deprecated (JavaScript, main, created 2022-12-21, updated 2026-09-24 — note repo was touched in 2026)

## Non-workflow surface recovered (reported for cross-vector pollination)
- https://my.anyday.io/api/ — base API
- https://my.anyday.io/api/v1/authentication/login — auth endpoint
- https://my.anyday.io/api/v1/orders — order creation
- https://my.anyday.io/api/v1/orders/{id}/capture — capture
- https://my.anyday.io/api/v1/orders/{id}/refund — refund (IDOR candidate)
- https://my.anyday.io/api/v1/internal/categories — "internal" prefix exposed via public JS
- https://my.anyday.io/api/v1/internal/categories/{categoryId}
- https://my.anyday.io/api/v2/internal/shops
- https://my.anyday.io/webshopPriceTag/anyday-price-tag-{en|da}-es2015.js
- CSP whitelist entry `*.anyday.io` declared in Magento2 etc/csp_whitelist.xml

## Known tech signals
- Backend accepts REST under /api/v1/ and /api/v2/
- Public price widget shipped as ES2015 bundle
- The /internal/ URL prefix segments reachable from unauthenticated webshop JS
- No .NET / Hangfire source hits for anyday org on public GitHub (hangfire.services.internal.anyday.io exists per scope but no public code refs)
- No Angular artifacts in public anyday orgs
