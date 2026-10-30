# Duna engagement - broader surface notes

## F-PERI-004 (Medium, UNVERIFIED, high confidence) - ask.duna.com Tally takeover candidate

Host: ask.duna.com. CVSS 6.1 AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N. OWASP A05:2021.

Evidence:

    dig CNAME ask.duna.com
    ask.duna.com. CNAME cname.tally.so.  (A: 35.205.106.218)

    GET https://ask.duna.com/
    -> HTTP/2 404
       Content-Length: 185697
       ETag: W/"2d561-gi3VwBSU//ZrF8Fz+hpyBSLKmLM"
       body title: "Tally - Create Beautiful Forms for Free | Unlimited Forms & Submissions"
       canonical: https://tally.so   (NOT ask.duna.com)

    GET https://tally.so/thisisnotarealform12345xyz
    -> HTTP 404, byte-equivalent fingerprint (Tally's global "unknown hostname" fallback,
       NOT a workspace-specific 404)

Tally custom-domain policy (tally.so/help/custom-domains, fetched 2026-10-30):
- Only required DNS record is a CNAME to cname.tally.so
- No TXT ownership token
- No email-based ownership verification
- "A domain can only be connected to one Tally account at a time" = first-claim wins
- Flow: Verifying DNS records -> Issuing an SSL certificate -> Your domain is active

Impact: attacker claims ask.duna.com on their own Tally Pro account, publishes forms
there with Tally-issued SSL on the real Duna subdomain. Classic phishing surface.

Why NOT High: audited every cookie on dashboard, connect, contribute, api, auth,
auth-api .duna.com - NONE are set with Domain=.duna.com or Domain=duna.com (all
host-scoped). So takeover cannot steal Duna sessions; impact capped at phishing / brand
abuse. Also no X-Frame-Options / frame-ancestors on dashboard-proto, so an attacker
could combine F-PERI-001 clickjacking with F-PERI-004 branded phishing, but still
without session reach.

To flip to CONFIRMED: either (a) Tally Pro paid signup from operator mailbox, add
ask.duna.com in the Domains tab, observe status transition to "Active" (then delete
immediately to return control), or (b) Duna confirms ask.duna.com is not claimed on
any of their Tally workspaces. Neither verification step was taken in this engagement.

Fix: delete the ask.duna.com CNAME in Route53 if unused; or claim ask.duna.com on
Duna's own Tally workspace so Tally's uniqueness check blocks future attempts.

## CORRECTION - auth-admin.duna.com is Duna's live WorkOS Admin Portal custom domain

Prior ruled_out note had this as "unreachable from edge" (conflated with
admin.duna.com). Reality:

    dig CNAME auth-admin.duna.com -> cname.workos-dns.com.
    GET https://auth-admin.duna.com/
      -> HTTP 404 (0-byte body) + admin-portal cookies, served via WorkOS Cloudflare
      HTML shell references frontend-apps-multi-region.workos.com/apps/admin-portal/
      production/_next/static/chunks/01muemsfpq9lp.css

Not a finding; posted here as a correction to the report so Duna sees the record is
accurate. The hostname is intentional and vendor-hosted.

## Clean negatives (dimension sweep)

### S3 / GCS
36 bucket names probed, HEAD only. Four exist, all private:
- duna          us-west-2       403, no listing; 11 common objects all 403
- duna-backups  us-east-1       403, no listing; 11 common objects all 403
- duna-test     us-east-1       403, no listing; 11 common objects all 403
- duna-tf-state eu-central-1    403, no listing; 11 common objects all 403

32 others 404 (do not exist). GCS: same 36 names, 403/404 only. Hardened posture.

### Email / DNS
All four domains (duna.com, duna.io, withduna.com, viaduna.com):
- DMARC: v=DMARC1; p=reject; sp=reject; pct=100; rua=mailto:85f53bbb@in.mailhardener.com
- SPF:   v=spf1 include:_spf.google.com include:amazonses.com ~all
- MX:    smtp.google.com (Google Workspace)
- NS:    AWS Route53
- DKIM:  google._domainkey present on duna.com and duna.io; withduna.com no DKIM

Email spoofing is blocked by DMARC p=reject. SPF ~all vs -all is cosmetic (DMARC
overrides). AXFR against Route53 times out by design.

### CORS matrix (5 Origins x 16 hosts)
- api.duna.com, api.withduna.com, events.duna.com: ACAO:* static, no ACAC. Safe wildcard.
- dashboard-proto.withduna.com /api/health: ACAO:*, no ACAC. Safe.
- cdn.duna.com: REFLECTS any Origin matching \.duna\.com$ or ^duna\.com$ (including
  made-up subdomains and http:// scheme), but NO ACAC, OPTIONS methods only GET/HEAD/
  OPTIONS, content is public static assets. Suffix check is correct (xyzduna.com and
  duna.com.evil.example.com not reflected). Non-exploitable.
- dashboard/connect/contribute/auth-api .duna.com: no ACAO. CSP frame-ancestors 'self'
  + XFO SAMEORIGIN. Safe.
- auth.duna.com: no XFO; CSP frame-ancestors includes bolt.new, lovable.dev,
  replit.com, riff.new, v0.app (WorkOS AI-builder default; vendor choice, not Duna
  misconfig).
- dashboard-proto.withduna.com / : no XFO, no CSP frame-ancestors. Clickjackable;
  reinforces F-PERI-001.

### CSRF double-submit (connect vs contribute)
Cross-domain relay rejected in both directions:
    POST contribute/api/health with connect token+cookie   -> 403
    POST connect/api/health   with contribute token+cookie -> 403
Cookie names are host-tagged AND SameSite=Strict. Browser would never cross-send.
Cross-use not possible.

### WebSocket
connect.duna.com entry bundle (connect.3lMWnJTD.js) contains zero wss:// strings. The
only wss references are inside CSP connect-src (wss://*.onfido.com - Onfido vendor
SDK). No first-party Duna WebSocket surface to probe.

## Inconclusive from this environment (gaps for Duna / for a human run)

- Wayback archive.org CDX: TLS reset by egress proxy on every attempt. urlscan.io
  no results in 30 days. Dimension inconclusive; manual browser-side CDX run would
  close the gap.
- GitHub code search: gh token is session-bound ("sessions are bound to their
  configured repositories"), returns 403 on org/user/code search. grep.app rate
  limited. Dimension inconclusive.

Neither gap is likely to materially change the picture given how exhaustive the
production enumeration already is, but both should be mentioned in the final report
as open items for Duna to run themselves (an internal GitHub audit of their own
employees' public repos is the clearest).
