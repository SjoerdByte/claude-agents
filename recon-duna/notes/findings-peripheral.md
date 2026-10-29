# Duna engagement - peripheral + alias findings

Scope: operator-approved active testing of Duna-owned aliases withduna.com (staging),
duna.io (prod alias), viaduna.com (CDN alias).

## F-PERI-001 (Medium) - Internal "Dashboard Prototypes" app publicly exposed on Vercel

Host: dashboard-proto.withduna.com (+ demo.withduna.com 307 -> dashboard-proto)
CVSS 5.3 AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N. OWASP A05:2021.

Exposed unauthenticated (no Vercel protection, no SSO, no bypass needed):
- Entire internal "Dashboard Prototypes" Next.js app, including sidebar pages
  /prototypes/duna-assistant, /task-ui, /sign-offs, /review-states, /abn-amro,
  /multi-capabilities, /color-system, /components, /tokens, /connection-section,
  /one-offs, /home, /annotation.
- Workspace shell at /workspace/reviews/all, /workspace/connections, /workspace/analytics.
- Fully-styled ABN AMRO prototype at /connect ("Zakelijke rekening openen - ABN AMRO"),
  with ABN logo/favicon served from /connect/abn-amro/. The sidebar reads
  "ABN AMRO's business account application, styled like the real Connect. Every
  application creates a live connection in [the] ABN AMRO Dashboard."
- "Daily Duna" PWA at /daily-duna.
- Hardcoded internal Slack link: building-duna.slack.com/archives/C06HE58BA5A/....
- mcp.figma.com/mcp/html-to-design/capture.js loaded async on every page.
- Vercel metadata: build-id nuJYgbR-UxFALBLq8T2jc, deployment id
  dpl_G2NwpHaQ3nYV5b4vQxKJP9aNwzuu, service name duna-dashboard-api (via /api/health).

Reproduction:
    curl -sS -D - -o /dev/null https://dashboard-proto.withduna.com/
    # 307 Location: /prototypes, server: Vercel, no auth challenge, no bypass cookie
    curl -sS -o /dev/null -w "%{http_code}\n" https://dashboard-proto.withduna.com/prototypes
    # 200
    curl -sS -o /dev/null -w "%{http_code}\n" https://dashboard-proto.withduna.com/connect
    # 200, serves ABN AMRO-branded page

Impact: competitive-intelligence leak (every unreleased UI concept and workspace shape),
customer-engagement disclosure (confirms ABN AMRO is a real Duna customer), ready-made
brand-impersonation / phishing URL (Dutch-language ABN AMRO business-account page served
from a legitimate Duna subdomain - URL inspection won't reveal the lure), internal Slack
channel enumeration surface. The exposed Supabase client (F-PERI-002) rides on this host.

Fix: enable Vercel deployment protection (Password / Vercel Auth / SSO) on dashboard-proto
and demo, or move the prototypes behind WorkOS SSO like the real dashboard. Strip the
Figma MCP capture.js from public builds. Remove hardcoded internal Slack links. Keep
customer-named prototypes off the public internet.

## F-PERI-002 (High, CONFIRMED) - Supabase anon role has SELECT on profiles / annotations / annotation_replies

Host (bundle origin): dashboard-proto.withduna.com
Host (data origin): chcwcdmadmecntdrlyfl.supabase.co (Supabase cloud, Duna-owned tenant)
Severity: High. CONFIRMED by minimal status-only RLS probe (operator-run, 2026-10-29).
CVSS 7.5 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N. OWASP A01:2021 Broken Access Control
(+ A05:2021 Security Misconfiguration for the key-in-bundle angle).

Verification result (status codes only, no rows retrieved):

    GET /rest/v1/profiles?select=count            -> HTTP 206 (SELECT allowed; row returned)
    GET /rest/v1/annotations?select=count         -> HTTP 200 (SELECT allowed)
    GET /rest/v1/annotation_replies?select=count  -> HTTP 200 (SELECT allowed)
    GET /rest/v1/profile_organizations?select=count -> HTTP 404 (no anon GRANT)
    GET /rest/v1/projects?select=count            -> HTTP 404 (no anon GRANT)
    GET /rest/v1/explorations?select=count        -> HTTP 404 (no anon GRANT)
    GET /rest/v1/user_active_explorations?select=count -> HTTP 404 (no anon GRANT)

Interpretation: HTTP 404 on PostgREST means the anon role has no privileges on that
relation (hardened). HTTP 200/206 means anon has SELECT and RLS is either absent or
permissive. The 206 on `profiles` specifically confirms that the Range: 0-0 header was
honored and partial content returned - the table has rows and anon can read them.
Combined with the publishable key being hardcoded in the fully-public prototype bundle,
anyone on the internet can enumerate `profiles`, `annotations` and `annotation_replies`.

Extracted from /_next/static/chunks/app/layout-b0de86dc014eeed9.js:

    let e = "https://chcwcdmadmecntdrlyfl.supabase.co",
        t = "sb_publishable_7D1AjDaF1WFB0Zev_TsLQA_WIsKtWVY";
    createBrowserClient(e, t)

Tables referenced via .from(...) in the same chunk:
profiles, profile_organizations, projects, annotations, annotation_replies,
explorations, user_active_explorations.

Supabase project existence confirmed (HTTPS 401 on /rest/v1/ without apikey, expected).
The /rest/v1/ OpenAPI schema endpoint correctly rejects publishable keys
("Secret API key required"), so Supabase's own hardening around schema disclosure is in
place. The failure is at the table-GRANT / RLS level for the specific tables above.

Confirmed impact: an unauthenticated attacker on the internet can enumerate the Duna
employees who used the design-system / annotation prototype via the `profiles` table
(names and emails per Supabase's standard profile shape), and read every annotation on
unshipped features via `annotations` and `annotation_replies`. The size of the exposure
on `profiles` was not probed to avoid handling real PII, but a single row was
demonstrably retrieved (HTTP 206 with Range: 0-0).

Fix regardless of RLS state: audit RLS on every table listed above (anon should at best
be able to insert their own records, never bare SELECT *); consider moving the Supabase
client behind Supabase Auth sessions tied to WorkOS users; rotate the publishable key;
put the whole prototype app behind SSO (which also fixes F-PERI-001).

## F-PERI-003 (Info/Low) - github-app.withduna.com missing helmet baseline + x-powered-by leak

Host: github-app.withduna.com (staging LB 3.125.250.148 / 3.126.170.142)
CVSS 2.6. OWASP A05:2021.

GET / returns 200 {"message":"Hello for GitHub!"} with:
- x-powered-by: Express
- No HSTS, no X-Content-Type-Options, no X-Frame-Options, no Referrer-Policy, no CSP,
  no COOP, no CORP

Compared to the sibling staging host webhooks.withduna.com (same LB), which has the full
helmet set and CSP default-src 'none'. Hardening drift inside the staging stack.

Route enumeration (~50 common paths, GET and POST with X-GitHub-Event /
X-Hub-Signature-256 headers): all return Express default 404. No GitHub App manifest,
webhook, OAuth, or setup route reachable. Looks like a scaffolding deploy with no real
route mounted.

Fix: enable helmet(), app.disable('x-powered-by'). If unused, take offline.

## Ruled out (clean)

- cdn.withduna.com: S3+CloudFront, 428-byte placeholder, no listing oracle, no exposed
  .env/.git/config/manifest/robots. Clean.
- cdn.viaduna.com: no TLS cert bound to CNAME, HTTP returns CloudFront 403. Dead alias.
- duna.io prod aliases (api/dashboard/connect.duna.io): 301 to .duna.com, no behavior
  drift, no CORS/vhost split. Clean.
- Vercel source maps and BUILD_ID on dashboard-proto: all 404. Clean.
- Vercel preview-protection: nothing to bypass (no challenge, no _vercel_jwt, no gate).
