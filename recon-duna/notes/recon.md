# Duna.com reconnaissance map

Date: 2026-10-29
Authorization: written permission from Duna CEO Duco van Lanschot and David Schreiber.
Scope: everything (*.duna.com + vendor-hosted infra running Duna code / storing Duna data).
Mode: recon / surface mapping only. No exploitation.

Duna is "AI-native compliance infrastructure that automates business onboarding, periodic
reviews, and reduces costs" (per support.duna.com llms.txt). It is a KYB / KYC-compliance
SaaS. This shapes the threat model: the crown jewels are customer business-onboarding data,
uploaded identity documents (Onfido / idNow), and periodic-review records.

Raw scan output: /home/user/claude-agents/recon-duna/raw/ (DoH JSON, crt.sh JSON, probe logs).

## 1. DNS resolution

Container has no local resolver; resolution done via Google DoH (https://dns.google/resolve).

### Resolving hosts
| Host | A / CNAME | Hosting |
|---|---|---|
| duna.com | 31.43.160.6, 31.43.161.6 | Framer (marketing site) |
| www.duna.com | CNAME sites.framer.app | Framer |
| api.duna.com | 3.76.148.43, 18.194.122.18 | AWS eu-central-1 (Frankfurt) |
| dashboard.duna.com | 3.76.148.43, 18.194.122.18 | AWS eu-central-1 (same LB as api) |
| connect.duna.com | 3.76.148.43, 18.194.122.18 | AWS eu-central-1 |
| contribute.duna.com | 3.76.148.43, 18.194.122.18 | AWS eu-central-1 |
| webhooks.duna.com | 3.76.148.43, 18.194.122.18 | AWS eu-central-1 |
| events.duna.com | 3.76.148.43, 18.194.122.18 | AWS eu-central-1 (nginx front) |
| admin.duna.com | 3.76.148.43, 18.194.122.18 | AWS eu-central-1 |
| auth.duna.com | CNAME cname.workos-dns.com (CF 104.18.35.233 / 172.64.152.23) | WorkOS AuthKit behind Cloudflare |
| auth-api.duna.com | CNAME cname.workos-dns.com (CF) | WorkOS API behind Cloudflare |
| auth-admin.duna.com | CNAME cname.workos-dns.com (CF) | WorkOS admin portal behind Cloudflare |
| status.duna.com | CNAME statuspage.incident.io -> cname.vercel-dns.com (66.33.60.66 / 76.76.21.142) | incident.io status page on Vercel |
| support.duna.com | CNAME cname.mintlify.builders (CF 172.66.3.9 / 162.159.143.13) | Mintlify help centre |
| know.duna.com | CNAME 143304238.sites.hscoscdn-eu1.net (CF 141.101.90.96-99) | HubSpot CMS knowledge base |
| ask.duna.com | CNAME cname.tally.so (35.205.106.218) | Tally.so form |
| docs.duna.com | CNAME dunadocs-1033ee7b.readmessl.com (CF 104.16.241/242.118) | ReadMe API docs |
| cdn.duna.com | 3.171.76.68/76/84/104 | AWS CloudFront + S3 (AmazonS3 origin) |

### Non-resolving (NXDOMAIN)
- config.duna.com, demo.duna.com, dashboard-proto.duna.com - not provisioned.
- cpanel, cpcalendars, whm, webdisk, webmail, mail .duna.com - standard cPanel service
  subdomains, NOT provisioned (no cPanel hosting in use; MX elsewhere). Dead.
- settings.duna.com - NXDOMAIN publicly, but referenced in dashboard/connect/contribute
  CSP `connect-src`. Believed in scope (runs Duna config code) but only reachable
  internally / via VPN from this vantage. Flagged as origin-exposure candidate.

## 2. Subdomain discovery

crt.sh (%.duna.com) returned only the already-known live set:
admin, api, cdn, connect, contribute, dashboard, docs, duna.com, events, status,
webhooks, www. No brand-new names from CT.

New host not in the starting list: **settings.duna.com** (from CSP connect-src on the
three app hosts). NXDOMAIN publicly.

Third-party / vendor hosts referenced in app CSPs (context, mostly out-of-scope products
Duna embeds): ingress.eu-west-1.aws.dash0.com (dash0 observability), *.ingest.de.sentry.io
(Sentry, project org o4508687879372800), browser-intake-datadoghq.com (Datadog, pub key
pubb28ba93eb59013963476c6dd6c190040 - public RUM key), *.onfido.com + sdk/assets.onfido.com
(Onfido KYC), go.idnow.de / go.test.idnow.de (idNow KYC), maps/places.googleapis.com.

## 3-5. Live host surface (HTTP/HTTPS) and endpoints

| Endpoint | Method | Status | Technical note |
|---|---|---|---|
| https://duna.com/ | GET | 200 | Framer marketing site. `server: Framer/ad3cf8f`, framer-site-id, HSTS, X-CTO nosniff. 802KB static HTML, us-east-1 edge. |
| https://duna.com/robots.txt | GET | 200 | Allow /, Sitemap https://duna.com/sitemap.xml |
| https://www.duna.com/ | GET | 308 | -> https://duna.com/ (Framer canonical redirect) |
| https://api.duna.com/ | GET | 404 | JSON `{"errors":[{"code":"endpoint_does_not_exist",...}]}`. Express + Helmet (full security-header set), `access-control-allow-origin: *`, `access-control-allow-headers: content-type`, rate-limit 30/window. |
| https://api.duna.com/health | GET | 200 | `{"status":"ok"}`. POST -> 404 (GET-only). |
| https://api.duna.com/v1, /me, /graphql, /openapi.json, /robots.txt, /.well-known/openid-configuration | GET | 404 | all `endpoint_does_not_exist`. No GraphQL, no public OpenAPI, no OIDC discovery. Routes are gated behind auth (WorkOS token) and documented on docs.duna.com. |
| https://dashboard.duna.com/ | GET | 302 | -> /login. React SPA served from cdn.duna.com. Strict CSP (nonce+strict-dynamic), Sentry report-uri (ingest.de.sentry.io/4508687905587280), reveals cdn/events/settings.duna.com + dash0. Express/Helmet backend, rate-limit 30. |
| https://dashboard.duna.com/login | GET | 200 | WorkOS AuthKit login (client bundle references workos/authkit). |
| https://connect.duna.com/ | GET | 302 | -> /onboard. "Duna Connect" React SPA. CSP adds Onfido (api.{ca,eu,us}.onfido.com, sdk/assets), Google Maps/Places, Cloudflare Turnstile challenges, settings.duna.com. KYC business-onboarding app. |
| https://contribute.duna.com/ | GET | 200 | "Duna Contribute" React/Rolldown SPA (bundles cdn.duna.com/assets/chunks/*.js incl. onfido.DwcGdPFw.js, react-intl). CSP adds frame-src go.idnow.de + go.test.idnow.de and camera/geo/mic Permissions-Policy for Onfido+idNow. Document/identity contribution flow. |
| https://webhooks.duna.com/ | GET | 404 | Express `Cannot GET /` HTML. CSP `default-src 'none'`. POST /webhooks -> 404. Webhook receiver/dispatcher; real route unknown (likely /{provider} or signed path). |
| https://events.duna.com/ | GET | 400 | `missing_event`. nginx/1.28.2, `access-control-allow-origin: *`, rate-limit 30. Unauthenticated event-ingestion endpoint (telemetry/analytics). |
| https://admin.duna.com/ | GET | 404 | empty body, no server header. Same AWS LB as api/dashboard. Unrouted/internal admin app not host-routed at edge. |
| https://auth.duna.com/ | GET | 307 | -> auth-api.duna.com/user_management/initiate_login?client_id=client_01JNR708GP08A6X4D265YCSEPD. WorkOS hosted AuthKit (Next.js on Cloudflare). CSP-report-only -> Datadog. frame-ancestors bolt.new/lovable.dev/replit.com/riff.new/v0.app (WorkOS defaults). |
| https://auth-api.duna.com/ | GET | 200 | WorkOS API (`x-envoy-upstream-service-time`), body `{}`. CORS `allow-credentials: true` + `Vary: Origin`. Cloudflare. |
| https://auth-admin.duna.com/ | GET | 404 | WorkOS admin portal host. Cloudflare, x-request-id. No root content. |
| https://status.duna.com/ | GET | 200 | incident.io status page on Vercel (Next.js, x-matched-path /[slug]). |
| https://support.duna.com/ | GET | 308 | -> /getting-started. Mintlify help centre. Exposes /llms.txt, /llms-full.txt, /.well-known/{api-catalog(404),mcp/server-card.json,agent-card.json,agent-skills/index.json}. x-mint-proxy-version. |
| https://support.duna.com/llms.txt | GET | 200 | Site map of help docs; confirms product = AI-native compliance / business onboarding / reviews. |
| https://know.duna.com/ | GET | - | TLS handshake failure (sslv3 alert) from this vantage - HubSpot CMS edge not serving this SNI; reachable from browsers. |
| https://ask.duna.com/ | GET | 404 | Tally.so form app shell (185KB), Express-style security headers from Tally. |
| https://docs.duna.com/ | GET | 302 | -> /password?redirect=%2F. ReadMe API docs, password-protected (whole site gated). Cloudflare. |
| https://cdn.duna.com/ | GET | 200 | AmazonS3 origin via CloudFront (x-amz-cf-id, x-cache Miss). 428-byte index. Hosts all React SPA assets (/assets/chunks/*, /assets/connect.*.js). SSE-AES256. |

## 6. Flagged high-interest surfaces

- **api.duna.com** - core REST API of a KYB/compliance platform. CORS `*`, clean versioned
  Express routing, structured error codes. All data routes auth-gated (WorkOS bearer). Prime
  object-by-ID IDOR / cross-tenant surface once a session exists. Highest value per CLAUDE.md.
- **connect.duna.com (/onboard) + contribute.duna.com** - unauthenticated-reachable KYC
  business-onboarding flows handling Onfido/idNow PII and uploaded identity documents. These
  flows almost certainly take an onboarding/applicant session ID; predictable or guessable IDs
  = cross-business KYC-data exposure reachable by anyone. Business-onboarding flow is also the
  CLAUDE.md "account-creation reachable by anyone" multiplier.
- **webhooks.duna.com** - dedicated Express webhook handler, CSP default-src none. Test
  signature-verification bypass, replay, and SSRF on inbound webhook processing. Unauth-reachable.
- **events.duna.com** - unauthenticated event ingestion, CORS `*`, nginx. Injection / log-poisoning / spoofed-event surface.
- **admin.duna.com + auth-admin.duna.com** - admin surfaces returning bare 404. admin.duna.com
  shares the app LB; test for host-header / path routing that reaches the admin app directly.
- **settings.duna.com** - config host in three app CSPs but NXDOMAIN publicly; origin-IP /
  internal-exposure hunt (passive DNS, CT history, same AWS LB Host-header routing).
- **cdn.duna.com** - S3-backed bucket behind CloudFront; check bucket listing / writeability and
  scan the SPA bundles (connect.CJ8qu1XP.js, /assets/chunks/*) for baked config and API route maps.
- **docs.duna.com** - password-protected ReadMe; if it carries an OpenAPI spec, that is the full
  authenticated api.duna.com route map. Try shared/weak password or public ReadMe project slug.
- **WorkOS auth** - client_id client_01JNR708GP08A6X4D265YCSEPD (public). Check AuthKit redirect
  params, session/token rotation on logout+password-reset, and the auth-api CORS-with-credentials posture.

## Recommended exploit targets, ranked by likely impact

1. api.duna.com authenticated object-by-ID IDOR / cross-tenant access (needs WorkOS session).
2. connect/contribute KYC onboarding-session IDOR exposing other businesses' identity docs.
3. webhooks.duna.com signature-bypass / SSRF / replay.
4. admin.duna.com / auth-admin host-routing to reach admin app, and settings.duna.com origin exposure.
5. cdn.duna.com S3 bucket perms + SPA-bundle secret/route scan.
6. docs.duna.com ReadMe password gate -> full OpenAPI route map.
7. events.duna.com unauth event injection.
8. WorkOS AuthKit token lifecycle (rotation on logout/reset) and auth-api CORS-with-credentials.

Note: a usable authenticated session is the gate for targets 1-2 (the highest-value ones).
Duna uses WorkOS AuthKit; there is no visible self-service consumer signup - onboarding is
invite/connect-driven. Obtaining a test tenant/session is the next blocker to resolve.
