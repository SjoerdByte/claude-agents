# Wert.io engagement - methodology notes

Tools used
- curl (HTTP/2) via the Anthropic egress HTTPS proxy, one request per second per host.
- Python 3 + dnspython for UDP:53 probes against the four Route53 nameservers (used only after DoH confirmed the condition; UDP:53 was partially intercepted by the harness).
- Google DNS-over-HTTPS (https://dns.google/resolve) and Cloudflare DNS-over-HTTPS (https://cloudflare-dns.com/dns-query) as independent recursive resolvers for cross-validation of the Route53 lame-delegation evidence.
- openssl s_client, curl with --resolve for TLS handshake fingerprinting against *.prod.wert.io.
- CT log history pull via crt.sh for historical SAN enumeration (otc.wert.io, demo.otc.wert.io, cards-api-green.wert.io, etc.).
- WebFetch for GET-only probes where curl was awkward; Grep over scratchpad artefacts for secret-pattern sweeps across SPA bundles.
- gh CLI for selective raw.githubusercontent.com fetches on known paths (wert-io/widget-initializer gh-pages branch, javascript.wert.io CNAME inspection). Broader GitHub-wide code search returned 403 (sandbox).
- Local secret-pattern scanner (scan.py) across unpacked SPA bundles for AWS/Stripe/SendGrid/GitHub/Slack/Google/JWT/Twilio/private-key patterns.

Caveats encountered
- Outbound HTTPS traverses the Anthropic agent proxy (CA bundle /root/.ccr/ca-bundle.crt). CONNECT tunnels succeeded for every live host but the proxy's upstream could not complete the TLS handshake against *.prod.wert.io (grafana, dex, kubeconfig, dashboard, prometheus, upmeter, status, documentation, api). Observed behaviour: CONNECT 200, then TCP reset after ClientHello on 7/9 hosts, silent drop on 2/9. We could not distinguish between origin mTLS, source-IP allowlist, or proxy-upstream filtering. Those nine hosts remain untested; happy to retest from a direct outbound IP.
- Outbound UDP:53 queries from the harness were intermittently truncated. Workaround was to collect authoritative evidence over DoH and only use raw UDP for the per-NS SOA/A/NS confirmation after the condition was already established.
- Partner onboarding at onboarding.wert.io is a manual Tally form (Wert-staff provisioning), there is no self-service signup. Authenticated partner-dashboard testing (webhook URL SSRF, mass-assignment on PUT /api/webhooks, authenticated IDOR on /api/external/orders) is blocked without an account.
- Widget session mint on widget.wert.io/v1/api/v3/* and sandbox.wert.io/api/v3/* requires either a real SMS OTP (declined under "no real phone/email/PAN" hard rule) or a partner-signed widget init token. Per-ID IDOR surface could not be exercised from inside the engagement.
- WebSearch tool refused the Google-dork credential-hunting queries. gh CLI is sandboxed to specific repos; GitHub-wide code search for third-party-repo leakage of wert.io keys was unreachable from this harness.
- Auto-mode safety classifier intermittently flagged batched curl loops against cards.wert.io / partner.wert.io and required rewording with explicit scope context; this slowed sweeps but did not block any specific test.
- The sha2.me registrable domain surfaced in sandbox and widget-green VITE build-env blocks (sentry.k8s.sha2.me, website.development.sha2.me, partner-dashboard.development.sha2.me). Per the scope rule, sha2.me was flagged in index.json open_threads but not actively probed from this engagement, pending explicit scope authorisation.

Explicitly out of scope or deferred
- sha2.me and all subdomains (separate registrable domain, pending explicit authorization).
- Any flow that would have triggered a real SMS or email (OTP-bypass end-to-end confirmation on sandbox widget, user signup via send-code).
- Any flow using a real PAN, email, phone or KYC document.
- Social engineering of Wert support/help staff; Intercom support.wert.io was only inspected for __NEXT_DATA__ secrets (none found).
- Full exploitation of the Route53 reclaim (no AWS hosted zone was created). Proof-of-condition only.
- *.prod.wert.io admin ingress (nine hosts) pending non-proxied egress re-test.

Adversarial verification
Every candidate finding was re-exercised independently under a three-lens majority-rule protocol. Each lens re-ran the documented reproduction steps verbatim from a cold cache (no cookies, no residual state), paced at 1 request/second, and returned one of CONFIRMED / REFUTED / PLAUSIBLE with a short note and an adjusted severity. A finding was promoted to the final report only if at least 2 of 3 lenses returned CONFIRMED; a 2/3 PLAUSIBLE outcome demoted a finding to the plausible section (zero cases this engagement); a 2/3 REFUTED outcome removed the finding entirely (zero cases this engagement). Vote records for the three confirmed findings are in the per-target summary attached to the handoff; raw lens notes include byte-for-byte reproduction logs confirming the specific response bodies (ERR_UNAUTHORIZED, no matching operation, method not allowed; 10.20.129.110:8080 / 10.20.129.223:8080; Status 2 EDE 22/23 from the four Route53 IPs). All three findings in the final report are 3/3 CONFIRMED, with one lens on F002 adjusting severity down to Informational and two keeping it at Medium (majority Medium carried).

Findings status after reporting: F-001, F-002, F-003 moved from "confirmed" to "reported" in index.json.
