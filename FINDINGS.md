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

## FINDING 4: Exposed Dex OIDC Provider with Open Device Code Flow

Severity: HIGH (CVSS 7.3)
Category: Authentication Misconfiguration (CWE-287)
Endpoint: https://dex.stg.rootz.com

### Description

A Dex OIDC identity provider is publicly accessible on the staging environment. It exposes full OIDC discovery metadata, JWKS signing keys, and allows unauthenticated generation of device authorization codes that could be used in phishing attacks to steal Kubernetes access tokens.

### Evidence

OIDC Discovery:
- https://dex.stg.rootz.com/.well-known/openid-configuration returns full OIDC metadata
- Issuer: https://dex.stg.rootz.com
- Supported grant types: authorization_code, implicit, refresh_token, device_code
- Scopes: openid, email, groups, profile, offline_access
- Only connector: Google

OAuth Client Discovered:
- client_id: wohTei2hiQu1
- redirect_uri: https://login.stg.rootz.com/callback
- No client_secret required for device code flow

Device Code Flow (no authentication required):
- POST to /device/code with client_id=wohTei2hiQu1 generates valid device codes
- Response includes device_code, user_code (format: XXXX-XXXX), verification_uri
- Codes expire in 300 seconds (5 minutes)

JWKS (5 RSA public signing keys):
- https://dex.stg.rootz.com/keys returns all signing keys

Linked Application:
- login.stg.rootz.com is a "Generate Kubernetes Token" web application (dex-k8s-authenticator)
- This confirms the Dex instance is used for Kubernetes cluster authentication

### Impact

- Device code phishing: An attacker generates a device code, tricks a rootz employee into visiting the verification URL and approving it via Google SSO, then exchanges the device code for tokens granting Kubernetes cluster access
- JWKS disclosure: Public signing keys could assist in token forgery if private keys are ever compromised
- Staging environment mapping: Full OIDC configuration reveals authentication architecture

### Remediation

Restrict access to dex.stg.rootz.com and login.stg.rootz.com to internal/VPN networks. Disable the device_code grant type if not required. Require client_secret for all OAuth flows. Consider IP allowlisting on the ALB.

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

## END OF REPORT
