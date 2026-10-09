# blockchain-api / financial-api  OpenAPI Attack Map

Offline swagger analysis. No live probing performed in this task.

Source specs:
- `raw/swagger/blockchain-api.json` (host `blockchain-api.blockpit.io`)
- `raw/swagger/financial-api.json`  (host `financial-api.blockpit.io`)

Spec = Swagger 2.0 (not OpenAPI 3), NSwag v13.13.2 from .NET / Kestrel. Root keys: `swagger, info, host, schemes, produces, paths, definitions, x-generator`. Zero `securityDefinitions`, zero root `security`, zero per-operation `security`. The spec declares `schemes:["http"]` even though served over https — spec-authoring drift, not an auth hole.

TL;DR: this is a stateless on-chain-data gateway. 66 blockchain tags × a small repeated catalog of GET-only lookups. No user IDs, no tenant scoping, no body-taking verbs, no admin endpoints, no PII. The real risk vectors are (a) a single endpoint that is spec-declared as apiKey-less, (b) six endpoints that lack a 401 response declaration (hint: no apiKey enforcement path at runtime), (c) xpub/ypub/zpub handling that de-anonymises whole wallets from a single key, and (d) response schemas that leak internal `kyt_txdb_id` / `kyt_contract_id` / `blockchain_id` / `currency_id` integer IDs — IDOR seeds for the sibling cn.blockpit.io / bit-api services.

## 1. Executive summary

Both specs are byte-identical in `paths` and `definitions`. Only the `host` differs. All counts apply to each host.

| Metric                                       | Count |
|---                                            |---:|
| Total operations                             | 641 |
| Methods used                                 | GET only (0 POST / PUT / PATCH / DELETE) |
| Unique operation types                       | 51 |
| Blockchain tags                              | 66 |
| Operations missing `apiKey` param (unauth-reachable per spec) | 1 (`/api/General/Version`) |
| Operations missing 401 response declaration  | 6 Elrond+Hedera + 1 General/Version = 7 |
| Classical IDOR candidates (`{id}` / `{userId}` / `{*Id}` path params) | 0 |
| Mass-assignment candidates (body-taking)     | 0 |
| PII-exposing responses (strict)              | 0 — no email / name / dob / tax-id / phone anywhere in `definitions` |
| On-chain-data responses (wallet addr, tx hash, token metadata) | 231 |
| Admin / internal / debug endpoints           | 0 |
| Destructive verbs                            | 0 |
| Discount / coupon / promo / voucher endpoints| 0 |
| Auth-flow endpoints (login / signup / reset / 2fa) | 0 |
| xpub / ypub / zpub handling (wallet-privacy) | 34 |
| Batch endpoints (addresses / contractAddresses arrays) | 32 |
| Free-form object fields (`additionalProperties`/empty-object) | 3 (`ResponseModelOfObject.result`, `ResponseModelOfObject2.result`, `TaxToolToken.details`) |
| x-* vendor extensions                        | only `x-generator` (NSwag toolinfo); no `x-tenant-id`, no `x-internal`, etc. |

Spec-authoring smells:
- Hedera `IsValidImportAccount` param description uses the Elrond `erd1...` regex. Copy-paste from Elrond. Suggests Hedera-chain validation was wired on the Elrond handler — worth testing whether the Hedera address path actually validates.
- `schemes:["http"]` in a production spec — spec-level only; served TLS.
- Operation IDs follow `<Chain>_<Op>` consistently; 100% of operations use `GET` with query-string params even for payloads that would normally be a POST body (e.g. `GetErc20BalancesByBodyJArray` is a GET despite the name — likely large query-string per address list).

## 2. Top 20 single endpoints to probe first

Scoring: `(no apiKey param ? +100) + (no 401 declared ? +80) + (xpub/ypub/zpub ? +60) + (DeconstructTransaction ? +40) + (batch addresses ? +15) + (unbounded crawl ? +10) + (multichain lookup ? +20) + (tx/token-metadata response ? +15)`. Both hosts: run every row against both `blockchain-api.blockpit.io` and `financial-api.blockpit.io` — the specs are twinned but the deployments may have different apiKey enforcement.

| # | Method | Path | Host | Tag | Score | Why |
|---|---|---|---|---|---:|---|
| 1 | GET | /api/General/Version | both | General | 180 | spec declares no apiKey param; no 401 — only truly unauth-declared op in the surface. Confirms host reachability + exposes build/version string via `ResponseModelOfString`. |
| 2 | GET | /api/Elrond/DeconstructTransaction | both | Elrond | 120 | no 401 declared; hex-blob tx-decoder — if apiKey check is missing, free compute. |
| 3 | GET | /api/Hedera/DeconstructTransaction | both | Hedera | 120 | same as above; also note Elrond-regex param-doc copy-paste suggests shared handler. |
| 4 | GET | /api/Bitcoin/GetTransactionsByXPubKey | both | Bitcoin | 85 | xpub-level crawl: single key enumerates every address Blockpit's parser derives — one apiKey + one xpub = full wallet de-anon. |
| 5 | GET | /api/Bitcoin/GetTransactionsByYPubKey | both | Bitcoin | 85 | ypub (P2SH-P2WPKH). Same risk shape. |
| 6 | GET | /api/Bitcoin/GetTransactionsByZPubKey | both | Bitcoin | 85 | zpub (native P2WPKH). Same. |
| 7 | GET | /api/BitcoinCash/GetTransactionsByXPubKey | both | BitcoinCash | 85 | BCH xpub crawl. |
| 8 | GET | /api/Dash/GetTransactionsByXPubKey | both | Dash | 85 | Dash xpub crawl. |
| 9 | GET | /api/Dogecoin/GetTransactionsByXPubKey | both | Dogecoin | 85 | Doge xpub crawl. |
| 10 | GET | /api/Litecoin/GetTransactionsByXPubKey | both | Litecoin | 85 | Litecoin xpub crawl. |
| 11 | GET | /api/Litecoin/GetTransactionsByYPubKey | both | Litecoin | 85 | Litecoin ypub crawl. |
| 12 | GET | /api/Litecoin/GetTransactionsByZPubKey | both | Litecoin | 85 | Litecoin zpub crawl. |
| 13 | GET | /api/Elrond/IsValidImportAccount | both | Elrond | 80 | no 401 declared — same enforcement anomaly as /DeconstructTransaction. |
| 14 | GET | /api/Elrond/GetAccountBalances | both | Elrond | 80 | no 401 declared. |
| 15 | GET | /api/Hedera/IsValidImportAccount | both | Hedera | 80 | no 401 declared + wrong-chain regex in param-doc. |
| 16 | GET | /api/Hedera/GetAccountBalances | both | Hedera | 80 | no 401 declared. |
| 17 | GET | /api/General/GetMultichainAddresses | both | General | 60 | takes `address`, scans 66 chains for presence — single call, 66-chain fan-out. Resource-abuse + on-chain-deanon amplifier if apiKey-free. |
| 18 | GET | /api/General/GetMultichainAddressesByAddressList | both | General | 60 | same multi-chain fan-out, over a `List<address>` body. Explicit batch × 66-chain multiplier — most expensive single call in the surface. |
| 19 | GET | /api/BitcoinCash/GetBalanceByXPubKey | both | BitcoinCash | 60 | balance-by-xpub (no startblock, no range) — smallest proof-of-de-anonymisation. |
| 20 | GET | /api/Bitcoin/GetBalanceByXPubKey | both | Bitcoin | 60 | smallest xpub probe on BTC itself. |

Full ranked list in `openapi/priority-ranked.tsv` (top 50 rows).

## 3. Schema families (shared vulnerabilities multiply)

The 60 `definitions` are glass boxes — the same response wrapper is reused across almost all 641 ops. A single defect in `ResponseModelOf*` propagates to the whole surface.

- `ResponseModelOfObject` (and `ResponseModelOfObject2`) — generic error/wildcard. `.result` is a free-form object (empty schema). Returned on 400/401/500 for ~620 operations. Any info-leak here (exception stack, SQL text, inner message) lights up every endpoint at once.
- `ResponseModelOfString`, `ResponseModelOfLong`, `ResponseModelOfNullableBoolean`, `ResponseModelOfNullableInteger`, `ResponseModelOfNullableLong`, `ResponseModelOfNullableUInt64` — 7 primitive wrappers reused across ~250 ops. Every one carries `height`, `status`, `message` and `result` — the `height` field is current chain tip and effectively a free resource probe.
- `TaxToolEvmTransaction` + `TaxToolAccountTransaction` + `TaxToolHybridTransaction` — three transaction DTOs. `TaxToolEvmTransaction.kyt_txdb_id` (int64) and `TaxToolEvmTransactionPlatformObject.kyt_contract_id` (int32) leak Blockpit's **internal sequential IDs for transactions and smart-contracts**. These are IDOR seeds for the sibling cn / bit-api / cta-api services (see §5 cross-check).
- `TaxToolToken.details` — `{}` (empty schema, free-form). Any chain's `GetTokenDetails` can return arbitrary JSON here; if backend echoes raw upstream RPC data, this is a reflected-content / log-injection vector downstream.
- `BigInteger` — exposes internal `_sign` / `_bits` fields on every balance (unnecessary field leak, .NET serialiser bleed-through; low severity but a strong tell about field-filter hygiene).

## 4. Specific curl probes to run first in the live session

Do not run in this task — these are the one-shot verifiers the next session fires. Pass `-i` to see headers.

```bash
# A1: canary unauth op — spec declares no apiKey; confirm server-side also skips auth.
curl -is 'https://blockchain-api.blockpit.io/api/General/Version'
curl -is 'https://financial-api.blockpit.io/api/General/Version'

# A2: Elrond + Hedera ops lacking 401 declaration — maybe apiKey check is absent at runtime.
curl -is 'https://blockchain-api.blockpit.io/api/Elrond/DeconstructTransaction?tx=0x'
curl -is 'https://blockchain-api.blockpit.io/api/Elrond/GetAccountBalances?address=erd1invalid'
curl -is 'https://blockchain-api.blockpit.io/api/Elrond/IsValidImportAccount?address=erd1invalid'
curl -is 'https://blockchain-api.blockpit.io/api/Hedera/DeconstructTransaction?tx=0x'
curl -is 'https://blockchain-api.blockpit.io/api/Hedera/GetAccountBalances?address=0.0.1'
curl -is 'https://blockchain-api.blockpit.io/api/Hedera/IsValidImportAccount?address=0.0.1'

# A3: contrast — same chain, a sibling op WITH declared 401; expect 401 here but 200 on A2 if the gap is real.
curl -is 'https://blockchain-api.blockpit.io/api/Elrond/GetTransactions?address=erd1invalid&startblock=0'

# A4: xpub-privacy probe — expect 401 without apiKey. If 200, every wallet address derivable from an xpub is readable with no auth.
curl -is 'https://blockchain-api.blockpit.io/api/Bitcoin/GetBalanceByXPubKey?xpub=xpub000'

# A5: multichain fan-out — one request → 66 chain RPCs. If reachable unauth, expensive-call abuse.
curl -is 'https://blockchain-api.blockpit.io/api/General/GetMultichainAddresses?address=0x0'
```

Expected baseline (from spec): `401` with `ResponseModelOfObject{status:false,message:...,result:{}}` on everything except A1. Anything that returns `200` or a different-shape body on A2–A5 is a real spec/impl mismatch worth escalating.

Also use A1 as the apiKey-free reconnaissance beacon on the twin host (`financial-api.blockpit.io`) to compare build strings between the two deployments.

## 5. Cross-check notes

- **IDOR seeds for cn.blockpit.io / bit-api / cta-api.** The parent agent's open thread on `/report/{id}`, `/report/download/{id}`, `/v1/sourceOfFunds/{id}/file`, `/v1/transactions/{id}/editHistory`, `/v1/transactions/{id}/costBasis` names integer path IDs. The `TaxToolEvmTransaction.kyt_txdb_id` (int64) field this swagger surfaces publicly is almost certainly the same integer transaction ID those authenticated endpoints key off. Neighbour-ID probing on the next session should seed from a legitimate `kyt_txdb_id` observed via this surface and walk ±N — no need to brute from 1.
- **SuPuL/web3balances route.** `cn.blockpit.io/api/v1/transactions/export?year=<YYYY>` returns tax events. The on-chain-tx shape served by this surface (`TaxToolEvmTransaction`, `TaxToolTransaction`, `TaxToolHybridTransaction`) is the same wire format — a decoded-vs-exported field-diff should be done after a live login to confirm. If `export` leaks `kyt_txdb_id` in a flat JSON row, cross-tenant IDOR via `GET /v1/transactions/{kyt_txdb_id}` is directly reachable.
- **Angular SPA call map.** `angular/ENDPOINTS.md` (per index.json) names 173 endpoints in bp-app. None of those should land on `blockchain-api.*` directly — the Angular SPA talks to `api.blockpit.io` / `cn.blockpit.io`. The utility API is backend-to-backend, called by the Blockpit parser nodes. If the Angular bundle references `blockchain-api.blockpit.io` with a baked apiKey, that is a disclosed-API-key finding (recon still needs to confirm the bundle doesn't ship one; parent agent's grep job is relevant here).
- **Twin-deployment anomaly.** Both specs are byte-identical. Likely the same code image deployed twice behind two hostnames. Compare the actual response bodies (`A1`) side-by-side next session; any version/build-id drift between the two hosts is a routing or deployment-tracking issue, and apiKey values on one host likely work on the other (same shared auth store).

## 6. Spec-level anomalies

- **Free-form object fields** (`additionalProperties` undeclared, empty inline schema): `ResponseModelOfObject.result`, `ResponseModelOfObject2.result`, `TaxToolToken.details`. The last one is served on every `*_GetTokenDetails` operation — a potential channel for arbitrary data from upstream chain-indexer RPC into the client. Downstream consumers that do unsafe field access (prototype pollution, template injection) are at risk.
- **Discriminated oneOf / polymorphism**: none. Swagger 2.0 has no `oneOf/anyOf`; the spec doesn't attempt discriminated unions. Not an issue here.
- **Hedera param-regex typo** (Elrond `erd1...` regex applied to Hedera addresses). Spec-authoring smell. If the backend handler is literally the same (copy-paste from Elrond with wrong regex at runtime), Hedera-address validation is broken — possibly accepting non-Hedera input and surfacing cross-chain errors or weird 500s.
- **GET-only convention over large array payloads**: `GetErc20BalancesByBodyJArray` is a `GET` operation that takes `contractAddresses` as a query parameter despite "ByBodyJArray" in the name. Either (a) a URL-size time-bomb (contractAddresses truncation / silent partial response), or (b) the real operation accepts both GET-query and POST-body and only the GET flavour is documented — the POST, if present, is undocumented surface.
- **Internal field leak via DTOs**: `BigInteger._sign`, `BigInteger._bits` are .NET-internal; serialising them indicates the handler returns `BigInteger` objects directly (no field filter). On any arithmetic field, this is a quiet hint that other DTOs may also serialise private backing fields — target .NET-model-leak class in future.
- **Spec `schemes:["http"]`** on a TLS-served host — low-severity disclosure defect (SSRF-via-swagger-import tools may follow the http scheme), but not an active vulnerability.

## 7. Deliverables index

- `openapi/path-diff.tsv` — 641 shared paths, 0 unique to either host (table included for completeness).
- `openapi/security-declarations.tsv` — only 2 root rows ("no `securityDefinitions`, no root `security`"); zero per-op `security` declarations.
- `openapi/idor-candidates.tsv` — 0 rows. The surface uses no path IDs.
- `openapi/mass-assignment-candidates.tsv` — 0 rows. No body-taking verbs.
- `openapi/discount-coupon.tsv` — 0 rows.
- `openapi/auth-flow.tsv` — 0 rows (after excluding web3-token false positives).
- `openapi/pii-exposure.tsv` — 231 rows of on-chain-data exposure (walletAddress, contractAddress, tx hash in responses); no PII in the classical sense.
- `openapi/admin-endpoints.tsv` — 0 rows.
- `openapi/destructive-ops.tsv` — 0 rows.
- `openapi/batch-export.tsv` — 32 rows (array-param endpoints: `addresses`, `contractAddresses`).
- `openapi/privacy-xpub.tsv` — 34 rows (xpub / ypub / zpub operations).
- `openapi/spec-servers.tsv` — 2 rows.
- `openapi/schemas-summary.tsv` — 60 rows (every definition, field count, free-form flag).
- `openapi/priority-ranked.tsv` — top 50 by composite risk score.
