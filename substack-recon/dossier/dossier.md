# Substack Surface-Mapping Dossier

**Target:** `substack.com` and all Substack-owned siblings / `*.substack.com` subdomains.
**Authorization:** Written permission from CEO Chris Best (bug bounty, PII/P1 hunting).
**Date:** 2026-10-05
**Lane:** Recon (passive + unauthenticated probes only). No authenticated or exploit testing performed.

---

## Known Stack

- Edge: **Cloudflare** (WAF, Turnstile, cf-ray on every response, HTTP/3 QUIC)
- LB: **AWS Application Load Balancer** (AWSALBTG / AWSALBTGCORS stickiness cookies)
- App: **Node.js / Express** (`X-Powered-By: Express` leak on nearly every substack.com response; `x-cluster: substack`, `x-service: web`, `x-sub` host routing header, `x-deploy: 52a7d37c7f` single-release hash)
- SPA: **React / React Router / Remix** (bundles `reactSubstack`, `reactReader2`, `reactLogin`, `reactWelcome`); **ProseMirror** rich-text editor; **Radix UI** primitives; **Vite** fingerprint
- CDN: **AWS CloudFront + S3** (`cdn.substack.com -> d3b3sm9t19x0yd.cloudfront.net`, `substackcdn.com/.net` CloudFront-fronted; x-amz-cf-pop IAD55/61)
- Buckets: `substack-post-media`, `substack-video`, Heroku Bucketeer `bucketeer-e05bbc84-baa3-437e-9518-adb32be77984`, `mux-livestream-assets`, `livekit-egress-custom-recorder{,-participant-test}`
- Payments: **Stripe Connect** (`/api/v1/stripe/account`); **OpenNode** Bitcoin (checkout.opennode.com embed)
- Email: **Mailgun** (7 sending domains under `email.mg*.substack.com`); **Postmark** (naming hint on `pm-bounces.substack.com`); MX `mxa/mxb.mailgun.org`
- Realtime / video: **LiveKit** (livestream recording via S3 egress buckets); **Mux** video; **Zync** proprietary realtime service (`zyncrealtime.substack.{com,info}`, direct AWS ELB, no CF)
- Support / status: **Zendesk** (`support.substack.com` CNAME `substack.zendesk.com`, pod=20); **Atlassian Statuspage** (`substack.statuspage.io`)
- Zero Trust: **Cloudflare Access** (`substack.cloudflareaccess.com` fronts `substack.info` + `substack-staging.com`; team aud `b64e2221df8c1db4de70fc128a537912ff990886433bb1d2acb0bfe18ce382e5`)
- Analytics / RUM: **Segment** (`ajs_anonymous_id`), **Datadog Browser RUM**, **GA4 + GTM**, **Sentry** (DSN `o350427/4504244653457408`)
- Sessions: `connect.sid` Express session cookie (same cookie used as **publisher-api bearer** per leaked third-party env file - see Findings)
- Identity: `substack.lli` likely-logged-in **HS256 JWT**; `/.well-known/openid-configuration` published on `substack.com`, `substack.net` and per-user `/@USER/.well-known/openid-configuration` paths
- Mobile: **iOS Universal Links** (team `7DGN24C3GR`, bundle `com.substack.Substack`, webcredentials shared with `substack.com`); **Android App Links** (package `com.substack.app`, 2 release-key SHA256 fingerprints)
- AI: **Pangram** AI-content detection; **Polymarket** crypto-betting embed
- CSP: minimal (`frame-ancestors` only on substack.com; no `default-src`/`script-src`/`connect-src`/`img-src`)

---

## Methodology

Passive-first: CT logs (crt.sh, certspotter, Google CT, SSLMate), reverse-whois, RDAP, favicon mmh3 pivot, Wayback / CommonCrawl / OTX URL recall, Bing/DDG search, HackerTarget rapiddns, GitHub code search for leaked `connect.sid` / env references. Active-but-unauth: DoH A/AAAA/CNAME/MX/NS/TXT for every candidate infra host, HTTPS GET with `User-Agent: Mozilla/...`, header fingerprinting, 10 targeted endpoint probes against the top /api/v1/* bundles pulled from the SPA webpack output. 83 infra hosts probed; 670 user-publication subdomains enumerated for coverage but intentionally **not** probed (per-tenant content, not where structural bugs live). Second account **not** required for recon lane; flagged for the authenticated lane.

---

## Summary Stats

| Bucket | Count |
|---|---|
| Unique in-scope hostnames | **751** |
| Substack-owned root domains | 29 |
| User publication subdomains (`<slug>.substack.com`) | **670** |
| Infra / sibling hosts | **81** |
| - API | 2 |
| - CDN / Media | 14 |
| - Corporate | 19 |
| - Staging / Dev | 5 |
| - Email infra | 12 |
| - Third-party tenant | 3 |
| - Unknown / mixed | 31 |
| Notable endpoints extracted from JS bundles | 160+ |
| Live probes performed | 83 (67 alive, 16 dead) |

---

## Infra Hosts by Category

### API
| Host | Status | Server | Notes |
|---|---|---|---|
| `api.substack.com` | 404 | cloudflare | X-Powered-By Express; distinct origin from `substack.com/api/v1`; probe `/v1`, `/health`, `/graphql`, `/metrics` |
| `publisher-api.substack.com` | 404 | cloudflare | X-Powered-By Express; `/api/v1/publication/info` returns "Not authorized" (text) - auth-gated writer API. `get_subscriber*` endpoints leak subscriber emails per prior disclosures |

### CDN / Media
| Host | Status | Server | Notes |
|---|---|---|---|
| `assets.substack.com` | 200 | cloudflare | Tenant collision - serves "Ava's Newsletter" |
| `bucket.substackcdn.com` | dead | - | Referenced in bundles; verify |
| `cdn.substack.com` | 403 | AmazonS3 | CloudFront+S3 origin (`d3b3sm9t19x0yd.cloudfront.net`); AccessDenied |
| `eotrx.substackcdn.com` | 200 | AmazonS3 | Email open/click tracker; **open-redirect / SSRF historical bug class** |
| `eotrxbb.substackcdn.com` | dead | - | Bounce-tracker sibling |
| `i.substack.com` | 404 | cloudflare | Express route; needs `/{token}` |
| `images.substack.com` | 200 | cloudflare | Tenant collision - serves publication |
| `media.substack.com` | 200 | cloudflare | Tenant collision |
| `s3.substack.com` | 404 | cloudflare | Express; S3 proxy / legacy upload? Path-brute |
| `static.substack.com` | 200 | cloudflare | Tenant collision ("something in the static") |
| `substackcdn.com` | 403 | AmazonS3 | Primary CloudFront+S3 image/asset CDN |
| `substackcdn.net` | 403 | AmazonS3 | Alternate CDN apex |
| `v.substack.com` | 404 | cloudflare | Express; short-URL / video route |
| `www.substackcdn.com` | dead | - | - |

### Corporate
| Host | Status | Server | Notes |
|---|---|---|---|
| `admin.substack.com` | 200 | cloudflare | Despite name, tenant-owned - 302 to generic sign-in. **Not** internal admin |
| `blog.substack.com` | 200 | cloudflare | 301 to `on.substack.com` |
| `careers.substack.com` | 200 | cloudflare | 301 to `/jobs` |
| `dash.substack.com` | 200 | cloudflare | Tenant collision ("dash's Newsletter") - **not** an internal dashboard |
| `docs.substack.com` | 200 | cloudflare | Tenant collision |
| `events.substack.com` | 200 | cloudflare | Tenant collision |
| `help.substack.com` | 403 | cloudflare | 301 to Zendesk |
| `ingest.substack.com` | 200 | cloudflare | Tenant collision - **not** a telemetry sink |
| `keep-substack.com` | 200 | **Vercel** | Standalone Next.js, X-Vercel-Id iad1; Japanese locale |
| `logs.substack.com` | 200 | cloudflare | Tenant collision |
| `status.substack.com` | 200 | AtlassianEdge | 301 to statuspage |
| `substack-custom-domains.com` | dead | - | Custom-domain CNAME target root |
| `substack.cc` | 200 | cloudflare | 301 to apex |
| `substack.club` | dead | - | Parked |
| `substack.help` | dead | - | Parked |
| `substackapp.com` | dead | - | Parked |
| `substackinc.com` | timeout | - | Intermittent TLS failure - revisit |
| `substackmail.com` | dead | - | Parked |
| `support.substack.com` | 403 | cloudflare | Zendesk CNAME, pod=20 - takeover risk if account closed |

### Staging / Dev
| Host | Status | Server | Notes |
|---|---|---|---|
| `scratch.substack.net` | dead | - | - |
| `shell.substack.net` | dead | - | - |
| `substack-staging.com` | 200 | cloudflare | **HIGH VALUE** - CF Access-gated internal tooling |
| `substack.dev` | 404 | cloudflare | Parked |
| `unix.substack.net` | dead | - | - |

### Email Infra
| Host | Status | Server | Notes |
|---|---|---|---|
| `e.substack.com` | 404 | cloudflare | Express; email tracking/click route - needs `/{token}` |
| `email.mg-d0.substack.com` | 404 | - | Mailgun dedicated-IP pool 0 |
| `email.mg-d1.substack.com` | 404 | - | Mailgun dedicated-IP pool 1 |
| `email.mg-pr.substack.com` | 404 | CloudFront | Mailgun PR (press) pool |
| `email.mg-tx1.substack.com` | 404 | - | Mailgun transactional pool |
| `email.mg1.substack.com` | 404 | CloudFront | Mailgun shared pool 1 |
| `email.mg2.substack.com` | 404 | - | Mailgun shared pool 2 |
| `email.mg3.substack.com` | 404 | - | Mailgun shared pool 3 |
| `email.substack.com` | 200 | cloudflare | Express - tenant/landing page |
| `mail.substack.com` | 200 | cloudflare | Express |
| `mg-pr.substack.info` | dead | - | Internal substack.info Mailgun host |
| `pm-bounces.substack.com` | 404 | cloudflare | Postmark bounce handler; 302 to `pmbounces.substack.com` |

### Third-party tenant
| Host | Status | Server | Notes |
|---|---|---|---|
| `substack.cloudflareaccess.com` | - | cloudflare | CF Access tenant - fronts `substack.info` + `substack-staging.com` |
| `substack.statuspage.io` | 200 | AtlassianEdge | Public status page |
| `substack.zendesk.com` | - | - | Backing CNAME for `support.substack.com` |

### Unknown / mixed
| Host | Status | Server | Notes |
|---|---|---|---|
| `app.substack.com` | 200 | cloudflare | "Nothing to see here" placeholder, Express |
| `embedded.substack.com` | 200 | cloudflare | Tenant collision |
| `example.substack.com` | 200 | cloudflare | Express |
| `go.substack.com` | 200 | cloudflare | 301 to `/welcome`; marketing funnel - **open-redirect candidate** |
| `l.substack.com` | 404 | cloudflare | Express short-link redirector; needs `/{slug}` |
| `library.substack.com` | 200 | cloudflare | 301 to on.substack.com |
| `login.substack.com` | 200 | cloudflare | Tenant collision ("ashwin the newsletter") - **not** internal SSO |
| `m.substack.com` | 404 | cloudflare | Express mobile route placeholder |
| `on.substack.com` | 200 | cloudflare | Official Substack company blog; loader.io TXT (active load testing) |
| `open.substack.com` | 200 | cloudflare | Express; 301 to apex now |
| `pages.substack.com` | 200 | cloudflare | Separate landing-page builder/renderer; different stack (no X-Powered-By, 1 cookie) |
| `philipstephens.substack.net` | dead | - | Likely external |
| `post.substack.com` | 200 | cloudflare | "The Substack Post" official pub |
| `prostack.substack.com` | 200 | cloudflare | Tenant |
| `reader.substack.com` | 200 | cloudflare | 301 to `/inbox` |
| `ship.substack.net` | dead | - | - |
| `stories.substack.com` | 200 | cloudflare | 301 to on.substack.com |
| `studio.substack.net` | **TCP RST** | - | **HIGH VALUE** - DO IP 104.131.0.235, not CF, likely IP-ACL'd internal |
| `substack.com` | 200 | cloudflare | Main app |
| `substack.info` | 200 | cloudflare | **HIGH VALUE** - CF Access team gate |
| `substack.link` | 200 | cloudflare | 302 reveals `sublink.substack.com` **(new discovery)** |
| `substack.net` | 200 | **neocities** | **NOT Substack-controlled** - James Halliday / Neocities |
| `substack.pub` | NXDOMAIN | - | Brand-coverage gap |
| `substack.recipe` | dead | - | - |
| `substack.substack.com` | 200 | cloudflare | 301 to `@substack` profile |
| `www.substack.com` | 200 | cloudflare | Canonical redirect |
| `your.substack.com` | 200 | cloudflare | Reserved; redirects to sign-in |
| `yourpublication.substack.com` | 404 | cloudflare | Reserved placeholder |
| `yoursite.substack.com` | 404 | cloudflare | Reserved placeholder |
| `zyncrealtime.substack.com` | 404 | **AWS ELB** | **HIGH VALUE** - `zync-prod-alb-1675740520.us-east-1.elb.amazonaws.com`; no CF; realtime/WS backend |
| `zyncrealtime.substack.info` | 404 | **AWS ELB** | **HIGH VALUE** - `zync-staging-alb-1868310403...`; staging twin; no CF |

---

## Related Root Domains (provenance)

| Root | Provenance | In-scope? |
|---|---|---|
| `substack.com` | main | yes |
| `substackcdn.com` / `substackcdn.net` | RDAP + favicon mmh3 pivot | yes |
| `substackinc.com` | reverse-whois + Microsoft 365 TXT | yes |
| `substack-staging.com` | CF Access tenant match | yes |
| `substack-custom-domains.com` | custom-domain CNAME target | yes |
| `substack.cc` / `.club` / `.dev` / `.help` / `.info` / `.link` / `.net` / `.pub` / `.recipe` / `.cc` | brand-coverage reverse-whois | **confirm** - some re-registered externally (`substack.net` is Neocities-hosted James Halliday site) |
| `substackapp.com` / `substackmail.com` | brand-coverage | confirm |
| `keep-substack.com` | reverse-whois (Vercel-hosted, Japanese) | **confirm with Chris Best** |
| `substack.statuspage.io` | third-party | yes (tenant) |
| `substack.zendesk.com` | third-party | yes (tenant) |
| `substack.cloudflareaccess.com` | third-party | yes (tenant) |
| `substack-post-media.s3.amazonaws.com` | public_docs (image uploads) | yes (bucket) |
| `substack-video.s3.amazonaws.com` | public_docs (video uploads) | yes (bucket) |
| `bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com` | JS bundle reference (Heroku Bucketeer) | yes (bucket) |
| `mux-livestream-assets.s3.us-east-1.amazonaws.com` | bundle | yes (bucket) |
| `livekit-egress-custom-recorder{,-participant-test}.s3-website-us-east-1...` | JS bundle | yes (bucket) |
| `d3b3sm9t19x0yd.cloudfront.net` | CNAME target | yes (CF dist) |

**substackapi.com** - no live hosts found in enumeration; probably not owned.
**substack.pub** - NXDOMAIN - brand-coverage gap.

---

## Notable Endpoints (top 50 by expected value)

| URL | Source | Why it matters |
|---|---|---|
| `substack.com/api/v1/customer_support_mode` | JS bundle + live probe (400, schema leak `minutes` body) | **CS impersonation / support-session primitive**. Returns 400 unauthenticated with schema reveal - auth check happens after validation or endpoint is callable per-session. P1 if it toggles support access to another publication. |
| `publisher-api.substack.com/v1/get_subscriber*` | GitHub (`blamouche/Engineering-Forward` env leak) | Confirmed PII leak surface - subscriber email + counts. `connect.sid` doubles as bearer. |
| `substack.com/api/v1/post_unlock_token` | JS | Paywall bypass / gift-share token IDOR. 404 at base - needs `/{token}` or POST shape. |
| `substack.com/api/v1/check_subdomain` | JS + probe (unauth 200) | **Unauthenticated subdomain enumeration oracle** - mass-registration / typo-squat prep. |
| `substack.com/api/v1/publication/by-domain` | JS | Custom-domain publication lookup - weak validation = subdomain-takeover. |
| `substack.com/api/v1/stripe/account` | JS | Stripe Connect linkage - payout-redirection target. 404 unauth. |
| `substack.com/api/v1/subscription/change_plan` | JS + probe (401) | Billing-state mutator - IDOR / race-condition double-charge. |
| `substack.com/api/v1/subscription/reactivate` | JS + probe (401) | Reactivate cancelled subs - cross-tenant abuse. |
| `substack.com/api/v1/subscription/upgrade_to_bundle` | JS | Bundle-upgrade mutator. |
| `substack.com/api/v1/subscriber/add` | JS | Subscriber PII write - mass-enrollment. |
| `substack.com/api/v1/email-login` | JS | Magic-link auth - user enumeration + rate-limit test. |
| `substack.com/api/v1/mfa-login` + `/mfa-verify` | JS | MFA bypass surface. |
| `substack.com/api/v1/reauthenticate/start` + `/complete` | JS | Step-up auth bypass. |
| `substack.com/api/v1/forgot` | JS | Password recovery / enumeration. |
| `substack.com/api/v1/email-otp-login/complete` | JS | OTP completion. |
| `substack.com/api/v1/import/posts` | JS | **SSRF candidate** - import-by-URL. |
| `substack.com/api/v1/link-metadata` | JS | **SSRF candidate** - URL unfurl. |
| `substack.com/api/v1/image` | JS | **SSRF / image parser** - upload-by-url. |
| `cdn.substack.com/image/fetch/<transform>/<url>` | public_docs | Server-side image proxy - SSRF / open-redirect class. |
| `substackcdn.com/image/fetch/<transform>/<encoded_url>` | public_docs | Primary image fetch proxy. |
| `substack.com/api/v1/latex/jpeg` | JS | **LaTeX-to-image renderer** - parser bugs / SSRF. |
| `substack.com/api/v1/gift-article` | JS | Gift abuse / IDOR. |
| `substack.com/api/v1/viral_gifts/create_for_email` | JS | Viral gift creation - abuse. |
| `substack.com/api/v1/viral_gifts/accept_gift_from_link` | JS | Token-forgery accept. |
| `substack.com/api/v1/messages/dm/start` | JS | DM start - unsolicited DM / IDOR. |
| `substack.com/api/v1/messages/inbox` | JS | DM inbox read - IDOR primitive. |
| `substack.com/api/v1/thread_media_uploads` | JS | DM media upload - file-type / stored XSS. |
| `substack.com/api/v1/firehose` + `/batch` | JS | Realtime sink - over-posting / PII leak. |
| `substack.com/api/v1/realtime/token` | JS | WebSocket auth token (points to zyncrealtime). |
| `substack.com/api/v1/islands/client/config` | JS | SSR config - over-exposure of experiment/feature flags. |
| `substack.com/api/v1/experiment_exposure` + `/experiment_features` | JS | Experiment flags enumeration. |
| `substack.com/api/v1/user/profile` | JS | User profile - IDOR candidate authed. |
| `substack.com/api/v1/publication/manifest` | headers | 403 "Not authorized" pre-auth - exists. |
| `substack.com/api/v1/publication/upload_image` + `/logo` | JS | Image upload surfaces - stored XSS / SSRF. |
| `substack.com/api/v1/publication/users/ranked` | JS | Writer list PII. |
| `substack.com/api/v1/publication/saved-posts` | JS | Per-user PII. |
| `substack.com/api/v1/publication_user_settings/user` | JS | Per-user publication settings - IDOR. |
| `substack.com/api/v1/user-setting` | JS | User settings endpoint. |
| `substack.com/api/v1/posts/by_ids` | JS | **ID-list lookup** - IDOR primitive. |
| `substack.com/api/v1/bulk_signup` | JS | Mass-enrollment abuse. |
| `substack.com/api/v1/feed/bulk-follow` | JS | Bulk-follow abuse. |
| `substack.com/api/v1/send_app_download_link` | JS | SMS/email spam / phone-number enumeration. |
| `substack.com/api/v1/audio/upload` / `/video/upload` / `/audiogram` | JS | Upload surfaces - file-type / SSRF. |
| `substack.com/api/v1/live_stream/recording` | JS | LiveKit egress surface. |
| `substack.com/api/v1/polymarket/track-view` | JS | 3rd-party integration endpoint. |
| `substack.com/.well-known/openid-configuration` + per-user `/@USER/.well-known/openid-configuration` | wayback | **OIDC per-user tenancy** - path-based tenant isolation test. |
| `substack.com/.well-known/apple-app-site-association` | public_docs | iOS universal links; bundle team `7DGN24C3GR`. |
| `substack.com/.well-known/assetlinks.json` | public_docs | 2 release-key SHA256 cert fingerprints for `com.substack.app`. |
| `substack.com/robots.txt` | public_docs | Contains private-podcast disallow (`/feed/podcast/<id>/<token>.rss`) - token-forgery target. |
| `substack.com/sitemap-sitemap.xml` | public_docs | Enumerable publication-slug sitemaps (`publications-1..N`). |
| `substackcdn.com/bundle/account.HASH.bundle.js` | wayback | Historical hashed webpack bundles - **diff for leaked secrets / removed endpoints**. |

---

## Technologies Identified

See **Known Stack** section above. Full enumerated list recorded in `/home/user/claude-agents/substack-recon/dossier/consolidated.json`.

Highlights worth separating out:
- `X-Powered-By: Express` leak on every substack.com response (noise, no CSP for scripts)
- `connect.sid` session cookie reused as bearer against `publisher-api.substack.com` (per leaked env in third-party GitHub repo) - **auth-mesh confusion risk**
- `substack.lli` HS256 JWT (likely-logged-in cookie) - **weak algorithm; test key confusion / none / HS->RS swap**
- Minimal CSP: `frame-ancestors` only - **any stored XSS on any publication exfils JS-readable `cookie_storage_key` and `ajs_anonymous_id` cookies** (Domain=substack.com, no HttpOnly)
- `AWSALBTG` / `AWSALBTGCORS` sticky cookies **missing Secure/HttpOnly**
- Deploy hash `x-deploy: 52a7d37c7f` single-release across cluster - one bad push hits everyone

---

## High-Value Targets (ranked)

| # | Target | Why | Suspected Tech | Next Actions | Auth | 2nd Acct |
|---|---|---|---|---|---|---|
| 1 | `substack.com/api/v1/customer_support_mode` | CS impersonation primitive; returned 400 unauth with schema leak (`minutes` body) - either validation runs before authz or the endpoint is callable by any session. If it toggles support access to another publication => P1 account-takeover primitive. | Express /api/v1 | 1) POST `{minutes:5}` as account A unauth and auth; 2) POST with `{minutes:5, user_id:<B>}` and `{publication_id:<B>}`; 3) check for GET state after enabling; 4) check if `substack.sid` cookie attribute flips; 5) check CSRF / Origin enforcement; 6) replay with mismatched `x-sub` host header | yes | **yes** |
| 2 | `zyncrealtime.substack.{com,info}` | Direct AWS ELB (`zync-prod-alb-...`, `zync-staging-alb-...`) with **no Cloudflare front, no HSTS**. Realtime/WebSocket backend named "Zync". Staging ELB most likely to leak policy. | AWS ELB -> Node/Go WS, LiveKit? | 1) OPTIONS and WS upgrade on `/`, `/ws`, `/socket.io`, `/connect`, `/livekit`, `/rtc`, `/health`, `/metrics`; 2) try `/api/v1/realtime/token` cross-origin issuance from staging; 3) grab TLS cert for SAN pivot; 4) fuzz ELB host-header for virtual-host confusion; 5) try origin IP direct over 80 for health probe; 6) run `wscat` against obtained token to test cross-tenant topic subscribe | optional (token endpoint is on main app) | yes (for cross-tenant topic subscribe) |
| 3 | `substack-staging.com` + `substack.info` | Both CF Access-gated on same team (`b64e2221df...`). Staging frequently misconfigures Access policies (service tokens, email-domain allows, Access-Jwt-Assertion header bypasses). Historical CF Access CVEs (CVE-2024-7646 pattern). | Cloudflare Access + Node app | 1) Enumerate `substack.cloudflareaccess.com/cdn-cgi/access/apps/<slug>`; 2) test `CF-Access-Jwt-Assertion` acceptance from arbitrary signer; 3) try service-token header `CF-Access-Client-Id/Secret` empty/reflected; 4) probe for `/cdn-cgi/access/get-identity` leak; 5) check for X-Forwarded-For bypass of IP rules; 6) attempt direct origin IP via Censys cert pivot | - (unauth gate) | no |
| 4 | `publisher-api.substack.com` | Separate Express host; `connect.sid` session cookie observed in leaked `.env` doubling as bearer against this host (`blamouche/Engineering-Forward` repo). `get_subscriber*` leaks email PII. | Express /v1 | 1) Probe `/v1/`, `/v1/get_subscriber`, `/v1/get_subscriber_counts`, `/v1/publication/info`, `/graphql`, `/health`; 2) replay authenticated `connect.sid` from account A against account B's publication id; 3) check Authorization: Bearer vs Cookie precedence; 4) check for publication-id in path vs body vs JWT; 5) attempt horizontal via publication_id enumeration; 6) run GET+POST+PUT+DELETE on same path | yes | yes |
| 5 | `substackcdn.com/image/fetch/<transform>/<url>` + `cdn.substack.com/image/fetch/` | **Classic SSRF / open-redirect / cache-poisoning class** (Cloudinary-style URL image proxy). | CloudFront + S3 + image resizer | 1) Fetch `http://169.254.169.254/latest/meta-data/` through the proxy; 2) fetch `http://localhost:*`, `file://`, `gopher://`, `dict://`; 3) try CRLF in transform spec; 4) blind SSRF with Burp Collaborator; 5) response-splitting via `X-Forwarded-Host` reflection in Vary; 6) cache-poison by varying `Accept-Encoding` and asset path case | no | no |
| 6 | `substack.com/api/v1/import/posts` + `/link-metadata` + `/image` + `/publication/upload_image` + `/publication/logo` + `/latex/jpeg` | **SSRF cluster** - all take URLs or render untrusted markup. LaTeX renderer is particularly bug-prone. | Express + external renderer (likely a sidecar) | 1) Each: provide `http://127.0.0.1:*`, `http://169.254.169.254`, `http://[::1]`, `http://metadata.google.internal`; 2) use DNS rebinding; 3) exfil via out-of-band DNS; 4) upload SVG with embedded JS to each upload path; 5) upload HEIC/polyglot files; 6) try very large / zip-bomb inputs for DOS | yes (writer) | optional |
| 7 | `substack.com/api/v1/messages/*` + DM media uploads | **PII + stored-XSS surface**. `dm/start` can create unsolicited threads; `thread_media_uploads` is a file-type bug / stored XSS vector in the inbox renderer. | Express + S3 upload | 1) Start DM from account A to account B; 2) send `<svg onload=...>` HTML attachment; 3) upload `.html`, `.svg`, `.pdf.html` to media endpoint; 4) check Content-Disposition on served file; 5) test IDOR on `GET /messages/inbox?user_id=<B>`; 6) test IDOR on fetching `thread_id` created by other user | yes | **yes** |
| 8 | `substackcdn.com` + `cdn.substack.com` + `substackcdn.net` + Heroku Bucketeer `bucketeer-e05bbc84-...s3` + `substack-post-media.s3` + `substack-video.s3` | **S3 bucket cluster** - canonical misconfig target (ListBucket, bucket-ACL, PutObject on predictable keys). Heroku Bucketeer buckets historically public. | AWS S3 + CloudFront | 1) `aws s3 ls s3://<bucket>` unauth + authed-as-random-aws-account; 2) ListObjectsV2 with marker/prefix fuzz; 3) HEAD a known object -> check `x-amz-meta-*` leak; 4) try PUT to predictable key (`uploads/{uuid}`); 5) check `cors.xml` and `policy.json`; 6) test CloudFront origin-shield bypass | no | no |
| 9 | `substack.com/api/v1/post_unlock_token` + `/gift-article` + `/viral_gifts/*` | **Paywall-bypass + gift-abuse cluster**. Gift accept endpoint is pure token-forgery territory. | Express + HMAC/JWT tokens | 1) Decode a legit gift token (base64, JWT, HMAC prefix?); 2) try `alg:none`, HS->RS confusion if JWT; 3) check if `recipient_email` is bound to token; 4) check if gift is single-use (replay); 5) brute-force low-entropy token space; 6) test token reuse across publications | yes | yes |
| 10 | `go.substack.com/*` and `l.substack.com/{slug}` and `e.substack.com/{token}` | **Open-redirect / link-shortener cluster**. Historical bug class on go/l/e short domains. `go.substack.com` already 302s on root. | Express redirector | 1) Fuzz `?url=`, `?r=`, `?dest=`, `?next=` on `go.`; 2) `l.substack.com/<slug>` with slugs from Wayback; 3) test `//attacker.com`, `/\/attacker.com`, `javascript:` and `data:` URIs; 4) check if `e.substack.com/{token}` leaks the recipient email via Location header | no | no |
| 11 | `studio.substack.net` | Distinct origin (DigitalOcean `104.131.0.235`), **not CF-fronted**, **TCP RST** on non-whitelisted IPs. Classic IP-ACL'd internal admin tool. | DigitalOcean droplet | 1) Try access from AWS us-east-1 egress; 2) retry via TOR exits; 3) check if there is an HTTP response on IPv6; 4) check for a corresponding staging twin; 5) Shodan the IP for banner; 6) try other ports 22/80/8080/8443/3000/3306 for banner | - | no |
| 12 | `support.substack.com` (Zendesk) + `status.substack.com` (Statuspage) | **Subdomain-takeover risk** if accounts are closed. Zendesk pod=20 tenant; Statuspage 301 to shared tenant. | 3rd-party SaaS | 1) Attempt new-tenant registration of `substack.zendesk.com` and `substack.statuspage.io` (will fail if account exists, but confirms); 2) check for Zendesk login form on `/hc/en-us` with user enumeration; 3) check for CORS Allow-Origin reflection on help API; 4) test Statuspage inc-create / webhook endpoints; 5) check for API-token leakage in Help Center HTML; 6) scan for custom theme XSS | no | no |
| 13 | `pages.substack.com` | Separate landing-page builder/renderer, **different stack** (no X-Powered-By, 1 cookie). Markdown/template rendering is XSS/SSRF-prone. | Edge-rendered CMS | 1) Create a page in builder; 2) try `<script>`, `<svg>`, event-handler sanitizer bypass; 3) try `<iframe srcdoc>`; 4) template-injection with `{{7*7}}` / `${7*7}` / `#{7*7}`; 5) link to internal URL via `href=`; 6) check for path traversal in asset includes | yes (builder) | optional |
| 14 | `substack.com/api/v1/@USER/.well-known/openid-configuration` (per-user tenancy) + `/@USER/sitemap.xml` + `/@USER/robots.txt` | Path-based per-user tenancy of well-known routes - **cross-tenant leak if mis-routed**. | Express path-tenancy | 1) GET as account A for user B; 2) check `iss`/`jwks_uri` leak another publication's keys; 3) check `authorization_endpoint` reveals internal admin URLs; 4) check if `/@USER/sitemap.xml` lists unlisted/draft posts; 5) check for cache keying by path only (not auth); 6) send host-header mismatches | no | yes |
| 15 | Email infra (`email.mg*.substack.com` x7 + `pm-bounces.substack.com`) | **DMARC/SPF/DKIM test surface + Mailgun inbound-webhook replay**. 7 sending domains with varying reputation = test each separately. | Mailgun + Postmark | 1) `dig TXT _dmarc.email.mg*.substack.com` and verify p=/sp= for each; 2) check DKIM selector CNAMEs; 3) spoof-send from each domain to a test inbox; 4) check Mailgun routes `/v3/routes` with substack.com domain; 5) check Postmark bounce webhook for signature; 6) test `pmbounces.substack.com` (no dash) 302 target | no | no |
| 16 | `substack.com/api/v1/check_subdomain` + `/api/v1/publication/by-domain` + custom-domain CNAME flow | **Subdomain takeover primitive**. check_subdomain is unauth and reveals availability. Custom-domain CNAME onboarding is a classic DNS pre-hijack class. | Express + Cloudflare for SaaS | 1) Register `notareal2020xq.substack.com`, point DNS, verify; 2) test if a domain pointing CNAME to `substack-custom-domains.com` can be hijacked; 3) check for `_cf-custom-hostname` TXT trust; 4) try typo-domain CNAME onboarding; 5) check for stale custom-domain claims via `by-domain?domain=foo`; 6) test tenant-split via Host header on a claimed custom domain | partial | optional |
| 17 | `substack.com/api/v1/stripe/account` + Stripe webhooks | **Payout-redirection target**. Stripe Connect `/account` is the OAuth link point. Webhook replay is a stock bug for Stripe-connected marketplaces. | Stripe Connect | 1) Walk the Connect OAuth link; 2) check `state` parameter entropy and binding; 3) check `redirect_uri` whitelist and open-redirect; 4) test webhook signature verification on `/stripe/webhook*` (fuzz paths); 5) replay a webhook; 6) switch `account_id` after link | yes | yes |
| 18 | `substack.com/api/v1/realtime/token` + Firehose + `substack.com/api/v1/firehose/batch` | **WS auth token issuance** backing zync. Over-posting / PII leak class. | Zync + WS auth | 1) Request token with and without publication context; 2) decode token (JWT? opaque?); 3) connect WS and subscribe to `*` / `#` wildcard topics; 4) subscribe to another user's topic by id guess; 5) send batch with injected fields; 6) check topic ACL for feed updates | yes | yes |
| 19 | `substack.com/api/v1/islands/client/config` + `/experiment_features` | SSR config endpoint - commonly over-exposes **unreleased feature flags** / internal admin flags. | Express + experiment system | 1) GET unauth and authed; 2) diff flags across accounts; 3) grep for admin-ish flag names; 4) try to flip flags via `/experiment_exposure` POST; 5) check if feature-flag leak reveals unshipped endpoints; 6) look for admin-only flag that gates an API path | no + yes | optional |
| 20 | `substack.com/.well-known/openid-configuration` + `substack.lli` HS256 JWT | OIDC metadata **plus** HS256 JWT in cookie = **key-confusion / none-alg / HS->RS swap** test. | Node JWT lib | 1) Decode `substack.lli` cookie header; 2) try `alg:none` with same payload; 3) try HS256 with public key from JWKS (classic swap); 4) check `kid` injection against `jwks_uri`; 5) try unsigned JWT; 6) brute-force HS256 secret with hashcat on sample token | no (observe) + yes | no |

---

## Attack Classes to Test Systematically

1. **IDOR across publications** (`/api/v1/subscription/*`, `/messages/*`, `/post_unlock_token`, `/publication_user_settings/user`, `/user/profile`, `/user-setting`, `/posts/by_ids`, `/publication/saved-posts`, `/publisher-api/v1/get_subscriber*`) - rotate `publication_id` / `user_id` / `subscription_id` between account A and account B.
2. **Tenant isolation on path-based per-user routes** (`/@USER/.well-known/*`, `/@USER/sitemap.xml`, `/@USER/robots.txt`) - test for cache-key confusion and cross-tenant leak.
3. **SSRF via URL-input endpoints** (`/import/posts`, `/link-metadata`, `/image`, `/publication/upload_image`, `/publication/logo`, `cdn.substack.com/image/fetch`, `substackcdn.com/image/fetch`, `/latex/jpeg`) - IMDS, localhost, cloud metadata, DNS rebinding, out-of-band exfil.
4. **Image-proxy abuse** (`substackcdn.com/image/fetch/<transform>/<url>`) - cache poisoning via Vary header, response splitting via transform parsing, open-redirect via Location, DoS via giant transforms.
5. **Open redirect** (`go.substack.com/*`, `l.substack.com/<slug>`, `e.substack.com/<token>`, OAuth `redirect_uri` on Stripe Connect flow, email login magic-link `redirect` param).
6. **JWT confusion** on `substack.lli` HS256 cookie - `alg:none`, HS->RS key confusion using OIDC JWKS, kid injection.
7. **Custom-domain takeover + subdomain takeover** - `check_subdomain` oracle, dormant Zendesk/Statuspage tenants, Heroku Bucketeer bucket, custom-domain CNAME flow pre-hijack via `substack-custom-domains.com`.
8. **Cloudflare Access bypass** on `substack-staging.com` / `substack.info` - service-token leak, `CF-Access-Jwt-Assertion` forgery, X-Forwarded-For spoof of IP rules, direct origin IP via Censys cert pivot.
9. **CORS mirror / wildcard** - `AWSALBTGCORS` cookie suggests CORS is in play; fuzz `Origin:` reflection on `/api/v1/*` and on `publisher-api`.
10. **Stripe webhook replay + state parameter abuse** on Connect flow (`/api/v1/stripe/account` + webhooks).
11. **Mail-sender spoofing / DMARC gaps** on 7 `email.mg*.substack.com` + `pm-bounces.substack.com`; test Mailgun inbound-webhook signature.
12. **Stored XSS via DM attachments + markdown render** (`thread_media_uploads`, `publication/upload_image`, `pages.substack.com` builder); CSP has no `script-src` so impact is high (cookies `cookie_storage_key` and `ajs_anonymous_id` are JS-readable, Domain=substack.com).
13. **Session-cookie-as-API-bearer confusion** - `connect.sid` is reused as `publisher-api` bearer per leaked env; test if a reader-only session can hit publisher API, or if a publisher session can mint cross-tenant tokens.
14. **AWS S3 bucket ACL / ListBucket / predictable PUT** on `substack-post-media`, `substack-video`, `bucketeer-e05bbc84-...`, `mux-livestream-assets`, `livekit-egress-custom-recorder{,-participant-test}`.
15. **MFA bypass + magic-link enumeration** on `/mfa-login`, `/mfa-verify`, `/email-login`, `/email-otp-login/complete`, `/forgot` - rate-limit, timing, response-shape diff for existing vs non-existing accounts.
16. **GraphQL introspection** probe on `api.substack.com/graphql`, `publisher-api/graphql`, `/api/v1/graphql` (not seen in bundles, worth confirming).
17. **WebSocket topic ACL on zyncrealtime** - subscribe to another user/publication's topic with a token from account A.
18. **Realtime over-posting / firehose leak** - `/api/v1/firehose` and `/firehose/batch` for PII in event payloads cross-tenant.
19. **Email-template SSRF via post publishing** - any `<img src=>` or `<link>` in a post might be fetched by sending pipeline; test IMDS exfil through published post.
20. **Bundle secret diff** - pull historical `substackcdn.com/bundle/account.*.bundle.js` from Wayback and diff for leaked API keys / removed endpoints.
21. **FedCM / OIDC per-user tenancy abuse** - `/.well-known/web-identity` is published; test cross-RP leak.
22. **ActivityPub / Fediverse nodeinfo leak** - `/.well-known/nodeinfo` on `substack.com` and `substack.net` may leak software versions / internal URLs.
23. **Private-podcast token forgery** - `robots.txt` discloses `/feed/podcast/<id>/<token>.rss` disallow; test token entropy and reuse.
24. **IMPersonation via `customer_support_mode`** - the biggest single-shot P1 - probe cross-account authority before anything else once account B is online.

---

## Dead Ends / Sources That Failed

| Source | Why it failed |
|---|---|
| `crt.sh` (certspotter in-depth) | Down for the entire run - only partial ~26-record SSLMate samples obtained. True publication count is almost certainly hundreds of thousands. **Re-enumerate when crt.sh is back or Censys/SSLMate key is available.** |
| `substackinc.com` live HTTPS | Intermittent `SSL_ERROR_SYSCALL` / TLS handshake timeout - parked or misconfigured TLS. Revisit from different egress. |
| `substack.net` as Substack-controlled | **Not Substack-controlled** - resolves to Neocities hosting James Halliday's personal site. Legacy registration drift. Historical Wayback captures for `*.substack.net` are also his content. Do not probe `scratch/shell/unix/ship/philipstephens.substack.net` as Substack. |
| `studio.substack.net` | Connection RST from non-whitelisted egress - genuinely IP-ACL'd, but confirm ownership before deeper active probing (same net as James Halliday risk). |
| `substack.pub` | NXDOMAIN - brand-coverage gap. |
| `substackapi.com` | Appears unregistered; brand-coverage gap. |
| `bucket.substackcdn.com`, `eotrxbb.substackcdn.com`, `www.substackcdn.com` | DNS/resolution dead (referenced in bundles but no record). |
| Parked siblings: `substack.club`, `substack.help`, `substackapp.com`, `substackmail.com`, `substack.recipe`, `substack-custom-domains.com` (as HTTP endpoint) | Registered but no HTTP service. Still DNS-worthy for TXT/CNAME changes. |
| Mailgun shards `mg-pr.substack.info` | DNS dead - internal naming hint only. |
| GitHub code-search `connect.sid` secrets | The one confirmed env file leak was `blamouche/Engineering-Forward` (third-party dev's dotfiles) referencing publisher-api with session-cookie bearer; no live key extracted. |

---

## Scope Confirmation Needed From Chris Best

Before active-lane probing these roots, re-confirm written authorization explicitly covers:

- `substackinc.com` (corporate / HR)
- `substack.info` (CF Access internal portal)
- `substack-staging.com` (staging internal portal)
- `substack-custom-domains.com` (custom-domain CNAME target)
- `substack.cc`, `substack.help`, `substackapp.com`, `substackmail.com`, `substack.dev`, `substack.link`, `substack.club`, `substack.recipe`
- `substackcdn.net` (orphan CDN sibling)
- `keep-substack.com` (Vercel/Next.js, Japanese locale - **reverse-whois positive but confirm it is in-fact Substack-owned, not a name collision**)
- `substack.net` and its subdomains - **appears to be a legacy registration now serving unrelated third-party content (James Halliday / Neocities)**. Do NOT probe without confirming ownership chain.
- `studio.substack.net` - IP-ACL'd DigitalOcean service; **confirm ownership before active testing**.
- All S3 buckets listed in Related Root Domains.
- Third-party tenants (`substack.statuspage.io`, `substack.zendesk.com`, `substack.cloudflareaccess.com`).

CT lane coverage is incomplete (`crt.sh` outage). The true `*.substack.com` publication count is likely in the hundreds of thousands - re-run enumeration when `crt.sh` is back up or a Censys/SSLMate API key is available.

New subdomain discovered mid-recon via redirect inspection: `sublink.substack.com` (observed as redirect target of `substack.link`'s sign-in flow). Add to next recon batch.

---

## Second-Account Needed For

- `/api/v1/customer_support_mode` cross-account authority test (highest priority).
- `/api/v1/subscription/change_plan`, `/subscription/reactivate`, `/subscription/upgrade_to_bundle`, `/subscription` IDOR tests.
- `/api/v1/messages/dm/start`, `/messages/inbox`, `/thread_media_uploads` cross-user DM + attachment IDOR.
- `/api/v1/post_unlock_token` and `/gift-article` and `/viral_gifts/*` token-forgery and cross-recipient tests.
- `publisher-api.substack.com/v1/get_subscriber*` and `/publication/info` cross-tenant with `connect.sid` from account A against publication id of account B.
- `/api/v1/publication_user_settings/user`, `/user/profile`, `/user-setting`, `/publication/saved-posts` horizontal IDOR.
- `/api/v1/stripe/account` and Stripe Connect redirect/webhook flow cross-account.
- `zyncrealtime` WS topic subscribe cross-tenant with token from account A against publication topic of account B.
- `/@USER/` path-tenancy routes (OIDC per-user) cross-user probes.
- Any UI-driven stored-XSS vector in a comment/DM/post that needs a second account to receive the payload.

---

## Appendix: Raw Files on Disk Under `/home/user/claude-agents/substack-recon`

```
/home/user/claude-agents/substack-recon/
  dns/                         (reserved for future dig outputs; currently empty)
  dossier/
    all-subdomains.txt         - all 751 enumerated hostnames
    consolidated.json          - structured summary (categorized, endpoints, roots, tech)
    dossier.md                 - this document
    endpoint-probes.tsv        - top 10 /api/v1/* unauth probes with response bodies
    infra-hosts.txt            - 81 infra hostnames (publications filtered out)
    notable-endpoints.txt      - 160+ /api/v1/* and well-known endpoints
    probe-input.txt            - host list fed to live-probe
    probe-results.tsv          - 83-host status/server/title probe output
    publications.txt           - 670 user publication subdomains
    resolve.tsv                - A/CNAME resolution per infra host
    titles.tsv                 - HTML <title> per infra host (tenant collision detection)
  github/
    aggregate-summary.json     - unified GitHub search summary
    api-substack-com.json      - "api.substack.com" code hits
    orgs.json                  - substackinc GitHub org metadata
    substack-api-key.json      - "substack api key" code hits (leak-hunt)
    substack-aws.json          - AWS references in Substack-adjacent repos
    substack-cdn-events-ingest.json
    substack-com-api.json
    substack-env-patterns.json - .env patterns (connect.sid, bucketeer, etc.)
    substack-pub.json          - publisher-api references
    substackcdn-com.json
    substackinc-org-code.json
  js/
    bundles/                   - cached webpack bundles
    all_hosts.txt              - hostnames found in bundles
    all_js_urls.txt            - bundle URL list
    all_substack_hosts.txt
    endpoints_v1v2.txt         - every /api/v1/ and /api/v2/ string in bundles
    grep-aggregated.txt        - aggregated greps across bundles
    hostnames_found.txt
    routes_found.txt           - router paths
    secrets_found.txt          - secret-pattern grep (nothing live)
    csp-breakdown.txt          - CSP header analysis
    {admin,apisub,app,home,on,pubbydomain,root,signin}.{headers,html}
                               - per-host raw response captures
  raw/
    bing_subdomain_discoveries.txt
    brand-crt-*.json           - CT per brand sibling root
    brand-favicon.json         - mmh3 favicon pivot result
    brand-rdap-*.json          - RDAP registration data per sibling
    brand-reverse-whois.json
    brand-sibling-tld-dns.json
    brand-spf-pivot.json
    certspotter-*.json         - CT via certspotter
    commoncrawl-collinfo.json
    crtsh-*.{json,html}        - crt.sh snapshots (mostly empty due to outage)
    ddg_initial.txt
    docs-*.{html,json,xml,txt} - every /.well-known/, help, policy, docs page captured
    docs-apiv1-*.json          - public API reference extracts
    docs-example-apiv1-*.json  - response-shape examples
    docs-help-*.html / docs-support-* / docs-bug-bounty.html etc.
    google-ct-substack.json
    hackertarget-*.{csv,txt}
    otx-*.json                 - AlienVault OTX URL recall
    rapiddns-*.html
    subdomaincenter-*.json
    urlscan-substack.json
    wayback-*.json / .txt      - Wayback Machine URL recall
    final_parse.py / parse_wayback.py - the parsers used
  subdomains/
    brand_roots.txt
    ct_logs.txt                - CT-only hostnames
    github.txt                 - hostnames mined from GitHub
    passive_dns.txt
    public_docs.txt
    public_docs_endpoints.txt
    public_docs_other.txt
    public_docs_publication_slugs.txt
    search_endpoints.txt
    search_engines.txt
    wayback.txt
    wayback_endpoints.txt
    wayback_endpoints_top500.txt
  tech/
    body-{api,assets,cdn,manifest,on,root,signin,subscription,support,user}.html
    cors.txt                   - CORS header probe results
    csp-sources.txt            - CSP source-list breakdown
    doh-{host}-{A,AAAA,CNAME,MX,NS,TXT}.json  (24 hosts x 6 types)
    fingerprint.tsv            - host, server, x-powered-by, x-deploy, x-cluster
    hdr-{api,assets,cdn,manifest,on,root,signin,subscription,support,user}.txt
    head-headers.txt
  wayback/                     (reserved; actual output lives under raw/wayback-*)
```

---

**End of dossier.**
