# F002 - Account Creation Without Email Verification

## Endpoint
`POST https://app.amenitiz.io/en/signup` (via `https://app.amenitiz.io/users`)

## Method
POST (Devise registration)

## Severity
Low

## CVSS
AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N — 5.3

## OWASP
A07:2021 Identification and Authentication Failures

## Impact
An attacker can create fully functional PMS accounts using any email address without completing email verification. The account is immediately usable upon registration: full dashboard access, room creation, booking management, and channel manager setup are all available.

Combined with other weaknesses, this lowers the bar for automated abuse:
- Mass account creation for platform abuse (spam listings, fake hotels)
- Impersonation of arbitrary email addresses on the platform
- If a cross-tenant vulnerability were to exist, this removes the email verification barrier to exploitation

Additionally, the signup flow accepts weak passwords, including passwords identical to the email address (e.g. email: `test@test.com`, password: `test@test.com`).

## Reproduction

1. Navigate to `https://app.amenitiz.io/en/signup`
2. Fill in any email address (no mailbox access needed), a name, and a password
3. Complete the reCAPTCHA v3 challenge (invisible, score-based — passes automatically for normal browser behavior)
4. Submit the form
5. The account is immediately active with full dashboard access at `{chosen-subdomain}.amenitiz.io`
6. No verification email must be clicked, no phone verification required

## Request
```
POST /users HTTP/2
Host: app.amenitiz.io
Content-Type: application/x-www-form-urlencoded

user[first_name]=Test&user[last_name]=User&user[email]=any.email@example.com&user[password]=any.email@example.com&user[password_confirmation]=any.email@example.com&...
```

## Response
HTTP 302 redirect to `/en/admin/dashboard` — account created and session established immediately.

## Verification step
After fix, attempting to sign up should require clicking a verification link sent to the registered email before the dashboard is accessible. Expected: HTTP 200 with a "verify your email" message instead of redirect to dashboard.
