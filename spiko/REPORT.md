# Security Assessment Report: Spiko Platform

**Target:** spiko.xyz / spiko.io (60+ subdomains)
**Authorization:** Written permission from Paul-Adrien Hyppolite, CEO of Spiko
**Date:** 2026-10-26
**Assessor:** Authorized private security engagement
**Scope:** Full platform -- all subdomains, APIs, and associated infrastructure

---

## Executive Summary

This assessment covered the Spiko regulated investment platform across both the .spiko.io and .spiko.finance domains, including investor/distributor/admin APIs, authentication infrastructure (Ory Kratos/Hydra), SPA client bundles, translation management (Tolgee), and supporting infrastructure (EBICS banking, CDN, staging environments).

The platform demonstrates a strong overall security posture. Cloudflare WAF and Access provide effective perimeter defense, Ory Network handles authentication correctly, the API gateway properly isolates user data (no IDOR found), and the SPA uses DOMPurify for HTML sanitization. No critical or high-severity vulnerabilities were identified.

Ten findings were identified, with the most actionable being the exposed EBICS banking endpoint without WAF protection, a leaked Tolgee API key in the public SPA bundle, and missing Content-Security-Policy headers that reduce defense-in-depth.

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
| F08 | EBICS banking endpoint exposed without WAF | Medium | Network Exposure |
| F09 | Configuration drift on .finance mirror domain | Low | Misconfiguration |
| F10 | Internal email disclosed via Tolgee key metadata | Informational | Information Disclosure |

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

### F08: EBICS banking endpoint exposed without WAF
**Severity:** Medium
**Affected:** ebics.preprod.spiko.io
**Category:** Network Exposure

The EBICS 3.0 banking protocol endpoint is served directly through AWS ELB (via Qovery/criom.sh in eu-west-3) without Cloudflare WAF protection. All other Spiko services route through Cloudflare.

**Impact:** No rate limiting, bot protection, or WAF rules. Direct internet access to a banking protocol endpoint. EBICS handles financial transaction messaging between Spiko and banking partners.

**Remediation:** Route through Cloudflare for WAF coverage, or restrict to known banking partner IP ranges via AWS security groups. Consider both: WAF for the protocol layer and IP allowlisting for network layer defense.

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

## Testing Methodology

The assessment was conducted without destructive testing. Methods included:

- Subdomain enumeration via Certificate Transparency logs (api.certspotter.com)
- HTTP header analysis across all discovered subdomains
- SPA JavaScript bundle download and static analysis for secrets, XSS sinks, and information disclosure
- API endpoint enumeration and IDOR testing with a self-registered investor account
- Authentication flow analysis (Ory Kratos registration, settings, verification)
- Tolgee API key validation across all documented REST API endpoints
- Cloudflare WAF behavior characterization (rate limits, bot detection)
- DNS analysis for configuration drift between .io and .finance domains

## Areas Tested and Found Clean

- **IDOR on investor API:** Account, user, and settings endpoints return only the authenticated user's own data
- **Tolgee API key escalation:** All write endpoints and translation read endpoints return 403; the key is effectively metadata-only
- **XSS in SPA:** DOMPurify sanitization confirmed in use via JuniorSanitizedHtml component; no unprotected dangerouslySetInnerHTML in application code
- **Impersonation token brute force:** /v0/impersonation/redeem requires full UUID; computationally infeasible
- **Cloudflare Access bypass:** Admin panels (admin.spiko.io, pg-admin.spiko.io, metabase.spiko.io, tolgee.spiko.io) correctly behind zero-trust access

---

## Recommendations Priority

1. **Immediate:** Add CSP header to app.spiko.io (F02) -- high defense-in-depth value, low implementation effort
2. **Immediate:** Restrict EBICS endpoint network access (F08) -- banking protocol should not be open to the internet
3. **Short-term:** Remove Tolgee API key from SPA bundle (F01) -- credential hygiene
4. **Short-term:** Scope session cookies to app.spiko.io (F03) -- reduces blast radius of any future subdomain compromise
5. **Short-term:** Move RBAC matrix server-side (F05) -- reduces reconnaissance value of public bundle
6. **Routine:** Add HSTS header (F04), fix error message enumeration (F06), audit GDPR consent flow (F07), resolve .finance drift (F09)
