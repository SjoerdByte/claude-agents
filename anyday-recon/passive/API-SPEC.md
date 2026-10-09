# Anyday Order API — recovered OpenAPI spec
Source: developer.anyday.io (ReadMe.io-hosted) markdown pages scraped 2026-10-09
All raw markdown saved under `passive/developer-docs/`.

## Server
`https://my.anyday.io` — "Main (production) server" per every OpenAPI block

Backend namespaces visible in OpenAPI `components.schemas` all begin with `Anyday.Split.*`:
- `Anyday.Split.ServiceContracts.OrderAPI.*`
- `Anyday.Split.ServiceContracts.WebshopAPI.*`
- `Anyday.Split.ServiceContracts.LoginAPI.*`
- `Anyday.Split.Core.CQS.Base.*` (CommandError, ErrorCode, ICommandResult, SuccessCode — CQS pattern)
- `Microsoft.AspNetCore.Mvc.ProblemDetails` (RFC 7807 problem+json)

Confirms backend: ASP.NET Core, CQS architecture, product name "Anyday Split" (BNPL).

Security scheme: HTTP Bearer JWT.

## Endpoints

### 1. POST /api/v1/authentication/login (merchant login)
Body: `{"Username": "<email>", "Password": "<password>"}`
Response: `{"accessToken": "<jwt>"}`
Tag: "Webshop"
Responses: 200, 401
Note: the login response's accessToken is used as Authorization: Bearer in subsequent calls.

### 2. GET /api/v1/webshop/mine (list merchant's own webshops)
Auth: Bearer JWT
Response: `{"data": [ExternalWebshopDto], "errors": [string]}` where ExternalWebshopDto:
- id (uuid)
- name
- url (merchant website)
- apiKey (JWT, HS256; see note below)
- testAPIKey (JWT, HS256)
- priceTagToken (32-char hex, public widget token)
- privateKey (HMAC secret for callback signing)
- readyToTransact (bool)

Example API Key (from docs, labeled "example"): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVGhpcyBpcyBhbiBleGFtcGxlIEFQSSBLZXkiLCJpYXQiOjE1MTYyMzkwMjJ9.37HtB6sDt8fiaZR-NLzb6qtlMtXTsxwBpcbjKXkuG1Y`
Decoded header: `{"alg":"HS256","typ":"JWT"}`
Decoded payload: `{"name":"This is an example API Key","iat":1516239022}`
Key fingerprint: HS256, flat payload with `name` and `iat`.

**Threads:**
- IDOR: can a Bearer token for merchant A list merchant B's webshops?
- Mass-assignment: can PATCH/PUT reach this endpoint and change `readyToTransact` or `url`?
- Private-key leak: a successful IDOR here leaks every victim merchant's privateKey, which forges callbacks → cross-merchant financial fraud.

### 3. POST /api/v1/orders (create / authorize order)
Auth: Bearer JWT (webshop apiKey or testAPIKey as JWT)
Body: `Anyday.Split.ServiceContracts.OrderAPI.AuthorizeOrderBody`
Required: Amount, CancelRedirectUrl, Currency, OrderId, SuccessRedirectUrl
Optional:
- `callbackUrl` (string) — Anyday server fetches this URL on auth/cancel/capture/refund events. Retry: up to 10 attempts over 12 hours. **SSRF primitive if unvalidated.**
- `successRedirectUrl` / `cancelRedirectUrl` / `returnUrl` / `refererUrl` — customer-facing redirects. **Open-redirect candidates.**
- `webshopId` (uuid) — "Choose the webshop from ID (Will ignore referrer)". **IDOR primitive: create orders on another merchant's webshop ID with your own Bearer token.**
- `internalQrCodeId` (uuid) — Anyday QR code generated backoffice. **Enumeration / cross-tenant pivot.**
- `externalQrCodeId` (string) — arbitrary external QR id. **Mass-assignment risk.**
- `externalUserId` (string) — "The user who created the order, intended for in-store purchases." **Impersonation risk if backend trusts this.**
- `source` (string) — order source tag.

Response: `AuthorizeOrderResponse` with:
- checkoutUrl / authorizeUrl pointing at `https://my.anyday[.io]/api/v1/internal/checkout/begin?checkoutId=<uuid>`
- purchaseOrderId (uuid)
- errorMessage / errorCode

Supported currency per docs: `"only supports DKK for now"`

**Threads:**
- SSRF via callbackUrl → test `http://169.254.169.254/latest/meta-data/`, `http://localhost.anyday.io:*`, `http://127.0.0.1:*`, Hangfire internal
- Open redirect via successRedirectUrl → phishing
- IDOR via webshopId → create orders for another merchant
- QR-code enumeration via internalQrCodeId
- Impersonation via externalUserId / externalQrCodeId

### 4. POST /api/v1/orders/{purchaseOrderId}/capture
Body: `CapturePaymentBody` (amount)
Response: `CapturePaymentResponse` with status + errorCode enum (see below)
Partial captures supported.

### 5. POST /api/v1/orders/{purchaseOrderId}/refund
Body: `RefundPaymentBody` (amount)
Response: `RefundPaymentResponse`
Partial refunds supported.
Note: "Refunds can be in full or a partial amount of the captured amount."

### 6. POST /api/v1/orders/{purchaseOrderId}/cancel
Response: `CancelPaymentResponse`
Cancels authorized-but-not-captured amount.

### 7. GET /api/v1/orders
Documented in the integration guide (plugin code shows `GET /api/v1/orders?id={transaction}`). Not individually spec'd in the OpenAPI block but confirmed via code sample.

### 8. GET /api/v1/orders/{id} (get-order.md)
Returns full purchase order details. 761 lines of OpenAPI schema — review this one in depth before testing.

## PaymentErrorCode enum (recovered)
```
0  = noError
1  = typeMissMatch
2  = unexpected
3  = notAuthorized
4  = notFound
5  = notCaptured
6  = alreadyCancelled
7  = alreadyRefunded
8  = alreadyCaptured
9  = exceedsAuthorizedAmount
10 = exceedsOrderAmount
11 = refundWindowClosed
12 = exceedsCaptureAmount
13 = resourceLocked
14 = authorizationExpired
15 = firstCaptureBellowMin
16 = unapturedRemainderTooSmall
17 = virtualCardUnlinkedTransaction
```
Values 15, 16, 17 are informative: `firstCaptureBellowMin` implies a minimum first-capture rule; `virtualCardUnlinkedTransaction` suggests Marqeta virtual card issuing is tied to each transaction server-side (consistent with the marqeta.services.anyday.io subdomain).

## /internal/ customer-facing endpoints
Confirmed from the online integration guide:
- `GET  /api/v1/internal/checkout/begin?checkoutId=<uuid>`  (customer checkout start; unauthenticated, no Bearer required)

From the deprecated website JS (events.js):
- `GET  /api/v1/internal/shops` (anonymous)
- `GET  /api/v2/internal/shops` (anonymous; PageSize up to 175; CategoryIds[] arrays)
- `GET  /api/v1/internal/categories` (anonymous)
- `GET  /api/v1/internal/categories/{categoryId}` (anonymous; categoryId from URL ?cat-id= param — un-URL-encoded)

**Threads:**
- Checkout-session enumeration: iterate checkoutId UUIDs or steal them via Referer leak
- /internal/* mass assignment: try POST/PUT/DELETE
- /internal/categories/{id} may reach controller with raw user input

## Callback Service characteristics (reviewed from reference/intro.md)
- Signs callback body with HMAC-SHA256 using merchant's `privateKey` (retrievable via `/webshop/mine`)
- Header: `x-anyday-signature`
- Delivers up to 10 attempts over 12 hours with gradually increasing delays
- "Your provided callback URL must quickly return a successful status code (2xx)"
- Online orders: callbacks on Authorized / Cancelled / Captured / Refunded
- In-store orders: callbacks only when `externalQrCodeId` is provided (not when `internalQrCodeId` is used)

## Dashboard URL space
`https://my.anyday.io/en/merchant/dashboard/webshop` and `/en/merchant/dashboard/webshop/webshop` — merchant SPA (Angular). The /en/ prefix implies i18n routing; test with /da/ and other locales.

## Shopify-app linkage
From developer-docs/docs/shopify.md:
- Shopify App Store entry: `https://accounts.shopify.com/store-login?no_redirect=true&redirect=%2Fadmin%2Fsettings%2Fpayments%2Falternative-providers%2F105578497`
- `105578497` is the Shopify Alternative Payment Provider ID for Anyday. The app itself is served from `connect.anyday.io` (prod ALB).

## Integration partners
Payment gateways supported (from docs structure):
- Quickpay, Pensopay, Shipmondo Payments, Billwerk (formerly Reepay), Onpay — Danish PSPs
- Shopify (New + Deprecated), WooCommerce, PrestaShop, Magento 1/2, DanDomain, MCB.Cloud, Shoporama

## Known production merchant used in docs example
`https://anyday.io/` (self), test merchant UUID `f2890f32-6e17-4f26-bf14-3c144e8cd3f1`, test priceTagToken `57c8d3b0e6894565a9771a4d798fd25b`.
