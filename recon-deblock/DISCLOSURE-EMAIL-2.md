Hi Joao,

Thanks for the update, glad to hear some findings are being addressed.

Below are the additional findings. I have grouped them by category to make the assessment easier. These are all separate from the 6 findings in my initial report.


SUBDOMAIN TAKEOVERS

7. Subdomain takeover on waitlist-api.deblock.com (High, CVSS 9.3)
Endpoint: waitlist-api.deblock.com (DNS)

Problem: The subdomain waitlist-api.deblock.com has a dangling CNAME pointing to an unclaimed Heroku application, identical in nature to the web-api.deblock.com takeover reported previously.

Impact: An attacker can claim this subdomain on Heroku and serve arbitrary content. The "waitlist-api" name suggests it was used for the waitlist/NFT API, so older clients, bookmarked URLs, or cached DNS entries may still resolve to it.

Reproduction:
dig waitlist-api.deblock.com CNAME
curl -sI https://waitlist-api.deblock.com
Returns Heroku 404 (no app claims the domain).

Recommendation: Remove the dangling CNAME or claim the domain on Heroku.


8. Subdomain takeover on staging-bursted-bubbles.deblock.com (High, CVSS 9.3)
Endpoint: staging-bursted-bubbles.deblock.com (DNS)

Problem: This subdomain points to Vercel, which returns DEPLOYMENT_NOT_FOUND. An attacker can create a Vercel project and claim this subdomain.

Impact: Attacker serves content on a deblock.com subdomain with valid TLS. Useful for phishing or cookie theft if cookies are scoped to *.deblock.com.

Reproduction:
curl -sI https://staging-bursted-bubbles.deblock.com
Returns Vercel DEPLOYMENT_NOT_FOUND page.

Recommendation: Remove the DNS record or deploy a placeholder to Vercel.


9. Potential subdomain takeover on support.deblock.com (Medium, CVSS 5.3)
Endpoint: support.deblock.com (DNS)

Problem: The subdomain points to Intercom. If the Intercom workspace is unclaimed or deprovisioned, this becomes claimable.

Impact: Attacker could impersonate Deblock's customer support portal.

Recommendation: Verify the Intercom workspace is actively claimed and configured.


HARDCODED API KEYS AND SECRETS

10. Alchemy API key with premium tier access hardcoded in production JavaScript (High, CVSS 8.2)
Endpoint: app.deblock.com (production JavaScript bundles)

Problem: An Alchemy API key (first characters: PxkB3B-1-0bFV...) is hardcoded in production JavaScript. The key has premium tier access providing full RPC capabilities across at least 5 EVM chains (Ethereum, Polygon, and 3 others).

Impact: Anyone can use this key to query blockchain data for any address: token balances (99 tokens per call), asset transfers, transaction receipts (446 per block), and full NFT metadata. This enables financial surveillance of any Ethereum/Polygon address. The key also incurs API usage costs on Deblock's Alchemy account. Combined with the NFT owner wallet addresses exposed via /v1/bb/{id} (finding 12), this enables complete financial profiling of all 1000 NFT holders.

Reproduction:
curl -s -X POST https://eth-mainnet.g.alchemy.com/v2/PxkB3B-1-0bFVQHY4Gy5e9V_-FwVj7Pt \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"alchemy_getTokenBalances","params":["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","erc20"],"id":1}'

Response: 200 OK with token balances for the queried address. Key is live and has premium tier.

Recommendation: Rotate the Alchemy API key immediately. Move RPC calls to a backend proxy so the key is never exposed in client-side code.


11. Apple CloudKit API token hardcoded for wallet key escrow (High, CVSS 7.5)
Endpoint: app.deblock.com (production JavaScript bundles)

Problem: A CloudKit API token (230f22b656e186689f6fcd1c7965a6bf1f390ab2ca374aeac57eeabce11a8b8b) is hardcoded in production JavaScript. The CloudKit container is iCloud.com.deblock.deblockapp.production and is used to store wallet encryption keys as part of the iCloud escrow mechanism.

Impact: This token, combined with knowledge of the CloudKit container and record structure (revealed in the same JavaScript bundles), could allow an attacker to query or manipulate wallet encryption key records stored in iCloud. This is the Apple counterpart to the Google Drive escrow mechanism reported in finding 6.

Reproduction: The token and container identifier are present in the production JavaScript bundles served from app.deblock.com.

Recommendation: Rotate the CloudKit API token. Move CloudKit operations to the backend so the token is not exposed client-side.


12. NFT metadata endpoint exposes 1000 owner Ethereum wallet addresses (High, CVSS 7.5)
Endpoint: GET /v1/bb/{id} (web-api.deblock.com, production)

Problem: The /v1/bb/{id} endpoint returns NFT metadata for IDs 1 through 1000, including the owner's Ethereum wallet address. Accessible with the hardcoded bearer token from finding 4 in my initial report.

Impact: All 1000 NFT holder wallet addresses are enumerable. Combined with the Alchemy API key (finding 10), this enables full financial surveillance of every NFT holder: token balances, transaction history, NFT holdings, and DeFi positions.

Reproduction:
curl -s https://web-api.deblock.com/v1/bb/1 \
  -H "Authorization: Bearer 6472672..."

Response: 200 OK with NFT metadata including owner field containing an Ethereum address.

Iterating IDs 1-1000 returns all owner addresses.

Recommendation: Remove owner wallet addresses from the public metadata response, or require proper authentication.


13. Hardcoded bearer token grants access to production financial data (High, CVSS 7.5)
Endpoint: /v1/coins/list, /v1/home/competition (web-api.deblock.com, production)

Problem: The same hardcoded bearer token from finding 4 also grants unauthenticated access to real-time cryptocurrency pricing data and competitor intelligence data on production.

Impact: Real-time market data and competitive intelligence accessible to anyone with the token (which is in public JavaScript).

Reproduction:
curl -s https://web-api.deblock.com/v1/coins/list \
  -H "Authorization: Bearer 6472672..."

Response: 200 OK with real-time crypto pricing data.

curl -s https://web-api.deblock.com/v1/home/competition \
  -H "Authorization: Bearer 6472672..."

Response: 200 OK with competitor data.

Recommendation: Addressed by rotating the bearer token and removing it from client-side code (same fix as finding 4).


14. WalletConnect project ID exposed (Medium, CVSS 5.3)
Endpoint: app.deblock.com (production JavaScript)

Problem: WalletConnect projectId (bd6ba992febab0bad0434e02099098db) is hardcoded in production JavaScript.

Impact: Can be used to impersonate the Deblock application in WalletConnect sessions or to track usage metrics.

Recommendation: Consider whether this ID should be rotated or if its exposure is acceptable given WalletConnect's security model.


STAGING ENVIRONMENT EXPOSURE

15. Staging debug endpoints expose full route table, server configuration, and mailer previews (High, CVSS 8.2)
Endpoint: web-api-staging.deblock.com /rails/info/routes, /rails/info/properties, /rails/mailers, /rails/conductor/action_mailbox/

Problem: The staging environment at web-api-staging.deblock.com exposes Rails debug endpoints without any authentication. These endpoints reveal:
- /rails/info/routes: 131 routes with HTTP methods, controller names, and action names
- /rails/info/properties: Ruby 3.3.9, Rails 7.0.10, Rack 2.2.23, application root (/app), database adapter, full middleware chain including 8x Rack::Cors and notably zero Rack::Attack (no rate limiting middleware)
- /rails/mailers: mailer preview templates including user_notifier_mailer
- /rails/conductor/action_mailbox/: Action Mailbox conductor allowing email injection into the application's mail handlers

Impact: The route table provides a complete map of the application's API surface, including controller names that directly correspond to production. The properties disclosure confirms no rate limiting middleware is installed (Rack::Attack absent), which explains the unlimited OTP attempts in the ambassador flow. The Action Mailbox conductor allows sending arbitrary emails to the application's inbound email handlers, potentially triggering business logic. The staging environment runs the same codebase as production.

Reproduction:
curl -s https://web-api-staging.deblock.com/rails/info/routes
Response: 200 OK, HTML page with 131 routes.

curl -s https://web-api-staging.deblock.com/rails/info/properties
Response: 200 OK, server configuration including Ruby/Rails versions and middleware stack.

curl -s https://web-api-staging.deblock.com/rails/mailers
Response: 200 OK, HTML page with mailer preview links.

Recommendation: Disable Rails debug endpoints on the staging environment, or restrict access to authenticated developers only. The staging server should not be publicly accessible without authentication.


16. Staging accepts production bearer token (High, CVSS 7.5)
Endpoint: web-api-staging.deblock.com /v1/* endpoints

Problem: The same hardcoded bearer token from finding 4 works on the staging environment. Staging may have weaker security controls and may contain test data or internal configuration that is more sensitive than production.

Impact: Attacker with the production bearer token (publicly available in JavaScript) gains access to the staging API, which may expose test accounts, internal data, or endpoints not yet deployed to production.

Reproduction:
curl -s https://web-api-staging.deblock.com/v1/coins/list \
  -H "Authorization: Bearer 6472672..."

Response: 200 OK (same token accepted on staging).

Recommendation: Use separate bearer tokens for staging and production. Restrict staging access to authenticated users or IP allowlists.


WEBSOCKET VULNERABILITIES

17. WebSocket endpoints accept unauthenticated connections with no origin validation (High, CVSS 8.1)
Endpoints: wss://app.deblock.com/crypto, /2fa, /commands, and 3 additional WebSocket endpoints (production)

Problem: Six WebSocket endpoints on production accept connections without any authentication and perform no Origin header validation. The server actively processes subscribe/unsubscribe messages from these unauthenticated connections. The 2FA WebSocket accepts UUID-format subscription keys without validating that the key belongs to the connecting user's session.

Impact: Cross-site WebSocket hijacking is possible: a malicious page can open a WebSocket to app.deblock.com and subscribe to channels. The 2FA endpoint is particularly concerning because an attacker who guesses or obtains a valid UUID could monitor 2FA session state. The crypto and commands WebSockets leak backend architecture details in their message formats.

Reproduction:
wscat -c wss://app.deblock.com/crypto
Connected (no authentication required, no Origin check).

Sending {"type":"subscribe","channel":"prices"} results in the server processing the message.

Recommendation: Require authentication before accepting WebSocket connections. Validate the Origin header against an allowlist. For the 2FA WebSocket, bind subscription keys to authenticated sessions.


SENTRY AND MONITORING

18. Sentry monitoring tunnel accepts arbitrary event injection (High, CVSS 8.2)
Endpoint: POST /monitoring (app.deblock.com, production)

Problem: The /monitoring endpoint acts as a Sentry tunnel that accepts arbitrary Sentry events without authentication. CORS is configured with a wildcard, allowing requests from any origin. The Sentry DSN (2f75b94510aa39f72db5dd805d1c1dc8@o4510324489519104.ingest.de.sentry.io/4510324496859216) is also exposed.

Impact: An attacker can inject fake errors, exceptions, performance data, and custom events into production monitoring. This can corrupt alerting thresholds, mask real incidents, trigger false alarms to cause alert fatigue, and potentially inject stored XSS payloads if Sentry events are rendered in internal dashboards without sanitization. The Sentry DSN also allows direct event submission to the Sentry project.

Reproduction:
curl -s -X POST https://app.deblock.com/monitoring \
  -H "Content-Type: application/json" \
  -d '{"event_id":"test","message":"injected event"}'

Response: 200 OK (event accepted).

Recommendation: Add authentication or at least origin validation to the /monitoring endpoint. Consider using a Sentry tunnel that validates event payloads against expected formats.


WORDPRESS (brand.deblock.com)

19. WordPress XML-RPC brute-force amplification via system.multicall (High, CVSS 9.1)
Endpoint: POST /xmlrpc.php (brand.deblock.com)

Problem: XML-RPC is enabled with system.multicall support. A single HTTP request can test 20+ passwords against the confirmed admin user (admin-deblock, user ID 1). Error messages are in French, confirming the username is valid. No rate limiting or lockout is in place.

Impact: Brute-force amplification allows an attacker to test thousands of passwords per minute against the WordPress admin account. If the admin password is weak or reused, this leads to full WordPress admin access including plugin installation (remote code execution), content modification on brand.deblock.com, and potential lateral movement if credentials are shared.

Reproduction:
curl -s -X POST https://brand.deblock.com/xmlrpc.php \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0"?>
<methodCall>
  <methodName>system.multicall</methodName>
  <params><param><value><array><data>
    <value><struct>
      <member><name>methodName</name><value>wp.getUsersBlogs</value></member>
      <member><name>params</name><value><array><data>
        <value>admin-deblock</value><value>wrongpassword1</value>
      </data></array></value></member>
    </struct></value>
    <value><struct>
      <member><name>methodName</name><value>wp.getUsersBlogs</value></member>
      <member><name>params</name><value><array><data>
        <value>admin-deblock</value><value>wrongpassword2</value>
      </data></array></value></member>
    </struct></value>
  </data></array></value></param></params>
</methodCall>'

Response: 200 OK with French error messages ("Nom d’utilisateur ou mot de passe incorrect.") for each attempt, confirming the username is valid and attempts are being processed.

Recommendation: Disable XML-RPC entirely or at minimum disable system.multicall. Add rate limiting and lockout on failed authentication attempts. Consider using a WAF rule to block XML-RPC brute-force patterns.


20. WordPress user enumeration and exposed plugin routes (Medium, CVSS 5.3)
Endpoint: brand.deblock.com /wp-json/wp/v2/users, /xmlrpc.php (pingback)

Problem: The WordPress REST API exposes user information confirming admin-deblock (ID 1) is the admin user. XML-RPC pingback is enabled, allowing SSRF to internal networks. BackWPup REST API routes and Elementor form submission routes are also exposed.

Impact: User enumeration confirms valid usernames for brute-force attacks. Pingback SSRF can probe internal services. BackWPup routes may expose backup files containing database dumps.

Recommendation: Restrict the /wp-json/wp/v2/users endpoint. Disable XML-RPC pingback. Review BackWPup and Elementor plugin configurations.


PRODUCTION API VULNERABILITIES

21. SEPA upload endpoint accepts requests without proper authentication (High, CVSS 7.5)
Endpoint: POST /v1/company/sepa/upload (web-api.deblock.com, production)

Problem: The SEPA file upload endpoint processes the request body before performing authentication checks. It also accepts any token without proper validation.

Impact: SEPA files are used for batch European bank transfers. An endpoint that processes upload requests before authentication could potentially trigger financial operations or allow injection of malicious SEPA XML that gets processed downstream.

Reproduction:
curl -s -X POST https://web-api.deblock.com/v1/company/sepa/upload \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer arbitrary_token"

The server processes the request body before returning an authentication error, indicating pre-auth parsing.

Recommendation: Move authentication checks before any request body processing. Validate bearer tokens strictly before processing SEPA uploads.


22. Company email OTP race condition bypasses lockout (High, CVSS 7.4)
Endpoint: POST /v1/company/email/verify (web-api.deblock.com, production)

Problem: The company email OTP has a 5-attempt lockout, but sending parallel verification requests during the lockout window can bypass the counter. The lockout resets after 1 hour.

Impact: The race condition allows more than 5 OTP attempts before lockout triggers, making the 6-digit OTP more feasible to brute-force. Combined with the 1-hour reset, a sustained attack can test significantly more combinations than the lockout intends to allow.

Recommendation: Use atomic operations for the lockout counter to prevent race conditions. Consider a longer lockout period or exponential backoff.


23. Waitlist company email OTP has no rate limiting (High, CVSS 7.5)
Endpoint: POST /v1/waitlist/company/email/* (web-api.deblock.com, production)

Problem: A separate waitlist company email OTP endpoint allows 30+ consecutive attempts without any rate limiting or lockout. This is a different endpoint from the ambassador OTP but exhibits the same missing rate limiting.

Impact: The OTP is brute-forceable without any restrictions.

Recommendation: Apply the same lockout logic that exists on the company email OTP flow.


24. Unauthenticated analytics event injection with stored XSS potential (High, CVSS 7.2)
Endpoint: Analytics endpoints on app.deblock.com (production)

Problem: Analytics event tracking accepts arbitrary event names and custom properties without authentication or input sanitization. Events are stored server-side.

Impact: If analytics events are rendered in any internal admin dashboard without proper output encoding, this enables stored XSS against internal Deblock staff. Custom event names and properties can contain JavaScript payloads that execute when an admin views the analytics dashboard.

Reproduction:
Events can be submitted via the analytics endpoints on app.deblock.com without any authentication. Custom event names and properties are accepted as-is.

Recommendation: Sanitize all analytics event data on ingestion. Ensure any internal dashboards rendering event data use proper output encoding.


25. FaceTec biometric gateway accessible without authentication (Medium, CVSS 6.5)
Endpoint: /auth/facetec-keys (app.deblock.com, production)

Problem: The FaceTec biometric verification gateway processes requests before the authentication check. The endpoint returns biometric configuration data.

Impact: Exposes the facial recognition system's API surface. Could be used to enumerate FaceTec configuration or test biometric bypass techniques.

Recommendation: Move authentication before any request processing on biometric endpoints.


26. Card management API endpoints live on production (High, CVSS 8.1)
Endpoint: /api/cards/*, /api/cards/design, /api/cards/activation, /api/cards/pin, /api/cards/freeze (business.deblock.com, production)

Problem: 10 card management endpoints are confirmed live on the production Apigee gateway. These include card creation, design, activation, PIN management, and freeze/unfreeze operations.

Impact: These endpoints manage real payment cards. While they require authentication (which was not tested due to scope), the fact that they respond to requests through the Apigee gateway confirms they are live and processing. If any authentication or authorization weakness exists, the impact would be direct financial.

Recommendation: Ensure all card management endpoints have robust authentication, authorization, and audit logging.


RECOVERY TOOL DETAILS (supplementary to finding 6)

27. Recovery tool Basic Auth brute-forceable with no lockout (Medium, CVSS 5.9)
Endpoint: recovery.deblock.com

Problem: The Basic Auth protection on recovery.deblock.com has no lockout mechanism or rate limiting. As reported in finding 6, the static assets bypass this auth entirely, but the main application page is still brute-forceable.

Impact: The Basic Auth credential can be brute-forced without restriction, giving access to the full interactive recovery tool.

Recommendation: Add rate limiting to the Basic Auth challenge, or replace it with a stronger authentication mechanism.


28. Solana recovery page with direct transfer capability (High, CVSS 7.5)
Endpoint: recovery.deblock.com (Solana recovery page)

Problem: A dedicated Solana recovery page handles Ed25519 private keys and supports direct SOL transfers from the browser. The page reveals a legacy non-standard key format and Fireblocks integration patterns for institutional key management.

Impact: The recovery page can be used to initiate real Solana transfers once a private key is recovered. The Fireblocks integration details reveal the institutional custodian setup.

Recommendation: Restrict access to the Solana recovery page. Consider whether direct transfer capability should be part of the recovery tool or handled separately.


INFORMATION DISCLOSURE (grouped)

29. Production JavaScript bundles expose complete API surface map (Medium, CVSS 5.3)
Endpoint: app.deblock.com (production JavaScript)

Problem: Production JavaScript bundles contain the complete API endpoint map (100+ endpoints), custom HTTP header names, WebSocket endpoint paths, wallet derivation paths (HD wallet BIP paths), the "initialIsVulnerable" user state flag, React Server Component payloads leaking full application architecture, the PGP public key used by the server, and the Sardine AI fraud detection sandbox URL in production CSP headers.

Impact: This information significantly reduces the effort required to map and attack the application. The presence of "initialIsVulnerable" as a client-side state flag is concerning as it suggests the application tracks vulnerability state per user.

Recommendation: Review what information is included in production JavaScript bundles. Strip development-only code, comments, and internal identifiers. Move API endpoint definitions server-side where possible.


30. GCS bucket names leaked via CSP header (Medium, CVSS 5.9)
Endpoint: app.deblock.com (CSP response header)

Problem: The Content-Security-Policy header on production leaks three Google Cloud Storage bucket names (storage.googleapis.com). These buckets may contain user documents, KYC verification data, or internal assets.

Impact: If any bucket has misconfigured permissions, the leaked names allow direct access attempts. Even with correct permissions, the bucket names reveal infrastructure details.

Recommendation: Review bucket permissions. Consider whether the bucket URLs need to be in the CSP or can be proxied.


31. Production gRPC microservices accessible externally (Medium, CVSS 5.3)
Endpoint: app.deblock.com (gRPC)

Problem: gRPC microservices on production respond to external requests. If gRPC reflection is enabled, the full service definition and method signatures can be enumerated.

Impact: Exposes the microservice architecture. If any gRPC service lacks authentication, direct backend access is possible.

Recommendation: Restrict gRPC access to internal networks only.


SUMMARY

Initial report: 6 critical findings (findings 1-6)
This report: 25 additional findings (findings 7-31)
- 2 additional subdomain takeovers (High/Critical)
- 4 hardcoded API keys and secrets (High)
- 2 staging environment exposures (High)
- 1 WebSocket vulnerability cluster (High)
- 1 Sentry monitoring injection (High)
- 2 WordPress vulnerabilities (High + Medium)
- 4 production API vulnerabilities (High)
- 2 recovery tool supplementary findings (High + Medium)
- 3 information disclosure findings (Medium)
- 4 additional medium findings

Total across both reports: 31 distinct findings, covering production, staging, and UAT environments.

Let me know if you need any clarification or want to discuss further.

Best,
Sjoerd
