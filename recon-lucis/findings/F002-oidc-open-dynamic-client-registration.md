# F002 - Open OIDC Dynamic Client Registration

## Summary
The OIDC dynamic client registration endpoint at `POST https://api.lucis.life/oidc/register` is open to unauthenticated requests. Any anonymous caller can register an arbitrary number of OAuth 2.0 / OIDC clients without authentication or rate limiting. Registered clients persist and cannot be deleted by the registrant.

## Classification
- **Severity**: Medium
- **CVSS 3.1**: 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L)
- **OWASP**: A07:2021 Identification and Authentication Failures
- **CWE**: CWE-287 (Improper Authentication), CWE-770 (Allocation of Resources Without Limits)

## Endpoint
- **URL**: `POST https://api.lucis.life/oidc/register`
- **Method**: POST
- **Authentication**: None required

## Impact
1. **Resource exhaustion**: Unlimited client registrations pollute the OIDC client database. Clients cannot be deleted via the API.
2. **OAuth flow abuse**: Registered clients can be used to craft authorization URLs. A user clicking such a link would be directed through the Lucis sign-in flow and, upon completion, have an authorization code issued to the client's callback.
3. **Potential SSRF**: The registration endpoint accepts metadata URIs (logo_uri, client_uri, sector_identifier_uri) pointing to internal addresses. If the server fetches these (e.g., for consent page rendering), this could enable SSRF. (Unconfirmed -- accepted but not observed to trigger fetches.)

## Mitigating Factors
- Redirect URIs are restricted to loopback addresses only (localhost, 127.0.0.1, [::1]).
- Granted scope is always downgraded to `openid` only (profile, email, address removed).
- Grant type is always downgraded to `authorization_code` only (client_credentials removed).
- Token endpoint auth method is forced to `none`.

## Reproduction

### Step 1: Discover the registration endpoint
```
GET https://api.lucis.life/.well-known/openid-configuration
```
Response includes: `"registration_endpoint":"https://api.lucis.life/oidc/register"`

### Step 2: Register a client (no authentication)
```
POST https://api.lucis.life/oidc/register
Content-Type: application/json

{
  "client_name": "SecurityTest",
  "redirect_uris": ["http://localhost:8080/callback"],
  "grant_types": ["authorization_code", "client_credentials"],
  "response_types": ["code"],
  "scope": "openid profile email address"
}
```

### Response (HTTP 201):
```json
{
  "client_id": "55ed8716-a1e2-4134-91de-135f667111c6",
  "client_id_issued_at": 1793301545,
  "client_name": "SecurityTest",
  "redirect_uris": ["http://localhost:8080/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "openid"
}
```

### Step 3: Verify client is functional in authorization flow
```
GET https://app.lucis.life/oidc/authorize/?response_type=code&client_id=55ed8716-a1e2-4134-91de-135f667111c6&redirect_uri=http://localhost:8080/callback&scope=openid&state=test123
```
Response: HTTP 307 redirect to Clerk sign-in page (authorization flow initiated).

### Step 4: Verify client cannot be deleted
```
DELETE https://api.lucis.life/oidc/register/55ed8716-a1e2-4134-91de-135f667111c6
```
Response: HTTP 404 (no delete endpoint available).

## Recommendation
- Require authentication (e.g., an admin API key or specific OAuth scope) to access the registration endpoint.
- Implement rate limiting on client registration.
- Add a management API for registered clients (read, update, delete).
- Consider restricting or removing the dynamic registration endpoint if it is not needed for the application's use case.
