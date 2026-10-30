# F029 - API Access Without Email Verification

## Summary

| Field | Value |
|-------|-------|
| Severity | High |
| CVSS 3.1 | 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:H/A:N) |
| OWASP | A07:2021 - Identification and Authentication Failures |
| Endpoint | investor-api.spiko.io/v0/* |
| Status | Confirmed |

## Description

The investor API gateway does not enforce email verification. Accounts registered with unverified email addresses (verified=false, status=sent) receive active sessions (F019) that are accepted by the investor API. All 5 discovered endpoints return 400 (missing parameters) rather than 401 or 403, confirming the request is authenticated and authorized at the API gateway level.

Combined with the CAPTCHA bypass (F018), an attacker can create unlimited accounts with arbitrary unverified email addresses that have full API access.

## Proof

Account registered with unverified email (verified=false):

```
GET /sessions/whoami HTTP/2
Host: investor-auth.spiko.io
X-Session-Token: ory_st_MQ2o1GxU1XPNOlhkuLlTOyJwbPV8BGdf
```

Identity shows: `verifiable_addresses[0].verified: false, status: sent`

API access with this unverified session:

```
GET /v0/accounts/displayable HTTP/2
Host: investor-api.spiko.io
X-Session-Token: ory_st_MQ2o1GxU1XPNOlhkuLlTOyJwbPV8BGdf
```

```
HTTP/2 400
{"_tag":"HttpApiDecodeError","issues":[{"_tag":"Missing","path":["investorId"],"message":"Missing key"}]}
```

The 400 response with a parameter validation error (not 401/403) confirms the request passed authentication and authorization checks at the API gateway.

All 5 endpoints behave the same:
- /v0/accounts/displayable: 400 (missing investorId)
- /v0/accounts/lines: 400 (missing accountId)
- /v0/powens-aggregates: 400 (missing investorId)
- /v0/spiko-agents: 400 (missing bankAccountId)
- /v0/stablecoin-deposit-accounts: 400 (missing accountId)

## Impact

On a regulated financial platform subject to KYC/AML requirements:
1. Unverified email accounts should not have API access
2. An attacker can create automated accounts with fake emails and interact with the API
3. Combined with CAPTCHA bypass, this enables mass creation of API-accessible accounts
4. If any endpoint is vulnerable to IDOR (bypassing object-level authorization), unverified accounts could access other users' financial data

## Remediation

1. Enforce email verification check at the API gateway level (Envoy)
2. Reject requests from sessions where the identity has verified=false
3. Return 403 with a clear "email verification required" message
