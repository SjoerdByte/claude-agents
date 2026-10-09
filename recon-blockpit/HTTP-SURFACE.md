# Blockpit HTTP surface map

Session: 2026-10-09. Raw outputs under `raw/`. Mapping only, no exploitation.

Scope reminder: `*.blockpit.io` + Blockpit-controlled vendor infra. `cryptotax.io` apex is NOT Blockpit anymore (parked at webgo for an unknown webgo customer, see `raw/bodies/cryptotax.io-root.html`). Only `api-docs.cryptotax.io` is Blockpit under cryptotax.io.

Environment note: the outbound HTTPS proxy performs TLS MITM. Every observed cert was `O = Anthropic, CN = Egress Gateway SDS Issuing CA` with a single SAN matching the request. Real upstream SANs and issuers cannot be seen from this container (see `raw/tls-sans.txt`). TLS-cert-based SAN discovery and cert-expiry findings require a direct-TLS environment.

## Resolution summary

- 88 hosts queried (86 from subdomains.txt + cryptotax.io + api-docs.cryptotax.io).
- 43 resolve to at least one A record.
- 45 do not resolve (NXDOMAIN or empty) via 1.1.1.1 / 8.8.8.8 / 9.9.9.9 and via the local getaddrinfo path, and confirmed by curl-through-proxy.
- 0 dangling CNAMEs found (no CNAMEs returned at all for the queried hosts; every live host is an A-record apex at a CDN or static-host IP).
- `cryptotax.io` resolves and serves a webgo "Diese Domain wurde registriert" parking page.
- `link.blockpit.io` resolves and 301/302 chains land on `https://www.fun.com/` (FUN.com retail site). Treat as a stale redirect / orphan vendor binding, not a Blockpit property. See `dangling-cname-candidates.txt`-equivalent note below.

Raw: `raw/dns-resolution.txt`.

## Vendor / CDN breakdown (resolving hosts)

| Edge / platform | Count | Representatives |
|---|---|---|
| Cloudflare (CDN+WAF, HTTP/2 403 to automated UA) | 24 | blog, community, sentry, exchange-monitoring, exchange, cn, cn1, cn-test, cn1-test, cta-api, gov-api, bi, cdn, help, hub, scim, sonar, helios, helios-test, exchange-monitoring, zendesk4, gate, www, blockpit.io apex |
| Netlify (SPA, several password-locked with HTTP 401) | 11 | app, cta, gov, staging, test, cta-staging, cta-test, gov-staging, gov-test, powerhouse, powerhouse-test |
| Kestrel (ASP.NET Core, direct, no CDN) | 2 | financial-api, blockchain-api |
| CloudFront + AmazonS3 (static bucket) | 1 | cdn-test (eu-west-1 bucket) |
| nginx (Ubuntu, direct) | 1 | api-docs.cryptotax.io |
| Postmark bounce IPs (SMTP, no HTTP) | 3 | pm-bounces, pm-bounces.community, pm-bounces.updates |
| webgo parking | 1 | cryptotax.io |
| Stale third-party redirect | 1 | link.blockpit.io -> www.fun.com |

Netlify-protected (401 w/ no WWW-Authenticate, Netlify site-password): staging, test, cta-staging, cta-test, gov-staging, gov-test, powerhouse, powerhouse-test.
Netlify-public SPA (200): app, cta, gov. All three serve the same Angular SPA shell (title "Blockpit | Crypto Tax & Tracking", `data-beasties-container`, preconnects to cdn.blockpit.io). Every arbitrary path returns 200 via the Angular router catch-all (see "SPA fallback" note under the per-host table).

## Per-host HTTP surface

| Host | Resolves | Final URL | Status | Server | Tech / hints | Interesting paths | Cookie flags | Missing security headers |
|---|---|---|---|---|---|---|---|---|
| blockpit.io | yes | https://www.blockpit.io/ | 200 | cloudflare | Webflow (cdn.prod.website-files.com, `data-wf-site`) | /manifest.json (200), /robots.txt (301), /sitemap.xml (301) | `_cfuvid` HttpOnly; SameSite=None; Secure | CSP, X-Content-Type-Options, Permissions-Policy, Referrer-Policy |
| www.blockpit.io | yes | https://www.blockpit.io/ | 200 | cloudflare | Webflow | /index.html, /manifest.json, /robots.txt, /sitemap.xml | `_cfuvid` HttpOnly; SameSite=None; Secure | CSP, X-Content-Type-Options, Permissions-Policy |
| app.blockpit.io | yes | https://app.blockpit.io/ | 200 | Netlify | Angular SPA (Blockpit) | SPA fallback - every path 200 | - | CSP, X-Frame-Options (none seen on root), X-Content-Type-Options, Permissions-Policy |
| cta.blockpit.io | yes | https://cta.blockpit.io/ | 200 | Netlify | same Angular SPA; `notranslate` | SPA fallback - every path 200 | - | CSP, X-Content-Type-Options |
| gov.blockpit.io | yes | https://gov.blockpit.io/ | 200 | Netlify | same Angular SPA; `notranslate` | SPA fallback - every path 200 | - | CSP, X-Content-Type-Options |
| staging.blockpit.io | yes | https://staging.blockpit.io/ | 401 | Netlify | Netlify site-password | n/a (gated) | - | n/a |
| test.blockpit.io | yes | https://test.blockpit.io/ | 401 | Netlify | Netlify site-password | n/a | - | n/a |
| cta-staging.blockpit.io | yes | https://cta-staging.blockpit.io/ | 401 | Netlify | Netlify site-password | n/a | - | n/a |
| cta-test.blockpit.io | yes | https://cta-test.blockpit.io/ | 401 | Netlify | Netlify site-password | n/a | - | n/a |
| gov-staging.blockpit.io | yes | https://gov-staging.blockpit.io/ | 401 | Netlify | Netlify site-password | n/a | - | n/a |
| gov-test.blockpit.io | yes | https://gov-test.blockpit.io/ | 401 | Netlify | Netlify site-password | n/a | - | n/a |
| powerhouse.blockpit.io | yes | https://powerhouse.blockpit.io/ | 401 | Netlify | Netlify site-password | n/a | - | n/a |
| powerhouse-test.blockpit.io | yes | https://powerhouse-test.blockpit.io/ | 401 | Netlify | Netlify site-password | n/a | - | n/a |
| financial-api.blockpit.io | yes | https://financial-api.blockpit.io/ | 404 (root) | Kestrel | ASP.NET Core; /swagger/index.html 200; /swagger/v1/swagger.json 200 (641 paths, no securitySchemes) | /swagger, /swagger/index.html, /swagger/v1/swagger.json | - | CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Permissions-Policy |
| blockchain-api.blockpit.io | yes | https://blockchain-api.blockpit.io/ | 404 (root) | Kestrel | ASP.NET Core; /swagger/index.html 200; /swagger/v1/swagger.json 200 (641 paths, no securitySchemes) | /swagger, /swagger/index.html, /swagger/v1/swagger.json | - | CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Permissions-Policy |
| api-docs.cryptotax.io | yes | https://api-docs.cryptotax.io/ | 200 | nginx/1.18.0 (Ubuntu) | Redoc 2.5.3 SPA for CryptoTax API (title "CryptoTax API documentation") | /index.html (200) | - | CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Permissions-Policy |
| cryptotax.io | yes | https://cryptotax.io/ | 200 | cloudflare | webgo parking page (NOT Blockpit) | /robots.txt (200), /index.html (200) | `_cfuvid` HttpOnly; SameSite=None; Secure | n/a - out of scope |
| link.blockpit.io | yes | https://www.fun.com/ | 200 | - | Stale 3rd-party redirect to FUN.com; /api (200), /graphql (200), /login (200) are FUN.com paths, not Blockpit | - | - | n/a - orphan |
| blog.blockpit.io | yes | https://blog.blockpit.io/ | 403 | cloudflare | CF bot block | - | - | - |
| community.blockpit.io | yes | https://community.blockpit.io/ | 403 | cloudflare | CF bot block; likely Discourse under the hood | /robots.txt (200) | - | - |
| sentry.blockpit.io | yes | https://sentry.blockpit.io/ | 403 | cloudflare | CF bot block; expected Sentry (self-hosted) | - | - | - |
| sonar.blockpit.io | yes | https://sonar.blockpit.io/ | 403 | cloudflare | CF bot block; expected SonarQube | - | - | - |
| bi.blockpit.io | yes | https://bi.blockpit.io/ | 403 | cloudflare | CF bot block; business intelligence (Metabase/Superset?) | - | - | - |
| hub.blockpit.io | yes | https://hub.blockpit.io/ | 403 | cloudflare | CF bot block; unknown | - | - | - |
| helios.blockpit.io | yes | https://helios.blockpit.io/ | 403 | cloudflare | CF bot block | - | - | - |
| helios-test.blockpit.io | yes | https://helios-test.blockpit.io/ | 403 | cloudflare | CF bot block | - | - | - |
| scim.blockpit.io | yes | https://scim.blockpit.io/ | 403 | cloudflare | CF bot block; SCIM provisioning endpoint | - | - | - |
| gate.blockpit.io | yes | https://gate.blockpit.io/ | 403 | cloudflare | CF bot block; "gate" (auth gateway?) | - | - | - |
| cn.blockpit.io | yes | https://cn.blockpit.io/ | 403 | cloudflare | CF bot block; cn = CoinNode (SuPuL/web3balances calls /api/v1/transactions/export here) | - | - | - |
| cn1.blockpit.io | yes | https://cn1.blockpit.io/ | 403 | cloudflare | CF bot block | - | - | - |
| cn-test.blockpit.io | yes | https://cn-test.blockpit.io/ | 403 | cloudflare | CF bot block | - | - | - |
| cn1-test.blockpit.io | yes | https://cn1-test.blockpit.io/ | 403 | cloudflare | CF bot block | - | - | - |
| cta-api.blockpit.io | yes | https://cta-api.blockpit.io/ | 403 | cloudflare | CF bot block (API behind CF) | - | - | - |
| gov-api.blockpit.io | yes | https://gov-api.blockpit.io/ | 403 | cloudflare | CF bot block (API behind CF) | - | - | - |
| exchange.blockpit.io | yes | https://exchange.blockpit.io/ | 403 | cloudflare | CF bot block | - | - | - |
| exchange-monitoring.blockpit.io | yes | https://exchange-monitoring.blockpit.io/ | 403 | cloudflare | CF bot block | - | - | - |
| cdn.blockpit.io | yes | https://cdn.blockpit.io/ | 403 | cloudflare | CF bot block; static CDN (preconnected from SPA) | - | - | - |
| help.blockpit.io | yes | https://help.blockpit.io/ | 403 | cloudflare | /hc/en-us -> 301 https://intercom.help/blockpit/en (Intercom-hosted help center) | - | - | - |
| zendesk4.blockpit.io | yes | https://zendesk4.blockpit.io/ | 403 | cloudflare | CF 403 text/plain 17 bytes; name implies Zendesk tenant | - | - | - |
| cdn-test.blockpit.io | yes | https://cdn-test.blockpit.io/ | 403 | AmazonS3 (CloudFront) | `x-amz-bucket-region: eu-west-1`; S3 403 ListBucket denied | - | - | - |
| pm-bounces.blockpit.io | yes (A) | n/a | 000 | - | Postmark bounce IPs; SMTP only, no HTTP service | - | - | - |
| pm-bounces.community.blockpit.io | yes (A) | n/a | 000 | - | Postmark bounce IPs | - | - | - |
| pm-bounces.updates.blockpit.io | yes (A) | n/a | 000 | - | Postmark bounce IPs | - | - | - |

Raw headers per host: `raw/http-probe.txt`. Path probe matrix: `raw/paths-probe.txt` and distilled `raw/interesting-paths.txt`.

Notes on SPA fallback: app/cta/gov each return 200 on every path in the common-path list (/.env, /.git/HEAD, /admin, /actuator/env, /graphiql, etc.). All responses are the Angular index.html shell. This is NOT 32 real endpoints per host; the Netlify static deploy serves index.html for unmatched routes. Flagged in `raw/interesting-paths.txt` but treat as the SPA shell until proven otherwise.

CF 403s: every Cloudflare-fronted host returned HTTP/2 403 from /. UA swap to Chrome 129 did not help. These are either CF bot management (JS challenge) or CF Access gated; from this environment they are opaque. All interesting app surface behind them has to be hit either from a real browser or via Blockpit-owned IPs.

## Dangling / stale CNAME-equivalent candidates

- `link.blockpit.io` -> 301/302 chain -> `https://www.fun.com/`. No CNAME in DNS (A record direct), but the HTTP vhost on that IP serves fun.com content with no Blockpit branding. Looks like a stale rebranded short-link / vendor binding (ex-rebrandly / short.io / bitly custom domain). Confirm by inspecting the apex IP's HTTP host handling and the original purpose of `link.`. Classic takeover-worthy pattern: if the matching vendor account is unclaimed, re-registering it there yields phish-grade Blockpit-branded redirects.
- `cryptotax.io` apex: webgo parking page, "Diese Domain wurde erfolgreich bei webgo für einen Kunden registriert." Blockpit controls only `api-docs.cryptotax.io` and not the apex; update index.json scope_note to reflect this.
- `cdn-test.blockpit.io`: CloudFront 403 reading from an S3 bucket in eu-west-1. If the S3 bucket name is enumerable from the CloudFront distribution ID or from any error page, bucket-takeover enumeration is in reach. Did not probe further.
- Netlify 401-locked staging/test/powerhouse hosts: if their original Netlify site slugs become disconnected (team rotation), the subdomain CNAME would hand them to any Netlify tenant who re-registers the slug. Did not confirm the slugs because they are not in the Host-level reply.

Nothing CNAME'd into herokudns / github.io / azurewebsites / wpengine / s3-website / etc. was observed; the dangling list is empty for the classic vendor patterns.

## Hosts exposing admin / debug / unauth API docs / swagger / graphiql / jenkins UI / sonar UI / sentry login

- `blockchain-api.blockpit.io/swagger/v1/swagger.json` — **200**, 1.13 MB OpenAPI, 641 paths, zero securitySchemes declared. Title "Blockpit Blockchain Utility API". Full UI at `/swagger/index.html`. Mapping only; no payloads sent.
- `financial-api.blockpit.io/swagger/v1/swagger.json` — **200**, same spec (title and 641 paths identical to blockchain-api). Twinned deployment of the same ASP.NET Core service. Full UI at `/swagger/index.html`.
- `api-docs.cryptotax.io/` — **200** Redoc page for CryptoTax API v3 (already a known thread; partner JWT bearer flow).
- `sentry.blockpit.io` — CF 403; a real Sentry login page is expected behind it. Not reachable from this env.
- `sonar.blockpit.io` — CF 403; expected SonarQube UI.
- `jenkins.blockpit.io` — does not resolve; name is on the subdomain list but no A record. Likely retired or internal-DNS only.
- `mautic.blockpit.io` — does not resolve.
- `wp-old.blockpit.io`, `legacy.blockpit.io` — do not resolve. The Claude.md "/legacy /wp-old wordpress" high-value pattern is not exploitable externally in this snapshot; keep as internal-DNS or re-scan thread.
- `app.blockpit.io/.env`, `app.blockpit.io/.git/HEAD`, `cta.blockpit.io/.env`, `gov.blockpit.io/.env` all returned 200 but content is the SPA index.html, not the real file. Flagged as SPA fallback; no real `.env` exposure.

## New subdomains discovered via SANs + bodies that are not in subdomains.txt

- From body references: none (all hostnames extracted from HTML bodies — app, cdn, cta, gov, www — were already in subdomains.txt). `raw/new-hosts-from-bodies.txt` empty.
- From TLS SANs: unknown. The MITM proxy prevents reading real SANs here; `raw/new-hosts-from-sans.txt` has the limitation note. Re-run from direct-TLS or via `crt.sh` JSON next session.
- From the Webflow sitemap on www.blockpit.io: only `www.blockpit.io` paths, no new subdomains.
- `help.blockpit.io` redirects out to `intercom.help/blockpit/en` (Intercom hosted; third-party help center page, not Blockpit infra).

## TLS summary

- Cannot be assessed from this container. Egress proxy MITMs, returning its own ~30-day certs for every host. No wildcard-cert observations possible, no issuer check possible, no cert-expiry warnings possible.
- Re-run from direct-TLS: expect Blockpit's edge to be Cloudflare's Universal SSL for CF-fronted hosts, Netlify-managed certs for Netlify hosts, and a Let's Encrypt / Sectigo cert on the two Kestrel API hosts and api-docs.cryptotax.io.
- `raw/tls-sans.txt` contains the full environment note.
