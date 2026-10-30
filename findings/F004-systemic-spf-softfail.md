# F004 - Systemic SPF Softfail (~all) Across 8 Rootz Casino Domains

## Summary
Eight Rootz casino domains use SPF ~all (softfail) instead of -all (hard fail). While most are mitigated by DMARC p=reject, this represents a defense-in-depth failure across the organization's email infrastructure.

## Classification
- **Severity**: MEDIUM
- **CVSS 3.1**: 5.8 (AV:N/AC:L/PR:N/UI:N/S:C/C:N/I:L/A:N)
- **OWASP Category**: Security Misconfiguration
- **CWE**: CWE-290 (Authentication Bypass by Spoofing)

## Affected Domains
| Domain | SPF | DMARC | Risk Level |
|--------|-----|-------|------------|
| wheelz.com | ~all | p=reject | Mitigated |
| wildz.com | ~all | p=reject | Mitigated |
| caxino.com | ~all | p=reject | Mitigated |
| spinz.com | ~all | p=reject | Mitigated |
| chipz.com | ~all | p=reject | Mitigated |
| wheelzgames.de | ~all | p=none | **CRITICAL** (see F003) |
| wildz.de | ~all | p=reject | Mitigated |
| spinz.de | ~all | p=reject | Mitigated |

## Impact
- Mail servers that do not implement DMARC will treat SPF softfail as non-authoritative, potentially delivering spoofed emails
- Defense in depth is weakened: if DMARC is ever misconfigured or removed, all domains become immediately spoofable
- wheelzgames.de with ~all AND p=none is directly exploitable (see F003)

## Proving Evidence
```
wheelz.com TXT: "v=spf1 include:mail.zendesk.com include:_spf.google.com ~all"
wildz.com TXT: "v=spf1 ip4:52.49.40.207 include:_spf.google.com include:mail.zendesk.com include:_spf.atlassian.net include:eu.mailgun.org ~all"
caxino.com TXT: "v=spf1 include:_spf.atlassian.net include:mail.zendesk.com include:_spf.google.com ~all"
spinz.com TXT: "v=spf1 ip4:52.49.40.207 include:_spf.google.com include:mail.zendesk.com include:_spf.atlassian.net include:eu.mailgun.org ~all"
chipz.com TXT: "v=spf1 ip4:52.49.40.207 include:_spf.google.com include:mail.zendesk.com include:_spf.atlassian.net include:eu.mailgun.org ~all"
wheelzgames.de TXT: "v=spf1 ip4:52.49.40.207 include:_spf.google.com include:mail.zendesk.com include:_spf.atlassian.net include:eu.mailgun.org ~all"
wildz.de TXT: "v=spf1 ip4:52.49.40.207 include:_spf.google.com include:mail.zendesk.com include:_spf.atlassian.net include:eu.mailgun.org ~all"
spinz.de TXT: "v=spf1 ip4:52.49.40.207 include:_spf.google.com include:mail.zendesk.com include:_spf.atlassian.net include:eu.mailgun.org ~all"
```

## Remediation
Change ~all to -all on all SPF records across all domains.
