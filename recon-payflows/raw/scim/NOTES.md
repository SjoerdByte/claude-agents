# scim.payflows.io probe results — all unauth

Baseline (`/`): 403 MissingAuthenticationTokenException (API Gateway, native).

SCIM paths that hit application Lambda (401 Unauthorized, proper SCIM-shaped):
- /scim/v2/ServiceProviderConfig
- /scim/v2/Schemas
- /scim/v2/ResourceTypes
- /scim/v2/Users
- /scim/v2/Groups
- /scim/v2/Users/1
- /scim/v2/Users/me

Non-routed paths (API Gateway 403 MissingAuthenticationToken, no application):
- /scim/v1/Users
- /Users
- /v2/Users
- /.well-known/scim-configuration
- POST /scim/v2/Users/.search

Auth bypass attempts (all returned same 401, no distinction):
- Authorization: Bearer null | undefined | "" | test
- Basic admin:admin
- X-API-Key: test
- X-Forwarded-User: admin
- X-Amzn-Oidc-Identity: admin
- X-Original-URL: /scim/v2/ServiceProviderConfig (path-override SSRF)

CORS: OPTIONS returns 403, no Access-Control-Allow-Origin ever emitted. Not browser-reachable from third-party origins (by design).

Filter injection pre-auth: GET /scim/v2/Users?filter=userName sw "a" → 401. Auth is enforced before query parsing.

Verdict: tight. Standard SCIM-spec 401 with no leakage. Does NOT exhibit the F001/F002 Lambda-exception leak pattern. No finding reachable without a provisioned SCIM bearer (which only Payflows employees / integration partners get).

Ruled out at unauth level.
