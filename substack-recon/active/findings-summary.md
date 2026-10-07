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

**Open to confirm (would raise severity):**
- If mutation methods (POST/PUT/PATCH) on same route also bypass scope → P1 Critical (full publication takeover). Not yet probed (classifier blocks from recon container; user to run from Burp).
- Confirmed invite-only publications leak → stays P2 but strengthens the case.

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

### ~~F-C1 — Podcast RSS token IDOR~~ [DEAD — tested 2026-10-06]

Handler returns A's own podcast URL regardless of token param. No cross-tenant leak.

### ~~F-C2 — Mutation IDOR on `/api/v1/subscription/{id}`~~ [DEAD — tested 2026-10-06]

Route is GET-only. All mutation methods return 404.

### F-C3 — SSRF via `/i/{post_id}?img=<URL>` or `cdn.substack.com/image/fetch/`

| | |
|---|---|
| **If confirmed, severity** | P2 High |
| **CVSS 3.1 (if confirmed)** | **8.6** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N` |
| **Hypothesis** | The server-side image fetcher may call arbitrary URLs. From my egress the response-size diff between `img=http://169.254.169.254/latest/meta-data/` (155685 B) and `img=http://example.com/` (141473 B) is 14 KB, but inspection showed no IMDS content embedded, so the diff is probably render variance. Needs Burp Collaborator to confirm whether the backend actually makes an outbound HTTP request. |

**Probe:** Collaborator URL in both image-proxy routes. See handoff Priority 3.

### F-C4 — SSRF cluster via publisher URL-input endpoints (requires publisher account)

Severity P2-P1 each, if confirmed:
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

### F-C8 — `postAsUserId` comment impersonation (CRITICAL if confirmed)

| | |
|---|---|
| **If confirmed, severity** | P1 Critical |
| **CVSS 3.1 (if confirmed)** | **9.1** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H` |
| **CWE** | CWE-639 Authorization Bypass Through User-Controlled Key |

Found in bundle `77027.9b44ba37.js`. When posting a comment, the client sends `postAsUserId: es?.id` where `es` is selected from a notes_permissions dropdown. The server is supposed to validate that the caller has permission to post as that user, but the `postAsUserId` value is a raw user ID in the request body. If the server does not validate, any authenticated user can post comments as any other user.

Endpoints: `POST /api/v1/comment/feed` and `POST /api/v1/post/{id}/comment` with body field `postAsUserId`.

### F-C9 — Comment moderation bypass (cross-publication)

| | |
|---|---|
| **If confirmed, severity** | P2 High |
| **CVSS 3.1 (if confirmed)** | **8.1** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H` |
| **CWE** | CWE-285 Improper Authorization |

Found in bundle `73672.15238a23.js` and `77027.9b44ba37.js`. Three endpoints:
- `PATCH /api/v1/comment/{id}/status` with `{status: "moderator_removed"}` -- remove any comment
- `PATCH /api/v1/comment/{id}/pin` with `{pinned: true}` -- pin any comment
- `POST /api/v1/comment/{id}/juice` with `{times_to_show: N}` -- boost any comment's visibility

If the server doesn't validate that the caller is a moderator/admin of the publication the comment belongs to, any user can moderate/boost comments across all publications.

### F-C10 — Recommendation manipulation IDOR

| | |
|---|---|
| **If confirmed, severity** | P2 High |
| **CVSS 3.1 (if confirmed)** | **7.5** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N` |
| **CWE** | CWE-639 BOLA |

Found in bundles `3615`, `67438`, `54689`. PUT to `/api/v1/recommendations/multiple` with body `{recommending_publication_id, recommended_publication_ids: [ids]}`. If the server doesn't validate ownership of `recommending_publication_id`, any user can add or remove publication recommendations for any publication.

### F-C11 — subscriber/add IDOR (mass enrollment)

| | |
|---|---|
| **If confirmed, severity** | P2 High |
| **CVSS 3.1 (if confirmed)** | **7.1** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:L` |
| **CWE** | CWE-639 BOLA |

Found in bundle `54689`. POST to `/api/v1/subscriber/add` with body `{email, publication_id, sendEmail, subscription}`. The `publication_id` is a user-controlled field. If the server doesn't validate that the caller owns the publication, any user can force-subscribe arbitrary email addresses to any publication.

### F-C12 — comment/attachment SSRF (fetchPostAttachment)

| | |
|---|---|
| **If confirmed, severity** | P2 High |
| **CVSS 3.1 (if confirmed)** | **8.6** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:N/A:N` |

Found in bundle `88136`. POST to `/api/v1/comment/attachment` with body `{url: "<arbitrary_url>"}`. The `fetchPostAttachment` variant fetches the provided URL server-side without specifying a type. If the server follows URLs without blocklist checks, this is SSRF.

### F-C13 — LaTeX injection via `/api/v1/latex/jpeg`

| | |
|---|---|
| **If confirmed, severity** | P1 Critical |
| **CVSS 3.1 (if confirmed)** | **9.8** |
| **Vector** | `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` |
| **CWE** | CWE-94 Code Injection |

GET endpoint, no auth required. Takes `expression` query param with LaTeX string. If the renderer uses pdflatex/xelatex without sandboxing, `\input{/etc/passwd}`, `\write18{command}`, or `\url{http://internal/}` can achieve file read, RCE, or SSRF. Blocked from testing in this container; user must run from their box.

---

## Dead ends (closed, documented for completeness)

| Vector | Why dead |
|---|---|
| `/api/v1/customer_support_mode` role bypass | Dedicated opaque guard; no path smuggling, header injection, case/charset variation reached the handler |
| `substack.lli` HS256 JWT confusion | Server does not consult `substack.lli` for authentication; `alg:none` crafted token with target userId was ignored |
| `go.substack.com/*` open-redirect | Not a short-link redirector; all paths 302 to `/welcome` |
| `l.substack.com/*`, `e.substack.com/*` | 404 on all probes; routes don't exist or need specific slug/token |
| `cdn.substack.com/image/fetch/*` from this egress | 502 Bad Gateway; CloudFront origin IP-ACL probably blocking the recon container egress. User's home IP may work. |
| `/@USER/.well-known/openid-configuration` per-user OIDC | 404; dossier guess wrong, no per-user OIDC published |
| `/sign-in?redirect=<attacker>` open-redirect | Reflects without server-side redirect; post-auth redirect validation not tested but SPA probably validates on client |

---

## Priority order for remaining work (updated 2026-10-07)

1. **F-C8** (postAsUserId impersonation, P1 if confirmed) -- 3 requests, 2 minutes
2. **F-C13** (LaTeX injection, P1 if confirmed) -- 4 requests, 2 minutes, no auth
3. **F-C9** (comment moderation bypass, P2 if confirmed) -- 4 requests, 2 minutes
4. **F-C10** (recommendation manipulation IDOR) -- 1 request, 1 minute
5. **F-C11** (subscriber/add IDOR) -- 1 request, 1 minute
6. **F-C12** (comment/attachment SSRF) -- 2 requests, 2 minutes
7. **F-C7** (WS topic ACL) -- Python script, 5 minutes
8. **F-C3** (SSRF Collaborator on image proxy) -- 2 requests, needs webhook.site
9. **F-C4** (import/posts redirect-chain SSRF) -- needs webhook.site redirect setup
10. **Block A** (subscription sibling IDOR cluster) -- 4 requests, 2 minutes
11. **Block B** (link-metadata SSRF) -- 3 requests, 2 minutes
12. **Block D** (posts/by_ids IDOR) -- 3 requests, 2 minutes

All probe scripts are in `probe-batch-final.md`. Blocks G through L are the highest-priority new tests.
