# F031 - Ory Kratos Admin API Endpoints Exposed to Internet

## Summary

| Field | Value |
|-------|-------|
| Severity | High |
| CVSS 3.1 | 7.5 (AV:N/AC:H/PR:N/UI:N/S:C/C:H/I:H/A:N) |
| OWASP | A05:2021 - Security Misconfiguration |
| Endpoint | /admin/* on all three auth realms |
| Status | Confirmed |

## Description

The Ory Kratos admin API endpoints are accessible from the internet on all three authentication realms (investor-auth, distributor-auth, admin-auth). These endpoints are protected only by API key authentication with no network-level restrictions such as IP allowlisting, VPN/private network isolation, or Cloudflare Access rules.

The following admin endpoints are routed and respond with HTTP 401 (not 404), confirming they exist and accept connections:
- /admin/identities (list/create/update/delete all user accounts)
- /admin/sessions (manage all active sessions)
- /admin/recovery/code (generate recovery codes for any account)
- /admin/recovery/link (generate recovery links for any account)
- /admin/courier/messages (read all email messages including OTP codes)

If the Ory admin API key is compromised (through key leakage similar to F01, CI/CD exposure, insider threat, or infrastructure breach), an attacker gains unrestricted access to:
- All identity records (PII: names, emails, phone numbers, verification status)
- Account creation and deletion capabilities
- Password reset via recovery code/link generation for any account
- All email messages including verification and recovery codes
- Session management (create, extend, or revoke any session)

## Proof

### Admin endpoints accessible on investor-auth.spiko.io

```
GET /admin/identities HTTP/2
Host: investor-auth.spiko.io

HTTP/2 401
{"error":{"code":401,"status":"Unauthorized","message":"Access credentials are invalid"}}
```

```
GET /admin/sessions HTTP/2
Host: investor-auth.spiko.io

HTTP/2 401
{"error":{"code":401,"status":"Unauthorized","message":"Access credentials are invalid"}}
```

```
GET /admin/courier/messages HTTP/2
Host: investor-auth.spiko.io

HTTP/2 401
{"error":{"code":401,"status":"Unauthorized","message":"Access credentials are invalid"}}
```

### Same endpoints accessible on distributor-auth and admin-auth

```
GET /admin/identities HTTP/2
Host: distributor-auth.spiko.io

HTTP/2 401
```

```
GET /admin/identities HTTP/2
Host: admin-auth.spiko.io

HTTP/2 401
```

### Compare with properly protected admin interface

admin.staging.spiko.io returns Cloudflare Access 403, demonstrating that network-level protection IS used for other admin interfaces on the platform, but not for the Ory admin API.

### Additional information exposed

The Ory identity schemas are also publicly accessible without authentication:
```
GET /schemas HTTP/2
Host: investor-auth.spiko.io

HTTP/2 200
[complete identity schema with all trait definitions, credential types, recovery/verification methods]
```

The complete OpenID Connect configuration is exposed:
```
GET /.well-known/openid-configuration HTTP/2
Host: investor-auth.spiko.io

HTTP/2 200
[full OAuth2 endpoint URLs, supported grant types, token endpoint auth methods]
```

## Impact

On a regulated financial platform managing investment accounts under EU regulations:
1. Key compromise provides unrestricted admin access to all user accounts across all three realms
2. An attacker can generate recovery codes for any account, enabling account takeover without email access
3. Courier messages contain verification and recovery codes, enabling bypass of email-based security controls
4. Full identity data exfiltration (PII of all investors, distributors, and administrators)
5. Given precedent of API key leakage on this platform (F01 Tolgee key in SPA bundle), the risk of admin key exposure is not hypothetical

## Remediation

1. Restrict admin API endpoints to internal networks or VPN using Cloudflare Access rules (already used for admin.staging.spiko.io)
2. Implement IP allowlisting for admin API access via Ory Network configuration
3. Add monitoring and alerting for admin API usage
4. Rotate admin API keys regularly and audit key distribution
5. Consider using short-lived admin tokens instead of long-lived API keys
