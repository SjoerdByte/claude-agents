To: sam.brown@wildz.group, Kimmo.Mustonen@wildz.group, Giacomo.Bulian@wildz.group, Haydn.du.Plessis@wildz.group
Subject: Responsible Disclosure: Critical vulnerabilities on rootz.com


Dear Sam, Kimmo, Giacomo, Haydn and team,

During independent security research on rootz.com, wheelz.com and their subdomains, I identified 4 high-severity vulnerabilities, one of which is critical and actively being exploited by a third party. No real customer data was accessed, modified or stored during this research. Testing was limited to publicly accessible endpoints and responses were only examined to the extent necessary to confirm each finding.


Subdomain takeover on e2e.infra.rootz.com, actively exploited (Critical, CVSS 9.1)

Endpoint: http://e2e.infra.rootz.com

The S3 bucket that previously backed e2e.infra.rootz.com has been claimed by an external party. The DNS record still points to the S3 website endpoint, but the original bucket was either deleted or its ownership lapsed, and a third party has registered the bucket name and is serving an Indonesian gambling site ("IMBAJP | Maxwin Slot dengan Link Login Resmi & Stabil") under your domain. The content has been live since at least February 12, 2026 based on the Last-Modified header.

Reproduction:

curl -s -D- http://e2e.infra.rootz.com/

HTTP/1.1 200 OK
x-amz-request-id: ...
server: AmazonS3
Content-Type: text/html

The response body is a full HTML page containing Google Tag Manager (GTM-KWW5SS), Bing tracking pixels, embedded user data (data-user-id="1135369000"), and OG metadata referencing e2e.infra.rootz.com as canonical URL. HTTPS does not function on this endpoint as the TLS handshake times out, only HTTP serves content. Requesting a nonexistent path returns the standard S3 NoSuchKey XML error, confirming S3 hosting.

Impact: Because the attacker controls content on a rootz.com subdomain, they can set and read cookies scoped to .rootz.com, which could enable session hijacking across your casino products. The subdomain is also usable for phishing, SEO poisoning, and as a CSP bypass vector if any policy on your products allows *.rootz.com or *.infra.rootz.com. This is an active incident.

Recommended fix: Remove the DNS CNAME or A record pointing e2e.infra.rootz.com to the S3 endpoint immediately. Alternatively, reclaim the S3 bucket under your own AWS account.


Unauthenticated Prometheus metrics on 7 servers including a payment service (High, CVSS 7.5)

Endpoints:
pragmatic-server.lab1.rootz.com/metrics
hacksaw-server.lab1.rootz.com/metrics
yggdrasil-server.lab1.rootz.com/metrics
quickspin-server.lab1.rootz.com/metrics
oryx-server.lab1.rootz.com/metrics
push-server.lab1.rootz.com/metrics
brite-server.lab1.rootz.com/metrics (payment service)

Seven game integration and payment servers expose their Prometheus /metrics endpoint without any authentication. Each returns between 16KB and 41KB of operational telemetry per request.

Reproduction:

curl -s https://brite-server.lab1.rootz.com/metrics | head -50

The response contains Go runtime metrics (go1.27.1), internal Kubernetes service URLs (client="https://backendapi.rootz-platform:7777"), API route patterns for player authentication (/rgs/hive/player/auth) and wallet operations (/rgs/hive/player/{playerId}/wallet, /rgs/hive/txn), database architecture details (read/write split with max 50 connections), AMQP consumer tags revealing RabbitMQ usage, financial operation counters (walletapi_deposit_calls, walletapi_withdraw_calls, walletapi_rollback_calls, walletapi_insufficient_balance_errors), and exact service versions (pragmatic-server/1.4.10, hacksaw-server/1.3.10, quickspin-server/1.3.12, oryx-server/1.2.11, push-server/1.4.8, brite-server/1.6.3).

Impact: An attacker can construct a detailed map of the internal microservice architecture, including Kubernetes namespace conventions, API endpoint patterns for player wallet operations, database connection limits, and financial transaction error types. The exact software versions enable targeted CVE research. The brite-server instance is particularly concerning as it handles payment processing.

Recommended fix: Add authentication to all /metrics endpoints. Use Kubernetes NetworkPolicy or Ingress rules to restrict access to the Prometheus scraper IP only.


Public S3 bucket with full listing and file read on assets.rootz.com (High, CVSS 7.5)

Endpoint: https://assets.rootz.com/

The S3 bucket assets.rootz.com (region eu-west-1) has both public listing (ListBucket) and public object read (GetObject) enabled. The bucket contains assets for over 10 casino brands.

Reproduction:

curl -s "https://assets.rootz.com/" | head -100

The response is a 307KB XML document (IsTruncated=true, meaning more than the 1000 listed objects exist) containing the full bucket listing. Individual files are downloadable without authentication. Brands exposed include beazt.com, caxino.com, chipz.com, lemonz.com, speedz.com, spinz.com, spinz.de, wheelz.com, wheelzgames.de, wildz.com and wildz.de.

Among the exposed files is caxino.com/_well-known/apple-developer-merchantid-domain-association.txt, which contains the Apple Pay merchant certificate with Team ID SL88LHPJ78 and domain www.caxino.com.

Recommended fix: Disable the public ListBucket ACL on the bucket. Review GetObject permissions and restrict to only files that genuinely need to be publicly served. Consider migrating to CloudFront with Origin Access Control rather than exposing the S3 bucket directly.


Exposed Dex OIDC providers with open device code flow on staging and dev (High, CVSS 7.3)

Endpoints:
https://dex.stg.rootz.com
https://dex.dev.rootz.com

Two Dex OIDC identity providers used for Kubernetes cluster authentication are publicly accessible on raw AWS IPs (108.133.177.4 and 18.202.129.211) without any WAF or rate limiting. Unlike your other services, these sit outside Cloudflare. Both expose full OIDC discovery metadata, 5 RSA signing keys each via JWKS, and accept unauthenticated POST requests to /device/code to generate device authorization codes.

Reproduction:

Step 1. Retrieve the OIDC discovery document:

curl -s https://dex.stg.rootz.com/.well-known/openid-configuration

Returns the full configuration including issuer https://dex.stg.rootz.com, supported grant types (authorization_code, implicit, refresh_token, device_code), scopes (openid, email, groups, profile, offline_access), and the Google connector.

Step 2. Generate a device code without any client secret:

curl -s -X POST https://dex.stg.rootz.com/device/code -d "client_id=wohTei2hiQu1&scope=openid+profile+email+offline_access+groups"

Returns a valid device_code, user_code (format XXXX-XXXX), and verification_uri. Codes expire after 300 seconds. No client_secret is required. The same flow works on dex.dev.rootz.com.

The linked applications at login.stg.rootz.com and login.dev.rootz.com are dex-k8s-authenticator instances titled "Generate Kubernetes Token", confirming these Dex instances control access to Kubernetes clusters. The dev instance uses a GitLab connector (gitlab.rootz.com as upstream IdP) and discloses its GitLab OAuth client_id (33cd8790c14a9f932782eaf1a2243877860811df5da245e1e15a88a418eec918). Both instances also have implicit grant type and plain PKCE challenge method enabled.

Impact: An attacker generates a device code, sends the verification URL to a Rootz employee in a phishing email, and if the employee approves it through their Google SSO or GitLab login, the attacker exchanges the device code for tokens granting Kubernetes cluster access. The absence of WAF protection means there is no rate limiting on code generation or token exchange attempts.

Recommended fix: Restrict access to dex.stg.rootz.com, dex.dev.rootz.com, login.stg.rootz.com and login.dev.rootz.com to internal or VPN networks, or place them behind Cloudflare. Disable the device_code and implicit grant types if they are not operationally required. Require a client_secret for all OAuth flows.


In addition to these four findings, I also identified several medium-severity issues including CORS misconfigurations with internal header disclosure on the frontend API, a publicly listable S3 bucket on s-game-assets.rootz.com, missing security headers on the corporate WordPress site, a permissive CSP on the status page, missing rate limiting on a login endpoint, tenant enumeration via differential error messages, and a WordPress origin URL disclosure that bypasses the BunnyCDN static architecture. I am happy to share the complete report if there is interest.

I was not able to find a bug bounty policy or program on your website. If one exists, I would appreciate being pointed in the right direction. If not, I welcome a discussion about a reward, particularly given the severity and active exploitation status of finding 1 and the infrastructure access implications of finding 4. I am happy to coordinate disclosure timelines and help verify any fixes.

Let me know if you'd like any additional details or clarification from my side, I'm open to any and all questions.

Kind regards,

Sjoerd
