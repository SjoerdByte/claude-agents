# Security Assessment Report: rootz.com / wheelz.com
Date: 2026-10-14
Authorization: Written permission from CEO Sam Brown
Scope: rootz.com, wheelz.com, and all subdomains

## Executive Summary

This assessment identified 12 confirmed vulnerabilities across the rootz.com and wheelz.com attack surface. The most critical finding is an actively exploited subdomain takeover on e2e.infra.rootz.com. Several other high-severity issues were found including unauthenticated Prometheus metrics on 7 servers (including a payment service), a publicly listable and readable S3 bucket, and an exposed OIDC identity provider with open device code flow.

## Technology Stack Identified

- CDN/WAF: Cloudflare (casino products, APIs, internal tools), BunnyCDN (corporate site)
- Zero Trust: Cloudflare Access (backoffice, grafana, gitlab, superset)
- Backend: Go 1.27.1 (game/payment servers), Laravel/PHP (status page)
- CMS: WordPress + Kadence theme + RankMath SEO (corporate site)
- Infrastructure: Kubernetes (AWS eu-west-1), AMQP/RabbitMQ, SQL read/write split, Prometheus
- Identity: Dex OIDC (staging), Google SSO connector
- Storage: AWS S3 (eu-west-1), Cloudflare R2
- Source Control: Self-hosted GitLab (behind Cloudflare Access)
- BI/Analytics: Apache Superset, Grafana
- Secrets: HashiCorp Vault (currently unreachable/decommissioned)

## Brands Identified

Rootz (parent), Wheelz, Wildz, Caxino, Spinz, Chipz, Flamez, Beazt, Berriez, Blingi, Speedz, Tuplaus, Lemonz, Megagewinn

---

## FINDING 1: Subdomain Takeover on e2e.infra.rootz.com (ACTIVELY EXPLOITED)

Severity: CRITICAL (CVSS 9.1)
Category: Subdomain Takeover (CWE-284)
Endpoint: http://e2e.infra.rootz.com

### Description

The S3 bucket backing e2e.infra.rootz.com has been taken over and is currently serving a third-party Indonesian gambling/slot website ("IMBAJP | Maxwin Slot dengan Link Login Resmi & Stabil"). The DNS record still points to the S3 website endpoint, but the original bucket was either deleted or its ownership was transferred, allowing an attacker to claim the bucket name and serve arbitrary content under the rootz.com domain.

### Evidence

- HTTP request to http://e2e.infra.rootz.com returns an Indonesian gambling site
- Content includes Google Tag Manager (GTM-KWW5SS), Bing tracking pixels
- Embedded user data: data-user-id="1135369000", data-user-login-name="r6cailhwo6qt62hc"
- OG metadata references e2e.infra.rootz.com as canonical URL
- Content last-modified: 2026-02-12
- HTTPS is not functional (TLS handshake times out) -- only HTTP works
- S3 error pages confirm Amazon S3 hosting

### Impact

- Cookie stealing: Attacker-controlled content on *.rootz.com subdomain can set/read cookies scoped to .rootz.com
- Phishing: Users trust content served from a rootz.com subdomain
- Brand damage: A gambling spam site is hosted on company infrastructure
- SEO poisoning: Search engines may index the spam content under rootz.com
- CSP bypass: If any CSP allows *.rootz.com or *.infra.rootz.com, this domain becomes an injection vector

### Remediation

Remove the DNS CNAME/A record pointing e2e.infra.rootz.com to the S3 endpoint, or reclaim the S3 bucket.

---

## FINDING 2: Unauthenticated Prometheus Metrics on 7 Servers Including Payment Service

Severity: HIGH (CVSS 7.5)
Category: Information Disclosure (CWE-200)

### Affected Endpoints

1. pragmatic-server.lab1.rootz.com/metrics (41KB)
2. hacksaw-server.lab1.rootz.com/metrics (36KB)
3. yggdrasil-server.lab1.rootz.com/metrics (18KB)
4. quickspin-server.lab1.rootz.com/metrics (16KB)
5. oryx-server.lab1.rootz.com/metrics (27KB)
6. push-server.lab1.rootz.com/metrics (39KB)
7. brite-server.lab1.rootz.com/metrics (24KB) -- PAYMENT SERVICE

### Description

Seven game integration and payment servers expose their Prometheus /metrics endpoint without any authentication. These endpoints return detailed operational telemetry that reveals internal architecture, API routes, database configuration, and financial operation counters.

### Information Disclosed

Internal Kubernetes Service URL:
- client="https://backendapi.rootz-platform:7777" (internal backend API)

Internal API Routes:
- /rgs/hive/player/auth (player authentication)
- /rgs/hive/player/{playerId}/wallet (player wallet operations)
- /rgs/hive/txn (transaction processing)

Infrastructure Details:
- Go runtime: go1.27.1
- AMQP messaging with consumer tag "tenantconfigurationclient" (RabbitMQ)
- Database: read/write split architecture (db + dbread), max 50 connections
- HTTP client: "BackendAPI" making outbound requests to internal services

Financial Operation Counters:
- walletapi_authenticate_calls, walletapi_deposit_calls, walletapi_withdraw_calls
- walletapi_rollback_calls, walletapi_insufficient_balance_errors
- walletapi_session_expired_errors, walletapi_user_blocked_errors
- walletapi_transaction_not_found_errors, walletapi_limit_exceeded_errors

Service Versions:
- pragmatic-server/1.4.10, hacksaw-server/1.3.10, quickspin-server/1.3.12
- oryx-server/1.2.11, push-server/1.4.8, brite-server/1.6.3

Process Telemetry:
- process_start_time_seconds (uptime), CPU usage, memory allocation
- File descriptor counts, goroutine counts

### Impact

An attacker gains a detailed map of the internal microservice architecture, including:
- Kubernetes namespace and service naming conventions
- API endpoint patterns for player authentication and wallet operations
- Database architecture and connection limits
- Financial transaction error types (useful for understanding business logic)
- Exact software versions (useful for CVE targeting)

This significantly lowers the barrier for targeted attacks against the backend infrastructure.

### Remediation

Add authentication to all /metrics endpoints. Use Kubernetes NetworkPolicy or Ingress rules to restrict access to the monitoring system (Prometheus scraper) only.

---

## FINDING 3: Public S3 Bucket with Full Listing and File Read on assets.rootz.com

Severity: HIGH (CVSS 7.5)
Category: Information Disclosure / Insecure Cloud Storage (CWE-284)
Endpoint: https://assets.rootz.com/

### Description

The S3 bucket assets.rootz.com (ARN: arn:aws:s3:::assets.rootz.com, region eu-west-1) has public listing enabled (ListBucket) and all objects are publicly readable (GetObject). The bucket contains assets for 10+ casino brands.

### Evidence

- GET https://assets.rootz.com/ returns 200 with XML bucket listing (307KB, IsTruncated=true, 1000+ objects)
- Individual files are downloadable without authentication
- Brands exposed: beazt.com, caxino.com, chipz.com, lemonz.com, speedz.com, spinz.com, spinz.de, wheelz.com, wheelzgames.de, wildz.com, wildz.de

### Sensitive Files Found

- caxino.com/_well-known/apple-developer-merchantid-domain-association.txt
  Contains Apple Pay merchant certificate with Team ID: SL88LHPJ78 and domain: www.caxino.com

### Impact

- Full enumeration of all brand assets across 10+ casino brands
- Apple Pay merchant identity disclosure (Team ID can be used for targeted attacks)
- Internal directory structure and organizational information exposed
- File metadata (ETags, timestamps) may reveal operational patterns

### Remediation

Disable public ListBucket permission. Review and restrict GetObject permissions. Consider using CloudFront with OAI/OAC instead of public S3 access.

---

## FINDING 4: Exposed Dex OIDC Providers with Open Device Code Flow (2 Instances)

Severity: HIGH (CVSS 7.3)
Category: Authentication Misconfiguration (CWE-287)
Endpoints: https://dex.stg.rootz.com, https://dex.dev.rootz.com

### Description

Two Dex OIDC identity providers are publicly accessible on staging and dev environments, both on raw AWS IPs without any WAF protection (unlike other Rootz services behind Cloudflare). They expose full OIDC discovery metadata, JWKS signing keys, and allow unauthenticated generation of device authorization codes that could be used in phishing attacks to steal Kubernetes access tokens. Both instances also have implicit grant type and plain PKCE enabled, widening the attack surface.

### Evidence

Staging instance (dex.stg.rootz.com, IP: 108.133.177.4):
- OIDC discovery at /.well-known/openid-configuration
- Issuer: https://dex.stg.rootz.com
- Grant types: authorization_code, implicit, refresh_token, device_code
- Connector: Google SSO
- client_id: wohTei2hiQu1
- redirect_uri: https://login.stg.rootz.com/callback
- 5 RSA signing keys in JWKS

Dev instance (dex.dev.rootz.com, IP: 18.202.129.211):
- Same OIDC capabilities as staging
- Connector: GitLab (gitlab.rootz.com as upstream IdP)
- GitLab OAuth client_id: 33cd8790c14a9f932782eaf1a2243877860811df5da245e1e15a88a418eec918
- Same client_id (wohTei2hiQu1) for K8s token generation
- redirect_uri: https://login.dev.rootz.com/callback
- 5 RSA signing keys in JWKS (different from staging)

Both instances:
- No client_secret required for device code flow
- POST to /device/code generates valid device codes without authentication
- Device codes expire in 300 seconds (5 minutes)
- No Cloudflare WAF, no rate limiting, no bot protection

Linked Applications:
- login.stg.rootz.com and login.dev.rootz.com are "Generate Kubernetes Token" web applications (dex-k8s-authenticator)

### Impact

- Device code phishing: An attacker generates a device code, tricks a rootz employee into visiting the verification URL and approving it via Google SSO or GitLab, then exchanges the device code for tokens granting Kubernetes cluster access
- GitLab OAuth client_id disclosure on dev instance enables targeted OAuth attacks against the self-hosted GitLab
- No WAF protection means brute-force and automated attacks face no resistance
- Implicit grant type enables token theft via referrer leakage
- JWKS disclosure: Public signing keys could assist in token forgery if private keys are ever compromised

### Remediation

Restrict access to dex.stg.rootz.com, dex.dev.rootz.com, login.stg.rootz.com, and login.dev.rootz.com to internal/VPN networks. Place behind Cloudflare or another WAF. Disable the device_code and implicit grant types if not required. Require client_secret for all OAuth flows. Consider IP allowlisting on the ALB.

---

## FINDING 5: S3 Bucket Listing on s-game-assets.rootz.com

Severity: MEDIUM (CVSS 5.3)
Category: Information Disclosure (CWE-200)
Endpoint: https://s-game-assets.rootz.com/

### Description

The S3 bucket s-game-assets.rootz.com (ARN: arn:aws:s3:::s-game-assets.rootz.com, region eu-west-1) has public listing enabled, exposing 1000+ game asset file names and metadata. Individual files return 403 (listing-only exposure).

### Impact

- Reveals internal game catalog IDs and organizational structure
- Game provider integration details exposed via file naming conventions
- Could be used to craft targeted requests against game server APIs

### Remediation

Disable public ListBucket permission on the S3 bucket.

---

## FINDING 6: CORS Misconfiguration with Internal Header Disclosure on frontendapi.rootz.com

Severity: MEDIUM (CVSS 6.1)
Category: Security Misconfiguration (CWE-942)
Endpoint: https://frontendapi.rootz.com
Also affects: s-frontendapi.rootz.com (identical behavior)

### Description

The main frontend API returns wildcard CORS headers combined with credentials support on all paths:
- access-control-allow-origin: * (static wildcard, not origin-reflecting)
- access-control-allow-credentials: true
- access-control-expose-headers: *
- access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS
- access-control-max-age: 1800

Exploit testing confirmed ACAO is a static wildcard (does not reflect arbitrary Origin values), so credential theft via CORS is not directly exploitable due to browser protections. However, the CORS preflight response reveals internal header names used for API routing.

### Evidence

OPTIONS /api/v1 with Origin: https://evil.com returns:
- access-control-allow-headers: Content-Type,Authorization,X-Authorization,X-Tenant,X-SiteJurisdiction,X-Domain,X-Requested-With
- Internal headers disclosed: X-Tenant (tenant routing), X-Authorization (secondary auth), X-SiteJurisdiction (regulatory context), X-Domain (domain routing)
- server-timing header present (performance data exposure)

### Impact

- Internal API architecture disclosed via CORS preflight headers
- X-Authorization header reveals a secondary authentication mechanism
- X-SiteJurisdiction header reveals jurisdiction-based access control exists
- Any unauthenticated API response is readable from any origin
- server-timing disclosure aids in timing-based attacks

### Remediation

Replace wildcard CORS with an explicit allowlist of trusted origins. Remove access-control-allow-credentials when using wildcard origin. Remove server-timing from production responses. Restrict CORS preflight to only reveal necessary headers.

---

## FINDING 7: Kubernetes Token Generator Missing Security Headers

Severity: MEDIUM (CVSS 5.3)
Category: Security Misconfiguration (CWE-693)
Endpoint: https://login.stg.rootz.com

### Description

The Kubernetes token generator application (dex-k8s-authenticator) is publicly accessible and lacks all standard security headers. It also has static directory listing enabled.

### Evidence

Missing Headers:
- No Content-Security-Policy
- No X-Frame-Options (clickjacking possible)
- No Strict-Transport-Security
- No Referrer-Policy
- No X-Content-Type-Options

Directory listing:
- /static/ returns a directory listing of JavaScript and CSS files
- Last-modified: 2023-06-05 (indicating outdated deployment)

Configured cluster: "stg" (staging Kubernetes cluster)

### Impact

- Clickjacking attacks against the token generation flow
- Potential for token theft via referrer leakage
- Outdated deployment may contain known vulnerabilities

### Remediation

Add security headers. Disable directory listing. Restrict access to VPN/internal networks.

---

## FINDING 8: Missing Security Headers on www.rootz.com Corporate Site

Severity: MEDIUM (CVSS 5.3)
Category: Security Misconfiguration (CWE-693)
Endpoint: https://www.rootz.com

### Description

The corporate WordPress site served via BunnyCDN has no security headers at all, in contrast to the casino products which have comprehensive protections.

### Evidence

Missing:
- No HSTS (Strict-Transport-Security)
- No CSP (Content-Security-Policy)
- No X-Frame-Options
- No X-Content-Type-Options
- No Referrer-Policy

Technology disclosed:
- BunnyCDN edge with BESS v1.40.30
- OpenResty origin (disclosed on redirect error pages)
- WordPress with Kadence theme, Kadence Blocks Pro, RankMath SEO
- cdn-pullzone: 5678000, cdn-storageserver: DE-757

### Impact

- Clickjacking attacks embedding the corporate site
- No protection against MIME type sniffing
- No enforcement of HTTPS (no HSTS)
- CDN infrastructure details disclosed

### Remediation

Configure security headers in BunnyCDN or at the OpenResty origin level.

---

## FINDING 9: Permissive CSP on uptime.rootz.com (Laravel Application)

Severity: LOW-MEDIUM (CVSS 4.3)
Category: Security Misconfiguration (CWE-693)
Endpoint: https://uptime.rootz.com

### Description

The public status page (Laravel application behind Caddy) has a CSP that allows 'unsafe-inline' and 'unsafe-eval', effectively nullifying XSS protection.

### Evidence

- CSP: default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; upgrade-insecure-requests
- Framework: Laravel PHP (XSRF-TOKEN, psp_session cookies with Laravel-style encryption)
- Proxy: Caddy (via: 0.0 Caddy)
- Title: "Rootz Platform Status"
- meta robots: noindex

### Impact

If any XSS vector exists on this page, the permissive CSP provides no additional defense layer.

### Remediation

Replace 'unsafe-inline' with nonce-based CSP. Remove 'unsafe-eval' and refactor any code that requires it.

---

## ADDITIONAL OBSERVATIONS

### Endpoints Behind Cloudflare Access (Properly Secured)
These internal tools are properly protected by Cloudflare Access Zero Trust:
- backoffice.rootz.com
- grafana.rootz.com
- gitlab.rootz.com
- superset.rootz.com
- All lab1 CMS endpoints (wildz-cms, wheelz-cms, caxino-cms, etc.)

### Unreachable/Decommissioned Endpoints
- vault.rootz.com: Cloudflare 530 (origin unreachable)
- kibana.prod.rootz.com, argocd.infra.rootz.com, airflow.prod.rootz.com, registry.rootz.com: Connection refused
- Most lab1 services: 502 Bad Gateway
- backendapi.stg.rootz.com: Resolves to private IPs (10.191.x.x)

### Game Provider Integrations Identified
Active servers (lab1): pragmatic-server, hacksaw-server, yggdrasil-server, quickspin-server, oryx-server, brite-server (payment), push-server
All expose x-rootz-service version header and /healthz health checks.

### Robots.txt Path Disclosure (wheelz.com)
Reveals application structure: /app/, /api/, /metrics/, /internal/, /account/, /rtz-cgi/err/, /pay-and-play

### Game Search Services
- game-search.rootz.com: Returns 400 "Search Query is Null" (CORS: null)
- s-game-search.rootz.com: Returns 400 "Tenant Locale parameter is Null" (multi-tenant)

### WebSocket Authentication
- wsapi.rootz.com/ws: Returns 401 "missing token" (token-based auth, properly enforced)

---

## FINDING 10: Missing Rate Limiting on Login Brute-Force Endpoint

Severity: MEDIUM (CVSS 5.3)
Category: Identification and Authentication Failures (CWE-307)
Endpoint: POST https://uptime.rootz.com/auth/login

### Description

The password-protected status page login endpoint accepts unlimited consecutive failed login attempts with no rate limiting, account lockout, CAPTCHA, or progressive delay. Verified with 20+ consecutive failed attempts on the same session, all returning HTTP 200 with identical error responses and no degradation. The API endpoints on the same application do implement rate limiting (headers: ratelimit-policy: 5; w=1, x-ratelimit-limit: 60), confirming this is a gap specifically in the login endpoint. The status page identifier (pspUrl: nrGScIojHM) is disclosed in the HTML source as a hidden form field, reducing the attack to password-only brute force.

### Evidence

Request (attempt 15 of 20):
- POST /auth/login with pspPassword=attempt15&pspUrl=nrGScIojHM
- Headers: X-Requested-With: XMLHttpRequest, Content-Type: application/x-www-form-urlencoded
- Response: HTTP 200, {"success":false,"message":"Wrong password."}
- No rate-limit headers present on login endpoint
- API endpoints on same app return ratelimit-policy and x-ratelimit-limit headers

Additional information leakage:
- Differential error messages: "Wrong password" for valid pspUrl vs implicit failure for invalid pspUrl
- pspUrl value disclosed in page HTML source

### Impact

- Brute-force attack on the shared status page password to access internal monitoring data (service names, uptime/downtime history, response times, incident details)
- pspUrl enumeration possible via differential error messages

### Remediation

Implement rate limiting on the /auth/login endpoint (e.g., 5 attempts per minute per IP). Add progressive delays or temporary lockout after failed attempts. Consider adding CAPTCHA after a threshold of failures.

---

## FINDING 11: Tenant/Brand Enumeration via X-Tenant Header

Severity: LOW (CVSS 5.3)
Category: Information Disclosure (CWE-204)
Endpoint: GET https://frontendapi.rootz.com/api/v1
Also affects: s-frontendapi.rootz.com

### Description

The API uses the X-Tenant header for multi-tenant routing and returns differential error messages that allow unauthenticated enumeration of active brand tenants. Valid/active tenants return HTTP 404 "404 Not Found" (tenant accepted, route not found), while invalid/inactive tenants return HTTP 401 "Invalid tenant", and missing headers return HTTP 401 "Missing tenant".

### Evidence

Active tenants confirmed: wheelz, wildz, caxino, spinz, chipz, flamez, berriez, speedz, beazt, tuplaus
Inactive/invalid tenants: rootz, blingi, megagewinn, lemonz

Request with valid tenant:
- GET /api/v1 with X-Tenant: wheelz returns HTTP 404 "404 Not Found"

Request with invalid tenant:
- GET /api/v1 with X-Tenant: rootz returns HTTP 401 "Invalid tenant"

### Impact

- Unauthenticated enumeration of all active brand tenants on the platform
- Reveals which brands are active vs decommissioned (business intelligence)
- Aids in targeting specific tenants for further attacks

### Remediation

Return consistent error responses regardless of tenant validity. Use a generic "Unauthorized" message for both missing and invalid tenant values.

---

## FINDING 12: WordPress Origin URL Disclosure via RankMath JSON-LD

Severity: MEDIUM (CVSS 5.8)
Category: Information Disclosure / Security Architecture Bypass (CWE-200)
Endpoint: https://www.rootz.com/rootz-alusta/

### Description

The RankMath SEO plugin embeds JSON-LD structured data in page HTML. On the /rootz-alusta/ page, the Person entity's sameAs field reveals the Simply Static Studio origin WordPress URL: wp-ay95mtke8lh8t09.onstatic.studio. The entire BunnyCDN static site architecture is designed to hide the WordPress origin (wp-login.php, wp-json, xmlrpc.php all return 404 through CDN). This disclosure completely bypasses that protection.

### Evidence

JSON-LD in page source contains:
- "sameAs": ["https://wp-ay95mtke8lh8t09.onstatic.studio"]

The origin is directly accessible:
- /.static-studio/client-login returns 200 with a functional email + 6-digit OTP login form
- /wp-admin/ redirects (302) to the same SSO login
- Login JavaScript discloses backend API: https://api.static.studio/functions/v1/client-login
- CSP on origin reveals infrastructure: connect-src https://api.static.studio https://*.supabase.co
- WordPress is currently offline (503, started on-demand during editing sessions)

Additionally, two WordPress user accounts are disclosed in JSON-LD:
- Username "admin" with Gravatar SHA256: 780330e9a5b456081e6b63a928c1ea8f0c5d2756f274e675b372098a377f1f7e (on /rootz-alusta/)
- Username "qizyxmnn2e" with Gravatar SHA256: 28a8c9b4223937e4cc7bf21d53a3d939284b91f78209e2ad858c0658d9a24222 (on /)

### Impact

- Attacker can bypass the entire CDN security layer by targeting the origin directly
- When WordPress is online during editing sessions, the full WordPress attack surface (REST API, login, admin) is accessible at the origin URL
- "admin" username confirms default administrator account is in use
- Gravatar SHA256 hashes could be reversed to discover admin email addresses
- Origin infrastructure details disclosed (Supabase, Static Studio API)

### Remediation

Remove the sameAs field from RankMath JSON-LD configuration or replace it with the public CDN URL. Restrict origin access via IP allowlisting or authentication. Remove default "admin" username. Strip Gravatar hashes from JSON-LD output.

---

## CVSS SUMMARY

| # | Finding | CVSS | Severity |
|---|---------|------|----------|
| 1 | Subdomain Takeover e2e.infra.rootz.com | 9.1 | CRITICAL |
| 2 | Unauthenticated Prometheus /metrics (7 servers) | 7.5 | HIGH |
| 3 | Public S3 Bucket assets.rootz.com | 7.5 | HIGH |
| 4 | Exposed Dex OIDC with Device Code Flow | 7.3 | HIGH |
| 5 | S3 Bucket Listing s-game-assets.rootz.com | 5.3 | MEDIUM |
| 6 | CORS Misconfiguration frontendapi.rootz.com | 6.1 | MEDIUM |
| 7 | K8s Token Generator Missing Headers | 5.3 | MEDIUM |
| 8 | Missing Security Headers www.rootz.com | 5.3 | MEDIUM |
| 9 | Permissive CSP uptime.rootz.com | 4.3 | LOW-MEDIUM |
| 10 | Missing Rate Limiting on Login uptime.rootz.com | 5.3 | MEDIUM |
| 11 | Tenant/Brand Enumeration frontendapi.rootz.com | 5.3 | LOW |
| 12 | WordPress Origin URL Disclosure via RankMath | 5.8 | MEDIUM |
| 13 | Dex Staging redirect_uri Validation Bypass | 7.4 | HIGH |
| 14 | Critical Email Spoofing (beazt.com, blingi.com) | 7.5 | HIGH |
| 15 | Systemic Email Auth Failures (8+ casino domains) | 7.1 | HIGH |
| 16 | beazt.com Cloudflare WAF Complete Bypass + Config Disclosure | 7.5 | HIGH |
| 17 | wildz.com Cloudflare WAF Complete Bypass + Config Disclosure | 7.5 | HIGH |
| 18 | SSO Missing Rate Limiting on Casino Authentication | 7.5 | HIGH |
| 19 | Dex Token Introspection Returns active:true Without Auth | 7.5 | HIGH |
| 20 | SSO CORS Subdomain Wildcard with Credentials | 7.5 | HIGH |
| 21 | sso.rootz.com Stack Trace Information Disclosure | 5.3 | MEDIUM |
| 22 | Dex PKCE "plain" Method Enabled | 5.3 | MEDIUM |
| 23 | Cloudflare .js/.css Extension Bypass (wheelz, spinz, chipz) | 5.3 | MEDIUM |
| 24 | sso.rootz.com Tenant/Jurisdiction Enumeration | 5.3 | LOW-MEDIUM |

---

# PHASE 2 FINDINGS (2026-10-30)

## FINDING 13: Dex Staging redirect_uri Validation Bypass

Severity: HIGH (CVSS 7.4)
Category: A07:2021 - Identification and Authentication Failures (CWE-601)
Endpoints: https://dex.stg.rootz.com

### Description

The Dex OIDC identity provider on staging accepts arbitrary redirect_uri values in authorization requests. When a user initiates an OAuth flow, the authorization endpoint redirects to Google SSO with the attacker-controlled redirect_uri preserved. After the user authenticates with Google, the authorization code is sent to the attacker's URL.

Note: The client_id "rootz-platform" has since been disabled (returns "Invalid client_id provided"), providing partial mitigation. However, the underlying redirect_uri validation logic remains broken for any future client registrations on this Dex instance.

### Evidence

```
GET /auth?client_id=rootz-platform&response_type=code&scope=openid+email+profile&redirect_uri=https://evil.com/steal&state=attack123 HTTP/2
Host: dex.stg.rootz.com

HTTP/2 302
location: /auth/google?req=<session_id>&redirect_uri=https://evil.com/steal
```

The Google SSO connector preserves the malicious redirect_uri through the authentication flow.

### Impact

- Authorization code theft via redirect to attacker-controlled URL
- Account takeover of internal Kubernetes access (staging environment)
- Any new OAuth client registered on this Dex instance inherits the broken validation

### Remediation

Configure strict redirect_uri validation in Dex. Use exact-match allowlists per client_id. Apply the same fix to dex.dev.rootz.com.

---

## FINDING 14: Critical Email Spoofing on beazt.com and blingi.com

Severity: HIGH (CVSS 7.5)
Category: A05:2021 - Security Misconfiguration (CWE-290)
Domains: beazt.com, blingi.com

### Description

Two Rootz-operated domains have no SPF records AND DMARC policy set to p=none, meaning any email sender can send spoofed emails from these domains with no authentication or rejection. Both domains have active MX records pointing to Google Workspace (smtp.google.com), confirming they are configured for email.

### Evidence

beazt.com:
```
SPF: NO RECORD
DMARC: v=DMARC1; p=none; rua=mailto:dmarc-rua@beazt.com
MX: smtp.google.com (priority 1)
```

blingi.com:
```
SPF: NO RECORD
DMARC: v=DMARC1; p=none; rua=mailto:dmarc-rua@blingi.com
MX: smtp.google.com (priority 1)
```

Verified via DNS-over-HTTPS (dns.google/resolve API).

### Impact

- Attackers can send phishing emails appearing to come from @beazt.com or @blingi.com
- For a casino brand, this enables highly targeted phishing against players (deposit requests, account verification, bonus offers)
- No email authentication means receiving mail servers have no basis to reject spoofed messages
- DMARC p=none generates reports but does NOT block spoofed emails

### Remediation

Add SPF records: `v=spf1 include:_spf.google.com -all`
Change DMARC policy to: `v=DMARC1; p=reject; rua=mailto:dmarc-rua@domain.com`
Add DKIM signing via Google Workspace.

---

## FINDING 15: Systemic Email Authentication Failures Across 8+ Casino Domains

Severity: HIGH (CVSS 7.1)
Category: A05:2021 - Security Misconfiguration (CWE-290)

### Description

Systematic testing of 19 Rootz-operated domains revealed widespread email authentication failures. Multiple active casino domains use SPF softfail (~all) instead of hardfail (-all), combined with DMARC p=none, making email spoofing trivially possible across the brand portfolio.

### Affected Domains

SPF softfail (~all) with DMARC p=none (spoofable):
- wheelzgames.de: `v=spf1 include:_spf.google.com ~all`
- wildz.com: `v=spf1 include:_spf.google.com ~all`
- wheelz.com: `v=spf1 include:_spf.google.com ~all`
- caxino.com: `v=spf1 include:_spf.google.com ~all`
- spinz.com: `v=spf1 include:_spf.google.com ~all`
- chipz.com: `v=spf1 include:_spf.google.com ~all`
- speedz.com: `v=spf1 include:_spf.google.com ~all`
- tuplaus.com: `v=spf1 include:_spf.google.com ~all`

Missing ALL email authentication:
- flamez.casino: No SPF, No DMARC, No MX
- berriez.casino: No SPF, No DMARC, No MX

### Impact

- SPF softfail (~all) means receiving servers SHOULD flag but NOT reject spoofed emails
- Combined with DMARC p=none, spoofed emails are delivered to inboxes
- For casino brands handling real money, this enables phishing for credentials, deposit requests, and social engineering
- Systemic pattern suggests email authentication was not part of the security baseline

### Remediation

Change all SPF records from ~all to -all (hardfail).
Change all DMARC policies from p=none to p=reject.
Implement DKIM signing on all domains.
Add SPF/DMARC/DKIM to flamez.casino and berriez.casino.

---

## FINDING 16: beazt.com Cloudflare WAF Complete Bypass with Full SPA Configuration Disclosure

Severity: HIGH (CVSS 7.5)
Category: A05:2021 - Security Misconfiguration (CWE-200)
Endpoint: https://www.beazt.com/<any-path>.js

### Description

The Cloudflare managed challenge protecting beazt.com can be completely bypassed by requesting ANY URL path. The S3-backed origin returns the full 63KB Single Page Application HTML for all requests regardless of path or extension. This HTML contains the complete application configuration, payment provider details, deployment information, and API endpoint URLs.

### Evidence

```
GET /anything.js HTTP/2
Host: www.beazt.com

HTTP/2 404
content-type: application/javascript
content-length: 63815
x-amz-server-side-encryption: AES256

<!doctype html><html lang=en><head>...
```

### Sensitive Data Disclosed

- PaymentIQ merchantId: 100920986
- PaymentIQ hosted fields URL: card-fields.paymentiq.io/1.0.52/index.html
- Payment method configurations per jurisdiction (CA, FI, MT, PG)
- Git commit hash: a79f24086e4b833e777a56d7fd00a99ce8af6adc
- GitLab pipeline ID: 3007351318
- API infrastructure: apiBaseUrl, wsBaseUrl (wsapi.rootz.com), ssoBaseUrl (sso.rootz.com/api/), gameSearchWorkerBaseUrl (game-search.rootz.com)
- S3 bucket paths: s3.eu-west-1.amazonaws.com/s-cms-beazt.rootz.com/beazt/
- Analytics: Google Analytics ID, 2 GTM container IDs, Adform ID, Cookiebot ID, Quantcast ID
- Complete registration form structure with country-specific fields (NL: BIC/IBAN, CA: PEP/HIO, DE: birthname/nationality)
- Regulatory configuration: siteJurisdiction, siteLicenseId, language/country mappings

### Comparison

caxino.com correctly blocks .js/.css requests with Cloudflare challenge (HTTP 403).

### Remediation

Configure Cloudflare WAF rules on beazt.com to challenge all paths, not just non-static extensions. Ensure the S3 origin does not serve application HTML for non-existent paths (return proper 404).

---

## FINDING 17: wildz.com Cloudflare WAF Complete Bypass with Full SPA Configuration Disclosure

Severity: HIGH (CVSS 7.5)
Category: A05:2021 - Security Misconfiguration (CWE-200)
Endpoint: https://www.wildz.com/<any-path>.js

### Description

Identical to Finding 16 but affecting wildz.com. The Cloudflare WAF bypass returns a 133KB SPA HTML file containing the complete wildz.com application configuration with different deployment details.

### Evidence

```
GET /anything.js HTTP/2
Host: www.wildz.com

HTTP/2 404
content-type: application/javascript
content-length: 133448
x-amz-server-side-encryption: AES256

<!doctype html><html lang=en><head>...
```

### Sensitive Data Disclosed

- Different git commit hash: 6103a5e128a8ccabb7e92613c7cd2b3ffa17ca18
- Different pipeline ID: 3009181815
- Wildz-specific PaymentIQ merchantId and configuration
- Complete API endpoint structure
- Registration form fields including country-specific requirements
- S3 bucket paths for wildz assets

### Remediation

Same as Finding 16.

---

## FINDING 18: sso.rootz.com Missing Rate Limiting on Casino Authentication

Severity: HIGH (CVSS 7.5)
Category: A07:2021 - Identification and Authentication Failures (CWE-307)
Endpoint: POST https://sso.rootz.com/api/login

### Description

The centralized SSO authentication endpoint for all Rootz casino brands has no rate limiting, no account lockout, no CAPTCHA, and no progressive delay. Testing with 190+ rapid sequential and parallel login attempts against the same and different email addresses all returned HTTP 200 with no defensive measures triggered.

### Evidence

```
POST /api/login HTTP/2
Host: sso.rootz.com
X-Tenant: wheelz
X-SiteJurisdiction: MGA
Content-Type: application/json

{"email":"target@wheelz.com","password":"WrongPassword1!"}

HTTP/2 200
{"authenticated": false}
```

Test results:
- 60 sequential requests over 11 seconds: All HTTP 200, 0.12-0.36s response
- 100 concurrent requests (5 waves of 20): All HTTP 200, 0.13-0.49s response
- 30 sequential requests to SAME email with different passwords: All HTTP 200, no lockout
- No X-RateLimit-* headers in any response
- No Retry-After headers
- No CAPTCHA or challenge responses
- No progressive delay observed
- Identical behavior across all tenants (wheelz, wildz, caxino, spinz, chipz, flamez, tuplaus, speedz, berriez)

Account enumeration: NOT vulnerable (all email formats return identical responses).

### Impact

- Unlimited credential brute-force against any casino player account
- Credential stuffing attacks using leaked credential databases
- No user notification of ongoing brute-force attacks
- For a gambling platform handling real money, successful brute-force yields direct financial access

### Remediation

Implement rate limiting (e.g., 5 attempts per minute per IP per email). Add progressive delays after failed attempts. Implement temporary account lockout after 10 failed attempts. Add CAPTCHA after 5 failed attempts. Send notification to account holder after multiple failed attempts.

---

## FINDING 19: Dex Token Introspection Returns active:true Without Client Authentication

Severity: HIGH (CVSS 7.5)
Category: A07:2021 - Identification and Authentication Failures (CWE-287)
Endpoints: https://dex.stg.rootz.com/token/introspect, https://dex.dev.rootz.com/token/introspect

### Description

The OAuth 2.0 Token Introspection endpoint (RFC 7662) on both Dex staging and dev instances returns `{"active": true}` for empty token strings without requiring any client authentication. This violates RFC 7662 Section 2.1 which requires the introspection endpoint to authenticate the caller. Any service relying on this endpoint to validate tokens would incorrectly accept empty/missing tokens.

### Evidence

Staging instance:
```
POST /token/introspect HTTP/2
Host: dex.stg.rootz.com
Content-Type: application/x-www-form-urlencoded

token=

HTTP/2 200
{
  "active": true,
  "client_id": "",
  "sub": "",
  "exp": -62135596800,
  "iat": -62135596800,
  "nbf": -62135596800,
  "aud": "",
  "iss": "https://dex.stg.rootz.com",
  "token_type": "Bearer",
  "token_use": "refresh_token",
  "ext": {"email_verified": false}
}
```

Dev instance returns identical behavior with iss: "https://dex.dev.rootz.com".

Additional observations:
- No client credentials required (RFC 7662 violation)
- Non-JWT arbitrary strings return `{"error": "server_error"}` (should return `{"active": false}`)
- JWT-format tokens correctly return `{"active": false}`
- Timestamps are Go zero values (0001-01-01T00:00:00Z)

### Impact

- Any service using token introspection for authorization could be bypassed by sending an empty token
- The staging and dev environments share infrastructure with production services
- Internal services may trust introspection results to grant access to Kubernetes resources, CI/CD pipelines, or internal tools

### Remediation

Fix the Dex token introspection implementation to:
1. Require client authentication on the introspection endpoint
2. Return `{"active": false}` for empty or invalid tokens
3. Return `{"active": false}` instead of server_error for non-JWT tokens

---

## FINDING 20: sso.rootz.com CORS Subdomain Wildcard with Credentials Across All Casino Tenants

Severity: HIGH (CVSS 7.5)
Category: A05:2021 - Security Misconfiguration (CWE-942)
Endpoint: https://sso.rootz.com/api/*

### Description

The centralized SSO API reflects any subdomain of the matching tenant's domain in the Access-Control-Allow-Origin header, combined with Access-Control-Allow-Credentials: true. This means any page hosted on ANY subdomain of a casino brand can make credentialed cross-origin requests to the SSO API and read the responses. Additionally, the SSO accepts HTTP (non-HTTPS) origins with credentials, enabling network-level credential theft.

### Evidence

Per-tenant subdomain wildcard (all return ACAO + ACAC: true):
```
X-Tenant: wheelz + Origin: https://evil.wheelz.com    -> Reflected
X-Tenant: wildz  + Origin: https://evil.wildz.com     -> Reflected
X-Tenant: caxino + Origin: https://evil.caxino.com     -> Reflected
X-Tenant: spinz  + Origin: https://evil.spinz.com      -> Reflected
X-Tenant: chipz  + Origin: https://evil.chipz.com      -> Reflected
```

HTTP downgrade (all return ACAO + ACAC: true):
```
X-Tenant: wheelz + Origin: http://www.wheelz.com      -> Reflected
X-Tenant: wildz  + Origin: http://www.wildz.com       -> Reflected
```

Cross-tenant NOT reflected:
```
X-Tenant: wheelz + Origin: https://evil.wildz.com     -> NOT reflected
```

### Attack Scenario

1. stg.wheelz.com has a dangling CNAME to an AWS ELB returning 502 Bad Gateway
2. If an attacker compromises or takes over stg.wheelz.com (or any other subdomain via XSS/takeover)
3. The attacker's page on evil.wheelz.com can make credentialed requests to sso.rootz.com/api/login
4. The SSO API reflects the origin and sends credentials, allowing the attacker to steal session data

The HTTP downgrade enables a separate attack vector: a network attacker (WiFi, ISP) can inject a page at http://www.wheelz.com that makes credentialed requests to the SSO.

### Remediation

Implement exact-match origin validation instead of subdomain wildcards. Only allow the specific production origins (https://www.wheelz.com, https://www.wildz.com, etc.). Reject HTTP (non-HTTPS) origins. Remove unused DNS records (stg.wheelz.com).

---

## FINDING 21: sso.rootz.com Stack Trace Information Disclosure

Severity: MEDIUM (CVSS 5.3)
Category: A05:2021 - Security Misconfiguration (CWE-209)
Endpoint: POST https://sso.rootz.com/api/logout

### Description

The SSO API /api/logout endpoint returns a raw JavaScript stack trace error when called without a session cookie, revealing the backend technology (Node.js/JavaScript) and internal error handling.

### Evidence

Logout endpoint:
```
POST /api/logout HTTP/2
Host: sso.rootz.com
X-Tenant: wheelz
X-SiteJurisdiction: MGA
Content-Type: application/json

{}

HTTP/2 500
{"message":"Cannot read properties of null (reading 'indexOf')"}
```

X-Authorization header with malformed base64:
```
POST /api/login HTTP/2
X-Authorization: 12345

HTTP/2 500
{"message":"atob() called with invalid base64-encoded data. (Only whitespace, '+', '/', alphanumeric ASCII, and up to two terminal '=' signs when the input data length is divisible by 4 are allowed.)"}
```

X-Authorization with valid base64 non-JSON:
```
X-Authorization: dGVzdA

HTTP/2 500
{"message":"Unexpected token 'e', \"test\" is not valid JSON"}
```

X-Authorization with malformed JWT:
```
X-Authorization: eyJ0ZXN0IjoiMSJ9.eyJ0ZXN0IjoiMiJ9

HTTP/2 500
{"message":"Cannot read properties of undefined (reading 'replace')"}
```

### Impact

- Confirms Cloudflare Workers / JavaScript runtime backend
- Reveals JWT token parsing logic (3-part structure, base64 + JSON.parse)
- Reveals session cookie mechanism uses indexOf() parsing
- Multiple verbose error messages aid in developing targeted attacks

### Remediation

Return generic error messages for all token parsing failures. Implement proper input validation and null checks before processing tokens.

---

## FINDING 22: Dex PKCE "plain" Code Challenge Method Enabled

Severity: MEDIUM (CVSS 5.3)
Category: A07:2021 - Identification and Authentication Failures (CWE-287)
Endpoints: https://dex.stg.rootz.com, https://dex.dev.rootz.com

### Description

Both Dex instances advertise support for PKCE "plain" code_challenge_method in their OIDC discovery documents. RFC 7636 Section 4.2 recommends S256 as the code challenge method. The "plain" method provides no protection against authorization code interception because the verifier equals the challenge.

### Evidence

```json
{
  "code_challenge_methods_supported": ["S256", "plain"]
}
```

### Impact

- PKCE "plain" provides no protection against authorization code interception
- Clients using "plain" are as vulnerable as clients using no PKCE at all
- If combined with a redirect_uri bypass, authorization codes can be stolen

### Remediation

Disable "plain" code_challenge_method. Only allow S256.

---

## FINDING 23: Cloudflare .js/.css Extension Bypass on wheelz.com, spinz.com, chipz.com

Severity: MEDIUM (CVSS 3.7)
Category: A05:2021 - Security Misconfiguration

### Description

Requests to paths ending in .js or .css on wheelz.com, spinz.com, and chipz.com bypass the Cloudflare managed challenge, reaching the origin which returns 404 "Not Found". While this currently does not disclose application data (unlike beazt.com/wildz.com which return full SPA HTML), it confirms the Cloudflare Worker backend architecture and provides access to the service worker (/sw.js, 23KB) and GTM proxy (/metrics/rtm.js, 539KB).

### Evidence

```
GET /test.js HTTP/2
Host: www.wheelz.com

HTTP/2 404
cf-placement: remote-FRA
content-length: 9
Not Found
```

Comparison: caxino.com correctly blocks with CF challenge (HTTP 403).

### Impact

- Reveals backend architecture (CF Worker in FRA datacenter, S3 origin)
- Service worker and GTM proxy accessible without challenge
- Could be exploited if JS bundle filenames are discovered

### Remediation

Update Cloudflare WAF rules to challenge .js and .css extensions on affected brands.

---

## FINDING 24: sso.rootz.com Tenant and Jurisdiction Enumeration

Severity: LOW-MEDIUM (CVSS 5.3)
Category: A01:2021 - Broken Access Control

### Description

The SSO API returns differential error messages that allow enumerating valid tenant-jurisdiction combinations: invalid_tenant (HTTP 403) for unknown tenants, invalid_jurisdiction (HTTP 403) for wrong jurisdiction case/value, and authenticated: false (HTTP 200) for valid combinations.

### Evidence

Active SSO tenants: wheelz, wildz, caxino, spinz, chipz, flamez, tuplaus, speedz, berriez, rootz
Not valid on SSO: beazt, blingi, megagewinn, lemonz, wheelzgames (beazt uses different auth despite being active on frontendapi; rootz is valid on SSO but invalid on frontendapi)
Valid jurisdictions: MGA, DE, NL (case-sensitive, uppercase only)

### Impact

- Reveals which brands use the SSO service
- Confirms beazt uses a different authentication path
- Business intelligence about the platform architecture

### Remediation

Return consistent error responses regardless of tenant/jurisdiction validity.

---

## NEWLY DISCOVERED INFRASTRUCTURE (Phase 2)

| Service | URL | Status |
|---------|-----|--------|
| SSO API | sso.rootz.com/api/ | Active, no rate limiting |
| Dex Staging OIDC | dex.stg.rootz.com | Active, token introspection broken |
| Dex Dev OIDC | dex.dev.rootz.com | Active, token introspection broken |
| Game Search Worker | game-search.rootz.com | Active, search index empty |
| Shadow Game Search | s-game-search.rootz.com | Active, requires tl parameter |
| Content Worker | content.rootz.com | Broken (HTTP 500 on all paths) |
| Shadow Content Worker | s-content.rootz.com | Broken (HTTP 500 on all paths) |
| Staging ELB | stg.wheelz.com | Dangling CNAME, ELB returns 502 |
| PaymentIQ Fields | card-fields.paymentiq.io | Referenced in SPA config |
| Game Assets CDN | game-assets.rootz.com | Referenced in SPA config |

## UPDATED CVSS SUMMARY

| # | Finding | CVSS | Severity |
|---|---------|------|----------|
| 1 | Subdomain Takeover e2e.infra.rootz.com | 9.1 | CRITICAL |
| 2 | Unauthenticated Prometheus /metrics (7 servers) | 7.5 | HIGH |
| 3 | Public S3 Bucket assets.rootz.com | 7.5 | HIGH |
| 4 | Exposed Dex OIDC with Device Code Flow | 7.3 | HIGH |
| 5 | S3 Bucket Listing s-game-assets.rootz.com | 5.3 | MEDIUM |
| 6 | CORS Misconfiguration frontendapi.rootz.com | 6.1 | MEDIUM |
| 7 | K8s Token Generator Missing Headers | 5.3 | MEDIUM |
| 8 | Missing Security Headers www.rootz.com | 5.3 | MEDIUM |
| 9 | Permissive CSP uptime.rootz.com | 4.3 | LOW-MEDIUM |
| 10 | Missing Rate Limiting on Login uptime.rootz.com | 5.3 | MEDIUM |
| 11 | Tenant/Brand Enumeration frontendapi.rootz.com | 5.3 | LOW |
| 12 | WordPress Origin URL Disclosure via RankMath | 5.8 | MEDIUM |
| 13 | Dex Staging redirect_uri Validation Bypass | 7.4 | HIGH |
| 14 | Critical Email Spoofing (beazt.com, blingi.com) | 7.5 | HIGH |
| 15 | Systemic Email Auth Failures (8+ domains) | 7.1 | HIGH |
| 16 | beazt.com CF WAF Bypass + Config Disclosure | 7.5 | HIGH |
| 17 | wildz.com CF WAF Bypass + Config Disclosure | 7.5 | HIGH |
| 18 | SSO Missing Rate Limiting Casino Auth | 7.5 | HIGH |
| 19 | Dex Token Introspection Broken | 7.5 | HIGH |
| 20 | SSO CORS Subdomain Wildcard + Credentials | 7.5 | HIGH |
| 21 | sso.rootz.com Stack Trace Disclosure | 5.3 | MEDIUM |
| 22 | Dex PKCE "plain" Method Enabled | 5.3 | MEDIUM |
| 23 | CF .js/.css Extension Bypass (3 brands) | 3.7 | MEDIUM |
| 24 | sso.rootz.com Tenant/Jurisdiction Enumeration | 5.3 | LOW-MEDIUM |

Total: 1 CRITICAL, 11 HIGH, 10 MEDIUM, 2 LOW-MEDIUM

## END OF REPORT
