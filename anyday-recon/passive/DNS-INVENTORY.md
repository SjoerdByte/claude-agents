# Passive DNS inventory — anyday.io

Source: Google DNS over HTTPS (dns.google) + hackertarget.com hostsearch + subdomain.center. All passive, no active probing to anyday hosts.
Date: 2026-10-09

## Authoritative DNS
`anyday.io` zone is served by Microsoft Azure DNS (ns1-01.azure-dns.com, azuredns-hostmaster.microsoft.com).
Hostmaster = Microsoft. DNS is NOT on the same cloud as most workloads (which are mostly AWS eu-north-1).

## LIVE subdomains (39 confirmed via DoH)

### Core API (eu-north-1 / Stockholm, AWS)
| Host | Target | Notes |
|---|---|---|
| api.anyday.io | anyday-prd-backend-corewebapi-387709868.eu-north-1.elb.amazonaws.com | Core Web API |
| api2.anyday.io | SAME ELB as api.anyday.io | api2 is an alias for the same backend |

### Shopify integration (AWS, SPLIT REGION)
| Host | Target | Region | Notes |
|---|---|---|---|
| connect.anyday.io | anyday-prd-shopify-alb-1577860503.eu-north-1.elb.amazonaws.com | eu-north-1 | Prod Shopify ALB |
| s.connect.anyday.io | anyday-prd-shopify-mtls-alb-1810572842.eu-north-1.elb.amazonaws.com | eu-north-1 | Prod Shopify **mTLS** |
| shopify.staging.anyday.io | anyday-dev-shopify-alb-303371972.ap-southeast-1.elb.amazonaws.com | **ap-southeast-1** | Dev/staging Shopify ALB — SINGAPORE |
| s.shopify.staging.anyday.io | anyday-dev-shopify-mtls-alb-2102534995.ap-southeast-1.elb.amazonaws.com | ap-southeast-1 | Dev/staging mTLS, Singapore |

Note: prod runs on eu-north-1 (Stockholm) but staging on ap-southeast-1 (Singapore). Regional data-residency inconsistency worth noting if PII is involved.

### Admin / user portals (CloudFront fronts; each env a separate distribution)
| Host | Target | Env |
|---|---|---|
| admin.anyday.io | d39z8786ntahj1.cloudfront.net | prod |
| admin.sandbox.anyday.io | d1lxm0uigen8fw.cloudfront.net | sandbox |
| admin.staging.anyday.io | dzypcfazatamw.cloudfront.net | staging |
| my.anyday.io | d1i8wvrrwewg3y.cloudfront.net | prod |
| my.staging.anyday.io | d1nosqo28e2y07.cloudfront.net | staging |
| portal.anyday.io | d3re0a5qkg6u1h.cloudfront.net | — |
| assets.anyday.io | d2dgwu29m9644q.cloudfront.net | static assets |

### Internal / services tier (Azure UK South, shared IP)
| Host | Target | Notes |
|---|---|---|
| hangfire.services.internal.anyday.io | 51.104.136.9 | Hangfire = .NET job scheduler, UI often has /hangfire/* dashboard. SAME IP as below. |
| marqeta.services.anyday.io | 51.104.136.9 | **Shares IP with hangfire** — same Azure VM / vhost confusion / lateral. |
| sftp.marqeta.services.anyday.io | sftp-marqeta-services.northeurope.cloudapp.azure.com | Azure NE SFTP, Marqeta sync |
| metabase.internal.anyday.io | anyday-prd-metabase-308502671.eu-north-1.elb.amazonaws.com | Metabase BI, AWS ELB |
| grafana.anyday.io | internal-anyday-prd-backend-grafana-1697027106.eu-north-1.elb.amazonaws.com | **Internal ELB** with public DNS entry |
| sqlproxy-nordiska.anyday.io | 13.63.25.203 | Azure IP, SQL proxy for "Nordiska" (BNPL partner / dataset name) |

### Danish hosted trio (same IP, probably Simply.com or similar DK registrar)
| Host | Target |
|---|---|
| ftp.anyday.io | 5.254.55.36 |
| webmail.anyday.io | 5.254.55.36 |
| m.anyday.io | 5.254.55.36 |

### Webhooks & inbound (AWS API Gateway, eu-north-1)
| Host | Target |
|---|---|
| webhooks.anyday.io | d-2wvmeuedgb.execute-api.eu-north-1.amazonaws.com |
| sendgrid.anyday.io | d-wv3fmp3mhf.execute-api.eu-north-1.amazonaws.com |

### Marketing / third-party SaaS (out of scope for exploit, but tech signals)
| Host | Target | Service |
|---|---|---|
| www.anyday.io | cdn.webflow.com | Webflow (marketing CMS) |
| help.anyday.io | anyday.elevio.help | Elevio |
| developer.anyday.io | ssl.readmessl.com | ReadMe.io docs |
| da.anyday.io | websites.weglot.com | Weglot translations |
| email.anyday.io | e-trk-eu.customeriomail.com | Customer.io |
| email.staging.anyday.io | e-trk-eu.customeriomail.com | Customer.io |
| go.anyday.io | cname.sibpages.com | Sendinblue/Brevo landing pages |
| qr.anyday.io | cname.dub.co | Dub.co link shortener |
| status.anyday.io | stats.uptimerobot.com | UptimeRobot status |
| submit.anyday.io | cname.tally.so | Tally forms |

### Oddities
| Host | Target | Note |
|---|---|---|
| localhost.anyday.io | 127.0.0.1 | **Public A record pointing at loopback.** Classic for client-side OAuth loopback dev flows, but potential DNS-rebinding / cookie-scope exploitation vector. |
| anyday.io (apex) | 198.202.211.1 | Pair.com / webflow redirect handler |
| ichnaea.anyday.io | 20.223.60.248 | Mozilla Ichnaea = geolocation service; private build? |
| vpn.anyday.io | 20.166.75.195 | Azure, likely corp VPN termination |
| cdn.anyday.io | anydaycdn-cdbhg3g6b0d3fgcm.z01.azurefd.net | Azure Front Door (not CloudFront) |

## DEAD / NXDOMAIN in the user's starting list (48 hosts)
These were in the user-provided scope list but do NOT resolve. Either decommissioned, internal-DNS-only, or aspirational.

### All *.pay.anyday.io
admin.pay.anyday.io, admin.pay.sandbox.anyday.io, api.pay.anyday.io, api.pay.sandbox.anyday.io, apple-pay.pay.anyday.io, apple-pay.pay.sandbox.anyday.io, google-pay.pay.anyday.io, google-pay.pay.sandbox.anyday.io, merchant.pay.anyday.io, merchant.pay.sandbox.anyday.io, mobilepay.pay.anyday.io, mobilepay.pay.sandbox.anyday.io, tokens.pay.anyday.io, tokens.pay.sandbox.anyday.io, pay.anyday.io, pay.sandbox.anyday.io
→ Entire `pay.anyday.io` namespace is NXDOMAIN as of today. This is unusual given the extensive wallet-integration naming. Likely either (a) decommissioned entirely, (b) moved to a separate zone, or (c) only resolvable via split-horizon DNS.

### Other dead
clearhaus-sync.services.anyday.io, ftp.staging.anyday.io, helpdesk.anyday.io, internal.anyday.io, localhost.staging.anyday.io, metabase-copy.internal.anyday.io, metabase-v2.internal.anyday.io, posthog-dev.anyday.io, sandbox.anyday.io, services.anyday.io, services.internal.anyday.io, shop.anyday.io, staging.anyday.io, www.shop.anyday.io, www.staging.anyday.io

### Subdomain.center hallucinations (all NXDOMAIN under both direct and DoH)
admini.pay.sandbox.anyday.io, admino.pay.anyday.io, apiu.anyday.io, developerq.anyday.io, google-payy.pay.sandbox.anyday.io, hangfirea.services.internal.anyday.io, helpdeskg.anyday.io, metabasea.internal.anyday.io, qa1-9.staging.anyday.io, sftpc.marqeta.services.anyday.io, web-dev.anyday.io

Treat subdomain.center output as low-confidence; it appears to generate typo-variants without validating resolution.

## Immediate attack-surface threads (passive-DNS only, un-probed)

1. **Dual-region split (ap-southeast-1 staging vs eu-north-1 prod)** — if a staging Shopify integration leaks keys or a tenant map, data residency may actually be in Singapore. GDPR-relevant.
2. **hangfire + marqeta sharing IP 51.104.136.9** — same Azure VM, likely vhost-based routing. Request to one vhost that lands on the other = direct lateral. Known-public: Hangfire default UI at `/hangfire` is often misconfigured auth, exposing job history, serialized args, and sometimes connection strings. Marqeta API endpoints on the same host could be reached by Host-header manipulation.
3. **grafana.anyday.io → internal-* ELB** — the DNS record is public and the target CNAME contains the string "internal", meaning either (a) the ELB is misconfigured as internal + public DNS leaked, or (b) the ELB is reachable from the public internet despite being named "internal". Grafana itself has had a history of auth bypasses (CVE-2022-32275, CVE-2024-9264). Must be probed in exploit phase.
4. **localhost.anyday.io → 127.0.0.1** — if any anyday service accepts this hostname as a trusted origin (via Origin header validation, cookie domain, CSP, or OAuth redirect allowlist), a victim's browser can be made to issue a request against `http://localhost.anyday.io:<port>` which routes to the victim's own machine. Combined with any dev tool listening locally (editor extensions, package managers), this is an SSRF-against-self / privilege-escalation vector.
5. **sqlproxy-nordiska.anyday.io exposes "Nordiska"** — reveals internal product/dataset codename. "Nordiska" also appears in substack-recon's prior findings. Worth checking GitHub for repos matching nordiska.
6. **Azure Front Door for cdn.anyday.io but CloudFront for every portal** — mixed CDN posture. Portal CloudFront distributions are each independently addressable (d39z8786ntahj1, d1i8wvrrwewg3y, dzypcfazatamw, d1nosqo28e2y07, d1lxm0uigen8fw, d3re0a5qkg6u1h, d2dgwu29m9644q) — all seven can be probed for direct-host enumeration and origin discovery.
7. **AWS API Gateway custom domain IDs leaked (d-wv3fmp3mhf, d-2wvmeuedgb)** — these are the "d-xxxxxxxxxx" API Gateway custom-domain names; the stage mapping and underlying API resources may be enumerable.
