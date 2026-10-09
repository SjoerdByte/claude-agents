# anyday.io — surface map (provisional)
Date: 2026-10-09
Source: GitHub recon workflow (wf_3969a41b-69a, in flight) + passive DNS enumeration

This is a provisional consolidated map, pending the Harvest, Completeness and Synthesize stages of the GitHub workflow. The intermediate per-vector outputs it is based on are in `raw/` and `github/`.

## 1. Executive summary
- Anyday.io is a Danish BNPL ("Anyday Split") headquartered in Aarhus. Product is routed through Danish PSPs (Reepay, Frisbii, QuickPay, PensoPay) with Clearhaus as a common acquirer. Marqeta provides card issuing.
- Two public GitHub orgs: anyday-payments (3 merchant-side e-commerce plugins) and anyday-io (one deprecated marketing-site JS repo). No public API, backend, infra, mobile, admin-portal or CI/CD repos.
- The core production API lives at my.anyday.io/api/{v1|v2}; a parallel core-webapi is served by api.anyday.io and api2.anyday.io (same AWS ELB in eu-north-1).
- The strongest attack surface signals from GitHub recon are: (a) an "/api/*/internal/*" prefix that is reachable unauthenticated from the public website JS; (b) order-ID-scoped POST endpoints `/api/v1/orders/{id}/{capture|refund|cancel}` that are prime IDOR candidates; (c) a merchant-controllable `callbackUrl` field accepted by the order-create endpoint — a potential SSRF primitive against the anyday backend; (d) a wildcard CSP `*.anyday.io` baked into the Magento integration.
- The strongest signals from passive DNS are: (a) grafana.anyday.io CNAMEs to an explicitly "internal-" AWS ELB; (b) hangfire.services.internal.anyday.io and marqeta.services.anyday.io share Azure VM IP 51.104.136.9 (vhost confusion lateral); (c) localhost.anyday.io resolves publicly to 127.0.0.1 (cookie-tossing / origin-spoof surface); (d) staging Shopify runs in ap-southeast-1 (Singapore) while prod is in eu-north-1.

## 2. GitHub org & repo inventory

### 2.1 anyday-payments (Aarhus, Denmark, help@anyday.io, 3 public repos)
| Repo | Lang | Last push | Note |
|---|---|---|---|
| ANYDAY-Magento2 | PHP | 2022-10-31 | Richest surface — defines API host, auth URL, webhook contract, CSP whitelist |
| ANYDAY-WooCommerce | PHP | 2022-10-31 | Mirrors Magento integration; also handles /wp-json/anyday/webhook |
| ANYDAY-Magento1 | PHP | 2021-10-25 | Older/same product |

### 2.2 anyday-io (1 public repo)
| Repo | Lang | Last push | Note |
|---|---|---|---|
| website-js-deprecated | JavaScript | 2026-09-24 (touched recently) | Contains the `anydayAPI()` jQuery helper that calls `https://my.anyday.io/api/{version}/internal/{path}` **without any Authorization header** |

### 2.3 Non-first-party mirrors / integrations
- common-repository/anyday-woocommerce — WP.org mirror of the WooCommerce plugin (older commit history worth diffing)
- emadomedher/skyline-api-library — profiles/anyday-io/profile.json metadata (authType=api-key)
- iziibuy/iziibuynew, Kazi-Rayhan/mywebshop — expose `https://submit.anyday.io/iziibuy-kyc?pluginid=…` and `?shopid=…` patterns
- rix4uni/BugBountyData (passive DNS only)
- indonesia-timeline/brantas-judol (passive DNS only)
- thanhmcb/Shopify, AnodyneAps/BY, Budolfsen/Vin-huset, T-AIMaven/GreenMind — merchant Shopify themes embedding Anyday widget tokens

### 2.4 Identified humans
| Name | GitHub | Role | Location |
|---|---|---|---|
| Jonas Overgaard | — | CEO (jo@anyday.io) | Aarhus |
| Sani Huttunen | CKret | Head of Engineering | Chiang Mai |
| Nonon Nononpng | Nononpng | — | — |
| Mayur Kathale | mayurkathale | Magento/WooCommerce PHP contractor | Bangkok |
| Luke Golden | luke-golden | PR merger | — |
| Stefano Cicatiello | — | anyday-io org member | Bangkok |

Leaked contact emails observed: jo@anyday.io (CEO), onboarding@anyday.io, help@anyday.io.

## 3. Subdomain inventory

### 3.1 Live subdomains (DoH confirmed, 2026-10-09)
Full table in `passive/DNS-INVENTORY.md`. 39 confirmed-live subdomains, grouped:
- Core API (AWS eu-north-1): api, api2 (same ELB), connect, s.connect (mTLS), shopify.staging (ap-southeast-1!), s.shopify.staging (mTLS, Singapore!), metabase.internal, grafana (internal ELB)
- Admin/user portals (CloudFront, each env a separate distribution): admin, admin.sandbox, admin.staging, my, my.staging, portal, assets
- CDN: cdn (Azure Front Door)
- Services tier (Azure UK South, shared IP 51.104.136.9): hangfire.services.internal, marqeta.services
- SFTP: sftp.marqeta.services (Azure NE)
- Mail/webhooks (AWS API Gateway): webhooks, sendgrid
- Danish legacy hosting (shared IP 5.254.55.36): ftp, webmail, m
- Third-party SaaS CNAMEs: help (Elevio), developer (ReadMe), da (Weglot), email + email.staging (Customer.io), go (Brevo), qr (Dub), status (UptimeRobot), submit (Tally), www (Webflow)
- Oddities: localhost → 127.0.0.1 (public), ichnaea (Mozilla geo?), vpn (Azure)
- Legacy IP: sqlproxy-nordiska → 13.63.25.203 (Azure)

### 3.2 Scoped but dead (NXDOMAIN)
Entire `pay.anyday.io` namespace (16 hosts): admin.pay, admin.pay.sandbox, api.pay, api.pay.sandbox, apple-pay.pay, apple-pay.pay.sandbox, google-pay.pay, google-pay.pay.sandbox, merchant.pay, merchant.pay.sandbox, mobilepay.pay, mobilepay.pay.sandbox, tokens.pay, tokens.pay.sandbox, pay.anyday.io, pay.sandbox. Plus clearhaus-sync.services, posthog-dev, metabase-copy.internal, metabase-v2.internal, helpdesk, ftp.staging, localhost.staging, shop, staging, www.staging, www.shop.

Interpretation: either the entire pay.* namespace has been decommissioned, or it only resolves via split-horizon DNS (internal-only). Worth asking the program contact.

### 3.3 Candidates from subdomain.center (all NXDOMAIN; treat as hallucinations)
qa1-9.staging, admini.pay.sandbox, admino.pay, apiu, developerq, google-payy.pay.sandbox, hangfirea.services.internal, helpdeskg, metabasea.internal, sftpc.marqeta.services, web-dev, internal, sandbox, services, services.internal.

## 4. Endpoint inventory

Base host for the merchant portal + payment API is `my.anyday.io`. Every endpoint below is in-scope.

| Method | Path | Auth | Source | High-value pattern |
|---|---|---|---|---|
| POST | /api/v1/authentication/login | none | Magento2 ManagerInterface.php | Auth-token lifecycle test target |
| GET | /api/v1/webshop/mine | Bearer | Magento2 MerchantAuthentication → returns apiKey, testAPIKey, priceTagToken, privateKey | Credential-leak surface if token scope is wrong |
| POST | /api/v1/orders | Bearer | Magento2 UrlDataInterface | Accepts `callbackUrl` — SSRF primitive if unvalidated |
| POST | /api/v1/orders/{id}/capture | Bearer | same | **IDOR candidate** (object-ID in path) |
| POST | /api/v1/orders/{id}/refund | Bearer | same | **IDOR candidate** — monetary impact if cross-tenant |
| POST | /api/v1/orders/{id}/cancel | Bearer | WooCommerce adm-core.php | **IDOR candidate** |
| GET | /api/v1/orders?id={transaction} | Bearer | WooCommerce adm-core.php | — |
| GET | /api/v2/internal/shops | none | website-js events.js | Enumeration; PageSize up to 175; CategoryIds[] arrays |
| GET | /api/v1/internal/categories | none | same | Enumeration |
| GET | /api/v1/internal/categories/{uuid} | none | same | uuid read from `?cat-id=` URL param — SSRF/traversal candidate |
| GET | /webshopPriceTag/anyday-price-tag-{en\|da}-es2015.js | none | plugins | Static JS |
| GET | /price-widget/anyday-price-widget.js | none | plugins | Static JS (ES module) |

Additional hosts in scope:
- `https://submit.anyday.io/iziibuy-kyc?pluginid={key}` and `?shopid={id}` — KYC flow URL parameters; parameter tampering / IDOR into other merchants' KYC flow candidate
- `https://api.anyday.io` and `https://api2.anyday.io` — same AWS ELB `anyday-prd-backend-corewebapi-387709868.eu-north-1.elb.amazonaws.com`. The exact /api path shape is NOT visible in public GitHub, so endpoint discovery must come from browser traffic or docs on developer.anyday.io.

### Hardcoded production category UUIDs (from events.js)
```
7a418f22-85f1-4f6c-997e-7390dccf3229
9849bf3f-63d9-4305-8610-c1d87f258f5d
b722cea6-8fea-4870-a1e4-57b8a44e807d
8240993c-6dfc-42f0-98ba-dd0c4830990f
069c7108-fa76-48b0-aca3-61b751f2324e
2a9a6112-65b1-4d5f-a3f2-aec68b9075f4
66b92fdb-d6cf-4628-be21-7e0ef9479206
c71b7386-a61f-4388-aa13-7ea018599e2d
3cd1f971-b82d-4812-a8e9-f213e9a1bdf8
```

### Known per-merchant price-tag tokens (public widget tokens; known-non-finding, kept here for enumeration)
| Merchant | Token |
|---|---|
| sportyfit.dk | 4fb221f5d0c44b70aa96b54933f69a47 |
| number-nineshop.com | 7f281129bc204154884460e6d8519455 |
| shabes.dk | dcd170a788e84e088823a5682e48ad94 |
| vin-huset | 91624fa2e5c0439ba18dd0ced31eacb9 |

## 5. Tech stack
- Frontend: Angular (confirmed by `anyday-price-tag-{lang}-es2015.js` naming; also user-provided), jQuery (legacy marketing-site events.js), Webflow (www.anyday.io host), Weglot (translations)
- Backend WebAPI: unknown framework behind AWS ELB `anyday-prd-backend-corewebapi-*`. ELB name "corewebapi" is suggestive of ASP.NET Core.
- Background jobs: Hangfire (.NET) at hangfire.services.internal — default Hangfire dashboard route is `/hangfire`, often misconfigured
- BI: Metabase at metabase.internal (AWS ELB)
- Observability: Grafana at grafana.anyday.io (internal ELB), UptimeRobot public status page, PostHog (dev subdomain NXDOMAIN though)
- Email: Customer.io (email + email.staging), SendGrid (sendgrid.anyday.io → AWS API Gateway)
- Payments: Marqeta (card issuing), Clearhaus (acquirer), MobilePay / Apple Pay / Google Pay (wallet integrations; all pay.* subdomains currently NXDOMAIN)
- Shopify: Prod ALB in eu-north-1 (connect, s.connect mTLS), staging ALB in ap-southeast-1 (shopify.staging, s.shopify.staging mTLS)
- Help & docs: Elevio (help.anyday.io), ReadMe.io (developer.anyday.io)
- Forms: Tally (submit.anyday.io) — the iziibuy-kyc URLs route through this host
- Link shortener: Dub.co (qr.anyday.io)
- Marketing landing pages: Brevo/Sendinblue (go.anyday.io)
- CDN: Azure Front Door (cdn.anyday.io), AWS CloudFront (admin, my, portal, assets — seven independent distributions)
- DNS: Azure DNS (ns1-01.azure-dns.com, microsoft hostmaster)
- Legacy hosting: Simply.com-style Danish shared hosting at 5.254.55.36 (ftp, webmail, m)

## 6. Known non-findings observed
- Per-merchant price-widget tokens are intended to be public (embedded in HTML attributes of merchant pages); not reported.
- CSP wildcard `*.anyday.io` in Magento2 integration is merchant-side only; not an anyday-side issue.
- No GCP service accounts, no OAuth client-id (as opposed to secret) leaks surfaced.
- No AWS keys, no Stripe/Marqeta API keys, no SendGrid SG. keys surfaced in GitHub.
- No Firebase project IDs or web keys (anyday is on Azure DNS + AWS compute, no Firebase surface visible).

## 7. Top-10 attack-surface threads (ranked for exploit phase)

1. **IDOR on /api/v1/orders/{id}/{capture|refund|cancel}** — the single most reliable path to a critical finding per the project's rulebook. Requires two merchant accounts; test with your own order id, then with a neighboring/guessed id, authenticated as each merchant. CVSS target 7.5-9.0 depending on cross-tenant reach.
2. **Potential SSRF via `callbackUrl` on POST /api/v1/orders** — merchant-controlled URL that the anyday backend fetches when delivering webhooks. If unvalidated, point at `http://169.254.169.254/` (AWS metadata) or `http://localhost.anyday.io:*/` to hit anyday-internal services. CVSS target 8.0-10.0.
3. **grafana.anyday.io reachability test** — the DNS target string literally contains "internal-" yet is publicly resolvable. If the ALB accepts public traffic, check for Grafana auth bypasses (CVE-2024-9264 arbitrary-file-read; CVE-2022-32275 anonymous dashboard view). CVSS up to 9.0 on data exposure.
4. **Hangfire dashboard at hangfire.services.internal.anyday.io** — default route `/hangfire` often has weak or default auth; exposes job history, serialized args (sometimes containing secrets or PII), and allows triggering jobs. Also test Host-header swap to probe the `marqeta.services.anyday.io` vhost on the same IP.
5. **Unauthenticated /api/{v1|v2}/internal/*** — reachable without a token; enumerate parameters, try write methods (POST/PUT/DELETE), and test mass assignment on any write endpoint. Specifically test whether `?cat-id=<arbitrary>` passes through to the backend without validation.
6. **Auth-token lifecycle on POST /api/v1/authentication/login** — issue token, log out, confirm server-side invalidation (not just cookie clear). Issue new token, confirm old one dies. Check password-reset flow for same invalidation. CVSS up to 8.1 if a stolen token survives logout.
7. **GET /api/v1/webshop/mine credential dump** — returns apiKey, testAPIKey, priceTagToken, privateKey for the authenticated merchant. Test whether a Bearer token from merchant A can retrieve merchant B's record (direct IDOR) and whether PATCH/PUT is accepted here with role/tenant mass-assign fields.
8. **submit.anyday.io/iziibuy-kyc?pluginid= / ?shopid=** — IDOR into other merchants' KYC flow; also test for stored XSS if the KYC form reflects the query parameter.
9. **mTLS downgrade: connect.anyday.io vs s.connect.anyday.io** — the `s.` variant is mTLS; the non-s variant is not. Confirm the non-mTLS endpoint rejects requests meant for the mTLS one (and vice-versa). If accepted, auth-bypass possibilities on the Shopify-webhook ingress.
10. **CloudFront distribution direct-origin probing** — each of the seven CloudFront hostnames (d39z8786ntahj1, d1lxm0uigen8fw, dzypcfazatamw, d1i8wvrrwewg3y, d1nosqo28e2y07, d3re0a5qkg6u1h, d2dgwu29m9644q) can be probed directly for host-header validation, origin exposure via error pages, and cross-env serving (does admin.sandbox serve admin.staging content with a Host header swap?).

## 8. Pending workflow phases
The GitHub recon workflow is still running:
- Discover-Secrets (12 vectors)
- Deep-Read of the top 15 scored repos
- Harvest consolidation
- Completeness critic
- Synthesize into the final SURFACE-MAP.md

When those complete, their outputs will supersede sections 2, 4, and 5 of this document.
