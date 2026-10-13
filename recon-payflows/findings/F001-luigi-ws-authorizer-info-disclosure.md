# F001 — Public Luigi WebSocket Lambda authorizer leaks internal Python exceptions and auth-model internals

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| wss://luigi-public-ws.payflows.io/ and wss://luigi-api-public-ws.payflows.io/ | WS CONNECT (HTTP/2 Upgrade) | Low | 3.1 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) | A05:2021 Security Misconfiguration (CWE-209 Generation of Error Message Containing Sensitive Information; CWE-754 Improper Check for Unusual or Exceptional Conditions) | Unauthenticated attacker learns full auth model (JWT with `kid`-based JWKS lookup, UUID conversation_id), identifies backend language (Python) and triggered-exception types, and gets a precise probing oracle useful for crafting attacks against the issuer. No direct access to data; this is a stack / behaviour disclosure. |

## Hosts and surface

Four `luigi-*-ws.payflows.io` subdomains all answer plain HTTP with `HTTP/2 426 Upgrade Required`, pointing at an AWS API Gateway WebSocket API.

Only two of the four are exposed to the public internet with an application-layer authorizer (the other two use IAM / SigV4 at the gateway):

- `luigi-public-ws.payflows.io`
- `luigi-api-public-ws.payflows.io`

Both react identically. Only path `/` reaches the application; every other path (`/ws`, `/graphql`, `/socket.io/...`, `/chat`, `/messages`, ...) returns the standard API Gateway `{"message": "Forbidden"}` route-not-found. 15 common paths x 11 subprotocols were probed per host (`raw/luigi/wsprobe-log.txt`), zero handshakes succeeded.

The two non-public hosts `luigi-ws.payflows.io` and `luigi-api-ws.payflows.io` return API Gateway's `{"message": "Missing Authentication Token"}` on every probe, which is the signature of SigV4 / IAM auth on the gateway itself (no application code reached). They are not affected.

## Reproduction

The authorizer returns different error bodies depending on which validation step fails. The step-order is detectable from unauthenticated requests. Each request below is a WebSocket Upgrade on HTTPS; no credentials, no cookies.

### Step 1 — missing `conversation_id`
```
GET / HTTP/2
Host: luigi-api-public-ws.payflows.io
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
```
```
HTTP/2 400
content-type: application/json; charset=UTF-8
x-amz-apigw-id: FLUMFFsWjoEEsxA=

{"statusCode": 400, "body": "Conversation ID not found in request."}
```

### Step 2 — non-UUID `conversation_id` → unhandled Python exception
```
GET /?conversation_id=not-a-uuid HTTP/2
Host: luigi-api-public-ws.payflows.io
Connection: Upgrade / Upgrade: websocket / Sec-WebSocket-Version: 13 / Sec-WebSocket-Key: ...
```
```
HTTP/2 500
content-type: application/json; charset=UTF-8

{"statusCode": 500, "body": "badly formed hexadecimal UUID string"}
```
`badly formed hexadecimal UUID string` is the verbatim text of Python's `uuid.UUID` ValueError. This confirms the authorizer is a Python Lambda and that `UUID(request_param)` is called without `try/except`.

### Step 3 — valid UUID, no token
```
GET /?conversation_id=00000000-0000-0000-0000-000000000000 HTTP/2
```
```
HTTP/2 400
{"statusCode": 400, "body": "JWT not found in request."}
```

### Step 4 — JWT without `kid` header → unhandled `KeyError`
```
GET /?conversation_id=00000000-0000-0000-0000-000000000000&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.c3PtdOtF-W_6xcDa6I9DAwN2oWMy_bRN5nMy6Pq_U-8 HTTP/2
```
(payload header: `{"alg":"HS256","typ":"JWT"}` — no `kid`)
```
HTTP/2 500
{"statusCode": 500, "body": "'kid'"}
```
The quoted bare key name is Python's default `KeyError.__str__`, confirming the authorizer does something like `headers['kid']` without a safe `.get()`.

### Step 5 — JWT with arbitrary `kid` → unhandled key-lookup exception
```
GET /?conversation_id=00000000-0000-0000-0000-000000000000&token=<JWT with kid="nonexistent-kid-00000000"> HTTP/2
```
```
HTTP/2 500
{"statusCode": 500, "body": "Public key not found in jwks.json"}
```
Pre-auth attacker now knows: (a) key material lives in a `jwks.json` file (b) `kid` drives the lookup (c) the lookup error is not sanitized. An attacker who knows a real `kid` from the Cognito User Pool JWKS can get past this step but still needs a validly signed JWT, so this is not an auth bypass. Combined with the Cognito user pool used by `app.payflows.io` (identity pool `eu-west-1:d1d858d9-a60d-456e-9321-0745dacfac45`, leaked in `app.payflows.io/assets/index-BHmttnD1.js`) this gives an attacker the full target shape for any sign-up / token-trading attack against the User Pool.

The second host behaves identically; evidence lines (same five steps) are in `raw/luigi/evidence-authorizer.txt` and `raw/luigi/evidence-luigi-public-ws.txt`.

## Why this is a finding

- Both `statusCode: 500` responses are stack-trace fragments reaching an unauthenticated client over the internet. That is CWE-209.
- The responses together form a precise unauth oracle for the auth model and backend stack. That is the "security misconfiguration" criterion.
- The 500s mean the Lambda authorizer has unhandled code paths reachable from pre-auth input, which is CWE-754. Expected behaviour is a flat `401` without body for every pre-auth validation failure.

## Why this is not higher

- No WebSocket handshake ever completed; no application frames were seen. The authorizer blocks every attempted probe.
- The error strings do not disclose user data, keys, or tenants.
- Introspection of a GraphQL subscription endpoint was tested and failed (no `/graphql` path reaches the authorizer; subprotocol `graphql-transport-ws` on `/` gets the same `Conversation ID not found` 400).

## Recommended fix

Wrap the authorizer in a top-level try/except, and respond with a fixed `401` + empty body for every pre-auth failure. In particular:
- Do not raise `uuid.UUID("...")` on request input without `try/except ValueError`.
- Access JWT header fields with `.get("kid")` and treat missing `kid` identically to any other invalid token.
- Do not surface JWKS lookup errors in the response body.

## Rule-out log

- Standard WS subprotocols (`graphql-ws`, `graphql-transport-ws`, `v10..12.stomp`, `wamp.2.json`, `soap`, `ocpp1.6`, `mqtt`, `mqttv3.1`) advertised to `/`, `/ws`, `/websocket`, `/socket`, `/api/ws`, `/v1/ws`, `/stream`, `/events`, `/sub`, `/pubsub`, `/mqtt`, `/graphql`, `/signalr`, `/socket.io/?EIO=4&transport=websocket`: all 400 or 403 (`raw/luigi/wsprobe-log.txt`, 616 probes, no 101).
- `/socket.io/?EIO=4&transport=polling`: 426 Upgrade Required → not a Socket.IO server.
- GET on 10 common management paths (`/health`, `/healthz`, `/version`, `/metrics`, `/debug/pprof`, `/.well-known/openid-configuration`, `/robots.txt`, ...): all 426 Upgrade Required (`raw/luigi/http-sweep.txt`).
- Non-`-public-` hosts (`luigi-ws.payflows.io`, `luigi-api-ws.payflows.io`): gate at API Gateway with SigV4 (`Missing Authentication Token`), no application reached.

## Evidence files

- `recon-payflows/raw/luigi/wsprobe-log.txt` — 616 WS probes across 4 hosts, 14 paths, 11 subprotocols
- `recon-payflows/raw/luigi/http-sweep.txt` — 80 HTTP GETs across 4 hosts
- `recon-payflows/raw/luigi/evidence-authorizer.txt` — canonical 5-step transcript for `luigi-api-public-ws`
- `recon-payflows/raw/luigi/evidence-luigi-public-ws.txt` — canonical 5-step transcript for `luigi-public-ws`
- `recon-payflows/raw/luigi/socketio-polling.txt` — socket.io negative result
