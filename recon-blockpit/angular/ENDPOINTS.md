# API endpoints found in client bundles

Resolved base URLs (`main-C3DOLOTM.js`, `bp-app`):

| var | value |
|---|---|
| `environment.backendUrl` | `https://cn.blockpit.io/api` |
| `environment.heliosUrl`  | `https://gate.blockpit.io/h` |
| `environment.taxUrl`     | `https://gate.blockpit.io/t` |
| `environment.bpAppUrl`   | `https://app.blockpit.io` |
| `environment.cdnUrl`     | `https://cdn.blockpit.io/` |
| `environment.authConfig.apiRoot` | `https://api.blockpit.io/` (OAuth token endpoint — currently proxy-dark) |
| `apiUrlTransactions`     | `${backendUrl}/v1/transactions` |
| `apiUrlTransactionsV2`   | `${backendUrl}/v2/transactions` |
| `taxApiUrl`              | `${taxUrl}` = `https://gate.blockpit.io/t` |
| `integrationApiUrlV1`    | `${backendUrl}/v1/integrations` |
| `integrationApiUrlV2`    | `${backendUrl}/v2/integrations` |
| `blockchainApiUrl`       | `${backendUrl}/v1/blockchains` (fronting cn, NOT `blockchain-api.blockpit.io`) |
| `heliosApiUrl`           | `${heliosUrl}` = `https://gate.blockpit.io/h` |
| `chartUrl`               | `${backendUrl}/v1/chart` |
| `competitorUrl`          | `${backendUrl}/v1/transactions/import/competitor` |
| `currenciesUrl`          | `${backendUrl}/v1/currencies` |
| `exchangeApiUrl`         | `${backendUrl}/v1/exchanges` |
| `twoFaApiUrl`            | `${backendUrl}/v2/auth/2fa` |

In `bp-gov-app` (`gov.blockpit.io`), `environment.backendUrl` = `https://gov-api.blockpit.io/api`.

## Auth / session (cn.blockpit.io/api)

| method | path | module | Turnstile | notes |
|---|---|---|---|---|
| POST | /v2/auth/register | AuthResource | yes | mass-assignment candidate |
| POST | /v2/auth/activate | AuthResource | no | takes `{code}` from register email |
| POST | /v2/auth/login | AuthResource | yes | returns `{accessToken, expiresAt, userId, refreshToken, advisorRole, agentId, advisorId}` |
| POST | /v2/auth/logout | AuthResource | no | token-lifecycle candidate (test refreshToken still redeemable after logout) |
| POST | /v2/auth/2fa/verify | AuthResource | no | — |
| POST | /v2/auth/password/change | AuthResource | no | — |
| POST | /v2/auth/password/reset/request | AuthResource | yes | — |
| POST | /v2/auth/password/reset | AuthResource | yes | — |
| GET  | /v2/auth/password/reset/validate | AuthResource | no | — |
| POST | /v2/auth/email/change | AuthResource | no | — |
| POST | /v2/auth/email/confirm | AuthResource | no | — |
| POST | /v2/auth/handoff | AuthResource | no | **thread**: token-swap, no CAPTCHA |
| POST | /v2/auth/handoff/redeem | AuthResource | no | **thread**: ditto |
| POST | /v2/auth/magicLink/redeem | AuthResource | no | **thread**: token lifecycle (magic link should be single-use) |
| GET  | /v2/auth/sso | AuthResource | no | SSO init — may expose provider list / tenant hints |
| POST | /v2/auth/sso/redeem | AuthResource | no | SSO callback — state/replay candidate |
| POST | /v2/auth/2fa/setup | TwoFaResource | no | — |
| POST | /v2/auth/2fa/enable | TwoFaResource | no | — |
| POST | /v2/auth/2fa/disable | TwoFaResource | no | — |
| GET  | /v2/auth/2fa/status | TwoFaResource | no | — |

## User / profile (cn.blockpit.io/api)

| method | path | notes |
|---|---|---|
| GET  | /v1/users | self (fields TBD) |
| PATCH | /v1/users | **mass-assignment candidate** — try `advisorRole`, `agentId`, `advisorId`, `isAdmin`, `userId`, `tenantId`, `organizationId`, `partner_id` |
| PUT  | /v1/users/delete | account self-delete |
| DELETE | /v1/users/reset | account reset |
| GET  | /v1/users/accointingHistory | legacy data from Accointing merger (acquired brand) |
| GET  | /v1/users/marketing | — |
| PATCH | /v1/users/marketing | — |
| GET  | /v1/users/onboarding | — |
| POST | /v1/users/onboarding | — |
| GET  | /v1/users/taxSettings | — |
| PATCH | /v1/users/taxSettings | — |
| POST | /v1/users/taxSettings/reset | — |
| GET  | /v1/users/organizations | multi-org per user |
| DELETE | /v1/users/organizations/{id} | **predictable-id candidate** |
| PATCH | /v1/users/organizations/{id}/accept | **predictable-id candidate (accept invite via guessed id)** |
| GET  | /v1/users/subscriptions | — (from `chunk-DJtjt4yW.js apiUrl` indirection) |
| GET  | /v1/users/intercom/auth | returns Intercom HMAC — abusing it would let an attacker impersonate chat identity if not scoped |

## Transactions (cn.blockpit.io/api)

| method | path | notes |
|---|---|---|
| POST | /v1/transactions | create |
| DELETE | /v1/transactions | bulk delete |
| PATCH | /v1/transactions/{id} | **predictable-id + mass-assignment** |
| POST | /v1/transactions/{id} | — |
| GET  | /v1/transactions/{id}/costBasis | **predictable-id candidate** |
| GET  | /v1/transactions/{id}/editHistory | **predictable-id candidate** (exposes other users' edit trail?) |
| POST | /v1/transactions/{id}/revertEdit | — |
| GET  | /v1/transactions/{id}/customRates | — |
| PUT  | /v1/transactions/customRates | — |
| PATCH | /v1/transactions/bulkEdit | — |
| POST | /v1/transactions/bulkEdit | — |
| PATCH | /v1/transactions/exclude | — |
| PATCH | /v1/transactions/include | — |
| POST | /v1/transactions/label | — |
| POST | /v1/transactions/link | — |
| POST | /v1/transactions/unlink | — |
| POST | /v1/transactions/reimport | — |
| GET  | /v1/transactions/reimport/{id} | **predictable-id candidate** |
| POST | /v1/transactions/reset | — |
| PATCH | /v1/transactions/reviewMark | — |
| POST | /v1/transactions/import/competitor/store | — |
| POST | /v1/transactions/import/competitor/upload/{exchangeId} | — |
| POST | /v1/transactions/import/government/upload/{governmentIntegrationId} | **predictable-id** |
| POST | /v1/transactions/import/manualBlockchain/store | — |
| POST | /v1/transactions/import/manualBlockchain/upload/{blockchainId} | — |
| POST | /v1/transactions/import/manualExchange/store | — |
| POST | /v1/transactions/import/manualExchange/upload/{exchangeId} | — |
| POST | /v2/transactions/import/upload/{exchangeId} | — |
| **GET** | **/v1/transactions/export?year={YYYY}** | **the SuPuL endpoint — see below** |

### SuPuL endpoint cross-reference

`GET https://cn.blockpit.io/api/v1/transactions/export?year=2025` — observed being
called with `Authorization: Bearer <token>` by `SuPuL/web3balances` scraper.

Unauth probe result (full raw in `raw/api-unauth/cn_export_GET.{head,body}`):

```
GET /api/v1/transactions/export?year=2025 HTTP/2
Host: cn.blockpit.io
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/129.0.0.0 Safari/537.36
Accept: application/json, text/plain, */*
Origin: https://app.blockpit.io
Referer: https://app.blockpit.io/

HTTP/2 403
server: cloudflare
cache-control: private, max-age=0, no-store, no-cache, must-revalidate
content-type: text/html; charset=UTF-8
```

Response body is Cloudflare's `Attention Required!` interstitial. The managed-challenge
engine is blocking at the edge before the Blockpit origin ever sees the request —
we get no 401/400/404 from the origin, so the auth-scheme error-body probe planned
for this endpoint is not reachable without CF bypass (e.g. finding origin IP via
TLS SAN / passive DNS). Logged as thread.

## Integrations / exchanges / blockchains / wallets

| method | path | notes |
|---|---|---|
| POST | /v1/integrations | Turnstile-protected |
| GET  | /v1/integrations/{id} | **predictable-id** |
| PATCH | /v1/integrations/{id} | **predictable-id + mass-assignment** |
| DELETE | /v1/integrations/{id} | **predictable-id** |
| PATCH | /v1/integrations/{id}/activate, /deactivate | — |
| PATCH | /v1/integrations/{id}/favorite | — |
| DELETE | /v1/integrations/{id}/favorite, /removeFromGroup | — |
| POST | /v1/integrations/{id}/sync, /syncMissingTransactions | — |
| POST | /v1/integrations/checkIfExists | **enumeration candidate** (does this exchange+credential pair already exist in system? → account-enum) |
| POST | /v1/integrations/credentials | — |
| GET  | /v1/integrations/counts, /filterList, /syncingStatus | — |
| POST | /v1/integrations/sync, /syncAll | — |
| POST | /v1/integrations/vote | — |
| DELETE | /v1/integrations/vote/{id} | — |
| GET/POST | /v1/integrations/groups | — |
| GET/POST | /v2/integrations | Turnstile-protected |
| PATCH | /v2/integrations/{id} | — |
| GET  | /v1/exchanges/sso | — |
| GET  | /v1/blockchains | — |
| GET  | /v1/blockchains/walletActivity | — |

## Balances / assets / NFTs

| method | path | notes |
|---|---|---|
| GET  | /v1/balances?... | pagination |
| GET  | /v2/balances?... | — |
| GET  | /v3/balances?... | **three versions coexist** → likely dead v1/v2 endpoints still live (common IDOR site) |
| GET  | /v1/balances/overall, /spam?..., /spam/count, /transactionStats, /groups | — |
| POST | /v1/balances/groups | — |
| PATCH/DELETE | /v1/balances/groups/{id} | **predictable-id** |
| DELETE | /v1/balances/groups/removeFromGroup/{id} | — |
| POST | /v1/balances/fixMismatch | — |
| GET  | /v1/balances/fixMismatch/preview?... | — |
| GET/PATCH/DELETE | /v1/balances/nfts/{id}/favorite | **predictable-id** |
| GET/PATCH/DELETE | /v1/balances/nfts/collections/{id}/{favorite\|hide\|unhide} | **predictable-id** |
| GET  | /v1/balances/nfts?..., /nfts/collections?... | — |
| GET  | /v1/assets/search | — |
| GET/PATCH/DELETE | /v1/assets/{id}/favorite | **predictable-id** |
| GET/POST/DELETE | /v1/assets/spam | — |

## Reports / tax (gate.blockpit.io/t)

| method | path | notes |
|---|---|---|
| GET  | /calculated-tax-reports/{year} | — |
| POST | /report/calculate/{id} | **predictable-id** |
| GET  | /report/configuration/{id} | **predictable-id — tax-report config leak candidate** |
| GET  | /report/result/{id}?timestamp={n} | **predictable-id — tax-report result leak** |
| GET  | /report/results/{id} | **predictable-id** |
| GET  | /report/download/{id} | **predictable-id — THIS is the one. Finished tax PDFs** |
| DELETE | /report/{id} | **predictable-id** |
| PATCH | /report/{id} | **predictable-id + mass-assignment** |
| GET  | /performance/harvestable-losses | — |
| POST | /v3/recalculation | — |
| GET  | /v3/recalculation/status | — |
| POST | /v3/tax-optimization | — |
| POST | /v3/tax-optimization/{n}/tranches | — |
| POST | /v3/tax-optimization/assets, /integrations | — |
| GET  | /v3/tax-optimization/summary, /user-assets, /quick-optimizer | — |
| POST | /v3/tax-optimization/simulate-sale | — |

## Source of funds / account health (cn.blockpit.io/api)

| method | path | notes |
|---|---|---|
| GET  | /v1/sourceOfFunds | list |
| DELETE | /v1/sourceOfFunds/{id} | **predictable-id** |
| GET  | /v1/sourceOfFunds/{id}/file?language={lang} | **predictable-id — generated SoF document** |
| POST | /v1/sourceOfFunds/{id}/refresh | — |
| GET  | /v1/sourceOfFunds/blockers/fromPlannedTx, /fromTxId | — |
| GET  | /v1/sourceOfFunds/credits, /refreshStatus | — |
| POST | /v1/sourceOfFunds/fromPlannedTx, /fromTxId | — |
| GET  | /v1/accountHealth | — |
| GET  | /v1/accountHealth/mismatchedBalances?... | — |
| GET  | /v1/accountHealth/transactions?... | — |
| GET  | /v1/accountHealth/transactionLoops?... | — |
| POST | /v1/accountHealth/transactionLoops/unlink | — |

## Shop / billing / Stripe (cn.blockpit.io/api)

| method | path | notes |
|---|---|---|
| GET  | /v1/payments/discount | **discount-code candidate — Claude.md HV pattern** |
| POST | /v1/stripe/billingPortal | — |
| GET  | /v1/stripe/products/addons | from `chunk-DJtjt4yW.js` |
| GET  | /v1/expertService | — |
| POST | /v1/expertService/appointmentLink, /freeConsultationLink | — |
| POST | /v1/expertService/appointment/cancel, /freeConsultation/cancel, /freeConsultation/reject | — |
| GET  | /v1/expertService/appointmentStatus, /freeConsultationStatus, /bpPlus | — |
| GET  | /v1/expertCheck | — |
| GET  | /v1/activity, /activity/{type} | — |
| GET  | /v1/insights | — |
| GET  | /v1/countries | — |
| GET  | /v1/translations/{lang} | — |
| GET  | /v1/currencies/exchangeRate | — |
| GET  | /v1/chart/dashboard, /performance | — |
| GET  | /v1/maintenance | **unauthenticated per interceptor allowlist** |
| GET  | /v1/askai/transactions | AI chat — JWT-scoped to current user, worth checking cross-user leak |

## Helios (gate.blockpit.io/h — portfolio / asset prices)

| method | path |
|---|---|
| GET  | /assets/{assetId}/price |
| GET  | /baskets?type=fiat&limit=1000&sortBy=-usage_count |
| GET  | /wallet-groups |
| GET  | /government-uploads |

## bp-gov-app only (gov.blockpit.io → gov-api.blockpit.io/api)

| method | path | notes |
|---|---|---|
| POST | /v1/members | Turnstile-protected. Body: `{name,email,password,isAdmin}` — **isAdmin is user-settable in the client-side payload** (`createMember` passes `isAdmin: t.isAdmin` straight through). **If server trusts it → full admin takeover of a gov tenant via self-signup.** |
| GET  | /v1/members?... | list members in own tenant |
| PATCH | /v1/members/{id} | **predictable-id** — `editMember` sends `{isAdmin, name}` |
| DELETE | /v1/members/{id} | **predictable-id** |
| POST | /v1/clients | Turnstile-protected |
| GET  | /v1/clients?... | — |
| GET  | /v1/clients/{clientId} | **predictable-id — gov advisor's clients enumeration** |
| PATCH | /v1/clients/{clientId} | — |
| DELETE | /v1/clients/{clientId} | — |
| PATCH | /v1/clients/{clientId}/{sub} | — |
| POST | /v1/clients/{clientId}/resendInvite | — |
| POST | /v1/clients/invite | Turnstile-protected |
| PATCH | /v1/organizations/{id} | **predictable-id** |
| GET  | /v1/data | — |
| POST | /government-uploads (via heliosUrl) | — |
