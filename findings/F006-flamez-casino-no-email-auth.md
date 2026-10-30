# F006 - flamez.casino and berriez.casino Missing All Email Authentication

## Summary
Two active Rootz casino domains (flamez.casino and berriez.casino) have no SPF, no DMARC, and no DKIM records. While they have no MX records (reducing direct email spoofing impact), the domains can still be used as forged From: addresses in phishing campaigns.

## Classification
- **Severity**: MEDIUM
- **CVSS 3.1**: 5.0 (AV:N/AC:L/PR:N/UI:N/S:C/C:N/I:L/A:N)
- **OWASP Category**: Security Misconfiguration
- **CWE**: CWE-290 (Authentication Bypass by Spoofing)

## Affected Domains

### flamez.casino
- A records: 104.21.50.79, 172.67.159.121 (Cloudflare)
- NS: etta/jim.ns.cloudflare.com (confirmed Rootz)
- MX: NONE
- SPF: NONE
- DMARC: NXDOMAIN for _dmarc.flamez.casino
- Active casino site: redirects to www.flamez.casino/fi

### berriez.casino
- A record: 185.158.133.1
- NS: lilith/ram.ns.cloudflare.com (Cloudflare, different account)
- MX: NONE
- SPF: NONE
- DMARC: NONE
- Active casino site: "Berriez Casino Canada" (200 OK)
- Also missing: Content-Security-Policy, X-Frame-Options

## Additionally: megagewinn.com
- Cloudflare NS (etta/jim), confirmed Rootz domain
- No SPF, No DMARC (NXDOMAIN), No MX
- Redirects to www.megagewinn.com (likely inactive brand)

## Proving Evidence
```
DNS TXT flamez.casino: only google-site-verification record, no SPF
DNS TXT _dmarc.flamez.casino: NXDOMAIN (Status: 3)
DNS MX flamez.casino: no records

DNS TXT berriez.casino: only google-site-verification record, no SPF
DNS TXT _dmarc.berriez.casino: no records (Status: 0)
DNS MX berriez.casino: no records
```

## Impact
- Domains can be used as spoofed From: addresses in phishing emails
- No receiving mail server can validate the sender
- Lower impact than F001-F003 because no legitimate email infrastructure exists on these domains

## Remediation
Add null SPF and DMARC reject records to prevent domain abuse:
- SPF: `v=spf1 -all` (no authorized senders)
- DMARC: `v=DMARC1; p=reject; pct=100`
