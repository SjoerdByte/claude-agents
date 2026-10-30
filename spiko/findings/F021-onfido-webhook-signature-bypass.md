# F021 - Onfido Webhook Signature Validation Bypass

## Summary
The Onfido KYC webhook endpoint at `webhooks.spiko.io/onfido` does not validate webhook signatures when the `X-SHA2-Signature` header is absent. Requests without the header bypass authentication entirely and reach the backend payload handler, while requests with an invalid signature header are correctly rejected with HTTP 401.

## Endpoint
- **URL**: `POST https://webhooks.spiko.io/onfido`
- **Also affected**: `POST https://webhooks.staging.spiko.io/onfido`, `POST https://webhooks.preprod.spiko.io/onfido`
- **Method**: POST
- **Severity**: Medium
- **CVSS**: AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N (5.9)
- **OWASP**: A07:2021 - Identification and Authentication Failures

## Impact
The Onfido webhook is used for KYC (Know Your Customer) verification callbacks in the investor onboarding flow. If an attacker discovers the correct payload format, they could forge KYC verification events without any signature validation, potentially:
- Marking arbitrary identity checks as "clear" / "approved"
- Bypassing identity verification for new investor accounts
- Approving documents or facial similarity checks without actual verification

The Coinbase webhook on the same host correctly validates signatures regardless of header presence (always returns 401 for invalid requests), demonstrating this is an Onfido-specific implementation flaw.

## Proof

### Request 1: Without X-SHA2-Signature header (signature bypass - reaches handler)
```
POST /onfido HTTP/2
Host: webhooks.spiko.io
Content-Type: application/json

{"payload":{"resource_type":"check","action":"check.completed","object":{"id":"test-check-id","status":"complete","href":"https://api.onfido.com/v3/checks/test"}}}
```

### Response 1: HTTP 400 (payload handler reached, format rejected)
```
HTTP/2 400
date: Thu, 29 Oct 2026 23:21:06 GMT
content-type: application/json
content-length: 2
x-envoy-upstream-service-time: 2
server: cloudflare

{}
```

### Request 2: With X-SHA2-Signature header (signature validated and rejected)
```
POST /onfido HTTP/2
Host: webhooks.spiko.io
Content-Type: application/json
X-SHA2-Signature: invalidhex

{"payload":{"resource_type":"check","action":"check.completed","object":{"id":"test-check-id","status":"complete","href":"https://api.onfido.com/v3/checks/test"}}}
```

### Response 2: HTTP 401 (signature validation active)
```
HTTP/2 401
date: Thu, 29 Oct 2026 23:21:06 GMT
content-type: application/json
content-length: 39
x-envoy-upstream-service-time: 2
server: cloudflare

{"message":"Invalid webhook signature"}
```

### Control: Coinbase webhook (properly implemented)
```
POST /coinbase HTTP/2
Host: webhooks.spiko.io
Content-Type: application/json

{"event":{"type":"charge:confirmed","data":{"code":"test"}}}
```

```
HTTP/2 401
content-type: application/json

{"message":"Invalid webhook signature"}
```

The Coinbase endpoint returns 401 regardless of whether the X-CC-Webhook-Signature header is present or absent, confirming proper signature enforcement.

### Consistency verification
Tested 5 consecutive requests for each scenario. Results are 100% consistent:
- Without X-SHA2-Signature: 400 400 400 400 400
- With X-SHA2-Signature: 401 401 401 401 401

Same behavior confirmed on staging (webhooks.staging.spiko.io) and preprod (webhooks.preprod.spiko.io).

## Root Cause
The webhook handler appears to check: "if X-SHA2-Signature header is present, validate it." When the header is absent, the signature validation middleware is skipped entirely, and the request proceeds to the payload parsing handler. The correct behavior (as implemented for the Coinbase endpoint) is to always require and validate the signature, rejecting requests where the header is missing.

## Remediation
1. Reject all requests to /onfido that lack the X-SHA2-Signature header with HTTP 401 before any payload processing.
2. Apply the same pattern used by the /coinbase endpoint, which correctly validates regardless of header presence.
3. Audit all webhook endpoints for consistent signature enforcement.
