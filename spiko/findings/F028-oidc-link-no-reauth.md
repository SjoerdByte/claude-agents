# F028 - Google OAuth Account Link Without Re-authentication

## Summary

| Field | Value |
|-------|-------|
| Severity | High |
| CVSS 3.1 | 7.6 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N) |
| OWASP | A07:2021 - Identification and Authentication Failures |
| Endpoint | POST https://investor-auth.spiko.io/self-service/settings?flow={id} |
| Status | Confirmed |

## Description

The settings flow allows linking a Google account to a Spiko account without re-authentication. An attacker with a stolen session token can link their own Google account, then use "Sign in with Google" to access the victim's account even after the victim changes their password.

This creates a persistent backdoor that survives password changes and is invisible to the victim (there is no notification that a Google account was linked).

The response also leaks the Google OAuth client ID: `630381370739-pqnjukd84mpui5vvus3lua9lf86n5joj`

## Proof

```
POST /self-service/settings?flow=e9c3d079-0e99-4ccf-914c-e628be824173 HTTP/2
Host: investor-auth.spiko.io
X-Session-Token: ory_st_MQ2o1GxU1XPNOlhkuLlTOyJwbPV8BGdf
Content-Type: application/json

{"method":"oidc","link":"google"}
```

Response: HTTP 422 with redirect_browser_to:
```
https://accounts.google.com/o/oauth2/v2/auth?client_id=630381370739-pqnjukd84mpui5vvus3lua9lf86n5joj&...
```

The 422 is the expected response for an API flow requesting a browser redirect. The redirect URL is ready for the attacker to complete the Google OAuth flow in their browser.

## Impact

Combined with F024 (no current password required) and F027 (TOTP/backup code enrollment):

1. Attacker steals session token
2. Links their Google account (no re-auth, this finding)
3. Changes password (no current password, F024)
4. Enrolls their TOTP (no re-auth, F027)
5. Regenerates backup codes (F027)
6. Victim changes password via recovery flow
7. Attacker logs in via "Sign in with Google" (bypasses password)
8. Attacker's TOTP and backup codes are still active

The victim cannot remove the attacker's Google link without logging in, but they can't log in without the attacker's TOTP.

## Remediation

1. Require re-authentication (current password or fresh login) before linking external identity providers
2. Send email notification when a Google account is linked
3. Require AAL2 (MFA) for sensitive settings changes
