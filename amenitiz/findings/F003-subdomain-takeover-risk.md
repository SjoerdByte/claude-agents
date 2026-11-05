# F003 - Subdomain Takeover Risk (Dangling CNAME)

## Endpoints
- `get.amenitiz.io` — CNAME to Unbounce (`unbouncepages.com`), returns Cloudflare error 1014 "CNAME Cross-User Banned"
- `bookingsuite.amenitiz.io` — CNAME to PageServe (`hosted.pageserve.co`), returns Cloudflare error 1014

## Method
DNS CNAME resolution

## Severity
Medium (potential, not actively exploited)

## CVSS
AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N — 6.1 (if claimed: phishing + cookie theft on .amenitiz.io)

## OWASP
A05:2021 Security Misconfiguration

## Impact
Both subdomains have DNS CNAME records pointing to third-party landing page services where the Amenitiz account appears to be deactivated or removed. The CF 1014 error currently prevents exploitation, but if Cloudflare configuration changes or the CNAME resolves differently, an attacker who registers the subdomain on the landing page service could:

- Serve arbitrary content on `get.amenitiz.io` / `bookingsuite.amenitiz.io`
- Phish Amenitiz users with a trusted-looking domain
- Set cookies scoped to `.amenitiz.io`, potentially interfering with session management on the main application

## Reproduction

```
$ dig get.amenitiz.io CNAME +short
get.amenitiz.io.herokudns.com.

$ curl -sI https://get.amenitiz.io
HTTP/2 403
server: cloudflare
# Body contains "Error 1014 - CNAME Cross-User Banned"

$ dig bookingsuite.amenitiz.io CNAME +short
bookingsuite.amenitiz.io.herokudns.com.

$ curl -sI https://bookingsuite.amenitiz.io
HTTP/2 403
server: cloudflare
# Body contains "Error 1014 - CNAME Cross-User Banned"
```

## Verification step
After fix, the CNAME records should be removed from DNS. Expected: `dig get.amenitiz.io CNAME +short` returns empty (NXDOMAIN or no CNAME). Alternatively, reclaim the subdomain on the respective landing page service.
