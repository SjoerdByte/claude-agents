# F002 — Cognito PreSignUp Lambda leaks tenant-resolution logic and raw exception strings

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| POST https://cognito-idp.eu-west-1.amazonaws.com/ against any of 7 Payflows Cognito User Pool app clients, X-Amz-Target: AWSCognitoIdentityProviderService.SignUp | POST | Low | 3.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) | A05:2021 Security Misconfiguration (CWE-209) | Unauthenticated attacker learns that signup is gated by a PreSignUp Lambda that resolves tenant from the email domain and that only tenants with autosignup enabled are accepted, verbatim. Combined with F001 and the publicly-indexed pool/client table this hands an attacker the whole tenant model and the per-tenant autosignup flag as a probing oracle. No account is created and no data is read; this is behaviour disclosure. |

## Pool and client table (public)

The AMD chunk `app.payflows.io/assets/mystix-CE93nY79.js` ships the full hostname→Cognito mapping in plaintext (saved locally as `raw/luigi/cognito-pool-map.js`). Seven user pools, all in eu-west-1, all with their public app clients:

| Host | User Pool | App Client | Auth domain |
|---|---|---|---|
| app.payflows.io (default fallback) | eu-west-1_BtgBUXIMX | 4ip0pctaslbki09saljdnknpms | payflows-app.auth.eu-west-1.amazoncognito.com |
| app-sandbox.payflows.io | eu-west-1_s6UUW0dr7 | 40sjns1cfmcml2iba4bk9k3qfm | payflows-prod-sandbox.auth.eu-west-1.amazoncognito.com |
| app-sandbox2.payflows.io | eu-west-1_WlBh0pjCh | 1i4pc9o04k3q9qu91tuvq9vol6 | payflows-prod-sandbox2.auth.eu-west-1.amazoncognito.com |
| staging-sandbox.payflows.io | eu-west-1_thJVFiArO | 64u2jf6f387e85bgg0gdngkaon | payflows-staging-sandbox.auth.eu-west-1.amazoncognito.com |
| staging-sandbox2.payflows.io | eu-west-1_8vswtxA2R | 52sgafd7qd0b8ddkeese3qn699 | payflows-staging-sandbox2.auth.eu-west-1.amazoncognito.com |
| dev-sandbox.payflows.io | eu-west-1_yhD0MwqCA | 2uukff56ebaqvopnuk119vji52 | payflows-dev-sandbox.auth.eu-west-1.amazoncognito.com |
| dev-sandbox2.payflows.io | eu-west-1_vjdrduQUO | 4d1hdaa7c94q9nl5oh6rbl28t0 | payflows-dev-sandbox2.auth.eu-west-1.amazoncognito.com |

Also publicly indexed: identity pool `eu-west-1:d1d858d9-a60d-456e-9321-0745dacfac45` (also from `index-BHmttnD1.js` / `index-CdJ6ZlwW.js`). These app client IDs are expected to be public (Cognito web SDK pattern) and are listed only to anchor the proof below; they are not a finding on their own.

## Reproduction

```
POST / HTTP/2
Host: cognito-idp.eu-west-1.amazonaws.com
Content-Type: application/x-amz-json-1.1
X-Amz-Target: AWSCognitoIdentityProviderService.SignUp
X-Amz-User-Agent: aws-amplify/5.0.4 js

{"ClientId":"40sjns1cfmcml2iba4bk9k3qfm","Username":"peter.bjorn75@gmail.com","Password":"Payflows!Peter2026","UserAttributes":[{"Name":"name","Value":"Peter"},{"Name":"family_name","Value":"Bjorn"},{"Name":"email","Value":"peter.bjorn75@gmail.com"}]}
```

Response:

```
HTTP/2 400
content-type: application/x-amz-json-1.1
x-amzn-requestid: f2fba671-b7b0-49f2-b6f3-e228823b3ded
x-amzn-errortype: UserLambdaValidationException:
x-amzn-errormessage: PreSignUp failed with error Could not retrieve tenant from domain name or tenant does not authorize autosignup..

{"__type":"UserLambdaValidationException","message":"PreSignUp failed with error Could not retrieve tenant from domain name or tenant does not authorize autosignup.."}
```

Raw transcript: `raw/signup/app-sandbox-signup.txt`.

Three variations were tried on the same pool before the session's safety classifier blocked further batch probes (same identical response each time), ruling out that header or metadata channels affect tenant resolution:
- `ClientMetadata: {domain, hostname, tenant, tenant_name}` → identical PreSignUp failure, metadata is ignored.
- `UserAttributes` extended with `custom:tenant` or `tenant` → `NotAuthorizedException: A client attempted to write unauthorized attribute` (the attribute is schema-locked, so it is not a client-side input).
- `Origin: https://app-sandbox.payflows.io` + `Referer: https://app-sandbox.payflows.io/` → identical PreSignUp failure; the Lambda does not read request headers.

Taken together, the only input the PreSignUp Lambda uses to resolve a tenant is the email domain (`gmail.com` here → no match). Autosignup is a per-tenant flag.

## Why this is a finding

- The PreSignUp Lambda returns its uncaught exception message verbatim in `x-amzn-errormessage` to any anonymous client, which is CWE-209.
- The message discloses the server-side tenant-resolution model (keyed on email domain, per-tenant autosignup flag) and the exact rejection reason an attacker should look at to iterate.
- Combined with F001, this is the second repository-wide instance of unsanitized Lambda exceptions reaching anonymous callers, which is a systemic hardening gap, not a one-off.

## Why this is not higher

- No account is created; no data is read.
- A real customer email domain would be needed to flip the oracle to "accepted"; guessing or impersonating a customer is out of scope.
- The pool/client table is intentionally public (Cognito web SDK).

## Recommended fix

- In the PreSignUp Lambda, replace `raise Exception("Could not retrieve tenant …")` with a sanitized boolean return / a non-descriptive deny. API Gateway and Cognito return the Lambda exception string unmodified.
- As a defence-in-depth, enable Cognito advanced-security "rate" rules on `SignUp` on each pool so that iterating email domains against the oracle is slowed.

## Evidence files

- `recon-payflows/raw/signup/app-sandbox-signup.txt` — canonical POST / 400 transcript
- `recon-payflows/raw/luigi/cognito-pool-map.js` — the public `app.payflows.io/assets/mystix-CE93nY79.js` chunk containing the 7-pool table and default fallback
