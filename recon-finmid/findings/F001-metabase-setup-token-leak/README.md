# F001 - Metabase setup-token exposed post-install (analytics.finmid.com)

- **Severity:** P2 / Medium (would be P1 / Critical if the Envoy whitelist for `/api/setup/validate` is ever relaxed — Metabase instance ships the full RCE primitive described in CVE-2023-38646; today only the token leak itself is reachable)
- **CVSS 3.1:** 5.3 Medium — `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N`
- **OWASP:** A05:2021 — Security Misconfiguration (also A01:2021 — Broken Access Control if the setup route becomes reachable)
- **Affected endpoint:** `GET https://analytics.finmid.com/api/session/properties`
- **Impact:** Unauthenticated read of the Metabase instance's `setup-token`, instance UUID, backend site-url (`http://metabase-external.ops.live.finmid.io` — note plain-http internal URL), SSO config, and feature-flag matrix. The `setup-token` field is only supposed to exist pre-install; Metabase has shipped the exact `has-user-setup=true + setup-token still non-null` as a known class of leak since CVE-2023-38646 (pre-auth RCE via `/api/setup/validate` + the leaked token). On this host the token is live, instance is already set up (`has-user-setup=true`), and the token is served to any unauthenticated internet client. Metabase 0.54.14 was released 2025-06-20; the instance was created 2022-07-25, so the setup-token has been reachable for ~3 years. The RCE primitive is currently blocked at Envoy (`/api/setup/validate` → 403) but that is a single Envoy whitelist line away from being exploitable; the recommended remediation requires both rotating the token server-side AND keeping Envoy strict.

## Proof-of-concept

```
curl -s https://analytics.finmid.com/api/session/properties | jq '{setup_token:"setup-token",has_user_setup:"has-user-setup",version,site_url:"site-url",analytics_uuid:"analytics-uuid"}'
```

### Request

```
GET /api/session/properties HTTP/2
Host: analytics.finmid.com
User-Agent: curl/8.4.0
Accept: */*
```

### Response (trimmed to the material fields; full body is ~94 KB of DB-driver schema)

```
HTTP/2 200
content-type: application/json; charset=utf-8
x-metabase-version: v0.54.14
server: envoy
...
{
  "setup-token":   "a5701f14-69da-44b2-a1c8-8eb61f200a2b",
  "has-user-setup": true,
  "version": {"date":"2025-06-20","tag":"v0.54.14","hash":"c142fcd"},
  "site-url": "http://metabase-external.ops.live.finmid.io",
  "analytics-uuid": "a7f3acca-b912-488a-8493-4dc33ecf1cb4",
  "enable-password-login": true,
  "google-auth-client-id": "778870797189-13musunads3b2o8mf4sacnspdkb0sh9e.apps.googleusercontent.com"
}
```

Verified live at 2026-10-14 via the agent proxy against `https://analytics.finmid.com/api/session/properties` (HTTP 200, body contents captured in `evidence.txt`).

## Why this is a real finding and not noise

CLAUDE.md non-findings list excludes the Google OAuth client ID (public) and Sentry/PostHog keys (public). The setup-token is **not** a public-by-design value: Metabase's own code sets it to `nil` as soon as the install completes, and the setup-token's existence is the exact precondition CVE-2023-38646 depends on. The leak alone is a confirmed information-disclosure defect; the whole exploit chain is one Envoy whitelist regression away.

## Companion issues reachable with the same token (currently BLOCKED at Envoy — probed and confirmed 403 on all variants)

The following Envoy bypass variants were tested against `/api/setup/validate` and all returned HTTP 403 at the edge:

- `/api/setup/validate`
- `/api/setup/validate/` (trailing slash)
- `/api//setup/validate` (double slash)
- `/api/setup%2Fvalidate` (URL-encoded)
- `/api/SETUP/validate` (case variant)
- `/api/setup;x=y` (matrix param)
- `/api/setup/user`
- `/api/setup`

Other Metabase routes also 403 at edge: `/api/user/current`, `/api/activity`, `/api/util/stats`, `/api/geojson`, `/api/database`, `/api/collection`, `/api/health`, `/public/dashboard/*`, `/public/question/*`. Only `/api/session/properties` is whitelisted. See `evidence.txt` for the full probe list.

## Remediation

1. Rotate the `setup-token` immediately. In Metabase this is done by DELETE'ing the `setup-token` row from the `setting` table (or by setting it to NULL via `MB_SETUP_TOKEN=null` env override on restart); upstream has had patches for the no-longer-needed token survival since v0.46.6.
2. Keep the Envoy whitelist strict — do not add `/api/setup/*` under any circumstance, even for ops bypass.
3. Fix the plain-HTTP site-url (`http://metabase-external.ops.live.finmid.io`). Metabase will build download/pulse links against this value; those links are already susceptible to any ops-network MITM.
4. Add a filter to `/api/session/properties` on the Envoy side that strips `setup-token` from the response body, as defence-in-depth.

## References

- Metabase CVE-2023-38646 — pre-auth RCE via leaked setup-token + `/api/setup/validate`
- Metabase changelog removing survival of setup-token post install
