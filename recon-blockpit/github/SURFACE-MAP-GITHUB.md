# Blockpit GitHub surface map

Session: 2026-10-09 OSINT recon via GitHub + related code-hosting platforms.
No live probing of blockpit.io hosts in this session; GitHub-side mapping only.

## Orgs

| Org handle | Status | Notes |
|---|---|---|
| `cryptotax-team` | REAL (legacy) | github.com/cryptotax-team - Blockpit's older brand "CryptoTax.io". 5 public repos, last active 2026-04. Website cryptotax.io. No public members listed. |
| `Blockpit` | IMPERSONATOR (not Blockpit GmbH) | github.com/Blockpit - US location, support@blockpit.com (not .io), 1 fresh repo (2026-09-16) that repackages the open-source `cryptofeed` library as a "Blockpit Crypto Portfolio Tracker" with install via `blockpit.github.io`. Keyword-stuffed README. Treat as squatter / possibly malicious. |
| `blockpitru` | SQUATTER | github.com/blockpitru - empty org, no repos, no members. |
| (no official Blockpit GmbH org) | - | The Austrian company itself has no public GitHub org; current source is kept private. |

Related non-GitHub orgs:
- Docker Hub `blockpit` org (hub.docker.com/u/blockpit) is linked to blockpit.io.

## Repos (public, Blockpit-owned)

Only the legacy `cryptotax-team` org has code we can confirm belongs to Blockpit.

| Repo | Lang | Last push | Stars | Archived | Notable files |
|---|---|---|---|---|---|
| cryptotax-team/cryptotax-api-demo | JavaScript | 2024-01-20 (last push 2020-12-28) | 6 | no | `create_report_demo.js`, `upload_exchnage_file_demo.js`, `.env.template`, sample `Poloniex_deposits.csv`. Documents the `/requestReportCalculation` + `/checkResult` + `/convertTransactions` endpoints of the CryptoTax API (api-docs.cryptotax.io). |
| cryptotax-team/parser-js | JavaScript | 2023-01-28 | 0 | **yes** | Bittrex CSV → CryptoTax.io format parser. 3 commits (2018). |
| cryptotax-team/parser | Jupyter | 2026-04-08 | 0 | no | Coinbase / Bitfinex CSV → CryptoTax.io format parser. 2 commits (2018). |
| cryptotax-team/XChange | Java | 2020-12-21 | - | no (fork) | Fork of knowm/XChange. No apparent Blockpit changes on default branch. |
| cryptotax-team/DeltaBalances.github.io | JavaScript | 2019-03-13 | - | no (fork) | Fork of DeltaBalances to add CryptoTax.io export. rgoeritz commits in 2019. |

Impersonator repo (NOT confirmed Blockpit, but noted for completeness):
- `Blockpit/blockpit-crypto-portfolio-tracker` (Python, 2026-09-16). Downloads a build from a github.io page; avoid.

Third-party / public-interest repos referencing Blockpit (not Blockpit code, but useful signal):
- `SuPuL/web3balances` - uses `https://cn.blockpit.io/api/v1/transactions/export?year=XXXX` with `Authorization: Bearer $BLOCKPIT_BEARER` (undocumented authenticated REST path on cn.blockpit.io).
- `invoice-collector/invoice-collector` - scrapes `https://app.blockpit.io/dashboard` for invoice download; no CAPTCHA field; implies the login/invoice flow is simple-form.
- `rotki/rotki`, `AndyQus/qubic-flow`, `Ah3n0/gm-transaction-overview`, `pneumann1980/portfolia` - Blockpit CSV import/export in third-party tools.
- `marcellkiss/2022-04-27-nx-monorepo` - Angular / NX monorepo example named `blockpit-nx-example` by an Angular trainer / consultant (Marcell Kiss, Hungary). Structure (apps/blockpit-app, libs/report/shell, libs/transaction/feature-overview, libs/design-system/atoms+molecules, Storybook, Jest) likely mirrors Blockpit's real frontend layout from a 2022 consulting engagement. No code secrets, but useful for later targeting of the Angular app.
- `iaserveraims/Astryum-hackathon` - `.env.example` references the Blockpit CryptoTax API (api-docs.cryptotax.io, JWT bearer, `sales@blockpit.io` for access). No key value present.

## Employees (confirmed and candidate)

| GitHub login | Name | Role (if known) | Notable repos | Commit email |
|---|---|---|---|---|
| pascalc23 | Pascal Costa | Backend Developer, Exchange Integrations Team @ Blockpit (Linz AT) | pascalc23/kingscape, pascalc23/API-NG-sample-code (both personal, no Blockpit code) | mail@pascalcosta.com |
| (no gh handle known) | Peter Schoellauf | Validator ops (DAIC Capital, Blockpit) | Co-author in monad-developers/validator-info (2026-02-11), Layr-Labs/eigendata #21 & #77 (2024) | peter.schoellauf@blockpit.io |
| rgoeritz | Robert Goeritzer (Villach AT) | Former CryptoTax API developer | cryptotax-team/cryptotax-api-demo (owner of initial + 4 follow-up commits), idcryptoofficial/idcryptonet.github.io, DeltaBalances/DeltaBalances.github.io | robert.goeritzer@gmail.com |
| TonnTamerlan | Oleksii Kopylov / Alexey Kopylov (UA) | Former CryptoTax contractor (now @SpinAI) | cryptotax-team/cryptotax-api-demo (5 commits 2020), xonixx/spring-web-requests-logging | tonn.tamerlan@gmail.com |
| pushkin-82 | Sergej Putilin | Former CryptoTax contractor | cryptotax-team/cryptotax-api-demo (1 commit 2020-12-24) | s.putilin.82@gmail.com |
| robotdude17 | H Gruschinski | Former early CryptoTax parser author | cryptotax-team/parser (initial commits 2018) | hgruschinski@gmail.com |
| - | Florian Wimmer | CEO & Co-Founder | - | - |
| - | Gerd Karlhuber | CFO / COO & Co-Founder | - | - |
| - | Magnus Berchtold | CPO & Co-Founder | - | - |
| - | Tom Buchsteiner | CTO & Co-Founder | - | - |
| lukasfrank | Lukas Frank (unverified) | Docker Hub pusher 2021-2022 | - | - |
| squeezedlight | SqueezedLight (unverified) | Docker Hub pusher 2021 | - | - |
| florianweinrich | Florian Weinrich (unverified; no GitHub account) | Docker Hub pusher 2019 | - | - |

No commits anywhere were authored from an `@blockpit.io` address through the normal author/email field (search_commits returned 0 hits for both `author-email:@blockpit.io` and `committer-email:@blockpit.io`); the one `peter.schoellauf@blockpit.io` string appears only as a `Co-authored-by` trailer. This strongly implies Blockpit staff push from private accounts in a private org, which keeps attribution unlinked - no systematic DNS cache from commit email auto-reveals.

## Code dorks

| Dork | Hit count | Top repos | Raw file |
|---|---|---|---|
| `"blockpit.io"` (code) | 205 | ccxt/ccxt, SuPuL/web3balances, cbuijs/hagezi, Cosmin1907/crypto-profit-calculator, mrpapawheelie/goose-agentic-token-framework, OriginalityAI/ai-citation-study (SEO citation study, 63 refs) | github/raw/dork-blockpit.io.txt, dork-blockpit.io-p2.txt |
| `"blockpit" password` | 100 | invoice-collector/invoice-collector, rotki/rotki, bitcoinaustria/kassiber, noramark281-lab/Nor | github/raw/dork-password-blockpit.json (notes) |
| `"blockpit" apikey OR api_key OR secret OR token` | 5 | iaserveraims/Astryum-hackathon, JoelRosehill/NeuralHash | - |
| `"blockpit" bearer` | 33 | SuPuL/web3balances, iaserveraims/Astryum-hackathon, dentnet/dashboard-server | - |
| `"api-docs.cryptotax.io" OR "cryptotax.io"` | 2 | cryptotax-team/cryptotax-api-demo, iaserveraims/Astryum-hackathon | - |
| `"blockpit" DATABASE_URL OR mongodb+srv OR "postgres://" OR "mysql://"` | 0 | - | - |
| `"blockpit" SENTRY_DSN` | 0 | - | - |
| `"blockpit" FIREBASE_API_KEY OR firebase.initializeApp` | 0 | - | - |
| `"blockpit" aws_access OR aws_secret OR AKIA` | 0 | - | - |
| `"blockpit" JWT_SECRET OR STRIPE_` | 0 | - | - |
| `"blockpit" supabase OR "supabase.co"` | 0 | - | - |
| `"blockpit" graphql OR schema.graphql` | 0 | - | - |
| `"blockpit" openapi OR swagger.json` | 0 | - | - |
| `"blockpit" id_rsa OR "BEGIN RSA"` | 0 | - | - |
| `"blockpit" filename:.env` | 0 | - | - |
| `"blockpit" filename:config.yml` | 0 | - | - |
| `"blockpit" filename:docker-compose.yml` | 0 | - | - |
| `"blockpit" filename:environment.prod.ts` | 0 | - | - |
| `"blockpit" filename:environment.ts` | 0 | - | - |
| `"blockpit" filename:firebase.json` | 0 | - | - |
| `"blockpit" filename:serviceAccount.json` | 0 | - | - |
| `"blockpit" filename:.npmrc` | 0 | - | - |
| `"blockpit" filename:keystore` | 0 | - | - |
| `"blockpit" filename:application.yml` | 0 | - | - |
| `"api.blockpit.io"` | 0 | - | - |
| each notable subdomain (bit-api/kytapi/cta-api/blockchain-api/financial-api/gov-api/helios/scim/agent/sentry/jenkins/elk-taxengine/exchange-monitoring/bp-aml-utilities/bi/data/mautic .blockpit.io) | 0 each | - | - |
| commits `author-email:@blockpit.io` | 0 | - | - |
| commits `committer-email:@blockpit.io` | 0 | - | - |
| commits `author-email:@blockpit.com` | 0 | - | - |
| commits `author-email:@cryptotax.io` | 0 | - | - |

Full negative-result dork summary: `github/raw/dork-env-blockpit.txt`.

## New subdomains discovered via code

No new `*.blockpit.io` hosts surfaced in code. Every `*.blockpit.io` hostname extracted from the 205 code hits (`app.`, `cdn.`, `cn.`, `help.`, `staging.`, `test.`, `www.`) was already in `subdomains.txt`.

Non-`blockpit.io` hosts that are Blockpit-controlled per the content on them (file: `github/new-subdomains.txt`):
- `cryptotax.io` - Blockpit's legacy brand domain, still active for partner API.
- `api-docs.cryptotax.io` - Blockpit CryptoTax Partner API documentation; same company (Blockpit logo + `sales@blockpit.io` + `support@blockpit.io` on page).

The CryptoTax API documents these endpoints and is likely in-scope under the "vendor-hosted infra running Blockpit code" clause:
- `POST /api/v3/requestReportCalculation`
- `GET  /api/v3/checkResult`
- `GET  /api/v3/assetsByTickers` (up to 1000 tickers / request)
- `GET  /api/v1/transaction_types`
- Deprecated v2 twins slated for removal 2026-12-01.

An additional undocumented authenticated endpoint on an existing subdomain was observed in third-party code: `GET https://cn.blockpit.io/api/v1/transactions/export?year=<YYYY>` (Bearer token). This is on an in-scope subdomain already in `subdomains.txt`, but its REST shape (`/api/v1/transactions/export`) is new information.

## Secrets / config leaks

| Repo | Path | Type | Severity guess | Raw file |
|---|---|---|---|---|
| (none) | - | - | - | - |

No live secrets or config files attributable to Blockpit were found. All API-key / password references in code hits belong to third parties integrating with Blockpit, not Blockpit's own infra. Specifically no AWS keys, no JWT secrets, no Stripe keys, no database URLs, no SSH keys, no Firebase service accounts.

Per CLAUDE.md known-non-findings list: Firebase Web API keys, OAuth client IDs, GCP project IDs would not be filed as findings on their own even if present, and none were encountered here.

## Sister platforms

| Platform | Account | Finding |
|---|---|---|
| Docker Hub | hub.docker.com/u/blockpit | Active org, 3 public images, all internal CI base images (no application source): `blockpit/web` (4 tags, newest 2022-04 `php-74` 275 MB; also `php-74-memcached`, `php-74-dev`, `php-72`), `blockpit/node` (tags 11/12/14/16; newest 2022 Node 16 379 MB), `blockpit/php` (tags `7.4-latest`, `7.4-pgsql-latest`, `8.1-latest`, newest 2022-08). Last push ~2022. Pushers: lukasfrank (most), squeezedlight (1), florianweinrich (oldest). No image tagged with the app itself, only language base layers. |
| npm (public) | npmjs.com/~blockpit | 404 (profile does not exist). `@blockpit` scope empty on npm registry (total 0). |
| PyPI | pypi.org/user/blockpit/ | 403 on direct profile; registry search for `blockpit` returns no official package. |
| Postman public | postman.com/search?q=blockpit | Blocked (bot-detection on WebFetch). Not resolved this session - open thread. |
| SwaggerHub | app.swaggerhub.com | No `blockpit` owner (404). |
| GitHub Gists | gist.github.com | rgoeritz has 1 (forked system-design cheatsheet), pascalc23 has 0, nothing Blockpit-specific. Global gist search for `blockpit.io` surfaces 1 unrelated gist. |

## Tech stack confirmed from code / infra

- Frontend: Angular + NX monorepo. Pattern: apps/`<app>`-app + libs/(design-system/atoms + molecules + organisms) + libs/(transaction, report, user)/(feature-*, shell, data-access). Testing: Jest + Cypress e2e (`blockpit-app-e2e`). Component library: Storybook. Stack inferred from `marcellkiss/2022-04-27-nx-monorepo` which clearly mirrors a real Blockpit project (named `BlockpitNxExample`, `@blockpit-nx-example/*` imports).
- Backend: Node.js + TypeScript + PostgreSQL (from WeAreDevelopers / devjobs.at job listings for Blockpit Senior Backend Developer).
- Legacy / peripheral runtimes (from Docker Hub `blockpit` base images): PHP 7.4 and PHP 8.1 (with PostgreSQL and memcached variants), Node 11-16.
- Observability / tooling (from existing *.blockpit.io subdomains): Sentry (`sentry.blockpit.io`), ELK (`elk-taxengine.blockpit.io`), Jenkins (`jenkins.blockpit.io`), SonarQube (`sonar.blockpit.io`).
- Marketing / CRM: Mautic (`mautic.blockpit.io`), Zendesk (`zendesk4.blockpit.io`), Postmark bounce domains (`pm-bounces.*`).
- CDN / origin split: `cdn.blockpit.io`, `cdn-test.blockpit.io`, plus environment separation (`-staging`, `-test`, `beta`) across almost every service.
- Partner API: `api-docs.cryptotax.io` fronts the "CryptoTax API" (JWT bearer), v3 current and v2 scheduled EOL 2026-12-01.
- No evidence of Firebase, Supabase, or any Google Cloud / Firestore surface on the public side.
