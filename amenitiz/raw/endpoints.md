# Amenitiz surface map (recon 2026-11-02)

Proxy note: remote_ip shows 127.0.0.1 (agent HTTPS proxy). Cloudflare bot management
began returning 403 "Attention Required" (4547-byte challenge) to the proxy IP after
~20 requests; later 403s on CF-proxied hosts are edge bot-blocks, not app responses.

## Primary app / API hosts
| Host | Root status | Tech / notes |
|------|-------------|--------------|
| app.amenitiz.io | 302 -> /users/sign_in | Rails + Devise PMS. `_myapp_session` cookie (domain=amenitiz.io), x-request-id, x-runtime, org:AMENITIZ. Cloudflare + AWS ALB (AWSALB). New Relic eu01 (appID 489734564). |
| app.amenitiz.io/users/sign_up | 200 (100KB) | Self-service signup form EXISTS. POST /en/users. Fields: user[email], user[password], user[tos_agreement]. Gated by reCAPTCHA v3 (sitekey 6LdbGOEUAAAAAA1wk4s2tZytEq8B8kyPn0Rh0Z4m, action "registration"). No account-type/role select at signup. |
| app.amenitiz.io/graphql,/api,/up,/sidekiq,/rails/info/routes | 404 | Not exposed at these paths. |
| app.amenitiz.com | 403 | Cloudflare (WAF/edge block). |
| pos.amenitiz.io | 307 -> /login | Next.js (x-nextjs-cache HIT, x-nextjs-prerender). Point of sale. Strict CSP, references *.fullview.io. |
| pay.amenitiz.io | 404 (Go) | Go HTTP service ("404 page not found"). /status = 200 "ok". Other routes 404; need auth/signature. No Cloudflare server header. Payment gateway. |
| pay-s.amenitiz.io | 404 (Go) | Go service (staging). No CF. |
| pay-t.amenitiz.io | 503 | server: awselb/2.0 returned DIRECTLY (no Cloudflare). Origin/ALB exposed. |
| import-bookings.amenitiz.io | 302 -> /login | Heroku Rails (heroku-router, heroku-nel). Booking import tool. vary:Cookie. |
| cv-channel-manager.amenitiz.io | 530 | CF error 530 (origin unreachable). Channel manager. |
| mcp.amenitiz.io | 403 | Cloudflare edge block on all paths (/, /sse, /mcp, /health). MCP (AI) server. org:AMENITIZ. |
| mcp-cell.amenitiz.io | 502 (x2) | Proxy 502 after retry; likely dangling/dead. |
| partners.amenitiz.io | 530 | CF origin unreachable. |

## Booking-engine / multi-tenant Rails hosts (root 404, AWSALB, x-request-id/x-runtime)
| Host | Root | Notes |
|------|------|-------|
| your-hotel.amenitiz.io | 404 | Rails booking-engine template host. |
| distribution-secure.amenitiz.io | 404 | Rails. access-control-allow-origin: * (WILDCARD CORS). via:1.1 proxy. |
| fallback.amenitiz.io | 404 | Rails booking-engine. |
| leadgen-aws.amenitiz.io | 404 | Rails. |
| leadgen.amenitiz.io | 302 -> /login | Heroku Rails. access-control-allow-origin: http://localhost:3000 (dev CORS leftover). |
| hotel-santorini / villamia-abidjan / kimi-residence | 301 | Per-hotel vanity -> redirect to custom domain. |
| la-maison-folia.amenitiz.io | 302 -> /fr | Live per-hotel booking engine (later CF-blocked to proxy). |

## Infra / redirectors / 530 origins
| Host | Status | Notes |
|------|--------|-------|
| fortress.amenitiz.io | 301 -> www.amenitiz.com | CF redirect. |
| apex-redirector.amenitiz.io | 301 | server: Caddy. |
| web-analyzer.amenitiz.io | 530 | CF origin unreachable. |
| leadgen-staging.amenitiz.io | 530 | CF origin unreachable. |

## New hosts from crt.sh (amenitiz.io, same registrable domain = in scope, not yet probed)
bookingsuite.amenitiz.io, get.amenitiz.io, infra.amenitiz.io, dev.infra.amenitiz.io,
qa.infra.amenitiz.io, prod.infra.amenitiz.io, staging-3.infra.amenitiz.io,
awsinfra-qa-1.qa.infra.amenitiz.io, awsinfra-test.dev.infra.amenitiz.io, assets.amenitiz.io

Raw header dumps: hv_batch1.txt, hv_batch2.txt, app_pay_endpoints.txt, dns_cname.txt (empty - no local resolver), crt_io.json, signup_page.html, booking.html.
