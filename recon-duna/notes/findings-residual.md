# Duna engagement - residual deep-dive notes

Scope: operator-expanded to Duna-owned aliases withduna.com / duna.io / viaduna.com.
These are notes from the residual-surface deep-dive; nothing here is a standalone
confirmed exploitable finding on duna.com itself. The one awareness item and the
closed attack-classes are documented here so the report has them as context.

## O-OIDC-001 (awareness, not a finding) - WorkOS device_code grant is live

Host: auth.duna.com (WorkOS AuthKit custom domain).

Live confirmation (one probe, benign fake client_id, no device_code issued):

    POST https://auth.duna.com/oauth2/device_authorization
    Content-Type: application/x-www-form-urlencoded
    client_id=duna_security_test_00000&scope=openid+email+profile

    -> HTTP 401, server: cloudflare, x-workos-app: authkit
    {"error":"invalid_client","error_description":"Application not found."}

The handler validates against the WorkOS Application registry (not 404 /
method-not-allowed), so the device_code grant is wired through. With the real
public client_id (client_01JNR708GP08A6X4D265YCSEPD) a device_code would be
issued. This creates a classic consent-phishing path: an attacker starts the
device flow, sends the verification URL + user_code to a Duna employee, the
employee enters the code and grants the attacker an access_token for the
openid/email/profile scopes.

Not a Duna misconfiguration on its own (AuthKit default). Severity depends on
whether any Duna product actually needs the device_code grant. Recommendation
for Duna: if no CLI/native integration uses it, disable the grant on the WorkOS
Application config.

Also publicly discoverable on auth.duna.com (RFC 8414 metadata):
- /.well-known/oauth-authorization-server duplicates the OIDC discovery doc.
- /oauth2/jwks returns the single RS256 kid sso_oidc_key_pair_01JNR708F77ZTQKPP6X3Z7BVMK
  with signing cert CN auth.workos.com. Standard WorkOS-managed signing.
- /sign-up and /reset-password redirect (307) to auth-api.duna.com/user_management/initiate_login
  with the public client_id, matching prior recon.
- /.well-known/webfinger, /verify-email, /manage, /.well-known/openid-federation 404.

## Attack classes closed (negative, with evidence)

- settings.duna.com / settings.withduna.com: VPC-internal only. Seven curated
  Host candidates NXDOMAIN (settings.internal, settings-api, settings.svc,
  settings-v1, config.svc, settings.int, settings.app .duna.com). SPA bundles
  contain zero settings.duna / settings.withduna / SETTINGS_URL / settingsApi
  references (only UI label strings). CSP connect-src carries no sibling
  pattern. Direct AWS LB IPs terminate at TLS only. Not Cloudflare-for-SaaS
  (would resolve to CF edge IPs). Dead for external testing.

- github-app.withduna.com: scaffolding only. Full webhook POST to root with
  genuine GitHub headers (X-GitHub-Event: ping, X-GitHub-Delivery UUID,
  X-Hub-Signature-256: sha256=<junk>, Hookshot UA, body
  {"zen":"test","hook_id":1}) returns Express default 404 "Cannot POST /"
  (x-powered-by: Express, content-security-policy: default-src 'none'). GET and
  POST to /api/github/webhooks, /app, /probot/stats, /probot/ping, /webhooks,
  /webhook, /github/webhook, /events, /smee, /manifest.json, /install, /oauth,
  /oauth/callback, /setup, /healthz, /metrics, /debug, /_health, /ready all 404.
  Only GET / responds (hardcoded "Hello for GitHub!"). F-PERI-003 remains the
  only item on this host.

- Vercel edge SSRF on dashboard-proto / demo .withduna.com: image optimizer
  rejects file:/// , metadata.google.internal and 169.254.169.254 with 400
  INVALID_IMAGE_OPTIMIZE_REQUEST (remote-pattern allowlist enforced). No
  X-Vercel-Protection leakage, no Next.js API route handler for any Supabase
  table name or for /api/auth /api/trpc /api/graphql /api/user /api/me /api/org.
  Only /api/health returns the duna-dashboard-api status. Confirms the data
  path is strictly browser -> Supabase REST with the publishable anon key, so
  F-PERI-002 (Supabase RLS) is the full attack surface on this app.

- demo.withduna.com: plain 307 alias of dashboard-proto for every path tested.
  No independent surface.
