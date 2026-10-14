# F005 platform.finmid.com and platform.finmid-staging.com serve a static CSP nonce 'rAnd0m'

Status: confirmed
Severity: P4 / Low (defense-in-depth bypass of CSP; no immediate RCE without an injection point)
CVSS 3.1: 3.1 (AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N)
OWASP: A05:2021 Security Misconfiguration (CWE-330 Use of Insufficiently Random Values)

## Affected endpoints

- GET https://platform.finmid.com/
- GET https://platform.finmid-staging.com/

## Observation

The CSP header served by the distributor admin SPA on both the production and the staging platform host contains a nonce source that is literally the string `rAnd0m`:

```
content-security-policy: default-src 'self'; script-src 'self' 'nonce-rAnd0m' https://auth.finmid.com/ https://platform.gateway.finmid.com/ https://*.posthog.com/; img-src 'self' ...; connect-src 'self' https://platform.gateway.finmid.com/ ...; frame-src 'self' https://auth.finmid.com/ https://analytics.finmid-staging.com/ https://analytics.finmid.com/;
```

Two consecutive requests return the exact same `nonce-rAnd0m` string, confirming the nonce never rotates:

```
fetch 1 -> 'nonce-rAnd0m'
fetch 2 -> 'nonce-rAnd0m'
```

The nonce value is also identical on the staging host (`platform.finmid-staging.com`), which rules out "it's a random value that happens to look like a placeholder" and confirms the string is a hard-coded placeholder that was never replaced with a build-time or request-time random value.

The current build does not include any inline `<script nonce="...">` tags, so no legitimate request depends on the nonce today. The weakness is entirely about what the CSP allows an attacker to do if any content-injection sink appears later.

## Impact

CSP nonces exist so that `'self'` + nonce makes inline scripts safe. A static, publicly-known nonce defeats this protection: any attacker who finds a HTML-injection sink (reflected XSS, DOM XSS with a sink that renders attacker HTML, a vulnerable third-party widget, a markdown renderer, etc.) can bypass CSP simply by adding `nonce="rAnd0m"` to the injected `<script>` tag.

Standalone severity is Low (P4). If any content injection on platform.finmid.com surfaces later, this bug raises its impact from "blocked by CSP" to "full JS execution + session takeover of a logged-in distributor admin". Combined with the known `/api/webhooks` credential-leak schema (recon F002) that would mean cross-tenant webhook secret theft via XSS, which would be P1.

The frame-src also still lists `https://analytics.finmid-staging.com/` on the production host, which is a secondary hygiene issue (prod should not reference a staging origin in its CSP) but not independently exploitable.

## Reproduction

```bash
# Prod - static nonce 'rAnd0m'
curl -sI "https://platform.finmid.com/" | grep -i content-security-policy | grep -oE "'nonce-[^']+'"
curl -sI "https://platform.finmid.com/" | grep -i content-security-policy | grep -oE "'nonce-[^']+'"
# Staging - same static nonce 'rAnd0m'
curl -sI "https://platform.finmid-staging.com/" | grep -i content-security-policy | grep -oE "'nonce-[^']+'"
curl -sI "https://platform.finmid-staging.com/" | grep -i content-security-policy | grep -oE "'nonce-[^']+'"
```

All four requests return the identical token:

```
'nonce-rAnd0m'
```

## Remediation

1. Generate a cryptographically-random nonce per request (CSP spec recommends >= 128 bits of entropy, base64-encoded).
2. If the current build does not use any inline scripts, drop the `'nonce-rAnd0m'` source entirely from `script-src` so nothing in CSP depends on the nonce.
3. Also drop `https://analytics.finmid-staging.com/` from the production CSP `frame-src`.

If the nonce is injected by a CloudFront Function (which looks likely given the header shape), update the function to use `crypto.randomUUID()` or `AwsCrypto.getRandomValues()` for each request.

## References

- CSP spec on nonce freshness: https://www.w3.org/TR/CSP3/#security-nonces
- OWASP CSP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
