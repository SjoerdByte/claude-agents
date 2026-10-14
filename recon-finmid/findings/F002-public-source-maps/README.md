# F002 - Public JavaScript source maps on platform.finmid.com and wamo.finmid.com leak full first-party TypeScript source, internal URLs, and backend API shape

- **Severity:** P3 / Medium (information disclosure)
- **CVSS 3.1:** 5.3 Medium — `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N`
- **OWASP:** A05:2021 — Security Misconfiguration (production bundles shipped with `sourcesContent` enabled and `.map` file publicly served)
- **Affected endpoints:**
  - `GET https://platform.finmid.com/assets/index-C1IItZL0.js.map` (1.97 MB, 821 TypeScript sources with `sourcesContent`)
  - `GET https://wamo.finmid.com/assets/index-C02z4SAG.js.map` (2.2 MB, financing-offer SPA sources)
- **Impact:** Full first-party TypeScript source for the distributor-admin SPA and the merchant-financing SPA is served to any unauthenticated internet client. Downstream effects:
  - Full RTK Query service bodies for every internal backend route the SPAs call (capital/*, members/*, webhooks/*, api-keys/*, distributor/*, buyers/*, sellers/*, payment-requests/*, analytics-dashboard, publicSignup). Backend attack surface effectively goes from unknown to fully enumerated.
  - Schema reveals that `GET /api/webhooks` responds with `{url, authUsername, authPassword, signatureSecret}` in plaintext — i.e. the webhook list endpoint returns the HMAC signing secret and basic-auth creds; this materially raises the impact of any IDOR on that endpoint from "see webhook target URLs" to "clone webhook creds and spoof events to partner systems".
  - Deep-link auth logic (`isDeepLinkAvailable` plus `turnkey*` fields in Capital settings) exposes that merchant-impersonation deep links exist (`/api/capital/merchants/{internalBusinessId}/get-link`) and documents when they are allowed.
  - Internal JIRA ticket IDs (e.g. `PAY-6345`) leak in comments.
  - The whole publicSignup state-machine (`/signup/status`, `/signup/profile`, `/signup/create-phone-challenge`, `/signup/verify-phone-challenge`, `/signup/password`) and its token-param binding is reconstructable byte-for-byte without a login.

## Proof-of-concept

```
curl -sI https://platform.finmid.com/assets/index-C1IItZL0.js.map   # 200 OK, 1.97 MB
curl -sI https://wamo.finmid.com/assets/index-C02z4SAG.js.map        # 200 OK, 2.2 MB
curl -s  https://wamo.finmid.com/assets/index-C02z4SAG.js.map | head -c 200
# -> {"version":3,"mappings":";;;;...   <- live source map, confirmed 2026-10-14
```

Request/response pair:

```
GET /assets/index-C02z4SAG.js.map HTTP/2
Host: wamo.finmid.com

HTTP/2 200
content-type: binary/octet-stream
content-length: ~2200000
server: CloudFront

{"version":3,"mappings":";;;;AAAA,SAASA,KAAO,CAAC...
"sources":["../../../libs/tbl-webapps/.../publicSignupService.ts", ...]
"sourcesContent": ["import { publicLiveGatewayService } from '../publicLiveGatewayService'; ..."]
```

Confirmed live 2026-10-14 via WebFetch; the body starts with the sourcemap JSON prefix as shown. The source-map parse that reconstructed 821 TS files was performed in Phase 1 recon and is cached at `/home/user/claude-agents/recon-finmid/raw/bodies/src-*.txt` and `/home/user/claude-agents/recon-finmid/raw/bodies/*index*.js.map`.

## Catalogue of what the maps leak

Inventoried in `evidence.txt` and in `/home/user/claude-agents/recon-finmid/raw/bodies/src-*.txt`:

- `src-publicSignup.txt` — the whole no-auth 5-step signup state machine on `gateway.finmid.com/signup/*` (status / profile / create-phone-challenge / verify-phone-challenge / password), parameter names, body shapes.
- `src-webhooks.txt` — `{url, authUsername, authPassword, signatureSecret}` schema; GET/POST/PATCH/DELETE routes on `api/webhooks[/{id}]`.
- `src-apiKeys.txt` — `/api/api-keys` CRUD with prefix-indexed delete.
- `src-capitalService.txt` — 15 Capital endpoints incl. `/api/capital/merchants/{internalBusinessId}/get-link` (merchant impersonation deep link), `/api/capital/merchants/csv` (bulk CSV), `/api/capital/merchants/get-links` (bulk), `/api/capital/merchants/generate-offer`, `/api/capital/offer-groups/{offerGroupId}/offers`.
- `src-membersService.txt` — `/api/members`, `/api/members/{userId}/second-factor-method` (shape used by the MFA-reset flow).
- `src-buyersService.txt` / `src-sellersService.txt` — 15 buyer + 10 seller endpoints incl. `/api/buyers/{externalId}/exists`, `/api/buyers/{externalId}/limit-increase`, `/api/buyers/documents/upload`, `/api/sellers/{externalId}/exists`.
- `src-prService.txt` — 25 payment-request endpoints incl. `/api/payment-requests/invoiceNumber/exists`, `/api/payment-requests/{id}/payouts`, `/api/payment-requests/documents/upload`, `/api/payment-requests/calculator/fee-override`.
- `src-distributor.txt` — `/api/distributor[/{featureFlag}|/currencies|/attributes|/balance|/lock]`.
- `src-analytics.txt` — `/api/analytics-dashboard` (Metabase iframe-URL fetcher — ties F001 to this bundle).
- `wamo-endpoints.txt` — the full `/payables-financing/public/v1/v2/v3/*` payables-financing surface on `gateway.finmid.com`.

### Secret scan

Grepped both maps for AWS/GCP/Stripe/JWT/HMAC/token patterns (`AKIA`, `AIza`, `xox[baprs]`, `sk_live_`, `sk_test_`, `pk_live_`, `SG\.`, `ya29\.`, `-----BEGIN`). **No hard-coded live secrets were found in the source maps themselves.** The maps' confidentiality cost is architectural: the full backend API surface, including request/response schemas for high-value resources (webhooks, merchant deep links, api-keys), goes from obscurity-protected to fully documented. This is the pre-condition the whole Phase 2 exploit plan now depends on; without it the recon could not have found Thread #1 (publicSignup), Thread #4 (webhooks IDOR), Thread #6 (buyer/seller /exists oracle), Thread #9 (payables-financing/public/*).

The only secret-shaped strings in the two public bundles are the already-public frontend values (Sentry DSN, PostHog project keys, Google OIDC client ID) — those are tracked in the CLAUDE.md known-non-findings list and are not re-reported here.

## Remediation

1. Stop shipping `.map` files for production bundles, or at minimum stop including `sourcesContent`. Vite config: set `build.sourcemap=false` for production, or use `hidden` + upload maps only to Sentry.
2. Serve `.map` files only to allow-listed Sentry/CloudFront-signed URLs; return 403 from CloudFront for public requests.
3. Review the `/api/webhooks` response schema — returning `authPassword` and `signatureSecret` in a list response is risky even to authenticated users; redact these in list responses and only reveal them on explicit per-id read, with audit logging.
