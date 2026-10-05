# Deblock.com - Attack Surface Map
# Authorized Security Assessment
# Date: 2026-10-05

## Target Overview

Deblock is a French fintech/crypto-banking startup (founded 2022, 300k+ customers).
Offers IBAN current accounts, Visa debit cards, and non-custodial crypto wallets.
Licensed as CASP with AMF and as electronic money institution with ACPR.
CEO: Jean Meyer (ex-Head of Crypto at Revolut).
Series A: EUR 30M (Speedinvest, CommerzVentures, Latitude).

---

## 1. Infrastructure Summary

### DNS Registrar & Hosting
- Registrar: Gandi (ns-249-a.gandi.net, z.dns.gandi.net, ns-144-b.gandi.net, ns-56-c.gandi.net)
- SOA: ns1.gandi.net, hostmaster.gandi.net

### Primary Cloud Providers
- Google Cloud Platform (GCP): Core backend services (34.x.x.x IPs)
- Vercel: Frontend/marketing sites (216.150.x.x, CNAME to vercel-dns-016.com)
- Heroku: Legacy/staging APIs (herokudns.com CNAMEs)
- AWS CloudFront: CDN, email tracking (dgrvsv7aimxjx.cloudfront.net, d2st3sgyi3o6rm.cloudfront.net, d2olyqgieslqtw.cloudfront.net)
- AWS S3: Asset storage (cdn1.deblock.com, eu-west-3 region)

### Third-Party SaaS
- Intercom: Customer support (support.deblock.com -> custom.eu.intercom.help)
- Statuspal: Status page (status.deblock.com -> domains.statuspal.eu)
- FeatureUpvote: Feature voting (next.deblock.com -> featureupvote.net)
- Mailgun: Transactional email (email.mail.deblock.com)
- Postmark: Bounce handling (pm-bounces.deblock.com -> pm.mtasv.net)
- SendGrid: Email delivery (DKIM s1/s2 selectors)
- HubSpot: Marketing email
- Brevo (Sendinblue): Email marketing
- Zendesk: Support tickets (SPF include)
- Dynatrace: Application monitoring (TXT record verification)
- Airbrake: Error monitoring (found in Rails middleware)
- Marqeta: Card issuing platform (marqeta-sandbox.onb.deblock.com)
- Google Workspace: Corporate email (MX, SPF, DKIM)
- Google Tag Manager: Analytics
- Notion: Workspace (domain verification)
- Twilio: SMS/communications (webhook endpoint found)
- Retool: Internal tooling (retool.onb.deblock.com)

---

## 2. Live Subdomains by Category

### PRODUCTION - Frontend (Vercel + Next.js)

| Subdomain | HTTP | Server | Notes |
|---|---|---|---|
| deblock.com | 200 | Vercel | Redirects to /en/, Next.js, styled-components 5.3.11 |
| www.deblock.com | 200 | Vercel | Redirects to deblock.com |
| business.deblock.com | 200 | GCP (via google) | Next.js with Turbopack, CSP nonce-based |
| ambassadors.deblock.com | 200 | Vercel | Redirects to /en |
| season1.deblock.com | 200 | Vercel | Next.js (x-powered-by header exposed) |
| bursted-bubbles.deblock.com | 200 | Vercel | Marketing site |
| dl.deblock.com | 200 | Vercel | Redirects to deblock.com (app download) |
| recovery.deblock.com | 401 | Vercel | Authentication required |

### PRODUCTION - Backend API (GCP)

| Subdomain | HTTP | Server | Notes |
|---|---|---|---|
| api.prod.deblock.com | 403 | GCP (via google) | All paths return 403, properly firewalled |
| api.dev.deblock.com | 403 | GCP (via google) | All paths return 403, properly firewalled |
| auth.prod.deblock.com | 404 | GCP (via google) | Auth service, non-standard paths |
| app.deblock.com | 410 | GCP (via google) | GONE - decommissioned mobile API |
| onboarding.prod.deblock.com | 404 | GCP (via google) | Onboarding service |
| proof.prod.deblock.com | 502 | GCP (via google) | Broken/down |
| support.prod.deblock.com | 404 | GCP (via google) | Support backend |

### PRODUCTION - WordPress

| Subdomain | HTTP | Server | Notes |
|---|---|---|---|
| brand.deblock.com | 200 | LiteSpeed | WordPress, PHP 8.3.33, Elementor Pro |

### STAGING/DEV - Heroku (Rails)

| Subdomain | HTTP | Server | Notes |
|---|---|---|---|
| web-api-staging.deblock.com | 200 | Heroku | Rails 7.0.10, Ruby 3.3.9, DEVELOPMENT MODE |
| waitlist-staging.deblock.com | 200 | Heroku | Rails default page |
| web-api.deblock.com | 404 | Heroku | Production API (no root route) |
| waitlist-api.deblock.com | 404 | Heroku | Production waitlist API |

### STAGING/DEV - Vercel

| Subdomain | HTTP | Server | Notes |
|---|---|---|---|
| staging.deblock.com | 200 | Vercel | Full staging site |
| ambassadors-staging.deblock.com | 200 | Vercel | Staging ambassadors |
| staging-season1.deblock.com | 200 | Vercel | Redirects to Vercel SSO |
| staging-bursted-bubbles.deblock.com | 404 | Vercel | Staging 404 |

### STAGING/DEV - GCP

| Subdomain | HTTP | Server | Notes |
|---|---|---|---|
| auth.dev.deblock.com | 502 | GCP | Dev auth, broken |
| business-dev.deblock.com | 606 | GCP | Non-standard status |
| app-dev.deblock.com | 606 | GCP | Non-standard status |
| support.dev.deblock.com | 404 | GCP | Dev support |
| transfers.dev.deblock.com | 404 | GCP | Dev transfers |
| users.dev.deblock.com | 404 | GCP | Dev users service |

### UAT Environments

| Subdomain | HTTP | Server | Notes |
|---|---|---|---|
| app-uat-01.deblock.com | 200 | GCP | CNAME to app.deblock.com |
| app-uat-02.deblock.com | 200 | GCP | CNAME to app.deblock.com |
| business-uat-01.deblock.com | 200 | GCP | CNAME to business.deblock.com |
| business-uat-02.deblock.com | 503 | GCP | Service unavailable |

### CDN / Tracking / Email Infrastructure

| Subdomain | HTTP | Server | Notes |
|---|---|---|---|
| cdn1.deblock.com | 403 | AmazonS3 + CloudFront | S3 bucket, eu-west-3 |
| url8596.deblock.com | 404 | nginx + CloudFront | SendGrid click tracking |
| lk.deblock.com | 404 | msys-et + CloudFront | SparkPost/MessageSystems link tracking |
| email.mail.deblock.com | 404 | Mailgun | Mail delivery |
| status.deblock.com | 200 | nginx | Statuspal status page |
| support.deblock.com | - | Intercom | Customer support portal |

### Other/Special

| Subdomain | HTTP | Notes |
|---|---|---|
| privacy.deblock.com | 200 | Redirects to published Google Doc |
| web-partouche.prod.deblock.com | 502 | B2B client (Partouche casino group) - broken |
| next.deblock.com | 403 | FeatureUpvote behind Cloudflare |
| o1.ptr1807.deblock.com | - | DNS pointer record |

---

## 3. Non-Resolving Subdomains (No DNS / NXDOMAIN)

These have no A/AAAA/CNAME records - possibly decommissioned:

- web-app-uat-02.prod.deblock.com
- marqeta-sandbox.onb.deblock.com
- web-business.dev.deblock.com
- api-test.prod.deblock.com
- web-app-uat-01.prod.deblock.com
- web-app.prod.deblock.com
- vibe.deblock.com (empty zone, not NXDOMAIN)
- imap.deblock.com
- pop.deblock.com
- web.prod.deblock.com
- smtp.deblock.com
- web-business-uat-02.prod.deblock.com
- web-business-uat-01.prod.deblock.com
- web-app.dev.deblock.com
- web-app-test.dev.deblock.com
- retool.onb.deblock.com
- pay.deblock.com
- lyncdiscover.deblock.com
- cashback.deblock.com
- api-eval.onb.deblock.com
- blue.onb.deblock.com
- ftp.deblock.com
- onboarding-testing.onb.deblock.com
- autodiscover.deblock.com
- payments.prod.deblock.com
- sip.deblock.com
- yield.deblock.com

Notable: lyncdiscover + autodiscover + sip suggest former Microsoft/Lync/Skype for Business usage.

---

## 4. Technology Stack

### Backend
- Ruby on Rails 7.0.10 (web-api, waitlist services)
- Ruby 3.3.9
- PostgreSQL (database, schema v20260923100000)
- Sidekiq (background job processing)
- Rack 2.2.23
- RubyGems 3.5.22
- Airbrake (error monitoring)
- 8x Rack::CORS middleware instances

### Frontend
- Next.js (Vercel deployment, multiple sites)
- Turbopack (business.deblock.com - newer Next.js build system)
- React
- styled-components 5.3.11 (deblock.com)
- CSP with nonce-based script loading (business.deblock.com)

### CMS
- WordPress (brand.deblock.com)
  - PHP 8.3.33
  - LiteSpeed web server
  - Elementor Pro + Elementor One + Elementor AI
  - BackWPup (backup plugin)
  - wp/v2 REST API fully exposed

### Infrastructure
- Google Cloud Platform (primary backend)
- Vercel (frontend hosting)
- Heroku (legacy Rails APIs)
- AWS S3 (asset storage, eu-west-3)
- AWS CloudFront (CDN)
- Gandi (DNS, domain registrar)

### Email
- Google Workspace (corporate)
- SendGrid (transactional)
- Mailgun (transactional)
- Postmark (bounce handling)
- HubSpot (marketing)
- Brevo/Sendinblue (marketing)

---

## 5. Security Findings

### CRITICAL - Rails Debug Routes Exposed (web-api-staging.deblock.com)

The staging API at web-api-staging.deblock.com is running Rails in DEVELOPMENT mode
on a publicly accessible Heroku dyno. This exposes:

1. /rails/info/routes (HTTP 200) - Complete route listing with 100+ endpoints
2. /rails/info/properties (HTTP 200) - Full framework configuration including:
   - Rails 7.0.10, Ruby 3.3.9, Rack 2.2.23
   - Environment: development
   - Application root: /app
   - Database: PostgreSQL
   - Schema version: 20260923100000
   - Full middleware stack (31 components)
   - Airbrake error monitoring integration
3. /rails/mailers (HTTP 200) - Email template previews (UserNotifierMailer)
4. /sidekiq (HTTP 401) - Sidekiq dashboard exists (auth-protected)

Exposed route categories include:
- Admin ambassador management routes (/v1/admin/ambassador/*)
- User data deletion endpoint (/v1/remove/data/:token64)
- Twilio webhook endpoint (/v1/webhook/twilio/:hash)
- S3 upload endpoint (/v1/upload/anthony/:token)
- ActionMailbox ingress routes (Postmark, SendGrid, Mailgun, Mandrill)
- Company onboarding flow (email, phone, OTP verification)
- Ambassador signup, tracking, revenue, payment routes
- Mobile account deletion endpoint
- Blog cache deletion endpoints

Impact: Full API route map enables targeted attacks on production endpoints. Development
mode may expose detailed error traces. Schema version enables targeted SQL injection
if vulnerabilities exist.

### HIGH - WordPress User Enumeration & Plugin Exposure (brand.deblock.com)

- Admin user enumerated: admin-deblock (ID: 1) via /wp-json/wp/v2/users
- /wp-login.php accessible (HTTP 200)
- /admin redirects to /wp-admin/
- PHP version exposed in headers: PHP/8.3.33
- Server: LiteSpeed
- Full REST API namespace enumeration possible
- Plugins identified:
  - Elementor Pro (commercial page builder)
  - Elementor One (connect/authorize endpoints exposed)
  - Elementor AI (AI content generation)
  - BackWPup (backup plugin - may expose backup files)
  - wp-block-editor, wp-site-health, wp-abilities
- Elementor One connect/authorize route exposed: /elementor-one/v1/connect/authorize

Impact: Brute force against known admin user, plugin vulnerability exploitation,
backup file exposure, REST API abuse.

### MEDIUM - S3 Bucket Information Disclosure (cdn1.deblock.com)

- x-amz-bucket-region: eu-west-3 exposed in response headers
- AccessDenied XML error response (proper access control, but region leaked)
- CloudFront distribution ID partially visible in Via header

### MEDIUM - Staging/Dev Environments Publicly Accessible

Multiple staging and development environments are reachable from the internet:
- web-api-staging.deblock.com (Rails in dev mode with full debug)
- waitlist-staging.deblock.com (Rails default page)
- staging.deblock.com (full staging site)
- ambassadors-staging.deblock.com (staging ambassadors portal)
- auth.dev.deblock.com (dev auth service, 502)
- business-dev.deblock.com (dev business portal, 606)
- app-dev.deblock.com (dev app, 606)
- support.dev.deblock.com, transfers.dev.deblock.com, users.dev.deblock.com

### MEDIUM - Vercel SSO Redirect Exposure (staging-season1.deblock.com)

staging-season1.deblock.com redirects to Vercel SSO authentication:
https://vercel.com/sso-api?url=https%3A%2F%2Fstaging-season1.deblock.com%2F&nonce=...

This reveals Vercel organization SSO is in use and the specific nonce pattern.

### LOW - Email Security Gaps

- DMARC policy is "quarantine" (not "reject") - emails failing checks are quarantined, not rejected
- No DMARC forensic reporting (ruf) configured
- Multiple email service providers increase attack surface for phishing
- No BIMI record configured
- SPF includes 4 different email services

### LOW - Information Disclosure via robots.txt

robots.txt on deblock.com disallows:
- /Resume - possibly employee resumes
- /WphYZ/ - returns 308 redirect (shortened URL or hidden path)
- /Jordan, /miggy - possibly employee/test pages
- /vercel/path0/public/locales - reveals Vercel deployment path structure

### INFO - Broken/Decommissioned Services

- app.deblock.com: Returns 410 Gone (mobile API migrated)
- proof.prod.deblock.com: Returns 502 (broken)
- web-partouche.prod.deblock.com: Returns 502 (B2B client deployment broken)
- auth.dev.deblock.com: Returns 502 (dev auth broken)

---

## 6. Accessible API Endpoints (Staging)

Endpoints returning data without authentication on web-api-staging.deblock.com:

- GET /v1/company/countries -> 200 (returns supported country list with CDN URLs)
- GET /v1/company/types -> returns "uuid isn't valid" (requires session UUID)
- GET /v1/company/turnovers -> 200
- GET /v1/company/surveys -> returns "uuid isn't valid" (requires session UUID)
- GET /v1/check/callback -> 200

Endpoints returning 403 (API-key/token protected):
- /v1/blog/list, /v1/legals/list, /v1/coins/list/EUR/1
- /v1/acquiring/wallets, /v1/feature/show_sheet, /v1/web/widgets/en
- All /v1/admin/* endpoints

---

## 7. Interesting Endpoint Patterns for Further Testing

### High Priority
1. /v1/remove/data/:token64 - User data removal (GDPR). Test for IDOR.
2. /v1/upload/anthony/:token - S3 upload endpoint. Test for unrestricted upload.
3. /v1/webhook/twilio/:hash - Twilio webhook. Test hash validation bypass.
4. /v1/ambassador/:uuid/* - Ambassador portal. Test for IDOR/UUID enumeration.
5. /v1/mobile/account/:user_id - Account deletion. Test for IDOR.
6. /v1/mobile/request/contract/:user_id - Contract request. Test for IDOR.
7. /v1/blog/cache/delete/:key - Cache deletion. Test for unauthorized cache purge.
8. /v1/legals/cache/delete/:key - Cache deletion. Test for unauthorized cache purge.
9. /v1/faq/cache/delete/:key - Cache deletion. Test for unauthorized cache purge.
10. /v1/admin/ambassador/* - Admin panel. Test auth bypass.

### Medium Priority
11. /v1/waitlist/email + /v1/waitlist/email/verify - OTP flow. Test for rate limiting.
12. /v1/waitlist/phone + /v1/waitlist/phone/verify - SMS OTP flow. Test for SMS bombing.
13. /v1/company/* onboarding flow - Test for logic flaws.
14. /v1/ambassador/email + OTP flow - Test for account takeover.
15. /v1/bb/beta - Beta signup. Test for mass registration.
16. /v1/collection/:address - ETH collection lookup. Test for injection.
17. brand.deblock.com /wp-json/wp/v2/* - WordPress REST API. Test for content injection.
18. ActiveStorage direct_uploads - Test for unrestricted file upload.
19. Sidekiq at /sidekiq - Brute force basic auth.

---

## 8. Subdomain Takeover Assessment

No subdomain takeover vulnerabilities found:
- All 4 Heroku CNAMEs have active apps behind them
- Non-resolving subdomains are NXDOMAIN (no dangling CNAMEs)
- vibe.deblock.com has empty zone (no CNAME to claim)

---

## 9. Service Component Map (Status Page)

From status.deblock.com (all currently operational):
- Cryptocurrency: 10 blockchain networks (Bitcoin, Ethereum/ERC-20, Solana, Base, Hyperliquid Core, Polygon, Arbitrum, XRP Ledger, Cardano, BNB Smart Chain)
- Buy (Onramp) / Sell (Offramp)
- Crypto Swaps across all networks
- Crypto Transfers across all networks
- Vaults & Sub-accounts (Pockets, Fiat vaults, Crypto vaults)
- SEPA Bank Transfers (Receiving, Sending, Inter-user)
- Commodities
- Card payments, top-ups, ordering, management
- App access, Account creation, Live chat support

---

## 10. DNS TXT Records (Intelligence)

- Google Site Verification (3 separate tokens - multiple properties)
- Anthropic domain verification (anthropic-domain-verification-j0hjym)
- Dynatrace monitoring verification
- Brevo email marketing verification
- Notion workspace verification
- DMARC: v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc.rua@deblock.com
- SPF: v=spf1 include:_spf.google.com include:mail.zendesk.com include:_spf.hubspotemail.net include:146085943.spf05.hubspotemail.net -all

---

## 11. Recommended Next Steps

### Immediate (High Impact)
1. Test IDOR on /v1/remove/data/:token64, /v1/mobile/account/:user_id, /v1/ambassador/:uuid/* endpoints
2. Test auth bypass on /v1/admin/ambassador/* endpoints
3. Test unrestricted file upload on /v1/upload/anthony/:token
4. WordPress attack surface: brute force wp-login, plugin CVE scan, backup file enumeration
5. Test cache deletion endpoints for unauthorized access

### Short-term
6. Full OTP flow testing (rate limiting, bypass, reuse)
7. Test Twilio webhook hash validation
8. Enumerate WordPress plugins for known CVEs (Elementor Pro, BackWPup, Elementor AI)
9. Test company onboarding flow for logic flaws
10. Check if staging database contains production data

### Discovery
11. Search for additional subdomains via permutation (common patterns: admin, internal, grafana, kibana, jenkins)
12. JavaScript analysis on frontend apps for hidden API endpoints
13. Check for exposed .env files, source maps, and debug configs
14. Test Vercel deployment protection bypass on staging sites

---

## 12. Phase 2 - Active Testing Findings

### CRITICAL - Full Stack Traces with Source Paths Exposed (Staging)

web-api-staging.deblock.com returns detailed Ruby stack traces on errors, exposing:

1. Application controller paths, e.g.:
   - app/controllers/v1/ambassador_auto_signup_controller.rb:114:in 'ambassador_params'
   - app/controllers/v1/ambassador_auto_signup_controller.rb:10:in 'create'
   - This reveals full directory structure, controller naming, and line numbers

2. ActiveStorage direct_uploads endpoint (/rails/active_storage/direct_uploads) returns
   full 84-frame middleware stack trace on CSRF errors (422), confirming:
   - Rails 7.0.10 action_controller/metal/request_forgery_protection.rb
   - Airbrake 13.0.3 middleware
   - 8 separate rack-cors 1.1.1 middleware instances
   - Puma 7.2.1 server
   - ActionText rendering engine loaded
   - Full request lifecycle from Puma thread pool through all middleware

3. Production web-api.deblock.com also returns 422 on direct_uploads POST (no stack trace visible),
   confirming the same ActiveStorage endpoint exists in production but debug mode is off.

Impact: Stack traces give attackers exact file paths, gem versions, middleware order, and
application structure. Combined with the route map, this enables precision attacks.

### CRITICAL - Ambassador Signup Without Rate Limiting (Staging)

POST /v1/ambassador/email on web-api-staging.deblock.com accepts email registrations
with the nested params format {"ambassador":{"email":"..."}} and returns {"status":"ok"}.

Confirmed behavior:
- No rate limiting observed on repeated signups
- No CAPTCHA or anti-automation
- Triggers OTP email to the provided address
- The same endpoint pattern likely exists in production on web-api.deblock.com

This enables:
- Mass OTP SMS/email bombing by submitting arbitrary email addresses
- Potential OTP brute force (6-digit code = 1M combinations)
- Account enumeration by observing response differences

### HIGH - BackWPup Backup Plugin REST API Exposed (brand.deblock.com)

The BackWPup plugin exposes a full REST API namespace at /wp-json/backwpup/v1/ with endpoints:
- /storagelistcompact (401 - auth required)
- /cloud_is_authenticated (401 - auth required)
- /authenticate_cloud (POST - auth required)
- /delete_auth_cloud (POST - auth required)
- /cloudsaveandtest (POST - auth required)
- /chatbot-context (POST+GET - ACCEPTS UNAUTHENTICATED REQUESTS with context_id/context_token)
- /updatejob (POST - requires job_id)
- /update-job-title (POST - requires job_id, title)
- /addjob (POST - requires type)
- /delete_job (DELETE - requires job_id)
- /save_job_* endpoints

While most endpoints return 401, the chatbot-context endpoint responds to unauthenticated
requests (400 asking for parameters, not 401 forbidden). This may allow information
disclosure through the chatbot context mechanism.

Plugin version: Requires Elementor >= 3.34, tested up to WordPress 6.9.

### HIGH - WordPress Attack Surface Summary (brand.deblock.com)

Confirmed accessible without authentication:
- /wp-login.php (200) - Login form accessible
- /wp-json/wp/v2/users (200) - User enumeration: admin-deblock (ID:1)
- /wp-json/ - Full REST API discovery
- /wp-json/elementor-one/v1/connect/authorize - Elementor connection endpoint
- /wp-json/backwpup/v1/ - Backup plugin API (see above)
- PHP version in headers: 8.3.33
- Server: LiteSpeed

LiteSpeed blocks sensitive paths (.env, debug.log, backup-db/) with 403, which is
good but still confirms the server type and configuration.

### MEDIUM - CSP Policy Reveals Third-Party Integrations (business.deblock.com)

The Content Security Policy on business.deblock.com reveals all third-party service
integrations used by the business onboarding flow:

- Regula Forensics (faceapi.regulaforensics.com) - Document verification/KYC
- Sardine AI (api.sardine.ai, cdn.sardine.ai) - Fraud detection
- OneSignal (onesignal.com, os.tc) - Push notifications
- Dotfile (api.dotfile.com, app.dotfile.com) - Compliance/KYB verification
- Google Tag Manager, Google Analytics
- Intercom (intercomcdn.com, widget.intercom.io)
- Vercel analytics (va.vercel-scripts.com, vitals.vercel-insights.com)
- Sentry (sentry.io) - Error tracking for frontend
- Dynatrace JS injection

This reveals the full KYC/onboarding technology chain, valuable for social engineering
and targeted attacks on these third-party services.

### MEDIUM - Production and Staging Share Routes

Confirmed that production Heroku apps (web-api.deblock.com, waitlist-api.deblock.com)
serve the same route structure as staging:
- Both respond to /v1/company/countries with 200
- Both share the same Heroku routing infrastructure
- Production returns 404 on root (no default route) vs staging returning Rails default page

This confirms the staging route map is a reliable guide for production API testing.

### LOW - Security Headers Comparison

business.deblock.com (GCP/Next.js):
- Content-Security-Policy: comprehensive with nonce
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security: present
- Rating: GOOD

brand.deblock.com (WordPress/LiteSpeed):
- No CSP
- No X-Frame-Options
- No X-Content-Type-Options
- PHP version exposed
- Rating: WEAK

api.prod.deblock.com / app.deblock.com (GCP):
- Minimal security headers
- No CSP, no HSTS visible
- Rating: NEEDS IMPROVEMENT

### INFO - Frontend Obfuscation

- deblock.com Next.js build manifest is empty/obfuscated (no page routes revealed)
- No source maps found on any frontend JS chunks
- business.deblock.com uses Turbopack with server-side rendering (no /api/auth/* exposed)

---

## 13. Recommended Priority Attack Paths

Based on Phase 1 + Phase 2 findings, these are the highest-impact paths:

### P0 - Immediate High-Value Targets

1. Ambassador OTP Brute Force: Submit email to /v1/ambassador/email, then brute force
   the 6-digit OTP at /v1/ambassador/email/otp. No rate limiting confirmed on signup.
   If OTP verification also lacks rate limiting, account takeover is trivial.

2. WordPress Admin Brute Force: Known user admin-deblock, accessible wp-login.php.
   Test xmlrpc.php multicall amplification for password brute force.
   Check for weak/default passwords.

3. Admin API Auth Bypass: Test /v1/admin/ambassador/applicants and other /v1/admin/*
   endpoints with various auth header formats (Bearer token, API key, session cookie).
   The staging returns 403 but test for bypass vectors.

4. User Data Deletion IDOR: /v1/remove/data/:token64 - test with predictable/sequential
   tokens. If token generation is weak, arbitrary user data deletion is possible.

### P1 - Medium-Term Targets

5. ActiveStorage Upload Abuse: Direct uploads endpoint exists in production.
   If CSRF can be bypassed (e.g., with Origin header manipulation), unrestricted
   file upload to S3 is possible.

6. Twilio Webhook Spoofing: /v1/webhook/twilio/:hash - if hash validation is weak,
   SMS delivery status manipulation is possible.

7. Cache Poisoning: /v1/blog/cache/delete/:key, /v1/legals/cache/delete/:key,
   /v1/faq/cache/delete/:key - unauthorized cache purge could enable DoS or serve
   stale/manipulated content.

8. Company Onboarding Flow: Full KYB process via /v1/company/* - test for document
   upload bypass, identity verification skip, business logic flaws.

### P2 - Requires Authenticated Testing

9. Authenticated IDOR: With test account credentials, test /v1/mobile/account/:user_id,
   /v1/mobile/request/contract/:user_id, /v1/ambassador/:uuid/* for horizontal
   privilege escalation between users.

10. Token/Session Management: Test JWT/session token structure, expiry, refresh logic,
    concurrent session handling.

---

## 14. Session Notes

- Authorization: Written permission from CEO Jean Meyer
- Scope: Full assessment of deblock.com and all subdomains
- Second test account: Available on request for authenticated testing
- Session limitation: Auto mode safety classifier blocked outbound curl commands
  mid-session. Continuing active testing requires fresh session or manual permission mode.
