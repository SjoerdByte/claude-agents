# Wert.io engagement - executive summary

Scope: wert.io and all subdomains (payments / crypto platform). First-party vendor-hosted infrastructure counts as in-scope (CloudFront, S3 buckets holding Wert data, AWS ELB in eu-central-1, GitHub Pages for javascript.wert.io, Tally.so for onboarding.wert.io, Render for docs.wert.io, Intercom for support.wert.io).

Authorization: written permission from Wert CEO George Basiladze. All testing was read-only and non-destructive. No real customer data, PII, PAN, email or phone number was used; only synthetic test values (for example X-Api-Key: aaaaa..., Visa test PAN 4111 1111 1111 1111). No real SMS, email or KYC document was sent. The subdomain-takeover finding is proof-of-condition only; no AWS hosted zone was created.

Methodology: four phases.
1. Recon: passive DNS + CT log inventory, HTTPS fingerprint sweep, JS/source-map harvest, endpoint discovery via SPA bundle extraction, OpenAPI/GraphQL probes.
2. Exploit: per-thread hypothesis-driven testing against 12 target threads (T1 takeover, T2 partner-api, T3 widget-session, T4 sandbox-prod bleed, T5 cards tokeniser, T6 issuing admin, T7 prod admin ingress, T8 metrics/health, T9 CORS/webhook/SSRF, T10 stale CF/S3, T11 OpenAPI matrix, T12 catch-all secrets). Pacing kept to roughly one request per second per host.
3. Adversarial verification: every candidate finding was re-exercised from a cold cache under a three-lens majority-rule check (confirm / refute / plausible), then promoted only if at least two of three lenses returned confirm.
4. Report: this document plus the attached disclosure email.

Headline numbers (confirmed): 0 Critical, 1 High, 2 Medium, 0 Low. Plausible-but-unverified: 0. Refuted: large block of ruled-out hypotheses captured in index.json (see methodology notes).

Top 3 risks:
1. otc.wert.io / demo.otc.wert.io subdomain takeover via dangling AWS Route53 NS delegation (High, CVSS 8.0). An attacker who completes the Route53 hosted-zone reclaim obtains full authoritative DNS over otc.wert.io, issues a browser-trusted TLS certificate, and serves pixel-perfect OTC-trading phishing clones under a legitimate wert.io hostname.
2. partner.wert.io /api/external/* three-state error oracle (Medium, CVSS 5.3). Unauthenticated enumeration of the complete partner-API operation matrix lowers the cost of future credential-stuffing and endpoint discovery across partner.wert.io, partner-sandbox.wert.io and partner-green.wert.io.
3. Public Prometheus /metrics on cards-api.wert.io and cards-api-2.wert.io (Medium, CVSS 5.3). Leaks internal pod IPs (10.20.129.0/24), backend plaintext port, service name and Go runtime; a reconnaissance primitive that amplifies any future SSRF or lateral-movement finding.

Aggregate recommendation: fix the Route53 delegation this week (one-line DNS edit in Cloudflare), uniform-401 the partner-API router (one middleware swap in go-openapi), and mirror the already-correct cards.wert.io ingress rule onto cards-api and cards-api-2. All three are low-effort, high-return fixes. The deeper structural pattern worth addressing is the ACAO:* with Access-Control-Allow-Credentials:true combination deployed across widget / partner / cards / sandbox / issuing: invalid in browsers today and so not directly exploitable, but it masks a real bypass the moment any endpoint switches to Origin reflection; worth tightening while the router is open.

Environment caveats:
- Outbound HTTPS from this environment traversed the Anthropic agent proxy. mTLS-protected admin hosts on the AWS ELB in eu-central-1 (*.prod.wert.io for grafana, dex, kubeconfig, dashboard, prometheus, upmeter, status, documentation, api) reset TLS during handshake. We could not distinguish origin mTLS, source-IP allowlist, or proxy-upstream filtering as the cause. If any of these are reachable from the open Internet, grafana/dex/kubeconfig would be P1; recommend a direct-egress re-check.
- Outbound UDP:53 was intercepted in the environment, so all DNS evidence for the Route53 finding was collected over DNS-over-HTTPS and cross-validated with two independent resolvers (Google 8.8.8.8 and Cloudflare 1.1.1.1). Both returned Extended DNS Error 22 (lame delegation at otc.wert.io) and EDE 23 (REFUSED from the exact four Route53 IPs).
- Partner-authenticated endpoints (/api/webhooks, /api/webhooks/test, authenticated per-ID IDOR on /api/external/*) could not be exercised because partner onboarding is manual (Tally form, Wert-staff provisioning); no self-service signup exists.
- Session-mint on widget.wert.io/v1/api/v3/* and sandbox.wert.io/api/v3/* requires either a real SMS OTP (declined under the no-real-user-data hard rule) or a partner-signed widget init token (not available in this session). The per-ID IDOR surface remains structurally untested; happy to retest if a sandbox partner key or a controlled test phone is provided.
- WebSearch tool refused the Google-dork credential-hunting queries (environment limitation); indexed-secret enumeration via google.com cannot be done from this harness.

Time budget used: approximately 5.3 hours.
