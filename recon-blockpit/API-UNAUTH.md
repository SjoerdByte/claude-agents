# API unauth map

All probes GET/HEAD/OPTIONS only. Dates/raw bodies in `raw/api-unauth/`.

## Per-host summary

| host | base reachable? | server | docs URL | GraphQL | notable live paths | CORS summary | auth scheme (observed) | rate_limit |
|---|---|---|---|---|---|---|---|---|
| `cn.blockpit.io` | yes (via CF edge) | cloudflare (origin masked) | n/a (every path 403 CF managed challenge) | n/a | all /api/\* paths blocked at edge | ACAO not set at edge (CF intercepts preflight too) | JWT Bearer (per Angular interceptor + SuPuL evidence) | n/a (not reaching origin) |
| `cta-api.blockpit.io` | yes (via CF edge) | cloudflare | n/a — all 403 | n/a | all 403 CF | n/a | n/a | n/a |
| `gov-api.blockpit.io` | yes (via CF edge) | cloudflare | n/a — all 403 | n/a | all 403 CF | n/a | n/a | n/a |
| `blockchain-api.blockpit.io` | **yes, origin direct** | **Kestrel (ASP.NET Core)** | **`/swagger/index.html` → `/swagger/v1/swagger.json` (1.1 MB, 641 endpoints)** | no (checked `/graphql`, `/graphiql`, `/playground` → 404) | `/api/{Chain}/*` for 66 chains + `/api/General/*` | `ACAO: *, ACAH: authorization, content-type`, no `Allow-Credentials` | **`?apiKey=` query string** (field is on 640/641 endpoints; 400 "The apiKey field is required." without it) | `api-supported-versions: 1, 2` header; no `X-RateLimit-*` or `Retry-After` observed |
| `financial-api.blockpit.io` | **yes, origin direct** | **Kestrel** | **`/swagger/index.html` → `/swagger/v1/swagger.json` (1.1 MB)** — byte-identical to blockchain-api | no | identical surface to blockchain-api (same spec, same version) | same ACAO:\* | same `?apiKey=` | same |
| `api.blockpit.io` | **no (502 twice)** | — | — | — | — | — | OAuth2 endpoint per Angular env (`authConfig.apiRoot`) | — |
| `api-staging.blockpit.io` | no (502 twice) | — | — | — | — | — | — | — |
| `api-test.blockpit.io` | no (502 twice) | — | — | — | — | — | — | — |
| `bit-api.blockpit.io` | no (502 twice) | — | — | — | — | — | — | — |
| `bit-api-test.blockpit.io` | no (502 twice) | — | — | — | — | — | — | — |
| `kytapi.blockpit.io` | no (502 twice) | — | — | — | — | — | — | — |
| `test.kytapi.blockpit.io` | no (502 twice) | — | — | — | — | — | — | — |

Interpretation: the proxy returns 502 on first contact to the hosts above after
a retry per Claude.md guidance, which usually means NXDOMAIN/not currently
publicly resolvable. These bit-api / kytapi / api / staging / test API hosts are
all **currently dark from an outside vantage**. Not evidence they are offline —
they may be internal-only or VPN-gated. Keep as thread.

## OpenAPI collections found (unauth)

### blockchain-api.blockpit.io/swagger/v1/swagger.json (= financial-api, same bytes)

- Title: "Blockpit Blockchain Utility API"
- Contact: `mail@blockpit.io`, `https://blockpit.io/`
- Version: `v1` (app binary advertises both v1 and v2 via `api-supported-versions`)
- 641 operations across 66 blockchain tags: Akash, AlephZero, Algorand, Arbitrum,
  ArbitrumNova, Avalanche, Base, BinanceChain, BinanceSmartChain, Bitcoin,
  BitcoinCash, Blast, Cardano, Celestia, Cosmos, Cronos, CryptoOrg, Dash,
  DefiKingdomChain, Defichain, Dogecoin, Elrond, Eos, Ethereum, EthereumClassic,
  EthereumPow, Evmos, EvmosEvm, Fantom, General, Gnosis, Harmony, Hedera, Iota,
  Juno, Klaytn, Kujira, Kusama, Litecoin, Meter, Metis, MiscellaneousUtxo,
  Moonbeam, Near, Optimism, Osmosis, Polkadot, Polygon, PolygonZkEvm, Radix,
  Ripple, Scroll, Shimmer, ShimmerEvm, Solana, SolanaV2, Stellar, Stride, Terra,
  TerraClassic, Tezos, Tron, Vara, VeChain, Velas, ZkSync.
- Operations per chain follow a stable shape:
  `IsValidImportAccount`, `GetAccountBalances[Detailed]`, `GetTransactions[ByPage]`,
  `GetTokenDetails`, `MaxCrawlableHeight`, `DeconstructTransaction`,
  `HasTransactions`, `GetFirstActiveHeight`, `GetBalanceByAddress[es]`,
  `GetAddressesBy{X,Y,Z}PubKey`, `GetBalanceBy{X,Y,Z}PubKey`,
  `GetTransactionsBy{Address,XPubKey,YPubKey,ZPubKey,Addresses}`,
  `AddressIsPaperwallet`, `GetBlockConfirmationThreshold`, `GetNativeBalance`,
  `GetAccountBalancesWithNfts`.
- Auth scheme: not declared in `securityDefinitions`/`securitySchemes`; every data
  endpoint has an **`apiKey` query parameter** declared `x-nullable:true` but
  server enforces as required (400 "The apiKey field is required.").
- Unauth-reachable endpoint: `GET /api/General/Version` returns
  `{"status":true,"message":"ok","height":null,"version":"2.0.9028.21725",...}` —
  version info leak only (public-ish). All other endpoints 400 without `apiKey`.
- Also unauth-reachable but useless: `/swagger-ui.css`, `/swagger-ui-bundle.js`
  (the UI assets), `/swagger/v1/swagger.json` itself.

### Not found anywhere (checked and absent)

`/openapi.json`, `/openapi.yaml`, `/swagger.yaml`, `/docs`, `/api/docs`,
`/api-docs`, `/redoc`, `/v2/api-docs`, `/v3/api-docs`, `/actuator*`, `/q/openapi`,
`/q/dev`, `/q/swagger-ui`, `/graphql`, `/graphiql`, `/playground`, `/health`,
`/healthz`, `/readiness`, `/liveness`, `/metrics`, `/prometheus`, `/ping`,
`/status`, `/info`, `/version`, `/build`, `/debug`, `/env` on any of the
reachable hosts.

## Cross-tenant / IDOR candidates (unauth-discovered path patterns taking an ID)

Each of these takes an id in the path or query. All require auth, but once a
session is in hand the first thing to try is numeric sequential / neighbor id
guessing on each.

- `/v1/users/organizations/{id}` (DELETE, PATCH `/accept`)
- `/v1/transactions/{id}` (PATCH/POST, `/costBasis`, `/editHistory`, `/revertEdit`, `/customRates`)
- `/v1/transactions/export?year=YYYY` — year is the id (per-user scope assumed, verify)
- `/v1/integrations/{id}` (all verbs)
- `/v1/integrations/{id}/sync`, `/syncMissingTransactions`
- `/v1/balances/groups/{id}`, `/removeFromGroup/{id}`
- `/v1/balances/nfts/{id}/favorite`, `/collections/{id}/{favorite,hide,unhide}`
- `/v1/assets/{id}/favorite`
- `/v1/sourceOfFunds/{id}`, `/{id}/file?language=`, `/{id}/refresh`
- `/report/{id}` (DELETE, PATCH), `/report/calculate/{id}`,
  `/report/configuration/{id}`, `/report/result/{id}`, `/report/results/{id}`,
  `/report/download/{id}` (gate.blockpit.io/t)
- `/v1/transactions/import/government/upload/{governmentIntegrationId}` — gov session
- `/v1/transactions/import/manualBlockchain/upload/{blockchainId}` — small set
- `/v1/transactions/import/manualExchange/upload/{exchangeId}`,
  `/v2/transactions/import/upload/{exchangeId}`,
  `/v1/transactions/import/competitor/upload/{exchangeId}`
- `/v1/activity/{type}` — enum-only
- `/v1/translations/{lang}` — enum-only
- `/assets/{assetId}/price` (gate.blockpit.io/h) — public-ish?
- `bp-gov-app`: `/v1/members/{id}`, `/v1/clients/{clientId}`,
  `/v1/clients/{clientId}/{sub}`, `/v1/clients/{clientId}/resendInvite`,
  `/v1/organizations/{id}`.

## Discovered endpoints by category

### auth
`POST /v2/auth/{register,activate,login,logout,password/change,password/reset/request,
password/reset,email/change,email/confirm,handoff,handoff/redeem,magicLink/redeem,
sso/redeem,2fa/verify}`,
`GET /v2/auth/{password/reset/validate,sso}`,
`POST /v2/auth/2fa/{setup,enable,disable}`,
`GET /v2/auth/2fa/status`. Likely also `POST /v2/auth/refresh` (interceptor substring match).

### user
`GET/PATCH /v1/users`, `PUT /v1/users/delete`, `DELETE /v1/users/reset`,
`GET /v1/users/{accointingHistory,marketing,onboarding,taxSettings,organizations,
subscriptions,intercom/auth}`, `PATCH /v1/users/{marketing,taxSettings}`,
`POST /v1/users/{onboarding,taxSettings/reset}`,
`DELETE /v1/users/organizations/{id}`, `PATCH /v1/users/organizations/{id}/accept`.

### transaction
See the Transactions table in ENDPOINTS.md — ~28 operations under
`/v1/transactions/*` + 1 under `/v2/transactions/*`.

### report / tax
See Reports / tax table — 16 operations under `gate.blockpit.io/t` plus
`/v1/sourceOfFunds/*` (10 ops) and `/v1/accountHealth/*` (5 ops) on cn.

### portfolio / balances / assets
`GET /v{1,2,3}/balances*`, `/v1/balances/{overall,spam?,spam/count,groups,groups/{id},
transactionStats,fixMismatch/preview,nfts?,nfts/collections?,nfts/{id}/favorite,
nfts/collections/{id}/{favorite,hide,unhide}}`,
`POST /v1/balances/{fixMismatch,groups}`,
`PATCH /v1/balances/groups/{groupId}`,
`DELETE /v1/balances/groups/{id}`,
`GET/POST/DELETE/PATCH /v1/assets/{id}/favorite`,
`GET/POST/DELETE /v1/assets/spam`,
`GET /v1/assets/search`,
`GET /assets/{assetId}/price` and `/baskets`, `/wallet-groups` on gate.blockpit.io/h.

### kyc / aml
Not surfaced in client bundles. Likely lives on the (currently dark)
`kytapi.blockpit.io` or `bit-api.blockpit.io` hosts, or inside gov-advisor flows.

### admin (gov tenant)
`POST/GET/PATCH/DELETE /v1/members`, `POST /v1/clients`, `POST /v1/clients/invite`,
`GET/PATCH/DELETE /v1/clients/{clientId}`, `POST /v1/clients/{clientId}/resendInvite`,
`PATCH /v1/organizations/{id}`, `GET /v1/data`. All on gov-api.blockpit.io/api.

### webhook / scim
No `/webhooks` / `/scim/*` / `/oauth2/*` paths found in client bundles.
`scim.blockpit.io` is a known subdomain but is not referenced by any client bundle —
it is an SSO endpoint for enterprise customers, not the user-facing SPA. Separate
thread.

### oauth
`https://api.blockpit.io/` is declared as `authConfig.apiRoot` with
`clientId: 7, clientSecret: yne8cq00xogLg4LcIosYMcBkCWMPcF8cZaZfx15B` baked into
the SPA. Host is currently 502-dark. Separate thread.

### graphql
None found on any reachable host.

## CORS misconfigs worth testing next session

- **`blockchain-api.blockpit.io` + `financial-api.blockpit.io`**: `ACAO: *` with
  `Access-Control-Allow-Headers: authorization,content-type`. No
  `Allow-Credentials: true`, so cookies can't ride, but **any browser origin can
  make `authorization`-header-bearing XHR** to these. Since auth is `?apiKey=`
  in the query, a victim-shared URL (link spoofing) can trigger
  attacker-controlled queries from any origin. Combined with the lack of
  `Allow-Credentials`, the practical impact is limited unless a trial / public
  apiKey is handed out to users via the SPA — chase whether `?apiKey=` is ever
  exposed in frontend code or Postman docs.
- **`cn.blockpit.io`**: preflight dies at CF — the real app CORS policy is not
  observable without CF bypass. Candidate for origin IP discovery via SAN /
  passive DNS to see the real Kestrel app's `Access-Control-Allow-Origin`
  config (per Angular `whitelistedDomainsCors` list, server likely emits a
  reflective origin for anything matching that allowlist).

## Rate-limit headers observed
None (no `X-RateLimit-*`, no `Retry-After`, no `RateLimit-*`) on any 2xx or
403/404 response from the reachable Kestrel hosts. CF edge may be the rate-limit
layer for cn/cta-api/gov-api.
