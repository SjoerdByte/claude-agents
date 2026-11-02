# F001 - Internal AWS infrastructure disclosure via public DNS (mcp-cell.amenitiz.io)

- Endpoint: `mcp-cell.amenitiz.io` (authoritative DNS record)
- Method: DNS A/CNAME query (public resolvers)
- Severity: Low (informational / recon aid)
- CVSS: 3.1 `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` = 5.3 base. Real-world impact is informational: it exposes internal topology but no data directly. Scored conservatively as Low; noting the uncertainty explicitly per CLAUDE.md.
- OWASP: A05:2021 Security Misconfiguration (also A01 Information Exposure)

## Impact
The public DNS record for `mcp-cell.amenitiz.io` is a CNAME to an **internal** AWS
ELB and resolves to RFC1918 private addresses. This publishes internal network
topology to the Internet:
- Internal ELB hostname: `internal-mcp-cell-prod-hrq-1061626730.eu-west-3.elb.amazonaws.com`
- Private IPs: `10.91.10.9`, `10.91.58.106`
- AWS region: `eu-west-3`, internal subnet range `10.91.0.0/16`, environment tag `prod`

This defeats the purpose of fronting services with Cloudflare (origin/topology
hiding) and aids an attacker who gains any foothold in the VPC or a SSRF primitive
elsewhere (known internal target + subnet). It explains the earlier 502 on the
host: the ELB is internal and unreachable from the Internet.

Not a subdomain takeover: the CNAME target is an AWS-owned internal ELB, not a
claimable third-party resource.

## Proving request and response

Request (Google public resolver, DoH; answer served by Route53 authoritative
205.251.193.244):
```
GET https://dns.google/resolve?name=mcp-cell.amenitiz.io&type=A
```
Response (trimmed to the relevant answer):
```json
{
  "Status": 0,
  "Question": [{"name": "mcp-cell.amenitiz.io.", "type": 1}],
  "Answer": [
    {"name": "mcp-cell.amenitiz.io.", "type": 5, "TTL": 121,
     "data": "internal-mcp-cell-prod-hrq-1061626730.eu-west-3.elb.amazonaws.com."},
    {"name": "internal-mcp-cell-prod-hrq-1061626730.eu-west-3.elb.amazonaws.com.",
     "type": 1, "TTL": 60, "data": "10.91.10.9"},
    {"name": "internal-mcp-cell-prod-hrq-1061626730.eu-west-3.elb.amazonaws.com.",
     "type": 1, "TTL": 60, "data": "10.91.58.106"}
  ],
  "Comment": "Response from 205.251.193.244."
}
```

Cross-checked against Cloudflare (1.1.1.1) DoH, identical answer:
```
GET https://cloudflare-dns.com/dns-query?name=mcp-cell.amenitiz.io&type=A
Accept: application/dns-json
-> CNAME internal-mcp-cell-prod-hrq-1061626730.eu-west-3.elb.amazonaws.com
-> A 10.91.58.106 / 10.91.10.9
```

## Remediation
Point `mcp-cell.amenitiz.io` at an internal-only private DNS zone (Route53 private
hosted zone) instead of the public zone, or remove the public record. Do not expose
`internal-*.elb.amazonaws.com` targets or RFC1918 addresses in public DNS.
