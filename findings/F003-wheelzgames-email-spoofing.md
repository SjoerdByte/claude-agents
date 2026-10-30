# F003 - Email Spoofing on wheelzgames.de

## Summary
The wheelzgames.de casino domain uses SPF ~all (softfail, not reject) and its DMARC policy is set to p=none (monitoring only), allowing any attacker to send spoofed emails from this domain that will be delivered to recipients.

## Classification
- **Severity**: HIGH
- **CVSS 3.1**: 7.4 (AV:N/AC:L/PR:N/UI:R/S:C/C:N/I:H/A:N)
- **OWASP Category**: Security Misconfiguration
- **CWE**: CWE-290 (Authentication Bypass by Spoofing)

## Endpoint
- Domain: wheelzgames.de
- DNS records: _dmarc.wheelzgames.de, wheelzgames.de TXT, wheelzgames.de MX

## Impact
An attacker can send phishing emails appearing to originate from wheelzgames.de to German casino customers. SPF softfail combined with DMARC p=none means most mail servers will deliver the spoofed email. This enables credential phishing, account takeover, and financial fraud.

## Proving Request and Response

### 1. SPF Check (Softfail ~all)
```
Request: DNS TXT query for wheelzgames.de
Via: https://dns.google/resolve?name=wheelzgames.de&type=TXT

Response includes:
{"name": "wheelzgames.de.", "type": 16, "TTL": 300, "data": "v=spf1 ip4:52.49.40.207 include:_spf.google.com include:mail.zendesk.com include:_spf.atlassian.net include:eu.mailgun.org ~all"}

Result: SPF uses ~all (softfail) instead of -all (hard fail). 
Unauthorized senders get softfail, not reject.
```

### 2. DMARC Check (p=none)
```
Request: DNS TXT query for _dmarc.wheelzgames.de
Via: https://dns.google/resolve?name=_dmarc.wheelzgames.de&type=TXT

Response:
[
  {"name": "_dmarc.wheelzgames.de.", "type": 16, "TTL": 300, "data": "v=DMARC1; p=none; rua=mailto:dmarc_agg@vali.email"}
]

Result: DMARC policy is p=none. Spoofed emails are logged but NOT rejected or quarantined.
```

### 3. Active Email Infrastructure (MX exists)
```
Request: DNS MX query for wheelzgames.de
Via: https://dns.google/resolve?name=wheelzgames.de&type=MX

Response:
[
  {"name": "wheelzgames.de.", "type": 15, "TTL": 300, "data": "10 smtp.google.com."}
]

Result: Active mail exchange confirms the domain is used for email.
```

## Remediation
1. Change SPF from ~all to -all: `v=spf1 ip4:52.49.40.207 include:_spf.google.com include:mail.zendesk.com include:_spf.atlassian.net include:eu.mailgun.org -all`
2. Change DMARC policy to reject: `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc_agg@vali.email`
