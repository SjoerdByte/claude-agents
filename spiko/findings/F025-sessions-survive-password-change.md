# F025 - Sessions Not Fully Invalidated After Password Change

## Summary

| Field | Value |
|-------|-------|
| Severity | High |
| CVSS 3.1 | 7.1 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N) |
| OWASP | A07:2021 - Identification and Authentication Failures |
| Endpoint | POST https://investor-auth.spiko.io/self-service/settings?flow={id} |
| Status | Confirmed |

## Description

When a user changes their password via the settings flow, not all existing sessions are invalidated. In testing with 3 concurrent sessions, changing the password via Session 3 caused Session 1 to be revoked but Session 2 to remain active. The session used to perform the password change (Session 3) also remained active, which is expected behavior.

This means that if an attacker has obtained a session token, the legitimate user cannot revoke the attacker's access simply by changing their password. The attacker's session may survive the password change and continue to provide full account access.

## Proof

### Step 1: Create 3 concurrent sessions

```
Session 1: ory_st_8CxRxFLlVDQrM5xcEEP8fObY5jsOBxzL
Session 2: ory_st_zjyuKh7eKLSUosCEQzBD0bdNhliFW26V
Session 3: ory_st_FNA7JIBtu0vjTI9gjIPfZfdveb24XuTi
```

### Step 2: Change password using Session 3

```
POST /self-service/settings?flow={id} HTTP/2
Host: investor-auth.spiko.io
X-Session-Token: ory_st_FNA7JIBtu0vjTI9gjIPfZfdveb24XuTi
Content-Type: application/json

{"method":"password","password":"TempPass999!#"}
```

Response: HTTP 200, state: success

### Step 3: Check all sessions

```
Session 1: DEAD (HTTP 401) - correctly invalidated
Session 2: ACTIVE (HTTP 200) - still active after password change
Session 3: ACTIVE (HTTP 200) - still active (expected, it's the current session)
```

## Impact

Combined with F024 (password change without current password), this creates a persistent account takeover scenario:

1. Attacker steals a session token
2. Attacker changes the password (no current password needed)
3. Victim notices they're locked out and uses recovery flow to regain access
4. Victim changes the password to something new
5. Attacker's session may still be active, giving continued access
6. The only reliable remediation is for the victim to revoke all sessions explicitly

On a financial platform, this means an attacker can maintain persistent access to an investor's account even after the victim has detected the compromise and changed their password.

## Remediation

1. Invalidate ALL other sessions when a password is changed
2. Ory Kratos supports this via the `after/password/hooks` configuration with the `revoke_active_sessions` hook
3. Consider notifying users via email when their password is changed, including a link to revoke all sessions
