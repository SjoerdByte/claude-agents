Subject: Responsible Disclosure: High and Medium vulnerabilities on wert.io

Dear Wert Security Team,

I ran a short responsible-disclosure review across wert.io and its subdomains and found three issues worth sharing: one High-severity subdomain takeover condition on otc.wert.io and two Medium-severity information-disclosure issues on the partner API and the card-registrator pods. All testing was read-only, performed from synthetic data only, used only bogus credentials (for example X-Api-Key: aaaa... and a Visa test PAN 4111 1111 1111 1111 against card-registration schema checks), and avoided any flow that would have delivered a real SMS, email, or KYC document. No real customer records were accessed, modified, or stored. The subdomain-takeover finding is proof-of-condition only: I did not create any AWS hosted zone or complete the reclaim.

Dangling AWS Route53 NS delegation on otc.wert.io and demo.otc.wert.io (High, CVSS 8.0)

Endpoints: otc.wert.io, demo.otc.wert.io

The authoritative parent zone wert.io is on Cloudflare (hayes.ns.cloudflare.com, zariyah.ns.cloudflare.com) and delegates otc.wert.io to four AWS Route53 nameservers: ns-846.awsdns-41.net (205.251.195.78), ns-1370.awsdns-43.org (205.251.197.90), ns-1621.awsdns-10.co.uk (205.251.198.85), and ns-468.awsdns-58.com (205.251.193.212). All four answer REFUSED for otc.wert.io. REFUSED from a Route53 nameserver for a delegated name means the hosted zone was deleted on the AWS side while the parent NS records were left in place. This is the classic Route53 hosted-zone-reclaim condition: an attacker creates a hosted zone named otc.wert.io in their own AWS account and keeps re-creating it until AWS assigns the same four-NS set, after which they are authoritative for otc.wert.io and every name under it including demo.otc.wert.io. demo.otc.wert.io inherits the same broken delegation. CT logs show *.otc.wert.io and *.demo.otc.wert.io certificates were previously issued, so these names were in production use for the OTC trading flow.

Reproduction:
Step 1, confirm parent NS set is Cloudflare:
curl -sS 'https://dns.google/resolve?name=wert.io&type=NS'
Response: {"Status":0,"Answer":[{"name":"wert.io.","type":2,"data":"hayes.ns.cloudflare.com."},{"name":"wert.io.","type":2,"data":"zariyah.ns.cloudflare.com."}]}

Step 2, confirm the delegation is lame:
curl -sS 'https://dns.google/resolve?name=otc.wert.io&type=NS'
Response: {"Status":2,"Comment":"Name servers refused query (lame delegation?) [205.251.197.90, 205.251.195.78, 205.251.193.212, 205.251.198.85].","extended_dns_errors":[{"info_code":23,"extra_text":"[205.251.197.90] rcode=REFUSED for otc.wert.io/ns"},{"info_code":23,"extra_text":"[205.251.195.78] rcode=REFUSED for otc.wert.io/ns"},{"info_code":23,"extra_text":"[205.251.193.212] rcode=REFUSED for otc.wert.io/ns"},{"info_code":23,"extra_text":"[205.251.198.85] rcode=REFUSED for otc.wert.io/ns"},{"info_code":22,"extra_text":"At delegation otc.wert.io for otc.wert.io/ns"}]}

Step 3, cross-check with a second resolver:
curl -sS -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=otc.wert.io&type=NS'
Response: {"Status":2,"Comment":["EDE(22): No Reachable Authority at delegation otc.wert.io.","EDE(23): Network Error ... returned REFUSED for otc.wert.io NS"]}

Step 4, confirm the inherited child:
curl -sS 'https://dns.google/resolve?name=demo.otc.wert.io&type=A'
Returns the same Status 2 with EDE(22) at delegation otc.wert.io.

Impact: Once the hosted zone is reclaimed, the attacker can obtain a browser-trusted DV TLS certificate via Let's Encrypt (DNS-01 or HTTP-01) and serve arbitrary HTTPS content under https://otc.wert.io/ and https://demo.otc.wert.io/. For a crypto/payments brand this enables a pixel-perfect clone of the OTC trading interface capturing wallet addresses, trade orders, API keys, KYC uploads, and OTP codes from any user following a wert.io-branded link. It also satisfies any origin or wildcard trust check an in-production widget, partner iframe, or postMessage listener performs against *.wert.io. Technique is well established in prior disclosures (Netflix, Starbucks, Shopify, and many others).

Recommended fix: in the Cloudflare zone for wert.io, delete every NS record on otc.wert.io and any explicit child delegation such as demo.otc.wert.io. If OTC functionality is still planned, create the Route53 hosted zone first, read the assigned NS set, and only then publish the matching delegation. Add a tear-down rule to the DNS runbook: always remove the parent NS records before deleting the hosted zone. While you are in the zone, it is worth sweeping the rest of wert.io for other dangling delegations or dangling CNAMEs to decommissioned S3, CloudFront, Heroku, Vercel, or GitHub Pages origins. cards-api-green.wert.io is currently NXDOMAIN per recon and is worth reviewing.

Verification after remediation: curl -sS 'https://dns.google/resolve?name=otc.wert.io&type=NS' should return Status 3 (NXDOMAIN) once the NS records are removed, and the extended_dns_errors array should disappear.

References: CWE-16 (Configuration), OWASP A05:2021 Security Misconfiguration, dangling-DNS pattern tracked at https://github.com/EdOverflow/can-i-take-over-xyz under "AWS/Route 53".

Pre-authentication operation enumeration oracle on partner.wert.io (Medium, CVSS 5.3)

Endpoint: https://partner.wert.io/api/external/*

The external partner API returns three distinct error strings depending on whether the path exists, whether the HTTP verb is correct, and whether the X-Api-Key is valid, which lets an unauthenticated caller fully enumerate the operation surface without ever presenting a credential. Identical behaviour reproduces on partner-sandbox.wert.io and partner-green.wert.io.

Reproduction:
Step 1, path exists, bad key:
curl -i -H 'X-Api-Key: aaaaaaaaaaaaaaaa' https://partner.wert.io/api/external/orders
HTTP/2 401
content-type: application/json; charset=utf-8
{"error":"ERR_UNAUTHORIZED","success":false}

Step 2, path exists, wrong verb, bad key:
curl -i -X POST -H 'X-Api-Key: aaaaaaaaaaaaaaaa' https://partner.wert.io/api/external/orders
HTTP/2 400
content-type: application/json; charset=utf-8
{"error":"method not allowed"}

Step 3, path does not exist, bad key:
curl -i -H 'X-Api-Key: aaaaaaaaaaaaaaaa' https://partner.wert.io/api/external/webhooks
HTTP/2 404
content-type: application/json; charset=utf-8
{"error":"no matching operation was found"}

Step 4, no key at all:
curl -i https://partner.wert.io/api/external/anything
HTTP/2 400
{"msg":"Header parameter X-Api-Key is required, but not found"}

Full operation surface derived from the oracle on the three hosts:
GET  /api/external/orders         (exists, requires auth)
GET  /api/external/users          (exists, requires auth)
POST /api/external/users/create   (exists, requires auth)

Every other candidate path I probed (webhooks, payouts, partners, tokens, accounts, balances, transactions, reports, settings, keys, me, kyc, limits, invoices, payment-methods, cards, notifications, subscribers, logs, user, order, wallet, wallets, addresses, payments, sessions, cardholders, openapi.json, swagger.json, swagger-ui, docs, health, metrics, version) returns the 404 no-matching-operation string, so they do not exist on this surface today. The value of the oracle is that it will continue to leak any new operation Wert ships, and it lowers the cost of future endpoint discovery and credential-stuffing significantly.

Impact: pre-auth enumeration of the full partner-API operation matrix (verbs and paths) with no credential. Alone this is Medium information disclosure. Combined with any future authentication or validation bug on one of those operations it becomes a direct enabler.

Recommended fix: normalise all pre-auth responses to a single opaque status (ideally HTTP 401 with a fixed body such as {"error":"ERR_UNAUTHORIZED"}) for unknown paths, unsupported verbs, missing keys, and invalid keys alike. Alternatively, move the X-Api-Key validation in front of the go-openapi router so no path or method matching happens until a valid key is presented, and keep the detailed no-matching-operation and method-not-allowed strings behind the auth boundary for authenticated partners.

Verification after remediation: all four reproduction curls above should return the same status and body as the valid-path-bad-key case (ideally HTTP 401 {"error":"ERR_UNAUTHORIZED"}). Confirming step 3 returns 401 instead of 404 is the single-line check.

References: CWE-204 (Observable Response Discrepancy), CWE-209 (Information Exposure Through an Error Message), OWASP A05:2021 Security Misconfiguration.

Public Prometheus /metrics on cards-api.wert.io and cards-api-2.wert.io (Medium, CVSS 5.3)

Endpoints: https://cards-api.wert.io/metrics, https://cards-api-2.wert.io/metrics

The Prometheus scrape endpoint on the two card-registrator pods is served to any anonymous Internet caller. The dump exposes the private kubernetes pod IPs and backend plaintext port (10.20.129.110:8080 and 10.20.129.223:8080), the backend service name (cards_registrator), the Go runtime version (go1.27.1), and per-URL request/response histograms that can be used to baseline production traffic. The sister host cards.wert.io correctly returns HTTP 403 on the same path, which shows the ingress rule is already written in your estate and is simply missing on the two API hosts.

Reproduction:
Step 1:
curl -sS https://cards-api.wert.io/metrics
Returns HTTP 200 text/plain, body includes:
cards_registrator_request_duration_seconds_bucket{code="200",host="10.20.129.110:8080",method="GET",url="/health",le="0.005"} 1586
cards_registrator_requests_total{code="200",host="cards-api.wert.io",method="GET",url="/metrics"} 1585
go_info{version="go1.27.1"} 1
process_start_time_seconds 1.79198960563e+09

Step 2:
curl -sS https://cards-api-2.wert.io/metrics
Returns HTTP 200, dumps the second pod with host="10.20.129.223:8080".

Step 3, fix-baseline on the sister host:
curl -sS -o /dev/null -w '%{http_code}\n' https://cards.wert.io/metrics
Returns 403.

X-Forwarded-For: 127.0.0.1 and X-Real-IP: 10.0.0.1 do not alter the response on any of the three hosts, so the current behaviour is not header-gated. No /debug/pprof, /debug/vars, /actuator, /env, /config, /loggers, /heapdump, /threaddump, or /trace is reachable alongside /metrics.

Impact: unauthenticated information disclosure. The payload does not currently contain credentials, user PII, DB URLs, or secret material, so this is a hardening gap rather than a direct data breach, but it is a reconnaissance primitive that lowers the cost of any future SSRF, bastion-pivot, or lateral-movement finding against the same cluster and gives traffic-volume side channels against the production card-registration flow.

Recommended fix: serve /metrics only to the Prometheus scraper. Bind the metrics handler on a port that is not published through the public ingress (for example --metrics-addr=:9090 on an in-cluster-only Service), or if the handler must stay on the same listener, gate it with the same bearer token Prometheus already supports or an IP allow-list of the Prometheus pod's service IP. Copy the ingress rule that correctly 403s https://cards.wert.io/metrics onto cards-api.wert.io and cards-api-2.wert.io. Separately, drop the host label from the cards_registrator_* histograms so pod IPs never land in a counter even if the endpoint is accidentally re-exposed later.

Verification after remediation:
curl -sS -o /dev/null -w '%{http_code}\n' https://cards-api.wert.io/metrics
curl -sS -o /dev/null -w '%{http_code}\n' https://cards-api-2.wert.io/metrics
Both should return 403 (or 401 if token-gated), matching the current cards.wert.io baseline.

References: CWE-200 (Exposure of Sensitive Information), CWE-497 (Exposure of Sensitive System Information), OWASP A05:2021 Security Misconfiguration.

Additional findings

A handful of lower-impact architectural notes came out of the sweep that did not meet the bar for a standalone finding but are worth sharing if useful: public source maps on cards.wert.io and the cards-reg-iframe-{sandbox,green} hosts (full SPA source retrievable), a static ACAO:* with Access-Control-Allow-Credentials:true combination across widget / partner / cards / sandbox / issuing (invalid in browsers, so not exploitable, but it masks a real bypass if any endpoint ever switches to Origin reflection), an onboarding.wert.io TLS certificate expired 2025-02-04 still served by Tally for the custom-domain binding, a VITE build-env block in widget-green.wert.io and sandbox.wert.io bundles that discloses internal infrastructure on the separate sha2.me registrable domain (sentry.k8s.sha2.me, website.development.sha2.me, partner-dashboard.development.sha2.me), and no /.well-known/security.txt on any first-party wert.io host. I am happy to share the complete report if there is interest.

Plausible but not fully verified

No findings from this engagement fell in the plausible-but-unverified bucket. Several test paths (per-ID IDOR on widget.wert.io /v1/api/v3/*, sandbox-to-prod session bleed, partner-webhook URL SSRF via POST /api/webhooks, and the full *.prod.wert.io admin ingress for grafana, dex, kubeconfig, prometheus, dashboard, upmeter) remained unexercised because they require either a Wert-provisioned partner-dashboard account (not self-service), a real SMS OTP (declined under the no-real-user-data rule), or a non-proxied egress IP to clear mTLS/source-IP gatekeeping on the AWS ELB in eu-central-1. Any of grafana.prod, dex.prod, kubeconfig.prod would be a straight P1 if reachable to the open Internet; happy to retest once a direct-egress check or a sandbox partner key is available.

Disclosure and follow-up

I would like to coordinate a standard 90-day disclosure window for the High-severity Route53 finding and would appreciate confirmation when each fix lands so I can re-run the single-line verification commands above against the public endpoints. If a bug bounty policy or program exists I would be glad to hear about it; if not, I am happy to discuss a reward and will of course coordinate timelines with you. For the subdomain-takeover finding specifically, severity typically warrants consideration at the higher end of what a program offers given the brand and OTC-flow exposure, but I will defer to whatever is appropriate for Wert.

Let me know if you'd like any additional details or clarification from my side, I'm open to any and all questions.

Kind regards,

Sjoerd
