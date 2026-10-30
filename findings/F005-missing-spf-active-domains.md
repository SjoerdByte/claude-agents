# F005 - Missing SPF Records on 7 Active Casino Domains with MX

## Summary
Seven Rootz casino domains with active mail exchange (MX) records have no SPF record configured, meaning receiving mail servers cannot verify whether a sender is authorized.

## Classification
- **Severity**: MEDIUM (individually LOW due to DMARC p=reject mitigation on 5 of 7, but HIGH on 2 -- see F001, F002)
- **CVSS 3.1**: 5.8 (AV:N/AC:L/PR:N/UI:N/S:C/C:N/I:L/A:N)
- **OWASP Category**: Security Misconfiguration
- **CWE**: CWE-290 (Authentication Bypass by Spoofing)

## Affected Domains
| Domain | MX | DMARC | Risk |
|--------|-----|-------|------|
| beazt.com | smtp.google.com | p=none | **CRITICAL** (F001) |
| blingi.com | smtp.google.com | p=none | **CRITICAL** (F002) |
| flamez.com | smtp.google.com | p=reject | Mitigated |
| berriez.com | smtp.google.com | p=reject | Mitigated |
| speedz.com | smtp.google.com | p=reject | Mitigated |
| tuplaus.com | smtp.google.com | p=reject | Mitigated |

## Proving Evidence
DNS TXT queries for each domain return only google-site-verification records; no v=spf1 record exists.

All domains have active DKIM (google._domainkey) and MX (smtp.google.com), confirming they are actively used for email via Google Workspace.

## Remediation
Add SPF records to all domains. Recommended:
`v=spf1 include:_spf.google.com include:mail.zendesk.com -all`
