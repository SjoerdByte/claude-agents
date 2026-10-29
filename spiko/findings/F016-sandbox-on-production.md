# F016 - Sandbox/Test Endpoints Routed on Production Distributor API

## Summary
The production distributor API gateway at distributor-api.spiko.io routes sandbox/test endpoints that allow simulating financial operations. While these endpoints require authentication, sandbox functionality should never be available in a production environment.

## Endpoint
https://distributor-api.spiko.io/v0/sandbox/*

## Severity
Medium

## CVSS
AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:L -- 5.4

## OWASP
A05:2021 - Security Misconfiguration (test functionality available in production)

## Impact
Any distributor user with valid authentication credentials may have access to sandbox operations on the production environment, including:
1. Simulating incoming wire transfers against production data
2. Triggering execution runs (settlement processing)
3. Bulk deposit operations and cancellation
4. Funding deposit orders

Even if the sandbox handlers are no-ops or feature-flagged, their presence in the production routing table expands the attack surface unnecessarily.

## Proof

Sandbox endpoints discovered through SPA bundle analysis of distributor.spiko.io and confirmed routed on production:

```
curl -s -o /dev/null -w "%{http_code}" https://distributor-api.spiko.io/v0/sandbox/bulk-deposits

Response: 401 (routed, auth required)
```

```
curl -s -o /dev/null -w "%{http_code}" https://distributor-api.spiko.io/v0/sandbox/execution-runs

Response: 401 (routed, auth required)
```

```
curl -s -o /dev/null -w "%{http_code}" https://distributor-api.spiko.io/v0/sandbox/incoming-wires

Response: 401 (routed, auth required)
```

For comparison, a non-existent path:
```
curl -s -o /dev/null -w "%{http_code}" https://distributor-api.spiko.io/v0/nonexistent

Response: 404
```

Full list of sandbox endpoints routed on production:
- /v0/sandbox/bulk-deposits (GET/POST)
- /v0/sandbox/bulk-deposits/:paymentEntryId/cancel (POST)
- /v0/sandbox/deposit-orders/:depositOrderId/fund (POST)
- /v0/sandbox/execution-runs (GET)
- /v0/sandbox/execution-runs/ (POST)
- /v0/sandbox/execution-runs/full (POST)
- /v0/sandbox/incoming-wires (POST)

## Remediation
1. Remove sandbox route registration from the production API gateway configuration.
2. Use environment-specific route configuration to ensure sandbox endpoints are only available in staging/development environments.
3. If sandbox functionality must be accessible in production for specific testing purposes, gate it behind an additional authorization layer and audit log.
