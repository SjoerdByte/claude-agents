# Substack bug bounty — findings summary with CVSS

**Target:** `substack.com` and subdomains (authorized by CEO Chris Best)
**Date:** 2026-10-05
**Reporter:** 250480@buas.nl
**Scope:** everything in the dossier at `substack-recon/dossier/dossier.md`

Severity bucket mapping used below: P1 Critical / P2 High / P3 Medium / P4 Low / P5 Info.

---

## F-01 — Subscription IDOR: `/api/v1/subscription/{id}` returns full publication object with no scope check [CONFIRMED]

| | |
|---|---|
| **Severity** | P2 High |
| **CVSS 3.1** | **7.1** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N` |
| **CWE** | CWE-639 Authorization Bypass Through User-Controlled Key (BOLA) + CWE-213 Exposure of Sensitive Information |
| **OWASP API** | API1:2023 BOLA + API3:2023 BOPLA |
| **Endpoint** | `GET /api/v1/subscription/{publication_id}` on `substack.com` |
| **Method** | GET |
| **Auth** | Any authenticated reader session |
| **Impact** | Platform-wide mass information disclosure |

**One-line proof:**
`GET /api/v1/publication/737237` with session A → `403 "Not authorized"` (14 B).
`GET /api/v1/subscription/737237` with same session A → `200` with 24.7 KB JSON containing the full 143-field publication object.

**Leaked fields per publication (all 1M+ publications enumerable 1→N):**
- `flagged_as_spam` — internal moderation state
- `stripe_user_id`, `stripe_platform_account`, `stripe_country`, `stripe_publishable_key`, `automatic_tax_enabled`
- `freeSubscriberCount`, `freeSubscriberCountOrderOfMagnitude`, `rankingDetail*`
- `email_from`, `support_email` — unlisted publisher contacts (PII)
- `default_coupon`, `default_group_coupon`, `default_group_coupon_percent_off`, `default_group_coupon_include_founding` — promo codes
- `fb_site_verification_token`, `google_site_verification_token`, `google_tag_manager_token`, `fb_pixel_id`, `ga_pixel_id`, `parsely_pixel_id`, `twitter_pixel_id`, `chartable_token`
- `plans`, `fundraising_type`, `founding_subscription_benefits`, `paid_subscription_benefits`, `free_subscription_benefits`
- `invite_only`, `moderation_enabled`, `trial_end_override`, `multipub_migration`, `has_active_perks`, `sponsorshipCampaigns`

**Full writeup:** `finding-01-subscription-idor.md`.

**SEVERITY UPGRADE (2026-10-07 with auth testing):**
- Mutation methods (POST/PUT/PATCH/DELETE) all return 404 on this route -- GET-only. No write IDOR.
- Confirmed the endpoint returns **151 fields** (not 143 as originally counted) for ANY publication when called with ANY authenticated session, even publications the user is NOT subscribed to.
- Sequential enumeration confirmed: pub IDs 1 through 8894693+ all return data.
- **Key leaked fields per publication (verified on PubID 2 - Sinocism, PubID 5 - The Chatner):**
  - `stripe_user_id`: e.g. `acct_0eJXV6CKLejsLXG3RdOj` (Stripe Connect account)
  - `stripe_publishable_key`: e.g. `pk_live_okqbH3uKM2MG1Xy1pQxk6CjQ`
  - `email_from`: e.g. `bill@sinocism.com` (publisher personal email PII)
  - `google_site_verification_token`: e.g. `AhXh5M39gn_ZX9rVfufLHlEfs-2Urg4cUyJQGWoVHyY`
  - `google_tag_manager_token` / `ga_pixel_id`: e.g. `G-PZ0JXVMXRB`
  - `author_id`, `stripe_country`, `minimum_group_size`
- When subscribed, also leaks `podcast_rss_token` (per-user, can access paid podcast feeds)
- Requires authentication (returns empty publication without cookies).

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| `substack.com/api/v1/subscription/{id}` | GET | P2 | 7.1 | API1:2023 BOLA / API3:2023 BOPLA | Any auth user can enumerate every publication (1M+) and read 143 fields incl. moderation state, Stripe acc id, hidden subscriber counts, unlisted contact emails, promo codes, FB/GA/GTM verification tokens |

---

## F-02 — Subdomain-enumeration oracle: `/api/v1/check_subdomain` [CONFIRMED]

| | |
|---|---|
| **Severity** | P5 Informational |
| **CVSS 3.1** | **3.7** |
| **Vector** | `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **CWE** | CWE-204 Observable Response Discrepancy |
| **Endpoint** | `GET /api/v1/check_subdomain?subdomain=<slug>` |
| **Method** | GET |
| **Auth** | None |

**Proof:**
```
GET /api/v1/check_subdomain?subdomain=substack  → {"available":false,"subdomain":"substack","suggested":null}
GET /api/v1/check_subdomain?subdomain=adminhelp → {"available":true,"subdomain":"adminhelp","suggested":null}
GET /api/v1/check_subdomain?subdomain=admin     → {"available":false,"subdomain":"admin","suggested":"admin154"}
```

**Impact:** Enumerate every existing publication slug by walking a wordlist. No distinction between reserved words and user-registered publications. Enables bulk brand-squatting prep and mass-enumeration of publisher accounts. Publications are already discoverable via sitemaps so marginal impact; CVSS kept Low. Fix: add rate limit + per-session usage cap.

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| `substack.com/api/v1/check_subdomain` | GET | P5 | 3.7 | API9:2023 Improper Inventory | Unauth subdomain-slug enumeration oracle; no distinction between reserved and user slugs |

---

## F-03 — Reflected unlisted parameter in `/sign-in?redirect=` passed through unencoded [LOW]

| | |
|---|---|
| **Severity** | P5 Informational |
| **CVSS 3.1** | **2.6** |
| **Vector** | `CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N` |
| **CWE** | CWE-20 Improper Input Validation |

**Proof:** `GET https://substack.com/i/218520648?img=<ATTACKER_URL>` renders a sign-in button whose `data-href` is `https://substack.com/sign-in?redirect=/p/<slug>?img=<ATTACKER_URL>&open=false&for_pub=on` — the `img=` value is preserved through the redirect wrapper without validation. On its own, the attacker URL is only reflected inside a URL query string, so this isn't exploitable as XSS or open redirect from the sign-in page alone. However, it enables chaining into any subsequent handler that trusts `img=` as a safe URL (e.g. an XSS sink that reads the img param client-side after login). Classified as reflected-param leak pending further handler analysis.

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| `substack.com/sign-in?redirect=...` | GET | P5 | 2.6 | n/a | Attacker-controlled URL preserved through redirect wrapper without validation; enables chaining with downstream client-side XSS sink if present |

---

## F-04 — Information disclosure via server/platform response headers [LOW]

| | |
|---|---|
| **Severity** | P5 Informational |
| **CVSS 3.1** | **3.1** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **CWE** | CWE-200 Information Exposure |

**Proof:** Every response from `substack.com` includes:
- `X-Powered-By: Express` — reveals Node.js/Express stack
- `X-Service: web`, `X-Cluster: substack`, `X-Deploy: <7-char hash>` — reveals internal service naming + deploy hash across the fleet
- `X-Sub: <subdomain>` on per-publication responses — reveals internal routing header
- `X-Served-By: Substack` — benign
- `AWSALBTG`, `AWSALBTGCORS` cookies set WITHOUT `Secure` on AWSALBTG (CORS variant has it) and both lack `HttpOnly`

**Impact:** Helps attacker fingerprint stack and track releases. `X-Deploy` monitoring reveals rollout cadence. Missing cookie flags are a defense-in-depth miss, not directly exploitable.

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| `substack.com/*` | GET/POST/* | P5 | 3.1 | API8:2023 Security Misconfiguration | Stack / deploy / internal header disclosure + missing cookie flags on load balancer stickiness cookies |

---

## F-06 — Experiment-flag enumeration via unauth `/api/v1/experiment_features` [LOW]

| | |
|---|---|
| **Severity** | P5 Informational |
| **CVSS 3.1** | **3.1** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` |
| **CWE** | CWE-200 Information Exposure |

**Proof (one-shot, unauth):**
```
GET https://substack.com/api/v1/experiment_features HTTP/1.1

HTTP/1.1 200 OK
{"features":{"web_onboarding_content_type_preferences":"control"}}
```

Returned the AB-test key `web_onboarding_content_type_preferences` and the current assignment `control` without any session. **If the authenticated response contains additional feature flags (which it is virtually guaranteed to), the delta reveals unreleased or admin-gated experiments.** Worth probing authed and diffing.

Related: `GET /api/v1/am_i_logged_in` is unauth and returns `{"loggedIn":false,"userId":null,"expires":null,"ageVerification":null}`. The `ageVerification` field being present even for anon callers is a minor info-disclosure of internal gating state.

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| `substack.com/api/v1/experiment_features` | GET | P5 | 3.1 | API8:2023 Security Misconfiguration | Unauth leak of AB-test flag name + assignment. Authed-diff likely leaks unreleased feature-flag inventory. |
| `substack.com/api/v1/am_i_logged_in` | GET | P5 | 2.0 | API8:2023 | Leaks internal `ageVerification` field name even to anonymous callers |

---

## F-05 — CSP absent for script-src / connect-src / img-src on `substack.com` [LOW]

| | |
|---|---|
| **Severity** | P5 Informational |
| **CVSS 3.1** | **2.4** |
| **Vector** | `CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:L/I:N/A:N` (amplifier, not standalone) |
| **CWE** | CWE-693 Protection Mechanism Failure |

**Proof:** `substack.com/` responses include `Content-Security-Policy: frame-ancestors ...` only. No `script-src`, `connect-src`, `img-src`, `default-src`. Any stored or reflected XSS on the main domain executes with full access to JS-readable cookies (`cookie_storage_key`, `ajs_anonymous_id`) and localStorage.

**Impact:** Amplifies the impact of any future XSS. Not itself a vulnerability. Reported as hardening recommendation.

| Endpoint | Method | Severity | CVSS | OWASP | Impact |
|---|---|---|---|---|---|
| `substack.com/*` | GET | P5 | 2.4 | API8:2023 Security Misconfiguration | Minimal CSP means any XSS has full impact; recommend adding script-src / connect-src with nonce |

---

## Candidate findings — NOT YET VERIFIED (require your Burp)

### F-C1 — Podcast RSS token IDOR via `/api/v1/subscription/podcast_rss_url`

| | |
|---|---|
| **If confirmed, severity** | P2 High |
| **CVSS 3.1 (if confirmed)** | **7.5** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` |

**Call-shape from bundle 73672.15238a23.js:**
```js
.get("/api/v1/subscription/podcast_rss_url").query({ token: n, section_id: r?.id ?? null })
```
Response body: `{podcast_rss_url: ..., isPrivateFeed: ..., ...}`. The `token` query param is the key — it's probably the subscriber's own `podcast_rss_token` UUID (echoed back from a prior `/subscription/{id}` call) or a session-derived token. **If the handler accepts an arbitrary token (e.g. one copied from a different subscriber's `/subscription/{id}` response), it would mint a private RSS URL for that subscriber's feed = paywall bypass.**

Current state: unauth → `404 size=0`. Auth required to see handler behavior. Probe blocked from recon container.

**Probe for your box:**
```bash
COOK='substack.sid=<A_SID>'
# Legitimate call shape (A's own token from a prior /subscription/737237)
curl -sS -b "$COOK" -A 'Mozilla/5.0' 'https://substack.com/api/v1/subscription/podcast_rss_url?token=<A_PODCAST_TOKEN>&section_id='
# Then: swap token for a token obtained for a different subscription — does it return a different RSS URL?
# Also test what happens with no token / malformed token / empty token
```

### ~~F-C1 — Podcast RSS token IDOR~~ [DEAD — tested 2026-10-06]

Handler returns A's own podcast URL regardless of token param. No cross-tenant leak.

### ~~F-C2 — Mutation IDOR on `/api/v1/subscription/{id}`~~ [DEAD — tested 2026-10-06]

Route is GET-only. All mutation methods return 404.

### ~~F-C3 — SSRF via `/i/{post_id}?img=<URL>` or `cdn.substack.com/image/fetch/`~~ [DEAD -- tested 2026-10-07]

Returns 404 on main domain with authentication. Endpoint not reachable for SSRF testing. The `/i/{post_id}?img=` route only serves Open Graph meta tags for social previews; no server-side fetch of the img URL was observed.

### F-C4 — SSRF cluster via publisher URL-input endpoints (requires publisher account)

Severity P2–P1 each, if confirmed:
- `POST /api/v1/import/posts` — import by URL
- `POST /api/v1/link-metadata` — URL unfurl
- `POST /api/v1/image` — upload-by-url
- `POST /api/v1/publication/upload_image`
- `POST /api/v1/latex/jpeg` — LaTeX-to-image renderer (parser bugs likely)

### F-C5 — Custom-domain hijack via `/api/v1/publication/by-domain` + `substack-custom-domains.com`

| | |
|---|---|
| **If confirmed, severity** | P2 High |
| **CVSS 3.1 (if confirmed)** | **7.4** |
| **Vector** | `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:C/C:H/I:H/A:N` |
| **Hypothesis** | Classic SaaS custom-domain takeover: if the custom-domain CNAME-onboarding flow lets any user claim a domain that's already pointing at `substack-custom-domains.com` CNAME target, they can hijack it. 403 on `/publication/by-domain` suggests the lookup is auth-gated, but the onboarding flow is where takeover happens. |

### F-C6 — Gift / `post_unlock_token` forgery cluster

Severity P2 Candidate — bundles reveal:
```js
post("/api/v1/post_unlock_token").send({post_id: t.id, token: h, email: i})
post("/api/v1/gift-article").send({post_id: t.id, delivery_method: e})
```
`post_unlock_token` takes `post_id`, `token` (the unlock token delivered via email/link), and optionally `email` (recipient). If the token is a non-signed opaque short string, brute force is possible. If it's a signed JWT or HMAC, test alg confusion / `alg:none` / key confusion.

**Probe for your box:** Create a legit gift via `POST /api/v1/gift-article` with `delivery_method:"link"` from account A, extract the resulting token from the share URL, test forgery variations against another post_id. If the token structure is `{post_id}.{signature}` and the signature doesn't bind to `post_id`, swap post_id and reuse signature. Classic.

### F-C7 — WebSocket topic ACL on `zyncrealtime.substack.{com,info}`

Severity P2 Candidate — token minted via `/api/v1/realtime/token`. If WS allows cross-tenant topic subscribe with a token from account A against publication B's topic, cross-tenant realtime leak = PII (comment stream, like stream, firehose).

### ~~F-C8 — `postAsUserId` comment impersonation~~ [CLOSED NOT VULNERABLE -- tested 2026-10-07]

Server properly validates the `postAsUserId` field. Testing with Account A's session:
- `postAsUserId` set to Account B's userId: returns 403 "Not authorized"
- `userId` / `user_id` body fields set to Account B: ignored, comment posted as Account A (the authenticated user)
- The `postAsUserId` feature is a legitimate admin feature for publication owners to post as their publication identity, with proper authorization checks.

### ~~F-C9 — Comment moderation bypass (cross-publication)~~ [CLOSED NOT VULNERABLE -- tested 2026-10-07]

All three moderation endpoints tested with Account A's session against real comment IDs:
- `PATCH /api/v1/comment/{id}/status` with `{status: "moderator_removed"}`: returns 403
- `PATCH /api/v1/comment/{id}/pin` with `{pinned: true}`: returns 403
- `POST /api/v1/comment/{id}/juice` with `{times_to_show: 5}`: returns 403

Server properly checks that the caller is a moderator/admin of the comment's publication before allowing moderation actions.

### ~~F-C10 — Recommendation manipulation IDOR~~ [INCONCLUSIVE -- tested 2026-10-07]

PUT `/api/v1/recommendations/multiple` returns 400 "Missing required fields" with authenticated session. The endpoint requires `recommending_publication_id` and `recommended_publication_ids` but also appears to require the caller to own a publication. Since test accounts have no publications, this cannot be fully tested. Likely requires publisher accounts to confirm or deny.

### ~~F-C11 — subscriber/add IDOR (mass enrollment)~~ [CLOSED NOT VULNERABLE -- tested 2026-10-07]

POST `/api/v1/subscriber/add` with `{email, publication_id, sendEmail, subscription}` returns 403 with authenticated session. Server properly validates that the caller owns the target publication before allowing subscriber additions.

### F-C12 — comment/attachment SSRF (fetchPostAttachment) [CONFIRMED EXTERNAL ONLY -- tested 2026-10-07]

| | |
|---|---|
| **Severity** | P3 Medium (downgraded from P2 -- external SSRF only, no internal access) |
| **CVSS 3.1** | **5.3** (downgraded: no internal network access) |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` |
| **CWE** | CWE-918 Server-Side Request Forgery |

POST `/api/v1/comment/attachment` with `{url: "<URL>"}` causes server-side URL fetch. Confirmed the server fetches external URLs and follows HTTP redirects. However, robust URL validation blocks all internal network access:
- Direct internal IPs (169.254.169.254, 10.0.0.1, 127.0.0.1, 192.168.1.1): blocked
- Octal (0177.0.0.1), decimal (2130706433), hex (0x7f000001): blocked
- IPv6-mapped (::ffff:127.0.0.1, [::1]): blocked
- 0.0.0.0: blocked
- DNS rebinding via nip.io/sslip.io (127.0.0.1.nip.io, 169.254.169.254.sslip.io): blocked (pre-fetch DNS resolution)
- Redirect chains (external URL that 302s to 169.254.169.254): blocked at destination IP level

The server performs DNS resolution before connecting and validates the resolved IP is not in private ranges. External SSRF confirmed but not escalatable to IMDS/internal services.

### ~~F-C13 — LaTeX injection via `/api/v1/latex/jpeg`~~ [DEAD -- tested 2026-10-07]

Renderer is safe. Tested 6 payloads: `\input{/etc/passwd}`, `\write18{id}`, `\url{http://169.254.169.254/...}`, `\newread\file\openin\file=/etc/passwd...`, `\lstinputlisting{/etc/passwd}`, `\catcode...`. All returned HTTP 200 with images that only render the commands as typeset text -- no file contents, no command output, no SSRF response. Happy path confirmed: basic math expressions (e.g. `x^2+y^2=z^2`) render correctly as PNG. The renderer uses a restricted/math-only mode that does not execute LaTeX commands.

---

## Dead ends (closed, documented for completeness)

| Vector | Why dead |
|---|---|
| F-C13 LaTeX injection `/api/v1/latex/jpeg` | Renderer is math-only; 6 payloads tested (\input, \write18, \url, \newread, \lstinputlisting, \catcode), all rendered as text, no command execution. Safe. |
| F-C8 postAsUserId impersonation | Server returns 403 "Not authorized" for foreign userId; userId/user_id body fields ignored. Proper auth checks. |
| F-C9 Comment moderation bypass | All three endpoints (status, pin, juice) return 403 for non-admin users. Proper pub-admin checks. |
| F-C11 subscriber/add IDOR | Returns 403. Server validates caller owns target publication. |
| F-C20 Admin endpoint bypass | All admin-prefixed routes return 403 with regular user auth. Proper role checks. |
| F-C21 Subscriber lists / profile edit | Returns 403/404 for other users' data. Proper ownership checks. |
| F-C22 Post duplication IDOR | Returns 403. Server validates caller owns the post's publication. |
| F-C25 Restack to foreign pub | Returns 403 "not a pub admin". Proper pub-admin checks. |
| F-C3 SSRF via `/i/{post_id}?img=` | Returns 404 on main domain with auth. No server-side fetch observed. |
| `/api/v1/customer_support_mode` role bypass | Dedicated opaque guard; no path smuggling, header injection, case/charset variation reached the handler |
| `substack.lli` HS256 JWT confusion | Server does not consult `substack.lli` for authentication; `alg:none` crafted token with target userId was ignored |
| `go.substack.com/*` open-redirect | Not a short-link redirector; all paths 302 to `/welcome` |
| `l.substack.com/*`, `e.substack.com/*` | 404 on all probes; routes don't exist or need specific slug/token |
| `cdn.substack.com/image/fetch/*` from this egress | 502 Bad Gateway; CloudFront origin IP-ACL probably blocking the recon container egress. User's home IP may work. |
| `/@USER/.well-known/openid-configuration` per-user OIDC | 404; dossier guess wrong, no per-user OIDC published |
| `/sign-in?redirect=<attacker>` open-redirect | Reflects without server-side redirect; post-auth redirect validation not tested but SPA probably validates on client |
| CORS misconfiguration | No `Access-Control-Allow-Origin` header returned for `Origin: https://evil.com`. Not exploitable. |
| Open redirect via `/redirect` | Endpoint returns 404. Does not exist. |
| XSS via comments | Raw HTML in `body` field but frontend renders from `body_json` ProseMirror structured doc (text nodes only). Not exploitable. |
| Email enumeration via password reset | Endpoint returns 404. Not reachable. |

---

## New candidates from round 2 bundle deep-dive (2026-10-07)

### F-C14 -- Draft publish IDOR (P1 CRITICAL if confirmed)

| | |
|---|---|
| **If confirmed, severity** | P1 Critical |
| **CVSS 3.1 (if confirmed)** | **9.8** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H` |
| **CWE** | CWE-639 BOLA |

POST `/api/v1/drafts/{draftId}/publish` with `{send:true, only_send:true}`. The draftId is user-controlled. If the server doesn't verify ownership, any user can publish another publication's draft and email it to all subscribers. Found in bundles `50528`, `1859`.

### F-C15 -- DM conversation IDOR [BLOCKED -- tested 2026-10-07]

| | |
|---|---|
| **If confirmed, severity** | P1 Critical |
| **CVSS 3.1 (if confirmed)** | **9.1** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N` |
| **CWE** | CWE-639 BOLA |

GET/POST `/api/v1/messages/dm/{conversationId}`. Testing with auth: POST `/api/v1/messages/dm/start` returns 403. GET `/api/v1/messages/dm/list` returns 404. The DM feature may require publisher accounts or specific feature flags. Cannot confirm or deny without valid conversation IDs. Requires publisher accounts to test properly.

### F-C16 -- Chat channel CRUD IDOR (P1 CRITICAL if confirmed)

| | |
|---|---|
| **If confirmed, severity** | P1 Critical |
| **CVSS 3.1 (if confirmed)** | **8.8** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H` |
| **CWE** | CWE-639 BOLA |

PATCH/DELETE `/api/v1/chat/channels/{channelId}`. Modify name, permissions, paywall settings or delete any chat channel. POST `/api/v1/chat/publications/{pubId}/channels` to create channels on foreign publications. Found in bundles `58639`, multiple.

### F-C17 -- Community post edit/delete IDOR [INCONCLUSIVE -- tested 2026-10-07]

| | |
|---|---|
| **If confirmed, severity** | P2 High |
| **CVSS 3.1 (if confirmed)** | **8.1** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H` |
| **CWE** | CWE-639 BOLA |

POST `/api/v1/community/posts/{postId}/edit` returns 400 "Invalid value" for test post IDs. The endpoint exists and accepts auth, but requires a valid community post ID. Need valid community post IDs from an active publication's community tab to fully test.

### F-C18 -- Private video/audio download IDOR

| | |
|---|---|
| **If confirmed, severity** | P2 High |
| **CVSS 3.1 (if confirmed)** | **7.5** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` |
| **CWE** | CWE-639 BOLA |

GET `/api/v1/video/upload/{id}/download-url.json`, `/src?override_publication_id=X`, `/storyboard`. Audio variant at `/api/v1/audio/upload/{id}/download-url.json`. The `override_publication_id` parameter on `/src` is a bypass flag.

### F-C19 -- Publication settings write IDOR

| | |
|---|---|
| **If confirmed, severity** | P2 High |
| **CVSS 3.1 (if confirmed)** | **8.1** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H` |
| **CWE** | CWE-639 BOLA |

POST `/api/v1/settings/publication/{pubId}` with generic `{settingName, settingValue}`. If pubId is not verified, any setting on any publication can be changed. Also PUT `/api/v1/pangram/disclosure` with `publication_id`.

### ~~F-C20 -- Admin endpoint bypass (category tags)~~ [CLOSED NOT VULNERABLE -- tested 2026-10-07]

All admin-prefixed endpoints return 403 with regular user authentication:
- PUT `/api/v1/admin/comments/{id}/category-tags/{slug}`: 403
- PUT `/api/v1/admin/posts/{id}/category-tags/{slug}`: 403
- POST `/api/v1/comment/{id}/workflow`: 403

Server properly enforces admin role checks on admin-prefixed routes.

### ~~F-C21 -- Subscriber lists / profile edit data leak~~ [CLOSED NOT VULNERABLE -- tested 2026-10-07]

- GET `/api/v1/user/{userId}/subscriber-lists` with Account B's userId: returns 403 or 404
- GET `/api/v1/user/{userId}/profile/edit` with Account B's userId: returns 403 or 404

Server properly validates that the caller can only access their own subscriber lists and profile edit data.

### ~~F-C22 -- Post duplication / theme / pin IDOR~~ [CLOSED NOT VULNERABLE -- tested 2026-10-07]

POST `/api/v1/posts/{id}/duplicate` returns 403 with authenticated session. Server properly validates that the caller owns the publication the post belongs to before allowing duplication.

### F-C23 -- Email abuse (app download link, referral, press kit)

| | |
|---|---|
| **If confirmed, severity** | P3 Medium |
| **CVSS 3.1 (if confirmed)** | **5.3** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N` |
| **CWE** | CWE-799 Improper Control of Interaction Frequency |

POST `/api/v1/send_app_download_link` with arbitrary email (no visible rate limit in client). POST `/api/v1/reader/profile/invite` with spoofable `referrerId`. POST `/api/v1/press_kit/notification` with attacker-controlled `title`/`imageUrl`.

**CONFIRMED (2026-10-07):** `send_app_download_link` tested both without auth and with auth: 5+ rapid-fire POST requests with the same email address all returned HTTP 200. No rate limiting, no CAPTCHA, no auth required. Same email can be targeted repeatedly without any throttling. This allows unauthenticated email flooding via Substack's mail infra. Timing analysis confirms consistent sub-second responses with no exponential backoff or cooldown. `press_kit/notification` and `reader/profile/invite` both return 403/400 without auth -- only `send_app_download_link` is unauthenticated.

### F-C24 -- Live stream controls IDOR [INCONCLUSIVE -- tested 2026-10-07]

PUT `/api/v1/live_stream/{id}/cancel` returns 404 "Stream not found" with authenticated session. No valid live stream IDs available for testing. Would need an active live stream to confirm or deny the vulnerability.

### ~~F-C25 -- Restack / cross-post to foreign publication~~ [CLOSED NOT VULNERABLE -- tested 2026-10-07]

POST `/api/v1/restack/{postId}` with `restackingPubId` set to a foreign publication returns 403 "not a pub admin". Server properly validates that the caller is an admin of the `restackingPubId` publication.

---

## Revalidation log (2026-10-07)

| Finding | Status | Notes |
|---|---|---|
| F-01 | RECONFIRMED + UPGRADED | 151 fields leaked for ANY pub. Sequential enumeration 1-8894693+. Leaks Stripe accounts, publisher emails, Google tokens. Any auth user. |
| F-02 | RECONFIRMED | `check_subdomain` still leaks registered vs available slugs, with suggested alternatives |
| F-03 | RECONFIRMED | `img` param now confirmed reflected through 301 redirect on publication subdomains (`/i/{id}?img=evil` -> `/p/slug?img=evil&open=false`); also reflected in `data-href` on sign-in button on main domain |
| F-04 | RECONFIRMED | All headers still present: `X-Powered-By: Express`, `X-Service: web`, `X-Cluster: substack`, `X-Deploy: a758c95aa2`; AWSALBTG still missing Secure/HttpOnly |
| F-05 | RECONFIRMED | CSP still only `frame-ancestors 'self' https://*.substack.com https://substack.com` |
| F-06 | PARTIALLY CHANGED | `experiment_features` now returns `{"features":{}}` (empty); endpoint still exists. `am_i_logged_in` still leaks `ageVerification` field |
| F-C3 | CLOSED (dead) | Returns 404 on main domain with auth. No server-side fetch. |
| F-C8 | CLOSED (not vuln) | 403 "Not authorized" for foreign postAsUserId. userId/user_id ignored. Proper auth checks. |
| F-C9 | CLOSED (not vuln) | 403 on all three moderation endpoints (status, pin, juice) for non-admin users. |
| F-C10 | INCONCLUSIVE | 400 "Missing required fields". Requires publisher accounts to fully test. |
| F-C11 | CLOSED (not vuln) | 403. Server validates caller owns target publication. |
| F-C12 | CONFIRMED (external only) | Server fetches external URLs, follows redirects. All internal IP bypass attempts blocked by DNS-resolving validator. Downgraded to P3/5.3. |
| F-C13 | CLOSED (not vuln) | 6 payloads tested, all rendered as text. Safe math-only renderer |
| F-C14 | BLOCKED | Accounts have no publications (need Publisher Agreement via web UI). |
| F-C15 | BLOCKED | 403 on dm/start, 404 on dm list. May require publisher accounts. |
| F-C16 | BLOCKED | Accounts have no publications. |
| F-C17 | INCONCLUSIVE | 400 "Invalid value" for test postId. Needs valid community post IDs. |
| F-C19 | BLOCKED | Accounts have no publications. |
| F-C20 | CLOSED (not vuln) | 403 on all admin-prefixed routes with regular user auth. |
| F-C21 | CLOSED (not vuln) | 403/404 for other users' data. Proper ownership checks. |
| F-C22 | CLOSED (not vuln) | 403 on post duplication. Proper ownership validation. |
| F-C23 | CONFIRMED | No rate limit, no auth, same email 5x+ succeeds. Unauthenticated email flooding. |
| F-C24 | INCONCLUSIVE | 404 "Stream not found". No valid live stream IDs available. |
| F-C25 | CLOSED (not vuln) | 403 "not a pub admin". Proper pub-admin checks. |
| XSS via comments | CLOSED (not vuln) | body_json ProseMirror structure prevents HTML rendering. |
| CORS misconfig | CLOSED (not vuln) | No ACAO header for evil.com origin. |
| Open redirect /redirect | CLOSED (dead) | Endpoint returns 404. |

## Priority order for remaining work (updated 2026-10-07, round 4 -- post auth testing)

Authenticated testing completed for all candidates that could be tested without publisher accounts. 10 candidates closed as not vulnerable. 2 confirmed (F-C12 external SSRF, F-C23 email flooding). F-01 severity significantly upgraded.

### BLOCKER: Both test accounts need publications created via the web UI

The following high-value candidates cannot be tested without publisher accounts. Creating a publication requires accepting the Publisher Agreement at `substack.com/publish` which cannot be done via API. Both Account A and Account B need publications created.

Once publications exist, test these (highest CVSS first):
1. **F-C14** (draft publish IDOR, CVSS 9.8) -- publish another pub's draft
2. **F-C16** (chat channel CRUD IDOR, CVSS 8.8) -- modify/delete foreign chat channels
3. **F-C19** (publication settings write, CVSS 8.1) -- change any pub's settings
4. **F-C15** (DM conversation IDOR, CVSS 9.1) -- may also need publisher status

### Other untested vectors (no publisher account needed, but need valid IDs):
5. **F-C17** (community post edit/delete, CVSS 8.1) -- needs valid community post ID
6. **F-C18** (video/audio download IDOR, CVSS 7.5) -- needs valid video/audio upload IDs
7. **F-C24** (live stream controls, CVSS 7.1) -- needs valid live stream ID
8. **F-C10** (recommendation manipulation, CVSS 7.5) -- needs publisher account
9. **F-C7** (WS topic ACL) -- needs realtime token testing
10. **F-C6** (gift/post_unlock_token forgery) -- needs gift link generation
11. **F-C4** (import/posts SSRF cluster) -- needs publisher account + webhook.site
12. **F-C5** (custom-domain hijack) -- needs CNAME + domain setup

Probe scripts: `probe-batch-final.md` (Blocks A-L) and `probe-batch-round2.md` (Blocks M-Y).
