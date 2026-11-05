Subject: Responsible Disclosure: Medium-severity vulnerabilities on amenitiz.io

Dear Amenitiz Security Team,

During independent security research I identified three vulnerabilities across amenitiz.io infrastructure and the PMS application at app.amenitiz.io. Testing was performed exclusively with self-created test accounts. No real customer data was accessed, modified, or stored. Two test accounts and two test properties were created during the assessment; details for cleanup follow near the end.


Dangling CNAME records on get.amenitiz.io and bookingsuite.amenitiz.io creating subdomain takeover risk (Medium, CVSS 6.1)

Endpoints:
get.amenitiz.io (CNAME to unbouncepages.com)
bookingsuite.amenitiz.io (CNAME to hosted.pageserve.co)

Two subdomains have DNS CNAME records pointing to third-party landing page services (Unbounce and PageServe) where the corresponding accounts appear to be deactivated or removed. Cloudflare currently returns error 1014 "CNAME Cross-User Banned" which prevents exploitation, but the underlying misconfiguration remains. If the Cloudflare configuration changes or the CNAME resolution path shifts, an attacker who registers the subdomain on the respective landing page service could serve arbitrary content under a trusted amenitiz.io domain. This would enable phishing attacks against Amenitiz users and allow setting cookies scoped to .amenitiz.io, potentially interfering with session management on the main application.

Reproduction:

$ dig get.amenitiz.io CNAME +short
get.amenitiz.io.herokudns.com.

$ curl -sI https://get.amenitiz.io
HTTP/2 403
server: cloudflare
(Body contains "Error 1014 - CNAME Cross-User Banned")

$ dig bookingsuite.amenitiz.io CNAME +short
bookingsuite.amenitiz.io.herokudns.com.

$ curl -sI https://bookingsuite.amenitiz.io
HTTP/2 403
server: cloudflare
(Body contains "Error 1014 - CNAME Cross-User Banned")

Recommended fix: Remove both dangling CNAME records from DNS entirely, or reclaim the subdomains on the respective landing page services.


Account creation without email verification on app.amenitiz.io (Low, CVSS 5.3)

Endpoint: POST https://app.amenitiz.io/users

The PMS signup flow at app.amenitiz.io/en/signup allows creating fully functional accounts using any email address without completing email verification. Upon registration the account is immediately active with full dashboard access, including room creation, booking management, and channel manager setup. The signup also accepts weak passwords, including passwords identical to the email address itself. While reCAPTCHA v3 is present, it is invisible and score-based, passing automatically for normal browser behavior.

This enables mass account creation for platform abuse such as spam listings or fake hotels, impersonation of arbitrary email addresses on the platform, and lowers the barrier to exploitation if a cross-tenant vulnerability were to be discovered in the future.

Reproduction:

Step 1. Navigate to https://app.amenitiz.io/en/signup
Step 2. Enter any email address (no mailbox access needed), a name, and a password
Step 3. The reCAPTCHA v3 challenge passes automatically
Step 4. Submit the form
Step 5. The account is immediately active with full dashboard access at the chosen subdomain

The server responds with HTTP 302 redirect to /en/admin/dashboard, establishing the session immediately with no verification step.

Recommended fix: Require email verification before granting dashboard access. After form submission, display a "verify your email" page and send a confirmation link. Only activate the account after the link is clicked. Additionally, enforce password complexity requirements that reject passwords matching the email address.


Internal network topology disclosure via public DNS on mcp-cell.amenitiz.io (Low, CVSS 5.3)

Endpoint: mcp-cell.amenitiz.io (public DNS A/CNAME records)

The public DNS records for mcp-cell.amenitiz.io disclose internal AWS infrastructure details. The CNAME resolves to an internal AWS ELB hostname, and the A records return RFC 1918 private IP addresses (10.91.10.9 and 10.91.58.106), revealing that the infrastructure runs in the eu-west-3 AWS region. While this is informational in nature, it provides an attacker with internal network topology information that could assist in further reconnaissance or targeted attacks against the internal infrastructure.

Reproduction:

$ dig mcp-cell.amenitiz.io A +short
10.91.10.9
10.91.58.106

$ dig mcp-cell.amenitiz.io CNAME +short
(returns internal AWS ELB hostname in eu-west-3)

Recommended fix: Remove the public DNS records for mcp-cell.amenitiz.io if external resolution is not required, or replace them with public-facing IP addresses. Internal hostnames and RFC 1918 addresses should not be exposed in public DNS.


Test artifacts to clean up

Two test accounts and associated properties were created during this assessment:

1. Email: peter.bjorn75@gmail.com, property subdomain: houseinstra.amenitiz.io (property_id 47559)
2. Email: peter.bjorn75+3@gmail.com, property subdomain: houseinstra-2.amenitiz.io (property_id 48120)

Both accounts and their associated properties can be safely deleted.


I was unable to find a bug bounty policy or program on amenitiz.io or amenitiz.com. If one exists, I would be happy to submit through the proper channel. If not, I welcome a discussion about a reward. I am happy to coordinate disclosure timelines and help verify the fixes once they are in place.

Let me know if you'd like any additional details or clarification from my side, I'm open to any and all questions.

Kind regards,

Sjoerd
