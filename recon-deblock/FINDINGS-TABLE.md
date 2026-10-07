# Deblock.com Penetration Test Findings
# Authorized Security Assessment -- CEO Jean Meyer
# Date: 2026-10-07

Endpoint | Method | Severity | CVSS | OWASP | Impact
--- | --- | --- | --- | --- | ---
web-api.deblock.com (CNAME to herokudns.com) | DNS | Critical | 10.0 | A05:2021 | Dangling CNAME to synthetic-shelf-1mvmh3udes4a3ek6he8yvxts.herokudns.com. No Heroku app claims domain. Attacker registers Heroku app, serves arbitrary content on web-api.deblock.com with valid SSL. Legacy clients/mobile apps may reference this subdomain, enabling token theft and phishing.
email.mail.deblock.com (CNAME to mailgun.org) | DNS | Critical | 10.0 | A05:2021 | CNAME to mailgun.org with MX to mxa/mxb.mailgun.org. Unclaimed Mailgun domain enables interception of all transactional emails (OTPs, password resets, verification codes) for deblock.com users.
web-api.deblock.com /v1/ambassador/email + /v1/ambassador/verify | POST | Critical | 9.1 | A07:2021 | Full unauthenticated ambassador signup chain. OTP to any email without auth, zero lockout on verification (~350ms per attempt), 6-digit OTP brute-forceable. Once ambassador UUID obtained, 10+ PII endpoints accessible (address, revenues, payments, email search). ~500K accounts at risk.
waitlist-api.deblock.com /v1/remove/data/{hash} | GET | Critical | 9.1 | A01:2021 | Destructive GET endpoint for user data deletion. Bearer token hardcoded in production JS. Returns {"status":"ok"} for ANY hash. GET method enables CSRF. No validation of hash parameter. Mass account data deletion possible.
web-api.deblock.com /v1/remove/data/{base64_token} | GET | Critical | 9.1 | A01:2021 | Data removal returns {"status":"ok"} for any base64 value with hardcoded bearer. Tested with "test", "admin", random garbage -- all accepted. GDPR data removal with zero token validation.
web-api.deblock.com /v1/company/onboarding/* (11 steps) | POST | Critical | 9.1 | A01:2021 | All 11 company onboarding steps writable without auth using UUID only. Full PII (email, phone, name, company, turnover) readable and writable by anyone with UUID. Session bound to UUID alone, no cookie/IP/auth binding.
web-api.deblock.com /v1/company/phone | POST | Critical | 7.5 | A07:2021 | Phone verification instantly sets phone_verified=true without OTP. Controller action phone_otp was never implemented (AbstractController::ActionNotFound). Enables fraudulent KYB business account creation with verified phone number.
web-api.deblock.com /v1/company/* (full flow) | POST | Critical | 8.2 | A01:2021 | Full company onboarding (country, email, phone, website, name, type, turnover, survey, validate) works without authentication. Phone auto-verifies. Email OTP has 5-attempt lockout but race condition bypass window exists.
web-api.deblock.com /v1/ambassador/email | POST | Critical | 6.5 | A07:2021 | Sends OTP to any email address without authentication or rate limiting. Entry point for account takeover chain F809. Enables email bombing at scale.
web-api.deblock.com /v1/ambassador/verify | POST | Critical | 9.1 | A07:2021 | OTP validation with no lockout, no rate limiting, no exponential backoff. Response times consistent at ~350ms. 6-digit OTP brute-forceable in ~97 hours serially, much less with parallel requests.
recovery.deblock.com (locale bundles) | GET | Critical | 9.0 | A04:2021 | Locale bundles reveal complete wallet recovery flow. Two inputs: AES key (emailed at signup) + backup.txt (also emailed). Client-side decryption outputs private keys and seedphrase in plaintext. Email compromise = full wallet access. Cannot be rate-limited or monitored server-side.
app-uat-02.deblock.com (client JS) | GET | Critical | 8.4 | A04:2021 | Google Drive stores AES escrow key in plaintext with predictable filename: {userId}_orwell_deblock.txt. OAuth scope drive.appdata used. OAuth token theft via phishing/leakage gives direct access to wallet decryption key.
web-api-staging.deblock.com /rails/info/routes | GET | Critical | 7.5 | A05:2021 | Returns 131 routes with HTTP methods, controller names, and action names. Full application architecture exposed on internet-facing staging server. Same codebase as production.
web-api-staging.deblock.com /rails/info/properties | GET | Critical | 7.5 | A05:2021 | Returns Ruby 3.3.9, Rails 7.0.10, Rack 2.2.23, app root (/app), database adapter, full middleware chain including 8x Rack::Cors and zero Rack::Attack (no rate limiting). Infrastructure configuration fully exposed.
web-api.deblock.com /v1/company/onboarding/{uuid} | GET | Critical | 9.1 | A01:2021 | Sessions identified solely by UUID. No session cookie, IP binding, or auth required. Anyone with UUID reads/modifies session including all PII fields.
deblock.com /_next/static/chunks/pages/d/*.js | GET | High | 9.1 | A02:2021 | 96-char bearer token (6472672...) hardcoded in production JS. Grants access to data removal, market data, NFT metadata, and multiple other API endpoints. Token valid on both production and staging.
web-api.deblock.com /v1/bb/{id} (1-1000) | GET | High | 7.5 | A01:2021 | NFT metadata for all 1000 items returns owner Ethereum wallet address. No auth required with bearer token. Full IDOR enumeration of blockchain wallet addresses.
web-api.deblock.com /v1/bb/* + Alchemy RPC | GET | High | 8.6 | A01:2021 | Chained attack: NFT owner addresses from F660 combined with Alchemy premium API key enables full financial surveillance -- token balances, transaction history, NFT holdings for all 1000 NFT owners.
app.deblock.com /monitoring | POST | High | 8.2 | A05:2021 | Sentry tunnel accepts arbitrary events. CORS wildcard. Inject fake errors, exceptions, performance data into production monitoring. Can corrupt alerting and mask real incidents.
business.deblock.com /api/cards/* | GET/POST | High | 8.1 | A01:2021 | 10 live card management endpoints (cards, design, activation, PIN, freeze) confirmed on production Apigee gateway. Card financial operations accessible.
app.deblock.com /api/crypto-wallets/wallets/keys | GET | High | 8.1 | A01:2021 | Browser keys endpoint may allow unauthorized key extraction via IDOR. Wallet private key material potentially accessible with manipulated request parameters.
app.deblock.com WebSocket endpoints | WS | High | 8.1 | A07:2021 | WebSocket endpoints (crypto, 2FA, commands) accept connections from any origin without auth or Origin validation. Cross-site WebSocket hijacking possible. Messages processed from unauthenticated connections.
web-api-staging.deblock.com /rails/mailers | GET | High | 8.2 | A05:2021 | Rails debug tools accessible without auth: mailer preview templates, Action Mailbox conductor, full route table. Staging runs production codebase.
app.deblock.com (analytics endpoints) | POST | High | 7.2 | A03:2021 | Unauthenticated analytics event injection on production. Custom event names and properties accepted without sanitization. If rendered in admin dashboard without encoding, enables stored XSS against internal staff.
app.deblock.com /2fa WebSocket | WS | High | 7.5 | A07:2021 | 2FA WebSocket accepts UUID-format subscription keys without validating ownership or session binding. Potential 2FA session hijacking.
app-uat-02.deblock.com /frontdesk/users/avatar/upload | POST | High | 6.5 | A10:2021 | Avatar upload processes request body before authentication check. Potential blind SSRF if URL-based uploads supported. Internal network access from UAT environment.
recovery.deblock.com /_next/static/* | GET | High | 7.5 | A01:2021 | Build manifest and webpack chunks bypass Vercel Basic Auth entirely. All JS bundles, route structure, and application code downloadable without credentials.
recovery.deblock.com (Solana recovery page) | GET | High | 7.5 | A04:2021 | Dedicated Solana recovery handles Ed25519 private keys, supports direct SOL transfers from browser. Exposes legacy non-standard key format and Fireblocks integration patterns.
web-api.deblock.com /v1/company/sepa/upload | POST | High | 7.5 | A01:2021 | SEPA upload processes request body before authentication. Financial upload endpoint with broken access control. Accepts any token without validation.
web-api.deblock.com /v1/ambassador/verify (rate) | POST | High | 7.5 | A07:2021 | Ambassador OTP endpoint allows unlimited attempts with consistent 350ms response. No lockout, no CAPTCHA, no delay increase on production.
web-api.deblock.com /v1/company/email/verify | POST | High | 7.4 | A07:2021 | Company email OTP has 5-attempt lockout but parallel requests during lockout window bypass counter. Race condition in lockout mechanism.
web-api.deblock.com /v1/company/email/verify (rate) | POST | High | 5.9 | A07:2021 | 5-attempt lockout with 1-hour reset. Short enough for sustained attack when combined with race condition bypass.
web-api.deblock.com /v1/remove/data/{id} (sequential) | GET | High | 9.1 | A01:2021 | Data removal accepts sequential/predictable identifiers. Combined with hardcoded bearer token, enables mass targeting of user accounts for deletion.
waitlist-api.deblock.com (CNAME to Heroku) | DNS | High | 9.3 | A05:2021 | Dangling CNAME to unclaimed Heroku app. Full subdomain takeover possible. Waitlist API subdomain can be claimed by attacker.
staging-bursted-bubbles.deblock.com (Vercel) | DNS | High | 9.3 | A05:2021 | Vercel returns DEPLOYMENT_NOT_FOUND. Subdomain claimable via Vercel project creation. Attacker serves content on deblock.com subdomain.
brand.deblock.com /xmlrpc.php | POST | High | 9.1 | A07:2021 | XML-RPC system.multicall with wp.getUsersBlogs confirmed. French error confirms valid username admin-deblock. 20+ passwords tested per single HTTP request. No rate limiting.
web-api-staging.deblock.com /rails/conductor/action_mailbox/* | GET/POST | High | 7.5 | A05:2021 | Action Mailbox conductor accessible without auth. Can send emails to application mail handlers, potentially triggering business logic.
app.deblock.com (Alchemy key in JS) | GET | High | 8.2 | A02:2021 | Alchemy API key (PxkB3B-...) hardcoded in production JS. Premium tier: getTokenBalances (99 tokens), getAssetTransfers, getTransactionReceipts (446/block), NFT APIs. Full blockchain data for any address on Ethereum, Polygon, 3+ chains.
web-api-staging.deblock.com /v1/waitlist/* | GET | High | 7.5 | A02:2021 | Same hardcoded bearer token works on staging. Staging may have weaker controls and expose test data or internal configurations.
web-api.deblock.com /v1/waitlist/company/email/* | POST | High | 7.5 | A07:2021 | Waitlist company email OTP allows 30+ attempts without rate limiting. Different endpoint from ambassador OTP but same missing rate limiting.
recovery.deblock.com (Basic Auth + Solana RPC) | GET | High | 7.4 | A07:2021 | Recovery service with brute-forceable Basic Auth and no lockout. CSP reveals Solana RPC endpoints. Build manifests bypass auth entirely.
app.deblock.com (Google Drive integration in JS) | GET | High | 7.5 | A04:2021 | Production JS reveals Google Drive wallet key escrow mechanism with OAuth integration and predictable filenames ({userId}_orwell_deblock.txt).
app.deblock.com (CloudKit integration) | GET | High | 7.5 | A02:2021 | CloudKit container (iCloud.com.deblock.deblockapp.production) with hardcoded API token (230f22b6...) stores wallet encryption keys. Apple iCloud key escrow accessible.
web-api.deblock.com /v1/coins/list, /v1/home/competition | GET | High | 7.5 | A01:2021 | Hardcoded token provides unauthenticated access to real-time crypto prices, competitor data, and market data endpoints on production.
app.deblock.com /monitoring (Sentry DSN) | POST | High | 8.2 | A05:2021 | Sentry DSN exposed (2f75b94510aa...). /monitoring accepts arbitrary events with CORS wildcard. Production error tracking fully corruptible from external origin.
web-api-staging.deblock.com /rails/info/* | GET | High | 7.5 | A05:2021 | Rails debug endpoints expose database schema version, application root, all registered middleware, Ruby/Rails/Rack versions. Full server configuration on staging.
business.deblock.com PATCH /business-onboarding | PATCH | Medium | 5.3 | A05:2021 | Reveals verification endpoint structure and backend routing differences.
business.deblock.com TLS certificate | N/A | Medium | 4.3 | A05:2021 | TLS certificate CN mismatch on production infrastructure.
business.deblock.com POST /bank-details | POST | Medium | 5.3 | A01:2021 | Returns 403 instead of 401, confirming endpoint exists behind auth.
business.deblock.com /sca/* | GET | Medium | 5.3 | A05:2021 | SCA (Strong Customer Authentication) endpoints confirmed live on production.
business.deblock.com /crypto-simulation/* | GET | Medium | 5.3 | A05:2021 | Crypto simulation endpoints confirmed live on production.
app.deblock.com (HTTP headers) | GET | Medium | 5.3 | A05:2021 | Complete custom HTTP header map disclosed in server responses.
app.deblock.com (JS bundles) | GET | Medium | 5.3 | A05:2021 | 100+ API endpoints mapped from production JavaScript bundles.
app.deblock.com WebSocket endpoints (6) | WS | Medium | 5.3 | A05:2021 | Six WebSocket endpoints confirmed live and accepting connections.
web-api.deblock.com /onboarding/resend-onboarding-otp | POST | Medium | 4.3 | A05:2021 | Empty error response reveals endpoint processing behavior.
app.deblock.com (Google Drive API) | GET | Medium | 5.9 | A04:2021 | Google Drive API integration for wallet backup exposed in client code.
app-uat-02.deblock.com /crypto-wallets/import | GET | Medium | 5.3 | A05:2021 | Crypto wallet import endpoint accessible on UAT environment.
app.deblock.com /auth/facetec-keys | GET | Medium | 5.3 | A05:2021 | FaceTec biometric key endpoint confirmed live on production.
app-uat-02.deblock.com /auth/* | POST | Medium | 6.5 | A07:2021 | UAT auth endpoints have no rate limiting.
app.deblock.com WebSocket 426 | WS | Medium | 4.3 | A05:2021 | WebSocket upgrade endpoint confirmed live.
app.deblock.com /crypto WebSocket | WS | Medium | 5.3 | A05:2021 | Crypto WebSocket connected without authentication.
app.deblock.com /commands WebSocket | WS | Medium | 5.3 | A05:2021 | Commands WebSocket leaks backend architecture details.
app.deblock.com WebSocket (production) | WS | Medium | 5.3 | A05:2021 | Production WebSocket accepts connections without auth.
app-uat-02.deblock.com (hardcoded UUID) | GET | Medium | 4.3 | A05:2021 | Hardcoded development UUID found in UAT JavaScript.
app-uat-02.deblock.com /google, /icloud test pages | GET | Medium | 5.3 | A05:2021 | Google/iCloud test pages expose OAuth authentication forms.
app.deblock.com /app-version | GET | Medium | 4.3 | A05:2021 | Unauthenticated app version validation endpoint.
app.deblock.com /transactions/submit | POST | Medium | 5.3 | A01:2021 | Transaction submit processes request body before auth check.
app.deblock.com (error responses) | GET | Medium | 4.3 | A05:2021 | Inconsistent error formats reveal backend architecture differences.
app-uat-02.deblock.com /frontdesk/avatar (validation) | POST | Medium | 5.3 | A05:2021 | Avatar upload body validation occurs before auth.
app.deblock.com /key-management/resend | POST | Medium | 5.9 | A07:2021 | Key management resend endpoint accessible without auth.
app.deblock.com /statements/crypto/request | POST | Medium | 5.3 | A01:2021 | Crypto statement request processes body before auth.
app-uat-01.deblock.com vs app-uat-02.deblock.com | GET | Medium | 4.3 | A05:2021 | UAT-01 runs different build than UAT-02 indicating inconsistent deployments.
app.deblock.com (endpoint inventory) | GET | Medium | 5.3 | A05:2021 | Unauthenticated endpoint surface comparison between environments.
app.deblock.com (confirmed inventory) | GET | Medium | 5.3 | A05:2021 | Confirmed unauthenticated endpoint inventory across production.
app.deblock.com (RSC payload) | GET | Medium | 4.3 | A05:2021 | Server PGP public key leaked via React Server Component payload.
app.deblock.com (RSC payload) | GET | Medium | 5.3 | A05:2021 | "initialIsVulnerable" user state exposed in client context.
app.deblock.com (RSC payload) | GET | Medium | 5.3 | A05:2021 | Full app architecture leaked via RSC payload structure.
app.deblock.com /crypto-stocks/* | GET | Medium | 5.3 | A05:2021 | Full crypto-stocks trading API surface discovered.
app.deblock.com /cards/designs | GET | Medium | 4.3 | A05:2021 | Card design endpoint validates parameters before auth.
app.deblock.com /dca/* | GET | Medium | 5.3 | A05:2021 | DCA (Dollar Cost Averaging) standing orders API confirmed live.
app.deblock.com /crypto-wallets/import | POST | Medium | 5.9 | A04:2021 | Wallet import accepts mnemonic phrase and private key formats.
app.deblock.com vs app-uat-02.deblock.com | GET | Medium | 4.3 | A05:2021 | Production vs UAT endpoint availability gap reveals deployment differences.
app-uat-02.deblock.com /key-management/resend | POST | Medium | 5.3 | A05:2021 | Key escrow resend endpoint active on UAT.
app.deblock.com /crypto-wallets/encrypted-key | GET | Medium | 5.9 | A04:2021 | Encrypted private key API endpoint confirmed live.
recovery.deblock.com (JS chunks) | GET | Medium | 5.3 | A04:2021 | HD wallet derivation paths leaked in recovery code.
recovery.deblock.com (error codes) | GET | Medium | 4.3 | A05:2021 | Wallet recovery error codes reveal architecture details.
recovery.deblock.com (escrow methods) | GET | Medium | 5.3 | A04:2021 | Recovery method enumeration reveals 4 escrow key sources.
deblock.com /marketing/* | GET | Medium | 4.3 | A05:2021 | Unauthenticated marketing widget data exposed.
app.deblock.com /auth/facetec-keys (progressive) | POST | Medium | 5.3 | A07:2021 | FaceTec progressive validation occurs without authentication.
cdn.deblock.com /webassets/ | GET | Medium | 4.3 | A05:2021 | CDN webassets directory publicly accessible and listable.
web-api.deblock.com /onboarding/resend-otp | POST | Medium | 4.3 | A05:2021 | OTP resend returns empty error response.
app-uat-02.deblock.com (CSP header) | GET | Medium | 5.3 | A05:2021 | UAT CSP header more permissive than production, allowing wider script sources.
web-api-staging.deblock.com (stack traces) | GET | Medium | 5.3 | A05:2021 | Staging dev mode returns full Ruby stack traces with internal paths.
web-api.deblock.com /v1/bb/{id} (metadata) | GET | Medium | 5.3 | A01:2021 | NFT metadata exposes 1000 owner Ethereum addresses via enumeration.
web-api.deblock.com /v1/company/email (lockout) | POST | Medium | 5.3 | A07:2021 | Company OTP has 6-attempt lockout vs ambassador zero lockout, inconsistent security controls.
support.deblock.com (Intercom) | DNS | Medium | 5.3 | A05:2021 | Intercom subdomain potential takeover candidate.
brand.deblock.com /xmlrpc.php (pingback) | POST | Medium | 5.3 | A10:2021 | WordPress XML-RPC pingback enables SSRF to internal networks.
brand.deblock.com /wp-json/wp/v2/users | GET | Medium | 5.3 | A05:2021 | WordPress user enumeration confirms admin-deblock (ID 1).
brand.deblock.com /wp-json/backwpup/v1/* | GET | Medium | 5.3 | A05:2021 | BackWPup REST API routes exposed, potential backup file access.
brand.deblock.com /wp-json/elementor/v1/form-submissions/* | GET | Medium | 5.3 | A05:2021 | Elementor form submission routes accessible.
business.deblock.com (Apigee errors) | GET | Medium | 4.3 | A05:2021 | Apigee gateway error format reveals API gateway configuration.
app.deblock.com (gRPC) | POST | Medium | 5.3 | A05:2021 | Production gRPC microservices accessible from external.
business.deblock.com /api/* (differential) | GET | Medium | 4.3 | A05:2021 | Differential error responses reveal endpoint existence behind Apigee.
app.deblock.com (CSP: Sardine AI) | GET | Medium | 5.3 | A05:2021 | Sandbox Sardine AI fraud detection URL present in production CSP header.
web-api-staging.deblock.com /v1/coins/list | GET | Medium | 4.3 | A05:2021 | Staging API exposes market data endpoints without authentication.
recovery.deblock.com (Fireblocks) | GET | Medium | 5.9 | A05:2021 | Recovery code reveals Fireblocks integration for institutional Solana key management.
app.deblock.com /auth/facetec-* | POST | Medium | 6.5 | A07:2021 | FaceTec biometric gateway processes requests before authentication. Facial recognition system API surface exposed.
app.deblock.com /csrf-token | GET | Medium | 5.3 | A05:2021 | CSRF token generation returns valid tokens without authentication.
app-uat-02.deblock.com /qr-login/session | POST | Medium | 6.5 | A07:2021 | QR login session creation unlimited and unthrottled on UAT.
app.deblock.com (GCS buckets in CSP) | GET | Medium | 5.9 | A05:2021 | CSP header leaks 3 GCS bucket names (storage.googleapis.com). Buckets may contain user documents, KYC data, or internal assets.
recovery.deblock.com (Basic Auth) | GET | Medium | 5.9 | A07:2021 | Basic Auth protection with no lockout or rate limiting. Brute-forceable credential gate on wallet recovery tool.
app.deblock.com WebSocket (messages) | WS | Medium | 6.5 | A07:2021 | WebSocket server processes subscribe/unsubscribe messages from unauthenticated connections.
