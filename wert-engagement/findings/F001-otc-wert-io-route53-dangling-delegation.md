# F001 - otc.wert.io / demo.otc.wert.io: Dangling AWS Route53 NS delegation (hosted-zone reclaim subdomain takeover)

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| `otc.wert.io` (NS delegation) | DNS | High | 7.4 | A05:2021 Security Misconfiguration | Full subdomain takeover of `otc.wert.io` and `demo.otc.wert.io` via Route53 hosted-zone reclaim; attacker can serve arbitrary HTTPS content under a valid wert.io hostname and operate a convincing phishing/trading clone against Wert customers. |

- CVSS v3.1: `AV:N/AC:H/PR:N/UI:R/S:C/C:H/I:H/A:N` = 8.0 (High). AC:H accounts for the Route53 reclaim lottery (an attacker must create hosted zones until AWS assigns the exact four-NS set). UI:R reflects the need for a victim to visit the attacker-controlled subdomain. S:C because the trust context (`wert.io` brand, TLS-valid certificate) crosses from the DNS misconfiguration into the entire web application / brand.
- CWE: CWE-16 (Configuration) / dangling-DNS pattern tracked in https://github.com/EdOverflow/can-i-take-over-xyz under "AWS/Route 53".
- Target hosts: `otc.wert.io`, `demo.otc.wert.io`.

## Summary

The authoritative parent zone `wert.io` (on Cloudflare: `hayes.ns.cloudflare.com`, `zariyah.ns.cloudflare.com`) delegates the child zone `otc.wert.io` to four AWS Route53 nameservers:

- `ns-846.awsdns-41.net` (205.251.195.78)
- `ns-1370.awsdns-43.org` (205.251.197.90)
- `ns-1621.awsdns-10.co.uk` (205.251.198.85)
- `ns-468.awsdns-58.com` (205.251.193.212)

All four servers answer `REFUSED` for `otc.wert.io` queries. REFUSED from a Route53 nameserver for a delegated name means the hosted zone no longer exists on AWS — the Route53 hosted zone was deleted but the delegation in the parent zone was never removed. This is the textbook condition for a Route53 hosted-zone-reclaim subdomain takeover: an attacker creates a new hosted zone in their own AWS account named `otc.wert.io`, repeatedly re-creating until AWS assigns the matching four-NS set, at which point every query for `otc.wert.io` and any name under it (including `demo.otc.wert.io`) resolves to records the attacker controls.

Historical certificate transparency records show `*.otc.wert.io` and `*.demo.otc.wert.io` certificates were issued (recon artefact `recon/dns/crtsh.json`), confirming the subdomain was in production use for the OTC trading flow and `demo.otc.wert.io` demo environment. Serving look-alike OTC-trading UI from `https://otc.wert.io/` under a legitimate TLS certificate would be indistinguishable from the real product to end users.

## Proof - exact requests and responses

### Parent zone NS set

Request:
```
GET https://dns.google/resolve?name=wert.io&type=NS
```

Response (abridged):
```json
{
  "Status": 0,
  "Answer": [
    { "name": "wert.io.", "type": 2, "data": "hayes.ns.cloudflare.com." },
    { "name": "wert.io.", "type": 2, "data": "zariyah.ns.cloudflare.com." }
  ]
}
```

### Delegation record for otc.wert.io (as stored in the Cloudflare parent zone)

Confirmed by two independent recursive resolvers (Google 8.8.8.8 and Cloudflare 1.1.1.1) returning Extended DNS Error 22 ("No Reachable Authority at delegation otc.wert.io") plus EDE 23 (REFUSED from each of the delegated nameservers). The resolver's EDE comment also enumerates the IPs the parent delegation points at: `205.251.197.90, 205.251.195.78, 205.251.193.212, 205.251.198.85`, which are precisely the IPs of `ns-846`, `ns-1370`, `ns-1621`, `ns-468` from the awsdns ranges.

Request:
```
GET https://dns.google/resolve?name=otc.wert.io&type=NS
```

Response:
```json
{
  "Status": 2,
  "Comment": "Name servers refused query (lame delegation?) [205.251.197.90, 205.251.195.78, 205.251.193.212, 205.251.198.85].",
  "extended_dns_errors": [
    {"info_code": 23, "extra_text": "[205.251.197.90] rcode=REFUSED for otc.wert.io/ns"},
    {"info_code": 23, "extra_text": "[205.251.195.78] rcode=REFUSED for otc.wert.io/ns"},
    {"info_code": 23, "extra_text": "[205.251.193.212] rcode=REFUSED for otc.wert.io/ns"},
    {"info_code": 23, "extra_text": "[205.251.198.85] rcode=REFUSED for otc.wert.io/ns"},
    {"info_code": 22, "extra_text": "At delegation otc.wert.io for otc.wert.io/ns"}
  ]
}
```

Cross-check via Cloudflare DoH:
```
GET https://cloudflare-dns.com/dns-query?name=otc.wert.io&type=NS
Accept: application/dns-json

{"Status": 2, "Comment": ["EDE(22): No Reachable Authority at delegation otc.wert.io.",
                         "EDE(23): Network Error [2600:9000:5301:d400::1]:53 returned REFUSED for otc.wert.io NS"]}
```

### Direct query to each Route53 NS (shows the hosted zone is absent)

For every one of the four nameservers, UDP queries to port 53 return `NOERROR` with empty ANSWER / AUTHORITY / ADDITIONAL for `otc.wert.io/NS` and `otc.wert.io/SOA`, and `SERVFAIL` for `otc.wert.io/A`. A Route53 nameserver that was actually serving the zone would answer authoritatively (AA=1). Zero records plus SERVFAIL on A is Route53's reply when the zone is not loaded on that server.

```
=== otc.wert.io SOA @ns-846.awsdns-41.net (205.251.195.78) ===
rcode: NOERROR  flags: QR RA  AA=False
(no ANSWER / AUTHORITY / ADDITIONAL)

=== otc.wert.io A @ns-846.awsdns-41.net (205.251.195.78) ===
rcode: SERVFAIL
```

Identical behaviour from the other three NS (`ns-1370.awsdns-43.org`, `ns-1621.awsdns-10.co.uk`, `ns-468.awsdns-58.com`); full log in `dns_probe.out` / `dns_probe3.out`.

### demo.otc.wert.io inherits the broken delegation

```
GET https://dns.google/resolve?name=demo.otc.wert.io&type=A
{
  "Status": 2,
  "Comment": "Name servers refused query (lame delegation?) [205.251.198.85, 205.251.193.212, 205.251.195.78, 205.251.197.90].",
  "extended_dns_errors":[...REFUSED for demo.otc.wert.io/a..., EDE(22) At delegation otc.wert.io for demo.otc.wert.io/a]
}
```

CT history confirms a wildcard `*.demo.otc.wert.io` cert was previously issued, so demo subdomains were in production use.

## Impact

An attacker performing the Route53 reclaim can:
1. Serve arbitrary HTTPS content under `https://otc.wert.io/` and `https://*.otc.wert.io/` using a Let's Encrypt / AWS-issued certificate that passes browser trust (DV via DNS-01 or HTTP-01 is trivial once the attacker controls the zone).
2. Host a pixel-identical clone of the Wert OTC trading page, capture wallet addresses, trade orders, API keys, KYC uploads, and 2FA codes from victims who follow a `wert.io` link from phishing emails or compromised partner sites.
3. If any production code (widget, partner iframe, docs) performs a cross-origin `postMessage` or CORS check against `*.wert.io`, the attacker-controlled origin passes it.
4. If any first-party cookie is scoped to `.wert.io` (confirmed not currently the case for landing pages but worth re-reviewing), the attacker can read/write those cookies.

For a crypto/payments platform the brand-impersonation risk alone is substantial given OTC flows move high-value tickets.

## Reproduction

1. `curl -sS 'https://dns.google/resolve?name=wert.io&type=NS'` – observe Cloudflare NS.
2. `curl -sS 'https://dns.google/resolve?name=otc.wert.io&type=NS'` – observe Status 2 (SERVFAIL), EDE 22 at delegation `otc.wert.io`, EDE 23 REFUSED from four Route53 IPs.
3. `curl -sS 'https://dns.google/resolve?name=demo.otc.wert.io&type=A'` – same error, inherited.
4. (Proof-of-condition only, per engagement rules — no AWS zone created.) Reclaim procedure would be: create `otc.wert.io` hosted zone in Route53, note assigned NS set, delete and recreate until the four NS exactly match `ns-846.awsdns-41.net`, `ns-1370.awsdns-43.org`, `ns-1621.awsdns-10.co.uk`, `ns-468.awsdns-58.com`. Documented tooling exists; feasibility is well-established in prior disclosures (Hackerone #309531, Netflix, Starbucks, Shopify among many others).

## Recommended fix

Remove the delegation entirely. In the Cloudflare dashboard for `wert.io`, delete every NS record on `otc.wert.io` (and any explicit `demo.otc.wert.io` NS or glue). If OTC functionality is still planned, re-create the hosted zone in Route53 *first*, obtain the assigned NS set, then publish a fresh delegation. Treat every live subdomain's parent delegation the same way at tear-down time: AWS Route53 hosted-zone-reclaim bugs are entirely preventable by always removing the parent NS records before deleting the hosted zone. Scanning the full zone for other dangling delegations (CNAMEs to decommissioned S3/CloudFront/Heroku/Pages origins) is recommended; the recon notes mention `cards-api-green.wert.io` as NXDOMAIN, which should also be audited for stale CNAME chains.

## Artefacts (on disk, do not persist beyond engagement)

- `/tmp/claude-0/-home-user-claude-agents/6a300877-9c0e-5acd-8f22-89625cbba3d2/scratchpad/wert-engagement/exploit/T1-takeover/doh-evidence.txt` - consolidated DoH JSON + direct-NS probe log.
- `/tmp/claude-0/-home-user-claude-agents/6a300877-9c0e-5acd-8f22-89625cbba3d2/scratchpad/wert-engagement/exploit/T1-takeover/dns_probe.out` - per-NS SOA/NS/A probe output.
- `/tmp/claude-0/-home-user-claude-agents/6a300877-9c0e-5acd-8f22-89625cbba3d2/scratchpad/wert-engagement/exploit/T1-takeover/dns_probe3.out` - parent-delegation probe output.
