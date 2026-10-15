# wert.io engagement — findings table

| # | Title | Severity | CVSS v3.1 | Vuln class | Target host | Status | CWE | Recommended fix (one line) |
|---|---|---|---|---|---|---|---|---|
| F-001 | Dangling AWS Route53 NS delegation enables hosted-zone-reclaim subdomain takeover | High | 8.0 (AV:N/AC:H/PR:N/UI:R/S:C/C:H/I:H/A:N) | Subdomain takeover / dangling DNS delegation | otc.wert.io, demo.otc.wert.io, *.otc.wert.io | Confirmed | CWE-16 | Delete the NS records for otc.wert.io (and demo.otc.wert.io) from the wert.io Cloudflare zone; add a tear-down rule that removes parent NS records before deleting any Route53 hosted zone |
| F-002 | /api/external/* three-state operation-enumeration oracle | Medium | 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) | Information disclosure / observable response discrepancy | partner.wert.io, partner-sandbox.wert.io, partner-green.wert.io | Confirmed | CWE-204, CWE-209 | Normalise pre-auth responses to a single opaque 401 for unknown paths / unsupported verbs / missing-or-invalid keys, or move X-Api-Key validation in front of the go-openapi router |
| F-003 | Public Prometheus /metrics leaks internal pod IPs and service identity | Medium | 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) | Information disclosure / security misconfiguration | cards-api.wert.io, cards-api-2.wert.io | Confirmed | CWE-200, CWE-497 | Mirror the ingress rule already in place on cards.wert.io (returns 403) onto cards-api(-2); better still, bind the metrics handler on an in-cluster-only port and strip the `host` label from cards_registrator_* histograms |

Headline: 1 High, 2 Medium, 0 Low, 0 Plausible, 0 Refuted.

Deferred (require explicit user go-ahead): widget / sandbox v3 session-mint IDOR surface — session-mint requires either a Wert-provided sandbox partner key or permission to send one SMS OTP to a controlled test number. Logged in engagement index as pending_decision.

Environment caveats:
- *.prod.wert.io admin ingress (grafana, prometheus, dex, dashboard, kubeconfig, upmeter, status, documentation, api) could not be fully probed from this environment; TLS reset through the egress proxy, consistent with mTLS or source-IP allowlist. If any is open to the public internet, grafana/dex/kubeconfig would be P1 straight away — worth a direct-egress re-check.
- WebSearch declined the credential-hunting Google-dork queries from this environment, so indexed-secret enumeration via google.com was not performed.
