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

Fourteen findings were identified across the platform, with the most critical being the internet-reachable Ory admin APIs (F11), the exposed EBICS banking endpoint actively processing H005 protocol messages (F08), and publicly accessible staging environments that share cookie scope with production (F13).

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
- EBICS H005 protocol testing with crafted XML envelopes
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

---

## Recommendations Priority

1. **Immediate:** Block internet access to Ory admin API endpoints (F11) -- highest severity finding; if an admin API key leaks, full identity takeover is possible with no further barriers
2. **Immediate:** Restrict EBICS endpoint network access (F08) -- live banking protocol endpoint processing H005 messages from any internet source
3. **Immediate:** Place staging/preprod environments behind Cloudflare Access (F13) -- staging hosts receive production cookies and double the admin API attack surface
4. **Short-term:** Add CSP header to app.spiko.io (F02) -- high defense-in-depth value, low implementation effort
5. **Short-term:** Scope session and CSRF cookies to specific subdomains (F03, F14) -- prevents production cookies from reaching staging
6. **Short-term:** Remove Tolgee API key from SPA bundle (F01) -- credential hygiene
7. **Short-term:** Move RBAC matrix server-side (F05) -- reduces reconnaissance value of public bundle
8. **Routine:** Add HSTS header (F04), fix error message enumeration (F06), audit GDPR consent flow (F07), resolve .finance drift (F09), restrict schema endpoints (F12)
