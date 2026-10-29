# Security Assessment Report: Spiko Platform

**Target:** spiko.xyz / spiko.io (60+ subdomains)
**Authorization:** Written permission from Paul-Adrien Hyppolite, CEO of Spiko
**Date:** 2026-10-26
**Assessor:** Authorized private security engagement
**Scope:** Full platform -- all subdomains, APIs, and associated infrastructure

---

## Executive Summary

This assessment covered the Spiko regulated investment platform across both the .spiko.io and .spiko.finance domains, including investor/distributor/admin APIs, authentication infrastructure (Ory Kratos/Hydra), SPA client bundles, translation management (Tolgee), and supporting infrastructure (EBICS banking, CDN, staging environments).

The platform demonstrates a solid security posture in several areas. Cloudflare WAF and Access provide effective perimeter defense, the API gateway properly isolates user data (no IDOR found), and the SPA uses DOMPurify for HTML sanitization.

However, deeper testing revealed that the Ory Kratos and Hydra admin API surfaces are internet-reachable across all three authentication realms, protected only by API key authentication. This is the highest-severity finding: if any admin API key leaks from configuration, logs, or error messages, an attacker gains full control over user identities, sessions, and OAuth2 clients.

Seventeen findings were identified across the platform, with the most critical being the internet-reachable Ory admin APIs (F11), the exposed EBICS banking endpoint with HostID enumeration oracle (F08/F15), sandbox/test endpoints routed on the production distributor API (F16), and publicly accessible staging environments that share cookie scope with production (F13).

---

## Findings Summary

| ID  | Title | Severity | Category |
|-----|-------|----------|----------|
| F01 | Tolgee staging API key in public SPA bundle | Medium | Credential Leak |
| F02 | Missing Content-Security-Policy on app.spiko.io | Medium | Security Headers |
| F03 | Parent-domain session cookie scope (.spiko.io) | Low-Medium | Session Management |
| F04 | Missing HSTS header | Low | Security Headers |
| F05 | Admin RBAC permission matrix in public SPA bundle | Low-Medium | Information Disclosure |
| F06 | Questionnaire name enumeration via error messages | Informational | Information Disclosure |
| F07 | Marketing preferences default-subscribed (GDPR Art. 7) | Informational | Compliance |
| F08 | EBICS banking endpoint exposed without WAF, actively processing H005 | Medium-High | Network Exposure |
| F09 | Configuration drift on .finance mirror domain | Low | Misconfiguration |
| F10 | Internal email disclosed via Tolgee key metadata | Informational | Information Disclosure |
| F11 | Ory Kratos/Hydra admin API internet-reachable on all auth realms | High | Access Control |
| F12 | Identity schemas publicly readable revealing full trait structures | Low | Information Disclosure |
| F13 | Staging environments publicly accessible, sharing production cookie scope | Medium | Access Control |
| F14 | Production CSRF cookie scoped to parent domain sent to all staging hosts | Medium | Session Management |
| F15 | EBICS HostID enumeration oracle with bank authentication key exposure | Medium | Banking Protocol |
| F16 | Sandbox/test endpoints routed on production distributor API | Medium | Security Misconfiguration |
| F17 | Unreleased V1 API specification leaked in production SPA bundle | Informational | Information Disclosure |

---

## Detailed Findings

### F01: Tolgee staging API key leaked in public SPA bundle
**Severity:** Medium
**Affected:** app.spiko.io SPA JavaScript bundles
**Category:** Information Disclosure / Credential Leak

A Tolgee Project API Key (tgpak_...) is hardcoded in the production SPA JavaScript bundle served to all visitors. Testing confirmed the key is heavily restricted: all translation read/write endpoints return 403, and only the metadata endpoint (/v2/api-keys/current) responds. However, the key exposes:
- The internal Tolgee project ID
- The staging infrastructure hostname (tolgee.spiko.io)
- Organizational email (tech@spiko.tech)
- The translation management platform in use

**Impact:** Low immediate risk due to restrictive permissions. If permissions are ever widened on this key, it is already public and cached by search engines/archival services.

**Remediation:** Remove the API key from the SPA bundle. Serve translations as static JSON at build time or proxy translation requests through the backend API.

---

### F02: Missing Content-Security-Policy header on app.spiko.io
**Severity:** Medium
**Affected:** app.spiko.io
**Category:** Security Headers

The main investor SPA does not return a Content-Security-Policy header. The application uses DOMPurify for HTML sanitization (confirmed in bundle analysis), but CSP provides defense-in-depth by restricting script sources and inline execution.

**Impact:** If any XSS vector is discovered in the future (DOMPurify bypass, new unsanitized rendering path), there is no CSP to limit its impact. Combined with F03 (parent-domain cookies), this widens the blast radius of any future XSS.

**Remediation:** Deploy a strict CSP: `script-src 'self' https://cdn.spiko.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.spiko.io; frame-ancestors 'none';` -- adjust to actual requirements.

---

### F03: Parent-domain session cookie scope (.spiko.io)
**Severity:** Low-Medium
**Affected:** *.spiko.io
**Category:** Session Management

Session cookies are scoped to .spiko.io rather than the specific subdomain app.spiko.io. Any subdomain under spiko.io can read the session cookie.

**Impact:** Amplifier for XSS or subdomain takeover. The presence of staging wildcards (*.staging.spiko.io), PR-preview wildcards (p*.*.staging.spiko.io), and vendor-delegated subdomains means the cookie is readable from a wider surface than necessary. A compromised or misconfigured staging/preview subdomain could steal production session tokens.

**Remediation:** Scope session cookies to `app.spiko.io`. Use a dedicated auth flow for cross-subdomain SSO if needed.

---

### F04: Missing HSTS header
**Severity:** Low
**Affected:** app.spiko.io
**Category:** Security Headers

No Strict-Transport-Security header is returned. Cloudflare enforces HTTPS at the edge, but the browser does not cache this requirement.

**Impact:** Low given Cloudflare enforcement. First-visit or cache-expired requests on insecure networks could theoretically be intercepted before the Cloudflare redirect.

**Remediation:** Add `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` and submit for HSTS preload.

---

### F05: Admin RBAC permission matrix exposed in public SPA bundle
**Severity:** Low-Medium
**Affected:** app.spiko.io SPA JavaScript bundles
**Category:** Information Disclosure

The full RBAC permission matrix is embedded in the production bundle, including all role names (super-admin, compliance, tech, etc.), all permission strings, and the complete role-to-permission mapping.

**Impact:** Reveals the internal authorization architecture. An attacker can identify exactly which permissions exist, which roles are most privileged, and craft targeted privilege escalation attempts against the admin API using the exact permission names.

**Remediation:** Move the RBAC matrix server-side. The client should receive only the authenticated user's own effective permissions.

---

### F06: Questionnaire name enumeration via error messages
**Severity:** Informational
**Affected:** investor-api.spiko.io/v0/
**Category:** Information Disclosure

API error responses for invalid questionnaire submissions enumerate valid questionnaire names (5 values observed).

**Remediation:** Return generic error messages without enumerating valid values.

---

### F07: Marketing email preferences default-subscribed (potential GDPR Art. 7)
**Severity:** Informational
**Affected:** Investor registration/onboarding flow
**Category:** Compliance

Marketing email preferences appear to be opted-in by default. GDPR Article 7 requires freely given, specific, informed consent. Pre-checked consent boxes do not meet this standard.

**Remediation:** Ensure marketing opt-in is unchecked by default with clear consent description.

---

### F08: EBICS banking endpoint exposed without WAF, actively processing H005 protocol
**Severity:** Medium-High
**Affected:** ebics.preprod.spiko.io
**Category:** Network Exposure

The EBICS H005 banking protocol endpoint is served directly through AWS ELB (via Qovery/criom.sh in eu-west-3) without Cloudflare WAF protection. All other Spiko services route through Cloudflare. The endpoint uses a Let's Encrypt certificate (not Cloudflare-issued) and runs behind Envoy proxy, confirming direct internet exposure bypassing the Cloudflare perimeter.

Testing confirmed the endpoint actively processes EBICS H005 XML messages. Submitting a valid EBICS XML envelope returns structured EBICS error codes (091010 EBICS_INVALID_XML for malformed requests, 000000 EBICS_OK for structurally valid envelopes). This confirms the endpoint is live and parsing banking protocol messages from any internet source.

**Impact:** No rate limiting, bot protection, or WAF rules on a live banking protocol endpoint. An attacker can enumerate valid HostIDs and PartnerIDs, probe for XML parsing vulnerabilities, and attempt protocol-level attacks against the EBICS implementation without any perimeter filtering. The H005 protocol handles financial transaction messaging between Spiko and banking partners.

**Remediation:** Restrict access to known banking partner IP ranges via AWS security groups as the primary control. Additionally route through Cloudflare for WAF coverage against XML-based attacks. The combination of IP allowlisting and WAF provides defense in depth for a critical financial endpoint.

---

### F09: Configuration drift on .finance mirror domain
**Severity:** Low
**Affected:** app.spiko.finance, investor-api.spiko.finance, investor-auth.spiko.finance
**Category:** Misconfiguration

The .spiko.finance domain shares the staging wildcard certificate with *.staging.spiko.io but shows drift: investor-auth.spiko.finance returns NXDOMAIN, and the /v0/ API gateway prefix may not be configured.

**Remediation:** Fully deprecate .finance or ensure parity with .spiko.io security controls.

---

### F10: Internal email disclosed via Tolgee API key metadata
**Severity:** Informational
**Affected:** tolgee.spiko.io /v2/api-keys/current
**Category:** Information Disclosure

The leaked API key's metadata endpoint reveals tech@spiko.tech, not publicly listed elsewhere.

**Remediation:** Restrict the metadata endpoint or redact user information from the response.

---

### F11: Ory Kratos/Hydra admin API internet-reachable on all authentication realms
**Severity:** High
**Affected:** investor-auth.spiko.io, distributor-auth.spiko.io, admin-auth.spiko.io
**Category:** Access Control

The Ory Kratos and Hydra admin API surfaces are reachable from the public internet on all three authentication realms. The following admin endpoints return HTTP 401 (Unauthorized) rather than 404 (Not Found), confirming they are routed and listening:

Kratos admin endpoints: /admin/identities, /admin/sessions, /admin/recovery/link, /admin/recovery/code, /admin/courier/messages

Hydra admin endpoints: /admin/clients, /admin/oauth2/auth/requests/login, /admin/oauth2/auth/requests/consent, /admin/oauth2/tokens, /admin/oauth2/introspect

All three realms (investor-auth, distributor-auth, admin-auth) expose the same admin surface. The 401 response indicates these endpoints are protected by API key authentication but are network-reachable from any source.

**Impact:** The admin API provides full control over user identities (create, read, update, delete), active sessions (list, revoke), OAuth2 clients (create, modify, delete), consent/login flows (accept, reject), token introspection, and account recovery link generation. If any admin API key leaks from configuration files, environment variables, error messages, logs, or internal services, an attacker gains immediate full control over all user accounts and sessions without needing to bypass Cloudflare or any other perimeter defense. The attack path is: leaked key + internet-reachable admin API = full identity takeover.

**Remediation:** Restrict admin API access to internal networks only. The Ory admin API should never be internet-reachable. Options: (1) Configure the API gateway/Envoy to reject requests to /admin/ paths from external sources, (2) Place admin API endpoints behind Cloudflare Access zero-trust (as is done for admin.spiko.io), (3) Use network-level controls (security groups, VPC) to restrict admin API port access to internal services only.

---

### F12: Identity schemas publicly readable revealing full trait structures
**Severity:** Low
**Affected:** investor-auth.spiko.io, distributor-auth.spiko.io, admin-auth.spiko.io
**Category:** Information Disclosure

The Ory Kratos /schemas endpoint on all three authentication realms returns the complete identity schema definitions without authentication. These schemas reveal the full structure of identity traits for each realm:

Investor schema traits: first_name, last_name, email, phoneNumber, locale, investorAppMode, newsletter, referralCode, partnershipCode

Distributor schema traits: first_name, last_name, email, phoneNumber, company, locale

Admin schema traits: email (minimal schema)

The schemas also reveal which fields are required, validation patterns (email format), and the Ory identity schema version in use.

**Impact:** Low direct impact but provides reconnaissance value. An attacker learns exactly which data fields exist per user type, which aids in crafting targeted social engineering, understanding the data model for API fuzzing, and identifying potential data exfiltration targets.

**Remediation:** Restrict the /schemas endpoint to authenticated requests, or accept this as a known information disclosure given that the schema structure is also visible in the public registration UI.

---

### F13: Staging environments publicly accessible, sharing production cookie scope
**Severity:** Medium
**Affected:** *.staging.spiko.io, *.preprod.spiko.io, *.staging.spiko.finance
**Category:** Access Control

At least 10 staging and pre-production subdomains are publicly accessible without any access controls:

Staging: app.staging.spiko.io, distributor.staging.spiko.io, investor-api.staging.spiko.io, distributor-api.staging.spiko.io, public-api.staging.spiko.io, webhooks.staging.spiko.io, investor-auth.staging.spiko.io

Pre-production: app.preprod.spiko.io, investor-api.preprod.spiko.io, investor-auth.preprod.spiko.io, public-api.preprod.spiko.io

Finance mirror staging: app.staging.spiko.finance, investor-api.staging.spiko.finance

Admin panels on staging (admin.staging.spiko.io, rabbitmq.staging.spiko.io, pg-admin.staging.spiko.io) are correctly behind Cloudflare Access, but the application and API surfaces are not.

The staging environments run a full Ory authentication stack (registration enabled with email/password, Google SSO, Apple SSO), full API gateways, and serve the same SPA code. Fund UUIDs are identical between staging and production. The same Tolgee API key is used in staging as production.

**Impact:** Staging environments are a prime target because they typically run newer, less-tested code and may have weaker security controls. Combined with F03 and F14 (parent-domain cookie scope), production session cookies are sent to staging subdomains, meaning a vulnerability on any staging host could be leveraged to steal production sessions. The staging auth stack also has the same admin API exposure as production (F11), doubling the attack surface.

**Remediation:** Place all staging and pre-production subdomains behind Cloudflare Access, matching the protection already applied to staging admin panels. Alternatively, restrict staging to VPN-only access. At minimum, ensure staging environments do not share cookie scope with production.

---

### F14: Production CSRF cookie scoped to parent domain sent to all staging hosts
**Severity:** Medium
**Affected:** investor-auth.spiko.io cookie sent to *.spiko.io
**Category:** Session Management

The production Ory Kratos CSRF token cookie is set with Domain=spiko.io scope:

`Set-Cookie: csrf_token_...=<value>; Path=/; Domain=spiko.io; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`

This cookie is sent by the browser to every subdomain under spiko.io, including all staging and pre-production subdomains identified in F13.

Additionally, the staging environment sets cookies with a __Host- prefix combined with a Domain attribute (Domain=staging.spiko.io), which violates the cookie specification (RFC 6265bis). Browsers should reject __Host- cookies that set a Domain attribute.

**Impact:** Production authentication-related cookies are transmitted to staging environments. While the CSRF token alone does not grant session access, it confirms that the browser's cookie jar for spiko.io is shared across production and staging. Combined with F03 (session cookie scope), this means a network-level attacker on a staging host, or an XSS on any staging subdomain, could intercept production cookies. The malformed __Host- cookie on staging also indicates inconsistent security configuration between environments.

**Remediation:** Scope production cookies to their specific subdomains (investor-auth.spiko.io or app.spiko.io). Fix the staging __Host- cookie to either drop the Domain attribute or drop the __Host- prefix. Ensure staging and production cookie domains do not overlap.

---

### F15: EBICS HostID enumeration oracle with bank authentication key exposure
**Severity:** Medium
**Affected:** ebics.preprod.spiko.io POST /ebics
**Category:** Banking Protocol / Information Disclosure

The EBICS H005 endpoint returns structurally different responses for valid versus invalid HostIDs, creating an enumeration oracle. Invalid HostIDs (e.g., "FAKE") return an unsigned `ebicsKeyManagementResponse` with error code 091011 (EBICS_INVALID_HOST_ID). The valid HostID "SPIKOPREPROD" returns a signed `ebicsResponse` with error code 091010 (EBICS_INVALID_XML) and a full RSA-SHA256 AuthSignature from the bank's authentication key.

This differential behavior allows trivial, unauthenticated enumeration of all configured bank HostIDs. The server exercises its RSA authentication private key to sign every error response for valid HostIDs, even when the request itself is invalid. Combined with F08 (no rate limiting, no WAF), brute-force enumeration is completely unimpeded.

**Impact:** An attacker can discover all configured EBICS bank HostIDs without authentication. The confirmed HostID "SPIKOPREPROD" is the first element of the EBICS authentication chain. The server signing error responses with its authentication key on every request is unnecessary cryptographic key wear and could facilitate chosen-message attacks against the RSA signature.

**Remediation:** Return a generic error code regardless of whether the HostID is valid or invalid. Do not sign error responses for unauthenticated requests. Implement rate limiting.

---

### F16: Sandbox/test endpoints routed on production distributor API
**Severity:** Medium
**Affected:** distributor-api.spiko.io/v0/sandbox/*
**Category:** Security Misconfiguration

Seven sandbox endpoints for simulating financial operations are routed on the production API gateway. All return HTTP 401 (requiring authentication) rather than 404, confirming they are registered production routes:

- /v0/sandbox/bulk-deposits (GET/POST) -- submit and manage bulk deposit operations
- /v0/sandbox/bulk-deposits/:paymentEntryId/cancel (POST) -- cancel bulk deposit entries
- /v0/sandbox/deposit-orders/:depositOrderId/fund (POST) -- fund deposit orders
- /v0/sandbox/execution-runs (GET/POST) -- view and trigger execution runs (settlement)
- /v0/sandbox/execution-runs/full (POST) -- full execution run
- /v0/sandbox/incoming-wires (POST) -- simulate incoming wire transfers

These endpoints were discovered through SPA bundle analysis of distributor.spiko.io and confirmed routed on production.

**Impact:** Any distributor user with valid authentication credentials may have access to sandbox operations on the production environment. Sandbox functionality for simulating wire transfers, triggering settlement processing, and bulk deposit operations should never be available in production, regardless of authorization controls, because it creates risk of accidental or intentional misuse against real financial data.

**Remediation:** Remove sandbox route registration from the production API gateway configuration. Use environment-specific route configuration to ensure sandbox endpoints are only available in staging/development.

---

### F17: Unreleased V1 API specification leaked in production SPA bundle
**Severity:** Informational
**Affected:** app.spiko.io SPA JavaScript bundles
**Category:** Information Disclosure

The production SPA bundle at app.spiko.io embeds full OpenAPI annotations for an unreleased /v1/ API, including:

- All endpoint group names and planned structure (Investors, Accounts, Deposit Orders, Withdrawal Orders, Transfer Orders, Account Transactions, Portfolio, Bank accounts, Accounting positions, Yields)
- Authentication method: HTTP Basic Auth with client_id as username and client_secret as password
- Server URLs: production (investor-api.spiko.io/v1) and pre-production (investor-api.preprod.spiko.io/v1)

The API is not yet deployed: all /v1/ paths return 404 on both production and preprod. However, the specification reveals the planned API evolution and authentication method.

**Impact:** Reveals upcoming API surface and authentication design. Allows attackers to prepare tooling and attack strategies before the API is deployed.

**Remediation:** Strip unreleased API specifications from production bundles during the build process. Include only the specifications for currently deployed APIs.

---

## Testing Methodology

The assessment was conducted without destructive testing. Methods included:

- Subdomain enumeration via Certificate Transparency logs (api.certspotter.com)
- HTTP header analysis across all discovered subdomains
- SPA JavaScript bundle download and static analysis for secrets, XSS sinks, and information disclosure
- API endpoint enumeration and IDOR testing with a self-registered investor account
- Authentication flow analysis (Ory Kratos registration, settings, verification)
- Ory Kratos and Hydra admin API endpoint enumeration across all three auth realms
- Identity schema analysis across investor, distributor, and admin realms
- Tolgee API key validation across all documented REST API endpoints
- EBICS H005 protocol testing with crafted XML envelopes, HostID enumeration, XXE testing, entity expansion testing
- SPA bundle analysis for complete API route extraction (100+ investor endpoints, 95+ distributor endpoints)
- HTTP request smuggling testing (CL.TE, TE.CL, H2.CL) across Cloudflare-Envoy chain
- Cache poisoning testing on CloudFront SPAs (X-Forwarded-Host, path normalization, cache key manipulation)
- CRLF injection and response splitting testing
- Origin IP discovery and direct-IP bypass testing
- Webhook endpoint enumeration on webhooks.spiko.io
- Staging and pre-production environment enumeration and access control verification
- Cross-environment cookie scope analysis (production cookies reaching staging)
- S3/CloudFront document enumeration on cdn.spiko.finance
- JWKS key comparison across authentication realms (token confusion testing)
- OAuth2 flow analysis (redirect validation, CORS, unauthenticated grants)
- Cloudflare WAF behavior characterization (rate limits, bot detection)
- DNS analysis for configuration drift between .io and .finance domains

## Areas Tested and Found Clean

- **IDOR on investor API:** Account, user, and settings endpoints return only the authenticated user's own data
- **Tolgee API key escalation:** All write endpoints and translation read endpoints return 403; the key is effectively metadata-only
- **XSS in SPA:** DOMPurify sanitization confirmed in use via JuniorSanitizedHtml component; no unprotected dangerouslySetInnerHTML in application code
- **Impersonation token brute force:** /v0/impersonation/redeem requires full UUID; computationally infeasible
- **Cloudflare Access bypass:** Admin panels (admin.spiko.io, pg-admin.spiko.io, metabase.spiko.io, tolgee.spiko.io) correctly behind zero-trust access
- **JWKS token confusion:** All three auth realms (investor, distributor, admin) use separate JWKS key pairs; cross-realm token reuse is not possible
- **OAuth2 open redirect:** Return_to parameter validation correctly rejects external URLs; tested on all three auth realms
- **OAuth2 CORS reflection:** No CORS header reflection observed; proper origin restrictions in place
- **S3 bucket listing:** cdn.spiko.finance serves legal documents (KIDs, prospectuses) via CloudFront but directory listing is disabled; documents accessible only via known paths
- **Staging admin panels:** admin.staging.spiko.io, rabbitmq.staging.spiko.io, pg-admin.staging.spiko.io correctly behind Cloudflare Access
- **Source map exposure:** JavaScript .map URLs return 200 but serve the SPA HTML fallback (text/html), not actual source maps
- **HTTP request smuggling:** Cloudflare rejects conflicting CL/TE headers with 400 at the edge; no desync through Cloudflare-Envoy chain
- **Cache poisoning:** SPA HTML has no-store/no-cache directives; static assets are content-hashed and immutable; X-Forwarded-Host not reflected
- **CORS reflection:** No dynamic origin reflection on any API host; properly restrictive across all endpoints
- **CRLF injection:** All path-based, double-encoded, and Unicode CRLF variants produce standard responses with no header injection
- **Host header injection:** Cloudflare blocks external Host headers with 403; X-Forwarded-For/X-Real-IP spoofing has no effect
- **Envoy admin interface:** Not exposed on any API host; all admin paths return 404
- **GraphQL:** No GraphQL endpoints on any host
- **Cross-API routing:** Distributor paths on investor-api return 404 and vice versa; proper isolation
- **Cloudflare origin IP bypass:** EBICS ELB only routes EBICS traffic; returns 404 for all other Host headers
- **EBICS XXE:** DOCTYPE declarations properly rejected with HTTP 400; XInclude parsed but not processed; entity expansion blocked
- **EBICS TLS:** TLS 1.3 only; no legacy protocol support; TLS_AES_256_GCM_SHA384 cipher
- **Webhook endpoints:** Only Onfido (400) and Coinbase (401 with signature validation) active; all other webhook providers return 404

---

## Recommendations Priority

1. **Immediate:** Block internet access to Ory admin API endpoints (F11) -- highest severity finding; if an admin API key leaks, full identity takeover is possible with no further barriers
2. **Immediate:** Restrict EBICS endpoint network access (F08) -- live banking protocol endpoint processing H005 messages from any internet source
3. **Immediate:** Place staging/preprod environments behind Cloudflare Access (F13) -- staging hosts receive production cookies and double the admin API attack surface
4. **Immediate:** Remove sandbox endpoints from production distributor API (F16) -- test/simulation operations should never be available in production
5. **Short-term:** Add CSP header to app.spiko.io (F02) -- high defense-in-depth value, low implementation effort
5. **Short-term:** Scope session and CSRF cookies to specific subdomains (F03, F14) -- prevents production cookies from reaching staging
6. **Short-term:** Remove Tolgee API key from SPA bundle (F01) -- credential hygiene
7. **Short-term:** Move RBAC matrix server-side (F05) -- reduces reconnaissance value of public bundle
8. **Short-term:** Fix EBICS HostID enumeration oracle (F15) -- return generic errors regardless of HostID validity
9. **Routine:** Add HSTS header (F04), fix error message enumeration (F06), audit GDPR consent flow (F07), resolve .finance drift (F09), restrict schema endpoints (F12), strip unreleased API specs from bundles (F17)
