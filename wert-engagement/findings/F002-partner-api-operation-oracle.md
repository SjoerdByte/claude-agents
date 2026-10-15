# F002 - partner.wert.io /api/external/* three-state operation enumeration oracle

- Endpoint: https://partner.wert.io/api/external/*
- Method: any (GET/POST/PUT/PATCH/DELETE)
- Severity: Medium
- CVSS v3.1: AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N (3.1)
- CWE: CWE-204 (Observable Response Discrepancy), CWE-209 (Information Exposure Through an Error Message)
- OWASP: A05:2021 Security Misconfiguration (and A01-adjacent info disclosure)

## Impact
Without any credentials an attacker can map the complete external-partner API surface by sending a request to any path and observing one of three distinct error strings returned by the Go/go-openapi router:

- 404 `{"error":"no matching operation was found"}` -> path does not exist
- 400 `{"error":"method not allowed"}` -> path exists, verb is wrong
- 401 `{"error":"ERR_UNAUTHORIZED","success":false}` or `{"message":"ERR_UNAUTHORIZED"}` -> path+verb exist, API key wrong

That lets an unauthenticated attacker enumerate every externally reachable partner-API operation and keep testing new revisions as Wert ships them, without ever presenting a key. The oracle also distinguishes the key-missing path (`HTTP 400 "Header parameter X-Api-Key is required, but not found"`) from the key-invalid path. Impact alone is info disclosure, hence Medium; it is however the prerequisite for any future credential-stuffing or 0-day-endpoint discovery against the partner surface.

Confirmed operation surface from the enumeration (identical on partner-sandbox.wert.io and partner-green.wert.io):
- `GET  /api/external/orders`
- `GET  /api/external/users`
- `POST /api/external/users/create`

All other candidate paths (webhooks, payouts, partners, tokens, accounts, balances, transactions, reports, settings, keys, me, kyc, limits, invoices, payment-methods, cards, notifications, subscribers, logs, user, order, wallet, wallets, addresses, payments, sessions, cardholders, openapi.json, swagger.json, swagger-ui, docs, health, metrics, version) return the 404 "no matching operation" string, so they do not exist.

## Proof - path-exists vs path-missing

Request (path exists, bad key):
```
GET /api/external/orders HTTP/2
Host: partner.wert.io
X-Api-Key: aaaaaaaaaaaaaaaa
```
Response:
```
HTTP/2 401
content-type: application/json; charset=utf-8
access-control-allow-origin: *
access-control-allow-credentials: true

{"error":"ERR_UNAUTHORIZED","success":false}
```

Request (path missing, bad key):
```
GET /api/external/webhooks HTTP/2
Host: partner.wert.io
X-Api-Key: aaaaaaaaaaaaaaaa
```
Response:
```
HTTP/2 404
content-type: application/json; charset=utf-8

{"error":"no matching operation was found"}
```

Request (wrong verb, bad key):
```
POST /api/external/orders HTTP/2
Host: partner.wert.io
X-Api-Key: aaaaaaaaaaaaaaaa
```
Response:
```
HTTP/2 400
content-type: application/json; charset=utf-8

{"error":"method not allowed"}
```

Request (no key, missing path):
```
GET /api/external/webhooks HTTP/2
Host: partner.wert.io
```
Response:
```
HTTP/2 400
content-type: application/json; charset=utf-8

{"msg":"Header parameter X-Api-Key is required, but not found"}
```

## Recommended fix
Normalise all pre-auth responses to a single opaque status (ideally HTTP 401 with a fixed body) so that unknown-path, wrong-method, and bad-key are indistinguishable to an unauthenticated caller. Alternatively, move the `X-Api-Key` check in front of the router so an invalid or missing key short-circuits every request before the path and method matcher is consulted. Keep the detailed error strings behind the auth boundary for authenticated partners.

## Evidence
Full raw transcripts: /tmp/claude-0/-home-user-claude-agents/6a300877-9c0e-5acd-8f22-89625cbba3d2/scratchpad/wert-engagement/exploit/T2-partner-data-api/matrix-noauth.txt, matrix-fakekey.txt
Matrix summary: /tmp/claude-0/-home-user-claude-agents/6a300877-9c0e-5acd-8f22-89625cbba3d2/scratchpad/wert-engagement/exploit/T2-partner-data-api/T2-matrix.md
