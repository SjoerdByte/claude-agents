# F001 - Email Spoofing on beazt.com

## Summary
The beazt.com casino domain has no SPF record and its DMARC policy is set to p=none (monitoring only), allowing any attacker to send spoofed emails from this domain that will be delivered to recipients.

## Classification
- **Severity**: HIGH
- **CVSS 3.1**: 7.4 (AV:N/AC:L/PR:N/UI:R/S:C/C:N/I:H/A:N)
- **OWASP Category**: Security Misconfiguration
- **CWE**: CWE-290 (Authentication Bypass by Spoofing)

## Endpoint
- Domain: beazt.com
- DNS records: _dmarc.beazt.com, beazt.com TXT, beazt.com MX

## Impact
An attacker can send phishing emails appearing to originate from beazt.com (e.g., support@beazt.com, noreply@beazt.com) to casino customers. For a casino handling real money transactions and customer PII, this enables:
- Credential phishing targeting casino players
- Social engineering for account takeover
- Financial fraud via fake deposit/withdrawal notifications
- Reputational damage to the Beazt brand

## Proving Request and Response

### 1. SPF Check (No Record)
```
Request: DNS TXT query for beazt.com
Via: https://dns.google/resolve?name=beazt.com&type=TXT

Response:
[
  {"name": "beazt.com.", "type": 16, "TTL": 300, "data": "google-site-verification=kifNb1sr9_5jfUu0O4ZL7J42ANZt_RBUlrIeDQMtNI4"},
  {"name": "beazt.com.", "type": 16, "TTL": 300, "data": "google-site-verification=tEUq3FOE7WwjHHnq12ZuPROwXxRbFmApPmmcyXp4FzI"}
]

Result: NO SPF RECORD. SPF evaluation returns "none" for any sender IP.
```

### 2. DMARC Check (p=none)
```
Request: DNS TXT query for _dmarc.beazt.com
Via: https://dns.google/resolve?name=_dmarc.beazt.com&type=TXT

Response:
[
  {"name": "_dmarc.beazt.com.", "type": 16, "TTL": 300, "data": "v=DMARC1; p=none; rua=mailto:dmarc_agg@vali.email"}
]

Result: DMARC policy is p=none. Spoofed emails are logged but NOT rejected or quarantined.
```

### 3. Active Email Infrastructure (MX exists)
```
Request: DNS MX query for beazt.com
Via: https://dns.google/resolve?name=beazt.com&type=MX

Response:
[
  {"name": "beazt.com.", "type": 15, "TTL": 300, "data": "1 smtp.google.com."}
]

Result: Active mail exchange confirms the domain is used for email.
```

### 4. DKIM Present (but irrelevant without DMARC enforcement)
```
Request: DNS TXT query for google._domainkey.beazt.com
Response: DKIM RSA public key found (v=DKIM1;k=rsa;p=MIIBIjAN...)

Result: DKIM is configured for legitimate Google Workspace emails, but since DMARC p=none, 
spoofed emails that fail DKIM are still delivered.
```

## Attack Scenario
1. Attacker crafts email with From: support@beazt.com
2. Receiving mail server checks SPF -> returns "none" (no SPF record)
3. Receiving mail server checks DKIM -> fails (attacker has no private key)
4. Receiving mail server checks DMARC -> p=none, takes no action
5. Email is delivered to victim's inbox

## Remediation
1. Add SPF record: `v=spf1 include:_spf.google.com include:mail.zendesk.com -all`
2. Change DMARC policy to reject: `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc_agg@vali.email`
