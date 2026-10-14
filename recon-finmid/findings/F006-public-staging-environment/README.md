# F006 Entire staging environment finmid-staging.com reachable without authentication

Status: confirmed
Severity: P3 / Medium (expanded attack surface, parallel environment running the same code and holding its own data; is the delivery mechanism for F004 and makes F005 reproducible on a second host)
CVSS 3.1: 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)
OWASP: A05:2021 Security Misconfiguration (CWE-200 Exposure of Sensitive Information)

## Affected endpoints

Staging subdomains that are NOT behind HTTP Basic Auth and respond identically to their production equivalents:

- https://platform.finmid-staging.com/ (distributor dashboard SPA, 3256-byte index, serves source map 1.97 MB at /assets/index-9W6uP03B.js.map)
- https://auth.finmid-staging.com/auth/realms/platform/.well-known/openid-configuration (Keycloak, full config)
- https://analytics.finmid-staging.com/api/session/properties (Metabase - delivers F004 setup-token leak)
- https://api.finmid-staging.com/api/v1/capital/businesses/{business_id} (Capital API, JWT-gated, same Envoy edge)
- https://platform.gateway.finmid-staging.com/ (platform admin backend, 403 at root, same shape as prod)
- https://sandbox.gateway.finmid-staging.com/ (sandbox backend, 404 at root but accepts /api/* like prod)
- https://webhooks.finmid-staging.com/ (webhook ingress)
- https://b2b-payments.finmid-staging.com/ (B2B payments SPA, 877-byte index, source map 670 KB)
- https://short.bolt.finmid-staging.com/ (staging Shlink)
- https://maintenance.finmid-staging.com/ (static maintenance page)

Staging subdomains that ARE behind Basic Auth (so the policy is clearly "staging should not be public" but is incompletely applied):

- https://finmid-staging.com/, https://www.finmid-staging.com/ (marketing)
- https://apply.finmid-staging.com/ (apply SPA)
- https://docs.finmid-staging.com/ (docs mirror)
- https://zeos.finmid-staging.com/ (zeos tenant)

## DNS discovery

The staging domain is not listed in subdomains.txt. It was discovered by noticing that the live platform SPA's CSP whitelists `https://analytics.finmid-staging.com/` in frame-src (which is also a hygiene issue: prod CSP should not reference staging). Resolving every tenant on `.finmid-staging.com` yielded live records for the subdomains above.

```
finmid-staging.com                 -> 18.160.200.97   (CloudFront, Basic Auth 401)
www.finmid-staging.com             -> 18.160.200.46   (CloudFront, Basic Auth 401)
analytics.finmid-staging.com       -> 63.184.231.49   (Envoy/Metabase, no auth gate)
auth.finmid-staging.com            -> 63.186.195.142  (Envoy/Keycloak, no auth gate)
platform.finmid-staging.com        -> 108.159.227.12  (CloudFront SPA, no auth gate)
api.finmid-staging.com             -> 63.186.195.142  (Envoy/Capital, no auth gate)
gateway.finmid-staging.com         -> 63.184.231.49   (Envoy, no auth gate)
platform.gateway.finmid-staging.com-> 52.57.97.60     (Envoy backend, no auth gate)
sandbox.gateway.finmid-staging.com -> 63.184.231.49   (Envoy backend, no auth gate)
webhooks.finmid-staging.com        -> 52.57.97.60     (Envoy ingress, no auth gate)
short.bolt.finmid-staging.com      -> 63.186.195.142  (Envoy/Shlink, no auth gate)
b2b-payments.finmid-staging.com    -> 18.172.122.38   (CloudFront SPA, no auth gate)
zeos.finmid-staging.com            -> 3.168.51.4      (CloudFront SPA, Basic Auth 401)
docs.finmid-staging.com            -> 3.167.183.6     (CloudFront, Basic Auth 401)
apply.finmid-staging.com           -> 3.170.152.40    (CloudFront, Basic Auth 401)
maintenance.finmid-staging.com     -> 18.160.213.4    (CloudFront static page)
```

## Impact

1. **Doubles the externally-reachable attack surface** of every service that runs the finmid stack (Keycloak, Metabase, Capital API, Platform API, Shlink, SPAs). Any CVE or logic bug in a shared component now has two reachable instances.
2. **Delivers F004** (Metabase setup-token leak with CVE-2023-38646 pre-condition) on `analytics.finmid-staging.com`.
3. **Delivers F005** (static CSP nonce `rAnd0m`) on `platform.finmid-staging.com`.
4. **Leaks internal DNS zone** `*.ops.staging.finmid.io` via staging site-url and CSP connect-src values.
5. **Keycloak staging realm `platform` is reachable** - the full OIDC configuration (`https://auth.finmid-staging.com/auth/realms/platform/.well-known/openid-configuration`) is served to anyone, listing identical grants to prod (`authorization_code, client_credentials, implicit, password (ROPC), refresh_token, device_code, jwt-bearer, token-exchange, uma-ticket, CIBA`) and the same signing algs (HS* accepted alongside RS/ES, so staging has the same alg-confusion risk as prod).
6. **Staging user accounts are usually test accounts** with weaker passwords, which means ROPC credential-stuffing against `auth.finmid-staging.com` is a cheaper path to an authenticated session than against production. (Not performed in this test per rules of engagement.)
7. **api.finmid-staging.com** leaks backend detail even on unauth requests: it returns `Jwt is not in the form of Header.Payload.Signature with two dots and 3 sections` when a non-JWT bearer is submitted, revealing the backend auth library's error semantics.
8. **Policy inconsistency**: the fact that marketing + apply + docs + zeos *are* behind Basic Auth, while platform / auth / analytics / api / webhooks / b2b-payments / short / maintenance are *not*, means the lockdown was intended but was not applied uniformly - which is itself a hygiene bug and makes the surface easier to miss.

## Reproduction

```bash
# Enumerate presence vs auth-gating
for h in platform auth analytics api gateway platform.gateway sandbox.gateway webhooks short.bolt b2b-payments maintenance apply docs zeos "" www; do
  code=$(curl -so /dev/null -w "%{http_code}" --max-time 8 "https://${h}${h:+.}finmid-staging.com/")
  echo "$code  https://${h}${h:+.}finmid-staging.com/"
done
```

Expected (from this test):

```
200  https://platform.finmid-staging.com/
403  https://auth.finmid-staging.com/
403  https://analytics.finmid-staging.com/
403  https://api.finmid-staging.com/
404  https://gateway.finmid-staging.com/
403  https://platform.gateway.finmid-staging.com/
404  https://sandbox.gateway.finmid-staging.com/
404  https://webhooks.finmid-staging.com/
404  https://short.bolt.finmid-staging.com/
200  https://b2b-payments.finmid-staging.com/
200  https://maintenance.finmid-staging.com/
401  https://apply.finmid-staging.com/
401  https://docs.finmid-staging.com/
401  https://zeos.finmid-staging.com/
401  https://finmid-staging.com/
401  https://www.finmid-staging.com/
```

The 403 responses on Envoy-fronted hosts are still "reachable" - the Envoy whitelist forwards specific paths (e.g. `/api/session/properties` on Metabase, `/.well-known/openid-configuration` on Keycloak, `/api/v1/*` on the Capital API). Follow F004 for the setup-token leak and the existing F001/F002/F003 playbook for the rest.

## Remediation

1. Apply the same CloudFront-Function Basic Auth gate that already protects `finmid-staging.com`, `www.finmid-staging.com`, `apply.finmid-staging.com`, `docs.finmid-staging.com`, and `zeos.finmid-staging.com` to the remaining hosts: `platform.finmid-staging.com`, `b2b-payments.finmid-staging.com`, `auth.finmid-staging.com`, `analytics.finmid-staging.com`, `api.finmid-staging.com`, `gateway.finmid-staging.com`, `platform.gateway.finmid-staging.com`, `sandbox.gateway.finmid-staging.com`, `webhooks.finmid-staging.com`, `short.bolt.finmid-staging.com`.
2. For the Envoy-fronted hosts (`auth/analytics/api/gateway/platform.gateway/sandbox.gateway/webhooks/short.bolt`), terminate at the edge with mTLS or IP-allowlist from corp VPN rather than letting them be internet-reachable.
3. Remove `https://analytics.finmid-staging.com/` from the production platform CSP `frame-src` (it was accidentally shipped to prod when staging was added as a Metabase embed source).
4. Rotate the staging Metabase `setup-token`, Keycloak realm signing keys, and any test tenant credentials that may have been test-stuffed since staging first became reachable.
5. Add `finmid-staging.com` to the asset inventory and treat it as in-scope for the same monitoring, patching, and policy rules as `finmid.com`.

## References

- CWE-200 Information Exposure
- F001, F004 (Metabase setup-token leak on both environments)
- F005 (static CSP nonce reproducible on both environments)
