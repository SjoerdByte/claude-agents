Subject: Responsible Disclosure: High vulnerabilities on wert.io

Dear Wert Security Team,

I ran a responsible-disclosure review across wert.io and its subdomains and found three vulnerabilities worth sharing, one High-severity subdomain takeover condition on otc.wert.io and two Medium-severity information-disclosure issues on the partner API and the card-registrator pods. All testing was read-only and performed from synthetic data only, no real customer records were accessed, modified or stored, no real SMS, email or KYC document was sent, and the subdomain-takeover finding is proof-of-condition only, no AWS hosted zone was created or reclaimed.

Dangling AWS Route53 NS delegation on otc.wert.io and demo.otc.wert.io enables subdomain takeover (High, CVSS 8.0)

Endpoints: otc.wert.io, demo.otc.wert.io

The authoritative parent zone wert.io is on Cloudflare (hayes.ns.cloudflare.com, zariyah.ns.cloudflare.com) and delegates otc.wert.io to four AWS Route53 nameservers: ns-846.awsdns-41.net (205.251.195.78), ns-1370.awsdns-43.org (205.251.197.90), ns-1621.awsdns-10.co.uk (205.251.198.85), and ns-468.awsdns-58.com (205.251.193.212). All four answer REFUSED for otc.wert.io. REFUSED from a Route53 nameserver for a delegated name means the hosted zone was deleted on the AWS side while the parent NS records were left in place. This is the classic Route53 hosted-zone-reclaim condition, an attacker creates a hosted zone named otc.wert.io in their own AWS account and keeps re-creating it until AWS assigns the same four-NS set, after which they are authoritative for otc.wert.io and every name under it including demo.otc.wert.io. CT logs show *.otc.wert.io and *.demo.otc.wert.io certificates were previously issued, so these names were in production use for the OTC trading flow.

Reproduction:
Step 1, confirm the parent NS set is Cloudflare:
  curl -sS 'https://dns.google/resolve?name=wert.io&type=NS'
  Response: Status 0 with Answer containing hayes.ns.cloudflare.com and zariyah.ns.cloudflare.com.

Step 2, confirm the delegation is lame:
  curl -sS 'https://dns.google/resolve?name=otc.wert.io&type=NS'
  Response: Status 2 with Comment "Name servers refused query (lame delegation?) [205.251.197.90, 205.251.195.78, 205.251.193.212, 205.251.198.85]", extended_dns_errors containing EDE 23 REFUSED from each of the four IPs and EDE 22 "At delegation otc.wert.io for otc.wert.io/ns".

Step 3, cross-check with a second resolver:
  curl -sS -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=otc.wert.io&type=NS'
  Response: Status 2 with Comment ["EDE(22): No Reachable Authority at delegation otc.wert.io.", "EDE(23): Network Error ... returned REFUSED for otc.wert.io NS"].

Step 4, confirm the inherited child:
  curl -sS 'https://dns.google/resolve?name=demo.otc.wert.io&type=A'
  Returns Status 2 with EDE 22 at delegation otc.wert.io.

Impact: Once the hosted zone is reclaimed, the attacker obtains a browser-trusted DV TLS certificate via Let's Encrypt (DNS-01 or HTTP-01) and serves arbitrary HTTPS content under https://otc.wert.io/ and https://demo.otc.wert.io/. For a crypto and payments brand this enables a pixel-perfect clone of the OTC trading interface capturing wallet addresses, trade orders, API keys, KYC uploads and OTP codes from any user following a wert.io-branded link, and it satisfies any origin or wildcard trust check that an in-production widget, partner iframe or postMessage listener performs against *.wert.io. The technique is well-established in prior disclosures (Netflix, Starbucks, Shopify and many others).

Recommended fix: In the Cloudflare zone for wert.io, delete every NS record on otc.wert.io and any explicit child delegation such as demo.otc.wert.io. If OTC functionality is still planned, create the Route53 hosted zone first, read the assigned NS set, and only then publish the matching delegation. Add a tear-down rule to the DNS runbook, always remove the parent NS records before deleting the hosted zone. While you are in the zone, it is worth sweeping the rest of wert.io for other dangling delegations or dangling CNAMEs to decommissioned S3, CloudFront, Heroku, Vercel or GitHub Pages origins. cards-api-green.wert.io is currently NXDOMAIN per my passive sweep and is worth reviewing in the same pass. Verification: curl -sS 'https://dns.google/resolve?name=otc.wert.io&type=NS' should return Status 3 (NXDOMAIN) once the NS records are removed, and the extended_dns_errors array should disappear.

Pre-authentication operation enumeration oracle on partner.wert.io (Medium, CVSS 5.3)

Endpoint: https://partner.wert.io/api/external/*

The external partner API returns four distinct error strings depending on whether the path exists, whether the HTTP verb is correct, and whether the X-Api-Key header is present and valid, which lets any unauthenticated caller fully enumerate the operation surface without ever presenting a credential. The oracle reproduces identically on partner-sandbox.wert.io and partner-green.wert.io. The full operation surface derivable from the oracle today is GET /api/external/orders, GET /api/external/users and POST /api/external/users/create; every other path probed (webhooks, payouts, partners, tokens, accounts, balances, transactions, reports, settings, keys, me, kyc, limits, invoices, payment-methods, cards, notifications, subscribers, logs, user, order, wallet, wallets, addresses, payments, sessions, cardholders, openapi.json, swagger.json, swagger-ui, docs, health, metrics, version) returned the no-matching-operation string. The lasting value of the oracle is that it continues to leak any new operation Wert ships, so it compounds over time and lowers the cost of future endpoint discovery and credential-stuffing against newly-added partner operations significantly.

Reproduction:
Step 1, path exists, bad key:
  curl -i -H 'X-Api-Key: aaaaaaaaaaaaaaaa' https://partner.wert.io/api/external/orders
  HTTP/2 401, body {"error":"ERR_UNAUTHORIZED","success":false}

Step 2, path exists, wrong verb, bad key:
  curl -i -X POST -H 'X-Api-Key: aaaaaaaaaaaaaaaa' https://partner.wert.io/api/external/orders
  HTTP/2 400, body {"error":"method not allowed"}

Step 3, path does not exist, bad key:
  curl -i -H 'X-Api-Key: aaaaaaaaaaaaaaaa' https://partner.wert.io/api/external/webhooks
  HTTP/2 404, body {"error":"no matching operation was found"}

Step 4, no key at all:
  curl -i https://partner.wert.io/api/external/anything
  HTTP/2 400, body {"msg":"Header parameter X-Api-Key is required, but not found"}

Recommended fix: Normalise all pre-auth responses to a single opaque status, ideally HTTP 401 with a fixed body such as {"error":"ERR_UNAUTHORIZED"}, for unknown paths, unsupported verbs, missing keys and invalid keys alike. Alternatively, move the X-Api-Key validation in front of the go-openapi router so no path or method matching happens until a valid key is presented, and keep the detailed no-matching-operation and method-not-allowed strings behind the auth boundary for authenticated partners only. Verification is a single line, step 3 above should return 401 {"error":"ERR_UNAUTHORIZED"} once the fix is in place.

Public Prometheus /metrics on cards-api.wert.io and cards-api-2.wert.io (Medium, CVSS 5.3)

Endpoints: https://cards-api.wert.io/metrics, https://cards-api-2.wert.io/metrics

The Prometheus scrape endpoint on the two card-registrator pods is served to any anonymous Internet caller. The dump exposes the private Kubernetes pod IPs and backend plaintext port (10.20.129.110:8080 and 10.20.129.223:8080), the backend service name (cards_registrator), the Go runtime version (go1.27.1) and per-URL request and response histograms that can be used to baseline production traffic. The sister host cards.wert.io correctly returns HTTP 403 on the same path, which shows the ingress rule is already written in your estate and is simply missing on the two API hosts. X-Forwarded-For 127.0.0.1 and X-Real-IP 10.0.0.1 do not change the response on any of the three hosts, so the current behaviour is not header-gated. No /debug/pprof, /debug/vars, /actuator, /env, /config, /loggers, /heapdump, /threaddump or /trace is reachable alongside /metrics.

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

Step 3, fix baseline on the sister host:
  curl -sS -o /dev/null -w '%{http_code}\n' https://cards.wert.io/metrics
  Returns 403.

Recommended fix: Serve /metrics only to the Prometheus scraper. Bind the metrics handler on a port that is not published through the public ingress (for example --metrics-addr=:9090 on an in-cluster-only Service), or if the handler must stay on the same listener, gate it with the bearer token Prometheus already supports or an IP allow-list of the Prometheus pod's service IP. Copy the ingress rule that correctly 403s https://cards.wert.io/metrics onto cards-api.wert.io and cards-api-2.wert.io. Separately, drop the host label from the cards_registrator_* histograms so pod IPs never land in a counter even if the endpoint is accidentally re-exposed later. Verification: curl -sS -o /dev/null -w '%{http_code}\n' against both API hosts should return 403 or 401, matching the current cards.wert.io baseline.

Additional findings

Beyond the three above, I also noted public source maps on cards.wert.io and the cards-reg-iframe-{sandbox,green} hosts (full SPA source retrievable including the card-registrator views), a static ACAO:* with Access-Control-Allow-Credentials:true combination across widget, partner, cards, sandbox and issuing (invalid in browsers so not exploitable today, but it masks a real bypass if any endpoint ever switches to Origin reflection), an onboarding.wert.io TLS certificate expired 2025-02-04 still served by Tally for the custom-domain binding, a VITE build-env block in widget-green.wert.io and sandbox.wert.io bundles that discloses internal infrastructure on the separate sha2.me registrable domain (sentry.k8s.sha2.me, website.development.sha2.me, partner-dashboard.development.sha2.me), and no /.well-known/security.txt on any first-party wert.io host. I am happy to share the complete report if there is interest.

Bounty and recognition

Is there a bug bounty policy or program in place for wert.io? If one exists I would be glad to hear about it, if not, I am happy to discuss a reward and will of course coordinate disclosure timelines and help verify fixes with you. For finding 1 specifically, findings of this severity typically warrant consideration at the higher end of what a program offers given the brand and OTC-flow exposure, but I will defer to whatever is appropriate for Wert.

Let me know if you'd like any additional details or clarification from my side, I'm open to any and all questions.

Kind regards,

Sjoerd
