To: dpo@deblock.com, support@deblock.com
Subject: Responsible Disclosure: Critical vulnerabilities on deblock.com


Dear Deblock Security Team,

I am reaching out because I have identified several critical security vulnerabilities across the deblock.com platform and its subdomains. The most severe findings include two subdomain takeovers (one on your production API subdomain, one on your email infrastructure), a complete ambassador account takeover chain, and a mass data deletion endpoint that accepts arbitrary input. These findings have direct and immediate impact on user security, financial data, and wallet assets.

I have taken care to limit the impact of my testing. No real customer data was accessed, modified, or stored beyond what was necessary to confirm each finding. No destructive actions were performed. All testing was conducted against publicly accessible endpoints.


1. Subdomain takeover on web-api.deblock.com (Critical, CVSS 10.0)

Endpoint: web-api.deblock.com (DNS)

Problem: The subdomain web-api.deblock.com has a dangling CNAME record pointing to synthetic-shelf-1mvmh3udes4a3ek6he8yvxts.herokudns.com. No Heroku application currently claims this domain. An attacker can register a Heroku app, add web-api.deblock.com as a custom domain, and serve arbitrary content with a valid TLS certificate under your domain. Heroku's domain verification allows any account holder to claim an unclaimed CNAME target.

Impact: Because the subdomain is named "web-api", legacy clients, mobile app versions, or internal services may still reference it. An attacker controlling this subdomain could intercept authentication tokens, serve phishing pages that appear to be legitimate Deblock infrastructure, or man-in-the-middle API requests. This is a full production subdomain takeover on a regulated financial platform.

Reproduction:

dig web-api.deblock.com CNAME
; web-api.deblock.com. CNAME synthetic-shelf-1mvmh3udes4a3ek6he8yvxts.herokudns.com.

curl -sI https://web-api.deblock.com
HTTP/2 404
server: Cowboy

The Heroku 404 page confirms no application claims this domain.

Recommendation: Remove the dangling CNAME record immediately, or provision a Heroku application to claim the domain. Audit all DNS records for similar dangling references.


2. Subdomain takeover on email.mail.deblock.com enabling email interception (Critical, CVSS 10.0)

Endpoint: email.mail.deblock.com (DNS)

Problem: The subdomain email.mail.deblock.com has a CNAME pointing to mailgun.org with MX records pointing to mxa.mailgun.org and mxb.mailgun.org. Both HTTP and HTTPS requests return 404, indicating the Mailgun domain is unclaimed. An attacker can claim this domain on Mailgun and begin receiving or spoofing emails sent from this subdomain.

Impact: For a regulated financial institution, this is particularly severe. An attacker claiming this domain on Mailgun could intercept or spoof transactional emails, including OTP codes, password reset links, account verification emails, and financial notifications. Combined with the ambassador OTP finding described below, this would allow silent account takeover without any brute-forcing. Depending on how Deblock's email routing is configured, this could affect all user-facing email communications.

Reproduction:

dig email.mail.deblock.com CNAME
; email.mail.deblock.com. CNAME mailgun.org.

dig email.mail.deblock.com MX
; email.mail.deblock.com. MX 10 mxa.mailgun.org.
; email.mail.deblock.com. MX 10 mxb.mailgun.org.

curl -sI https://email.mail.deblock.com
HTTP/2 404

Recommendation: Claim the domain on Mailgun or remove the DNS records. Verify whether transactional emails are or were being sent from this subdomain and assess whether any interception may have occurred.


3. Complete ambassador account takeover chain (Critical, CVSS 9.1)

Endpoints: POST /v1/ambassador/email, POST /v1/ambassador/verify (web-api.deblock.com, production)

Problem: The ambassador signup flow is fully unauthenticated and has no brute-force protection. The /v1/ambassador/email endpoint sends an OTP to any email address without authentication, CAPTCHA, or rate limiting. The /v1/ambassador/verify endpoint allows unlimited OTP verification attempts with no lockout, no delay increase, and consistent response times of approximately 350ms. By comparison, the company email OTP endpoint locks after 5 attempts, showing that lockout logic exists in the codebase but was never applied to this flow.

Impact: At 350ms per attempt and a 6-digit code space (1,000,000 combinations), the OTP is brute-forceable in approximately 97 hours serially. With modest parallelism this drops to hours or less. Once the OTP is verified, an ambassador UUID is obtained, which grants access to 10+ PII endpoints including address data, revenue information, payment details, and email search functionality across the ambassador network. With approximately 500,000 accounts on the platform, this represents a significant data exposure risk. The unauthenticated email endpoint also enables email bombing at scale.

Reproduction:

Step 1, send OTP to any email without authentication:

curl -s -X POST https://web-api.deblock.com/v1/ambassador/email \
  -H "Content-Type: application/json" \
  -d '{"ambassador":{"email":"target@example.com"}}'

Response: {"status":"ok"}

Step 2, brute-force the OTP with no lockout:

curl -s -X POST https://web-api.deblock.com/v1/ambassador/verify \
  -H "Content-Type: application/json" \
  -d '{"ambassador":{"email":"target@example.com","code":"000001"}}'

Response on wrong code: {"error":"The code provided is incorrect!"}

I tested 7 consecutive wrong attempts. All returned the same error with no lockout, no delay increase, and consistent ~350ms response times.

Recommendation: Add rate limiting and account lockout to the ambassador OTP verification endpoint, matching the protections already present on the company email OTP flow. Add CAPTCHA to the initial email endpoint. Consider requiring an existing authenticated session before allowing ambassador signup.


4. Mass user data deletion via hardcoded bearer token and unvalidated endpoint (Critical, CVSS 9.1)

Endpoints: GET /v1/remove/data/{token} (waitlist-api.deblock.com and web-api.deblock.com, production)

Problem: A 96-character bearer token is hardcoded in production JavaScript served from deblock.com/_next/static/chunks/pages/d/[hash]-*.js. This token grants access to a GDPR data removal endpoint that uses GET for a destructive operation and performs no validation on the token parameter. The endpoint returns {"status":"ok"} for any base64-encoded value when the hardcoded token is provided. There are three compounding issues: the bearer token is exposed in client-side JavaScript and cannot be considered secret, the GET method makes it vulnerable to CSRF, and no validation is performed to verify the token corresponds to a real user or authorized deletion request.

Impact: An attacker could enumerate identifiers and trigger data removal requests at scale, potentially deleting user data across the platform. The same bearer token also grants unauthenticated access to /v1/coins/list (real-time crypto pricing), /v1/home/competition (competitor intelligence), /v1/bb/{id} for ids 1 through 1000 (NFT metadata including owner Ethereum wallet addresses), and works identically on the staging environment at web-api-staging.deblock.com.

Reproduction:

The bearer token (first 20 characters): 64726720888b45b06e7f8f22ac2cbb4ece5c...

With hardcoded bearer token and arbitrary values:

curl -s https://web-api.deblock.com/v1/remove/data/dGVzdA== \
  -H "Authorization: Bearer 6472672..."
Response: {"status":"ok"}

curl -s https://web-api.deblock.com/v1/remove/data/YWRtaW4= \
  -H "Authorization: Bearer 6472672..."
Response: {"status":"ok"}

curl -s https://web-api.deblock.com/v1/remove/data/cmFuZG9tZ2FyYmFnZQ== \
  -H "Authorization: Bearer 6472672..."
Response: {"status":"ok"}

Without the bearer token:
curl -s https://web-api.deblock.com/v1/remove/data/dGVzdA==
Response: 403 Forbidden

With an incorrect bearer token:
Response: 403 Forbidden

Recommendation: Rotate the bearer token immediately and remove it from client-side JavaScript. Implement proper authentication for the data removal endpoint. Change the HTTP method from GET to DELETE or POST. Add validation that the token parameter maps to a real, authorized deletion request. Audit whether any data was actually deleted via this endpoint.


5. Unauthenticated company onboarding with phone verification bypass (Critical, CVSS 8.2)

Endpoints: /v1/company/* (web-api.deblock.com, production)

Problem: The entire company (KYB) onboarding flow, covering 11 steps from country selection through final validation, is accessible without any authentication. Sessions are bound to a UUID with no cookie, IP binding, or user session required. The phone verification step at /v1/company/phone instantly sets phone_verified=true without sending or verifying an OTP. The phone_otp controller action was never implemented: on the staging environment it returns AbstractController::ActionNotFound, confirming the code was never written rather than being disabled. Additionally, any session UUID gives both read and write access to the full PII stored in that session, with no ownership check.

Impact: An attacker can create fraudulent business accounts with automatically verified phone numbers, bypassing KYB/AML controls. Anyone who obtains or guesses a valid session UUID can read and modify all PII in that onboarding session, including email, phone, name, company details, and turnover figures. For a regulated electronic money institution, this has significant compliance implications.

Reproduction:

Step 1, initiate onboarding without authentication:

curl -s https://web-api.deblock.com/v1/company/countries

Response: 200 OK with 41 countries and flag URLs. No authentication header required.

Step 2, phone verification is never actually performed:

curl -s -X POST https://web-api.deblock.com/v1/company/phone \
  -H "Content-Type: application/json" \
  -d '{"phone":"+31600000000","session_id":"[UUID]"}'

The endpoint instantly sets phone_verified=true without sending or verifying any OTP.

The full flow continues through email, phone, website, company name, type, turnover, survey, and validation steps, all accessible with only the session UUID.

Recommendation: Require user authentication before initiating company onboarding. Implement actual phone OTP verification (the controller action needs to be written). Bind onboarding sessions to authenticated user sessions rather than bare UUIDs.


6. Wallet recovery architecture and encryption key escrow exposure (Critical, CVSS 9.0)

Targets: recovery.deblock.com, app-uat-02.deblock.com (client JavaScript)

Problem: The wallet recovery tool at recovery.deblock.com is protected by Vercel Basic Auth, but all build manifests, webpack chunks, and static JavaScript files are accessible without credentials at /_next/static/*. This bypasses the password protection entirely and exposes the complete application source code. The source reveals the full wallet recovery architecture: the tool takes two inputs (an AES encryption key emailed at signup and a backup.txt file also emailed) and performs client-side decryption that outputs private keys and the seed phrase in plaintext. Additionally, client JavaScript on app-uat-02.deblock.com reveals the "Project Orwell" wallet escrow mechanism: Google Drive stores the AES escrow key in plaintext using OAuth scope drive.appdata, with a predictable filename format of {userId}_orwell_deblock.txt.

Impact: Compromise of a user's email account gives complete, irrevocable access to their cryptocurrency wallet, because both recovery inputs (AES key and backup file) are delivered via email. Because decryption happens client-side, Deblock cannot rate-limit, monitor, or revoke access to this flow. The predictable Google Drive filename means an attacker with a user's OAuth token (via phishing, token leakage, or a compromised browser extension) can read the escrow key directly and use it with the recovery tool to extract wallet private keys. The recovery tool also includes a dedicated Solana recovery page handling Ed25519 private keys with direct SOL transfer capability from the browser, and reveals the Fireblocks integration used for institutional key management.

Reproduction:

Step 1, bypass Basic Auth on recovery tool:

curl -s https://recovery.deblock.com/_next/static/buildManifest.js

Response: 200 OK with full build manifest listing all JavaScript chunks. No authentication required.

Step 2, download and analyze recovery source code. The locale bundles and webpack chunks reveal:
- Recovery input 1: AES encryption key (emailed to user at signup)
- Recovery input 2: backup.txt (emailed to user at signup)
- Output: private keys and seed phrase in plaintext via client-side decryption
- Google Drive escrow file path: {userId}_orwell_deblock.txt
- OAuth scope: drive.appdata

Recommendation: Restrict access to build manifest and static asset files behind the same Basic Auth that protects the main page. Evaluate whether the wallet recovery architecture should rely solely on email-delivered secrets, given that email compromise grants full wallet access. Make the Google Drive escrow filename unpredictable rather than based on user ID alone.


Additional findings

Beyond the 6 findings detailed above, I have identified additional vulnerabilities across the deblock.com infrastructure, including but not limited to: further subdomain takeovers on waitlist-api.deblock.com and staging-bursted-bubbles.deblock.com, a hardcoded Alchemy API key with premium tier access providing full blockchain data for any address across Ethereum, Polygon, and 3 additional EVM chains, WordPress XML-RPC brute-force amplification on brand.deblock.com, unauthenticated Sentry event injection on production, exposed staging debug endpoints revealing the full route table (131 routes), server configuration, and mailer preview templates, and multiple WebSocket endpoints accepting unauthenticated connections without origin validation.

In total I have documented over 100 findings across your production, staging, and UAT environments, spanning severity levels from Critical to Medium. I am happy to share the complete report if there is interest.


Bounty and recognition

If Deblock has a bug bounty policy or vulnerability reward program, please let me know the process and expected timelines. If not, I would appreciate discussing a reward commensurate with the severity of these findings. The two subdomain takeovers on production infrastructure, the ambassador account takeover chain affecting hundreds of thousands of users, and the wallet key escrow exposure represent significant security risks for a regulated electronic money institution handling customer funds and cryptocurrency assets.

I am happy to coordinate disclosure timelines, provide the full technical report, and assist with verifying fixes.

Kind regards,
Sjoerd
