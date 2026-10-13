# Payflows GitHub surface map

Session: 2026-10-13 OSINT recon via GitHub + related code-hosting / package registries.
Target: payflows.io (Payflows SAS, Paris FR). Written authorization: CEO Pauline Glikman.
Scope: everything under *.payflows.io plus vendor-hosted infra that runs their code / holds their data.

## TL;DR

- Payflows runs a fully private GitHub source footprint. Zero public repos, zero public members, zero commits authored or committed from any `@payflows.io` email on public GitHub (`search_commits author-email:@payflows.io` = 0, `committer-email:@payflows.io` = 0).
- No DockerHub org, no NPM user, no PyPI user, no npm/pypi packages tied to the brand.
- Internal product codenames (Apollo, Vera, Athena, Metis per API Evangelist; plus host-derived luigi, mystix, fawkes, bouncer, intake, counterparty, approval, bnc3) appear nowhere on public GitHub.
- The only reliable GitHub-side signal is the HELD org handle `github.com/payflows` (empty / private) and a smattering of placeholder squatter accounts.
- Infrastructure fingerprint from a thin HTTP pass picks up where GitHub stopped: an S3+CloudFront-backed internal PyPI index (`pypi.payflows.io`), a bank of `luigi-*-ws` WebSocket services, Lambda-fronted docker hosts, SCIM, Unleash feature flags, Storybook under Basic auth.

## Orgs

| Org handle | Status | Notes |
|---|---|---|
| `payflows` | REAL (held, private) | github.com/payflows exists. "This organization has no public repositories." "This organization has no public members." No pinned repos, no bio, no website. All source is kept private. |
| `payflowsio` | 404 | Not registered. |
| `payflows-io` | 404 | Not registered. |
| `payflows-tech`, `payflows-hq`, `payflows-dev`, `payflows-eng` | 403 (API gated) | Direct `gh api orgs/*` was refused by the proxy ("sessions are bound to their configured repositories"). Could not confirm existence from this side. Non-priority. |

Linked registries:
- DockerHub `payflows` user → 404 "User not found". Variants `payflowsio`, `payflows-io`, `payflowsdev`, `payflows-dev`, `payflowsprod`, `payflows-prod` all 404. DockerHub search `q=payflows` → 0 results.
- NPM `~payflows` and variants → 403 at proxy; `registry.npmjs.org/-/v1/search?text=payflows` and `text=payflows.io` both return total=0.
- PyPI user `/user/payflows/` → client-side rendered, inconclusive; direct JSON lookups for `payflows`, `payflows-core`, `payflows-sdk`, `payflows-client`, `luigi-payflows`, `pyflows-io` all 404. `mystix` and `fawkes` exist on PyPI but belong to unrelated authors (Rowan Lindsay / Shawn Shan).

## Repos (public, Payflows-owned)

None confirmed. Zero public repos under `github.com/payflows`. Zero third-party public repos observably forked, templated, or starred by a Payflows account.

Noise filtered out (NOT Payflows):
- `thephpleague/omnipay-payflow`, `paypal/payflow-gateway`, `bkeating/python-payflowpro`, `verbb/commerce-payflow`, `ao-apps/ao-payments-payflowPro`, `strangerstudios/pmpro-payflow-recurring-orders`, and ~400 other "payflow" hits are PayPal Payflow Pro / Payflow Gateway integrations.
- `felipecastrosales/payflow`, `ismaelpedro/pay_flow`, `Kyuorhan/payflow`, `Jhaaziel/PayFlow` — Rocketseat "NLW Together" Flutter tutorial clones.
- `sidrisov/payflow` — unrelated crypto PayFlow.me product on Ethereum L2.
- `karimzakzouk/payflow-api`, `firoz1860/payflow`, `AbrahamC13/PayflowSystem`, `TazkiyaNasirah7/PayFlowAI`, `Ankit2820/payflows` — student / vibe-coded namesakes.
- `quratulainmubeen-eng/Flow` → ships `payflow-infra-live/envs/staging/terraform.tfvars.example` with prefix `payflowstg` on Azure West Europe (`10.43.0.0/16`, AKS, PostgreSQL B_Standard_B1ms). Different company. Not Payflows SAS.
- `KaJota-inc/kajota-hub` → "payflow" is their own internal NIP payment-ops triage agent, not Payflows SAS.
- `api-evangelist/payflows` → a public catalog listing of the Payflows business, not Payflows source. Useful business signal only: products are Apollo (procurement), Vera (vendor + contract), Athena (accounting / AP), Metis (treasury). Backers Balderton Capital, Ribbit Capital. Known public URLs: payflows.io, app.payflows.io, www.payflows.io, www.payflows.io/blog-and-articles, www.payflows.io/integrations, www.payflows.io/about-us, www.payflows.io/careers. No new subdomains, no API endpoints.
- `Fluxym-BBA/rfe.fluxym.com` → French PA factur-x market list, references PAYFLOWS as a candidate platform. Just prose.

## Code dorks

All GitHub code search queries scoped to Payflows SAS specifically. Totals are the whole public GitHub, filtered manually.

| Query | Total hits | Payflows-SAS signal |
|---|---|---|
| `"payflows.io"` | 22 | 0 (all are API catalog, startup DB, French PA list) |
| `"@payflows.io"` | 1 | 0 (Fluxym-BBA patch, prose) |
| `"luigi.payflows.io"` | 0 | 0 |
| `"api.payflows.io"` | 0 | 0 |
| `"pypi.payflows.io"` | 0 | 0 |
| `"luigi-public-ws"` | 0 | 0 |
| `"payflows-prod"` | 0 | 0 |
| `"payflows" "mystix"` | 0 | 0 |
| `"payflows" "fawkes"` | 0 | 0 |
| `"payflows" "VueJS"` | 0 | 0 |
| `"payflows" "AKIA"` | 0 | 0 |
| `"payflows" aws-account-id` | 0 | 0 |
| `"payflows" "terraform"` | 11 | 0 (closest: `quratulainmubeen-eng/Flow`, different company) |
| `"payflows" "lambda"` | 23 | 0 (all unrelated) |
| `"payflows" k8s` | 0 | 0 |
| `"payflows" DATABASE_URL` | 0 | 0 |
| `payflows docker` | 9 | 0 (unrelated) |
| `author-email:@payflows.io` | 0 | 0 |
| `committer-email:@payflows.io` | 0 | 0 |
| PR body `payflows.io` | 0 | 0 |
| Issue body `payflows.io` | 0 | 0 |

Conclusion: **no leaked secrets, hostnames, credentials, cloud IDs, or infra manifests on public GitHub**.

## Employees

| GitHub login | Name | Role | Notes |
|---|---|---|---|
| PayflowsTom | - | likely Payflows employee (brand-prefix handle) | 0 public repos, 0 gists, no profile fields filled in, no org memberships visible |
| payflowsystems-netizen | - | **squatter / unrelated** | 0 repos, 0 gists, auto-generated handle style |
| payflowsservice-beep | - | **squatter / unrelated** | 0 repos, 0 gists, auto-generated handle style |

No commits anywhere on public GitHub were authored or co-authored from `@payflows.io`. Payflows staff push from private accounts into a private org; attribution is intentionally opaque. For public-record employees, LinkedIn is a better source than GitHub.

CEO (name only, for authorship confirmation): Pauline Glikman.

## Gists

Checked for PayflowsTom: "PayflowsTom doesn't have any public gists yet."
Nothing to review.

## GitHub Actions workflows / deployment pipeline

No public repos → no public workflows to inspect. Cannot confirm OIDC trust policies, AWS account IDs, deployment targets, or runner provisioning from GitHub.

Indirect signal from infra fingerprint (see raw/infra-fingerprint.json):
- `payments-prod-docker-lambda.payflows.io` returns 403 → likely Lambda Function URL or API Gateway running a container image out of ECR. Suggests container-based serverless deploys for the `payments` service.
- `luigi-prod-docker-lambda.payflows.io` returns 404 → same pattern, Lambda-hosted, routes locked down.
- `payflows-prod-docker-lambda.payflows.io` tunnel fails (502) → inconclusive, retry later.

## Hostnames discovered via GitHub

Zero. Every hostname mentioned in the API Evangelist catalog is already in `subdomains.txt` (`www.payflows.io`, `app.payflows.io`, `payflows.io`). No new subdomains. See `new-subdomains.txt`.

## Tech stack confirmations

| Known from brief | Confirmed from GitHub? | Confirmed from infra fingerprint? |
|---|---|---|
| VueJS front-end | Not from GitHub | Not probed yet |
| Internal PyPI mirror | Not from GitHub | **Yes** — `pypi.payflows.io` is `server: AmazonS3` behind CloudFront (`via: 1.1 *.cloudfront.net`, `x-amz-cf-pop: IAD61-P11`), returns S3 NoSuchKey XML. Static-index PyPI hosting pattern (upload sdists to S3, serve `simple/<pkg>/index.html`). |
| Docker-Lambda hybrid | Not from GitHub | Three `*-docker-lambda.payflows.io` hostnames exist, matches AWS Lambda container-image deployment. |
| WebSocket services | Not from GitHub | **Yes** — `luigi-ws`, `luigi-api-ws`, `luigi-public-ws`, `luigi-api-public-ws` all respond 426 Upgrade Required. |
| SCIM provisioning | Not from GitHub | **Yes** — `scim.payflows.io` → 403 `application/json`, SCIM endpoint pattern. |
| Unleash feature flags | Not from GitHub | **Yes** — `unleash.payflows.io` → 200 text/html, likely Unleash OSS admin / proxy. `ff.payflows.io` also 200, probably the SDK proxy. |
| Storybook | Not from GitHub | **Yes** — `storybook.payflows.io` → 401 Basic Realm="Login". Credential-stuff candidate but low value; interesting if auth allows design-system leak. |
| Status page | Inconclusive | `status.payflows.io` connect timeout (statuspage.io hosted?); retry. |

## Unexpected vendor usage

Nothing surprising from GitHub (because GitHub leaks nothing). Infra fingerprint adds:
- AWS (S3 + CloudFront + Lambda) — matches brief.
- Unleash OSS (feature flags, self-hosted).
- Basic-auth Storybook.
- Likely statuspage.io for status.

Nothing points to Firebase, Supabase, or Vercel from this pass.

## Known non-findings surfaced

- `pypi.payflows.io` returns S3 `NoSuchKey` XML. This is NOT a finding on its own (misconfigured bucket index). The exposed `x-amz-cf-id` and `RequestId` are standard CloudFront/S3 behavior. Only reportable if combined with bucket-listing or sdist-enumeration.
- Firebase / Google client IDs: none observed, so the Claude.md known-non-findings don't apply here.

## Files

- `github/SURFACE-MAP-GITHUB.md` — this file.
- `github/new-subdomains.txt` — empty (no new subdomains found via GitHub).
- `github/employees.csv` — one row (PayflowsTom unverified candidate), two squatter rows.
- `github/leaked-secrets.md` — none found, documented.
- `github/raw/org-payflows-confirmed.json` — status of org and squatter accounts.
- `github/raw/code-search-summary.json` — every query ran, totals, Payflows-SAS signal.
- `github/raw/package-registries.json` — PyPI / NPM / DockerHub probe results.
- `github/raw/infra-fingerprint.json` — follow-up HTTP fingerprint of the subdomain list, since GitHub produced nothing.

## Top-3 next threads (ranked)

1. `pypi.payflows.io` S3 bucket enumeration — static PyPI index behind CloudFront with S3 origin, 404s expose `x-amz-cf-id` and `RequestId`. If the origin bucket allows public ListObjectsV2 (common when the operators forget to lock down the bucket after pointing CF at it), you can enumerate every internal Python package name and version Payflows ships to their engineers. That maps directly to the full internal service inventory and often reveals private service names, API shapes, and sometimes credentials in `setup.py` / `pyproject.toml`.
2. `luigi-public-ws.payflows.io` / `luigi-api-public-ws.payflows.io` WebSocket services — the two `-public-` variants are the ones meant to be reachable without a VPN, so they are the WS attack surface. Upgrade a WebSocket connection and probe the first few envelopes for authentication model, message types, and whether object IDs are passed in the clear — WS endpoints routinely skip the authorization checks the HTTP side enforces, and these are named `public`, which usually means the author believed they were safe to expose.
3. `scim.payflows.io` SCIM provisioning endpoint — SCIM 2.0 implementations frequently leak `GET /scim/v2/Users` with weak-or-no auth, support `filter=userName sw "a"` enumeration, and surface tenant IDs. A read-only user listing from SCIM is both a high-severity PII exposure (every provisioned employee / customer admin) and a direct feed for the IDOR patterns the rest of the engagement will walk.
