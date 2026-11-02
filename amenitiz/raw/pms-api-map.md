# PMS API map (post-signup)

Account A registered successfully through user's browser:
- Signup URL: https://app.amenitiz.io/en/users/sign_up
- Hotel subdomain: houseinstra.amenitiz.io
- Role at signup: owner only (no role picker)
- Company external id: 47559 (sequential; _plantrack cookie)
- User uuid: 532de895-ffe8-4ab7-aa43-110ad51d8eef
- Signup flow steps observed: /en/users (create) -> /en/hotel/owner-save -> /en/hotel/property-save -> /en/hotel/language-save -> /en/hotel/property-type-save -> {subdomain}.amenitiz.io/en/admin
- No email verification required: user_connected went false -> true immediately after signup
- Password accepted = literal email (observation; not scored yet)

## Session scope
- _myapp_session cookie Domain=amenitiz.io (confirmed in both app.* and {hotel}.* responses)
- Also Domain=amenitiz.io: user_connected, uuuid, AWSALB, AWSALBCORS
- Implication: a session issued on hotel A's subdomain is transmitted by the browser to any {other}.amenitiz.io host.
- CSRF: `x-csrf-token` header required for POST/PATCH; same token works across the hotel subdomain.

## Rails/Devise app endpoints confirmed on tenant subdomain
Base: https://{tenant}.amenitiz.io/en/api/v1/
- GET /dashboards/arrivals?date=YYYY-MM-DD&initial_load=true
- GET /dashboards/todays_work_counts?date=YYYY-MM-DD&initial_load=true
- GET /dashboards/operations/housekeeping?date=YYYY-MM-DD&initial_load=true
- GET /dashboards/hero?date=YYYY-MM-DD&initial_load=true
- GET /dashboards/apay_strip?date=YYYY-MM-DD&initial_load=true
- GET /dashboards/period_totals?initial_load=true
- GET /breakfast/dashboard_widgets?initial_load=true
- GET /inbox/conversations/unread
All responded 200 with structured JSON {"data":...} on test tenant (data all zeros because empty hotel).

## Third-party integrations active in authenticated session (noted, not findings)
- consumer.cloud.gist.build (customer.io messaging): x-cio-site-id f4b3311b8b1c3241e2d8, x-gist-encoded-user-token = base64(user uuuid)
- api.fullview.io: organisationId 998c5b21-0a29-4ddc-ac64-c45418a3874e; register endpoint accepts {externalId, name, email} and returns a JWT containing those claims. External, cross-site.
- Intercom (gqbyy2bu), HubSpot (5693946), Hotjar (1672656), Segment (ajs_*), Google Analytics, Stripe JS (mid/sid).

## Highest-priority next tests
1. SUBDOMAIN PIVOT (critical): replay a successful arrivals/hero/period_totals cURL on another hotel's subdomain (ostal-de-pombonne, auberge-danthy, chalet-le-brame, les-chenes-verts-84120). If 200 with that tenant's data -> critical cross-tenant IDOR.
2. ID enumeration: try /en/api/v1/reservations, /guests, /invoices, /users, /hotels/{47558} to find per-object endpoints.
3. Second account (peter.bjorn75+hotel2@gmail.com) to confirm tenant isolation at object-ID level, and compare company ids (should be sequential around 47559).

## Not committed to repo (ephemeral)
- _myapp_session values, CSRF tokens, authenticity_tokens, recaptcha tokens, JWTs — all redacted. Live for ~90 min.
