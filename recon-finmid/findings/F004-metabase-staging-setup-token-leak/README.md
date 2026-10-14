# F004 analytics.finmid-staging.com Metabase setup-token leak

Status: confirmed
Severity: P2 / Medium
CVSS 3.1: 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)
OWASP: A05:2021 Security Misconfiguration

## Affected endpoint

GET https://analytics.finmid-staging.com/api/session/properties

## Observation

A second Metabase instance, parallel to the live analytics.finmid.com host (F001), is exposed on the previously undocumented staging environment. Envoy fronts the host and whitelists the same handful of `/api/session/properties`-style endpoints, which leak the Metabase instance's setup-token to unauthenticated callers even though initial setup is already complete.

Key leaked fields (Metabase v0.54.14, Jun 2025 build):

- `setup-token`: `868359f8-6915-45e9-9ab3-fe5dfb3b81cc`
- `has-user-setup`: `true` (setup is complete, so the token should no longer be served)
- `version`: `v0.54.14` (hash `c142fcd`, released 2025-06-20)
- `site-url`: `http://metabase-external.ops.staging.finmid.io` (plain HTTP, internal DNS)
- `analytics-uuid`: `a02c26df-25ac-40e0-8144-ac6d6b26af10`
- `instance-creation`: `2022-06-29T15:57:39Z`
- `google-auth-client-id`: `492228515835-alshdsgmdib7q98nu4p5fi4hkg72m741.apps.googleusercontent.com`
- `enable-password-login`: `true`
- `password-complexity`: `{total: 6, digit: 1}`

## Impact

This is the pre-condition for the pre-auth RCE in CVE-2023-38646 (Metabase <= 0.46.6.1 / Enterprise <= 1.46.6.1 is vulnerable; v0.54.14 is patched). The reachable attack surface for the token therefore ranges from zero (if the whitelist stays tight and all historical CVEs are patched) to Critical if the Envoy whitelist is ever relaxed, since the token is the magic value a next-generation setup-flow bypass would need.

Direct harm shown today:

- Fingerprint of an internal staging Metabase instance with its full version, uuid, instance birthdate, and SSO config.
- Confirmation that staging allows password login (ROPC-style credential stuffing is in-scope for staging if we had a wordlist, which we do not use per rules).
- Site-url leaks the internal DNS zone `metabase-external.ops.staging.finmid.io` (parallel to the live `ops.live.finmid.io` leak from F001), giving an attacker who ever lands on the internal network an exact pivot target.

Severity floor matches F001 at P2 Medium. Would promote to P1 Critical the same way F001 would, if the Envoy whitelist is ever broadened to include `/api/setup/validate` or any pre-auth RCE primitive from a future CVE.

## Reproduction

```bash
curl -s https://analytics.finmid-staging.com/api/session/properties | jq '{setup_token:."setup-token", has_user_setup:."has-user-setup", version:.version, site_url:."site-url", analytics_uuid:."analytics-uuid", instance_creation:."instance-creation"}'
```

Raw response headers (full capture in evidence.txt):

```
HTTP/2 200
date: Wed, 14 Oct 2026 20:30:31 GMT
content-type: application/json;charset=utf-8
x-frame-options: DENY
strict-transport-security: max-age=31536000
set-cookie: metabase.DEVICE=9801bc96-4a5e-42e0-93f5-582dcdf663db; HttpOnly; ...
cache-control: max-age=0, no-cache, must-revalidate, proxy-revalidate
x-envoy-upstream-service-time: 33
```

## Envoy whitelist re-verified today (same shape as F001)

The exploit paths are all blocked at the edge:

```
403 /
403 /api/session
403 /api/user
403 /api/user/current
403 /api/dashboard
403 /api/geojson
403 /api/setup/validate
403 /api/public/dashboard/00000000-0000-0000-0000-000000000000
403 /public/dashboard/00000000-0000-0000-0000-000000000000
403 /api/health
403 /api/activity
403 /api/util/stats
403 /api/database
403 /api/collection
403 /api/setup
403 /api/setup/
403 /API/setup/validate
```

Only `/api/session/properties` and the Envoy health-check path are forwarded.

## Remediation

1. Patch to a Metabase release that no longer returns `setup-token` once `has-user-setup=true` (fixed upstream in v0.46.6.4). The token is already in v0.54.14's response, which looks like a regression; file an upstream issue or override.
2. Explicitly clear or null the setup-token database row after setup completion.
3. Remove plain-HTTP `site-url` from the leaked payload (set the Metabase site URL to an https URL served by Envoy).
4. Consider removing the `/api/session/properties` route from the Envoy allowlist unless the OPS team explicitly needs it reachable from the public internet.

## References

- CVE-2023-38646: https://nvd.nist.gov/vuln/detail/CVE-2023-38646
- F001 (live-env companion finding).
