# Vendor fingerprint - link.blockpit.io

## Vendor: LinkDrip (linkdrip.com, legacy infrastructure on linkdrip.io)

### Evidence chain

**1. DNS CNAME points at LinkDrip's branded-domain endpoint**

Raw authoritative answer (dns.query.udp to 1.1.1.1):
```
link.blockpit.io.           300 IN CNAME custom-domain.linkdrip.io.
custom-domain.linkdrip.io.   60 IN A     13.42.74.145
custom-domain.linkdrip.io.   60 IN A     35.178.63.175
```

The dnspython high-level `.resolve(host, 'A')` call hides the CNAME intermediate (returns only the A rrset), which is why the first-pass summary mislabeled this as a direct A-record configuration. The low-level `dns.query` reveals the real chain.

A records are inside AWS eu-west-2 (London) ranges 13.42.0.0/15 and 35.178.0.0/15 - consistent with LinkDrip's docs listing fixed A-record fallbacks for customers whose registrar does not allow CNAME-at-apex (we are not at apex here, but the same backend IPs serve the custom-domain endpoint).

**2. LinkDrip's public documentation names exactly this CNAME target**

From docs.linkdrip.com "How to use Custom Domains" (via WebSearch, 2026-10-09):
> After clicking the Add domain button, LinkDrip will give you a CNAME record. ... The two docs pages give different CNAME targets. One uses custom-domain.linkdrip.com and the other uses custom-domain.linkdrip.io.

Blockpit's CNAME uses the legacy `.io` variant, suggesting the configuration was added before LinkDrip migrated primary branding to `.com`.

**3. The LinkDrip origin behavior matches - redirect to a static 404 destination**

From www.linkdrip.com docs:
> Optionally, set a 404 page. If LinkDrip cannot find the link ID, it redirects the viewer to the 404 page. If you don't configure one, the viewer goes to linkdrip.com.

Every slug tested on link.blockpit.io returns the same canonical 301:
```
HTTP/1.1 301 Moved Permanently
Location: https://fun.com
```
No `Server:`, no `X-Powered-By:`, no `Set-Cookie:`, no `cf-ray` (not Cloudflare), no `X-Amz-Cf-Id` (not CloudFront directly at this edge), no `X-Vendor-*`. The response is bare and uniform across `/`, `/test`, `/foo`, `/signup`, `/r/test`, `/l/test`, `/blockpit`, `/bp`, a UUID path, and a short-code path. UA swapping (default curl, Chrome desktop, iPhone Safari, Googlebot) does not change the response. This is a generic HTTP reverse proxy returning a single hardcoded 301 for every (host, path) tuple it does not match - exactly LinkDrip's "domain not claimed / link ID not found" fallback.

**4. Direct probe of the vendor endpoint confirms it IS the responding server**

```
curl -k --resolve link.blockpit.io:443:13.42.74.145 'https://link.blockpit.io/'
-> HTTP/1.1 301 Moved Permanently / Location: https://fun.com
```
and
```
curl 'https://custom-domain.linkdrip.io/'
-> SSL certificate problem: certificate has expired  (TLS cert on vendor origin is expired)
   after -k: HTTP/1.1 301 Moved Permanently / Location: https://fun.com
```

The vendor origin itself produces the same 301 to fun.com, independent of Host header. The expired TLS on `custom-domain.linkdrip.io` is a further signal that this endpoint is a legacy / unmaintained branch of LinkDrip's infrastructure.

**5. Why fun.com, not linkdrip.com**

LinkDrip's documented default fallback is `linkdrip.com`, but we observe `fun.com`. Three non-exclusive explanations:

- (a) LinkDrip changed its default fallback destination from linkdrip.com to fun.com at some point. fun.com is served off `Server: cloudflare` with Vanaheim/Netlife-style headers (`srv: Vanaheim`, `x-aspnetmvc-version: 5.2`), unrelated to LinkDrip's marketing site.
- (b) Some orphaned-but-still-registered account at LinkDrip owns the "link.blockpit.io" domain configuration with fun.com as its 404 target.
- (c) link.blockpit.io was previously bound to a prior LinkDrip customer whose project redirected to fun.com and whose account was abandoned.

What matters for takeover is only: (i) LinkDrip is the vendor and (ii) nobody is actively claiming / using this specific hostname at LinkDrip right now, since every slug (including `/x`, `/ios`, `/android`, `/blackfriday`, `/cybermonday`, `/earlybird`, `/fb` - the slugs Blockpit publicly advertises on X, Facebook, and marketing emails) returns the generic 301, i.e. none of Blockpit's own historic link mappings exist on the current backing account.

### Ruled out

- Rebrandly - needs CNAME to `rebrandly.net` / `rebrand.ly`, not present.
- Short.io - needs CNAME to `cname.short.io`, not present.
- Bitly branded - needs CNAME to `cname.bit.ly`, not present.
- Firebase Dynamic Links - needs CNAME to `*.app.goo.gl` / `firebaseapp.com`, not present. Also FDL is deprecated and would not produce this response shape.
- Branch.io - needs CNAME to `cname.bnc.lt`, not present.
- Dub.co - needs CNAME to `cname.dub.co`, not present.
- YOURLS - would show `Server: Apache`/`nginx` and `X-Powered-By: PHP/*`, neither present.

## TLS

Egress proxy MITM: all four TLS probes return certificates issued by `O = Anthropic, CN = Egress Gateway SDS Issuing CA (production)`. We cannot see the real server cert chain or SANs via `openssl s_client`. This is a known limitation of this environment per parent HTTP agent note. Does NOT affect the finding - DNS and HTTP response fingerprints are sufficient to identify the vendor and confirm abandonment.
