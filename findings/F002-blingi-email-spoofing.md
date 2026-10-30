# F002 - Email Spoofing on blingi.com

## Summary
The blingi.com casino domain has no SPF record and its DMARC policy is set to p=none (monitoring only), allowing any attacker to send spoofed emails from this domain that will be delivered to recipients.

## Classification
- **Severity**: HIGH
- **CVSS 3.1**: 7.4 (AV:N/AC:L/PR:N/UI:R/S:C/C:N/I:H/A:N)
- **OWASP Category**: Security Misconfiguration
- **CWE**: CWE-290 (Authentication Bypass by Spoofing)

## Endpoint
- Domain: blingi.com
- DNS records: _dmarc.blingi.com, blingi.com TXT, blingi.com MX

## Impact
An attacker can send phishing emails appearing to originate from blingi.com (e.g., support@blingi.com) to casino customers. For a casino handling real money transactions and customer PII, this enables credential phishing, account takeover, financial fraud, and reputational damage.

## Proving Request and Response

### 1. SPF Check (No Record)
```
Request: DNS TXT query for blingi.com
Via: https://dns.google/resolve?name=blingi.com&type=TXT

Response:
[
  {"name": "blingi.com.", "type": 16, "TTL": 300, "data": "google-site-verification=vYJEbNjILngESiyApAMHgoLKgVd4hJ0e8aH6noqHBCo"},
  {"name": "blingi.com.", "type": 16, "TTL": 300, "data": "google-site-verification=fTzM6KzOBUrUNQ9pH1uBaSb_2oyDiPFKqFmQKR41FfY"}
]

Result: NO SPF RECORD. SPF evaluation returns "none" for any sender IP.
```

### 2. DMARC Check (p=none)
```
Request: DNS TXT query for _dmarc.blingi.com
Via: https://dns.google/resolve?name=_dmarc.blingi.com&type=TXT

Response:
[
  {"name": "_dmarc.blingi.com.", "type": 16, "TTL": 300, "data": "v=DMARC1; p=none; rua=mailto:dmarc_agg@vali.email"}
]

Result: DMARC policy is p=none. Spoofed emails are logged but NOT rejected or quarantined.
```

### 3. Active Email Infrastructure (MX exists)
```
Request: DNS MX query for blingi.com
Via: https://dns.google/resolve?name=blingi.com&type=MX

Response:
[
  {"name": "blingi.com.", "type": 15, "TTL": 300, "data": "1 smtp.google.com."}
]

Result: Active mail exchange confirms the domain is used for email.
```

## Remediation
1. Add SPF record: `v=spf1 include:_spf.google.com include:mail.zendesk.com -all`
2. Change DMARC policy to reject: `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc_agg@vali.email`
