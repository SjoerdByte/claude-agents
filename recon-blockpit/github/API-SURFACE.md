# API Surface Map

Pass date: 2026-10-09. Scope: 16 API-shaped hosts under `*.blockpit.io`.
Unauth-only probing, HEAD/GET/single OPTIONS/single POST introspection, no
fuzzing. Raw per-host output: `raw/api-surface-pass/`.

Transport note: cn.blockpit.io, cta-api.blockpit.io, gov-api.blockpit.io,
cn1.blockpit.io, cn-test.blockpit.io, cn1-test.blockpit.io are fronted by
Cloudflare and challenge every curl/headless request with a managed challenge
(HTTP 403, cf-ray header, ~5770 B challenge body). Per prior session note in
`index.json` this challenge is bypassable only via `xvfb-run -a chromium`
headful; curl, Playwright APIRequestContext, and headless Playwright are
permanently blocked at the edge. The CF 403 does not mean "endpoint missing" —
the origin behavior for each cn/cta/gov path is still unknown via this
mapping-only pass and must be revisited with the xvfb harness.

## 1. Host inventory

| Host | A-record(s) | Status (/) | Server (from HEAD or probe) | CDN | Cert SANs count | Notes |
|---|---|---|---|---|---|---|
| cn.blockpit.io | 104.20.44.219, 172.66.157.149 | 403 | cloudflare | yes (CF) | 1 | CF managed-challenge wall; origin unknown via curl |
| cta-api.blockpit.io | 104.20.44.219, 172.66.157.149 | 403 | cloudflare | yes (CF) | 1 | CF managed-challenge wall |
| gov-api.blockpit.io | 104.20.44.219, 172.66.157.149 | 403 | cloudflare | yes (CF) | 1 | CF managed-challenge wall |
| cn1.blockpit.io | 104.20.44.219, 172.66.157.149 | 403 | cloudflare | yes (CF) | 1 | New in-scope host now resolving (was dark in prior sessions). Same CF challenge posture as cn/cta/gov. |
| cn-test.blockpit.io | 104.20.44.219, 172.66.157.149 | 403 | cloudflare | yes (CF) | 1 | New in-scope host now resolving. CF challenge. |
| cn1-test.blockpit.io | 104.20.44.219, 172.66.157.149 | 403 | cloudflare | yes (CF) | 1 | New in-scope host now resolving. CF challenge. |
| blockchain-api.blockpit.io | 116.202.100.54 | 404 | Kestrel (ASP.NET Core) | no | 1 | Direct Hetzner origin. Live swagger. |
| financial-api.blockpit.io | 116.202.100.54 | 404 | Kestrel (ASP.NET Core) | no | 1 | Same Hetzner IP as blockchain-api. Byte-identical swagger. |
| bit-api.blockpit.io | NODATA | 000 (curl) / 502 (proxy) | - | - | - | No A record. In crt.sh (cert exists). Not reachable from this vantage. |
| bit-api-test.blockpit.io | NODATA | 000 / 502 | - | - | - | No A record. In crt.sh. |
| kytapi.blockpit.io | NODATA | 000 / 502 | - | - | - | No A record. Not in crt.sh. |
| cta-api.blockpit.io (dup above) | - | - | - | - | - | - |
| api.blockpit.io | NODATA | 000 / 502 | - | - | - | No A record. OAuth2 token root per Angular env; dark. |
| api-staging.blockpit.io | NODATA | 000 / 502 | - | - | - | No A record. |
| api-test.blockpit.io | NODATA | 000 / 502 | - | - | - | No A record. In crt.sh. |
| cn2.blockpit.io | NODATA | 000 / 502 | - | - | - | No A record. |
| cn2-test.blockpit.io | NODATA | 000 / 502 | - | - | - | No A record. |

Delta vs last pass: `cn1.blockpit.io`, `cn-test.blockpit.io`,
`cn1-test.blockpit.io` previously tagged `dark_hosts_proxy_502_twice` in
`index.json` now resolve to the CF anycast pair. These are three freshly-live
CF-fronted API hosts. `cn2.*`, `bit-api.*`, `kytapi.*`, `api(.*|-staging|-test)`
all remain NODATA.

## 2. Endpoint probe results

44 discovery paths probed per host (see `/tmp/probe.sh` and
`raw/api-surface-pass/probes/paths-<host>.tsv`). Only non-404 and non-uniform
results are shown.

### blockchain-api.blockpit.io (Kestrel)

| Path | Method | Status | Size | CT | Note |
|---|---|---|---|---|---|
| /swagger | GET | 200 | 2471 | text/html | Swagger UI shell |
| /swagger/index.html | GET | 200 | 2471 | text/html | Swagger UI shell |
| /swagger/v1/swagger.json | GET | 200 | 1,130,285 | application/json | Full 641-op OpenAPI 2.0 spec (unauth) |
| /api/General/Version | GET | 200 | 97 | application/json | `{"status":true,"message":"ok","height":null,"version":"2.0.9028.21725",...}` - only unauth op in spec |
| everything else (41 paths) | GET | 404 | 0 | - | Kestrel default 404 |
| /api/General/Version | OPTIONS | 204 | 0 | - | `Access-Control-Allow-Origin: *` reflected |

### financial-api.blockpit.io (Kestrel)

| Path | Method | Status | Size | CT | Note |
|---|---|---|---|---|---|
| /swagger | GET | 200 | 2471 | text/html | identical UI shell |
| /swagger/index.html | GET | 200 | 2471 | text/html | identical UI shell |
| /swagger/v1/swagger.json | GET | 200 | 1,130,284 | application/json | byte-equivalent to blockchain-api (1 B diff is the `host` field) |
| everything else | GET | 404 | 0 | - | Kestrel default 404 |

### cn.blockpit.io, cta-api, gov-api, cn1, cn-test, cn1-test (CF-fronted)

Every probed path returns the SAME CF managed-challenge response:
`HTTP/2 403`, `content-type: text/html; charset=UTF-8`, `size=5770-5771`,
`server: cloudflare`, `cf-ray: a47e2*-IAD`, body contains "Attention Required!
| Cloudflare" + "You are unable to access". Zero information about actual
backend endpoints is leakable through curl. Full tables in
`raw/api-surface-pass/probes/paths-<host>.tsv`. All 44 paths tested are 403 CF
on all 6 hosts (264 probes, 264 CF challenges).

### NODATA hosts

Returned HTTP 502 from the upstream agent proxy on both attempts (per
Claude.md "502 = inconclusive" the proxy returned the same 502 immediately
without a retryable delay, matching NXDOMAIN pattern). Treat as "not currently
publicly reachable from this vantage", not "service doesn't exist".

## 3. Known-shape endpoint on cn.blockpit.io

Target: `GET https://cn.blockpit.io/api/v1/transactions/export?year=2024`
(reference from `SuPuL/web3balances`, Bearer-authenticated call).

Raw unauth probe (saved full in `raw/api-surface-pass/cn-specific/`):

```
curl -sik https://cn.blockpit.io/api/v1/transactions/export?year=2024 -D hdr -o body

Response headers:
HTTP/2 403
date: Fri, 09 Oct 2026 14:44:04 GMT
content-type: text/html; charset=UTF-8
cache-control: private, max-age=0, no-store, no-cache, must-revalidate, post-check=0, pre-check=0
expires: Thu, 01 Jan 1970 00:00:01 GMT
referrer-policy: same-origin
x-frame-options: SAMEORIGIN
server: cloudflare
cf-ray: a47e29486f4ad6d9-IAD
alt-svc: h3=":443"; ma=86400

Body (5771 B, text/html, Cloudflare managed-challenge interstitial)
```

Sibling path probes (22 total) are in
`raw/api-surface-pass/cn-specific/sibling-probes.tsv` — all 22 returned the
identical CF 403 body. Paths probed:

```
/api/v1/transactions, /api/v1/transactions/{1,0,999999}, /api/v1/export,
/api/v1/users, /api/v1/users/me, /api/v1/accounts, /api/v1/portfolios,
/api/v1/wallets, /api/v1/exchanges, /api/v1/auth/{login,register,signup,signin},
/api/v1/{login,register,signup,token}, /api/v1/oauth/token, /api/v1/public,
/api/v1/maintenance
```

Note: `/api/v1/maintenance` is known from the prior xvfb-harness pass to
return `{"enabled":false,"databaseDown":false}` unauth (200). The uniform
curl-side 403 confirms CF is applying the same bot-check to every path and is
not whitelisting any `/api/v1/*` route for scrapers. This is a strong signal
that the "endpoint exists vs doesn't exist" distinction for cn.blockpit.io
cannot be made from an unauth curl pass; the exploit-phase xvfb/headful
Playwright harness (`exploit/probe3.js`) is required for every cn/cta/gov
endpoint-presence check from this point forward.

## 4. GraphQL status

| Host | /graphql status | introspection sent | schema returned | note |
|---|---|---|---|---|
| blockchain-api.blockpit.io | 404 (Kestrel) | not sent (no endpoint) | n/a | No GraphQL on this host |
| financial-api.blockpit.io | 404 (Kestrel) | not sent | n/a | No GraphQL on this host |
| cn.blockpit.io | 403 (CF) | sent | 5770 B CF challenge | Introspection POST = CF 403; indistinguishable from endpoint-absent at curl layer |
| cta-api.blockpit.io | 403 (CF) | sent | 5771 B CF challenge | ditto |
| gov-api.blockpit.io | 403 (CF) | sent | 5771 B CF challenge | ditto |
| cn1.blockpit.io | 403 (CF) | sent | 5771 B CF challenge | ditto |
| cn-test.blockpit.io | 403 (CF) | sent | 5771 B CF challenge | ditto |
| cn1-test.blockpit.io | 403 (CF) | sent | 5771 B CF challenge | ditto |

Rules-side result: no new GraphQL evidence this pass. Prior finding from
`ruled_out` still holds: no `graphql`, `graphiql`, `playground` string
appears in any client bundle, and the two reachable Kestrel origins both
return 404. The 6 CF hosts cannot be confirmed negative without xvfb-level
access and remain weakly-open as a thread.

## 5. Swagger / OpenAPI found

| Host | Path | Spec version | ops | with security block | notes |
|---|---|---|---|---|---|
| blockchain-api.blockpit.io | /swagger/v1/swagger.json | OpenAPI 2.0 (Swagger 2) | 641 | 0 | No `securityDefinitions`, no per-op `security`. `apiKey` is a query param on 640/641 ops (nullable in spec; enforced at runtime). Only unauth-declared op: `GET /api/General/Version`. 7 ops across Elrond+Hedera declare no 401 response (potential missing-auth runtime hazard tracked as open thread). Full attack-surface map at `openapi/ATTACK-MAP.md`. |
| financial-api.blockpit.io | /swagger/v1/swagger.json | OpenAPI 2.0 | 641 | 0 | Byte-identical paths+definitions to blockchain-api; only `host` differs. Same security posture. |

No swagger/openapi/redoc found on any CF-fronted host via curl path probing
(all 403 CF). Prior Angular-bundle analysis found no public swagger endpoint
on cn/cta/gov — the client talks to those APIs via hand-coded fetch calls
only.

## 6. Origin IP investigation

**cn.blockpit.io (and sibling CF hosts)**: origin IP NOT recovered this pass.
CT logs (crt.sh for blockpit.io, 353 KB result in
`raw/api-surface-pass/crtsh-blockpit.json`) contain only the `*.blockpit.io`
wildcard plus 38 per-subdomain certs; none expose a historical pre-CF A record
pointing at a Hetzner backend. Direct-IP probe of 116.202.100.54 with Host
header `cn.blockpit.io` returned a CF challenge body with
`cf-ray: a47e2e835b9fc071-ORD` — this vantage has no clean route around CF
anycast for CF-managed hostnames, even with `--noproxy "*" --resolve`. The
Hetzner origin for blockchain-api/financial-api is confirmed at 116.202.100.54
and is reachable without CF, but that same IP does not expose
cn.blockpit.io's Kestrel app via SNI binding visible from here. Next-session
pivots recommended: Shodan `ssl.cert.subject:blockpit.io http.title:kestrel`
or similar on Hetzner ASNs; passive-DNS historical records for cn.blockpit.io
from Rapid7 FDNS / SecurityTrails; checking if `transformer.blockpit.io`,
`agent.blockpit.io` or `scim.blockpit.io` (all in crt.sh) share the Hetzner
IP and leak a Kestrel application that exposes cn's /api routes under a
different hostname. Notes in `raw/api-surface-pass/origin-ip-notes.txt`.

**api.blockpit.io (and *-staging / *-test siblings)**: NODATA from DNS.
Nothing to pivot on this pass. Dormant host set; retry next session.

## 7. New hosts discovered via SANs / CNAMEs

Diff of crt.sh SAN set vs the pre-existing `subdomains.txt` = empty. All 38
crt.sh SANs (listed in `raw/api-surface-pass/crtsh-sans.txt`) are already in
the subdomain list.

Three in-scope hosts newly resolve in this pass that were previously dark:
`cn1.blockpit.io`, `cn-test.blockpit.io`, `cn1-test.blockpit.io`. Their
A-records are the same CF anycast pair as cn/cta/gov, so they share the same
CF-managed-challenge posture; endpoint behavior behind the CF edge is unknown
until the xvfb harness is pointed at them.

## 8. Delta since prior pass (summary for index.json)

- Three CF-fronted hosts came back online (cn1, cn-test, cn1-test) — add to
  reachable_hosts_cf_edge_only.
- No new swagger surface, no new graphql surface, no new unauth 200-leak.
- Known-shape endpoint `GET /api/v1/transactions/export?year=2024` on
  cn.blockpit.io: still CF-walled on curl; auth-session probing deferred to
  exploit phase with xvfb harness.
- Origin IP for cn/cta/gov remains unrecovered.
