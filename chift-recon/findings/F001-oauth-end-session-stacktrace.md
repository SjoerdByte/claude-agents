# F001 - Verbose Postgres stack trace at /auth/oauth/end_session

| Field | Value |
|---|---|
| Endpoint | `https://backend.chift.app/auth/oauth/end_session` |
| Method | GET |
| Severity | Low |
| CVSS | AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N (3.7) |
| OWASP | A05:2021 - Security Misconfiguration |
| Status | confirmed |

## Impact

An unauthenticated request to `/auth/oauth/end_session` without the required OIDC
parameters (`id_token_hint`, `client_id`, …) triggers an uncaught error in the
SuperTokens core and returns the raw Java/Postgres stack trace to the client,
including:

- Underlying storage engine (`PostgreSQL` via `io.supertokens.pluginInterface`)
- Schema (`public`)
- Table name (`oauth_logout_challenges`)
- Column name that failed (`client_id` NOT NULL constraint)
- The exact row that was being inserted, including the live challenge UUID
  (`4efc72f6-9029-42fc-bbcd-c7539303ae7f` at the time of this test, which rotates
  per request) and a nanosecond-resolution timestamp.

Each hit also writes a new row into `oauth_logout_challenges`, so an attacker can
silently create unbounded garbage rows in that table (minor data-store pressure /
retention nuisance). The challenge UUID is a `v4` so it isn't guessable, but
being able to enumerate live, server-generated UUIDs from an unauth GET is a
small enumeration primitive on top of the stack-trace disclosure.

Combined with the version string on `/` (`This is the Chift Backend - 1.87.0`),
the `window.connectionURI` leak in `/auth/dashboard` HTML
(`prod-8d408ad197dc11edb887b72d66b729a0-eu-west-1.aws.supertokens.io:3567`) and
this exception, an attacker can precisely fingerprint the backend stack and the
SuperTokens core version in use for targeted CVE lookup.

## Reproduction

### Request

```
GET /auth/oauth/end_session HTTP/2
Host: backend.chift.app
```

### Response (headers trimmed)

```
HTTP/2 500
date: Wed, 21 Oct 2026 08:08:26 GMT
content-type: application/json; charset=utf-8
content-length: 471
access-control-allow-origin: *
access-control-allow-credentials: false

{"message":"SuperTokens core threw an error for a GET request to path: '/recipe/oauth/sessions/logout' with status code: 500 and message: io.supertokens.pluginInterface.exceptions.StorageQueryException: org.postgresql.util.PSQLException: ERROR: null value in column \"client_id\" of relation \"oauth_logout_challenges\" violates not-null constraint\n  Detail: Failing row contains (public, 4efc72f6-9029-42fc-bbcd-c7539303ae7f, null, null, null, null, 1792570106183).\n"}
```

A second shot during the first recon pass produced an identical stack trace with
a different `v4` UUID (`fb885d7e-ac69-4ae9-a860-0f1bb56744a9`), confirming the
leak is deterministic and challenge-rotating.

### Expected response

The endpoint should either return `400 invalid_request` (as it already does when
`client_id=x&id_token_hint=y` is supplied) or `302` to the configured
`post_logout_redirect_uri`. Database/row-level exceptions should never reach the
client body.

## Fix

Wrap the SuperTokens core call in a try/catch at the Chift backend layer and
return a generic 500 (or better, re-dispatch to the OIDC `invalid_request`
response) when the core returns a storage-level exception. Also add the Chift
backend version string to the deny-list of information disclosed at `/`.
