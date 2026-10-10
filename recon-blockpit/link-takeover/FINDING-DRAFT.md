# F001 - Dangling CNAME on link.blockpit.io enables subdomain takeover via LinkDrip

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| link.blockpit.io/* | GET | Medium | 6.1 (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N) | A05: Security Misconfiguration | Attacker claims the LinkDrip custom-domain slot and serves phishing / malware under a Blockpit-branded HTTPS subdomain that Blockpit's X profile, Facebook page, iOS/Android app badges, and marketing-campaign landing pages still link to. |

Status: unverified - takeover not actually attempted per rules of engagement.

## Summary

`link.blockpit.io` has a CNAME to `custom-domain.linkdrip.io` (LinkDrip, a branded short-link SaaS). No LinkDrip account currently has `link.blockpit.io` configured as an active custom domain: every path - including `/x`, `/ios`, `/android`, `/fb`, `/blackfriday`, `/cybermonday`, `/earlybird` that Blockpit itself advertises on social media - returns an identical `301 Location: https://fun.com`, LinkDrip's vendor-side fallback. The CNAME is dangling. An attacker signing up for a free LinkDrip account and adding `link.blockpit.io` as a custom domain inherits the subdomain, because the DNS proof already resolves to LinkDrip's own backend.

## Reproduction

### 1. DNS

Raw UDP DNS query against 1.1.1.1 (dns.query.udp, no CNAME flattening):

```
link.blockpit.io.           300 IN CNAME custom-domain.linkdrip.io.
custom-domain.linkdrip.io.   60 IN A     13.42.74.145
custom-domain.linkdrip.io.   60 IN A     35.178.63.175
```

Reproduced against 1.1.1.1, 8.8.8.8, 9.9.9.9 - all three return the same A records (CNAME flattened by stub resolvers). AAAA, NS, TXT, MX all empty on link.blockpit.io.

(Note: a prior probe run by the HTTP/DNS probe agent in `raw/dns-resolution.txt` captured only the A rrset and wrote `CNAME=` as empty - that was a stub-resolver artifact, not a real absence. The authoritative answer contains the CNAME.)

### 2. HTTP - every slug 301s to fun.com

Request:
```
HEAD / HTTP/1.1
Host: link.blockpit.io
```
Response:
```
HTTP/1.1 301 Moved Permanently
Location: https://fun.com
Date: Fri, 09 Oct 2026 11:24:51 GMT
Connection: keep-alive
Keep-Alive: timeout=5
```

Identical response (byte-for-byte except date) for:
```
GET /test, /foo, /signup, /r/test, /l/test, /blockpit, /bp, /abcd,
    /d4f1e2b0-1234-5678-9abc-0a1b2c3d4e5f
```

Same response under 4 User-Agent values (curl, Chrome, iPhone Safari, Googlebot). No `Server:`, no `X-Powered-By:`, no `Set-Cookie:`, no cache / CDN headers - a bare reverse-proxy fallback.

### 3. Vendor confirmation

- CNAME target: `custom-domain.linkdrip.io` matches the CNAME record documented at docs.linkdrip.com "How to use Custom Domains" for binding a customer-owned domain to a LinkDrip link project.
- Direct probe of the vendor origin:
  ```
  curl -k --resolve link.blockpit.io:443:13.42.74.145 'https://link.blockpit.io/'
    -> HTTP/1.1 301 Moved Permanently
    -> Location: https://fun.com
  ```
  Confirms the responding server IS the LinkDrip custom-domain edge.
- `custom-domain.linkdrip.io` serves an expired TLS certificate when probed directly - the egress proxy MITMs TLS here, so we cannot read the real cert chain, but `curl: (60) SSL certificate problem: certificate has expired` leaking through on the direct probe is a strong signal the endpoint is unmaintained.
- `linkdrip.io` itself redirects to `www.linkdrip.com` (`HTTP/2 302, server: CloudFront, location: https://www.linkdrip.com`). LinkDrip's primary branding migrated from `.io` to `.com`; the `custom-domain.linkdrip.io` endpoint is the legacy variant - Blockpit's configuration was created before the migration.

Full response captures: `link-takeover/dns.txt`, `link-takeover/http.txt`, `link-takeover/tls.txt`. Vendor-fingerprint analysis: `link-takeover/vendor-fingerprint.md`.

## Takeover feasibility (NOT exercised)

### Vendor onboarding flow (from LinkDrip docs - not performed)

1. Sign up for a LinkDrip account at linkdrip.com (free tier available per vendor marketing).
2. Settings -> Custom Domains -> Add domain -> enter `link.blockpit.io`.
3. LinkDrip generates a CNAME record and expects it at that domain.
4. On the subsequent "Verify" step, LinkDrip resolves `link.blockpit.io`, sees the CNAME chain terminates at `custom-domain.linkdrip.io` (which it owns), and accepts the domain into the attacker's account.
5. Attacker creates per-slug mappings `/x`, `/ios`, `/android`, `/fb`, `/blackfriday`, `/cybermonday`, `/earlybird`, `/signup`, etc. pointing to any attacker-chosen URL.

### Ownership-check posture

LinkDrip's own documentation on custom-domain setup describes exactly one proof-of-ownership step: a single CNAME record pointing at `custom-domain.linkdrip.{io,com}`. No TXT record, no email verification against WHOIS, no out-of-band confirmation is documented. The CNAME already exists, so the single required proof is already satisfied before an attacker signs up. The classic dangling-CNAME takeover pattern applies.

Caveat: if LinkDrip has silently added a secondary verification step (e.g. per-tenant TXT prefix), takeover would require also controlling a secondary record under `link.blockpit.io`, which the attacker cannot do - that would downgrade feasibility to "not takeoverable until Blockpit itself re-publishes". We did not create an account to verify this and will not. Based on current public docs, no such secondary step exists.

### What the takeover grants

- Serve arbitrary redirect, HTML, and JS content from a browser-trusted `https://link.blockpit.io/*` origin with a valid Let's-Encrypt-style cert that LinkDrip auto-issues for custom domains.
- Inherit live traffic from the following publicly-advertised Blockpit shortlinks (reach data below):
  - `link.blockpit.io/x` - URL in the website field of `@blockpit_io` on X (Twitter), the official Blockpit X profile.
  - `link.blockpit.io/ios` - iOS App Store deep-link, advertised in Blockpit's May-2024 app-launch tweet and still referenced from Blockpit's own help center and marketing material.
  - `link.blockpit.io/android` - Google Play deep-link, same source.
  - `link.blockpit.io/fb` - Facebook social share URL on Blockpit's Facebook page bio.
  - `link.blockpit.io/blackfriday`, `/cybermonday`, `/earlybird` - 2023-2024 holiday campaign landing-page shortcuts, referenced in posts that are still live on X.
  - Any other campaign slug Blockpit ever advertised; search surfaced at least 5 distinct public references, and the X profile website slot alone drives ongoing clickthrough from every impression of that profile.

- Phishing: a login-looking Blockpit page under `https://link.blockpit.io/signin` is indistinguishable from real Blockpit UI to users who know only the brand. Blockpit's actual auth is on `app.blockpit.io/auth/*`, and users will plausibly accept any `*.blockpit.io/signin` as legitimate.

### What the takeover does NOT grant (bounded scope)

- No read access to Blockpit app-session tokens. app.blockpit.io does not set a `Domain=.blockpit.io` auth cookie - Blockpit's SPA holds OAuth2 bearer tokens in JS memory / local storage, scoped to the `app.blockpit.io` origin only. The only observed cookie with `Domain=blockpit.io` is Cloudflare's `_cfuvid` bot-fingerprint cookie (HttpOnly, non-sensitive). Classic "steal the main-app session via a sibling subdomain" does not apply to Blockpit's current auth model.
- No evidence of a CSP on app.blockpit.io that whitelists `*.blockpit.io` script-src. The one CSP in reach (served by the Turnstile host) uses `script-src 'nonce-...' https://challenges.cloudflare.com`, no `*.blockpit.io`. The Netlify-served app.blockpit.io root response does not send a `Content-Security-Policy` header at all, so there is no CSP escalation vector either direction here.
- Referrer-Policy on app.blockpit.io chain is `same-origin`, so a takeover of a sibling subdomain does not harvest URL path leaks via Referer.

### Reach estimation

Public references to `link.blockpit.io` captured via WebSearch today (2026-10-09):

- X profile `@blockpit_io` - profile website slot = `link.blockpit.io/x`. Blockpit's X account is the primary company account for ~91k followers' crypto-tax content. Every profile view since the configuration was published renders this URL as the clickable company website.
- X post from May 2024 (`status/1788241230968631361`) - app launch, directs readers to `link.blockpit.io/ios` and `link.blockpit.io/android`. Still live and link-indexed.
- X post from Dec 2024 (`status/1738596307948765263`) - early-bird campaign, points at `link.blockpit.io/earlybird`.
- X post Dec 2024 - Cyber Monday, points at `link.blockpit.io/cybermonday`.
- Facebook page bio `facebook.com/blockpit.io` - published shortlink via `link.blockpit.io/fb`.
- LinkedIn company page lists the domain in posted links.
- An unknown number of in-product emails, help-center articles, press releases, and partner co-marketing items reasonably still carry these slugs.

All of this traffic currently redirects to fun.com. Any attacker who claims the LinkDrip slot captures all of it under HTTPS on a Blockpit-branded subdomain.

## Impact scenarios (ordered by realism, Blockpit-specific)

1. **Credential phishing against Blockpit users.** Serve a near-pixel-perfect clone of `app.blockpit.io` at `https://link.blockpit.io/signin`. Attack vector reaches users who click the website field on Blockpit's own X / Facebook / LinkedIn profile - victims arrive directly from the brand's authoritative social-media surfaces. Captured credentials unlock the victim's crypto portfolio history, tax reports, and - for users with low MFA posture - their Blockpit account. Blockpit's cryptotax dataset is sensitive (wallet addresses, exchange API keys for read-only, PDF tax reports).

2. **iOS / Android app-install hijack.** `link.blockpit.io/ios` and `link.blockpit.io/android` are what Blockpit's X launch tweet still asks mobile users to click. Attacker replaces them with App Store / Play Store deep-links to a lookalike app, a phishing form, or a crypto-stealer dApp.

3. **Marketing-campaign reuse.** The `/blackfriday`, `/cybermonday`, `/earlybird` slugs sit on live tweets. Resurrect them with a fake "80% off, limited time, buy now" page that collects card data via a non-Blockpit payment processor.

4. **Partner / API-doc reach.** cryptotax.io (legacy Blockpit brand) and in-product help links may embed link.blockpit.io short-codes we did not enumerate; takeover expands over time as those are rediscovered.

Not applicable here: direct session-token theft, direct app.blockpit.io XSS, direct access to the OAuth2 service at api.blockpit.io - none of which are reachable from a sibling-subdomain takeover under Blockpit's current isolation posture.

## Suggested fix (pick one)

- **Preferred: remove the CNAME.** Delete the `link.blockpit.io CNAME custom-domain.linkdrip.io` record at the blockpit.io DNS zone, or NXDOMAIN the host. Zero traffic will reach a dangling LinkDrip tenant.
- **If the shortlink service is still wanted:** log in to the existing LinkDrip account that owns the configuration and re-add `link.blockpit.io` so the vendor-side slot is claimed by Blockpit, not sitting empty. Repopulate the historic `/x`, `/ios`, `/android`, `/fb`, `/blackfriday`, `/cybermonday`, `/earlybird` mappings so published marketing links start resolving to Blockpit destinations again instead of fun.com. Rotate the LinkDrip account owner and enable 2FA to prevent future orphaning.
- **If the LinkDrip account is lost and cannot be recovered:** replace the CNAME with one pointing to a Blockpit-owned redirector (nginx on an app.blockpit.io sibling, Cloudflare Workers, Netlify redirects, Dub.co under Blockpit's own account). Priority slugs to restore: `/x`, `/ios`, `/android`, `/fb`.

Note: all three remediations ALSO fix the currently-broken production behavior where every published Blockpit shortlink today sends users to fun.com instead of Blockpit's own content. That is a de facto marketing-URL outage independent of the security finding.
