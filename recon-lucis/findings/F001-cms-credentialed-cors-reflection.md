# F001 - cms.lucis.life: credentialed CORS reflects arbitrary Origin

- Endpoint: https://cms.lucis.life/* (Strapi, Koyeb) - e.g. `/api/articles`, `/admin/login`, `/admin/users/me`
- Method: any (GET/POST/OPTIONS)
- Severity: Low
- CVSS: 3.7 (AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N) - see impact caveat
- OWASP: A05:2021 Security Misconfiguration (CORS misconfiguration)
- Confidence: Confirmed (reflection demonstrated). Impact: no exploit path demonstrated.

## Summary
The Strapi instance reflects any `Origin` request header verbatim into
`Access-Control-Allow-Origin` while also returning
`Access-Control-Allow-Credentials: true`. This is the classic "reflect arbitrary
origin + allow credentials" CORS misconfiguration, which normally lets any
website read credentialed responses cross-origin.

## Proving requests / responses

Arbitrary origin reflected on a content API route:
```
$ curl -s -D - -o /dev/null https://cms.lucis.life/api/articles -H "Origin: https://evil.example.com"
HTTP/2 403
vary: Origin
access-control-allow-origin: https://evil.example.com
access-control-allow-credentials: true
```

Preflight also approves credentialed cross-origin requests with any origin:
```
$ curl -s -D - -o /dev/null -X OPTIONS https://cms.lucis.life/api/articles \
    -H "Origin: https://evil.example.com" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization"
HTTP/2 204
access-control-allow-origin: https://evil.example.com
access-control-allow-credentials: true
access-control-allow-methods: GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS
access-control-allow-headers: Content-Type,Authorization,Origin,Accept
```

`null` origin is also reflected:
```
$ curl -s -D - -o /dev/null https://cms.lucis.life/api/articles -H "Origin: null"
access-control-allow-origin: null
access-control-allow-credentials: true
```

## Why impact is limited (honest caveat)
Exploiting credentialed CORS requires the victim's authentication to ride on
cookies, so the attacker's `fetch(..., {credentials:'include'})` attaches them.
This Strapi deployment authenticates the admin via a Bearer JWT (localStorage),
not cookies:
- `POST /admin/login` with invalid creds returns 400 and sets NO cookie.
- `GET /admin/users/me` returns 401 (requires `Authorization: Bearer`), not a cookie.
- `GET /api/articles` returns 403 regardless (content API locked down).

Because no sensitive endpoint authenticates via cookies, an attacker page cannot
leverage the reflected-origin + credentials:true to read any protected data. The
misconfiguration is real and should be fixed (restrict ACAO to a trusted
allowlist, never reflect arbitrary/`null` origins with credentials), but no
concrete data-theft path is demonstrable on the current deployment.

## Remediation
Set Strapi `config/middlewares` CORS `origin` to an explicit allowlist and do
not combine credentialed responses with a reflected origin.
