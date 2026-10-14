To: sam.brown@wildz.group, Kimmo.Mustonen@wildz.group, Giacomo.Bulian@wildz.group, Haydn.du.Plessis@wildz.group
Subject: Security Assessment Results - rootz.com / wheelz.com - 4 Critical and High Findings Requiring Immediate Attention

Sam, Kimmo, Giacomo, Haydn,

Below are the results of the security assessment performed on October 14, 2026 against rootz.com, wheelz.com, and all subdomains, as authorized by Sam.

We identified 12 vulnerabilities in total. This email covers the 4 findings rated Critical or High that require immediate attention. We also identified 8 additional findings rated Medium or Low, covering CORS misconfigurations, missing security headers, rate limiting gaps, tenant enumeration, and a WordPress origin URL disclosure. The full report with all 12 findings, evidence, and remediation guidance has been provided separately.


FINDING 1 - CRITICAL (CVSS 9.1): Subdomain Takeover on e2e.infra.rootz.com - ACTIVELY EXPLOITED

The S3 bucket backing e2e.infra.rootz.com has been taken over by a third party and is currently serving an Indonesian gambling/slot website. The DNS record still points to the S3 website endpoint, but the original bucket was deleted or its ownership transferred, allowing an attacker to claim the bucket name and serve arbitrary content under the rootz.com domain.

This has been live since at least February 12, 2026. The attacker-controlled content includes Google Tag Manager tracking, Bing pixels, and embedded user identifiers. Because the content is served from a rootz.com subdomain, the attacker can set or read cookies scoped to .rootz.com, enabling session hijacking or phishing attacks against your users and staff. If any Content Security Policy on your products allows *.rootz.com or *.infra.rootz.com, this domain becomes an injection vector.

Recommended immediate action: Remove the DNS record pointing e2e.infra.rootz.com to the S3 endpoint, or reclaim the S3 bucket. This should be treated as an active incident.


FINDING 2 - HIGH (CVSS 7.5): Unauthenticated Prometheus Metrics on 7 Servers Including Payment Service

Seven game integration and payment servers expose their Prometheus /metrics endpoint without authentication:

- pragmatic-server.lab1.rootz.com/metrics
- hacksaw-server.lab1.rootz.com/metrics
- yggdrasil-server.lab1.rootz.com/metrics
- quickspin-server.lab1.rootz.com/metrics
- oryx-server.lab1.rootz.com/metrics
- push-server.lab1.rootz.com/metrics
- brite-server.lab1.rootz.com/metrics (payment service)

These endpoints return detailed operational telemetry including internal Kubernetes service URLs (backendapi.rootz-platform:7777), API route patterns for player authentication and wallet operations, database architecture details (read/write split, max 50 connections), financial operation counters (deposit, withdraw, rollback calls), and exact service versions. An attacker can use this information to map your internal microservice architecture and target specific services with version-specific exploits.

Recommended action: Add authentication to all /metrics endpoints and restrict access via Kubernetes NetworkPolicy or Ingress rules to the Prometheus scraper only.


FINDING 3 - HIGH (CVSS 7.5): Public S3 Bucket with Full Listing and Read Access on assets.rootz.com

The S3 bucket assets.rootz.com has public listing enabled (ListBucket) and all objects are publicly readable (GetObject). The bucket contains assets for 10+ casino brands (wheelz.com, wildz.com, caxino.com, spinz.com, chipz.com, and others). A single GET request returns over 307KB of XML listing with 1000+ objects, and all files can be downloaded without authentication.

Among the exposed files is the Apple Pay merchant certificate for caxino.com, containing Team ID SL88LHPJ78, which could be used for targeted payment-related attacks.

Recommended action: Disable public ListBucket permission on the S3 bucket. Review and restrict GetObject permissions to only files that need to be public. Consider using CloudFront with Origin Access Control instead of direct public S3 access.


FINDING 4 - HIGH (CVSS 7.3): Exposed Dex OIDC Providers with Open Device Code Flow (2 Instances)

Two Dex OIDC identity providers used for Kubernetes cluster authentication are publicly accessible on raw AWS IPs without any WAF protection:

- dex.stg.rootz.com (108.133.177.4) with Google SSO connector
- dex.dev.rootz.com (18.202.129.211) with GitLab connector

Both instances expose full OIDC discovery metadata, JWKS signing keys, and accept unauthenticated requests to generate device authorization codes. The linked applications at login.stg.rootz.com and login.dev.rootz.com are Kubernetes token generators (dex-k8s-authenticator). An attacker can generate a device code, send the verification URL to a Rootz employee via a phishing email, and if the employee approves it through Google SSO or GitLab, the attacker receives tokens granting Kubernetes cluster access.

The device code flow requires no client secret. Both instances also have implicit grant type and plain PKCE enabled. The dev instance additionally discloses the GitLab OAuth client_id, which could be used in targeted OAuth attacks against your self-hosted GitLab.

Recommended action: Restrict access to these four endpoints to internal/VPN networks or place them behind Cloudflare. Disable the device_code and implicit grant types if not required. Require a client_secret for all OAuth flows.


We are available to discuss any of these findings, provide additional technical details, or assist with verification of remediation. The full report with all 12 findings, including the 8 Medium/Low findings, detailed evidence, and remediation steps is available upon request.

Regards,
Sjoerd Bakker
